/* MMHVAULT APP V11 — per-owner transaction form field preferences.
 * Presentation/selection only. Never writes transactions, auth, or DB schemas.
 * Internal txType/txGroup/txCategory retain the unchanged ledger contract.
 */
(() => {
  'use strict';
  if (window.MMHV11TxFieldPrefs) return;
  const MODES = Object.freeze({
    all: 'All three fields',
    'type-category': 'Type + Category',
    'transaction-category': 'Transaction + Category',
    'type-transaction': 'Type + Transaction'
  });
  // Keep new controls aligned with the user's current UI language. Original
  // ledger type/category codes remain canonical, untranslated storage values.
  const COPY = Object.freeze({
    en:{
      heading:'Form fields',description:'Choose your preferred entry layout. Changes apply only to this browser and do not modify previous transactions.',
      all:'All three fields','type-category':'Type + Category','transaction-category':'Transaction + Category','type-transaction':'Type + Transaction',
      category:'Category',transaction:'Transaction',
      legacy:'This entry has a historical category. It will not be changed automatically.',
      adjustment:'For adjustments, choose Income or Expense explicitly.',
      automatic:'automatic',categoryUsed:'Category for this entry',switchAll:'switch to All three fields to edit',
      noNeutral:'There is no safe default Category for this group. Choose a Category explicitly to protect your reports.',
      invalid:'Choose a valid Type, Transaction and Category before saving.',
      'kind-Income-Income':'Income','kind-Expense-Expense':'Expense','kind-Expense-Personal':'Personal Expense',
      'kind-Income-Loans':'Loan Income','kind-Expense-Loans':'Loan Expense','kind-Transfer-Transfer':'Transfer',
      'kind-Income-Data Adjustment':'Income Adjustment','kind-Expense-Data Adjustment':'Expense Adjustment'
    },
    zh:{
      heading:'记账字段',description:'选择适合您的记账方式，仅在当前浏览器生效，不会更改历史交易。',
      all:'显示全部三个字段','type-category':'类型 + 分类','transaction-category':'交易 + 分类','type-transaction':'类型 + 交易',
      category:'分类',transaction:'交易',
      legacy:'这条记录使用历史分类，系统不会自动替换。',
      adjustment:'调整交易需要明确选择收入或支出。',
      automatic:'自动',categoryUsed:'本次使用分类',switchAll:'切换为完整模式可修改',
      noNeutral:'此交易组没有安全的默认分类。请手动选择，以确保报表准确。',
      invalid:'保存前请正确选择类型、交易和分类。',
      'kind-Income-Income':'收入','kind-Expense-Expense':'支出','kind-Expense-Personal':'个人支出',
      'kind-Income-Loans':'借款收入','kind-Expense-Loans':'借款支出','kind-Transfer-Transfer':'转账',
      'kind-Income-Data Adjustment':'收入调整','kind-Expense-Data Adjustment':'支出调整'
    },
    my:{
      heading:'မှတ်တမ်းထည့်ရန် အကွက်များ',description:'သင့်အတွက် အဆင်ပြေသော ပုံစံကို ရွေးပါ။ ဤဘရောက်ဇာတွင်သာ သိမ်းဆည်းပြီး မှတ်တမ်းဟောင်းများ မပြောင်းလဲပါ။',
      all:'အကွက်သုံးခုလုံး','type-category':'အမျိုးအစား + ကဏ္ဍ','transaction-category':'ငွေလွှဲမှတ်တမ်း + ကဏ္ဍ','type-transaction':'အမျိုးအစား + ငွေလွှဲမှတ်တမ်း',
      category:'ကဏ္ဍ',transaction:'ငွေလွှဲမှတ်တမ်း',
      legacy:'ဤမှတ်တမ်းတွင် ယခင်ကဏ္ဍကို အသုံးပြုထားပြီး အလိုအလျောက် မပြောင်းပါ။',
      adjustment:'ပြင်ဆင်မှုအတွက် ဝင်ငွေ သို့မဟုတ် ထွက်ငွေကို ရွေးပါ။',
      automatic:'အလိုအလျောက်',categoryUsed:'ဤမှတ်တမ်း၏ ကဏ္ဍ',switchAll:'ပြင်ဆင်ရန် အကွက်သုံးခုလုံးကို ပြပါ',
      noNeutral:'ဤအုပ်စုအတွက် သင့်လျော်သော မူလကဏ္ဍမရှိပါ။ ကဏ္ဍကို ကိုယ်တိုင် ရွေးပါ။',
      invalid:'သိမ်းဆည်းမီ အမျိုးအစား၊ ငွေလွှဲမှတ်တမ်းနှင့် ကဏ္ဍကို မှန်ကန်စွာ ရွေးပါ။',
      'kind-Income-Income':'ဝင်ငွေ','kind-Expense-Expense':'အသုံးစရိတ်','kind-Expense-Personal':'ကိုယ်ပိုင်အသုံးစရိတ်',
      'kind-Income-Loans':'ချေးငွေဝင်','kind-Expense-Loans':'ချေးငွေထွက်','kind-Transfer-Transfer':'ငွေလွှဲ',
      'kind-Income-Data Adjustment':'ဝင်ငွေ ပြင်ဆင်မှု','kind-Expense-Data Adjustment':'ထွက်ငွေ ပြင်ဆင်မှု'
    }
  });
  const language=()=>{
    let raw='';
    try{raw=String(localStorage.getItem('mmhvault_language_v3363')||document.documentElement?.lang||'en').toLowerCase();}catch(_){raw='en';}
    return raw.startsWith('zh')?'zh':/^(my|mm|burmese)/.test(raw)?'my':'en';
  };
  const tr=key=>COPY[language()]?.[key]||COPY.en[key]||key;
  const ORDER = ['all','type-category','transaction-category','type-transaction'];
  const TYPES = ['Income','Expense','Transfer'];
  const kinds = Object.freeze([
    ['Income','Income','Income'],
    ['Expense','Expense','Expense'],
    ['Expense','Personal','Personal Expense'],
    ['Income','Loans','Loan Income'],
    ['Expense','Loans','Loan Expense'],
    ['Transfer','Transfer','Transfer'],
    ['Income','Data Adjustment','Income Adjustment'],
    ['Expense','Data Adjustment','Expense Adjustment']
  ]);
  const owner = () => {
    try { return String(typeof currentSessionUser === 'undefined' ? '' : (currentSessionUser?.id || '')); }
    catch (_) { return ''; }
  };
  const key = id => 'mmhvault_tx_field_layout_v11_' + id;
  const mode = () => {
    const id = owner();
    if (!id) return 'all';
    try { const v = localStorage.getItem(key(id)); return ORDER.includes(v) ? v : 'all'; }
    catch (_) { return 'all'; }
  };
  const val = id => document.getElementById(id);
  const current = form => {
    const edit = form.id === 'editTxForm', prefix = edit ? 'e' : 'tx';
    return {
      type: val(edit ? 'eType' : 'txType'),
      group: val(edit ? 'eGroup' : 'txGroup'),
      category: val(edit ? 'eCat' : 'txCategory'),
      edit
    };
  };
  const groups = type => type === 'Income' ? ['Income','Loans','Data Adjustment'] :
    type === 'Expense' ? ['Expense','Personal','Loans','Data Adjustment'] :
    type === 'Transfer' ? ['Transfer'] : [];
  const categoryOptions = (type,group) => {
    if (type === 'Transfer') return ['Transfer'];
    if (group === 'Data Adjustment') return ['Data Adjustment'];
    try {
      let v;
      if (typeof mmhVaultTransactionCategoryListV451 === 'function') v = mmhVaultTransactionCategoryListV451(type,group);
      else if (typeof txCategoryOptions === 'function') v = txCategoryOptions(type,group);
      return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
    } catch (_) { return []; }
  };
  const choices = type => groups(type).flatMap(group =>
    categoryOptions(type,group).map(category => ({type,group,category})));
  const neutral = (type,group) => {
    if (type === 'Transfer') return 'Transfer';
    if (group === 'Data Adjustment') return 'Data Adjustment';
    const list = categoryOptions(type,group);
    const names = type === 'Income' ? ['Other Income','Other'] :
      type === 'Expense' && group === 'Expense' ? ['Other Expense','Other'] :
      [];
    return names.find(x => list.includes(x)) || null;
  };
  const groupKinds = () => kinds.map(([type,group,label]) => ({type,group,label}));
  function addStyle() {
    if (val('mmhTxFieldPrefsStyleV11')) return;
    const style = document.createElement('style');
    style.id = 'mmhTxFieldPrefsStyleV11';
    style.textContent = `
#transactions .mmh-tx-pref-v11,#mmhManagerCategoriesPanelV445 .mmh-tx-pref-v11{box-sizing:border-box;padding:12px 14px;border:1px solid rgba(203,164,95,.27);border-radius:15px;background:linear-gradient(140deg,rgba(26,44,66,.88),rgba(7,22,42,.82));color:#e9d9b8}
.mmh-tx-pref-v11 label{display:flex;flex-wrap:wrap;align-items:center;gap:10px;font-size:12px;font-weight:700;color:inherit}
.mmh-tx-pref-v11 select{flex:1 1 190px;min-width:0;max-width:100%;min-height:42px;padding:9px 12px;border:1px solid rgba(201,158,80,.33);border-radius:11px;color:#eef4ff;background:#11253b;font:inherit}
.mmh-tx-pref-v11 small{display:block;line-height:1.5;margin-top:7px;color:#c2b393;font-size:11px}
#txForm .mmh-tx-quick-v11,#editTxForm .mmh-tx-quick-v11{min-width:0}
.mmh-tx-quick-v11 select{min-height:44px}
.mmh-tx-pref-hint-v11{grid-column:1/-1;font-size:11px;line-height:1.55;color:#d6bc8d}
.mmh-tx-pref-v11[hidden],.mmh-tx-quick-v11[hidden],.mmh-tx-pref-hint-v11[hidden]{display:none!important}
@media(max-width:650px){#transactions .mmh-tx-pref-v11,#mmhManagerCategoriesPanelV445 .mmh-tx-pref-v11{padding:11px 12px}.mmh-tx-pref-v11 label{display:block}.mmh-tx-pref-v11 select{width:100%;margin-top:6px}}
body.light #transactions .mmh-tx-pref-v11,body.light #mmhManagerCategoriesPanelV445 .mmh-tx-pref-v11{background:#f7f1e7;color:#604b30}
body.light .mmh-tx-pref-v11 small,body.light .mmh-tx-pref-hint-v11{color:#765a3d}`;
    document.head.appendChild(style);
  }
  function makePref(host,origin) {
    if (!host || host.querySelector('[data-tx-pref-v11]')) return;
    const box = document.createElement('div');
    box.className = origin === 'add' ? 'full mmh-tx-pref-v11' : 'mmh-tx-pref-v11';
    box.dataset.txPrefV11 = origin;
    const label = document.createElement('label');
    label.textContent = tr('heading');
    const select = document.createElement('select');
    select.setAttribute('aria-label','Transaction form field preference');
    select.dataset.txPrefSelectV11 = '';
    ORDER.forEach(m => {
      const option = document.createElement('option');
      option.value=m; option.textContent=tr(m); select.appendChild(option);
    });
    select.value=mode();
    select.addEventListener('change',() => setMode(select.value));
    label.appendChild(select);
    const description=document.createElement('small');
    description.textContent=tr('description');
    box.append(label,description);
    host.appendChild(box);
  }
  function setMode(next) {
    const id=owner();
    if (!id || !ORDER.includes(next)) return false;
    try { localStorage.setItem(key(id),next); }
    catch (_) { return false; }
    document.querySelectorAll('[data-tx-pref-select-v11]').forEach(x=>{ x.value=next; });
    refreshAll();
    return true;
  }
  function quick(form,what,labelText) {
    let wrap=form.querySelector('[data-tx-quick-v11="'+what+'"]');
    if (!wrap) {
      wrap=document.createElement('label');
      wrap.className='mmh-tx-quick-v11';
      wrap.dataset.txQuickV11=what;
      wrap.textContent=labelText;
      const select=document.createElement('select');
      select.setAttribute('aria-label',labelText);
      wrap.appendChild(select);
      const grid=form.querySelector('.formgrid');
      const actual=current(form).category?.closest('label');
      if(grid && actual) actual.after(wrap);
      else grid?.appendChild(wrap);
    }
    if(wrap.firstChild?.nodeType===3)wrap.firstChild.nodeValue=labelText;
    wrap.querySelector('select')?.setAttribute('aria-label',labelText);
    return wrap;
  }
  function hint(form) {
    let node=form.querySelector('[data-tx-hint-v11]');
    if (!node) {
      node=document.createElement('small');
      node.className='mmh-tx-pref-hint-v11';
      node.dataset.txHintV11='';
      form.querySelector('.formgrid')?.appendChild(node);
    }
    return node;
  }
  function applyOriginal(form,type,group,category) {
    const c=current(form);
    if(!c.type||!c.group||!c.category||!groups(type).includes(group))return false;
    c.type.value=type;
    if(c.edit) { c.type.onchange?.(); }
    else if(typeof syncTransactionGroup==='function') syncTransactionGroup();
    if(!Array.from(c.group.options).some(x=>x.value===group))return false;
    c.group.value=group;
    if(c.edit) c.group.onchange?.();
    else if(typeof updateCategories==='function') updateCategories();
    if(category!=null) {
      if(!Array.from(c.category.options).some(x=>x.value===category))return false;
      c.category.value=category;
    }
    return true;
  }
  function render(form) {
    const c=current(form);if(!c.type||!c.group||!c.category)return;
    const pref=mode(),type=c.type.value,group=c.group.value,category=c.category.value;
    const typeLabel=c.type.closest('label'), groupLabel=c.group.closest('label'), catLabel=c.category.closest('label');
    const quickCat=quick(form,'category',tr('category')),quickGroup=quick(form,'group',tr('transaction'));
    const hintEl=hint(form);
    const quickCatSelect=quickCat.querySelector('select'),quickGroupSelect=quickGroup.querySelector('select');
    // All old selectors and their values always remain in the DOM for ledger writes.
    typeLabel.style.display=pref==='transaction-category'?'none':'';
    groupLabel.style.display=pref==='type-category'||pref==='transaction-category'?'none':'';
    catLabel.style.display=pref==='type-category'||pref==='type-transaction'?'none':group==='Data Adjustment'?'none':'';
    quickCat.hidden=pref!=='type-category';
    quickGroup.hidden=pref!=='transaction-category';
    hintEl.hidden=true;
    if(pref==='type-category') {
      const all=choices(type);
      quickCatSelect.replaceChildren();
      let selected=-1;
      all.forEach((v,i)=>{
        const option=document.createElement('option');
        option.value=String(i);
        const duplicate=all.filter(x=>x.category===v.category).length>1;
        option.textContent=v.category+(duplicate?' · '+v.group:'');
        quickCatSelect.appendChild(option);
        if(v.group===group&&v.category===category) selected=i;
      });
      // Editing an archived category must not silently choose a different one.
      if(selected<0 && c.edit){
        quickCat.hidden=true;
        groupLabel.style.display='';
        catLabel.style.display='';
        hintEl.textContent=tr('legacy');
        hintEl.hidden=false;
        return;
      }
      if(selected<0 && all.length)selected=0;
      if(selected>=0)quickCatSelect.value=String(selected);
      if(!all.length){quickCat.hidden=true;groupLabel.style.display='';catLabel.style.display='';}
      else if(selected>=0 && (all[selected].group!==group||all[selected].category!==category)) {
        applyOriginal(form,type,all[selected].group,all[selected].category);
      }
      quickCatSelect.onchange=()=>{
        const match=all[Number(quickCatSelect.value)];
        if(match)applyOriginal(form,match.type,match.group,match.category);
      };
      return;
    }
    if(pref==='transaction-category') {
      const all=groupKinds();
      quickGroupSelect.replaceChildren();
      all.forEach((v,i)=>{
        const option=document.createElement('option'); option.value=String(i); option.textContent=tr('kind-'+v.type+'-'+v.group);
        quickGroupSelect.appendChild(option);
        if(v.type===type&&v.group===group) quickGroupSelect.value=String(i);
      });
      quickGroupSelect.onchange=()=>{
        const match=all[Number(quickGroupSelect.value)];
        if(match && applyOriginal(form,match.type,match.group,null))render(form);
      };
      if(group==='Data Adjustment') {
        typeLabel.style.display=''; // Distinguish income/expense for exceptional adjustments.
        hintEl.textContent=tr('adjustment');
        hintEl.hidden=false;
      }
      return;
    }
    if(pref==='type-transaction') {
      const value=neutral(type,group);
      if(group==='Data Adjustment'||type==='Transfer') {
        hintEl.textContent=tr('category')+': '+(category||value||'Transfer')+' ('+tr('automatic')+')';
        hintEl.hidden=false;
      } else if(value) {
        if(!c.edit && value!==category && Array.from(c.category.options).some(x=>x.value===value))
          c.category.value=value;
        hintEl.textContent=tr('categoryUsed')+': '+(c.category.value||value)+' ('+tr('switchAll')+')';
        hintEl.hidden=false;
      } else {
        catLabel.style.display='';
        hintEl.textContent=tr('noNeutral');
        hintEl.hidden=false;
      }
    }
  }
  function validate(form) {
    if(mode()==='all')return true;
    const c=current(form);
    const type=c.type?.value,group=c.group?.value,cat=c.category?.value;
    // An unchanged historical category remains valid on Edit, but not Add.
    const preservedLegacy = c.edit &&
      form.dataset.mmhV11OriginalType===type &&
      form.dataset.mmhV11OriginalGroup===group &&
      form.dataset.mmhV11OriginalCategory===cat &&
      Array.from(c.category.options).some(x=>x.value===cat);
    if(!TYPES.includes(type)||!groups(type).includes(group)||
       (!categoryOptions(type,group).includes(cat)&&!preservedLegacy)) {
      const el=hint(form);
      el.textContent=tr('invalid');
      el.hidden=false;
      c.type.closest('label').style.display='';
      c.group.closest('label').style.display='';
      c.category.closest('label').style.display='';
      return false;
    }
    return true;
  }
  function decorate(form) {
    if(!form || form.dataset.txLayoutInitV11)return;
    form.dataset.txLayoutInitV11='1';
    form.addEventListener('change', e=>{
      const c=current(form);
      if(e.target===c.type||e.target===c.group)
        setTimeout(()=>render(form),0);
      else if(e.target===c.category)setTimeout(()=>render(form,false),0);
    });
    form.addEventListener('submit',e=>{
      if(!validate(form)){e.preventDefault();e.stopImmediatePropagation();}
    },true);
    render(form);
  }
  function refreshPrefCopy() {
    document.querySelectorAll('[data-tx-pref-v11]').forEach(box=>{
      const label=box.querySelector('label');
      if(label?.firstChild?.nodeType===3)label.firstChild.nodeValue=tr('heading');
      const note=box.querySelector('small');
      if(note)note.textContent=tr('description');
      const chooser=box.querySelector('select');
      chooser?.querySelectorAll('option')?.forEach(option=>{
        if(ORDER.includes(option.value))option.textContent=tr(option.value);
      });
    });
  }
  function refreshAll() {
    refreshPrefCopy();
    decorate(val('txForm'));
    decorate(val('editTxForm'));
    if(val('txForm'))render(val('txForm'));
    if(val('editTxForm'))render(val('editTxForm'));
    document.querySelectorAll('[data-tx-pref-select-v11]').forEach(x=>{x.value=mode();});
  }
  function boot() {
    addStyle();
    const form=val('txForm');
    if(form){
      const section=form.querySelector('.formgrid > .mmh-form-section-v1');
      const host=document.createElement('div');
      host.className='full';host.dataset.txPrefHolderV11='';
      section?.after(host);
      makePref(host,'add');
      decorate(form);
    }
    const manage=val('mmhManagerCategoriesPanelV445');
    if(manage)makePref(manage,'manage');
    window.addEventListener('mmhvault:config-owner-changed',refreshAll);
    window.addEventListener('mmhvault:config-cloud-synced',refreshAll);
    window.addEventListener('mmhvault:category-config-changed',refreshAll);
    window.addEventListener('mmhvault-language-change',refreshAll);
  }
  window.MMHV11TxFieldPrefs = {
    version:'1.0.0',getMode:mode,setMode,
    attachEdit:()=>decorate(val('editTxForm')),
    refresh:refreshAll,label:tr,groups,choices,neutral,groupKinds,validate
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();