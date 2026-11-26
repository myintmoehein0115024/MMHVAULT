/* MMHVAULT Invest Daily Performance V1 | isolated read-only investment analytics.
   Gold daily P/L is intentionally unavailable pending a verified automatic source; no manual entries.
   Does NOT mutate investments, transactions, accounts, balances, or portfolio calculations. */
(()=>{'use strict';
if(window.__mmhInvestDailyV1)return;window.__mmhInvestDailyV1=true;
const el=id=>document.getElementById(id),N=v=>Number(v),safe=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const fmt=(n,dec=2)=>Number(n).toLocaleString(undefined,{minimumFractionDigits:dec,maximumFractionDigits:dec});
const addDays=(k,n)=>{const d=new Date(k+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const todayLocal=()=>{const d=new Date(), t=new Date(d.getTime()-d.getTimezoneOffset()*60000);return t.toISOString().slice(0,10)};
const tzOffset=()=>-new Date().getTimezoneOffset();
const zoneParam=()=>{const m=tzOffset(),s=m<0?'-':'+',a=Math.abs(m);return s+String(Math.floor(a/60)).padStart(2,'0')+':'+String(a%60).padStart(2,'0')};
const zonedKey=ms=>new Date(ms+tzOffset()*60000).toISOString().slice(0,10);
const owns=()=>typeof currentSessionUser!=='undefined'&&currentSessionUser?.id?String(currentSessionUser.id):'';
const lang=()=>{try{const l=String(window.getMMHVAULTLanguage?.()||document.documentElement.lang||'en').toLowerCase();return /^zh/.test(l)?'zh':/^(my|mm)/.test(l)?'my':'en'}catch(_){return 'en'}};
const MY={'Today':'ယနေ့','Yesterday':'မနေ့က','This month':'ယခုလ','Month':'လ','Date':'ရက်စွဲ','All coins':'ဒင်္ဂါးအားလုံး','View day':'နေ့စဉ်ကြည့်ရန်','No quote':'ဈေးနှုန်းမရှိ','days priced':'ရက် ဈေးနှုန်းရရှိ','Daily Crypto P/L':'နေ့စဉ် Crypto အမြတ်/အရှုံး','P/L History':'အမြတ်/အရှုံး မှတ်တမ်း','Asset P/L':'ပိုင်ဆိုင်မှု အမြတ်/အရှုံး','Refresh prices':'ဈေးနှုန်း ပြန်ရယူရန်','About daily P/L':'နေ့စဉ် အမြတ်/အရှုံး အကြောင်း','Missing quote or position data: complete daily P/L cannot be verified.':'ဈေးနှုန်း သို့မဟုတ် ပိုင်ဆိုင်မှုမှတ်တမ်း မပြည့်စုံ၍ အမြတ်/အရှုံးကို အတည်မပြုနိုင်ပါ။','Sign in to see your own investment history.':'ရင်းနှီးမြှုပ်နှံမှု မှတ်တမ်းကြည့်ရန် ဝင်ရောက်ပါ။','Loading price history…':'ဈေးနှုန်းမှတ်တမ်း ရယူနေသည်…','Failed to load history; please retry.':'မှတ်တမ်း ရယူ၍မရပါ။ ထပ်ကြိုးစားပါ။','Some historical crypto quotes unavailable: ':'Crypto ဈေးနှုန်းမှတ်တမ်း အချို့ မရနိုင်ပါ: ','Crypto historical quotes loaded.':'Crypto ဈေးနှုန်းမှတ်တမ်း ရရှိပြီးပါပြီ။','Track Crypto (USD) daily P/L and trade cash flows. Gold is excluded until trustworthy automatic historical pricing is available.':'Crypto (USD) နေ့စဉ် အမြတ်/အရှုံးနှင့် ငွေစီးဆင်းမှု။ ယုံကြည်ရသော သမိုင်းဝင်ဈေးနှုန်း မရမချင်း ရွှေ မပါဝင်ပါ။','Reliable automatic historical Gold (MMK) pricing is not yet available, so manual quote entry and Gold daily P/L have been removed. Existing Gold positions and their portfolio values remain unchanged; old saved quote records are retained.':'ရွှေ (MMK) သမိုင်းဝင်ဈေးနှုန်းကို အလိုအလျောက် အတည်မပြုနိုင်သေး၍ ရွှေ၏ နေ့စဉ်အမြတ်/အရှုံးနှင့် ဈေးနှုန်းကို ကိုယ်တိုင်ထည့်ခြင်း မပါဝင်ပါ။ ရှိပြီးသား ပိုင်ဆိုင်မှု၊ တန်ဖိုးနှင့် ဈေးနှုန်းမှတ်တမ်းများ မပြောင်းလဲပါ။','Crypto daily P/L adjusts for trades and fees using historical exchange bars and fresh quotes. Missing trades or prices show “—”. Gold is excluded from daily P/L here; existing holdings remain unchanged.':'Crypto နေ့စဉ်အမြတ်/အရှုံးတွင် အရောင်းအဝယ်နှင့် အခကြေးငွေများကို ထည့်တွက်ထားသည်။ ဈေးနှုန်း သို့မဟုတ် မှတ်တမ်း မရှိပါက “—” ပြသည်။ ရွှေ မပါဝင်သော်လည်း ရှိပြီးသား ပိုင်ဆိုင်မှုများ မပြောင်းလဲပါ။'};
Object.assign(MY,{'Daily P/L records':'နေ့စဉ် အမြတ်/အရှုံး မှတ်တမ်း','Asset P/L details':'ပိုင်ဆိုင်မှု အမြတ်/အရှုံး အသေးစိတ်','No verified daily P/L':'အတည်ပြုထားသော နေ့စဉ် အမြတ်/အရှုံး မရှိပါ','Daily P/L · USD':'နေ့စဉ် အမြတ်/အရှုံး · USD'});
const T=(zh,en)=>lang()==='zh'?zh:lang()==='my'?(MY[en]||en):en;
const refreshIcon='<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14-5L3 9m0-5v5h5M4 13a8 8 0 0 0 14 5l3-3m0 5v-5h-5"/></svg>';
const infoIcon='<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg>';
const historyIcon='<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>';
const assetIcon='<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>';
let detailPanel='';
Object.assign(MY,{'Close':'ပိတ်ရန်','Daily P/L':'နေ့စဉ် အမြတ်/အရှုံး','Assets':'ပိုင်ဆိုင်မှုများ','More assets':'အခြား ပိုင်ဆိုင်မှုများ','No verified data':'အတည်ပြုထားသော ဒေတာ မရှိပါ'});
const coinMarks={BTC:'₿',ETH:'◆',BNB:'❖',SOL:'≋',TRX:'▽',USDT:'₮'};
const coinMark=sym=>'<span class="idv1-coin-mark" aria-hidden="true">'+safe(Object.prototype.hasOwnProperty.call(coinMarks,sym)?coinMarks[sym]:String(sym).slice(0,1))+'</span>';
const records=()=>Array.isArray(window.investments)?window.investments.filter(x=>x&&['Crypto','Gold'].includes(x.asset)):[];
const accountCrypto=()=>records().filter(x=>x.asset==='Crypto');
const accountGold=()=>records().filter(x=>x.asset==='Gold');
const signedQty=(x)=>{let q=N(x.quantity);if(!Number.isFinite(q))return NaN;const sell=String(x.side||x.trade_type||'').toUpperCase()==='SELL';return sell?-Math.abs(q):q};
const goldQty=(x)=>{let q=N(x.quantity);if(!Number.isFinite(q))return NaN;const sell=String(x.side||x.trade_type||'').toUpperCase()==='SELL';return sell?-Math.abs(q):q};
const tradeDay=x=>String(x.inv_date||'').slice(0,10);
const cashFlow=(x,q)=>{const a=Math.abs(N(x.amount)),fees=Math.abs(N(x.fee)||0)+Math.abs(N(x.other_cost)||0);return !Number.isFinite(a)?NaN:q<0?a-fees:-a-fees};
// Gold positions remain in the original Invest portfolio; only verified Crypto data is used here.
let selection='crypto',daysView=7,selectedDay=todayLocal(),selectedSymbol='',currentOwner='',cryptoCache={at:0,key:'',prices:new Map(),missing:[]},error='',lastRenderToken=0;
const priceOf=(symbol,day,now)=>{
 if(symbol==='USDT')return 1;
 if(day===todayLocal()&&now){const current=(typeof livePrices!=='undefined'?livePrices:window.livePrices)||{},status=(typeof cryptoQuoteStatusV1!=='undefined'?cryptoQuoteStatusV1:window.cryptoQuoteStatusV1||null),v=N(current[symbol]?.price);return status?.available&&Number(status.updatedAt)>0&&Date.now()-Number(status.updatedAt)<300000&&Number.isFinite(v)&&v>0?v:undefined;}
 const m=cryptoCache.prices.get(symbol);return m?m.get(day):undefined;
};
function dailyTotal(rows,day,priceFn){
 const prev=addDays(day,-1),by=new Map();
 for(const x of rows){const sym=x.asset==='Gold'?'GOLD':String(x.symbol||'').toUpperCase().trim();if(!sym)continue;if(!by.has(sym))by.set(sym,[]);by.get(sym).push(x)}
 let total=0,active=0;const parts=[];
 for(const [sym,all] of by){
  let q0=0,q1=0,flow=0,hasHistory=false,dayTrade=false,bad=false;
  for(const x of all){const k=tradeDay(x);if(!/^\d{4}-\d{2}-\d{2}$/.test(k)||k>day)continue;
   const q=x.asset==='Gold'?goldQty(x):signedQty(x),f=cashFlow(x,q);
   if(!Number.isFinite(q)||!Number.isFinite(f)){bad=true;break;}
   hasHistory=true;
   if(k<day)q0+=q;
   q1+=q;
   if(k===day){flow+=f;dayTrade=true}
  }
  if(bad){parts.push({sym,valid:false,reason:'ledger'});return{valid:false,reason:'ledger',parts}}
  if(!hasHistory||(!dayTrade&&Math.abs(q0)<1e-10&&Math.abs(q1)<1e-10))continue;
  active++;
  if(q0< -1e-7||q1< -1e-7){parts.push({sym,valid:false,reason:'negative_position'});return{valid:false,reason:'negative_position',parts}}
  const p0=Math.abs(q0)>1e-10?priceFn(sym,prev,false):0;
  const p1=Math.abs(q1)>1e-10?priceFn(sym,day,true):0;
  if((Math.abs(q0)>1e-10&&!(p0>0))||(Math.abs(q1)>1e-10&&!(p1>0))){parts.push({sym,valid:false,reason:'quote'});return{valid:false,reason:'quote',parts}}
  const pl=q1*p1-q0*p0+flow;
  if(!Number.isFinite(pl)){return{valid:false,reason:'calculation',parts}}
  total+=pl;parts.push({sym,valid:true,pl});
 }
 return active?{valid:true,total,parts,active}:{valid:false,reason:'no_holdings',parts:[],active:0};
}
function cryptoDaily(day,symbol=''){return dailyTotal(symbol?accountCrypto().filter(x=>String(x.symbol||'').toUpperCase().trim()===symbol):accountCrypto(),day,priceOf)}
// Compatibility entry point for older modules: unverified Gold history is never priced as zero.
function goldDaily(){return {valid:false,reason:'automatic_gold_quote_unavailable',parts:[]};}
function money(v,type){if(!v||!v.valid)return'<span class="idv1-missing">—</span>';const x=v.total,cur=type==='gold'?'K ':'$';return`<span class="${x>=0?'idv1-up':'idv1-down'}">${x>=0?'+':'−'}${cur}${fmt(Math.abs(x))}</span>`}
function base(){const host=el('mmhFiveoverview');if(!host)return null;let box=el('mmhInvestDailyV1');if(box)return box;
 box=document.createElement('section');box.id='mmhInvestDailyV1';box.className='idv1-root';box.innerHTML=`<div class="idv1-head"><div><h2>${T('Crypto 每日盈亏','Daily Crypto P/L')}</h2><p hidden>${T('逐日核对 Crypto（USD）的盈亏与买卖资金流，Gold 不参与没有可信历史报价的数据计算。','Track Crypto (USD) daily P/L and trade cash flows. Gold is excluded until trustworthy automatic historical pricing is available.')}</p></div><button type="button" class="idv1-refresh" data-idv-refresh aria-label="${T('刷新行情','Refresh prices')}" title="${T('刷新行情','Refresh prices')}">${refreshIcon}</button></div>

 <div class="idv1-cards" id="idv1Summary"></div><div class="idv1-history-panel"><div class="idv1-controls"><b>${T('盈亏历史','P/L History')}</b><div class="idv1-toolbar"><div class="idv1-period"><button type="button" data-idv-days="7">7D</button><button type="button" data-idv-days="30">30D</button><button type="button" data-idv-days="month">${T('本月','Month')}</button></div><div class="idv1-view-tools"><button type="button" class="idv1-view-icon" data-idv-panel="history" aria-controls="idv1DetailDialog" aria-haspopup="dialog" aria-expanded="false">${historyIcon}</button><button type="button" class="idv1-view-icon" data-idv-panel="assets" aria-controls="idv1DetailDialog" aria-haspopup="dialog" aria-expanded="false">${assetIcon}</button></div></div></div>
 <div id="idv1Trend" class="idv1-trend"></div></div>
 <dialog id="idv1DetailDialog" class="idv1-dialog" aria-labelledby="idv1DialogTitle"><div class="idv1-dialog-head"><h3 id="idv1DialogTitle"></h3><button type="button" data-idv-close autofocus aria-label="${T('关闭','Close')}">×</button></div><div class="idv1-dialog-body"><div id="idv1History" class="idv1-history" hidden></div><div id="idv1Breakdown" class="idv1-breakdown" hidden></div></div></dialog>
 <details class="idv1-info"><summary aria-label="${T('每日盈亏说明','About daily P/L')}" title="${T('每日盈亏说明','About daily P/L')}">${infoIcon}<span class="idv1-info-label">${T('每日盈亏说明','About daily P/L')}</span></summary><p class="idv1-gold-note" id="idv1GoldNotice">${T('Gold 历史金价暂无法自动可靠核实，因此已取消手动录入及 Gold 每日盈亏模块。黄金持仓、市值和累计盈亏仍保留在原有 Invest 总览中；不会删除已有历史金价记录。','Reliable automatic historical Gold (MMK) pricing is not yet available, so manual quote entry and Gold daily P/L have been removed. Existing Gold positions and their portfolio values remain unchanged; old saved quote records are retained.')}</p>
 <p class="idv1-note" id="idv1Note"></p></details><p class="idv1-status" id="idv1Status" aria-live="polite"></p>`;
 const notice=el('mmhFiveOverviewNotice');if(notice)notice.before(box);else host.prepend(box);
 box.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-idv-close')){detailPanel='';draw();}else if(b.dataset.idvPanel){if(!currentOwner)return;detailPanel=b.dataset.idvPanel;draw();}else if(b.dataset.idvDays){daysView=b.dataset.idvDays==='month'?'month':Number(b.dataset.idvDays);const scroller=el('idv1History')?.querySelector('.idv1-table-scroll');if(scroller)scroller.scrollTop=0;draw();}else if(b.dataset.idvDate){const fromChart=b.classList.contains('idv1-chart-hit');selectedDay=b.dataset.idvDate;draw();if(fromChart)el('idv1Trend').querySelector('[data-idv-date="'+selectedDay+'"]')?.focus({preventScroll:true});}else if(b.dataset.idvResetSymbol){selectedSymbol='';draw();}else if(b.dataset.idvSym){selectedSymbol=selectedSymbol===b.dataset.idvSym?'':b.dataset.idvSym;draw();}else if(b.hasAttribute('data-idv-refresh'))load(true);});
 const dialog=el('idv1DetailDialog');
 dialog.addEventListener('close',()=>{if(dialog.open)return;detailPanel='';box.querySelectorAll('[data-idv-panel]').forEach(b=>{b.setAttribute('aria-expanded','false');b.classList.remove('active');});});
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){detailPanel='';draw();}});
 return box;
}
function summary(){const c=el('idv1Summary');if(!c)return;
 const today=todayLocal(),yesterday=addDays(today,-1),monthDays=Array.from({length:Number(today.slice(8,10))},(_,i)=>addDays(today,-i));
 const sum=(list)=>{let total=0,valid=0;for(const d of list){const x=cryptoDaily(d);if(x.valid){valid++;total+=x.total;}else if(x.reason!=='no_holdings')return {valid:false,reason:x.reason};}return valid?{valid:true,total}:{valid:false,reason:'no_holdings'};};
 const a=[{label:T('今日','Today'),val:cryptoDaily(today)},{label:T('昨天','Yesterday'),val:cryptoDaily(yesterday)},{label:T('本月','This month'),val:sum(monthDays)}];
 c.innerHTML=`<div class="idv1-summary-group"><div class="idv1-group-label">Crypto · USD</div><div class="idv1-summary-row">${a.map(x=>`<div class="idv1-stat"><small>${x.label}</small><b>${money(x.val,'crypto')}</b></div>`).join('')}</div></div>`;
}
function trendMarkup(points){
 const vals=points.filter(p=>p.report.valid&&Number.isFinite(p.report.total)).map(p=>p.report.total);
 const low=Math.min(0,...vals),high=Math.max(0,...vals),span=high-low||1,pad=span*.12;
 const min=low-pad,max=high+pad,y=v=>8+(max-v)/(max-min)*104,x=i=>(i+.5)*640/points.length;
 let path='',open=false;const isolated=[];
 points.forEach((p,i)=>{if(!p.report.valid||!Number.isFinite(p.report.total)){open=false;return;}const xx=x(i).toFixed(2),yy=y(p.report.total).toFixed(2);path+=(open?' L':' M')+xx+' '+yy;open=true;if(!points[i-1]?.report.valid&&!points[i+1]?.report.valid)isolated.push('<circle cx="'+xx+'" cy="'+yy+'" r="1.5" class="'+(p.report.total>=0?'idv1-chart-pos':'idv1-chart-neg')+'"/>');});
 const picked=points.find(p=>p.date===selectedDay)||points[points.length-1],zero=y(0)/120*100;
 const levels=[max,(max+min)/2,min,0].sort((a,b)=>b-a).filter((v,i,a)=>!i||Math.abs(y(v)-y(a[i-1]))>9);
 const ticks=levels.map(v=>'<span style="top:'+((y(v)/120)*100).toFixed(2)+'%">'+safe((v<0?'−':'')+'$'+fmt(Math.abs(v),0))+'</span>').join('');
 const grid=levels.filter(v=>v!==0).map(v=>'M0 '+y(v).toFixed(2)+'H640').join(' ');
 const hits=points.map((p,i)=>{const valid=p.report.valid&&Number.isFinite(p.report.total),v=valid?(p.report.total>=0?'+':'−')+'$'+fmt(Math.abs(p.report.total)):'—';return '<button type="button" class="idv1-chart-hit" data-idv-date="'+p.date+'" data-chart-y="'+(valid?(y(p.report.total)/120*100).toFixed(3):'')+'" aria-label="'+safe(p.date+' · '+v)+'" aria-pressed="'+(p.date===selectedDay)+'"></button>';}).join('');
 const labels=[points[0],points[Math.floor((points.length-1)/2)],points[points.length-1]].filter((p,i,a)=>a.indexOf(p)===i).map(p=>'<span>'+safe(p.date.slice(5))+'</span>').join('');
 const readout='<div class="idv1-trend-readout"><b>'+money(picked.report,'crypto')+'</b><span>'+safe(picked.date)+' · '+safe(selectedSymbol||'Crypto')+'</span></div>';
 return '<div class="idv1-trend-meta">'+readout+'<small>'+T('每日盈亏 · USD','Daily P/L · USD')+'</small></div><div class="idv1-plot-wrap"><div class="idv1-plot"><svg aria-hidden="true" viewBox="0 0 640 120" preserveAspectRatio="none"><defs><linearGradient id="idv1LineColor" x1="0%" y1="0%" x2="0%" y2="100%" gradientUnits="userSpaceOnUse"><stop offset="'+zero.toFixed(3)+'%" stop-color="var(--uv-positive)"/><stop offset="'+zero.toFixed(3)+'%" stop-color="var(--uv-negative)"/></linearGradient></defs><path class="idv1-chart-grid" d="'+grid+'"/><path class="idv1-chart-zero" d="M0 '+y(0).toFixed(2)+'H640"/><path class="idv1-chart-line" d="'+path+'"/>'+isolated.join('')+'</svg><div class="idv1-chart-hits">'+hits+'</div><div class="idv1-crosshair" hidden aria-hidden="true"><i class="idv1-cross-x"></i><i class="idv1-cross-y"></i><i class="idv1-cross-dot"></i><span class="idv1-cross-date"></span></div><div class="idv1-tooltip" hidden role="tooltip"></div>'+(!vals.length?'<span class="idv1-chart-empty">'+T('暂无可核实每日盈亏','No verified daily P/L')+'</span>':'')+'</div><div class="idv1-chart-axis">'+ticks+'</div></div><div class="idv1-chart-dates">'+labels+'</div>';
}
function bindTrend(trend,points){
 const plot=trend.querySelector('.idv1-plot'),tip=plot.querySelector('.idv1-tooltip'),cross=plot.querySelector('.idv1-crosshair'),hits=[...plot.querySelectorAll('.idv1-chart-hit')];
 const hide=()=>{tip.hidden=true;cross.hidden=true;};
 const show=hit=>{
  const i=hits.indexOf(hit);if(i<0)return;
  const p=points[i],valid=p.report.valid&&Number.isFinite(p.report.total),px=(i+.5)/points.length*100,py=valid?Number(hit.dataset.chartY):50;
  const parts=valid?p.report.parts.filter(q=>q.valid&&Number.isFinite(q.pl)).sort((a,b)=>Math.abs(b.pl)-Math.abs(a.pl)):[];
  const row=(label,value)=>'<div class="idv1-tip-row"><span>'+label+'</span><b>'+value+'</b></div>';
  tip.innerHTML='<strong>'+safe(p.date)+'</strong>'+row(T('每日盈亏','Daily P/L'),money(p.report,'crypto'))+(valid?row(T('资产数','Assets'),String(parts.length))+parts.slice(0,4).map(q=>row(safe(q.sym),money({valid:true,total:q.pl},'crypto'))).join('')+(parts.length>4?row(T('其他资产','More assets'),String(parts.length-4)):''):'<small>'+T('暂无可核实数据','No verified data')+'</small>');
  cross.style.setProperty('--cross-x',px+'%');cross.style.setProperty('--cross-y',py+'%');cross.classList.toggle('idv1-cross-missing',!valid);cross.querySelector('.idv1-cross-date').textContent=p.date;
  cross.hidden=false;tip.hidden=false;
  const w=plot.clientWidth,h=plot.clientHeight,tw=tip.offsetWidth,th=tip.offsetHeight,left=px*w/100;
  tip.style.left=Math.max(0,Math.min(w-tw,left+12+tw<=w?left+12:left-tw-12))+'px';
  tip.style.top=Math.max(0,Math.min(h-th,py*h/100-th/2))+'px';
 };
 plot.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const hit=e.target.closest('.idv1-chart-hit');if(hit)show(hit);});
 plot.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')hide();});
 plot.addEventListener('focusin',e=>{const hit=e.target.closest('.idv1-chart-hit');if(hit)show(hit);});
 plot.addEventListener('focusout',e=>{if(!plot.contains(e.relatedTarget))hide();});
 plot.addEventListener('keydown',e=>{if(e.key==='Escape'){hide();return;}if(e.key==='ArrowLeft'||e.key==='ArrowRight'){const i=hits.indexOf(e.target);if(i>=0){e.preventDefault();hits[Math.max(0,Math.min(hits.length-1,i+(e.key==='ArrowLeft'?-1:1)))].focus({preventScroll:true});}}});
}
function draw(){const root=base();if(!root)return;
 const locale=[['.idv1-head h2','Crypto 每日盈亏','Daily Crypto P/L'],['.idv1-head p','逐日核对 Crypto（USD）的盈亏与买卖资金流，Gold 不参与没有可信历史报价的数据计算。','Track Crypto (USD) daily P/L and trade cash flows. Gold is excluded until trustworthy automatic historical pricing is available.'],['.idv1-info-label','每日盈亏说明','About daily P/L'],['.idv1-controls>b','盈亏历史','P/L History'],['[data-idv-days=month]','本月','Month'],['#idv1GoldNotice','Gold 历史金价暂无法自动可靠核实，因此已取消手动录入及 Gold 每日盈亏模块。黄金持仓、市值和累计盈亏仍保留在原有 Invest 总览中；不会删除已有历史金价记录。','Reliable automatic historical Gold (MMK) pricing is not yet available, so manual quote entry and Gold daily P/L have been removed. Existing Gold positions and their portfolio values remain unchanged; old saved quote records are retained.']];
 for(const [selector,zh,en] of locale){const target=root.querySelector(selector);if(target)target.textContent=T(zh,en)}
 for(const [selector,zh,en] of [['[data-idv-refresh]','刷新行情','Refresh prices'],['.idv1-info summary','每日盈亏说明','About daily P/L']]){const b=root.querySelector(selector);if(b){b.title=T(zh,en);b.setAttribute('aria-label',T(zh,en));}}
 for(const [mode,zh,en] of [['history','每日盈亏记录','Daily P/L records'],['assets','币种盈亏明细','Asset P/L details']]){const b=root.querySelector('[data-idv-panel="'+mode+'"]');b.title=T(zh,en);b.setAttribute('aria-label',T(zh,en));b.setAttribute('aria-expanded',String(detailPanel===mode));b.classList.toggle('active',detailPanel===mode);}
 const dialog=el('idv1DetailDialog');el('idv1History').hidden=detailPanel!=='history';el('idv1Breakdown').hidden=detailPanel!=='assets';
 el('idv1DialogTitle').textContent=detailPanel==='history'?T('每日盈亏记录','Daily P/L records'):T('币种盈亏明细','Asset P/L details');
 dialog.querySelector('[data-idv-close]').setAttribute('aria-label',T('关闭','Close'));
 if((!currentOwner||!detailPanel)&&dialog.open)dialog.close();
 root.querySelectorAll('[data-idv-days]').forEach(b=>{const active=String(daysView)===b.dataset.idvDays;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 if(!currentOwner){el('idv1Status').hidden=true;el('idv1Summary').innerHTML='';el('idv1Breakdown').innerHTML='';el('idv1History').replaceChildren();el('idv1Trend').textContent=T('请先登录以查看自己的投资记录。','Sign in to see your own investment history.');return;}
 summary();const today=todayLocal(),count=daysView==='month'?Number(today.slice(8,10)):daysView;
 const dates=Array.from({length:count},(_,i)=>addDays(today,-count+1+i));
 if(!dates.includes(selectedDay))selectedDay=today;
 const points=dates.map(date=>({date,report:cryptoDaily(date,selectedSymbol||'')}));
 const trend=el('idv1Trend'),focusDate=trend.contains(document.activeElement)?document.activeElement.dataset.idvDate:'';
 trend.innerHTML=trendMarkup(points);bindTrend(trend,points);if(focusDate)trend.querySelector('[data-idv-date="'+focusDate+'"]')?.focus({preventScroll:true});
 const rows=[...points].reverse().map(({date,report:cr})=>{return `<tr class="${date===selectedDay?'idv1-highlight':''}"><td><button type="button" class="idv1-date-link" data-idv-date="${date}" aria-label="${T('查看这一天','View day')} ${date}" aria-pressed="${date===selectedDay}">${date}</button></td><td>${money(cr,'crypto')}</td></tr>`;});
 const history=el('idv1History'), previousScroll=history.querySelector('.idv1-table-scroll')?.scrollTop||0;
 history.innerHTML=`<div class="idv1-table-scroll"><table><thead><tr><th>${T('日期','Date')}</th><th>${selectedSymbol?safe(selectedSymbol):'Crypto'} · USD</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
 history.querySelector('.idv1-table-scroll').scrollTop=previousScroll;
 const breakdown=el('idv1Breakdown'),day=selectedDay;
 let sections=[];
 const addBreakdown=(kind)=>{const report=kind==='crypto'?cryptoDaily(day,selectedSymbol||''):goldDaily(day);
  const symbolOptions=kind==='crypto'?[...new Set(accountCrypto().map(x=>String(x.symbol||'').toUpperCase().trim()).filter(Boolean))].sort():[];
  const chips=kind==='crypto'?`<div class="idv1-symbol-filter"><button type="button" data-idv-reset-symbol="1" aria-pressed="${!selectedSymbol}" class="${!selectedSymbol?'active':''}" ${!selectedSymbol?'disabled':''}>${T('全部币种','All coins')}</button>${symbolOptions.map(sym=>`<button type="button" data-idv-sym="${safe(sym)}" aria-pressed="${selectedSymbol===sym}" class="${selectedSymbol===sym?'active':''}">${coinMark(sym)}${safe(sym)}</button>`).join('')}</div>`:'';
  if(!report.valid){sections.push(`<div class="idv1-asset-section"><strong class="idv1-asset-total">${kind==='crypto'?(selectedSymbol?safe(selectedSymbol)+' · USD':'Crypto · USD'):'Gold · MMK'} <span>${money(report,kind)}</span></strong>${chips}<p class="idv1-verify">${T('该日行情或持仓记录不足，不能可靠计算完整盈亏。','Missing quote or position data: complete daily P/L cannot be verified.')}</p></div>`);return;}
  const parts=report.parts.filter(x=>x.valid&&(!selectedSymbol||kind!=='crypto'||x.sym===selectedSymbol));
  sections.push(`<div class="idv1-asset-section"><strong class="idv1-asset-total">${kind==='crypto'?(selectedSymbol?safe(selectedSymbol)+' · USD':'Crypto · USD'):'Gold · MMK'} <span>${money(report,kind)}</span></strong>${chips}<div class="idv1-break-grid">${parts.map(x=>`<div class="idv1-break-card"><b>${coinMark(x.sym)}${safe(x.sym)}</b>${money({valid:true,total:x.pl},kind)}</div>`).join('')}</div></div>`);
 };
 addBreakdown('crypto');
 breakdown.innerHTML=`<div class="idv1-break-head"><h3>${T('币种盈亏','Asset P/L')}</h3><time datetime="${safe(selectedDay)}">${safe(selectedDay)}</time></div>${sections.join('')}`;
 el('idv1Note').textContent=T('Crypto 每日盈亏使用买卖现金流和手续费修正，并以交易所历史日线及最新报价为参考。缺少行情或交易金额时显示「—」。Gold 未纳入此页的每日盈亏统计；原有持仓信息不受影响。','Crypto daily P/L adjusts for trades and fees using historical exchange bars and fresh quotes. Missing trades or prices show “—”. Gold is excluded from daily P/L here; existing holdings remain unchanged.');
 const s=el('idv1Status');s.textContent=error||'';s.hidden=!error;
 if(detailPanel&&currentOwner&&!dialog.open)dialog.showModal();
}
async function loadCrypto(owner,force){const symbols=[...new Set(accountCrypto().map(x=>String(x.symbol||'').toUpperCase()).filter(x=>/^[A-Z0-9]{2,12}$/.test(x)))];
 const key=zoneParam()+'|'+symbols.sort().join('|');if(!force&&Date.now()-cryptoCache.at<300000&&cryptoCache.key===key)return;
 const result=new Map(),missing=[];
 await Promise.all(symbols.map(async s=>{if(s==='USDT')return;
 let success=false;
 for(const url of ['https://data-api.binance.vision/api/v3/klines','https://api.binance.com/api/v3/klines']){
  try{const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),9500);let response;
   try{response=await fetch(url+'?symbol='+encodeURIComponent(s+'USDT')+'&interval=1d&limit=65&timeZone='+encodeURIComponent(zoneParam()),{signal:ctrl.signal,cache:'no-store'});}finally{clearTimeout(timeout)}
   if(!response.ok)continue;const data=await response.json();if(!Array.isArray(data)||!data.length)continue;
   const map=new Map();for(const item of data){if(!Array.isArray(item)||item.length<5)continue;const p=N(item[4]),date=zonedKey(N(item[0]));if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&p>0)map.set(date,p)}
   if(map.size>=2){result.set(s,map);success=true;break;}
  }catch(_e){}
 }
 if(!success)missing.push(s);
 }));
 if(owner!==currentOwner)return;
 cryptoCache={at:Date.now(),key,prices:result,missing};if(missing.length)error=T('部分 Crypto 历史价格不可用：','Some historical crypto quotes unavailable: ')+missing.join(', ');
}
async function load(force=false){const box=base();if(!box)return;const owner=owns();if(!owner){currentOwner='';cryptoCache={at:0,key:'',prices:new Map(),missing:[]};selectedSymbol='';detailPanel='';error='';draw();return}
 if(currentOwner!==owner){currentOwner=owner;cryptoCache={at:0,key:'',prices:new Map(),missing:[]};selectedSymbol='';detailPanel='';error='';['idv1Summary','idv1Breakdown','idv1History','idv1Trend'].forEach(id=>{const target=el(id);if(target)target.replaceChildren();});}
 const token=++lastRenderToken;
 el('idv1Status').hidden=false;el('idv1Status').textContent=T('正在加载历史报价…','Loading price history…');
 try{error='';await loadCrypto(owner,force);}catch(err){error=T('历史数据加载失败，请重试。','Failed to load history; please retry.')}
 if(token===lastRenderToken&&owner===currentOwner){draw();window.dispatchEvent(new CustomEvent('mmhvault:invest-daily-ready',{detail:{owner}}));}
}
let timer=0;function schedule(delay=120){clearTimeout(timer);timer=setTimeout(()=>{const root=el('invest');if(root&&root.classList.contains('active'))load(false);},delay)};
['mmhvault:data-loaded','mmhvault:cache-restored','mmhvault:market-updated','languagechange','mmhvault-language-change'].forEach(ev=>window.addEventListener(ev,()=>schedule(350),{passive:true}));
window.addEventListener('mmhvault:page-visible',e=>{if((e?.detail?.page||'')==='invest')schedule(100)},{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(500)},{passive:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{base();schedule(150)},{once:true});else{base();schedule(150)}
// Read-only snapshot for isolated position-analysis UI; never returns database credentials.
function guidanceSnapshot(){
 const quoteStatus=(typeof cryptoQuoteStatusV1!=='undefined'?cryptoQuoteStatusV1:window.cryptoQuoteStatusV1)||{};
 const live=(typeof livePrices!=='undefined'?livePrices:window.livePrices)||{};
 return {
  owner:currentOwner,
  fetchedAt:cryptoCache.at,
  today:todayLocal(),
  quotedAt:Number(quoteStatus.updatedAt)||0,
  quoteAvailable:quoteStatus.available===true,
  quoteSource:String(quoteStatus.source||''),
  quotes:Object.fromEntries([...cryptoCache.prices].map(([s,map])=>[s,Object.fromEntries([...map])])),
  live:Object.fromEntries(Object.entries(live).map(([s,val])=>[s,{price:Number(val?.price)||0}])),
  holdings:records().filter(x=>x.user_id==null||String(x.user_id)===currentOwner).map(x=>({asset:x.asset,symbol:x.symbol,quantity:x.quantity,inv_date:x.inv_date,id:x.id})),
  goldQuotes:[], // Gold remains in portfolio; unreliable/manual historical quotes no longer feed guidance.
  quoteZone:zoneParam(),
 };
}
window.mmhInvestDailyV1={dailyTotal,cryptoDaily,goldDaily,load,draw,priceOf,guidanceSnapshot};
})();
