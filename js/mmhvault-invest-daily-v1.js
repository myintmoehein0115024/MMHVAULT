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
const lang=()=>{try{return window.getMMHVAULTLanguage?.()==='zh'||document.documentElement.lang?.toLowerCase().startsWith('zh')}catch(_){return false}};
const T=(zh,en)=>lang()?zh:en;
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
 box=document.createElement('section');box.id='mmhInvestDailyV1';box.className='idv1-root';box.innerHTML=`<div class="idv1-head"><div><div class="idv1-kicker">DAILY PERFORMANCE</div><h2>${T('Crypto 每日投资盈亏','Daily Crypto Investment P/L')}</h2><p>${T('逐日核对 Crypto（USD）的盈亏与买卖资金流，Gold 不参与没有可信历史报价的数据计算。','Track Crypto (USD) daily P/L and trade cash flows. Gold is excluded until trustworthy automatic historical pricing is available.')}</p></div><button type="button" class="idv1-refresh" data-idv-refresh>${T('刷新行情','Refresh prices')}</button></div>

 <div class="idv1-cards" id="idv1Summary"></div><div class="idv1-controls"><b>${T('每日盈亏历史','Daily P/L history')}</b><div class="idv1-period"><button type="button" data-idv-days="7">7D</button><button type="button" data-idv-days="30">30D</button><button type="button" data-idv-days="month">${T('本月','Month')}</button></div></div>
 <div id="idv1Trend" class="idv1-trends" aria-label="Daily profit and loss trend"></div><div id="idv1History" class="idv1-history"></div><div id="idv1Breakdown" class="idv1-breakdown"></div>
 <p class="idv1-gold-note" id="idv1GoldNotice">${T('Gold 历史金价暂无法自动可靠核实，因此已取消手动录入及 Gold 每日盈亏模块。黄金持仓、市值和累计盈亏仍保留在原有 Invest 总览中；不会删除已有历史金价记录。','Reliable automatic historical Gold (MMK) pricing is not yet available, so manual quote entry and Gold daily P/L have been removed. Existing Gold positions and their portfolio values remain unchanged; old saved quote records are retained.')}</p>
 <p class="idv1-note" id="idv1Note"></p><p class="idv1-status" id="idv1Status" aria-live="polite"></p>`;
 const notice=el('mmhFiveOverviewNotice');if(notice)notice.before(box);else host.prepend(box);
 box.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.idvDays){daysView=b.dataset.idvDays==='month'?'month':Number(b.dataset.idvDays);draw();}else if(b.dataset.idvDate){selectedDay=b.dataset.idvDate;draw();}else if(b.dataset.idvResetSymbol){selectedSymbol='';draw();}else if(b.dataset.idvSym){selectedSymbol=selectedSymbol===b.dataset.idvSym?'':b.dataset.idvSym;draw();}else if(b.hasAttribute('data-idv-refresh'))load(true);});
 return box;
}
function summary(){const c=el('idv1Summary');if(!c)return;
 const today=todayLocal(),yesterday=addDays(today,-1),monthDays=Array.from({length:Number(today.slice(8,10))},(_,i)=>addDays(today,-i));
 const sum=(list)=>{let total=0,valid=0;for(const d of list){const x=cryptoDaily(d);if(x.valid){valid++;total+=x.total;}else if(x.reason!=='no_holdings')return {valid:false,reason:x.reason};}return valid?{valid:true,total}:{valid:false,reason:'no_holdings'};};
 const a=[{label:T('今日','Today'),val:cryptoDaily(today)},{label:T('昨天','Yesterday'),val:cryptoDaily(yesterday)},{label:T('本月','This month'),val:sum(monthDays)}];
 c.innerHTML=`<div class="idv1-summary-group"><div class="idv1-group-label">Crypto · USD</div><div class="idv1-summary-row">${a.map(x=>`<div class="idv1-stat"><small>${x.label}</small><b>${money(x.val,'crypto')}</b></div>`).join('')}</div></div>`;
}
function trendDatum(kind,day){return cryptoDaily(day,selectedSymbol||'')}
function signedValue(v,type){if(!v?.valid)return '—';return (v.total>=0?'+':'−')+(type==='gold'?'K ':'$')+fmt(Math.abs(v.total));}
function renderTrend(kind,dates){
 const data=dates.map(d=>({day:d,result:trendDatum(kind,d)})),valid=data.filter(x=>x.result.valid);
 const magnitude=Math.max(1,...valid.map(x=>Math.abs(x.result.total)));
 const selected=selectedDay;
 const title=kind==='crypto'?'Crypto · USD':'Gold · MMK';
 const label=selectedSymbol&&kind==='crypto'?' · '+safe(selectedSymbol):'';
 const bars=data.map(({day,result})=>{
  const complete=result.valid,height=complete?Math.max(3,Math.min(100,Math.abs(result.total)/magnitude*100)):0;
  const caption=day.slice(5),txt=complete?signedValue(result,kind):T('缺少报价','No quote');
  const type=complete?(result.total>=0?'positive':'negative'):'missing';
  return `<button type="button" class="idv1-day ${type}${selected===day?' selected':''}" data-idv-date="${day}" title="${safe(day+' · '+txt)}" aria-label="${safe(day+' '+txt)}" aria-pressed="${selected===day}"><span class="idv1-day-value">${complete? (result.total>=0?'+':'−')+fmt(Math.abs(result.total),2):'—'}</span><span class="idv1-bar-track"><span class="idv1-bar" style="height:${height}%"></span></span><small>${caption}</small></button>`;
 }).join('');
 return `<div class="idv1-chart-group"><div class="idv1-chart-head"><strong>${title}${label}</strong><small>${valid.length}/${data.length} ${T('天有可核实报价','days priced')}</small></div><div class="idv1-chart-scroll"><div class="idv1-chart-bars">${bars}</div></div></div>`;
}
function draw(){const root=base();if(!root)return;
 const locale=[['.idv1-head h2','Crypto 每日投资盈亏','Daily Crypto Investment P/L'],['.idv1-head p','逐日核对 Crypto（USD）的盈亏与买卖资金流，Gold 不参与没有可信历史报价的数据计算。','Track Crypto (USD) daily P/L and trade cash flows. Gold is excluded until trustworthy automatic historical pricing is available.'],['[data-idv-refresh]','刷新行情','Refresh prices'],['.idv1-controls>b','每日盈亏历史','Daily P/L history'],['[data-idv-days=month]','本月','Month'],['#idv1GoldNotice','Gold 历史金价暂无法自动可靠核实，因此已取消手动录入及 Gold 每日盈亏模块。黄金持仓、市值和累计盈亏仍保留在原有 Invest 总览中；不会删除已有历史金价记录。','Reliable automatic historical Gold (MMK) pricing is not yet available, so manual quote entry and Gold daily P/L have been removed. Existing Gold positions and their portfolio values remain unchanged; old saved quote records are retained.']];
 for(const [selector,zh,en] of locale){const target=root.querySelector(selector);if(target)target.textContent=T(zh,en)}
 root.querySelectorAll('[data-idv-days]').forEach(b=>b.classList.toggle('active',String(daysView)===b.dataset.idvDays));
 if(!currentOwner){el('idv1Summary').innerHTML='';el('idv1Trend').innerHTML='';el('idv1Breakdown').innerHTML='';el('idv1History').textContent=T('请先登录以查看自己的投资记录。','Sign in to see your own investment history.');return;}
 summary();const today=todayLocal(),count=daysView==='month'?Number(today.slice(8,10)):daysView;
 const dates=Array.from({length:count},(_,i)=>addDays(today,-count+1+i));
 if(!dates.includes(selectedDay))selectedDay=today;
 el('idv1Trend').innerHTML=renderTrend('crypto',dates);
 const rows=[...dates].reverse().map(date=>{const cr=cryptoDaily(date);return `<tr class="${date===selectedDay?'idv1-highlight':''}"><td><button type="button" class="idv1-date-link" data-idv-date="${date}" aria-label="${T('查看这一天','View day')} ${date}">${date}</button></td><td>${money(cr,'crypto')}</td></tr>`;});
 el('idv1History').innerHTML=`<div class="idv1-table-scroll"><table><thead><tr><th>${T('日期','Date')}</th><th>Crypto · USD</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
 const breakdown=el('idv1Breakdown'),day=selectedDay;
 let sections=[];
 const addBreakdown=(kind)=>{const report=kind==='crypto'?cryptoDaily(day):goldDaily(day);
  const symbolOptions=kind==='crypto'?[...new Set(accountCrypto().map(x=>String(x.symbol||'').toUpperCase().trim()).filter(Boolean))].sort():[];
  const chips=kind==='crypto'?`<div class="idv1-symbol-filter"><button type="button" data-idv-reset-symbol="1" class="${!selectedSymbol?'active':''}" ${!selectedSymbol?'disabled':''}>${T('全部币种','All coins')}</button>${symbolOptions.map(sym=>`<button type="button" data-idv-sym="${safe(sym)}" class="${selectedSymbol===sym?'active':''}">${safe(sym)}</button>`).join('')}</div>`:'';
  if(!report.valid){sections.push(`<div class="idv1-asset-section"><strong>${kind==='crypto'?'Crypto · USD':'Gold · MMK'}</strong>${chips}<p class="idv1-verify">${T('该日行情或持仓记录不足，不能可靠计算完整盈亏。','Missing quote or position data: complete daily P/L cannot be verified.')}</p></div>`);return;}
  const parts=report.parts.filter(x=>x.valid&&(!selectedSymbol||kind!=='crypto'||x.sym===selectedSymbol));
  sections.push(`<div class="idv1-asset-section"><strong>${kind==='crypto'?'Crypto · USD':'Gold · MMK'} · ${signedValue(report,kind)}</strong>${chips}<div class="idv1-break-grid">${parts.map(x=>`<div class="idv1-break-card"><b>${safe(x.sym)}</b>${money({valid:true,total:x.pl},kind)}</div>`).join('')}</div></div>`);
 };
 addBreakdown('crypto');
 breakdown.innerHTML=`<div class="idv1-break-head"><h3>${T('选定日期的币种盈亏','Daily asset breakdown')} · ${safe(selectedDay)}</h3><span>${T('点击走势图某一天查看详情','Select a bar to inspect the day')}</span></div>${sections.join('')}`;
 root.querySelectorAll('.idv1-chart-scroll').forEach(scroller=>{const active=scroller.querySelector('.idv1-day.selected');if(!active)return;const left=active.offsetLeft-scroller.clientWidth/2+active.clientWidth/2;scroller.scrollLeft=Math.max(0,left);});
 el('idv1Note').textContent=T('Crypto 每日盈亏使用买卖现金流和手续费修正，并以交易所历史日线及最新报价为参考。缺少行情或交易金额时显示「—」。Gold 未纳入此页的每日盈亏统计；原有持仓信息不受影响。','Crypto daily P/L adjusts for trades and fees using historical exchange bars and fresh quotes. Missing trades or prices show “—”. Gold is excluded from daily P/L here; existing holdings remain unchanged.');
 const s=el('idv1Status');s.textContent=error|| (cryptoCache.at?T('Crypto 历史行情：已读取。','Crypto historical quotes loaded.'):'');
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
async function load(force=false){const box=base();if(!box)return;const owner=owns();if(!owner){currentOwner='';cryptoCache={at:0,key:'',prices:new Map(),missing:[]};selectedSymbol='';error='';draw();return}
 if(currentOwner!==owner){currentOwner=owner;cryptoCache={at:0,key:'',prices:new Map(),missing:[]};selectedSymbol='';error='';['idv1Summary','idv1Trend','idv1Breakdown','idv1History'].forEach(id=>{const target=el(id);if(target)target.replaceChildren();});}
 const token=++lastRenderToken;
 el('idv1Status').textContent=T('正在加载历史报价…','Loading price history…');
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
