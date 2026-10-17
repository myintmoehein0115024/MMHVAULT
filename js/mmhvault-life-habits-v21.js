/* MMHVAULT Life Planner · Phase 2.2 / Habit Journal
 * Deliberately separate from finance, notification, AI Chat and analytics.
 * No localStorage, sessionStorage, offline seed, third-party requests or global habit data.
 * Requires independently reviewed RLS schema. Do not persist sensitive data before migration.
 */
(()=>{
'use strict';
if(window.MMHLifeHabitsV21) return;
const ROOT='mmhLifeHabitsV21',TABLE='life_habits',LOGS='life_habit_entries';
const $=id=>document.getElementById(id);
const owner=()=>{try{return typeof currentSessionUser!=='undefined'?currentSessionUser?.id||'':'';}catch(_){return '';}};
const epoch=()=>Number(window.__mmhSessionEpochV1239)||0;
const client=()=>{try{return typeof db!=='undefined'&&db?.from?db:null;}catch(_){return null;}};
const isZh=()=>{try{return localStorage.getItem('mmhvault_language_v3363')==='zh';}catch(_){return false;}};
const L=(zh,en)=>isZh()?zh:en;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uuid=()=>crypto.randomUUID?.()||(()=>{const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const x=[...b].map(a=>a.toString(16).padStart(2,'0')).join('');return `${x.slice(0,8)}-${x.slice(8,12)}-${x.slice(12,16)}-${x.slice(16,20)}-${x.slice(20)}`;})();
const date=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const localDate=()=>date(new Date());
const shift=(day,n)=>{const d=new Date(day+'T12:00:00');d.setDate(d.getDate()+n);return date(d);};
const validDay=v=>/^\d{4}-\d\d-\d\d$/.test(v)&&date(new Date(v+'T12:00:00'))===v;
const modes={reduce:['减少频率','Reduce'],build:['培养习惯','Build'],maintain:['维持习惯','Maintain']};
const periods={day:['每天','Daily'],week:['每周','Weekly'],month:['每月','Monthly']};
const state={owner:'',epoch:0,token:0,habits:[],entries:[],loaded:false,busy:false,error:'',reveal:false,selected:localDate(),viewMonth:localDate().slice(0,7),filter:'all',dialog:null,notice:''};
const live=()=>state.owner&&state.owner===owner()&&state.epoch===epoch()&&$(ROOT)&&document.getElementById('life-planner')?.classList.contains('active')&&!document.hidden;
function forget(){state.token++;state.habits=[];state.entries=[];state.loaded=false;state.busy=false;state.error='';state.reveal=false;state.dialog=null;state.notice='';state.selected=localDate();state.viewMonth=localDate().slice(0,7);state.filter='all';const d=$('lhDialogV21');if(d){d.close?.();d.remove();}const root=$(ROOT);if(root)root.replaceChildren();}
function available(){return state.loaded&&!state.busy&&live();}
async function auth(){const c=client();if(!c||!live())throw Error('LOGIN');const result=await c.auth.getUser();if(result.error||result.data?.user?.id!==state.owner||!live())throw Error('LOGIN');return c;}
function errorKind(e){const t=String(e?.message||''),code=String(e?.code||'');return /42P01|PGRST205|schema cache|does not exist|could not find the table/i.test(code+' '+t)?'MIGRATION':'CONNECT';}
async function load(){if(!live()||state.busy)return;const token=++state.token,u=state.owner;state.busy=true;state.error='';render();try{
const c=await auth();const h=await c.from(TABLE).select('*').eq('user_id',u).order('created_at',{ascending:false}).limit(500);
if(h.error)throw h.error;if(!live()||token!==state.token)return;
const e=await c.from(LOGS).select('*').eq('user_id',u).gte('entry_date',shift(localDate(),-365)).order('entry_date',{ascending:false}).limit(5000);
if(e.error)throw e.error;if(!live()||token!==state.token)return;
state.habits=(h.data||[]).filter(x=>x.user_id===u);state.entries=(e.data||[]).filter(x=>x.user_id===u);
state.loaded=true;if((h.data||[]).length>=500||(e.data||[]).length>=5000)state.notice=L('记录数量达到本版读取上限，仅展示部分内容。','Showing partial history due to the current read limit.');
}catch(err){if(live()&&token===state.token){state.loaded=false;state.error=errorKind(err);state.habits=[];state.entries=[];}}
finally{if(live()&&token===state.token){state.busy=false;render();}}
}
function periodRange(period,day){const d=new Date(day+'T12:00:00');if(period==='month')return [date(new Date(d.getFullYear(),d.getMonth(),1)),date(new Date(d.getFullYear(),d.getMonth()+1,0))];if(period==='week'){const start=shift(day,-((d.getDay()+6)%7));return [start,shift(start,6)];}return [day,day];}
function sums(h){const [a,b]=periodRange(h.target_period,localDate());const items=state.entries.filter(e=>e.habit_id===h.id&&e.entry_date>=a&&e.entry_date<=b);const num=items.reduce((n,e)=>n+Number(e.count||0),0);return {num,days:items.length,range:[a,b]};}
function title(h){return h.is_private&&!state.reveal?L('私人习惯','Private habit'):h.title;}
function trend(h){const last=Array.from({length:7},(_,i)=>shift(localDate(),i-6));return `<div class="lh-trend">${last.map(d=>{const row=state.entries.find(e=>e.habit_id===h.id&&e.entry_date===d);return `<div class="lh-trend-day" title="${esc(d)}" aria-label="${esc(d)} ${row?esc(L('记录','Recorded')):esc(L('未记录','Not recorded'))}"><span class="${row?'lh-recorded':''}" style="--lh-count:${Math.min(1,Number(row?.count||0)/4)}"></span><small>${d.slice(-2)}</small></div>`;}).join('')}</div>`;}
function privateMasked(h){return !!(h.is_private&&!state.reveal);}
function countFor(h,d){return state.entries.find(e=>e.habit_id===h.id&&e.entry_date===d);}
function monthDate(year,month){const d=new Date(year,month,1,12);return date(d).slice(0,7);}
function monthShift(ym,delta){const [y,m]=ym.split('-').map(Number);return monthDate(y,m-1+delta);}
function monthName(ym){const [y,m]=ym.split('-').map(Number);return isZh()?`${y}年${m}月`:new Intl.DateTimeFormat('en',{month:'long',year:'numeric'}).format(new Date(y,m-1,2,12));}
function historyCalendar(){const today=localDate(),oldest=shift(today,-365),ym=state.viewMonth;
const [y,m]=ym.split('-').map(Number),first=new Date(y,m-1,1,12),days=new Date(y,m,0,12).getDate(),offset=(first.getDay()+6)%7;
const dayNames=isZh()?['一','二','三','四','五','六','日']:['M','T','W','T','F','S','S'];
const relevant=state.habits.filter(h=>!privateMasked(h));
const cells=Array.from({length:Math.ceil((days+offset)/7)*7},(_,i)=>{
 const n=i-offset+1;if(n<1||n>days)return '<span class="lh-calendar-blank" aria-hidden="true"></span>';
 const d=`${ym}-${String(n).padStart(2,'0')}`,disabled=d>today||d<oldest;
 const nRecorded=relevant.reduce((acc,h)=>acc+(countFor(h,d)?1:0),0);
 return `<button type="button" data-lh-act="pickday" data-day="${d}" class="lh-calendar-day${d===state.selected?' is-selected':''}${d===today?' is-today':''}" ${disabled?'disabled':''} aria-pressed="${d===state.selected}" aria-label="${d}${nRecorded?' · '+L('有记录','has entries'):''}"><b>${n}</b>${nRecorded?'<i aria-hidden="true"></i>':'<span aria-hidden="true"></span>'}</button>`;
}).join('');
const lower=ym<=oldest.slice(0,7),upper=ym>=today.slice(0,7);
return `<section class="lh-journal" aria-label="${L('习惯记录日历','Habit journal calendar')}"><div class="lh-journal-top"><div><span class="lh-eyebrow">HABIT JOURNAL</span><h2>${L('每一天，都值得记录','Your days, your pace')}</h2><p>${L('点选日期，再为任何习惯补记或调整次数。没有记录的日子不会算成零。','Choose a date, then log or adjust a habit. Unrecorded days are never treated as zero.')}</p></div><div class="lh-calendar-nav"><button type="button" data-lh-act="monthprev" aria-label="${L('上个月','Previous month')}" ${lower?'disabled':''}>‹</button><strong>${esc(monthName(ym))}</strong><button type="button" data-lh-act="monthnext" aria-label="${L('下个月','Next month')}" ${upper?'disabled':''}>›</button><button type="button" data-lh-act="today">${L('今天','Today')}</button></div></div>
<div class="lh-calendar-wrap"><div class="lh-calendar-grid lh-calendar-head">${dayNames.map(x=>`<span>${x}</span>`).join('')}</div><div class="lh-calendar-grid">${cells}</div></div>
<div class="lh-day-summary"><span>◷ ${L('当前选择','Selected')}: <strong>${esc(state.selected)}</strong></span><span>${state.reveal?L('已临时显示私人记录','Private activity temporarily visible'):L('私人记录默认不显示数量','Private activity hidden by default')}</span></div></section>`;}
function card(h){const p=sums(h),masked=privateMasked(h),selectedEntry=countFor(h,state.selected);
const target=Number(h.target_count)||0,progress=Math.min(100,Math.round(p.num/Math.max(1,target)*100));
const label=h.mode==='reduce'?L('参考上限','Suggested limit'):L('个人目标','Personal goal');
const progressLabel=h.mode==='reduce'?`${L('本周期已记录','Recorded this period')} ${p.num} / ${target} ${L('次（自定参考）','times (personal guide)')}`:`${L('本周期进度','This period')} ${p.num} / ${target} ${L('次','times')}`;
const period=esc(periods[h.target_period]?.[isZh()?0:1]||h.target_period);
return `<article class="lh-card ${h.is_paused?'lh-paused':''}" data-lh-card-id="${h.id}">
  <div class="lh-card-top"><span class="lh-mode">${masked?L('隐私已保护','Private'):esc(modes[h.mode]?.[isZh()?0:1]||h.mode)}</span><span class="lh-private-flag">${h.is_private?'◈ '+L('私人','Private'):L('普通','Regular')}</span></div>
  <h3>${esc(title(h))}</h3><p class="lh-card-hint">${masked?L('目标与记录已隐藏','Goal and activity hidden'):period+' · '+label+' '+target+' '+L('次','times')}${h.is_paused?' · '+L('已暂停','Paused'):''}</p>
  ${masked?`<div class="lh-hidden-activity" aria-label="${L('私人统计已隐藏','Private statistics hidden')}"><span>•••</span><small>${L('统计、次数与趋势仅在临时显示后可见','Counts, progress and trends require temporary reveal')}</small></div>`:`<div class="lh-number"><strong>${p.num}</strong><small>${L('本周期次数','times this period')} · ${p.days} ${L('个有记录的日期','recorded days')}</small></div>
  <div class="lh-goal-progress"><p>${esc(progressLabel)}</p>${h.mode==='reduce'?`<div class="lh-guide-line">${L('观察变化，不作成绩评判。','Observe gently; no score or penalty.')}</div>`:`<div class="lh-progress-track" role="progressbar" aria-label="${L('自定目标进度','Personal target progress')}" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progress}%"></span></div>`}</div>
  ${trend(h)}
  <p class="lh-chosen-entry">${esc(state.selected)} · ${selectedEntry?`${L('已记录','Recorded')} ${Number(selectedEntry.count)} ${L('次','times')}`:L('未记录（不等于零）','No entry (not zero)')}</p>`}
  <div class="lh-actions"><button data-lh-act="record" data-id="${h.id}" type="button" ${!available()?'disabled':''}>${L('记录选中日期','Log selected day')}</button><button data-lh-act="edit" data-id="${h.id}" type="button" ${!available()?'disabled':''}>${L('编辑','Edit')}</button><button data-lh-act="pause" data-id="${h.id}" type="button" ${!available()?'disabled':''}>${h.is_paused?L('恢复','Resume'):L('暂停','Pause')}</button><button data-lh-act="delete" data-id="${h.id}" type="button" ${!available()?'disabled':''}>${L('删除','Delete')}</button></div>
</article>`;}
function render(){const host=$(ROOT);if(!host)return;
const error=state.error==='MIGRATION'?L('私人习惯数据库尚未建立或无权限访问。为保护隐私，当前禁止保存；需要先审核并执行独立的 Supabase RLS 迁移。','Private habit tables are not yet available. Writes remain disabled until the separate RLS migration is reviewed and deployed.'):state.error?L('云端连接或身份验证失败，请重试。不会将私人习惯写入浏览器缓存。','Could not verify cloud access. No sensitive habit data is written to browser storage.'):'';
const visible=state.habits.filter(h=>state.filter==='all'||(state.filter==='active'?!h.is_paused:h.is_paused));
host.innerHTML=`<div class="lh-shell"><header class="lh-hero"><div class="lh-eyebrow">LIFE PLANNER / HABIT CONTROL</div><h1>${L('把生活过成喜欢的样子','Small steps, your own pace')}</h1><p>${L('培养积极习惯，温和地调整频率。不设惩罚，也不要求每天连续打卡。','Build helpful habits or adjust your frequency gently. No punishment or forced streaks.')}</p></header>
<section class="lh-privacy"><div><strong>◈ ${L('隐私优先','Privacy first')}</strong><p>${L('私人习惯的名称、次数与进度默认隐藏，仅能在这里主动临时显示。数据库受到 RLS 隔离，但并非端到端加密。','Private titles, counts and progress stay masked until you temporarily reveal them here. RLS protects access, but this is not end-to-end encryption.')}</p></div><button type="button" data-lh-act="reveal" class="lh-soft" ${!state.loaded?'disabled':''}>${state.reveal?L('重新隐藏私人数据','Hide private details'):L('临时显示私人数据','Reveal private details')}</button></section>
${state.busy?`<p class="lh-status" role="status">${L('正在安全同步习惯记录…','Synchronizing securely…')}</p>`:''}
${error?`<p class="lh-status lh-error" role="alert">${esc(error)}</p>`:''}
${state.notice?`<p class="lh-status" role="status">${esc(state.notice)}</p>`:''}
${state.loaded?historyCalendar():''}
<div class="lh-toolbar"><div><span class="lh-eyebrow">MY HABITS</span><h2>${L('我的习惯','My habits')}</h2></div><div class="lh-tools"><label class="lh-filter-label">${L('筛选','Filter')}<select id="lhFilterV22" aria-label="${L('筛选习惯状态','Filter habit status')}"><option value="all" ${state.filter==='all'?'selected':''}>${L('全部','All')}</option><option value="active" ${state.filter==='active'?'selected':''}>${L('进行中','Active')}</option><option value="paused" ${state.filter==='paused'?'selected':''}>${L('已暂停','Paused')}</option></select></label><button type="button" data-lh-act="reload" class="lh-soft" ${state.busy?'disabled':''}>${L('刷新','Refresh')}</button><button type="button" data-lh-act="add" class="lh-accent" ${!available()?'disabled':''}>+ ${L('添加习惯','New habit')}</button></div></div>
${state.loaded?(visible.length?`<div class="lh-grid">${visible.map(card).join('')}</div>`:`<div class="lh-empty"><div aria-hidden="true">🌱</div><h3>${state.habits.length?L('当前筛选没有习惯','No habits in this filter'):L('从一个小习惯开始','Start with one small habit')}</h3><p>${state.habits.length?L('切换筛选即可查看其他习惯。','Try another filter to see your habits.'):L('这里不会自动创建任何示例记录。','No sample habits are added to your account.')}</p>${!state.habits.length?`<button type="button" class="lh-accent" data-lh-act="add">+ ${L('创建我的习惯','Create a habit')}</button>`:''}</div>`):`<div class="lh-empty"><p>${L('需要经过验证的私人云端存储才能启用习惯管理。','Verified private cloud storage is required for habit management.')}</p></div>`}
<footer class="lh-footnote">${L('历史日历展示最近 365 天的记录。未记录 ≠ 零次；你可以主动修改或删除某一天。私人习惯不会进入普通 Dashboard、通知或 AI Chat。','The journal shows the past 365 days. No entry is not zero; you can edit or delete any recorded day. Private habits are not shared with Dashboard, notifications or AI Chat.')}</footer></div>`;}
function options(obj,selected){return Object.entries(obj).map(([id,n])=>`<option value="${id}" ${selected===id?'selected':''}>${esc(n[isZh()?0:1])}</option>`).join('');}
function modal(html){const old=$('lhDialogV21');if(old)old.remove();const d=document.createElement('dialog');d.id='lhDialogV21';d.className='lh-dialog';d.innerHTML=html;document.body.appendChild(d);d.addEventListener('close',()=>{if(state.dialog){state.dialog=null;}d.remove();});d.showModal();const input=d.querySelector('input:not([type=checkbox])');input?.focus({preventScroll:true});}
function close(){const d=$('lhDialogV21');d?.close();state.dialog=null;}
function openHabit(h){if(!available())return;state.dialog={type:'habit',id:h?.id||null};modal(`<form id="lhHabitFormV21" method="dialog"><div class="lh-dialog-top"><span class="lh-eyebrow">HABIT CONTROL</span><h2>${h?L('编辑习惯','Edit habit'):L('创建习惯','New habit')}</h2><button type="button" data-lh-act="close" aria-label="${L('关闭','Close')}">×</button></div><div class="lh-dialog-body">
<label>${L('习惯名称','Habit name')}<input name="title" required maxlength="100" autocomplete="off" value="${esc(h?.title||'')}" placeholder="${L('自己填写，默认保密','Your own private title')}"></label>
<div class="lh-form-grid"><label>${L('管理方式','Goal type')}<select name="mode">${options(modes,h?.mode||'build')}</select></label><label>${L('目标周期','Goal period')}<select name="target_period">${options(periods,h?.target_period||'week')}</select></label></div>
<label>${L('参考次数目标','Frequency target')}<input type="number" name="target_count" min="0" max="500" step="1" required value="${Number(h?.target_count??3)}"></label>
<label class="lh-check"><input type="checkbox" name="is_private" ${h?.is_private===false?'':'checked'}> ${L('私人习惯（默认开启；在列表中遮盖名称）','Private habit (default on; title masked in lists)')}</label>
<p class="lh-modal-note">${L('只有你主动创建的习惯才会保存。私人数据不会进入财务交易、通知或 AI Chat。','Only habits you create are saved. Habit data is never added to financial transactions, notifications or AI Chat.')}</p><p id="lhErrorV21" class="lh-form-error" role="alert" hidden></p>
</div><div class="lh-dialog-actions"><button type="button" data-lh-act="close">${L('取消','Cancel')}</button><button class="lh-accent" type="submit">${L('保存习惯','Save habit')}</button></div></form>`);}
function openLog(h){if(!available())return;state.dialog={type:'log',id:h.id};const current=state.entries.find(e=>e.habit_id===h.id&&e.entry_date===state.selected);modal(`<form id="lhLogFormV21" method="dialog"><div class="lh-dialog-top"><span class="lh-eyebrow">HABIT CONTROL</span><h2>${L('记录次数','Record occurrences')}</h2><button type="button" data-lh-act="close">×</button></div><div class="lh-dialog-body"><p class="lh-modal-note">${esc(title(h))} · ${L('按自己真实记录的次数填写，零次也可以主动记录。','Record only what actually happened; you may explicitly log zero.')}</p><label>${L('日期','Date')}<input type="date" name="entry_date" required value="${esc(state.selected)}" min="${shift(localDate(),-365)}" max="${localDate()}"></label><label>${L('当天次数','Count on this date')}<input type="number" name="count" required min="0" max="24" step="1" value="${current?Number(current.count):0}"></label><p class="lh-modal-note">${L('缺失记录并不代表零次。编辑同一天的记录不会重复计数。','A missing entry is not counted as zero. Updating a day does not duplicate it.')}</p><p id="lhErrorV21" class="lh-form-error" role="alert" hidden></p></div><div class="lh-dialog-actions"><button type="button" data-lh-act="deleteLog" data-id="${h.id}" class="lh-danger" ${current?'':'hidden'}>${L('删除当天记录','Delete day entry')}</button><button type="button" data-lh-act="close">${L('取消','Cancel')}</button><button class="lh-accent" type="submit">${L('保存记录','Save')}</button></div></form>`);}
function showError(message){const el=$('lhErrorV21');if(el){el.textContent=message;el.hidden=false;}}
async function write(kind,fn){if(state.busy||!live())return;state.busy=true;const token=++state.token,u=state.owner,e=state.epoch;try{const c=await auth();await fn(c,u);if(state.owner!==u||state.epoch!==e||token!==state.token)return;close();state.notice=kind;state.busy=false;await load();}catch(err){if(token!==state.token||!live())return;state.busy=false;const msg=err.message==='CONFLICT'?L('这条记录已被其他设备更新，请刷新重试。','This record changed elsewhere. Refresh and retry.'):L('保存失败。请检查网络与权限后重试。','Save failed. Check connection and access permissions.');if($('lhDialogV21'))showError(msg);else{state.notice=msg;render();}}}
async function saveHabit(form){const data=new FormData(form),title=String(data.get('title')||'').trim(),mode=String(data.get('mode')),period=String(data.get('target_period')),goal=Number(data.get('target_count')),privateMode=data.has('is_private');if(!title||title.length>100||!(mode in modes)||!(period in periods)||!Number.isInteger(goal)||goal<0||goal>500){showError(L('请填写有效的名称与目标。','Enter a valid name and target.'));return;}
const existing=state.habits.find(h=>h.id===state.dialog?.id);await write(L('习惯已保存。','Habit saved.'),async(c,u)=>{let q;if(existing){q=c.from(TABLE).update({title,mode,target_period:period,target_count:goal,is_private:privateMode,version:existing.version+1,updated_at:new Date().toISOString()}).eq('id',existing.id).eq('user_id',u).eq('version',existing.version).select('id');}else{q=c.from(TABLE).insert({id:uuid(),user_id:u,client_request_id:uuid(),title,mode,target_period:period,target_count:goal,is_private:privateMode,is_paused:false}).select('id');}const r=await q;if(r.error)throw r.error;if(!r.data?.length)throw Error('CONFLICT');});}
async function saveLog(form){const data=new FormData(form),d=String(data.get('entry_date')),count=Number(data.get('count')),habit=state.habits.find(h=>h.id===state.dialog?.id);if(!habit||!validDay(d)||d>localDate()||d<shift(localDate(),-365)||!Number.isInteger(count)||count<0||count>24){showError(L('日期或次数无效。','Invalid date or count.'));return;}const existing=state.entries.find(e=>e.habit_id===habit.id&&e.entry_date===d);await write(L('记录已保存。','Entry saved.'),async(c,u)=>{let q;if(existing){q=c.from(LOGS).update({count,version:existing.version+1,updated_at:new Date().toISOString()}).eq('id',existing.id).eq('user_id',u).eq('version',existing.version).select('id');}else{q=c.from(LOGS).insert({id:uuid(),user_id:u,habit_id:habit.id,entry_date:d,count,client_request_id:uuid()}).select('id');}const r=await q;if(r.error)throw r.error;if(!r.data?.length)throw Error('CONFLICT');});}
async function togglePause(h){await write(L('状态已更新。','Status updated.'),async(c,u)=>{const r=await c.from(TABLE).update({is_paused:!h.is_paused,version:h.version+1,updated_at:new Date().toISOString()}).eq('id',h.id).eq('user_id',u).eq('version',h.version).select('id');if(r.error)throw r.error;if(!r.data?.length)throw Error('CONFLICT');});}
async function deleteHabit(h){if(!confirm(L('确定删除这项习惯及其全部记录吗？此操作不可撤销。','Delete this habit and all its history? This cannot be undone.')))return;await write(L('习惯及关联记录已删除。','Habit and its entries deleted.'),async(c,u)=>{const r=await c.from(TABLE).delete().eq('id',h.id).eq('user_id',u).eq('version',h.version).select('id');if(r.error)throw r.error;if(!r.data?.length)throw Error('CONFLICT');});}
async function deleteLog(){const d=$('lhDialogV21'),day=d?.querySelector('input[name="entry_date"]')?.value,habitId=state.dialog?.id;const entry=state.entries.find(e=>e.habit_id===habitId&&e.entry_date===day);if(!entry)return;await write(L('当天记录已删除。','Day entry deleted.'),async(c,u)=>{const r=await c.from(LOGS).delete().eq('id',entry.id).eq('user_id',u).eq('version',entry.version).select('id');if(r.error)throw r.error;if(!r.data?.length)throw Error('CONFLICT');});}
function click(ev){const btn=ev.target.closest('[data-lh-act]');if(!btn||!($(ROOT)?.contains(btn)||$('lhDialogV21')?.contains(btn)))return;const action=btn.dataset.lhAct,id=btn.dataset.id,h=state.habits.find(x=>x.id===id);
if(action==='close'){close();return;}if(action==='reveal'){state.reveal=!state.reveal;render();return;}if(action==='reload'){load();return;}if(!available()&&!['close'].includes(action))return;
if(action==='pickday'){const day=btn.dataset.day;if(validDay(day)&&day<=localDate()&&day>=shift(localDate(),-365)){state.selected=day;render();}return;}if(action==='today'){state.selected=localDate();state.viewMonth=state.selected.slice(0,7);render();return;}if(action==='monthprev'||action==='monthnext'){const next=monthShift(state.viewMonth,action==='monthprev'?-1:1);if(next>=shift(localDate(),-365).slice(0,7)&&next<=localDate().slice(0,7)){state.viewMonth=next;render();}return;}if(action==='add')openHabit();else if(action==='edit'&&h)openHabit(h);else if(action==='record'&&h){openLog(h);}else if(action==='pause'&&h)togglePause(h);else if(action==='delete'&&h)deleteHabit(h);else if(action==='deleteLog')deleteLog();}
function submit(ev){if(!['lhHabitFormV21','lhLogFormV21'].includes(ev.target?.id))return;ev.preventDefault();if(!available())return;ev.target.id==='lhHabitFormV21'?saveHabit(ev.target):saveLog(ev.target);}
document.addEventListener('click',click);document.addEventListener('submit',submit);
document.addEventListener('change',ev=>{
 if(ev.target?.id==='lhFilterV22'&&$(ROOT)?.contains(ev.target)){const value=ev.target.value;if(['all','active','paused'].includes(value)){state.filter=value;render();}return;}
 if(ev.target?.name==='entry_date'&&ev.target.closest('#lhLogFormV21')){
  const d=ev.target.value,entry=state.entries.find(e=>e.habit_id===state.dialog?.id&&e.entry_date===d);
  const input=$('lhLogFormV21')?.querySelector('input[name="count"]');if(input)input.value=String(Number(entry?.count??0));
  const del=$('lhLogFormV21')?.querySelector('[data-lh-act="deleteLog"]');if(del)del.hidden=!entry;
 }
});
window.addEventListener('mmhvault-language-change',()=>{if($(ROOT)){close();state.reveal=false;render();}});
window.addEventListener('languagechange',()=>{if($(ROOT)){close();state.reveal=false;render();}});
window.addEventListener('mmhvault:config-owner-changed',forget);
window.addEventListener('mmhvault:page-visible',ev=>{if(ev.detail?.page!=='life-planner')forget();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)forget();else if($(ROOT))window.MMHLifeHabitsV21?.mount();});
window.addEventListener('blur',()=>{state.reveal=false;close();if($(ROOT))render();});
window.addEventListener('focus',()=>{if($(ROOT)&&live()&&!state.busy)load();});
window.MMHLifeHabitsV21={mount(){const host=$(ROOT);if(!host)return;if(!owner()){forget();state.error='LOGIN';render();return;}if(state.owner!==owner()||state.epoch!==epoch()){forget();state.owner=owner();state.epoch=epoch();}if(!state.loaded&&!state.busy){load();}else render();},unmount:forget};
})();
