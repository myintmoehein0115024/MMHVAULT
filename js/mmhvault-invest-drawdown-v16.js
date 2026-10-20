/* MMHVAULT Invest 1.6: completed-day, cash-flow adjusted P/L giveback and per-coin contribution.
 * Read-only, USD Crypto only. No orders, balances, financial writes, price forecasting or push.
 * This is NOT net-asset-value drawdown: inception basis is zero cumulative P/L for each selected window.
 */
(()=>{'use strict';
if(window.__mmhInvestDrawdownV16)return;window.__mmhInvestDrawdownV16=true;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const zh=()=>{try{return window.getMMHVAULTLanguage?.()==='zh'||document.documentElement.lang?.toLowerCase().startsWith('zh')}catch(_){return false}};
const T=(a,b)=>zh()?a:b;
const owner=()=>{try{return typeof currentSessionUser!=='undefined'?String(currentSessionUser?.id||''):''}catch(_){return ''}};
const fmt=(n,p=2)=>Number(n).toLocaleString(undefined,{minimumFractionDigits:p,maximumFractionDigits:p});
const signed=n=>(n>=0?'+$':'−$')+fmt(Math.abs(n));
const ymd=()=>{const d=new Date(),z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,10)};
const add=(day,n)=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
let currentOwner='',range=7,symbol='',lastResult=null,renderNo=0;
function clear(o='') {currentOwner=o;symbol='';lastResult=null;const x=$('mmhInvestDrawdownV16');if(x){x.querySelector('[data-idd-content]')?.replaceChildren();}}
function source(){const api=window.mmhInvestDailyV1,raw=api?.guidanceSnapshot?.();return api&&raw?.owner&&raw.owner===owner()?{api,raw}:null;}
function symbols(s){return [...new Set((s?.holdings||[]).filter(x=>x.asset==='Crypto').map(x=>String(x.symbol||'').trim().toUpperCase()).filter(x=>/^[A-Z0-9]{2,12}$/.test(x)))].sort();}
/* Pure reducer; accepts already VERIFIED daily P/L reports. Never silently drops missing days. */
function compute(days,selectedSymbol=''){
 if(!Array.isArray(days)||days.length<2||days.some(x=>!x||!x.valid||!Number.isFinite(Number(x.total))))return {ok:false,why:'incomplete'};
 let cumulative=0,high=0,maximumGiveback=0,highAt='',maxGivebackAt='',lossDays=0,winDays=0,flatDays=0,losingStreak=0,longestStreak=0;
 const contributions=new Map(),points=[];
 for(const day of days){const profit=Number(day.total);cumulative+=profit;
  if(cumulative>high){high=cumulative;highAt=day.date;}
  const giveback=Math.max(0,high-cumulative);
  if(giveback>maximumGiveback){maximumGiveback=giveback;maxGivebackAt=day.date;}
  if(profit< -0.005){lossDays++;losingStreak++;longestStreak=Math.max(longestStreak,losingStreak)}
  else {losingStreak=0;if(profit>0.005)winDays++;else flatDays++;}
  for(const x of day.parts||[]){if(!x||!x.valid||!Number.isFinite(Number(x.pl)))return {ok:false,why:'parts'};
   const name=String(x.sym||'').toUpperCase();if(!name)return{ok:false,why:'parts'};
   contributions.set(name,(contributions.get(name)||0)+Number(x.pl));}
  points.push({date:day.date,pnl:profit,cumulative,giveback});
 }
 const contributionRows=[...contributions].map(([sym,pnl])=>({sym,pnl})).sort((a,b)=>b.pnl-a.pnl);
 const contributionTotal=contributionRows.reduce((s,x)=>s+x.pnl,0);
 if(Math.abs(contributionTotal-cumulative)>Math.max(0.05,Math.abs(cumulative)*1e-6))return{ok:false,why:'reconcile'};
 return {ok:true,total:cumulative,peak:high,peakAt:highAt,maxGiveback:maximumGiveback,maxGivebackAt,nowGiveback:Math.max(0,high-cumulative),winDays,lossDays,flatDays,longestStreak,contributions:contributionRows,points,scope:selectedSymbol};
}
function collect(n=range,target=symbol){const data=source();if(!data)return{ok:false,why:'source'};
 const {api,raw}=data, list=symbols(raw);
 if(!list.length)return {ok:false,why:'holdings'};
 if(target&&!list.includes(target))return{ok:false,why:'symbol'};
 if(!(raw.fetchedAt>0)||Date.now()-Number(raw.fetchedAt)>600000||Date.now()<Number(raw.fetchedAt)-60000)return{ok:false,why:'stale'};
 // Only COMPLETED local calendar days. Today is never included, even if a live quote is present.
 const end=add(ymd(),-1),reports=[];
 for(let i=n-1;i>=0;i--){const day=add(end,-i);let r;try{r=api.cryptoDaily?.(day,target||'')}catch(_){return {ok:false,why:'missing',at:day}}
  if(!r?.valid){return {ok:false,why:r?.reason==='no_holdings'?'no_holdings':r?.reason||'missing',at:day};}
  if(!Array.isArray(r.parts)||r.parts.some(x=>!x.valid||!Number.isFinite(Number(x.pl))))return{ok:false,why:'parts',at:day};
  reports.push({date:day,valid:true,total:Number(r.total),parts:r.parts});
 }
 const result=compute(reports,target);if(result.ok){result.from=reports[0].date;result.to=reports.at(-1).date;result.days=n;result.quoteZone=String(raw.quoteZone||'');}
 return result;
}
function riskReasons(result,snapshot){const notes=[];
 if(result.longestStreak>=3)notes.push(T(`该区间出现连续 ${result.longestStreak} 天亏损，建议重新审视整体风险承受范围。`,`The window contains a ${result.longestStreak}-day losing streak. Review your risk capacity.`));
 if(result.maxGiveback>0)notes.push(T(`阶段累计盈亏曾从高点回落 ${signed(-result.maxGiveback)}；这不是账户净值回撤率。`,`Cumulative period P/L gave back $${fmt(result.maxGiveback)} from a peak; this is not account NAV drawdown.`));
 let cap;try{cap=window.mmhInvestPlansV15?.capModel?.()}catch(_){cap=null;}
 if(cap?.ok&&Number.isFinite(cap.top1)&&cap.top1>45)notes.push(T(`当前最大币种占 Crypto 市值 ${fmt(cap.top1,1)}%，存在较高集中风险。`,`Largest coin currently represents ${fmt(cap.top1,1)}% of Crypto value: review concentration risk.`));
 if(!notes.length)notes.push(T('当前未触发这些简单风险条件；这不代表未来价格安全。','No simple risk conditions triggered; future prices can still fall.'));
 return notes;
}
function root(){const anchor=$('mmhInvestPlansV15')||$('mmhInvestDailyV1');if(!anchor)return null;
 let r=$('mmhInvestDrawdownV16');if(r)return r;
 r=document.createElement('section');r.id='mmhInvestDrawdownV16';r.className='idd16-root';anchor.insertAdjacentElement('afterend',r);
 r.innerHTML=`<div class="idd16-head"><div><span class="idd16-kicker">INVEST · P/L GIVEBACK</span><h2 data-idd-heading></h2><p data-idd-subtitle></p></div><button type="button" data-idd-refresh></button></div>
 <div class="idd16-controls"><div class="idd16-pills" role="group" aria-label="Period"><button type="button" data-idd-days="7">7D</button><button type="button" data-idd-days="30">30D</button></div><label><span data-idd-scope></span><select data-idd-symbol aria-label="Crypto symbol"></select></label></div>
 <div data-idd-content aria-live="polite"></div><p data-idd-legal class="idd16-legal"></p>`;
 r.addEventListener('change',e=>{const x=e.target.closest('[data-idd-symbol]');if(x){symbol=x.value;render();}});
 r.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.iddDays){range=Number(b.dataset.iddDays);render();}
  if(b.hasAttribute('data-idd-refresh')){const d=window.mmhInvestDailyV1?.load; if(typeof d==='function')d(true);else render();}
 });return r;
}
function setText(r){r.querySelector('[data-idd-heading]').textContent=T('投资收益回吐与币种贡献','P/L Giveback & Coin Contributions');
 r.querySelector('[data-idd-subtitle]').textContent=T('对比最近 7 / 30 个已结束的自然日，剔除买卖资金流后计算盈亏回吐；不预测价格。','Review the last 7 / 30 completed calendar days, adjusting P/L for trades and cash flows. No price prediction.');
 r.querySelector('[data-idd-refresh]').textContent=T('更新历史行情','Refresh history');r.querySelector('[data-idd-scope]').textContent=T('分析范围','Scope');
 r.querySelector('[data-idd-legal]').textContent=T('口径：从所选区间首日的零累计盈亏开始，统计期间累计盈亏距其阶段峰值的最大和当前回落；不是“历史账户净值回撤”或收益率。历史 Crypto 价格由日线行情提供，可能受时区、交易所来源和成交日口径影响。缺少任何一天的数据会暂停整个区间分析。Gold（MMK）因手动价格、单位与汇率尚未完全核实，不参与这份 USD 风险统计。这里只做风险观察，不建议具体买卖或自动执行交易。','Method: cash-flow-adjusted cumulative P/L starts at zero on the first day of the selected window. Peak giveback is NOT portfolio NAV drawdown or return %. Crypto daily closes depend on exchange data/timezone. Any missing day disables the full-window report. Gold (MMK) is excluded pending valuation-unit and quote verification. Observational only; no trade instruction or execution.');
}
function statusHTML(reason,at){let note={source:T('请先登录并加载 Invest 每日行情。','Sign in and load Invest daily prices first.'),holdings:T('没有可核实的 Crypto 持仓。','No verifiable Crypto holdings.'),symbol:T('所选币种已不存在，请重新选择。','Selected coin is no longer available.'),stale:T('历史行情读取已过期或尚未完成，请更新行情。','Historic price fetch is stale or incomplete. Refresh prices.'),no_holdings:T('该区间包含没有持仓的日期，完整区间报告暂不计算。','This window includes dates without holdings; full-window analysis is withheld.'),reconcile:T('每日币种贡献与整体盈亏不一致，已停止显示。','Coin contributions did not reconcile with portfolio P/L. Analysis withheld.'),parts:T('单币种盈亏明细无法核实。','Per-coin P/L breakdown cannot be verified.') }[reason]||T('该区间存在缺失或无法核实的历史价格／交易记录。','Historical quotes or trades are missing/unverifiable in this window.');
 return `<div class="idd16-empty" role="status"><strong>${T('统计待核实','Review required')}</strong><p>${esc(note)} ${at?esc(at):''}</p><small>${T('不会将缺失数据视为零，也不会据此提示补仓／减仓。','Missing data is not treated as zero and cannot drive trade guidance.')}</small></div>`;}
function render(){const r=root();if(!r)return;setText(r);const id=++renderNo,uid=owner();if(uid!==currentOwner)clear(uid);
 const select=r.querySelector('[data-idd-symbol]'),s=source(),syms=s?symbols(s.raw):[];
 if(symbol&&!syms.includes(symbol))symbol='';
 select.innerHTML=`<option value="">${T('Crypto 全部币种','All Crypto')}</option>`+syms.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');select.value=symbol;
 r.querySelectorAll('[data-idd-days]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.iddDays)===range);b.setAttribute('aria-pressed',String(Number(b.dataset.iddDays)===range));});
 const result=collect(range,symbol);lastResult=result;
 const content=r.querySelector('[data-idd-content]');if(!result.ok){content.innerHTML=statusHTML(result.why,result.at);return;}
 const notes=riskReasons(result,s?.raw);
 const metrics=[
  [T('区间净盈亏','Window net P/L'),signed(result.total),'sum'],
  [T('最大收益回吐','Maximum P/L giveback'),'$'+fmt(result.maxGiveback),'down'],
  [T('当前距高点回吐','Current P/L giveback'),'$'+fmt(result.nowGiveback),'down'],
  [T('盈利／亏损天数','Win / loss days'),result.winDays+' / '+result.lossDays,'neutral']
 ];
 const max=Math.max(1,...result.points.map(p=>Math.abs(p.pnl))),bars=result.points.map(point=>{const a=Math.max(2,Math.round(100*Math.abs(point.pnl)/max));const pos=point.pnl>=0;return `<div class="idd16-day" title="${esc(point.date)}: ${esc(signed(point.pnl))}"><div class="idd16-bars"><i class="${pos?'up':'down'}" style="height:${a}%"></i></div><small>${esc(point.date.slice(5))}</small></div>`;}).join('');
 const contributions=result.contributions.map(row=>`<div class="idd16-contribution"><span>${esc(row.sym)}</span><b class="${row.pnl>=0?'idd16-pos':'idd16-neg'}">${esc(signed(row.pnl))}</b></div>`).join('');
 content.innerHTML=`<div class="idd16-date">${T('已完成自然日','Completed calendar days')}: ${esc(result.from)} — ${esc(result.to)} · USD</div>
 <div class="idd16-metrics">${metrics.map(([label,value,kind])=>`<div class="idd16-metric"><small>${label}</small><b class="${kind==='sum'?(result.total>=0?'idd16-pos':'idd16-neg'):''}">${esc(value)}</b></div>`).join('')}</div>
 <div class="idd16-panels"><div class="idd16-panel"><h3>${T('每日盈亏（资金流已调整）','Daily P/L (cash-flow adjusted)')}</h3><div class="idd16-chart-scroll"><div class="idd16-chart" style="min-width:${Math.max(290,range*26)}px">${bars}</div></div><p>${T('柱状图表示每日盈亏，并非市场价格或账户净值。','Bars are daily P/L, not market prices or net account value.')}</p></div>
 <div class="idd16-panel"><h3>${T('各币种区间盈亏贡献','P/L by coin')}</h3><div class="idd16-contributions">${contributions||`<p>${T('暂无可核实数据','No verifiable data')}</p>`}</div></div></div>
 <div class="idd16-risk"><h3>${T('风险观察（非交易信号）','Risk checks (not trade signals)')}</h3>${notes.map(x=>`<p>${esc(x)}</p>`).join('')}</div>`;
 if(id!==renderNo)content.replaceChildren();
}
let timer=0;function schedule(){clearTimeout(timer);timer=setTimeout(()=>{if(!$('invest')?.classList.contains('active'))return;render();},220)}
['mmhvault:invest-daily-ready','mmhvault:data-loaded','mmhvault:page-visible','mmhvault:config-owner-changed','languagechange','mmhvault-language-change'].forEach(x=>window.addEventListener(x,schedule,{passive:true}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();},{passive:true});
setInterval(()=>{if(!document.hidden&&$('invest')?.classList.contains('active'))schedule();},60000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.mmhInvestDrawdownV16={compute,collect,render,clear};
})();
