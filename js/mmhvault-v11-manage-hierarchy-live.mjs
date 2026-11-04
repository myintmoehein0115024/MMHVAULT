/* MMHVAULT APP V11.7 — Type → Transaction → Category.
 * Draft integration candidate, requires cloud-config schema adapter + browser QA.
 * Preserves the canonical ledger values used by balance and Analyze calculations.
 */
import {createHierarchyController} from './mmhvault-v11-manage-hierarchy-controller.mjs';
import {ledgerKind,canAddItem,regularLedgerKind} from './mmhvault-v11-manage-hierarchy-model.mjs';
import {verifyStoredCloudLink} from './mmhvault-v11-manage-hierarchy-sync.mjs';
(()=>{
'use strict';
if(window.MMHV11HierarchyLive)return;
const $=id=>document.getElementById(id);
const owner=()=>{try{return String(currentSessionUser?.id||'')}catch(_){return''}};
const configOwner=()=>{try{return String(MMHVAULT_CONFIG_OWNER||'')}catch(_){return''}};
const config=()=>{try{return MMHVAULT_CONFIG}catch(_){return null}};
const language=()=>{try{return String(localStorage.getItem('mmhvault_language_v3363')||document.documentElement.lang||'en').toLowerCase()}catch(_){return'en'}};
const tr=(en,zh,my)=>language().startsWith('zh')?zh:/^(my|mm|burmese)/.test(language())?my:en;
const label=field=>field==='type'?'Type':field==='transaction'?'Transaction':'Category';
const directionLabel=type=>type==='Income'?tr('Money increases (+)','资金增加（+）','ငွေတိုး (+)'):
  type==='Expense'?tr('Money decreases (−)','资金减少（−）','ငွေလျော့ (−)'):
  type==='Transfer'?tr('Move between accounts (− / +)','账户之间转账（一减一加）',
    'အကောင့်အချင်းချင်း ငွေလွှဲ (− / +)'):
  tr('Direction not set','未设置收支方向','အမျိုးအစား မရွေးရသေးပါ');
const meaning=id=>{
  const dict={'Income|Income':['Income','普通收入','ဝင်ငွေ'],'Expense|Expense':['Expense','普通支出','အသုံးစရိတ်'],
    'Expense|Personal':['Personal','个人支出','ကိုယ်ရေးအသုံး'],'Income|Loans':['Loan Income','借款收入','ချေးငွေဝင်ငွေ'],
    'Expense|Loans':['Loan Expense','借出支出','ချေးငွေအသုံး'],'Transfer|Transfer':['Transfer','转账','ငွေလွှဲ'],
    'Income|Data Adjustment':['Income Adjustment','收入调整','ဝင်ငွေပြင်ဆင်'],
    'Expense|Data Adjustment':['Expense Adjustment','支出调整','အသုံးစရိတ်ပြင်ဆင်']};
  return tr(...(dict[id]||[id,id,id]));
};
const elt=(tag,klass,text)=>{
  const node=document.createElement(tag);if(klass)node.className=klass;if(text!=null)node.textContent=text;return node;
};
const btn=(value,callback,klass='')=>{
  const node=elt('button',klass,value);node.type='button';node.addEventListener('click',callback);return node;
};
const makeOption=(value,name,key)=>{
  const node=elt('option','',name);node.value=value;
  if(key)node.dataset.mmhChoiceId=key;
  return node;
};
// New Manage choices must never silently inherit the first financial
// meaning or parent. Empty placeholders make every calculation rule and
// Type → Transaction → Category link an explicit owner decision.
const requireSelection=(select,prompt)=>{
  select.required=true;
  const placeholder=makeOption('',prompt);
  placeholder.disabled=true;placeholder.selected=true;
  select.append(placeholder);
  return select;
};
const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?
  'hier_'+crypto.randomUUID():'hier_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);
let loadedOwner='',historyReady=false,overlay=null,modalField='',selection={type:'',transaction:'',category:''};
let pendingSave=null,rendering=false,queued=false,returnFocus=null;
let linkSync=null,checkingCloud=false,cloudCheckOwner='',cloudCheckGeneration=0,cloudConflict=false;
const host={
  currentOwner:owner,configOwner,currentConfig:config,
  history:()=>{
    const rows=Array.isArray(window.transactions)?window.transactions:[];
    const verified=historyReady&&loadedOwner===owner()&&
      window.mmhWalletDataOwnerV191===owner()&&
      rows.every(row=>row?.user_id===owner());
    return {ownerId:loadedOwner,loaded:verified,rows};
  },
  newId:uid,
  persist:(id,cfg)=>{
    if(owner()!==id||configOwner()!==id||cfg!==config())
      throw Error('Account changed; settings not saved');
    if(typeof mmhVaultPersistConfig!=='function')throw Error('Settings save unavailable');
    mmhVaultPersistConfig();
    try{if(typeof mmhVaultRebuildConfigArrays==='function')mmhVaultRebuildConfigArrays();}
    catch(error){console.warn('[MMHVAULT] Category selector rebuild deferred',error);}
  },
  changed:()=>{schedule();window.dispatchEvent(new Event('mmhvault:category-config-changed'))}
};
const controller=createHierarchyController(host);
const safe=(fn,fallback=null)=>{try{return fn()}catch(error){console.warn('[MMHVAULT] Manage safety guard',error);return fallback}};
const notify=(msg)=>{
  try{if(typeof mmhVaultCustomMessageV449==='function'){
    mmhVaultCustomMessageV449(tr('Manage Transaction Fields','管理记账字段','ငွေစာရင်း အကွက်စီမံရန်'),msg);return;
  }}catch(_){}
  const target=$('mmhHierarchyNotice');if(target){target.textContent=msg;target.hidden=!msg}
};
const ready=()=>owner()&&owner()===configOwner()&&loadedOwner===owner()&&historyReady;
const attempt=(action,success)=>{
  if(!ready()){notify(tr('Finish loading your account first.','请等账号数据加载完成后再操作。','အကောင့်ဒေတာ ပြည့်စုံအောင် စောင့်ပါ။'));return false;}
  try{action();if(success)success();schedule();return true}
  catch(error){notify(String(error?.message||'Could not save this change.'));return false;}
};
function style(){
  if($('mmhHierarchyStyle'))return;
  const css=elt('style');css.id='mmhHierarchyStyle';
  css.textContent=`
  #mmhManagerCategoriesPanelV445.mmh-hierarchy-active>.mmh-manager-card-v445,
  #mmhManagerCategoriesPanelV445.mmh-hierarchy-active>#mmhV12Manage,
  #mmhManagerCategoriesPanelV445.mmh-hierarchy-active>#mmhV14Manage{display:none!important}
  /* V141's six fixed Transaction Kind buttons are legacy shortcuts,
     NOT owner-created Manage choices. They must never appear as presets
     in the V11.7 Type → Transaction → Category workflow. Leave the
     underlying V141 field-layout helper intact for ledger compatibility. */
  #txForm #txSmartV141{display:none!important}
  #txForm #mmhHierarchyEntryGuide{grid-column:1/-1;margin:0;padding:10px 13px;border:1px solid rgba(215,184,121,.27);border-radius:11px;background:rgba(24,42,61,.75);color:#e9d5ab;font-size:12px;line-height:1.6}
  #txForm #mmhHierarchyEntryGuide[hidden]{display:none!important}
  .mmh-hier-summary{padding:18px;border:1px solid rgba(208,175,117,.25);border-radius:17px;background:linear-gradient(130deg,rgba(18,37,57,.75),rgba(17,27,44,.48));color:#f4eedf;box-shadow:0 16px 38px rgba(0,0,0,.12)}
  .mmh-hier-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
  .mmh-hier-top h3{margin:0 0 4px;font-size:16px}
  .mmh-hier-muted{font-size:12px;color:#aebbd0;line-height:1.6}
  .mmh-hier-step{font-size:12px;color:#d7b879;border:1px solid rgba(215,184,121,.38);border-radius:30px;padding:7px 11px}
  .mmh-hier-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:17px}
  .mmh-hier-card{border:1px solid rgba(193,198,209,.16);border-radius:14px;background:rgba(36,54,79,.4);padding:15px;display:flex;flex-direction:column;gap:8px;min-width:0}
  .mmh-hier-card h4{margin:0;font-size:14px}
  .mmh-hier-examples{font-size:12px;color:#c7d1dc;overflow-wrap:anywhere;min-height:30px}
  .mmh-hier-btn{color:#efdfbd;border:1px solid rgba(222,179,98,.47);background:rgba(208,165,86,.1);border-radius:10px;padding:9px 11px;font-weight:650;cursor:pointer}
  .mmh-hier-btn:disabled{opacity:.43;cursor:not-allowed}
  .mmh-hier-danger{color:#ffd1d5;border-color:rgba(249,142,155,.3)}
  .mmh-hier-empty{font-size:12px;color:#b6bfd0;margin:13px 0}
  .mmh-hier-overlay{position:fixed;inset:0;z-index:2147482500;background:rgba(3,9,19,.8);display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) 14px max(16px,env(safe-area-inset-bottom));backdrop-filter:blur(14px)}
  .mmh-hier-dialog{width:min(520px,100%);max-height:calc(100dvh - 32px);overflow:auto;border:1px solid rgba(224,181,104,.3);border-radius:22px;background:linear-gradient(150deg,#17283d,#101927);color:#f2eadc;padding:22px;box-shadow:0 24px 85px rgba(0,0,0,.5)}
  .mmh-hier-dialog header{display:flex;align-items:center;justify-content:space-between;gap:10px}
  .mmh-hier-dialog h3{font-size:18px;margin:0}
  .mmh-hier-close{font-size:23px;min-width:36px;min-height:36px}
  .mmh-hier-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid rgba(207,214,225,.12)}
  .mmh-hier-row strong{font-size:13px;overflow-wrap:anywhere}
  .mmh-hier-actions{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}
  .mmh-hier-actions .mmh-hier-btn{padding:6px 8px;font-size:11px}
  .mmh-hier-form{display:grid;gap:13px;padding-top:15px}
  .mmh-hier-form label{display:grid;gap:6px;font-size:12px;color:#b9c7d8}
  .mmh-hier-form .mmh-hier-help{font-size:12px;color:#b9c7d8;line-height:1.55;margin:0}
  .mmh-hier-form input[type="text"],.mmh-hier-form select{width:100%;min-width:0;padding:12px;border-radius:10px;border:1px solid rgba(196,202,219,.28);background:#24354d;color:#fff}
  .mmh-hier-form label.mmh-hier-toggle{display:flex;flex-direction:row;align-items:center;gap:10px;cursor:pointer}
  .mmh-hier-form label.mmh-hier-toggle input{width:17px;height:17px;accent-color:#d7b879}
  .mmh-hier-form [hidden]{display:none!important}
  .mmh-hier-footer{display:flex;justify-content:flex-end;gap:9px;margin-top:14px}
  #mmhHierarchyNotice[hidden]{display:none!important}
  #txForm .mmh-hier-field:disabled{opacity:.52}
  body.mmh-hier-modal-open{overflow:hidden}
  @media(max-width:700px){.mmh-hier-cards{grid-template-columns:minmax(0,1fr)}.mmh-hier-dialog{padding:16px;border-radius:17px}.mmh-hier-row{align-items:flex-start;flex-direction:column}.mmh-hier-actions{justify-content:flex-start}}
  body.light .mmh-hier-summary{color:#263448;background:linear-gradient(130deg,#fffaf0,#f3f6fa)}
  body.light .mmh-hier-card{background:#fff;color:#263448}body.light .mmh-hier-muted,body.light .mmh-hier-examples{color:#5f7084}
  `;
  document.head.append(css);
}
function close(restore=true){
  if(!overlay)return;
  overlay.remove();overlay=null;document.body.classList.remove('mmh-hier-modal-open');
  if(restore){const target=returnFocus;returnFocus=null;if(target?.isConnected)target.focus?.();}
}
function open(field){
  if(!ready())return notify(tr('Account data is still loading.','账号数据仍在加载。','အကောင့်ဒေတာ ပြန်ရယူနေပါသည်။'));
  returnFocus=document.activeElement;
  modalField=field;drawModal();
}
function drawModal(){
  if(!ready()){close();return;}
  close(false);
  const overlayNode=elt('div','mmh-hier-overlay'),dialog=elt('section','mmh-hier-dialog');
  overlayNode.append(dialog);
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
  const head=elt('header'),title=elt('h3','',tr('Manage ','管理 ','စီမံရန် ')+label(modalField));
  title.id='mmhHierarchyDialogTitle';dialog.setAttribute('aria-labelledby',title.id);
  head.append(title,btn('×',close,'mmh-hier-btn mmh-hier-close'));dialog.append(head);
  const explain=elt('p','mmh-hier-muted',tr(
    'Used items can only be archived. Archiving hides future choices, not saved history.',
    '已有交易使用过的项目只能归档。归档只隐藏未来的选项，不影响历史记录。',
    'အသုံးပြုပြီးသော အရာများကို သိမ်းဆည်းနိုင်ပြီး မှတ်တမ်းဟောင်းများ မပြောင်းပါ။'));
  dialog.append(explain);
  const graph=controller.read();
  const items=graph[modalField==='type'?'types':modalField==='transaction'?'transactions':'categories'];
  if(!items.length)dialog.append(elt('p','mmh-hier-empty',tr('Nothing added yet','尚未添加项目','မထည့်ရသေးပါ')));
  for(const item of items){
    const row=elt('div','mmh-hier-row'),text=elt('div');
    text.append(elt('strong','',item.label));
    let parentInfo='';
    if(modalField==='transaction')parentInfo=graph.types.find(x=>x.id===item.parentId)?.label||'';
    if(modalField==='category')parentInfo=graph.transactions.find(x=>x.id===item.parentId)?.label||'';
    const effectiveType=modalField==='type'?item:modalField==='transaction'?
      graph.types.find(x=>x.id===item.parentId):graph.types.find(x=>
        x.id===graph.transactions.find(t=>t.id===item.parentId)?.parentId);
    text.append(elt('div','mmh-hier-muted',[
      parentInfo,directionLabel(effectiveType?.ledgerType),
      item.archived?tr('Archived','已归档','သိမ်းပြီး'):tr('Active','使用中','အသုံးပြုနေ')
    ].filter(Boolean).join(' · ')));
    row.append(text);
    const actions=elt('div','mmh-hier-actions');
    if(item.archived)actions.append(btn(tr('Restore','恢复','ပြန်ယူ'),()=>attempt(()=>controller.archive(modalField,item.id,false),drawModal),'mmh-hier-btn'));
    else{
      const used=controller.status(modalField,item.id);
      if(used==='unused'){
        actions.append(btn(tr('Edit','编辑','ပြင်'),()=>drawEditor(item),'mmh-hier-btn'));
        actions.append(btn(tr('Delete','删除','ဖျက်'),()=>drawDelete(item),'mmh-hier-btn mmh-hier-danger'));
      }
      actions.append(btn(tr('Archive','归档','သိမ်း'),()=>attempt(()=>controller.archive(modalField,item.id,true),drawModal),'mmh-hier-btn'));
    }
    row.append(actions);dialog.append(row);
  }
  const add=btn(tr('+ Add ','+ 添加 ','+ ထည့်ရန် ')+label(modalField),()=>drawEditor(null),'mmh-hier-btn');
  add.disabled=!canAddItem(graph,owner(),modalField);dialog.append(add);
  if(add.disabled)dialog.append(elt('p','mmh-hier-muted',modalField==='transaction'?tr(
    'Create a Type first to link this Transaction.',
    '请先添加 Type，再关联 Transaction。',
    'Transaction မထည့်မီ Type ကို ထည့်ပါ။'):tr(
    'Create a Transaction first to link this Category.',
    '请先添加 Transaction，再关联 Category。',
    'Category မထည့်မီ Transaction ကို ထည့်ပါ။')));
  overlayNode.addEventListener('click',e=>{if(e.target===overlayNode)close()});
  overlayNode.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();close();return;}
    if(e.key!=='Tab')return;
    const focusable=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]')];
    if(!focusable.length){e.preventDefault();dialog.focus();return;}
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){
      e.preventDefault();last.focus();
    }else if(!e.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){
      e.preventDefault();first.focus();
    }
  });
  overlay=overlayNode;document.body.append(overlay);document.body.classList.add('mmh-hier-modal-open');
  head.querySelector('button')?.focus();
}
function drawDelete(item){
  if(!overlay)return;
  const dialog=overlay.querySelector('.mmh-hier-dialog');dialog.replaceChildren();
  const title=elt('h3','',tr('Delete unused item?','删除未使用的项目？','မသုံးရသေးသော အရာကိုဖျက်မလား'));
  title.id='mmhHierarchyDialogTitle';dialog.append(title);
  dialog.append(elt('p','mmh-hier-muted',item.label));
  const footer=elt('div','mmh-hier-footer');
  footer.append(btn(tr('Cancel','取消','မလုပ်တော့'),drawModal,'mmh-hier-btn'));
  footer.append(btn(tr('Delete','确认删除','ဖျက်'),()=>attempt(()=>controller.delete(modalField,item.id),drawModal),'mmh-hier-btn mmh-hier-danger'));
  dialog.append(footer);footer.querySelector('button')?.focus();
}
function drawEditor(item){
  if(!overlay)return;
  const field=modalField,graph=controller.read();
  const dialog=overlay.querySelector('.mmh-hier-dialog');dialog.replaceChildren();
  const title=elt('h3','',tr(item?'Edit ':'Add ',item?'编辑 ':'添加 ',item?'ပြင်ရန် ':'အသစ်ထည့်ရန် ')+label(field));
  title.id='mmhHierarchyDialogTitle';dialog.append(title);
  const form=elt('form','mmh-hier-form');
  const control=(title,node)=>{
    const l=elt('label');l.append(elt('span','',title),node);form.append(l);return node;
  };
  const name=elt('input');name.type='text';name.maxLength=40;name.required=true;
  name.value=item?.label||'';
  control(tr('Name','名称','အမည်'),name);
  let typeChoice=null,parentChoice=null,kindChoice=null,advancedToggle=null;
  const calculationHelp=()=>form.append(elt('p','mmh-hier-help',tr(
    'These are calculation rules, not preset Type or Transaction entries. Choose the real financial direction before saving.',
    '这些只是金额计算规则，不是系统预设的 Type 或 Transaction 项目。保存前请选择正确的收支方向。',
    'ဤအရာများသည် ငွေပမာဏတွက်ချက်ရန် စည်းမျဉ်းများသာဖြစ်ပြီး ကြိုတင်ထည့်ထားသော Type / Transaction များ မဟုတ်ပါ။'
  )));
  if(!item&&field==='type'){
    typeChoice=requireSelection(elt('select'),tr(
      'Choose income, expense or transfer…','请选择收入、支出或转账…','ဝင်ငွေ၊ အသုံးစရိတ် သို့မဟုတ် ငွေလွှဲကို ရွေးပါ…'));
    for(const type of ['Income','Expense','Transfer'])
      typeChoice.append(makeOption(type,tr(type,type==='Income'?'收入':type==='Expense'?'支出':'转账',
        type==='Income'?'ဝင်ငွေ':type==='Expense'?'အသုံးစရိတ်':'ငွေလွှဲ'),type));
    control(tr('Balance direction','收支方向（用于余额计算）','ငွေလက်ကျန်တွက်ချက်မှု အမျိုးအစား'),typeChoice);
    calculationHelp();
  }
  if(!item&&field==='transaction'){
    parentChoice=requireSelection(elt('select'),tr(
      'Choose a Type to link…','请选择要关联的 Type…','ချိတ်ဆက်မည့် Type ကို ရွေးပါ…'));
    for(const type of graph.types.filter(x=>!x.archived))
      parentChoice.append(makeOption(type.id,type.label+' · '+directionLabel(type.ledgerType),type.id));
    control(tr('Linked Type','关联 Type','ချိတ်ဆက်ထားသော Type'),parentChoice);
    const inherited=elt('p','mmh-hier-help',tr(
      'Choose a Type first. Its financial direction is inherited automatically.',
      '请先选择 Type。资金增减方向将自动继承 Type。',
      'Type ကို ရွေးပါ။ ငွေတိုး/လျော့သည် Type အတိုင်း ဖြစ်ပါမည်။'));
    inherited.setAttribute('role','status');form.append(inherited);
    advancedToggle=elt('input');advancedToggle.type='checkbox';advancedToggle.disabled=true;
    const toggleLabel=elt('label','mmh-hier-toggle');
    toggleLabel.append(advancedToggle,elt('span','',tr(
      'Special accounting purpose (loans / adjustments)',
      '特殊记账用途（借款 / 余额调整）',
      'အထူးစာရင်းအမျိုးအစား (ချေးငွေ / ညှိနှိုင်းမှု)')));
    form.append(toggleLabel);
    kindChoice=requireSelection(elt('select'),tr(
      'Choose special accounting purpose…','请选择特殊记账用途…',
      'အထူးစာရင်းအမျိုးအစား ရွေးပါ…'));
    const kindLabel=control(tr('Special accounting purpose','特殊记账用途',
      'အထူးစာရင်းအမျိုးအစား'),kindChoice).closest('label');
    kindLabel.hidden=true;
    form.append(elt('p','mmh-hier-help',tr(
      'Ordinary income/expense/transfer follows Type; enable the option above only for special accounting. This never reverses Type direction.',
      '普通收入、支出、转账自动继承 Type；仅借款、调整等特殊交易需要开启上方选项，且不能改变 Type 的资金方向。',
      'သာမန် ဝင်ငွေ၊ အသုံးစရိတ်နှင့် ငွေလွှဲသည် Type ကို လိုက်နာသည်။ အထူးစာရင်းအတွက်သာ အထက်ပါ ရွေးချယ်မှုကိုဖွင့်ပါ။')));
    const redrawKinds=()=>{
      const parent=graph.types.find(x=>x.id===parentChoice.value);
      inherited.textContent=parent?
        tr('Balance effect: ','资金变化：','ငွေလက်ကျန်: ')+directionLabel(parent.ledgerType):
        tr('Choose a Type first. Its financial direction is inherited automatically.',
          '请先选择 Type。资金增减方向将自动继承 Type。',
          'Type ကို ရွေးပါ။ ငွေတိုး/လျော့သည် Type အတိုင်း ဖြစ်ပါမည်။');
      kindChoice.replaceChildren();
      requireSelection(kindChoice,tr('Choose special accounting purpose…',
        '请选择特殊记账用途…','အထူးစာရင်းအမျိုးအစား ရွေးပါ…'));
      const regular=parent?regularLedgerKind(parent.ledgerType):null;
      let extras=0;
      for(const id of ['Income|Income','Expense|Expense','Expense|Personal','Income|Loans','Expense|Loans',
          'Transfer|Transfer','Income|Data Adjustment','Expense|Data Adjustment']){
        const kind=ledgerKind(id);
        if(parent&&kind?.type===parent.ledgerType&&id!==regular){
          kindChoice.append(makeOption(id,meaning(id),id));extras++;
        }
      }
      advancedToggle.disabled=!parent||extras===0;
      if(advancedToggle.disabled)advancedToggle.checked=false;
      kindLabel.hidden=!advancedToggle.checked;
      kindChoice.disabled=!advancedToggle.checked;
      kindChoice.required=advancedToggle.checked;
    };
    advancedToggle.addEventListener('change',redrawKinds);
    parentChoice.addEventListener('change',()=>{
      advancedToggle.checked=false;redrawKinds();
    });
    redrawKinds();
  }
  if(!item&&field==='category'){
    parentChoice=requireSelection(elt('select'),tr(
      'Choose a Transaction to link…','请选择要关联的 Transaction…','ချိတ်ဆက်မည့် Transaction ကို ရွေးပါ…'));
    for(const t of graph.transactions.filter(x=>!x.archived&&
      graph.types.some(type=>type.id===x.parentId&&!type.archived))){
      const parent=graph.types.find(x=>x.id===t.parentId);
      parentChoice.append(makeOption(t.id,(parent?.label||'')+' → '+t.label,t.id));
    }
    control(tr('Linked Transaction','关联 Transaction','ချိတ်ဆက်ထားသော Transaction'),parentChoice);
    // Existing native financial reports encode Transfer and Data Adjustment
    // with fixed canonical Category labels. Guide the owner in the modal,
    // rather than accepting a free-form name that cannot be saved. This
    // only fills the unsaved input AFTER explicit parent selection and
    // never seeds a Category into the owner configuration.
    const fixedHelp=elt('p','mmh-hier-help');fixedHelp.hidden=true;form.append(fixedHelp);
    let previousFixed='';
    const updateFixedCategory=()=>{
      if(previousFixed&&name.readOnly&&name.value===previousFixed)name.value='';
      name.readOnly=false;previousFixed='';
      const tx=graph.transactions.find(x=>x.id===parentChoice.value);
      const group=ledgerKind(tx?.kindId)?.categoryGroup||'';
      const requiredName=group==='Transfer'?'Transfer':
        group==='Data Adjustment'?'Data Adjustment':'';
      fixedHelp.hidden=!requiredName;
      fixedHelp.textContent=requiredName?tr(
        'This special accounting purpose uses the fixed Category “'+requiredName+
        '” for compatibility with existing financial reports. It is created only after you press Save.',
        '此特殊记账用途需要使用固定 Category“'+requiredName+
        '”，以保护现有财务报表。只有点击 Save 后才会真正创建。',
        'ဤအထူးစာရင်းအတွက် Category အမည် “'+requiredName+
        '” ကိုသာ အသုံးပြုပါ။ Save နှိပ်မှသာ ဖန်တီးမည်။'):'';
      if(requiredName){name.value=requiredName;name.readOnly=true;previousFixed=requiredName;}
    };
    parentChoice.addEventListener('change',updateFixedCategory);
    updateFixedCategory();
  }
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const value=name.value.trim();
    if(!value||!form.checkValidity())return;
    // HTML form validity can be bypassed by programmatic submit events.
    // Recheck that every new financial mapping is explicitly selected.
    if(!item&&((field==='type'&&!typeChoice?.value)||
      (field==='transaction'&&(!parentChoice?.value||(advancedToggle?.checked&&!kindChoice?.value)))||
      (field==='category'&&!parentChoice?.value)))return;
    attempt(()=>{
      if(item)controller.rename(field,item.id,value);
      else if(field==='type')controller.addType(value,typeChoice.value);
      else if(field==='transaction'){
        const linkedType=graph.types.find(x=>x.id===parentChoice.value);
        const purpose=advancedToggle.checked?kindChoice.value:
          regularLedgerKind(linkedType?.ledgerType);
        if(!purpose)throw Error('Select a valid Type before saving');
        controller.addTransaction(value,parentChoice.value,purpose);
      }else controller.addCategory(value,parentChoice.value);
    },drawModal);
  });
  const footer=elt('div','mmh-hier-footer');
  footer.append(btn(tr('Cancel','取消','မလုပ်တော့'),drawModal,'mmh-hier-btn'));
  const save=elt('button','mmh-hier-btn',tr('Save','保存','သိမ်း'));save.type='submit';footer.append(save);
  form.append(footer);dialog.append(form);name.focus();
}
function manager(){
  const host=$('mmhManagerCategoriesPanelV445');
  if(!host)return;
  if(!owner()||owner()!==configOwner()){
    host.classList.remove('mmh-hierarchy-active');$('mmhHierarchyManage')?.remove();close();return;
  }
  style();host.classList.add('mmh-hierarchy-active');
  let root=$('mmhHierarchyManage');
  if(!root){root=elt('section','mmh-hier-summary');root.id='mmhHierarchyManage';host.prepend(root);}
  root.replaceChildren();
  const top=elt('div','mmh-hier-top'),heading=elt('div');
  heading.append(elt('h3','',tr('Manage Transaction Fields','管理记账字段','ငွေစာရင်းအကွက်များ စီမံရန်')));
  heading.append(elt('span','mmh-hier-muted',tr(
    'Step 1 Type → Step 2 Transaction → Step 3 Category',
    '第 1 步 Type → 第 2 步 Transaction → 第 3 步 Category',
    'Type → Transaction → Category')));
  top.append(heading,elt('span','mmh-hier-step',ready()?
    tr('Linked setup','关联管理','ချိတ်ဆက်စီမံ'):tr('Loading account','正在加载账号','အကောင့်ပြန်ရယူနေ')));root.append(top);
  const cards=elt('div','mmh-hier-cards');root.append(cards);
  const graph=safe(()=>controller.read());
  for(const field of ['type','transaction','category']){
    const card=elt('article','mmh-hier-card'),items=graph?.[field==='type'?'types':field==='transaction'?'transactions':'categories']||[];
    card.append(elt('h4','',label(field)+' · '+items.filter(x=>!x.archived).length));
    const snippets=items.filter(x=>!x.archived).slice(0,3).map(x=>
      field==='type'?x.label+' ('+
        (x.ledgerType==='Income'?'+':x.ledgerType==='Expense'?'−':'⇄')+')':
        x.label).join(' · ');
    card.append(elt('div','mmh-hier-examples',snippets||tr('No items yet','尚未添加','မရှိသေးပါ')));
    const manage=btn(tr('Manage','管理','စီမံရန်'),()=>open(field),'mmh-hier-btn');
    manage.disabled=!ready()||cloudConflict;card.append(manage);cards.append(card);
  }
  root.append(elt('p','mmh-hier-muted',tr(
    'Type sets account balance direction (+ / − / transfer). Transaction inherits it; Category is only a name.',
    'Type 决定账户余额增加、减少或转账；Transaction 自动继承，Category 只负责分类。',
    'Type သည် အကောင့်ငွေလက်ကျန် တိုး/လျော့/လွှဲခြင်းကို သတ်မှတ်ပြီး Transaction မှ လိုက်နာပါသည်။')));
  root.append(elt('p','mmh-hier-muted',tr(
    'Already-used options: Archive only. Historical transactions are never changed.',
    '已使用的项目只能归档；历史交易记录始终保留。',
    'မှတ်တမ်းဟောင်းများကို မပြောင်းဘဲ အသုံးပြုပြီးသော အရာများကို သိမ်းနိုင်ပါသည်။')));
  if(cloudConflict&&owner()===configOwner()){
    const warning=elt('p','mmh-hier-muted',tr(
      'Another device has different saved Manage links. Changes are paused to protect your transaction history. Do not enter duplicate transactions. Contact support for safe reconciliation.',
      '另一台设备的记账关联与本机不同。为了保护历史交易，已暂停修改。请勿重复记账，并联系客服处理同步冲突。',
      'အခြားစက်၏ Manage ချိတ်ဆက်မှုများ မတူပါ။ မှတ်တမ်းဟောင်းများကို ကာကွယ်ရန် ပြင်ဆင်မှုကို ယာယီရပ်ထားပါသည်။ ထပ်မံမှတ်တမ်းမထည့်ပါနှင့်။ အကူအညီယူပါ။'));
    warning.setAttribute('role','alert');warning.id='mmhHierarchyCloudConflict';root.append(warning);
  }
  // A confirmed ledger insert and its configuration-sidecar cloud write are
  // separate operations. Show verification truthfully, never imply atomicity.
  if(linkSync?.owner===owner()){
    const status=elt('div','mmh-hier-muted');status.setAttribute('role','status');
    const verified=linkSync.state==='verified';
    const needsLink=linkSync.state==='needs-link';
    status.append(elt('span','',verified?tr(
      'Last transaction link: cloud verified.',
      '最近交易关联：已核对云端记录。',
      'နောက်ဆုံး မှတ်တမ်းချိတ်ဆက်မှုကို cloud တွင် စစ်ဆေးပြီးပါပြီ။'):needsLink?tr(
      'Transaction saved; its Manage link was not stored. Retry linking without creating another transaction.',
      '交易已保存，但关联没有保存。可重新关联，不会再次创建交易。',
      'မှတ်တမ်း သိမ်းပြီး၊ ချိတ်ဆက်မှုကို မှတ်မထားပါ။ ထပ်မံမှတ်တမ်းမဖန်တီးဘဲ ပြန်ချိတ်ပါ။'):tr(
      'Transaction saved; Manage link is awaiting cloud verification.',
      '交易已保存；Manage 关联尚待云端核对。',
      'မှတ်တမ်း သိမ်းပြီး၊ Manage ချိတ်ဆက်မှု cloud စစ်ဆေးရန် ကျန်ပါသည်။')));
    if(!verified){
      const retry=btn(needsLink?tr('Retry link','重新关联','ပြန်ချိတ်ပါ'):
        tr('Recheck sync','重新核对同步','ထပ်မံစစ်ဆေးရန်'),()=>{
        if(linkSync?.state==='needs-link')retryConfirmedLink(linkSync);
        else void verifyCloudLink(linkSync);
      },'mmh-hier-btn');
      retry.disabled=checkingCloud;status.append(retry);
    }
    root.append(status);
  }
  const notice=elt('div','mmh-hier-muted');notice.id='mmhHierarchyNotice';notice.hidden=true;root.append(notice);
}
const selected=(el)=>el?.selectedOptions?.[0]?.dataset?.mmhChoiceId||'';
const labels=()=>({type:$('txType')?.closest('label'),transaction:$('txGroup')?.closest('label'),category:$('txCategory')?.closest('label')});
// Never silently substitute the first remaining Category/Transaction if
// another device or Archive invalidates a previously chosen path. An explicit
// choice is required at every level before the native ledger form can save.
const choicePrompt=field=>tr('Select '+label(field)+'…','请选择 '+label(field)+'…',
  label(field)+' ကို ရွေးပါ…');
const optionSig=(el,items,prompt)=>el&&el.options.length===items.length+1&&
  el.options[0].value===''&&el.options[0].disabled&&el.options[0].textContent===prompt&&
  items.every((item,i)=>{
    const x=el.options[i+1];
    return x.value===item.value&&x.textContent===item.text&&x.dataset.mmhChoiceId===item.id;
  });
function put(el,items,pick,field){
  if(!el)return;
  if(!items.length){if(el.options.length)el.replaceChildren();return;}
  const prompt=choicePrompt(field);
  if(!optionSig(el,items,prompt)){
    const placeholder=makeOption('',prompt);
    placeholder.disabled=true;
    el.replaceChildren(placeholder,...items.map(x=>makeOption(x.value,x.text,x.id)));
  }
  const index=pick?[...el.options].findIndex(x=>x.dataset.mmhChoiceId===pick):-1;
  // index 0 is the disabled placeholder, never an inferred financial choice.
  el.selectedIndex=index>0?index:0;
}
function form(){
  const t=$('txType'),g=$('txGroup'),c=$('txCategory'),f=$('txForm');
  if(!t||!g||!c||!f||rendering)return;
  rendering=true;
  try{
    const save=f.querySelector('.actions button:not([type="button"])');
    // Show an honest empty-state before any options exist. Do not infer
    // Income from legacy V141 shortcuts or re-seed archived options.
    let guide=$('mmhHierarchyEntryGuide');
    if(!guide){
      guide=elt('p');guide.id='mmhHierarchyEntryGuide';
      guide.setAttribute('role','status');
      t.closest('label')?.before(guide);
    }
    if(!ready()){
      guide.hidden=false;
      guide.textContent=tr('Loading your saved transaction settings…',
        '正在加载您的记账设置…','သင့်ငွေစာရင်း ရွေးချယ်မှုများ ဖတ်နေပါသည်…');
      for(const s of [t,g,c]){s.replaceChildren();s.disabled=true;}
      if(save)save.disabled=true;
      return;
    }
    const activeTypes=controller.list('type');
    // Only a complete, unarchived owner-authored path can become a new
    // entry. Historical archived choices remain in the ledger untouched.
    const hasCompletePath=activeTypes.some(type=>
      controller.list('transaction',type.id).some(tx=>
        controller.list('category',tx.id).length>0));
    guide.hidden=hasCompletePath;
    guide.textContent=hasCompletePath?'':tr(
      'No active Type → Transaction → Category setup. Open Manage to add or restore your own choices; no preset transaction types will be added.',
      '目前没有可用的 Type → Transaction → Category 关联。请在 Manage 新增或恢复您自己的分类；系统不会自动添加预设类型。',
      'အသုံးပြုနိုင်သော Type → Transaction → Category မရှိသေးပါ။ Manage တွင် ကိုယ်ပိုင်အမျိုးအစားများ ထည့်ပါ သို့မဟုတ် ပြန်ဖွင့်ပါ။');
    const types=activeTypes.map(x=>({id:x.id,value:x.ledgerType,text:x.label}));
    put(t,types,selection.type,'type');selection.type=selected(t);
    const txns=selection.type?controller.list('transaction',selection.type).map(x=>({
      id:x.id,value:ledgerKind(x.kindId)?.group||'',text:x.label})).filter(x=>x.value):[];
    put(g,txns,selection.transaction,'transaction');selection.transaction=selected(g);
    const cats=selection.transaction?controller.list('category',selection.transaction)
      .map(x=>({id:x.id,value:x.label,text:x.label})):[];
    put(c,cats,selection.category,'category');selection.category=selected(c);
    // A user-configured hierarchy has no default Category, including
    // Transfer. Explain the missing prerequisite instead of leaving an
    // apparently broken empty dropdown or silently adding preset data.
    let categoryHint=$('mmhHierarchyCategoryHint');
    const categoryLabel=c.closest('label');
    if(!categoryHint&&categoryLabel){
      categoryHint=elt('span','mmh-hier-muted');
      categoryHint.id='mmhHierarchyCategoryHint';
      categoryHint.setAttribute('role','status');
      categoryLabel.append(categoryHint);
    }
    if(categoryHint){
      const selectedType=types.find(x=>x.id===selection.type);
      categoryHint.hidden=!selection.transaction||cats.length>0;
      categoryHint.textContent=categoryHint.hidden?'':selectedType?.value==='Transfer'?tr(
        'No linked Category yet. In Manage → Category, create “Transfer” under this Transaction.',
        '尚未关联 Category。请到 Manage → Category，在该 Transaction 下添加“Transfer”。',
        'Category မရှိသေးပါ။ Manage → Category တွင် “Transfer” ကို ထည့်ပါ။'):tr(
        'No linked Category yet. Open Manage → Category and add one under this Transaction.',
        '尚未关联 Category。请到 Manage → Category，在该 Transaction 下添加分类。',
        'Category မရှိသေးပါ။ Manage → Category တွင် အသစ်ထည့်ပါ။');
    }
    const typeLabel=t.closest('label');
    let directionHint=$('mmhHierarchyBalanceHint');
    if(!directionHint&&typeLabel){
      directionHint=elt('span','mmh-hier-muted');directionHint.id='mmhHierarchyBalanceHint';
      typeLabel.append(directionHint);
    }
    if(directionHint){
      const selectedType=types.find(x=>x.id===selection.type);
      const node=selectedType?controller.list('type').find(x=>x.id===selectedType.id):null;
      directionHint.textContent=node?directionLabel(node.ledgerType):
        tr('Choose Type to determine the balance change.',
          '请选择 Type 以确定资金增减方向。',
          'ငွေလက်ကျန် ပြောင်းလဲမှုအတွက် Type ကို ရွေးပါ။');
    }
    for(const s of [t,g,c])s.disabled=!s.options.length;
    if(typeof updateAccountLocks==='function'&&types.length)updateAccountLocks();
    // V321 native saving and V344 balance protection own separate locks.
    // Never re-enable their shared button while a transaction is in flight
    // or a funding account lacks enough money, even when Manage is valid.
    if(save)save.disabled=cloudConflict||!valid()||
      save.classList.contains('v321-submit-busy')||
      save.classList.contains('balance-blocked');
  }catch(error){
    console.warn('[MMHVAULT] Hierarchy form unavailable',error);
    for(const s of [t,g,c]){s.replaceChildren();s.disabled=true;}
    const save=f.querySelector('.actions button:not([type="button"])');
    if(save)save.disabled=true;
  }finally{rendering=false;}
}
function valid(){
  if(cloudConflict||!ready()||!selection.type||!selection.transaction||!selection.category)return false;
  const path=safe(()=>controller.path(selection.type,selection.transaction,selection.category));
  return !!path&&$('txType')?.value===path.type&&$('txGroup')?.value===path.group&&
    $('txCategory')?.value===path.category;
}
function schedule(){
  if(queued)return;queued=true;
  queueMicrotask(()=>{queued=false;manager();form()});
}
function retryConfirmedLink(target){
  if(!target||linkSync!==target||!ready()||target.state!=='needs-link')return;
  try{
    // The financial ledger record was already inserted. Retry ONLY the
    // owner-scoped JSON path link; never call a transactions insert/update.
    controller.recorded(target.recordId,target.ids.type,target.ids.transaction,
      target.ids.category,target.canonical);
    target.state='pending';schedule();void verifyCloudLink(target);
  }catch(error){
    console.warn('[MMHVAULT] Saved ledger Manage link retry blocked',error);
    notify(tr('Could not restore the Manage link. Your transaction remains saved.',
      '关联仍未恢复，但交易已保存，不会重复记账。',
      'ချိတ်ဆက်မှု မအောင်မြင်သေးပါ။ မှတ်တမ်း မပျောက်ပါ။'));
  }
}
async function verifyCloudLink(target){
  // A signout/device switch invalidates any still-pending verification.
  // Never let the old owner's cloud request block the new owner's checks.
  if(!target||target.state!=='pending'||
    (checkingCloud&&cloudCheckOwner===target.owner)||
    owner()!==target.owner||configOwner()!==target.owner)return;
  const generation=++cloudCheckGeneration;
  cloudCheckOwner=target.owner;checkingCloud=true;schedule();
  try{
    const verified=await verifyStoredCloudLink({
      target,currentOwner:owner,configOwner,
      syncNow:()=>window.MMHConfigCloudSyncV122?.syncNow?.(false),
      readConfig:async signedOwner=>{
        const {data,error}=await db.from('personal_configuration').select('config')
          .eq('user_id',signedOwner).maybeSingle();
        if(error)throw error;
        return data?.config;
      }
    });
    if(verified&&linkSync===target&&owner()===target.owner&&configOwner()===target.owner){
      target.state='verified';cloudConflict=false;
    }
  }catch(error){console.warn('[MMHVAULT] Manage link readback unavailable',error)}
  finally{
    // A late result from account A must not clear account B's verification
    // lock or trigger A's deferred retry against B's current configuration.
    if(generation===cloudCheckGeneration){
      checkingCloud=false;cloudCheckOwner='';schedule();
      // A second saved transaction may arrive while the prior cloud check is
      // in-flight. Verify the latest one next, but do not retry failed syncs
      // indefinitely. Failed checks remain Pending for manual retry.
      if(linkSync&&linkSync!==target&&linkSync.state==='pending'&&
        linkSync.owner===owner()&&linkSync.owner===configOwner())
        queueMicrotask(()=>{void verifyCloudLink(linkSync)});
    }
  }
}
// A confirmed INSERT must refresh Accounts/Dashboard/Analyze independently
// of the optional Manage-link cloud verification. Serialize owner-scoped
// reads so quick consecutive inserts never let an older reload overwrite a
// newer snapshot; these tasks NEVER perform another ledger write.
let ledgerRefreshQueue=Promise.resolve(),ledgerRefreshOwner='';
function queueSavedLedgerRefresh(target){
  if(owner()!==target.owner||configOwner()!==target.owner)return;
  // A previous owner's in-flight request may never settle. Never let it
  // block a new signed-in owner's verified financial refresh.
  if(ledgerRefreshOwner!==target.owner){
    ledgerRefreshOwner=target.owner;
    ledgerRefreshQueue=Promise.resolve();
  }
  const task=ledgerRefreshQueue.then(()=>{
    if(ledgerRefreshOwner!==target.owner||
      owner()!==target.owner||configOwner()!==target.owner)return;
    return refreshSavedLedger(target);
  });
  // Keep a rejected task from poisoning subsequent confirmed records.
  ledgerRefreshQueue=task.catch(error=>{
    console.warn('[MMHVAULT] Serialized financial refresh interrupted',error);
  });
}
// Native addTransaction confirms the ledger INSERT but its V321 wrapper
// does not reload Accounts/Dashboard/Analyze. Re-fetch the owner ledger
// regardless of whether the optional Manage sidecar confirms promptly.
// A failed refresh never rolls back or duplicates the financial INSERT.
async function refreshSavedLedger(target){
  if(!target||owner()!==target.owner||configOwner()!==target.owner)return;
  const matches=()=>Array.isArray(window.transactions)&&window.transactions.some(row=>
    row?.user_id===target.owner&&String(row.id)===target.recordId);
  try{
    if(typeof window.loadAll!=='function')
      throw Error('Secure cloud refresh unavailable');
    let result=await window.loadAll({force:true});
    if(owner()!==target.owner||configOwner()!==target.owner)return;
    // A concurrent load may have started just before a second insert; the
    // shared in-flight promise can serve the older snapshot. One more
    // serialized read is safe; NEVER replay the financial write.
    if(result?.ok!==false&&!matches()){
      result=await window.loadAll({force:true});
      if(owner()!==target.owner||configOwner()!==target.owner)return;
    }
    if(result?.ok===false||!matches())
      throw Error('Saved record not yet visible in the current account data');
  }catch(error){
    console.warn('[MMHVAULT] Transaction saved but summary refresh needs retry',error);
    if(owner()===target.owner&&configOwner()===target.owner)
      notify(tr('Transaction saved. Accounts and reports could not refresh yet. Reload the page; do not save it again.',
        '交易已经保存，但账户和报表暂未刷新。请重新加载页面，不要重复记账。',
        'မှတ်တမ်း သိမ်းပြီးပါပြီ။ အကောင့်နှင့် အစီရင်ခံစာကို ပြန်ဖွင့်ကြည့်ပါ။ ထပ်မသိမ်းပါနှင့်။'));
  }
}
function ledgerInserted(userId,id,values){
  // The server-provided ledger ID is authoritative even when a stale or
  // interrupted form capture cannot prove the optional Manage choice link.
  // Do not hide an inserted financial row from Accounts/Analyze because the
  // separate JSON sidecar is pending or invalid.
  if(owner()!==userId||configOwner()!==userId||id==null||String(id)==='')return;
  const recordId=String(id),current=pendingSave;
  pendingSave=null;
  if(!current||current.owner!==userId||!values||
    values.type!==current.path.type||values.group!==current.path.group||
    values.category!==current.path.category){
    queueSavedLedgerRefresh({owner:userId,recordId});
    notify(tr('Transaction saved, but its Manage choices could not be verified. Review this record; do not save it again.',
      '交易已保存，但 Manage 关联未通过确认。请检查这笔记录，不要重复记账。',
      'မှတ်တမ်း သိမ်းပြီးသော်လည်း Manage ချိတ်ဆက်မှု မအတည်ပြုနိုင်ပါ။ ထပ်မသိမ်းပါနှင့်။'));
    return;
  }
  const target={owner:userId,recordId,ids:{...current.ids},
    canonical:{type:values.type,group:values.group,category:values.category},state:'needs-link'};
  linkSync=target;
  try{
    controller.recorded(target.recordId,target.ids.type,target.ids.transaction,target.ids.category,values);
    target.state='pending';schedule();
    queueSavedLedgerRefresh(target);
    void verifyCloudLink(target);
  }catch(error){console.warn('[MMHVAULT] Ledger saved but Manage link write did not complete',error);
    schedule();notify(tr('Transaction saved. Its Manage link needs a retry; no duplicate transaction will be created.',
      '交易已保存，项目关联需要重试，不会再次创建交易。',
      'မှတ်တမ်း သိမ်းပြီး၊ ချိတ်ဆက်မှု ပြန်လုပ်ရန် လိုပါသည်။'));
    queueSavedLedgerRefresh(target);
  }
}
function boot(){
  const f=$('txForm');
  style();
  if(f){
    f.addEventListener('change',e=>{
      if(rendering||![ $('txType'),$('txGroup'),$('txCategory') ].includes(e.target))return;
      e.stopImmediatePropagation();
      if(e.target===$('txType')){selection.type=selected(e.target);selection.transaction='';selection.category='';}
      else if(e.target===$('txGroup')){selection.transaction=selected(e.target);selection.category='';}
      else selection.category=selected(e.target);
      form();
    },true);
    f.addEventListener('submit',e=>{
      // The native V321 wrapper rejects a second submit while busy. Its
      // capture listener must agree: otherwise a rejected second click can
      // overwrite the first confirmed INSERT's pending Manage path.
      const submit=f.querySelector('button[type="submit"]');
      if(submit?.classList.contains('v321-submit-busy')||
         submit?.classList.contains('balance-blocked')){
        e.preventDefault();e.stopImmediatePropagation();return;
      }
      if(!valid()){
        e.preventDefault();e.stopImmediatePropagation();
        if(cloudConflict){notify(tr('Manage changes are paused until sync conflict is resolved.',
          'Manage 同步冲突尚未解决，已暂停新增交易。',
          'Manage ချိတ်ဆက်မှု ပဋိပက္ခ ဖြေရှင်းရန် လိုပါသည်။'));return;}
        notify(tr('Configure Type, Transaction and Category in Manage first.',
          '请先在 Manage 完成 Type、Transaction、Category 的关联设置。',
          'Manage တွင် Type၊ Transaction၊ Category ကို ချိတ်ဆက်ပါ။'));return;
      }
      const path=controller.path(selection.type,selection.transaction,selection.category);
      pendingSave={owner:owner(),path,ids:{...selection}};
    },true);
    // Legacy render functions may replace native options after page navigation.
    if(typeof MutationObserver==='function'){
      const observer=new MutationObserver(()=>{if(!rendering)schedule()});
      for(const id of ['txType','txGroup','txCategory']){
        const node=$(id);if(node)observer.observe(node,{childList:true});
      }
    }
  }
  const refresh=e=>{
    const current=owner();
    if(e?.type==='mmhvault:data-loaded'){
      historyReady=!!e.detail?.ok&&current===configOwner()&&
        window.mmhWalletDataOwnerV191===current&&
        (window.transactions||[]).every(row=>row?.user_id===current);
      loadedOwner=historyReady?current:'';
    }else if(e?.type==='mmhvault:config-owner-changed'){
      historyReady=false;loadedOwner='';selection={type:'',transaction:'',category:''};
      pendingSave=null;linkSync=null;cloudConflict=false;
      checkingCloud=false;cloudCheckOwner='';cloudCheckGeneration++;
      ledgerRefreshOwner='';ledgerRefreshQueue=Promise.resolve();close();
    }else if(current!==loadedOwner){
      historyReady=false;loadedOwner='';selection={type:'',transaction:'',category:''};
      pendingSave=null;linkSync=null;cloudConflict=false;
      checkingCloud=false;cloudCheckOwner='';cloudCheckGeneration++;
      ledgerRefreshOwner='';ledgerRefreshQueue=Promise.resolve();close();
    }
    if(e?.type==='mmhvault:config-cloud-synced'&&e.detail?.userId===current)
      cloudConflict=false;
    schedule();
  };
  window.addEventListener('mmhvault:config-link-sync-blocked',e=>{
    if(e?.detail?.userId!==owner()||owner()!==configOwner())return;
    cloudConflict=true;close();schedule();
  });
  for(const name of ['mmhvault:data-loaded','mmhvault:config-owner-changed',
    'mmhvault:config-cloud-synced','mmhvault:category-config-changed','mmhvault-language-change'])
    window.addEventListener(name,refresh);
  if(window.__mmhLastCloudLoadAtV1235&&owner()===configOwner()&&
    window.mmhWalletDataOwnerV191===owner()&&
    Array.isArray(window.transactions)&&
    window.transactions.every(row=>row?.user_id===owner())){
    historyReady=true;loadedOwner=owner();
  }
  schedule();
}
window.MMHV11HierarchyLive={version:'0.7-draft',refresh:schedule,onLedgerInserted:ledgerInserted};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
