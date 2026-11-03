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
      '.mmh-v12-setup{margin:0 0 16px;padding:18px;border:1px solid rgba(202,161,91,.26);border-radius:16px;background:rgba(15,33,52,.62);color:inherit}',
      '.mmh-v12-head{font-weight:700;font-size:15px;line-height:1.4;margin-bottom:4px}',
      '.mmh-v12-help{font-size:12px;opacity:.8;line-height:1.55}',
      '.mmh-v12-progress{margin:12px 0 10px;font-weight:700;font-size:12px;color:#e6c27d}',
      '.mmh-v12-cols{display:grid;grid-template-columns:minmax(0,1fr);gap:0;border:1px solid rgba(165,174,197,.24);border-radius:13px;overflow:hidden;margin-top:8px}',
      '.mmh-v12-col{min-width:0;display:grid;grid-template-columns:minmax(155px,185px) minmax(0,1fr);gap:16px;padding:15px 16px;align-items:start;background:rgba(10,27,47,.28)}',
      '.mmh-v12-col+.mmh-v12-col{border-top:1px solid rgba(165,174,197,.18)}',
      '.mmh-v12-field-head h4{font-size:13px;margin:0 0 4px;font-weight:700}',
      '.mmh-v12-field-head .mmh-v12-help{display:block;font-size:11px}',
      '.mmh-v12-options{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0}',
      '.mmh-v12-option{appearance:none;min-height:37px;border:1px solid rgba(164,186,209,.37);border-radius:10px;background:rgba(32,63,89,.4);color:inherit;padding:8px 12px;font-size:12px;font-weight:600;line-height:1.3;cursor:pointer;transition:background .16s ease,border-color .16s ease}',
      '.mmh-v12-option:hover{border-color:rgba(235,188,99,.77);background:rgba(183,142,71,.16)}',
      '.mmh-v12-option.is-active{border-color:rgba(231,188,103,.78);background:rgba(190,151,75,.23);color:#ffe1a6}',
      '.mmh-v12-option.is-incompatible{border-style:dashed}',
      '.mmh-v12-option:focus-visible,.mmh-v12-tag button:focus-visible{outline:2px solid #e9bb68;outline-offset:2px}',
      '.mmh-v12-taglist{display:flex;gap:8px;flex-wrap:wrap;align-items:center;min-width:0}',
      '.mmh-v12-tag{display:flex;align-items:center;gap:8px;border-radius:10px;padding:7px 10px;background:rgba(137,164,193,.12);font-size:12px}',
      '.mmh-v12-tag button{min-width:25px;min-height:28px;border:0;border-radius:7px;background:rgba(210,151,82,.18);color:inherit;cursor:pointer}',
      '.mmh-v12-col-category .mmh-v12-taglist{grid-column:2;margin:0}',
      '.mmh-v12-col-category .mmh-manager-form-v445{grid-column:2;min-width:0;display:grid!important;grid-template-columns:minmax(170px,1.25fr) minmax(130px,.75fr) max-content!important;gap:8px!important;align-items:center;margin:0!important}',
      '.mmh-v12-col-category .mmh-manager-form-v445>span{display:none!important}',
      '.mmh-v12-col-category .mmh-manager-form-v445>*{min-width:0;max-width:100%;width:100%}',
      '.mmh-v12-col-category .mmh-manager-form-v445>button{width:auto;min-width:120px;white-space:nowrap}',
      '.mmh-v12-preview{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:13px;font-size:12px;line-height:1.5}',
      '.mmh-v12-preview-label{font-weight:700;color:#e6c27d}',
      '.mmh-v12-preview-fields{display:flex;gap:6px;flex-wrap:wrap}',
      '.mmh-v12-preview-chip{border:1px solid rgba(202,161,91,.36);padding:5px 9px;border-radius:999px;background:rgba(201,165,92,.09);font-weight:600}',
      '.mmh-v12-note{margin:10px 0 0;font-size:11px;line-height:1.5;color:#e2c38d}',
      '#mmhV12Manage[hidden]{display:none!important}',
      '.mmh-v12-managed > section.mmh-manager-card-v445 > .mmh-manager-head-v445{display:none!important}',
      '#mmhManagerCategoriesPanelV445 section.mmh-manager-card-v445[hidden]{display:none!important}',
      '#mmhV12SetupNote{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:13px 15px;margin:3px 0 10px;border:1px solid rgba(200,159,83,.36);border-radius:13px;background:rgba(14,28,48,.72)}',
      '#mmhV12SetupNote button{flex-shrink:0}',
      '#txForm .formgrid > label[data-mmh-v12-hidden="1"]{display:none!important}',
      '#txSmartV141[data-mmh-v12-setup="1"],#txSmartV141[data-mmh-v12-managed="1"]{display:none!important}',
      '#txForm [data-mmh-v12-hidden="1"]{display:none!important}',
      '#mmhV12SetupNote[hidden]{display:none!important}',
      '@media(max-width:900px){.mmh-v12-col{grid-template-columns:minmax(125px,160px) minmax(0,1fr);gap:10px}.mmh-v12-col-category .mmh-manager-form-v445{grid-template-columns:minmax(0,1fr) minmax(120px,.75fr)!important}.mmh-v12-col-category .mmh-manager-form-v445>button{grid-column:1/-1;width:100%}}',
      '@media(max-width:680px){.mmh-v12-setup{padding:12px}.mmh-v12-col{grid-template-columns:minmax(0,1fr);gap:9px;padding:12px}.mmh-v12-col-category .mmh-manager-form-v445,.mmh-v12-col-category .mmh-v12-taglist{grid-column:1}.mmh-v12-option{min-height:41px}.mmh-v12-preview{align-items:flex-start}}',
      'body.light .mmh-v12-option{background:#fff;color:#243348;border-color:#c5cbda}',
      'body.light .mmh-v12-option.is-active{background:#fff1d0;color:#62420e;border-color:#c69642}'
    ].join('');
    document.head.appendChild(x);
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
    const host=id('mmhManagerCategoriesPanelV445');
    const legacyCard=host?.querySelector('section.mmh-manager-card-v445');
    // Keep the single existing Category form with its original validation.
    const categoryForm=panel.querySelector('.mmh-manager-form-v445')||
      legacyCard?.querySelector('.mmh-manager-form-v445');
    const heading=id('category-manage')?.querySelector('.cm-heading h2');
    if(heading){
      if(!heading.dataset.mmhV12OldEn){
        heading.dataset.mmhV12OldEn=heading.dataset.i18nEn||'Manage Categories';
        heading.dataset.mmhV12OldZh=heading.dataset.i18nZh||'管理分类';
      }
      heading.dataset.i18nEn=isManaged()?'Manage Transaction Fields':heading.dataset.mmhV12OldEn;
      heading.dataset.i18nZh=isManaged()?'管理记账字段':heading.dataset.mmhV12OldZh;
      heading.textContent=isManaged()?
        tr('Manage Transaction Fields','管理记账字段','မှတ်တမ်းအကွက်များကို စီမံပါ'):
        tr(heading.dataset.mmhV12OldEn,heading.dataset.mmhV12OldZh,heading.dataset.mmhV12OldEn);
    }
    if(!isManaged()){
      if(categoryForm&&legacyCard&&categoryForm.parentElement!==legacyCard){
        const header=legacyCard.querySelector('.mmh-manager-head-v445');
        if(header)header.after(categoryForm);else legacyCard.prepend(categoryForm);
      }
      host?.classList.remove('mmh-v12-managed');
      if(legacyCard)legacyCard.hidden=false;
      panel.replaceChildren();panel.hidden=true;return;
    }
    panel.replaceChildren();
    panel.hidden=false;
    host?.classList.add('mmh-v12-managed');
    const hasArchived=Object.values(config()?.archivedCategories||{})
      .some(items=>Array.isArray(items)&&items.length>0);
    if(legacyCard)legacyCard.hidden=!(state()?.category.length||hasArchived);
    panel.append(make('div','mmh-v12-head',tr('Set up your entry fields','设置您的记账字段','မှတ်တမ်းအကွက်များ သတ်မှတ်ပါ')));
    panel.append(make('div','mmh-v12-help',tr(
      'Tap an option to add or remove it. Give Category your own names. Add Transaction will follow these choices automatically.',
      '点击选项即可添加或移除；Category 可自定义名称。Add Transaction 会自动跟随您的设置。',
      'ရွေးချယ်မှုကို နှိပ်ပြီး ထည့်ပါ သို့မဟုတ် ဖယ်ပါ။ Category အမည်ကို ကိုယ်တိုင် ထည့်နိုင်ပါသည်။'
    )));
    const fields=['type','transaction','category'];
    const enabledFields=fields.filter(key=>(state()?.[key]||[]).length);
    const count=enabledFields.length;
    panel.append(make('div','mmh-v12-progress',tr(
      count<2?'First setup · '+count+' of 2 field groups ready':'Ready · '+count+' field groups selected',
      count<2?'首次设置 · 已完成 '+count+'/2 项字段':'已就绪 · 选中 '+count+' 项字段',
      count<2?'ပြင်ဆင်မှု '+count+'/2':'အကွက် '+count+' ခု'
    )));
    const grid=make('div','mmh-v12-cols');panel.append(grid);
    for(const kind of ['type','transaction']){
      const card=make('div','mmh-v12-col');grid.append(card);
      const lead=make('div','mmh-v12-field-head');
      lead.append(make('h4','',kind==='type'?'Type':'Transaction'));
      lead.append(make('span','mmh-v12-help',kind==='type'
        ?tr('Income, Expense, Transfer','收入、支出或转账','ဝင်ငွေ၊ အသုံးစရိတ်၊ လွှဲပြောင်း')
        :tr('Choose the transaction purpose','选择交易用途','ငွေကြေးလှုပ်ရှားမှု အမျိုးအစား')));
      card.append(lead);
      const options=make('div','mmh-v12-options');card.append(options);
      const choices=kind==='type'?TYPE.map(x=>({value:x,label:x})):
        KIND.map(k=>({value:k.id,label:k.label}));
      const enabled=state()?.[kind]||[];
      // Always show selected options (including now-incompatible ones) so
      // the user can remove them. New options respect configured Type.
      const compatible=kind==='transaction'&&!types().length?choices:
        kind==='transaction'?choices.filter(x=>enabled.includes(x.value)||types().includes(KIND.find(k=>k.id===x.value)?.type)):choices;
      for(const option of compatible){
        const selected=enabled.includes(option.value);
        const chip=button((selected?'✓  ':'+  ')+option.label,()=>mutate(kind,option.value,selected));
        const incompatible=kind==='transaction'&&types().length&&
          !types().includes(KIND.find(k=>k.id===option.value)?.type);
        chip.className='mmh-v12-option'+(selected?' is-active':'')+(incompatible?' is-incompatible':'');
        chip.setAttribute('aria-pressed',selected?'true':'false');
        chip.setAttribute('aria-label',selected?'Remove '+option.label:'Add '+option.label);
        options.append(chip);
      }
    }
    const categoryCard=make('div','mmh-v12-col mmh-v12-col-category');grid.append(categoryCard);
    const categoryLead=make('div','mmh-v12-field-head');
    categoryLead.append(make('h4','','Category'));
    categoryLead.append(make('span','mmh-v12-help',tr('Your custom spending or income names',
      '自定义收入或支出分类','သင့်ကိုယ်ပိုင် အမျိုးအစားအမည်')));
    categoryCard.append(categoryLead);
    if(categoryForm)categoryCard.append(categoryForm);
    else categoryCard.append(make('div','mmh-v12-help',tr(
      'Use the existing Category editor.','使用原有的 Category 添加功能。','Category ကို ထည့်ပါ။')));
    const active=categories();
    const list=make('div','mmh-v12-taglist');categoryCard.append(list);
    for(const cat of active){
      const tag=make('span','mmh-v12-tag',cat.name+' · '+cat.group);
      const remove=button('×',()=>mutate('category',cat.raw,true));
      remove.setAttribute('aria-label','Remove '+cat.name+' from '+cat.group);
      tag.append(remove);list.append(tag);
    }
    const preview=make('div','mmh-v12-preview');panel.append(preview);
    preview.append(make('span','mmh-v12-preview-label',tr(
      'Add Transaction preview','Add Transaction 将显示','Add Transaction တွင် ပြမည့်အရာ')));
    if(count<2){
      preview.append(make('span','mmh-v12-help',tr(
        'Select at least two kinds above to start recording.',
        '请先在上方添加至少两种字段，才能开始记账。',
        'အထက်မှ အကွက်နှစ်ခု အနည်းဆုံး ရွေးပါ။'
      )));
    }else{
      const shown=make('div','mmh-v12-preview-fields');preview.append(shown);
      for(const field of enabledFields){
        shown.append(make('span','mmh-v12-preview-chip',field==='type'?'Type':field==='transaction'?'Transaction':'Category'));
      }
    }
    panel.append(make('div','mmh-v12-note',tr(
      'Only configured field groups appear in Add Transaction. Financial codes and saved history remain unchanged.',
      'Add Transaction 只显示已设置的字段；财务类型代码与历史记录不变。',
      'ရွေးထားသော အကွက်များသာ ပြပြီး မှတ်တမ်းဟောင်းများ မပြောင်းလဲပါ။'
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
      el=make('div','mmh-v12-note full');el.id='mmhV12SetupNote';
      el.setAttribute('role','status');
      const basic=form.querySelector('.mmh-form-section-v1');
      if(basic)basic.after(el);else form.querySelector('.formgrid')?.prepend(el);
    }
    el.hidden=!message;
    el.replaceChildren();
    if(message){
      el.append(make('span','',message));
      el.append(button(tr('Open Manage','前往 Manage 设置','Manage သို့သွားရန်'),()=>{
        try{
          if(typeof window.showTxTab==='function')window.showTxTab('manage');
          else window.mmhTxPagePickerOpenCategoriesV3?.();
        }catch(_e){}
      }));
    }
  }
  let rendering=false;
  function refreshForm(){
    const form=id('txForm');if(!form||rendering)return;
    const t=id('txType'),g=id('txGroup'),c=id('txCategory');
    if(!t||!g||!c)return;
    const labels={type:t.closest('label'),transaction:g.closest('label'),category:c.closest('label')};
    if(!isManaged()){
      Object.values(labels).forEach(x=>{if(x){x.dataset.mmhV12Hidden='0';x.hidden=false;x.style.display='';}});
      const kindPanel=id('txSmartV141');
      if(kindPanel){kindPanel.dataset.mmhV12Setup='0';kindPanel.dataset.mmhV12Managed='0';}
      note('');return;
    }
    rendering=true;
    try{
      const enabled={type:types().length>0,transaction:transactions().length>0,category:categories().length>0};
      const active=Object.values(enabled).filter(Boolean).length;
      // A partially configured form must look empty. No default Salary (or
      // another category) may leak in beside the setup guidance.
      Object.entries(labels).forEach(([name,el])=>{
        if(!el)return;
        const visible=active>=2&&enabled[name];
        el.dataset.mmhV12Hidden=visible?'0':'1';
        el.hidden=!visible;
        el.style.display=visible?'':'none';
      });
      const kindPanel=id('txSmartV141');
      if(kindPanel){
        kindPanel.dataset.mmhV12Setup=active<2?'1':'0';
        kindPanel.dataset.mmhV12Managed='1'; // two selected fields are the sole visible choice
      }
      if(active<2){
        // Keep the canonical Type options even when the Type field is hidden.
        // Otherwise a fresh owner selecting Transaction + Category later cannot
        // set its internal income/expense Type, and saving becomes impossible.
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
        const chosen=available.find(x=>x.type===currType&&x.group===currGroup)||available[0];
        fill(g,available.map(x=>({value:x.group,label:x.label,type:x.type,group:x.group})),chosen.group);
        // Income Loans and Expense Loans share a canonical group value.
        // Select by BOTH type and group, never array order or group alone.
        const selectedIndex=[...g.options].findIndex(x=>x.dataset.mmhCanonicalType===chosen.type&&x.dataset.mmhCanonicalGroup===chosen.group);
        if(selectedIndex>=0)g.selectedIndex=selectedIndex;
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
    if(!s.category.length&&(!neutral(t.value,g.value)||c.value!==neutral(t.value,g.value)))return false;
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
    version:'2.2.0',isManaged,hasCategory,markCategory,refreshManage,
    refresh:refreshForm,attachEdit:()=>{},getMode:mode,layoutInfo,validate:valid,
    // Legacy V11's manual mode chooser is intentionally removed.
    setMode:()=>false
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();