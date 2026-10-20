/* MMHVAULT Life Planner Phase 4.1 - Funds / allocation labels only.
 * This module NEVER moves money, posts transactions, credits assets or imports
 * speculative unused budgets as deposits. The figures are self-declared labels
 * on existing funds, not proof of available account balances.
 */
(()=>{
'use strict';
if(window.MMHLifeFundsV41)return;
const ROOT='mmhLifeFundsV41',FUNDS='life_funds',ALLOC='life_fund_allocations';
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
const state={owner:'',epoch:0,token:0,loaded:false,loading:false,saving:false,funds:[],allocations:[],error:'',notice:'',reveal:false,dialog:null};
let revealTimer=null;
const active=()=>!!state.owner&&owner()===state.owner&&epoch()===state.epoch&&!!$(ROOT)&&$('life-planner')?.classList.contains('active')&&!document.hidden;
const getFund=id=>state.funds.find(x=>x.id===id&&x.user_id===state.owner);
const canSee=f=>!!f&&(!f.is_private||state.reveal);
const valid=(u,ep)=>u===state.owner&&ep===state.epoch&&active();
function hide(){if(revealTimer!==null)clearTimeout(revealTimer);revealTimer=null;state.reveal=false;if(state.dialog?.id&&getFund(state.dialog.id)?.is_private)closeDialog();render()}
function closeDialog(){state.dialog=null;const n=$('lfDialogV41');if(n){try{n.close()}catch{}n.remove()}document.body.classList.remove('lf-modal-open')}
function forget(){if(revealTimer!==null)clearTimeout(revealTimer);revealTimer=null;state.token++;state.reveal=false;state.funds=[];state.allocations=[];state.loaded=false;state.loading=false;state.saving=false;state.error='';state.notice='';closeDialog();const host=$(ROOT);if(host)host.replaceChildren()}
function showPrivate(){if(revealTimer!==null)clearTimeout(revealTimer);state.reveal=true;revealTimer=setTimeout(hide,90000);render()}
function missing(e){return /42P01|PGRST205|schema cache|does not exist|could not find the table/i.test(String(e?.code||'')+' '+String(e?.message||''))}
async function authorized(){if(!active()||!client())throw Error('AUTH');const c=client(),r=await c.auth.getUser();if(r.error||r.data?.user?.id!==state.owner||!active())throw Error('AUTH');return c}
async function load(){if(!active()||state.loading||state.saving)return;const token=++state.token,u=state.owner,ep=state.epoch;state.loading=true;state.error='';render();try{
 const c=await authorized();const f=await c.from(FUNDS).select('*').eq('user_id',u).order('created_at',{ascending:false}).limit(500);if(f.error)throw f.error;if(!valid(u,ep)||token!==state.token)return;
 const a=await c.from(ALLOC).select('*').eq('user_id',u).order('allocated_on',{ascending:false}).limit(4000);if(a.error)throw a.error;if(!valid(u,ep)||token!==state.token)return;
 if((f.data||[]).length===500||(a.data||[]).length===4000){state.error='LIMIT';state.funds=[];state.allocations=[];state.loaded=false;return}
 state.funds=(f.data||[]).filter(x=>x.user_id===u);state.allocations=(a.data||[]).filter(x=>x.user_id===u);state.loaded=true;
 }catch(e){if(valid(u,ep)&&token===state.token){state.funds=[];state.allocations=[];state.loaded=false;state.error=missing(e)?'MIGRATION':'CONNECT';}}
 finally{if(valid(u,ep)&&token===state.token){state.loading=false;render()}}
}
const reserved=id=>Math.round(state.allocations.filter(x=>x.fund_id===id).reduce((n,x)=>n+Number(x.amount||0),0)*100)/100;
function render(){const root=$(ROOT);if(!root)return;let info=state.error==='MIGRATION'?L('基金数据库尚未启用或不可访问。为保护数据，本功能不会改用本地缓存保存。','Fund tables are unavailable. No insecure local-storage fallback is used.'):state.error==='LIMIT'?L('记录达到安全读取上限，已暂停操作以避免显示不完整的余额。','Read limit reached; operations paused to avoid incomplete allocation totals.'):state.error==='LOGIN'?L('请先登录个人空间。','Sign in to your personal workspace.'):state.error?L('无法连接到云端数据。请检查网络后刷新。','Cloud data unavailable. Check connection and refresh.'):'',list=state.loaded?state.funds:[];
 root.innerHTML=`<section class="lf-shell"><header class="lf-head"><div><span class="lf-kicker">LIFE PLANNER / WISH FUND</span><h1>${L('为未来喜欢的生活预留一点空间','A little space for your future')}</h1><p>${L('自由基金与愿望基金，把现有资金的用途安排得更清楚。','Free funds and wish funds to label how you plan to use money you already have.')}</p></div><div class="lf-head-actions"><button data-lf-act="refresh" type="button">${L('刷新','Refresh')}</button><button class="lf-primary" data-lf-act="add" type="button" ${!state.loaded?'disabled':''}>＋ ${L('创建基金','New fund')}</button></div></header>
 <div class="lf-callout"><strong>◇ ${L('这不是银行存款或财务交易','No banking transaction is made')}</strong><p>${L('基金只是您对现有资产的“用途标记”。增加预留不会增加总资产、收入或账户余额；也不会从任何账户扣款。实际转账及提款将在后续独立实现并核实。','Funds are labels on money you already own. Reserving does not add assets, income or balance, and does not debit an account. Transfers and withdrawals are not available in this phase.')}</p></div>
 <div class="lf-privacy"><span>🔒 ${L('私人基金默认隐藏名称和金额，离开页面自动重新锁定。','Private fund names and figures remain masked until you reveal them.')}</span><button type="button" data-lf-act="reveal">${state.reveal?L('重新隐藏','Hide now'):L('临时显示 90 秒','Reveal for 90 seconds')}</button></div>
 ${info?`<div class="lf-alert" role="alert">${esc(info)}</div>`:''}${state.notice?`<div class="lf-note" role="status">${esc(state.notice)}</div>`:''}
 ${state.loading?`<p class="lf-status">${L('正在读取基金…','Loading funds…')}</p>`:state.loaded?(list.length?`<div class="lf-grid">${list.map(f=>card(f)).join('')}</div>`:`<div class="lf-empty"><div aria-hidden="true">🌱</div><h2>${L('从一个小小的目标开始','Start with one simple intention')}</h2><p>${L('尚无基金。先创建自由基金或一个心愿，不会自动存入任何金额。','No funds yet. Create a free or wish fund; no amounts are deposited automatically.')}</p><button class="lf-primary" data-lf-act="add" type="button">＋ ${L('创建我的第一个基金','Create first fund')}</button></div>`):`<div class="lf-empty"><p>${L('尚未读取到可用的云端数据。','Cloud data has not loaded.')}</p></div>`}
 <p class="lf-disclaimer">${L('注意：未使用预算 ≠ 已储蓄；标记为预留 ≠ 已转入独立账户。金额没有核实账户可用余额，不应用作可支配现金证明。','Unused budget ≠ saved money. An earmark ≠ a bank transfer. Amounts are not validated against cash availability.')}</p></section>`;
}
function card(f){const privateMask=!canSee(f),amount=reserved(f.id),goal=Number(f.goal_amount||0),ratio=goal>0?Math.min(100,Math.max(0,Math.round(amount/goal*100))):0;
 const data=state.allocations.filter(x=>x.fund_id===f.id).slice().sort((a,b)=>b.allocated_on.localeCompare(a.allocated_on));
 return `<article class="lf-card ${privateMask?'lf-masked':''}"><div class="lf-card-top"><span class="lf-type">${f.fund_type==='free'?L('自由基金','Free Fund'):L('愿望基金','Wish Fund')}</span><span class="lf-label">${f.is_private?'🔒 '+L('私人','Private'):L('普通','Standard')}</span></div>
 <h2>${privateMask?L('私人基金','Private fund'):esc(f.name)}</h2><p class="lf-card-desc">${privateMask?L('信息已隐藏','Details are hidden'):f.fund_type==='wish'?L('为喜欢的东西认真留一份计划','Setting aside for a wish'):L('自由安排，未来再决定用途','Flexibility for later choices')}</p>
 <div class="lf-amount"><small>${L('已标记预留（非到账）','Earmarked, not deposited')}</small><strong>${privateMask?'••••':money(amount,f.currency)}</strong></div>
 ${goal>0?`<div class="lf-progress" role="progressbar" aria-label="${L('基金目标进度','Goal progress')}" aria-valuemin="0" aria-valuemax="100" ${privateMask?'':'aria-valuenow="'+ratio+'"'}><i style="width:${privateMask?0:ratio}%"></i></div><p class="lf-progress-copy">${privateMask?L('目标已隐藏','Goal hidden'):money(goal,f.currency)+' · '+ratio+'%'}</p>`:`<p class="lf-progress-copy">${privateMask?L('详情已隐藏','Details hidden'):L('自由使用，无固定金额目标','No fixed amount target')}</p>`}
 ${privateMask?`<p class="lf-muted">${L('临时显示后才能编辑或登记预留。','Reveal temporarily before viewing or editing.')}</p>`:`<div class="lf-actions"><button data-lf-act="reserve" data-id="${f.id}" type="button">＋ ${L('标记预留','Add earmark')}</button><button data-lf-act="edit" data-id="${f.id}" type="button">${L('编辑','Edit')}</button><button data-lf-act="remove" data-id="${f.id}" type="button">${L('删除基金','Delete fund')}</button></div>
 <details class="lf-history"><summary>${L('预留历史','Earmark history')} (${data.length})</summary>${data.length?data.map(e=>`<div class="lf-history-row"><div><strong>${money(e.amount,f.currency)}</strong><small>${esc(e.allocated_on)}${e.note?' · '+esc(e.note):''}</small></div><button type="button" data-lf-act="deleteAllocation" data-id="${e.id}" data-fund="${f.id}">${L('撤销记录','Remove label')}</button></div>`).join(''):`<p class="lf-muted">${L('尚无记录','No entries')}</p>`}</details>`}
 </article>`;
}
function dialogShell(title,body,submit,kind,id){closeDialog();const node=document.createElement('dialog');node.className='lf-dialog';node.id='lfDialogV41';node.innerHTML=`<form id="lfFormV41"><div class="lf-dialog-head"><div><small>LIFE PLANNER · WISH FUND</small><h2>${title}</h2></div><button aria-label="${L('关闭','Close')}" type="button" data-lf-act="close">×</button></div><div class="lf-dialog-body">${body}<p class="lf-error" role="alert" id="lfDialogErrorV41"></p></div><div class="lf-dialog-actions"><button type="button" data-lf-act="close">${L('取消','Cancel')}</button><button class="lf-primary" type="submit">${submit}</button></div></form>`;document.body.append(node);const request=requestId();state.dialog={kind,id,request,snapshot:null};node.addEventListener('close',()=>{node.remove();if(state.dialog?.request===request)state.dialog=null;document.body.classList.remove('lf-modal-open')});node.addEventListener('click',e=>{if(e.target===node&&!state.saving)closeDialog()});try{node.showModal()}catch{node.setAttribute('open','')}document.body.classList.add('lf-modal-open');const input=node.querySelector('input:not([type="checkbox"]),select');input?.focus({preventScroll:true})}
function fundDialog(id){const f=id?getFund(id):null;if(id&&!canSee(f))return;
 const t=f?L('编辑基金','Edit fund'):L('创建一个基金','Create a fund');const goal=f?.goal_amount===null||f?.goal_amount===undefined?'':String(f.goal_amount);
 dialogShell(t,`<div class="lf-form-grid"><label>${L('基金类型','Fund type')}<select name="fund_type" ${f?'disabled':''}><option value="free" ${f?.fund_type==='free'?'selected':''}>${L('自由基金','Free fund')}</option><option value="wish" ${f?.fund_type==='wish'?'selected':''}>${L('指定愿望基金','Wish fund')}</option></select></label><label>${L('币种','Currency')}<select name="currency" ${f?'disabled':''}>${Object.keys(KEY).map(x=>`<option value="${x}" ${f?.currency===x?'selected':''}>${x}</option>`).join('')}</select></label></div><label>${L('基金名称','Fund name')}<input name="name" maxlength="100" required placeholder="${L('例如：未来旅行','e.g. Future travel')}" value="${esc(f?.name||'')}"></label><div class="lf-form-grid"><label>${L('目标金额（可选）','Target amount (optional)')}<input name="goal_amount" type="number" min="0" max="999999999" step="0.01" value="${esc(goal)}"></label><label>${L('每月预留计划（仅参考）','Monthly plan (advisory)')}<input name="monthly_plan" type="number" min="0" max="999999999" step="0.01" value="${Number(f?.monthly_plan||0)}"></label></div><label class="lf-checkbox"><input name="is_private" type="checkbox" ${f?.is_private===false?'':'checked'}><span>${L('私人基金：默认隐藏名称及金额','Private: hide name and amounts by default')}</span></label><p class="lf-hint">${L('这里只建立基金用途标签，不进行真实金融交易；变更类型或币种需新建基金。','Creates a budgeting label only. To change type or currency, create another fund.')}</p>`,f?L('保存修改','Save changes'):L('创建基金','Create fund'),'fund',id||null);
}
function allocationDialog(id){const f=getFund(id);if(!canSee(f))return;
 dialogShell(L('确认资金用途预留','Confirm earmark'),`<div class="lf-notice">${L('这是对“已经拥有的资金”的用途标记，不扣账户余额、不形成收入、不验证是否实际存入银行。','This labels money you already own. No account debit, income or deposit verification occurs.')}</div><label>${L('预留金额','Amount')} (${esc(f.currency)})<input name="amount" type="number" required min="0.01" max="999999999" step="0.01" inputmode="decimal"></label><label>${L('日期','Date')}<input name="allocated_on" type="date" required value="${dateToday()}"></label><label>${L('备注（可选）','Note (optional)')}<textarea name="note" maxlength="400" rows="3"></textarea></label>`,L('确认标记预留','Confirm earmark'),'allocation',id);
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
 const amount=num(form.elements.namedItem('amount').value),allocated_on=form.elements.namedItem('allocated_on').value,note=form.elements.namedItem('note').value.trim();
 if(!Number.isFinite(amount)||amount<.01||amount>999999999||!isDate(allocated_on)||note.length>400){errorMsg(L('请输入有效日期及正数金额。','Enter a valid date and positive amount.'));return}
 const data={amount,allocated_on,note},snapshot=JSON.stringify(data);if(d.snapshot&&d.snapshot!==snapshot){errorMsg(L('上次提交结果未核实，请不要更换输入再重试。','Previous save is uncertain; do not change values before retry.'));return}d.snapshot=snapshot;
 const u=state.owner,ep=state.epoch;state.saving=true;
 try{const c=await authorized(),r=await c.from(ALLOC).insert({...data,user_id:u,fund_id:f.id,currency:f.currency,client_request_id:d.request}).select('id');if(r.error||!r.data?.length){const found=await verifyCreated(c,ALLOC,d.request);if(!found)throw r.error||Error('UNCERTAIN')}
 if(!valid(u,ep))return;closeDialog();state.notice=L('预留标签已登记；没有发生实际转账或扣款。','Earmark recorded; no transfer or debit occurred.');state.saving=false;await load();}
 catch{if(valid(u,ep))errorMsg(L('结果尚未确认，请刷新检查，以免重复标记。','Save uncertain. Refresh and verify before creating another earmark.'))}
 finally{state.saving=false}
}
async function removeAllocation(id,fundId){const f=getFund(fundId),e=state.allocations.find(x=>x.id===id&&x.fund_id===fundId);if(!canSee(f)||!e||state.saving)return;
 if(!window.confirm(L('仅撤销一条资金预留用途标签；不会转账或更改真实余额。确定？','Remove this earmark label? No transfer or account change occurs.')))return;
 const u=state.owner,ep=state.epoch;state.saving=true;
 try{const c=await authorized(),r=await c.from(ALLOC).delete().eq('user_id',u).eq('id',e.id).eq('fund_id',f.id).eq('version',e.version).select('id');if(r.error||!r.data?.length)throw Error('CONFLICT');if(!valid(u,ep))return;state.notice=L('预留记录已撤销。','Earmark removed.');state.saving=false;await load()}
 catch{if(valid(u,ep)){state.notice=L('操作未确认，请刷新核查。','Operation uncertain; refresh and verify.');render()}}
 finally{state.saving=false}
}
async function deleteFund(id){const f=getFund(id);if(!canSee(f)||state.saving)return;
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
 if(act==='remove'){deleteFund(id);return}
 if(act==='deleteAllocation'){removeAllocation(id,b.dataset.fund);return}
}
function init(){document.addEventListener('click',click);document.addEventListener('submit',e=>{if(e.target?.id!=='lfFormV41')return;e.preventDefault();if(state.saving||!state.dialog||!state.loaded||!active())return;
 if(state.dialog.id&&getFund(state.dialog.id)?.is_private&&!state.reveal){errorMsg(L('私人基金已自动隐藏，请重新打开。','Private fund locked. Reveal again.'));return}
 state.dialog.kind==='fund'?saveFund(e.target):saveAllocation(e.target);
});
 window.addEventListener('mmhvault:config-owner-changed',forget);window.addEventListener('mmhvault:page-visible',e=>{if(e?.detail?.page!=='life-planner')forget()});
 for(const n of ['mmhvault-language-change','languagechange'])window.addEventListener(n,()=>{hide();closeDialog()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)forget();else if($(ROOT))window.MMHLifeFundsV41?.mount()});
 window.addEventListener('blur',hide);
 window.MMHLifeFundsV41={mount(){if(!$(ROOT))return;if(!owner()){forget();state.error='LOGIN';render();return}if(state.owner!==owner()||state.epoch!==epoch()){forget();state.owner=owner();state.epoch=epoch()}if(!state.loaded&&!state.loading)load();else render()},unmount:forget};
}
init();
})();
