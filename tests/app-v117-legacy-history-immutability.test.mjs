/* APP V11.7 — old-account history and aliases: synthetic, no network/database. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  legacyHierarchy,entryUsage,renameItem,deleteItem,archiveItem,
  choices,recordLink,normalizePersistedHierarchy
} from '../js/mmhvault-v11-manage-hierarchy-model.mjs';

const OWNER='synthetic-old-owner';
const oldConfig=()=>({
  categories:{Income:['Salary'],Expense:['Dining'],Transfer:['Transfer']},
  archivedCategories:{Income:['Old Bonus']},
  txFieldsV12:{
    version:1,type:['Income','Expense'],transaction:['Income|Income','Expense|Expense'],
    category:['Income|Salary','Expense|Dining'],
    displayV13:{
      typeLabels:{Income:'Earnings'},
      transactionLabels:{'Income|Income':'Pay'},
      extraTypes:[{id:'legacy_extra_type_1',canonical:'Income',label:'Side Income'}],
      extraTransactions:[{id:'legacy_extra_transaction_1',canonical:'Income|Income',label:'Income2'}]
    }
  }
});
const candidate=()=>{
  const original=oldConfig(),graph=legacyHierarchy(OWNER,original);
  const type=graph.types.find(x=>x.label==='Earnings');
  const transaction=graph.transactions.find(x=>x.label==='Pay'&&x.parentId===type.id);
  const salary=graph.categories.find(x=>x.label==='Salary'&&x.parentId===transaction.id);
  const oldBonus=graph.categories.find(x=>x.label==='Old Bonus'&&x.parentId===transaction.id);
  assert.ok(type&&transaction&&salary&&oldBonus);
  return {original,graph,type,transaction,salary,oldBonus};
};
test('historical Category usage is locked even if legacy row casing or whitespace differs',()=>{
  const {graph,salary}=candidate();
  const rows=[{id:501,user_id:OWNER,type:'Income',category:' salary ',amount:250}];
  assert.equal(entryUsage(graph,OWNER,'category',salary.id,rows),'used');
  assert.throws(()=>renameItem(graph,OWNER,'category',salary.id,'Paycheck',rows),/Archive instead/);
  assert.throws(()=>deleteItem(graph,OWNER,'category',salary.id,rows),/Archive instead/);
});
test('missing old ledger meaning is unknown, NEVER an Edit/Delete authorization',()=>{
  const {graph,salary}=candidate();
  for(const incomplete of [
    {id:503,user_id:OWNER,type:'Income',category:null},
    {id:504,user_id:OWNER,type:null,category:'Salary'},
    null
  ]){
    assert.equal(entryUsage(graph,OWNER,'category',salary.id,[incomplete]),'unknown');
    assert.throws(()=>renameItem(graph,OWNER,'category',salary.id,'Different',[incomplete]),/Archive instead/);
    assert.throws(()=>deleteItem(graph,OWNER,'category',salary.id,[incomplete]),/Archive instead/);
  }
});
test('archive hides next-choice only; legacy aliases, config, ledger and saved IDs do not change',()=>{
  const {original,graph,type,transaction,salary,oldBonus}=candidate();
  const oldJson=JSON.stringify(original);
  const history=[{id:505,user_id:OWNER,type:'Income',category:'Salary',amount:500}];
  const historyJson=JSON.stringify(history);
  const link=recordLink(graph,OWNER,'505',type.id,transaction.id,salary.id);
  const linkJson=JSON.stringify(link);
  assert.equal(oldBonus.archived,true);
  assert.ok(graph.types.some(x=>x.label==='Side Income'));
  assert.ok(graph.transactions.some(x=>x.label==='Income2'));
  archiveItem(graph,OWNER,'category',salary.id,true);
  assert.ok(!choices(graph,OWNER,'category',transaction.id).some(x=>x.id===salary.id));
  assert.equal(entryUsage(graph,OWNER,'category',salary.id,history),'used');
  assert.equal(JSON.stringify(original),oldJson);
  assert.equal(JSON.stringify(history),historyJson);
  assert.equal(JSON.stringify(graph.links['505']),linkJson);
  assert.equal(normalizePersistedHierarchy(graph,OWNER).links['505'].choiceIds.category,salary.id);
  archiveItem(graph,OWNER,'category',salary.id,false);
  assert.ok(choices(graph,OWNER,'category',transaction.id).some(x=>x.id===salary.id));
  assert.equal(JSON.stringify(history),historyJson);
});
