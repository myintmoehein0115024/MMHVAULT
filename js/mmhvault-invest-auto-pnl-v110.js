/* MMHVAULT Invest 1.10 — read-only daily P/L reconstruction from opted-in auto captured quotes.
   No database writes. Does not certify exchange settlement, NAV or historical P/L snapshots. */
(()=>{'use strict';
if(window.__mmhInvestAutoPnlV110)return;window.__mmhInvestAutoPnlV110=true;
const $=s=>document.querySelector(s), ESC=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const own=()=>{try{return String(typeof currentSessionUser!=='undefined'?currentSessionUser?.id||'':'')}catch(_){return ''}};
const sdk=()=>{try{return typeof db!=='undefined'?db:null}catch(_){return null}};
const zh=()=>{try{return window.getMMHVAULTLanguage?.()==='zh'||document.documentElement.lang?.toLowerCase().startsWith('zh')}catch(_){return false}};
const T=(cn,en)=>zh()?cn:en;
const addDay=(s,n)=>{let d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const todayAtOffset=(m)=>new Date(Date.now()+m*60000).toISOString().slice(0,10);
const zone=m=>`${m<0?'-':'+'}${String(Math.floor(Math.abs(m)/60)).padStart(2,'0')}:${String(Math.abs(m)%60).padStart(2,'0')}`;
const dateValid=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(new Date(s+'T12:00:00Z').getTime())&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const Num=v=>v===null||v===undefined||v===''?NaN:Number(v);
const usd=(v)=>`${v<0?'−':v>0?'+':''}$${Math.abs(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const near=(a,b)=>Math.abs(a-b)<=Math.max(0.02,Math.abs(a)*1e-8,Math.abs(b)*1e-8);
let state={owner:'',token:0,busy:false,loaded:false,settings:null,quotes:[],statuses:[],ledger:[],result:null,error:''};
let range=7, selected='',defer=0;
function reset(uid=''){
 state={owner:uid,token:state.token+1,busy:false,loaded:false,settings:null,quotes:[],statuses:[],ledger:[],result:null,error:''};selected='';
 const mount=$('#mmhInvestAutoPnlV110');if(mount){mount.querySelector('[data-v110-body]')?.replaceChildren();mount.querySelector('[data-v110-message]')?.replaceChildren();}
}
function mount(){let root=$('#mmhInvestAutoPnlV110');if(root)return root;
 const anchor=$('#mmhInvestAutoV19')||$('#mmhInvestSnapshotsV18')||$('#mmhInvestDailyV1');if(!anchor)return null;
 root=document.createElement('section');root.id='mmhInvestAutoPnlV110';root.className='iv110-root';anchor.insertAdjacentElement('afterend',root);
 root.innerHTML=`<div class="iv110-head"><div><span class="iv110-eyebrow">INVEST · VERIFIED INPUTS</span><h2 data-v110-title></h2><p data-v110-intro></p></div><button type="button" class="iv110-refresh" data-v110-refresh></button></div>
 <div class="iv110-actions"><div class="iv110-switches" role="group" aria-label="Analysis period"><button type="button" data-v110-days="7">7D</button><button type="button" data-v110-days="30">30D</button></div><span data-v110-zone></span></div><div data-v110-body></div>
 <p class="iv110-foot" data-v110-caveat></p><p class="iv110-message" data-v110-message role="status" aria-live="polite"></p>`;
 root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.v110Days){changeRange(Number(b.dataset.v110Days));}
  else if(b.dataset.v110Date){selected=b.dataset.v110Date;render();}
  else if(b.hasAttribute('data-v110-refresh'))void load();
 });return root;
}
function normalizeLedger(rows,owner){
 const list=[],seen=new Set();
 for(const r of rows){
  if(String(r.user_id)!==owner)return {reason:'owner'};
  const id=String(r.id??'');if(!id||seen.has(id))return{reason:'duplicate'};seen.add(id);
  const day=String(r.inv_date||'').slice(0,10),sym=String(r.symbol||'').toUpperCase().trim();
  if(!dateValid(day)||!/^[A-Z0-9]{2,12}$/.test(sym)||sym==='USDT')return{reason:'ledger'};
  const q=Num(r.quantity),a=Num(r.amount),fee=Num(r.fee??0),other=Num(r.other_cost??0);
  if(!Number.isFinite(q)||q===0||!Number.isFinite(a)||a<=0||!Number.isFinite(fee)||fee<0||!Number.isFinite(other)||other<0)return{reason:'ledger'};
  const isSell=q<0;
  const signed=isSell?-Math.abs(q):q,flow=isSell?Math.abs(a)-fee-other:-Math.abs(a)-fee-other;
  list.push({day,sym,q:signed,flow,id});
 }
 return {list};
}
function calculate(options){
 const {owner,settings,ledger,quotes,statuses,days=7}=options;
 if(!owner||!settings||!Number.isInteger(Number(settings.offset_minutes)))return{ok:false,reason:'setting'};
 const offset=Number(settings.offset_minutes);if(offset< -720||offset>840||offset%15!==0)return{ok:false,reason:'zone'};
 const end=addDay(todayAtOffset(offset),-1),start=addDay(end,-days+1),previous=addDay(start,-1);
 const normalized=normalizeLedger(ledger,owner);if(!normalized.list)return {ok:false,reason:normalized.reason};
 const quoteMap=new Map(),quoteErrors=new Set(),statusMap=new Map();
 for(const s of statuses){if(String(s.user_id)!==owner)return {ok:false,reason:'owner'};if(Number(s.offset_minutes)===offset)statusMap.set(s.quote_date,s);}
 for(const q of quotes){
  if(String(q.user_id)!==owner)return{ok:false,reason:'owner'};
  if(Number(q.offset_minutes)!==offset)continue;
  const sym=String(q.symbol||'').toUpperCase(),date=String(q.quote_date||''),price=Num(q.usd_close);
  if(!dateValid(date)||!/^[A-Z0-9]{2,12}$/.test(sym)||!Number.isFinite(price)||price<=0||price>=999999999999||!['https://data-api.binance.vision/api/v3/klines','https://api.binance.com/api/v3/klines'].includes(String(q.source_url))){quoteErrors.add(`${sym}|${date}`);continue;}
  const k=`${sym}|${date}`;
  if(quoteMap.has(k)&&!near(quoteMap.get(k).price,price)){quoteErrors.add(k);continue;}
  quoteMap.set(k,{price,source:q.source_url,fetchedAt:q.fetched_at});
 }
 const reports=[];let total=0,verified=0;
 for(let i=0;i<days;i++){
  const date=addDay(start,i),prev=addDay(date,-1),status=statusMap.get(date);
  if(!status||status.state!=='complete'){
   reports.push({date,ok:false,reason:status?.state||'pending',parts:[],status:status?.state||''});continue;
  }
  const symbols=new Map();let bad='';
  for(const t of normalized.list){if(t.day>date)continue;let item=symbols.get(t.sym);if(!item){item={sym:t.sym,q0:0,q1:0,flow:0,dayTrade:false};symbols.set(t.sym,item)}
   item.q1+=t.q;if(t.day<date)item.q0+=t.q;else{item.flow+=t.flow;item.dayTrade=true;}
  }
  const parts=[],symbolsInPlay=[];
  for(const r of symbols.values()){
   if(!r.dayTrade&&Math.abs(r.q0)<1e-10&&Math.abs(r.q1)<1e-10)continue;
   if(r.q0< -1e-8||r.q1< -1e-8){bad='negative';break;}
   const before=quoteMap.get(`${r.sym}|${prev}`),after=quoteMap.get(`${r.sym}|${date}`);
   if(quoteErrors.has(`${r.sym}|${prev}`)||quoteErrors.has(`${r.sym}|${date}`)||
      (Math.abs(r.q0)>1e-10&&!before)||(Math.abs(r.q1)>1e-10&&!after)){bad='missing_quote';break;}
   const oldPrice=Math.abs(r.q0)>1e-10?before.price:0;
   const newPrice=Math.abs(r.q1)>1e-10?after.price:0;
   const pnl=r.q1*newPrice-r.q0*oldPrice+r.flow;
   if(!Number.isFinite(pnl)){bad='calculation';break;}
   symbolsInPlay.push(r.sym);parts.push({symbol:r.sym,pnl,before:oldPrice,after:newPrice,q0:r.q0,q1:r.q1,flow:r.flow,source:after?.source||before?.source||''});
  }
  if(!bad&&!parts.length)bad='no_holdings';
  // Status complete must correspond to the complete expected set; re-dated trades after
  // collection can add symbols for which no archived price exists. They are blocked above.
  if(!bad&&new Set(symbolsInPlay).size!==parts.length)bad='symbols';
  if(!bad&&parts.some(p=>!Number.isFinite(p.pnl)))bad='calculation';
  if(bad){reports.push({date,ok:false,reason:bad,parts:[],status:status.state});continue;}
  const pnl=parts.reduce((sum,p)=>sum+p.pnl,0);verified++;total+=pnl;
  reports.push({date,ok:true,pnl,parts,status:status.state});
 }
 return {ok:true,offset,from:start,to:end,verified,days,complete:verified===days,total:verified===days?total:null,reports};
}
function message(reason){return({pending:T('尚未完成后台采集','Waiting for scheduled capture'),incomplete:T('采集不完整','Incomplete capture'),empty:T('当天无符合条件的币种','No eligible symbols'),ledger_review:T('投资账本需要人工核对','Ledger needs review'),fetch_error:T('历史报价暂不可用','Historical quote unavailable'),capacity:T('后台采集容量限制','Capture capacity limit'),missing_quote:T('缺少必要的前后两日价格','Missing required close prices'),negative:T('交易数量导致负持仓，需核对','Negative position; review trades'),no_holdings:T('当天没有可核实持仓','No verifiable holdings'),symbols:T('币种报价不完整','Incomplete symbol coverage'),owner:T('登录账户资料不一致','Account data mismatch'),ledger:T('部分投资记录无效','Invalid investment record'),duplicate:T('投资编号重复','Duplicate investment ID'),setting:T('没有可用的自动采集设置','No capture preference found'),zone:T('采集时区无效','Invalid archive time zone'),read:T('云端历史读取失败','Could not read cloud history'),limit:T('记录超过安全读取上限','History exceeds safe read cap'),calculation:T('无法完成资金流复算','Cash-flow reconstruction failed')})[reason]||T('需要核对','Review required');}
function render(){const root=mount();if(!root)return;
 root.querySelector('[data-v110-title]').textContent=T('自动行情 · 每日盈亏核对','Captured Quotes · Daily P/L Review');
 root.querySelector('[data-v110-intro]').textContent=T('使用自动归档的历史报价与真实买卖流水独立复算，区分已核对输入和缺失数据。','Reconstruct daily P/L from automatically archived prices and your transaction ledger; missing inputs remain unverified.');
 root.querySelector('[data-v110-refresh]').textContent=state.busy?T('读取中…','Loading…'):T('重新核对','Recheck');
 root.querySelector('[data-v110-refresh]').disabled=state.busy;
 root.querySelectorAll('[data-v110-days]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.v110Days)===range);b.setAttribute('aria-pressed',String(Number(b.dataset.v110Days)===range));});
 root.querySelector('[data-v110-zone]').textContent=state.settings?`UTC${zone(Number(state.settings.offset_minutes))}`:'UTC —';
 root.querySelector('[data-v110-caveat]').textContent=T('说明：以交易表中的日期、金额、数量和费用及 Binance USDT 市场日线价复算。USDT 报价被视作 USD 近似，非银行美元结算；固定时区、成交时间、部分卖出和手续费口径仍需实际交易所核对。没有自动报价的日期不算成零收益。此处不写入盈亏快照，不修改财务数据，也不触发买卖。','Uses investment ledger date, quantity, amount and fees with Binance USDT-market daily bars. USDT is treated as an approximate USD quote, not bank USD settlement. Trade timing, fixed offsets, sales and fees still require exchange reconciliation. Missing days are not zero. No snapshot writes or trades.');
 const body=root.querySelector('[data-v110-body]'),status=root.querySelector('[data-v110-message]');
 status.textContent=state.error;
 if(!state.owner){body.innerHTML=`<p class="iv110-empty">${T('登录后查看自己的投资核对记录。','Sign in to see your own reports.')}</p>`;return;}
 if(!state.loaded||!state.result){body.innerHTML=`<p class="iv110-empty">${state.busy?T('正在核对交易及历史行情…','Reconciling trades and quotes…'):T('点击重新核对读取历史记录。','Select Recheck to load history.')}</p>`;return;}
 const r=state.result;
 if(!r.ok){body.innerHTML=`<p class="iv110-empty">${message(r.reason)}。${T('已暂停金额汇总。','Totals withheld.')}</p>`;return;}
 const reports=r.reports,chosen=reports.find(x=>x.date===selected)||reports[reports.length-1];if(!reports.some(x=>x.date===selected))selected=chosen.date;
 body.innerHTML=`<div class="iv110-overview"><div class="iv110-metric"><small>${T('最近完成交易日','Latest completed date')}</small><strong>${ESC(r.to)}</strong><span>${T('仅统计已结束日期','Completed dates only')}</span></div><div class="iv110-metric"><small>${T('已核对输入的日期','Dates with inputs verified')}</small><strong>${r.verified} / ${r.days}</strong><span>${T('交易流水 + 采集报价','Ledger + captured quotes')}</span></div><div class="iv110-metric"><small>${T('完整区间净盈亏','Complete-window net P/L')}</small><strong class="${r.complete&&r.total>=0?'iv110-positive':r.complete?'iv110-negative':'iv110-muted'}">${r.complete?usd(r.total):'—'}</strong><span>${r.complete?T('USD 近似，非交易所结算','Approx. USD, not exchange settlement'):T('有日期未核实，不合并金额','Missing days; total withheld')}</span></div></div>
  <div class="iv110-subhead"><h3>${T('逐日核对','Daily verification')}</h3><small>${T('点击日期查看每个币种','Select a date for per-coin results')}</small></div>
  <div class="iv110-days">${[...reports].reverse().map(x=>`<button type="button" data-v110-date="${x.date}" class="iv110-day ${x.ok?'iv110-ok':'iv110-wait'} ${selected===x.date?'is-selected':''}" aria-pressed="${selected===x.date}"><span>${x.date}</span><b>${x.ok?usd(x.pnl):'—'}</b><small>${x.ok?T('输入已核对','Inputs verified'):message(x.reason)}</small></button>`).join('')}</div>
  <div class="iv110-detail"><div class="iv110-subhead"><h3>${T('币种明细','Coin details')} · ${chosen.date}</h3><small>${chosen.ok?T('买卖资金流已纳入','Cash flows accounted for'):message(chosen.reason)}</small></div>${chosen.ok?`<div class="iv110-table"><table><thead><tr><th>${T('币种','Coin')}</th><th>${T('前一日价','Previous close')}</th><th>${T('当日价','Day close')}</th><th>${T('当日盈亏','Daily P/L')}</th></tr></thead><tbody>${chosen.parts.map(p=>`<tr><td>${ESC(p.symbol)}</td><td>$${p.before.toLocaleString(undefined,{maximumFractionDigits:8})}</td><td>$${p.after.toLocaleString(undefined,{maximumFractionDigits:8})}</td><td class="${p.pnl>=0?'iv110-positive':'iv110-negative'}">${usd(p.pnl)}</td></tr>`).join('')}</tbody></table></div>`:`<p class="iv110-empty">${T('当前不能给出可靠的当日盈亏。','Reliable daily P/L is not available yet.')}</p>`}</div>`;
}
async function paged(table,fields,uid,configure,max=5000){
 const step=400,out=[];let expected=null;
 for(let pos=0;pos<=max;pos+=step){
  let q=sdk().from(table).select(fields,{count:'exact'}).eq('user_id',uid);q=configure(q);
  const response=await q.order('id',{ascending:true}).range(pos,pos+step-1);
  if(response.error)throw Error('read');
  if(!Number.isInteger(response.count))throw Error('read');
  if(expected===null)expected=response.count;
  if(response.count!==expected||expected>max)throw Error('limit');
  const batch=response.data||[];out.push(...batch);
  if(batch.length!==Math.min(step,Math.max(0,expected-pos)))throw Error('read');
  if(out.length===expected)return out;
 }
 throw Error('limit');
}
async function load(){
 const current=own();if(!current){reset();render();return;}if(current!==state.owner)reset(current);
 if(state.busy)return;const s=sdk();if(!s){state.error=message('read');render();return;}
 state.busy=true;state.loaded=false;state.result=null;state.error='';let token=++state.token;render();
 try{
  const auth=(await s.auth.getUser()).data?.user;if(!auth||auth.id!==current)throw Error('owner');
  const {data:config,error:configErr}=await s.from('invest_auto_quote_settings').select('enabled,offset_minutes').eq('user_id',current).maybeSingle();
  if(configErr)throw Error('read');if(!config){if(token===state.token&&state.owner===current){state.settings=null;state.result={ok:false,reason:'setting'};state.loaded=true;}return;}
  const off=Number(config.offset_minutes);if(!Number.isInteger(off)||off< -720||off>840||off%15!==0)throw Error('zone');
  const end=addDay(todayAtOffset(off),-1),earliest=addDay(end,-30);
  const [ledger,quotes,statuses]=await Promise.all([
   paged('investments','id,user_id,inv_date,asset,symbol,quantity,amount,fee,other_cost',current,q=>q.eq('asset','Crypto').lte('inv_date',end),5000),
   paged('invest_auto_crypto_quotes','id,user_id,quote_date,symbol,offset_minutes,usd_close,source_url,fetched_at',current,q=>q.gte('quote_date',earliest).lte('quote_date',end).eq('offset_minutes',off),5000),
   (async()=>{const {data,error}=await s.from('invest_auto_capture_status').select('user_id,quote_date,offset_minutes,state,checked_at').eq('user_id',current).eq('offset_minutes',off).gte('quote_date',addDay(end,-29)).lte('quote_date',end).order('quote_date',{ascending:false}).limit(35);if(error)throw Error('read');return data||[];})()
  ]);
  if(token!==state.token||current!==state.owner)return;
  const latest=(await s.auth.getUser()).data?.user;if(latest?.id!==current)throw Error('owner');
  state.settings=config;state.ledger=ledger;state.quotes=quotes;state.statuses=statuses;
  state.result=calculate({owner:current,settings:config,ledger,quotes,statuses,days:range});state.loaded=true;
 }catch(e){if(token===state.token&&current===state.owner){state.loaded=true;state.result={ok:false,reason:['owner','zone','limit'].includes(e?.message)?e.message:'read'};state.error=message(state.result.reason);}}
 finally{if(token===state.token&&current===state.owner){state.busy=false;render();}}
}
function changeRange(next){range=next;selected='';if(state.loaded&&state.settings){state.result=calculate({owner:state.owner,settings:state.settings,ledger:state.ledger,quotes:state.quotes,statuses:state.statuses,days:range});}render();}
// Change of range never reuses a previous period's displayed values.
function schedule(){
 const incoming=own();if(incoming!==state.owner){reset(incoming);render();}
 clearTimeout(defer);defer=setTimeout(()=>{const active=$('#invest')?.classList.contains('active');if(active)void load();},320);
}
['mmhvault:data-loaded','mmhvault:cache-restored','mmhvault:page-visible'].forEach(n=>window.addEventListener(n,schedule));
['mmhvault-language-change','languagechange'].forEach(n=>window.addEventListener(n,render));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.mmhInvestAutoPnlV110={recheck:load,calculate};
})();
