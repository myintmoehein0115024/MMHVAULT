/* MMHVAULT Invest Guidance 1.2: transparent, read-only decision-support indicators.
   NO prediction, transaction, brokerage, AI endpoint, server write or financial automation. */
(()=>{'use strict';
if(window.__mmhInvestGuidanceV12)return;window.__mmhInvestGuidanceV12=true;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number(x),fine=n=>Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const pct=n=>(n>=0?'+':'')+fine(n)+'%';
const zh=()=>{try{return window.getMMHVAULTLanguage?.()==='zh'||document.documentElement.lang?.toLowerCase().startsWith('zh')}catch(_){return false}};
const T=(a,b)=>zh()?a:b;
const dayAdd=(day,offset)=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10)};
const currentUid=()=>{try{return typeof currentSessionUser!=='undefined'?String(currentSessionUser?.id||''):''}catch(_){return ''}};
const settings={cautious:25,balanced:35,active:45};
let profile='balanced',lastOwner='',mounted=false,lastSignature='';
function safeNumber(x){const n=Number(x);return Number.isFinite(n)?n:NaN}
function positionSummary(rows){
 const positions=new Map(),anomalies=new Set();
 const sorted=(Array.isArray(rows)?rows:[]).filter(x=>x?.asset==='Crypto').slice().sort((a,b)=>String(a.inv_date||'').localeCompare(String(b.inv_date||''))||Number(a.id||0)-Number(b.id||0));
 for(const x of sorted){const sym=String(x.symbol||'').toUpperCase().trim();if(!/^[A-Z0-9]{2,12}$/.test(sym))continue;
  const qty=safeNumber(x.quantity);
  if(!Number.isFinite(qty)){anomalies.add(sym);if(!positions.has(sym))positions.set(sym,0);continue}
  const next=(positions.get(sym)||0)+qty;
  if(next< -1e-7)anomalies.add(sym);
  positions.set(sym,next);
 }
 return {positions,anomalies};
}
function checkHistory(input,sym){
 const map=input?.quotes?.[sym]||{};
 const today=input?.today;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(today||''))return {ok:false,reason:'date'};
 // 21 previous *completed* trading-day closes; Crypto trades every calendar day.
 const dates=Array.from({length:21},(_,i)=>dayAdd(today,-21+i));
 const closes=dates.map(k=>safeNumber(map[k]));
 if(closes.some(v=>!(v>0)))return {ok:false,reason:'history',count:closes.filter(v=>v>0).length};
 const sma7=closes.slice(-7).reduce((a,b)=>a+b,0)/7;
 const sma21=closes.reduce((a,b)=>a+b,0)/21;
 const last=closes.at(-1),weekBase=closes.at(-8);
 const weekChange=(last/weekBase-1)*100;
 return {ok:true,sma7,sma21,weekChange,closes,day:dates.at(-1)};
}
function analyzeSnapshot(input,profileName='balanced',now=Date.now()){
 if(!input?.owner)return {kind:'unavailable',reason:'owner',rows:[]};
 const {positions,anomalies}=positionSummary(input.holdings);
 const current= [...positions].filter(([sym,q])=>q>1e-9 || anomalies.has(sym));
 if(!current.length)return {kind:'empty',rows:[],gold:goldCheck(input)};
 const liveFresh=input.quoteAvailable===true && Number.isFinite(Number(input.quotedAt)) &&
    now>=Number(input.quotedAt) && now-Number(input.quotedAt)<=300000;
 const fetchedFresh=Number.isFinite(Number(input.fetchedAt)) && now>=Number(input.fetchedAt) &&
    now-Number(input.fetchedAt)<=1800000;
 const values=new Map();let total=0,canCalculateWeights=liveFresh;
 for(const [sym,quantity] of current){const p=safeNumber(input?.live?.[sym]?.price);
  if(!(p>0)||anomalies.has(sym)){canCalculateWeights=false;continue}
  values.set(sym,quantity*p);total+=quantity*p;
 }
 canCalculateWeights=canCalculateWeights&&values.size===current.length&&total>0;
 const limit=settings[profileName]??settings.balanced;
 const rows=current.map(([sym,quantity])=>{
  const p=safeNumber(input?.live?.[sym]?.price),history=checkHistory(input,sym);
  const weight=canCalculateWeights?100*values.get(sym)/total:null;
  const base={sym,quantity,price:p,weight,history,quoteDay:history.day||'',code:'insufficient',why:[],conditions:[],safe:false};
  if(anomalies.has(sym)){base.why.push('ledger');return base;}
  if(!liveFresh||!(p>0)){base.why.push('live');return base;}
  if(!fetchedFresh||!history.ok){base.why.push(history.ok?'fetch':'history');return base;}
  // Never produce directional hints when the rest of the portfolio cannot be valued.
  if(weight===null){base.why.push('portfolio');return base;}
  const {sma7,sma21,weekChange}=history;
  const relative=(p/sma21-1)*100;
  base.relative=relative;base.weekChange=weekChange;base.sma7=sma7;base.sma21=sma21;
  base.conditions=[`MA7 ${fine(sma7)}`,`MA21 ${fine(sma21)}`];base.safe=true;
  if(weight>=limit){base.code='trim';base.why=['concentration'];}
  else if(relative>=12 && weekChange>8){base.code='trim';base.why=['extension'];}
  else if(relative<=-3 && sma7<sma21){base.code='wait';base.why=['downtrend'];}
  else if(sma7>=sma21 && relative>=-2 && relative<=3 && weight<=limit*0.6){base.code='add';base.why=['trend','capacity'];}
  else{base.code='watch';base.why=['neutral'];}
  return base;
 });
 rows.sort((a,b)=>({trim:0,wait:1,add:2,watch:3,insufficient:4}[a.code]-({trim:0,wait:1,add:2,watch:3,insufficient:4}[b.code])||a.sym.localeCompare(b.sym)));
 return {kind:'ok',rows,quoteFresh:liveFresh,historyFresh:fetchedFresh,gold:goldCheck(input),limit};
}
function goldCheck(input){const held=(input?.holdings||[]).filter(x=>x?.asset==='Gold').reduce((s,x)=>s+(Number(x.quantity)||0),0);
 const rows=(input?.goldQuotes||[]).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&Number(x.price)>0);
 return {held:held>1e-9,count:rows.length,latest:rows.map(x=>x.date).sort().at(-1)||''};
}
const explain={
 concentration:['单一币种超过当前设置的仓位参考上限，优先核查集中风险。','Coin weight exceeds the selected reference cap; review concentration first.'],
 extension:['价格明显高于21日均线且过去一周上涨较快，可检查分批锁定收益的必要性。','Price is well above its 21-day average after a rapid weekly rise; consider reviewing profit-taking exposure.'],
 downtrend:['价格与短期趋势仍偏弱；下跌不等于已经适合补仓。','Short-term trend remains weak; a drop alone does not make averaging down appropriate.'],
 trend:['短期均线未低于21日均线，价格接近21日参考水平。','The short-term average is not below the 21-day average, and price is near that reference.'],
 capacity:['当前币种在 Crypto 持仓中占比较低，但仍需要独立核对现金余量。','Portfolio share is relatively low; cash availability and risk budget are not verified.'],
 neutral:['趋势和仓位暂未触发设定的关注条件。','Trend and weight do not currently trigger the reference conditions.'],
 ledger:['持仓出现异常数量或负持仓历史，须先核对买卖记录。','Position quantity or transaction sequence looks inconsistent; verify the ledger first.'],
 live:['5分钟内没有可验证的实时价格，不能形成当前补仓／减仓提示。','No validated live quote within five minutes; no current position signal is issued.'],
 history:['不足21个连续、已结束的日线收盘价，暂停方向性判断。','Fewer than 21 consecutive completed daily closes; directional analysis is withheld.'],
 fetch:['历史价格缓存已过期，请刷新行情后重新分析。','Historical quote cache is stale; refresh before reviewing.'],
 portfolio:['部分持仓报价缺失，仓位占比无法完整计算。','Some holdings cannot be priced, so concentration cannot be computed reliably.']
};
function hint(code){return ({add:T('关注补仓条件','Review add conditions'),trim:T('关注减仓风险','Review trim risk'),wait:T('暂时观望','Wait / verify'),watch:T('维持观察','Keep monitoring'),insufficient:T('资料不足','Insufficient data')})[code]||code}
function renderCard(r){
 const rationale=r.why.map(k=>{const t=explain[k]||[];return zh()?t[0]:t[1]}).filter(Boolean);
 const weight=Number.isFinite(r.weight)?fine(r.weight)+'%':'—';
 const stats=r.safe?`<div class="ivg12-metrics"><div><small>${T('实时参考价','Current quote')}</small><b>$${fine(r.price)}</b></div><div><small>${T('仓位占比','Crypto allocation')}</small><b>${weight}</b></div><div><small>${T('较 MA21','Versus 21-day MA')}</small><b>${pct(r.relative)}</b></div><div><small>${T('上周价格变动','Previous 7-day move')}</small><b>${pct(r.weekChange)}</b></div></div>`:
 `<p class="ivg12-muted">${T('持仓占比或价格历史不能完整核实，暂不提供方向性关注信号。','Required price or portfolio history is incomplete; no directional hint is offered.')}</p>`;
 return `<article class="ivg12-card ivg12-${r.code}"><div class="ivg12-card-head"><strong>${esc(r.sym)}</strong><span class="ivg12-tag">${hint(r.code)}</span></div>${stats}<p>${esc(rationale.join(' '))}</p>${r.safe?`<div class="ivg12-foot">${T('已完成历史 K 线','Completed daily history')}: ${esc(r.quoteDay)} · MA7 $${fine(r.sma7)} · MA21 $${fine(r.sma21)}</div>`:''}</article>`;
}
function ensureUI(){const anchor=$('mmhInvestDailyV1');if(!anchor)return null;
 let root=$('mmhInvestGuidanceV12');if(root)return root;
 root=document.createElement('section');root.id='mmhInvestGuidanceV12';root.className='ivg12-root';
 root.innerHTML=`<div class="ivg12-head"><div><div class="ivg12-kicker">INVEST · POSITION INSIGHTS</div><h2>${T('智能仓位观察','Position Decision Support')}</h2><p>${T('用透明的价格趋势与持仓比例检查补仓、减仓和观望条件，不预测未来价格。','Review add, trim and wait conditions using transparent trend and concentration rules, not predictions.')}</p></div><button type="button" class="ivg12-recheck" data-ivg-refresh>${T('更新分析','Refresh analysis')}</button></div><div class="ivg12-tools"><label>${T('仓位集中度参考线','Position concentration reference')}<select data-ivg-profile><option value="cautious">${T('谨慎 · 25%','Cautious · 25%')}</option><option value="balanced" selected>${T('均衡 · 35%','Balanced · 35%')}</option><option value="active">${T('较宽松 · 45%','Wider · 45%')}</option></select></label><span>${T('设置仅用于本页规则对比，不自动调仓。','This setting is for visual comparisons only; no trades are made.')}</span></div><div id="ivg12Result" aria-live="polite"></div><details class="ivg12-rules"><summary>${T('查看分析规则与阈值','View rule thresholds')}</summary><p>${T('仓位超过所选参考线，或价格比21日均线高至少12%且过去7日上涨超过8%：检查减仓风险。价格低于21日均线至少3%且7日均线低于21日均线：暂时观望。7日均线不低于21日均线、现价在21日均线下方2%至上方3%内、且仓位不超过参考线60%：关注补仓条件。其它情况继续观察。所有阈值仅为可解释的参考规则，不是保证获利的策略。','Review trim risk when a coin exceeds the concentration reference, or price is at least 12% above its 21-day average with a 7-day gain over 8%. Wait if price is at least 3% below its 21-day average and the 7-day average is lower. Review add conditions if the 7-day average is not lower, price is within −2% to +3% of the 21-day average, and weight is under 60% of the selected cap. Otherwise monitor. These thresholds are transparent heuristics, not a proven trading strategy.')}</p></details><p class="ivg12-caution">${T('分析基于历史日线和当前行情，仅供决策辅助。没有检查你的紧急备用金、资金需求、投资期限、手续费税费或风险承受能力；任何补仓或减仓都必须由你自行决定。','Indicators use historical closes and current market data. They do not assess your cash needs, investment horizon, taxes, fees or risk capacity. Any trade decision remains yours.')}</p>`;
 anchor.insertAdjacentElement('afterend',root);mounted=true;
 root.addEventListener('change',e=>{if(e.target?.matches('[data-ivg-profile]')){profile=e.target.value in settings?e.target.value:'balanced';paint();}});
 root.addEventListener('click',e=>{if(e.target?.closest('[data-ivg-refresh]')){root.querySelector('[data-ivg-refresh]').disabled=true;Promise.resolve(window.mmhInvestDailyV1?.load?.(true)).finally(()=>{const btn=$('mmhInvestGuidanceV12')?.querySelector('[data-ivg-refresh]');if(btn)btn.disabled=false;paint();});}});
 return root;
}
function paint(){const root=ensureUI();if(!root)return;
 const result=root.querySelector('#ivg12Result');
 // Only accept a snapshot whose owner exactly matches the current authenticated session.
 const input=window.mmhInvestDailyV1?.guidanceSnapshot?.();
 const owner=currentUid();
 if(!owner||!input?.owner||owner!==input.owner){lastOwner='';lastSignature='';result.innerHTML=`<p class="ivg12-empty">${T('请登录后查看自己的持仓分析。','Sign in to inspect your portfolio.')}</p>`;return;}
 if(lastOwner!==owner){lastOwner=owner;lastSignature='';}
 const analysis=analyzeSnapshot(input,profile);
 const pieces=[];
 if(analysis.kind==='empty')pieces.push(`<p class="ivg12-empty">${T('当前没有可分析的 Crypto 持仓。','No eligible crypto holdings to inspect.')}</p>`);
 else if(analysis.kind==='ok')pieces.push(`<div class="ivg12-grid">${analysis.rows.map(renderCard).join('')}</div>`);
 else pieces.push(`<p class="ivg12-empty">${T('当前无法核实持仓。','Portfolio cannot be verified right now.')}</p>`);
 if(analysis.gold?.held){pieces.push(`<div class="ivg12-gold"><b>Gold · ${T('暂不生成买卖信号','No trade signal')}</b><p>${T('目前仅有','There are currently ')} ${analysis.gold.count} ${T('条手工参考金价，且不属于可信官方每日结算历史。请先核实金价来源、汇率与持仓单位。','manual reference quotes; they are not verified official daily closes. Confirm gold quote source, currency and holding units before drawing conclusions.')}</p></div>`)}
 pieces.push(`<div class="ivg12-source">${T('最新实时行情','Live quote time')}: ${input.quotedAt?esc(new Date(input.quotedAt).toLocaleString()):'—'} · ${T('数据来源','Feed')}: ${esc(input.quoteSource||T('未知','Unknown'))} · ${T('规则：已结束21日均线、短期趋势、Crypto仓位集中度；不包含预测或自动下单。','Rules: 21 completed daily closes, short-term trend and crypto concentration. No forecast or auto-trading.')}</div>`);
 result.innerHTML=pieces.join('');
 root.querySelector('h2').textContent=T('智能仓位观察','Position Decision Support');
 root.querySelector('.ivg12-head p').textContent=T('用透明的价格趋势与持仓比例检查补仓、减仓和观望条件，不预测未来价格。','Review add, trim and wait conditions using transparent trend and concentration rules, not predictions.');
 root.querySelector('[data-ivg-refresh]').textContent=T('更新分析','Refresh analysis');
 const label=root.querySelector('.ivg12-tools label');label.firstChild.nodeValue=T('仓位集中度参考线','Position concentration reference');
 [...label.querySelectorAll('option')].forEach((o,i)=>o.textContent=[T('谨慎 · 25%','Cautious · 25%'),T('均衡 · 35%','Balanced · 35%'),T('较宽松 · 45%','Wider · 45%')][i]);
 root.querySelector('.ivg12-tools>span').textContent=T('设置仅用于本页规则对比，不自动调仓。','This setting is for visual comparisons only; no trades are made.');
 root.querySelector('.ivg12-rules summary').textContent=T('查看分析规则与阈值','View rule thresholds');
 root.querySelector('.ivg12-rules p').textContent=T('仓位超过所选参考线，或价格比21日均线高至少12%且过去7日上涨超过8%：检查减仓风险。价格低于21日均线至少3%且7日均线低于21日均线：暂时观望。7日均线不低于21日均线、现价在21日均线下方2%至上方3%内、且仓位不超过参考线60%：关注补仓条件。其它情况继续观察。所有阈值仅为可解释的参考规则，不是保证获利的策略。','Review trim risk when a coin exceeds the concentration reference, or price is at least 12% above its 21-day average with a 7-day gain over 8%. Wait if price is at least 3% below its 21-day average and the 7-day average is lower. Review add conditions if the 7-day average is not lower, price is within −2% to +3% of the 21-day average, and weight is under 60% of the selected cap. Otherwise monitor. These thresholds are transparent heuristics, not a proven trading strategy.');
 root.querySelector('.ivg12-caution').textContent=T('分析基于历史日线和当前行情，仅供决策辅助。没有检查你的紧急备用金、资金需求、投资期限、手续费税费或风险承受能力；任何补仓或减仓都必须由你自行决定。','Indicators use historical closes and current market data. They do not assess your cash needs, investment horizon, taxes, fees or risk capacity. Any trade decision remains yours.');
}
let queued=0;function schedule(){if(queued)clearTimeout(queued);queued=setTimeout(()=>{queued=0;paint();},120)}
window.addEventListener('mmhvault:invest-daily-ready',schedule,{passive:true});
['mmhvault:page-visible','mmhvault:data-loaded','mmhvault:config-owner-changed','languagechange','mmhvault-language-change'].forEach(name=>window.addEventListener(name,schedule,{passive:true}));
// Expire visible signals as the quote ages, even if the browser gets no new market events.
setInterval(()=>{if(!document.hidden&&document.getElementById('invest')?.classList.contains('active'))paint();},60000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
// Pure deterministic helper for regression tests; not an external AI model.
window.mmhInvestGuidanceV12={analyzeSnapshot,positionSummary,checkHistory,paint};
})();
