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
assert(app.includes('if(name===\'currency\'){window.mmhRestoreAnalyzeCurrencyV918?.()'),'settings restore not change event');

console.log('PASS: owner-scoped Analyze/default currency isolation; source scripts parse');

const {resolvePersonalCashflowCurrencyV265:resolveV265,savePersonalCashflowCurrencyV265:saveV265}=await import('../js/mmhvault-cashflow-v2-ui.mjs');
const codesV265=['USD','THB','MMK','JPY'],getV265=(u,v)=>resolveV265(storage,u,v,codesV265),putV265=(u,v,c)=>saveV265(storage,u,v,c,codesV265);
global('cash-a','THB');
assert.equal(getV265('cash-a','summary'),'THB');
assert(putV265('cash-a','summary','JPY'));
assert(putV265('cash-a','analysis','USD'));
assert(putV265('cash-a','report','MMK'));
assert.equal(getV265('cash-a','summary'),'JPY');
assert.equal(getV265('cash-a','analysis'),'USD');
assert.equal(getV265('cash-a','report'),'MMK');
assert.equal(getV265('cash-b','summary'),'USD');
assert.equal(getV265('cash-a','planning'),'THB');
global('cash-a','MMK');
assert.equal(getV265('cash-a','summary'),'JPY');
assert.equal(getV265('cash-a','planning'),'MMK');
assert(!putV265('cash-a','report','ZZZ'));
assert(!putV265('','report','USD'));
assert.equal(getV265('cash-a','report'),'MMK');
assert.equal(getV265('','summary'),'USD');
data.set(overrideKey('cash-b'),'JPY');
assert.equal(getV265('cash-b','analysis'),'JPY');
assert.equal(getV265('cash-b','report'),'USD');
console.log('PASS: 17 active Cash Flow V2 display preference assertions (synthetic storage)');

const acStart=app.indexOf('const mmhAccountDisplayCodesV926='),acEnd=app.indexOf('\nfunction visuals(){',acStart);
assert(acStart>=0&&acEnd>acStart);
let acOwner='acct-a';const accountSelects={apCurrency:{},apRowCurrency:{}};
const accountAPI=new Function('localStorage','currentSessionUser','$',"let displayCurrency='USD',rowDisplayCurrency='NATIVE';"+app.slice(acStart,acEnd)+';return {restore:mmhAccountDisplayRestoreV926,save:mmhAccountDisplaySaveV926,get:()=>[displayCurrency,rowDisplayCurrency]}')(storage,{get id(){return acOwner}},id=>accountSelects[id]);
global('acct-a','THB');accountAPI.restore();assert.deepEqual(accountAPI.get(),['THB','THB']);
assert.equal(accountSelects.apCurrency.value,'GLOBAL');
accountAPI.save('JPY');assert.deepEqual(accountAPI.get(),['JPY','THB']);
accountAPI.save('NATIVE',true);assert.deepEqual(accountAPI.get(),['JPY','NATIVE']);
global('acct-a','MMK');accountAPI.restore();assert.deepEqual(accountAPI.get(),['JPY','NATIVE']);
accountAPI.save('GLOBAL');assert.deepEqual(accountAPI.get(),['MMK','NATIVE']);
accountAPI.save('GLOBAL',true);assert.deepEqual(accountAPI.get(),['MMK','MMK']);
accountAPI.save('USD');global('acct-a','CNY');accountAPI.restore();assert.deepEqual(accountAPI.get(),['USD','CNY']);
acOwner='acct-b';global('acct-b','THB');accountAPI.restore();assert.deepEqual(accountAPI.get(),['THB','THB']);
acOwner='';accountAPI.restore();assert.deepEqual(accountAPI.get(),['USD','USD']);
acOwner='acct-a';accountAPI.restore();assert.deepEqual(accountAPI.get(),['USD','CNY']);
accountAPI.save('ZZZ');assert.deepEqual(accountAPI.get(),['USD','CNY']);
assert.equal(JSON.parse(data.get(globalKey('acct-a'))).currency,'CNY');
console.log('PASS: 13 Accounts display preference assertions (synthetic storage)');

const {readPersonalCashflowCurrencyChoiceV265:readChoiceV265}=await import('../js/mmhvault-cashflow-v2-ui.mjs');
const choiceV265=(u,v)=>readChoiceV265(storage,u,v,codesV265);
global('cash-reset','THB');data.set(overrideKey('cash-reset'),'JPY');
assert.equal(choiceV265('cash-reset','analysis'),'JPY');
assert.equal(getV265('cash-reset','analysis'),'JPY');
assert(putV265('cash-reset','analysis','GLOBAL'));
assert.equal(choiceV265('cash-reset','analysis'),'GLOBAL');
assert.equal(getV265('cash-reset','analysis'),'THB');
assert(putV265('cash-reset','analysis','THB'));
global('cash-reset','MMK');
assert.equal(getV265('cash-reset','analysis'),'THB');
assert.equal(getV265('cash-reset','summary'),'MMK');
assert.equal(getV265('cash-other','analysis'),'USD');
assert(!putV265('cash-reset','analysis','ZZZ'));
assert(!putV265('','analysis','GLOBAL'));
assert.equal(resolveV265(storage,'cash-reset','analysis',codesV265,'USD','JPY'),'JPY');
console.log('PASS: 12 Cash Flow follow-default, legacy migration and explicit-choice assertions');

const forecast=readFileSync(new URL('../js/mmhvault-forecast-v1.js',import.meta.url),'utf8');
new Function(forecast);
const fcStart=forecast.indexOf(' const viewCodes='),fcEnd=forecast.indexOf('  const customToField=',fcStart);
assert(fcStart>=0&&fcEnd>fcStart);
const fcCodes=forecast.match(/const CURRENCIES=(\[[^\n]+\]);/)[1];
let fcOwner='forecast-a';
const fcAPI=new Function('localStorage','owner','const CURRENCIES='+fcCodes+';const validCcy=c=>CURRENCIES.includes(c);const localKey=id=>"mmhvault_forecast_plan_v1_"+id;let activeOwner="",state={};'+forecast.slice(fcStart,fcEnd)+';return {readViewChoice,resolveViewCurrency,setViewChoice,activate:id=>{activeOwner=id;viewChoice=readViewChoice(id);state.viewCurrency=resolveViewCurrency(id,viewChoice)},get:()=>state.viewCurrency}')(storage,()=>fcOwner);
global(fcOwner,'THB');fcAPI.activate(fcOwner);assert.equal(fcAPI.get(),'THB');
assert(fcAPI.setViewChoice('JPY'));assert.equal(fcAPI.get(),'JPY');
global(fcOwner,'MMK');fcAPI.activate(fcOwner);assert.equal(fcAPI.get(),'JPY');
assert(fcAPI.setViewChoice('GLOBAL'));assert.equal(fcAPI.get(),'MMK');
const fcPlanKey='mmhvault_forecast_plan_v1_'+fcOwner;
const savedPlan=JSON.stringify({version:3,viewCurrency:'USD',base:{salary:123}});
data.set(fcPlanKey,savedPlan);fcAPI.activate(fcOwner);assert.equal(fcAPI.get(),'MMK');
assert(fcAPI.setViewChoice('MMK'));global(fcOwner,'THB');fcAPI.activate(fcOwner);assert.equal(fcAPI.get(),'MMK');
fcOwner='forecast-b';global(fcOwner,'CNY');assert(!fcAPI.setViewChoice('USD'));fcAPI.activate(fcOwner);assert.equal(fcAPI.get(),'CNY');
assert(!fcAPI.setViewChoice('ZZZ'));assert.equal(fcAPI.readViewChoice(''),'GLOBAL');assert.equal(fcAPI.resolveViewCurrency('','JPY'),'USD');
assert.equal(data.get(fcPlanKey),savedPlan);
data.set('mmhvault_forecast_plan_v1_'+fcOwner,JSON.stringify({version:3,viewCurrency:'SGD'}));fcAPI.activate(fcOwner);assert.equal(fcAPI.get(),'SGD');
assert(fcAPI.setViewChoice('GLOBAL'));fcAPI.activate(fcOwner);assert.equal(fcAPI.get(),'CNY');
assert(forecast.includes('viewCurrency:validViewCcy(viewChoice)?viewChoice:undefined'));
assert(forecast.includes("currencyPickerHTML('view',state.viewCurrency,['GLOBAL',...viewCodes()]"));
console.log('PASS: Future Assets owner-scoped immediate display preference, legacy fallback and scenario isolation (synthetic storage)');


const pickerStart=forecast.indexOf(' function currencyPickerHTML('),pickerEnd=forecast.indexOf(' function setupCurrencyPicker(',pickerStart);
assert(pickerStart>=0&&pickerEnd>pickerStart);
for(const [lang,defaultLabel,followLabel] of [['en','Default','Follow default'],['zh','默认','跟随默认币种'],['my','မူလ','မူလငွေကြေးအတိုင်း']]){
 const labels={Default:defaultLabel,'Follow default':followLabel};
 const picker=new Function('window','tr','esc','viewChoice',forecast.slice(pickerStart,pickerEnd)+';return currencyPickerHTML;')({MMHCurrencyPickerV3:{flag:()=>''}},(en,zh)=>labels[en]||(lang==='zh'?zh:en),String,'GLOBAL');
 const html=picker('view','THB',['GLOBAL','USD','THB'],'Currency');
 assert(html.includes('THB · '+defaultLabel));assert(html.includes('value="GLOBAL" selected>'+followLabel));
 const field=picker('field','THB',['THB'],'Currency');assert(!field.includes('THB · '+defaultLabel));
}
console.log('PASS: Future Assets effective default label in three languages and field isolation');

const ovStart=app.indexOf('<script id="mmhvault-premium-finance-v500-script">'),ovEnd=app.indexOf('</script>',ovStart);
assert(ovStart>=0&&ovEnd>ovStart);
const ovScript=app.slice(ovStart,ovEnd);
new Function(ovScript.slice(ovScript.indexOf('>')+1));
const ovA=ovScript.indexOf('const marketMoney='),ovB=ovScript.indexOf('const pct=',ovA);
assert(ovA>=0&&ovB>ovA);
let ovOwner='overview-a';
global(ovOwner,'THB');global('overview-b','MMK');
const ovWin={mmhAccountDisplayTotalV203:(v,c)=>c==='THB'?'THB '+v*35:c==='CNY'?'CNY '+v*7:'—'};
const ovAPI=new Function('window','localStorage','currentSessionUser','N',ovScript.slice(ovA,ovB)+';return {money,overviewCurrencyV265,signedMoneyV265,marketMoney,overviewChoiceV265,saveOverviewChoiceV265};')(ovWin,storage,{get id(){return ovOwner}},Number);
assert.equal(ovAPI.money(10),'THB 350');
assert.equal(ovAPI.signedMoneyV265(10,true),'+THB 350');
assert.equal(ovAPI.money(NaN),'—');
assert.equal(ovAPI.marketMoney(10),'$10.00');
ovOwner='overview-b';assert.equal(ovAPI.money(10),'—');
assert.equal(ovAPI.signedMoneyV265(10,true),'—');
ovOwner='';assert.equal(ovAPI.money(10),'$10.00');
ovOwner='overview-a';global(ovOwner,'CNY');assert.equal(ovAPI.money(10),'CNY 70');
global(ovOwner,'ZZZ');assert.equal(ovAPI.overviewCurrencyV265(),'USD');
data.set(globalKey(ovOwner),'bad');assert.equal(ovAPI.money(10),'$10.00');
assert(ovScript.includes('trendRange,overviewCurrencyV265(),tx,inv'));
assert(ovScript.includes("x.p?marketMoney(x.p):'—'"));
assert(ovScript.includes("window.addEventListener('mmhvault:personal-display-currency-changed'"));
console.log('PASS: active Overview default currency, missing FX, owner isolation and USD market-reference preservation (synthetic formatter)');



global('overview-a','THB');ovOwner='overview-a';
const oaKey='mmhvault_overview_display_currency_v265_overview-a';
const oaGlobal=data.get(globalKey(ovOwner));
assert.equal(ovAPI.overviewChoiceV265(),'GLOBAL');
assert(ovAPI.saveOverviewChoiceV265('THB'));
assert.equal(data.get(oaKey),'THB');
assert.equal(data.get(globalKey(ovOwner)),oaGlobal);
global(ovOwner,'CNY');assert.equal(ovAPI.overviewCurrencyV265(),'THB');
assert(ovAPI.saveOverviewChoiceV265('USD'));assert.equal(ovAPI.money(10),'$10.00');
ovOwner='overview-b';assert.equal(ovAPI.overviewChoiceV265(),'GLOBAL');assert.equal(ovAPI.money(10),'—');
assert(!ovAPI.saveOverviewChoiceV265('ZZZ'));assert.equal(ovAPI.overviewCurrencyV265(),'MMK');
ovOwner='overview-a';assert.equal(ovAPI.overviewCurrencyV265(),'USD');
assert(ovAPI.saveOverviewChoiceV265('GLOBAL'));assert(!data.has(oaKey));assert.equal(ovAPI.money(10),'CNY 70');
ovOwner='';assert(!ovAPI.saveOverviewChoiceV265('THB'));assert.equal(ovAPI.overviewChoiceV265(),'GLOBAL');
assert(ovScript.includes('overviewChoiceV265(),overviewOwnerV265()'));
assert(ovScript.includes("window.dispatchEvent(new CustomEvent('mmhvault:overview-display-currency-changed'))"));
const overviewPickerStart=ovScript.indexOf('function overviewPickerHTMLV265(){'),overviewPickerEnd=ovScript.indexOf('function bindOverviewPickerV265(',overviewPickerStart);
assert(overviewPickerStart>=0&&overviewPickerEnd>overviewPickerStart);
const overviewMarkup=new Function('overviewCodesV265',ovScript.slice(overviewPickerStart,overviewPickerEnd)+';return overviewPickerHTMLV265()')(['USD','THB','MMK','CNY']);
assert(overviewMarkup.includes('value="GLOBAL"'));assert(overviewMarkup.includes('pfDisplaySearchV265'));
assert(overviewMarkup.includes('value="THB"'));assert(overviewMarkup.includes('ap-currency-list-v2'));
console.log('PASS: independent Overview selection, explicit same-default, owner isolation, reset and picker template');

const sigStart=app.indexOf('<script id="mmhvault-v150-financial-signals">'),sigEnd=app.indexOf('</script>',sigStart);
assert(sigStart>=0&&sigEnd>sigStart);
const sigScript=app.slice(sigStart,sigEnd);
new Function(sigScript.slice(sigScript.indexOf('>')+1));
const sigA=sigScript.indexOf('  function fmtOverviewV265('),sigB=sigScript.indexOf('  function fx(',sigA);
assert(sigA>=0&&sigB>sigA);
const signalFormatter=new Function('window',sigScript.slice(sigA,sigB)+';return fmtOverviewV265;');
assert.equal(signalFormatter({mmhOverviewDisplayMoneyV265:ovAPI.money})(10),ovAPI.money(10));
assert.equal(signalFormatter({mmhOverviewDisplayMoneyV265:v=>'THB '+v*35})(10),'THB 350');
assert.equal(signalFormatter({mmhOverviewDisplayMoneyV265:()=>{throw Error('FX')}})(10),'—');
assert.equal(signalFormatter({})(10),'—');
assert.equal(signalFormatter({mmhOverviewDisplayMoneyV265:()=>'—'})(10),'—');
assert.equal(signalFormatter({mmhOverviewDisplayMoneyV265:()=>'$10.00'})(NaN),'—');
const sigDash=sigScript.slice(sigScript.indexOf('  function renderDashboard(){'),sigScript.indexOf('  function reportInsightCard('));
assert.equal((sigDash.match(/fmtOverviewV265\(/g)||[]).length,6);
assert(!sigDash.includes('fmtUSD('));
assert(sigScript.includes("['mmhvault:personal-display-currency-changed','mmhvault:config-owner-changed','mmhvault:market-updated']"));
console.log('PASS: Overview Financial Signals uses shared display formatter and fails closed (synthetic formatter and source checks)');

const obStart=app.indexOf('<script id="mmhvault-budget-dashboard-v112-js">'),obEnd=app.indexOf('</script>',obStart);
assert(obStart>=0&&obEnd>obStart);
const obScript=app.slice(obStart,obEnd);
new Function(obScript.slice(obScript.indexOf('>')+1));
const obA=obScript.indexOf('  function fmtOverviewBudgetV265('),obB=obScript.indexOf('  function group(t)',obA);
assert(obA>=0&&obB>obA);
const makeBudgetFormatter=new Function('window','rate','fmt',obScript.slice(obA,obB)+';return fmtOverviewBudgetV265;');
const budgetRate=c=>({USD:1,THB:35,MMK:0}[c]||0),nativeBudgetFmt=(v,c)=>c+' '+v;
const budgetDisplay=makeBudgetFormatter({mmhOverviewDisplayCurrencyV265:()=> 'USD',mmhOverviewDisplayMoneyV265:v=>'USD '+v},budgetRate,nativeBudgetFmt);
assert.equal(budgetDisplay(350,'THB'),'USD 10');
assert.equal(budgetDisplay(0,'THB'),'USD 0');
assert.equal(budgetDisplay(-70,'THB'),'USD -2');
assert.equal(budgetDisplay(100,'MMK'),'—');
assert.equal(budgetDisplay(NaN,'THB'),'—');
assert.equal(makeBudgetFormatter({},budgetRate,nativeBudgetFmt)(350,'THB'),'—');
assert.equal(makeBudgetFormatter({mmhOverviewDisplayCurrencyV265:()=> 'MMK'},budgetRate,nativeBudgetFmt)(50,'MMK'),'MMK 50');
assert.equal(makeBudgetFormatter({mmhOverviewDisplayCurrencyV265:()=> 'USD',mmhOverviewDisplayMoneyV265:()=>{throw Error('FX')}},budgetRate,nativeBudgetFmt)(350,'THB'),'—');
assert(obScript.includes('used=spent(currency),remaining=budget-used,usage=used/budget*100'));
assert(obScript.includes("budget>0&&hasSourceFX?usage.toFixed(2)+'%':'—'"));
assert(obScript.includes("['mmhvault:personal-display-currency-changed','mmhvault:market-updated','mmhvault:account-reference-fx-updated']"));
assert(sigScript.includes("const tone=usage==='—'?'':"));
console.log('PASS: Overview budget presentation conversion, missing FX guards and original calculation basis');

const txStartV265=app.indexOf('<script id="mmhvault-v34241-transaction-partial-dom">'),txEndV265=app.indexOf('</script>',txStartV265);
assert(txStartV265>=0&&txEndV265>txStartV265);
const txScriptV265=app.slice(txStartV265,txEndV265);
new Function(txScriptV265.slice(txScriptV265.indexOf('>')+1));
const txA=txScriptV265.indexOf('  const txDisplayCodesV265='),txB=txScriptV265.indexOf('  function txDisplayTextV265(',txA);
assert(txA>=0&&txB>txA);
let txOwner='tx-a',txConfigOwner='tx-a';
const txRates={THB:35,MMK:4000,CNY:7};
const txAccounts={Cash:{id:'1',currency:'THB'},Dollar:{id:'3',currency:'USD'},Missing:{id:'4',currency:'JPY'},Unknown:{id:'legacy_Unknown',currency:'MMK'}};
const txWin={MMHExchangeEffectiveFXV2:{getUsdRate:c=>txRates[c]}};
const txAPI=new Function('localStorage','window','mmhVaultAccountMeta','txMoneyV720','getOwner','getConfig','let currentSessionUser,MMHVAULT_CONFIG_OWNER;'+txScriptV265.slice(txA,txB)+';return {sync:()=>{currentSessionUser=getOwner()?{id:getOwner()}:null;MMHVAULT_CONFIG_OWNER=getConfig()},choice:txDisplayChoiceV265,currency:txDisplayCurrencyV265,save:txSaveDisplayV265,ref:txReferenceV265,money:txDisplayMoneyV265}')(storage,txWin,a=>txAccounts[a],(v,a)=>a+' '+v,()=>txOwner,()=>txConfigOwner);
const txRecord={user_id:'tx-a',from_amount:350};
txAPI.sync();global('tx-a','USD');
assert.equal(txAPI.currency(),'USD');
assert.equal(txAPI.ref(txRecord,350,'Cash'),'≈ USD 10.00');
assert.equal(txAPI.money(txRecord,350,'Cash'),'Cash 350\n≈ USD 10.00');
assert.equal(txAPI.ref(txRecord,10,'Dollar'),'');
assert.equal(txAPI.ref(txRecord,50,'Unknown'),'≈ USD —');
assert.equal(txAPI.ref(txRecord,100,'Missing'),'≈ USD —');
assert(txAPI.save('USD'));global('tx-a','THB');
assert.equal(txAPI.currency(),'USD');
assert(txAPI.save('GLOBAL'));assert.equal(txAPI.currency(),'THB');
assert.equal(txAPI.ref(txRecord,10,'Dollar'),'≈ THB 350.00');
assert(txAPI.save('NATIVE'));assert.equal(txAPI.ref(txRecord,10,'Dollar'),'');
assert(txAPI.save('CNY'));assert.equal(txAPI.ref(txRecord,350,'Cash'),'≈ CNY 70.00');
delete txRates.CNY;assert.equal(txAPI.ref(txRecord,350,'Cash'),'≈ CNY —');
assert.equal(txAPI.ref({user_id:'tx-b'},350,'Cash'),'');
assert.equal(txAPI.ref(txRecord,null,'Cash'),'');
assert(!txAPI.save('ZZZ'));
txOwner='tx-b';txAPI.sync();assert(!txAPI.save('USD'));assert.equal(txAPI.ref(txRecord,350,'Cash'),'');
txConfigOwner='tx-b';txAPI.sync();global('tx-b','MMK');
assert.equal(txAPI.choice(),'GLOBAL');assert.equal(txAPI.currency(),'MMK');
assert.equal(txAPI.ref({user_id:'tx-b'},10,'Dollar'),'≈ MMK '+(40000).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}));
txOwner='tx-a';txConfigOwner='tx-a';txAPI.sync();assert.equal(txAPI.currency(),'CNY');
assert.equal(JSON.parse(data.get(globalKey('tx-a'))).currency,'THB');assert.equal(txRecord.from_amount,350);
assert(txScriptV265.includes('txDisplayMoneyV265(t,t?.from_amount,t?.from_account)'));
assert(txScriptV265.includes('txDisplayMoneyV265(t,primary.amount,primary.account)'));
assert(txScriptV265.includes('MMHExchangeEffectiveFXV2?.getUsdRate?.(c)'));
assert(app.includes('id="txDisplayPickerV265"'));assert(app.includes('id="mmhvault-tx-display-picker-v265-style"'));
console.log('PASS: Transactions native amounts, reference FX, independent owner preference, reset, missing rates and keyed renderer integration');

/* Actual owner-scoped reader/provider contracts; no network or real records. */
const readStart265=app.indexOf('async function mmhPersonalReadAllV191('),readEnd265=app.indexOf('let mmhWalletReadPendingV191',readStart265);
assert(readStart265>=0&&readEnd265>readStart265);
const readerFactory265=new Function('db','session','let currentSessionUser=session;'+app.slice(readStart265,readEnd265)+';return mmhPersonalReadAllV191');
const ownerSession265={id:'reader-a'}, calls265=[];
const fakeDb265={from(table){return {select(cols){return {eq(key,owner){return {order(order){return {async range(start,end){calls265.push({table,cols,key,owner,order,start,end});return {data:start===0?Array.from({length:500},(_,i)=>({id:i,user_id:owner})): [{id:500,user_id:owner}]}}}}}}}}}}};
const read265=readerFactory265(fakeDb265,ownerSession265);
const records265=await read265('transactions','reader-a');
assert.equal(records265.length,501);
assert(records265.every(x=>x.user_id==='reader-a'));
assert.deepEqual(calls265.map(c=>[c.cols,c.key,c.owner,c.start,c.end]),[['*','user_id','reader-a',0,499],['*','user_id','reader-a',500,999]]);
await assert.rejects(()=>read265('transactions','reader-b'),/session changed/i);
assert.equal(calls265.length,2);
const switchDb265={from(){return {select(){return {eq(){return {order(){return {async range(){ownerSession265.id='reader-b';return {data:[{user_id:'reader-a'}]}}}}}}}}}}};
await assert.rejects(()=>readerFactory265(switchDb265,ownerSession265)('transactions','reader-a'),/session changed/i);
assert(app.includes("(a.data||[]).some(x=>x.user_id!==loadOwner)||(b.data||[]).some(x=>x.user_id!==loadOwner)"));
assert(app.includes("transactions=a.data||[];investments=b.data||[];window.transactions=transactions;"));
const effectiveLine265=app.match(/window\.MMHExchangeEffectiveFXV2=\{recompute,getUsdRate:[^\n]+\};/);
assert(effectiveLine265);
const effectiveFactory265=new Function('window','currentSessionUser','effective','recompute',effectiveLine265[0]+';return window.MMHExchangeEffectiveFXV2.getUsdRate;');
const effectiveSession265={id:'reader-a'},effectiveRow265={user_id:'reader-a',fxUsdRates:{THB:35,JPY:0,CNY:-7}};
const getActualRate265=effectiveFactory265({},effectiveSession265,effectiveRow265,()=>{});
assert.equal(getActualRate265('THB'),35);
assert.equal(getActualRate265('JPY'),null);
assert.equal(getActualRate265('CNY'),null);
assert.equal(getActualRate265('MMK'),null);
effectiveSession265.id='reader-b';assert.equal(getActualRate265('THB'),null);
console.log('PASS: actual paginated owner reader, session-switch rejection, load owner guards and effective FX owner isolation');

const invStart265=app.indexOf('<script id="mmhvault-unified-invest-v1-js">'),invEnd265=app.indexOf('</script>',invStart265);
assert(invStart265>=0&&invEnd265>invStart265);
const invScript265=app.slice(invStart265,invEnd265);
new Function(invScript265.slice(invScript265.indexOf('>')+1));
const invA265=invScript265.indexOf('  const invDisplayCodesV265='),invB265=invScript265.indexOf('  function invDisplayTextV265(',invA265);
assert(invA265>=0&&invB265>invA265);
let invOwner265='inv-a',invConfig265='inv-a';
const invData265=new Map(),invStore265={getItem:k=>invData265.get(k)||null,setItem:(k,v)=>invData265.set(k,v),removeItem:k=>invData265.delete(k)};
const invGlobal265=(id,c)=>invData265.set('mmhvault_settings_display_v2_'+id,JSON.stringify({currency:c}));
const invRates265={THB:35,MMK:4000,CNY:7};
const invAPI265=new Function('localStorage','window','getOwner','getConfig','let currentSessionUser,MMHVAULT_CONFIG_OWNER;'+invScript265.slice(invA265,invB265)+';return {sync:()=>{currentSessionUser=getOwner()?{id:getOwner()}:null;MMHVAULT_CONFIG_OWNER=getConfig()},choice:invDisplayChoiceV265,currency:invDisplayCurrencyV265,save:invSaveDisplayV265,ref:invReferenceV265}')(invStore265,{MMHExchangeEffectiveFXV2:{getUsdRate:c=>invRates265[c]}},()=>invOwner265,()=>invConfig265);
const refExpected265=(c,v)=>'≈ '+c+' '+v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
invAPI265.sync();invGlobal265('inv-a','THB');
assert.equal(invAPI265.choice(),'GLOBAL');
assert.equal(invAPI265.ref(10,'USD','inv-a'),refExpected265('THB',350));
assert.equal(invAPI265.ref(40000,'MMK','inv-a'),refExpected265('THB',350));
assert.equal(invAPI265.ref(-10,'USD','inv-a'),refExpected265('THB',-350));
assert.equal(invAPI265.ref(0,'USD','inv-a'),refExpected265('THB',0));
assert.equal(invAPI265.ref(null,'USD','inv-a'),'≈ THB —');
assert.equal(invAPI265.ref('', 'USD','inv-a'),'≈ THB —');
assert.equal(invAPI265.ref(true,'USD','inv-a'),'≈ THB —');
assert.equal(invAPI265.ref(NaN,'USD','inv-a'),'≈ THB —');
assert.equal(invAPI265.ref(10,'JPY','inv-a'),'');
assert.equal(invAPI265.ref(10,'USD','inv-b'),'');
assert(invAPI265.save('THB'));invGlobal265('inv-a','CNY');
assert.equal(invAPI265.currency(),'THB');
assert(invAPI265.save('GLOBAL'));assert.equal(invAPI265.currency(),'CNY');
assert(invAPI265.save('USD'));assert.equal(invAPI265.ref(10,'USD','inv-a'),'');
delete invRates265.MMK;assert.equal(invAPI265.ref(40000,'MMK','inv-a'),'≈ USD —');
assert(invAPI265.save('NATIVE'));assert.equal(invAPI265.ref(10,'USD','inv-a'),'');
assert(!invAPI265.save('ZZZ'));
invOwner265='inv-b';invAPI265.sync();assert(!invAPI265.save('THB'));assert.equal(invAPI265.ref(10,'USD','inv-b'),'');
invConfig265='inv-b';invAPI265.sync();invGlobal265('inv-b','MMK');assert.equal(invAPI265.choice(),'GLOBAL');assert.equal(invAPI265.ref(10,'USD','inv-b'),'≈ MMK —');
invRates265.MMK=4000;assert.equal(invAPI265.ref(10,'USD','inv-b'),refExpected265('MMK',40000));
invOwner265='inv-a';invConfig265='inv-a';invAPI265.sync();assert.equal(invAPI265.choice(),'NATIVE');
assert.equal(JSON.parse(invData265.get('mmhvault_settings_display_v2_inv-a')).currency,'CNY');
assert(invScript265.includes('nativeReady?(()=>{const ref=invReferenceV265(n,cur,owner)'));
assert(invScript265.includes("querySelectorAll('.inv-fx-ref-v265').forEach(n=>n.remove())"));
assert(invScript265.includes("cell(key,'Crypto','USD')+cell(key,'Gold','MMK')"));
assert(app.includes('id="invDisplayPickerV265"'));assert(app.includes('id="mmhvault-inv-display-picker-v265-style"'));
console.log('PASS: Investment native KPI references, missing rates, signed values, independent settings, owner guard and reset');

/* Holding-card presentation reuses the verified native overview and owner-scoped FX helper. */
const holdingLine265=invScript265.match(/const holdingRef=.*?;\n/);
assert(holdingLine265);
const holdingFactory265=new Function('nativeReady','nativeMetrics','gold','native','owner','invReferenceV265',holdingLine265[0]+'return holdingRef');
const holdingMetrics265={Gold:{cost:10,value:null,unreal:null},Crypto:{cost:0,value:0,unreal:0}};
const holdingReference265=(n,c,o)=>n+'/'+c+'/'+o;
assert.equal(holdingFactory265(true,holdingMetrics265,true,'MMK','a',holdingReference265)(10,'cost'),'10/MMK/a');
assert.equal(holdingFactory265(true,holdingMetrics265,true,'MMK','a',holdingReference265)(null,'value'),'');
assert.equal(holdingFactory265(false,holdingMetrics265,false,'USD','a',holdingReference265)(1,'cost'),'');
assert.equal(holdingFactory265(true,holdingMetrics265,false,'USD','a',holdingReference265)(0,'unreal'),'0/USD/a');
assert(invScript265.includes("holdingRef(x.cost,'cost')"));
assert(invScript265.includes("holdingRef(current,'value')"));
assert(invScript265.includes("holdingRef(pnl,'unreal')"));
assert(invScript265.includes("el('mmhUnifiedListV1')?.querySelectorAll('.inv-fx-ref-v265').forEach(n=>n.remove())"));
assert(invScript265.includes("cash(x.cost/x.quantity,native,6)+' / '+safe(unit)"));
assert(invScript265.includes("cash(x.price,native,6)+' / '+safe(unit)"));
console.log('PASS: Investment holding-card reference guards, native unit retention and owner-switch clearing');

/* Standard trade records: current FX is a display reference, not a trade-date conversion. */
const histStart265=app.indexOf('<script id="mmhvault-invest-history-v1-js">'),histEnd265=app.indexOf('</script>',histStart265);
assert(histStart265>=0&&histEnd265>histStart265);
const histScript265=app.slice(histStart265,histEnd265);
new Function(histScript265.slice(histScript265.indexOf('>')+1));
const histA265=histScript265.indexOf('  function recordReferenceV265(x){'),histB265=histScript265.indexOf('  function rowHTML(x){',histA265);
assert(histA265>=0&&histB265>histA265);
const histCalls265=[],histSession265={id:'inv-a'};
const histNumeric265=v=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v));
const histWin265={mmhInvestmentReferenceV265:(v,c,o)=>{histCalls265.push([v,c,o]);return '≈ THB '+v}};
const histRef265=new Function('numeric','window','currentSessionUser','recordText','esc',histScript265.slice(histA265,histB265)+';return recordReferenceV265')(histNumeric265,histWin265,histSession265,en=>en,String);
const trade265={kind:'standard',type:'Crypto',amount:10,currency:'USD',user_id:'inv-a',side:'Buy'};
assert(histRef265(trade265).includes('≈ THB 10'));
assert(histRef265({...trade265,side:'Sell'}).includes('≈ THB -10'));
assert(histRef265({...trade265,amount:0}).includes('≈ THB 0'));
assert.equal(histRef265({...trade265,user_id:'inv-b'}),'');
assert.equal(histRef265({...trade265,kind:'custom'}),'');
assert.equal(histRef265({...trade265,type:'Gold'}),'');
assert.equal(histRef265({...trade265,amount:null}),'');
assert(histRef265({...trade265,type:'Gold',currency:'MMK'}).includes('≈ THB 10'));
assert.deepEqual(histCalls265,[[10,'USD','inv-a'],[-10,'USD','inv-a'],[0,'USD','inv-a'],[10,'MMK','inv-a']]);
histWin265.mmhInvestmentReferenceV265=()=>'';assert.equal(histRef265(trade265),'');
histWin265.mmhInvestmentReferenceV265=()=>'≈ THB —';assert(histRef265(trade265).includes('≈ THB —'));
histSession265.id='inv-b';assert.equal(histRef265(trade265),'');
assert(histScript265.includes("'+recordReferenceV265(x)")||histScript265.includes("+recordReferenceV265(x))"));
assert(invScript265.includes('window.mmhInvestmentReferenceV265=invReferenceV265'));
assert(histScript265.includes('Current FX reference, not trade-date FX'));
console.log('PASS: standard investment record reference, signs, original currency, owner isolation and unavailable FX');

/* Expanded display registry: reuse existing account list, no source or rate writes. */
const registryMatch265=app.match(/window\.MMHPersonalDisplayCurrenciesV265=Object\.freeze\((\[[^\n]+\])\);/);
assert(registryMatch265);
const allDisplay265=JSON.parse(registryMatch265[1]);
const accountRegistry265=JSON.parse(app.match(/const MMHVAULT_ACCOUNT_CURRENCY_CODES_V140=new Set\((\[[^\n]+\])\);/)[1]);
assert.deepEqual(allDisplay265,accountRegistry265);
assert.equal(new Set(allDisplay265).size,53);
assert(['JPY','SGD','KRW','INR','AED','KPW','TWD','EUR','AUD','EGP'].every(c=>allDisplay265.includes(c)));
for(const n of ['overviewCodesV265','txDisplayCodesV265','invDisplayCodesV265'])assert(app.includes('const '+n+'=window.MMHPersonalDisplayCurrenciesV265||'));
const registryStorage265=new Map(),registryStore265={getItem:k=>registryStorage265.get(k)||null,setItem:(k,v)=>registryStorage265.set(k,v),removeItem:k=>registryStorage265.delete(k)};
let registryOwner265='registry-a';
const registryRates265={JPY:150,SGD:1.35,THB:35,MMK:4000};
const registryWin265={MMHPersonalDisplayCurrenciesV265:allDisplay265,MMHExchangeEffectiveFXV2:{getUsdRate:c=>registryRates265[c]}};
const setGlobal265=(id,c)=>registryStorage265.set('mmhvault_settings_display_v2_'+id,JSON.stringify({currency:c}));
setGlobal265('registry-a','JPY');setGlobal265('registry-b','SGD');
const regOverview265=app.slice(app.indexOf('const overviewCodesV265='),app.indexOf('function signedMoneyV265('));
const regOv265=new Function('window','localStorage','currentSessionUser','marketMoney',regOverview265+';return {money,overviewCurrencyV265,saveOverviewChoiceV265}')(registryWin265,registryStore265,{get id(){return registryOwner265}},v=>'$'+v);
const regFmt265=(v)=>v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
assert.equal(regOv265.overviewCurrencyV265(),'JPY');assert.equal(regOv265.money(2),'JPY '+regFmt265(300));
assert(regOv265.saveOverviewChoiceV265('KPW'));assert.equal(regOv265.money(2),'—');
registryOwner265='registry-b';assert.equal(regOv265.overviewCurrencyV265(),'SGD');assert.equal(regOv265.money(10),'SGD '+regFmt265(13.5));
registryOwner265='registry-a';assert.equal(regOv265.overviewCurrencyV265(),'KPW');assert(regOv265.saveOverviewChoiceV265('GLOBAL'));assert.equal(regOv265.overviewCurrencyV265(),'JPY');
const txPart265=app.slice(app.indexOf('  const txDisplayCodesV265='),app.indexOf('  function txDisplayTextV265('));
const regTx265=new Function('window','localStorage','currentSessionUser','MMHVAULT_CONFIG_OWNER','mmhVaultAccountMeta','txMoneyV720',txPart265+';return {txDisplayCurrencyV265,txSaveDisplayV265,txReferenceV265}')(registryWin265,registryStore265,{id:'registry-a'},'registry-a',()=>({id:'account-a',currency:'USD'}),()=>{});
const regRecord265={user_id:'registry-a'};
assert.equal(regTx265.txDisplayCurrencyV265(),'JPY');assert.equal(regTx265.txReferenceV265(regRecord265,2,'a'),'≈ JPY '+regFmt265(300));
assert(regTx265.txSaveDisplayV265('KPW'));assert.equal(regTx265.txReferenceV265(regRecord265,2,'a'),'≈ KPW —');assert.equal(regTx265.txReferenceV265({user_id:'registry-b'},2,'a'),'');
const invPart265=app.slice(app.indexOf('  const invDisplayCodesV265='),app.indexOf('  function invDisplayTextV265('));
const regInv265=new Function('window','localStorage','currentSessionUser','MMHVAULT_CONFIG_OWNER',invPart265+';return {invDisplayCurrencyV265,invSaveDisplayV265,invReferenceV265}')(registryWin265,registryStore265,{id:'registry-a'},'registry-a');
assert.equal(regInv265.invDisplayCurrencyV265(),'JPY');assert.equal(regInv265.invReferenceV265(2,'USD','registry-a'),'≈ JPY '+regFmt265(300));
assert(regInv265.invSaveDisplayV265('SGD'));assert.equal(regInv265.invReferenceV265(40000,'MMK','registry-a'),'≈ SGD '+regFmt265(13.5));assert.equal(regInv265.invReferenceV265(2,'USD','registry-b'),'');
assert.equal(regTx265.txDisplayCurrencyV265(),'KPW');assert.equal(regOv265.overviewCurrencyV265(),'JPY');assert.equal(JSON.parse(registryStorage265.get('mmhvault_settings_display_v2_registry-a')).currency,'JPY');
assert(!regInv265.invSaveDisplayV265('ZZZ'));assert(regInv265.invSaveDisplayV265('KPW'));assert.equal(regInv265.invReferenceV265(2,'USD','registry-a'),'≈ KPW —');
console.log('PASS: 53-code shared display registry, additional FX, missing rates, owner and per-view isolation');

{
 const start=app.indexOf('  const cashflowCurrenciesV918='),end=app.indexOf('  window.mmhRestoreAnalyzeCurrencyV918=restoreCurrencyV918;',start);
 const codes=JSON.parse(app.match(/MMHPersonalDisplayCurrenciesV265=Object\.freeze\((\[[^\]]+\])\)/)[1]);
 let owner='ana-a',renders=0;const data=new Map(),state={currency:'USD'},select={value:''};
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const win={MMHPersonalDisplayCurrenciesV265:codes,MMHExchangeEffectiveFXV2:{getUsdRate:c=>({JPY:150,SGD:1.3,KRW:-1,AUD:Infinity})[c]}};
 const prefs=new Function('window','localStorage','state','$','render','getOwner','const currentSessionUser={get id(){return getOwner()}};'+app.slice(start,end)+';return {restoreCurrencyV918,saveCurrencyV918};')(win,storage,state,id=>id==='cfaCurrency'?select:{},()=>renders++,()=>owner);
 const setDefault=(id,currency)=>data.set('mmhvault_settings_display_v2_'+id,JSON.stringify({currency}));
 setDefault(owner,'JPY');prefs.restoreCurrencyV918();assert.equal(state.currency,'JPY');assert.equal(select.value,'GLOBAL');
 prefs.saveCurrencyV918('SGD');assert.equal(state.currency,'SGD');assert.equal(JSON.parse(data.get('mmhvault_settings_display_v2_ana-a')).currency,'JPY');
 owner='ana-b';setDefault(owner,'KPW');prefs.restoreCurrencyV918();assert.equal(state.currency,'KPW');prefs.saveCurrencyV918('ZZZ');assert.equal(state.currency,'KPW');
 owner='ana-a';prefs.restoreCurrencyV918();assert.equal(state.currency,'SGD');prefs.saveCurrencyV918('GLOBAL');assert.equal(state.currency,'JPY');
 const script=app.match(/<script id="mmhvault-cashflow-analyze-v1-js">([\s\S]*?)<\/script>/)[1];
 const defs=script.slice(script.indexOf('  const num='),script.indexOf('  const safe='));
 const calc=new Function('window','rates','state','currentSessionUser','cashflowCurrenciesV918',defs+';return {displayRateV265,currencyRate,money};')(win,{usd_thb:35},state,{get id(){return owner}},codes);
 assert.equal(calc.displayRateV265('JPY'),150);assert.equal(calc.displayRateV265('SGD'),1.3);assert.equal(calc.displayRateV265('KRW'),0);assert.equal(calc.displayRateV265('AUD'),0);assert.equal(calc.displayRateV265('ZZZ'),0);
 assert.equal(calc.currencyRate('JPY'),0);assert.equal(calc.currencyRate('THB'),35);
 assert.equal(calc.money(2),'JPY '+(300).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}));
 state.currency='KPW';assert.equal(calc.money(2),'—');owner='';assert.equal(calc.displayRateV265('JPY'),0);
 assert(script.includes('const rate=currencyRate(row?.currency)'));assert(script.includes("'mmhvault:exchange-reference-updated'"));new Function(script);
 console.log('PASS: Analyze 53-code display, owner preference, unchanged budget conversion and unavailable FX');
}

{
 const scenario=JSON.parse(fcCodes.replaceAll("'",'"')), display=[...scenario,'AUD','EGP'];
 let uid='fc-expanded-a';const values=new Map(),store={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const win={MMHPersonalDisplayCurrenciesV265:display,MMHExchangeEffectiveFXV2:{getUsdRate:c=>({AUD:1.5,EGP:0})[c]}};
 const rate=forecast.slice(forecast.indexOf('const displayRate='),forecast.indexOf('const displayMoney='));
 const api=new Function('window','localStorage','owner','CURRENCIES','let activeOwner="",state={};const validCcy=c=>CURRENCIES.includes(c);const localKey=id=>"plan_"+id;'+rate+forecast.slice(fcStart,fcEnd)+';return {validCcy,validViewCcy,displayRate,validDisplayRate,activate:id=>{activeOwner=id;viewChoice=readViewChoice(id);state.viewCurrency=resolveViewCurrency(id,viewChoice)},setViewChoice,get:()=>state.viewCurrency}')(win,store,()=>uid,scenario);
 values.set('mmhvault_settings_display_v2_'+uid,JSON.stringify({currency:'AUD'}));
 api.activate(uid);assert.equal(api.get(),'AUD');assert(!api.validCcy('AUD'));assert(api.validViewCcy('AUD'));
 assert.equal(api.displayRate({AUD:99}),1.5);assert(api.setViewChoice('EGP'));assert(!api.validDisplayRate({EGP:999}));
 assert(api.setViewChoice('THB'));assert.equal(api.displayRate({THB:35}),35);assert(api.setViewChoice('GLOBAL'));assert.equal(api.get(),'AUD');
 uid='fc-expanded-b';assert(!api.validDisplayRate({}));assert(!api.setViewChoice('USD'));
 values.set('mmhvault_settings_display_v2_'+uid,JSON.stringify({currency:'JPY'}));api.activate(uid);assert.equal(api.get(),'JPY');assert(!api.setViewChoice('ZZZ'));
 uid='fc-expanded-a';api.activate(uid);assert.equal(api.get(),'AUD');
 assert(forecast.includes("SCENARIO_CURRENCIES=CURRENCIES.filter"));assert(forecast.includes("&&SCENARIO_CURRENCIES.includes(state.viewCurrency)"));
 console.log('PASS: forecast expanded display registry independent from scenario currencies and owner-scoped extra FX');
}

{
 const {buildAdapter}=await import('../js/mmhvault-cashflow-v2-adapter.mjs');
 const {summarize}=await import('../js/mmhvault-cashflow-v2-core.mjs');
 const display=JSON.parse(app.match(/MMHPersonalDisplayCurrenciesV265=Object\.freeze\((\[[^\n]*?\])\)/)[1]);
 const accountCodes=JSON.parse(app.match(/MMHVAULT_ACCOUNT_CURRENCY_CODES_V140=new Set\((\[[^\n]*?\])\)/)[1]);
 assert.deepEqual(display,accountCodes);
 let uid='cf-fx-a',epoch=1;
 const row={user_id:uid,id:'fixture',type:'Income',tx_date:'2026-11-01',to_account:'Fixture',to_amount:12,category:'Test'};
 const adapter=buildAdapter({owner:()=>uid,epoch:()=>epoch,guard:()=>true,configOwner:()=>uid,data:()=>({owner:'cf-fx-a',ready:true,rows:[row],accounts:[{name:'Fixture',currency:'USD'}],categories:[],currencies:accountCodes}),rate:c=>({JPY:150,EGP:0,AUD:-1})[c],today:()=>'2026-11-28',groupOf:t=>t.type,isLinkedInvestment:()=>false});
 const source=adapter.read();
 assert(display.length===53&&display.every(c=>source.currencies.includes(c)));
 assert(['GBP','CAD','CHF','NZD'].every(c=>source.currencies.includes(c)));
 const calc=currency=>summarize({rows:source.rows,scope:{start:'2026-11-01',end:'2026-11-30',currency},accountRate:source.accountRate,displayRate:source.displayRate,groupOf:source.groupOf,isLinkedInvestment:source.isLinkedInvestment});
 assert.equal(calc('JPY').totals.income,1800);
 assert(calc('EGP').totals.income===null&&!calc('EGP').complete);
 assert.equal(calc('AUD').totals.income,null);
 assert.equal(calc('USD').totals.income,12);
 assert.equal(calc('EGP').original[0].income,12);
 epoch++;assert(source.displayRate('JPY')===null&&!source.isCurrent());
 uid='cf-fx-b';assert.equal(adapter.read(),null);
 console.log('PASS: active Cash Flow registry parity, unavailable FX, unchanged native amounts and owner/epoch isolation');
}

{
 const start=app.indexOf('  const reportCodesV265='),end=app.indexOf('  function fx(c){',start);
 assert(start>=0&&end>start);
 let uid='report-a';const values=new Map(),store={getItem:k=>values.get(k)||null};
 const codes=JSON.parse(app.match(/MMHPersonalDisplayCurrenciesV265=Object\.freeze\((\[[^\n]*?\])\)/)[1]);
 const win={MMHPersonalDisplayCurrenciesV265:codes,MMHExchangeEffectiveFXV2:{getUsdRate:c=>({JPY:150,AUD:0,EGP:-1})[c]}};
 const api=new Function('window','localStorage','getOwner',"const currentSessionUser={get id(){return getOwner()}};const state={currency:'USD'},money=(v,c)=>c+' '+v;"+app.slice(start,end)+';return {prefsCurrency,displayRateReportV265,formatReportV265,reportCodesV265};')(win,store,()=>uid);
 values.set('mmhvault_settings_display_v2_report-a',JSON.stringify({currency:'JPY'}));
 assert.equal(api.prefsCurrency(),'JPY');
 assert(codes.every(c=>api.reportCodesV265().includes(c)));
 assert(['GBP','CAD','CHF','NZD'].every(c=>api.reportCodesV265().includes(c)));
 assert.equal(api.formatReportV265(2,'JPY'),'JPY 300');
 assert.equal(api.formatReportV265(0,'JPY'),'JPY 0');
 assert.equal(api.formatReportV265(null,'JPY'),'—');
 assert.equal(api.formatReportV265(2,'AUD'),'—');
 assert.equal(api.formatReportV265(2,'EGP'),'—');
 assert.equal(api.formatReportV265(2,'ZZZ'),'—');
 values.set('mmhvault_personal_display_currency_v265_report-a_report','USD');
 assert.equal(api.prefsCurrency(),'USD');
 values.set('mmhvault_personal_display_currency_v265_report-a_report','GLOBAL');
 assert.equal(api.prefsCurrency(),'JPY');
 uid='report-b';assert.equal(api.prefsCurrency(),'USD');
 uid='';assert.equal(api.formatReportV265(2,'JPY'),'—');
 const legacy=app.match(/<script id="mmhvault-monthly-report-v115-js">([\s\S]*?)<\/script>/)[1];
 new Function(legacy);
 assert(legacy.includes("const f=fx(b.currency)"));
 assert(legacy.includes("target=f>0?num(g.target_amount)/f:null"));
 assert(app.includes("return window.mmhLegacyReportDisplayV265?.(usd,code)||'—';"));
 console.log('PASS: legacy Report display preference, effective FX, unavailable goal/source amounts and signal formatting');
}

{
 const annual=readFileSync(new URL('../js/mmhvault-report-period-v201.js',import.meta.url),'utf8');
 new Function(annual);
 const start=annual.indexOf('  const F='),end=annual.indexOf('  const amountUSD=',start);
 assert(start>=0&&end>start);
 let uid='annual-a',code='JPY';
 const win={mmhLegacyReportDisplayV265:(v,c)=>c==='JPY'?'JPY '+v*150:'—'};
 const F=new Function('owner','currency','window',annual.slice(start,end)+';return F;')(()=>uid,()=>code,win);
 assert.equal(F(2),'JPY 300');assert.equal(F(0),'JPY 0');assert.equal(F(null),'—');assert.equal(F(Infinity),'—');
 code='KPW';assert.equal(F(2),'—');uid='';code='JPY';assert.equal(F(2),'—');
 uid='annual-b';delete win.mmhLegacyReportDisplayV265;assert.equal(F(2),'—');
 assert(annual.includes('rateText=F(0)'));assert(annual.includes('rate=fx(c)'));
 assert(annual.includes("'mmhvault:personal-display-currency-changed','mmhvault:exchange-reference-updated'"));
 assert(annual.includes("reportCurrencyV115')?.addEventListener('change',rerender)"));
 assert(app.includes('js/mmhvault-report-period-v201.js?v=2.0.65.3'));
 console.log('PASS: annual legacy Report shared display FX, unavailable values, refresh and unchanged budget source rate');
}

{
 const annual=readFileSync(new URL('../js/mmhvault-report-period-v201.js',import.meta.url),'utf8');
 const decl=annual.slice(annual.indexOf('  let viewReady='),annual.indexOf('  function loadPrefs'));
 const budget=annual.slice(annual.indexOf('  async function renderBudget'),annual.indexOf('  function init'));
 let uid='a',code='USD',rate=1,active=true,sourcesReady=true,host={hidden:false},mount=makeMount();
 function makeMount(){return {innerHTML:'',textContent:'',querySelector(){return this.innerHTML.includes('report-annual-budget-metrics-v201')?{}:null}}}
 const requests=[];
 const db={from(){return {select(){return this},eq(_k,u){this.uid=u;return this},gte(_k,y){this.year=y;return this},lt(){return new Promise(resolve=>requests.push({uid:this.uid,year:this.year,resolve}))}}}};
 const root={classList:{contains:()=>active}};
 const get=id=>id==='reports'?root:id==='reportAnnualViewV201'?host:id==='reportAnnualBudgetBodyV201'?mount:null;
 const api=new Function('$','owner','currency','db','fx','F','collectYear','tr','text','n','console','annualSourcesReadyV265','sourceNoticeV265',
 "const rootId='reports',state={mode:'year',year:'2025'};"+decl+budget+
 ";return {renderBudget,annualExportTokenV265,resetAnnualBudgetV265,state,rerender(){annualRenderEpochV265++;annualReadyV265=null},pending(){return budgetCache.pending}};")
 (get,()=>uid,()=>code,db,()=>rate,v=>code+' '+v,()=>({individual:50}),s=>s,String,Number,{warn(){}},()=>sourcesReady,()=> 'source unavailable');
 function rerender(){mount=makeMount();api.rerender();return api.renderBudget()}
 function change(u,y){uid=u;api.state.year=y;api.resetAnnualBudgetV265();return rerender()}
 function finish(i,value){requests[i].resolve({data:value})}
 const a=change('a','2025'),other=change('b','2025'),again=change('a','2025');
 assert.equal(requests.length,3);assert.equal(requests[1].uid,'b');
 finish(0,[{budget_month:'2025-01-01',currency:'USD',monthly_amount:900}]);await a;
 assert.equal(api.annualExportTokenV265(),null);assert.equal(api.pending(),true);
 finish(1,[{budget_month:'2025-01-01',currency:'USD',monthly_amount:800}]);await other;
 assert.equal(api.annualExportTokenV265(),null);assert.equal(api.pending(),true);
 finish(2,[{budget_month:'2025-01-01',currency:'USD',monthly_amount:100}]);await again;
 assert(mount.innerHTML.includes('USD 100'));assert(!mount.innerHTML.includes('USD 900'));
 const first=api.annualExportTokenV265();assert(Number.isSafeInteger(first));
 await rerender();assert(api.annualExportTokenV265()>first);assert.equal(requests.length,3);
 const y1=change('a','2026'),y2=change('a','2025'),y3=change('a','2026');
 finish(3,[{budget_month:'2026-01-01',currency:'USD',monthly_amount:999}]);await y1;
 finish(4,[]);await y2;assert.equal(api.annualExportTokenV265(),null);assert.equal(api.pending(),true);
 finish(5,[{budget_month:'2026-01-01',currency:'USD',monthly_amount:200}]);await y3;assert(mount.innerHTML.includes('USD 200'));
 const reload=change('a','2026');assert.equal(api.annualExportTokenV265(),null);
 finish(6,null);await reload;assert.equal(api.annualExportTokenV265(),null);
 const missing=change('a','2026');rate=0;finish(7,[{budget_month:'2026-01-01',currency:'USD',monthly_amount:200}]);await missing;assert.equal(api.annualExportTokenV265(),null);
 rate=1;await rerender();assert(Number.isSafeInteger(api.annualExportTokenV265()));
 const valid={budget_month:'2026-01-01',currency:'USD',monthly_amount:100};
 for(const rows of [[null],[{...valid,budget_month:'2025-12-01'}],[{...valid,budget_month:'2026-13-01'}],[{...valid,budget_month:'2026-01-02'}],[valid,valid],[{...valid,currency:null}],[{...valid,currency:''}],[{...valid,monthly_amount:null}],[{...valid,monthly_amount:''}],[{...valid,monthly_amount:-1}],[{...valid,monthly_amount:'bad'}],[{...valid,monthly_amount:Infinity}],[{...valid,monthly_amount:true}]]){
  const pending=change('a','2026');finish(requests.length-1,rows);await pending;assert.equal(api.annualExportTokenV265(),null);assert(mount.textContent.includes('Saved budgets cannot be loaded'));
 }
 const empty=change('a','2026');finish(requests.length-1,[]);await empty;assert(Number.isSafeInteger(api.annualExportTokenV265()));assert(mount.innerHTML.includes('0 / 12'));
 const zero=change('a','2026');finish(requests.length-1,[{...valid,monthly_amount:'0'}]);await zero;assert(Number.isSafeInteger(api.annualExportTokenV265()));assert(mount.innerHTML.includes('USD 0'));
 const full=change('a','2026');finish(requests.length-1,Array.from({length:12},(_,i)=>({...valid,budget_month:'2026-'+String(i+1).padStart(2,'0')+'-01',monthly_amount:'100'})));await full;assert(Number.isSafeInteger(api.annualExportTokenV265()));assert(mount.innerHTML.includes('12 / 12'));assert(mount.innerHTML.includes('USD 1200'));
 sourcesReady=false;assert.equal(api.annualExportTokenV265(),null);await rerender();assert.equal(mount.textContent,'source unavailable');assert.equal(api.annualExportTokenV265(),null);sourcesReady=true;await rerender();assert(Number.isSafeInteger(api.annualExportTokenV265()));
  code='JPY';assert.equal(api.annualExportTokenV265(),null);
 code='USD';active=false;assert.equal(api.annualExportTokenV265(),null);
 assert(app.includes('annualToken=period.mode==='));
 assert(app.includes('epoch:exportEpochV265,annualToken'));
 console.log('PASS: annual Report request identity, owner/year ABA, invalid response, missing rate and render-bound export token');
}


{
 const script=app.match(/<script id="mmhvault-monthly-report-v115-js">([\s\S]*?)<\/script>/)[1];new Function(script);
 const piece=script.slice(script.indexOf('  function cloudKey()'),script.indexOf('  function setup(){'));
 let uid='a',timer=0,sourcesReady=true;const jobs=new Map(),requests=[],w={};
 const state={month:'2026-01',currency:'USD',request:0,loading:false,cloudDirty:true,loadTimer:0,pendingLoad:false,lastCloudKey:'',lastCloudAt:0,loadKey:'',budget:null,goals:[],recurring:[]};
 const db={from(table){return{select(){return this},eq(k,v){this[k]=v;return this},maybeSingle(){return this.run()},order(){return this.run()},run(){return new Promise(resolve=>requests.push({table,owner:this.user_id,month:this.budget_month,resolve}))}}}};
 const api=new Function('state','reportOwnerV265','currentSessionUser','db','window','document','byId','render','setTimeout','clearTimeout','console','monthlySourcesReadyV265',piece+';return {load,scheduleCloudLoad,invalidateCloudV265,cloudDataReadyV265};')(state,()=>uid,{get id(){return uid}},db,w,{documentElement:{lang:'en'}},id=>({value:id==='reportMonthV115'?state.month:state.currency}),()=>{},fn=>{jobs.set(++timer,fn);return timer},id=>jobs.delete(id),{warn(){}},()=>sourcesReady);
 function finish(i,month,value){requests[i].resolve({data:{budget_month:month+'-01',currency:'USD',monthly_amount:value}});requests[i+1].resolve({data:[]});requests[i+2].resolve({data:[]})}
 const a=api.load(true);state.month='2026-02';api.scheduleCloudLoad(true,0);assert(!api.cloudDataReadyV265());assert.equal(state.budget,null);jobs.delete(state.loadTimer);state.loadTimer=0;
 const b=api.load(true);state.month='2026-01';api.scheduleCloudLoad(true,0);jobs.delete(state.loadTimer);state.loadTimer=0;const c=api.load(true);
 assert.equal(requests.length,9);assert.equal(requests[3].month,'2026-02-01');
 finish(0,'2026-01',999);await a;assert.equal(state.budget,null);assert(state.loading);
 finish(3,'2026-02',888);await b;assert(!api.cloudDataReadyV265());
 finish(6,'2026-01',100);await c;assert.equal(state.budget.monthly_amount,100);assert(w.mmhLegacyReportReadyV265());sourcesReady=false;assert(!w.mmhLegacyReportReadyV265());sourcesReady=true;assert(w.mmhLegacyReportReadyV265());
 const d=api.load(true);uid='b';api.invalidateCloudV265();const e=api.load(true);finish(9,'2026-01',999);await d;assert.equal(state.budget,null);finish(12,'2026-01',200);await e;assert.equal(state.budget.monthly_amount,200);assert.equal(requests[12].owner,'b');
 const bad=api.load(true);finish(15,'2026-02',300);await bad;assert(!api.cloudDataReadyV265());assert.equal(state.budget,null);
 const empty=api.load(true);requests[18].resolve({data:null});requests[19].resolve({data:[]});requests[20].resolve({data:[]});await empty;assert(w.mmhLegacyReportReadyV265());assert.equal(state.budget,null);
 const refresh=api.load(true);api.scheduleCloudLoad(true,0);finish(21,'2026-01',500);await refresh;assert(!api.cloudDataReadyV265());assert.equal(state.budget,null);
 jobs.delete(state.loadTimer);state.loadTimer=0;state.pendingLoad=false;
 const valid={budget_month:'2026-01-01',currency:'USD',monthly_amount:100};
 for(const row of [{...valid,currency:null},{...valid,currency:''},{...valid,currency:'US'},{...valid,monthly_amount:null},{...valid,monthly_amount:''},{...valid,monthly_amount:' '},{...valid,monthly_amount:-1},{...valid,monthly_amount:'bad'},{...valid,monthly_amount:Infinity},{...valid,monthly_amount:true}]){
  const pending=api.load(true),i=requests.length-3;requests[i].resolve({data:row});requests[i+1].resolve({data:[]});requests[i+2].resolve({data:[]});await pending;assert(!w.mmhLegacyReportReadyV265());assert.equal(state.budget,null);
 }
 for(const amount of [0,'0',100,'100']){
  const pending=api.load(true),i=requests.length-3;requests[i].resolve({data:{...valid,monthly_amount:amount}});requests[i+1].resolve({data:[]});requests[i+2].resolve({data:[]});await pending;assert(w.mmhLegacyReportReadyV265());assert.equal(state.budget.monthly_amount,amount);
 }
 assert(script.includes("if(!cloudReady)for(const id of ['reportBudgetV115','reportGoalsV115','reportRecurringV115'])"));
 console.log('PASS: monthly Report owner/month ABA, refresh invalidation, mismatched response, valid empty budget and unavailable state');
}


{
 const settings=app.match(/<script id="mmhvault-settings-v2-js">([\s\S]*?)<\/script>/)[1],snippet=settings.slice(settings.indexOf('const $=id'),settings.indexOf('let prefs=readPrefs()'));
 const codes=JSON.parse(app.match(/MMHPersonalDisplayCurrenciesV265=Object\.freeze\((\[[^\n]*?\])\)/)[1]);
 let uid='a';const values=new Map(),win={MMHPersonalDisplayCurrenciesV265:codes},storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const api=new Function('window','localStorage','currentSessionUser','document',snippet+';return {readPrefs,validSettingsCurrencyV265,settingsCurrencyOptionsV265};')(win,storage,{get id(){return uid}},{});
 assert.equal(api.settingsCurrencyOptionsV265().length,53);assert.deepEqual(api.settingsCurrencyOptionsV265().map(x=>x[0]),codes);
 values.set('mmhvault_settings_display_v2_a',JSON.stringify({currency:'JPY',theme:'dark'}));
 assert.equal(api.readPrefs().currency,'JPY');assert.equal(api.readPrefs().theme,'dark');uid='b';assert.equal(api.readPrefs().currency,'USD');
 values.set('mmhvault_settings_display_v2_b',JSON.stringify({currency:'ZZZ'}));assert.equal(api.readPrefs().currency,'USD');
 values.set('mmhvault_settings_display_v2_b',JSON.stringify({currency:'SGD'}));assert.equal(api.readPrefs().currency,'SGD');uid='a';assert.equal(api.readPrefs().currency,'JPY');
 assert(!api.validSettingsCurrencyV265('GLOBAL'));assert(!api.validSettingsCurrencyV265(true));assert(!api.validSettingsCurrencyV265('jpy'));
 const restore=app.match(/const display=state\.data\.settings\?\.display,displayKey='mmhvault_settings_display_v2_'\+u\.id;[^\n]+/)[0],fn=new Function('state','u','window','localStorage',restore);
 fn({data:{settings:{display:{currency:'KPW',theme:'dark'}}}},{id:'c'},win,storage);assert.equal(JSON.parse(values.get('mmhvault_settings_display_v2_c')).currency,'KPW');
 fn({data:{settings:{display:{currency:'bad',theme:'dark'}}}},{id:'d'},win,storage);assert(!('currency' in JSON.parse(values.get('mmhvault_settings_display_v2_d'))));
 fn({data:{settings:{display:{currency:'THB'}}}},{id:'a'},win,storage);assert.equal(JSON.parse(values.get('mmhvault_settings_display_v2_a')).currency,'JPY');
 assert(settings.includes("add(r,'$','Default display currency','currency',settingsCurrencyOptionsV265())"));
 assert(settings.includes("if(name==='currency'&&!validSettingsCurrencyV265(e.target.value))"));
 assert(settings.includes("mmhvault:personal-display-preferences-restored"));
 console.log('PASS: global Settings currency registry, account isolation, validation and non-overwriting backup display preference');
}

{
 const annual=readFileSync(new URL('../js/mmhvault-report-period-v201.js',import.meta.url),'utf8');
 const ms=app.indexOf('  function amountUSD(account,amount)',app.indexOf('<script id="mmhvault-monthly-report-v115-js">')),me=app.indexOf('  function monthlySourceNoticeV265()',ms);
 const ys=annual.indexOf('  const amountUSD='),ye=annual.indexOf('  const sourceNoticeV265=',ys);
 assert(ms>=0&&me>ms&&ys>=0&&ye>ys);
 let uid='a',records=[],rate=2;
 const w={get transactions(){return records}},state={month:'2026-01',year:'2026'};
 const convert=(account,amount)=>account==='missing'?0:amount*rate;
 const meta=account=>({id:account==='unknown'?'legacy_unknown':account});
 const linked=t=>!!t.linked,num=v=>Number.isFinite(Number(v))?Number(v):0;
 const shift=(key,delta)=>{const [y,m]=key.split('-').map(Number);return new Date(Date.UTC(y,m-1+delta,1)).toISOString().slice(0,7)};
 const month=new Function('window','state','reportOwnerV265','mmhvaultAmountUSD','mmhVaultAccountMeta','isLinkedInvestmentTx','num','shiftMonth',app.slice(ms,me)+';return {amount:reportSourceAmountReadyV265,ready:monthlySourcesReadyV265};')(w,state,()=>uid,convert,meta,linked,num,shift);
 const year=new Function('window','state','owner','rows','mmhvaultAmountUSD','mmhVaultAccountMeta','isLinkedInvestmentTx','n','text','validMonth',annual.slice(ys,ye)+';return {amount:sourceAmountReadyV265,ready:annualSourcesReadyV265};')(w,state,()=>uid,()=>records,convert,meta,linked,num,v=>String(v??''),v=>/^\d{4}-(0[1-9]|1[0-2])$/.test(v));
 for(const api of [month,year]){
  rate=2;assert(api.amount('known',4));assert(api.amount('known',-4));assert(api.amount(null,0));
  for(const v of [null,undefined,'',' ',NaN,Infinity,'bad'])assert(!api.amount('known',v));
  assert(!api.amount('missing',4));assert(!api.amount('unknown',4));assert(!api.amount(null,4));
  rate=-2;assert(!api.amount('known',4));rate=0;assert(!api.amount('known',4));rate=2;
  const tx=(date,type,category,account,amount,extra={})=>({tx_date:date,type,category,to_account:account,to_amount:amount,from_account:account,from_amount:amount,...extra});
  records=[tx('2026-01-01','Income','Salary','known',20),tx('2025-12-01','Expense','Food','known',5)];assert(api.ready());
  records.push(tx('2025-12-02','Expense','Food','missing',5));assert(!api.ready());records.pop();
  records.push(tx('2026-01-02','Income','Salary','unknown',2));assert(!api.ready());records.pop();
  records.push(tx('2026-01-03','Expense','Investment','missing',5),tx('2026-01-04','Transfer','Transfer','missing',5),tx('2026-01-05','Expense','Food','missing',5,{linked:true}));assert(api.ready());
  records.push(tx('2026-01-06','Expense','Food','missing',0));assert(api.ready());
  records.push(tx('2024-01-01','Income','Salary','missing',50));assert(api.ready());
  uid='';assert(!api.ready());uid='a';assert(api.ready());
 }
 console.log('PASS: actual monthly and annual Report source FX guards, signed amounts, comparison period, exclusions and owner gate');
}


{
 const i=app.indexOf('  function monthlyInvestmentSourceReadyV265('),j=app.indexOf('  function monthlyInvestmentValuationReadyV265()',i);
 assert(i>=0&&j>i);
 const factory=new Function('window','reportOwnerV265','rates','displayRateReportV265',app.slice(i,j)+'return monthlyInvestmentRecordedV265;');
 const base={user_id:'u',inv_date:'2026-11-02',asset:'Crypto',side:'BUY',quantity:1,amount:100,fee:2,other_cost:3,currency:'USD'};
 const gold={...base,asset:'Gold',currency:'MMK',amount:4000,fee:0,other_cost:0};
 const check=(rows,expected,{owner='u',wallet='u',legacy=4000,effective=4000,key='2026-11'}={})=>assert.equal(factory((()=>{const moves=[];return {investments:rows,mmhWalletDataOwnerV191:wallet,mmhWalletMovementsV174:moves,__mmhReportInvestmentSourceV265:{owner,epoch:0,rows,moves}}})(),()=>owner,{usd_mmk:legacy},()=>effective)(key),expected);
 check([],0);check([base],105);check([gold],1);check([gold],null,{effective:null});check([gold],null,{legacy:0});check([gold],null,{effective:5000});check([gold],null,{effective:NaN});check([{...gold,amount:0}],0,{effective:null});
 check([{...gold,quantity:0,weight_kyattha:1}],1);check([{...gold,weight_kyattha:-1}],null);
 check([{...base,user_id:'other'}],null);check([],null,{wallet:'other'});check([],null,{owner:''});check([{...base,asset:'Other'}],null);
 check([{...base,amount:''}],null);check([{...base,fee:true}],null);check([{...base,quantity:-1}],null);check([{...base,side:'SELL',quantity:-1}],0);check([{...base,currency:'THB'}],null);
 check([{...base,inv_date:'2026-10-02'}],0);check([{...base,inv_date:'bad'}],null);check([{...base,amount:0,fee:0,other_cost:0}],0);check([base],null,{key:'2026-13'});check(null,null);check([{...base,amount:1e308,fee:1e308}],null);
 console.log('PASS: monthly Report recorded investment amount, owner gate, source rates, Gold weight and valid zero');
}

{
 const i=app.indexOf('  function monthlyInvestmentValuationReadyV265(){'),j=app.indexOf('  function goalSnapshot()',i);
 assert(i>=0&&j>i);
 const evaluate=new Function('window','reportOwnerV265','monthlyInvestmentRecordedV265','mmhvaultInvestmentCostUSD','displayRateReportV265','goldHoldingQty',app.slice(app.indexOf('  function monthlyInvestmentSourceReadyV265('),app.indexOf('  function monthlyInvestmentRecordedV265('))+app.slice(i,j)+"return investmentSnapshot('2026-11');");
 const ni=app.indexOf('  function nativeOverview('),nj=app.indexOf('  function overviewData()',ni);
 const native=new Function(app.slice(ni,nj)+'return nativeOverview;')();
 const row={id:1,inv_date:'2026-11-01',user_id:'u',asset:'Crypto',symbol:'BTC',side:'BUY',quantity:1,amount:10,fee:0,other_cost:0};
 const gold={...row,asset:'Gold',currency:'MMK',amount:40000};
 const base={mmhWalletDataOwnerV191:'u',investments:[row],mmhDashboardHeldInvestmentUSD:()=>20,livePrices:{BTC:{price:20}},rates:{usd_mmk:4000}};
 const run=(w=base,basis=()=>10,fx=()=>4000,owner='u')=>{const moves=w.mmhWalletMovementsV174||[];return evaluate({mmhReportNativeInvestmentV265:(rows,moves)=>native(rows,true,(asset,symbol)=>asset==='Gold'?w.mmhGoldAuthorityV376?.().priceMMK:w.livePrices?.[symbol]?.price||rows.find(x=>x.symbol===symbol)?.market_price,moves),mmhWalletMovementsV174:moves,__mmhReportInvestmentSourceV265:{owner,epoch:0,rows:w.investments,moves},...w},()=>owner,()=>5,basis,fx,x=>x.quantity)};
 const unavailable=(...args)=>assert.deepEqual(run(...args),{monthly:5,value:null,basis:null,pl:null,returnPct:null});
 assert.deepEqual(run(),{monthly:5,value:20,basis:10,pl:10,returnPct:100});
 unavailable({...base,livePrices:{}});unavailable({...base,livePrices:{BTC:{price:-1}}});
 assert.equal(run({...base,livePrices:{},investments:[{...row,market_price:20}]}).value,20);
 unavailable({...base,mmhWalletDataOwnerV191:'other'});unavailable({...base,investments:[{...row,user_id:'other'}]});unavailable(base,()=>10,()=>4000,'');
 unavailable({...base,mmhDashboardHeldInvestmentUSD:undefined});unavailable({...base,mmhDashboardHeldInvestmentUSD:()=>NaN});unavailable(base,()=>undefined);unavailable(base,()=>-1);
 unavailable({...base,investments:[{...row,quantity:''}]});unavailable({...base,investments:[{...row,fee:true}]});
 assert.deepEqual(run({...base,investments:[],mmhDashboardHeldInvestmentUSD:()=>0},()=>0),{monthly:5,value:0,basis:0,pl:0,returnPct:null});
 const g={...base,investments:[gold],mmhGoldAuthorityV376:()=>({priceMMK:80000})};
 assert.equal(run(g).value,20);unavailable(g,()=>10,()=>null);unavailable(g,()=>10,()=>5000);unavailable({...g,mmhGoldAuthorityV376:()=>({priceMMK:0})});
 unavailable(base,()=>0);assert.equal(run({...base,investments:[{...row,amount:0}]},()=>0).returnPct,null);
 unavailable({...base,mmhReportNativeInvestmentV265:undefined});unavailable({...base,mmhDashboardHeldInvestmentUSD:()=>21});
 const sale={...row,id:2,inv_date:'2026-11-02',side:'SELL',quantity:-0.1,amount:2};
 unavailable({...base,investments:[{...sale,quantity:-2},row]});unavailable({...base,investments:[{...sale,inv_date:'2026-10-01'},row]});unavailable({...base,investments:[row,{...row}]});
 const fee={...sale,amount:0,note:'Wallet Gas Fee: BTC'},move={user_id:'u',fee_asset_symbol:'BTC',fee_quantity:0.1,fee_investment_id:2};
 const feeCase={...base,investments:[row,fee],mmhDashboardHeldInvestmentUSD:()=>18};
 unavailable(feeCase,()=>9);unavailable({...feeCase,mmhWalletMovementsV174:[{...move,fee_quantity:0.2}]},()=>9);unavailable({...feeCase,mmhWalletMovementsV174:[move,move]},()=>9);
 assert.equal(run({...feeCase,mmhWalletMovementsV174:[move]},()=>9).value,18);
 unavailable({...base,__mmhReportInvestmentSourceV265:null});unavailable({...base,__mmhSessionEpochV1239:2});unavailable({...base,mmhWalletMovementsV174:[{user_id:'other'}]});unavailable({...base,__mmhReportInvestmentSourceV265:{owner:'u',epoch:0,rows:[],moves:[]}});
 console.log('PASS: monthly Report valuation readiness, owner, quote and rate absence, invalid helper results and undefined ROI');
}


{
 const script=app.match(/<script id="mmhvault-monthly-report-v115-js">([\s\S]*?)<\/script>/)[1];
 const helper=script.slice(script.indexOf('  let monthlyRenderEpochV265='),script.indexOf('  function render(){monthlyRenderedV265='));
 const render=script.slice(script.indexOf('  function render(){monthlyRenderedV265='),script.indexOf('  function cloudKey()'));
 let owner='a',ready=true,active=true,rate=1,shell={},mode='month',annualToken=7;
 const state={month:'2026-11',currency:'USD',request:1};
 const w={transactions:[],investments:[],mmhWalletMovementsV174:[],__mmhReportInvestmentSourceV265:{},mmhLegacyReportReadyV265:()=>ready,mmhLegacyReportDisplayV265:()=> '0',MMHBalanceBridgeV202:{current:()=>({ready:true})},MMHReportPeriodV201:{get:()=>({mode}),annualExportTokenV265:()=>annualToken}};
 const doc={hidden:false},nodes=new Map();
 const byId=id=>id==='reports'?{classList:{contains:()=>active},querySelector:()=>shell}:nodes.get(id)||nodes.set(id,{}).get(id);
 const begin=render.slice(0,render.indexOf("if(!monthlySourcesReadyV265()"));
 const finish=render.slice(render.lastIndexOf('    if(cloudReady&&window.mmhLegacyReportReadyV265'));
 const api=new Function('window','state','reportOwnerV265','byId','displayRateReportV265','document',helper+begin+'const cloudReady=window.mmhLegacyReportReadyV265();'+finish+'return {token:monthlyExportTokenV265,render};')(w,state,()=>owner,byId,()=>rate,doc);
 const exp=app.match(/<script id="mmhvault-report-export-v116-js">([\s\S]*?)<\/script>/)[1];
 const context=exp.slice(exp.indexOf('  function exportContextV265()'),exp.indexOf('  function annualV201()'));
 const exportApi=new Function('window','currentSessionUser','document','$','currency','fileMonth','localStorage','letDummy', 'let exportEpochV265=0;'+context+'return {exportContextV265,assertExportV265};')(w,{get id(){return owner}},doc,byId,()=>state.currency,()=>state.month,{getItem:()=> 'en'});
 assert.equal(api.token(),null);assert.equal(exportApi.exportContextV265(),null);
 api.render();assert.equal(api.token(),1);const first=exportApi.assertExportV265();assert.equal(first.monthlyToken,1);
 api.render();assert.equal(api.token(),2);assert.throws(()=>exportApi.assertExportV265(first));
 for(const [obj,key,val] of [[state,'month','2026-10'],[state,'currency','JPY'],[state,'request',2],[w,'__mmhReportInvestmentSourceV265',null],[w,'transactions',[]],[w,'investments',[]],[w,'mmhWalletMovementsV174',[]],[w,'__mmhSessionEpochV1239',1],[doc,'hidden',true]]){
  const old=obj[key];obj[key]=val;assert.equal(api.token(),null);assert.equal(exportApi.exportContextV265(),null);obj[key]=old;assert.equal(api.token(),2);
 }
 owner='b';assert.equal(api.token(),null);owner='a';rate=2;assert.equal(api.token(),null);rate=1;active=false;assert.equal(api.token(),null);active=true;
 ready=false;assert.equal(api.token(),null);api.render();ready=true;assert.equal(api.token(),null);api.render();assert.equal(api.token(),4);
 shell={};assert.equal(api.token(),null);api.render();assert.equal(api.token(),5);
 mode='year';const year=exportApi.assertExportV265();assert.equal(year.annualToken,7);assert.equal(year.monthlyToken,null);annualToken=8;assert.throws(()=>exportApi.assertExportV265(year));
 console.log('PASS: monthly Report rendered snapshot, refresh, owner/currency/source changes and export cancellation');
}

{
 const a=app.indexOf('const fontStylesV265='),b=app.indexOf('function addFontV265(',a);
 assert(a>=0&&b>a);
 const attrs=new Map(),styles=new Map(),store=new Map();
 const elements=Object.fromEntries(['stPref_fontV265','stFontLabelV265','stFontPreviewV265','stFontNoteV265','stFontStatusV265'].map(id=>[id,{textContent:'',style:{},options:Array.from({length:7},()=>({textContent:''}))}]));
 let owner='a';
 const doc={documentElement:{lang:'en'},body:{setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),style:{setProperty:(k,v)=>styles.set(k,v),removeProperty:k=>styles.delete(k)}}};
 const api=new Function('document','$','prefOwner','lsGet',app.slice(a,b)+'return {fontStylesV265,fontChoiceV265,fontLanguageV265,fontStackV265,fontKeyV265,applyFontV265};')(doc,id=>elements[id],()=>owner,k=>store.get(k)??null);
 const attr='data-mmh-personal-font-v265',property='--mmh-personal-font-v265',select=elements.stPref_fontV265;
 assert.equal(api.fontStylesV265.length,7);
 assert.equal(api.fontKeyV265('guest','en'),null);
 assert.equal(api.fontKeyV265('','en'),null);
 assert.equal(api.fontChoiceV265('unknown'),'system');
 for(const locale of ['en','zh','my']){
  assert.equal(api.fontStackV265(locale,'system'),'system-ui');
  assert.equal(new Set(api.fontStylesV265.map(v=>api.fontStackV265(locale,v))).size,7);
 }
 api.applyFontV265();assert.equal(select.value,'system');assert.equal(attrs.has(attr),false);
 store.set(api.fontKeyV265('a','en'),'elegant');api.applyFontV265();assert.equal(select.value,'elegant');assert.equal(attrs.get(attr),'elegant');assert.match(styles.get(property),/Georgia/);
 doc.documentElement.lang='zh-CN';api.applyFontV265();assert.equal(select.value,'system');assert.equal(attrs.has(attr),false);assert.equal(styles.has(property),false);assert.equal(elements.stFontLabelV265.textContent,'字体样式');
 store.set(api.fontKeyV265('a','zh'),'minimal');api.applyFontV265();assert.equal(select.value,'minimal');assert.match(styles.get(property),/LXGW WenKai/);
 doc.documentElement.lang='my';store.set(api.fontKeyV265('a','my'),'soft');api.applyFontV265();assert.equal(select.value,'soft');assert.match(styles.get(property),/Myanmar3/);
 doc.documentElement.lang='en';api.applyFontV265();assert.equal(select.value,'elegant');
 owner='b';api.applyFontV265();assert.equal(select.value,'system');assert.equal(attrs.has(attr),false);
 owner='guest';api.applyFontV265();assert.equal(select.disabled,true);
 owner='a';store.set(api.fontKeyV265('a','en'),'invalid');api.applyFontV265();assert.equal(select.value,'system');assert.equal(select.disabled,false);
 console.log('PASS: Personal font style mapping, language memory, owner isolation and System reset (mock DOM)');
}

{
 const code=app.match(/<script id="mmhvault-v34216-age-js">([\s\S]*?)<\/script>/)?.[1];assert(code,'birthday module');
 const data=new Map(),domEvents={},windowEvents={},nodes={},owner={id:'a'};let blocked=false;
 const input={value:'',disabled:false,handlers:{},addEventListener(n,fn){this.handlers[n]=fn},setCustomValidity(v){this.validity=v},reportValidity(){}};
 const outputs=['mmhSettingsAgeValueV34215','mmhSettingsBirthdayValueV34215','mmhSettingsBirthdayCountdownV34215'];
 for(const id of outputs)nodes[id]={textContent:''};
 nodes.mmhBirthDateInputV34215=input;
 const labels=[{textContent:'Birthday',getAttribute:k=>({'data-i18n-en':'Birthday','data-i18n-zh':'生日','data-i18n-my':'မွေးနေ့'})[k]}];
 nodes.mmhBirthdaySettingsV34215={querySelectorAll:()=>labels};
 const doc={readyState:'loading',documentElement:{lang:'en'},visibilityState:'visible',activeElement:null,getElementById:id=>nodes[id]||null,addEventListener:(n,fn)=>domEvents[n]=fn};
 const win={addEventListener:(n,fn)=>windowEvents[n]=fn,dispatchEvent:e=>windowEvents[e.type]?.(e)};
 const storage={getItem:k=>{if(blocked)throw Error('blocked');return data.has(k)?data.get(k):null},setItem:(k,v)=>{if(blocked)throw Error('blocked');data.set(k,String(v))}};
 new Function('localStorage','document','window','CustomEvent','setTimeout','clearTimeout','currentSessionUser',code)(storage,doc,win,function(t){this.type=t},()=>0,()=>{},owner);
 const key='mmhvault_birth_date_v34216',change=v=>{input.value=v;input.handlers.change()},switchOwner=id=>{owner.id=id;windowEvents['mmhvault:config-owner-changed']()},blank=()=>input.value===''&&outputs.every(id=>nodes[id].textContent==='0');
 domEvents.DOMContentLoaded();
 assert(blank(),'unset birthday displays zero without inventing a date');
 data.set(key,'1990-02-12');switchOwner('a');assert(blank()&&!data.has(key+'_a'),'unclaimed legacy not migrated');
 data.set(key+'_legacy_owner','a');switchOwner('a');assert(input.value==='1990-02-12'&&!data.has(key+'_a'),'claimed legacy read only');
 change('1992-02-30');assert(!data.has(key+'_a'),'invalid calendar date rejected');
 change('2999-01-01');assert(!data.has(key+'_a'),'future date rejected');
 change('1992-02-29');assert(data.get(key+'_a')==='1992-02-29','valid leap date saved to current owner');
 assert.equal(input.min,'1900-01-01');assert.match(input.max,/^\d{4}-\d{2}-\d{2}$/);
 for(const [lang,title,age,countdown] of [['my','မွေးနေ့','နှစ်','ရက်'],['zh-CN','生日','岁','天'],['en','Birthday','years','days']]){
  doc.documentElement.lang=lang;windowEvents['mmhvault-language-change']();assert.equal(labels[0].textContent,title);assert(nodes[outputs[0]].textContent.includes(age));assert(nodes[outputs[2]].textContent.includes(countdown));
 }
 doc.documentElement.lang='my';change('2999-01-01');assert(input.validity.includes('မွေးသက္ကရာဇ်'));assert.equal(data.get(key+'_a'),'1992-02-29');
 doc.documentElement.lang='en';windowEvents['mmhvault-language-change']();
 assert(app.includes('id="mmhBirthdayLocalNoteV265"')&&app.includes('Optional. Saved on this device for your account only.'));
 change('');assert(data.get(key+'_a')===''&&blank(),'explicit clear masks claimed legacy');
 doc.activeElement=input;input.handlers.focus();switchOwner('b');assert(blank(),'owner switch clears input');
 change('1998-01-01');assert(!data.has(key+'_b'),'stale edit cannot write to new owner');
 doc.activeElement=null;input.handlers.blur();change('1998-01-01');assert(!data.has(key+'_b'),'late edit remains invalidated after blur');
 doc.activeElement=input;input.handlers.focus();change('1998-01-02');assert(data.get(key+'_b')==='1998-01-02','new focus permits explicit new owner edit');
 doc.activeElement=null;input.handlers.blur();switchOwner('guest');assert(input.disabled&&blank(),'guest disabled and blank');
 change('1999-01-01');assert(!data.has(key+'_guest'),'guest cannot save');
 switchOwner('a');assert(!input.disabled&&blank(),'owner a explicit clear preserved');
 blocked=true;switchOwner('a');assert(blank(),'blocked storage fails closed');change('1999-01-01');assert(blank(),'blocked write fails closed');blocked=false;
 assert(/id="mmhBirthDateInputV34215" type="date" value=""/.test(app),'no invented HTML default');
 console.log('PASS: Personal birthday unset/legacy owner isolation, calendar validation, explicit clear, stale edit rejection and blocked storage (mock DOM)');
}

{
 const a=app.indexOf('function go(id,trigger)'),b=app.indexOf('function back(){',a);
 assert(a>=0&&b>a);
 const page=()=>({hidden:true,querySelector:()=>({focus(){}})}),profile=page(),security=page(),home={hidden:false};
 const pages=new Map([['profile',profile],['security',security]]);
 const root={classList:{contains:()=>false,add(){}}};
 const go=new Function('pages','root','home','mmhWorkspaceScrollYV2','mmhWorkspaceScrollToV2','let homeScroll=0,lastTrigger=null,nestedIconTrigger=null,nestedIconScroll=0;'+app.slice(a,b)+'return go;')(pages,root,home,()=>0,()=>{});
 go('personal');assert.equal(profile.hidden,false);assert.equal(security.hidden,true);assert.equal(home.hidden,true);
 go('security');assert.equal(profile.hidden,true);assert.equal(security.hidden,false);
 const c=app.indexOf('function register(id,title',b);
 const general=page(),icon=page();pages.set('general',general);pages.set('icon',icon);
 let inSub=false,scroll=20,focused='';
 const homeButton={focus(){focused='home'}},iconButton={closest:s=>s==='#stPage_general',focus(){focused='icon'}};
 const nestedRoot={classList:{contains:()=>inSub,add(){inSub=true},remove(){inSub=false}}};
 home.hidden=false;for(const p of pages.values())p.hidden=true;
 const nav=new Function('pages','root','home','mmhWorkspaceScrollYV2','mmhWorkspaceScrollToV2','let homeScroll=0,lastTrigger=null,nestedIconTrigger=null,nestedIconScroll=0;'+app.slice(a,c)+'return {go,back};')(pages,nestedRoot,home,()=>scroll,o=>{scroll=o.top});
 nav.go('general',homeButton);assert.equal(general.hidden,false);assert.equal(scroll,0);
 scroll=75;nav.go('icon',iconButton);assert.equal(icon.hidden,false);assert.equal(general.hidden,true);
 nav.back();assert.equal(general.hidden,false);assert.equal(icon.hidden,true);assert.equal(home.hidden,true);assert.equal(scroll,75);assert.equal(focused,'icon');
 nav.back();assert.equal(home.hidden,false);assert.equal(scroll,20);assert.equal(focused,'home');
 nav.go('icon');nav.back();assert.equal(home.hidden,false,'legacy icon route still returns home');
 // Execute actual profile relocation with and without birthday; keep existing save element.
 const profileMove=app.split('\n').find(line=>line.startsWith("const editor=top.querySelector('.settings-profile-editor');"));
 assert.ok(profileMove,'actual profile relocation');
 for(const hasBirthday of [false,true]){
  const moved=[],form={id:'mmhProfileFormV1',after(node){moved.push(['form',node])}},birthday=hasBirthday?{after(node){moved.push(['birthday',node])}}:null;
  const submit={setAttribute(key,value){assert.equal(key,'form');this.formId=value}},result={},actions={append(...nodes){this.nodes=nodes}};
  let removed=false;const editor={remove(){removed=true}},card={},profileButton={classList:{add(c){assert.equal(c,'st-profile-link')}}};
  const top={querySelector:s=>s==='.settings-profile-editor'?editor:card};
  const get=id=>({mmhProfileFormV1:form,mmhProfileSaveV1:submit,mmhProfileResultV1:result})[id];
  new Function('top','$','register','birthday','document',profileMove)(top,get,(id,title,icon,content,host)=>{assert.equal(id,'profile');assert.equal(content,form);assert.equal(host,card);return profileButton},birthday,{createElement:tag=>{assert.equal(tag,'div');return actions}});
  assert.equal(removed,true);assert.equal(submit.formId,form.id);
  assert.deepEqual(actions.nodes,[result,submit]);assert.equal(actions.className,'st-profile-actions-v269');
  assert.deepEqual(moved,hasBirthday?[['form',birthday],['birthday',actions]]:[['form',actions]]);
 }
 assert(!app.includes("account.append(disclosure('Personal time'"));
 assert(!app.includes("'Personal time':['personal'"));
 assert.equal((app.match(/id="mmhBirthDateInputV34215"/g)||[]).length,1);
 console.log('PASS: Personal birthday profile sibling placement, legacy route alias and separate navigation (source/mock DOM)');
}

{
 const source=app.split('\n').find(line=>line.startsWith("for(const [i,g] of [...main.querySelectorAll('.st-group')"));
 assert(source,'settings navigation construction');
 const removed=[],registered=[],groups=['Appearance','General','Transactions'].map(title=>({querySelector:()=>({textContent:title})}));
 let mainRemoved=false;
 const main={querySelectorAll:()=>groups,remove:()=>{mainRemoved=true}};
 new Function('main','register',source)(main,(id,title,icon,content)=>{registered.push({id,title,content});return {remove:()=>removed.push(id)}});
 assert.deepEqual(registered.map(x=>x.id),['appearance','general','transactions']);
 assert.deepEqual(removed,['appearance','transactions']);
 assert.equal(registered[1].content,groups[1]);assert(mainRemoved);
 assert(!app.includes('stLanguage'),'duplicate language control removed');
 assert(app.includes("['Preferences','偏好设置',['general']]"));
 assert(app.includes("['Personal & security','个人与安全',['security','data']]"));
 assert(app.includes("rows.append(iconRow);iconButton.remove()"));
 assert(app.includes("logo.onclick=()=>window.mmhOpenInstallGuideV270?.(logo)"));
 assert(app.includes("preview.hidden=true"));
 assert(app.includes("general:['Currency and font style','币种与字体样式']"));
 assert(app.includes('window.setMMHVAULTLanguage=function(next)'),'shared workspace language switch retained');
 assert(app.includes('css/mmhvault-settings-life-p928.css?v=2.0.65.2'));
 console.log('PASS: Settings redundant navigation removed, legacy pages and global language function retained (source/mock DOM)');
}

{
 const extract=id=>app.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)</script>'))[1];
 const nav=extract('mmhvault-settings-template-groups-v7'),guide=extract('mmhvault-settings-control-feedback-v4');
 new Function(nav);new Function(guide);
 const myCopy=new Function(nav.match(/const myCopy=(\{[^;]+\});/)[0]+'return myCopy')();
 assert.equal(Object.keys(myCopy).length,7);assert(Object.values(myCopy).every(x=>/[\u1000-\u109f]/.test(x)));
 const draw=guide.slice(guide.indexOf('  function drawGuide'),guide.indexOf('  let activeGuideTrigger=button;'));
 const build=new Function('document','T','matchMedia','navigator','guide','androidCustomTab','illustration','captions','let selectedDevice=null,installPrompt=null;'+draw+'return drawGuide');
 function elem(tag){return {tag,children:[],append(...items){this.children.push(...items)},replaceChildren(){this.children=[]},setAttribute(){},textContent:'',className:'',hidden:false,value:''}}
 for(const lang of [0,1,2])for(const device of ['ios','ios-other','android-chrome','android-firefox','android-other','desktop']){
  const host=elem('section');
  const fn=build({createElement:elem},(...args)=>args[lang]||args[0],()=>({matches:false}),{},host,()=>false,(kind,desktop)=>({kind,desktop}),()=>'caption');
  fn(device);
  const list=host.children.find(x=>x.tag==='ol');
  assert(list.children.length>=3);
  const art=({ios:'ios','ios-other':'ios','android-chrome':'android-chrome','android-other':'android-chrome'})[device];
  assert(list.children.every(li=>li.children[0].children.length===(art?1:2)&&li.children[0].children.at(-1).textContent));
  assert(lang!==2||list.children.every(li=>/[\u1000-\u109f]/.test(li.children[0].children.at(-1).textContent)));
  const figure=host.children.find(x=>x.tag==='figure');assert.equal(!!figure,!!art);
  if(art)assert.equal(figure.children[0].children[0].src,'./images/mmhvault-install-'+art+'-v271.webp');
  assert.equal(host.children[1].children[0].value,device);
 }
 console.log('PASS: Settings Myanmar subtitles and illustrated installation steps, 18 device/locale combinations (mock DOM)');
}

{
 const code=app.match(/<script id="mmhvault-settings-control-feedback-v4">([\s\S]*?)<\/script>/)[1];
 function fixture(ua='Android Chrome',referrer='',initial='my'){
  let lang=initial;const events={};
  function elem(tag){return {tag,children:[],append(...n){this.children.push(...n)},replaceChildren(){this.children=[]},setAttribute(){},addEventListener(){},showModal(){this.open=true},close(){this.open=false;this.hidden=true},hidden:false,open:false,textContent:''}}
  const host=elem('section');
  const doc={readyState:'complete',referrer,createElement:elem,getElementById:id=>id==='stPage_icon'?host:null};
  const win={addEventListener:(n,fn)=>events[n]=fn};
  new Function('window','document','navigator','localStorage','matchMedia',code)(win,doc,{userAgent:ua},{getItem:()=>lang},()=>({matches:false}));
  const [button,status,guide]=host.children;
  return {events,button,status,guide,locale(v){lang=v;events['mmhvault-language-change']()},async prompt(p){events.beforeinstallprompt({preventDefault(){},...p});await button.onclick()}};
 }
 for(const [initial,label] of [['en','Add to Home Screen'],['zh','添加到主屏幕'],['my','ပင်မမျက်နှာပြင်သို့ ထည့်ပါ']]){
  const q=fixture('Android Chrome','',initial);assert.equal(q.button.textContent,label);
  const first=q.status.textContent;q.locale('en');q.locale(initial);assert.equal(q.status.textContent,first);
 }
 for(const [outcome,english] of [['accepted','Installation accepted.'],['dismissed','Installation cancelled. You can still follow the manual guide.'],['error','Follow the manual guide to add the app.'],['race','MMHVAULT has been installed.']]){
  const q=fixture();
  await q.prompt({prompt:async()=>{assert.equal(q.guide.open,false);if(outcome==='error')throw Error('mock');if(outcome==='race')q.events.appinstalled()},userChoice:Promise.resolve({outcome:outcome==='dismissed'?'dismissed':'accepted'})});
  assert.equal(q.guide.open,['dismissed','error'].includes(outcome));
  assert.match(q.status.textContent,/[\u1000-\u109f]/);
  q.locale('en');assert.equal(q.status.textContent,english);
  q.locale('zh');assert.match(q.status.textContent,/[\u4e00-\u9fff]/);
 }
 const custom=fixture('Android Chrome','android-app://example');
 assert.match(custom.status.textContent,/[\u1000-\u109f]/);
 custom.locale('en');assert.match(custom.status.textContent,/^Android in-app/);
 let customCalls=0;await custom.prompt({prompt:async()=>{customCalls++},userChoice:Promise.resolve({outcome:'accepted'})});assert.equal(customCalls,0);assert.equal(custom.guide.open,true);
 console.log('PASS: installation status and buttons EN/ZH/MY, language refresh, prompt outcomes, appinstalled race and Custom Tab (mock DOM)');
}
