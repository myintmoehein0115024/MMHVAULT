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
// UI direction filter only; never a persisted Type or financial ledger value.
let directionFilter='Income', initializeEntry=true;
// Await only explicit missing-level additions for this owner/path; never replace
// an archived or manually changed selection with another existing category.
let awaitingMissing={owner:'',direction:'',typeMissing:false,transactionType:'',categoryTransaction:''};
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
  #txForm #mmhHierarchyDirection{margin:0 0 15px;padding:14px;border:1px solid rgba(215,184,121,.25);border-radius:15px;background:linear-gradient(130deg,rgba(17,40,61,.94),rgba(14,30,47,.88));color:#e6edf7}
  #txForm #mmhHierarchyDirection .mmh-direction-title{margin:0 0 10px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#d7b879}
  #txForm #mmhHierarchyDirection .mmh-direction-buttons{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
  #txForm #mmhHierarchyDirection button{min-height:47px;border:1px solid rgba(145,180,209,.25);border-radius:11px;background:rgba(17,47,71,.76);color:#e6eef6;font-size:13px;font-weight:700;cursor:pointer}
  #txForm #mmhHierarchyDirection button[aria-pressed=true]{border-color:#e2b85e;background:linear-gradient(135deg,rgba(202,153,63,.27),rgba(24,65,86,.55));box-shadow:inset 0 -2px 0 #dfb65a;color:#ffe5aa}
  #txForm #mmhHierarchyDirection button:focus-visible{outline:2px solid #e6c174;outline-offset:2px}
  #txForm #mmhHierarchyDirection .mmh-direction-help{margin:10px 0 0;font-size:12px;color:#bac8d8;line-height:1.5}
  @media(max-width:520px){#txForm #mmhHierarchyDirection{padding:11px}#txForm #mmhHierarchyDirection .mmh-direction-buttons{gap:5px}#txForm #mmhHierarchyDirection button{font-size:11px;min-height:44px}}
  body.light #txForm #mmhHierarchyDirection{background:#eef5fa;color:#253a51}
  body.light #txForm #mmhHierarchyDirection button{background:#fff;color:#354960}
  body.light #txForm #mmhHierarchyDirection button[aria-pressed=true]{background:#fff1d5;color:#6d4b0b}
  body.light #txForm #mmhHierarchyDirection .mmh-direction-help{color:#526a84}
  #txForm #mmhHierarchyEntryGuide{grid-column:1/-1;margin:0;padding:10px 13px;border:1px solid rgba(215,184,121,.27);border-radius:11px;background:rgba(24,42,61,.75);color:#e9d5ab;font-size:12px;line-height:1.6}
  #txForm #mmhHierarchyEntryGuide[hidden]{display:none!important}
  /* Narrow-screen native DATE controls can retain an intrinsic width on
     Safari with localized dates. Constrain only Transactions; do not clip
     the native calendar picker or change stored ISO date values. */
  #txForm label:has(> #txDate){min-width:0;max-width:100%;box-sizing:border-box;overflow:hidden}
  #txForm #txDate{display:block!important;inline-size:100%!important;width:100%!important;
    min-inline-size:0!important;min-width:0!important;max-inline-size:100%!important;
    max-width:100%!important;box-sizing:border-box!important;overflow:hidden}
  #txForm #txDate::-webkit-date-and-time-value{min-width:0;max-width:100%;overflow:hidden;text-align:left}
  #txForm #txDate::-webkit-datetime-edit{min-width:0;overflow:hidden}
  @media(max-width:700px){
    #txForm .formgrid{min-width:0;max-width:100%}
    #txForm .formgrid > label:has(> #txDate){grid-column:1/-1;width:100%;max-width:100%}
    #txForm #txDate{font-size:16px!important;line-height:1.3!important}
  }
  #txForm #mmhHierarchyEntryGuide .mmh-hier-entry-action-v117{display:inline-flex;align-items:center;justify-content:center;min-height:34px;margin-left:10px;padding:7px 11px;border-radius:9px;border:1px solid rgba(224,182,95,.6);background:rgba(206,160,78,.15);color:#ffe5ac;font:700 12px/1.4 system-ui,sans-serif;cursor:pointer}
  #txForm #mmhHierarchyEntryGuide .mmh-hier-entry-action-v117:focus-visible{outline:2px solid #e6c174;outline-offset:2px}
  #txForm #mmhHierarchyEntryGuide .mmh-hier-entry-action-v117:disabled{opacity:.5;cursor:not-allowed}
  @media(max-width:520px){#txForm #mmhHierarchyEntryGuide .mmh-hier-entry-action-v117{display:flex;width:100%;margin:9px 0 0}}
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
  /* Override global APP header chrome; this heading is a liquid-glass
     modal subheader, never a flat black navbar on iOS Safari. */
  .mmh-hier-overlay .mmh-hier-dialog > header{
    display:flex!important;align-items:center!important;justify-content:space-between!important;
    gap:12px!important;box-sizing:border-box!important;position:static!important;
    width:100%!important;min-height:62px!important;margin:0 0 16px!important;
    padding:11px 13px!important;background:linear-gradient(120deg,rgba(48,76,102,.86),rgba(23,44,65,.78))!important;
    border:1px solid rgba(227,189,119,.27)!important;border-radius:15px!important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.10),0 8px 22px rgba(0,0,0,.10)!important;
    color:#f3ead8!important;backdrop-filter:blur(14px)
  }
  .mmh-hier-overlay .mmh-hier-dialog > header h3{font-size:18px;line-height:1.3;margin:0;color:inherit}
  .mmh-hier-overlay .mmh-hier-dialog > header .mmh-hier-close{font-size:23px;min-width:40px;min-height:40px;flex-shrink:0;background:rgba(255,255,255,.07)}
  .mmh-hier-dialog > .mmh-hier-btn{display:inline-flex;align-items:center;justify-content:center;
    margin-top:21px;min-height:43px;padding:10px 15px;border-radius:12px;
    background:linear-gradient(120deg,rgba(219,169,83,.21),rgba(216,163,79,.07));
    box-shadow:inset 0 1px 0 rgba(255,224,174,.12)}
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
// Preserve deliberate manual choices across ordinary UI refresh. A direction
// click may fill existing active owner choices progressively, but must never
// generate missing options or revive archived items after a change.
// Native Add Transaction selectors show only actual owner-authored choices.
// No 'Select Type…' pseudo-options in the iOS wheel or Safari/Chrome list.
// A missing or archived choice stays selectedIndex=-1 (not the first item):
// validation still blocks Save until the user explicitly chooses again.
const optionSig=(el,items)=>el&&el.options.length===items.length&&
  items.every((item,i)=>{
    const x=el.options[i];
    return x.value===item.value&&x.textContent===item.text&&x.dataset.mmhChoiceId===item.id;
  });
function put(el,items,pick,_field){
  if(!el)return;
  if(!items.length){if(el.options.length)el.replaceChildren();return;}
  if(!optionSig(el,items))
    el.replaceChildren(...items.map(x=>makeOption(x.value,x.text,x.id)));
  const index=pick?[...el.options].findIndex(x=>x.dataset.mmhChoiceId===pick):-1;
  el.selectedIndex=index;
}
// Prefer a complete owner-authored path, else the deepest available active
// chain: Type + Transaction, then Type alone. An empty direction stays selected
// and offers a Manage action instead of seeding fictitious ledger categories.
function firstLinkedPath(direction,typeId='',transactionId=''){
  const types=controller.list('type').filter(type=>
    (!direction||type.ledgerType===direction)&&(!typeId||type.id===typeId));
  let firstType=null,firstTransaction=null;
  for(const type of types){
    if(!firstType)firstType={type:type.id,transaction:'',category:''};
    for(const txn of controller.list('transaction',type.id)){
      if(transactionId&&txn.id!==transactionId)continue;
      if(!ledgerKind(txn.kindId)?.group)continue;
      const candidate={type:type.id,transaction:txn.id,category:''};
      if(!firstTransaction)firstTransaction=candidate;
      const cat=controller.list('category',txn.id)[0];
      if(cat)return {...candidate,category:cat.id};
    }
  }
  return firstTransaction||firstType;
}
// Fixed directions only filter the current owner's active Manage Type list.
// No seed choices, ledger changes, implicit Type selection or cloud writes.
const directions=[
  ['Income','＋',()=>tr('Money in','资金进','ငွေဝင်')],
  ['Expense','－',()=>tr('Money out','资金出','ငွေထွက်')],
  ['Transfer','⇄',()=>tr('Transfer','转账','ငွေလွှဲ')]
];
// Browser-local defaults only; no database or network writes.
const accountMemoryKey=(user,direction)=>'mmh_tx_last_account_v2:'+user+':'+direction;
function rememberSavedAccounts(user,values){
  if(!user||user!==owner()||user!==configOwner()||
    !['Income','Expense','Transfer'].includes(values?.type))return;
  const from=values.type==='Income'?'':String(values.fromAccount||'');
  const to=values.type==='Expense'?'':String(values.toAccount||'');
  if((values.type!=='Income'&&!from)||(values.type!=='Expense'&&!to)||
    (values.type==='Transfer'&&from===to))return;
  try{localStorage.setItem(accountMemoryKey(user,values.type),JSON.stringify({from,to}));}catch(_){}
}
function restoreSavedAccounts(direction){
  if(!ready()||!owner()||owner()!==configOwner())return;
  try{
    const saved=JSON.parse(localStorage.getItem(accountMemoryKey(owner(),direction))||'null');
    if(!saved)return;
    const from=$('fromAccount'),to=$('toAccount');
    const allowed=(select,value)=>!!value&&select&&!select.disabled&&
      [...select.options].some(o=>o.value===value&&!o.disabled&&!o.closest('optgroup')?.disabled);
    if(direction==='Transfer'){
      if(!allowed(from,saved.from)||!allowed(to,saved.to)||saved.from===saved.to)return;
    }
    if(direction!=='Income'&&allowed(from,saved.from))from.value=saved.from;
    if(direction!=='Expense'&&allowed(to,saved.to))to.value=saved.to;
    window.mmhSyncTxAddV141?.();
    // Refresh the enhanced picker and native balance guards after changing defaults.
    for(const control of [from,to])if(control&&!control.disabled)
      control.dispatchEvent(new Event('change',{bubbles:true}));
  }catch(_){}
}
function syncDirectionButtons(){
  const panel=$('mmhHierarchyDirection');if(!panel)return;
  for(const node of panel.querySelectorAll('button[data-mmh-direction]')){
    const active=node.dataset.mmhDirection===directionFilter;
    node.setAttribute('aria-pressed',active?'true':'false');
    const d=directions.find(x=>x[0]===node.dataset.mmhDirection);
    if(d){
      const glyph=elt('span','mmh-direction-glyph-v2',d[0]==='Income'?'↙':d[0]==='Expense'?'↗':'⇄');
      glyph.setAttribute('aria-hidden','true');
      node.replaceChildren(glyph,elt('span','mmh-direction-caption-v2',d[2]()));
    }
  }
  const help=panel.querySelector('.mmh-direction-help');
  if(help)help.textContent=tr(
    'Choose a direction, transaction and category.',
    '选择资金方向、交易及分类。',
    'ငွေလမ်းကြောင်း၊ မှတ်တမ်းနှင့် အမျိုးအစား ရွေးပါ။');
}
function ensureDirectionButtons(f,t){
  let panel=$('mmhHierarchyDirection');
  if(!panel){
    panel=elt('section');panel.id='mmhHierarchyDirection';
    panel.setAttribute('aria-label',tr('Balance direction','资金方向','ငွေလမ်းကြောင်း'));
    panel.append(elt('p','mmh-direction-title',tr('Balance direction','资金方向','ငွေလမ်းကြောင်း')));
    const bar=elt('div','mmh-direction-buttons');bar.setAttribute('role','group');
    bar.setAttribute('aria-label',tr('Choose balance direction','选择资金方向','ငွေလမ်းကြောင်း ရွေးပါ'));
    for(const [direction,sign,caption] of directions){
      const button=btn(sign+' '+caption(),()=>{
        if(!ready())return;
        // Clicking again clears the filter; it never creates a Type.
        const next=direction;
        initializeEntry=false;
        directionFilter=next;
        if(next){
          selection=firstLinkedPath(next)||{type:'',transaction:'',category:''};
        }else if(selection.type){
          const chosen=controller.list('type').find(x=>x.id===selection.type);
          if(!chosen)selection={type:'',transaction:'',category:''};
        }
        // Do not programmatically focus a native SELECT or CTA here:
        // Safari iOS opens the Type picker as though it were tapped.
        // Keep focus on the clicked direction button; users may tap a
        // field or the missing-field action when they choose.
        form();
        restoreSavedAccounts(direction);
      });
      button.dataset.mmhDirection=direction;button.setAttribute('aria-pressed','false');
      bar.append(button);
    }
    panel.append(bar,elt('p','mmh-direction-help'));
    const grid=f.querySelector('.formgrid');
    if(grid&&grid.contains(t))grid.before(panel);
    else t.closest('label')?.before(panel);
  }
  syncDirectionButtons();
}
function form(){
  const t=$('txType'),g=$('txGroup'),c=$('txCategory'),f=$('txForm');
  if(!t||!g||!c||!f||rendering)return;
  rendering=true;
  try{
    ensureDirectionButtons(f,t);
    t.closest('label')?.setAttribute('data-mmh-compact-type','');
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
      awaitingMissing={owner:'',direction:'',typeMissing:false,transactionType:'',categoryTransaction:''};
      guide.hidden=false;
      guide.textContent=tr('Loading your saved transaction settings…',
        '正在加载您的记账设置…','သင့်ငွေစာရင်း ရွေးချယ်မှုများ ဖတ်နေပါသည်…');
      for(const s of [t,g,c]){s.replaceChildren();s.disabled=true;}
      if(save)save.disabled=true;
      return;
    }
    const initialEntry=initializeEntry&&!cloudConflict;
    if(initialEntry){
      // Initialize only after the current owner's verified hierarchy is ready.
      directionFilter='Income';
      selection=firstLinkedPath('Income')||{type:'',transaction:'',category:''};
      syncDirectionButtons();
      initializeEntry=false;
    }
    const activeTypes=controller.list('type').filter(x=>!directionFilter||x.ledgerType===directionFilter);
    const awaiting=!cloudConflict&&awaitingMissing.owner===owner()&&
      awaitingMissing.direction===directionFilter?awaitingMissing:null;
    // A newly added Type may complete a previously empty direction, but
    // ordinary refreshes must not change the owner's manual selection.
    if(directionFilter&&!selection.type&&awaiting?.typeMissing&&activeTypes.length)
      selection=firstLinkedPath(directionFilter)||selection;
    const types=activeTypes.map(x=>({id:x.id,value:x.ledgerType,text:x.label}));
    put(t,types,selection.type,'type');selection.type=selected(t);
    const txns=activeTypes.flatMap(type=>controller.list('transaction',type.id).map(x=>({
      id:x.id,value:ledgerKind(x.kindId)?.group||'',text:x.label,
      parentType:type.id}))).filter(x=>x.value);
    if(new Set(txns.map(x=>x.text)).size!==txns.length){
      for(const x of txns)if(txns.some(y=>y!==x&&y.text===x.text))
        x.displayText=x.text+' · '+(activeTypes.find(t=>t.id===x.parentType)?.label||'');
      for(const x of txns)if(x.displayText)x.text=x.displayText;
    }
    if(selection.type&&!selection.transaction&&txns.some(x=>x.parentType===selection.type)&&
      awaiting?.transactionType===selection.type)
      selection=firstLinkedPath(directionFilter,selection.type)||selection;
    if(selection.transaction&&!txns.some(x=>x.id===selection.transaction&&x.parentType===selection.type)){
      selection.transaction='';selection.category='';
    }
    put(g,txns,selection.transaction,'transaction');selection.transaction=selected(g);
    const cats=selection.transaction?controller.list('category',selection.transaction)
      .map(x=>({id:x.id,value:x.label,text:x.label})):[];
    if(selection.transaction&&!selection.category&&cats.length&&
      awaiting?.categoryTransaction===selection.transaction)
      selection.category=cats[0].id;
    put(c,cats,selection.category,'category');selection.category=selected(c);
    awaitingMissing={owner:owner(),direction:directionFilter,
      typeMissing:!!directionFilter&&!activeTypes.length,
      transactionType:selection.type&&!txns.some(x=>x.parentType===selection.type)?selection.type:'',
      categoryTransaction:selection.transaction&&!cats.length?selection.transaction:''};
    // The direction itself is always selectable. Only existing unarchived
    // choices may fill fields; guide the owner to add whichever level is absent.
    const missingField=!selection.type?'type':!selection.transaction?'transaction':
      !selection.category?'category':'';
    // A missing *selection* is not necessarily a missing *option*: if the
    // chosen Category was archived and others remain, require a conscious
    // manual choice instead of suggesting another needless Manage entry.
    const needsSetup=missingField==='type'?!types.length:
      missingField==='transaction'?!txns.length:
      missingField==='category'?!cats.length:false;
    guide.replaceChildren();
    guide.hidden=!needsSetup;
    if(needsSetup){
      const chosenType=controller.list('type').find(x=>x.id===selection.type);
      const chosenTx=selection.type?controller.list('transaction',selection.type)
        .find(x=>x.id===selection.transaction):null;
      const prompt=missingField==='type'?tr(
        'No active Type for this direction. Add a Type in Manage and assign its money direction.',
        '这个资金方向没有可用 Type。请到 Manage 添加 Type 并设置资金方向。',
        'ဤငွေလမ်းကြောင်းအတွက် Type မရှိသေးပါ။ Manage တွင် Type ထည့်ပါ။'):
        missingField==='transaction'?tr(
          'No linked Transaction under '+(chosenType?.label||'Type')+'. Add one in Manage.',
          (chosenType?.label||'Type')+' 下没有 Transaction，请到 Manage 添加。',
          'ဤ Type အောက်တွင် Transaction မရှိသေးပါ။ Manage တွင် ထည့်ပါ။'):tr(
          'No linked Category under '+(chosenTx?.label||'Transaction')+'. Add or restore it in Manage.',
          (chosenTx?.label||'Transaction')+' 下没有 Category，请到 Manage 添加或恢复。',
          'ဤ Transaction အောက်တွင် Category မရှိသေးပါ။ Manage တွင် ထည့်ပါ သို့မဟုတ် ပြန်ယူပါ။');
      guide.append(elt('span','',prompt));
      const action=btn(tr('Add / Restore '+label(missingField),'添加/恢复 '+label(missingField),
        label(missingField)+' ထည့်ရန်'),()=>open(missingField),'mmh-hier-entry-action-v117');
      action.disabled=cloudConflict;
      guide.append(action);
    }
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
    if(typeof updateAccountLocks==='function'&&types.length){
      updateAccountLocks();
      // Direction changes update the native select without a change event.
      // Refresh the existing visual side/label state after the native locks.
      window.mmhSyncTxAddV141?.();
    }
    if(initialEntry&&selection.type)restoreSavedAccounts('Income');
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
// Read-only projection of already loaded, owner-verified transaction rows.
function fitRecentEntry(){
  const list=$('mmhRecentEntryV2')?.querySelector('.mmh-recent-list');
  if(!list||!$('transactions')?.classList.contains('active')||!$('txTabAdd')?.classList.contains('active'))return;
  const mobile=window.matchMedia('(max-width:767px)').matches;
  const nav=mobile?$('bottomNav'):null;
  const bottom=nav?Math.min(window.innerHeight,nav.getBoundingClientRect().top):window.innerHeight;
  const header=$('header');
  const top=Math.max(0,header?.getBoundingClientRect().bottom||0);
  const section=$('transactions');
  // Use section-relative geometry so scrolling the document cannot shrink or
  // expand the list. Reserve the actual panel's bottom padding.
  const panel=$('txAddPanel')?.querySelector('.panel');
  const padding=panel?parseFloat(getComputedStyle(panel).paddingBottom)||0:0;
  const used=list.getBoundingClientRect().top-section.getBoundingClientRect().top;
  const available=Math.max(0,Math.floor(bottom-top-used-padding));
  // Measure whole rows at their real responsive width; never show a clipped
  // record, force a minimum list height, or introduce an inner scrollbar.
  const records=Array.from(list.querySelectorAll('.mmh-recent-row'));
  for(const row of records)row.hidden=false;
  let occupied=0,exhausted=false;
  const heights=records.map(row=>row.getBoundingClientRect().height);
  records.forEach((row,i)=>{
    const fits=!exhausted&&heights[i]>0&&occupied+heights[i]<=available;
    row.hidden=!fits;
    if(fits)occupied+=heights[i];else exhausted=true;
  });
}
function renderRecentEntry(){
  const f=$('txForm');if(!f)return;
  let section=$('mmhRecentEntryV2');
  if(!section){
    section=elt('section');section.id='mmhRecentEntryV2';
    const heading=elt('div','mmh-recent-heading');
    const title=elt('strong');title.id='mmhRecentEntryHeadingV2';
    const history=btn('',()=>{$('txTabHistory')?.click();},'mmh-recent-history');
    heading.append(title,history);
    section.setAttribute('aria-labelledby',title.id);
    section.append(heading,elt('div','mmh-recent-list'));f.after(section);
    if(typeof ResizeObserver==='function')new ResizeObserver(fitRecentEntry).observe(f);
    window.addEventListener('resize',fitRecentEntry);
  }
  section.querySelector('strong').textContent=tr('Recent Transactions','最近交易记录','လတ်တလော ငွေစာရင်းများ');
  const history=section.querySelector('.mmh-recent-history');
  history.textContent=tr('View history →','前往记录 →','မှတ်တမ်းများ ကြည့်ရန် →');
  const list=section.querySelector('.mmh-recent-list');
  list.replaceChildren();
  const current=owner(),rows=window.transactions;
  if(!ready()||!current||window.mmhWalletDataOwnerV191!==current||!Array.isArray(rows)||rows.some(row=>row?.user_id!==current)){
    list.append(elt('div','mmh-recent-empty',tr('Loading recent records…','正在加载最近记录…','နောက်ဆုံးမှတ်တမ်းများ ဖတ်နေပါသည်…')));return;
  }
  const recent=rows.filter(t=>['Income','Expense','Transfer'].includes(t.type)&&!(typeof isLinkedInvestmentTx==='function'&&isLinkedInvestmentTx(t)))
    .slice().sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))||String(b.id||'').localeCompare(String(a.id||''),undefined,{numeric:true})).slice(0,30);
  if(!recent.length){list.append(elt('div','mmh-recent-empty',tr('No transactions yet','暂无交易记录','ငွေစာရင်း မရှိသေးပါ')));return;}
  const amount=(value,account)=>{
    if(value==null||value===''||!Number.isFinite(Number(value)))return '—';
    const meta=safe(()=>typeof mmhVaultAccountMeta==='function'?mmhVaultAccountMeta(account):null);
    const currency=meta&&!String(meta.id||'').startsWith('legacy_')?String(meta.currency||''):'';
    return Number(value).toLocaleString(undefined,{maximumFractionDigits:6})+(currency?' '+currency:'');
  };
  for(const t of recent){
    const income=t.type==='Income',expense=t.type==='Expense';
    const row=elt('div','mmh-recent-row');row.dataset.direction=t.type;
    const glyph=elt('span','mmh-recent-icon',income?'↙':expense?'↗':'⇄');glyph.setAttribute('aria-hidden','true');
    const primary=elt('div','mmh-recent-primary',String(t.category||t.type));
    const account=income?t.to_account:expense?t.from_account:[t.from_account,t.to_account].filter(Boolean).join(' → ');
    const secondary=elt('div','mmh-recent-secondary');
    secondary.append(elt('span','mmh-recent-account',account||'—'),elt('span','mmh-recent-date',String(t.tx_date||'—')));
    const total=elt('div','mmh-recent-amount',income?'+'+amount(t.to_amount,t.to_account):expense?'−'+amount(t.from_amount,t.from_account):amount(t.from_amount,t.from_account)+' → '+amount(t.to_amount,t.to_account));
    row.append(glyph,primary,secondary,total);list.append(row);
  }
  fitRecentEntry();
}
function schedule(){
  if(queued)return;queued=true;
  queueMicrotask(()=>{queued=false;manager();form();renderRecentEntry()});
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
  rememberSavedAccounts(userId,values);
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
// History V2 presentation only. Native filters, calendar, CSV, ledger
// renderer and edit/delete/receipt handlers remain authoritative.
function installHistoryPresentation(){
  const panel=$('txHistoryPanel'),grid=panel?.querySelector('.filter-grid');
  if(!panel||!grid)return;
  const root='html body.mmh-workspace-active #transactions#transactions#transactions#transactions#transactions#transactions#transactions #txHistoryPanel#txHistoryPanel';
  if(!$('mmhHistoryPresentationV2')){
    const css=elt('style');css.id='mmhHistoryPresentationV2';
    css.textContent=`
      ${root}{width:100%!important;max-width:none!important;margin:0!important;padding:0!important}
      ${root}>.panel{width:100%!important;max-width:none!important;margin:0!important;min-height:calc(100dvh - var(--wv-shell-top,64px) - 64px)!important;padding:clamp(14px,1.7vw,24px)!important;box-sizing:border-box!important;border:0!important;border-radius:0!important;background:var(--tv-card)!important;box-shadow:none!important}
      ${root}>.panel>.toolbar{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;margin:0 0 16px!important;padding:0!important;background:transparent!important;border:0!important}
      ${root}>.panel>.toolbar h2{font:650 19px/1.3 system-ui,sans-serif!important;margin:0 0 4px!important}
      ${root} #txResultCount{color:var(--tv-muted)!important;font-size:12px!important}
      ${root}>.panel>.toolbar .danger{background:transparent!important;border-color:var(--tv-line)!important;color:var(--tv-negative)!important;font-size:12px!important;font-weight:500!important}
      ${root} .hc-shell{margin:0 0 14px!important;padding:0!important;background:transparent!important;border:0!important}
      ${root} .hc-toolbar{display:flex!important;align-items:center!important;justify-content:space-between!important;flex-wrap:wrap!important;gap:8px!important;margin:0 0 8px!important}
      ${root} .hc-month-controls{display:flex!important;align-items:center!important;gap:6px!important;flex:1 1 300px!important;min-width:0!important}
      ${root} .hc-toolbar :is(button,input,select){height:38px!important;min-height:38px!important;border-radius:7px!important;background:var(--tv-raised)!important;color:var(--tv-text)!important;border:1px solid var(--tv-line)!important;font-size:13px!important;box-shadow:none!important}
      ${root} #hcMonth{width:auto!important;flex:0 1 150px!important;min-width:110px!important}
      ${root} #hcCurrency{width:90px!important;flex:0 0 auto!important}
      ${root} #hcToggle{flex:0 0 auto!important;color:var(--tv-accent)!important}
      ${root} #hcCalendar[hidden]{display:none!important}
      ${root} #hcCalendar:not([hidden]){padding:12px!important;margin:10px 0!important;background:var(--tv-card)!important;border:1px solid var(--tv-line)!important;border-radius:8px!important}
      ${root} .hc-day{min-height:42px!important;border-radius:6px!important;background:var(--tv-raised)!important;border:1px solid transparent!important}
      ${root} .hc-day[aria-pressed=true]{background:var(--tv-selected)!important;border-color:var(--tv-accent)!important;color:var(--tv-text)!important}
      ${root} .hc-totals>div{background:var(--tv-raised)!important;border:1px solid var(--tv-line)!important;border-radius:7px!important}
      ${root} .hc-selection{margin:4px 0 0!important;color:var(--tv-muted)!important;font-size:12px!important}
      ${root} .filter-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;align-items:end!important;gap:10px!important;margin:0 0 10px!important;padding:0!important;background:transparent!important;border:0!important}
      ${root} .filter-grid>label:has(#txSearch){grid-column:1/4!important;margin:0!important}
      ${root} .filter-grid>label{min-width:0!important;color:var(--tv-muted)!important;font-size:12px!important}
      ${root} .filter-grid :is(input,select){width:100%!important;min-width:0!important;height:40px!important;min-height:40px!important;background:var(--tv-raised)!important;border-color:var(--tv-line)!important;color:var(--tv-text)!important;border-radius:7px!important}
      ${root} .filter-grid.mmh-history-filters-closed>label:not(:has(#txSearch)){display:none!important}
      ${root} #mmhHistoryFilterV2{grid-column:4;grid-row:1;justify-self:end;width:100%;min-height:40px!important;border:1px solid var(--tv-line)!important;border-radius:7px!important;background:var(--tv-raised)!important;color:var(--tv-text)!important;font:600 13px/1.3 system-ui,sans-serif!important;cursor:pointer}
      ${root} #mmhHistoryFilterV2[aria-expanded=true]{background:var(--tv-selected)!important;color:var(--tv-accent)!important}
      ${root}>.panel>.actions{display:flex!important;justify-content:flex-end!important;gap:8px!important;margin:0 0 12px!important;padding:0!important;border:0!important;background:transparent!important}
      ${root}>.panel>.actions .btn{min-height:34px!important;padding:5px 10px!important;font-size:12px!important}
      ${root} #txList{width:100%!important;max-width:none!important;max-height:none!important;min-height:0!important;border:0!important;border-radius:0!important;margin:0!important;padding:0!important;background:transparent!important}
      ${root} #txList>table{width:100%!important;min-width:860px!important;border-collapse:collapse!important;table-layout:auto!important;font-size:12px!important}
      ${root} #txList>table :is(th,td){padding:10px 9px!important;vertical-align:middle!important;line-height:1.4!important;border-bottom:1px solid var(--tv-line)!important}
      ${root} #txList>table th{font-weight:600!important;text-align:left!important;white-space:nowrap!important;background:var(--tv-raised)!important;color:var(--tv-muted)!important}
      ${root} #txList>table :is(th,td):is(:nth-child(6),:nth-child(8)){text-align:right!important;white-space:nowrap!important;font-variant-numeric:tabular-nums}
      ${root} #txList>table td:nth-child(1){white-space:nowrap!important;font-variant-numeric:tabular-nums}
      ${root} #txList>table tr[data-mmh-history-direction=Income] td:nth-child(8),${root} #txList>table tr[data-mmh-history-direction=Income] td:nth-child(2){color:var(--tv-positive)!important}
      ${root} #txList>table tr[data-mmh-history-direction=Expense] td:nth-child(6),${root} #txList>table tr[data-mmh-history-direction=Expense] td:nth-child(2){color:var(--tv-negative)!important}
      ${root} #txList>table .icon-actions{white-space:nowrap!important}
      ${root} #txList>table .btn{min-height:30px!important;padding:4px 8px!important;font-size:11px!important}
      ${root} #txMobileListV371 .tx-mobile-card-v371{margin:0!important;padding:10px 4px!important;border:0!important;border-bottom:1px solid var(--tv-line)!important;border-radius:0!important;box-shadow:none!important;background:transparent!important;min-height:68px!important}
      ${root} #txMobileListV371 .tx-mobile-top-v371{gap:8px!important;align-items:center!important}
      ${root} #txMobileListV371 .tx-mobile-title-v371{font-size:14px!important;font-weight:650!important;color:var(--tv-text)!important}
      ${root} #txMobileListV371 :is(.tx-mobile-date-v371,.tx-mobile-sub-v371){font-size:11px!important;color:var(--tv-muted)!important}
      ${root} #txMobileListV371 .tx-mobile-amount-v371{font-size:14px!important;font-weight:650!important;font-variant-numeric:tabular-nums}
      ${root} #txMobileListV371 [data-mmh-history-direction=Income] .tx-mobile-amount-v371{color:var(--tv-positive)!important}
      ${root} #txMobileListV371 [data-mmh-history-direction=Expense] .tx-mobile-amount-v371{color:var(--tv-negative)!important}
      @media(max-width:767px){
        ${root}>.panel{padding:12px!important;min-height:0!important}
        ${root}>.panel>.toolbar h2{font-size:17px!important}
        ${root} .hc-month-controls{flex-basis:100%!important}
        ${root} .hc-toolbar{justify-content:flex-start!important}
        ${root} #hcMonth{flex:1 1 auto!important}
        ${root} .filter-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}
        ${root} .filter-grid>label:has(#txSearch){grid-column:1!important}
        ${root} #mmhHistoryFilterV2{grid-column:2!important;width:auto!important;min-width:96px!important}
        ${root} .filter-grid :is(input,select){font-size:16px!important;min-height:44px!important}
        ${root} #mmhHistoryFilterV2{min-height:44px!important}
        ${root} #txList>table{min-width:0!important}
      }
    `;
    document.head.append(css);
    const refStyle=elt('style');refStyle.id='mmhHistoryReferenceV2';
    refStyle.textContent=`
      ${root} #mmhHistoryBackV2{display:inline-flex!important;align-items:center;gap:6px;min-height:38px!important;padding:7px 12px!important;border:1px solid var(--tv-line)!important;border-radius:7px!important;background:var(--tv-raised)!important;color:var(--tv-text)!important;font:600 13px/1.4 system-ui,sans-serif!important;cursor:pointer}
      ${root} .mmh-history-titlebar{display:flex;align-items:center;gap:12px;min-width:0}
      ${root} #mmhHistorySummaryV2{margin:0 0 16px}
      ${root} #mmhHistorySummaryV2 .hc-totals{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important;margin:0!important;padding:0!important;border:0!important}
      ${root} #mmhHistorySummaryV2 .hc-totals>div{padding:14px!important;min-width:0!important;border:1px solid var(--tv-line)!important;border-radius:8px!important;background:var(--tv-card)!important}
      ${root} #mmhHistorySummaryV2 .hc-totals b{display:block!important;margin-top:6px!important;font-size:clamp(16px,1.8vw,25px)!important;overflow-wrap:anywhere;line-height:1.3!important}
      ${root} #hcIncome{color:var(--tv-positive)!important}
      ${root} #hcExpense{color:var(--tv-negative)!important}
      ${root} #hcRemaining{color:var(--tv-text)!important}
      ${root} #mmhHistorySummaryV2 #hcCaption{font-size:11px!important;color:var(--tv-muted)!important;margin:6px 0 0!important}
      ${root} .filter-grid{grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) minmax(100px,.65fr)!important}
      ${root} .filter-grid>label:has(#txSearch){grid-column:1!important}
      ${root} .filter-grid>label:has(#txFilterType){grid-column:2!important;grid-row:1!important}
      ${root} .filter-grid>label:has(#txFilterAccount){grid-column:3!important;grid-row:1!important}
      ${root} .filter-grid.mmh-history-filters-closed>label:has(:is(#txFilterType,#txFilterAccount)){display:flex!important;flex-direction:column!important}
      ${root} .filter-grid>label:has(#txFilterGroup){grid-column:1!important}
      ${root} .filter-grid>label:has(#txFilterCategory){grid-column:2/4!important}
      ${root} #mmhHistoryRecordsV2{width:100%;min-width:0;border:1px solid var(--tv-line);border-radius:8px;background:var(--tv-card);overflow:hidden}
      ${root} #mmhHistoryRecordsV2 .mh-row{display:grid;grid-template-columns:minmax(90px,.85fr) minmax(0,1.7fr) minmax(0,1.25fr) minmax(0,.85fr) minmax(0,1.3fr) 16px;gap:12px;align-items:center;padding:12px 14px;border-bottom:1px solid var(--tv-line);min-width:0}
      ${root} #mmhHistoryRecordsV2 .mh-header{font-size:12px;color:var(--tv-muted);background:var(--tv-raised);font-weight:500}
      ${root} #mmhHistoryRecordsV2 button.mh-row{width:100%!important;text-align:left!important;background:transparent!important;border:0!important;border-bottom:1px solid var(--tv-line)!important;border-radius:0!important;color:var(--tv-text)!important;min-height:56px!important;font:500 13px/1.4 system-ui,sans-serif!important;cursor:pointer;box-shadow:none!important}
      ${root} #mmhHistoryRecordsV2 button.mh-row:hover{background:var(--tv-raised)!important}
      ${root} #mmhHistoryRecordsV2 .mh-cell{min-width:0;overflow-wrap:anywhere}
      ${root} #mmhHistoryRecordsV2 .mh-description{font-weight:650}
      ${root} #mmhHistoryRecordsV2 .mh-description small{display:block;font-size:11px;font-weight:400;color:var(--tv-muted);margin-top:3px}
      ${root} #mmhHistoryRecordsV2 .mh-date,${root} #mmhHistoryRecordsV2 .mh-account{color:var(--tv-muted)}
      ${root} #mmhHistoryRecordsV2 .mh-amount{text-align:right;font-weight:650;font-variant-numeric:tabular-nums}
      ${root} #mmhHistoryRecordsV2 [data-direction=Income] :is(.mh-type,.mh-amount){color:var(--tv-positive)}
      ${root} #mmhHistoryRecordsV2 [data-direction=Expense] :is(.mh-type,.mh-amount){color:var(--tv-negative)}
      ${root} #mmhHistoryRecordsV2 [data-direction=Transfer] .mh-type{color:var(--tv-accent)}
      ${root} #mmhHistoryRecordsV2 .mh-footer{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:10px 14px;font-size:12px;color:var(--tv-muted)}
      ${root} #mmhHistoryRecordsV2 .mh-footer button{min-height:34px!important;padding:5px 12px!important;background:var(--tv-raised)!important;border:1px solid var(--tv-line)!important;border-radius:6px!important;color:var(--tv-text)!important;cursor:pointer}
      ${root} #mmhHistoryRecordsV2 .mh-footer button:disabled{opacity:.4;cursor:default}
      ${root} #txList.mmh-history-projection-ready{display:none!important}
      ${root} #mmhHistoryRecordsV2[hidden]{display:none!important}
      @media(max-width:767px){
        ${root} .mmh-history-titlebar{gap:8px;flex-wrap:wrap}
        ${root} #mmhHistorySummaryV2 .hc-totals{gap:6px!important}
        ${root} #mmhHistorySummaryV2 .hc-totals>div{padding:8px 6px!important}
        ${root} #mmhHistorySummaryV2 .hc-totals b{font-size:13px!important}
        ${root} .filter-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        ${root} .filter-grid>label:has(#txSearch){grid-column:1!important;grid-row:1!important}
        ${root} #mmhHistoryFilterV2{grid-column:2!important;grid-row:1!important}
        ${root} .filter-grid>label:has(#txFilterType){grid-column:1!important;grid-row:2!important}
        ${root} .filter-grid>label:has(#txFilterAccount){grid-column:2!important;grid-row:2!important}
        ${root} .filter-grid>label:has(#txFilterGroup){grid-column:1!important}
        ${root} .filter-grid>label:has(#txFilterCategory){grid-column:2!important}
        ${root} #mmhHistoryRecordsV2 .mh-header{display:none!important}
        ${root} #mmhHistoryRecordsV2 button.mh-row{grid-template-columns:minmax(0,1fr) minmax(0,40%) 12px;gap:4px 8px;padding:11px 10px}
        ${root} #mmhHistoryRecordsV2 .mh-description{grid-column:1;grid-row:1}
        ${root} #mmhHistoryRecordsV2 .mh-date{grid-column:1;grid-row:2;font-size:11px}
        ${root} #mmhHistoryRecordsV2 .mh-account,${root} #mmhHistoryRecordsV2 .mh-type{display:none}
        ${root} #mmhHistoryRecordsV2 .mh-amount{grid-column:2;grid-row:1/3}
        ${root} #mmhHistoryRecordsV2 .mh-chevron{grid-column:3;grid-row:1/3}
      }
    `;
    document.head.append(refStyle);
    const compact=elt('style');compact.id='mmhHistoryCompactV2';
    const page='html body.mmh-workspace-active #transactions#transactions#transactions#transactions#transactions#transactions#transactions#transactions';
    compact.textContent=`
      ${page}:has(#txTabHistory.active)>.mmh-tx-entry-tools-v2{display:none!important}
      ${page}.active:has(#txTabHistory.active){background:var(--tv-card)!important;min-height:calc(100dvh - var(--wv-shell-top,64px))!important}
      html body.mmh-workspace-active:has(#transactions#transactions#transactions.active #txTabHistory.active) main.wrap.wrap.wrap{background:var(--wv-bg,#19212e)!important;background-image:none!important}
      ${root}>.panel{min-height:calc(100dvh - var(--wv-shell-top,64px))!important;padding:clamp(12px,1.5vw,20px)!important}
      ${root}>.panel>.toolbar{margin:0 0 14px!important;padding:0!important;background:transparent!important;background-image:none!important;box-shadow:none!important;min-height:0!important;border:0!important}
      ${root} .mmh-history-titlebar{display:flex!important;align-items:center!important;gap:8px!important}
      ${root} .mmh-history-titlebar>div{display:none!important}
      ${root} .mmh-history-tools{display:flex;gap:6px;align-items:center}
      ${root} .mmh-history-tools button{display:grid!important;place-items:center;min-height:34px!important;height:34px!important;min-width:34px!important;width:34px!important;padding:0!important;border:1px solid var(--tv-line)!important;border-radius:7px!important;color:var(--tv-text)!important;background:var(--tv-raised)!important;font-size:17px!important;cursor:pointer}
      ${root} #mmhHistoryBackV2{min-height:34px!important;font-size:12px!important;padding:5px 10px!important}
      ${root} #mmhHistorySummaryV2{margin:0 0 12px!important}
      ${root} #mmhHistorySummaryV2 .hc-totals>div{padding:10px 12px!important}
      ${root} #mmhHistorySummaryV2 .hc-totals b{font-size:clamp(15px,1.5vw,23px)!important}
      ${root} #mmhHistorySummaryV2 #hcCaption{font-size:11px!important;margin:5px 0 0!important}
      ${root} .hc-shell{position:relative!important;margin:0 0 10px!important;min-width:0}
      ${root} .hc-toolbar{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:8px!important;margin:0!important}
      ${root} .hc-selection{margin:0 auto 0 0!important;display:flex!important;align-items:center!important;flex-wrap:wrap!important;gap:6px!important}
      ${root} .hc-selection button[hidden]{display:none!important}
      ${root} .hc-selection button{min-height:32px!important;font-size:11px!important;padding:4px 7px!important;color:var(--tv-accent)!important;background:var(--tv-raised)!important;border:1px solid var(--tv-line)!important;border-radius:6px!important}
      ${root} #hcCurrency{min-width:74px!important;width:auto!important;max-width:100px!important}
      ${root} #hcCalendar:not([hidden]){position:absolute!important;right:0;top:calc(100% + 6px);width:min(100%,420px)!important;max-width:420px!important;box-sizing:border-box!important;z-index:25!important;margin:0!important;padding:12px!important;background:var(--tv-card)!important;box-shadow:0 10px 30px #0003!important}
      ${root} #hcCalendar .hc-month-controls{display:flex!important;flex-wrap:nowrap!important;gap:5px!important;margin:0 0 10px!important;min-width:0!important}
      ${root} #hcCalendar .hc-month-controls :is(button,input){min-height:34px!important;background:var(--tv-raised)!important;border:1px solid var(--tv-line)!important;border-radius:6px!important;color:var(--tv-text)!important;font-size:12px!important}
      ${root} #hcCalendar .hc-month-controls #hcMonth{min-width:0!important;flex:1 1 auto!important}
      ${root} #hcCalendar .hc-grid{gap:4px!important}
      ${root} #hcCalendar .hc-day{min-height:38px!important;padding:4px 2px!important;font-size:12px!important}
      ${root} #hcCalendar .hc-day small{font-size:9px!important}
      ${root} .filter-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important;margin:0 0 10px!important}
      ${root} .filter-grid>label:has(#txSearch){grid-column:1/4!important;grid-row:1!important}
      ${root} #mmhHistoryFilterV2{grid-column:4!important;grid-row:1!important}
      ${root} .filter-grid.mmh-history-filters-closed>label:not(:has(#txSearch)){display:none!important}
      ${root} .filter-grid:not(.mmh-history-filters-closed)>label:has(#txFilterType){grid-column:1!important;grid-row:2!important}
      ${root} .filter-grid:not(.mmh-history-filters-closed)>label:has(#txFilterAccount){grid-column:2!important;grid-row:2!important}
      ${root} .filter-grid:not(.mmh-history-filters-closed)>label:has(#txFilterGroup){grid-column:3!important;grid-row:2!important}
      ${root} .filter-grid:not(.mmh-history-filters-closed)>label:has(#txFilterCategory){grid-column:4!important;grid-row:2!important}
      ${root} .filter-grid>label{font-size:12px!important;letter-spacing:0!important;text-transform:none!important}
      ${root} .filter-grid.mmh-history-filters-closed #mmhHistoryClearAllV2{display:none!important}
      ${root} #mmhHistoryClearAllV2{grid-column:1/-1;justify-self:end;min-height:32px!important;font-size:11px!important;color:var(--tv-negative)!important;background:transparent!important;border:1px solid var(--tv-line)!important;border-radius:6px!important;padding:4px 8px!important}
      ${root}>.panel>.actions{margin:0 0 10px!important}
      @media(max-width:767px){
        ${page}.active:has(#txTabHistory.active){min-height:calc(100dvh - var(--wv-shell-top,64px) - 76px - env(safe-area-inset-bottom,0px))!important}
        ${root}>.panel{min-height:0!important;padding:10px 12px!important}
        ${root} #mmhHistorySummaryV2 .hc-totals>div{padding:8px 5px!important}
        ${root} #mmhHistorySummaryV2 .hc-totals b{font-size:13px!important}
        ${root} .hc-toolbar{gap:6px!important;justify-content:space-between!important}
        ${root} #hcCalendar:not([hidden]){position:relative!important;top:auto!important;right:auto!important;margin:6px auto 0!important;box-shadow:none!important}
        ${root} .filter-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        ${root} .filter-grid>label:has(#txSearch){grid-column:1!important}
        ${root} #mmhHistoryFilterV2{grid-column:2!important;min-width:84px!important}
        ${root} .filter-grid:not(.mmh-history-filters-closed)>label:has(#txFilterType){grid-column:1!important;grid-row:2!important}
        ${root} .filter-grid:not(.mmh-history-filters-closed)>label:has(#txFilterAccount){grid-column:2!important;grid-row:2!important}
        ${root} .filter-grid:not(.mmh-history-filters-closed)>label:has(#txFilterGroup){grid-column:1!important;grid-row:3!important}
        ${root} .filter-grid:not(.mmh-history-filters-closed)>label:has(#txFilterCategory){grid-column:2!important;grid-row:3!important}
      }
    `;
    document.head.append(compact);
  }
  const title=panel.querySelector('.toolbar>div:first-child');
  if(title&&!$('mmhHistoryBackV2')){
    const back=btn('',()=>{$('txTabAdd')?.click();});back.id='mmhHistoryBackV2';
    const wrap=elt('div','mmh-history-titlebar');title.before(wrap);wrap.append(back,title);
  }
  const back=$('mmhHistoryBackV2');if(back)back.textContent=tr('‹ Add Transaction','‹ 返回记账','‹ ငွေစာရင်း ထည့်ရန်');
  const toolbar=panel.querySelector('.toolbar');
  if(toolbar&&!toolbar.querySelector('.mmh-history-tools')){
    const tools=elt('div','mmh-history-tools');
    const make=(label,icon,run)=>{const b=btn(icon,run);b.setAttribute('aria-label',label);b.title=label;return b;};
    const help=make('Help / Tutorial','?',()=>{const original=$('mmhTxOnboardingHelpV1');original?.click();});
    help.id='mmhHistoryHelpV2';
    const manage=make('Manage','☷',()=>document.querySelector('#transactions .mmh-glass-tx-nav-manage-v1')?.click());manage.id='mmhHistoryManageV2';
    tools.append(help,manage);toolbar.append(tools);
    const clear=toolbar.querySelector('button.danger');if(clear){clear.id='mmhHistoryClearAllV2';grid.append(clear);}
  }
  const help=$('mmhHistoryHelpV2'),manage=$('mmhHistoryManageV2');
  if(help){help.title=tr('Help / Tutorial','新手指南','အသုံးပြုနည်း');help.setAttribute('aria-label',help.title);}
  if(manage){manage.title=tr('Manage','编辑','စီမံရန်');manage.setAttribute('aria-label',manage.title);}
  const totals=panel.querySelector('.hc-totals'),caption=$('hcCaption'),shell=panel.querySelector('.hc-shell');
  if(totals&&shell&&!$('mmhHistorySummaryV2')){
    const summary=elt('div');summary.id='mmhHistorySummaryV2';shell.before(summary);summary.append(totals);if(caption)summary.append(caption);
  }
  const calendarHost=$('hcCalendar'),calendarToolbar=panel.querySelector('.hc-toolbar'),monthControls=panel.querySelector('.hc-month-controls'),selection=panel.querySelector('.hc-selection');
  if(calendarHost&&calendarToolbar&&monthControls&&selection&&!calendarHost.dataset.mmhCompactV2){
    calendarHost.dataset.mmhCompactV2='1';calendarHost.prepend(monthControls);calendarToolbar.prepend(selection);
    const toggle=$('hcToggle');
    document.addEventListener('pointerdown',e=>{if(!calendarHost.hidden&&!calendarHost.contains(e.target)&&!toggle?.contains(e.target)&&!selection.contains(e.target))toggle?.click();},{passive:true});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!calendarHost.hidden){toggle?.click();toggle?.focus();}});
  }
  let filter=$('mmhHistoryFilterV2');
  if(!filter){
    filter=btn('',()=>{
      const open=grid.classList.toggle('mmh-history-filters-closed')===false;
      filter.setAttribute('aria-expanded',String(open));syncHistoryFilterLabel();
    });
    filter.id='mmhHistoryFilterV2';grid.id=grid.id||'mmhHistoryFilterGridV2';
    filter.setAttribute('aria-controls',grid.id);filter.setAttribute('aria-expanded','false');
    grid.classList.add('mmh-history-filters-closed');grid.append(filter);
    grid.addEventListener('change',syncHistoryFilterLabel);
    panel.addEventListener('click',()=>queueMicrotask(syncHistoryFilterLabel));
  }
  // Calendar is still the original date filter. Collapse the visual month
  // grid once per page load, without resetting its selected date or month.
  const toggle=$('hcToggle'),calendar=$('hcCalendar');
  if(toggle&&calendar&&!toggle.dataset.mmhV2Initial){
    toggle.dataset.mmhV2Initial='1';
    if(!calendar.hidden)toggle.click();
  }
  syncHistoryFilterLabel();
  installHistoryControls(panel,grid,root);
}
function installHistoryControls(panel,grid,root){
  const currency=$('hcCurrency'),calendar=$('hcCalendar'),calendarButton=$('hcToggle'),filterButton=$('mmhHistoryFilterV2');
  if(!currency||!calendar||!calendarButton||!filterButton)return;
  if(!grid.dataset.mmhControlsV3){
    const search=$('txSearch'),searchLabel=search?.closest('label'),actions=panel.querySelector('.panel>.actions'),clear=actions?.querySelector('button[onclick*="clearTxFilters"]'),exportBtn=actions?.querySelector('button[onclick*="exportTransactionsCSV"]'),remove=$('mmhHistoryClearAllV2');
    const fields=['txFilterType','txFilterAccount','txFilterGroup','txFilterCategory'].map(id=>$(id)).filter(Boolean);
    if(!searchLabel||!clear||!exportBtn||!remove||fields.length!==4)return;
    grid.dataset.mmhControlsV3='1';
    const style=elt('style');style.id='mmhHistoryControlsV3';
    style.textContent=[
      root+' .filter-grid{display:flex!important;align-items:center!important;flex-wrap:wrap!important;gap:8px!important;position:relative!important;margin:0 0 10px!important}',
      root+' .mh-controls-row{display:flex;align-items:center;gap:8px;flex:1 1 100%;min-width:0}',
      root+' .mh-controls-row>label{flex:1 1 140px;min-width:80px!important;margin:0!important;display:block!important}',
      root+' .filter-grid .mh-controls-row>label>input{width:100%!important;min-height:38px!important;height:38px!important;margin:0!important}',
      root+' .filter-grid .mh-controls-row>button,'+root+' #mhCurrencyButtonV3{display:inline-flex!important;justify-content:center;align-items:center;gap:5px;flex:0 0 auto!important;width:auto!important;min-width:0!important;min-height:38px!important;height:38px!important;padding:5px 10px!important;margin:0!important;border:1px solid var(--tv-line)!important;border-radius:7px!important;background:var(--tv-raised)!important;color:var(--tv-text)!important;font:500 12px/1.3 system-ui,sans-serif!important;white-space:nowrap;box-shadow:none!important}',
      root+' .filter-grid.mmh-history-filters-closed .mh-controls-row>#mmhHistoryClearAllV2,'+root+' .filter-grid .mh-controls-row>#mmhHistoryClearAllV2{display:inline-flex!important;color:var(--tv-negative)!important;padding:5px 10px!important}',
      root+' .mh-controls-row>button[aria-expanded=true]{background:var(--tv-selected)!important;color:var(--tv-accent)!important}',
      root+' .panel>.actions:empty{display:none!important}',
      root+' #hcCurrency[hidden],'+root+' .mh-native-filter[hidden]{display:none!important}',
      root+' .mh-popover[hidden]{display:none!important}',
      root+' .mh-popover:not([hidden]){box-sizing:border-box!important;padding:12px!important;border:1px solid var(--tv-line)!important;border-radius:9px!important;background:var(--tv-raised)!important;color:var(--tv-text)!important;box-shadow:0 12px 36px #0004!important;max-height:min(65vh,420px);overflow:auto!important;overscroll-behavior:contain;margin:0!important}',
      root+' .mh-popover:popover-open{position:fixed!important;inset:auto;max-width:calc(100vw - 24px)!important;z-index:2147483000!important}',
      root+' #hcCalendar.mh-popover:not([hidden]){position:relative!important;top:auto;right:auto;width:min(100%,360px)!important;max-width:360px!important;margin:6px 0 0 auto!important;background:var(--tv-card)!important}',
      root+' #hcCalendar.mh-popover:popover-open{position:fixed!important;right:auto!important;width:min(360px,calc(100vw - 24px))!important;margin:0!important}',
      root+' #mhHistoryFilterMenuV3{width:min(100%,270px);max-width:270px;flex:0 0 100%;margin-left:auto!important}',
      root+' #mhHistoryCurrencyMenuV3{width:min(100%,300px);max-width:300px;margin-left:auto!important}',
      root+' .mh-popover:popover-open:is(#mhHistoryFilterMenuV3,#mhHistoryCurrencyMenuV3){margin:0!important}',
      root+' .mh-filter-field{display:grid;gap:5px;margin:0 0 10px;min-width:0}',
      root+' .mh-filter-field:last-child{margin:0}',
      root+' .mh-filter-field>span{color:var(--tv-muted);font:600 12px/1.3 system-ui,sans-serif}',
      root+' .mh-filter-field summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;min-height:36px;box-sizing:border-box;border:1px solid var(--tv-line);border-radius:7px;background:var(--tv-card);color:var(--tv-text);font:500 12px/1.4 system-ui,sans-serif;cursor:pointer;overflow-wrap:anywhere}',
      root+' .mh-filter-field summary::-webkit-details-marker{display:none}',
      root+' .mh-filter-field summary::after{content:"⌄";flex:none;color:var(--tv-muted)}',
      root+' .mh-filter-field details[open] summary::after{content:"⌃"}',
      root+' .mh-choice-list{display:grid;gap:3px;padding:4px 0;max-height:190px;overflow:auto;overscroll-behavior:contain}',
      root+' #mhHistoryCurrencyMenuV3 .mh-choice-list{max-height:270px}',
      root+' .mh-choice-list button{display:flex!important;align-items:center;justify-content:space-between;gap:8px;width:100%!important;min-height:36px!important;height:auto!important;padding:7px 9px!important;text-align:left;border:1px solid transparent!important;border-radius:6px!important;background:transparent!important;color:var(--tv-text)!important;font:500 12px/1.4 system-ui,sans-serif!important;white-space:normal!important;overflow-wrap:anywhere;box-shadow:none!important;cursor:pointer}',
      root+' .mh-choice-list button:hover,'+root+' .mh-choice-list button[aria-pressed=true]{background:var(--tv-card)!important;border-color:var(--tv-line)!important}',
      root+' .mh-choice-list button[aria-pressed=true]::after{content:"✓";flex:none;color:var(--tv-accent)}',
      root+' #mhCurrencySearchV3{box-sizing:border-box;width:100%!important;min-height:36px!important;padding:7px 10px!important;border:1px solid var(--tv-line)!important;border-radius:7px!important;background:var(--tv-card)!important;color:var(--tv-text)!important}',
      '@media(max-width:600px){'+root+' .mh-controls-row{flex-wrap:wrap;gap:6px}'+root+' .mh-controls-row>label{flex:1 1 100%}'+root+' .mh-controls-row>button{flex:1 1 auto!important;padding:5px 6px!important;font-size:11px!important}}'
    ].join('\n');document.head.append(style);
    const row=elt('div','mh-controls-row');grid.prepend(row);
    // Keep native handlers and controls; only move their presentation.
    for(const node of [...searchLabel.childNodes])if(node.nodeType===3)node.remove();
    search.setAttribute('aria-label',tr('Search transactions','搜索交易','ငွေစာရင်း ရှာရန်'));
    row.append(searchLabel,filterButton,clear,exportBtn,remove);actions.style.setProperty('display','none','important');
    remove.id='mmhHistoryClearAllV2';
    remove.setAttribute('data-mmh-delete-all','true');
    const filterMenu=elt('div','mh-popover');filterMenu.id='mhHistoryFilterMenuV3';filterMenu.hidden=true;grid.append(filterMenu);
    filterButton.setAttribute('aria-controls',filterMenu.id);
    const names=[['Type','类型','အမျိုးအစား'],['Account','账户','အကောင့်'],['Transaction','交易','ငွေလွှဲမှု'],['Category','分类','အုပ်စု']];
    fields.forEach((select,i)=>{
      const label=select.closest('label'),field=elt('div','mh-filter-field'),heading=elt('span'),details=elt('details'),summary=elt('summary'),list=elt('div','mh-choice-list');
      field.dataset.select=select.id;heading.dataset.index=String(i);heading.id=select.id+'HistoryLabelV3';summary.id=select.id+'HistoryTriggerV3';summary.setAttribute('aria-labelledby',heading.id+' '+summary.id);
      details.append(summary,list);field.append(heading,select,details);label?.remove();filterMenu.append(field);
      select.classList.add('mh-native-filter');select.hidden=true;select.tabIndex=-1;
      details.addEventListener('toggle',()=>{if(details.open)for(const other of filterMenu.querySelectorAll('details'))if(other!==details)other.open=false;});
      details.addEventListener('keydown',e=>{if(e.key==='Escape'&&details.open){e.preventDefault();e.stopPropagation();details.open=false;summary.focus();}});
    });
    const currencyButton=btn('',()=>toggleCurrency());currencyButton.id='mhCurrencyButtonV3';currencyButton.setAttribute('aria-expanded','false');currency.before(currencyButton);currency.hidden=true;currency.tabIndex=-1;
    const currencyMenu=elt('div','mh-popover');currencyMenu.id='mhHistoryCurrencyMenuV3';currencyMenu.hidden=true;const input=elt('input');input.id='mhCurrencySearchV3';input.type='search';const currencyList=elt('div','mh-choice-list');currencyMenu.append(input,currencyList);currency.closest('.hc-shell').append(currencyMenu);currencyButton.setAttribute('aria-controls',currencyMenu.id);
    calendar.classList.add('mh-popover');
    const pairs=[[calendar,calendarButton],[filterMenu,filterButton],[currencyMenu,currencyButton]];
    const topLayer=typeof calendar.showPopover==='function';
    if(topLayer)for(const [menu] of pairs)menu.setAttribute('popover','manual');
    function position(menu,button){
      if(!topLayer||!menu.matches(':popover-open'))return;
      const rect=button.getBoundingClientRect(),w=menu.offsetWidth,h=menu.offsetHeight;
      const left=Math.max(12,Math.min(innerWidth-w-12,rect.right-w));
      const below=innerHeight-rect.bottom-12,above=rect.top-12;
      const top=below>=h||below>=above?rect.bottom+6:Math.max(12,rect.top-h-6);
      menu.style.setProperty('left',left+'px','important');menu.style.setProperty('top',Math.max(12,Math.min(top,innerHeight-h-12))+'px','important');
    }
    function display(menu,button,open){
      if(menu!==calendar&&menu.hidden===open)menu.hidden=!open;
      if(topLayer){
        if(open&&!menu.matches(':popover-open')&&menu.isConnected&&button.getClientRects().length){try{menu.showPopover()}catch(_){}}
        if(!open&&menu.matches(':popover-open'))menu.hidePopover();
        if(open)position(menu,button);
      }
    }
    function close(menu,button){
      if(menu===calendar){if(!calendar.hidden)calendarButton.click();}
      else if(menu===filterMenu){if(filterButton.getAttribute('aria-expanded')==='true')filterButton.click();}
      else if(!currencyMenu.hidden){currencyButton.setAttribute('aria-expanded','false');display(currencyMenu,currencyButton,false);}
    }
    function closeOthers(menu){for(const [other,button] of pairs)if(other!==menu)close(other,button);}
    function toggleCurrency(){
      const open=currencyMenu.hidden;if(open){closeOthers(currencyMenu);input.value='';renderCurrency();}
      currencyButton.setAttribute('aria-expanded',String(open));display(currencyMenu,currencyButton,open);if(open)input.focus();
    }
    const flag=code=>{const region=code==='EUR'?'EU':code.slice(0,2);return /^[A-Z]{2}$/.test(region)?String.fromCodePoint(...[...region].map(x=>127397+x.charCodeAt(0)))+' ':'';};
    function currencyName(code,locale){try{return new Intl.DisplayNames([locale],{type:'currency'}).of(code)||code}catch(_){return code}}
    function renderCurrency(){
      const lang=document.documentElement.lang||'en',term=input.value.trim().toLowerCase(),options=[...currency.options];
      currencyList.replaceChildren(...options.filter(o=>[o.value,currencyName(o.value,lang),currencyName(o.value,'en'),o.value==='CNY'?'RMB 人民币':''].some(x=>x.toLowerCase().includes(term))).map(o=>{
        const b=btn(flag(o.value)+o.value+' · '+currencyName(o.value,lang),()=>{currency.value=o.value;currency.dispatchEvent(new Event('change',{bubbles:true}));close(currencyMenu,currencyButton);currencyButton.focus();refresh();});b.setAttribute('aria-pressed',String(o.selected));return b;
      }));
      if(!currencyList.children.length)currencyList.append(elt('span','',tr('No matching currency','未找到币种','ငွေကြေး မတွေ့ပါ')));
    }
    input.addEventListener('input',renderCurrency);
    function refresh(){
      const active=panel.getClientRects().length>0;
      const filterOpen=active&&filterButton.getAttribute('aria-expanded')==='true';
      const calendarOpen=active&&!calendar.hidden;
      if(!active){for(const [menu,button] of pairs)close(menu,button);}
      else if(filterOpen){closeOthers(filterMenu);display(filterMenu,filterButton,true);}
      else if(calendarOpen){closeOthers(calendar);display(calendar,calendarButton,true);}
      if(!filterOpen)display(filterMenu,filterButton,false);
      if(!calendarOpen)display(calendar,calendarButton,false);
      const text=flag(currency.value)+currency.value+' ⌄';if(currencyButton.textContent!==text)currencyButton.textContent=text;
      currencyButton.setAttribute('aria-label',tr('Summary currency','统计币种','စာရင်းချုပ် ငွေကြေး')+': '+currency.value);
      input.placeholder=tr('Search currencies','搜索币种','ငွေကြေး ရှာရန်');input.setAttribute('aria-label',input.placeholder);
      const labels=[tr('Clear filters','清除筛选','စစ်ထုတ်မှု ရှင်းရန်'),tr('Export CSV','导出 CSV','CSV ထုတ်ရန်'),tr('Delete all','删除全部','အားလုံး ဖျက်ရန်')];
      [clear,exportBtn,remove].forEach((b,i)=>{if(b.textContent!==labels[i])b.textContent=labels[i];b.title=labels[i];b.setAttribute('aria-label',labels[i]);});
      for(const field of filterMenu.querySelectorAll('.mh-filter-field')){
        const select=$(field.dataset.select),heading=field.querySelector('span'),summary=field.querySelector('summary'),list=field.querySelector('.mh-choice-list');if(!select)continue;
        const label=names[Number(heading.dataset.index)];const headingText=tr(...label);if(heading.textContent!==headingText)heading.textContent=headingText;
        const opts=[...select.options],labelOf=o=>o.value?o.textContent:tr('All','全部','အားလုံး');
        const chosen=opts.find(o=>o.selected),chosenText=chosen?labelOf(chosen):tr('All','全部','အားလုံး');if(summary.textContent!==chosenText)summary.textContent=chosenText;
        const signature=JSON.stringify(opts.map(o=>[o.value,labelOf(o),o.selected,o.disabled]));
        if(list.dataset.signature!==signature){
          list.dataset.signature=signature;list.replaceChildren(...opts.map(o=>{
            const b=btn(labelOf(o),()=>{select.value=o.value;field.querySelector('details').open=false;summary.focus();select.dispatchEvent(new Event('change',{bubbles:true}));refresh();});b.disabled=o.disabled;b.setAttribute('aria-pressed',String(o.selected));return b;
          }));
        }
      }
    }
    grid._mhRefreshHistoryV3=refresh;
    filterButton.addEventListener('click',()=>{if(filterButton.getAttribute('aria-expanded')==='true')closeOthers(filterMenu);refresh()});
    calendarButton.addEventListener('click',()=>{if(!calendar.hidden)closeOthers(calendar);refresh()});
    grid.addEventListener('change',refresh);currency.addEventListener('change',refresh);
    panel.addEventListener('click',()=>queueMicrotask(refresh));
    document.addEventListener('pointerdown',e=>{for(const [menu,button] of pairs)if(!menu.hidden&&!menu.contains(e.target)&&!button.contains(e.target)&&!(menu===calendar&&$('hcSelected')?.parentElement?.contains(e.target)))close(menu,button);},{passive:true});
    document.addEventListener('keydown',e=>{if(e.key!=='Escape'||e.defaultPrevented)return;for(const [menu,button] of pairs)if(!menu.hidden){close(menu,button);button.focus();break;}});
    const reposition=()=>{for(const [menu,button] of pairs)position(menu,button);};
    window.addEventListener('resize',reposition,{passive:true});window.addEventListener('scroll',reposition,{passive:true,capture:true});
    if(typeof MutationObserver==='function'){
      new MutationObserver(()=>refresh()).observe(calendar,{attributes:true,attributeFilter:['hidden']});
      new MutationObserver(()=>refresh()).observe(filterButton,{attributes:true,attributeFilter:['aria-expanded']});
      for(const select of fields)new MutationObserver(()=>refresh()).observe(select,{childList:true});
      new MutationObserver(()=>refresh()).observe(panel,{attributes:true,attributeFilter:['style','hidden']});
    }
    window.addEventListener('mmhvault:config-owner-changed',()=>{for(const [menu,button] of pairs)close(menu,button);});
    window.addEventListener('mmhvault-language-change',()=>{refresh();if(!currencyMenu.hidden)renderCurrency()});
  }
  grid._mhRefreshHistoryV3?.();
}
function syncHistoryFilterLabel(){
  const button=$('mmhHistoryFilterV2');if(!button)return;
  const count=['txFilterType','txFilterGroup','txFilterCategory','txFilterAccount'].filter(id=>!!$(id)?.value).length;
  const open=button.getAttribute('aria-expanded')==='true';
  const text=tr('Filters','筛选','စစ်ထုတ်ရန်')+(count?' · '+count:'')+(open?' ⌃':' ⌄');
  if(button.textContent!==text)button.textContent=text;
}
let historyPageV2=0,historyKeyV2='';
function renderHistoryReference(){
  const list=$('txList');if(!list)return;
  let view=$('mmhHistoryRecordsV2');
  if(!view){view=elt('div');view.id='mmhHistoryRecordsV2';list.after(view);}
  const records=window.transactions,current=owner();
  if(!ready()||!current||!Array.isArray(records)||window.mmhWalletDataOwnerV191!==current||records.some(t=>t?.user_id!==current)||typeof v28FilteredTx!=='function'){
    view.hidden=true;view.replaceChildren();list.classList.remove('mmh-history-projection-ready');return;
  }
  const filteredRows=safe(()=>v28FilteredTx(),null);
  if(!Array.isArray(filteredRows)||filteredRows.some(t=>t?.user_id!==current)){view.hidden=true;view.replaceChildren();list.classList.remove('mmh-history-projection-ready');return;}
  const rows=filteredRows.slice().sort((a,b)=>String(b.tx_date||'').localeCompare(String(a.tx_date||''))||String(b.created_at||'').localeCompare(String(a.created_at||''))||String(b.id||'').localeCompare(String(a.id||''),undefined,{numeric:true}));
  const key=[current,...rows.map(t=>t.id)].join('|');if(key!==historyKeyV2){historyPageV2=0;historyKeyV2=key;}
  const pageSize=8,pages=Math.max(1,Math.ceil(rows.length/pageSize));historyPageV2=Math.min(historyPageV2,pages-1);
  const amount=(value,account)=>{
    if(value==null||value===''||!Number.isFinite(Number(value)))return '—';
    const meta=safe(()=>mmhVaultAccountMeta(account));
    const currency=meta&&!String(meta.id||'').startsWith('legacy_')?String(meta.currency||''):'';
    return (currency?currency+' ':'')+Number(value).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:6});
  };
  const head=elt('div','mh-row mh-header');
  for(const title of [tr('Date','日期','ရက်စွဲ'),tr('Description','描述','ဖော်ပြချက်'),tr('Account','账户','အကောင့်'),tr('Type','类型','အမျိုးအစား'),tr('Amount','金额','ပမာဏ'),''])head.append(elt('span','mh-cell',title));
  head.children[4].classList.add('mh-amount');view.replaceChildren(head);
  for(const t of rows.slice(historyPageV2*pageSize,(historyPageV2+1)*pageSize)){
    const income=t.type==='Income',expense=t.type==='Expense';
    const account=income?t.to_account:expense?t.from_account:[t.from_account,t.to_account].filter(Boolean).join(' → ');
    const type=income?tr('Income','收入','ဝင်ငွေ'):expense?tr('Expense','支出','အသုံးစရိတ်'):t.type==='Transfer'?tr('Transfer','转账','ငွေလွှဲ'):String(t.type||'—');
    const button=btn('',()=>{
      if(owner()!==current||window.mmhWalletDataOwnerV191!==current)return;
      const nativeCard=$('txMobileListV371')?.querySelector('[data-tx-id="'+CSS.escape(String(t.id))+'"]');
      if(nativeCard){nativeCard.click();return;}
      const nativeEdit=list.querySelector('[data-action="edit-tx"][data-id="'+CSS.escape(String(t.id))+'"]');nativeEdit?.click();
    },'mh-row');
    button.dataset.direction=t.type;
    const desc=elt('span','mh-cell mh-description',String(t.category||type));desc.append(elt('small','',[account,t.transaction_group||type].filter(Boolean).join(' · ')));
    const value=income?'+'+amount(t.to_amount,t.to_account):expense?'−'+amount(t.from_amount,t.from_account):amount(t.from_amount,t.from_account)+' → '+amount(t.to_amount,t.to_account);
    button.append(elt('span','mh-cell mh-date',String(t.tx_date||'—')),desc,elt('span','mh-cell mh-account',account||'—'),elt('span','mh-cell mh-type',type),elt('span','mh-cell mh-amount',value),elt('span','mh-chevron','›'));view.append(button);
  }
  if(!rows.length){const empty=elt('div','mh-footer',tr('No matching transactions','没有符合条件的记录','ကိုက်ညီသော မှတ်တမ်း မရှိပါ'));view.append(empty);}
  const footer=elt('div','mh-footer');
  const previous=btn(tr('Previous','上一页','ယခင်'),()=>{if(historyPageV2>0){historyPageV2--;renderHistoryReference();}});
  const next=btn(tr('Next','下一页','နောက်သို့'),()=>{if(historyPageV2+1<pages){historyPageV2++;renderHistoryReference();}});
  previous.disabled=historyPageV2===0;next.disabled=historyPageV2+1>=pages;
  footer.append(previous,elt('span','',String(historyPageV2+1)+' / '+pages),next);view.append(footer);
  view.hidden=false;list.classList.add('mmh-history-projection-ready');
}
function decorateHistoryPresentation(){
  if(!$('txTabHistory')?.classList.contains('active'))return;
  installHistoryPresentation();
  const records=window.transactions;
  renderHistoryReference();
  if(!ready()||!Array.isArray(records)||window.mmhWalletDataOwnerV191!==owner()||records.some(row=>row?.user_id!==owner()))return;
  const lookup=new Map(records.map(row=>[String(row.id),row.type]));
  $('txList')?.querySelectorAll('tr[data-mmh-tx-id],.tx-mobile-card-v371[data-tx-id]').forEach(node=>{
    const direction=lookup.get(node.dataset.mmhTxId||node.dataset.txId);
    if(direction&&node.dataset.mmhHistoryDirection!==direction)node.dataset.mmhHistoryDirection=direction;
  });
}
function boot(){
  const f=$('txForm');
  style();
  if(f&&!$('mmhCompactEntryV2')){
    const compact=elt('style');compact.id='mmhCompactEntryV2';
    const root='html body.mmh-workspace-active #transactions#transactions#transactions#transactions#transactions#transactions';
    const form=root+' #txForm#txForm';
    compact.textContent=`
      ${form} .formgrid>label[data-mmh-compact-type]{display:none!important}
      ${form} #mmhHierarchyBalanceHint,${form} #mmhHierarchyDirection .mmh-direction-help{display:none!important}
      ${form} .formgrid>label:has(#txNote){grid-column:auto!important;order:9!important}
      ${form} .formgrid>label:has(#fromAmount),${form} .formgrid>label:has(#toAmount){grid-column:auto!important}
      ${form} #txNote,${form} #fromAmount,${form} #toAmount{min-height:44px!important;height:44px!important}
      ${root}:has(#txTabAdd.active)>.mmh-tx-entry-tools-v2{padding:3px 12px!important;min-height:0!important}
      ${root}:has(#txTabAdd.active) #txAddPanel>.panel{min-height:0!important;padding-top:10px!important}
      ${form} #mmhHierarchyDirection{margin-top:0!important;margin-bottom:10px!important}
      ${form}:has(#mmhHierarchyDirection [data-mmh-direction=Transfer][aria-pressed=true]) .formgrid>label:has(#txGroup){order:2!important}
      ${form}:has(#mmhHierarchyDirection [data-mmh-direction=Transfer][aria-pressed=true]) .formgrid>label:has(#fromAccount){order:3!important}
      ${form}:has(#mmhHierarchyDirection [data-mmh-direction=Transfer][aria-pressed=true]) .formgrid>label:has(#toAccount){order:4!important}
      ${form}:has(#mmhHierarchyDirection [data-mmh-direction=Transfer][aria-pressed=true]) .formgrid>label:has(#fromAmount){order:5!important}
      ${form}:has(#mmhHierarchyDirection [data-mmh-direction=Transfer][aria-pressed=true]) .formgrid>label:has(#toAmount){order:6!important}
      ${form}:has(#mmhHierarchyDirection [data-mmh-direction=Transfer][aria-pressed=true]) .formgrid>label:has(#txCategory){order:7!important}
      /* V2 entry canvas: the existing workspace owns scrolling and navigation. */
      ${root}:has(#txTabAdd.active){--tx-entry-height:calc(100dvh - var(--wv-shell-top,var(--wv-top,64px))); }
      html body.mmh-workspace-active:has(#transactions#transactions#transactions.active #txTabAdd.active){--tx-entry-surface:#1c2531;--tx-menu-surface:#273242;--tx-menu-line:#344052;--tx-menu-text:#edf0f6;--tx-menu-selected:#2b3850;--tx-menu-accent:#9bb7fb}
      html body.light.mmh-workspace-active:has(#transactions#transactions#transactions.active #txTabAdd.active){--tx-entry-surface:#fff;--tx-menu-surface:#eef2f8;--tx-menu-line:#d8dfe9;--tx-menu-text:#202a3a;--tx-menu-selected:#e4ecfb;--tx-menu-accent:#365fae}
      html body.mmh-workspace-active:has(#transactions#transactions#transactions.active #txTabAdd.active) main.wrap.wrap.wrap{background:var(--tx-entry-surface)!important;background-image:none!important;padding-bottom:0!important}
      html body.mmh-workspace-active:has(#transactions#transactions#transactions.active #txTabAdd.active) :is(.mmh-p24-account-menu,.mmh-p25-picker-menu){background:var(--tx-menu-surface)!important;background-image:none!important;border-color:var(--tx-menu-line)!important;color:var(--tx-menu-text)!important}
      html body.mmh-workspace-active:has(#transactions#transactions#transactions.active #txTabAdd.active) :is(.mmh-p24-account-menu,.mmh-p25-picker-menu)>button{color:var(--tx-menu-text)!important}
      html body.mmh-workspace-active:has(#transactions#transactions#transactions.active #txTabAdd.active) :is(.mmh-p24-account-menu,.mmh-p25-picker-menu)>button:is([aria-selected=true],:hover,:focus-visible){background:var(--tx-menu-selected)!important;color:var(--tx-menu-accent)!important}
      /* Compact entry controls; recent records occupy the available canvas. */
      html body.mmh-workspace-active:has(#transactions#transactions#transactions#transactions.active #txTabAdd.active){background:var(--tx-entry-surface)!important;background-image:none!important}
      html body.mmh-workspace-active:has(#transactions#transactions#transactions#transactions.active #txTabAdd.active) main.wrap.wrap.wrap{background:var(--tx-entry-surface)!important;background-image:none!important;min-height:100dvh!important;padding-bottom:0!important}
      @media(min-width:768px){
        html body.mmh-workspace-active:has(#transactions#transactions#transactions#transactions.active #txTabAdd.active){padding-bottom:0!important}
      }
      ${root}#transactions#transactions.active:has(#txTabAdd.active){display:flex!important;flex-direction:column!important;min-height:var(--tx-entry-height)!important;height:auto!important;max-height:none!important;overflow:visible!important;background:var(--tv-card)!important}
      ${root}#transactions#transactions:has(#txTabAdd.active) #txAddPanel{display:flex!important;flex-direction:column!important;flex:1 1 auto!important;min-height:0!important;width:100%!important}
      ${root}#transactions#transactions:has(#txTabAdd.active) #txAddPanel>.panel{display:flex!important;flex-direction:column!important;flex:1 1 auto!important;min-height:0!important;max-height:none!important;padding:clamp(14px,1.6vw,24px)!important}
      ${form}:has(#mmhHierarchyDirection){display:block!important;flex:0 0 auto!important;width:100%!important;max-width:none!important;min-width:0!important;margin:0!important}
      ${form} .formgrid{align-content:start!important;align-items:start!important;grid-auto-rows:auto!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px 18px!important}
      ${form} .formgrid :is(#txDate,#fromAmount,#toAmount,#txNote,button.mmh-p24-account-trigger,button.mmh-p25-picker-trigger,select:not(.mmh-p24-native):not(.mmh-p25-picker-source)){width:100%!important;height:46px!important;min-height:46px!important;max-height:46px!important;flex:none!important;font-size:14px!important}
      ${form} #receiptDropzoneV3300{min-height:54px!important}
      ${form} .actions{margin-top:12px!important}
      ${root} #mmhRecentEntryV2{display:flex!important;flex-direction:column;min-width:0;flex:1 1 auto;margin-top:32px!important;padding-top:16px!important;border-top:1px solid var(--tv-line);color:var(--tv-text)}
      ${root} #mmhRecentEntryV2 .mmh-recent-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px}
      ${root} #mmhRecentEntryV2 .mmh-recent-heading strong{font-size:14px;font-weight:650}
      ${root} #mmhRecentEntryV2 .mmh-recent-list{min-height:0!important;height:auto!important;max-height:none!important;overflow:hidden!important;overflow:clip!important;flex:0 0 auto!important}
      ${root} #mmhRecentEntryV2 .mmh-recent-row{display:grid;grid-template-columns:30px minmax(0,1.1fr) minmax(0,1.25fr) minmax(100px,.55fr) minmax(0,1fr);align-items:center;gap:12px;padding:9px 8px;border-bottom:1px solid var(--tv-line);min-width:0;min-height:46px;box-sizing:border-box}
      ${root} #mmhRecentEntryV2 .mmh-recent-row[hidden]{display:none!important}
      ${root} #mmhRecentEntryV2 .mmh-recent-row:last-child{border-bottom:0}
      ${root} #mmhRecentEntryV2 .mmh-recent-history{display:inline-flex!important;align-items:center;justify-content:center;min-height:32px!important;padding:5px 10px!important;border:1px solid var(--tv-line)!important;border-radius:6px!important;background:var(--tv-raised)!important;color:var(--tv-accent)!important;font:600 12px/1.4 system-ui,sans-serif!important;cursor:pointer;white-space:nowrap}
      ${root} #mmhRecentEntryV2 .mmh-recent-history:hover{background:var(--tv-selected)!important}
      ${root} #mmhRecentEntryV2 .mmh-recent-icon{display:grid;place-items:center;width:28px;height:28px;background:var(--tv-raised);border-radius:6px;font-size:16px;color:var(--tv-accent)}
      ${root} #mmhRecentEntryV2 .mmh-recent-row[data-direction=Income] :is(.mmh-recent-icon,.mmh-recent-amount){color:var(--tv-positive)}
      ${root} #mmhRecentEntryV2 .mmh-recent-row[data-direction=Expense] :is(.mmh-recent-icon,.mmh-recent-amount){color:var(--tv-negative)}
      ${root} #mmhRecentEntryV2 .mmh-recent-primary{font-size:13px;font-weight:600;overflow-wrap:anywhere;min-width:0}
      ${root} #mmhRecentEntryV2 .mmh-recent-secondary{display:contents;font-size:12px;color:var(--tv-muted);overflow-wrap:anywhere;min-width:0}
      ${root} #mmhRecentEntryV2 .mmh-recent-account{grid-column:3;min-width:0;overflow-wrap:anywhere;text-align:left}
      ${root} #mmhRecentEntryV2 .mmh-recent-date{grid-column:4;font-variant-numeric:tabular-nums;white-space:nowrap;text-align:left}
      ${root} #mmhRecentEntryV2 .mmh-recent-amount{grid-column:5}
      ${root} #mmhRecentEntryV2 .mmh-recent-amount{text-align:right;font-size:13px;font-weight:650;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
      ${root} #mmhRecentEntryV2 .mmh-recent-empty{padding:12px 0;font-size:12px;color:var(--tv-muted)}
      @media(max-width:767px){
        ${root}:has(#txTabAdd.active){--tx-entry-height:calc(100dvh - var(--wv-shell-top,var(--wv-top,64px)) - 76px - env(safe-area-inset-bottom,0px))}
        ${root}#transactions#transactions:has(#txTabAdd.active) #txAddPanel>.panel{padding:10px 14px 14px!important}
        ${form} #mmhHierarchyDirection .mmh-direction-buttons>button{flex:1 1 0!important}
        ${form} .formgrid{gap:10px!important}
        ${form} .formgrid :is(#txDate,#fromAmount,#toAmount,#txNote,button.mmh-p24-account-trigger,button.mmh-p25-picker-trigger,select:not(.mmh-p24-native):not(.mmh-p25-picker-source)){font-size:16px!important}
        ${form} .actions{display:grid!important;grid-template-columns:2fr 3fr!important;gap:8px!important}
        ${form} .actions>button{min-height:44px!important;width:100%!important}
        ${root} #mmhRecentEntryV2{margin-top:24px!important;padding-top:12px!important}
        ${root} #mmhRecentEntryV2 .mmh-recent-history{min-height:40px!important}
        ${root} #mmhRecentEntryV2 .mmh-recent-row{grid-template-columns:28px minmax(0,1fr) minmax(0,40%);column-gap:8px;row-gap:3px;padding:9px 2px}
        ${root} #mmhRecentEntryV2 .mmh-recent-secondary{display:flex;flex-wrap:wrap;gap:2px 6px;grid-column:2;grid-row:2;align-items:center}
        ${root} #mmhRecentEntryV2 .mmh-recent-account{min-width:0}
        ${root} #mmhRecentEntryV2 .mmh-recent-date{font-size:11px}
        ${root} #mmhRecentEntryV2 .mmh-recent-amount{grid-column:3;grid-row:1/3;max-width:42vw}
        ${root} #mmhRecentEntryV2 .mmh-recent-icon{grid-row:1/3}
      }
      @media(max-width:480px){${form} .formgrid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}${form} .formgrid>label{grid-column:auto!important}}
      @media(max-width:340px){${form} .formgrid{grid-template-columns:minmax(0,1fr)!important}}
    `;
    document.head.append(compact);
  }
  if(f){
    // Native label activation opens a SELECT even when the user taps its
    // caption or an adjacent hint. Require a direct tap on the control
    // itself. This applies equally to mobile, tablet and desktop browsers.
    for(const id of ['txType','txGroup','txCategory']){
      const control=$(id),caption=control?.closest('label');
      if(!caption||caption.dataset.mmhSelectTapBound==='1')continue;
      caption.dataset.mmhSelectTapBound='1';
      caption.addEventListener('click',event=>{
        if(event.target===control||
          (event.target instanceof Element&&event.target.closest('select')===control))return;
        event.preventDefault();
      });
    }
    f.addEventListener('change',e=>{
      if(rendering||![ $('txType'),$('txGroup'),$('txCategory') ].includes(e.target))return;
      e.stopImmediatePropagation();
      if(e.target===$('txType')){
        const id=selected(e.target);
        const picked=controller.list('type').find(x=>x.id===id);
        if(picked)directionFilter=picked.ledgerType;
        selection=firstLinkedPath(picked?.ledgerType||'',id)||
          {type:id,transaction:'',category:''};
      }
      else if(e.target===$('txGroup')){
        const id=selected(e.target);
        const parent=controller.list('type').find(type=>
          (!directionFilter||type.ledgerType===directionFilter)&&
          controller.list('transaction',type.id).some(tx=>tx.id===id));
        if(parent){
          directionFilter=parent.ledgerType;
          selection=firstLinkedPath(directionFilter,parent.id,id)||
            {type:parent.id,transaction:id,category:''};
        }else selection={type:'',transaction:'',category:''};
      }
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
      historyReady=false;loadedOwner='';selection={type:'',transaction:'',category:''};directionFilter='Income';initializeEntry=true;
      awaitingMissing={owner:'',direction:'',typeMissing:false,transactionType:'',categoryTransaction:''};
      pendingSave=null;linkSync=null;cloudConflict=false;
      checkingCloud=false;cloudCheckOwner='';cloudCheckGeneration++;
      ledgerRefreshOwner='';ledgerRefreshQueue=Promise.resolve();close();
    }else if(current!==loadedOwner){
      historyReady=false;loadedOwner='';selection={type:'',transaction:'',category:''};directionFilter='Income';initializeEntry=true;
      awaitingMissing={owner:'',direction:'',typeMissing:false,transactionType:'',categoryTransaction:''};
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
  // Calendar initialization belongs to the original application. Recheck on
  // its first insertion and when the native History tab is activated.
  installHistoryPresentation();
  if(typeof MutationObserver==='function'){
    const historyPanel=$('txHistoryPanel')?.querySelector('.panel');
    const historyTab=$('txTabHistory');
    if(historyPanel)new MutationObserver(installHistoryPresentation).observe(historyPanel,{childList:true});
    if(historyTab)new MutationObserver(decorateHistoryPresentation).observe(historyTab,{attributes:true,attributeFilter:['class']});
  }
  for(const event of ['mmhvault:rendered','mmhvault:list-rendered','mmhvault:data-loaded','mmhvault:page-visible','mmhvault-language-change','mmhvault:config-owner-changed'])
    window.addEventListener(event,decorateHistoryPresentation);
  window.addEventListener('mmhvault:config-owner-changed',()=>{const view=$('mmhHistoryRecordsV2');if(view){view.hidden=true;view.replaceChildren();}historyKeyV2='';historyPageV2=0;});
  // Update after existing ledger rendering; never fetch or mutate transactions here.
  for(const event of ['mmhvault:data-change','mmhvault:rendered','mmhvault:list-rendered'])
    window.addEventListener(event,renderRecentEntry);
  schedule();
}
window.MMHV11HierarchyLive={version:'0.14-history-controls',refresh:schedule,onLedgerInserted:ledgerInserted};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
