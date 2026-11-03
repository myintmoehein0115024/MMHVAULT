/* MMHVAULT APP V11.2 — Manage-owned Type / Transaction / Category fields.
 * Existing owner configurations keep the original three ledger selectors.
 * New owner configurations start with three EMPTY visible Manage lists.
 * Ledger type, group and category remain canonical; no historical row writes.
 */
(() => {
  'use strict';
  if (window.MMHV11TxFieldPrefs) return;
  const TYPE=['Income','Expense','Transfer'];
  const KIND=[
    {id:'Income|Income',type:'Income',group:'Income',label:'Income'},
    {id:'Expense|Expense',type:'Expense',group:'Expense',label:'Expense'},
    {id:'Expense|Personal',type:'Expense',group:'Personal',label:'Personal'},
    {id:'Income|Loans',type:'Income',group:'Loans',label:'Loan Income'},
    {id:'Expense|Loans',type:'Expense',group:'Loans',label:'Loan Expense'},
    {id:'Transfer|Transfer',type:'Transfer',group:'Transfer',label:'Transfer'},
    {id:'Income|Data Adjustment',type:'Income',group:'Data Adjustment',label:'Income Adjustment'},
    {id:'Expense|Data Adjustment',type:'Expense',group:'Data Adjustment',label:'Expense Adjustment'}
  ];
  const id=x=>document.getElementById(x);
  const owner=()=>{try{return String(currentSessionUser?.id||'');}catch(_){return '';}};
  const config=()=>{try{return MMHVAULT_CONFIG;}catch(_){return null;}};
  const state=()=>{const v=config()?.txFieldsV12;return owner()&&v?.version===1?v:null;};
  const isManaged=()=>!!state();
  const hasCategory=(group,name)=>!!state()?.category.includes(group+'|'+name);
  const mode=()=>{
    const s=state();if(!s)return 'legacy';
    const fields=['type','transaction','category'].filter(k=>s[k].length);
    return fields.length>=2?fields.join('-'):'setup';
  };
  const validKind=v=>KIND.some(k=>k.id===v);
  const groupOfCategory=(group)=>group==='LoanIncome'||group==='LoanExpense'?'Loans':group;
  const typeOfCategory=(group)=>group==='LoanIncome'?'Income':group==='Income'?'Income':group==='Personal'||group==='LoanExpense'||group==='Expense'?'Expense':'';
  const categories=()=>{const s=state();if(!s)return [];
    return s.category.map(raw=>{const split=raw.indexOf('|'),group=raw.slice(0,split),name=raw.slice(split+1);
      return {raw,group,name,type:typeOfCategory(group),coreGroup:groupOfCategory(group)};})
      .filter(x=>x.type&&x.name&&(config()?.categories?.[x.group]||[]).includes(x.name));
  };
  const types=()=>state()?.type.filter(x=>TYPE.includes(x))||[];
  const transactions=()=>state()?.transaction.map(x=>KIND.find(k=>k.id===x)).filter(Boolean)||[];
  const layoutInfo=()=>({mode:mode(),type:types(),transaction:transactions().map(x=>x.id),category:categories().map(x=>x.raw)});
  const tr=(en,zh,my)=>{
    let lang='en';try{lang=String(localStorage.getItem('mmhvault_language_v3363')||document.documentElement.lang||'en').toLowerCase();}catch(_){}
    return lang.startsWith('zh')?zh:/^(my|mm|burmese)/.test(lang)?my:en;
  };
  const notify=(message)=>{
    try{if(typeof mmhVaultCustomMessageV449==='function'){mmhVaultCustomMessageV449('Transaction settings',message);return;}}catch(_){}
    const hint=id('mmhV12SetupNote');if(hint){hint.textContent=message;hint.hidden=false;}
  };
  const safePersist=()=>{
    if(!state())return false;
    try{if(typeof mmhVaultRequireConfigOwner!=='function'||!mmhVaultRequireConfigOwner(owner()))return false;
      mmhVaultPersistConfig();window.dispatchEvent(new Event('mmhvault:category-config-changed'));return true;
    }catch(e){console.warn('[MMHVAULT] Field configuration could not be saved',e);return false;}
  };
  const markCategory=(group,name)=>{
    const s=state();if(!s||!['Expense','Income','Personal','LoanIncome','LoanExpense'].includes(group))return false;
    const actual=(config()?.categories?.[group]||[]).find(x=>String(x).toLowerCase()===String(name).toLowerCase());
    if(!actual)return false;
    const item=group+'|'+actual;
    if(!s.category.includes(item))s.category.push(item);
    return true;
  };
  function mutate(field,value,remove=false){
    const s=state();if(!s||!['type','transaction','category'].includes(field))return;
    if(field==='type'&&!TYPE.includes(value))return;
    if(field==='transaction'&&!validKind(value))return;
    if(field==='category'&&!categories().some(x=>x.raw===value)) {
      if(!s.category.includes(value))return;
    }
    const previous=[...s[field]];
    if(remove)s[field]=s[field].filter(x=>x!==value);
    else if(!s[field].includes(value))s[field].push(value);
    if(!safePersist()){s[field]=previous;notify('Unable to save the changes. Verify your account connection.');return;}
    refreshManage();refreshForm();
  }
  function style(){
    if(id('mmhV12Style'))return;
    const x=document.createElement('style');x.id='mmhV12Style';
    x.textContent=[
      '.mmh-v12-setup{margin:0 0 15px;padding:14px;border:1px solid rgba(202,161,91,.26);border-radius:14px;background:rgba(15,33,52,.62);color:inherit}',
      '.mmh-v12-head{font-weight:700;font-size:13px;line-height:1.5;margin-bottom:9px}',
      '.mmh-v12-help{font-size:11px;opacity:.77;line-height:1.55}',
      '.mmh-v12-cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
      '.mmh-v12-col{min-width:0;border:1px solid rgba(165,174,197,.22);border-radius:11px;padding:11px}',
      '.mmh-v12-col h4{margin:0 0 8px;font-size:12px}',
      '.mmh-v12-row{display:flex;gap:7px;align-items:center;flex-wrap:wrap}',
      '.mmh-v12-row select{min-width:90px;flex:1 1 135px;max-width:100%;padding:9px;border-radius:9px;border:1px solid rgba(172,174,185,.38);background:#102942;color:#f3f5fc}',
      '.mmh-v12-taglist{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}',
      '.mmh-v12-tag{display:flex;align-items:center;gap:8px;border-radius:9px;padding:7px 9px;background:rgba(137,164,193,.12);font-size:12px}',
      '.mmh-v12-tag button{min-width:25px;min-height:28px;border:0;border-radius:7px;background:rgba(210,151,82,.18);color:inherit;cursor:pointer}',
      '.mmh-v12-note{margin:9px 0 0;font-size:12px;line-height:1.5;color:#e2c38d}',
      '#txForm [data-mmh-v12-hidden="1"]{display:none!important}',
      '#mmhV12SetupNote[hidden]{display:none!important}',
      '@media(max-width:720px){.mmh-v12-cols{grid-template-columns:1fr}.mmh-v12-setup{padding:11px}}',
      'body.light .mmh-v12-row select{background:#fff;color:#172943}'
    ].join('');document.head.appendChild(x);
  }
  function make(tag,className,text){
    const e=document.createElement(tag);if(className)e.className=className;if(text!=null)e.textContent=text;return e;
  }
  function button(label,click){
    const b=make('button','btn',label);b.type='button';b.addEventListener('click',click);return b;
  }
  function buildManager(){
    const host=id('mmhManagerCategoriesPanelV445');if(!host)return null;
    let panel=id('mmhV12Manage');
    if(panel)return panel;
    panel=make('section','mmh-v12-setup');panel.id='mmhV12Manage';
    const first=host.querySelector('section');
    if(first)host.insertBefore(panel,first);else host.prepend(panel);
    return panel;
  }
  function refreshManage(){
    const panel=buildManager();if(!panel)return;
    panel.replaceChildren();
    if(!isManaged()){
      panel.hidden=true;return;
    }
    panel.hidden=false;
    panel.append(make('div','mmh-v12-head',tr('Your transaction fields','管理记账字段','မှတ်တမ်းအကွက်များကို စီမံပါ')));
    panel.append(make('div','mmh-v12-help',tr(
      'Add Type, Transaction, and Category here. Add Transaction automatically shows the fields you have configured; no extra switch on the form. Existing history is never changed.',
      '在 Manage 添加 Type、Transaction、Category。Add Transaction 自动按已添加的字段显示，不再出现额外切换框；旧记录不会改变。',
      'Type၊ Transaction နှင့် Category ကို ဤနေရာတွင် ထည့်ပါ။ မှတ်တမ်းဟောင်းများ မပြောင်းလဲပါ။'
    )));
    const grid=make('div','mmh-v12-cols');panel.append(grid);
    for(const kind of ['type','transaction']){
      const card=make('div','mmh-v12-col');grid.append(card);
      card.append(make('h4','',kind==='type'?'Type':'Transaction'));
      const row=make('div','mmh-v12-row'),select=make('select',''),choices=kind==='type'?
        TYPE.map(x=>({value:x,label:x})):
        KIND.map(k=>({value:k.id,label:k.label}));
      const enabled=state()?.[kind]||[];
      for(const opt of choices.filter(x=>!enabled.includes(x.value))){
        const el=make('option','',opt.label);el.value=opt.value;select.append(el);
      }
      row.append(select);
      const add=button('+ Add',()=>mutate(kind,select.value));
      add.disabled=!select.options.length;
      row.append(add);card.append(row);
      const tags=make('div','mmh-v12-taglist');card.append(tags);
      for(const value of enabled){
        const item=choices.find(x=>x.value===value);if(!item)continue;
        const tag=make('span','mmh-v12-tag',item.label);
        const remove=button('×',()=>mutate(kind,value,true));remove.setAttribute('aria-label','Remove '+item.label);
        tag.append(remove);tags.append(tag);
      }
      if(!enabled.length)tags.append(make('span','mmh-v12-help',tr('No entries yet','尚未添加','မထည့်ရသေးပါ')));
    }
    const active=categories();
    const list=make('div','mmh-v12-taglist');panel.append(list);
    list.append(make('span','mmh-v12-help',tr('Category: use Add Category below. Selected:','Category：通过下方 Add Category 添加。已选择：','Category ကို အောက်တွင် ထည့်ပါ။')));
    for(const cat of active){
      const tag=make('span','mmh-v12-tag',cat.name+' · '+cat.group);
      tag.append(button('×',()=>mutate('category',cat.raw,true)));list.append(tag);
    }
    panel.append(make('div','mmh-v12-note',tr(
      'Two configured fields are shown automatically. A third field appears only if you add it. Keep loan and personal categories explicit for accurate reports.',
      '添加哪两项就自动显示哪两项；只有添加第三项才显示三项。借贷、个人类交易需明确分类以保证报表准确。',
      'အကွက်နှစ်ခု ထည့်လျှင် နှစ်ခုသာ ပြပါမည်။'
    )));
  }
  function fill(select,entries,pick){
    if(!select)return null;
    const old=pick||select.value;
    select.replaceChildren(...entries.map(entry=>{
      const option=make('option','',entry.label||entry.value);
      option.value=entry.value;
      if(entry.type)option.dataset.mmhCanonicalType=entry.type;
      if(entry.group)option.dataset.mmhCanonicalGroup=entry.group;
      return option;
    }));
    const found=[...select.options].find(x=>x.value===old);
    if(found)select.value=old;
    return select.selectedOptions?.[0]||null;
  }
  function setCore(type,group,cat){
    const t=id('txType'),g=id('txGroup'),c=id('txCategory');
    if(!t||!g||!c||!TYPE.includes(type))return false;
    t.value=type;
    if(typeof syncTransactionGroup==='function')syncTransactionGroup();
    if(![...g.options].some(x=>x.value===group))return false;
    g.value=group;
    if(typeof updateCategories==='function')updateCategories();
    if(cat!=null&&[...c.options].some(x=>x.value===cat))c.value=cat;
    return true;
  }
  function neutral(type,group){
    if(type==='Transfer')return 'Transfer';
    if(group==='Data Adjustment')return 'Data Adjustment';
    if(type==='Income'&&group==='Income')return 'Other Income';
    if(type==='Expense'&&group==='Expense')return 'Other';
    return null;
  }
  function note(message){
    const form=id('txForm');if(!form)return;
    let el=id('mmhV12SetupNote');
    if(!el){
      el=make('div','mmh-v12-note');el.id='mmhV12SetupNote';
      const basic=form.querySelector('.mmh-form-section-v1');
      if(basic)basic.after(el);else form.querySelector('.formgrid')?.prepend(el);
    }
    el.hidden=!message;el.textContent=message||'';
  }
  let rendering=false;
  function refreshForm(){
    const form=id('txForm');if(!form||rendering)return;
    const t=id('txType'),g=id('txGroup'),c=id('txCategory');
    if(!t||!g||!c)return;
    const labels={type:t.closest('label'),transaction:g.closest('label'),category:c.closest('label')};
    if(!isManaged()){
      Object.values(labels).forEach(x=>{if(x){x.dataset.mmhV12Hidden='0';x.style.display='';}});
      note('');return;
    }
    rendering=true;
    try{
      const enabled={type:types().length>0,transaction:transactions().length>0,category:categories().length>0};
      Object.entries(labels).forEach(([name,el])=>{if(!el)return;el.dataset.mmhV12Hidden=enabled[name]?'0':'1';el.style.display=enabled[name]?'':'none';});
      const active=Object.values(enabled).filter(Boolean).length;
      if(active<2){
        if(!enabled.type)t.replaceChildren();
        if(!enabled.transaction)g.replaceChildren();
        if(!enabled.category)c.replaceChildren();
        note(tr('Set up at least two fields in Manage before adding a transaction.',
          '请先在 Manage 添加至少两种字段，再开始记账。','မှတ်တမ်းထည့်ရန် Manage တွင် အကွက်နှစ်ခု ရွေးပါ။'));
        return;
      }
      const currType=t.value,currGroup=g.value,currCat=c.value;
      if(enabled.type){
        fill(t,types().map(x=>({value:x,label:x})),currType);
      }
      let type=enabled.type?t.value:currType;
      if(enabled.transaction){
        const available=transactions().filter(x=>!enabled.type||x.type===type);
        if(!available.length){
          g.replaceChildren();note(tr('Add a compatible Transaction in Manage.','请在 Manage 添加匹配的 Transaction。','Manage တွင် Transaction ထည့်ပါ။'));return;
        }
        // Transaction has canonical underlying (type, group), not a display-only code.
        const selected=fill(g,available.map(x=>({value:x.group,label:x.label,type:x.type,group:x.group})),currGroup);
        const chosen=selected?.dataset?.mmhCanonicalType?available.find(x=>x.type===selected.dataset.mmhCanonicalType&&x.group===selected.dataset.mmhCanonicalGroup):available[0];
        if(!chosen){note('Select a transaction.');return;}
        type=chosen.type;
        if(!enabled.type)t.value=type;
        setCore(type,chosen.group,null);
      } else if(enabled.type){
        const candidates=categories().filter(x=>x.type===type);
        if(!candidates.length){
          g.replaceChildren();c.replaceChildren();note(tr('Add a matching Category in Manage.','请在 Manage 添加匹配的 Category。','Category ထည့်ပါ။'));return;
        }
        const desired=candidates.find(x=>x.coreGroup===currGroup&&x.name===currCat)||candidates[0];
        setCore(type,desired.coreGroup,desired.name);
      }
      type=t.value;
      let group=g.value;
      if(enabled.category){
        const available=categories().filter(x=>x.type===type&&(!enabled.transaction||x.coreGroup===group));
        if(!available.length){
          c.replaceChildren();note(tr('Add a matching Category in Manage for this Transaction.',
            '请在 Manage 为此 Transaction 添加匹配的 Category。','Category ထည့်ပါ။'));return;
        }
        const chosen=available.find(x=>x.name===currCat&&x.coreGroup===group)||available[0];
        setCore(type,chosen.coreGroup,chosen.name);
        group=g.value;
        fill(c,available.map(x=>({value:x.name,label:x.name,group:x.coreGroup})),chosen.name);
      }else{
        const defaultCat=neutral(type,group);
        const list=typeof mmhVaultTransactionCategoryListV451==='function'?mmhVaultTransactionCategoryListV451(type,group):[];
        if(!defaultCat||!(list||[]).includes(defaultCat)){
          note(tr('This Transaction needs a Category. Add it in Manage to avoid incorrect reports.',
            '此 Transaction 需要明确的 Category。请先在 Manage 添加，以免报表分类错误。',
            'ဤ Transaction အတွက် Category လိုအပ်ပါသည်။'));return;
        }
        setCore(type,group,defaultCat);
      }
      if(enabled.transaction){
        // Restore the managed transaction choices after the internal group sync.
        const available=transactions().filter(x=>!enabled.type||x.type===type);
        const entries=available.map(x=>({value:x.group,label:x.label,type:x.type,group:x.group}));
        fill(g,entries,group);
        const match=[...g.options].findIndex(x=>x.dataset.mmhCanonicalType===type&&x.dataset.mmhCanonicalGroup===group);
        if(match>=0)g.selectedIndex=match;
      }
      note('');
    }finally{rendering=false;}
  }
  function valid(){
    const s=state();if(!s)return true;
    if(['setup'].includes(mode()))return false;
    const t=id('txType'),g=id('txGroup'),c=id('txCategory');if(!t||!g||!c)return false;
    if(!TYPE.includes(t.value)||!g.value||!c.value)return false;
    if(s.type.length&&!s.type.includes(t.value))return false;
    if(s.transaction.length&&!s.transaction.includes(t.value+'|'+g.value))return false;
    if(s.category.length&&!categories().some(x=>x.type===t.value&&x.coreGroup===g.value&&x.name===c.value))return false;
    return true;
  }
  function eventHandler(event){
    if(!isManaged()||rendering)return;
    const t=id('txType'),g=id('txGroup'),c=id('txCategory');
    if(event.target===g&&transactions().length){
      const opt=g.selectedOptions?.[0];
      const type=opt?.dataset?.mmhCanonicalType, group=opt?.dataset?.mmhCanonicalGroup;
      if(type&&group){
        event.stopImmediatePropagation();
        setCore(type,group,null);refreshForm();return;
      }
    }
    if(event.target===c&&categories().length&&!transactions().length){
      const opt=c.selectedOptions?.[0],group=opt?.dataset?.mmhCanonicalGroup;
      if(group){event.stopImmediatePropagation();setCore(t.value,group,c.value);refreshForm();return;}
    }
    if(event.target===t||event.target===g||event.target===c)setTimeout(refreshForm,0);
  }
  function boot(){
    style();
    const form=id('txForm');
    if(form){
      form.addEventListener('change',eventHandler,true);
      form.addEventListener('submit',event=>{
        if(!valid()){
          event.preventDefault();event.stopImmediatePropagation();
          notify(tr('Set up the required fields in Manage before saving. Historical finance categories will not be guessed.',
            '请先在 Manage 配好必要字段，再保存；系统不会猜测财务分类。',
            'Manage တွင် လိုအပ်သောအကွက်များ ထည့်ပါ။'));
        }
      },true);
    }
    const refresh=()=>{refreshManage();refreshForm();};
    for(const e of ['mmhvault:config-owner-changed','mmhvault:config-cloud-synced','mmhvault:category-config-changed','mmhvault:data-loaded','mmhvault-language-change'])
      window.addEventListener(e,()=>setTimeout(refresh,0));
    refresh();
  }
  window.MMHV11TxFieldPrefs={
    version:'2.0.0',isManaged,hasCategory,markCategory,refreshManage,
    refresh:refreshForm,attachEdit:()=>{},getMode:mode,layoutInfo,validate:valid,
    // Legacy V11's manual mode chooser is intentionally removed.
    setMode:()=>false
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();