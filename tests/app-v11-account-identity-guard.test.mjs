import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync(new URL('../app.html',import.meta.url),'utf8');
const start=app.indexOf('async function mmhVaultFinanceIdentityChangeSafeV11(');
const end=app.indexOf('async function mmhVaultSyncAccountRenameSecondaryV1236(',start);
assert.ok(start>=0&&end>start,'V11 finance identity guard present');
const source=app.slice(start,end);
const account={id:'acc_bath',name:'Baht',currency:'THB',active:true};

function harness({primary=false,recurring=false,wallet=false,lifeFund=false,targetPrimary=false,targetLifeFund=false,ownerValid=true}={}){
  let readCount=0;
  const read=(oldVal,targetVal)=>async name=>{
    readCount++;
    return String(name).toLowerCase()==='orphan cash'?targetVal:oldVal;
  };
  const sandbox={
    db:{},
    mmhVaultRequireConfigOwner:()=>ownerValid,
    mmhVaultPrimaryHistoryUsesAccountV192:read(primary,targetPrimary),
    mmhVaultRecurringUsesAccountV1236:read(recurring,false),
    mmhVaultWalletUsesAccountV196:read(wallet,false),
    mmhVaultRowsUsingAccountV192:async(_table,_fields,name)=>{readCount++;return String(name).toLowerCase()==='orphan cash'?(targetLifeFund?[{id:2}]:[]):(lifeFund?[{id:1}]:[])},
    Promise,String
  };
  const guard=vm.runInNewContext(source+'\nmmhVaultFinanceIdentityChangeSafeV11',sandbox);
  return {guard,reads:()=>readCount};
}

test('historical transactions block account rename, including case-only edits',async()=>{
  const h=harness({primary:true});
  assert.equal(await h.guard(account,'THB Wallet','THB','owner'),false);
  assert.equal(await h.guard(account,'baht','THB','owner'),false);
});

test('historical transactions also block changing a linked THB account to MMK',async()=>{
  const h=harness({primary:true});
  assert.equal(await h.guard(account,'Baht','MMK','owner'),false);
});

test('recurring and crypto wallet references protect account identity',async()=>{
  assert.equal(await harness({recurring:true}).guard(account,'New Name','THB','owner'),false);
  assert.equal(await harness({wallet:true}).guard(account,'Baht','USD','owner'),false);
});

test('Life Planner fund allocations protect references too',async()=>{
  assert.equal(await harness({lifeFund:true}).guard(account,'Renamed','THB','owner'),false);
});

test('an unused account can be renamed without rewriting any historical records',async()=>{
  const h=harness();
  assert.equal(await h.guard(account,'Unused New Name','THB','owner'),true);
  assert.equal(h.reads(),8);
});

test('unused account cannot rename into a historical orphan reference',async()=>{
  const h=harness({targetPrimary:true});
  assert.equal(await h.guard(account,'orphan cash','THB','owner'),false);
  assert.equal(h.reads(),8);
});

test('orphaned Life Planner allocations also block account-name reuse',async()=>{
  const h=harness({targetLifeFund:true});
  assert.equal(await h.guard(account,'orphan cash','THB','owner'),false);
  assert.equal(h.reads(),8);
});

test('currency change with no name change checks only the original references',async()=>{
  const h=harness();
  assert.equal(await h.guard(account,'Baht','AMD','owner'),true);
  assert.equal(h.reads(),4);
});

test('editing non-identity fields continues even when account has history',async()=>{
  const h=harness({primary:true});
  assert.equal(await h.guard(account,'Baht','THB','owner'),true);
  assert.equal(h.reads(),0);
});

test('owner mismatch fails closed',async()=>{
  const h=harness({ownerValid:false});
  assert.equal(await h.guard(account,'Baht','MMK','other-owner'),false);
});

test('history lookup failure rejects rather than permitting partial table rewrites',async()=>{
  const sandbox={
    db:{},
    mmhVaultRequireConfigOwner:()=>true,
    mmhVaultPrimaryHistoryUsesAccountV192:async()=>{throw Error('offline')},
    mmhVaultRecurringUsesAccountV1236:async()=>false,
    mmhVaultWalletUsesAccountV196:async()=>false,
    mmhVaultRowsUsingAccountV192:async()=>[],
    Promise,String
  };
  const guard=vm.runInNewContext(source+'\nmmhVaultFinanceIdentityChangeSafeV11',sandbox);
  await assert.rejects(guard(account,'Renamed','THB','owner'),/offline/);
});

test('account edit checks historical identity BEFORE updating Transactions',()=>{
  const block=app.slice(app.indexOf('const oldName=a.name, nameChanged=oldName!==newName;'));
  const guardPos=block.indexOf('await mmhVaultFinanceIdentityChangeSafeV11(a,newName,newCurrency,configOwner)');
  const updatePos=block.indexOf("await mmhVaultUpdateAccountRefsV192('transactions'");
  assert.ok(guardPos>=0&&updatePos>guardPos);
  assert.match(block.slice(0,updatePos),/name or currency cannot be changed/);
});
