import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../js/mmhvault-v11-manage-glass-dialogs.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.html',import.meta.url),'utf8');
const base=fs.readFileSync(new URL('../js/mmhvault-transaction-field-layout-v11.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../css/mmhvault-v11-manage-glass-dialogs.css',import.meta.url),'utf8');

function harness({legacy=false}={}){
  let locale='en',saves=0,removes=0,refreshes=0;
  const dataset={type:[],transaction:[],category:[{raw:'Income|Salary',name:'Salary',group:'Income'}]};
  const historical=[{id:'historic-1',type:'Income',category:'Salary',amount:100}];
  let document;
  class Element {
    constructor(tag){
      this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;
      this.id='';this.className='';this.dataset={};this.style={};this.hidden=false;
      this.attrs={};this.listeners={};this._text='';this._value=undefined;this.isConnected=true;
      this.classList={
        add:cls=>{if(!this.className.split(' ').includes(cls))this.className=(this.className+' '+cls).trim();},
        remove:cls=>{this.className=this.className.split(' ').filter(x=>x!==cls).join(' ');},
        toggle:(cls,force)=>{if(force)this.classList.add(cls);else this.classList.remove(cls);}
      };
    }
    set textContent(value){this.replaceChildren();this._text=String(value);}
    get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
    set value(value){this._value=value;}
    get value(){return this._value===undefined?(this.children.find(x=>x.selected)||this.children[0])?.value||'':this._value;}
    append(...children){
      for(const child of children){
        if(child.parentElement)child.parentElement.children=child.parentElement.children.filter(x=>x!==child);
        child.parentElement=this;this.children.push(child);
      }
    }
    replaceChildren(...children){for(const old of this.children)old.parentElement=null;this.children=[];this._text='';this.append(...children);}
    insertBefore(child,ref){
      if(child.parentElement)child.parentElement.children=child.parentElement.children.filter(x=>x!==child);
      child.parentElement=this;const i=this.children.indexOf(ref);this.children.splice(i<0?this.children.length:i,0,child);
    }
    remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);this.parentElement=null;}
    setAttribute(name,value){this.attrs[name]=String(value);}
    addEventListener(name,fn){this.listeners[name]=fn;}
    click(){this.listeners.click?.({target:this});}
    focus(){document.activeElement=this;}
    getClientRects(){return [1];}
    querySelector(query){return this.querySelectorAll(query)[0]||null;}
    querySelectorAll(query){
      const first=query.split(',')[0],classes=first.match(/\.[a-zA-Z0-9-]+/g)||[];
      const tag=(first.match(/^[a-z]+/)||[])[0];
      const identifier=first.startsWith('#')?first.slice(1):null;
      const match=n=>(!tag||n.tagName===tag.toUpperCase())&&(!identifier||n.id===identifier)&&
        classes.every(c=>n.className.split(/\s+/).includes(c.slice(1)));
      const list=[];
      const walk=node=>{for(const child of node.children){if(match(child))list.push(child);walk(child);}};
      walk(this);return list;
    }
  }
  const body=new Element('body'),h=new Element('div'),card=new Element('section'),
    panel=new Element('section'),native=new Element('div');
  h.id='mmhManagerCategoriesPanelV445';card.className='mmh-manager-card-v445';
  panel.id='mmhV12Manage';native.className='mmh-manager-form-v445';
  if(legacy)card.append(native);else panel.append(native);
  h.append(card,panel);body.append(h);
  const events={};
  document={
    body,activeElement:body,readyState:'loading',documentElement:{lang:'en'},
    createElement:tag=>new Element(tag),
    getElementById:identifier=>{
      const visit=n=>n.id===identifier?n:n.children.map(visit).find(Boolean);
      return visit(body);
    },
    addEventListener:(event,fn)=>{events[event]=fn;}
  };
  const api={
    isManaged:()=>!legacy,
    getLegacyView:()=>legacy?{
      type:['Income','Expense','Transfer'].map(value=>({key:'legacy:'+value,canonical:value,label:value})),
      transaction:[{key:'legacy:Income|Income',canonical:'Income|Income',label:'Income'},
        {key:'legacy:Expense|Expense',canonical:'Expense|Expense',label:'Expense'}],
      category:dataset.category.map(x=>({...x}))
    }:null,
    fieldItems:field=>dataset[field].map(row=>({...row})),
    getCategoryEntries:()=>dataset.category.map(x=>({...x})),
    getArchivedCategoryEntries:()=>[],
    canonicalChoices:field=>field==='type'?[{value:'Income',label:'Income'}]:
      [{value:'Income|Income',label:'Income'}],
    describeCanonical:()=> 'Income',
    readiness:()=>{
      const active={type:dataset.type.length>0,transaction:dataset.transaction.length>0,
        category:dataset.category.length>0};
      return {active,ready:Object.values(active).filter(Boolean).length>=2,
        reason:'Set up at least two fields'};
    },
    saveName:(field,entry,canonical,label)=>{
      saves++;
      if(entry)dataset[field]=dataset[field].map(x=>x.key===entry.key?{...x,label}:x);
      else dataset[field].push({key:'base:'+canonical,canonical,label});
      return true;
    },
    removeName:(field,entry)=>{
      removes++;dataset[field]=dataset[field].filter(x=>x.key!==entry.key);return true;
    },
    removeCategory:raw=>{
      removes++;dataset.category=dataset.category.filter(x=>x.raw!==raw);return true;
    },
    refreshManage:()=>{refreshes++;}
  };
  const listeners={};
  const categoryCalls=[];
  const window={
    MMHV11TxFieldPrefs:api,
    mmhVaultEditCategoryV449:(group,name)=>categoryCalls.push({action:'edit',group,name}),
    mmhVaultArchiveCategoryV445:(group,name)=>categoryCalls.push({action:'archive',group,name}),
    mmhVaultRestoreCategoryV445:(group,name)=>categoryCalls.push({action:'restore',group,name}),
    addEventListener:(key,fn)=>{listeners[key]=fn;}
  };
  vm.runInNewContext(source,{
    window,document,localStorage:{getItem:()=>locale},
    setTimeout:fn=>fn(),requestAnimationFrame:fn=>fn(),
    console
  });
  events.DOMContentLoaded();
  const look=(start,cls)=>start.querySelector('.'+cls);
  const buttons=start=>start.querySelectorAll('button');
  const labeled=(start,txt)=>buttons(start).find(x=>x.textContent.includes(txt));
  return {window,body,h,panel,card,native,dataset,historical,categoryCalls,look,buttons,labeled,
    changeLanguage:x=>{locale=x;window.MMHV11ManageGlassV14.refresh();},
    stats:()=>({saves,removes,refreshes})};
}

test('isolated addon is wired from versioned core and does not modify Add Transaction markup',()=>{
  assert.match(app,/transaction-field-layout-v11\.js\?v=3\.0\.5/);
  assert.match(base,/mmhvault-v11-manage-glass-dialogs\.js\?v=1\.0\.3/);
  assert.match(base,/mmhvault-v11-manage-glass-dialogs\.css\?v=1\.0\.3/);
  assert.doesNotMatch(source,/MMHVAULT_CONFIG\s*=|transactions\.push\(/);
  assert.match(css,/@media\(max-width:580px\)/);
  assert.match(css,/overflow-y:auto/);
});

test('shows exactly three compact cards with preview and opens one accessible modal at once',()=>{
  const h=harness();
  const root=h.look(h.h,'mmh-v14-cards');
  assert.equal(root.children.length,3);
  assert.ok(h.look(h.h,'mmh-v14-preview'));
  h.window.MMHV11ManageGlassV14.open('type');
  let shade=h.look(h.body,'mmh-v14-shade');
  assert.equal(shade.children[0].attrs['aria-modal'],'true');
  h.window.MMHV11ManageGlassV14.open('transaction');
  assert.equal(h.body.querySelectorAll('.mmh-v14-shade').length,1);
  h.window.MMHV11ManageGlassV14.close();
  assert.equal(h.body.querySelectorAll('.mmh-v14-shade').length,0);
  assert.equal(h.stats().refreshes,2);
});

test('Type add, rename and remove use only the existing canonical owner API',()=>{
  const h=harness();
  h.window.MMHV11ManageGlassV14.open('type');
  h.labeled(h.body,'+ Add Type').click();
  assert.equal(h.look(h.body,'mmh-v14-list').hidden,true,'editor must replace—not stack under—the list');
  const input=h.look(h.body,'mmh-v14-input');input.value='My Income';
  h.labeled(h.body,'Save changes').click();
  assert.equal(h.stats().saves,1);
  assert.equal(h.dataset.type[0].canonical,'Income');
  h.labeled(h.body,'Edit').click();
  h.look(h.body,'mmh-v14-input').value='Salary Type';
  h.labeled(h.body,'Save changes').click();
  assert.equal(h.dataset.type[0].label,'Salary Type');
  h.labeled(h.body,'Remove').click();
  h.buttons(h.body).filter(x=>x.textContent==='Remove').at(-1).click();
  assert.equal(h.dataset.type.length,0);
  assert.equal(h.stats().removes,1);
});

test('Category remove only changes new-entry selection; native editor moves back on close',()=>{
  const h=harness(),before=JSON.stringify(h.historical);
  h.window.MMHV11ManageGlassV14.open('category');
  assert.ok(h.look(h.body,'mmh-v14-native').querySelector('.mmh-manager-form-v445'));
  h.labeled(h.body,'Remove').click();
  h.buttons(h.body).filter(x=>x.textContent==='Remove').at(-1).click();
  assert.equal(h.dataset.category.length,0);
  assert.equal(JSON.stringify(h.historical),before);
  h.window.MMHV11ManageGlassV14.close();
  assert.equal(h.native.parentElement,h.card);
});

test('Chinese and Burmese controls follow active interface language, not English-only chrome',()=>{
  const h=harness();
  h.changeLanguage('zh-CN');
  assert.match(h.look(h.h,'mmh-v14-heading').textContent,/管理记账字段/);
  h.window.MMHV11ManageGlassV14.open('category');
  assert.match(h.look(h.body,'mmh-v14-dialog-head').textContent,/管理 分类/);
  h.window.MMHV11ManageGlassV14.close();
  h.changeLanguage('my');
  assert.match(h.look(h.h,'mmh-v14-heading').textContent,/ငွေစာရင်း/);
});

test('opening add editor hides the original list, Cancel restores it without saving',()=>{
  const h=harness();h.window.MMHV11ManageGlassV14.open('type');
  h.labeled(h.body,'+ Add Type').click();
  const list=h.look(h.body,'mmh-v14-list');
  assert.equal(list.hidden,true);
  assert.equal(h.look(h.body,'mmh-v14-editor').hidden,false);
  assert.match(h.look(h.body,'mmh-v14-dialog-head').textContent,/Add Type/);
  h.labeled(h.body,'Cancel').click();
  assert.equal(list.hidden,false);
  assert.equal(h.look(h.body,'mmh-v14-editor').hidden,true);
  assert.equal(h.stats().saves,0);
});


test('legacy owner sees the same three summary cards without changing transaction data',()=>{
  const h=harness({legacy:true});
  const before=JSON.stringify(h.historical);
  const cards=h.look(h.h,'mmh-v14-cards');
  assert.equal(cards.children.length,3);
  assert.deepEqual(cards.children.map(x=>x.querySelector('.mmh-v14-count').textContent),
    ['3 added','2 added','1 added']);
  assert.equal(h.h.className.includes('mmh-v14-enabled'),true);
  assert.equal(h.stats().saves,0);
  assert.equal(h.stats().removes,0);
  assert.equal(JSON.stringify(h.historical),before);
  assert.ok(h.look(h.h,'mmh-v14-preview'));
});

test('legacy Type/Transaction dialogs permit add, edit, remove but do not save until confirmed',()=>{
  const h=harness({legacy:true});
  h.window.MMHV11ManageGlassV14.open('type');
  assert.equal(h.look(h.body,'mmh-v14-row')?.textContent.includes('Income'),true);
  assert.ok(h.labeled(h.body,'Edit'));
  assert.ok(h.labeled(h.body,'Remove'));
  assert.ok(h.labeled(h.body,'+ Add Type'));
  h.labeled(h.body,'+ Add Type').click();
  assert.equal(h.stats().saves,0,'opening editor never changes an old account');
  assert.equal(h.look(h.body,'mmh-v14-list').hidden,true);
  h.labeled(h.body,'Cancel').click();
  assert.equal(h.stats().saves,0);
  h.window.MMHV11ManageGlassV14.open('transaction');
  assert.equal(h.body.querySelectorAll('.mmh-v14-shade').length,1);
  assert.ok(h.labeled(h.body,'Edit'));
  assert.ok(h.labeled(h.body,'Remove'));
  assert.ok(h.labeled(h.body,'+ Add Transaction'));
  h.labeled(h.body,'Edit').click();
  assert.equal(h.stats().saves,0);
  h.labeled(h.body,'Cancel').click();
  assert.equal(h.stats().saves,0);
  h.window.MMHV11ManageGlassV14.close();
});

test('legacy Category editor moves into new modal and returns to original card',()=>{
  const h=harness({legacy:true});
  h.window.MMHV11ManageGlassV14.open('category');
  assert.equal(h.native.parentElement,h.look(h.body,'mmh-v14-native'));
  assert.ok(h.labeled(h.body,'Archive'),'old category archive action remains available');
  assert.ok(h.labeled(h.body,'Edit'),'old category edit action remains available');
  assert.equal(h.labeled(h.body,'Remove'),undefined,'legacy Category uses archive, not unsafe removal');
  h.labeled(h.body,'Archive').click();
  assert.equal(h.categoryCalls[0].action,'archive');
  assert.equal(h.categoryCalls[0].name,'Salary');
  assert.equal(h.native.parentElement,h.card);
  assert.equal(h.stats().saves,0);
});

test('legacy Category keeps original editing function while using modern presentation',()=>{
  const h=harness({legacy:true});
  h.window.MMHV11ManageGlassV14.open('category');
  h.labeled(h.body,'Edit').click();
  assert.deepEqual(h.categoryCalls,[{action:'edit',group:'Income',name:'Salary'}]);
  assert.equal(h.body.querySelectorAll('.mmh-v14-shade').length,0);
  assert.equal(h.stats().saves,0);
});

test('legacy summary remains translated and no new field marker is created',()=>{
  const h=harness({legacy:true});
  h.changeLanguage('zh');
  assert.match(h.look(h.h,'mmh-v14-heading').textContent,/管理记账字段/);
  h.window.MMHV11ManageGlassV14.open('category');
  assert.match(h.look(h.body,'mmh-v14-dialog-head').textContent,/管理 分类/);
  h.window.MMHV11ManageGlassV14.close();
  h.changeLanguage('my');
  assert.match(h.look(h.h,'mmh-v14-heading').textContent,/ငွေစာရင်း/);
  assert.equal(h.stats().saves,0);
});


test('empty managed Category shows no inherited items in its glass dialog',()=>{
  const h=harness();
  h.dataset.category.length=0;
  h.window.MMHV11ManageGlassV14.refresh();
  const cards=h.look(h.h,'mmh-v14-cards');
  assert.equal(cards.children[2].querySelector('.mmh-v14-count').textContent,'0 added');
  h.window.MMHV11ManageGlassV14.open('category');
  assert.match(h.look(h.body,'mmh-v14-empty').textContent,/Nothing added yet/);
  assert.equal(h.labeled(h.body,'Remove'),undefined);
  assert.equal(h.stats().saves,0);
  assert.equal(h.stats().removes,0);
});
