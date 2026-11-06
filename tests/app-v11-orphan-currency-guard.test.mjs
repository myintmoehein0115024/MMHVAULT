import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync(new URL('../app.html',import.meta.url),'utf8');
function section(start,end){
  const first=app.indexOf(start);
  const last=app.indexOf(end,first+start.length);
  assert.ok(first>0&&last>first,'APP finance guard is present: '+start);
  return app.slice(first,last);
}
const meta=section('function mmhVaultAccountMeta(name){','function mmhVaultAllAccountNames()');
const cur=app.match(/^function currency\(a\)\{[^\n]+\}$/m)?.[0];
assert.ok(cur,'global account currency resolver exists');
const mmk=section('function toMMK(a){','function isLinkedInvestmentTx(t)');
const thb=section('function toTHB(a){','function thb(v)');
const usd=section('function mmhvaultAmountUSD(account,amount){','function mmhvaultTxIncomeUSD(t)');
const accountFactor=section('function accountToUSDFactorV135(a){','function accountTotalUSD(a)');

function harness(accounts){
  const defaults=[
    {id:'acc_bath',name:'Baht',currency:'THB',type:'cash'},
    {id:'acc_kpay',name:'KPay',currency:'MMK',type:'wallet'}
  ];
  const config={accounts};
  const sandbox={
    MMHVAULT_CONFIG:config,MMHVAULT_DEFAULT_ACCOUNTS:defaults,
    rates:{usd_mmk:4400,usd_thb:35,usd_cny:7.2},
    n:value=>Number(value)||0,
    mmhVaultUsdRateForAccountV140:name=>{
      const a=config.accounts.find(x=>String(x.name||'').toLowerCase()===String(name||'').toLowerCase());
      return Number(a?.fxPerUSD)>0?Number(a.fxPerUSD):null;
    },
    mmhVaultAccountFxRateV140:value=>Number(value)>0?Number(value):null,
    toUSD:()=>0,Number,String,Math
  };
  const functions=vm.runInNewContext(meta+cur+'\n'+mmk+thb+usd+accountFactor+
    '\n({mmhVaultAccountMeta,currency,toMMK,toTHB,mmhvaultAmountUSD,accountToUSDFactorV135})',sandbox);
  return functions;
}

test('unmatched old account never inherits MMK or another imagined FX rate',()=>{
  const h=harness([{id:'acc_bath',name:'Baht',currency:'THB'}]);
  const name='Deleted Historic Account';
  assert.equal(h.mmhVaultAccountMeta(name).unresolved,true);
  assert.equal(h.mmhVaultAccountMeta(name).currency,null);
  assert.equal(h.currency(name),'');
  assert.equal(h.toMMK(name),0);
  assert.equal(h.toTHB(name),0);
  assert.equal(h.mmhvaultAmountUSD(name,10000),0);
  assert.ok(Number.isNaN(h.accountToUSDFactorV135({name})));
});

test('known MMK, THB and USD rates retain their exact conversions',()=>{
  const h=harness([
    {id:'acc_bath',name:'Baht',currency:'THB'},
    {id:'acc_kpay',name:'KPay',currency:'MMK'},
    {id:'acc_usd',name:'USD Cash',currency:'USD'}
  ]);
  assert.equal(h.currency('KPay'),'MMK');
  assert.equal(h.toMMK('KPay'),1);
  assert.equal(h.toTHB('KPay'),35/4400);
  assert.equal(h.toMMK('Baht'),4400/35);
  assert.equal(h.toTHB('Baht'),1);
  assert.equal(h.currency('Bath'),'THB');
  assert.equal(h.mmhvaultAmountUSD('Baht',350),10);
  assert.equal(h.mmhvaultAmountUSD('USD Cash',15),15);
});

test('manual AMD rate stays valid and is never converted as MMK',()=>{
  const h=harness([{id:'acc_amd',name:'Armenia Cash',currency:'AMD',fxPerUSD:400}]);
  assert.equal(h.currency('Armenia Cash'),'AMD');
  assert.equal(h.toTHB('Armenia Cash'),35/400);
  assert.equal(h.toMMK('Armenia Cash'),4400/400);
  assert.equal(h.mmhvaultAmountUSD('Armenia Cash',10000),25);
  assert.equal(h.accountToUSDFactorV135({name:'Armenia Cash',currency:'AMD',fxPerUSD:400}),1/400);
});

test('historical Baht cannot silently become MMK if built-in metadata is corrupted',()=>{
  const h=harness([{id:'acc_bath',name:'Baht',currency:'MMK'}]);
  assert.equal(h.mmhVaultAccountMeta('Baht').unresolved,true);
  assert.equal(h.currency('Baht'),'');
  assert.equal(h.toMMK('Baht'),0);
  assert.equal(h.toTHB('Bath'),0);
});

test('alias collision is fail-closed in either account list order',()=>{
  for(const accounts of [
    [{id:'acc_bath',name:'Baht',currency:'THB'},{id:'other',name:'Bath',currency:'MMK'}],
    [{id:'other',name:'Bath',currency:'MMK'},{id:'acc_bath',name:'Baht',currency:'THB'}]
  ]){
    const h=harness(accounts);
    assert.equal(h.mmhVaultAccountMeta('Bath').unresolved,true,'custom Bath and built-in alias are ambiguous');
    assert.equal(h.currency('Bath'),'');
    assert.equal(h.toTHB('Bath'),0);
    assert.equal(h.mmhVaultAccountMeta('Baht').id,'acc_bath','exact Baht remains the verified built-in');
    assert.equal(h.currency('Baht'),'THB');
    assert.equal(h.toTHB('Baht'),1);
  }
});

test('empty legacy transfer side preserves original no-account behavior',()=>{
  const h=harness([]);
  assert.equal(h.toMMK(''),1);
  assert.equal(h.currency(''),'MMK');
});

test('Dashboard and Analyze display warnings rather than silently pricing an orphan',()=>{
  assert.match(app,/USD totals may be incomplete: /);
  assert.match(app,/unverified currency/);
  assert.match(app,/const unresolvedNames=mmhVaultAllAccountNames\(\)\.filter/);
  assert.match(app,/const matches=configured\.filter\(a=>/);
  assert.match(app,/Unlinked account metadata in history:/);
  assert.match(app,/Missing FX rate:/);
});

test('change only computes display rates: no DB writes or historical transaction rewrites',()=>{
  for(const block of [meta,cur,mmk,thb,usd,accountFactor]){
    assert.doesNotMatch(block,/\b(?:INSERT INTO|DELETE FROM|UPDATE public\.transactions|db\.from|localStorage\.setItem)\b/i);
  }
  assert.match(app,/function mmhVaultFinanceIdentityChangeSafeV11\(/);
  assert.match(app,/js\/mmhvault-transaction-field-layout-v11\.js/);
});
