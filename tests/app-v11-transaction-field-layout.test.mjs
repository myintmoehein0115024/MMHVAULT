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
  const submit={disabled:false,dataset:{}};
  const form={
    id:'txForm',querySelector:sel=>sel==='.mmh-form-section-v1'?{after:node=>{nodes[node.id]=node}}:
      sel==='.formgrid'?{prepend:()=>{}}:
      sel==='.actions button:not([type="button"])'?submit:null
  };
  nodes.txForm=form;nodes.txType=t;nodes.txGroup=g;nodes.txCategory=c;
  context.document.createElement=tag=>({
    tagName:tag.toUpperCase(),dataset:{},style:{},hidden:false,children:[],
    value:'',textContent:'',
    append(...items){this.children.push(...items);},
    replaceChildren(...items){this.children=[...items];},
    addEventListener(event,callback){(this.listeners||(this.listeners={}))[event]=callback;},
    setAttribute(name,value){(this.attributes||(this.attributes={}))[name]=value;}
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
  return {t,g,c,labels,form,submit};
}

test('zero or one configured field hides all three native selects, not a fake Salary dropdown',()=>{
  const h=harness(fresh()),dom=nativeForm(h);
  h.nodes.txSmartV141={dataset:{}};
  h.api.refresh();
  for(const label of Object.values(dom.labels)){
    assert.equal(label.hidden,true);
    assert.equal(label.dataset.mmhV12Hidden,'1');
  }
  assert.equal(h.nodes.txSmartV141.dataset.mmhV12Setup,'1');
  const hint=h.nodes.mmhV12SetupNote;
  assert.ok(hint,'a single setup notice is present');
  assert.match(hint.className,/full/,'notice fills the form grid instead of occupying a field slot');
  assert.match(hint.children[0].textContent,/at least two fields/i);
  assert.ok(hint.children[1].listeners.click,'setup notice links to Manage');
  const opened=[];h.context.window.showTxTab=tab=>opened.push(tab);
  hint.children[1].listeners.click();
  assert.deepEqual(opened,['manage'],'setup CTA must use the installed Manage route, not a stale showTxTab binding');
  assert.equal(h.api.validate(),false);
  h.config.txFieldsV12.category.push('Income|Salary');
  h.api.refresh();
  for(const label of Object.values(dom.labels))assert.equal(label.hidden,true,
    'a single configured Category must NOT show Salary as a usable form field');
  assert.equal(h.api.validate(),false);
});

test('two configured fields restore only the requested labels and hide setup instructions',()=>{
  const h=harness({version:1,type:['Income'],transaction:['Income|Income'],category:[]}),dom=nativeForm(h);
  h.nodes.txSmartV141={dataset:{}};
  h.api.refresh();
  assert.equal(dom.labels.type.hidden,false);
  assert.equal(dom.labels.transaction.hidden,false);
  assert.equal(dom.labels.category.hidden,true);
  assert.equal(h.nodes.txSmartV141.dataset.mmhV12Setup,'0');
  assert.equal(h.nodes.txSmartV141.dataset.mmhV12Managed,'1',
    'managed Type and Transaction are the only visible selectors, never duplicate top Kind choices');
  assert.equal(h.nodes.mmhV12SetupNote.hidden,true);
  assert.equal(h.api.validate(),true);
});

test('legacy owner keeps the original Transaction Kind navigation',()=>{
  const h=harness(null),dom=nativeForm(h);
  h.nodes.txSmartV141={dataset:{}};
  h.api.refresh();
  assert.equal(h.nodes.txSmartV141.dataset.mmhV12Managed,'0');
  assert.equal(h.nodes.txSmartV141.dataset.mmhV12Setup,'0');
  assert.equal(dom.labels.type.hidden,false);
  assert.equal(dom.labels.transaction.hidden,false);
  assert.equal(dom.labels.category.hidden,false);
});

test('real Manage render moves exactly one Category form, and restores it for legacy owners',()=>{
  const h=harness(fresh());
  class Element {
    constructor(tag='div',cls='',id=''){
      this.tagName=tag.toUpperCase();this.className=cls;this.id=id;
      this.children=[];this.dataset={};this.style={};this.hidden=false;
      this.classList={
        add:x=>{if(!this.className.split(/\s+/).includes(x))this.className=(this.className+' '+x).trim();},
        remove:x=>{this.className=this.className.split(/\s+/).filter(y=>y!==x).join(' ');}
      };
    }
    get options(){return this.children.filter(x=>x.tagName==='OPTION');}
    append(...items){
      for(const child of items){
        if(child.parentElement)child.parentElement.children=child.parentElement.children.filter(x=>x!==child);
        child.parentElement=this;this.children.push(child);
      }
    }
    replaceChildren(...items){for(const x of this.children)x.parentElement=null;this.children=[];this.append(...items);}
    prepend(child){if(child.parentElement)child.parentElement.children=child.parentElement.children.filter(x=>x!==child);child.parentElement=this;this.children.unshift(child);}
    insertBefore(child,before){
      if(child.parentElement)child.parentElement.children=child.parentElement.children.filter(x=>x!==child);
      child.parentElement=this;const i=this.children.indexOf(before);this.children.splice(i<0?this.children.length:i,0,child);
    }
    after(child){this.parentElement?.insertBefore(child,this.parentElement.children[this.parentElement.children.indexOf(this)+1]);}
    addEventListener(name,fn){(this.listeners||(this.listeners={}))[name]=fn;}
    setAttribute(name,value){(this.attrs||(this.attrs={}))[name]=value;}
    querySelector(selector){
      const match=x=>selector==='section'?x.tagName==='SECTION':
        selector==='section.mmh-manager-card-v445'?x.tagName==='SECTION'&&x.className.includes('mmh-manager-card-v445'):
        selector.startsWith('.')?x.className.split(/\s+/).includes(selector.slice(1)):false;
      const descendants=(node)=>{for(const x of node.children){if(match(x))return x;const n=descendants(x);if(n)return n;}return null;};
      return descendants(this);
    }
  }
  const host=new Element('div','','mmhManagerCategoriesPanelV445');
  const legacy=new Element('section','mmh-manager-card-v445');
  const heading=new Element('div','mmh-manager-head-v445');
  const categoryForm=new Element('div','mmh-manager-form-v445');
  legacy.append(heading,categoryForm);host.append(legacy);
  const findById=(node,key)=>{
    if(node.id===key)return node;
    for(const child of node.children){const found=findById(child,key);if(found)return found;}
    return null;
  };
  h.context.document.createElement=tag=>new Element(tag);
  h.context.document.getElementById=key=>findById(host,key);
  h.api.refreshManage();
  const panel=findById(host,'mmhV12Manage');
  assert.ok(panel,'managed owner has one Manage section');
  assert.equal(legacy.hidden,true,'new owner with zero saved/archived Categories should not see empty search card');
  const rows=panel.querySelector('.mmh-v12-cols').children;
  assert.equal(rows.length,3,'three compact management rows');
  const typeQuick=rows[0].querySelector('.mmh-v13-available').children;
  assert.equal(typeQuick.length,4,'one caption and three optional built-in Types');
  typeQuick.find(x=>x.textContent==='+ Income').listeners.click();
  assert.deepEqual(Array.from(h.config.txFieldsV12.type),['Income']);
  const afterType=panel.querySelector('.mmh-v12-cols').children;
  const incomeEntry=afterType[0].querySelector('.mmh-v13-active').children[0];
  assert.equal(incomeEntry.children[0].textContent,'Income','added entry shows a name and action buttons');
  assert.equal(incomeEntry.children[1].textContent,'Edit');
  assert.equal(incomeEntry.children[2].textContent,'Remove');
  const txQuick=afterType[1].querySelector('.mmh-v13-available').children;
  assert.ok(txQuick.every(x=>!x.textContent?.includes('Expense')),
    'only compatible new transaction kinds are offered');
  txQuick.find(x=>x.textContent==='+ Income').listeners.click();
  assert.deepEqual(Array.from(h.config.txFieldsV12.transaction),['Income|Income']);
  const preview=panel.querySelector('.mmh-v12-preview-fields');
  assert.deepEqual(preview.children.map(x=>x.textContent),['Type','Transaction']);
  const afterReady=panel.querySelector('.mmh-v12-cols').children;
  afterReady[0].querySelector('.mmh-v13-active').children[0].children[2].listeners.click();
  assert.equal(h.config.txFieldsV12.type.length,0,'Remove changes owner config only');
  assert.equal(h.config.txFieldsV12.transaction.length,1,'removing Type keeps Transaction');
  assert.equal(h.writes.length,3,'all three changes persisted through owner-scoped settings');
  assert.equal(categoryForm.parentElement?.className,'mmh-v12-col mmh-v12-col-category');
  h.api.refreshManage();
  assert.equal(categoryForm.parentElement?.className,'mmh-v12-col mmh-v12-col-category',
    're-renders reuse the exact same Category form');
  const findAll=(node,needle)=>[...(node===needle?[node]:[]),...node.children.flatMap(x=>findAll(x,needle))];
  assert.equal(findAll(host,categoryForm).length,1,'must never duplicate the native Category form');
  h.config.txFieldsV12.category.push('Income|Salary');
  h.api.refreshManage();
  assert.equal(legacy.hidden,true,'managed owner does not see duplicate native Category list after selecting one');
  h.config.txFieldsV12=null;
  h.api.refreshManage();
  assert.equal(panel.hidden,true);
  assert.equal(legacy.hidden,false,'existing owners retain the full original category panel');
  assert.equal(categoryForm.parentElement,legacy,'legacy owner gets native Category form in its original section');
});

test('Manage displays existing native Category editor beside Type and Transaction rather than separate duplicate controls',()=>{
  assert.match(source,/mmh-v13-entry/);
  assert.match(source,/mmh-v12-preview-fields/);
  assert.doesNotMatch(source,/row\.append\(select\)/);
  assert.match(source,/categoryCard=make\('div','mmh-v12-col mmh-v12-col-category'\)/);
  assert.match(source,/if\(categoryForm\)categoryCard\.append\(categoryForm\)/);
  assert.match(source,/if\(!isManaged\(\)\)\{[\s\S]*?header\.after\(categoryForm\)/);
  assert.match(source,/mmh-v13-active/);
  assert.match(source,/function fieldDialog\(field,entry=null\)/);
  assert.doesNotMatch(source,/data-tx-pref-select-v11|mmh-tx-quick-v11|makePref\(/);
});

test('fresh owner can add Transaction first and Category second without losing hidden Type',()=>{
  const h=harness(fresh()),dom=nativeForm(h);
  h.api.refresh();
  assert.equal(dom.t.options.length,3,'required canonical Type must survive empty setup');
  assert.equal(h.api.validate(),false);
  h.config.txFieldsV12.transaction.push('Income|Income');
  h.api.refresh();
  assert.equal(h.api.getMode(),'setup');
  assert.equal(dom.t.options.length,3);
  h.config.txFieldsV12.category.push('Income|Salary');
  h.api.refresh();
  assert.equal(h.api.getMode(),'transaction-category');
  assert.equal(dom.labels.type.dataset.mmhV12Hidden,'1');
  assert.equal(dom.t.value,'Income');
  assert.equal(dom.g.value,'Income');
  assert.equal(dom.c.value,'Salary');
  assert.equal(h.api.validate(),true);
});

test('fresh owner can add Type then Transaction then Category without creating duplicate input rows',()=>{
  const h=harness(fresh()),dom=nativeForm(h);
  h.api.refresh();
  assert.equal(dom.t.options.length,3);
  h.config.txFieldsV12.type.push('Expense');
  h.api.refresh();
  assert.equal(h.api.validate(),false);
  h.config.txFieldsV12.transaction.push('Expense|Expense');
  h.api.refresh();
  assert.equal(h.api.getMode(),'type-transaction');
  assert.equal(dom.t.value,'Expense');
  assert.equal(dom.g.value,'Expense');
  assert.equal(dom.c.value,'Other');
  assert.equal(h.api.validate(),true);
  h.config.txFieldsV12.category.push('Expense|Dining');
  h.api.refresh();
  assert.equal(h.api.getMode(),'type-transaction-category');
  assert.equal(dom.labels.category.dataset.mmhV12Hidden,'0');
  assert.equal(dom.c.value,'Dining');
  assert.equal(h.api.validate(),true);
  assert.equal(dom.submit.disabled,false,'compatible Expense combination can be saved');
});

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
  assert.equal(dom.g.value,'','incompatible loan group is not offered as a saveable option');
  assert.equal(h.api.readiness().ready,false);
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
  assert.match(source,/el\.dataset\.mmhV12Hidden=visible\?'0':'1'/);
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
  assert.match(app,/js\/mmhvault-v11-manage-hierarchy-live\.mjs\?v=0\.7\.0/);
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


test('custom Type and Transaction labels add, edit and remove without modifying ledger codes',()=>{
  const h=harness({version:1,type:['Income'],transaction:['Income|Income'],category:[]});
  const type={key:'base:Income',canonical:'Income',label:'Income',custom:false};
  assert.equal(h.api.saveName('type',type,'Income','Main Income'),true);
  assert.equal(h.api.fieldItems('type')[0].label,'Main Income');
  assert.equal(h.api.saveName('type',null,'Income','Weekend Job'),true);
  const alias=h.api.fieldItems('type').find(x=>x.custom);
  assert.ok(alias,'additional custom label is saved under canonical Income');
  assert.equal(alias.canonical,'Income');
  assert.equal(h.api.saveName('transaction',null,'Income|Income','Paycheck'),true);
  const tx=h.api.fieldItems('transaction').find(x=>x.custom);
  assert.ok(tx);
  assert.equal(h.api.saveName('transaction',tx,'Income|Income','Project Pay'),true);
  assert.equal(h.api.fieldItems('transaction').find(x=>x.custom).label,'Project Pay');
  assert.equal(h.api.removeName('type',type),false,'cannot remove base while extra aliases depend on it');
  assert.equal(h.api.removeName('type',alias),true);
  assert.equal(h.api.removeName('type',type),true);
  assert.deepEqual(Array.from(h.config.txFieldsV12.type),[]);
  assert.deepEqual(Array.from(h.config.txFieldsV12.transaction),['Income|Income']);
  assert.equal(h.config.txFieldsV12.displayV13.extraTypes.length,0);
  assert.ok(h.writes.length>=6);
});

test('owner isolation, duplicate rejection and unsafe financial type cannot create a custom code',()=>{
  const h=harness({version:1,type:['Income'],transaction:[],category:[]});
  assert.equal(h.api.saveName('type',null,'Income','Income'),false,'existing visible label is not duplicated');
  assert.equal(h.api.saveName('type',null,'Mystery','Mystery Type'),false);
  assert.equal(h.api.saveName('type',null,'Income','New Name'),true);
  assert.equal(h.config.txFieldsV12.displayV13.extraTypes.length,1);
  const anonymous=harness(fresh(),null);
  assert.equal(anonymous.api.saveName('type',null,'Income','New Label'),false);
  assert.equal(anonymous.writes.length,0);
});

test('managed Category rename retains current selection, while app uses existing secure edit flow',()=>{
  const h=harness({version:1,type:[],transaction:[],category:['Expense|Dining']});
  h.api.onCategoryRenamed('Expense','Dining','Cafe');
  assert.deepEqual(Array.from(h.config.txFieldsV12.category),['Expense|Cafe']);
  assert.match(app,/onCategoryRenamed\?\.\(currentGroup,currentName,newName\)/);
  assert.match(app,/displayV13:\{/);
  assert.match(app,/typeLabels:names\(v13\.typeLabels,typeCodes\)/);
  assert.match(app,/extraTransactions:aliases\(v13\.extraTransactions,transactionCodes\)/);
});

test('managed custom names display in original Add Transaction selects with canonical values',()=>{
  const h=harness({
    version:1,type:['Income'],transaction:['Income|Income'],category:[],
    displayV13:{typeLabels:{Income:'Main income'},transactionLabels:{'Income|Income':'Paid work'},
      extraTypes:[{id:'user_abcd1234',canonical:'Income',label:'Bonus income'}],
      extraTransactions:[{id:'user_efgh5678',canonical:'Income|Income',label:'Side job'}]}
  });
  const dom=nativeForm(h);h.api.refresh();
  assert.ok(dom.t.options.some(x=>x.textContent==='Main income'));
  assert.ok(dom.t.options.some(x=>x.textContent==='Bonus income'));
  assert.ok(dom.g.options.some(x=>x.textContent==='Paid work'));
  assert.ok(dom.g.options.some(x=>x.textContent==='Side job'));
  assert.equal(dom.t.value,'Income');assert.equal(dom.g.value,'Income');
  assert.equal(h.api.validate(),true,'custom display alias does not change finance validation');
});


test('ready counter never lies: two selected kinds with incompatible Income Transaction and Expense Category are not ready',()=>{
  const h=harness({version:1,type:[],transaction:['Income|Income'],category:['Expense|Dining']});
  const dom=nativeForm(h);
  h.api.refresh();
  const status=h.api.readiness();
  assert.equal(status.count,2);
  assert.equal(status.ready,false);
  assert.match(status.reason,/no matching financial combination/i);
  assert.equal(h.api.validate(),false);
  for(const label of Object.values(dom.labels))assert.equal(label.hidden,true);
  assert.equal(dom.submit.disabled,true,'incompatible configured fields must disable Add Transaction');
  assert.equal(dom.g.options.length,0,'stale Transaction choices are removed when selection is invalid');
  assert.equal(dom.c.options.length,0,'default Income Salary is not incorrectly shown');
  assert.match(h.nodes.mmhV12SetupNote.children[0].textContent,/no matching/i);
});

test('Transaction + Category with an Income and Expense choice auto-selects only compatible Expense Category',()=>{
  const h=harness({
    version:1,type:[],
    transaction:['Income|Income','Expense|Expense'],
    category:['Expense|Dining']
  });
  const dom=nativeForm(h);h.api.refresh();
  assert.equal(h.api.readiness().ready,true);
  assert.equal(dom.labels.type.hidden,true);
  assert.equal(dom.labels.transaction.hidden,false);
  assert.equal(dom.labels.category.hidden,false);
  assert.deepEqual(Array.from(dom.g.options.map(x=>x.textContent)),['Expense'],
    'Income is excluded because only an Expense Category is selected');
  assert.deepEqual(Array.from(dom.c.options.map(x=>x.value)),['Dining'],
    'not all historical/default categories are offered');
  assert.equal(dom.t.value,'Expense');
  assert.equal(dom.g.value,'Expense');
  assert.equal(dom.c.value,'Dining');
  assert.equal(h.api.validate(),true);
});

test('two fields with Type and Category but incompatible types remain blocked without guessing ledger groups',()=>{
  const h=harness({version:1,type:['Income'],transaction:[],category:['Expense|Dining']});
  const dom=nativeForm(h);h.api.refresh();
  assert.equal(h.api.readiness().ready,false);
  assert.equal(h.api.validate(),false);
  assert.equal(dom.labels.type.hidden,true);
  assert.equal(dom.labels.category.hidden,true);
  h.config.txFieldsV12.type.push('Expense');
  h.api.refresh();
  assert.equal(h.api.readiness().ready,true);
  dom.t.value='Expense';h.api.refresh();
  assert.equal(dom.t.value,'Expense');
  assert.equal(dom.c.value,'Dining');
  assert.equal(h.api.validate(),true);
});

test('legacy accounts retain all original native fields and editable submission',()=>{
  const h=harness(null),dom=nativeForm(h);h.api.refresh();
  assert.equal(dom.labels.type.hidden,false);
  assert.equal(dom.labels.transaction.hidden,false);
  assert.equal(dom.labels.category.hidden,false);
  assert.equal(h.api.validate(),true);
});


test('when globally Ready but only Expense has a Category, Add Transaction hides unready Income Type',()=>{
  const h=harness({version:1,
    type:['Income','Expense'],
    transaction:['Income|Income','Expense|Expense'],
    category:['Expense|Dining']});
  const dom=nativeForm(h);h.api.refresh();
  assert.equal(h.api.readiness().ready,true,'at least one valid financial combination exists');
  assert.deepEqual(Array.from(dom.t.options.map(x=>x.value)),['Expense'],
    'Income is configured but has no matching Category and must not appear as saveable');
  assert.deepEqual(Array.from(dom.g.options.map(x=>x.value)),['Expense']);
  assert.deepEqual(Array.from(dom.c.options.map(x=>x.value)),['Dining']);
  assert.equal(dom.t.value,'Expense');
  assert.equal(h.api.validate(),true);
  assert.equal(dom.submit.disabled,false);
});


test('archived Category selection is ignored in new managed form while canonical Type + Transaction works',()=>{
  const h=harness({version:1,
    type:['Income'],transaction:['Income|Income'],category:['Income|Salary']});
  const dom=nativeForm(h);
  h.config.categories.Income=h.config.categories.Income.filter(x=>x!=='Salary');
  h.api.refresh();
  assert.equal(h.api.getMode(),'type-transaction');
  assert.equal(h.api.readiness().count,2);
  assert.equal(h.api.readiness().ready,true);
  assert.equal(dom.c.value,'Other Income');
  assert.equal(dom.c.value,'Other Income');
  assert.equal(h.api.validate(),true);
});


test('legacy dropdown rewrite cannot reintroduce unconfigured Transfer into a managed Type',()=>{
  const h=harness({version:1,type:['Income','Expense'],transaction:['Income|Income','Expense|Expense'],category:[]});
  const dom=nativeForm(h);
  h.api.refresh();
  assert.deepEqual(dom.t.options.map(x=>x.value),['Income','Expense']);
  assert.equal(h.api.validate(),true);
  // Legacy language/cascade code can rebuild the original three-item select
  // after V11 has already rendered the managed two-item version.
  dom.t.replaceChildren(...['Income','Expense','Transfer'].map(value=>({value,textContent:value,dataset:{}})));
  dom.g.replaceChildren(...['Income','Loans','Data Adjustment'].map(value=>({value,textContent:value,dataset:{}})));
  h.api.reconcileNative();
  assert.deepEqual(dom.t.options.map(x=>x.value),['Income','Expense']);
  assert.ok(dom.t.options.every(x=>x.dataset.mmhChoiceId));
  assert.deepEqual(dom.g.options.map(x=>x.value),['Income']);
  assert.equal(h.api.validate(),true);
});

test('legacy option rebuild cannot break managed Transaction + Category pairing or save',()=>{
  const h=harness({version:1,type:[],transaction:['Income|Income'],category:['Income|Salary']});
  const dom=nativeForm(h);
  h.api.refresh();
  assert.equal(h.api.validate(),true);
  assert.equal(dom.labels.type.hidden,true);
  dom.g.replaceChildren(...['Expense','Loans','Transfer'].map(value=>({value,textContent:value,dataset:{}})));
  dom.c.replaceChildren(...['Other','Dining'].map(value=>({value,textContent:value,dataset:{}})));
  h.api.reconcileNative();
  assert.equal(dom.g.value,'Income');
  assert.equal(dom.g.options.length,1);
  assert.equal(dom.g.options[0].dataset.mmhCanonicalType,'Income');
  assert.equal(dom.c.value,'Salary');
  assert.equal(dom.c.options[0].dataset.mmhCanonicalGroup,'Income');
  assert.equal(h.api.validate(),true);
  assert.equal(dom.submit.disabled,false);
});

test('legacy rewrite in Type + Category restores category options without adding Transaction',()=>{
  const h=harness({version:1,type:['Expense'],transaction:[],category:['Expense|Dining']});
  const dom=nativeForm(h);
  h.api.refresh();
  dom.c.replaceChildren(...['Salary','Other','Dining'].map(value=>({value,textContent:value,dataset:{}})));
  h.api.reconcileNative();
  assert.deepEqual(dom.t.options.map(x=>x.value),['Expense']);
  assert.deepEqual(dom.c.options.map(x=>x.value),['Dining']);
  assert.equal(dom.labels.transaction.hidden,true);
  assert.equal(h.api.validate(),true);
});

test('incomplete new-owner setup remains empty even when old widgets insert default categories',()=>{
  const h=harness(fresh()),dom=nativeForm(h);
  h.api.refresh();
  dom.g.replaceChildren({value:'Income',textContent:'Income',dataset:{}});
  dom.c.replaceChildren({value:'Salary',textContent:'Salary',dataset:{}});
  h.api.reconcileNative();
  assert.equal(dom.g.options.length,0);
  assert.equal(dom.c.options.length,0);
  assert.equal(h.api.validate(),false);
  assert.equal(dom.submit.disabled,true);
});

test('legacy owner selector options are not modified by managed owner reconciliation',()=>{
  const h=harness(null),dom=nativeForm(h);
  const existing=dom.t.options.map(x=>x.value);
  h.api.reconcileNative();
  assert.deepEqual(dom.t.options.map(x=>x.value),existing);
});


test('existing owner exposes modern presentation entries without migrating its old field layout or ledger',()=>{
  const h=harness(null),dom=nativeForm(h);
  const before=JSON.stringify(h.config);
  const legacy=h.api.getLegacyView();
  assert.ok(legacy);
  assert.deepEqual(Array.from(legacy.type,x=>x.canonical),['Income','Expense','Transfer']);
  assert.equal(legacy.transaction.length,8);
  assert.ok(legacy.category.some(x=>x.raw==='Expense|Dining'));
  assert.ok(legacy.category.some(x=>x.raw==='Income|Salary'));
  assert.equal(h.api.isManaged(),false);
  h.api.refresh();
  assert.deepEqual(Object.values(dom.labels).map(x=>x.hidden),[false,false,false],
    'old accounts still see the original three Add Transaction fields');
  assert.equal(JSON.stringify(h.config),before,'read-only presentation must not modify the configuration');
  assert.equal(h.writes.length,0,'read-only presentation performs no cloud save');
});

test('legacy presentation category list shows active names and separate archive without altering config',()=>{
  const h=harness(null);
  h.config.archivedCategories={Expense:['Archived Dining']};
  const before=JSON.stringify(h.config);
  const legacy=h.api.getLegacyView();
  assert.ok(legacy.category.some(x=>x.group==='Income'&&x.name==='Salary'));
  assert.ok(!legacy.category.some(x=>x.name==='Archived Dining'));
  assert.equal(h.api.getArchivedCategoryEntries().length,1);
  assert.equal(h.api.getArchivedCategoryEntries()[0].name,'Archived Dining');
  assert.equal(JSON.stringify(h.config),before);
  assert.equal(h.writes.length,0);
});

test('no signed-in owner cannot expose legacy account lists through presentation API',()=>{
  const h=harness(null,null);
  assert.equal(h.api.getLegacyView(),null);
  assert.equal(h.api.getArchivedCategoryEntries().length,0);
});

test('new owner retains empty Manage and is never auto-migrated into old defaults',()=>{
  const h=harness(fresh());
  assert.equal(h.api.getLegacyView(),null);
  assert.equal(h.api.fieldItems('type').length,0);
  assert.equal(h.api.fieldItems('transaction').length,0);
  assert.equal(h.api.getCategoryEntries().length,0);
});
