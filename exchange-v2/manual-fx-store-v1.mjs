/**
 * Exchange V2 / Draft PR #27 — owner-scoped manual currency-pair persistence.
 * NOT loaded by app.html; DO NOT USE before separately approved Staging table/RLS.
 * Writes ONLY public.manual_fx_pairs and NEVER legacy exchange_rates.
 */
import { canonicalPairV1 } from './asia-fx-core-v1.mjs';
const COLUMNS='user_id,base_code,quote_code,rate,source,version,updated_at';
const versionCheck=v=>{
  if(!Number.isSafeInteger(v)||v<1)throw Error('Valid saved row version required');
  return v;
};
const safeRow=(row,uid)=>{
  if(!row||row.user_id!==uid||row.source!=='manual'||!Number.isSafeInteger(Number(row.version))||Number(row.version)<1)
    throw Error('Invalid manual pair row or wrong owner');
  const normalized=canonicalPairV1(row);
  if(normalized.base_code!==row.base_code||normalized.quote_code!==row.quote_code)
    throw Error('Uncanonical saved pair');
  return Object.freeze({...row,rate:normalized.rate,version:Number(row.version)});
};
export function createManualFxPairStoreV1(db){
  if(!db?.auth?.getUser||typeof db.from!=='function')throw Error('Authenticated Supabase client required');
  async function owner(){
    const res=await db.auth.getUser();
    if(res?.error)throw Error('Authentication unavailable');
    const id=res?.data?.user?.id;
    if(typeof id!=='string'||!id.trim())throw Error('Sign-in required');
    return id;
  }
  async function verify(uid){
    if(await owner()!==uid)throw Error('Account changed; reload Saved Rates');
  }
  function scoped(table,uid,canonical){
    return table.eq('user_id',uid).eq('base_code',canonical.base_code)
      .eq('quote_code',canonical.quote_code);
  }
  const requireResult=(result)=>{
    if(result?.error){
      if(result.error.code==='23505')throw Error('Pair already exists; refresh saved rates');
      throw Error('Manual rates could not be saved or loaded');
    }
    return result;
  };
  return Object.freeze({
    async list(expectedUid){
      const uid=await owner();
      if(expectedUid!==undefined&&uid!==expectedUid)throw Error('Account changed; reload Saved Rates');
      const res=requireResult(await db.from('manual_fx_pairs').select(COLUMNS).eq('user_id',uid));
      await verify(uid);
      if(!Array.isArray(res.data))throw Error('Missing manual pair query data');
      return res.data.map(row=>safeRow(row,uid));
    },
    async add({base_code,quote_code,rate},expectedUid){
      const uid=await owner();
      if(expectedUid!==undefined&&uid!==expectedUid)throw Error('Account changed; reload Saved Rates');
      const pair=canonicalPairV1({user_id:uid,base_code,quote_code,rate});
      await verify(uid);
      const res=requireResult(await db.from('manual_fx_pairs').insert({
        user_id:uid,base_code:pair.base_code,quote_code:pair.quote_code,
        rate:pair.rate,source:'manual'
      }).select(COLUMNS).maybeSingle());
      await verify(uid);
      if(!res.data)throw Error('Manual pair insert was not confirmed');
      return safeRow(res.data,uid);
    },
    async update({base_code,quote_code,rate,version},expectedUid){
      const uid=await owner();
      if(expectedUid!==undefined&&uid!==expectedUid)throw Error('Account changed; reload Saved Rates');
      const pair=canonicalPairV1({user_id:uid,base_code,quote_code,rate});
      versionCheck(version);await verify(uid);
      const query=scoped(db.from('manual_fx_pairs').update({rate:pair.rate}),uid,pair)
        .eq('version',version);
      const res=requireResult(await query.select(COLUMNS).maybeSingle());
      await verify(uid);
      if(!res.data)throw Error('Saved rate changed on another device; reload before editing');
      const row=safeRow(res.data,uid);
      if(row.version<=version)throw Error('Saved rate revision not advanced');
      return row;
    },
    async remove({base_code,quote_code,version},expectedUid){
      const uid=await owner();
      if(expectedUid!==undefined&&uid!==expectedUid)throw Error('Account changed; reload Saved Rates');
      // Rate is irrelevant to deletion; derive the canonical pair safely.
      const pair=canonicalPairV1({user_id:uid,base_code,quote_code,rate:1});
      versionCheck(version);await verify(uid);
      const query=scoped(db.from('manual_fx_pairs').delete(),uid,pair)
        .eq('version',version);
      const res=requireResult(await query.select(COLUMNS).maybeSingle());
      await verify(uid);
      if(!res.data)throw Error('Saved rate changed on another device; reload before deleting');
      return safeRow(res.data,uid);
    }
  });
}
