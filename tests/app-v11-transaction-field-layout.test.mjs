import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../js/mmhvault-transaction-field-layout-v11.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../app.html',import.meta.url),'utf8');
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
function harness(){
  const store=new Map();let currentOwner=owner;
  const win={addEventListener(){}};
  const ctx={window:win,document:{readyState:'loading',addEventListener(){}},
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
    get currentSessionUser(){return {id:currentOwner}},
    mmhVaultTransactionCategoryListV451:(type,g)=>({
      Income:['Salary','Other Income'],Expense:['Dining','Other'],Personal:['Gifts'],LoanIncome:['Debt'],LoanExpense:['Loan Out'],Transfer:['Transfer']
    })[g==='Loans'?(type==='Income'?'LoanIncome':'LoanExpense'):g]||[],
    setTimeout(){},console};
  vm.runInNewContext(source,ctx);
  return {api:win.MMHV11TxFieldPrefs,store,owner:id=>{currentOwner=id;}};
}
test('three exact two-field options plus all-fields default',()=>{
 const h=harness(); assert.equal(h.api.getMode(),'all');
 for(const m of ['type-category','transaction-category','type-transaction']){
  assert.equal(h.api.setMode(m),true);assert.equal(h.api.getMode(),m);
 }
 assert.equal(h.api.setMode('not-a-mode'),false);
});
test('preferences isolate users on same browser, with safe defaults',()=>{
 const h=harness();h.api.setMode('type-category');h.owner(other);assert.equal(h.api.getMode(),'all');
 h.api.setMode('transaction-category');h.owner(owner);assert.equal(h.api.getMode(),'type-category');
});
test('Type + Category lists Income/Expense separately and preserves categorization',()=>{
 const h=harness();
 const cats=h.api.choices('Expense');
 assert.ok(cats.some(x=>x.group==='Expense'&&x.category==='Dining'));
 assert.ok(cats.some(x=>x.group==='Personal'&&x.category==='Gifts'));
 assert.ok(cats.some(x=>x.group==='Loans'&&x.category==='Loan Out'));
 assert.ok(!cats.some(x=>x.category==='Salary'));
});
test('Transaction + Category disambiguates loan income vs loan expense',()=>{
 const h=harness();const kinds=h.api.groupKinds();
 assert.ok(kinds.some(x=>x.type==='Income'&&x.group==='Loans'&&x.label==='Loan Income'));
 assert.ok(kinds.some(x=>x.type==='Expense'&&x.group==='Loans'&&x.label==='Loan Expense'));
});
test('Type + Transaction must not invent loans or personal categories',()=>{
 const h=harness();assert.equal(h.api.neutral('Income','Income'),'Other Income');
 assert.equal(h.api.neutral('Expense','Expense'),'Other');
 assert.equal(h.api.neutral('Expense','Personal'),null);
 assert.equal(h.api.neutral('Income','Loans'),null);
});
test('source never writes accounting, SQL, or finance data',()=>{
 assert.doesNotMatch(source,/db\.from\s*\(/);
 assert.doesNotMatch(source,/\.insert\s*\(|\.delete\s*\(|\.update\s*\(/);
 assert.match(source,/mmhvault_tx_field_layout_v11_/);
 assert.match(source,/e\.preventDefault\(\);e\.stopImmediatePropagation\(\)/);
});
test('Add Transaction and Edit Transaction integration only',()=>{
 assert.match(html,/src="js\/mmhvault-transaction-field-layout-v11\.js\?v=1\.0\.0"/);
 assert.match(html,/MMHV11TxFieldPrefs\?\.attachEdit\?\.\(\)/);
 assert.match(html,/const type=txType\.value;/);
 assert.match(html,/const row=\{user_id:u\.id,tx_date:txDate\.value,type,/);
 assert.match(html,/async function addTransaction\(e\)/);
});
