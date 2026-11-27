/* MMHVAULT · Future Asset Forecast v1.7 · Compact extras and mobile month layout
 * Owner-scoped, locally stored what-if estimates. Never writes ledger, investments, FX or Supabase.
 */
(()=>{'use strict';
 if(window.__MMH_FORECAST_V1)return;window.__MMH_FORECAST_V1=true;
 const PAGE='forecast',ROOT='mmhForecastRootV1',STORAGE='mmhvault_forecast_plan_v1_';
 const CURRENCIES=['USD','MMK','THB','CNY','JPY','KRW','SGD','MYR','IDR','PHP','VND','KHR','LAK','BND','HKD','MOP','TWD','MNT','KPW','INR','BDT','PKR','LKR','NPR','BTN','MVR','AFN','KZT','KGS','TJS','TMT','UZS','AMD','AZN','GEL','AED','BHD','IQD','IRR','ILS','JOD','KWD','LBP','OMR','QAR','SAR','SYP','YER','TRY','RUB','EUR'];
 const CORE_RATES=['THB','CNY','MMK'],SCENARIO_CURRENCIES=CURRENCIES.filter(c=>c!=='USD');
 const CURRENCY_MARKS=Object.fromEntries(CURRENCIES.map(c=>[c,({USD:'$',CNY:'¥',THB:'฿',MMK:'K'})[c]||c]));
 let selectedMonth='',editOpen=false,fxOpen=false,extraRate='JPY';
 const currencyName=c=>{try{const lang=localStorage.getItem('mmhvault_language_v3363');return new Intl.DisplayNames([lang==='zh'?'zh-CN':lang==='my'?'my':'en'],{type:'currency'}).of(c)||c}catch(_){return c}};
 const FIELDS=[
  {key:'salary',en:'Salary income',zh:'工资收入',def:2500,ccy:'USD',type:'income',base:true},
  {key:'allowance',en:'Living allowance income',zh:'生活费收入',def:15000,ccy:'THB',type:'income',base:true},
  {key:'personal',en:'Personal expenses',zh:'个人消费',def:22500,ccy:'THB',type:'personal',base:true},
  {key:'family',en:'Family + Special Transfer',zh:'家庭支援 + Special Transfer',def:450,ccy:'USD',type:'family',base:true},
  {key:'bonus',en:'Extra bonus',zh:'额外奖金',def:0,ccy:'USD',type:'income'},
  {key:'otherU',en:'Other income A',zh:'其他收入 A',def:0,ccy:'USD',type:'income'},
  {key:'otherTHB',en:'Other income B',zh:'其他收入 B',def:0,ccy:'THB',type:'income'},
  {key:'extraTHB',en:'Extra spending A',zh:'额外支出 A',def:0,ccy:'THB',type:'extra'},
  {key:'extraU',en:'Extra spending B',zh:'额外支出 B',def:0,ccy:'USD',type:'extra'}
 ];
 const FIELD=Object.fromEntries(FIELDS.map(x=>[x.key,x]));
 let activeOwner='',state=null,lastFirst='',midnightTimer=0,lastDailyCalendar='',dirty=false,customSequence=0;
 const el=id=>document.getElementById(id);
 const isZh=()=>{try{return(localStorage.getItem('mmhvault_language_v3363')||'en')==='zh'}catch(_){return false}};
 const tr=(en,zh)=>isZh()?zh:en;
 const planLabels={budget:['Budget','预算','ဘတ်ဂျက်'],goals:['Goals','目标','ရည်မှန်းချက်များ'],recurring:['Recurring','固定收支','ပုံမှန်ငွေဝင်ငွေထွက်']};
 const planIcons={budget:'<path d="M3 6h16a2 2 0 0 1 2 2v10H3z M3 6V4h14 M21 11h-5v4h5"/>',goals:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',recurring:'<path d="M4 9V6h14l-3-3m3 12v3H4l3 3M18 6l-3 3M4 18l3-3"/>'};
 const planningLinks=()=>Object.keys(planLabels).map(key=>{const code=localStorage.getItem('mmhvault_language_v3363'),label=planLabels[key][code==='zh'?1:code==='my'?2:0];return '<button type="button" class="fc-plan-entry" data-fc-plan-page="'+key+'" title="'+label+'" aria-label="'+label+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+planIcons[key]+'</svg></button>'}).join('');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pad=v=>String(v).padStart(2,'0');
 const monthKey=(d=new Date())=>`${d.getFullYear()}-${pad(d.getMonth()+1)}`;
 const shift=(key,step)=>{const m=/^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(key||''));if(!m)return '';return monthKey(new Date(+m[1],+m[2]-1+step,1,12))};
 const startKey=()=>shift(monthKey(),1);
 const validMonth=s=>/^(\d{4})-(0[1-9]|1[0-2])$/.test(String(s||''));
 const monthLabel=key=>{if(!validMonth(key))return '—';const [y,m]=key.split('-').map(Number);return isZh()?`${y}年${m}月`:new Date(y,m-1,1,12).toLocaleDateString('en-US',{month:'short',year:'numeric'})};
 const val=v=>{const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=1e12?n:null};
 const fmt=n=>Number(n).toLocaleString(isZh()?'zh-CN':'en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
 const usd=n=>`${fmt(n)} U`;
 const signed=n=>`${n>=0?'+':'−'}${usd(Math.abs(n))}`;
 const displayRate=fx=>{const c=state?.viewCurrency||'USD';return c==='USD'?1:Number(fx?.[c])};
 const validDisplayRate=fx=>{const n=displayRate(fx);return Number.isFinite(n)&&n>0};
 const displayMoney=(n,fx)=>{const c=state?.viewCurrency||'USD',rate=displayRate(fx);return Number.isFinite(n)&&validDisplayRate(fx)?`${fmt(n*rate)} ${c==='USD'?'U':c}`:'—'};
 const displaySigned=(n,fx)=>{const value=displayMoney(Math.abs(n),fx);return Number.isFinite(n)&&value!=='—'?`${n>=0?'+':'−'}${value}`:'—'};
 const unitName=c=>c+' · '+currencyName(c);
 const owner=()=>{try{return typeof currentSessionUser!=='undefined'?String(currentSessionUser?.id||''):''}catch(_){return ''}};
 const localKey=id=>STORAGE+id;
 const defaultState=()=>({base:Object.fromEntries(FIELDS.filter(f=>f.base).map(f=>[f.key,f.def])),baseCurrencies:Object.fromEntries(FIELDS.filter(f=>f.base).map(f=>[f.key,f.ccy])),disabledBase:[],customItems:[],targetSavingsRate:60,months:{},monthCurrencies:{},end:'',dailyMonth:'',rate:null,fxOverrides:{},viewCurrency:'USD',salaryConfigured:false});
 const validCcy=c=>CURRENCIES.includes(c);
  const customToField=item=>({key:item.key,en:item.label,zh:item.label,def:0,ccy:item.currency,type:item.type,base:true});
  const allFields=()=>FIELDS.filter(f=>!f.base||!state.disabledBase.includes(f.key)).concat(state.customItems.map(customToField));
  const regularFields=()=>allFields().filter(f=>f.base);
  const fieldByKey=k=>FIELD[k]||(state.customItems.find(x=>x.key===k)?customToField(state.customItems.find(x=>x.key===k)):null);
  const baseAmount=f=>FIELD[f.key]?state.base[f.key]:(state.customItems.find(x=>x.key===f.key)?.amount??0);
  const baseCurrency=f=>FIELD[f.key]?state.baseCurrencies[f.key]:(state.customItems.find(x=>x.key===f.key)?.currency||'USD');
  const savingRate=(income,net)=>Number.isFinite(income)&&income>0&&Number.isFinite(net)?net/income*100:null;
  const savingsRateText=r=>r===null?'—':r.toFixed(1)+'%';
 function getState(id){
  if(!id)return defaultState();
  try{
   const raw=JSON.parse(localStorage.getItem(localKey(id))||'null');
   if(!raw||typeof raw!=='object'||![1,2,3].includes(raw.version))return defaultState();
   const next=defaultState();
   next.viewCurrency=validCcy(raw.viewCurrency)?raw.viewCurrency:'USD';
    next.disabledBase=Array.isArray(raw.disabledBase)?[...new Set(raw.disabledBase.filter(k=>FIELD[k]?.base))]:[];
    if(Array.isArray(raw.customItems))for(const item of raw.customItems.slice(0,40)){
      if(!item||!/^custom_[a-z0-9_]{1,70}$/.test(String(item.key||''))||next.customItems.some(x=>x.key===item.key))continue;
      const amount=val(item.amount);
      next.customItems.push({key:item.key,label:String(item.label||'').trim().slice(0,48)||'Other',type:item.type==='income'?'income':'personal',amount:amount===null?0:amount,currency:validCcy(item.currency)?item.currency:'USD'});
    }
    if(Number.isFinite(+raw.targetSavingsRate)&&raw.targetSavingsRate!==null&&raw.targetSavingsRate!==''&&+raw.targetSavingsRate>=0&&+raw.targetSavingsRate<=100)next.targetSavingsRate=+raw.targetSavingsRate;
   // V1.3 and earlier stored a salary with every saved plan; migrate a saved plan as configured.
   // Fresh defaults and an explicit Reset scenario remain NOT configured.
   next.salaryConfigured=typeof raw.salaryConfigured==='boolean'?raw.salaryConfigured:
     (val(raw.base?.salary)!==null&&Number(raw.base.salary)>0||
       Object.values(raw.months||{}).some(m=>m&&val(m.salary)!==null&&Number(m.salary)>0));
   for(const f of FIELDS.filter(x=>x.base)){
    if(val(raw.base?.[f.key])!==null)next.base[f.key]=Number(raw.base[f.key]);
    if(validCcy(raw.baseCurrencies?.[f.key]))next.baseCurrencies[f.key]=raw.baseCurrencies[f.key];
   }
   next.end=validMonth(raw.end)?raw.end:'';
   // Always open the daily view on the present month after a page reload. Historic salary overrides remain saved.
   next.dailyMonth='';
   if(val(raw.rate)!==null&&Number(raw.rate)>0)next.rate=Number(raw.rate);
   for(const c of SCENARIO_CURRENCIES)if(Number(raw.fxOverrides?.[c])>0&&Number.isFinite(+raw.fxOverrides[c])&&Number(raw.fxOverrides[c])<=1e8)next.fxOverrides[c]=+raw.fxOverrides[c];
   if(raw.months&&typeof raw.months==='object'){
    for(const [date,fields] of Object.entries(raw.months)){
     if(!validMonth(date)||!fields||typeof fields!=='object')continue;
     const clean={};for(const f of [...FIELDS,...next.customItems.map(customToField)])if(fields[f.key]!==''&&fields[f.key]!=null&&val(fields[f.key])!==null)clean[f.key]=+fields[f.key];
     if(Object.keys(clean).length)next.months[date]=clean;
    }
   }
   if(raw.monthCurrencies&&typeof raw.monthCurrencies==='object')for(const [date,fields] of Object.entries(raw.monthCurrencies)){
    if(!validMonth(date)||!fields||typeof fields!=='object')continue;
    const clean={};for(const f of [...FIELDS,...next.customItems.map(customToField)])if(validCcy(fields[f.key]))clean[f.key]=fields[f.key];
    if(Object.keys(clean).length)next.monthCurrencies[date]=clean;
   }
   return next;
  }catch(_){return defaultState()}
 }
 function updateSaveStatus(){
    const status=el('fc-save-status'),button=el('fc-save-btn');
    if(status)status.textContent=dirty?tr('Unsaved changes · click Save settings to keep them after refresh','有尚未保存的修改 · 请点击保存设置'):tr('Settings saved on this device','设置已保存到当前设备');
    if(button)button.disabled=!dirty||!activeOwner;
  }
  function save(){dirty=true;updateSaveStatus()}
  function persist(){
    if(!activeOwner||!state)return false;
    try{localStorage.setItem(localKey(activeOwner),JSON.stringify({...state,version:3}));dirty=false;updateSaveStatus();return true}
    catch(e){console.warn('[MMHVAULT Forecast] Storage unavailable',e);showWarning(tr('Could not save settings on this device. Check browser storage.','保存失败，请检查浏览器存储是否可用。'));return false}
  }
 function syncOwner(){const id=owner();if(id!==activeOwner){activeOwner=id;state=getState(id);dirty=false;lastFirst='';selectedMonth='';editOpen=false;fxOpen=false;extraRate='JPY';if(!id)el('mmhDailyDashboardV13')?.remove()}}
 function active(){return !!el(PAGE)?.classList.contains('active')}
 function ratesNow(){
  const obj=window.rates||(typeof rates!=='undefined'?rates:null);
  const result={USD:1};for(const c of SCENARIO_CURRENCIES){const n=Number(obj?.['usd_'+c.toLowerCase()]);result[c]=Number.isFinite(n)&&n>0?n:0}return result;
 }
 function exchangeRates(){
  const source=ratesNow(),result={...source};
  for(const c of SCENARIO_CURRENCIES)if(Number(state.fxOverrides[c])>0)result[c]=Number(state.fxOverrides[c]);
  if(!('THB' in state.fxOverrides)&&Number(state.rate)>0)result.THB=Number(state.rate);
  return result;
 }
 function toUSD(amount,ccy,fx){if(!Number.isFinite(amount)||!validCcy(ccy)||!(fx[ccy]>0))return NaN;return amount/fx[ccy]}
 function convert(amount,from,to,fx){const u=toUSD(amount,from,fx);return Number.isFinite(u)&&fx[to]>0?u*fx[to]:NaN}
 function assets(){
  if(!activeOwner)return {ready:false,total:0};
  const cashFn=window.mmhvaultCashUSD,investFn=window.mmhDashboardHeldInvestmentUSD||window.mmhvaultInvestmentValueUSD,receivableFn=window.mmhDashboardReceivableUSD;
  if(typeof cashFn!=='function'||typeof investFn!=='function')return {ready:false,total:0};
  try{
   const cash=Math.max(0,Number(cashFn())||0),investment=Math.max(0,Number(investFn())||0),receivable=typeof receivableFn==='function'?Math.max(0,Number(receivableFn())||0):0;
   return {ready:true,total:cash+investment+receivable,cash,investment,receivable};
  }catch(e){console.warn('[MMHVAULT Forecast] Assets not available',e);return {ready:false,total:0}}
 }
 const effectiveEnd=first=>state.end||shift(first,21);
 function range(first,end){if(!validMonth(first)||!validMonth(end)||end<first)return [];const out=[];let d=first;for(let i=0;i<240&&d<=end;i++){out.push(d);d=shift(d,1)}return out}
 function monthlyValues(date){
   const amounts=state.months[date]||{},currencies=state.monthCurrencies[date]||{},result={};
   for(const f of FIELDS){
    const enabled=!f.base||!state.disabledBase.includes(f.key);
    const amount=enabled?(Object.prototype.hasOwnProperty.call(amounts,f.key)?amounts[f.key]:(f.base?state.base[f.key]:0)):0;
    const currency=currencies[f.key]||(f.base?state.baseCurrencies[f.key]:f.ccy);
    result[f.key]={amount,currency};
   }
   for(const item of state.customItems)result[item.key]={
    amount:Object.prototype.hasOwnProperty.call(amounts,item.key)?amounts[item.key]:item.amount,
    currency:currencies[item.key]||item.currency
   };
   return result;
  }
  function calcBreakdown(values,fx){
   let invalidCcy='',incomeU=0,personalU=0,familyU=0,extraU=0;
   for(const f of allFields()){
    const v=values[f.key],amount=toUSD(Number(v?.amount),v?.currency,fx);
    if(!Number.isFinite(amount)){invalidCcy=v?.currency||f.ccy;continue}
    if(f.type==='income')incomeU+=amount;
    else if(f.type==='personal')personalU+=amount;
    else if(f.type==='family')familyU+=amount;
    else extraU+=amount;
   }
   const expenseU=personalU+familyU+extraU;
   return {incomeU,personalU,familyU,extraU,expenseU,net:incomeU-expenseU,invalidCcy};
  }
  function calculate(){
  const first=startKey(),end=effectiveEnd(first),marketRates=ratesNow(),fx=exchangeRates(),worth=assets(),dates=range(first,end);
  let total=worth.total,invalidCcy='';
  const rows=worth.ready?dates.map(date=>{
   const v=monthlyValues(date),parts=calcBreakdown(v,fx);
   if(parts.invalidCcy)invalidCcy=parts.invalidCcy;
   total+=Number.isFinite(parts.net)?parts.net:0;
   return {date,v,...parts,total};
  }):[];
  const defaultValues=monthlyValues('__none__'),normal=calcBreakdown(defaultValues,fx);
  if(normal.invalidCcy)invalidCcy=normal.invalidCcy;
  return {first,end,fx,marketRates,worth,rows,normal,valid:!!worth.ready&&!!rows.length&&!invalidCcy,invalidCcy,tooLong:!!(validMonth(end)&&end>=first&&shift(first,239)<end)};
 }
 // Daily salary is an earned-by-time estimate, NEVER an additional cash asset or ledger entry.
 function dailyInfo(chosen=''){
  const today=new Date(),current=monthKey(today);
  const selected=validMonth(chosen)&&chosen<=current?chosen:current;
  const [year,month]=selected.split('-').map(Number);
  const count=new Date(year,month,0).getDate();
  // As requested, credit a day only after it has finished in local time.
  const completed=selected<current?count:Math.max(0,Math.min(count,today.getDate()-1));
  const overrides=state?.months?.[selected]||{},ccyOverrides=state?.monthCurrencies?.[selected]||{};
  const hasOwn=Object.prototype.hasOwnProperty.call(overrides,'salary');
  const amount=state.disabledBase.includes('salary')?0:(hasOwn?Number(overrides.salary):Number(state?.base?.salary||0));
  const currency=ccyOverrides.salary||state?.baseCurrencies?.salary||'USD';
  const fx=exchangeRates(),salaryU=toUSD(amount,currency,fx);
  return {selected,current,count,completed,amount,currency,salaryU,
   earned:amount*completed/count,earnedU:salaryU*completed/count,daily:amount/count,
   pct:completed/count*100,hasOwn,valid:Number.isFinite(salaryU)};
 }
 function dailyMoney(n,c){return `${CURRENCY_MARKS[c]||c}${fmt(n)}`}
 function salaryIsConfigured(month=''){
  if(!activeOwner||!state?.salaryConfigured||state.disabledBase.includes('salary'))return false;
  const d=dailyInfo(month);return Number.isFinite(d.amount)&&d.amount>0;
 }
 function syncDailyPanelVisibility(){
  const root=el(ROOT),panel=el('fc-day-panel');if(!root)return;
  if(!salaryIsConfigured(state?.dailyMonth)) {panel?.remove();return}
  if(!panel)root.querySelector('.fc-stats')?.insertAdjacentHTML('afterend',dailyPanelHTML());
 }
 function dailyPanelHTML(){
  const d=dailyInfo(state.dailyMonth),min='2020-01';
  return `<section class="fc-panel fc-day-panel" id="fc-day-panel">
   <div class="fc-day-head"><div><div class="fc-day-title"><span class="fc-day-trophy" aria-hidden="true">🏆</span><h2>${tr('Daily salary progress','每日工资成就进度')}</h2></div><p class="fc-muted">${tr('Each completed day adds one day of estimated salary. This is not money actually received.','每完整度过一天，就累计一天的预计工资；不是实际已到账金额。')}</p></div>
   <label class="fc-field fc-day-picker"><span>${tr('View month','查看月份')}</span><input id="fc-day-month" type="month" min="${min}" max="${d.current}" value="${d.selected}"></label></div>
   <div class="fc-day-content"><div class="fc-day-gauge" id="fc-day-gauge" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="${esc(tr('Completed month progress','月度完成进度'))}"><div class="fc-day-gauge-core"><strong id="fc-day-pct">0%</strong><small>${tr('completed','已完成')}</small></div></div>
   <div class="fc-day-main"><small>${tr('Estimated salary earned for completed days','已完成天数的预计累计工资')}</small><strong id="fc-day-earned">—</strong><p id="fc-day-earned-u" class="fc-muted">—</p><div class="fc-day-motivation" id="fc-day-motivation">—</div></div>
   <div class="fc-day-info"><div><small>${tr('Monthly salary','本月工资')}</small><strong id="fc-day-monthly">—</strong></div><div><small>${tr('Days in month','本月天数')}</small><strong id="fc-day-length">—</strong></div><div><small>${tr('Completed days','已度过天数')}</small><strong id="fc-day-days">—</strong></div><div><small>${tr('Earned per day','每日累计')}</small><strong id="fc-day-daily">—</strong></div></div></div>
   <div class="fc-day-bar-row"><div class="fc-day-bar" role="presentation"><i id="fc-day-bar-fill"></i></div><strong id="fc-day-fraction">—</strong></div>
   <div class="fc-day-milestones" id="fc-day-milestones"></div>
   <div class="fc-day-edit"><div class="fc-day-edit-copy"><strong>${tr('Salary for the selected month','所选月份工资')}</strong><small>${tr('Edit just this month, or leave it matching your regular salary. Future forecast months are unchanged.','可单独修改本月工资；未设置时沿用常规工资，不改其他月份。')}</small></div>
   <div class="fc-day-edit-control">${pairField(tr('Monthly salary','本月工资'),'salary',d.amount,d.currency,'month',d.selected,d.amount)}<button class="fc-btn alt fc-day-reset" type="button" data-fc-action="reset-day-salary">${tr('Use regular salary','恢复常规工资')}</button></div></div>
   <p class="fc-day-disclaimer">${tr('Progress uses the device’s local calendar and counts completed days only. Historic months without saved salary overrides use your current regular salary. Display equivalents use current scenario FX; this estimate never modifies Dashboard assets, transactions or Supabase.','进度按设备当地日历计算，只计已经完整结束的日期。未单独保存工资的历史月份按当前常规工资估算；显示币种的换算使用当前模拟汇率。本卡片不会修改 Dashboard 总资产、Transactions 或 Supabase。')}</p>
  </section>`;
 }
 function setText(id,value){const e=el(id);if(e)e.textContent=value}
 function updateDailyPanel(){
  const root=el('fc-day-panel');if(!root||!state)return;
  const d=dailyInfo(state.dailyMonth),fx=exchangeRates(),p=Number.isFinite(d.pct)?d.pct:0;
  const gauge=el('fc-day-gauge');if(gauge){gauge.style.setProperty('--fc-day-progress',`${p}%`);gauge.setAttribute('aria-valuenow',String(Math.round(p)))}
  setText('fc-day-pct',`${p.toFixed(1)}%`);
  setText('fc-day-earned',dailyMoney(d.earned,d.currency));
  const dayEquivalent=d.valid?displayMoney(d.earnedU,fx):'—';
  setText('fc-day-earned-u',dayEquivalent!=='—'?tr('Approx. ','约 ')+dayEquivalent:tr('Exchange rate unavailable','汇率暂不可用'));
  setText('fc-day-monthly',dailyMoney(d.amount,d.currency));
  setText('fc-day-length',`${d.count} ${tr('days','天')}`);
  setText('fc-day-days',`${d.completed} / ${d.count}`);
  setText('fc-day-daily',dailyMoney(d.daily,d.currency)+tr(' / day',' / 天'));
  setText('fc-day-fraction',`${d.completed} / ${d.count} · ${p.toFixed(1)}%`);
  setText('fc-day-motivation',d.completed===0?tr('Your journey begins today.','今天开始新的积累！'):d.completed>=d.count?tr('🏆 Month complete!','🏆 本月已全部完成！'):tr('✨ Another day of progress.','✨ 又完成了一天的积累！'));
  const fill=el('fc-day-bar-fill');if(fill)fill.style.width=`${p}%`;
  const milestones=el('fc-day-milestones');if(milestones){
   const nums=[1,Math.ceil(d.count/3),Math.ceil(2*d.count/3),d.count].filter((n,i,a)=>a.indexOf(n)===i);
   milestones.innerHTML=nums.map(day=>`<div class="${day<=d.completed?'done':''}"><b>${tr('Day ','第')}${day}${tr('','天')}</b><small>${esc(dailyMoney(d.amount*day/d.count,d.currency))}</small></div>`).join('');
  }
  const salaryBox=root.querySelector(`input[data-fc-month="${d.selected}"][data-fc-field="salary"]`);
  if(salaryBox&&document.activeElement!==salaryBox)salaryBox.value=d.amount;
  // Monthly salary may change elsewhere. Update the inherited currency chip on the next full rerender.
 }
 function dashboardDailyHTML(){return `<section class="mmh-daily-mini-v13" id="mmhDailyDashboardV13" aria-label="${esc(tr('Daily salary progress','每日工资进度'))}">
  <div class="mmh-daily-mini-top"><div><span class="mmh-daily-mini-overline">✦ ${tr('DAILY PROGRESS','每日进度')}</span><h2>🏆 ${tr('Another day, another step','每天积累一点')}</h2><p>${tr('Estimated salary for completed days this month','本月已完整度过天数的预计累计工资')}</p></div><button type="button" data-mmh-open-daily="1">${tr('View in Future Planner →','查看详细进度 →')}</button></div>
  <div class="mmh-daily-mini-main"><div><small>${tr('Earned by completed days','已累计预计工资')}</small><strong id="mmhDailyDashEarnedV13">—</strong><em id="mmhDailyDashRateV13">—</em></div><div class="mmh-daily-mini-pct"><strong id="mmhDailyDashPctV13">—</strong><small id="mmhDailyDashDaysV13">—</small></div></div>
  <div class="mmh-daily-mini-bar" aria-hidden="true"><i id="mmhDailyDashBarV13"></i></div>
  <div class="mmh-daily-mini-bottom"><span id="mmhDailyDashMonthV13">—</span><span>${tr('Estimate only · not received cash','仅为预计进度 · 非实际到账')}</span></div>
 </section>`}
 function updateDashboardDaily(){
  if(!state||!activeOwner||!salaryIsConfigured())return;
  const d=dailyInfo(),percent=d.pct.toFixed(1);
  setText('mmhDailyDashEarnedV13',dailyMoney(d.earned,d.currency));
  setText('mmhDailyDashRateV13',tr('Daily ','每天 ')+dailyMoney(d.daily,d.currency)+(d.valid?' · ≈ '+usd(d.earnedU):''));
  setText('mmhDailyDashPctV13',percent+'%');
  setText('mmhDailyDashDaysV13',`${d.completed} / ${d.count} ${tr('days','天')}`);
  setText('mmhDailyDashMonthV13',monthLabel(d.current));
  const bar=el('mmhDailyDashBarV13');if(bar)bar.style.width=`${d.pct}%`;
 }
 function mountDashboardDaily(){
  // P9.6: The greeting MUST stay first. Keep the finance KPIs second and
  // mount Daily Progress third, even after Dashboard re-renders or restores.
  const card=el('mmhDailyDashboardV13');
  if(!salaryIsConfigured()){card?.remove();return}
  const host=el('mmhPremiumDashboardV500');if(!host)return;
  const hero=host.querySelector(':scope > .pf-hero-v500');
  const kpis=host.querySelector(':scope > .pf-kpis-v500');
  if(!hero||!kpis)return; // The Dashboard may be between render passes.
  if(host.firstElementChild!==hero)host.prepend(hero);
  if(hero.nextElementSibling!==kpis)hero.after(kpis);
  if(!card)kpis.insertAdjacentHTML('afterend',dashboardDailyHTML());
  else if(kpis.nextElementSibling!==card)kpis.after(card);
  updateDashboardDaily();
 }
 let dashboardObserver=null;
 function watchDashboard(){
  const host=el('mmhPremiumDashboardV500');if(!host)return;
  if(!dashboardObserver){dashboardObserver=new MutationObserver(()=>{if(el('dashboard')?.classList.contains('active'))mountDashboardDaily()});dashboardObserver.observe(host,{childList:true})}
  mountDashboardDaily();
 }
 // A single compact money input: only the symbol is visible until activated.
 function pairField(label,fieldKey,value,currency,where,date='',placeholder=''){
  const isBase=where==='base',inputId=`fc-${isBase?'base':'month'}-${fieldKey}${date?'-'+date:''}`;
  const data=isBase?`data-fc-base="${fieldKey}"`:`data-fc-month="${date}" data-fc-field="${fieldKey}"`;
  const groupData=isBase?`data-fc-base-ccy="${fieldKey}"`:`data-fc-month-ccy="${date}" data-fc-ccy-field="${fieldKey}"`;
  const options=CURRENCIES.map(c=>`<button type="button" role="option" aria-selected="${currency===c}" data-fc-pick-currency="${c}" class="fc-currency-option${currency===c?' selected':''}"><span class="fc-option-symbol">${CURRENCY_MARKS[c]}</span><span>${esc(c)}<small>${esc(currencyName(c))}</small></span>${currency===c?'<span aria-hidden="true" class="fc-option-check">✓</span>':''}</button>`).join('');
  return `<div class="fc-field"><label for="${inputId}">${esc(label)}</label><div class="fc-money-pair" ${groupData} data-fc-currency="${currency}"><button type="button" class="fc-currency-trigger" data-fc-toggle-currency="1" aria-label="${esc(label+' · '+tr('Change currency, currently ','切换币种，当前：')+unitName(currency))}" aria-expanded="false" aria-haspopup="listbox" title="${esc(currency)}"><span class="fc-currency-mark" aria-hidden="true">${CURRENCY_MARKS[currency]}</span></button><input id="${inputId}" type="number" min="0" max="1000000000000" step="any" inputmode="decimal" ${data} value="${esc(value)}" placeholder="${esc(placeholder)}" aria-label="${esc(label+' · '+unitName(currency))}"><div class="fc-currency-menu" role="listbox" aria-label="${esc(label+' · '+tr('Currency','币种'))}" hidden>${options}</div></div></div>`;
 }
 function rowField(date,f,over,ccyOver){
  const own=Object.prototype.hasOwnProperty.call(over,f.key);
  const ccy=ccyOver[f.key]||(f.base?baseCurrency(f):f.ccy);
  let ph=f.base?baseAmount(f):0;
  const orig=f.base?baseCurrency(f):f.ccy;
  if(ccy!==orig){const converted=convert(ph,orig,ccy,exchangeRates());if(Number.isFinite(converted))ph=Number(converted.toFixed(2))}
  return pairField(tr(f.en,f.zh),f.key,own?over[f.key]:'',ccy,'month',date,ph);
 }
 function monthHtml(date,i){
  const overrides=state.months[date]||{},ccys=state.monthCurrencies[date]||{};
  const active=regularFields();
  const monthGroup=(type)=>{const income=type==='income',set=active.filter(f=>income?f.type==='income':f.type!=='income');
   return `<div class="fc-month-category"><div class="fc-month-category-head"><span class="fc-month-category-dot ${income?'is-income':'is-expense'}"></span><strong>${income?tr('Income','收入'):tr('Expenses & transfers','支出与转账')}</strong></div><div class="fc-month-category-fields">${set.map(f=>rowField(date,f,overrides,ccys)).join('')||'<span class="fc-month-empty">—</span>'}</div></div>`;
  };
  const regularInputs=monthGroup('income')+monthGroup('expense');
  const extraInputs=FIELDS.filter(f=>!f.base).map(f=>rowField(date,f,overrides,ccys)).join('');
  const hasExtraChanges=FIELDS.some(f=>!f.base&&(Object.prototype.hasOwnProperty.call(overrides,f.key)||Object.prototype.hasOwnProperty.call(ccys,f.key)));
  return `<details class="fc-month" data-fc-card="${date}"><summary><div class="fc-month-name">${esc(monthLabel(date))}<small>${tr('Month ','第')}${i+1}${tr(' · tap to edit','个月 · 点击调整')}</small></div><div class="fc-month-data"><small>${tr('Total income','总收入')}</small><strong data-fc-income="${date}">—</strong></div><div class="fc-month-data"><small>${tr('Personal spending','个人支出')}</small><strong class="fc-cost" data-fc-personal="${date}">—</strong><em class="fc-native" data-fc-personal-native="${date}">—</em></div><div class="fc-month-data"><small>${tr('Family transfers','家庭支出')}</small><strong class="fc-cost" data-fc-family="${date}">—</strong><em class="fc-native" data-fc-family-native="${date}">—</em></div><div class="fc-month-net"><small>${tr('Monthly change','当月净变化')}</small><strong data-fc-net="${date}">—</strong><em class="fc-native" data-fc-month-rate="${date}">—</em></div><div class="fc-month-total"><small>${tr('Month-end assets','月末总资产')}</small><strong data-fc-total="${date}">—</strong></div><span class="fc-chevron" aria-hidden="true">›</span></summary><div class="fc-month-fields"><div class="fc-month-hint">${tr('Changes here apply to this month only. Leave a value blank to use the regular amount.','这里的调整仅用于本月，留空将沿用常规金额。')}</div>
     <div class="fc-month-category-grid">${regularInputs}</div>
     <details class="fc-month-additional"${hasExtraChanges?' open':''}><summary><span class="fc-additional-icon" aria-hidden="true">＋</span><span class="fc-additional-title">${tr('Bonuses & extra spending','奖金与额外支出')}</span><span class="fc-additional-hint">${tr('Optional','可选')}</span><span class="fc-additional-chevron" aria-hidden="true">⌄</span></summary><div class="fc-month-additional-fields">${extraInputs}</div></details>
     <div class="fc-month-extra" data-fc-extra-note="${date}">—</div><div class="fc-month-actions"><button type="button" class="fc-btn alt" data-fc-clear-month="${date}">${tr('Clear month changes','清除本月调整')}</button></div></div></details>`;
 }
 function regularEditorHTML(group){
   const income=group==='income',items=regularFields().filter(f=>income?f.type==='income':f.type!=='income');
   const title=income?tr('Income','收入'):tr('Expenses & transfers','支出与转账');
   return `<div class="fc-regular-group ${income?'fc-group-income':'fc-group-expense'}"><div class="fc-regular-heading"><span class="fc-group-symbol" aria-hidden="true">${income?'↙':'↗'}</span><strong>${title}</strong><small>${items.length} ${tr('items','项')}</small></div>
    <div class="fc-regular-list">${items.length?items.map(f=>{
     const custom=!FIELD[f.key],label=tr(f.en,f.zh);
     const heading=custom?`<input type="text" maxlength="48" class="fc-regular-name" data-fc-label="${esc(f.key)}" aria-label="${esc(tr('Item name','项目名称'))}" value="${esc(label)}">`:`<span class="fc-regular-title">${esc(label)}</span>`;
     return `<div class="fc-regular-item" data-fc-regular-item="${esc(f.key)}"><div class="fc-regular-label">${heading}</div><div class="fc-regular-entry">${pairField(label,f.key,baseAmount(f),baseCurrency(f),'base')}</div><button type="button" class="fc-remove-item" data-fc-remove="${esc(f.key)}" aria-label="${esc(tr('Remove ','删除')+label)}" title="${esc(tr('Remove item','删除项目'))}">×</button></div>`;
    }).join(''):`<p class="fc-regular-empty">${tr('No items yet. Add one below.','暂无项目，可点击下方添加。')}</p>`}</div>
    <button type="button" class="fc-add-item" data-fc-add="${group}">＋ ${income?tr('Add income','添加收入'):tr('Add expense','添加支出')}</button></div>`;
  }
  function rateField(c){return `<label class="fc-field"><span>1 U = ${c}</span><input type="number" data-fc-rate="${c}" min="0.000000000001" max="100000000" step="any" inputmode="decimal" placeholder="${esc(ratesNow()[c]||'—')}" value="${esc(state.fxOverrides[c]??(c==='THB'?state.rate:null)??'')}"></label>`}
 function layout(){
  const root=el(ROOT);if(!root)return;
  const first=startKey(),end=effectiveEnd(first),max=shift(first,239),dates=range(first,end);
  const previous=root.querySelector('details.fc-month');if(previous?.dataset.fcCard===selectedMonth)editOpen=previous.open;
  const previousFX=el('fc-fx-settings');if(previousFX)fxOpen=previousFX.open;
  if(!dates.includes(selectedMonth)){selectedMonth=dates[0]||'';editOpen=false}

  root.innerHTML=`<div class="fc-wrap">
    <header class="fc-head"><div><div class="fc-eyebrow">MMHVAULT · ${tr('FUTURE WEALTH PLANNER','未来资产预测')}</div><h1>${tr('Future Asset Forecast','未来资产预测')}</h1><p class="fc-muted">${tr('Forecast from next month, based on your current Dashboard assets.','从下个月起，使用 Dashboard 实时总资产逐月预测。')}</p></div><div class="fc-head-actions"><details class="fc-view-picker" id="fc-view-picker"><summary aria-label="${esc(tr('Forecast display currency','预测显示币种'))}">${esc(state.viewCurrency)} <span aria-hidden="true">⌄</span></summary><div class="fc-view-options">${CURRENCIES.map(c=>`<button type="button" data-fc-view-currency="${c}" aria-pressed="${state.viewCurrency===c}"><b>${c}</b><span>${esc(currencyName(c))}</span>${state.viewCurrency===c?'✓':''}</button>`).join('')}</div></details>${planningLinks()}<button type="button" class="fc-btn alt" data-fc-action="refresh">↻ ${tr('Refresh assets','刷新资产')}</button></div></header>

    <p id="fc-display-warning" class="fc-warning" role="status" hidden></p>
    <div class="fc-stats"><div class="fc-stat"><span>${tr('Current total assets','当前总资产')}</span><strong id="fc-start">—</strong><small>${tr('Dashboard value, including receivables','Dashboard 实时资产，含应收款')}</small></div><div class="fc-stat good"><span>${tr('Regular monthly savings','每月常规净储蓄')}</span><strong id="fc-saving">—</strong><small>${tr('Before bonus and extra spending','未计奖金与额外消费')}</small></div><div class="fc-stat"><span>${tr('Forecast end assets','预测期末总资产')}</span><strong id="fc-result">—</strong><small id="fc-result-date">—</small></div><div class="fc-stat"><span>${tr('Projected gain','预计增长')}</span><strong id="fc-gain">—</strong><small id="fc-count">—</small></div></div>
    ${salaryIsConfigured(state.dailyMonth)?dailyPanelHTML():''}
    <section class="fc-panel fc-regular-panel"><div class="fc-regular-intro"><div><h2>${tr('Regular monthly income & spending','设置每月常规收支')}</h2><p class="fc-muted">${tr('Edit your recurring income and expenses. Only this forecast changes.','规划固定收入与支出；不会更改真实账户数据。')}</p></div><span class="fc-regular-tag">${tr('MONTHLY PLAN','月度计划')}</span></div>
      <div class="fc-regular-grid">${regularEditorHTML('income')}${regularEditorHTML('expense')}</div>
      <div class="fc-breakdown" aria-label="${esc(tr('Regular monthly cash-flow breakdown','每月常规现金流明细'))}">
       <div><small>${tr('Regular income','每月收入合计')}</small><strong id="fc-base-income">—</strong><em id="fc-base-income-detail">—</em></div>
       <div><small>${tr('Personal spending','个人支出')}</small><strong id="fc-summary-personal">—</strong><em id="fc-base-personal-detail">—</em></div>
       <div><small>${tr('Family + Special transfer','家庭 + Special Transfer')}</small><strong id="fc-summary-family">—</strong><em id="fc-base-family-detail">—</em></div>
      </div>
      <div class="fc-savings-goal"><div class="fc-rate-heading"><span>${tr('Regular savings rate','常规储蓄率')}</span><strong id="fc-savings-rate">—</strong><small id="fc-rate-difference">—</small></div><div class="fc-rate-target"><label for="fc-savings-target">${tr('Savings rate target (%)','目标储蓄率 (%)')}</label><input id="fc-savings-target" type="number" min="0" max="100" step="0.1" inputmode="decimal" value="${state.targetSavingsRate}"></div><div class="fc-rate-track" role="progressbar" aria-label="${esc(tr('Progress toward target','储蓄率目标进度'))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="fc-savings-progress"><i id="fc-savings-progress-fill"></i></div></div>
      <details class="fc-fx-settings" id="fc-fx-settings"${fxOpen?' open':''}><summary><b>${tr('Forecast exchange rates','预测换算汇率')}</b><span>${tr('Local simulation only','仅用于本地预测')} · ⌄</span></summary><p class="fc-muted">${tr('1 USD/U equals the currency shown. Empty uses the saved Exchange rate if available; otherwise enter a local scenario rate.','每个汇率表示 1 U 兑换多少该币种；留空时使用可用的 Exchange 已保存汇率，否则请填写本地预测汇率。')}</p>
      <div class="fc-fx-grid">${CORE_RATES.map(rateField).join('')}</div><div class="fc-extra-rate"><label class="fc-field"><span>${tr('Other currency','其他币种')}</span><select id="fc-extra-rate-currency">${SCENARIO_CURRENCIES.filter(c=>!CORE_RATES.includes(c)).map(c=>`<option value="${c}"${extraRate===c?' selected':''}>${c} · ${esc(currencyName(c))}</option>`).join('')}</select></label>${rateField(extraRate)}</div></details>
      <div class="fc-end-row"><label class="fc-field fc-end-control"><span>${tr('Forecast through (year / month)','预测结束年月（自定义）')}</span><input id="fc-end" type="month" min="${first}" max="${max}" value="${end}"></label><div class="fc-bar"><span class="fc-range-note" id="fc-range-label">—</span><div class="fc-btns"><button class="fc-btn" type="button" data-fc-action="export">↓ ${tr('Export CSV','导出 CSV')}</button><button class="fc-btn alt" type="button" data-fc-action="reset">${tr('Reset scenario','恢复默认方案')}</button></div></div></div>
      <p class="fc-warning" id="fc-warning" hidden></p>
      <div class="fc-save-bar"><span id="fc-save-status" role="status"></span><div class="fc-save-actions"><button type="button" class="fc-btn alt" data-fc-action="discard">${tr('Discard changes','撤销未保存修改')}</button><button id="fc-save-btn" type="button" class="fc-btn fc-save-primary" data-fc-action="save">✓ ${tr('Save settings','保存设置')}</button></div></div>
    </section>
    <section class="fc-panel"><h2>${tr('Projected asset growth','预计资产增长曲线')}</h2><p class="fc-muted">${tr('Monthly cash-flow estimates; no assumed investment gains.','按每月现金流计算；不预设投资收益。')}</p><div class="fc-chart" id="fc-chart" style="margin-top:8px"></div></section>
    <section class="fc-panel fc-month-panel"><div class="fc-monthhead"><div><h2>${tr('Month-by-month forecast','逐月资产预测')}</h2><p>${tr('Choose a month to adjust its individual plan.','选择月份，单独调整该月计划。')}</p></div><label class="fc-field fc-month-picker"><span>${tr('Edit month','调整月份')}</span><input id="fc-edit-month" type="month" min="${first}" max="${dates.at(-1)||first}" value="${selectedMonth}" ${dates.length?'':'disabled'}></label></div><div class="fc-month-overview" tabindex="0"><table><thead><tr><th scope="col">${tr('Month','月份')}</th><th scope="col">${tr('Net change','净变化')}</th><th scope="col">${tr('End assets','期末资产')}</th></tr></thead><tbody>${dates.map(date=>`<tr data-fc-overview="${date}" class="${date===selectedMonth?'is-selected':''}"><th scope="row"><button type="button" data-fc-select-month="${date}">${esc(monthLabel(date))}</button></th><td data-fc-overview-net>—</td><td data-fc-overview-total>—</td></tr>`).join('')}</tbody></table></div><div id="fc-month-list" class="fc-months">${selectedMonth?monthHtml(selectedMonth,dates.indexOf(selectedMonth)):''}</div></section>
    <p class="fc-footer">${tr('Forecast settings are stored locally for each user, not in Supabase or cloud backup. Changing a currency automatically converts the current number to preserve its estimated USD value; you can then edit it. Real income/expenses and exchange rates are never changed. Current Dashboard assets, saved exchange rates, and the current month are re-read whenever this forecast refreshes. Future crypto/gold prices are assumed unchanged.','所有预测设置仅存于当前浏览器，按用户分别保存，不写入 Supabase 或云端备份。切换币种时会自动换算原金额以维持其美元估值，随后可修改数字；不影响任何真实收支或正式汇率。刷新时重新读取 Dashboard 资产、已保存汇率和当前月份。未来加密货币及黄金价格暂视为不变。')}</p>
  </div>`;
  const editor=root.querySelector('details.fc-month');if(editor)editor.open=editOpen;
  lastFirst=first;updateOutputs();updateSaveStatus();
 }
 function showWarning(message){const node=el('fc-warning');if(node){node.hidden=!message;node.textContent=message||''}}
 function updateOutputs(){
  if(!active()||!state)return;
  const out=calculate();
  const set=(id,s)=>{const x=el(id);if(x)x.textContent=s};
  const note=out.end<out.first?tr('The selected end month is in the past. Select a later month.','结束月份已经早于预测开始月，请重新选择。'):out.tooLong?tr('Maximum forecast length: 240 months.','最长只能预测240个月。'):!activeOwner?tr('Sign in to see your assets.','请先登录后查看资产。'):!out.worth.ready?tr('Dashboard assets are not ready; refresh financial data.','Dashboard 资产尚未准备好，请刷新财务数据。'):out.invalidCcy?tr('Enter a positive saved or scenario rate for ','请设置有效的已保存或模拟汇率：')+out.invalidCcy:!validDisplayRate(out.fx)?tr('Enter a valid display exchange rate for ','请设置有效的显示汇率：')+state.viewCurrency:'';
  showWarning(note);
  const displayWarning=el('fc-display-warning');if(displayWarning){displayWarning.hidden=validDisplayRate(out.fx);displayWarning.textContent=validDisplayRate(out.fx)?'':tr('Set a local forecast exchange rate for ','请填写本地预测汇率：')+state.viewCurrency;}
  set('fc-start',out.worth.ready?displayMoney(out.worth.total,out.fx):'—');
  set('fc-saving',!out.invalidCcy?displaySigned(out.normal.net,out.fx):'—');
  const rate=out.invalidCcy?null:savingRate(out.normal.incomeU,out.normal.net);
  set('fc-savings-rate',savingsRateText(rate));
  const diff=rate===null?null:rate-state.targetSavingsRate;
  set('fc-rate-difference',diff===null?tr('Add income to calculate the rate','添加收入后可计算储蓄率'):diff>=0?tr('Above target by ','高于目标 ')+diff.toFixed(1)+tr(' percentage points',' 个百分点'):tr('Below target by ','低于目标 ')+Math.abs(diff).toFixed(1)+tr(' percentage points',' 个百分点'));
  const bar=el('fc-savings-progress-fill');if(bar)bar.style.width=rate===null?'0%':Math.max(0,Math.min(100,rate)).toFixed(1)+'%';
  const progress=el('fc-savings-progress');if(progress)progress.setAttribute('aria-valuenow',String(rate===null?0:Math.max(0,Math.min(100,rate))));
  const targetInput=el('fc-savings-target');if(targetInput&&document.activeElement!==targetInput)targetInput.value=state.targetSavingsRate;
  set('fc-result',out.valid?displayMoney(out.rows.at(-1).total,out.fx):'—');
  set('fc-result-date',out.rows.length?monthLabel(out.end):'—');
  set('fc-gain',out.valid?displaySigned(out.rows.at(-1).total-out.worth.total,out.fx):'—');
  set('fc-count',tr('Forecast months: ','预测月数：')+out.rows.length);
  set('fc-range-label',monthLabel(out.first)+' → '+monthLabel(out.end)+' · '+['THB','CNY','MMK'].map(c=>`1 U = ${out.fx[c]>0?fmt(out.fx[c]):'—'} ${c}`).join(' · '));
  set('fc-base-income',!out.invalidCcy?displayMoney(out.normal.incomeU,out.fx):'—');
  set('fc-summary-personal',!out.invalidCcy?displayMoney(out.normal.personalU,out.fx):'—');
  set('fc-summary-family',!out.invalidCcy?displayMoney(out.normal.familyU,out.fx):'—');
  for(const f of regularFields()){
   const node=el('fc-base-'+f.key);if(node&&document.activeElement!==node)node.value=baseAmount(f);
  }
  const groupAmounts=type=>regularFields().filter(f=>f.type===type).map(f=>fmt(baseAmount(f))+' '+baseCurrency(f)).join(' + ')||'—';
  set('fc-base-income-detail',groupAmounts('income'));
  set('fc-base-personal-detail',groupAmounts('personal'));
  set('fc-base-family-detail',groupAmounts('family'));
  const byDate=new Map(out.rows.map(r=>[r.date,r]));
  el(ROOT)?.querySelectorAll('[data-fc-overview]').forEach(tr=>{const r=byDate.get(tr.dataset.fcOverview),net=tr.querySelector('[data-fc-overview-net]'),total=tr.querySelector('[data-fc-overview-total]');net.textContent=out.valid&&r?displaySigned(r.net,out.fx):'—';net.className=out.valid&&r?(r.net>=0?'fc-positive':'fc-negative'):'';total.textContent=out.valid&&r?displayMoney(r.total,out.fx):'—'});
  el('fc-month-list')?.querySelectorAll('[data-fc-card]').forEach(card=>{
   const date=card.dataset.fcCard,row=byDate.get(date);
   if(!row)return;
   const fill=(key,str,cls)=>{const node=card.querySelector(`[data-fc-${key}]`);if(node){node.textContent=out.valid?str:'—';if(cls)node.className=cls}};
   fill('income',displayMoney(row.incomeU,out.fx));
   fill('personal',displayMoney(row.personalU,out.fx));
   fill('family',displayMoney(row.familyU,out.fx));
   fill('personal-native',fmt(row.v.personal.amount)+' '+row.v.personal.currency);
   fill('family-native',fmt(row.v.family.amount)+' '+row.v.family.currency);
   fill('net',displaySigned(row.net,out.fx),row.net>=0?'fc-positive':'fc-negative');
   fill('month-rate',tr('Savings rate: ','储蓄率：')+savingsRateText(savingRate(row.incomeU,row.net)));
   fill('total',displayMoney(row.total,out.fx));
   const ext=card.querySelector('[data-fc-extra-note]');
   if(ext)ext.textContent=out.valid?tr('Extra spending: ','额外支出：')+displayMoney(row.extraU,out.fx)+' · '+tr('All spending: ','支出合计：')+displayMoney(row.expenseU,out.fx):'—';
   card.querySelectorAll('input[data-fc-field]').forEach(input=>{
    const f=fieldByKey(input.dataset.fcField);if(!f)return;let placeholder=f.base?baseAmount(f):0;
    const currency=card.querySelector(`[data-fc-ccy-field="${f.key}"]`)?.dataset.fcCurrency || card.querySelector(`[data-fc-ccy-field="${f.key}"]`)?.querySelector('.fc-currency-trigger')?.title;
    const orig=f.base?baseCurrency(f):f.ccy;
    if(orig!==currency){const v=convert(placeholder,orig,currency,out.fx);if(Number.isFinite(v))placeholder=Number(v.toFixed(2))}
    input.placeholder=String(placeholder);
   });
  });
  drawChart(out);
  syncDailyPanelVisibility();
  updateDailyPanel();
  mountDashboardDaily();
 }
 function drawChart(out){
  const host=el('fc-chart');if(!host)return;
  if(!out.valid||!validDisplayRate(out.fx)){host.textContent=tr('Waiting for valid assets, rates and date.','请确认资产、汇率和结束年月有效。');return}
  const data=[{date:monthKey(),total:out.worth.total},...out.rows],W=900,H=205,R=18,T=18,B=33;
  let L=72;
  let lo=Math.min(...data.map(x=>x.total)),hi=Math.max(...data.map(x=>x.total));
  if(hi===lo){hi+=1;lo-=1}const gap=(hi-lo)*.07;lo-=gap;hi+=gap;
  const factor=displayRate(out.fx),ticks=Array.from({length:4},(_,i)=>Math.round((hi-(hi-lo)*i/3)*factor).toLocaleString('en-US'));
  L=Math.min(190,Math.max(72,Math.ceil(Math.max(...ticks.map(t=>t.length))*6.8+18)));
  const x=i=>L+(W-L-R)*i/Math.max(1,data.length-1),y=v=>T+(H-T-B)*(hi-v)/(hi-lo);
  const points=data.map((v,i)=>`${x(i).toFixed(2)},${y(v.total).toFixed(2)}`),poly=points.join(' '),area=`${L},${H-B} ${poly} ${x(data.length-1).toFixed(2)},${H-B}`;
  const every=Math.max(1,Math.ceil((data.length-1)/6));
  const labels=data.map((d,i)=>(i%every===0||i===data.length-1)?`<text x="${x(i)}" y="${H-8}" text-anchor="middle">${esc(d.date.slice(2))}</text>`:'').join('');
  const grid=Array.from({length:4},(_,i)=>{const yy=T+(H-T-B)*i/3,amount=hi-(hi-lo)*i/3;return `<line class="fc-gridline" x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}"/><text x="${L-7}" y="${yy+3}" text-anchor="end">${esc(Math.round(amount*factor).toLocaleString('en-US'))}</text>`}).join('');
  host.innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(tr('Forecast through ','资产预测截至 ')+monthLabel(out.end)+': '+displayMoney(out.rows.at(-1).total,out.fx))}">${grid}<polygon class="fc-fill" points="${area}"/><polyline class="fc-plot" points="${poly}"/><circle cx="${x(data.length-1)}" cy="${y(data.at(-1).total)}" r="4" fill="var(--uv-accent,#9bb7fb)"/>${labels}</svg>`;
 }
 function exportCSV(){
  const out=calculate();if(!out.valid)return;
  const head=['Month',...allFields().flatMap(f=>[f.key+' amount',f.key+' currency']), 'Total Income U','Personal Expenses U','Family Transfers U','Extra Spending U','Total Expenses U','Monthly Net U','Savings Rate %','Month-end Assets U'];
  const rows=out.rows.map(r=>[r.date,...allFields().flatMap(f=>[r.v[f.key].amount,r.v[f.key].currency]),r.incomeU,r.personalU,r.familyU,r.extraU,r.expenseU,r.net,savingRate(r.incomeU,r.net)??'',r.total]);
  const line=arr=>arr.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',');
  const blob=new Blob(['\ufeff',line(head)+'\r\n',...rows.map(x=>line(x)+'\r\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`MMHVAULT-Forecast-${out.first}-to-${out.end}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function numericInput(input){
   if(input.validity.badInput)return;
   const raw=input.value.trim(),num=val(raw);
   if(raw!==''&&num===null){input.setCustomValidity(tr('Enter a valid nonnegative number.','请输入有效的非负数字。'));return}
   input.setCustomValidity('');
   if(input.dataset.fcBase){
    const k=input.dataset.fcBase,f=fieldByKey(k);if(!f?.base)return;
    if(FIELD[k]){state.base[k]=raw===''?0:num;if(k==='salary')state.salaryConfigured=num>0}
    else {const item=state.customItems.find(x=>x.key===k);if(item)item.amount=raw===''?0:num}
   }else if(input.dataset.fcMonth){
    const d=input.dataset.fcMonth,k=input.dataset.fcField;
    if(!validMonth(d)||!fieldByKey(k))return;
    const m=state.months[d]||(state.months[d]={});
    if(raw==='')delete m[k];else m[k]=num;
    if(!Object.keys(m).length)delete state.months[d];
    if(k==='salary'&&raw!==''&&num>0)state.salaryConfigured=true;
   }
   save();syncDailyPanelVisibility();updateOutputs();mountDashboardDaily();
  }
  function onInput(e){
  const input=e.target;if(!(input instanceof HTMLInputElement))return;
  if(input.dataset.fcLabel){
    const item=state.customItems.find(x=>x.key===input.dataset.fcLabel);
    if(item){item.label=input.value.slice(0,48);save()}
    return;
   }
   if(input.id==='fc-savings-target'){
    if(input.validity.badInput)return;
    const n=Number(input.value);if(input.value!==''&&Number.isFinite(n)&&n>=0&&n<=100){state.targetSavingsRate=n;input.setCustomValidity('');save();updateOutputs()}
    else input.setCustomValidity(tr('Enter a rate from 0 to 100.','请输入 0 至 100 之间的百分比。'));
    return;
   }
   if(input.dataset.fcBase||input.dataset.fcMonth){numericInput(input);return}
  if(input.dataset.fcRate){const c=input.dataset.fcRate,raw=input.value.trim(),n=val(raw);if(!SCENARIO_CURRENCIES.includes(c))return;
   if(raw!==''&&(!(n>0)||n>1e8)){input.setCustomValidity(tr('Use a positive valid exchange rate.','请输入有效的正数汇率。'));return}
   input.setCustomValidity('');if(raw==='')delete state.fxOverrides[c];else state.fxOverrides[c]=n;
   if(c==='THB')state.rate=null;
   save();updateOutputs();
  }
 }
 function onChange(e){
  const node=e.target;
  if(node instanceof HTMLSelectElement&&node.id==='fc-extra-rate-currency'){
   if(!SCENARIO_CURRENCIES.includes(node.value)||CORE_RATES.includes(node.value))return;extraRate=node.value;layout();el('fc-extra-rate-currency')?.focus({preventScroll:true});return;
  }
  if(node instanceof HTMLInputElement&&node.id==='fc-edit-month'){
   if(!range(startKey(),effectiveEnd(startKey())).includes(node.value)){node.value=selectedMonth;return}selectForecastMonth(node.value);el('fc-edit-month')?.focus({preventScroll:true});return;
  }
  if(node instanceof HTMLInputElement&&node.id==='fc-day-month'){
   if(!validMonth(node.value)||node.value>monthKey()||node.value<'2020-01'){node.value=state.dailyMonth||monthKey();return}
   state.dailyMonth=node.value;save();layout();return;
  }
  if(node instanceof HTMLInputElement&&node.id==='fc-end'){
   if(!validMonth(node.value))return;const first=startKey(),max=shift(first,239);
   if(node.value<first||node.value>max){node.setCustomValidity(tr('Choose a month within the next 240 months.','请选择未来240个月内的年月。'));node.focus({preventScroll:true});window.mmhVaultMessageV740?.(tr('Choose a month within the next 240 months.','请选择未来240个月内的年月。'),tr('Invalid month','月份有误'));return}
   node.setCustomValidity('');state.end=node.value;save();layout();return;
  }
 }
 function closeCurrencyMenus(except=null){
  el(ROOT)?.querySelectorAll('.fc-money-pair.fc-picker-open').forEach(group=>{
   if(group===except)return;
   group.classList.remove('fc-picker-open');
   const menu=group.querySelector('.fc-currency-menu');if(menu)menu.hidden=true;
   group.querySelector('.fc-currency-trigger')?.setAttribute('aria-expanded','false');
  });
 }
 function chooseCurrency(group,to){
  const baseKey=group.dataset.fcBaseCcy,monthDate=group.dataset.fcMonthCcy,monthKeyField=group.dataset.fcCcyField;
  const key=baseKey||monthKeyField,f=fieldByKey(key);
  if(!f||!validCcy(to))return;
  const before=exchangeRates();
  if(baseKey){
   const from=baseCurrency(f),old=baseAmount(f);
   if(from===to){closeCurrencyMenus();return}
   const next=convert(old,from,to,before);
   if(!Number.isFinite(next)){closeCurrencyMenus();window.mmhVaultMessageV740?.(tr('Set valid currency rates before switching.','切换币种之前，请先填写有效汇率。'),tr('Currency rates','汇率提示'));return}
   if(FIELD[key]){state.base[key]=Number(next.toFixed(2));state.baseCurrencies[key]=to}else{const item=state.customItems.find(x=>x.key===key);item.amount=Number(next.toFixed(2));item.currency=to}
  }else{
   if(!validMonth(monthDate))return;
   const ccys=state.monthCurrencies[monthDate]||(state.monthCurrencies[monthDate]={});
   const oldCcy=ccys[key]||(f.base?baseCurrency(f):f.ccy);
   if(oldCcy===to){closeCurrencyMenus();return}
   const own=state.months[monthDate]||{};
   const old=Object.prototype.hasOwnProperty.call(own,key)?own[key]:(f.base?baseAmount(f):0);
   const next=convert(old,oldCcy,to,before);
   if(!Number.isFinite(next)){closeCurrencyMenus();window.mmhVaultMessageV740?.(tr('Set valid currency rates before switching.','切换币种之前，请先填写有效汇率。'),tr('Currency rates','汇率提示'));return}
   const m=state.months[monthDate]||(state.months[monthDate]={});m[key]=Number(next.toFixed(2));
   ccys[key]=to;
  }
  if(key==='salary')state.salaryConfigured=(baseKey?Number(state.base.salary)>0:Number(monthlyValues(monthDate).salary.amount)>0);
  closeCurrencyMenus();save();layout();mountDashboardDaily();
  const selector=baseKey?`[data-fc-base-ccy="${key}"] .fc-currency-trigger`:`[data-fc-month-ccy="${monthDate}"][data-fc-ccy-field="${key}"] .fc-currency-trigger`;
  el(ROOT)?.querySelector(selector)?.focus({preventScroll:true});
 }
 function selectForecastMonth(date){if(!range(startKey(),effectiveEnd(startKey())).includes(date))return;selectedMonth=date;editOpen=true;layout();const editor=el(ROOT)?.querySelector('details.fc-month');if(editor)editor.open=true;}
 async function onClick(e){
  const root=el(ROOT),btn=e.target.closest('button');
  if(!btn||!root?.contains(btn))return;
  if(btn.dataset.fcViewCurrency){const c=btn.dataset.fcViewCurrency;if(!validCcy(c))return;state.viewCurrency=c;save();if(!validDisplayRate(exchangeRates())){if(!CORE_RATES.includes(c)&&c!=='USD')extraRate=c;const panel=el('fc-fx-settings');if(panel)panel.open=true;fxOpen=true}layout();el('fc-view-picker')?.querySelector('summary')?.focus({preventScroll:true});return}
  if(btn.dataset.fcSelectMonth){selectForecastMonth(btn.dataset.fcSelectMonth);root.querySelector('details.fc-month summary')?.focus({preventScroll:true});return}
  if(Object.hasOwn(planLabels,btn.dataset.fcPlanPage)){window.setPage?.(btn.dataset.fcPlanPage);return}
  if(btn.hasAttribute('data-fc-toggle-currency')){
   const group=btn.closest('.fc-money-pair'),wasOpen=group?.classList.contains('fc-picker-open');
   closeCurrencyMenus();
   if(!wasOpen&&group){group.classList.add('fc-picker-open');group.querySelector('.fc-currency-menu').hidden=false;btn.setAttribute('aria-expanded','true')}
   return;
  }
  if(btn.dataset.fcPickCurrency){const group=btn.closest('.fc-money-pair');if(group)chooseCurrency(group,btn.dataset.fcPickCurrency);return}
  if(btn.dataset.fcAdd){
   const type=btn.dataset.fcAdd;if(!['income','expense'].includes(type)||state.customItems.length>=40)return;
   let key;do{key='custom_'+Date.now().toString(36)+'_'+(++customSequence).toString(36)}while(state.customItems.some(x=>x.key===key));
   const count=state.customItems.filter(x=>x.type===(type==='income'?'income':'personal')).length+1;
   state.customItems.push({key,label:(type==='income'?tr('Other income ','其他收入 '):tr('Other expense ','其他支出 '))+count,type:type==='income'?'income':'personal',amount:0,currency:'USD'});
   save();layout();
   el(ROOT)?.querySelector('[data-fc-label="'+key+'"]')?.focus({preventScroll:true});
   return;
  }
  if(btn.dataset.fcRemove){
   const key=btn.dataset.fcRemove;
   if(FIELD[key]?.base){if(!state.disabledBase.includes(key))state.disabledBase.push(key)}
   else{
    state.customItems=state.customItems.filter(x=>x.key!==key);
    for(const store of [state.months,state.monthCurrencies])for(const d of Object.keys(store)){delete store[d][key];if(!Object.keys(store[d]).length)delete store[d]}
   }
   if(key==='salary')state.salaryConfigured=false;
   save();layout();return;
  }
  if(btn.dataset.fcClearMonth){const date=btn.dataset.fcClearMonth;delete state.months[date];delete state.monthCurrencies[date];save();layout();return}
  const action=btn.dataset.fcAction;
  if(action==='reset-day-salary'){
   const d=dailyInfo(state.dailyMonth).selected;const m=state.months[d],cc=state.monthCurrencies[d];
   if(m){delete m.salary;if(!Object.keys(m).length)delete state.months[d]}
   if(cc){delete cc.salary;if(!Object.keys(cc).length)delete state.monthCurrencies[d]}
   save();layout();return;
  }
  if(action==='save'){
   const bad=el(ROOT)?.querySelector('input:invalid');if(bad){bad.reportValidity?.();bad.focus?.({preventScroll:true});return}
   for(const item of state.customItems)if(!item.label.trim()){const input=el(ROOT)?.querySelector('[data-fc-label="'+item.key+'"]');input?.focus();window.mmhVaultMessageV740?.(tr('Enter a name for every custom item.','请为每个自定义项目填写名称。'),tr('Name required','请填写名称'));return}
   if(persist())window.mmhVaultMessageV740?.(tr('Forecast settings saved on this device.','预测设置已保存到当前设备。'),tr('Saved','保存成功'));
   return;
  }
  if(action==='discard'){
   state=getState(activeOwner);dirty=false;layout();return;
  }
  if(action==='refresh'){updateOutputs();return}
  if(action==='export'){exportCSV();return}
  if(action==='reset'){
   if(typeof window.mmhVaultConfirmV740!=='function'||!(await window.mmhVaultConfirmV740(tr('Reset local forecast settings for this account? Real transactions remain unchanged.','确定重置当前账户在本浏览器的预测设置吗？不会改变真实交易。'),tr('Reset forecast','重置资产预测'))))return;
   const previousCurrency=state.viewCurrency;state=defaultState();state.viewCurrency=previousCurrency;persist();layout();
  }
 }
 function resetDailyMonthOnCalendarChange(){const today=monthKey();if(lastDailyCalendar&&today!==lastDailyCalendar&&state)state.dailyMonth='';lastDailyCalendar=today}
 function dateChanged(){syncOwner();resetDailyMonthOnCalendarChange();if(active()){if(lastFirst!==startKey()){layout();return}updateOutputs()}else if(el('dashboard')?.classList.contains('active'))mountDashboardDaily()}
 function stopMidnight(){if(midnightTimer){clearTimeout(midnightTimer);midnightTimer=0}}
 function scheduleMidnight(){stopMidnight();if(!(active()||el('dashboard')?.classList.contains('active'))||document.hidden)return;const now=new Date(),tomorrow=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,0,0,2);midnightTimer=setTimeout(()=>{midnightTimer=0;dateChanged();scheduleMidnight()},Math.max(1000,tomorrow-now))}
 function onVisible(){syncOwner();resetDailyMonthOnCalendarChange();if(active()){layout();scheduleMidnight()}else{stopMidnight();if(el('dashboard')?.classList.contains('active'))mountDashboardDaily()}}
 function init(){
  const root=el(ROOT);if(!root)return;
  watchDashboard();
  root.addEventListener('input',onInput);root.addEventListener('change',onChange);root.addEventListener('click',onClick);
  document.addEventListener('click',e=>{if(!e.target.closest('#'+ROOT+' .fc-money-pair'))closeCurrencyMenus();if(!e.target.closest('#'+ROOT+' .fc-view-picker')){const picker=el('fc-view-picker');if(picker)picker.open=false}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const trigger=root.querySelector('.fc-picker-open .fc-currency-trigger');closeCurrencyMenus();trigger?.focus({preventScroll:true});const picker=el('fc-view-picker');if(picker?.open){picker.open=false;picker.querySelector('summary')?.focus({preventScroll:true})}}});
  for(const name of ['mmhvault:page-visible','mmhvault:config-owner-changed','mmhvault:data-loaded','mmhvault:data-change','mmhvault:cache-restored','mmhvault:market-updated','mmhvault-language-change','languagechange']){
   window.addEventListener(name,()=>{if(active()){if(['mmhvault-language-change','languagechange','mmhvault:config-owner-changed'].includes(name))onVisible();else dateChanged()}else{if(name==='mmhvault:config-owner-changed')syncOwner();if(el('dashboard')?.classList.contains('active')){if(['mmhvault-language-change','languagechange'].includes(name)){el('mmhDailyDashboardV13')?.remove()}watchDashboard();scheduleMidnight()}}},{passive:true});
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMidnight();else onVisible()},{passive:true});
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
  window.addEventListener('pageshow',onVisible,{passive:true});window.addEventListener('focus',()=>{dateChanged();scheduleMidnight()},{passive:true});
  document.addEventListener('click',e=>{if(e.target.closest('#mmhDailyDashboardV13 [data-mmh-open-daily]')){e.preventDefault();window.setPage?.('forecast')}});
  syncOwner();onVisible();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
