import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync(new URL('../app.html',import.meta.url),'utf8');
const source=fs.readFileSync(new URL('../js/mmhvault-transaction-field-layout-v11.js',import.meta.url),'utf8');
const uid='11111111-1111-4111-8111-111111111111';
const fresh=()=>({version:1,type:[],transaction:[],category:[]});
const config=txFieldsV12=>({
  accounts:[],categories:{
    Income:['Salary','Other Income'],Expense:['Dining','Other'],Personal:['Gifts'],
    LoanIncome:['Debt'],LoanExpense:['Loan Out'],Transfer:['Transfer']
  },txFieldsV12
});
function harness(txFieldsV12=fresh(),user=uid){
  const nodes={},events=new Map(),writes=[];
  const context={
    MMHVAULT_CONFIG:config(txFieldsV12),
    currentSessionUser:user?{id:user}:null,
    MMHVAULT_DEFAULT_CATEGORIES:{Income:['Salary'],Expense:['Dining']},
    MMHVAULT_CONFIG_OWNER:user,
    mmhVaultRequireConfigOwner:o=>o===user,
    mmhVaultPersistConfig:()=>writes.push(JSON.stringify(context.MMHVAULT_CONFIG.txFieldsV12)),
    document:{
      readyState:'loading',
      documentElement:{lang:'en'},
      addEventListener:(event,cb)=>events.set(event,cb),
      getElementById:key=>nodes[key]||null
    },
    window:{addEventListener(){},dispatchEvent(){}},
    localStorage:{getItem:()=>null},setTimeout:()=>0,clearTimeout(){},
    Event:class{constructor(type){this.type=type}},Number,Math,Set,Array,Object,String,console
  };
  vm.runInNewContext(source,context);
  return {api:context.window.MMHV11TxFieldPrefs,config:context.MMHVAULT_CONFIG,context,nodes,writes,events};
}

// Synthetic native selects: exercise actual two-field render and save guard
// without a browser or database, while preserving the original DOM arrangement.
function nativeForm(h){
  const labels={};
  class Select {
    constructor(name,values) {
      this.name=name;this.dataset={};this.style={};
      this.label={style:{},dataset:{}};
      labels[name]=this.label;
      this.replaceChildren(...values.map(value=>({value,textContent:value,dataset:{}})));
    }
    replaceChildren(...options){this.options=options;this._index=options.length?0:-1;}
    get selectedIndex(){return this._index}
    set selectedIndex(v){this._index=v}
    get selectedOptions(){return this._index>=0?[this.options[this._index]]:[]}
    get value(){return this._index>=0?this.options[this._index].value:''}
    set value(v){this._index=this.options.findIndex(x=>x.value===v)}
    closest(){return this.label}
  }
  const {nodes,context}=h;
  const t=new Select('type',['Income','Expense','Transfer']);
  const g=new Select('transaction',['Income','Expense','Personal','Loans','Transfer','Data Adjustment']);
  const c=new Select('category',['Salary','Other Income','Dining','Other','Gifts','Transfer']);
  const form={
    id:'txForm',querySelector:sel=>sel==='.mmh-form-section-v1'?{after:node=>{nodes[node.id]=node}}:sel==='.formgrid'?{prepend:()=>{}}:null
  };
  nodes.txForm=form;nodes.txType=t;nodes.txGroup=g;nodes.txCategory=c;
  context.document.createElement=tag=>({
    tagName:tag.toUpperCase(),dataset:{},style:{},hidden:false,
    value:'',textContent:'',replaceChildren(){},setAttribute(){}
  });
  context.syncTransactionGroup=()=>{
    const groups=t.value==='Income'?['Income','Loans','Data Adjustment']:
      t.value==='Expense'?['Expense','Personal','Loans','Data Adjustment']:['Transfer'];
    const old=g.value;g.replaceChildren(...groups.map(x=>({value:x,textContent:x,dataset:{}})));
    if(groups.includes(old))g.value=old;
  };
  context.mmhVaultTransactionCategoryListV451=(type,group)=>{
    const key=group==='Loans'?(type==='Income'?'LoanIncome':'LoanExpense'):group;
    return group==='Data Adjustment'?['Data Adjustment']:
      group==='Transfer'?['Transfer']:context.MMHVAULT_CONFIG.categories[key]||[];
  };
  context.updateCategories=()=>{
    const group=g.value;
    const key=group==='Loans'?(t.value==='Income'?'LoanIncome':'LoanExpense'):group;
    const names=group==='Data Adjustment'?['Data Adjustment']:
      group==='Transfer'?['Transfer']:context.MMHVAULT_CONFIG.categories[key]||[];
    const old=c.value;c.replaceChildren(...names.map(x=>({value:x,textContent:x,dataset:{}})));
    if(names.includes(old))c.value=old;
  };
  return {t,g,c,labels,form};
}

test('managed Type + Transaction displays only original two native fields and safe neutral category',()=>{
  const h=harness({version:1,type:['Income','Expense'],transaction:['Income|Income','Expense|Expense'],category:[]});
  const dom=nativeForm(h);
  h.api.refresh();
  assert.equal(dom.labels.type.dataset.mmhV12Hidden,'0');
  assert.equal(dom.labels.transaction.dataset.mmhV12Hidden,'0');
  assert.equal(dom.labels.category.dataset.mmhV12Hidden,'1');
  assert.equal(dom.t.value,'Income');
  assert.equal(dom.g.value,'Income');
  assert.equal(dom.c.value,'Other Income');
  assert.equal(h.api.validate(),true);
});

test('managed Transaction + Category uses canonical Type internally with only two native visible labels',()=>{
  const h=harness({version:1,type:[],transaction:['Income|Income','Expense|Expense'],category:['Income|Salary','Expense|Dining']});
  const dom=nativeForm(h);
  h.api.refresh();
  assert.equal(dom.labels.type.dataset.mmhV12Hidden,'1');
  assert.equal(dom.labels.transaction.dataset.mmhV12Hidden,'0');
  assert.equal(dom.labels.category.dataset.mmhV12Hidden,'0');
  assert.equal(dom.t.value,'Income');
  assert.equal(dom.c.value,'Salary');
  assert.equal(h.api.validate(),true);
  dom.t.value='Expense';dom.g.value='Expense';
  h.api.refresh();
  assert.equal(dom.t.value,'Expense');
  assert.equal(dom.c.value,'Dining');
  assert.equal(h.api.validate(),true);
});

test('managed Type + Category uses existing Category label and infers hidden group',()=>{
  const h=harness({version:1,type:['Expense'],transaction:[],category:['Expense|Dining','Personal|Gifts']});
  const dom=nativeForm(h);
  dom.t.value='Expense';h.api.refresh();
  assert.equal(dom.labels.type.dataset.mmhV12Hidden,'0');
  assert.equal(dom.labels.transaction.dataset.mmhV12Hidden,'1');
  assert.equal(dom.labels.category.dataset.mmhV12Hidden,'0');
  assert.deepEqual(Array.from(dom.c.options.map(x=>x.value)),['Dining','Gifts']);
  assert.equal(dom.g.value,'Expense');
  assert.equal(h.api.validate(),true);
});

test('fresh setup without two fields cannot save an accidental default transaction',()=>{
  const h=harness(fresh()),dom=nativeForm(h);
  h.api.refresh();
  assert.equal(dom.labels.type.dataset.mmhV12Hidden,'1');
  assert.equal(dom.labels.transaction.dataset.mmhV12Hidden,'1');
  assert.equal(dom.labels.category.dataset.mmhV12Hidden,'1');
  assert.equal(h.api.validate(),false);
});

test('two-field Loan Income without explicit Category is blocked instead of guessed',()=>{
  const h=harness({version:1,type:['Income'],transaction:['Income|Loans'],category:[]});
  const dom=nativeForm(h);
  h.api.refresh();
  assert.equal(dom.t.value,'Income');
  assert.equal(dom.g.value,'Loans');
  assert.equal(h.api.validate(),false);
});

test('new owner starts with absolutely no selected Type, Transaction or Category',()=>{
  const h=harness();
  assert.equal(h.api.isManaged(),true);
  assert.equal(h.api.getMode(),'setup');
  assert.equal(h.api.layoutInfo().type.length,0);
  assert.equal(h.api.layoutInfo().transaction.length,0);
  assert.equal(h.api.layoutInfo().category.length,0);
  assert.equal(h.api.setMode('type-category'),false,'the old manual layout switch is removed');
});

test('existing owner without the new marker retains original three fields',()=>{
  const h=harness(null);
  assert.equal(h.api.isManaged(),false);
  assert.equal(h.api.getMode(),'legacy');
  assert.equal(h.api.layoutInfo().mode,'legacy');
  assert.equal(h.api.setMode('type-transaction'),false);
  assert.ok(app.includes('<label>Type<select id="txType">'));
  assert.ok(app.includes('<label>Transaction<select id="txGroup">'));
  assert.ok(app.includes('<label>Category<select id="txCategory">'));
});

test('Manage Type + Transaction automatically selects only those two fields',()=>{
  const h=harness({version:1,type:['Income','Expense'],transaction:['Income|Income','Expense|Expense'],category:[]});
  assert.equal(h.api.getMode(),'type-transaction');
  assert.equal(h.api.layoutInfo().transaction.length,2);
  assert.equal(h.api.layoutInfo().category.length,0);
  assert.match(source,/dataset\.mmhV12Hidden/);
  assert.match(source,/enabled\[name\]\?'0':'1'/);
  assert.match(source,/neutral\(type,group\)/);
});

test('Manage Transaction + Category automatically hides Type, without extra controls',()=>{
  const h=harness({version:1,type:[],transaction:['Income|Income','Expense|Expense'],category:['Income|Salary','Expense|Dining']});
  assert.equal(h.api.getMode(),'transaction-category');
  assert.equal(h.api.layoutInfo().category.length,2);
  assert.equal(h.api.layoutInfo().type.length,0);
  assert.doesNotMatch(source,/data-tx-pref-select-v11|data-tx-quick-v11|makePref\(/);
  assert.doesNotMatch(source,/All three fields|Form fields/);
});

test('Manage Type + Category is inferred from actual configured Category groups',()=>{
  const h=harness({version:1,type:['Expense'],transaction:[],category:['Expense|Dining','Personal|Gifts']});
  assert.equal(h.api.getMode(),'type-category');
  assert.equal(h.api.layoutInfo().category.length,2);
  assert.equal(h.api.hasCategory('Expense','Dining'),true);
  assert.equal(h.api.hasCategory('Income','Salary'),false);
  assert.match(source,/groupOfCategory/);
});

test('managed Categories are empty until added even if legacy ledger defaults exist',()=>{
  const h=harness();
  assert.equal(h.api.hasCategory('Expense','Dining'),false);
  assert.equal(h.api.markCategory('Expense','Dining'),true);
  assert.equal(h.api.hasCategory('Expense','Dining'),true);
  assert.equal(h.api.markCategory('Expense','Dining'),true);
  assert.equal(h.api.layoutInfo().category.length,1,'duplicate category is not added twice');
  assert.equal(h.api.markCategory('Expense','Nonexistent'),false);
});

test('old transaction ledger schema and history are not modified by view configuration',()=>{
  assert.match(app,/async function addTransaction\(e\)/);
  assert.match(app,/const row=\{user_id:u\.id,tx_date:txDate\.value,type,category:/);
  assert.match(app,/function editTx\(id\)/);
  assert.match(app,/function mmhVaultFinanceIdentityChangeSafeV11\(/);
  assert.doesNotMatch(source,/\bdb\.from\(|\btransactions\.push\(|\btransactions\.splice\(/);
  assert.match(source,/attachEdit:\(\)=>\{\}/,'edit dialog retains the full original fields');
});

test('cloud and local config sanitizer preserve explicit managed marker only',()=>{
  assert.match(app,/function mmhVaultNormalizeTxFieldsV12\(value\)/);
  assert.match(app,/txFieldsV12:mmhVaultNormalizeTxFieldsV12\(x\.txFieldsV12\)/);
  assert.match(app,/txFieldsV12:\{version:1,type:\[\],transaction:\[\],category:\[\]\}/);
  assert.match(app,/if\(!value\|\|value\.version!==1\)return null/);
  assert.match(app,/window\.MMHV11TxFieldPrefs\?\.markCategory\?\.\(group,name\)/);
  assert.match(app,/window\.MMHV11TxFieldPrefs\?\.refreshManage\?\.\(\)/);
});

test('original Add Transaction layout is not restructured or duplicated',()=>{
  assert.match(app,/<div class="tx-tab-panel-v371" id="txAddPanel"/);
  assert.match(app,/<div class="mmh-form-section-v1 full"><span data-en="Accounts & amounts"/);
  assert.match(app,/<div class="mmh-form-section-v1 full"><span data-en="Note & attachment"/);
  assert.match(app,/js\/mmhvault-transaction-field-layout-v11\.js\?v=2\.0\.0/);
  assert.doesNotMatch(source,/txPrefHolderV11|mmh-tx-pref-v11|quick\(form/);
});

test('owner data is isolated by authenticated session and category changes are config-only',()=>{
  const h=harness(fresh(),null);
  assert.equal(h.api.isManaged(),false);
  assert.equal(h.api.markCategory('Expense','Dining'),false);
  assert.equal(h.api.getMode(),'legacy');
  assert.equal(h.writes.length,0);
});

test('unsafe hidden categories never get a guessed loan or personal classification',()=>{
  assert.match(source,/function neutral\(type,group\)/);
  assert.match(source,/if\(type==='Income'&&group==='Income'\)return 'Other Income'/);
  assert.match(source,/if\(type==='Expense'&&group==='Expense'\)return 'Other'/);
  assert.match(source,/return null;\s*\}/);
  assert.match(source,/if\(!defaultCat\|\|!\(list\|\|\[\]\)\.includes\(defaultCat\)\)/);
  assert.match(source,/event\.stopImmediatePropagation\(\)/);
});
