import test from 'node:test';
import assert from 'node:assert/strict';
import {createHierarchyController} from '../js/mmhvault-v11-manage-hierarchy-controller.mjs';
const owner='A';
const config=()=>({
  txFieldsV12:{version:1,type:[],transaction:[],category:[]},
  categories:{Income:['Salary','Other Income'],Expense:['Dining'],Personal:[],LoanIncome:[],LoanExpense:[],Transfer:['Transfer']},
  archivedCategories:{}
});
let count=0;
function setup(configData=config(),historyRows=[]){
  let active=owner,configOwner=owner,loaded=true,persistError=null,writes=0,changes=0;
  let rows=historyRows;
  const api=createHierarchyController({
    currentOwner:()=>active,configOwner:()=>configOwner,currentConfig:()=>configData,
    history:()=>({ownerId:active,loaded,rows}),
    newId:()=>String(++count),
    persist:(id,actual)=>{
      assert.equal(id,owner);
      assert.equal(actual,configData);
      if(persistError)throw persistError;
      writes++;
    },
    changed:()=>{changes++;}
  });
  return {api,config:configData,get writes(){return writes},get changes(){return changes},
    switchOwner(id){active=id},setConfigOwner(id){configOwner=id},
    loaded(v){loaded=v},history(v){rows=v},persistFails(v){persistError=v}};
}
function tree(h){
  const type=h.api.addType('Income','Income');
  const txn=h.api.addTransaction('Income2',type.id,'Income|Income');
  const cat=h.api.addCategory('Salary',txn.id);
  return {type,txn,cat};
}
test('new owner sees empty selector lists until Type → Transaction → Category is configured',()=>{
  const h=setup();
  assert.deepEqual(h.api.read().types,[]);
  assert.deepEqual(h.api.read().transactions,[]);
  assert.deepEqual(h.api.read().categories,[]);
  const {type,txn,cat}=tree(h);
  assert.equal(h.api.list('transaction',type.id)[0].label,'Income2');
  assert.equal(h.api.list('category',txn.id)[0].label,'Salary');
  assert.equal(h.api.path(type.id,txn.id,cat.id).type,'Income');
  assert.equal(h.writes,3);
  assert.equal(h.changes,3);
});
test('new Category is added to canonical Income list without overriding older categories',()=>{
  const h=setup(),type=h.api.addType('Income','Income');
  const txn=h.api.addTransaction('Bonus Payment',type.id,'Income|Income');
  const cat=h.api.addCategory('Bonus',txn.id);
  assert.equal(cat.label,'Bonus');
  assert.deepEqual(h.config.categories.Income,['Salary','Other Income','Bonus']);
});
test('persist failure rolls back both graph and category registry',()=>{
  const h=setup(),type=h.api.addType('Income','Income');
  const txn=h.api.addTransaction('Income2',type.id,'Income|Income');
  const previous=JSON.stringify(h.config);
  h.persistFails(new Error('Cloud queue rejected'));
  assert.throws(()=>h.api.addCategory('Bonus',txn.id),/Cloud queue rejected/);
  assert.equal(JSON.stringify(h.config),previous);
});
test('old owner sees same hierarchy in glass UI without an automatic migration',()=>{
  const old=config();delete old.txFieldsV12;old.categories.Income=['Salary'];
  const h=setup(old,[{user_id:owner,type:'Income',category:'Salary'}]);
  const before=JSON.stringify(old);
  const view=h.api.read();
  assert.ok(view.types.some(x=>x.label==='Income'));
  assert.ok(view.categories.some(x=>x.label==='Salary'));
  assert.equal(JSON.stringify(old),before);
  assert.equal(h.writes,0);
  const txn=view.transactions.find(x=>x.kindId==='Income|Income');
  assert.equal(h.api.status('transaction',txn.id),'used');
  assert.throws(()=>h.api.delete('transaction',txn.id),/Archive instead/);
  h.api.archive('transaction',txn.id);
  assert.equal(h.api.read().transactions.find(x=>x.id===txn.id).archived,true);
  assert.equal(old.categories.Income[0],'Salary');
  assert.equal(h.writes,1);
});
test('confirmed saved ledger can be linked by exact DB row ID',()=>{
  const h=setup(),{type,txn,cat}=tree(h);
  const before=JSON.stringify(h.config.categories);
  h.api.recorded('12345',type.id,txn.id,cat.id,{type:'Income',group:'Income',category:'Salary'});
  assert.equal(h.api.read().links['12345'].choiceIds.transaction,txn.id);
  assert.equal(h.api.status('transaction',txn.id),'used'); // sidecar locks immediately, before cloud refresh
  assert.equal(h.api.status('category',cat.id),'used');
  assert.throws(()=>h.api.rename('transaction',txn.id,'Unsafe'),/Archive instead/);
  assert.throws(()=>h.api.delete('category',cat.id),/Archive instead/);
  assert.equal(JSON.stringify(h.config.categories),before);
  h.history([{id:12345,user_id:owner,type:'Income',category:'Salary'}]);
  assert.equal(h.api.status('transaction',txn.id),'used');
  const first=JSON.stringify(h.api.read().links['12345']);
  assert.doesNotThrow(()=>h.api.recorded('12345',type.id,txn.id,cat.id,
    {type:'Income',group:'Income',category:'Salary'}));
  assert.equal(JSON.stringify(h.api.read().links['12345']),first);
  assert.throws(()=>h.api.rename('category',cat.id,'Salary2'),/Archive instead/);
});
test('mismatching server ledger row cannot be attached to another Manage path',()=>{
  const h=setup(),{type,txn,cat}=tree(h);
  const previous=JSON.stringify(h.config);
  assert.throws(()=>h.api.recorded('12345',type.id,txn.id,cat.id,
    {type:'Expense',group:'Expense',category:'Salary'}),/do not match/);
  assert.equal(JSON.stringify(h.config),previous);
});
test('owner guard and unverified history reject stale or other-account modifications',()=>{
  const h=setup(),{txn}=tree(h);
  h.loaded(false);
  assert.throws(()=>h.api.archive('transaction',txn.id),/not loaded/);
  h.loaded(true);
  h.setConfigOwner('B');
  assert.throws(()=>h.api.read(),/not owned/);
  assert.throws(()=>h.api.addType('Wrong','Income'),/not owned/);
  h.setConfigOwner(owner);
  h.switchOwner('B');
  assert.throws(()=>h.api.read(),/not owned/);
});
test('used Type and Transaction only archive and may be restored',()=>{
  const h=setup(),{type,txn,cat}=tree(h);
  h.history([{user_id:owner,type:'Income',category:'Salary'}]);
  assert.throws(()=>h.api.rename('type',type.id,'Changed'),/Archive instead/);
  assert.throws(()=>h.api.delete('transaction',txn.id),/Archive instead/);
  h.api.archive('type',type.id);
  assert.deepEqual(h.api.list('type'),[]);
  h.api.archive('type',type.id,false);
  assert.equal(h.api.list('transaction',type.id).length,1);
  assert.equal(h.api.list('category',txn.id)[0].id,cat.id);
});

test('system Transfer / Data Adjustment categories cannot diverge from canonical ledger',()=>{
  const h=setup(),type=h.api.addType('Transfers','Transfer');
  const txn=h.api.addTransaction('Move Funds',type.id,'Transfer|Transfer');
  assert.throws(()=>h.api.addCategory('Personal Move',txn.id),/fixed system Category/);
  const category=h.api.addCategory('Transfer',txn.id);
  assert.equal(h.api.path(type.id,txn.id,category.id).category,'Transfer');
  const income=h.api.addType('Income','Income');
  const adjustment=h.api.addTransaction('Balance correction',income.id,'Income|Data Adjustment');
  assert.throws(()=>h.api.addCategory('Salary',adjustment.id),/fixed system Category/);
  const fixed=h.api.addCategory('Data Adjustment',adjustment.id);
  assert.equal(h.api.path(income.id,adjustment.id,fixed.id).group,'Data Adjustment');
});


test('renaming an unused Category atomically updates native + Analyze canonical registry',()=>{
  const h=setup(),type=h.api.addType('Income','Income');
  const txn=h.api.addTransaction('Income2',type.id,'Income|Income');
  const cat=h.api.addCategory('Bonus Custom',txn.id);
  assert.ok(h.config.categories.Income.includes('Bonus Custom'));
  h.api.rename('category',cat.id,'Commission');
  assert.ok(!h.config.categories.Income.includes('Bonus Custom'),
    'Old unused Category must not leak into legacy category selectors or Analyze');
  assert.ok(h.config.categories.Income.includes('Commission'));
  assert.deepEqual(h.api.path(type.id,txn.id,cat.id).category,'Commission');
  assert.ok(h.config.categories.Income.includes('Salary'),
    'Other existing categories are left intact');
  h.api.delete('category',cat.id);
  assert.ok(!h.config.categories.Income.includes('Commission'),
    'Deleted unused Category must disappear from both lists');
  assert.ok(h.config.categories.Income.includes('Salary'));
  assert.equal(h.api.read().categories.length,0);
});
test('case-only Category rename updates canonical name used by native ledger exactly',()=>{
  const h=setup(),type=h.api.addType('Income','Income');
  const txn=h.api.addTransaction('Income2',type.id,'Income|Income');
  const cat=h.api.addCategory('Holiday Gift',txn.id);
  h.api.rename('category',cat.id,'holiday gift');
  assert.ok(!h.config.categories.Income.includes('Holiday Gift'));
  assert.ok(h.config.categories.Income.includes('holiday gift'));
  assert.deepEqual(h.api.path(type.id,txn.id,cat.id).category,'holiday gift');
});
test('even unrelated legacy rows sharing a category name block unsafe canonical removal',()=>{
  const h=setup(),type=h.api.addType('Income','Income');
  const txn=h.api.addTransaction('Income2',type.id,'Income|Income');
  const cat=h.api.addCategory('Legacy Shared Label',txn.id);
  const before=JSON.stringify(h.config), writes=h.writes;
  h.history([{user_id:owner,type:'Expense',category:'Legacy Shared Label'}]);
  assert.throws(()=>h.api.rename('category',cat.id,'New Label'),/Archive instead/);
  assert.throws(()=>h.api.delete('category',cat.id),/Archive instead/);
  assert.equal(JSON.stringify(h.config),before,'No partial canonical registry edits');
  assert.equal(h.writes,writes,'No configuration persistence on rejected destructive changes');
});
test('Archive of USED Category keeps exact historical ledger and category registry',()=>{
  const h=setup(),type=h.api.addType('Income','Income');
  const txn=h.api.addTransaction('Income2',type.id,'Income|Income');
  const cat=h.api.addCategory('Salary',txn.id);
  const oldRow={id:101,user_id:owner,type:'Income',category:'Salary',to_account:'Cash',to_amount:450};
  h.history([oldRow]);
  const rowBefore=JSON.stringify(oldRow),catBefore=JSON.stringify(h.config.categories);
  assert.throws(()=>h.api.rename('category',cat.id,'Salary2'),/Archive instead/);
  h.api.archive('category',cat.id);
  assert.equal(JSON.stringify(oldRow),rowBefore);
  assert.equal(JSON.stringify(h.config.categories),catBefore);
  assert.ok(!h.api.list('category',txn.id).some(x=>x.id===cat.id));
});
