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
  const state={owner:'',epoch:0,events:[],exceptions:[],reminders:[],remindersReady:false,reminderError:'',reminderChecking:false,browserReminderOptIn:false,loaded:false,loading:false,saving:false,view:'month',section:'home',focus:today(),selected:today(),privateVisible:false,categoryFilter:'all',statusFilter:'all',search:'',dialog:null,request:0,ready:false,error:'',toast:''};

  function sessionValid(owner,epoch){return owner&&owner===ownerNow()&&epoch===epochNow();}
  function owns(record){return record&&record.user_id===state.owner;}
  function reset(){window.MMHLifeHabitsV21?.unmount();state.request++;state.events=[];state.exceptions=[];state.reminders=[];state.remindersReady=false;state.reminderError='';state.reminderChecking=false;state.browserReminderOptIn=false;state.loaded=false;state.loading=false;state.saving=false;state.error='';state.toast='';state.privateVisible=false;state.categoryFilter='all';state.statusFilter='all';state.search='';state.section='home';state.dialog=null;state.owner=ownerNow();state.epoch=epochNow();closeDialog();render();}
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
      // Reminders are optional and do not block My Schedule before their separate RLS migration.
      state.reminders=[];state.remindersReady=false;state.reminderError='';
      try{
        const reminders=await paginate('life_schedule_reminder_settings',owner,'created_at');
        if(!sessionValid(owner,epoch)||token!==state.request)return;
        state.reminders=reminders.filter(e=>e.user_id===owner);
        state.remindersReady=true;
      }catch(reminderErr){
        if(!sessionValid(owner,epoch)||token!==state.request)return;
        state.reminderError=parseMissing(reminderErr)?'MIGRATION':'CONNECT';
      }
      state.loaded=true;
    }catch(err){
      if(!sessionValid(owner,epoch)||token!==state.request)return;
      state.loaded=false;state.events=[];state.exceptions=[];state.reminders=[];state.remindersReady=false;state.reminderError='CONNECT';
      state.error=parseMissing(err)?'MIGRATION':err.message==='LOGIN'?'LOGIN':err.message==='TOO_MANY'?'LIMIT':'CONNECT';
    }finally{if(token===state.request&&sessionValid(owner,epoch)){state.loading=false;render();if(state.loaded&&state.remindersReady)queueMicrotask(checkDueReminders);}}
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
  // Search private contents only when the user explicitly reveals private titles in this session.
  // Never persist search/filter state or send it to financial analytics and AI Chat.
  function matchesFilter(o){
    if(state.categoryFilter!=='all'&&o.category!==state.categoryFilter)return false;
    if(state.statusFilter!=='all'&&o.status!==state.statusFilter)return false;
    const q=state.search.trim().toLocaleLowerCase();
    if(!q)return true;
    if(o.is_private&&!state.privateVisible)return false;
    return `${o.title||''} ${o.notes||''}`.toLocaleLowerCase().includes(q);
  }
  function timeText(o){return o.all_day?L('全天','All day'):(String(o.start_time||'').slice(0,5)+' – '+String(o.end_time||'').slice(0,5));}
  function humanStatus(s){return s==='completed'?L('已完成','Completed'):s==='cancelled'?L('已取消','Cancelled'):L('待进行','Scheduled');}
  function kindName(s){return CHOICES[s]?.[isZh()?0:1]||L('个人','Personal');}
  function textButton(label,act,extra=''){return `<button class="lp-btn" type="button" data-lp-act="${act}" ${extra}>${safe(label)}</button>`;}
  // Phase 1.7: separate, opt-in in-page reminders. NO existing financial push/cron edits.
  function reminderLabel(id){
    const row=state.remindersReady&&state.reminders.find(r=>r.event_id===id);
    if(!row||row.mode==='off')return '';
    return ' · '+(row.mode==='day'?L('当天提醒','Same-day reminder'):L('提前提醒','Advance reminder'));
  }
  function renderReminderSettingsPanel(){
    const enabled=state.reminders.filter(r=>r.mode!=='off').length;
    const missing=state.reminderError==='MIGRATION';
    const body=!state.loaded?L('连接云端日程后可设置。','Available after your schedule loads.'):
      missing?L('提醒专用数据表尚未部署。本轮独立 SQL 需先审核并获得授权。日程功能仍正常。','Reminder tables are not installed. Review and approve the separate SQL first; your schedule continues working.'):
      state.reminderError?L('提醒数据读取失败；请检查权限与网络。日程仍可使用。','Reminder settings could not load. Check network and permissions; your schedule is still available.'):
      L('已为 '+enabled+' 项日程设置提醒。点击具体日程的「提醒」即可更改。','Reminders enabled on '+enabled+' events. Choose “Reminder” on any event to change it.');
    const browserLabel=state.browserReminderOptIn?L('此标签页已允许系统提示','System alerts enabled this session'):L('允许系统提示（可选）','Enable system alerts (optional)');
    return `<section class="lp-reminder-panel" aria-label="${L('日程提醒','Schedule reminders')}">
      <div class="lp-reminder-symbol" aria-hidden="true">♧</div><div class="lp-reminder-copy"><div class="lp-focus-kicker">${L('温柔提醒','GENTLE REMINDERS')}</div><h2>${L('别忘了今天的小计划','A little nudge at the right time')}</h2><p>${safe(body)}</p><small>${L('提醒仅在登录、网页打开且此日程页可用时检查；关闭网页后不保证提醒。不会加入财务通知或 AI Chat。','Checks occur only when signed in with this schedule page open. No guaranteed reminders after closing the page. Finance alerts and AI Chat remain separate.')}</small></div>
      <button type="button" class="lp-btn lp-reminder-enable" data-lp-act="browserReminder" ${!state.remindersReady||state.browserReminderOptIn?'disabled':''}>${safe(browserLabel)}</button>
    </section>`;
  }
  function eventWallInstant(date,time,timezone){
    const d=jsDate(date);if(!d||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))return null;
    try{
      const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
      const [y,m,day]=date.split('-').map(Number),[hr,min]=time.split(':').map(Number),want=Date.UTC(y,m-1,day,hr,min);
      let ms=want;
      for(let n=0;n<6;n++){
        const parts=Object.fromEntries(fmt.formatToParts(new Date(ms)).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
        const obtained=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour%24,parts.minute);
        const delta=want-obtained;
        if(delta===0)return ms;
        ms+=delta;
      }
      return null; // DST nonexistent local wall-time: do not invent a time.
    }catch(_){return null;}
  }
  function reminderDueTime(o,rule){
    if(!rule||rule.mode==='off'||o.status!=='scheduled')return null;
    const timezone=o.timezone||'UTC';
    const base=o.all_day?'09:00':String(o.start_time||'').slice(0,5);
    if(rule.mode==='day'){
      const atNine=eventWallInstant(o.starts_on,'09:00',timezone);
      const atStart=eventWallInstant(o.starts_on,base,timezone);
      return o.all_day?atNine:(atNine!==null&&atStart!==null?Math.min(atNine,atStart):null);
    }
    const start=eventWallInstant(o.starts_on,base,timezone);
    const minutes=Number(rule.minutes_before);
    return start!==null&&[5,15,30,60,1440].includes(minutes)?start-minutes*60000:null;
  }
  async function saveReminder(ev){
    ev.preventDefault();if(!state.loaded||!state.remindersReady||state.saving||state.dialog?.type!=='reminder')return;
    const owner=state.owner,epoch=state.epoch,id=state.dialog.eventId,form=ev.currentTarget;
    const mode=String(form.elements.mode.value),minutes=Number(form.elements.minutes_before.value);
    if(!['off','day','before'].includes(mode)||![5,15,30,60,1440].includes(minutes))return;
    const row=state.reminders.find(r=>r.event_id===id);
    state.saving=true;const button=form.querySelector('button[type=submit]');if(button)button.disabled=true;
    try{
      await guardedUser();if(!sessionValid(owner,epoch))return;
      const c=cloud();let r;
      if(row){r=await c.from('life_schedule_reminder_settings').update({mode,minutes_before:minutes,version:Number(row.version)+1,updated_at:new Date().toISOString()}).eq('id',row.id).eq('user_id',owner).eq('version',row.version).select('id');}
      else {r=await c.from('life_schedule_reminder_settings').insert({user_id:owner,event_id:id,mode,minutes_before:minutes}).select('id');}
      if(!sessionValid(owner,epoch))return;
      if(r.error||!r.data?.length)throw Error('CONFLICT');
      closeDialog();notice(L('提醒设置已保存。','Reminder settings saved.'));await load();
    }catch(_){if(sessionValid(owner,epoch)){const error=$('lpFormErrorV1');if(error){error.textContent=L('保存失败或其他设备已修改，请刷新再试。','Save failed or settings changed on another device. Refresh and retry.');error.hidden=false;}}}
    finally{state.saving=false;if(sessionValid(owner,epoch)){const btn=$('lpReminderFormV17 button[type=submit]');if(btn)btn.disabled=false;}}
  }
  async function enableBrowserReminders(){
    if(!state.remindersReady||state.browserReminderOptIn)return;
    // Only called by direct user click; a finance push permission alone is not life-planner consent.
    if(!('Notification' in window)||!window.isSecureContext){notice(L('此浏览器无法提供系统提示，但仍可使用页面内提醒。','System alerts are unavailable; in-page reminders still work.'));return;}
    try{
      const allowed=await Notification.requestPermission();
      if(allowed==='granted')state.browserReminderOptIn=true;
      notice(allowed==='granted'?L('本次网页会话已开启系统提示。','System alerts enabled for this session.'):L('未开启系统提示；页面内提醒仍可用。','System alerts not enabled. In-page reminders still work.'));
      render();
    }catch(_){notice(L('无法开启系统提示；页面内提醒仍可用。','System alerts unavailable; in-page reminders still work.'));}
  }
  async function checkDueReminders(){
    if(state.reminderChecking||state.loading||state.saving||!state.loaded||!state.remindersReady||!active()||state.section!=='schedule'||document.hidden)return;
    const owner=state.owner,epoch=state.epoch;
    if(!sessionValid(owner,epoch))return;
    state.reminderChecking=true;
    try{
      const rules=new Map(state.reminders.filter(r=>r.mode!=='off').map(r=>[r.event_id,r]));
      if(!rules.size)return;
      const now=Date.now(),rows=occurrences(shift(today(),-2),shift(today(),2));
      await guardedUser();if(!sessionValid(owner,epoch))return;
      for(const o of rows){
        if(!sessionValid(owner,epoch)||document.hidden||state.section!=='schedule')break;
        const rule=rules.get(o.event.id);if(!rule)continue;
        const due=reminderDueTime(o,rule);
        if(due===null||now<due||now-due>60*60000)continue; // Ignore stale reminders older than one hour.
        const r=await cloud().from('life_schedule_reminder_receipts').insert({user_id:owner,event_id:o.event.id,occurrence_date:o.originalDate,setting_version:Number(rule.version)}).select('id');
        if(!sessionValid(owner,epoch))break;
        if(r.error){if(String(r.error.code)==='23505')continue;break;}
        if(!r.data?.length)continue;
        const message=L('现在有一项日程需要关注，前往我的日程查看。','A scheduled event needs your attention. Open My Schedule for details.');
        notice(message); // No private title or event metadata in toast.
        if(state.browserReminderOptIn&&'Notification' in window&&Notification.permission==='granted'){
          try{new Notification('MMHVAULT · Life Planner',{body:message,tag:'mmhvault-life-generic',renotify:false});}catch(_){/* in-page fallback */}
        }
      }
    }catch(_){/* fail closed; no sensitive detail in console or external telemetry */}
    finally{state.reminderChecking=false;}
  }
  function renderEvent(o){
    const privateClass=o.is_private?' lp-private':'';
    const actions=[textButton(L('编辑','Edit'),'edit',`data-id="${o.event.id}" data-date="${o.originalDate}"`),
      textButton(L('再次使用','Use again'),'reuse',`data-id="${o.event.id}" data-date="${o.originalDate}"`),
      textButton(L('提醒','Reminder'),'editReminder',`data-id="${o.event.id}" ${state.remindersReady?'':'disabled title="'+L('提醒数据库未准备好','Reminder database not ready')+'"'}`),
      textButton(o.status==='completed'?L('恢复','Reopen'):L('完成','Done'),'toggleDone',`data-id="${o.event.id}" data-date="${o.originalDate}"`),
      textButton(L('删除','Delete'),'delete',`data-id="${o.event.id}" data-date="${o.originalDate}"`)];
    return `<article class="lp-event${privateClass} lp-${safe(o.status)}"><div class="lp-event-details"><div class="lp-event-title"><span class="lp-event-dot lp-cat-${safe(o.category)}" aria-hidden="true"></span><strong>${safe(displayTitle(o))}</strong><span class="lp-status">${humanStatus(o.status)}</span></div><p>${safe(dateLabel(o.starts_on))}${o.ends_on!==o.starts_on?' → '+safe(dateLabel(o.ends_on)):''} · ${safe(timeText(o))}${o.event.repeat_frequency!=='none'?' · '+L('重复','Repeats'):''}${reminderLabel(o.event.id)}</p></div><div class="lp-event-actions">${actions.join('')}</div></article>`;
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
  function renderWeekRhythm(){
    const anchor=state.selected,weekStart=shift(anchor,-((at(anchor)+6)%7));
    const end=shift(weekStart,6);
    const rows=state.loaded?occurrences(weekStart,end).filter(o=>o.status!=='cancelled'):[];
    const days=[];
    for(let n=0;n<7;n++){
      const d=shift(weekStart,n), items=rows.filter(o=>o.starts_on<=d&&o.ends_on>=d);
      const completed=items.filter(o=>o.status==='completed').length;
      const todayFlag=d===today(),selected=d===state.selected;
      const shortDate=dateLabel(d,{month:'short',day:'numeric'});
      const weekday=dateLabel(d,{weekday:'short'});
      days.push(`<button type="button" class="lp-week-day${todayFlag?' is-today':''}${selected?' is-selected':''}" data-lp-act="weekDay" data-date="${d}" aria-pressed="${selected}" aria-label="${safe(dateLabel(d,{weekday:'long',month:'long',day:'numeric',year:'numeric'}))}${state.loaded?' · '+items.length+' '+L('项日程','events'):''}">
        <span class="lp-week-weekday">${safe(weekday)}</span><strong>${Number(d.slice(-2))}</strong>
        <span class="lp-week-count">${!state.loaded?'—':items.length?items.length+' '+L('项','events'):L('休息','Free')}</span>
        <span class="lp-week-progress" aria-hidden="true"><i style="width:${items.length?Math.round(completed/items.length*100):0}%"></i></span>
      </button>`);
    }
    return `<section class="lp-week-rhythm" aria-label="${L('七天安排概览','Seven-day overview')}">
      <div class="lp-week-heading"><div><span class="lp-focus-kicker">${L('我的一周','MY WEEK')}</span><h2>${L('这一周，稳稳向前','Make this week count')}</h2></div><span>${safe(dateLabel(weekStart))} – ${safe(dateLabel(end))}</span></div>
      <div class="lp-week-days">${days.join('')}</div>
      <p class="lp-week-hint">${L('点击某一天查看日程。仅显示数量与进度，不展示私人日程名称。','Select a day to open its schedule. Counts and progress never expose private titles.')}</p>
    </section>`;
  }
  function render(){
    if(!state.ready)return;const host=$(ROOT);if(!host)return;
    // Two-level Life Planner: the hub and each individual module never share a screen.
    // Only My Schedule has a live editor in Phase 1. Other modules are safe placeholders.
    const modules=[
      {id:'schedule',symbol:'▦',art:'schedule',zh:'我的日程',en:'My Schedule',descZh:'安排每天的计划，开启充实的一天。',descEn:'Plan your days, stay organized and grow.',available:true},
      {id:'habit',symbol:'✓',art:'habit',zh:'习惯管理',en:'Habit Control',descZh:'循序渐进，培养更好的自己。',descEn:'Build good habits, one small step at a time.',available:true},
      {id:'spending',symbol:'▣',art:'spending',zh:'消费控制',en:'Spending Control',descZh:'理性消费，让生活更有余裕。',descEn:'Spend mindfully and make room for what matters.'},
      {id:'fund',symbol:'♡',art:'fund',zh:'愿望储蓄',en:'Wish Fund',descZh:'为喜欢的生活和梦想存下希望。',descEn:'Set money aside for the things you love.'},
      {id:'goals',symbol:'◎',art:'goals',zh:'长期目标',en:'My Goals',descZh:'把梦想分成一步步可实现的目标。',descEn:'Turn big dreams into small, clear steps.'},
      {id:'insights',symbol:'▥',art:'insights',zh:'生活分析',en:'Life Insights',descZh:'记录进步，发现生活的美好变化。',descEn:'Reflect on your progress and keep growing.'}
    ];
    if(state.section==='home'){
      window.MMHLifeHabitsV21?.unmount();
      host.innerHTML=`<div class="lp-shell lp-hub-shell">
        <header class="lp-hero lp-lifestyle-hero"><div class="lp-lifestyle-copy">
          <div class="lp-eyebrow">MMHVAULT / LIFE PLANNER</div>
          <h1>${L('生活规划','Life Planner')}</h1>
          <p>${L('认真规划每一天，培养好习惯，朝着自己的目标一步步前进。','Organize your daily life, build better habits, reach your goals and create the life you love.')}</p>
          <div class="lp-mantra">${L('让今天，变得更有意义。','Make today meaningful.')}</div>
          <div class="lp-lifestyle-promises" aria-label="${L('生活成长方向','Ways to grow')}">
            <span><i aria-hidden="true">✿</i><b>${L('更好的习惯','Better Habits')}</b><small>${L('一点一滴的改变','Small steps, big changes')}</small></span>
            <span><i aria-hidden="true">◎</i><b>${L('更清晰的目标','Clear Goals')}</b><small>${L('把梦想变成计划','Turn dreams into plans')}</small></span>
            <span><i aria-hidden="true">✦</i><b>${L('更好的自己','A Brighter You')}</b><small>${L('自在、充实、有方向','More freedom, happier life')}</small></span>
          </div>
        </div><div class="lp-lifestyle-photo" aria-hidden="true"></div></header>
        <nav class="lp-hub-grid" aria-label="${L('生活规划模块','Life Planner modules')}">
          ${modules.map(item=>`<button type="button" data-lp-act="openModule" data-module="${item.id}" class="lp-hub-card lp-tone-${item.art} ${item.available?'lp-hub-available':'lp-hub-future'}" aria-label="${safe(L(item.zh,item.en))}${item.available?'':L('，即将开放',', coming later')}">
            <span class="lp-hub-art" aria-hidden="true"></span>
            <span class="lp-hub-card-icon" aria-hidden="true">${item.symbol}</span>
            <span class="lp-hub-card-copy"><strong>${safe(L(item.zh,item.en))}</strong><small>${safe(L(item.descZh,item.descEn))}</small></span>
            <span class="lp-hub-card-status">${item.available?item.id==='habit'?L('开始管理 ↗','Open habits ↗'):L('开启今天 ↗','Open schedule ↗'):L('了解计划 ↗','Explore preview ↗')}</span>
            ${item.available?'':`<span class="lp-hub-soon">${L('即将推出','Coming soon')}</span>`}
          </button>`).join('')}
        </nav><p class="lp-hub-footnote"><span aria-hidden="true">✦</span> ${L('保持自己的节奏。私人习惯及消费明细不会在此首页展示。','Grow at your own pace. Private habits and spending details are not shown on this overview.')}</p>
      </div>`;
      return;
    }
    if(state.section==='habit'){
      if(!document.getElementById('mmhLifeHabitsV21'))host.innerHTML='<div class="lp-shell lp-habit-host"><div class="lp-subnav"><button type="button" class="lp-btn" data-lp-act="home">'+L('← 返回 Life Planner','← Back to Life Planner')+'</button><span>Life Planner › '+L('习惯管理','Habit Control')+'</span></div><div id="mmhLifeHabitsV21"></div></div>';
      window.MMHLifeHabitsV21?.mount();
      return;
    }
    window.MMHLifeHabitsV21?.unmount();
    if(state.section!=='schedule'){
      const item=modules.find(x=>x.id===state.section)||modules[0];
      host.innerHTML=`<div class="lp-shell lp-module-placeholder">
        <div class="lp-subnav">${textButton('← '+L('返回 Life Planner','Back to Life Planner'),'home')}</div>
        <section class="lp-coming-panel"><div class="lp-coming-icon" aria-hidden="true">${item.symbol}</div><span class="lp-eyebrow">LIFE PLANNER / ${safe(L('后续阶段','FUTURE PHASE'))}</span><h1>${safe(L(item.zh,item.en))}</h1><p>${safe(L(item.descZh,item.descEn))}</p><div class="lp-coming-badge">${L('功能开发中 · 尚未启用','Coming later · Not enabled yet')}</div>${textButton(L('返回全部模块','Back to all modules'),'home')}</section>
      </div>`;
      return;
    }
    const m=jsDate(state.focus)||new Date();const range=visibleRange();const rows=state.loaded?occurrences(range.start,range.end).filter(matchesFilter):[];
    const dayRows=state.loaded?occurrences(state.selected,state.selected).filter(matchesFilter):[];
    const weekStart=shift(today(),-((at(today())+6)%7));const thisWeek=state.loaded?occurrences(weekStart,shift(weekStart,6)).filter(o=>o.status==='completed'):[];
    const upcoming=state.loaded?occurrences(today(),shift(today(),30)).filter(o=>o.status==='scheduled'&&matchesFilter(o)).slice(0,5):[];
    const todays=state.loaded?occurrences(today(),today()).filter(o=>o.status!=='cancelled'):[];
    const dailyDone=todays.filter(o=>o.status==='completed').length;
    const dailyPercent=todays.length?Math.round(100*dailyDone/todays.length):0;
    const todayPending=todays.filter(o=>o.status==='scheduled').slice(0,4);
    const focusLabel=state.view==='month'?m.toLocaleDateString(locale(),{month:'long',year:'numeric'}):state.view==='week'?`${dateLabel(range.start)} – ${dateLabel(range.end)}`:dateLabel(state.focus,{year:'numeric',month:'long',day:'numeric'});
    const status=state.error==='MIGRATION'?L('新日程数据库尚未部署，或表不在可访问的 schema 中。请先审核独立 SQL 文件，再由你手动执行及验证 RLS。不会在本地临时保存日程。','Schedule database is not deployed or not accessible. Review and run the separate migration and verify RLS first. No insecure local fallback is used.'):
      state.error==='LOGIN'?L('请重新登录以访问日程。','Sign in again to access your schedule.'):
      state.error==='LIMIT'?L('记录数量超出当前版本上限，请导出或分批处理后重试。','Too many records for this version. Reduce or export records before retrying.'):
      state.error?L('云端日程读取失败。请检查网络、权限和 SQL 部署状态，不能在未核实权限时写入。','Could not load cloud schedule. Check network, permissions and SQL deployment; writes are disabled.'):'';
    host.innerHTML=`<div class="lp-shell lp-schedule-shell">
      <div class="lp-subnav">${textButton('← '+L('返回 Life Planner','Back to Life Planner'),'home')}<span>Life Planner <span aria-hidden="true">›</span> ${L('我的日程','My Schedule')}</span></div>
      <header class="lp-hero lp-schedule-hero"><div><div class="lp-eyebrow">LIFE PLANNER / MY SCHEDULE</div><h1>${L('我的日程','My Schedule')}</h1><p>${L('按天、周、月管理日程；独立于财务数据。','Plan your days, weeks and months separately from financial records.')}</p></div></header>
      <div class="lp-summary"><div class="lp-summary-card"><small>${L('今天','Today')}</small><b>${state.loaded?todays.length:'—'}</b><span>${L('项日程','events')}</span></div><div class="lp-summary-card"><small>${L('本周已完成','Completed this week')}</small><b>${state.loaded?thisWeek.length:'—'}</b><span>${L('项日程','events')}</span></div><div class="lp-summary-card"><small>${L('数据存储','Storage')}</small><b>${state.loading?L('读取中','Loading'):state.error?L('未连接','Unavailable'):state.loaded?L('云端','Cloud'):L('待连接','Waiting')}</b><span>${L('独立于财务账本','No finance writes')}</span></div></div>
      <section class="lp-daily-focus" aria-label="${L('今日重点','Today’s focus')}">
        <div class="lp-focus-intro"><span class="lp-focus-kicker">✦ ${L('今天，也值得认真对待','A FRESH DAY, A FRESH START')}</span><h2>${L('今天的重点','Today’s focus')}</h2>
          <p>${!state.loaded?L('同步日程后，在这里查看今天的安排。','Your daily plan appears here after your schedule loads.'):todays.length===0?L('今天还没有安排，为自己安排一件有意义的小事吧。','Nothing planned yet. Make room for one meaningful thing today.'):dailyDone===todays.length?L('今天的日程已经完成，做得好！','All planned events are done. Nice work!'):L('按自己的节奏，一件一件完成就好。','One thing at a time. Keep your own pace.')}</p>
          <button type="button" class="lp-btn lp-focus-create" data-lp-act="add" ${!state.loaded?'disabled':''}>+ ${L('安排今天','Plan today')}</button>
        </div>
        <div class="lp-focus-meter" role="progressbar" aria-label="${L('今日完成率','Today completion rate')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${dailyPercent}" style="--lp-focus-progress:${dailyPercent}%"><div><strong>${state.loaded?dailyPercent+'%':'—'}</strong><small>${state.loaded?`${dailyDone} / ${todays.length}`:L('同步中','Syncing')}</small></div></div>
        <div class="lp-focus-tasks"><span class="lp-focus-list-title">${L('接下来','Coming up today')}</span>
          ${!state.loaded?`<div class="lp-focus-empty">${L('等待云端日程','Waiting for cloud schedule')}</div>`:todayPending.length?todayPending.map(o=>`<div class="lp-focus-task"><span class="lp-event-dot lp-cat-${safe(o.category)}" aria-hidden="true"></span><div><b>${safe(displayTitle(o))}</b><small>${safe(timeText(o))}</small></div><button type="button" class="lp-focus-done" data-lp-act="toggleDone" data-id="${o.event.id}" data-date="${o.originalDate}" title="${L('标记完成','Mark done')}" aria-label="${L('完成日程','Complete event')} ${safe(displayTitle(o))}">✓</button></div>`).join(''):`<div class="lp-focus-empty">${todays.length?L('今天没有待办日程','No pending events today'):L('点击“安排今天”开始','Choose “Plan today” to begin')}</div>`}
        </div>
      </section>
      ${renderWeekRhythm()}
      ${renderReminderSettingsPanel()}
      <div id="lpNoticeV1" class="lp-notice" role="status" aria-live="polite" ${state.toast?'':'hidden'}>${safe(state.toast)}</div>
      ${state.loading?`<p class="lp-alert" role="status">${L('正在安全加载私人日程…','Loading your schedule securely…')}</p>`:''}
      ${status?`<div class="lp-alert lp-alert-error" role="alert"><p>${safe(status)}</p>${textButton(L('重试连接','Retry'),'refresh')}</div>`:''}
      <div class="lp-workspace"><section class="lp-panel lp-main"><div class="lp-panel-top"><div><span class="lp-eyebrow">MY SCHEDULE</span><h2>${L('我的日程','My Schedule')}</h2></div><div class="lp-panel-actions">${textButton(L('今天','Today'),'today')}${textButton(L('刷新','Refresh'),'refresh')}<button class="lp-btn lp-primary" data-lp-act="add" type="button" ${!state.loaded?'disabled':''}>+ ${L('新建日程','New event')}</button></div></div>
      <div class="lp-calendar-header"><div class="lp-range"><button type="button" data-lp-act="prev" aria-label="${L('上一时间段','Previous period')}">‹</button><strong>${safe(focusLabel)}</strong><button type="button" data-lp-act="next" aria-label="${L('下一时间段','Next period')}">›</button></div><label class="lp-date-jump">${L('跳转日期','Go to date')} <input id="lpJumpDateV15" type="date" value="${safe(state.focus)}" aria-label="${L('选择日历日期','Choose calendar date')}"></label><div class="lp-view-toggle">${['day','week','month'].map(v=>`<button type="button" class="${state.view===v?'is-active':''}" aria-pressed="${state.view===v}" data-lp-act="view" data-view="${v}">${v==='day'?L('日','Day'):v==='week'?L('周','Week'):L('月','Month')}</button>`).join('')}</div></div>
      ${renderCalendar(rows,range)}
      <div class="lp-list-head"><h3>${safe(dateLabel(state.selected,{weekday:'long',year:'numeric',month:'long',day:'numeric'}))}</h3><div>${textButton(state.privateVisible?L('隐藏私人名称','Hide private names'):L('显示私人名称','Show private names'),'private')}${textButton(L('新建','Add'),'add',!state.loaded?'disabled':'')}</div></div>
      <div class="lp-filters" role="group" aria-label="${L('查找和筛选日程','Search and filter events')}">
        <label class="lp-filter-search"><span>${L('搜索日程','Search events')}</span><input id="lpSearchV15" type="search" maxlength="120" autocomplete="off" spellcheck="false" placeholder="${L('搜索名称或备注','Search title or notes')}" value="${safe(state.search)}"></label>
        <label><span>${L('分类','Category')}</span><select id="lpCategoryFilterV15"><option value="all">${L('全部分类','All categories')}</option>${Object.entries(CHOICES).map(([id,names])=>`<option value="${id}" ${state.categoryFilter===id?'selected':''}>${safe(names[isZh()?0:1])}</option>`).join('')}</select></label>
        <label><span>${L('状态','Status')}</span><select id="lpStatusFilterV15">${[['all',L('全部状态','All statuses')],['scheduled',L('待进行','Scheduled')],['completed',L('已完成','Completed')],['cancelled',L('已取消','Cancelled')]].map(([id,n])=>`<option value="${id}" ${state.statusFilter===id?'selected':''}>${safe(n)}</option>`).join('')}</select></label>
      </div>
      ${state.loaded?(dayRows.length?`<div class="lp-event-list">${dayRows.map(renderEvent).join('')}</div>`:`<div class="lp-empty">${state.search||state.categoryFilter!=='all'||state.statusFilter!=='all'?L('没有符合筛选条件的日程。','No events match these filters.'):L('当天没有日程。','No events on this day.')}</div>`):`<div class="lp-empty">${L('连接经过验证的私有日程数据库后可查看与添加。','Connect a verified private schedule database to view and add events.')}</div>`}</section>
      <aside class="lp-panel lp-side"><h2>${L('未来 30 天','Next 30 days')}</h2><p class="lp-side-sub">${L('仅在此页面显示，私人名称默认隐藏。','Only shown here. Private names are hidden by default.')}</p>${state.loaded?(upcoming.length?`<div class="lp-upcoming">${upcoming.map(o=>`<button type="button" data-lp-act="jump" data-date="${o.starts_on}"><small>${safe(dateLabel(o.starts_on))}</small><b>${safe(displayTitle(o))}</b><span>${safe(timeText(o))}</span></button>`).join('')}</div>`:`<p class="lp-empty">${L('暂无近期日程','No upcoming events')}</p>`):`<p class="lp-empty">${L('暂无可用的云端日程数据','Cloud schedule unavailable')}</p>`}
      <div class="lp-private-note">◈ ${L('私人事件不会加入普通 Dashboard、财务分析、AI Chat 或推送通知。界面隐藏不等同于数据库加密，请验证 RLS。','Private events are not sent to the regular Dashboard, financial insights, AI Chat or push. UI hiding is not encryption: verify RLS.')}</div></aside></div>
    </div>`;
    if(state.dialog)drawDialog();
  }
  // Portal out of the financial app's backdrop-filtered .page container. CSS filters
  // create fixed-position containing blocks and clip otherwise fullscreen dialogs.
  function dialogLayer(){
    let el=$('lpOverlayV1');
    if(!el){el=document.createElement('div');el.id='lpOverlayV1';el.className='lp-overlay lp-portal-overlay';el.hidden=true;document.body.appendChild(el);}
    return el;
  }
  function closeDialog(){state.dialog=null;const el=$('lpOverlayV1');if(el){el.hidden=true;el.replaceChildren();}document.documentElement.classList.remove('lp-dialog-open');}

  function drawDialog(){
    const o=state.dialog,root=dialogLayer();if(!o||!root)return;
    root.hidden=false;document.documentElement.classList.add('lp-dialog-open');
    if(o.type==='reminder'){
      const e=state.events.find(x=>x.id===o.eventId&&owns(x));if(!e||!state.remindersReady){closeDialog();return;}
      const existing=state.reminders.find(x=>x.event_id===e.id);
      const mode=existing?.mode||'off',minutes=Number(existing?.minutes_before||15);
      root.innerHTML=`<div class="lp-modal lp-reminder-dialog" role="dialog" aria-modal="true" aria-labelledby="lpModalTitleV1"><div class="lp-modal-heading"><h2 id="lpModalTitleV1">${L('日程提醒设置','Event reminder settings')}</h2><button class="lp-modal-x" type="button" data-lp-act="closeDialog" aria-label="${L('关闭','Close')}">×</button></div>
        <p>${L('仅为当前日程系列设置提醒，重复日程的每次发生均适用。','Settings apply to this event and every occurrence in its recurring series.')}</p>
        <form id="lpReminderFormV17"><label>${L('提醒方式','When to remind')}<select name="mode"><option value="off" ${mode==='off'?'selected':''}>${L('不提醒','Off')}</option><option value="day" ${mode==='day'?'selected':''}>${L('当天提醒（通常上午 9 点；早于 9 点的日程按开始时）','Same day (usually 9 AM, earlier events at their start time)')}</option><option value="before" ${mode==='before'?'selected':''}>${L('提前提醒','Before event')}</option></select></label>
        <label class="lp-reminder-offset">${L('提前多久','How early')}<select name="minutes_before">${[[5,L('5 分钟','5 minutes')],[15,L('15 分钟','15 minutes')],[30,L('30 分钟','30 minutes')],[60,L('1 小时','1 hour')],[1440,L('1 天','1 day')]].map(([n,label])=>`<option value="${n}" ${minutes===n?'selected':''}>${safe(label)}</option>`).join('')}</select></label>
        <p class="lp-modal-hint">${L('使用日程原时区；全天日程按上午 9 点计算。仅网页打开期间可提醒，私人日程不会显示标题。','Uses event timezone; all-day events use 9 AM. Works only while the page is open; private event titles are never shown in reminders.')}</p>
        <p id="lpFormErrorV1" class="lp-form-error" role="alert" hidden></p><div class="lp-modal-actions"><button type="button" class="lp-btn" data-lp-act="closeDialog">${L('取消','Cancel')}</button><button type="submit" class="lp-btn lp-primary">${L('保存提醒','Save reminder')}</button></div></form></div>`;
      $('lpReminderFormV17')?.addEventListener('submit',saveReminder);
      const rForm=$('lpReminderFormV17');const update=()=>{const el=rForm.querySelector('.lp-reminder-offset');el.hidden=rForm.elements.mode.value!=='before';};rForm.elements.mode.addEventListener('change',update);update();
    }else if(o.type==='confirm'){
      root.innerHTML=`<div class="lp-modal" role="dialog" aria-modal="true" aria-labelledby="lpModalTitleV1"><h2 id="lpModalTitleV1">${safe(o.title)}</h2><p>${safe(o.description)}</p><div class="lp-modal-actions">${textButton(L('返回','Back'),'closeDialog')}<button class="lp-btn lp-danger" type="button" data-lp-act="confirmDelete">${L('确认','Confirm')}</button></div></div>`;
    }else{
      const e=o.occurrence||null,base=e?.event;
      const reuse=o.reuse||null;
      const src=reuse?{...reuse,starts_on:state.selected,ends_on:shift(state.selected,Math.max(0,dayDiff(reuse.starts_on,reuse.ends_on))),status:'scheduled',repeat_frequency:'none',repeat_interval:1,repeat_until:null}:o.type==='edit'&&o.scope!=='single'&&base?{...e,...base}:e;
      const field=(name,value)=>safe(String(value??''));
      const scope=o.scope||'series',one=scope==='single';
      const item={title:src?.title||'',notes:src?.notes||'',starts_on:src?.starts_on||state.selected,ends_on:src?.ends_on||state.selected,start_time:String(src?.start_time||'09:00').slice(0,5),end_time:String(src?.end_time||'10:00').slice(0,5),all_day:src?.all_day??false,category:src?.category||'personal',is_private:src?.is_private??false,status:src?.status||'scheduled',repeat_frequency:base?.repeat_frequency||'none',repeat_interval:base?.repeat_interval||1,repeat_until:base?.repeat_until||''};
      root.innerHTML=`<div class="lp-modal lp-event-dialog" role="dialog" aria-modal="true" aria-labelledby="lpModalTitleV1" aria-describedby="lpModalSubV18">
        <div class="lp-modal-heading"><div><span class="lp-modal-eyebrow">LIFE PLANNER · MY SCHEDULE</span><h2 id="lpModalTitleV1">${o.type==='add'?(reuse?L('再次安排日程','Reuse this event'):L('新建日程','New event')):one?L('修改本次日程','Edit this occurrence'):L('编辑日程','Edit event')}</h2><p id="lpModalSubV18">${L('把日常安排得更从容。','Make a little room for what matters today.')}</p></div><button class="lp-modal-x" type="button" data-lp-act="closeDialog" aria-label="${L('关闭','Close')}">×</button></div>
        <form id="lpEventFormV1" novalidate>
          <div class="lp-modal-body" tabindex="-1">
            ${base?.repeat_frequency!=='none'&&o.type==='edit'?`<div class="lp-scope"><label><input type="radio" name="lpScopeV1" value="single" ${one?'checked':''}> ${L('仅本次','This occurrence')}</label><label><input type="radio" name="lpScopeV1" value="series" ${one?'':'checked'}> ${L('整个重复系列','Entire series')}</label></div>`:''}
            <section class="lp-form-section"><div class="lp-form-section-heading"><span>01</span><div><strong>${L('基本信息','The essentials')}</strong><small>${L('日程名称与分类','What are you planning?')}</small></div></div>
              <label>${L('日程名称','Title')}<input required name="title" maxlength="120" autocomplete="off" placeholder="${L('例如：晨间阅读、学习计划…','e.g. Morning reading, study plan…')}" value="${field('title',item.title)}"></label>
              <div class="lp-form-row"><label>${L('分类','Category')}<select name="category">${Object.entries(CHOICES).map(([id,names])=>`<option value="${id}" ${item.category===id?'selected':''}>${safe(names[isZh()?0:1])}</option>`).join('')}</select></label><label>${L('状态','Status')}<select name="status">${['scheduled','completed','cancelled'].map(x=>`<option value="${x}" ${item.status===x?'selected':''}>${humanStatus(x)}</option>`).join('')}</select></label></div>
              <label class="lp-check lp-privacy-option"><input type="checkbox" name="is_private" ${item.is_private?'checked':''}><span><strong>${L('私人日程','Private event')}</strong><small>${L('在概览中隐藏名称；不向普通通知展示私人详情','Hide the title in overviews; no private details in ordinary alerts')}</small></span></label>
            </section>
            <section class="lp-form-section"><div class="lp-form-section-heading"><span>02</span><div><strong>${L('日期与时间','Date & time')}</strong><small>${L('安排适合自己的节奏','Find a time that works for you')}</small></div></div>
              <div class="lp-form-row"><label>${L('开始日期','Start date')}<input required type="date" name="starts_on" value="${item.starts_on}"></label><label>${L('结束日期','End date')}<input required type="date" name="ends_on" value="${item.ends_on}"></label></div>
              <label class="lp-check lp-allday-option"><input type="checkbox" name="all_day" ${item.all_day?'checked':''}><span>${L('全天事件','All-day event')}</span></label>
              <div class="lp-form-row" id="lpTimeRowV1"><label>${L('开始时间','Start time')}<input type="time" name="start_time" value="${item.start_time}"></label><label>${L('结束时间','End time')}<input type="time" name="end_time" value="${item.end_time}"></label></div>
            </section>
            <section class="lp-form-section" id="lpRepeatFieldsV1" ${one?'hidden':''}><div class="lp-form-section-heading"><span>03</span><div><strong>${L('重复安排','Repeat')}</strong><small>${L('让经常做的事更轻松','Make routines easier to manage')}</small></div></div>
              <div class="lp-form-row"><label>${L('重复','Repeat')}<select name="repeat_frequency">${[['none',L('不重复','Never')],['daily',L('每天','Daily')],['weekly',L('每周','Weekly')],['monthly',L('每月','Monthly')]].map(([v,n])=>`<option value="${v}" ${item.repeat_frequency===v?'selected':''}>${safe(n)}</option>`).join('')}</select></label><label class="lp-repeat-detail">${L('间隔（次数）','Every N periods')}<input type="number" name="repeat_interval" min="1" max="52" step="1" value="${item.repeat_interval}"></label></div>
              <label class="lp-repeat-detail">${L('重复截止（可选）','Repeat until (optional)')}<input type="date" name="repeat_until" value="${item.repeat_until}"></label>
            </section>
            <section class="lp-form-section"><div class="lp-form-section-heading"><span>04</span><div><strong>${L('温柔提醒与备注','Reminders & notes')}</strong><small>${L('保留想记住的小细节','Keep the little details')}</small></div></div>
              <p class="lp-form-reminder-tip">♧ ${L('保存后可在日程卡片中选择「提醒」。此处不会自动开启通知。','After saving, choose Reminder on the event card. Notifications are never enabled automatically.')}</p>
              <label>${L('备注（可选）','Notes (optional)')}<textarea name="notes" maxlength="2000" rows="3" placeholder="${L('记录想法或准备事项…','Thoughts, preparation or anything to remember…')}">${safe(item.notes)}</textarea></label>
              <p class="lp-modal-hint">${L('时区：','Timezone: ')}${safe(base?.timezone||tz())} · ${L('重复事件按创建时区的本地日期计算。','Recurring dates use the original event timezone.')}</p>
            </section>
          </div>
          <div class="lp-modal-actions lp-modal-footer"><p id="lpFormErrorV1" class="lp-form-error" role="alert" hidden></p><div class="lp-modal-actions-row"><button type="button" class="lp-btn" data-lp-act="closeDialog">${L('取消','Cancel')}</button><button type="submit" class="lp-btn lp-primary" ${state.saving?'disabled':''}>${state.saving?L('保存中','Saving'):L('保存日程','Save event')}</button></div></div>
        </form></div>`;
      const form=$('lpEventFormV1');form?.addEventListener('submit',saveEvent);
      form?.elements.all_day.addEventListener('change',()=>{$('lpTimeRowV1').hidden=form.elements.all_day.checked;});
      $('lpTimeRowV1').hidden=!!item.all_day;
      const updateRepeatDetails=()=>{const show=form.elements.repeat_frequency.value!=='none';form.querySelectorAll('.lp-repeat-detail').forEach(el=>el.hidden=!show);};
      form.elements.repeat_frequency.addEventListener('change',updateRepeatDetails);updateRepeatDetails();
      root.querySelectorAll('input[name="lpScopeV1"]').forEach(x=>x.addEventListener('change',()=>{if(state.dialog){state.dialog.scope=x.value;drawDialog();}}));
    }
    // Keep focus inside the overlay; Escape closes without discarding saved records.
    root.querySelector('input[name="title"],button')?.focus({preventScroll:true});
  }
  function openEditor(type,id,date,scope='series'){
    if(!state.loaded)return;
    if(type==='add'){state.dialog={type:'add'};drawDialog();return;}
    if(type==='reuse'){
      const e=state.events.find(x=>x.id===id&&owns(x));if(!e)return;
      const original=date||e.starts_on;const ex=state.exceptions.find(x=>x.event_id===id&&x.occurrence_date===original);
      state.dialog={type:'add',reuse:buildOccurrence(e,original,ex)};drawDialog();return;
    }
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
    if(snapshot.type==='add'||snapshot.scope==='single'){
      const fingerprint=JSON.stringify(values);
      if(snapshot.clientPayload!==fingerprint){snapshot.clientPayload=fingerprint;snapshot.clientRequestId=key();}
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
  function onClick(event){const btn=event.target.closest('[data-lp-act]');if(!btn||(!$(ROOT)?.contains(btn)&&!$('lpOverlayV1')?.contains(btn)))return;const act=btn.dataset.lpAct,id=btn.dataset.id,date=btn.dataset.date;
    if(act==='dashboard'){closeDialog();state.section='home';window.setPage?.('dashboard');return;}
    if(act==='home'){closeDialog();state.privateVisible=false;state.search='';state.categoryFilter='all';state.statusFilter='all';state.section='home';render();return;}
    if(act==='openModule'){
      const target=btn.dataset.module;
      if(!['schedule','habit','spending','fund','goals','insights'].includes(target))return;
      closeDialog();state.privateVisible=false;state.section=target;render();
      if(target==='schedule'&&!state.loaded&&!state.loading)load();
      return;
    }
    if(act==='closeDialog'){closeDialog();return;}
    if(act==='add'){if(btn.classList.contains('lp-focus-create'))state.selected=today();openEditor('add');return;}
    if(act==='edit'){const e=state.events.find(x=>x.id===id);openEditor('edit',id,date,e?.repeat_frequency==='none'?'series':'single');return;}
    if(act==='reuse'){openEditor('reuse',id,date);return;}
    if(act==='editReminder'){if(state.remindersReady&&state.events.some(e=>e.id===id&&owns(e))){state.dialog={type:'reminder',eventId:id};drawDialog();}return;}
    if(act==='browserReminder'){enableBrowserReminders();return;}
    if(act==='weekDay'&&jsDate(date)){state.selected=state.focus=date;state.view='day';render();return;}
    if(act==='toggleDone'){const e=state.events.find(x=>x.id===id&&owns(x));if(e){const ex=state.exceptions.find(x=>x.event_id===id&&x.occurrence_date===date);const o=buildOccurrence(e,date,ex);mutateOccurrence(id,date,o.status==='completed'?'scheduled':'completed');}return;}
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
    const portal=dialogLayer();portal.addEventListener('click',onClick);
    host.addEventListener('input',ev=>{
      if(ev.target?.id!=='lpSearchV15')return;
      const start=ev.target.selectionStart,end=ev.target.selectionEnd;
      state.search=String(ev.target.value||'').slice(0,120);render();
      const input=$('lpSearchV15');if(input){input.focus({preventScroll:true});try{input.setSelectionRange(start,end);}catch(_){/* unsupported input type */}}
    });
    host.addEventListener('change',ev=>{
      const id=ev.target?.id,value=ev.target?.value;
      if(id==='lpCategoryFilterV15'&&(value==='all'||Object.prototype.hasOwnProperty.call(CHOICES,value))){state.categoryFilter=value;render();}
      if(id==='lpStatusFilterV15'&&['all','scheduled','completed','cancelled'].includes(value)){state.statusFilter=value;render();}
      if(id==='lpJumpDateV15'&&jsDate(value)){state.focus=state.selected=value;render();}
    });
    const handleDialogKeydown=ev=>{
      if(!state.dialog)return;
      if(ev.key==='Escape'){ev.preventDefault();closeDialog();return;}
      if(ev.key==='Tab'){
        const modal=$('lpOverlayV1');const focusable=[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')].filter(x=>x.getClientRects().length);
        if(!focusable.length)return;
        const first=focusable[0],last=focusable[focusable.length-1];
        if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus();}
        else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus();}
      }
    };
    host.addEventListener('keydown',handleDialogKeydown);portal.addEventListener('keydown',handleDialogKeydown);
    window.addEventListener('mmhvault:life-planner-home',()=>{closeDialog();state.privateVisible=false;state.section='home';if(active())render();});
    window.addEventListener('mmhvault:page-visible',e=>{
      if(e?.detail?.page===PAGE){if(ownerNow()!==state.owner||epochNow()!==state.epoch)reset();if(!state.loaded&&!state.loading)load();else render();}
      else {window.MMHLifeHabitsV21?.unmount();if(state.dialog)closeDialog();state.privateVisible=false;state.search='';state.categoryFilter='all';state.statusFilter='all';}
    });
    window.addEventListener('mmhvault:config-owner-changed',reset);
    for(const n of ['mmhvault-language-change','languagechange'])window.addEventListener(n,()=>{if(state.ready)render();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){window.MMHLifeHabitsV21?.unmount();state.privateVisible=false;closeDialog();}else if(active())load();});
    // No background scheduling promise: browsers may throttle or suspend this timer.
    setInterval(()=>{if(!document.hidden&&active()&&state.section==='schedule')checkDueReminders();},60000);
    window.addEventListener('focus',()=>{if(active()&&!state.saving&&!state.loading)load();},{passive:true});
    try{cloud()?.auth.onAuthStateChange((_e,s)=>{setTimeout(()=>{if((s?.user?.id||'')!==state.owner){reset();if(active()&&ownerNow())load();}},0);});}catch(_){/* no auth client */}
    if(active())load();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
