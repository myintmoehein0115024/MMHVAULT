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
  const ctx={window:win,document:{readyState:'loading',addEventListener(){},getElementById(){return null},querySelectorAll(){return []}},
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
    get currentSessionUser(){return {id:currentOwner}},
    mmhVaultTransactionCategoryListV451:(type,g)=>({
      Income:['Salary','Other Income'],Expense:['Dining','Other'],Personal:['Gifts'],LoanIncome:['Debt'],LoanExpense:['Loan Out'],Transfer:['Transfer']
    })[g==='Loans'?(type==='Income'?'LoanIncome':'LoanExpense'):g]||[],
    setTimeout(){},console};
  vm.runInNewContext(source,ctx);
  return {api:win.MMHV11TxFieldPrefs,store,doc:ctx.document,owner:id=>{currentOwner=id;}};
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

test('archived historical category remains unchanged when editing other transaction fields',()=>{
 const h=harness();h.api.setMode('type-category');
 const label={style:{}};
 const fields={
   eType:{value:'Expense',options:[{value:'Expense'}],closest:()=>label},
   eGroup:{value:'Personal',options:[{value:'Personal'}],closest:()=>label},
   eCat:{value:'Archived Gift',options:[{value:'Archived Gift'}],closest:()=>label}
 };
 h.doc.getElementById=id=>fields[id]||null;
 const hint={hidden:true,textContent:''};
 const form={
   id:'editTxForm',
   dataset:{mmhV11OriginalType:'Expense',mmhV11OriginalGroup:'Personal',mmhV11OriginalCategory:'Archived Gift'},
   querySelector:selector=>selector==='[data-tx-hint-v11]'?hint:null
 };
 assert.equal(h.api.validate(form),true,'note-only edits preserve a retired category');
 fields.eCat.value='Unapproved new Category';
 assert.equal(h.api.validate(form),false,'a different invalid category is blocked');
 assert.match(hint.textContent,/valid Type, Transaction and Category/i);
 fields.eCat.value='Archived Gift';fields.eType.value='Income';
 assert.equal(h.api.validate(form),false,'changing type invalidates historical exemption');
});
test('UI guard preserves historical edit categories and avoids silent replacement',()=>{
 assert.match(source,/if\(selected<0 && c\.edit\)/);
 assert.match(source,/if\(!c\.edit && value!==category/);
 assert.match(html,/editFormV11\.dataset\.mmhV11OriginalCategory=String\(t\.category\|\|''\)/);
 assert.match(html,/originalV11\.textContent=String\(t\.category\)/);
});

test('transaction field UI strings follow language without changing ledger codes',()=>{
 const h=harness();
 assert.equal(h.api.label('type-category'),'Type + Category');
 h.store.set('mmhvault_language_v3363','zh');
 assert.equal(h.api.label('type-category'),'类型 + 分类');
 assert.equal(h.api.label('kind-Expense-Loans'),'借款支出');
 const zhKinds=h.api.groupKinds();
 assert.ok(zhKinds.some(x=>x.type==='Expense'&&x.group==='Loans'&&x.label==='Loan Expense'));
 h.store.set('mmhvault_language_v3363','my');
 assert.equal(h.api.label('category'),'ကဏ္ဍ');
 assert.equal(h.api.label('kind-Income-Loans'),'ချေးငွေဝင်');
 h.store.set('mmhvault_language_v3363','en');
 assert.equal(h.api.label('type-category'),'Type + Category');
});
test('changing language never writes type/category translations to financial data',()=>{
 const h=harness();
 h.store.set('mmhvault_language_v3363','my');
 const loan=h.api.choices('Expense').find(x=>x.group==='Loans');
 assert.equal(loan?.category,'Loan Out');
 assert.equal(loan?.type,'Expense');
 assert.match(source,/mmhvault-language-change',refreshAll/);
});

test('synthetic form DOM keeps original ledger values when user chooses a combined field',()=>{
  const store=new Map([['mmhvault_tx_field_layout_v11_'+owner,'type-category']]);
  const names={Income:['Salary','Other Income'],Expense:['Dining','Other'],Personal:['Gifts'],LoanIncome:['Debt'],LoanExpense:['Loan Out']};
  const categoryOptions=(type,group)=>group==='Transfer'?['Transfer']:group==='Data Adjustment'?['Data Adjustment']:names[group==='Loans'?(type==='Income'?'LoanIncome':'LoanExpense'):group]||[];
  const groups=type=>type==='Income'?['Income','Loans','Data Adjustment']:type==='Expense'?['Expense','Personal','Loans','Data Adjustment']:['Transfer'];
  const wraps={},listeners={},grid={children:[],appendChild(x){this.children.push(x)}},labels={};
  class Node {
    constructor(tag){this.tagName=tag;this.dataset={};this.style={};this.children=[];this.options=[];this.hidden=false;this._value='';}
    appendChild(x){this.children.push(x);if(this.tagName==='select')this.options.push(x);return x;}
    setAttribute(name,value){this[name]=String(value);}
    replaceChildren(...nodes){this.children=[];this.options=[];nodes.forEach(x=>this.appendChild(x));}
    querySelector(selector){if(selector==='select')return this.children.find(x=>x.tagName==='select')||null;return null;}
    after(node){wraps[node.dataset.txQuickV11]=node;}
    set value(v){this._value=String(v);}
    get value(){return this._value;}
  }
  for(const k of ['type','group','category'])labels[k]=new Node('label');
  const select=(value,values,field)=>{
    const el=new Node('select');
    el.options=values.map(v=>({value:v}));
    el.value=value;
    el.closest=()=>labels[field];
    return el;
  };
  const type=select('Expense',['Income','Expense','Transfer'],'type');
  const group=select('Expense',groups('Expense'),'group');
  const category=select('Dining',categoryOptions('Expense','Expense'),'category');
  const form={
    id:'editTxForm',dataset:{mmhV11OriginalType:'Expense',mmhV11OriginalGroup:'Expense',mmhV11OriginalCategory:'Dining'},
    addEventListener(name,fn){listeners[name]=fn;},
    querySelector(q){
      if(q==='.formgrid')return grid;
      if(q==='[data-tx-hint-v11]')return grid.children.find(x=>Object.hasOwn(x.dataset,'txHintV11'))||null;
      const prefix='[data-tx-quick-v11="';
      const key=q.startsWith(prefix)&&q.endsWith('"]')?q.slice(prefix.length,-2):null;
      return key?wraps[key]||null:null;
    }
  };
  const els={editTxForm:form,eType:type,eGroup:group,eCat:category};
  type.onchange=()=>{
    const allowed=groups(type.value);
    group.options=allowed.map(value=>({value}));
    if(!allowed.includes(group.value))group.value=allowed[0];
    group.onchange();
  };
  group.onchange=()=>{
    const allowed=categoryOptions(type.value,group.value);
    category.options=allowed.map(value=>({value}));
    if(!allowed.includes(category.value))category.value=allowed[0]||'';
  };
  const doc={
    readyState:'loading',addEventListener(){},getElementById:id=>els[id]||null,
    querySelectorAll(){return []},createElement:tag=>new Node(tag)
  };
  const ctx={window:{addEventListener(){}},document:doc,
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
    currentSessionUser:{id:owner},mmhVaultTransactionCategoryListV451:categoryOptions,console,setTimeout(){},
  };
  vm.runInNewContext(source,ctx);
  const api=ctx.window.MMHV11TxFieldPrefs;
  api.attachEdit();
  assert.equal(type.value,'Expense');
  assert.equal(group.value,'Expense');
  assert.equal(category.value,'Dining');
  const combinedCategory=wraps.category.querySelector('select');
  assert.equal(wraps.category.hidden,false);
  assert.equal(labels.group.style.display,'none');
  const gift=combinedCategory.options.find(x=>x.textContent==='Gifts');
  assert.ok(gift,'Personal category appears in combined Type + Category chooser');
  combinedCategory.value=gift.value;
  combinedCategory.onchange();
  assert.equal(type.value,'Expense');
  assert.equal(group.value,'Personal','the category must map to the correct saved group');
  assert.equal(category.value,'Gifts','the original category selector remains the saved value');
  assert.equal(api.validate(form),true);
  store.set('mmhvault_tx_field_layout_v11_'+owner,'transaction-category');
  api.refresh();
  const combinedGroup=wraps.group.querySelector('select');
  const loan=combinedGroup.options.find(x=>x.textContent==='Loan Income');
  assert.ok(loan);
  combinedGroup.value=loan.value;
  combinedGroup.onchange();
  assert.equal(type.value,'Income','Loan Income must never save as Expense');
  assert.equal(group.value,'Loans');
  assert.equal(category.value,'Debt');
  assert.equal(api.validate(form),true);
  assert.equal(listeners.submit instanceof Function,true);
});
