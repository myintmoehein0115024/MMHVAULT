import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../app.html',import.meta.url),'utf8');
const service=fs.readFileSync(new URL('../js/mmhvault-account-reference-fx-v1.js',import.meta.url),'utf8');
const getFunction=(start,end)=>{const i=html.indexOf(start);assert.ok(i>=0,start);const j=html.indexOf(end,i);assert.ok(j>i,end);return html.slice(i,j);};
const fxLookup=getFunction('function mmhVaultUsdRateForAccountV140(name){','function mmhVaultAccountsMissingFxV140()');
const toMMK=getFunction('function toMMK(a){','function isLinkedInvestmentTx(t)');
const toTHB=getFunction('function toTHB(a){','function thb(v)');
const toUSD=html.match(/function toUSD\(a\)\{[^\n]+\}/)?.[0];
const accountFactor=getFunction('function accountToUSDFactorV135(a){','function accountTotalNative(a)');
const currencyRate=v=>{const n=Number(v);return v!=null&&v!==''&&Number.isFinite(n)&&n>0?n:null};
const marketFixture=({ageSeconds=1200,rate=360}={})=>{
  const timestamp=Math.floor(Date.now()/1000)-ageSeconds;
  return {result:'success',base_code:'USD',time_last_update_unix:timestamp,
    time_next_update_unix:timestamp+86400,rates:{USD:1,AMD:rate,JPY:151,SGD:1.37}};
};
function harness({accounts=[{name:'AMD',currency:'AMD',active:true,fxPerUSD:null}],cached=null,market=marketFixture()}={}){
  const entries=new Map(cached?[['mmhvault-public-asia-fx-v10',JSON.stringify(cached)]]:[]);
  let calls=0;
  const fakeWindow={
    addEventListener(){},dispatchEvent(){},render(){},
    mmhAccountsRefreshV1(){},
  };
  const context={
    window:fakeWindow,
    MMHVAULT_CONFIG:{accounts},
    mmhVaultAccountFxRateV140:currencyRate,
    document:{readyState:'loading',hidden:false,addEventListener(){}},
    navigator:{onLine:true},
    localStorage:{getItem:key=>entries.get(key)||null,setItem:(key,value)=>entries.set(key,value)},
    fetch:async url=>{calls++;assert.equal(url,'https://open.er-api.com/v6/latest/USD');return {ok:true,json:async()=>market};},
    setTimeout:()=>1,clearTimeout(){},AbortController,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},
    Date,Number,Math,JSON,Promise,console:{warn(){}}
  };
  vm.runInNewContext(service,context);
  return {service:fakeWindow.MMHAccountReferenceFXV1,context,calls:()=>calls,store:entries};
}

test('the existing Asia reference data includes an AMD rate in the shared service', async()=>{
  const h=harness();
  assert.equal(h.service.getRate('AMD'),null);
  assert.equal(await h.service.ensure(),true);
  assert.equal(h.service.getRate('AMD'),360);
  assert.equal(h.calls(),1);
  assert.equal(h.service.info('AMD').source,'Exchange Rate API');
});

test('10,000 AMD transaction contributes to Accounts USD assets and Analyze THB', async()=>{
  const h=harness();await h.service.ensure();
  const context={
    MMHVAULT_CONFIG:{accounts:[{name:'AMD',currency:'AMD',fxPerUSD:null,active:true,type:'cash'}]},
    mmhVaultAccountFxRateV140:currencyRate,
    window:{MMHAccountReferenceFXV1:h.service},
    currency:()=> 'AMD',
    rates:{usd_mmk:4400,usd_thb:35,usd_cny:7.2},
    mmhVaultAccountMeta:()=>({currency:'AMD'}),
    balance:()=>10000,
    Number,Math
  };
  const evaluated=vm.runInNewContext(fxLookup+toMMK+toTHB+toUSD+accountFactor+
    '\n({accountUSD:accountTotalUSD({name:"AMD",currency:"AMD",type:"cash"}),usdRate:toUSD("AMD"),thbRate:toTHB("AMD")})',context);
  assert.ok(Math.abs(evaluated.usdRate-1/360)<1e-12);
  assert.ok(Math.abs(evaluated.accountUSD-(10000/360))<1e-9);
  assert.ok(Math.abs(evaluated.thbRate-(35/360))<1e-12);
});

test('user-set rate always overrides automatic reference rate',async()=>{
  const h=harness();await h.service.ensure();
  const context={MMHVAULT_CONFIG:{accounts:[{name:'AMD',currency:'AMD',fxPerUSD:400}]},
    mmhVaultAccountFxRateV140:currencyRate,window:{MMHAccountReferenceFXV1:h.service}};
  assert.equal(vm.runInNewContext(fxLookup+'\nmmhVaultUsdRateForAccountV140("AMD")',context),400);
});

test('stale data never masquerades as current reference prices',async()=>{
  const h=harness({cached:marketFixture({ageSeconds:9*86400}),market:marketFixture({ageSeconds:9*86400})});
  assert.equal(h.service.getRate('AMD'),null);
  assert.equal(await h.service.ensure(),false);
  assert.equal(h.service.getRate('AMD'),null);
});

test('no external FX request is made when custom account rate is manual',async()=>{
  const h=harness({accounts:[{name:'AMD',currency:'AMD',active:true,fxPerUSD:400}]});
  assert.equal(await h.service.ensure(),false);
  assert.equal(h.calls(),0);
});

test('Account and Dashboard reflect FX availability rather than false zero contribution',()=>{
  assert.match(html,/window\.MMHAccountReferenceFXV1\?\.getRate/);
  assert.match(html,/!mmhVaultUsdRateForAccountV140\(a\.name\)/);
  assert.match(html,/Number\.isFinite\(share\)\?share\.toFixed\(2\)/);
  assert.match(html,/js\/mmhvault-account-reference-fx-v1\.js\?v=1\.0\.0/);
  assert.match(html,/mmhvault:asia-rates-updated/);
});
