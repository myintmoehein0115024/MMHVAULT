/* MMHVAULT Life Planner — Phase 1 / My Schedule. Independent of all financial calculations.
   Cloud-only. No demo seed records or insecure offline persistence.
   Requires the separately approved, deployed RLS-protected Phase 1 migration. */
(()=>{
  'use strict';
  if(window.__mmhLifePlannerV1) return;
  window.__mmhLifePlannerV1=true;
  const ROOT='mmhLifePlannerV1', PAGE='life-planner', LIMIT=500, MAX_ROWS=10000;
  const $=(id)=>document.getElementById(id);
  const isZh=()=>{try{return localStorage.getItem('mmhvault_language_v3363')==='zh';}catch(_){return false;}};
  const L=(zh,en)=>isZh()?zh:en;
  const safe=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const jsDate=(s)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s)))return null;const [y,m,d]=s.split('-').map(Number);const a=new Date(y,m-1,d);return a.getFullYear()===y&&a.getMonth()===m-1&&a.getDate()===d?a:null;};
  const fmtDate=(d)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const shift=(s,n)=>{const x=jsDate(s);if(!x)return s;x.setDate(x.getDate()+n);return fmtDate(x);};
  const dayDiff=(a,b)=>{const x=jsDate(a),y=jsDate(b);return x&&y?Math.round((Date.UTC(y.getFullYear(),y.getMonth(),y.getDate())-Date.UTC(x.getFullYear(),x.getMonth(),x.getDate()))/86400000):0;};
  const today=()=>fmtDate(new Date());
  const monthDays=(y,m)=>new Date(y,m,0).getDate();
  const key=()=>{if(crypto?.randomUUID)return crypto.randomUUID();const buf=new Uint8Array(16);crypto.getRandomValues(buf);buf[6]=(buf[6]&15)|64;buf[8]=(buf[8]&63)|128;const s=[...buf].map(x=>x.toString(16).padStart(2,'0')).join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;};
  const tz=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}catch(_){return 'UTC';}};
  const locale=()=>isZh()?'zh-CN':'en-US';
  const dateLabel=(s,opt={month:'short',day:'numeric'})=>{const d=jsDate(s);return d?d.toLocaleDateString(locale(),opt):'—';};
  const at=(s)=>{const d=jsDate(s);return d?d.getDay():0;};
  const ownerNow=()=>{try{return typeof currentSessionUser!=='undefined'&&currentSessionUser?.id||'';}catch(_){return '';}};
  const epochNow=()=>Number(window.__mmhSessionEpochV1239)||0;
  const cloud=()=>{try{return typeof db!=='undefined'&&db?.from?db:null;}catch(_){return null;}};
  const active=()=>!!$(PAGE)?.classList.contains('active');
  const CHOICES={work:['工作','Work'],personal:['个人','Personal'],study:['学习','Study'],health:['健康','Health'],important:['重要','Important']};
  const state={owner:'',epoch:0,events:[],exceptions:[],loaded:false,loading:false,saving:false,view:'month',section:'home',focus:today(),selected:today(),privateVisible:false,dialog:null,request:0,ready:false,error:'',toast:''};

  function sessionValid(owner,epoch){return owner&&owner===ownerNow()&&epoch===epochNow();}
  function owns(record){return record&&record.user_id===state.owner;}
  function reset(){state.request++;state.events=[];state.exceptions=[];state.loaded=false;state.loading=false;state.saving=false;state.error='';state.toast='';state.privateVisible=false;state.section='home';state.dialog=null;state.owner=ownerNow();state.epoch=epochNow();closeDialog();render();}
  function parseMissing(error){const code=String(error?.code||'');const msg=String(error?.message||'');return /42P01|PGRST205|PGRST116/i.test(code)||/could not find the table|does not exist|schema cache/i.test(msg);}
  function notice(message){state.toast=message;const el=$('lpNoticeV1');if(el){el.textContent=message;el.hidden=false;} }
  async function guardedUser(){const c=cloud(),owner=ownerNow();if(!c||!owner)throw Error('LOGIN');const r=await c.auth.getUser();if(r.error||r.data?.user?.id!==owner)throw Error('LOGIN');if(!sessionValid(owner,epochNow()))throw Error('CHANGED');return owner;}
  async function paginate(table,owner,orderCol){const all=[];for(let n=0;n<MAX_ROWS;n+=LIMIT){
    const r=await cloud().from(table).select('*').eq('user_id',owner).order(orderCol,{ascending:false}).range(n,n+LIMIT-1);
    if(r.error)throw r.error;const rows=r.data||[];all.push(...rows);if(rows.length<LIMIT)return all;
  }throw Error('TOO_MANY');}
  async function load(){
    if(!state.ready||!active()||state.loading)return;
    const owner=ownerNow(),epoch=epochNow();if(!owner){reset();return;}
    const token=++state.request;state.owner=owner;state.epoch=epoch;state.loading=true;state.error='';render();
    try{
      await guardedUser();
      const events=await paginate('life_schedule_events',owner,'starts_on');
      if(!sessionValid(owner,epoch)||token!==state.request)return;
      const exceptions=await paginate('life_schedule_exceptions',owner,'occurrence_date');
      if(!sessionValid(owner,epoch)||token!==state.request)return;
      state.events=events.filter(e=>e.user_id===owner);
      state.exceptions=exceptions.filter(e=>e.user_id===owner);
      state.loaded=true;
    }catch(err){
      if(!sessionValid(owner,epoch)||token!==state.request)return;
      state.loaded=false;state.events=[];state.exceptions=[];
      state.error=parseMissing(err)?'MIGRATION':err.message==='LOGIN'?'LOGIN':err.message==='TOO_MANY'?'LIMIT':'CONNECT';
    }finally{if(token===state.request&&sessionValid(owner,epoch)){state.loading=false;render();}}
  }
  function monthRange(focus){const d=jsDate(focus)||new Date();const start=new Date(d.getFullYear(),d.getMonth(),1);const offset=(start.getDay()+6)%7;start.setDate(start.getDate()-offset);return {start:fmtDate(start),end:shift(fmtDate(start),41)};}
  function visibleRange(){if(state.view==='day')return {start:state.focus,end:state.focus};if(state.view==='week'){const x=at(state.focus);const begin=shift(state.focus,-((x+6)%7));return {start:begin,end:shift(begin,6)};}return monthRange(state.focus);}
  function recurs(e,date){
    if(date<e.starts_on||e.repeat_until&&date>e.repeat_until)return false;
    const diff=dayDiff(e.starts_on,date);if(diff<0)return false;
    const freq=e.repeat_frequency||'none';const interval=Math.max(1,Number(e.repeat_interval)||1);
    if(freq==='none')return date===e.starts_on;
    if(freq==='daily')return diff%interval===0;
    if(freq==='weekly')return diff%(7*interval)===0;
    if(freq==='monthly'){
      const a=jsDate(e.starts_on),b=jsDate(date);if(!a||!b||a.getDate()!==b.getDate())return false;
      return ((b.getFullYear()-a.getFullYear())*12+b.getMonth()-a.getMonth())%interval===0;
    }
    return false;
  }
  function buildOccurrence(e,date,ex){
    const duration=Math.max(0,dayDiff(e.starts_on,e.ends_on));
    const original={event:e,originalDate:date,date,starts_on:date,ends_on:shift(date,duration),start_time:e.start_time,end_time:e.end_time,all_day:e.all_day,title:e.title,notes:e.notes||'',status:e.status||'scheduled',is_private:e.is_private,category:e.category,timezone:e.timezone,exception:null};
    if(!ex)return original;
    return {...original,date:ex.starts_on,starts_on:ex.starts_on,ends_on:ex.ends_on,start_time:ex.start_time,end_time:ex.end_time,all_day:ex.all_day,title:ex.title,notes:ex.notes||'',status:ex.status,is_private:ex.is_private,category:ex.category,exception:ex};
  }
  function occurrences(start,end){
    const result=[];const exceptionMap=new Map(state.exceptions.map(x=>[x.event_id+'|'+x.occurrence_date,x]));
    const eventsById=new Map(state.events.map(x=>[x.id,x]));
    // Also include moved occurrences whose original anchor date is outside the visible range.
    const handled=new Set();
    const add=(e,date,ex)=>{const o=buildOccurrence(e,date,ex);if(o.starts_on<=end&&o.ends_on>=start){result.push(o);if(ex)handled.add(ex.id);}};
    for(const e of state.events){
      if(e.user_id!==state.owner)continue;
      const span=Math.min(31,Math.max(0,dayDiff(e.starts_on,e.ends_on)));
      for(let d=shift(start,-span);d<=end;d=shift(d,1)){
        if(recurs(e,d))add(e,d,exceptionMap.get(e.id+'|'+d));
      }
    }
    for(const ex of state.exceptions){
      if(handled.has(ex.id)||!eventsById.has(ex.event_id))continue;
      const e=eventsById.get(ex.event_id);
      if(e.user_id===state.owner&&recurs(e,ex.occurrence_date))add(e,ex.occurrence_date,ex);
    }
    result.sort((a,b)=>a.starts_on.localeCompare(b.starts_on)||String(a.start_time||'').localeCompare(String(b.start_time||''))||a.title.localeCompare(b.title));
    return result;
  }
  function displayTitle(o){return o.is_private&&!state.privateVisible?L('私人日程','Private event'):o.title;}
  function timeText(o){return o.all_day?L('全天','All day'):(String(o.start_time||'').slice(0,5)+' – '+String(o.end_time||'').slice(0,5));}
  function humanStatus(s){return s==='completed'?L('已完成','Completed'):s==='cancelled'?L('已取消','Cancelled'):L('待进行','Scheduled');}
  function kindName(s){return CHOICES[s]?.[isZh()?0:1]||L('个人','Personal');}
  function textButton(label,act,extra=''){return `<button class="lp-btn" type="button" data-lp-act="${act}" ${extra}>${safe(label)}</button>`;}
  function renderEvent(o){
    const privateClass=o.is_private?' lp-private':'';
    const actions=[textButton(L('编辑','Edit'),'edit',`data-id="${o.event.id}" data-date="${o.originalDate}"`),
      textButton(o.status==='completed'?L('恢复','Reopen'):L('完成','Done'),'toggleDone',`data-id="${o.event.id}" data-date="${o.originalDate}"`),
      textButton(L('删除','Delete'),'delete',`data-id="${o.event.id}" data-date="${o.originalDate}"`)];
    return `<article class="lp-event${privateClass} lp-${safe(o.status)}"><div class="lp-event-details"><div class="lp-event-title"><span class="lp-event-dot lp-cat-${safe(o.category)}" aria-hidden="true"></span><strong>${safe(displayTitle(o))}</strong><span class="lp-status">${humanStatus(o.status)}</span></div><p>${safe(dateLabel(o.starts_on))}${o.ends_on!==o.starts_on?' → '+safe(dateLabel(o.ends_on)):''} · ${safe(timeText(o))}${o.event.repeat_frequency!=='none'?' · '+L('重复','Repeats'):''}</p></div><div class="lp-event-actions">${actions.join('')}</div></article>`;
  }
  function renderCalendar(rows,range){
    const weekDay=[L('周一','Mon'),L('周二','Tue'),L('周三','Wed'),L('周四','Thu'),L('周五','Fri'),L('周六','Sat'),L('周日','Sun')];
    const byDay=new Map();for(let date=range.start;date<=range.end;date=shift(date,1)){byDay.set(date,[]);}
    for(const o of rows){for(let d=o.starts_on;d<=o.ends_on;d=shift(d,1)){if(byDay.has(d))byDay.get(d).push(o);}}
    const days=[...byDay];const isMonth=state.view==='month';
    return `<div class="lp-calendar ${isMonth?'lp-month':'lp-short'}" role="group" aria-label="${L('日历','Calendar')}"><div class="lp-weekdays">${(state.view==='day'?[weekDay[(at(state.focus)+6)%7]]:weekDay).map(x=>`<span>${x}</span>`).join('')}</div><div class="lp-days">${days.map(([d,entries])=>{
      const outside=isMonth&&d.slice(0,7)!==state.focus.slice(0,7),selected=d===state.selected,now=d===today();
      return `<button type="button" class="lp-day ${outside?'lp-outside':''} ${selected?'lp-selected':''} ${now?'lp-today':''}" data-lp-act="selectDay" data-date="${d}" aria-label="${safe(dateLabel(d,{year:'numeric',month:'long',day:'numeric'}))} ${entries.length} ${L('项日程','events')}" aria-pressed="${selected}"><span class="lp-day-num">${Number(d.slice(-2))}</span><span class="lp-dots">${entries.slice(0,3).map(o=>`<i class="lp-event-dot lp-cat-${safe(o.category)}" aria-hidden="true"></i>`).join('')}${entries.length>3?'<b>+</b>':''}</span></button>`;
    }).join('')}</div></div>`;
  }
  function render(){
    if(!state.ready)return;const host=$(ROOT);if(!host)return;
    // Two-level Life Planner: the hub and each individual module never share a screen.
    // Only My Schedule has a live editor in Phase 1. Other modules are safe placeholders.
    const modules=[
      {id:'schedule',symbol:'▦',zh:'我的日程',en:'My Schedule',descZh:'日历、任务与重复日程',descEn:'Calendar, tasks and recurring events',available:true},
      {id:'habit',symbol:'◈',zh:'习惯管理',en:'Habit Control',descZh:'私人习惯与频率目标',descEn:'Private habits and frequency goals'},
      {id:'spending',symbol:'◉',zh:'消费控制',en:'Spending Control',descZh:'自由支配预算与次数管理',descEn:'Discretionary spending and budgets'},
      {id:'fund',symbol:'◇',zh:'愿望储蓄',en:'Wish Fund',descZh:'自由基金与指定愿望',descEn:'Free funds and savings wishes'},
      {id:'goals',symbol:'◎',zh:'长期目标',en:'My Goals',descZh:'目标、里程碑和成长进度',descEn:'Goals, milestones and progress'},
      {id:'insights',symbol:'▥',zh:'生活分析',en:'Life Insights',descZh:'日程与生活趋势分析',descEn:'Schedule and life trends'}
    ];
    if(state.section==='home'){
      host.innerHTML=`<div class="lp-shell lp-hub-shell">
        <header class="lp-hero"><div><div class="lp-eyebrow">MMHVAULT / LIFE PLANNER</div><h1>${L('生活规划','Life Planner')}</h1><p>${L('生活与财务，分开记录、安心规划。请选择要进入的模块。','Organize your life separately from finances. Choose a module to get started.')}</p></div><div class="lp-hero-actions">${textButton(L('返回 Dashboard','Back to Dashboard'),'dashboard')}</div></header>
        <div class="lp-hub-head"><div><span class="lp-eyebrow">YOUR WORKSPACE</span><h2>${L('我的生活管理','My Life Management')}</h2><p>${L('选择一个模块进入独立页面；其余功能将按阶段开放。','Open a module in its own workspace. Others will arrive in later phases.')}</p></div></div>
        <nav class="lp-hub-grid" aria-label="${L('生活规划模块','Life Planner modules')}">
          ${modules.map(item=>`<button type="button" data-lp-act="openModule" data-module="${item.id}" class="lp-hub-card ${item.available?'lp-hub-available':'lp-hub-future'}"><span class="lp-hub-card-icon" aria-hidden="true">${item.symbol}</span><span class="lp-hub-card-copy"><strong>${safe(L(item.zh,item.en))}</strong><small>${safe(L(item.descZh,item.descEn))}</small></span><span class="lp-hub-card-status">${item.available?L('进入 ›','Open ›'):L('即将推出','Coming later')}</span></button>`).join('')}
        </nav><p class="lp-hub-footnote">${L('私人习惯及消费明细不会在此首页展示。','Private habits and spending details are not displayed on this overview.')}</p>
      </div><div id="lpOverlayV1" class="lp-overlay" hidden></div>`;
      return;
    }
    if(state.section!=='schedule'){
      const item=modules.find(x=>x.id===state.section)||modules[0];
      host.innerHTML=`<div class="lp-shell lp-module-placeholder">
        <div class="lp-subnav">${textButton('← '+L('返回 Life Planner','Back to Life Planner'),'home')}</div>
        <section class="lp-coming-panel"><div class="lp-coming-icon" aria-hidden="true">${item.symbol}</div><span class="lp-eyebrow">LIFE PLANNER / ${safe(L('后续阶段','FUTURE PHASE'))}</span><h1>${safe(L(item.zh,item.en))}</h1><p>${safe(L(item.descZh,item.descEn))}</p><div class="lp-coming-badge">${L('功能开发中 · 尚未启用','Coming later · Not enabled yet')}</div>${textButton(L('返回全部模块','Back to all modules'),'home')}</section>
      </div><div id="lpOverlayV1" class="lp-overlay" hidden></div>`;
      return;
    }
    const m=jsDate(state.focus)||new Date();const range=visibleRange();const rows=state.loaded?occurrences(range.start,range.end):[];
    const dayRows=state.loaded?occurrences(state.selected,state.selected):[];
    const weekStart=shift(today(),-((at(today())+6)%7));const thisWeek=state.loaded?occurrences(weekStart,shift(weekStart,6)).filter(o=>o.status==='completed'):[];
    const upcoming=state.loaded?occurrences(today(),shift(today(),30)).filter(o=>o.status==='scheduled').slice(0,5):[];
    const focusLabel=state.view==='month'?m.toLocaleDateString(locale(),{month:'long',year:'numeric'}):state.view==='week'?`${dateLabel(range.start)} – ${dateLabel(range.end)}`:dateLabel(state.focus,{year:'numeric',month:'long',day:'numeric'});
    const status=state.error==='MIGRATION'?L('新日程数据库尚未部署，或表不在可访问的 schema 中。请先审核独立 SQL 文件，再由你手动执行及验证 RLS。不会在本地临时保存日程。','Schedule database is not deployed or not accessible. Review and run the separate migration and verify RLS first. No insecure local fallback is used.'):
      state.error==='LOGIN'?L('请重新登录以访问日程。','Sign in again to access your schedule.'):
      state.error==='LIMIT'?L('记录数量超出当前版本上限，请导出或分批处理后重试。','Too many records for this version. Reduce or export records before retrying.'):
      state.error?L('云端日程读取失败。请检查网络、权限和 SQL 部署状态，不能在未核实权限时写入。','Could not load cloud schedule. Check network, permissions and SQL deployment; writes are disabled.'):'';
    host.innerHTML=`<div class="lp-shell lp-schedule-shell">
      <div class="lp-subnav">${textButton('← '+L('返回 Life Planner','Back to Life Planner'),'home')}<span>Life Planner <span aria-hidden="true">›</span> ${L('我的日程','My Schedule')}</span></div>
      <header class="lp-hero lp-schedule-hero"><div><div class="lp-eyebrow">LIFE PLANNER / MY SCHEDULE</div><h1>${L('我的日程','My Schedule')}</h1><p>${L('按天、周、月管理日程；独立于财务数据。','Plan your days, weeks and months separately from financial records.')}</p></div></header>
      <div class="lp-summary"><div class="lp-summary-card"><small>${L('今天','Today')}</small><b>${state.loaded?occurrences(today(),today()).filter(x=>x.status!=='cancelled').length:'—'}</b><span>${L('项日程','events')}</span></div><div class="lp-summary-card"><small>${L('本周已完成','Completed this week')}</small><b>${state.loaded?thisWeek.length:'—'}</b><span>${L('项日程','events')}</span></div><div class="lp-summary-card"><small>${L('数据存储','Storage')}</small><b>${state.loading?L('读取中','Loading'):state.error?L('未连接','Unavailable'):state.loaded?L('云端','Cloud'):L('待连接','Waiting')}</b><span>${L('独立于财务账本','No finance writes')}</span></div></div>
      <div id="lpNoticeV1" class="lp-notice" role="status" aria-live="polite" ${state.toast?'':'hidden'}>${safe(state.toast)}</div>
      ${state.loading?`<p class="lp-alert" role="status">${L('正在安全加载私人日程…','Loading your schedule securely…')}</p>`:''}
      ${status?`<div class="lp-alert lp-alert-error" role="alert"><p>${safe(status)}</p>${textButton(L('重试连接','Retry'),'refresh')}</div>`:''}
      <div class="lp-workspace"><section class="lp-panel lp-main"><div class="lp-panel-top"><div><span class="lp-eyebrow">MY SCHEDULE</span><h2>${L('我的日程','My Schedule')}</h2></div><div class="lp-panel-actions">${textButton(L('今天','Today'),'today')}${textButton(L('刷新','Refresh'),'refresh')}<button class="lp-btn lp-primary" data-lp-act="add" type="button" ${!state.loaded?'disabled':''}>+ ${L('新建日程','New event')}</button></div></div>
      <div class="lp-calendar-header"><div class="lp-range"><button type="button" data-lp-act="prev" aria-label="${L('上一时间段','Previous period')}">‹</button><strong>${safe(focusLabel)}</strong><button type="button" data-lp-act="next" aria-label="${L('下一时间段','Next period')}">›</button></div><div class="lp-view-toggle">${['day','week','month'].map(v=>`<button type="button" class="${state.view===v?'is-active':''}" aria-pressed="${state.view===v}" data-lp-act="view" data-view="${v}">${v==='day'?L('日','Day'):v==='week'?L('周','Week'):L('月','Month')}</button>`).join('')}</div></div>
      ${renderCalendar(rows,range)}
      <div class="lp-list-head"><h3>${safe(dateLabel(state.selected,{weekday:'long',year:'numeric',month:'long',day:'numeric'}))}</h3><div>${textButton(state.privateVisible?L('隐藏私人名称','Hide private names'):L('显示私人名称','Show private names'),'private')}${textButton(L('新建','Add'),'add',!state.loaded?'disabled':'')}</div></div>
      ${state.loaded?(dayRows.length?`<div class="lp-event-list">${dayRows.map(renderEvent).join('')}</div>`:`<div class="lp-empty">${L('当天没有日程。','No events on this day.')}</div>`):`<div class="lp-empty">${L('连接经过验证的私有日程数据库后可查看与添加。','Connect a verified private schedule database to view and add events.')}</div>`}</section>
      <aside class="lp-panel lp-side"><h2>${L('未来 30 天','Next 30 days')}</h2><p class="lp-side-sub">${L('仅在此页面显示，私人名称默认隐藏。','Only shown here. Private names are hidden by default.')}</p>${state.loaded?(upcoming.length?`<div class="lp-upcoming">${upcoming.map(o=>`<button type="button" data-lp-act="jump" data-date="${o.starts_on}"><small>${safe(dateLabel(o.starts_on))}</small><b>${safe(displayTitle(o))}</b><span>${safe(timeText(o))}</span></button>`).join('')}</div>`:`<p class="lp-empty">${L('暂无近期日程','No upcoming events')}</p>`):`<p class="lp-empty">${L('暂无可用的云端日程数据','Cloud schedule unavailable')}</p>`}
      <div class="lp-private-note">◈ ${L('私人事件不会加入普通 Dashboard、财务分析、AI Chat 或推送通知。界面隐藏不等同于数据库加密，请验证 RLS。','Private events are not sent to the regular Dashboard, financial insights, AI Chat or push. UI hiding is not encryption: verify RLS.')}</div></aside></div>
    </div><div id="lpOverlayV1" class="lp-overlay" hidden></div>`;
    if(state.dialog)drawDialog();
  }
  function closeDialog(){state.dialog=null;const el=$('lpOverlayV1');if(el){el.hidden=true;el.replaceChildren();}}
  function drawDialog(){
    const o=state.dialog,root=$('lpOverlayV1');if(!o||!root)return;
    root.hidden=false;
    if(o.type==='confirm'){
      root.innerHTML=`<div class="lp-modal" role="dialog" aria-modal="true" aria-labelledby="lpModalTitleV1"><h2 id="lpModalTitleV1">${safe(o.title)}</h2><p>${safe(o.description)}</p><div class="lp-modal-actions">${textButton(L('返回','Back'),'closeDialog')}<button class="lp-btn lp-danger" type="button" data-lp-act="confirmDelete">${L('确认','Confirm')}</button></div></div>`;
    }else{
      const e=o.occurrence||null,base=e?.event;
      const src=o.type==='edit'&&o.scope!=='single'&&base?{...e,...base}:e;
      const field=(name,value)=>safe(String(value??''));
      const scope=o.scope||'series',one=scope==='single';
      const item={title:src?.title||'',notes:src?.notes||'',starts_on:src?.starts_on||state.selected,ends_on:src?.ends_on||state.selected,start_time:String(src?.start_time||'09:00').slice(0,5),end_time:String(src?.end_time||'10:00').slice(0,5),all_day:src?.all_day??false,category:src?.category||'personal',is_private:src?.is_private??false,status:src?.status||'scheduled',repeat_frequency:base?.repeat_frequency||'none',repeat_interval:base?.repeat_interval||1,repeat_until:base?.repeat_until||''};
      root.innerHTML=`<div class="lp-modal" role="dialog" aria-modal="true" aria-labelledby="lpModalTitleV1"><div class="lp-modal-heading"><h2 id="lpModalTitleV1">${o.type==='add'?L('新建日程','New event'):one?L('修改本次日程','Edit this occurrence'):L('编辑日程','Edit event')}</h2><button class="lp-modal-x" type="button" data-lp-act="closeDialog" aria-label="${L('关闭','Close')}">×</button></div>
        ${base?.repeat_frequency!=='none'&&o.type==='edit'?`<div class="lp-scope"><label><input type="radio" name="lpScopeV1" value="single" ${one?'checked':''}> ${L('仅本次','This occurrence')}</label><label><input type="radio" name="lpScopeV1" value="series" ${one?'':'checked'}> ${L('整个重复系列','Entire series')}</label></div>`:''}
        <form id="lpEventFormV1" novalidate><label>${L('日程名称','Title')}<input required name="title" maxlength="120" autocomplete="off" value="${field('title',item.title)}"></label>
        <div class="lp-form-row"><label>${L('开始日期','Start date')}<input required type="date" name="starts_on" value="${item.starts_on}"></label><label>${L('结束日期','End date')}<input required type="date" name="ends_on" value="${item.ends_on}"></label></div>
        <label class="lp-check"><input type="checkbox" name="all_day" ${item.all_day?'checked':''}>${L('全天事件','All-day event')}</label>
        <div class="lp-form-row" id="lpTimeRowV1"><label>${L('开始时间','Start time')}<input type="time" name="start_time" value="${item.start_time}"></label><label>${L('结束时间','End time')}<input type="time" name="end_time" value="${item.end_time}"></label></div>
        <div class="lp-form-row"><label>${L('分类','Category')}<select name="category">${Object.entries(CHOICES).map(([id,names])=>`<option value="${id}" ${item.category===id?'selected':''}>${safe(names[isZh()?0:1])}</option>`).join('')}</select></label><label>${L('状态','Status')}<select name="status">${['scheduled','completed','cancelled'].map(x=>`<option value="${x}" ${item.status===x?'selected':''}>${humanStatus(x)}</option>`).join('')}</select></label></div>
        <label class="lp-check"><input type="checkbox" name="is_private" ${item.is_private?'checked':''}>${L('私人日程（概览默认隐藏名称）','Private (hide title in overviews)')}</label>
        <div id="lpRepeatFieldsV1" ${one?'hidden':''}><div class="lp-form-row"><label>${L('重复','Repeat')}<select name="repeat_frequency">${[['none',L('不重复','Never')],['daily',L('每天','Daily')],['weekly',L('每周','Weekly')],['monthly',L('每月','Monthly')]].map(([v,n])=>`<option value="${v}" ${item.repeat_frequency===v?'selected':''}>${safe(n)}</option>`).join('')}</select></label><label>${L('间隔（次数）','Every N periods')}<input type="number" name="repeat_interval" min="1" max="52" step="1" value="${item.repeat_interval}"></label></div><label>${L('重复截止（可选）','Repeat until (optional)')}<input type="date" name="repeat_until" value="${item.repeat_until}"></label></div>
        <label>${L('备注','Notes')}<textarea name="notes" maxlength="2000" rows="3">${safe(item.notes)}</textarea></label>
        <p class="lp-modal-hint">${L('时区：','Timezone: ')}${safe(base?.timezone||tz())} · ${L('重复事件按创建时区的本地日期计算。','Recurring dates use the original event timezone.')}</p>
        <p id="lpFormErrorV1" class="lp-form-error" role="alert" hidden></p>
        <div class="lp-modal-actions"><button type="button" class="lp-btn" data-lp-act="closeDialog">${L('取消','Cancel')}</button><button type="submit" class="lp-btn lp-primary" ${state.saving?'disabled':''}>${state.saving?L('保存中','Saving'):L('保存日程','Save event')}</button></div></form></div>`;
      const form=$('lpEventFormV1');form?.addEventListener('submit',saveEvent);
      form?.elements.all_day.addEventListener('change',()=>{$('lpTimeRowV1').hidden=form.elements.all_day.checked;});
      $('lpTimeRowV1').hidden=!!item.all_day;
      root.querySelectorAll('input[name="lpScopeV1"]').forEach(x=>x.addEventListener('change',()=>{if(state.dialog){state.dialog.scope=x.value;drawDialog();}}));
    }
    // Keep focus inside the overlay; Escape closes without discarding saved records.
    root.querySelector('input[name="title"],button')?.focus({preventScroll:true});
  }
  function openEditor(type,id,date,scope='series'){
    if(!state.loaded)return;
    if(type==='add'){state.dialog={type:'add'};drawDialog();return;}
    const e=state.events.find(x=>x.id===id&&owns(x));if(!e)return;
    const original=date||e.starts_on;
    const ex=state.exceptions.find(x=>x.event_id===id&&x.occurrence_date===original);
    const occurrence=buildOccurrence(e,original,ex);
    state.dialog={type:'edit',occurrence,scope:e.repeat_frequency==='none'?'series':scope};drawDialog();
  }
  function getFormValues(form,single=false){
    const els=form.elements;
    const get=n=>String(els.namedItem(n)?.value||'').trim();
    const start=get('starts_on'),end=get('ends_on'),allDay=els.namedItem('all_day').checked;
    const from=get('start_time'),to=get('end_time');
    const title=get('title'),notes=get('notes');
    const frequency=single?'none':get('repeat_frequency')||'none';const interval=single?1:Number(get('repeat_interval')||1);
    const until=single?null:get('repeat_until')||null;
    if(!title||title.length>120)throw Error(L('名称不能为空且最多 120 个字符。','Title is required (maximum 120 characters).'));
    if(!jsDate(start)||!jsDate(end)||end<start||dayDiff(start,end)>31)throw Error(L('结束日期不能早于开始日期，跨度最多为 31 天。','End date must not precede start date; maximum span is 31 days.'));
    if(!allDay&&(!/^\d\d:\d\d$/.test(from)||!/^\d\d:\d\d$/.test(to)||start===end&&to<=from))throw Error(L('请选择有效的开始与结束时间。','Enter valid start and end times.'));
    if(!['none','daily','weekly','monthly'].includes(frequency)||!Number.isInteger(interval)||interval<1||interval>52)throw Error(L('重复规则无效。','Invalid recurrence rule.'));
    if(frequency!=='none'&&until&&(!jsDate(until)||until<start))throw Error(L('重复截止日期必须不早于开始日期。','Repeat-until date must not precede the start date.'));
    const category=get('category'),status=get('status');if(!CHOICES[category]||!['scheduled','completed','cancelled'].includes(status))throw Error(L('分类或状态不正确。','Invalid category or status.'));
    return {title,notes,starts_on:start,ends_on:end,all_day:allDay,start_time:allDay?null:from,end_time:allDay?null:to,category,status,is_private:els.namedItem('is_private').checked,repeat_frequency:frequency,repeat_interval:frequency==='none'?1:interval,repeat_until:frequency==='none'?null:until};
  }
  async function recoverRetry(table,owner,requestId,error){
    if(String(error?.code||'')!=='23505'||!requestId)return null;
    const r=await cloud().from(table).select('id').eq('user_id',owner).eq('client_request_id',requestId);
    if(r.error||!r.data?.length)return null;
    return {data:r.data,error:null};
  }
  async function saveEvent(ev){
    ev.preventDefault();if(state.saving||!state.loaded||!state.dialog)return;
    const snapshot=state.dialog,form=ev.currentTarget;const err=$('lpFormErrorV1');
    let values;try{values=getFormValues(form,snapshot.scope==='single');}catch(error){if(err){err.textContent=error.message;err.hidden=false;}return;}
    const owner=state.owner,epoch=state.epoch;
    if(snapshot.scope==='single'){
      delete values.repeat_frequency;delete values.repeat_interval;delete values.repeat_until;
    }
    if(snapshot.type==='edit'&&snapshot.scope!=='single'&&snapshot.occurrence.event.repeat_frequency!=='none'){
      const base=snapshot.occurrence.event;
      if(state.exceptions.some(x=>x.event_id===base.id)&&
        (values.starts_on!==base.starts_on||values.ends_on!==base.ends_on||values.repeat_frequency!==base.repeat_frequency||values.repeat_interval!==base.repeat_interval||values.repeat_until!==base.repeat_until)){
        if(err){err.hidden=false;err.textContent=L('本系列已有单次修改。请先删除并重建系列，或只修改名称、备注等信息，以免改变历史发生日期。','This series has individual overrides. To protect their dates, keep the start/end and repeat rules unchanged or create a new series.');}return;
      }
    }
    state.saving=true;const requestId=snapshot.clientRequestId||(snapshot.clientRequestId=key());const button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;
    try{
      await guardedUser();if(!sessionValid(owner,epoch))return;
      let result;
      if(snapshot.type==='add'){
        result=await cloud().from('life_schedule_events').insert({...values,user_id:owner,timezone:tz(),client_request_id:requestId}).select('id').single();
        if(result.error)result=await recoverRetry('life_schedule_events',owner,requestId,result.error)||result;
      }else if(snapshot.scope==='single'){
        const item=snapshot.occurrence,base=item.event,ex=item.exception;
        const payload={...values,event_id:base.id,occurrence_date:item.originalDate,user_id:owner};
        if(ex){result=await cloud().from('life_schedule_exceptions').update({...payload,version:Number(ex.version)+1,updated_at:new Date().toISOString()}).eq('id',ex.id).eq('user_id',owner).eq('version',ex.version).select('id');}
        else {result=await cloud().from('life_schedule_exceptions').insert({...payload,client_request_id:requestId}).select('id');
          if(result.error)result=await recoverRetry('life_schedule_exceptions',owner,requestId,result.error)||result;}
      }else{
        const e=snapshot.occurrence.event;
        result=await cloud().from('life_schedule_events').update({...values,version:Number(e.version)+1,updated_at:new Date().toISOString()}).eq('id',e.id).eq('user_id',owner).eq('version',e.version).select('id');
      }
      if(!sessionValid(owner,epoch))return;
      if(result.error)throw result.error;
      if(snapshot.type==='edit'&&(!result.data||result.data.length===0)&&Array.isArray(result.data))throw Error('CONFLICT');
      closeDialog();state.toast='';notice(L('日程已保存。','Event saved.'));await load();
    }catch(error){
      if(sessionValid(owner,epoch)){
        const s=error.message==='CONFLICT'?L('此记录已在其他设备被修改，请刷新后重试。','This record changed on another device. Refresh and retry.'):L('保存失败。请检查网络、数据库权限，或刷新后重试。','Could not save. Check connection and permissions, or refresh before retrying.');
        const target=$('lpFormErrorV1');if(target){target.hidden=false;target.textContent=s;}else notice(s);
      }
    }finally{state.saving=false;if(sessionValid(owner,epoch)){const b=$('lpEventFormV1 button[type="submit"]');if(b)b.disabled=false;}}
  }
  function askDelete(id,date){
    const e=state.events.find(x=>x.id===id&&owns(x));if(!e)return;
    const repeated=e.repeat_frequency!=='none';const ex=state.exceptions.find(x=>x.event_id===id&&x.occurrence_date===date);
    state.dialog={type:'confirm',id,date,repeated,ex,title:L('删除日程','Delete event'),description:repeated?L('只取消当前日期的这一项日程，还是永久删除整个重复系列？选择下方操作前可返回。','Cancel only this occurrence or permanently delete the entire recurring series?'):L('确认永久删除此日程？','Permanently delete this event?')};drawDialog();
    if(repeated){const bar=$('lpOverlayV1')?.querySelector('.lp-modal-actions');if(bar){const btn=document.createElement('button');btn.className='lp-btn';btn.type='button';btn.textContent=L('仅取消本次','Cancel this occurrence');btn.dataset.lpAct='cancelOccurrence';bar.insertBefore(btn,bar.lastElementChild);bar.lastElementChild.textContent=L('删除整个系列','Delete series');}}
  }
  async function mutateOccurrence(id,date,desired){
    const e=state.events.find(x=>x.id===id&&owns(x));if(!e||!state.loaded)return;
    const ex=state.exceptions.find(x=>x.event_id===id&&x.occurrence_date===date);
    const item=buildOccurrence(e,date,ex);const owner=state.owner,epoch=state.epoch;
    if(state.saving)return;state.saving=true;
    try{
      await guardedUser();if(!sessionValid(owner,epoch))return;
      let r;
      if(e.repeat_frequency==='none'){
        r=await cloud().from('life_schedule_events').update({status:desired,version:Number(e.version)+1,updated_at:new Date().toISOString()}).eq('user_id',owner).eq('id',id).eq('version',e.version).select('id');
      }else if(ex){
        r=await cloud().from('life_schedule_exceptions').update({status:desired,version:Number(ex.version)+1,updated_at:new Date().toISOString()}).eq('user_id',owner).eq('id',ex.id).eq('version',ex.version).select('id');
      }else{
        const data={title:item.title,notes:item.notes,starts_on:item.starts_on,ends_on:item.ends_on,start_time:item.start_time,end_time:item.end_time,all_day:item.all_day,category:item.category,is_private:item.is_private,status:desired,event_id:id,occurrence_date:date,user_id:owner,client_request_id:key()};
        r=await cloud().from('life_schedule_exceptions').insert(data).select('id');
      }
      if(!sessionValid(owner,epoch))return;
      if(r.error)throw r.error;if(!r.data?.length)throw Error('CONFLICT');
      closeDialog();notice(L('已更新日程状态。','Event status updated.'));await load();
    }catch(_){if(sessionValid(owner,epoch))notice(L('操作失败：数据可能已在其他设备更新，请刷新。','Update failed. The event may have changed on another device. Refresh and try again.'));}
    finally{state.saving=false;}
  }
  async function deleteSeries(){const o=state.dialog;if(!o||state.saving)return;const owner=state.owner,epoch=state.epoch;state.saving=true;
    try{await guardedUser();if(!sessionValid(owner,epoch))return;const r=await cloud().from('life_schedule_events').delete().eq('user_id',owner).eq('id',o.id).eq('version',state.events.find(x=>x.id===o.id)?.version||-1).select('id');if(!sessionValid(owner,epoch))return;if(r.error||!r.data?.length)throw Error('DELETE');closeDialog();notice(L('已删除日程。','Event deleted.'));await load();}
    catch(_){if(sessionValid(owner,epoch))notice(L('删除失败，请刷新后重试。','Delete failed. Refresh and retry.'));}
    finally{state.saving=false;}
  }
  function onClick(event){const btn=event.target.closest('[data-lp-act]');if(!btn||!$(ROOT)?.contains(btn))return;const act=btn.dataset.lpAct,id=btn.dataset.id,date=btn.dataset.date;
    if(act==='dashboard'){closeDialog();state.section='home';window.setPage?.('dashboard');return;}
    if(act==='home'){closeDialog();state.privateVisible=false;state.section='home';render();return;}
    if(act==='openModule'){
      const target=btn.dataset.module;
      if(!['schedule','habit','spending','fund','goals','insights'].includes(target))return;
      closeDialog();state.privateVisible=false;state.section=target;render();
      if(target==='schedule'&&!state.loaded&&!state.loading)load();
      return;
    }
    if(act==='closeDialog'){closeDialog();return;}
    if(act==='add'){openEditor('add');return;}
    if(act==='edit'){const e=state.events.find(x=>x.id===id);openEditor('edit',id,date,e?.repeat_frequency==='none'?'series':'single');return;}
    if(act==='toggleDone'){const o=occurrences(date,date).find(x=>x.event.id===id&&x.originalDate===date);if(o)mutateOccurrence(id,date,o.status==='completed'?'scheduled':'completed');return;}
    if(act==='delete'){askDelete(id,date);return;}
    if(act==='confirmDelete'){deleteSeries();return;}
    if(act==='cancelOccurrence'){const o=state.dialog;closeDialog();if(o)mutateOccurrence(o.id,o.date,'cancelled');return;}
    if(act==='refresh'){load();return;}
    if(act==='selectDay'){state.selected=date;state.focus=date;render();return;}
    if(act==='jump'){state.selected=date;state.focus=date;state.view='day';render();return;}
    if(act==='view'){state.view=btn.dataset.view;render();return;}
    if(act==='today'){state.focus=state.selected=today();render();return;}
    if(act==='prev'||act==='next'){
      const sign=act==='prev'?-1:1;const d=jsDate(state.focus)||new Date();
      if(state.view==='day')d.setDate(d.getDate()+sign);else if(state.view==='week')d.setDate(d.getDate()+7*sign);else{const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+sign);d.setDate(Math.min(day,monthDays(d.getFullYear(),d.getMonth()+1)));}
      state.focus=state.selected=fmtDate(d);render();return;
    }
    if(act==='private'){state.privateVisible=!state.privateVisible;render();return;}
  }
  function init(){
    const host=$(ROOT);if(!host)return;state.ready=true;state.owner=ownerNow();state.epoch=epochNow();render();
    host.addEventListener('click',onClick);
    host.addEventListener('keydown',ev=>{
      if(!state.dialog)return;
      if(ev.key==='Escape'){ev.preventDefault();closeDialog();return;}
      if(ev.key==='Tab'){
        const modal=$('lpOverlayV1');const focusable=[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')].filter(x=>x.getClientRects().length);
        if(!focusable.length)return;
        const first=focusable[0],last=focusable[focusable.length-1];
        if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus();}
        else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus();}
      }
    });
    window.addEventListener('mmhvault:life-planner-home',()=>{closeDialog();state.privateVisible=false;state.section='home';if(active())render();});
    window.addEventListener('mmhvault:page-visible',e=>{
      if(e?.detail?.page===PAGE){if(ownerNow()!==state.owner||epochNow()!==state.epoch)reset();if(!state.loaded&&!state.loading)load();else render();}
      else if(state.dialog||state.privateVisible){closeDialog();state.privateVisible=false;}
    });
    window.addEventListener('mmhvault:config-owner-changed',reset);
    for(const n of ['mmhvault-language-change','languagechange'])window.addEventListener(n,()=>{if(state.ready)render();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){state.privateVisible=false;closeDialog();}else if(active())load();});
    window.addEventListener('focus',()=>{if(active()&&!state.saving&&!state.loading)load();},{passive:true});
    try{cloud()?.auth.onAuthStateChange((_e,s)=>{setTimeout(()=>{if((s?.user?.id||'')!==state.owner){reset();if(active()&&ownerNow())load();}},0);});}catch(_){/* no auth client */}
    if(active())load();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
