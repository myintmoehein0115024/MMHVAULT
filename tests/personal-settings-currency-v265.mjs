import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const start=app.indexOf('  const cashflowCurrenciesV918=');
const end=app.indexOf('  window.mmhRestoreAnalyzeCurrencyV918=restoreCurrencyV918;',start);
assert(start>=0&&end>start,'source anchors');
let owner='a',renders=0;
const data=new Map(),select={value:''},state={currency:'USD'};
const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
const globalKey=id=>'mmhvault_settings_display_v2_'+id;
const overrideKey=id=>'mmhvault_analyze_currency_v918_'+id;
const global=(id,currency)=>data.set(globalKey(id),JSON.stringify({currency,theme:'dark'}));
const api=new Function('localStorage','state','$','render','getOwner','const currentSessionUser={get id(){return getOwner()}};'+app.slice(start,end)+';return {restoreCurrencyV918,saveCurrencyV918,readCurrencyV918};')(storage,state,id=>id==='cfaCurrency'?select:{},()=>renders++,()=>owner);
const restore=()=>api.restoreCurrencyV918(),save=v=>api.saveCurrencyV918(v);
global('a','THB');restore();assert(state.currency==='THB'&&select.value==='GLOBAL','initial global');
save('USD');assert(state.currency==='USD'&&select.value==='USD','page override');assert(data.get(globalKey('a'))===JSON.stringify({currency:'THB',theme:'dark'}),'global untouched');
global('a','MMK');restore();assert(state.currency==='USD','global change retains override');
save('GLOBAL');assert(state.currency==='MMK'&&select.value==='GLOBAL'&&!data.has(overrideKey('a')),'follow default');
save('INVALID');assert(state.currency==='MMK'&&!data.has(overrideKey('a')),'invalid rejected');
save('CNY');owner='b';global('b','THB');restore();assert(state.currency==='THB'&&select.value==='GLOBAL','owner isolation');
owner='guest';restore();assert(state.currency==='USD'&&select.value==='GLOBAL','guest does not inherit owner');
owner='a';restore();assert(state.currency==='CNY','restore own override');
save('GLOBAL');data.set(globalKey('a'),'invalid json');restore();assert(state.currency==='USD','corrupt settings fail safely');
global('a','ZZZ');restore();assert(state.currency==='USD','unsupported global fails safely');
for(const id of ['mmhvault-cashflow-analyze-v1-js','mmhvault-settings-v2-js']){const p=app.indexOf('<script id="'+id+'">'),q=app.indexOf('</script>',p);assert(p>=0&&q>p,'script exists '+id);new Function(app.slice(app.indexOf('>',p)+1,q));}
assert(!app.includes('mmhSettingsSyncCashflowCurrencyV71?.(state.currency)'),'no reverse sync');
assert(app.includes('if(name===\'currency\')window.mmhRestoreAnalyzeCurrencyV918?.()'),'settings restore not change event');

console.log('PASS: owner-scoped Analyze/default currency isolation; source scripts parse');
