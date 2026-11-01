// Read-only regression checks for the MMHVAULT account / Analyze linkage fix.
// Run: node --test tests/data-integrity-v1.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app=fs.readFileSync(new URL('../app.html',import.meta.url),'utf8');
const fxFunction=app.match(/function toTHB\(a\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(fxFunction,'toTHB conversion function exists');
function factor(code,fx=null,rates={usd_thb:35,usd_mmk:4400,usd_cny:7.2}){
  const sandbox={currency:()=>code,rates,mmhVaultUsdRateForAccountV140:()=>fx};
  return vm.runInNewContext(fxFunction+"\ntoTHB('Test Account')",sandbox);
}
test('native THB and primary conversions remain correct',()=>{
  assert.equal(factor('THB'),1);
  assert.equal(factor('USD'),35);
  assert.equal(factor('MMK'),35/4400);
  assert.equal(factor('CNY'),35/7.2);
});
test('custom Asian account FX contributes to Analyze, never silently 0',()=>{
  assert.equal(factor('AMD',390),35/390);
  assert.equal(factor('JPY',150),35/150);
  assert.equal(factor('SGD',1.36),35/1.36);
});
test('no fabricated conversion for a missing custom FX reference',()=>{
  assert.equal(factor('AMD',null),0);
  assert.match(app,/Missing FX rate:/);
});
test('fresh account edits sync across devices without 500ms blind spot',()=>{
  assert.match(app,/if\(forceUpload\|\|localStamp>cloudStamp\)/);
  assert.match(app,/if\(cloudStamp>localStamp&&cloud\.config/);
  assert.doesNotMatch(app,/localStamp>cloudStamp\+500/);
  assert.doesNotMatch(app,/cloudStamp>localStamp\+500/);
  assert.match(app,/New account cloud sync pending/);
});
test('Analyze distinguishes operational flows from legitimate non-operating flows',()=>{
  assert.match(app,/const accounted=analyzeFlowRows\(rows\)/);
  assert.match(app,/missingAccounts=new Set\(\),missingFx=new Set\(\)/);
  assert.match(app,/classified separately \(transfers, loans, adjustments or investments\)/);
});
test('loan summary uses correct income and outflow sides',()=>{
  assert.match(app,/if\(t\.category==='Debt'&&t\.type==='Income'\)debt\+=n\(t\.to_amount\)/);
  assert.match(app,/&&t\.type==='Expense'\)paid\+=n\(t\.from_amount\)/);
});
