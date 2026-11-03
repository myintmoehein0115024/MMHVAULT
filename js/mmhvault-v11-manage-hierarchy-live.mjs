/* MMHVAULT APP V11.7 — Type → Transaction → Category.
 * Draft integration candidate, requires cloud-config schema adapter + browser QA.
 * Preserves the canonical ledger values used by balance and Analyze calculations.
 */
import {createHierarchyController} from './mmhvault-v11-manage-hierarchy-controller.mjs';
import {ledgerKind,canAddItem} from './mmhvault-v11-manage-hierarchy-model.mjs';
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
const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?
  'hier_'+crypto.randomUUID():'hier_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);
let loadedOwner='',historyReady=false,overlay=null,modalField='',selection={type:'',transaction:'',category:''};
let pendingSave=null,rendering=false,queued=false,returnFocus=null;
let linkSync=null,checkingCloud=false;
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
  .mmh-hier-form input,.mmh-hier-form select{width:100%;min-width:0;padding:12px;border-radius:10px;border:1px solid rgba(196,202,219,.28);background:#24354d;color:#fff}
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
    text.append(elt('div','mmh-hier-muted',(parentInfo?parentInfo+' · ':'')+
      (item.archived?tr('Archived','已归档','သိမ်းပြီး'):tr('Active','使用中','အသုံးပြုနေ'))));
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
  let typeChoice=null,parentChoice=null,kindChoice=null;
  if(!item&&field==='type'){
    typeChoice=elt('select');
    for(const type of ['Income','Expense','Transfer'])
      typeChoice.append(makeOption(type,tr(type,type==='Income'?'收入':type==='Expense'?'支出':'转账',type),type));
    control(tr('Financial meaning','财务类型','ငွေစာရင်းအမျိုးအစား'),typeChoice);
  }
  if(!item&&field==='transaction'){
    parentChoice=elt('select');
    for(const type of graph.types.filter(x=>!x.archived))
      parentChoice.append(makeOption(type.id,type.label,type.id));
    control(tr('Linked Type','关联 Type','ချိတ်ဆက်ထားသော Type'),parentChoice);
    kindChoice=elt('select');
    control(tr('Accounting purpose','记账用途','ငွေစာရင်းရည်ရွယ်ချက်'),kindChoice);
    const redrawKinds=()=>{
      const parent=graph.types.find(x=>x.id===parentChoice.value);
      kindChoice.replaceChildren();
      for(const kind of ['Income|Income','Expense|Expense','Expense|Personal','Income|Loans','Expense|Loans',
          'Transfer|Transfer','Income|Data Adjustment','Expense|Data Adjustment']){
        const k=ledgerKind(kind);if(parent&&k?.type===parent.ledgerType)
          kindChoice.append(makeOption(kind,meaning(kind),kind));
      }
    };
    parentChoice.addEventListener('change',redrawKinds);redrawKinds();
  }
  if(!item&&field==='category'){
    parentChoice=elt('select');
    for(const t of graph.transactions.filter(x=>!x.archived&&
      graph.types.some(type=>type.id===x.parentId&&!type.archived))){
      const parent=graph.types.find(x=>x.id===t.parentId);
      parentChoice.append(makeOption(t.id,(parent?.label||'')+' → '+t.label,t.id));
    }
    control(tr('Linked Transaction','关联 Transaction','ချိတ်ဆက်ထားသော Transaction'),parentChoice);
  }
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const value=name.value.trim();
    if(!value)return;
    attempt(()=>{
      if(item)controller.rename(field,item.id,value);
      else if(field==='type')controller.addType(value,typeChoice.value);
      else if(field==='transaction')controller.addTransaction(value,parentChoice.value,kindChoice.value);
      else controller.addCategory(value,parentChoice.value);
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
    const snippets=items.filter(x=>!x.archived).slice(0,3).map(x=>x.label).join(' · ');
    card.append(elt('div','mmh-hier-examples',snippets||tr('No items yet','尚未添加','မရှိသေးပါ')));
    const manage=btn(tr('Manage','管理','စီမံရန်'),()=>open(field),'mmh-hier-btn');
    manage.disabled=!ready();card.append(manage);cards.append(card);
  }
  root.append(elt('p','mmh-hier-muted',tr(
    'Already-used options: Archive only. Historical transactions are never changed.',
    '已使用的项目只能归档；历史交易记录始终保留。',
    'မှတ်တမ်းဟောင်းများကို မပြောင်းဘဲ အသုံးပြုပြီးသော အရာများကို သိမ်းနိုင်ပါသည်။')));
  // A confirmed ledger insert and its configuration-sidecar cloud write are
  // separate operations. Show verification truthfully, never imply atomicity.
  if(linkSync?.owner===owner()){
    const status=elt('div','mmh-hier-muted');status.setAttribute('role','status');
    const verified=linkSync.state==='verified';
    status.append(elt('span','',verified?tr(
      'Last transaction link: cloud verified.',
      '最近交易关联：已核对云端记录。',
      'နောက်ဆုံး မှတ်တမ်းချိတ်ဆက်မှုကို cloud တွင် စစ်ဆေးပြီးပါပြီ။'):tr(
      'Transaction saved; Manage link is awaiting cloud verification.',
      '交易已保存；Manage 关联尚待云端核对。',
      'မှတ်တမ်း သိမ်းပြီး၊ Manage ချိတ်ဆက်မှု cloud စစ်ဆေးရန် ကျန်ပါသည်။')));
    if(!verified){
      const retry=btn(tr('Recheck sync','重新核对同步','ထပ်မံစစ်ဆေးရန်'),()=>{void verifyCloudLink(linkSync)},'mmh-hier-btn');
      retry.disabled=checkingCloud;status.append(retry);
    }
    root.append(status);
  }
  const notice=elt('div','mmh-hier-muted');notice.id='mmhHierarchyNotice';notice.hidden=true;root.append(notice);
}
const selected=(el)=>el?.selectedOptions?.[0]?.dataset?.mmhChoiceId||'';
const labels=()=>({type:$('txType')?.closest('label'),transaction:$('txGroup')?.closest('label'),category:$('txCategory')?.closest('label')});
const optionSig=(el,items)=>el&&el.options.length===items.length&&[...el.options].every((x,i)=>
  x.value===items[i].value&&x.textContent===items[i].text&&x.dataset.mmhChoiceId===items[i].id);
function put(el,items,pick){
  if(!el)return;
  if(!optionSig(el,items)){
    el.replaceChildren(...items.map(x=>makeOption(x.value,x.text,x.id)));
  }
  const index=[...el.options].findIndex(x=>x.dataset.mmhChoiceId===pick);
  if(index>=0)el.selectedIndex=index;
  else if(el.options.length)el.selectedIndex=0;
}
function form(){
  const t=$('txType'),g=$('txGroup'),c=$('txCategory'),f=$('txForm');
  if(!t||!g||!c||!f||rendering)return;
  rendering=true;
  try{
    const save=f.querySelector('.actions button:not([type="button"])');
    if(!ready()){
      for(const s of [t,g,c]){s.replaceChildren();s.disabled=true;}
      if(save)save.disabled=true;
      return;
    }
    const types=controller.list('type').map(x=>({id:x.id,value:x.ledgerType,text:x.label}));
    put(t,types,selection.type);selection.type=selected(t);
    const txns=selection.type?controller.list('transaction',selection.type).map(x=>({
      id:x.id,value:ledgerKind(x.kindId)?.group||'',text:x.label})).filter(x=>x.value):[];
    put(g,txns,selection.transaction);selection.transaction=selected(g);
    const cats=selection.transaction?controller.list('category',selection.transaction)
      .map(x=>({id:x.id,value:x.label,text:x.label})):[];
    put(c,cats,selection.category);selection.category=selected(c);
    for(const s of [t,g,c])s.disabled=!s.options.length;
    if(typeof updateAccountLocks==='function'&&types.length)updateAccountLocks();
    if(save)save.disabled=!valid();
  }catch(error){
    console.warn('[MMHVAULT] Hierarchy form unavailable',error);
    for(const s of [t,g,c]){s.replaceChildren();s.disabled=true;}
    const save=f.querySelector('.actions button:not([type="button"])');
    if(save)save.disabled=true;
  }finally{rendering=false;}
}
function valid(){
  if(!ready()||!selection.type||!selection.transaction||!selection.category)return false;
  const path=safe(()=>controller.path(selection.type,selection.transaction,selection.category));
  return !!path&&$('txType')?.value===path.type&&$('txGroup')?.value===path.group&&
    $('txCategory')?.value===path.category;
}
function schedule(){
  if(queued)return;queued=true;
  queueMicrotask(()=>{queued=false;manager();form()});
}
async function verifyCloudLink(target){
  if(!target||checkingCloud||owner()!==target.owner||configOwner()!==target.owner)return;
  checkingCloud=true;schedule();
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
    if(verified&&linkSync===target&&owner()===target.owner&&configOwner()===target.owner)
      target.state='verified';
  }catch(error){console.warn('[MMHVAULT] Manage link readback unavailable',error)}
  finally{
    checkingCloud=false;schedule();
    // A second saved transaction may arrive while the prior cloud check is
    // in-flight. Verify the latest one next, but do not retry failed syncs
    // indefinitely. Failed checks remain Pending for manual retry.
    if(linkSync&&linkSync!==target&&linkSync.state!=='verified'&&
      linkSync.owner===owner()&&linkSync.owner===configOwner())
      queueMicrotask(()=>{void verifyCloudLink(linkSync)});
  }
}
function ledgerInserted(userId,id,values){
  if(!pendingSave||pendingSave.owner!==userId||owner()!==userId)return;
  const current=pendingSave;pendingSave=null;
  if(!values||values.type!==current.path.type||values.group!==current.path.group||
    values.category!==current.path.category)return;
  try{
    controller.recorded(String(id),current.ids.type,current.ids.transaction,current.ids.category,values);
    linkSync={owner:userId,recordId:String(id),ids:{...current.ids},
      canonical:{type:values.type,group:values.group,category:values.category},state:'pending'};
    schedule();void verifyCloudLink(linkSync);
  }catch(error){console.warn('[MMHVAULT] Ledger saved but linked Manage path was not synced',error);
    notify(tr('Transaction saved, but its Manage link could not be confirmed. Reopen Manage to check.',
      '交易已保存，但 Manage 关联未能确认，请重新打开 Manage 检查。',
      'မှတ်တမ်း သိမ်းပြီး၊ Manage ချိတ်ဆက်မှု စစ်ဆေးပါ။'))}
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
      if(!valid()){
        e.preventDefault();e.stopImmediatePropagation();
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
      pendingSave=null;linkSync=null;close();
    }else if(current!==loadedOwner){historyReady=false;selection={type:'',transaction:'',category:''};pendingSave=null;linkSync=null;close();}
    schedule();
  };
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
