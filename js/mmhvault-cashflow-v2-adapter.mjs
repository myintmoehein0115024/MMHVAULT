/* Cashflow V2.0.9 read-only adapter; no auto mount or network requests. */
import {verifiedBoundaries} from './mmhvault-cashflow-v2-report-context.mjs';
function buildAdapter(ports){
 const positive=v=>{if(v===null||v===undefined||typeof v==='boolean'||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)&&n>0?n:null};
 const code=v=>String(v??'').trim().toUpperCase().replace(/^RMB$/,'CNY');
 const name=v=>String(v??'').trim().toLowerCase();
 const key=v=>String(v??'').slice(0,10);
 const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 const finite=v=>typeof v==='number'&&Number.isFinite(v);
 const common='USD THB MMK CNY AMD'.split(' ');
 const extra='EUR GBP AUD CAD CHF NZD'.split(' ');
 const asia='AFN AMD AZN BDT BHD BND BTN CNY GEL HKD IDR ILS INR IQD IRR JOD JPY KGS KHR KPW KRW KWD KZT LAK LBP LKR MMK MNT MOP MVR MYR NPR OMR PHP PKR QAR RUB SAR SGD SYP THB TJS TMT TRY TWD UZS VND YER AED USD'.split(' ');
 const owned=s=>Array.isArray(s?.rows)&&s.rows.every(r=>r?.user_id===s.owner);
 function read(){
  const uid=ports.owner(),epoch=ports.epoch();
  if(!uid||ports.guard()!==true||ports.configOwner()!==uid)return null;
  const state=ports.data();
  if(state?.owner!==uid||state?.ready!==true||!owned(state)||!Array.isArray(state.accounts)||!Array.isArray(state.categories))return null;
  const same=()=>ports.owner()===uid&&ports.epoch()===epoch&&ports.configOwner()===uid&&ports.guard()===true;
  if(!same())return null;
  const accounts=state.accounts.map(a=>({id:a.id,name:String(a.name??''),currency:code(a.currency),fxPerUSD:positive(a.fxPerUSD),active:a.active!==false}));
  const byName=new Map();
  for(const a of accounts){
   if(!a.name||!a.currency)continue;
   const aliases=[name(a.name),...(a.id==='acc_bath'?['baht','bath']:[])];
   for(const k of new Set(aliases)){const prior=byName.get(k);byName.set(k,prior===undefined?a:prior===a?a:null)}
  }
  const accountFor=v=>byName.get(name(v))||null;
  const currencySet=new Set([...common,...Array.from(state.currencies||[],code),...accounts.map(a=>a.currency),...asia,...extra].filter(c=>/^[A-Z]{3}$/.test(c)));
  const rates=new Map();
  for(const c of currencySet){if(!same())return null;rates.set(c,c==='USD'?1:positive(ports.rate(c,uid)))}
  const displayRate=c=>same()?rates.get(code(c))??null:null;
  const accountRate=a=>{if(!same())return null;const found=accountFor(a);if(!found)return null;return {currency:found.currency,perUsd:found.currency==='USD'?1:found.fxPerUSD??displayRate(found.currency)}};
  const canonical=v=>accountFor(v)?.name??v;
  const rows=state.rows.map(t=>({...t,from_account:canonical(t.from_account),to_account:canonical(t.to_account)}));
  const dates=rows.map(t=>key(t.tx_date)).filter(validDate).sort();
  const balances=scope=>{
   if(!same()||scope.categories?.length||scope.originalCurrencies?.length||scope.accounts?.length||!validDate(scope.start)||!validDate(scope.end))return {};
   const factor=displayRate(scope.currency);
   if(!factor)return {};
   const snapshots=ports.history?.(scope,uid);
   if(!same())return {};
   if(snapshots?.owner!==uid||snapshots?.verified!==true||snapshots?.start!==scope.start||snapshots?.end!==scope.end||snapshots?.basis!=='period-boundary-net-assets-usd'){const r=ports.historyRows?.(uid);return same()&&r?.owner===uid&&r.verified===true?verifiedBoundaries({rows:r.rows,owner:uid,scope,today:ports.today(),rate:factor}):{}}
   const value=v=>finite(v)&&finite(v*factor)?v*factor:null;
   return {opening:value(snapshots.openingUsd),closing:value(snapshots.closingUsd)};
  };
  const currentAssets=c=>{
   if(!same())return null;
   const r=ports.currentAssets?.(uid),factor=displayRate(c);
   if(!same()||r?.owner!==uid||r?.verified!==true||!finite(r.usd)||!factor||!finite(r.usd*factor))return null;
   return r.usd*factor;
  };
  const verifiedHistory=()=>{if(!same())return [];const r=ports.historyRows?.(uid);return same()&&r?.owner===uid&&r?.verified===true&&Array.isArray(r.rows)?r.rows:[]};
  const healthInputs=c=>{if(!same())return null;const r=ports.healthInputs?.(c,uid);return same()&&r?.owner===uid&&r?.verified===true?r.data??null:null};
  const investmentSource=()=>{if(!same())return null;const p=ports.investmentSource?.(uid);return same()&&p?.owner===uid&&p.ready===true?p:null};
  const planning=c=>{
   if(!same())return null;
   const p=ports.planning?.(c,uid);
   if(!same()||p?.owner!==uid||p?.verified!==true)return null;
   return p.data??null;
  };
  if(!same())return null;
  return {owner:uid,ready:true,isCurrent:same,rows,earliest:dates[0]||ports.today(),currencies:[...currencySet],accounts:[...new Set(accounts.map(a=>a.name).filter(Boolean))],categories:[...new Set([...state.categories,...rows.map(r=>r.category)].filter(c=>typeof c==='string'&&c))],accountRate,displayRate,groupOf:t=>same()?ports.groupOf(t):'',isLinkedInvestment:t=>!same()||ports.isLinkedInvestment(t),balances,currentAssets,planning,investmentSource,verifiedHistory,healthInputs,fixedOf:r=>same()?ports.fixedOf?.(r,uid):null};
 }
 return {owner:ports.owner,today:ports.today,language:ports.language,read,releaseReadOnly:ports.releaseReadOnly===true,...(ports.openModule?{openModule:k=>{const s=read();if(s)ports.openModule(k,s.owner)}}:{})};
}
function makeLegacyPorts(host,bindings){
 const owner=()=>bindings.owner()||'';
 return {
  owner,epoch:()=>Number(host.__mmhSessionEpochV1239)||0,configOwner:bindings.configOwner,releaseReadOnly:bindings.releaseReadOnly===true,
  guard:()=>{const layer=host.document.getElementById('mmhP947AccountGuard');return !layer||layer.hidden||layer.style.display==='none'},
  today:()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')},
  language:()=>host.document.documentElement.lang?.slice(0,2)||'en',
  data:()=>{
   const uid=owner(),ds=host.mmhvaultDataStateV334,raw=bindings.config();
   return {owner:host.mmhWalletDataOwnerV191,ready:!!uid&&['ready','dirty'].includes(ds?.status)&&Number(host.__mmhLastCloudLoadAtV1235)>0,rows:host.transactions,accounts:raw?.accounts,categories:Object.values(raw?.categories||{}).filter(Array.isArray).flat(),currencies:bindings.currencies()};
  },
  rate:(c,uid)=>{
   if(owner()!==uid)return null;
   if(c==='USD')return 1;
   if(host.MMHExchangeEffectiveFXV2)return typeof host.MMHExchangeEffectiveFXV2.getUsdRate==='function'?host.MMHExchangeEffectiveFXV2.getUsdRate(c):null;
   const raw=host.__mmhExchangeRawRatesV2;
   if(raw?.owner!==uid||raw.row?.user_id!==uid)return null;
   const field={THB:'usd_thb',CNY:'usd_cny',MMK:'usd_mmk'}[c];
   return field?raw.row[field]:null;
  },
  groupOf:bindings.groupOf,isLinkedInvestment:bindings.isLinkedInvestment,
  // No trusted historical/current valuation or planning bridge is wired here yet.
  history:bindings.history,currentAssets:bindings.currentAssets,investmentSource:bindings.investmentSource,planning:bindings.planning||((c,uid)=>{const s=bindings.planningBridge?.current();return s?.owner===uid&&s.plan?{owner:uid,verified:true,data:s.plan}:null}),historyRows:bindings.historyRows,healthInputs:bindings.healthInputs,fixedOf:bindings.fixedOf,openModule:bindings.openModule
 };
}
export {buildAdapter,makeLegacyPorts};
