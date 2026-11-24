// Owner-scoped backup extension. No market writes, no overwrite of existing pairs.
import {canonicalPairV1} from './asia-fx-core-v1.mjs';
const key=x=>x.base_code+'|'+x.quote_code;
export function validateManualBackup(data,uid){
 if(!Object.prototype.hasOwnProperty.call(data,'manual_fx_pairs'))return null;
 if(data.user_id!==uid||!Array.isArray(data.manual_fx_pairs)||data.manual_fx_pairs.length>2000)throw Error('Invalid or foreign manual rate backup');
 const seen=new Set();
 return data.manual_fx_pairs.map(row=>{
  if(row?.user_id!==uid||row.source!=='manual')throw Error('Invalid or foreign manual rate backup row');
  const p=canonicalPairV1(row);
  if(row.base_code!==p.base_code||row.quote_code!==p.quote_code||seen.has(key(p)))throw Error('Invalid or duplicate manual currency pair');
  seen.add(key(p));return {user_id:uid,base_code:p.base_code,quote_code:p.quote_code,rate:p.rate,source:'manual'};
 });
}
export function missingManualPairs(rows,existing){
 const keys=new Set(existing.map(key));return rows.filter(x=>!keys.has(key(x)));
}
export function createManualBackup(db){
 async function access(uid){
  const u=await db.auth.getUser(),a=await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if(u.error||u.data?.user?.id!==uid||a.error||!a.data?.currentLevel||(a.data.nextLevel==='aal2'&&a.data.currentLevel!=='aal2'))throw Error('Sign in and complete MFA before backing up personal rates');
 }
 async function read(uid){
  await access(uid);const rows=[];
  for(let offset=0;;offset+=500){
   const r=await db.from('manual_fx_pairs').select('user_id,base_code,quote_code,rate,source').eq('user_id',uid).order('base_code').order('quote_code').range(offset,offset+499);
   if(r.error||!Array.isArray(r.data))throw Error('Personal rates backup read failed');
   await access(uid);rows.push(...r.data);if(r.data.length<500)break;
   if(rows.length>2000)throw Error('Personal rates backup limit exceeded');
  }
  return validateManualBackup({user_id:uid,manual_fx_pairs:rows},uid);
 }
 return Object.freeze({read,async plan(data,uid){
   const rows=validateManualBackup(data,uid);return rows===null?[]:missingManualPairs(rows,await read(uid));
 },async restore(rows,uid,assertOwner){
   for(const row of rows){assertOwner();await access(uid);assertOwner();
     const r=await db.from('manual_fx_pairs').upsert(row,{onConflict:'user_id,base_code,quote_code',ignoreDuplicates:true});
     if(r.error)throw Error('Personal rate restore failed; existing rates kept');
     await access(uid);assertOwner();
   }
 }});
}
