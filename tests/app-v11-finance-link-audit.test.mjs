import test from 'node:test';
import assert from 'node:assert/strict';
import { auditFinanceLinks } from '../tools/app-v11-finance-link-audit.mjs';

const OWNER='owner-a', OTHER='owner-b';
const account=(name,currency,id,options={})=>({name,currency,id,active:true,...options});
const tx=(from,to,user_id=OWNER)=>({user_id,from_account:from,to_account:to});
const audit=(accounts,transactions=[],extra={})=>auditFinanceLinks({
  ownerId:OWNER,config:{accounts},transactions,...extra
});

test('new AMD account receives its exact historical reference without rewriting amounts',()=>{
  const accounts=[account('Armenia Cash','AMD','acc_amd',{fxPerUSD:390})];
  const transactions=[{...tx('','Armenia Cash'),to_amount:10000,currency:'AMD'}];
  const before=JSON.stringify({accounts,transactions});
  const result=audit(accounts,transactions);
  assert.equal(result.totalReferences,1);
  assert.equal(result.resolvedReferences,1);
  assert.equal(result.unresolvedReferences,0);
  assert.equal(result.hasUnverifiedAccounting,false);
  assert.equal(JSON.stringify({accounts,transactions}),before);
});

test('an unknown custom account is NOT silently interpreted as MMK',()=>{
  const result=audit([account('Baht','THB','acc_bath')],[tx('Travel Wallet','Baht')]);
  assert.equal(result.resolvedReferences,1);
  assert.equal(result.unresolvedReferences,1);
  assert.deepEqual(result.unresolved[0].currency,null);
  assert.equal(result.unresolved[0].reason,'account_not_in_config');
  assert.equal(result.hasUnverifiedAccounting,true);
});

test('only stable acc_bath permits the historical Bath spelling',()=>{
  assert.equal(audit([account('Baht','THB','acc_bath')],[tx('Bath','')]).resolvedReferences,1);
  assert.equal(audit([account('Bath','THB','acc_bath')],[tx('Baht','')]).resolvedReferences,1);
  assert.equal(audit([account('Baht','THB','custom_baht')],[tx('Bath','')]).unresolvedReferences,1);
});

test('archived accounts must continue to resolve their historical transactions',()=>{
  const result=audit([account('Old USD','USD','acc_old',{active:false})],[tx('Old USD','')]);
  assert.equal(result.resolvedReferences,1);
  assert.equal(result.unresolvedReferences,0);
});

test('cross-user transaction records do not affect this owner audit',()=>{
  const result=audit([account('USD Cash','USD','acc_usd')],[tx('Different Account','',OTHER),tx('USD Cash','')]);
  assert.equal(result.totalReferences,1);
  assert.equal(result.unresolvedReferences,0);
});

test('investment and scheduled references receive the same checks',()=>{
  const result=audit([account('USD Cash','USD','acc_usd')],[],{
    investments:[{user_id:OWNER,source_account:'USD Cash'}],
    customInvestments:[{user_id:OWNER,source_account:'Forgotten Account'}],
    recurringTransactions:[{user_id:OWNER,from_account:'USD Cash',to_account:'Missing Account'}]
  });
  assert.equal(result.totalReferences,4);
  assert.equal(result.unresolvedReferences,2);
});

test('custom currency without manual rate is flagged for a real reference rate, never guessed',()=>{
  const result=audit([account('AMD','AMD','acc_amd',{fxPerUSD:null})],[tx('AMD','')]);
  assert.equal(result.resolvedReferences,1);
  assert.equal(result.requiresReferenceFx.length,1);
  assert.equal(result.requiresReferenceFx[0].currency,'AMD');
  assert.equal(result.hasUnverifiedAccounting,true);
});

test('duplicate account display names cannot silently create ambiguous references',()=>{
  const result=audit([account('Wallet','THB','one'),account(' wallet ','USD','two')],[tx('Wallet','')]);
  assert.equal(result.duplicateNames.length,1);
  assert.equal(result.resolvedReferences,0,'ambiguous duplicate must not use the first account currency');
  assert.equal(result.unresolved[0].reason,'ambiguous_account_reference');
  assert.equal(result.unresolved[0].currency,null);
  assert.equal(result.hasUnverifiedAccounting,true);
});

test('historical Bath alias cannot override a separate custom Bath account by config ordering',()=>{
  for(const accounts of [
    [account('Baht','THB','acc_bath'),account('Bath','MMK','custom_bath')],
    [account('Bath','MMK','custom_bath'),account('Baht','THB','acc_bath')]
  ]){
    const result=audit(accounts,[tx('Bath','')]);
    assert.equal(result.resolvedReferences,0);
    assert.equal(result.unresolvedReferences,1);
    assert.equal(result.unresolved[0].reason,'ambiguous_account_reference');
    assert.equal(result.unresolved[0].currency,null);
    assert.equal(result.hasUnverifiedAccounting,true);
    const unambiguous=audit(accounts,[tx('Baht','')]);
    assert.equal(unambiguous.resolvedReferences,1);
    assert.equal(unambiguous.unresolvedReferences,0);
  }
  const onlyCustom=audit([account('Bath','MMK','custom_bath')],[tx('Bath','')]);
  assert.equal(onlyCustom.resolvedReferences,1,'a genuine custom Bath name remains valid without acc_bath');
});

test('acc_bath cannot silently reinterpret historical THB as MMK',()=>{
  const result=audit([account('Baht','MMK','acc_bath')],[tx('Baht','')]);
  assert.equal(result.resolvedReferences,0);
  assert.equal(result.unresolvedReferences,1);
  assert.equal(result.unresolved[0].reason,'builtin_baht_currency_conflict');
  assert.equal(result.unresolved[0].currency,null);
});

test('archived custom AMD accounts still require a trustworthy FX rate for historical Analyze',()=>{
  const result=audit([account('Old Armenia Cash','AMD','acc_old_amd',{active:false,fxPerUSD:null})],[tx('Old Armenia Cash','')]);
  assert.equal(result.resolvedReferences,1);
  assert.equal(result.requiresReferenceFx.length,1);
  assert.equal(result.requiresReferenceFx[0].currency,'AMD');
  assert.equal(result.hasUnverifiedAccounting,true);
});

test('owner context is mandatory: never audit or mix records without identity',()=>{
  assert.throws(()=>auditFinanceLinks({config:{accounts:[]},transactions:[tx('X','')]}),/ownerId/);
});

test('no SQL, network, filesystem or persistence mutation is performed in audit utility',()=>{
  const raw=JSON.stringify({ownerId:OWNER,config:{accounts:[account('THB','THB','thb')]},transactions:[tx('THB','')]});
  const data=JSON.parse(raw);
  const result=auditFinanceLinks(data);
  assert.equal(result.resolvedReferences,1);
  assert.equal(JSON.stringify(data),raw);
});
