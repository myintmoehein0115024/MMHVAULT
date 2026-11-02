import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../app.html',import.meta.url),'utf8');
const start=html.indexOf('function displayAccountBalanceV11(a){');
const end=html.indexOf('function portfolios(){',start);
assert.ok(start>0&&end>start,'account fallback function exists');
const fnSource=html.slice(start,end);
function display({displayCurrency='USD',usdAmount=NaN,type='cash',native=2700}={}){
  const context={
    displayCurrency,Number,
    money:(amount,cur)=>cur+' '+amount,
    accountTotalNative:()=>native,
    balance:()=>native,
    accountTotalUSD:()=>usdAmount,
    displayMoney:amount=>Number.isFinite(amount)?'$ '+amount:'—'
  };
  const fn=vm.runInNewContext(fnSource+';displayAccountBalanceV11',context);
  return fn({id:'acc_amd',name:'Armenia Cash',type,currency:'AMD'});
}
test('native AMD balance is never replaced by blank when USD FX is missing',()=>{
  assert.equal(display(),'AMD 2700 · FX pending');
});
test('valid conversion uses selected display currency',()=>{
  assert.equal(display({usdAmount:7.5}),'$ 7.5');
});
test('original-currency selection always shows native funds',()=>{
  assert.equal(display({displayCurrency:'NATIVE'}),'AMD 2700');
});
test('crypto with unavailable reference rate keeps native figure',()=>{
  assert.equal(display({type:'crypto',native:500}),'AMD 500 · FX pending');
});
test('account list uses safe fallback and events include transaction mutation and reference FX',()=>{
  const start=html.indexOf('function renderHome(){');
  const end=html.indexOf('function page(id){',start);
  const render=html.slice(start,end);
  assert.match(render,/displayAccountBalanceV11\(a\)/);
  assert.match(html,/'mmhvault:data-change','mmhvault:cache-restored'/);
  assert.match(html,/'mmhvault:account-reference-fx-updated'\]\.forEach\(event=>window\.addEventListener\(event,scheduleAccountsRenderV159\)\)/);
  assert.match(html,/,cash=Number\(balance\(a\.name\)\)/);
  assert.match(html,/cash===0\?0:cashUSD/);
});
test('no historical currency, transactions or balance data are rewritten',()=>{
  assert.doesNotMatch(fnSource,/\b(?:localStorage\.setItem|db\.from|INSERT|UPDATE|DELETE|MMHVAULT_CONFIG\.accounts\.push)\b/i);
  assert.match(fnSource,/FX pending/);
  assert.doesNotMatch(fnSource,/currency\s*=/);
});
