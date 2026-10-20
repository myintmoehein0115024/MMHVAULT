/* MMHVAULT Life Insights 5.3 — recurring exceptions, monthly clarity, private-by-default.
 * No financial writes, seed data, browser storage, push, AI or raw private records.
 * Public/non-private plans only; incomplete linked spending intentionally not totaled.
 */
(()=>{
'use strict';
if(window.MMHLifeInsightsV52)return;
const ID='mmhLifeInsightsV52',MAX=5000,PAGE=400;
const $=x=>document.getElementById(x);
const lang=()=>{try{return localStorage.getItem('mmhvault_language_v3363')==='zh'}catch{return false}};
const T=(zh,en)=>lang()?zh:en;
const esc=x=>String(x??'').replace(/[&<>"']/g,v=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v]));
const user=()=>{try{return typeof currentSessionUser!=='undefined'?currentSessionUser?.id||'':''}catch{return ''}};
const epoch=()=>Number(window.__mmhSessionEpochV1239)||0;
const cloud=()=>{try{return typeof db!=='undefined'&&db?.from?db:null}catch{return null}};
const dateNow=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const monthKey=(year,month)=>`${year}-${String(month).padStart(2,'0')}`;
const monthStart=s=>s+'-01';
const endMonth=s=>{let [y,m]=s.split('-').map(Number);return new Date(y,m,0).getDate()};
const cents=n=>Math.round(Number(n)*100);
const money=(n,cur)=>{const sy={USD:'$',THB:'฿',MMK:'K',RMB:'￥'}[cur]||'';return `${sy}${Number(n).toLocaleString(lang()?'zh-CN':'en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} ${cur}`};
const state={owner:'',epoch:0,token:0,loading:false,loaded:false,modules:{},selected:'schedule',period:buildMonths().at(-1),error:''};
const active=()=>!!$(ID)&&$('life-planner')?.classList.contains('active')&&!document.hidden&&user()===state.owner&&epoch()===state.epoch;
const valid=(o,e,t)=>active()&&o===state.owner&&e===state.epoch&&t===state.token;
function forget(){state.token++;state.loading=false;state.loaded=false;state.owner='';state.epoch=0;state.modules={};state.error='';const h=$(ID);if(h)h.replaceChildren()}
async function auth(){const c=cloud();if(!c||!state.owner)throw Error('LOGIN');const r=await c.auth.getUser();if(r.error||r.data?.user?.id!==state.owner)throw Error('LOGIN');return c}
// count:'exact' ensures PostgREST page caps and changing counts are detected before calculations.
async function paged(c,table,fields,owner,extra=()=>{},max=MAX){let all=[],last=null,seen=new Set();for(let off=0;off<max;off+=PAGE){let q=c.from(table).select(fields,{count:'exact'}).eq('user_id',owner);q=extra(q);q=q.order('id',{ascending:true}).range(off,off+PAGE-1);const r=await q;if(r.error)throw r.error;if(!Number.isSafeInteger(r.count)||r.count>=max||!Array.isArray(r.data))throw Error('LIMIT');if(last===null)last=r.count;if(r.count!==last)throw Error('STALE');for(const x of r.data){let id=String(x.id);if(seen.has(id))throw Error('STALE');seen.add(id);all.push(x)}if(all.length===last)return all;if(!r.data.length)throw Error('STALE')}throw Error('LIMIT')}
async function selected(c,table,fields,owner,column,ids){if(!ids.length)return [];let result=[];for(let i=0;i<ids.length;i+=60){const group=ids.slice(i,i+60);let x=await paged(c,table,fields,owner,q=>q.in(column,group));result.push(...x);if(result.length>=MAX)throw Error('LIMIT')}return result}
function buildMonths(){const now=new Date();return Array.from({length:6},(_,i)=>{let d=new Date(now.getFullYear(),now.getMonth()-5+i,1);return monthKey(d.getFullYear(),d.getMonth()+1)})}
function seriesBase(){return Object.fromEntries(buildMonths().map(x=>[x,0]))}
const monthOf=x=>String(x||'').slice(0,7);
function dayDiff(x,y){const a=new Date(x+'T12:00:00'),b=new Date(y+'T12:00:00');return Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/86400000)}
function recurrence(ev,date){if(date<ev.starts_on||ev.repeat_until&&date>ev.repeat_until)return false;const n=dayDiff(ev.starts_on,date);if(n<0)return false;const f=ev.repeat_frequency||'none',step=Math.max(1,Number(ev.repeat_interval)||1);if(f==='none')return date===ev.starts_on;if(f==='daily')return n%step===0;if(f==='weekly')return n%(step*7)===0;if(f==='monthly'){const [y,m,d]=date.split('-').map(Number),[yy,mm,dd]=ev.starts_on.split('-').map(Number);return d===dd&&((y-yy)*12+m-mm)%step===0}return false}
function plusDay(s,n){const [y,m,d]=s.split('-').map(Number),z=new Date(y,m-1,d+n);return `${z.getFullYear()}-${String(z.getMonth()+1).padStart(2,'0')}-${String(z.getDate()).padStart(2,'0')}`}
// One occurrence = one scheduled occurrence, grouped by its actual start date.
// An override can move the original recurrence into the visible six-month window.
// Private overrides are fetched ONLY as the minimal scheduling metadata needed
// to suppress the original public occurrence; no private title or notes are read.
async function schedules(c,o){
 const base=await paged(c,'life_schedule_events','id,user_id,starts_on,ends_on,repeat_frequency,repeat_interval,repeat_until,status,is_private',o,q=>q.eq('is_private',false));
 const exceptions=await selected(c,'life_schedule_exceptions','id,event_id,occurrence_date,starts_on,status,is_private',o,'event_id',base.map(x=>x.id));
 const ex=new Map(exceptions.map(x=>[x.event_id+'|'+x.occurrence_date,x]));
 const byId=new Map(base.map(x=>[x.id,x]));
 const counts=seriesBase(),done=seriesBase(),seen=new Set();
 const first=monthStart(buildMonths()[0]),last=plusDay(monthStart(buildMonths().at(-1)),endMonth(buildMonths().at(-1))-1);
 if(base.length>1000)throw Error('LIMIT');
 const add=(ev,anchor,override)=>{
  const key=ev.id+'|'+anchor;
  if(seen.has(key)||!recurrence(ev,anchor))return;
  seen.add(key);
  // An override can make a single occurrence private, even on a public series.
  if(override?.is_private)return;
  const actual=override?.starts_on||anchor,m=monthOf(actual);
  if(!Object.hasOwn(counts,m))return;
  const status=override?.status||ev.status||'scheduled';
  if(status==='cancelled')return;
  counts[m]++;
  if(status==='completed')done[m]++;
 };
 // Generate canonical recurrence anchors, matching the My Schedule rules.
 // We count an event once in its actual start month, not once per day spanned.
 for(const ev of base){
  for(let d=first;d<=last;d=plusDay(d,1)){
   if(recurrence(ev,d))add(ev,d,ex.get(ev.id+'|'+d));
  }
 }
 // Include moved occurrences whose original anchor was BEFORE the window.
 // Iterating exceptions rather than private titles prevents a privacy leak.
 for(const x of exceptions){
  const ev=byId.get(x.event_id);
  if(ev)add(ev,x.occurrence_date,x);
 }
 return {counts,done,base:base.length};
}
async function habits(c,o){const base=await paged(c,'life_habits','id,user_id,is_private,is_paused,target_period,target_count',o,q=>q.eq('is_private',false));const entries=await selected(c,'life_habit_entries','id,habit_id,entry_date,count',o,'habit_id',base.map(x=>x.id));const counts=seriesBase(),occ=seriesBase();for(const entry of entries){let month=monthOf(entry.entry_date);if(Object.hasOwn(counts,month)){counts[month]+=Number(entry.count||0);occ[month]++}}return {counts,occ,base:base.length,active:base.filter(x=>!x.is_paused).length}}
async function spending(c,o){const base=await paged(c,'life_spending_plans','id,user_id,currency,monthly_limit,created_at',o,q=>q.eq('is_private',false));const ids=base.map(x=>x.id),entries=await selected(c,'life_spending_entries','id,plan_id,spent_on,amount,currency',o,'plan_id',ids);const links=await selected(c,'life_spending_transaction_links','id,plan_id,transaction_id,matched_manual_entry_id',o,'plan_id',ids);const totals=Object.fromEntries(buildMonths().map(s=>[s,{}]));const uses=seriesBase(),matched=new Set(links.map(x=>x.matched_manual_entry_id).filter(Boolean));for(const e of entries){if(matched.has(e.id))continue;const plan=base.find(x=>x.id===e.plan_id);const m=monthOf(e.spent_on);if(!plan||!Object.hasOwn(totals,m)||plan.currency!==e.currency)continue;const num=Number(e.amount);if(!Number.isFinite(num)||num<0)throw Error('STALE');totals[m][plan.currency]=(totals[m][plan.currency]||0)+cents(num);uses[m]++}return {base:base.length,totals,uses,linked:links.length,hasLinks:links.length>0}}
async function funds(c,o){const base=await paged(c,'life_funds','id,user_id,goal_amount,currency,fund_type,is_private',o,q=>q.eq('is_private',false));const allocations=await selected(c,'life_fund_allocations','id,fund_id,currency,amount,allocated_on',o,'fund_id',base.map(x=>x.id));const movements=await selected(c,'life_fund_movements','id,fund_id,allocation_id,amount,kind',o,'fund_id',base.map(x=>x.id));const transfers=await selected(c,'life_fund_transfers','id,source_fund_id,target_fund_id,amount',o,'source_fund_id',base.map(x=>x.id));const amt=new Map(base.map(x=>[x.id,0]));for(const a of allocations){const v=Number(a.amount);if(!Number.isFinite(v)||v<0)throw Error('STALE');amt.set(a.fund_id,(amt.get(a.fund_id)||0)+cents(v))}for(const a of movements){const v=Number(a.amount);if(!Number.isFinite(v)||v<0)throw Error('STALE');amt.set(a.fund_id,(amt.get(a.fund_id)||0)-cents(v))}for(const a of transfers){const v=Number(a.amount);if(!Number.isFinite(v)||v<0)throw Error('STALE');amt.set(a.source_fund_id,(amt.get(a.source_fund_id)||0)-cents(v))}
// Public fund balances can legitimately include incoming allocations; do not show names of other funds.
const byCurrency={};let targetSum=0,targetCount=0;for(const f of base){if((amt.get(f.id)||0)<0)throw Error('STALE');const ccy=f.currency;if(!byCurrency[ccy])byCurrency[ccy]={held:0,goals:0};byCurrency[ccy].held+=(amt.get(f.id)||0);if(f.goal_amount>0){byCurrency[ccy].goals+=cents(f.goal_amount);targetSum+=Math.min(100,Math.max(0,Math.round((amt.get(f.id)||0)/cents(f.goal_amount)*100)));targetCount++}}return {count:base.length,byCurrency,progress:targetCount?Math.round(targetSum/targetCount):null}}
async function goals(c,o){const base=await paged(c,'life_goals','id,user_id,status,category,is_private',o,q=>q.eq('is_private',false));const ids=base.map(x=>x.id),steps=await selected(c,'life_goal_steps','id,goal_id,completed_at',o,'goal_id',ids),updates=await selected(c,'life_goal_progress','id,goal_id,percent,recorded_on,created_at',o,'goal_id',ids);const latest=new Map();for(const p of updates){const old=latest.get(p.goal_id);if(!old||String(p.created_at)>String(old.created_at))latest.set(p.goal_id,p)}const trend=seriesBase();for(const p of updates){const m=monthOf(p.recorded_on);if(Object.hasOwn(trend,m))trend[m]++}return {count:base.length,active:base.filter(x=>x.status==='active').length,steps:steps.length,completed:steps.filter(x=>!!x.completed_at).length,tracked:latest.size,avg:latest.size?Math.round([...latest.values()].reduce((n,x)=>n+Number(x.percent),0)/latest.size):null,trend}}
const tasks={schedule:schedules,habit:habits,spending:spending,fund:funds,goals};
async function load(){if(!active()||state.loading)return;state.loading=true;const token=++state.token,o=state.owner,e=state.epoch;state.modules={};state.error='';render();try{const c=await auth();if(!valid(o,e,token))return;await Promise.all(Object.entries(tasks).map(async ([k,fn])=>{try{const data=await fn(c,o);if(valid(o,e,token)){state.modules[k]={ok:true,data};render()}}catch(err){if(valid(o,e,token)){state.modules[k]={ok:false,error:err?.message==='LIMIT'?'LIMIT':'UNAVAILABLE'};render()}}}));if(valid(o,e,token))state.loaded=true}catch(ex){if(valid(o,e,token))state.error='LOGIN'}finally{if(valid(o,e,token)){state.loading=false;render()}}}
const label=(id)=>({schedule:T('我的日程','My Schedule'),habit:T('习惯管理','Habit Control'),spending:T('消费控制','Spending Control'),fund:T('愿望基金','Wish Fund'),goals:T('长期目标','My Goals')})[id]||id;
const blurb={schedule:['完成的普通日程','Completed non-private events'],habit:['普通习惯记录次数','Non-private habit counts'],spending:['独立生活消费次数','Manual lifestyle entries'],fund:['已有公开基金预留','Non-private earmarks'],goals:['生活目标进度更新','Life goal updates']};
function metric(k,period){const m=state.modules[k];if(!m?.ok)return null;const x=m.data;switch(k){case 'schedule':return {big:x.counts[period]?`${x.done[period]}/${x.counts[period]}`:'—',sub:T('已完成／本月开始的安排','Completed / occurrences starting this month'),series:x.done,total:x.counts[period]};case 'habit':return {big:x.occ[period]?String(x.counts[period]):'—',sub:x.occ[period]?T('按自愿记录的次数汇总','Self-logged counts'):T('本月尚无普通习惯记录','No non-private habit logs this month'),series:x.counts,total:x.counts[period]};case 'spending':return {big:x.hasLinks?T('待核实','Verify first'):(x.uses[period]?String(x.uses[period]):'—'),sub:x.hasLinks?T('含真实交易关联，请在消费控制查看完整分析','Linked expenses require verification in Spending Control'):(x.uses[period]?T('手动记录次数','Manual entries'):T('未记录不代表没有消费','No entries does not mean no spending')),series:x.hasLinks?null:x.uses,total:x.uses[period]};case 'fund':return {big:String(x.count),sub:T('普通基金数量（不是总资产）','Non-private funds (not total assets)'),series:null,total:x.count};case 'goals':return {big:x.avg===null?'—':x.avg+'%',sub:T('有记录目标的平均最新进度','Average latest recorded progress'),series:x.trend,total:x.trend[period]}}return null}
function chart(series,presence,k){
 if(!series)return `<div class="li-chart-empty">${k==='spending'?T('关联交易未完全核对，暂停绘制消费趋势','Linked transactions are not fully verified; trend paused'):T('查看下方各币种的预留详情','See separate currencies below')}</div>`;
 const list=buildMonths(),max=Math.max(1,...list.map(x=>series[x]||0));
 return `<div class="li-bars" role="img" aria-label="${esc(T('最近六个月趋势图；选中月份已高亮','Six-month trend with selected month highlighted'))}">${list.map(k=>{
  const value=series[k]||0,hasRecord=presence?!!presence[k]:true;
  return `<div class="li-bar-col${k===state.period?' is-selected':''}${!hasRecord?' is-unrecorded':''}"><div class="li-bar-track"><i style="height:${hasRecord&&value>0?Math.max(3,value/max*100):0}%;min-height:${hasRecord&&value>0?3:0}px"></i></div><span>${esc(k.slice(5))}${lang()?'月':''}</span><b>${hasRecord?esc(value):'—'}</b></div>`
 }).join('')}</div>`;
}
function priorMonth(period){const list=buildMonths(),idx=list.indexOf(period);return idx>0?list[idx-1]:null}
function compare(k,period){
 const x=state.modules[k]?.data,p=priorMonth(period);if(!x||!p)return '';
 let v0,v1,valid0=false,valid1=false,label='';
 if(k==='schedule'){valid0=!!x.counts[p];valid1=!!x.counts[period];v0=valid0?Math.round(x.done[p]/x.counts[p]*100):0;v1=valid1?Math.round(x.done[period]/x.counts[period]*100):0;label=T('完成率','completion rate')}
 else if(k==='habit'){valid0=!!x.occ[p];valid1=!!x.occ[period];v0=x.counts[p];v1=x.counts[period];label=T('记录次数','logged counts')}
 else if(k==='spending'&&!x.hasLinks){valid0=!!x.uses[p];valid1=!!x.uses[period];v0=x.uses[p];v1=x.uses[period];label=T('手动记录次数','manual entries')}
 else return '';
 if(!valid0||!valid1)return `<p class="li-compare">${T('与上月比较','Compared with last month')}: ${T('记录不足','Not enough records')}</p>`;
 const diff=v1-v0,sign=diff>0?'+':'';
 return `<p class="li-compare">${T('较上月','vs last month')} · ${esc(label)}: <b>${sign}${diff}${k==='schedule'?T(' 个百分点',' pp'):''}</b></p>`;
}
function card(k){const x=state.modules[k],m=metric(k,state.period);return `<section class="li-module-card"><div class="li-card-top"><span class="li-icon ${k}">${({schedule:'▦',habit:'✓',spending:'◈',fund:'♡',goals:'◎'})[k]}</span><div><small>LIFE INSIGHTS</small><h3>${esc(label(k))}</h3></div></div>${!x?`<p class="li-pending">${T('读取中…','Loading…')}</p>`:!x.ok?`<p class="li-warning">${x.error==='LIMIT'?T('记录较多或读取不完整，已停止统计。','Data incomplete: analysis paused.'):T('无法核实云端数据，暂不显示统计。','Cloud data could not be verified.')}</p>`:`<div class="li-kpi"><strong>${esc(m.big)}</strong><small>${esc(m.sub)}</small></div>${chart(m.series,k==='schedule'?x.data.counts:k==='habit'?x.data.occ:k==='spending'?x.data.uses:k==='goals'?x.data.trend:null,k)}${compare(k,state.period)}${k==='spending'&&x.data.hasLinks?`<p class="li-warning">${T('此处不将手动记录与真实交易混算，避免重复记账。','Linked and manual expenses are not combined here to prevent double counting.')}</p>`:''}${k==='fund'?`<div class="li-money">${Object.entries(x.data.byCurrency).map(([code,value])=>`<div><b>${esc(code)}</b><span>${esc(money(value.held/100,code))}</span></div>`).join('')||T('尚无非私人基金','No non-private funds')}</div>${x.data.progress===null?'':`<p class="li-secondary">${T('已设置目标基金的平均进度','Average progress of funds with targets')}: <b>${x.data.progress}%</b></p>`}<p class="li-quiet">${T('仅统计现有资产的用途预留；不代表新存款，也不增加资产。','Earmarks of existing assets only. No additional deposits or assets.')}</p>`:''}${k==='goals'?`<p class="li-secondary">${T('已完成步骤','Completed steps')}: ${x.data.completed}/${x.data.steps} · ${T('进行中目标','Active goals')}: ${x.data.active}</p>`:''}`}</section>`}
function render(){const h=$(ID);if(!h||!active())return;const periodList=buildMonths();if(!periodList.includes(state.period))state.period=periodList.at(-1);h.innerHTML=`<section class="li-shell"><header class="li-hero"><div class="li-eyebrow">LIFE PLANNER / LIFE INSIGHTS</div><h1>${T('看见生活中的小小成长','Every small step matters')}</h1><p>${T('把平凡日子里的进步，变成温柔清晰的回顾。','A calm, thoughtful look at your everyday progress.')}</p><div class="li-hero-decoration" aria-hidden="true">✿</div></header><div class="li-privacy"><span>♧</span><div><strong>${T('隐私优先 · 只分析普通记录','Privacy first · non-private records only')}</strong><p>${T('私人日程、习惯、消费、基金和目标均不纳入本页。这里不读取财务账本，不发送到 AI，也不会写入 Supabase。','Private schedules, habits, spending, funds and goals are excluded. No financial ledger reading, AI sharing or database writes.')}</p></div></div><div class="li-controls"><div><span class="li-overline">${T('月度生活回顾','MONTHLY REFLECTION')}</span><h2>${T('最近六个月','Last six months')}</h2></div><div class="li-actions"><button type="button" class="li-month-arrow" data-li-action="previous" aria-label="${T('上个月','Previous month')}" ${state.period===periodList[0]?'disabled':''}>‹</button><label>${T('选择月份','Choose month')}<select id="liMonthV52">${periodList.map(m=>`<option value="${m}" ${state.period===m?'selected':''}>${esc(m)}</option>`).join('')}</select></label><button type="button" class="li-month-arrow" data-li-action="next" aria-label="${T('下个月','Next month')}" ${state.period===periodList.at(-1)?'disabled':''}>›</button><button type="button" data-li-action="refresh" ${state.loading?'disabled':''}>↻ ${T('刷新','Refresh')}</button></div></div>${state.error?`<div class="li-warning">${T('登录状态需要重新确认。','Please verify your session.')}</div>`:''}<div class="li-grid">${Object.keys(tasks).map(card).join('')}</div><div class="li-final-note"><span>☼</span><p><strong>${T('重要说明','A gentle reminder')}</strong> ${T('未记录不等于零消费；未花掉的预算不是已存款；基金预留也不会增加总资产。统计不完整时不会猜测。','Missing logs are not zero spending. Unused budgets are not deposits, earmarks are not new assets, and incomplete data is never guessed.')}</p></div></section>`}
function click(ev){
 const b=ev.target.closest('[data-li-action]');if(!b||!$(ID)?.contains(b))return;
 if(b.dataset.liAction==='refresh'){load();return}
 if(b.dataset.liAction==='previous'||b.dataset.liAction==='next'){
  const list=buildMonths(),at=list.indexOf(state.period),d=b.dataset.liAction==='previous'?-1:1;
  if(at>=0&&list[at+d]){state.period=list[at+d];render()}
 }
}
function change(ev){if(ev.target?.id==='liMonthV52'&&buildMonths().includes(ev.target.value)){state.period=ev.target.value;render()}}
function mount(){if(!$(ID))return;const u=user(),e=epoch();if(u!==state.owner||e!==state.epoch){forget();state.owner=u;state.epoch=e}if(!state.loading&&!state.loaded)load();else render()}
function unmount(){forget()}
window.MMHLifeInsightsV52={mount,unmount};
let attached=false;function attach(){if(attached)return;attached=true;document.addEventListener('click',click);document.addEventListener('change',change);window.addEventListener('mmhvault:config-owner-changed',forget);window.addEventListener('visibilitychange',()=>{if(document.hidden)forget()});for(const n of ['mmhvault-language-change','languagechange'])window.addEventListener(n,()=>{if(active())render()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
})();
