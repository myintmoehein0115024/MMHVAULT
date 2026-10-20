/* MMHVAULT Life Planner Phase 4.5 - safe reverse reallocation and manual expense reconciliation.
 * This module NEVER moves money, posts transactions, credits assets or imports
 * speculative unused budgets as deposits. The figures are self-declared labels
 * on existing funds, not proof of available account balances.
 */
(()=>{
'use strict';
if(window.MMHLifeFundsV41)return;
const ROOT='mmhLifeFundsV41',FUNDS='life_funds',ALLOC='life_fund_allocations',MOVES='life_fund_movements',TRANSFERS='life_fund_transfers',RECONS='life_fund_use_reconciliations';
const $=id=>document.getElementById(id);
const owner=()=>{try{return typeof currentSessionUser!=='undefined'?currentSessionUser?.id||'':'';}catch{return ''}};
const epoch=()=>Number(window.__mmhSessionEpochV1239)||0;
const client=()=>{try{return typeof db!=='undefined'&&db?.from?db:null;}catch{return null}};
const isZh=()=>{try{return localStorage.getItem('mmhvault_language_v3363')==='zh';}catch{return false}};
const L=(zh,en)=>isZh()?zh:en;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY={USD:'$',THB:'฿',MMK:'K',RMB:'￥'};
const currency=x=>Object.prototype.hasOwnProperty.call(KEY,x);
const money=(n,c)=>`${KEY[c]||''}${Number(n||0).toLocaleString(isZh()?'zh-CN':'en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} ${c}`;
const num=x=>{if(String(x).trim()==='')return NaN;const v=Number(x);return Number.isFinite(v)?Math.round(v*100)/100:NaN};
const dateToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const isDate=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s)))return false;const d=new Date(s+'T12:00:00');return !Number.isNaN(d.getTime())&&`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`===s};
const requestId=()=>crypto.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const b=crypto.getRandomValues(new Uint8Array(1))[0];return(c==='x'?b&15:(b&3)|8).toString(16)});
const state={owner:'',epoch:0,token:0,loaded:false,loading:false,saving:false,funds:[],allocations:[],movements:[],transfers:[],reconciliations:[],txById:{},error:'',notice:'',reveal:false,dialog:null};
let revealTimer=null;
const active=()=>!!state.owner&&owner()===state.owner&&epoch()===state.epoch&&!!$(ROOT)&&$('life-planner')?.classList.contains('active')&&!document.hidden;
const getFund=id=>state.funds.find(x=>x.id===id&&x.user_id===state.owner);
const canSee=f=>!!f&&(!f.is_private||state.reveal);
const displayFundName=id=>{const f=getFund(id);return f&&canSee(f)?esc(f.name):L('私人基金','Private fund')};
const valid=(u,ep)=>u===state.owner&&ep===state.epoch&&active();
function hide(){if(revealTimer!==null)clearTimeout(revealTimer);revealTimer=null;state.reveal=false;if(['transfer','reconcile'].includes(state.dialog?.kind)||state.dialog?.id&&getFund(state.dialog.id)?.is_private)closeDialog();render()}
function closeDialog(){state.dialog=null;const n=$('lfDialogV41');if(n){try{n.close()}catch{}n.remove()}document.body.classList.remove('lf-modal-open')}
function forget(){if(revealTimer!==null)clearTimeout(revealTimer);revealTimer=null;state.token++;state.reveal=false;state.funds=[];state.allocations=[];state.movements=[];state.transfers=[];state.reconciliations=[];state.txById={};state.loaded=false;state.loading=false;state.saving=false;state.error='';state.notice='';closeDialog();const host=$(ROOT);if(host)host.replaceChildren()}
function showPrivate(){if(revealTimer!==null)clearTimeout(revealTimer);state.reveal=true;revealTimer=setTimeout(hide,90000);render()}
function missing(e){return /42P01|PGRST205|schema cache|does not exist|could not find the table/i.test(String(e?.code||'')+' '+String(e?.message||''))}
async function authorized(){if(!active()||!client())throw Error('AUTH');const c=client(),r=await c.auth.getUser();if(r.error||r.data?.user?.id!==state.owner||!active())throw Error('AUTH');return c}
async function load(){if(!active()||state.loading||state.saving)return;const token=++state.token,u=state.owner,ep=state.epoch;state.loading=true;state.error='';render();try{
 const c=await authorized();const f=await c.from(FUNDS).select('*').eq('user_id',u).order('created_at',{ascending:false}).limit(500);if(f.error)throw f.error;if(!valid(u,ep)||token!==state.token)return;
 const a=await c.from(ALLOC).select('*').eq('user_id',u).order('allocated_on',{ascending:false}).limit(4000);if(a.error)throw a.error;if(!valid(u,ep)||token!==state.token)return;
 const m=await c.from(MOVES).select('*').eq('user_id',u).order('created_at',{ascending:false}).limit(6000);if(m.error)throw m.error;if(!valid(u,ep)||token!==state.token)return;
 const t=await c.from(TRANSFERS).select('*').eq('user_id',u).order('created_at',{ascending:false}).limit(6000);if(t.error)throw t.error;if(!valid(u,ep)||token!==state.token)return;
 const r=await c.from(RECONS).select('*').eq('user_id',u).order('created_at',{ascending:false}).limit(2000);if(r.error)throw r.error;if(!valid(u,ep)||token!==state.token)return;
 const related={};const ids=[...new Set((r.data||[]).map(x=>Number(x.transaction_id)))];
 for(let i=0;i<ids.length;i+=80){const tx=await c.from('transactions').select('id,user_id,type,tx_date,from_account,from_amount').eq('user_id',u).in('id',ids.slice(i,i+80));if(tx.error)throw tx.error;if(!valid(u,ep)||token!==state.token)return;for(const row of tx.data||[])related[String(row.id)]=row}
 
 if((f.data||[]).length===500||(a.data||[]).length===4000||(m.data||[]).length===6000||(t.data||[]).length===6000||(r.data||[]).length===2000){state.error='LIMIT';state.funds=[];state.allocations=[];state.movements=[];state.transfers=[];state.loaded=false;return}
 state.funds=(f.data||[]).filter(x=>x.user_id===u);state.allocations=(a.data||[]).filter(x=>x.user_id===u);state.movements=(m.data||[]).filter(x=>x.user_id===u);state.transfers=(t.data||[]).filter(x=>x.user_id===u);state.reconciliations=(r.data||[]).filter(x=>x.user_id===u);state.txById=related;state.loaded=true;
 }catch(e){if(valid(u,ep)&&token===state.token){state.funds=[];state.allocations=[];state.movements=[];state.transfers=[];state.reconciliations=[];state.txById={};state.loaded=false;state.error=missing(e)?'MIGRATION':'CONNECT';}}
 finally{if(valid(u,ep)&&token===state.token){state.loading=false;render()}}
}
// A source account is a user-owned planning label, NOT a debit or locked bank balance.
// The legacy finance engine owns the balance() formula. We only read it; never alter it.
const normCurrency=c=>String(c||'').toUpperCase()==='CNY'?'RMB':String(c||'').toUpperCase();
function financeReady(){
 try{return !!state.owner && typeof MMHVAULT_CONFIG_OWNER!=='undefined' && MMHVAULT_CONFIG_OWNER===state.owner &&
   typeof MMHVAULT_CONFIG!=='undefined' && Array.isArray(MMHVAULT_CONFIG.accounts) &&
   typeof balance==='function' && Array.isArray(transactions) && Array.isArray(investments) &&
   Number(window.__mmhLastCloudLoadAtV1235||0)>0 && Date.now()-Number(window.__mmhLastCloudLoadAtV1235||0)<300000;
 }catch{return false}
}
function accountsFor(f){
 if(!financeReady())return [];
 try{return MMHVAULT_CONFIG.accounts.filter(a=>a&&a.active!==false&&a.id&&a.name&&
  !['crypto','investment'].includes(String(a.type||'').toLowerCase())&&normCurrency(a.currency)===f.currency)
  .map(a=>({id:String(a.id),name:String(a.name),currency:normCurrency(a.currency),balance:Number(balance(a.name))}))
  .filter(a=>Number.isFinite(a.balance));}catch{return []}
}
const movementTotal=(allocationId,arr=state.movements)=>Math.round(arr.filter(x=>x.allocation_id===allocationId).reduce((v,x)=>v+Number(x.amount||0),0)*100)/100;
const transferTotal=(allocationId,arr=state.transfers)=>Math.round(arr.filter(x=>x.source_allocation_id===allocationId).reduce((v,x)=>v+Number(x.amount||0),0)*100)/100;
const allocationRemaining=(a,mov=state.movements,trans=state.transfers)=>Math.round((Number(a.amount||0)-movementTotal(a.id,mov)-transferTotal(a.id,trans))*100)/100;
// Only confirmed releases free source-account planning capacity.
// Self-reported "use" is NOT proof of a posted real transaction; retain its
// conservative hold to avoid showing potentially overstated available funds.
const heldForAccount=(a,mov=state.movements,trans=state.transfers)=>Math.round((Number(a.amount||0)-mov.filter(m=>m.allocation_id===a.id&&m.kind==='release').reduce((n,m)=>n+Number(m.amount||0),0)-transferTotal(a.id,trans))*100)/100;
const assignedTo=(accountId,arr=state.allocations,mov=state.movements,trans=state.transfers)=>Math.round(arr.filter(x=>x.source_account_id===accountId).reduce((v,x)=>v+heldForAccount(x,mov,trans),0)*100)/100;
function accountRoom(a,allocs=state.allocations){return Math.round((a.balance-assignedTo(a.id,allocs))*100)/100}
function accountReviewLine(e,f){
 if(!e.source_account_id)return L('旧预留：尚未关联来源账户','Legacy earmark: source not linked');
 const found=accountsFor(f).find(a=>a.id===e.source_account_id);
 return found?L('来源账户：','Source account: ')+esc(found.name):L('关联账户已归档、改名或暂不可核对','Source account archived, changed, or not verified');
}
const reserved=id=>Math.round(state.allocations.filter(x=>x.fund_id===id).reduce((n,x)=>n+allocationRemaining(x),0)*100)/100;
const used=id=>Math.round(state.movements.filter(x=>x.fund_id===id&&x.kind==='use').reduce((n,x)=>n+Number(x.amount||0),0)*100)/100;
const released=id=>Math.round(state.movements.filter(x=>x.fund_id===id&&x.kind==='release').reduce((n,x)=>n+Number(x.amount||0),0)*100)/100;
const outgoing=id=>Math.round(state.transfers.filter(x=>x.source_fund_id===id).reduce((n,x)=>n+Number(x.amount||0),0)*100)/100;
const incoming=id=>Math.round(state.transfers.filter(x=>x.target_fund_id===id).reduce((n,x)=>n+Number(x.amount||0),0)*100)/100;
// An exact date, account and amount match is a candidate only, NEVER proof of payment.
function transactionCandidates(m,a){
 if(m.kind!=='use'||!a.source_account_id||!financeReady())return null;
 const f=getFund(a.fund_id),account=accountsFor(f).find(x=>x.id===a.source_account_id);
 if(!account)return null;
 try{return transactions.filter(t=>t.user_id===state.owner&&t.type==='Expense'&&t.tx_date===m.occurred_on&&
 t.from_account===account.name&&Math.round(Number(t.from_amount||0)*100)===Math.round(Number(m.amount||0)*100)).length}catch{return null}
}


// A manual match is a user-confirmed pointer to an existing Expense row, NOT a new transaction.
// Re-validate the live source row on each reload. Changes/deletions never count as proof of payment.
const reconFor=id=>state.reconciliations.find(r=>r.movement_id===id);
function reconValid(m,a){
 const r=reconFor(m.id);if(!r)return false;
 const tx=state.txById[String(r.transaction_id)];
 return !!(tx&&tx.user_id===state.owner&&tx.type==='Expense'&&tx.tx_date===m.occurred_on&&
  tx.from_account===a.source_account_name&&Math.round(Number(tx.from_amount||0)*100)===Math.round(Number(m.amount)*100)&&
  accountsFor(getFund(a.fund_id)).some(z=>z.id===a.source_account_id&&z.name===a.source_account_name));
}
function reconLine(m,a){const rec=reconFor(m.id);
 if(!rec)return L('尚未人工对账','Not manually reconciled');
 return reconValid(m,a)?L('已人工关联交易 #','Manually matched to Expense #')+esc(rec.transaction_id):L('原交易已变化或不可核实；需要解除并重新对账','Linked expense changed or cannot be verified; review and unlink');
}

function render(){const root=$(ROOT);if(!root)return;let info=state.error==='MIGRATION'?L('基金数据库尚未启用或不可访问。为保护数据，本功能不会改用本地缓存保存。','Fund tables are unavailable. No insecure local-storage fallback is used.'):state.error==='LIMIT'?L('记录达到安全读取上限，已暂停操作以避免显示不完整的余额。','Read limit reached; operations paused to avoid incomplete allocation totals.'):state.error==='LOGIN'?L('请先登录个人空间。','Sign in to your personal workspace.'):state.error?L('无法连接到云端数据。请检查网络后刷新。','Cloud data unavailable. Check connection and refresh.'):'',list=state.loaded?state.funds:[];
 root.innerHTML=`<section class="lf-shell"><header class="lf-head"><div><span class="lf-kicker">LIFE PLANNER / WISH FUND</span><h1>${L('为未来喜欢的生活预留一点空间','A little space for your future')}</h1><p>${L('自由基金与愿望基金，把现有资金的用途安排得更清楚。','Free funds and wish funds to label how you plan to use money you already have.')}</p></div><div class="lf-head-actions"><button data-lf-act="refresh" type="button">${L('刷新','Refresh')}</button><button class="lf-primary" data-lf-act="add" type="button" ${!state.loaded?'disabled':''}>＋ ${L('创建基金','New fund')}</button></div></header>
 <div class="lf-callout"><strong>◇ ${L('预留、释放和用途使用都不是银行交易','Earmark, release and purpose use are not banking transactions')}</strong><p>${L('基金只是您对现有资产的“用途标记”。增加预留不会增加总资产、收入或账户余额；释放预留与登记用途使用也不会转账或产生真实支出。使用记录只代表手动声明，实际扣款必须到 Transactions 单独记账。账户关联仅为只读参考，资金没有真正锁定。','Funds are labels on money you already own. Earmarking does not increase assets. Releasing or recording purpose use does not transfer money or create an actual expense. Real spending must be recorded in Transactions separately. Account linking is a read-only estimate, not a hold.')}</p></div>
 <div class="lf-privacy"><span>🔒 ${L('私人基金默认隐藏名称和金额，离开页面自动重新锁定。','Private fund names and figures remain masked until you reveal them.')}</span><button type="button" data-lf-act="reveal">${state.reveal?L('重新隐藏','Hide now'):L('临时显示 90 秒','Reveal for 90 seconds')}</button></div>
 ${info?`<div class="lf-alert" role="alert">${esc(info)}</div>`:''}${state.notice?`<div class="lf-note" role="status">${esc(state.notice)}</div>`:''}
 ${state.loading?`<p class="lf-status">${L('正在读取基金…','Loading funds…')}</p>`:state.loaded?(list.length?`<div class="lf-grid">${list.map(f=>card(f)).join('')}</div>`:`<div class="lf-empty"><div aria-hidden="true">🌱</div><h2>${L('从一个小小的目标开始','Start with one simple intention')}</h2><p>${L('尚无基金。先创建自由基金或一个心愿，不会自动存入任何金额。','No funds yet. Create a free or wish fund; no amounts are deposited automatically.')}</p><button class="lf-primary" data-lf-act="add" type="button">＋ ${L('创建我的第一个基金','Create first fund')}</button></div>`):`<div class="lf-empty"><p>${L('尚未读取到可用的云端数据。','Cloud data has not loaded.')}</p></div>`}
 <p class="lf-disclaimer">${L('注意：未使用预算 ≠ 已储蓄；标记为预留 ≠ 已转入独立账户。来源账户余额仅供近期账本核对；跨设备并发及银行可用资金无法由此保证，不应用作实际可支配现金证明。','Unused budget ≠ saved money. An earmark ≠ a bank transfer. Account balance checks are advisory only; concurrent devices and bank liquidity cannot be guaranteed.')}</p></section>`;
}
function card(f){const privateMask=!canSee(f),amount=reserved(f.id),goal=Number(f.goal_amount||0),ratio=goal>0?Math.min(100,Math.max(0,Math.round(amount/goal*100))):0;
 const data=state.allocations.filter(x=>x.fund_id===f.id).slice().sort((a,b)=>b.allocated_on.localeCompare(a.allocated_on));
 return `<article class="lf-card ${privateMask?'lf-masked':''}"><div class="lf-card-top"><span class="lf-type">${f.fund_type==='free'?L('自由基金','Free Fund'):L('愿望基金','Wish Fund')}</span><span class="lf-label">${f.is_private?'🔒 '+L('私人','Private'):L('普通','Standard')}</span></div>
 <h2>${privateMask?L('私人基金','Private fund'):esc(f.name)}</h2><p class="lf-card-desc">${privateMask?L('信息已隐藏','Details are hidden'):f.fund_type==='wish'?L('为喜欢的东西认真留一份计划','Setting aside for a wish'):L('自由安排，未来再决定用途','Flexibility for later choices')}</p>
 <div class="lf-amount"><small>${L('已标记预留（非到账）','Earmarked, not deposited')}</small><strong>${privateMask?'••••':money(amount,f.currency)}</strong></div>
 <div class="lf-fund-flow"><span>${L('已释放','Released')}: <b>${privateMask?'••••':money(released(f.id),f.currency)}</b></span><span>${L('转出','Reallocated out')}: <b>${privateMask?'••••':money(outgoing(f.id),f.currency)}</b></span><span>${L('转入','Reallocated in')}: <b>${privateMask?'••••':money(incoming(f.id),f.currency)}</b></span><span>${L('用途使用（手动声明）','Purpose use (self-reported)')}: <b>${privateMask?'••••':money(used(f.id),f.currency)}</b></span></div>
 ${goal>0?`<div class="lf-progress" role="progressbar" aria-label="${L('基金目标进度','Goal progress')}" aria-valuemin="0" aria-valuemax="100" ${privateMask?'':'aria-valuenow="'+ratio+'"'}><i style="width:${privateMask?0:ratio}%"></i></div><p class="lf-progress-copy">${privateMask?L('目标已隐藏','Goal hidden'):money(goal,f.currency)+' · '+ratio+'%'}</p>`:`<p class="lf-progress-copy">${privateMask?L('详情已隐藏','Details hidden'):L('自由使用，无固定金额目标','No fixed amount target')}</p>`}
 ${privateMask?`<p class="lf-muted">${L('临时显示后才能编辑或登记预留。','Reveal temporarily before viewing or editing.')}</p>`:`<div class="lf-actions"><button data-lf-act="reserve" data-id="${f.id}" type="button">＋ ${L('标记预留','Add earmark')}</button><button data-lf-act="edit" data-id="${f.id}" type="button">${L('编辑','Edit')}</button><button data-lf-act="remove" data-id="${f.id}" type="button">${L('删除基金','Delete fund')}</button></div>
 <details class="lf-history"><summary>${L('资金流水与历史','Earmarks & movement history')} (${data.length})</summary>${data.length?data.map(e=>{const remains=allocationRemaining(e),movs=state.movements.filter(m=>m.allocation_id===e.id).sort((a,b)=>b.created_at.localeCompare(a.created_at));return `<div class="lf-history-row lf-flow-row"><div class="lf-flow-main"><strong>${L('原预留','Initial earmark')}: ${money(e.amount,f.currency)}</strong><small>${esc(e.allocated_on)} · ${accountReviewLine(e,f)}${e.note?' · '+esc(e.note):''}</small><span class="lf-remains">${L('尚在预留','Still earmarked')}: ${money(remains,f.currency)}</span>${movs.map(m=>`<div class="lf-movement-item"><span>${m.kind==='release'?L('↩ 释放预留','↩ Released'):L('✓ 用途使用（非扣款）','✓ Purpose use (not a debit)')}</span><b>−${money(m.amount,f.currency)}</b><small>${esc(m.occurred_on)}${m.note?' · '+esc(m.note):''}${m.kind==='use'?' · '+reconLine(m,e):''}</small>${m.kind==='use'?`<div class="lf-recon-actions">${reconFor(m.id)?`<button type="button" data-lf-act="unlink" data-fund="${f.id}" data-id="${m.id}">${L('解除人工关联','Unlink match')}</button>`:`<button type="button" data-lf-act="reconcile" data-fund="${f.id}" data-id="${m.id}">${L('核对真实交易','Match Expense')}</button>`}</div>`:''}</div>`).join('')}
 ${state.transfers.filter(t=>t.source_allocation_id===e.id).map(t=>`<div class="lf-movement-item lf-transfer-item"><span>↗ ${L('调配至','Moved to')} ${displayFundName(t.target_fund_id)}</span><b>−${money(t.amount,f.currency)}</b><small>${esc(t.occurred_on)}${t.note?' · '+esc(t.note):''} · ${L('仅用途调整','planning only')}</small></div>`).join('')}
 ${state.transfers.filter(t=>t.target_allocation_id===e.id).map(t=>`<div class="lf-movement-item lf-transfer-in"><span>↙ ${L('由基金调入','Received from')} ${displayFundName(t.source_fund_id)}</span><b>＋${money(t.amount,f.currency)}</b><small>${esc(t.occurred_on)} · ${L('并未产生新资产','no new assets created')}</small>${allocationRemaining(e)>0.001?`<div class="lf-recon-actions"><button type="button" data-lf-act="reverse" data-fund="${f.id}" data-id="${e.id}" data-transfer="${t.id}">${L('反向调配（留存历史）','Reverse by new transfer')}</button></div>`:''}</div>`).join('')}</div>${remains>0.001?`<div class="lf-entry-actions"><button type="button" data-lf-act="movement" data-id="${e.id}" data-fund="${f.id}">${L('释放／使用','Release / use')}</button>${e.source_account_id&&state.funds.some(to=>to.id!==f.id&&to.currency===f.currency)?`<button type="button" data-lf-act="transfer" data-id="${e.id}" data-fund="${f.id}">${L('调配到其他基金','Move to another fund')}</button>`:''}</div>`:''}</div>`}).join(''):`<p class="lf-muted">${L('尚无记录','No entries')}</p>`}</details>`}
 </article>`;
}
function dialogShell(title,body,submit,kind,id){closeDialog();const node=document.createElement('dialog');node.className='lf-dialog';node.id='lfDialogV41';node.innerHTML=`<form id="lfFormV41"><div class="lf-dialog-head"><div><small>LIFE PLANNER · WISH FUND</small><h2>${title}</h2></div><button aria-label="${L('关闭','Close')}" type="button" data-lf-act="close">×</button></div><div class="lf-dialog-body">${body}<p class="lf-error" role="alert" id="lfDialogErrorV41"></p></div><div class="lf-dialog-actions"><button type="button" data-lf-act="close">${L('取消','Cancel')}</button><button class="lf-primary" type="submit">${submit}</button></div></form>`;document.body.append(node);const request=requestId();state.dialog={kind,id,request,snapshot:null};node.addEventListener('close',()=>{node.remove();if(state.dialog?.request===request)state.dialog=null;document.body.classList.remove('lf-modal-open')});node.addEventListener('click',e=>{if(e.target===node&&!state.saving)closeDialog()});try{node.showModal()}catch{node.setAttribute('open','')}document.body.classList.add('lf-modal-open');const input=node.querySelector('input:not([type="checkbox"]),select');input?.focus({preventScroll:true})}
function fundDialog(id){const f=id?getFund(id):null;if(id&&!canSee(f))return;
 const t=f?L('编辑基金','Edit fund'):L('创建一个基金','Create a fund');const goal=f?.goal_amount===null||f?.goal_amount===undefined?'':String(f.goal_amount);
 dialogShell(t,`<div class="lf-form-grid"><label>${L('基金类型','Fund type')}<select name="fund_type" ${f?'disabled':''}><option value="free" ${f?.fund_type==='free'?'selected':''}>${L('自由基金','Free fund')}</option><option value="wish" ${f?.fund_type==='wish'?'selected':''}>${L('指定愿望基金','Wish fund')}</option></select></label><label>${L('币种','Currency')}<select name="currency" ${f?'disabled':''}>${Object.keys(KEY).map(x=>`<option value="${x}" ${f?.currency===x?'selected':''}>${x}</option>`).join('')}</select></label></div><label>${L('基金名称','Fund name')}<input name="name" maxlength="100" required placeholder="${L('例如：未来旅行','e.g. Future travel')}" value="${esc(f?.name||'')}"></label><div class="lf-form-grid"><label>${L('目标金额（可选）','Target amount (optional)')}<input name="goal_amount" type="number" min="0" max="999999999" step="0.01" value="${esc(goal)}"></label><label>${L('每月预留计划（仅参考）','Monthly plan (advisory)')}<input name="monthly_plan" type="number" min="0" max="999999999" step="0.01" value="${Number(f?.monthly_plan||0)}"></label></div><label class="lf-checkbox"><input name="is_private" type="checkbox" ${f?.is_private===false?'':'checked'}><span>${L('私人基金：默认隐藏名称及金额','Private: hide name and amounts by default')}</span></label><p class="lf-hint">${L('这里只建立基金用途标签，不进行真实金融交易；变更类型或币种需新建基金。','Creates a budgeting label only. To change type or currency, create another fund.')}</p>`,f?L('保存修改','Save changes'):L('创建基金','Create fund'),'fund',id||null);
}
function allocationDialog(id){const f=getFund(id);if(!canSee(f))return;
 const matches=accountsFor(f),canAllocate=matches.some(a=>a.balance>=0&&accountRoom(a)>0);
 dialogShell(L('确认资金用途预留','Confirm earmark'),`<div class="lf-notice">${L('仅将现有资金标记为用途预留。不扣款，不新增资产，也不真实锁定银行资金。','This only labels existing assets; there is no debit, new asset, or banking hold.')}</div><label>${L('来源账户（仅同币种、非投资账户）','Source account (same currency, non-investment)')}<select name="source_account_id" required ${canAllocate?'':'disabled'}><option value="">${L('请选择来源账户','Choose a source account')}</option>${matches.map(a=>`<option value="${esc(a.id)}" ${a.balance<0||accountRoom(a)<=0?'disabled':''}>${esc(a.name)} · ${L('账本余额','Ledger')} ${money(a.balance,f.currency)} · ${L('未标记参考','Unmarked est.')} ${money(accountRoom(a),f.currency)}</option>`).join('')}</select></label>
 <div class="lf-account-preview" role="status" aria-live="polite" id="lfAccountPreviewV42">${matches.length?L('请选择账户查看可预留额度。','Select an account to preview the unmarked amount.'):L('无可核对的同币种账户，或主站财务数据已过期。请刷新整个 MMHVAULT 页面后再试。','No matching account or recent ledger data. Refresh the full MMHVAULT page before retrying.')}</div>
 <label>${L('预留金额','Amount')} (${esc(f.currency)})<input name="amount" type="number" required min="0.01" max="999999999" step="0.01" inputmode="decimal" ${canAllocate?'':'disabled'}></label><label>${L('日期','Date')}<input name="allocated_on" type="date" required value="${dateToday()}"></label><label>${L('备注（可选）','Note (optional)')}<textarea name="note" maxlength="400" rows="3"></textarea></label>
 <p class="lf-hint">${L('参考额度 = 当前账本余额 − 该账户关联的原预留（只扣除已释放部分）。未核实的用途使用不会直接释放账户参考额度，须另行核对真实交易。跨设备同时操作或尚未入账的支出可能令预览过时；这里只是防误操作，不是资金锁定。','Conservative estimate = ledger balance minus original earmarks, excluding confirmed releases only. Self-reported use does not free account-level room without real-transaction reconciliation. Concurrent devices and unposted spending may make this stale; it is not a real hold.')}</p>`,L('确认标记预留','Confirm earmark'),'allocation',id);
 const form=$('lfFormV41');form?.querySelector('button[type="submit"]')?.toggleAttribute('disabled',!canAllocate);
 updateAccountPreview(form,f);
}
function movementDialog(fundId,allocationId){
 const f=getFund(fundId),a=state.allocations.find(x=>x.id===allocationId&&x.fund_id===fundId);
 if(!canSee(f)||!a||allocationRemaining(a)<=0)return;
 const room=allocationRemaining(a);
 dialogShell(L('释放或登记用途使用','Release or record purpose use'),`<div class="lf-notice">${L('仅调整该笔预留的用途记录。不会退款、提款、转账或自动记录实际消费。实际付款请另外在 Transactions 中登记。','This only updates the earmark journal. It does NOT refund, withdraw, transfer or post spending. Record actual payments in Transactions separately.')}</div>
 <div class="lf-account-preview">${L('这笔预留可处理金额','Remaining in this earmark')}: <strong>${money(room,f.currency)}</strong><br>${accountReviewLine(a,f)}</div>
 <label>${L('操作类型','Action')}<select name="kind" required><option value="release">${L('释放预留（恢复可规划额度）','Release earmark (unmark funds)')}</option><option value="use">${L('登记用途使用（仅规划记录）','Record purpose use (planning record only)')}</option></select></label>
 <label>${L('金额','Amount')} (${esc(f.currency)})<input type="number" name="amount" required min="0.01" max="${room.toFixed(2)}" step="0.01" inputmode="decimal"></label>
 <label>${L('日期','Date')}<input type="date" name="occurred_on" required value="${dateToday()}"></label>
 <label>${L('备注（可选）','Notes (optional)')}<textarea name="note" maxlength="400" rows="3"></textarea></label>
 <p class="lf-hint">${L('本操作保留原预留记录与流水，可追踪释放和使用；未链接真实交易，不代表账户余额变化。','Original earmark and journal history are retained. This is not linked to an actual payment and does not change account balance.')}</p>`,L('确认登记','Confirm record'),'movement',fundId);
 if(state.dialog)state.dialog.allocationId=allocationId;
}
function transferDialog(fundId,allocationId,reverseId=null){
 const f=getFund(fundId),a=state.allocations.find(x=>x.id===allocationId&&x.fund_id===fundId);
 if(!canSee(f)||!a||!a.source_account_id||allocationRemaining(a)<.01)return;
 const acc=accountsFor(f).find(x=>x.id===a.source_account_id&&x.name===a.source_account_name);
 const previous=reverseId?state.transfers.find(t=>t.id===reverseId&&t.target_allocation_id===allocationId&&t.target_fund_id===fundId&&!t.reverses_transfer_id):null;
 if(reverseId&&!previous)return;
 const targets=state.funds.filter(x=>x.id!==fundId&&x.currency===f.currency&&canSee(x)&&(!previous||x.id===previous.source_fund_id));
 if(!acc||!targets.length){state.notice=L('需要来源账户仍有效、币种相同且目标基金已临时解锁。','A valid source account and an unlocked same-currency target fund are required.');render();return}
 dialogShell(L('基金之间调配预留','Reallocate between funds'),`<div class="lf-notice">${L('这是同一份预留的用途调整，不会转账、扣款、产生收入或增加总资产；目标基金将继承同一来源账户。','This changes the purpose of the SAME earmark. No debit, transfer, income or extra assets; the destination inherits the same source account.')}</div>
 <div class="lf-account-preview">${L('可调配金额','Available to move')}: <strong>${money(allocationRemaining(a),f.currency)}</strong><br>${L('来源账户','Source account')}: ${esc(a.source_account_name)}</div>
 <label>${L('调配到','Move to')}<select name="target_fund_id" required>${targets.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label>
 <label>${L('调配金额','Amount')} (${esc(f.currency)})<input name="amount" type="number" min="0.01" max="${allocationRemaining(a).toFixed(2)}" step="0.01" inputmode="decimal" required></label>
 <label>${L('日期','Date')}<input name="occurred_on" type="date" value="${dateToday()}" required></label>
 <label>${L('备注（可选）','Note (optional)')}<textarea name="note" maxlength="400" rows="2"></textarea></label>
 <p class="lf-hint">${previous?L('这是新的反向调配记录，不删除或更改原始调配。若已释放或使用一部分，只能调回当前尚在预留的额度。','A NEW reverse transfer is recorded; the original stays. Only the still-earmarked portion can move back.'):L('系统将一次性写入调配流水和目标预留；已参与调配的基金与来源记录不能直接删除，以保护历史一致性。','Transfer and destination earmark are saved atomically. Linked funds/earmarks cannot simply be deleted, preserving audit history.')}</p>`,L('确认调配','Confirm reallocation'),'transfer',fundId);
 if(state.dialog){state.dialog.allocationId=allocationId;state.dialog.reverseTransferId=previous?.id||null;}
}
async function saveTransfer(form){
 const d=state.dialog,f=getFund(d.id),a=state.allocations.find(x=>x.id===d.allocationId&&x.fund_id===d.id);
 const destId=form.elements.namedItem('target_fund_id').value,to=getFund(destId);
 const amount=num(form.elements.namedItem('amount').value),occurred_on=form.elements.namedItem('occurred_on').value,note=form.elements.namedItem('note').value.trim();
 if(!canSee(f)||!canSee(to)||!a||!a.source_account_id||f.id===destId||to.currency!==f.currency||!Number.isFinite(amount)||amount<.01||amount>allocationRemaining(a)||!isDate(occurred_on)||note.length>400){errorMsg(L('基金、金额或日期无效，请刷新核对。','Invalid fund, amount or date. Refresh and review.'));return}
 if(!accountsFor(f).some(x=>x.id===a.source_account_id&&x.name===a.source_account_name)){errorMsg(L('来源账户已失效或财务数据过期。','Source account invalid or financial data stale.'));return}
 const payload={source_fund_id:f.id,source_allocation_id:a.id,target_fund_id:destId,currency:f.currency,amount,occurred_on,note,reverses_transfer_id:d.reverseTransferId||null};
 const snapshot=JSON.stringify(payload);
 if(d.snapshot&&d.snapshot!==snapshot){errorMsg(L('上次请求尚未核实，请勿修改后再次提交。','Previous request is unconfirmed; do not resubmit different values.'));return}d.snapshot=snapshot;
 const u=state.owner,ep=state.epoch;state.saving=true;
 try{
  const c=await authorized();
  const r=await c.from(TRANSFERS).insert({...payload,user_id:u,client_request_id:d.request}).select('id');
  if(r.error||!r.data?.length){const found=await verifyCreated(c,TRANSFERS,d.request);if(!found)throw r.error||Error('UNCERTAIN')}
  if(!valid(u,ep))return;
  closeDialog();state.notice=L('基金间预留已调配，未移动真实资金。','Earmark reallocated between funds. No real money moved.');state.saving=false;await load();
 }catch(e){if(valid(u,ep))errorMsg(e?.code==='23514'||e?.code==='23503'?L('来源预留或目标基金已变化，请刷新重试。','Source earmark or target fund changed. Refresh and retry.'):L('提交结果未确认，请刷新核对，避免重复调配。','Submission uncertain. Refresh and verify before retrying.'))}
 finally{state.saving=false}
}
async function reconcileDialog(fundId,movementId){
 const f=getFund(fundId),m=state.movements.find(x=>x.id===movementId&&x.fund_id===fundId&&x.kind==='use');
 const a=m&&state.allocations.find(x=>x.id===m.allocation_id&&x.fund_id===fundId);
 if(!canSee(f)||!a||!a.source_account_id||!financeReady()||reconFor(m.id))return;
 const acc=accountsFor(f).find(x=>x.id===a.source_account_id&&x.name===a.source_account_name);
 if(!acc){state.notice=L('来源账户已变更，无法对账。','Source account is no longer verifiable.');render();return}
 const u=state.owner,ep=state.epoch;state.saving=true;
 try{const c=await authorized();const res=await c.from('transactions').select('id,user_id,type,tx_date,from_account,from_amount')
  .eq('user_id',u).eq('type','Expense').eq('tx_date',m.occurred_on).eq('from_account',acc.name).eq('from_amount',m.amount).order('id',{ascending:false}).limit(100);
  if(res.error||!valid(u,ep))throw Error('REVIEW');
  if((res.data||[]).length>=100)throw Error('LIMIT');
  const usedIds=new Set(state.reconciliations.map(x=>String(x.transaction_id)));
  const options=(res.data||[]).filter(x=>!usedIds.has(String(x.id)));
  state.saving=false;
  dialogShell(L('人工核对真实交易','Manually match a real Expense'),`<div class="lf-notice">${L('请核对账户、日期、金额与交易记录。这里只建立可撤销的关联，不会创建、删除或修改任何财务交易；交易变化后会显示待复核。','Review the account, date and amount. This creates a removable pointer only; no finance transaction will be created, edited, or deleted. Changed transactions will require review.')}</div>
   <div class="lf-account-preview">${esc(acc.name)} · ${esc(m.occurred_on)} · ${money(m.amount,f.currency)}</div>
   ${options.length?`<label>${L('选择已存在的 Expense 交易','Select an existing Expense')}<select name="transaction_id" required>${options.map(tx=>`<option value="${tx.id}">#${tx.id} · ${esc(tx.tx_date)} · ${money(tx.from_amount,f.currency)}</option>`).join('')}</select></label>`:`<p class="lf-hint">${L('没有完全一致且尚未使用的交易。先到 Transactions 记录实际付款，或检查金额、日期和付款账户。','No unmatched exact Expense found. Record actual payment in Transactions, or check account, date and amount.')}</p>`}
   <p class="lf-hint">${L('人工关联不代表银行确认付款，也不会解除账户预留的保守占用。','A manual match is not bank confirmation and does not release the conservative account-level hold.')}</p>`,L('确认人工对账','Confirm manual match'),'reconcile',fundId);
  if(state.dialog){state.dialog.movementId=m.id;state.dialog.allowedIds=options.map(x=>String(x.id));}
  if(!options.length)$('lfFormV41')?.querySelector('button[type="submit"]')?.setAttribute('disabled','');
 }catch(e){state.saving=false;if(valid(u,ep)){state.notice=L('查询真实交易失败或结果过多，请刷新重试。','Expense lookup failed or had too many matches. Refresh and retry.');render()}}
}
async function saveReconcile(form){
 const d=state.dialog,f=getFund(d.id),m=state.movements.find(x=>x.id===d.movementId&&x.fund_id===d.id&&x.kind==='use');
 const a=m&&state.allocations.find(x=>x.id===m.allocation_id&&x.fund_id===d.id),id=String(form.elements.namedItem('transaction_id')?.value||'');
 if(!canSee(f)||!a||!financeReady()||reconFor(m.id)||!d.allowedIds?.includes(id)){errorMsg(L('对账信息已变化，请刷新。','Match options changed. Refresh.'));return}
 const snapshot=id;if(d.snapshot&&d.snapshot!==snapshot){errorMsg(L('前一次请求未核实，不能更换交易重复提交。','Prior submission is uncertain; do not choose a different expense.'));return}d.snapshot=snapshot;
 const u=state.owner,ep=state.epoch;state.saving=true;
 try{const c=await authorized();const tx=await c.from('transactions').select('id,user_id,type,tx_date,from_account,from_amount').eq('user_id',u).eq('id',id).maybeSingle();
  if(tx.error||!tx.data||tx.data.type!=='Expense'||tx.data.tx_date!==m.occurred_on||tx.data.from_account!==a.source_account_name||Math.round(Number(tx.data.from_amount)*100)!==Math.round(Number(m.amount)*100))throw Error('REVIEW');
  const res=await c.from(RECONS).insert({user_id:u,movement_id:m.id,transaction_id:id,client_request_id:d.request}).select('id');
  if(res.error||!res.data?.length){const found=await verifyCreated(c,RECONS,d.request);if(!found)throw res.error||Error('UNCERTAIN')}
  if(!valid(u,ep))return;closeDialog();state.notice=L('已建立人工交易关联；不会改变财务记录或释放预留额度。','Manual Expense match saved. No finance changes or hold release.');state.saving=false;await load();
 }catch(e){if(valid(u,ep))errorMsg(e?.code==='23505'?L('此交易或用途使用已经关联其他记录。','This Expense or purpose use is already matched.'):e?.message==='REVIEW'?L('原交易数据已变化，请重新核对。','The original Expense has changed. Review again.'):L('关联未确认，请刷新检查。','Match uncertain. Refresh before retrying.'))}
 finally{state.saving=false}
}
async function unlinkReconcile(fundId,movementId){
 const f=getFund(fundId),m=state.movements.find(x=>x.id===movementId&&x.fund_id===fundId&&x.kind==='use'),r=m&&reconFor(m.id);
 if(!canSee(f)||!r||state.saving)return;
 if(!window.confirm(L('解除人工交易关联？用途使用和原始财务交易都将保留。','Unlink the manual Expense match? Both source records remain untouched.')))return;
 const u=state.owner,ep=state.epoch;state.saving=true;
 try{const c=await authorized(),x=await c.from(RECONS).delete().eq('user_id',u).eq('id',r.id).select('id');
 if(x.error||!x.data?.length)throw x.error||Error('REVIEW');
 if(!valid(u,ep))return;state.saving=false;state.notice=L('人工关联已解除，规划与财务原记录仍保留。','Manual match removed; source records are unchanged.');await load();
 }catch{if(valid(u,ep)){state.notice=L('解除关联尚未确认，请刷新核对。','Unlink uncertain. Refresh to verify.');render()}}
 finally{state.saving=false}
}
async function saveMovement(form){
 const d=state.dialog,f=getFund(d.id),a=state.allocations.find(x=>x.id===d.allocationId&&x.fund_id===d.id);
 if(!canSee(f)||!a)return;
 const kind=form.elements.namedItem('kind').value,amount=num(form.elements.namedItem('amount').value),occurred_on=form.elements.namedItem('occurred_on').value,note=form.elements.namedItem('note').value.trim();
 if(!['release','use'].includes(kind)||!Number.isFinite(amount)||amount<.01||amount>999999999||!isDate(occurred_on)||note.length>400||amount>allocationRemaining(a)){
  errorMsg(L('金额超过这笔预留的剩余额度，或日期无效。','Amount exceeds this earmark or the date is invalid.'));return;
 }
 const data={kind,amount,occurred_on,note},snapshot=JSON.stringify(data);
 if(d.snapshot&&d.snapshot!==snapshot){errorMsg(L('之前的提交尚未确认，请刷新核对后再修改。','Previous submit is uncertain. Refresh before changing fields.'));return}
 d.snapshot=snapshot;
 const u=state.owner,ep=state.epoch;state.saving=true;
 try{const c=await authorized();
  const latest=await c.from(MOVES).select('id,user_id,amount').eq('user_id',u).eq('allocation_id',a.id).limit(6000);
  if(latest.error||!Array.isArray(latest.data)||latest.data.length>=6000)throw Error('REVIEW');
  if(!valid(u,ep))return;
  const latestTransfers=await c.from(TRANSFERS).select('id,amount').eq('user_id',u).eq('source_allocation_id',a.id).limit(6000);
  if(latestTransfers.error||!Array.isArray(latestTransfers.data)||latestTransfers.data.length>=6000)throw Error('REVIEW');
  const already=Math.round((latest.data.reduce((v,x)=>v+Number(x.amount||0),0)+latestTransfers.data.reduce((v,x)=>v+Number(x.amount||0),0))*100)/100;
  if(already+amount>Number(a.amount)+.000001)throw Error('REVIEW');
  const result=await c.from(MOVES).insert({...data,user_id:u,fund_id:f.id,allocation_id:a.id,currency:f.currency,client_request_id:d.request}).select('id');
  if(result.error||!result.data?.length){const saved=await verifyCreated(c,MOVES,d.request);if(!saved)throw result.error||Error('UNCERTAIN')}
  if(!valid(u,ep))return;
  closeDialog();state.notice=L('基金流水已记录。没有修改真实账户余额。','Fund journal saved. Real account balances were not changed.');state.saving=false;await load();
 }catch(e){if(valid(u,ep))errorMsg(e?.code==='23514'||e?.message==='REVIEW'?L('可处理额度已变化，请刷新后再试。','Remaining earmark has changed. Refresh before retrying.'):L('保存未确认，请刷新核对，避免重复提交。','Save uncertain. Refresh to verify before resubmitting.'))}
 finally{state.saving=false}
}
function updateAccountPreview(form,f){
 if(!form||!f)return;const preview=$('lfAccountPreviewV42');if(!preview)return;
 const a=accountsFor(f).find(a=>a.id===form.elements.namedItem('source_account_id')?.value);
 if(!a){preview.textContent=accountsFor(f).length?L('请选择仍可用的同币种账户。','Choose an available account in the same currency.'):L('没有可核对的同币种账户，或账本已过期。请刷新整个 MMHVAULT 页面后重试。','No matching account or ledger data is stale. Refresh the entire MMHVAULT page to retry.');return}
 const free=accountRoom(a),amount=num(form.elements.namedItem('amount')?.value);
 preview.textContent=L('账本余额：','Ledger balance: ')+money(a.balance,f.currency)+' · '+L('已关联预留：','Linked earmarks: ')+money(assignedTo(a.id),f.currency)+' · '+L('剩余参考：','Unmarked estimate: ')+money(free,f.currency)+(Number.isFinite(amount)&&amount>free?' · '+L('超过参考额度','Above estimate'):'');
 preview.classList.toggle('lf-account-over',Number.isFinite(amount)&&amount>free);
}
function errorMsg(m){const e=$('lfDialogErrorV41');if(e)e.textContent=m;else{state.notice=m;render()}}
async function verifyCreated(c,table,req){const res=await c.from(table).select('*').eq('user_id',state.owner).eq('client_request_id',req).maybeSingle();if(res.error)throw res.error;return res.data}
async function saveFund(form){const d=state.dialog,id=d.id,f=id?getFund(id):null; if(id&&!canSee(f))return;
 const name=form.elements.namedItem('name').value.trim(),fund_type=f?.fund_type||form.elements.namedItem('fund_type').value,currencyCode=f?.currency||form.elements.namedItem('currency').value;
 const rawGoal=form.elements.namedItem('goal_amount').value.trim(),goal_amount=rawGoal===''?null:num(rawGoal),monthly_plan=num(form.elements.namedItem('monthly_plan').value),is_private=form.elements.namedItem('is_private').checked;
 if(!name||name.length>100||!['wish','free'].includes(fund_type)||!currency(currencyCode)||goal_amount!==null&&(!Number.isFinite(goal_amount)||goal_amount<=0||goal_amount>999999999)||!Number.isFinite(monthly_plan)||monthly_plan<0||monthly_plan>999999999){errorMsg(L('请检查名称、目标和金额。','Check name and amounts.'));return}
 if(f&&f.is_private&&!is_private&&!window.confirm(L('取消私人隐藏后，基金名称和金额会在该模块中直接显示。确定？','Making this fund public to your workspace reveals its name and amounts. Continue?')))return;
 const data={name,fund_type,currency:currencyCode,goal_amount,monthly_plan,is_private},snapshot=JSON.stringify(data);
 if(d.snapshot&&d.snapshot!==snapshot){errorMsg(L('前次提交结果未确认；请刷新核实后再修改内容。','Unconfirmed prior save. Refresh before changing the form.'));return}d.snapshot=snapshot;
 const u=state.owner,ep=state.epoch;state.saving=true;
 try{const c=await authorized();let r;if(f){r=await c.from(FUNDS).update({...data,version:Number(f.version)+1,updated_at:new Date().toISOString()}).eq('user_id',u).eq('id',f.id).eq('version',f.version).select('id');if(r.error||!r.data?.length)throw r.error||Error('CONFLICT');}
 else{r=await c.from(FUNDS).insert({...data,user_id:u,client_request_id:d.request}).select('id');if(r.error||!r.data?.length){const found=await verifyCreated(c,FUNDS,d.request);if(!found)throw r.error||Error('UNCERTAIN')}}
 if(!valid(u,ep))return;closeDialog();state.notice=L('基金用途标签已保存。','Fund label saved.');state.saving=false;await load()}
 catch{if(valid(u,ep))errorMsg(L('保存未确认，请保留当前表单并刷新核对。','Save not confirmed; keep this form and refresh to verify.'))}
 finally{state.saving=false}
}
async function saveAllocation(form){const d=state.dialog,f=getFund(d.id);if(!canSee(f))return;
 const amount=num(form.elements.namedItem('amount').value),allocated_on=form.elements.namedItem('allocated_on').value,note=form.elements.namedItem('note').value.trim(),source_account_id=String(form.elements.namedItem('source_account_id').value);
 const account=accountsFor(f).find(a=>a.id===source_account_id);
 if(!Number.isFinite(amount)||amount<.01||amount>999999999||!isDate(allocated_on)||note.length>400||!account){errorMsg(L('请检查金额、日期和可核对的同币种来源账户。','Check amount, date and verified same-currency account.'));return}
 if(amount>accountRoom(account)){errorMsg(L('超出当前参考可预留额度。请刷新核对账户及其他基金。','Exceeds current unmarked estimate. Refresh account and fund records.'));return}
 const data={amount,allocated_on,note,source_account_id,source_account_name:account.name},snapshot=JSON.stringify(data);
 if(d.snapshot&&d.snapshot!==snapshot){errorMsg(L('上次提交结果未核实，请不要更换输入再重试。','Previous save is uncertain; do not change values before retry.'));return}d.snapshot=snapshot;
 const u=state.owner,ep=state.epoch;state.saving=true;
 try{
 const c=await authorized();
 // Re-check the authoritative Life Planner rows immediately before this write, including other funds.
 // This does NOT create an atomic hold and must never be described as a bank-balance guarantee.
 const latest=await c.from(ALLOC).select('id,user_id,source_account_id,amount').eq('user_id',u).limit(4000);
 if(latest.error||!Array.isArray(latest.data)||latest.data.length>=4000)throw Error('REVIEW');
 if(!valid(u,ep))return;
 const latestMov=await c.from(MOVES).select('id,user_id,allocation_id,amount,kind').eq('user_id',u).limit(6000);
 if(latestMov.error||!Array.isArray(latestMov.data)||latestMov.data.length>=6000)throw Error('REVIEW');
 if(!valid(u,ep))return;
 const latestTransfers=await c.from(TRANSFERS).select('id,user_id,source_allocation_id,amount').eq('user_id',u).limit(6000);
 if(latestTransfers.error||!Array.isArray(latestTransfers.data)||latestTransfers.data.length>=6000)throw Error('REVIEW');
 if(!valid(u,ep))return;
 const nowAccount=accountsFor(f).find(a=>a.id===source_account_id&&a.name===account.name);
 if(!nowAccount||amount>Math.round((nowAccount.balance-assignedTo(nowAccount.id,latest.data,latestMov.data,latestTransfers.data))*100)/100)throw Error('REVIEW');
 const r=await c.from(ALLOC).insert({...data,user_id:u,fund_id:f.id,currency:f.currency,client_request_id:d.request}).select('id');
 if(r.error||!r.data?.length){const found=await verifyCreated(c,ALLOC,d.request);if(!found)throw r.error||Error('UNCERTAIN')}
 if(!valid(u,ep))return;closeDialog();state.notice=L('预留已登记：仅是用途分配，不是账户扣款或真正锁定资金。','Earmark recorded: a planning label, not a debit or enforceable hold.');state.saving=false;await load();
 }catch(e){if(valid(u,ep))errorMsg(e?.message==='REVIEW'?L('余额或其他基金已变化，请取消并刷新后再试。','Ledger or other earmarks changed. Cancel and refresh before retrying.'):L('结果尚未确认，请刷新检查，以免重复标记。','Save uncertain. Refresh and verify before another earmark.'))}
 finally{state.saving=false}
}
async function removeAllocation(id,fundId){const f=getFund(fundId),e=state.allocations.find(x=>x.id===id&&x.fund_id===fundId);if(!canSee(f)||!e||state.saving||state.movements.some(m=>m.allocation_id===id)||state.transfers.some(t=>t.source_allocation_id===id||t.target_allocation_id===id))return;
 if(!window.confirm(L('仅撤销一条资金预留用途标签；不会转账或更改真实余额。确定？','Remove this earmark label? No transfer or account change occurs.')))return;
 const u=state.owner,ep=state.epoch;state.saving=true;
 try{const c=await authorized(),r=await c.from(ALLOC).delete().eq('user_id',u).eq('id',e.id).eq('fund_id',f.id).eq('version',e.version).select('id');if(r.error||!r.data?.length)throw Error('CONFLICT');if(!valid(u,ep))return;state.notice=L('预留记录已撤销。','Earmark removed.');state.saving=false;await load()}
 catch{if(valid(u,ep)){state.notice=L('操作未确认，请刷新核查。','Operation uncertain; refresh and verify.');render()}}
 finally{state.saving=false}
}
async function deleteFund(id){const f=getFund(id);if(!canSee(f)||state.saving)return;
 if(state.transfers.some(t=>t.source_fund_id===id||t.target_fund_id===id)){state.notice=L('此基金包含跨基金调配流水，为保护历史不能直接删除。','This fund has reallocation history and cannot be deleted directly.');render();return}
 if(!window.confirm(L('删除基金及其全部用途预留记录？不会删除任何财务交易或转移真实资产。','Delete this fund and ALL its earmark records? Real finances remain untouched.')))return;
 const u=state.owner,ep=state.epoch;state.saving=true;
 try{const c=await authorized(),r=await c.from(FUNDS).delete().eq('user_id',u).eq('id',id).eq('version',f.version).select('id');if(r.error||!r.data?.length)throw Error('CONFLICT');if(!valid(u,ep))return;state.notice=L('基金标签已删除。','Fund label deleted.');state.saving=false;await load()}
 catch{if(valid(u,ep)){state.notice=L('删除未确认，请刷新核查。','Delete uncertain; refresh and verify.');render()}}
 finally{state.saving=false}
}
function click(e){const b=e.target.closest('[data-lf-act]');if(!b||(!$(ROOT)?.contains(b)&&!$('lfDialogV41')?.contains(b)))return;const act=b.dataset.lfAct,id=b.dataset.id;
 if(act==='close'){if(!state.saving)closeDialog();return}
 if(act==='reveal'){state.reveal?hide():showPrivate();return}
 if(act==='refresh'){if(!state.saving)load();return}
 if(act==='add'){if(state.loaded)fundDialog(null);return}
 if(act==='edit'){fundDialog(id);return}
 if(act==='reserve'){allocationDialog(id);return}
 if(act==='movement'){movementDialog(b.dataset.fund,id);return}
 if(act==='transfer'){transferDialog(b.dataset.fund,id);return}
 if(act==='reverse'){const t=state.transfers.find(t=>t.id===b.dataset.transfer&&t.target_allocation_id===id);if(t)transferDialog(b.dataset.fund,id,t.id);return}
 if(act==='reconcile'){reconcileDialog(b.dataset.fund,id);return}
 if(act==='unlink'){unlinkReconcile(b.dataset.fund,id);return}
 if(act==='remove'){deleteFund(id);return}
 if(act==='deleteAllocation'){removeAllocation(id,b.dataset.fund);return}
}
function init(){document.addEventListener('click',click);
 document.addEventListener('input',e=>{if(e.target?.closest?.('#lfDialogV41')&&state.dialog?.kind==='allocation')updateAccountPreview($('lfFormV41'),getFund(state.dialog.id))});
 document.addEventListener('change',e=>{if(e.target?.closest?.('#lfDialogV41')&&state.dialog?.kind==='allocation')updateAccountPreview($('lfFormV41'),getFund(state.dialog.id))});document.addEventListener('submit',e=>{if(e.target?.id!=='lfFormV41')return;e.preventDefault();if(state.saving||!state.dialog||!state.loaded||!active())return;
 if(state.dialog.id&&getFund(state.dialog.id)?.is_private&&!state.reveal){errorMsg(L('私人基金已自动隐藏，请重新打开。','Private fund locked. Reveal again.'));return}
 state.dialog.kind==='fund'?saveFund(e.target):state.dialog.kind==='movement'?saveMovement(e.target):state.dialog.kind==='transfer'?saveTransfer(e.target):state.dialog.kind==='reconcile'?saveReconcile(e.target):saveAllocation(e.target);
});
 ['mmhvault:data-loaded','mmhvault:data-change','mmhvault:category-config-changed'].forEach(n=>window.addEventListener(n,()=>{if(active()&&state.loaded&&!state.saving){if(state.dialog?.kind==='allocation')closeDialog();render()}}));
 window.addEventListener('mmhvault:config-owner-changed',forget);window.addEventListener('mmhvault:page-visible',e=>{if(e?.detail?.page!=='life-planner')forget()});
 for(const n of ['mmhvault-language-change','languagechange'])window.addEventListener(n,()=>{hide();closeDialog()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)forget();else if($(ROOT))window.MMHLifeFundsV41?.mount()});
 window.addEventListener('blur',hide);
 window.MMHLifeFundsV41={mount(){if(!$(ROOT))return;if(!owner()){forget();state.error='LOGIN';render();return}if(state.owner!==owner()||state.epoch!==epoch()){forget();state.owner=owner();state.epoch=epoch()}if(!state.loaded&&!state.loading)load();else render()},unmount:forget};
}
init();
})();
