/* MMHVAULT Transactions Onboarding V1 — UI-only state, no finance/database calls.
 * Storage is owner-keyed and device-local by design; no backend migrations. */
export const VERSION=1;
export const STEPS=Object.freeze(['welcome','manage','type','transaction','category','fields','first','complete']);
export const STORAGE_PREFIX='mmhvault_tx_onboarding_v1_';
const STATUS=new Set(['active','paused','skipped','completed']);
export function cleanOwner(id){
  const v=String(id||'');
  return /^[0-9a-f-]{20,80}$/i.test(v)?v:'';
}
export function keyFor(owner){
  const safe=cleanOwner(owner);
  if(!safe)throw new Error('Signed-in account required');
  return STORAGE_PREFIX+safe;
}
export function initialState(){return {version:VERSION,step:0,status:'active',hasSavedTransaction:false};}
export function normalizeState(data){
  if(!data||typeof data!=='object'||Array.isArray(data)||data.version!==VERSION
    ||!Number.isInteger(data.step)||data.step<0||data.step>=STEPS.length
    ||!STATUS.has(data.status))return null;
  return {version:VERSION,step:data.step,status:data.status,
    hasSavedTransaction:data.hasSavedTransaction===true};
}
export function atStep(raw){return STEPS[normalizeState(raw)?.step??0];}
export function progress(raw){
  const s=normalizeState(raw)||initialState();
  return Math.max(0,Math.min(STEPS.length-1,s.step));
}
export function next(raw){
  const s=normalizeState(raw)||initialState();
  return {...s,step:Math.min(s.step+1,STEPS.length-1),status:'active'};
}
export function advanceTo(raw,index){
  const s=normalizeState(raw)||initialState();
  if(!Number.isInteger(index)||index<0||index>=STEPS.length)throw new Error('Invalid tutorial step');
  return {...s,step:index,status:'active'};
}
export function pause(raw){return {...(normalizeState(raw)||initialState()),status:'paused'};}
export function stop(raw){return {...(normalizeState(raw)||initialState()),status:'skipped'};}
export function finish(raw){return {...(normalizeState(raw)||initialState()),step:STEPS.length-1,status:'completed'};}
export function markSaved(raw){
  const s=normalizeState(raw)||initialState();
  return {...s,hasSavedTransaction:true};
}
export function isAutoEligible({saved,historyLoaded,hasHistory,hasAccounts,hasConfigured,hasLegacy}={}){
  if(!historyLoaded)return false;
  const state=normalizeState(saved);
  if(state)return state.status==='paused'||state.status==='active';
  // Conservative legacy guard: existing finances/settings belong to established members.
  return !hasHistory&&!hasAccounts&&!hasConfigured&&!hasLegacy;
}
export function isStepSatisfied(step,{hasType=false,hasTransaction=false,hasCategory=false,
  hasAccount=false,hasRealSave=false}={}){
  switch(step){
  case 'type':return !!hasType;
  case 'transaction':return !!hasTransaction;
  case 'category':return !!hasCategory;
  case 'first':return !!hasAccount&&!!hasType&&!!hasTransaction&&!!hasCategory&&!!hasRealSave;
  default:return true;
  }
}
export function canShowAccountCoach({hasAccount,hasPath}={}){
  return !hasAccount?'account':!hasPath?'manage':'transaction';
}
