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
  async function ensure(){
    let owner;
    try{owner=await authUid()}catch(e){clear();throw e}
    if(!owner){clear();throw Error('Sign-in required')}
    if(uid!==owner){generation++;uid=owner;pairs=[];status='loading'}
    return {owner,stamp:generation};
  }
  async function refresh(){
    const {owner,stamp}=await ensure();
    status='loading';
    try{
      const loaded=await store.list(owner);
      const after=await authUid();
      if(generation!==stamp||after!==owner){
        clear();throw Error('Account changed; reload Saved Rates');
      }
      // Store only the current owner's normalized rows, never transfer between users.
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
    const {owner,stamp}=await ensure();
    busy=true;status='saving';
    try{
      const result=await store[action](args,owner);
      if(generation!==stamp||await authUid()!==owner){
        clear();throw Error('Account changed; reload Saved Rates');
      }
      // A fresh owner-scoped SELECT is authoritative; do not guess success locally.
      const loaded=await store.list(owner);
      if(generation!==stamp||await authUid()!==owner){
        clear();throw Error('Account changed; reload Saved Rates');
      }
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
