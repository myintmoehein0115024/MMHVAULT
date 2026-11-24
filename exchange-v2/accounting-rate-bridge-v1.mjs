// Integrated APP only. Legacy accounting row is the sole authority for the four core currencies.
const KEYS=Object.freeze({MMK:'usd_mmk',THB:'usd_thb',CNY:'usd_cny'});
const CORE=new Set(['USD',...Object.keys(KEYS)]);
export const isCorePair=(a,b)=>a!==b&&CORE.has(a)&&CORE.has(b);
export const accountingColumn=(a,b)=>a==='USD'?KEYS[b]||null:b==='USD'?KEYS[a]||null:null;
export function accountingPatch(a,b,value){
 const key=accountingColumn(a,b),n=Number(value),rate=a==='USD'?n:1/n;
 if(!key||!Number.isFinite(rate)||rate<1e-12||rate>1e12)throw Error('Choose USD and a core currency with a valid positive rate');
 return Object.freeze({key,rate});
}
export const withoutCoreOverrides=rows=>rows.filter(r=>!isCorePair(r.base_code,r.quote_code));
export function createAccountingRateWriter({db,getSnapshot,onSaved}){
 return async ({base_code,quote_code,rate,expectedRevision})=>{
  const {key,rate:next}=accountingPatch(base_code,quote_code,rate);
  const owner=async()=>{const r=await db.auth.getUser();if(r.error||!r.data?.user?.id)throw Error('Sign-in required');return r.data.user.id};
  const uid=await owner(),snapshot=getSnapshot();
  if(!snapshot||snapshot.user_id!==uid||typeof snapshot.updated_at!=='string'||!Number.isFinite(Date.parse(snapshot.updated_at))||snapshot.updated_at!==expectedRevision)throw Error('Saved accounting rates changed; refresh before editing');
  const old=Number(snapshot[key]);if(!Number.isFinite(old)||old<=0)throw Error('Existing accounting rate required');
  if(await owner()!==uid)throw Error('Account changed');
  const now=new Date().toISOString();
  const result=await db.from('exchange_rates').update({[key]:next,updated_at:now}).eq('user_id',uid).eq(key,old).eq('updated_at',snapshot.updated_at).select('user_id,usd_mmk,usd_thb,usd_cny,updated_at').maybeSingle();
  if(result.error||!result.data||result.data.user_id!==uid||Number(result.data[key])!==next)throw Error('Rate not saved or changed elsewhere; refresh before retry');
  if(await owner()!==uid)throw Error('Account changed');
  await onSaved(result.data,uid);
  return result.data;
 }
}
