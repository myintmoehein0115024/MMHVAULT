/* MMHVAULT Invest Daily Performance V1 | isolated read-only investment analytics.
   Gold close observations are intentionally manual and stored separately.
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
const L={ALL:'all',CRYPTO:'crypto',GOLD:'gold'};
let selection='all',daysView=7,selectedDay=todayLocal(),selectedSymbol='',currentOwner='',cryptoCache={at:0,key:'',prices:new Map(),missing:[],sources:{}},goldRows=[],error='',inFlight=false,lastRenderToken=0;
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
function goldDaily(day){const map=new Map(goldRows.map(x=>[x.quote_date,N(x.mmk_per_kyattha)]));
 return dailyTotal(accountGold(),day,(s,date,isCurrent)=>{
  if(date===todayLocal()&&isCurrent){const state=(typeof goldMarketState!=='undefined'?goldMarketState:window.goldMarketState),p=N(state?.pricePerKyattha);if(!state?.stale&&Number.isFinite(new Date(state?.updatedAt).getTime())&&Date.now()-new Date(state.updatedAt).getTime()<300000&&p>0)return p;}
  return map.get(date);
 });
}
function money(v,type){if(!v||!v.valid)return'<span class="idv1-missing">—</span>';const x=v.total,cur=type==='gold'?'K ':'$';return`<span class="${x>=0?'idv1-up':'idv1-down'}">${x>=0?'+':'−'}${cur}${fmt(Math.abs(x))}</span>`}
function base(){const host=el('mmhFiveoverview');if(!host)return null;let box=el('mmhInvestDailyV1');if(box)return box;
 box=document.createElement('section');box.id='mmhInvestDailyV1';box.className='idv1-root';box.innerHTML=`<div class="idv1-head"><div><div class="idv1-kicker">DAILY PERFORMANCE</div><h2>${T('每日投资盈亏','Daily Investment P/L')}</h2><p>${T('区分每天的价格变动和累计收益。Crypto（USD）与 Gold（MMK）分别统计。','See daily change separately from cumulative gains. Crypto (USD) and Gold (MMK) are kept separate.')}</p></div><button type="button" class="idv1-refresh" data-idv-refresh>${T('刷新行情','Refresh prices')}</button></div>
 <div class="idv1-tabs" role="group" aria-label="Investment category"><button type="button" data-idv-tab="all">${T('全部投资','All assets')}</button><button type="button" data-idv-tab="crypto">Crypto</button><button type="button" data-idv-tab="gold">Gold</button></div>
 <div class="idv1-cards" id="idv1Summary"></div><div class="idv1-controls"><b>${T('每日盈亏历史','Daily P/L history')}</b><div class="idv1-period"><button type="button" data-idv-days="7">7D</button><button type="button" data-idv-days="30">30D</button><button type="button" data-idv-days="month">${T('本月','Month')}</button></div></div>
 <div id="idv1Trend" class="idv1-trends" aria-label="Daily profit and loss trend"></div><div id="idv1History" class="idv1-history"></div><div id="idv1Breakdown" class="idv1-breakdown"></div>
 <div class="idv1-gold-form" id="idv1GoldForm"><div><strong>${T('Gold 历史金价记录','Gold historical quote log')}</strong><p>${T('历史 MMK 金价没有可靠的自动日线来源。可主动补录每日每缅甸一甲金价，之后才能计算对应日期的黄金盈亏。记录的是手动观察价，并非官方结算。','Reliable daily MMK gold closes are unavailable. You can log observed MMK per kyattha prices to enable historical comparisons. These are manually observed, not official closes.')}</p></div><form id="idv1GoldQuoteForm"><label>${T('日期','Date')}<input type="date" name="date" required></label><label>${T('每甲金价 (MMK)','MMK / kyattha')}<input name="price" type="number" min="1" max="999999999999" step="0.01" placeholder="K" required></label><button type="submit">${T('记录金价','Save quote')}</button></form><span id="idv1GoldMessage" role="status"></span><div id="idv1RecentGoldQuotes" class="idv1-recent-quotes"></div></div>
 <p class="idv1-note" id="idv1Note"></p><p class="idv1-status" id="idv1Status" aria-live="polite"></p>`;
 const notice=el('mmhFiveOverviewNotice');if(notice)notice.before(box);else host.prepend(box);
 box.querySelector('input[name=date]').value=todayLocal();
 box.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.idvTab){selection=b.dataset.idvTab;selectedSymbol='';draw();}else if(b.dataset.idvDays){daysView=b.dataset.idvDays==='month'?'month':Number(b.dataset.idvDays);draw();}else if(b.dataset.idvDate){selectedDay=b.dataset.idvDate;draw();}else if(b.dataset.idvResetSymbol){selectedSymbol='';draw();}else if(b.dataset.idvSym){selectedSymbol=selectedSymbol===b.dataset.idvSym?'':b.dataset.idvSym;draw();}else if(b.hasAttribute('data-idv-refresh'))load(true);});
 box.querySelector('form').addEventListener('submit',saveGold);
 return box;
}
function summary(days){const c=el('idv1Summary');if(!c)return;
 const today=todayLocal(),yesterday=addDays(today,-1),monthDays=Array.from({length:Number(today.slice(8,10))},(_,i)=>addDays(today,-i));
 const sum=(kind,list)=>{let total=0,valid=0;for(const d of list){const x=kind==='crypto'?cryptoDaily(d):goldDaily(d);if(x.valid){valid++;total+=x.total;}else if(x.reason!=='no_holdings')return {valid:false,reason:x.reason};}return valid?{valid:true,total}:{valid:false,reason:'no_holdings'}};
 const group=kind=>{const a=[{label:T('今日','Today'),val:kind==='crypto'?cryptoDaily(today):goldDaily(today)},{label:T('昨天','Yesterday'),val:kind==='crypto'?cryptoDaily(yesterday):goldDaily(yesterday)},{label:T('本月','This month'),val:sum(kind,monthDays)}];return `<div class="idv1-summary-group"><div class="idv1-group-label">${kind==='crypto'?'Crypto · USD':'Gold · MMK'}</div><div class="idv1-summary-row">${a.map(x=>`<div class="idv1-stat"><small>${x.label}</small><b>${money(x.val,kind)}</b></div>`).join('')}</div></div>`};
 c.innerHTML=(selection==='all'||selection==='crypto'?group('crypto'):'')+(selection==='all'||selection==='gold'?group('gold'):'');
}
function trendDatum(kind,day){return kind==='crypto'?cryptoDaily(day,selectedSymbol||''):goldDaily(day)}
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
 const locale=[['.idv1-head h2','每日投资盈亏','Daily Investment P/L'],['.idv1-head p','区分每天的价格变动和累计收益。Crypto（USD）与 Gold（MMK）分别统计。','See daily change separately from cumulative gains. Crypto (USD) and Gold (MMK) are kept separate.'],['[data-idv-refresh]','刷新行情','Refresh prices'],['[data-idv-tab=all]','全部投资','All assets'],['.idv1-controls>b','每日盈亏历史','Daily P/L history'],['[data-idv-days=month]','本月','Month'],['.idv1-gold-form strong','Gold 历史金价记录','Gold historical quote log'],['.idv1-gold-form p','历史 MMK 金价没有可靠的自动日线来源。可主动补录每日每缅甸一甲金价，之后才能计算对应日期的黄金盈亏。记录的是手动观察价，并非官方结算。','Reliable daily MMK gold closes are unavailable. You can log observed MMK per kyattha prices to enable historical comparisons. These are manually observed, not official closes.'],['#idv1GoldQuoteForm button[type=submit]','记录金价','Save quote']];
 for(const [selector,zh,en] of locale){const target=root.querySelector(selector);if(target)target.textContent=T(zh,en)}
 const labels=root.querySelectorAll('#idv1GoldQuoteForm label');if(labels[0]?.firstChild?.nodeType===3)labels[0].firstChild.nodeValue=T('日期','Date');if(labels[1]?.firstChild?.nodeType===3)labels[1].firstChild.nodeValue=T('每甲金价 (MMK)','MMK / kyattha');
 root.querySelectorAll('[data-idv-tab]').forEach(b=>b.classList.toggle('active',b.dataset.idvTab===selection));root.querySelectorAll('[data-idv-days]').forEach(b=>b.classList.toggle('active',String(daysView)===b.dataset.idvDays));
 root.querySelector('#idv1GoldForm').style.display=selection==='crypto'?'none':'';
 if(!currentOwner){el('idv1Summary').innerHTML='';el('idv1Trend').innerHTML='';el('idv1Breakdown').innerHTML='';el('idv1RecentGoldQuotes').innerHTML='';el('idv1History').textContent=T('请先登录以查看自己的投资记录。','Sign in to see your own investment history.');return;}
 summary();const today=todayLocal(),count=daysView==='month'?Number(today.slice(8,10)):daysView;
 const dates=Array.from({length:count},(_,i)=>addDays(today,-count+1+i));
 if(!dates.includes(selectedDay))selectedDay=today;
 el('idv1Trend').innerHTML=(selection==='all'||selection==='crypto'?renderTrend('crypto',dates):'')+(selection==='all'||selection==='gold'?renderTrend('gold',dates):'');
 const rows=[...dates].reverse().map(date=>{const cr=cryptoDaily(date),gd=goldDaily(date),detail=selection==='crypto'?`<td>${money(cr,'crypto')}</td>`:selection==='gold'?`<td>${money(gd,'gold')}</td>`:`<td>${money(cr,'crypto')}</td><td>${money(gd,'gold')}</td>`;
 return `<tr class="${date===selectedDay?'idv1-highlight':''}"><td><button type="button" class="idv1-date-link" data-idv-date="${date}" aria-label="${T('查看这一天','View day')} ${date}">${date}</button></td>${detail}</tr>`;});
 el('idv1History').innerHTML=`<div class="idv1-table-scroll"><table><thead><tr><th>${T('日期','Date')}</th>${selection!=='gold'?'<th>Crypto · USD</th>':''}${selection!=='crypto'?'<th>Gold · MMK</th>':''}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
 const breakdown=el('idv1Breakdown'),day=selectedDay;
 let sections=[];
 const addBreakdown=(kind)=>{const report=kind==='crypto'?cryptoDaily(day):goldDaily(day);
  const symbolOptions=kind==='crypto'?[...new Set(accountCrypto().map(x=>String(x.symbol||'').toUpperCase().trim()).filter(Boolean))].sort():[];
  const chips=kind==='crypto'?`<div class="idv1-symbol-filter"><button type="button" data-idv-reset-symbol="1" class="${!selectedSymbol?'active':''}" ${!selectedSymbol?'disabled':''}>${T('全部币种','All coins')}</button>${symbolOptions.map(sym=>`<button type="button" data-idv-sym="${safe(sym)}" class="${selectedSymbol===sym?'active':''}">${safe(sym)}</button>`).join('')}</div>`:'';
  if(!report.valid){sections.push(`<div class="idv1-asset-section"><strong>${kind==='crypto'?'Crypto · USD':'Gold · MMK'}</strong>${chips}<p class="idv1-verify">${T('该日行情或持仓记录不足，不能可靠计算完整盈亏。','Missing quote or position data: complete daily P/L cannot be verified.')}</p></div>`);return;}
  const parts=report.parts.filter(x=>x.valid&&(!selectedSymbol||kind!=='crypto'||x.sym===selectedSymbol));
  sections.push(`<div class="idv1-asset-section"><strong>${kind==='crypto'?'Crypto · USD':'Gold · MMK'} · ${signedValue(report,kind)}</strong>${chips}<div class="idv1-break-grid">${parts.map(x=>`<div class="idv1-break-card"><b>${safe(x.sym)}</b>${money({valid:true,total:x.pl},kind)}</div>`).join('')}</div></div>`);
 };
 if(selection!=='gold')addBreakdown('crypto');if(selection!=='crypto')addBreakdown('gold');
 breakdown.innerHTML=`<div class="idv1-break-head"><h3>${T('选定日期的币种盈亏','Daily asset breakdown')} · ${safe(selectedDay)}</h3><span>${T('点击走势图某一天查看详情','Select a bar to inspect the day')}</span></div>${sections.join('')}`;
 const quotes=el('idv1RecentGoldQuotes');if(quotes){quotes.innerHTML=`<small>${T('最近手动录入的金价（非官方收盘）','Recent manually recorded quotes (not official closes)')}</small>`+goldRows.slice().sort((a,b)=>String(b.quote_date).localeCompare(String(a.quote_date))).slice(0,5).map(x=>`<div><span>${safe(x.quote_date)}</span><b>K ${fmt(Number(x.mmk_per_kyattha))}</b></div>`).join('')+(goldRows.length?'':`<p>${T('尚无手动历史金价。','No manual quotes saved yet.')}</p>`)}
 root.querySelectorAll('.idv1-chart-scroll').forEach(scroller=>{const active=scroller.querySelector('.idv1-day.selected');if(!active)return;const left=active.offsetLeft-scroller.clientWidth/2+active.clientWidth/2;scroller.scrollLeft=Math.max(0,left);});
 el('idv1Note').textContent=T('每日盈亏已剔除当天新增本金，并包括买卖费用及净卖出回款。Crypto 历史按交易所固定 UTC'+zoneParam()+' 日线（日界线遇夏令时切换需额外核对）；今天仅使用5分钟内的实时报价，缺少报价显示「—」。Gold 使用手动历史 MMK 观察价，今天可以使用有效的新鲜参考价。月度合计必须包含所有可计算交易日；USD 与 MMK 不跨币种相加。','Daily P/L adjusts for buys, fees and net sale proceeds. Crypto uses exchange fixed UTC'+zoneParam()+' daily bars (verify dates around daylight saving); today requires a live price from the last 5 minutes or shows “—”. Gold history uses manual MMK observed prices; today may use a fresh reference price. Monthly totals need complete priced trading days; USD and MMK are never merged.');
 const s=el('idv1Status');s.textContent=error|| (cryptoCache.at?T('Crypto 历史行情：已读取。','Crypto historical quotes loaded.'):'');
}
async function saveGold(e){e.preventDefault();if(inFlight)return;const form=e.currentTarget,owner=currentOwner;if(!owner)return;
 const date=String(form.elements.date.value),price=N(form.elements.price.value),message=el('idv1GoldMessage');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>todayLocal()||!Number.isFinite(price)||!(price>0)||price>999999999999){message.textContent=T('请输入有效的过去或今天日期与金价。','Enter a valid date (today or earlier) and quote.');return;}
 if(typeof db==='undefined'){message.textContent=T('云端不可用，未保存。','Cloud unavailable; not saved.');return;}
 const old=goldRows.find(x=>x.quote_date===date);if(old&&Math.abs(N(old.mmk_per_kyattha)-price)>0.005){if(!window.confirm(T('此日期已存在一条金价记录。确定用新的手动观察价覆盖吗？','A quote is already saved for this date. Replace it with the new observed price?')))return;}
 inFlight=true;form.querySelector('button[type=submit]').disabled=true;
 try{const user=(await db.auth.getUser()).data.user;if(!user||user.id!==owner||currentOwner!==owner)throw Error('Session changed');
 const {error:e}=await db.from('invest_daily_gold_quotes').upsert({user_id:owner,quote_date:date,mmk_per_kyattha:price,source_type:'manual',observed_at:new Date().toISOString()},{onConflict:'user_id,quote_date'});
 if(e)throw e;
 if(currentOwner!==owner)return;
 message.textContent=T('已保存手动金价记录。','Manual quote saved.');await reloadGold(owner);draw();
 }catch(err){message.textContent=T('保存失败：','Save failed: ')+String(err?.message||err).slice(0,120)}finally{inFlight=false;form.querySelector('button[type=submit]').disabled=false;}
}
async function reloadGold(owner){if(typeof db==='undefined')return;const {data,error:e}=await db.from('invest_daily_gold_quotes').select('quote_date,mmk_per_kyattha,source_type,observed_at').eq('user_id',owner).order('quote_date',{ascending:false}).limit(365);
 if(owner!==currentOwner)return;
 if(e){goldRows=[];error=T('Gold 历史金价读取失败。','Could not load gold price history.');return;}
 goldRows=Array.isArray(data)?data:[];
}
async function loadCrypto(owner,force){const symbols=[...new Set(accountCrypto().map(x=>String(x.symbol||'').toUpperCase()).filter(x=>/^[A-Z0-9]{2,12}$/.test(x)))];
 const key=zoneParam()+'|'+symbols.sort().join('|');if(!force&&Date.now()-cryptoCache.at<300000&&cryptoCache.key===key)return;
 const result=new Map(),missing=[],sources={};
 await Promise.all(symbols.map(async s=>{if(s==='USDT')return;
 let success=false;
 for(const url of ['https://data-api.binance.vision/api/v3/klines','https://api.binance.com/api/v3/klines']){
  try{const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),9500);let response;
   try{response=await fetch(url+'?symbol='+encodeURIComponent(s+'USDT')+'&interval=1d&limit=65&timeZone='+encodeURIComponent(zoneParam()),{signal:ctrl.signal,cache:'no-store'});}finally{clearTimeout(timeout)}
   if(!response.ok)continue;const data=await response.json();if(!Array.isArray(data)||!data.length)continue;
   const map=new Map();for(const item of data){if(!Array.isArray(item)||item.length<5)continue;const p=N(item[4]),date=zonedKey(N(item[0]));if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&p>0)map.set(date,p)}
   if(map.size>=2){result.set(s,map);sources[s]=url;success=true;break;}
  }catch(_e){}
 }
 if(!success)missing.push(s);
 }));
 if(owner!==currentOwner)return;
 cryptoCache={at:Date.now(),key,prices:result,missing,sources};if(missing.length)error=T('部分 Crypto 历史价格不可用：','Some historical crypto quotes unavailable: ')+missing.join(', ');
}
async function load(force=false){const box=base();if(!box)return;const owner=owns();if(!owner){currentOwner='';goldRows=[];cryptoCache={at:0,key:'',prices:new Map(),missing:[],sources:{}};selectedSymbol='';error='';draw();return}
 if(currentOwner!==owner){currentOwner=owner;goldRows=[];cryptoCache={at:0,key:'',prices:new Map(),missing:[],sources:{}};selectedSymbol='';error='';['idv1Summary','idv1Trend','idv1Breakdown','idv1History','idv1RecentGoldQuotes'].forEach(id=>{const target=el(id);if(target)target.replaceChildren();});}
 const token=++lastRenderToken;
 el('idv1Status').textContent=T('正在加载历史报价…','Loading price history…');
 try{error='';await Promise.all([reloadGold(owner),loadCrypto(owner,force)]);}catch(err){error=T('历史数据加载失败，请重试。','Failed to load history; please retry.')}
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
  goldQuotes:goldRows.map(x=>({date:x.quote_date,price:Number(x.mmk_per_kyattha),source:x.source_type})),
  quoteZone:zoneParam(),
  quoteSources:{...cryptoCache.sources},
 };
}
window.mmhInvestDailyV1={dailyTotal,cryptoDaily,goldDaily,load,draw,priceOf,guidanceSnapshot};
})();
