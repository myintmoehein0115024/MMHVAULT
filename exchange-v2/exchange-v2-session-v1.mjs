/**
 * MMHVAULT Exchange V2 / Draft PR #27 — account-safe Saved Rates controller.
 * Not loaded by app.html. No writes to legacy exchange_rates or financial data.
 * The manual_fx_pairs schema/RLS requires independently approved Staging QA.
 */
import {resolveCurrencyRateV1,formatCurrencyRateV1} from './asia-fx-core-v1.mjs';
import {createManualFxPairStoreV1} from './manual-fx-store-v1.mjs';


export function createExchangeV2SessionV1({db,getLegacyRates=()=>null,getMarketRates=()=>({}),onPairsChanged=()=>{}}={}){
  const store=createManualFxPairStoreV1(db);
  if(typeof getLegacyRates!=='function')throw Error('Legacy snapshot reader must be a function');
  let generation=0,uid='',pairs=[],status='signed-out',busy=false;
  const clear=()=>{
    generation++;uid='';pairs=[];status='signed-out';onPairsChanged('',[]);
  };
  async function authUid(){
    const r=await db.auth.getUser();
    if(r?.error)throw Error('Account validation unavailable');
    return typeof r?.data?.user?.id==='string'?r.data.user.id:'';
  }
  function assertGeneration(stamp){
    if(generation!==stamp)throw Error('Account changed; reload Saved Rates');
  }
  async function checkedOwner(stamp){
    let owner;
    try{owner=await authUid()}catch(error){if(generation===stamp)clear();throw error}
    assertGeneration(stamp);
    return owner;
  }
  async function verifyOwner(owner,stamp){
    const after=await checkedOwner(stamp);
    if(after!==owner){clear();throw Error('Account changed; reload Saved Rates')}
  }
  async function refresh(){
    if(busy)throw Error('Another rate edit is in progress');
    // Latest refresh wins, including overlapping requests for the same owner.
    const started=++generation;
    status='loading';
    const owner=await checkedOwner(started);
    if(!owner){clear();throw Error('Sign-in required')}
    if(uid!==owner){uid=owner;pairs=[]}
    const stamp=started;
    try{
      const loaded=await store.list(owner);
      await verifyOwner(owner,stamp);
      assertGeneration(stamp);
      pairs=loaded;
      status='ready';onPairsChanged(owner,[...pairs]);
      return [...pairs];
    }catch(error){
      if(generation===stamp){pairs=[];status='unavailable';onPairsChanged('',[])}
      throw error;
    }
  }
  async function mutate(action,args){
    if(busy)throw Error('Another rate edit is in progress');
    // Bind the operation to the ready session BEFORE the first await.
    // Never adopt a different authenticated owner for an existing UI action.
    const owner=uid,stamp=generation;
    if(!owner||status!=='ready')throw Error('Saved Rates not ready');
    busy=true;status='saving';
    try{
      await verifyOwner(owner,stamp);
      assertGeneration(stamp);
      const result=await store[action](args,owner);
      await verifyOwner(owner,stamp);
      const loaded=await store.list(owner);
      await verifyOwner(owner,stamp);
      assertGeneration(stamp);
      pairs=loaded;status='ready';onPairsChanged(owner,[...pairs]);
      return result;
    }catch(error){
      if(generation===stamp)status='needs-refresh';
      throw error;
    }finally{busy=false}
  }
  function state(){
    return Object.freeze({user_id:uid,status,pairs:[...pairs],busy});
  }
  function quote({from,to,amount=1}){
    const input=typeof amount==='string'&&amount.trim()===''?NaN:Number(amount);
    if(!Number.isFinite(input)||input<0)return {available:false,reason:'invalid-amount'};
    if(status!=='ready'||!uid)return {available:false,reason:'not-ready'};
    const legacy=getLegacyRates();
    // A previous user's snapshots (and ownerless demo values) are never usable.
    const owned=legacy&&legacy.user_id===uid?legacy:{};
    const resolved=resolveCurrencyRateV1({
      user_id:uid,from,to,manualPairs:pairs,legacyRates:owned,marketRates:getMarketRates()
    });
    if(!resolved.available)return resolved;
    const value=input*resolved.rate;
    if(!Number.isFinite(value)||value<0)return {available:false,reason:'unrepresentable-amount'};
    return Object.freeze({...resolved,amount:input,result:value,
      formattedRate:formatCurrencyRateV1(resolved.rate),
      formattedResult:formatCurrencyRateV1(value)});
  }
  return Object.freeze({
    refresh,state,quote,clear,
    add:args=>mutate('add',args),
    update:args=>mutate('update',args),
    remove:args=>mutate('remove',args)
  });
}
