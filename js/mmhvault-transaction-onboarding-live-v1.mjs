/* MMHVAULT Transactions Onboarding Guide V1.0
 * UI-only. Never writes a financial ledger, account, Supabase table or config.
 * Owner-specific progress is device-local and may be cleared with browser data.
 * Must not be interpreted as confirmed financial saving without a new owner row.
 */
import {STEPS,cleanOwner,keyFor,normalizeState,initialState,advanceTo,
  pause,stop,finish,markSaved,isAutoEligible,canShowAccountCoach} from './mmhvault-transaction-onboarding-state-v1.mjs';
(()=>{'use strict';
if(window.MMHTransactionsOnboardingV1)return;
const $=id=>document.getElementById(id);
const words={
 en:{
  brand:'MMHVAULT · QUICK GUIDE',help:'Help · Tutorial',step:'STEP',of:'OF',
  pause:'Later',skip:'Skip guide',skipStep:'Skip this step',next:'Continue',start:'Start guide',
  finish:'Finish',history:'View history',close:'Close guide',openManage:'Open Manage',openAccounts:'Open Accounts',
  done:'Ready',notReady:'Complete the action in the page to continue.',saved:'A new transaction has been confirmed in your account.',
  noSave:'You can add your first transaction whenever you are ready; no transaction was created by this guide.',
  welcomeTitle:'Your first transaction, made simple',
  welcomeCopy:'Learn how to set up your own categories and record money in or out. This guide never creates financial data for you.',
  manageTitle:'Find your Manage workspace',
  manageCopy:'Select Manage in Transactions to set up your own transaction fields. Tap the highlighted real menu button to continue.',
  typeTitle:'Create your first type',
  typeCopy:'Use the Type card inside Manage. You decide whether each Type adds money, subtracts money, or transfers it. Examples are only suggestions.',
  transactionTitle:'Link a transaction to your type',
  transactionCopy:'Create a Transaction inside the Type you chose. This preserves the correct money direction. You can skip and configure this later.',
  categoryTitle:'Organize with a category',
  categoryCopy:'Add a Category under an existing Transaction. The category describes the purpose of the money movement. Nothing is created automatically.',
  fieldsTitle:'Understand your transaction fields',
  fieldsCopy:'The current finance engine needs a complete Type → Transaction → Category path when you save. The three money-direction shortcuts only filter your own choices.',
  firstTitle:'Record your first transaction',
  firstCopy:'Choose an existing account, linked fields, amount and date in Add Transaction. Save only when you are ready; you may finish this guide without saving.',
  completeTitle:'You know the essentials',
  completeCopy:'Manage your categories and visit your transaction history whenever you want. The Help button can restart this guide at any time.',
  completeWithSave:'Your new transaction appeared in your account records.',
  noType:'There is no Type yet. Select Manage on the Type card and add one yourself.',
  noTransaction:'First create a Type, then add a Transaction linked to it.',
  noCategory:'First create a linked Transaction, then add a Category under it.',
  accountNeeded:'You have not set up an account yet. Open Accounts and add your own account before recording money.',
  pathNeeded:'Your transaction fields are incomplete. Open Manage and finish the linked Type → Transaction → Category path.',
  readyToSave:'Your account and linked fields are available. Use the highlighted Add Transaction panel; no test transaction is required.',
  managing:'The editing dialog is open. Finish or close it to return to this guide.',
  storageNotice:'Progress is stored separately for this member on this device.',
  unsupported:'This release does not save a transaction with an incomplete three-level path.'
 },
 zh:{
  brand:'MMHVAULT · 新手引导',help:'帮助 · 教程',step:'步骤',of:'共',
  pause:'稍后继续',skip:'跳过教程',skipStep:'跳过这一步',next:'继续',start:'开始教程',
  finish:'完成',history:'查看交易记录',close:'关闭教程',openManage:'打开分类管理',openAccounts:'打开账户管理',
  done:'已准备好',notReady:'请先在页面中完成对应操作。',saved:'已在您的账户记录中确认新增交易。',
  noSave:'您可以以后再添加第一笔交易。本教程没有替您创建任何交易。',
  welcomeTitle:'轻松学会第一笔记账',
  welcomeCopy:'一步步了解自定义分类、资金进出和交易记录。教程不会自动新增财务数据。',
  manageTitle:'认识分类管理',
  manageCopy:'在交易页面点击高亮的管理按钮，打开您的自定义记账设置。',
  typeTitle:'创建第一个类型',
  typeCopy:'进入类型卡片自行添加项目，并明确指定资金增加、减少或转账方向。示例不会自动添加。',
  transactionTitle:'关联交易项目',
  transactionCopy:'在刚创建的类型下添加交易项目，并继承正确的资金方向。不需要现在设置也可以跳过。',
  categoryTitle:'设置分类',
  categoryCopy:'在已创建的交易项目下增加分类，用于区分资金用途。系统不会自动填入示例。',
  fieldsTitle:'了解记账字段',
  fieldsCopy:'当前正式版保存交易需要完整的类型 → 交易项目 → 分类关联。资金方向快捷按钮只筛选您自己创建的选项。',
  firstTitle:'尝试添加第一笔交易',
  firstCopy:'在新增交易中选择已有账户、关联分类、金额和日期。准备好后再保存，也可以不创建交易而完成教程。',
  completeTitle:'已经掌握基本操作',
  completeCopy:'以后可以随时管理分类、查看历史记录，或通过帮助按钮重新打开教程。',
  completeWithSave:'您的新增交易已经出现在账户记录中。',
  noType:'还没有设置类型，请进入类型管理自行添加。',
  noTransaction:'请先添加类型，再创建关联的交易项目。',
  noCategory:'请先创建交易项目，再在其下添加分类。',
  accountNeeded:'目前还没有账户。请先打开账户管理创建您自己的账户。',
  pathNeeded:'记账关联尚未完整，请返回分类管理完成类型、交易项目及分类。',
  readyToSave:'账户和关联字段已准备好。可以使用新增交易，无须为了教程创建测试记录。',
  managing:'正在编辑项目，完成或关闭编辑窗口后继续教程。',
  storageNotice:'教程进度按会员独立保存在当前设备。',
  unsupported:'当前正式版本不能通过不完整的三级关联保存交易。'
 },
 my:{
  brand:'MMHVAULT · လမ်းညွှန်',help:'အကူအညီ · လမ်းညွှန်',step:'အဆင့်',of:'စုစုပေါင်း',
  pause:'နောက်မှ ဆက်မည်',skip:'လမ်းညွှန်ကို ကျော်မည်',skipStep:'ဤအဆင့်ကို ကျော်မည်',next:'ဆက်မည်',start:'စတင်မည်',
  finish:'ပြီးဆုံးမည်',history:'မှတ်တမ်းကြည့်မည်',close:'လမ်းညွှန်ပိတ်မည်',openManage:'အမျိုးအစားများ စီမံမည်',openAccounts:'အကောင့်များ စီမံမည်',
  done:'အဆင်သင့်',notReady:'ဆက်ရန် စာမျက်နှာပေါ်တွင် အဆင့်ကို အရင်လုပ်ဆောင်ပါ။',saved:'သင့်အကောင့်တွင် မှတ်တမ်းအသစ်ကို အတည်ပြုပြီးပါပြီ။',
  noSave:'ပထမဆုံး မှတ်တမ်းကို နောက်မှ ထည့်နိုင်ပါသည်။ ဤလမ်းညွှန်က မှတ်တမ်း မဖန်တီးပါ။',
  welcomeTitle:'ပထမဆုံး ငွေစာရင်းကို လွယ်ကူစွာ စတင်ပါ',
  welcomeCopy:'ကိုယ်ပိုင်အမျိုးအစားများ သတ်မှတ်ခြင်းနှင့် ငွေဝင်ငွေထွက် မှတ်တမ်းတင်ခြင်းကို လေ့လာပါ။ အချက်အလက်များကို အလိုအလျောက် မထည့်ပါ။',
  manageTitle:'စီမံခန့်ခွဲမှုကို လေ့လာပါ',
  manageCopy:'ငွေစာရင်း စာမျက်နှာရှိ မီးမောင်းထိုးထားသော စီမံခန့်ခွဲမှုခလုတ်ကို နှိပ်ပါ။',
  typeTitle:'ပထမဆုံး အမျိုးအစား ဖန်တီးပါ',
  typeCopy:'ငွေတိုး၊ ငွေလျော့ သို့မဟုတ် ငွေလွှဲမှုကို သတ်မှတ်ပြီး ကိုယ်ပိုင် အမျိုးအစားကို ဖန်တီးပါ။ နမူနာများကို အလိုအလျောက် မထည့်ပါ။',
  transactionTitle:'ငွေစာရင်းအမျိုးအစားကို ချိတ်ဆက်ပါ',
  transactionCopy:'ရွေးထားသော အမျိုးအစားအောက်တွင် ငွေစာရင်းအတွက် အမည်အသစ် ထည့်ပါ။ နောက်မှ ပြုလုပ်လိုပါက ဤအဆင့်ကို ကျော်နိုင်ပါသည်။',
  categoryTitle:'အသေးစိတ် အမျိုးအစား သတ်မှတ်ပါ',
  categoryCopy:'ရှိပြီးသား ငွေစာရင်းအမျိုးအစားအောက်တွင် အသေးစိတ်ခွဲခြားမှု ထည့်ပါ။ အလိုအလျောက် ဖန်တီးမည် မဟုတ်ပါ။',
  fieldsTitle:'ငွေစာရင်းအကွက်များကို နားလည်ပါ',
  fieldsCopy:'လက်ရှိစနစ်တွင် မှတ်တမ်းသိမ်းရန် အဆင့်သုံးဆင့် ချိတ်ဆက်ထားရန် လိုအပ်သည်။ ငွေဝင်၊ ငွေထွက်၊ ငွေလွှဲ ခလုတ်များသည် ကိုယ်တိုင်သတ်မှတ်ထားသည့် အရာများကိုသာ စစ်ထုတ်သည်။',
  firstTitle:'ပထမဆုံး မှတ်တမ်း ထည့်ကြည့်ပါ',
  firstCopy:'ရှိပြီးသား အကောင့်၊ အမျိုးအစားများ၊ ပမာဏနှင့် ရက်စွဲကို ရွေးပါ။ အဆင်သင့်ဖြစ်မှ သိမ်းပါ။ မသိမ်းဘဲ လမ်းညွှန်ကို ပြီးဆုံးနိုင်ပါသည်။',
  completeTitle:'အခြေခံအသုံးပြုမှုကို သိရှိပြီးပါပြီ',
  completeCopy:'အမျိုးအစားများကို စီမံပြီး မှတ်တမ်းဟောင်းများကို ကြည့်နိုင်ပါသည်။ အကူအညီခလုတ်မှ လမ်းညွှန်ကို ပြန်ဖွင့်နိုင်ပါသည်။',
  completeWithSave:'အကောင့်မှတ်တမ်းတွင် မှတ်တမ်းအသစ်ကို တွေ့ရှိပြီးပါပြီ။',
  noType:'အမျိုးအစား မရှိသေးပါ။ ကိုယ်တိုင် ထည့်သွင်းပါ။',
  noTransaction:'အမျိုးအစားကို အရင်ဖန်တီးပြီး ငွေစာရင်းအမည် ချိတ်ဆက်ပါ။',
  noCategory:'ငွေစာရင်းအမည် ဖန်တီးပြီးမှ အသေးစိတ် အမျိုးအစား ထည့်ပါ။',
  accountNeeded:'အကောင့် မရှိသေးပါ။ ငွေစာရင်း မထည့်မီ ကိုယ်ပိုင်အကောင့် ဖန်တီးပါ။',
  pathNeeded:'ငွေစာရင်း ချိတ်ဆက်မှု မပြည့်စုံသေးပါ။ စီမံခန့်ခွဲမှုတွင် အဆင့်သုံးဆင့် ပြည့်စုံအောင် ထည့်ပါ။',
  readyToSave:'အကောင့်နှင့် ချိတ်ဆက်မှုများ အဆင်သင့်ဖြစ်ပါပြီ။ စမ်းသပ်မှတ်တမ်း မဖန်တီးလည်း ရပါသည်။',
  managing:'ပြင်ဆင်မှုဝင်းဒိုး ဖွင့်ထားပါသည်။ ပြီးဆုံးသည့်အခါ လမ်းညွှန်ကို ဆက်ပါ။',
  storageNotice:'လမ်းညွှန်တိုးတက်မှုကို ဤစက်တွင် အကောင့်အလိုက် သိမ်းထားပါသည်။',
  unsupported:'လက်ရှိစနစ်သည် မပြည့်စုံသော အဆင့်သုံးဆင့် ချိတ်ဆက်မှုဖြင့် မှတ်တမ်း မသိမ်းနိုင်ပါ။'
 }
};
const doc=document;
const owner=()=>{try{return cleanOwner(currentSessionUser?.id)}catch(_){return''}};
const configOwner=()=>{try{return cleanOwner(MMHVAULT_CONFIG_OWNER)}catch(_){return''}};
const config=()=>{try{return MMHVAULT_CONFIG}catch(_){return null}};
const lang=()=>{
  let l='';try{l=String(localStorage.getItem('mmhvault_language_v3363')||doc.documentElement.lang||'en').toLowerCase()}catch(_){l='en'}
  return l.startsWith('zh')?'zh':/^(my|mm|burmese)/.test(l)?'my':'en';
};
const txPage=()=>!!$('transactions')?.classList.contains('active');
const managerPage=()=>!!$('txManagePanel')&&!$('txManagePanel').hidden&&$('txManagePanel').style.display!=='none';
const editorOpen=()=>!!doc.querySelector('.mmh-hier-overlay');
const targetFor=(step)=>{
  const scope=$('mmhHierarchyManage');
  const cards=scope?.querySelectorAll('.mmh-hier-card')||[];
  if(step==='manage')return doc.querySelector('#transactions .mmh-glass-tx-nav-manage-v1')||$('mmhManageCategoriesLaunchV1');
  if(step==='type')return cards[0]?.querySelector('button:not(:disabled)')||cards[0]||null;
  if(step==='transaction')return cards[1]?.querySelector('button:not(:disabled)')||cards[1]||null;
  if(step==='category')return cards[2]?.querySelector('button:not(:disabled)')||cards[2]||null;
  if(step==='fields')return $('mmhHierarchyDirection')||$('txType');
  if(step==='first')return doc.querySelector('#transactions .mmh-glass-tx-nav-add-v1')||$('txForm');
  return null;
};
let shown=false,help=null,root=null,card=null,halo=null,state=null,activeOwner='',dismissedOwner='',lastSig='',scheduled=false;
let beforeIds=null,submitOwner='';
const read=(id)=>{try{return normalizeState(JSON.parse(localStorage.getItem(keyFor(id))||'null'))}catch(_){return null}};
const persist=s=>{if(!activeOwner||owner()!==activeOwner||configOwner()!==activeOwner)return false;
  const normalized=normalizeState(s);if(!normalized)return false;
  try{localStorage.setItem(keyFor(activeOwner),JSON.stringify(normalized));state=normalized;return true}catch(e){console.warn('[MMHVAULT] Onboarding progress unavailable',e);return false}
};
function snapshot(){
  const id=owner(),c=config();
  const rows=Array.isArray(window.transactions)?window.transactions:[];
  const loaded=!!id&&id===configOwner()&&window.mmhWalletDataOwnerV191===id&&Array.isArray(window.transactions)&&rows.every(x=>x&&x.user_id===id);
  const graph=c?.txHierarchyV11;
  const live=graph?.version===1&&graph.ownerId===id?graph:null;
  const count=x=>Array.isArray(x)?x.filter(v=>!v.archived).length:0;
  const f=c?.txFieldsV12;
  const legacy=(!f||f.version!==1)||(Array.isArray(f?.type)&&f.type.length>0)||
    (Array.isArray(f?.transaction)&&f.transaction.length>0)||(Array.isArray(f?.category)&&f.category.length>0);
  const cfg={type:count(live?.types)>0,transaction:count(live?.transactions)>0,category:count(live?.categories)>0};
  if(!live&&legacy){
    cfg.type=(f?.type?.length||0)>0;cfg.transaction=(f?.transaction?.length||0)>0;cfg.category=(f?.category?.length||0)>0;
  }
  const accounts=Array.isArray(c?.accounts)?c.accounts.filter(x=>x&&x.active!==false):[];
  return {owner:id,loaded,history:rows,hasHistory:rows.length>0,accounts:accounts.length>0,
    configured:cfg,legacy,hasConfigured:cfg.type||cfg.transaction||cfg.category};
}
function mountHelp(){
  const page=$('transactions');
  if(!page)return;
  // The real V11.7 workspace uses the large Add / History / Manage navigation.
  // Do not rely only on the old hero-actions slot used by synthetic fixtures:
  // it may be off-screen or restyled in the live responsive workspace.
  const nav=page.querySelector('.mmh-glass-tx-nav-v1');
  const fallback=page.querySelector('.mmh-tx-hero-actions-v3')||
    page.querySelector('.mmh-transaction-heading-v2');
  if(!help){help=doc.createElement('button');help.type='button';help.id='mmhTxOnboardingHelpV1';
    help.setAttribute('aria-haspopup','dialog');help.addEventListener('click',()=>openGuide(true));}
  if(nav){
    let bar=$('mmhTxOnboardingHelpBarV1');
    if(!bar){bar=doc.createElement('div');bar.id='mmhTxOnboardingHelpBarV1';}
    // Reinsert after live page/navigation re-render; never duplicate the button.
    if(bar.parentNode!==nav.parentNode||bar.nextElementSibling!==nav)nav.before(bar);
    if(help.parentNode!==bar)bar.append(help);
  }else if(fallback&&help.parentNode!==fallback)fallback.append(help);
  help.textContent='✦ '+words[lang()].help;
}
function saveAndClose(status='paused'){
  if(state)persist(status==='skipped'?stop(state):pause(state));
  dismissedOwner=activeOwner;shown=false;beforeIds=null;submitOwner='';
  root?.remove();root=null;card=null;halo=null;lastSig='';
  doc.body.classList.remove('mmh-onboarding-active-v1');
}
function openGuide(manual=false){
  const data=snapshot();
  if(!data.owner||!data.loaded||!txPage())return;
  activeOwner=data.owner;
  state=manual?initialState():(read(activeOwner)||initialState());
  if(manual)persist(state);
  dismissedOwner='';
  shown=true;lastSig='';
  mountHelp();renderGuide();
}
function localeText(){return words[lang()];}
function make(tag,cls,txt){const n=doc.createElement(tag);if(cls)n.className=cls;if(txt!=null)n.textContent=txt;return n;}
function ensureStage(){
  if(root)return;
  root=make('div','mmh-onboard-stage-v1');
  root.id='mmhTransactionsOnboardStageV1';
  root.setAttribute('aria-label','Transactions guide');
  root.append(make('div','mmh-onboard-dim-v1'));
  halo=make('div','mmh-onboard-halo-v1');halo.hidden=true;root.append(halo);
  card=make('section','mmh-onboard-card-v1');card.tabIndex=-1;card.setAttribute('role','dialog');
  card.setAttribute('aria-label','Transactions onboarding');
  card.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();saveAndClose();}});
  root.append(card);doc.body.append(root);
  doc.body.classList.add('mmh-onboarding-active-v1');
}
function placement(){
  if(!shown||!card||!halo)return;
  const stage=STEPS[state?.step||0];
  const target=targetFor(stage);
  const visible=target&&target.isConnected&&target.getBoundingClientRect().width>0&&
    target.getBoundingClientRect().height>0&&target.getClientRects().length>0;
  if(visible&&!editorOpen()){
    const r=target.getBoundingClientRect();
    halo.hidden=false;halo.style.width=Math.max(18,r.width+12)+'px';halo.style.height=Math.max(18,r.height+12)+'px';
    halo.style.transform='translate('+Math.max(0,r.left-6)+'px,'+Math.max(0,r.top-6)+'px)';
  }else halo.hidden=true;
  if(matchMedia('(max-width:690px)').matches){
    card.style.left='';card.style.right='';card.style.top='';card.style.bottom='';return;
  }
  const width=Math.min(390,innerWidth-32),height=card.offsetHeight;
  let left=(innerWidth-width)/2,top=Math.max(12,(innerHeight-height)/2);
  if(visible){
    const r=target.getBoundingClientRect();
    const tryRight=r.right+24,tryLeft=r.left-width-24;
    left=tryRight+width<=innerWidth-12?tryRight:tryLeft>=12?tryLeft:Math.min(innerWidth-width-12,Math.max(12,r.left));
    top=Math.min(innerHeight-height-12,Math.max(12,r.top));
    if(r.bottom>innerHeight-90)top=Math.max(12,Math.min(top,r.top-height-12));
  }
  card.style.left=left+'px';card.style.right='auto';card.style.top=top+'px';card.style.bottom='auto';
}
function action(caption,fn,primary=false,disabled=false){
  const button=make('button','mmh-onboard-cta-v1'+(primary?' is-primary':''),caption);
  button.type='button';button.disabled=disabled;
  button.addEventListener('click',e=>{e.stopPropagation();fn()});
  return button;
}
function go(index){
  if(!shown||!state)return;
  persist(advanceTo(state,index));lastSig='';renderGuide();
}
function end(){
  if(!state)return;
  persist(finish(state));
  dismissedOwner=activeOwner;shown=false;root?.remove();root=null;card=null;halo=null;lastSig='';
  doc.body.classList.remove('mmh-onboarding-active-v1');
}
function openAccounts(){
  try{window.mmhOpenManagerV1?.('accounts')}catch(_){}
  schedule();
}
function openManage(){
  try{window.mmhTxPagePickerOpenCategoriesV3?.()}catch(_){}
  schedule();
}
function viewHistory(){
  end();try{window.showTxTab?.('history')}catch(_){}
}
function renderGuide(){
  if(!shown||!state||!txPage())return;
  const d=snapshot();if(d.owner!==activeOwner||!d.loaded){saveAndClose();return;}
  const locale=lang(),t=localeText(),stage=STEPS[state.step];
  if(editorOpen()){if(root)root.hidden=true;return;}
  if(root)root.hidden=false;
  const manager=managerPage();
  const hasPath=d.configured.type&&d.configured.transaction&&d.configured.category;
  const mode=canShowAccountCoach({hasAccount:d.accounts,hasPath});
  const ready=(stage==='type'&&d.configured.type)||(stage==='transaction'&&d.configured.transaction)||
    (stage==='category'&&d.configured.category);
  const signature=[stage,locale,manager,d.accounts,hasPath,d.configured.type,d.configured.transaction,d.configured.category,
    state.hasSavedTransaction,mode].join('|');
  ensureStage();
  if(signature===lastSig){placement();return;}
  lastSig=signature;card.replaceChildren();card.lang=locale;
  const header=make('div','mmh-onboard-head-v1');
  const brand=make('div','mmh-onboard-brand-v1');brand.append(make('span','mmh-onboard-logo-v1','✦'),make('span','',t.brand));
  const x=make('button','mmh-onboard-close-v1','×');x.type='button';x.setAttribute('aria-label',t.close);
  x.addEventListener('click',()=>saveAndClose());
  const right=make('div','mmh-onboard-head-actions-v1');
  if(stage!=='complete'){
    const skipAll=make('button','mmh-onboard-skip-v1',t.skip);
    skipAll.type='button';skipAll.addEventListener('click',()=>saveAndClose('skipped'));
    right.append(skipAll);
  }
  right.append(x);header.append(brand,right);card.append(header);
  card.append(make('div','mmh-onboard-step-v1',t.step+' '+(state.step+1)+' '+t.of+' '+STEPS.length));
  card.append(make('h2','mmh-onboard-title-v1',t[stage+'Title']));
  card.append(make('p','mmh-onboard-copy-v1',t[stage+'Copy']));
  let note='';
  if(stage==='type'&&!d.configured.type)note=t.noType;
  else if(stage==='transaction'&&!d.configured.transaction)note=t.noTransaction;
  else if(stage==='category'&&!d.configured.category)note=t.noCategory;
  else if(stage==='fields')note=t.unsupported;
  else if(stage==='first')note=mode==='account'?t.accountNeeded:mode==='manage'?t.pathNeeded:t.readyToSave;
  else if(stage==='complete')note=state.hasSavedTransaction?t.completeWithSave:t.noSave;
  else if(stage==='welcome')note=t.storageNotice;
  if(note)card.append(make('div','mmh-onboard-note-v1',note));
  const dots=make('div','mmh-onboard-dotrow-v1');
  for(let i=0;i<STEPS.length;i++)dots.append(make('span','mmh-onboard-dot-v1'+(i<=state.step?' is-done':'')));
  dots.setAttribute('aria-hidden','true');card.append(dots);
  const footer=make('div','mmh-onboard-actions-v1');
  if(stage==='welcome'){
    footer.append(action(t.pause,()=>saveAndClose()));
    footer.append(action(t.start,()=>go(1),true));
  }else if(stage==='manage'){
    footer.append(action(t.skip,()=>saveAndClose('skipped')));
    if(manager)footer.append(action(t.next,()=>go(2),true));
    else footer.append(action(t.openManage,openManage,true));
  }else if(['type','transaction','category'].includes(stage)){
    footer.append(action(t.skipStep,()=>go(state.step+1)));
    footer.append(action(t.next,()=>go(state.step+1),true,!ready));
    if(!manager)footer.append(action(t.openManage,openManage));
  }else if(stage==='fields'){
    footer.append(action(t.pause,()=>saveAndClose()));
    footer.append(action(t.next,()=>go(6),true));
  }else if(stage==='first'){
    if(mode==='account')footer.append(action(t.openAccounts,openAccounts));
    else if(mode==='manage')footer.append(action(t.openManage,openManage));
    footer.append(action(t.skipStep,()=>go(7)));
    if(state.hasSavedTransaction)footer.append(action(t.next,()=>go(7),true));
  }else if(stage==='complete'){
    footer.append(action(t.history,viewHistory));
    footer.append(action(t.finish,end,true));
  }
  card.append(footer);
  placement();
}
function checkSaved(){
  if(!shown||!state||STEPS[state.step]!=='first'||!beforeIds||submitOwner!==activeOwner)return;
  const d=snapshot();if(!d.loaded||d.owner!==submitOwner)return;
  const inserted=d.history.some(row=>row?.user_id===submitOwner&&row.id!=null&&!beforeIds.has(String(row.id)));
  if(inserted){beforeIds=null;submitOwner='';persist(markSaved(state));go(7);}
}
function schedule(){
  if(scheduled)return;scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;mountHelp();const d=snapshot();
    if(!txPage()){
      if(shown)saveAndClose();return;
    }
    if(!d.loaded||!d.owner){if(shown)saveAndClose();return;}
    if(shown){checkSaved();renderGuide();return;}
    if(dismissedOwner===d.owner)return;
    const saved=read(d.owner);
    if(isAutoEligible({saved,historyLoaded:d.loaded,hasHistory:d.hasHistory,hasAccounts:d.accounts,
      hasConfigured:d.hasConfigured,hasLegacy:d.legacy}))openGuide(false);
  });
}
function onClick(e){
  if(!shown||!state||owner()!==activeOwner)return;
  const element=e.target instanceof Element?e.target:null;if(!element)return;
  const step=STEPS[state.step];
  if(step==='manage'&&element.closest('.mmh-glass-tx-nav-manage-v1,#mmhManageCategoriesLaunchV1')){
    requestAnimationFrame(()=>{if(shown&&managerPage())go(2);});
  }
  if(step==='first'&&element.closest('#txForm .actions button:not([type="button"])')){
    const d=snapshot();if(!d.loaded)return;
    submitOwner=d.owner;beforeIds=new Set(d.history.map(row=>String(row.id)));
  }
  schedule();
}
function onOwnerChange(){
  if(shown)saveAndClose();
  activeOwner='';dismissedOwner='';state=null;beforeIds=null;submitOwner='';
  schedule();
}
function init(){
  mountHelp();
  doc.addEventListener('click',onClick,{capture:true});
  window.addEventListener('mmhvault:config-owner-changed',onOwnerChange);
  for(const type of ['mmhvault:rendered','mmhvault:data-loaded','mmhvault:category-config-changed',
    'mmhvault:config-cloud-synced','mmhvault:page-visible','languagechange','mmhvault-language-change']){
    window.addEventListener(type,schedule,{passive:true});
  }
  window.addEventListener('resize',()=>{if(shown)placement()},{passive:true});
  window.addEventListener('scroll',()=>{if(shown)placement()},{passive:true,capture:true});
  doc.addEventListener('keydown',e=>{if(shown&&e.key==='Escape'&&!editorOpen())saveAndClose()});
  const page=$('transactions');
  if(page)new MutationObserver(schedule).observe(page,{attributes:true,attributeFilter:['class','hidden'],childList:true});
  const section=$('mmhManagerCategoriesPanelV445');
  if(section)new MutationObserver(schedule).observe(section,{childList:true,subtree:false});
  new MutationObserver(schedule).observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});
  window.addEventListener('storage',e=>{
    if(e.key==='mmhvault_language_v3363')schedule();
    if(activeOwner&&e.key===keyFor(activeOwner)){if(shown)renderGuide();else schedule();}
  });
  schedule();
}
window.MMHTransactionsOnboardingV1=Object.freeze({version:'1.0.0',open:()=>openGuide(true),close:()=>saveAndClose(),
  status:()=>({active:shown,step:shown?STEPS[state?.step||0]:null})});
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
