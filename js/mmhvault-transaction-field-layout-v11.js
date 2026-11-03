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
    const fields=['type','transaction','category'].filter(k=>k==='category'?categories().length:s[k].length);
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

  // Owner-scoped display names never change canonical ledger codes.
  const display=()=>{
    const s=state();if(!s)return null;
    if(!s.displayV13)s.displayV13={typeLabels:{},transactionLabels:{},extraTypes:[],extraTransactions:[]};
    return s.displayV13;
  };
  const fieldItems=field=>{
    const s=state(),d=display();if(!s||!d)return [];
    const codes=field==='type'?s.type:s.transaction;
    const aliases=field==='type'?d.extraTypes:d.extraTransactions;
    const names=d[field==='type'?'typeLabels':'transactionLabels'];
    return codes.flatMap(code=>[
      {key:'base:'+code,canonical:code,label:String(names[code]||(field==='type'?code:KIND.find(k=>k.id===code)?.label)||code),custom:false},
      ...aliases.filter(x=>x.canonical===code).map(x=>({key:x.id,canonical:code,label:x.label,custom:true}))
    ]);
  };
  const escHtml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cleanLabel=x=>String(x||'').trim().replace(/\s+/g,' ').slice(0,40);
  let typeChoice='',transactionChoice='';
  function restoreChoice(el,key){
    if(!el||!key)return false;
    const i=[...el.options].findIndex(x=>x.dataset?.mmhChoiceId===key);
    if(i<0)return false;
    el.selectedIndex=i;return true;
  }
  function persistMutation(action){
    const s=state();if(!s)return false;
    const previous=JSON.stringify(s);
    if(action(s,display())===false)return false;
    if(!safePersist()){
      Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,JSON.parse(previous));
      notify(tr('Could not save this change.','保存失败，请检查网络。','မသိမ်းနိုင်ပါ။'));return false;
    }
    refreshManage();refreshForm();return true;
  }
  function duplicateName(field,label,except=''){
    return fieldItems(field).some(x=>x.key!==except&&x.label.toLocaleLowerCase()===label.toLocaleLowerCase());
  }
  function saveName(field,entry,canonical,input){
    const valid=field==='type'?TYPE:KIND.map(x=>x.id);
    const label=cleanLabel(input);
    if(!valid.includes(canonical)||!label){notify(tr('Enter a name and financial meaning.','请输入名称并选择财务类型。','အမည်နှင့် အမျိုးအစား ဖြည့်ပါ။'));return false;}
    if(duplicateName(field,label,entry?.key)){notify(tr('That name is already used.','该名称已存在。','ဤအမည် ရှိပြီးသားဖြစ်သည်။'));return false;}
    return persistMutation((s,d)=>{
      const current=s[field],aliases=field==='type'?d.extraTypes:d.extraTransactions;
      const names=d[field==='type'?'typeLabels':'transactionLabels'];
      if(entry){
        if(entry.canonical!==canonical)return false;
        if(entry.custom){
          const row=aliases.find(x=>x.id===entry.key);
          if(!row)return false;row.label=label;
        }else{
          if(!current.includes(canonical))return false;
          names[canonical]=label;
        }
      }else if(!current.includes(canonical)){
        current.push(canonical);names[canonical]=label;
      }else{
        // Additional names are display-only aliases of a known financial code.
        if(aliases.length>=24){notify('Maximum 24 additional names.');return false;}
        const suffix=(Date.now().toString(36)+Math.random().toString(36).slice(2,10)).replace(/[^a-z0-9]/g,'');
        aliases.push({id:'user_'+suffix.slice(0,22),canonical,label});
      }
    });
  }
  function removeName(field,entry){
    return persistMutation((s,d)=>{
      const aliases=field==='type'?d.extraTypes:d.extraTransactions;
      if(entry.custom){
        const idx=aliases.findIndex(x=>x.id===entry.key&&x.canonical===entry.canonical);
        if(idx<0)return false;aliases.splice(idx,1);
      }else{
        if(aliases.some(x=>x.canonical===entry.canonical)){
          notify(tr('Remove its additional names first.','请先移除关联的自定义名称。','ဆက်စပ်အမည်များကို အရင်ဖယ်ရှားပါ။'));return false;
        }
        s[field]=s[field].filter(x=>x!==entry.canonical);
        delete d[field==='type'?'typeLabels':'transactionLabels'][entry.canonical];
      }
    });
  }
  function fieldDialog(field,entry=null){
    if(!state())return false;
    if(typeof mmhVaultOpenDialogV449!=='function'){
      notify(tr('Editor unavailable; reopen Manage.','编辑暂不可用，请重新打开 Manage。','ပြင်ဆင်ရန် မရနိုင်ပါ။'));return false;
    }
    const choices=field==='type'?TYPE.map(x=>({value:x,label:x})):
      KIND.map(x=>({value:x.id,label:x.label+' · '+x.type}));
    const canonical=entry?.canonical||choices[0].value;
    const options=choices.map(x=>'<option value="'+escHtml(x.value)+'"'+
      (x.value===canonical?' selected':'')+'>'+escHtml(x.label)+'</option>').join('');
    mmhVaultOpenDialogV449({
      title:entry?tr('Edit display name','编辑显示名称','အမည် ပြင်ရန်'):
        tr('Add '+(field==='type'?'Type':'Transaction'),'添加 '+(field==='type'?'Type':'Transaction'),'အသစ်ထည့်ရန်'),
      message:tr('Display names do not change accounting rules.','显示名称不会改变财务计算规则。','စာရင်းကိုင်စည်းမျဉ်း မပြောင်းပါ။'),
      body:'<div class="mmh-v449-field"><label>'+tr('Display name','显示名称','ပြသမည့်အမည်')+
        '</label><input id="mmhV13DisplayName" maxlength="40" autocomplete="off" value="'+escHtml(entry?.label||'')+
        '"></div><div class="mmh-v449-field"><label>'+tr('Financial meaning','财务归属','အမျိုးအစား')+
        '</label><select id="mmhV13Canonical"'+(entry?' disabled':'')+'>'+options+
        '</select></div><div class="mmh-v449-dialog-note">'+tr(
          'Multiple labels may share one financial code. Only the original financial code is saved on each transaction.',
          '多个名称可以对应同一个财务类型；每条记账记录仍保存原有财务代码。',
          'ငွေစာရင်းကုဒ် အဟောင်းကိုသာ သိမ်းဆည်းသည်။')+'</div>',
      actions:[
        {label:tr('Cancel','取消','မလုပ်တော့ပါ'),onClick:()=>true},
        {label:tr('Save changes','保存修改','သိမ်းပါ'),className:'primary',onClick:()=>
          saveName(field,entry,entry?.canonical||id('mmhV13Canonical')?.value,id('mmhV13DisplayName')?.value)}
      ]
    });return true;
  }
  function onCategoryRenamed(group,oldName,newName){
    const s=state();if(!s)return;
    const from=group+'|'+oldName,to=group+'|'+newName;
    if(s.category.includes(from))s.category=[...new Set(s.category.map(x=>x===from?to:x))];
  }
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
      '.mmh-v12-warning{font-size:12px;line-height:1.6;color:#f8d995;margin-bottom:12px}',
      '#txForm .actions button[data-mmh-v12-blocked="1"]{opacity:.55;cursor:not-allowed}',
      '.mmh-v12-cols{display:grid;grid-template-columns:minmax(0,1fr);gap:0;border:1px solid rgba(165,174,197,.24);border-radius:13px;overflow:hidden;margin-top:8px}',
      '.mmh-v12-col{min-width:0;display:grid;grid-template-columns:minmax(155px,185px) minmax(0,1fr);gap:16px;padding:15px 16px;align-items:start;background:rgba(10,27,47,.28)}',
      '.mmh-v12-col+.mmh-v12-col{border-top:1px solid rgba(165,174,197,.18)}',
      '.mmh-v12-field-head h4{font-size:13px;margin:0 0 4px;font-weight:700}',
      '.mmh-v12-field-head .mmh-v12-help{display:block;font-size:11px}',
      '.mmh-v12-options{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0}',
      '.mmh-v12-option{appearance:none;min-height:37px;border:1px solid rgba(164,186,209,.37);border-radius:10px;background:rgba(32,63,89,.4);color:inherit;padding:8px 12px;font-size:12px;font-weight:600;line-height:1.3;cursor:pointer;transition:background .16s ease,border-color .16s ease}',
      '.mmh-v12-option:hover{border-color:rgba(235,188,99,.77);background:rgba(183,142,71,.16)}',
      '.mmh-v12-option.is-active{border-color:rgba(231,188,103,.78);background:rgba(190,151,75,.23);color:#ffe1a6}',
      '.mmh-v13-entry{display:inline-flex;align-items:center;gap:7px;max-width:100%;min-height:40px;padding:5px 7px 5px 12px;border-radius:12px;border:1px solid rgba(170,191,211,.22);background:rgba(40,70,96,.23)}',
      '.mmh-v13-entry-title{font-size:12px;line-height:1.4;font-weight:650;overflow-wrap:anywhere}',
      '.mmh-v13-entry-note{font-size:10px;color:#9caec6;white-space:nowrap}',
      '.mmh-v13-action{border:1px solid rgba(162,181,203,.27);border-radius:8px;min-height:30px;padding:5px 8px;background:rgba(31,53,80,.48);color:inherit;font-size:11px;cursor:pointer}',
      '.mmh-v13-action:hover{border-color:#d7ac65}',
      '.mmh-v13-remove{color:#f9b8bd}',
      '.mmh-v13-group{display:flex;align-items:flex-start;flex-direction:column;gap:9px;min-width:0}',
      '.mmh-v13-head{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;width:100%}',
      '.mmh-v13-new{border:1px solid rgba(232,187,99,.56);border-radius:9px;background:rgba(226,178,93,.13);color:#f4d9a6;padding:7px 10px;min-height:35px;font-size:12px;font-weight:700;cursor:pointer}',
      '.mmh-v13-available{display:flex;flex-wrap:wrap;align-items:center;gap:7px;font-size:11px;color:#9ab0ca}',
      '.mmh-v13-active{display:flex;align-items:center;gap:7px;flex-wrap:wrap;min-width:0}',

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
    // Managed owners already have Edit/Remove actions in the unified card;
    // keep the old duplicate category list hidden unless archived items exist.
    if(legacyCard)legacyCard.hidden=!hasArchived;
    panel.append(make('div','mmh-v12-head',tr('Set up your entry fields','设置您的记账字段','မှတ်တမ်းအကွက်များ သတ်မှတ်ပါ')));
    panel.append(make('div','mmh-v12-help',tr(
      'Tap an option to add or remove it. Give Category your own names. Add Transaction will follow these choices automatically.',
      '点击选项即可添加或移除；Category 可自定义名称。Add Transaction 会自动跟随您的设置。',
      'ရွေးချယ်မှုကို နှိပ်ပြီး ထည့်ပါ သို့မဟုတ် ဖယ်ပါ။ Category အမည်ကို ကိုယ်တိုင် ထည့်နိုင်ပါသည်။'
    )));
    const fields=['type','transaction','category'];
    const status=readiness();
    const enabledFields=fields.filter(key=>status.active[key]);
    const count=status.count;
    panel.append(make('div','mmh-v12-progress',tr(
      !status.ready?'Setup needed · '+count+' field groups selected':'Ready · '+count+' compatible field groups',
      !status.ready?'需要继续设置 · 已选择 '+count+' 项字段':'已就绪 · '+count+' 项字段已匹配',
      !status.ready?'ထပ်မံပြင်ဆင်ရန် · '+count+' ခု':'အဆင်သင့် · '+count+' ခု'
    )));
    if(!status.ready&&count>=2)panel.append(make('div','mmh-v12-warning',status.reason));
    const grid=make('div','mmh-v12-cols');panel.append(grid);
    for(const kind of ['type','transaction']){
      const card=make('div','mmh-v12-col');grid.append(card);
      const lead=make('div','mmh-v12-field-head');
      lead.append(make('h4','',kind==='type'?'Type':'Transaction'));
      lead.append(make('span','mmh-v12-help',kind==='type'
        ?tr('Income, Expense, Transfer','收入、支出或转账','ဝင်ငွေ၊ အသုံးစရိတ်၊ လွှဲပြောင်း')
        :tr('Choose the financial purpose','选择财务用途','ငွေကြေးလှုပ်ရှားမှု အမျိုးအစား')));
      card.append(lead);
      const area=make('div','mmh-v13-group');card.append(area);
      const head=make('div','mmh-v13-head');area.append(head);
      const active=make('div','mmh-v13-active');head.append(active);
      const entries=fieldItems(kind);
      for(const entry of entries){
        const tag=make('div','mmh-v13-entry');
        tag.append(make('span','mmh-v13-entry-title',entry.label));
        if(entry.custom)tag.append(make('span','mmh-v13-entry-note','· '+entry.canonical.replace('|',' / ')));
        const edit=button(tr('Edit','编辑','ပြင်ရန်'),()=>fieldDialog(kind,entry));
        edit.className='mmh-v13-action';edit.setAttribute('aria-label','Edit '+entry.label);
        const remove=button(tr('Remove','移除','ဖယ်ရှား'),()=>removeName(kind,entry));
        remove.className='mmh-v13-action mmh-v13-remove';remove.setAttribute('aria-label','Remove '+entry.label);
        tag.append(edit,remove);active.append(tag);
      }
      if(!entries.length)active.append(make('span','mmh-v12-help',tr('Nothing added yet','尚未添加','မထည့်ရသေးပါ')));
      const add=button(tr('+ Add '+(kind==='type'?'Type':'Transaction'),
        '+ 添加 '+(kind==='type'?'Type':'Transaction'),'+ ထည့်ရန်'),()=>fieldDialog(kind));
      add.className='mmh-v13-new';head.append(add);
      const choices=kind==='type'?TYPE.map(x=>({value:x,label:x})):
        KIND.map(x=>({value:x.id,label:x.label,type:x.type}));
      const unselected=choices.filter(x=>!(state()?.[kind]||[]).includes(x.value)&&
        (kind!=='transaction'||!types().length||types().includes(x.type)));
      if(unselected.length){
        const available=make('div','mmh-v13-available');area.append(available);
        available.append(make('span','',tr('Quick add:','快捷添加：','ထည့်ရန်:')));
        for(const x of unselected){
          const chip=button('+ '+x.label,()=>mutate(kind,x.value));
          chip.className='mmh-v12-option';available.append(chip);
        }
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
      const edit=button(tr('Edit','编辑','ပြင်ရန်'),()=>{
        if(typeof mmhVaultEditCategoryV449==='function')mmhVaultEditCategoryV449(cat.group,cat.name);
      });
      edit.className='mmh-v13-action';edit.setAttribute('aria-label','Edit '+cat.name);
      const remove=button(tr('Remove','移除','ဖယ်ရှား'),()=>mutate('category',cat.raw,true));
      remove.className='mmh-v13-action mmh-v13-remove';
      remove.setAttribute('aria-label','Remove '+cat.name+' from new transactions');
      tag.append(edit,remove);list.append(tag);
    }
    const preview=make('div','mmh-v12-preview');panel.append(preview);
    preview.append(make('span','mmh-v12-preview-label',tr(
      'Add Transaction preview','Add Transaction 将显示','Add Transaction တွင် ပြမည့်အရာ')));
    if(!status.ready){
      preview.append(make('span','mmh-v12-help',status.reason));
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
  function fill(select,entries,pick,choiceKey){
    if(!select)return null;
    const old=pick||select.value;
    select.replaceChildren(...entries.map(entry=>{
      const option=make('option','',entry.label||entry.value);
      option.value=entry.value;
      if(entry.type)option.dataset.mmhCanonicalType=entry.type;
      if(entry.group)option.dataset.mmhCanonicalGroup=entry.group;
      if(entry.choiceId)option.dataset.mmhChoiceId=entry.choiceId;
      return option;
    }));
    const selected=[...select.options].findIndex(x=>choiceKey&&x.dataset?.mmhChoiceId===choiceKey);
    if(selected>=0)select.selectedIndex=selected;
    else if([...select.options].some(x=>x.value===old))select.value=old;
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

  // A configured field-count is NOT sufficient for a valid ledger entry.
  // Only whitelisted canonical Type/Transaction/Category combinations count.
  function matchingCategories(type,group){
    return categories().filter(x=>x.type===type&&x.coreGroup===group);
  }
  function safeNeutral(type,group){
    const fallback=neutral(type,group);
    if(!fallback)return false;
    if(type==='Transfer'||group==='Data Adjustment')return true;
    const key=group==='Loans'?(type==='Income'?'LoanIncome':'LoanExpense'):group;
    const list=typeof mmhVaultTransactionCategoryListV451==='function'?
      mmhVaultTransactionCategoryListV451(type,group):(config()?.categories?.[key]||[]);
    return Array.isArray(list)&&list.includes(fallback);
  }
  function allowedTransactions(){
    const withCategory=categories().length>0;
    return transactions().filter(x=>
      (!types().length||types().includes(x.type))&&
      (withCategory?matchingCategories(x.type,x.group).length>0:safeNeutral(x.type,x.group)));
  }
  function readiness(){
    const active={type:types().length>0,transaction:transactions().length>0,category:categories().length>0};
    const count=Object.values(active).filter(Boolean).length;
    if(count<2)return {active,count,ready:false,reason:tr(
      'Set up at least two fields in Manage before adding a transaction.',
      '请先在 Manage 设置至少两种字段，再开始记账。',
      'Manage တွင် အကွက်အမျိုးအစား နှစ်ခု ရွေးပါ။')};
    let validPair=false;
    if(active.transaction){
      validPair=allowedTransactions().length>0;
    }else if(active.type&&active.category){
      validPair=categories().some(x=>types().includes(x.type));
    }
    return {active,count,ready:validPair,reason:validPair?'':tr(
      'No matching financial combination is configured. Add a Category matching your Income/Expense Transaction (or choose a compatible Type) in Manage.',
      '已选择的字段不匹配。请在 Manage 添加与收入/支出 Transaction 对应的 Category，或调整 Type。',
      'Income/Expense Transaction နှင့် ကိုက်ညီသော Category ကို Manage တွင် ထည့်ပါ။')};
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
      const save=form.querySelector('.actions button:not([type="button"])');
      if(save){save.disabled=false;save.dataset.mmhV12Blocked='0';}
      Object.values(labels).forEach(x=>{if(x){x.dataset.mmhV12Hidden='0';x.hidden=false;x.style.display='';}});
      const kindPanel=id('txSmartV141');
      if(kindPanel){kindPanel.dataset.mmhV12Setup='0';kindPanel.dataset.mmhV12Managed='0';}
      note('');return;
    }
    rendering=true;
    try{
      const status=readiness();
      const enabled=status.active;
      const active=status.count;
      const save=form.querySelector('.actions button:not([type="button"])');
      if(save){save.disabled=!status.ready;save.dataset.mmhV12Blocked=status.ready?'0':'1';}
      // A partially configured form must look empty. No default Salary (or
      // another category) may leak in beside the setup guidance.
      Object.entries(labels).forEach(([name,el])=>{
        if(!el)return;
        const visible=status.ready&&enabled[name];
        el.dataset.mmhV12Hidden=visible?'0':'1';
        el.hidden=!visible;
        el.style.display=visible?'':'none';
      });
      const kindPanel=id('txSmartV141');
      if(kindPanel){
        kindPanel.dataset.mmhV12Setup=status.ready?'0':'1';
        kindPanel.dataset.mmhV12Managed='1'; // two selected fields are the sole visible choice
      }
      if(!status.ready){
        // Keep the canonical Type options even when the Type field is hidden.
        // Otherwise a fresh owner selecting Transaction + Category later cannot
        // set its internal income/expense Type, and saving becomes impossible.
        // Never leave native legacy categories visible on an unready form.
        g.replaceChildren();c.replaceChildren();
        note(status.reason);
        return;
      }
      const currType=t.value,currGroup=g.value,currCat=c.value;
      if(enabled.type){
        // A globally valid setup may still contain an Income Type without an
        // Income Category. Only expose Types with at least one saveable pairing.
        const compatibleTypes=new Set(enabled.transaction?
          allowedTransactions().map(x=>x.type):
          categories().map(x=>x.type));
        fill(t,fieldItems('type').filter(x=>compatibleTypes.has(x.canonical))
          .map(x=>({value:x.canonical,label:x.label,choiceId:x.key})),currType,typeChoice);
      }
      let type=enabled.type?t.value:currType;
      if(enabled.transaction){
        const allowed=new Set(allowedTransactions().map(x=>x.id));
        const available=fieldItems('transaction').map(x=>({...KIND.find(k=>k.id===x.canonical),label:x.label,choiceId:x.key})).filter(x=>x.type&&allowed.has(x.id)&&(!enabled.type||x.type===type));
        if(!available.length){
          g.replaceChildren();note(tr('Add a compatible Transaction in Manage.','请在 Manage 添加匹配的 Transaction。','Manage တွင် Transaction ထည့်ပါ။'));return;
        }
        // Transaction has canonical underlying (type, group), not a display-only code.
        const chosen=available.find(x=>x.choiceId===transactionChoice)||available.find(x=>x.type===currType&&x.group===currGroup)||available[0];
        fill(g,available.map(x=>({value:x.group,label:x.label,type:x.type,group:x.group,choiceId:x.choiceId})),chosen.group,transactionChoice);
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
        const allowed=new Set(allowedTransactions().map(x=>x.id));
        const available=fieldItems('transaction').map(x=>({...KIND.find(k=>k.id===x.canonical),label:x.label,choiceId:x.key})).filter(x=>x.type&&allowed.has(x.id)&&(!enabled.type||x.type===type));
        const entries=available.map(x=>({value:x.group,label:x.label,type:x.type,group:x.group,choiceId:x.choiceId}));
        fill(g,entries,group,transactionChoice);
        const match=[...g.options].findIndex(x=>x.dataset.mmhCanonicalType===type&&x.dataset.mmhCanonicalGroup===group);
        if(match>=0&&!restoreChoice(g,transactionChoice))g.selectedIndex=match;
      }
      restoreChoice(t,typeChoice);
      note('');
    }finally{
      rendering=false;
      // A globally viable configuration can still have a currently
      // incompatible selected Type. Disable Save until the visible pair is valid.
      const save=form.querySelector('.actions button:not([type="button"])');
      if(save){
        const allowed=readiness().ready&&valid();
        save.disabled=!allowed;
        save.dataset.mmhV12Blocked=allowed?'0':'1';
      }
    }
  }
  function valid(){
    const s=state();if(!s)return true;
    if(!readiness().ready)return false;
    const t=id('txType'),g=id('txGroup'),c=id('txCategory');if(!t||!g||!c)return false;
    if(!TYPE.includes(t.value)||!g.value||!c.value)return false;
    if(s.type.length&&!s.type.includes(t.value))return false;
    if(s.transaction.length&&!s.transaction.includes(t.value+'|'+g.value))return false;
    if(categories().length&&!categories().some(x=>x.type===t.value&&x.coreGroup===g.value&&x.name===c.value))return false;
    if(!categories().length&&(!neutral(t.value,g.value)||c.value!==neutral(t.value,g.value)))return false;
    return true;
  }
  function eventHandler(event){
    if(!isManaged()||rendering)return;
    const t=id('txType'),g=id('txGroup'),c=id('txCategory');
    if(event.target===t)typeChoice=t.selectedOptions?.[0]?.dataset?.mmhChoiceId||'';
    if(event.target===g&&transactions().length){
      transactionChoice=g.selectedOptions?.[0]?.dataset?.mmhChoiceId||'';
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
          notify(readiness().reason||tr(
            'Choose a Type, Transaction and Category that match before saving.',
            '请选择相互匹配的 Type、Transaction 和 Category 后再保存。',
            'ကိုက်ညီသော အမျိုးအစားများကို ရွေးပါ။'));
        }
      },true);
    }
    form?.addEventListener('focusin',event=>{
      if(event.target===id('txCategory')||event.target===id('txGroup'))refreshForm();
    },true);
    const refresh=()=>{refreshManage();refreshForm();};
    for(const e of ['mmhvault:config-owner-changed','mmhvault:config-cloud-synced','mmhvault:category-config-changed','mmhvault:data-loaded','mmhvault-language-change'])
      window.addEventListener(e,()=>setTimeout(refresh,0));
    refresh();
  }
  window.MMHV11TxFieldPrefs={
    version:'3.0.1',isManaged,hasCategory,markCategory,onCategoryRenamed,fieldItems,saveName,removeName,refreshManage,
    refresh:refreshForm,attachEdit:()=>{},getMode:mode,layoutInfo,readiness,validate:valid,
    // Legacy V11's manual mode chooser is intentionally removed.
    setMode:()=>false
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();