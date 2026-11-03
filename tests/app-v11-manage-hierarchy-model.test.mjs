import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyHierarchy,addType,addTransaction,addCategory,choices,pathFor,
  entryUsage,renameItem,deleteItem,archiveItem,legacyHierarchy,recordLink,normalizePersistedHierarchy
} from '../js/mmhvault-v11-manage-hierarchy-model.mjs';
const A='account-A',B='account-B';
let serial=0;const next=()=>('new-item-'+ ++serial);
const sample=()=>{
  const tree=emptyHierarchy(A);
  const income=addType(tree,A,'Income','Income',next);
  const expense=addType(tree,A,'Expense','Expense',next);
  const income2=addTransaction(tree,A,'Income2',income.id,'Income|Income',next);
  const salary=addCategory(tree,A,'Salary',income2.id,next);
  return {tree,income,expense,income2,salary};
};
test('new owner starts with absolutely no Type / Transaction / Category presets',()=>{
  const t=emptyHierarchy(A);
  assert.deepEqual({types:t.types,transactions:t.transactions,categories:t.categories},
    {types:[],transactions:[],categories:[]});
  assert.equal(choices(t,A,'type').length,0);
  assert.throws(()=>addTransaction(t,A,'Income2','non-existent','Income|Income',next));
  assert.throws(()=>addCategory(t,A,'Salary','non-existent',next));
});
test('requires Type first; Transaction picks its Type; Category picks its Transaction',()=>{
  const {tree,income,expense,income2,salary}=sample();
  assert.equal(choices(tree,A,'transaction',income.id)[0].label,'Income2');
  assert.equal(choices(tree,A,'transaction',expense.id).length,0);
  assert.equal(choices(tree,A,'category',income2.id)[0].label,'Salary');
  assert.deepEqual(pathFor(tree,A,income.id,income2.id,salary.id),{
    type:'Income',group:'Income',category:'Salary',
    choiceIds:{type:income.id,transaction:income2.id,category:salary.id}});
  assert.throws(()=>pathFor(tree,A,expense.id,income2.id,salary.id));
  assert.throws(()=>addTransaction(tree,A,'Income2',income.id,'Expense|Expense',next));
});
test('names are unique within their own parent and may be user-defined',()=>{
  const {tree,income,income2}=sample();
  assert.throws(()=>addTransaction(tree,A,'income2',income.id,'Income|Income',next));
  assert.throws(()=>addCategory(tree,A,'salary',income2.id,next));
  const other=addTransaction(tree,A,'Other Income',income.id,'Income|Income',next);
  assert.equal(addCategory(tree,A,'Salary',other.id,next).label,'Salary');
  assert.throws(()=>addType(tree,A,'Income','Income',next));
});
test('archive hides an option in Add Transaction; saved ledger path remains intact',()=>{
  const {tree,income,income2,salary}=sample();
  const saved=pathFor(tree,A,income.id,income2.id,salary.id);
  archiveItem(tree,A,'category',salary.id);
  assert.equal(choices(tree,A,'category',income2.id).length,0);
  assert.throws(()=>pathFor(tree,A,income.id,income2.id,salary.id));
  assert.deepEqual(saved.type,'Income');
  archiveItem(tree,A,'category',salary.id,false);
  archiveItem(tree,A,'transaction',income2.id);
  assert.equal(choices(tree,A,'transaction',income.id).length,0);
  assert.equal(choices(tree,A,'category',income2.id).length,0);
  archiveItem(tree,A,'transaction',income2.id,false);
  archiveItem(tree,A,'type',income.id);
  assert.equal(choices(tree,A,'transaction',income.id).length,0);
  archiveItem(tree,A,'type',income.id,false);
  assert.equal(choices(tree,A,'category',income2.id)[0].label,'Salary');
});
test('previously used entries can ONLY be archived; no rename or delete',()=>{
  const {tree,income,income2,salary}=sample();
  const ledger=[{type:'Income',group:'Income',category:'Salary'}]; // legacy lacks choiceIds
  for(const [f,id] of [['type',income.id],['transaction',income2.id],['category',salary.id]]){
    assert.equal(entryUsage(tree,A,f,id,ledger),'used');
    assert.throws(()=>renameItem(tree,A,f,id,'Changed',ledger),/Archive instead/);
    assert.throws(()=>deleteItem(tree,A,f,id,ledger),/Archive instead/);
    assert.equal(archiveItem(tree,A,f,id).archived,true);
  }
  assert.equal(tree.categories.length,1);
  assert.equal(tree.categories[0].label,'Salary');
  assert.equal(ledger[0].category,'Salary');
});
test('items without history may be edited or deleted when descendants are absent',()=>{
  const {tree,income,income2,salary}=sample();
  assert.equal(entryUsage(tree,A,'category',salary.id,[]),'unused');
  renameItem(tree,A,'category',salary.id,'New Salary',[]);
  assert.equal(tree.categories[0].label,'New Salary');
  assert.equal(deleteItem(tree,A,'category',salary.id,[]),true);
  assert.throws(()=>deleteItem(tree,A,'type',income.id,[]),/child items/i);
  deleteItem(tree,A,'transaction',income2.id,[]);
  assert.equal(deleteItem(tree,A,'type',income.id,[]),true);
});
test('unknown history blocks editing and deletion until account history loads',()=>{
  const {tree,income,income2,salary}=sample();
  assert.equal(entryUsage(tree,A,'category',salary.id,undefined),'unknown');
  assert.throws(()=>renameItem(tree,A,'category',salary.id,'Other',undefined));
  assert.throws(()=>deleteItem(tree,A,'transaction',income2.id,null));
  assert.doesNotThrow(()=>archiveItem(tree,A,'category',salary.id));
});
test('accurate choiceIds distinguish new transaction siblings with same accounting code',()=>{
  const {tree,income,income2}=sample();
  const second=addTransaction(tree,A,'Income3',income.id,'Income|Income',next);
  const records=[{type:'Income',group:'Income',category:'Other',
    choiceIds:{type:income.id,transaction:income2.id}}];
  assert.equal(entryUsage(tree,A,'transaction',income2.id,records),'used');
  assert.equal(entryUsage(tree,A,'transaction',second.id,records),'unused');
  assert.equal(entryUsage(tree,A,'type',income.id,records),'used');
  assert.equal(entryUsage(tree,A,'category',tree.categories[0].id,records),'unused');
});
test('owner mismatch prevents reading, writing and archiving another account',()=>{
  const {tree,income,income2,salary}=sample();
  for(const action of [
    ()=>choices(tree,B,'type'),()=>pathFor(tree,B,income.id,income2.id,salary.id),
    ()=>addType(tree,B,'Other','Income',next),
    ()=>archiveItem(tree,B,'type',income.id),
    ()=>deleteItem(tree,B,'category',salary.id,[])])
    assert.throws(action,/Owner-scoped/);
  assert.equal(tree.types[0].archived,false);
});
test('legacy mapping only derives a display model; does not mutate historic config',()=>{
  const config={categories:{
    Income:['Salary'],Expense:['Dining'],Personal:['Gift'],
    LoanIncome:['Loan payment'],LoanExpense:['Loan out']
  }};
  const before=JSON.stringify(config);
  const t=legacyHierarchy(A,config);
  assert.equal(JSON.stringify(config),before);
  const income=t.types.find(x=>x.ledgerType==='Income');
  const txn=t.transactions.find(x=>x.kindId==='Income|Income');
  const salary=t.categories.find(x=>x.label==='Salary');
  assert.equal(txn.parentId,income.id);
  assert.equal(salary.parentId,txn.id);
  assert.equal(entryUsage(t,A,'category',salary.id,[{type:'Income',group:'Income',category:'Salary'}]),'used');
});

test('legacy ledger rows without group block destructive transaction edits conservatively',()=>{
  const {tree,income2}=sample();
  const history=[{id:1,type:'Income',category:'Other Income'}];
  assert.equal(entryUsage(tree,A,'transaction',income2.id,history),'used');
  assert.throws(()=>deleteItem(tree,A,'transaction',income2.id,history),/Archive instead/);
});
test('reused Category name is blocked inside a ledger group',()=>{
  const {tree,income,income2}=sample();
  const another=addTransaction(tree,A,'Income3',income.id,'Income|Income',next);
  assert.throws(()=>addCategory(tree,A,'Salary',another.id,next),/ledger group/);
});
test('new saved transactions link to stable choices while original ledger fields stay unchanged',()=>{
  const {tree,income,income2,salary}=sample();
  const saved=recordLink(tree,A,'991',income.id,income2.id,salary.id);
  assert.equal(saved.canonical.type,'Income');
  assert.equal(saved.canonical.category,'Salary');
  assert.equal(entryUsage(tree,A,'transaction',income2.id,[{id:991,type:'Income',category:'Salary'}]),'used');
  assert.throws(()=>recordLink(tree,A,'991',income.id,income2.id,salary.id),/already recorded/);
});
test('cloud normalization round trips valid data and rejects an alien owner or modified linkage',()=>{
  const {tree,income,income2,salary}=sample();
  recordLink(tree,A,'991',income.id,income2.id,salary.id);
  const restored=normalizePersistedHierarchy(JSON.parse(JSON.stringify(tree)),A);
  assert.equal(restored.links['991'].choiceIds.category,salary.id);
  assert.throws(()=>normalizePersistedHierarchy(restored,B),/Unsafe/);
  const tampered=JSON.parse(JSON.stringify(tree));
  tampered.categories[0].parentId='missing';
  assert.throws(()=>normalizePersistedHierarchy(tampered,A),/Unsafe/);
  const other=JSON.parse(JSON.stringify(tree));
  other.links['991'].canonical.type='Expense';
  assert.throws(()=>normalizePersistedHierarchy(other,A),/Unsafe/);
});
