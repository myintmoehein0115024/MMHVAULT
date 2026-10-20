/* MMHVAULT Invest 1.8: user-confirmed historical Crypto USD P/L audit snapshots.
 * Append-only provenance receipts, NOT certified exchange data or account NAV.
 * Reads investments and Binance daily bars via existing 1.7 independent audit.
 * Never writes to investments, accounts, transactions or orders. No automated capture.
 */
(()=>{'use strict';
if(window.__mmhInvestSnapshotsV18)return;window.__mmhInvestSnapshotsV18=true;
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const zh=()=>{try{return window.getMMHVAULTLanguage?.()==='zh'||document.documentElement.lang?.toLowerCase().startsWith('zh')}catch(_){return false}};
const T=(cn,en)=>zh()?cn:en;
const owner=()=>{try{return typeof currentSessionUser!=='undefined'?String(currentSessionUser?.id||''):''}catch(_){return ''}};
const fmt=v=>Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const changeDay=(ymd,n)=>{const d=new Date(ymd+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const priceText=v=>(v>=0?'+$':'−$')+fmt(Math.abs(v));
let currentOwner='',auditWindow=7,selectedDate='',stored=[],pending=null,busy=false,loading=false,loadSeq=0,error='',lastProof=null;
const ledger=()=>Array.isArray(window.investments)?window.investments.filter(x=>x?.asset==='Crypto'):[];
const digest=async str=>{
 if(!globalThis.crypto?.subtle||!globalThis.TextEncoder)return null;
 const bytes=new TextEncoder().encode(str),hash=await globalThis.crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
};
function clear(uid=''){
 currentOwner=uid;stored=[];pending=null;error='';lastProof=null;selectedDate='';loadSeq++;
 const host=$('mmhInvestSnapshotsV18');if(host){['[data-is18-history]','[data-is18-proof]','[data-is18-status]'].forEach(sel=>host.querySelector(sel)?.replaceChildren());}
}
function mount(){let root=$('mmhInvestSnapshotsV18');if(root)return root;
 const after=$('mmhInvestDrawdownV16')||$('mmhInvestDailyV1');if(!after)return null;
 root=document.createElement('section');root.id='mmhInvestSnapshotsV18';root.className='is18-root';after.insertAdjacentElement('afterend',root);
 root.innerHTML=`<div class="is18-head"><div><span class="is18-kicker">INVEST · AUDIT ARCHIVE</span><h2 data-is18-title></h2><p data-is18-sub></p></div><button type="button" data-is18-reload></button></div>
 <div class="is18-controls"><label><span data-is18-windowlabel></span><select data-is18-window><option value="7">7D</option><option value="30">30D</option></select></label><label><span data-is18-datelabel></span><select data-is18-date></select></label><button type="button" class="is18-save" data-is18-save></button></div>
 <div data-is18-proof role="status"></div><div data-is18-status role="status" aria-live="polite"></div>
 <div class="is18-listhead"><h3 data-is18-historytitle></h3><span data-is18-historycaption></span></div><div data-is18-history></div>
 <p class="is18-disclaimer" data-is18-disclaimer></p>`;
 root.addEventListener('change',e=>{const input=e.target;if(input.matches('[data-is18-window]')){auditWindow=Number(input.value)||7;selectedDate='';pending=null;render();}else if(input.matches('[data-is18-date]')){selectedDate=input.value;pending=null;render();}});
 root.addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;
 if(button.hasAttribute('data-is18-save'))void save();else if(button.hasAttribute('data-is18-reload'))void refresh(true);else if(button.dataset.is18Delete){void deleteSnapshot(button.dataset.is18Delete);}else if(button.dataset.is18Expand){const id=button.dataset.is18Expand;const detail=[...root.querySelectorAll('[data-is18-details]')].find(x=>x.dataset.is18Details===id);if(detail)detail.hidden=!detail.hidden;}
 });return root;
}
function translations(root){
 root.querySelector('[data-is18-title]').textContent=T('历史日盈亏复核档案','Audited Daily P/L Archive');
 root.querySelector('[data-is18-sub]').textContent=T('手动保留通过独立复核的已结束交易日。快照保留当时的行情证据和资金流口径，不代表真实账户净值。','Manually archive completed-day P/L after independent checks. Records preserve observed quotes and cash-flow methodology, not portfolio NAV.');
 root.querySelector('[data-is18-reload]').textContent=T('重新读取','Reload');
 root.querySelector('[data-is18-windowlabel]').textContent=T('复核区间','Audit window');
 root.querySelector('[data-is18-datelabel]').textContent=T('选择已复核日期','Verified date');
 root.querySelector('[data-is18-save]').textContent=busy?T('正在核实…','Checking…'):T('保存复核快照','Save audit snapshot');
 root.querySelector('[data-is18-historytitle]').textContent=T('已保存的历史快照','Saved snapshots');
 root.querySelector('[data-is18-historycaption]').textContent=T('仅展示最近 60 条 · 可主动删除，不可编辑','Latest 60 · deletable, not editable');
 root.querySelector('[data-is18-disclaimer]').textContent=T('仅用户主动保存：不会自动回填过去的收益，不做定时行情采集或交易操作。历史日线来自 Binance 公开接口；本机时区及夏令时限制沿用 Invest 1.7 的独立审核。保存是当时的用户端复核结果，不等于交易所或审计机构认证，也不属于收益预测。Gold（MMK）未纳入。','User-initiated only: no automatic backfill, cron, or trading. Exchange daily bars come from Binance public endpoints; fixed time-zone and DST safeguards use Invest 1.7 checks. Saved reports are client-side audit observations, not exchange certification, official NAV, or forecasts. Gold (MMK) excluded.');
}
function proof(){const uid=owner(),src=window.mmhInvestDailyV1?.guidanceSnapshot?.(),api=window.mmhInvestDrawdownV16;
 if(!uid||!src||src.owner!==uid||typeof api?.collect!=='function')return {ok:false,reason:T('请先登录并加载每日盈亏。','Sign in and load daily performance first.')};
 if(!Array.isArray(window.investments)||ledger().some(x=>String(x.user_id||'')!==uid))return{ok:false,reason:T('投资账本尚未完成账户隔离或读取。','Investment ledger ownership could not be verified.')};
 if(ledger().some(x=>String(x.symbol||'').toUpperCase()==='USDT'))return{ok:false,reason:T('当前包含按固定 $1 估算的 USDT，暂不归档为已核实行情。','USDT is currently assumed to be $1, so verifiable archive capture is disabled.')};
 const windowReport=api.collect(auditWindow,'');if(!windowReport?.ok)return{ok:false,reason:T('独立对账尚未通过，请先在上方更新历史行情；缺失日期不能保存。','Independent reconciliation failed. Refresh historical quotes above; missing dates cannot be archived.'),detail:String(windowReport?.why||'')};
 if(!src.fetchedAt||Date.now()-Number(src.fetchedAt)>600000||Date.now()<Number(src.fetchedAt)-60000)return{ok:false,reason:T('历史报价已过期，需要刷新。','Historical quote fetch is stale; refresh required.')};
 if(!windowReport.points?.length)return{ok:false,reason:T('没有可归档的已核实日期。','No verified completed days.')};
 const allowed=windowReport.points.map(x=>x.date);if(!selectedDate||!allowed.includes(selectedDate))selectedDate=allowed.at(-1);
 const report=window.mmhInvestDailyV1.cryptoDaily(selectedDate);
 if(!report?.valid||!Array.isArray(report.parts)||!report.parts.length)return{ok:false,reason:T('选定日期的详细盈亏不完整。','Selected-day P/L detail incomplete.')};
 const quoteZone=String(src.quoteZone||''),detail=[];const before=changeDay(selectedDate,-1);
 for(const x of report.parts){if(!x.valid||!Number.isFinite(Number(x.pl)))return{ok:false,reason:T('币种盈亏不能核实。','Coin P/L cannot be verified.')};
  const sym=String(x.sym||'').trim().toUpperCase();if(!/^[A-Z0-9]{2,12}$/.test(sym))return{ok:false,reason:'Invalid symbol'};
  const prices=src.quotes?.[sym],url=src.quoteSources?.[sym];const prev=prices?.[before],close=prices?.[selectedDate];
  if(!Number.isFinite(Number(prev))||!(Number(prev)>0)||!Number.isFinite(Number(close))||!(Number(close)>0)||!/^https:\/\/[^/?]+\/api\/v3\/klines$/.test(String(url||'')))return{ok:false,reason:T('行情来源或前后收盘价格缺失；请重新加载报价。','Missing quote source or close price; refresh historical quotes.')};
  const origin=new URL(url).host;if(!['data-api.binance.vision','api.binance.com'].includes(origin))return{ok:false,reason:'Untrusted price source'};
  detail.push({symbol:sym,pnl_usd:Number(x.pl),close_before_usd:Number(prev),close_day_usd:Number(close),source_url:url});
 }
 detail.sort((a,b)=>a.symbol.localeCompare(b.symbol));const sum=detail.reduce((a,b)=>a+b.pnl_usd,0);
 if(Math.abs(sum-Number(report.total))>Math.max(.05,Math.abs(sum)*1e-6))return{ok:false,reason:'Coin P/L mismatch'};
 return {ok:true,owner:uid,date:selectedDate,quoteZone,detail,pnl:Number(report.total),allowed,sourceFetchedAt:Number(src.fetchedAt),auditDays:auditWindow};
}
async function ledgerHashFor(uid,date){
 const coinTrades=ledger().filter(x=>String(x.user_id||'')===uid&&String(x.inv_date||'').slice(0,10)<=date)
 .map(x=>({id:String(x.id??''),day:String(x.inv_date||'').slice(0,10),symbol:String(x.symbol||'').toUpperCase(),qty:String(x.quantity??''),amount:String(x.amount??''),fee:String(x.fee??0),otherCost:String(x.other_cost??0),side:String(x.side||x.trade_type||'')}))
 .sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 if(!coinTrades.length)return null;
 return digest(JSON.stringify(coinTrades));
}
async function buildSnapshot(audit){
 if(!audit.ok)return null;
 const uid=audit.owner,ledger_sha256=await ledgerHashFor(uid,audit.date);if(!ledger_sha256)return null;
 const stable={day:audit.date,zone:audit.quoteZone,pnl:audit.pnl,details:audit.detail,ledger_sha256};
 const content_sha256=await digest(JSON.stringify(stable));if(!content_sha256)return null;
 return {user_id:uid,snapshot_date:audit.date,audit_window_days:audit.auditDays,currency:'USD',pnl_usd:audit.pnl,quote_zone:audit.quoteZone,quote_provider:'binance_spot_klines',quote_fetched_at:new Date(audit.sourceFetchedAt).toISOString(),audit_details:audit.detail,ledger_sha256,content_sha256};
}
function historyHTML(data){const rows=data.slice(0,60);if(!rows.length)return `<p class="is18-empty">${T('尚未保存历史复核快照。','No archived audit snapshots yet.')}</p>`;
 return rows.map(x=>{const good=Number.isFinite(Number(x.pnl_usd));let details=[];try{details=Array.isArray(x.audit_details)?x.audit_details:[]}catch(_){}
 const hash=(x.ledger_sha256||'').slice(0,12);const when=x.recorded_at?new Date(x.recorded_at).toLocaleString():'—';
 const status=x._ledgerState==='same'?T('当前账本摘要相同','Ledger digest unchanged'):x._ledgerState==='changed'?T('账本已变化 · 需重新核对','Ledger changed · recheck required'):T('当前账本尚未核对','Current ledger not verified');
 return `<article class="is18-item"><div class="is18-item-top"><div><strong>${esc(x.snapshot_date)}</strong><small>${esc(when)} · ${esc(x.audit_window_days)}D · ${esc(x.quote_zone)}</small></div><b class="${Number(x.pnl_usd)>=0?'is18-pos':'is18-neg'}">${good?esc(priceText(Number(x.pnl_usd))):'—'}</b></div><div class="is18-item-foot"><span>${T('记录时独立复核通过','Audited when captured')} · ${esc(status)} · ${esc(hash)}…</span><button type="button" data-is18-expand="${esc(x.id)}">${T('查看依据','Evidence')}</button><button type="button" data-is18-delete="${esc(x.id)}">${T('删除档案','Delete')}</button></div><div class="is18-detail" data-is18-details="${esc(x.id)}" hidden><p>${T('行情来源','Source')}: ${esc(x.quote_provider)} · ${T('读取于','Fetched')} ${esc(x.quote_fetched_at||'—')}</p>${details.map(d=>`<div><span>${esc(d.symbol)} · ${esc(String(d.source_url||'').replace('https://',''))}</span><b>${esc(priceText(Number(d.pnl_usd)))}</b><small>${esc(fmt(d.close_before_usd))} → ${esc(fmt(d.close_day_usd))} USD</small></div>`).join('')}<p>${T('历史账本摘要','Historical ledger hash')}: ${esc(x.ledger_sha256)}</p></div></article>`;
 }).join('');}
function render(){const root=mount();if(!root)return;
 if(currentOwner!==owner())clear(owner());translations(root);
 const summary=proof();lastProof=summary;
 root.querySelector('[data-is18-window]').value=String(auditWindow);
 const dates=root.querySelector('[data-is18-date]');
 if(summary.ok){dates.innerHTML=summary.allowed.slice().reverse().map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join('');dates.value=selectedDate;
  root.querySelector('[data-is18-proof]').innerHTML=`<div class="is18-proof-ok"><strong>${T('独立复核通过','Independent audit passed')}</strong><span>${esc(summary.date)} · Crypto USD · ${esc(summary.detail.length)} ${T('个币种','coins')} · ${esc(summary.quoteZone)} · ${esc(priceText(summary.pnl))}</span></div>`;
 }else{dates.innerHTML='<option value="">—</option>';root.querySelector('[data-is18-proof]').innerHTML=`<div class="is18-proof-block"><strong>${T('暂不可保存','Capture unavailable')}</strong><span>${esc(summary.reason||'')} ${esc(summary.detail||'')}</span></div>`;}
 const button=root.querySelector('[data-is18-save]');button.disabled=busy||!summary.ok;button.setAttribute('aria-busy',String(busy));
 root.querySelector('[data-is18-status]').textContent=error;
 root.querySelector('[data-is18-history]').innerHTML=historyHTML(stored);
}
async function loadHistory(uid){if(!uid||typeof db==='undefined')return;
 const {data,error:e}=await db.from('invest_daily_audit_snapshots').select('id,snapshot_date,audit_window_days,currency,pnl_usd,quote_zone,quote_provider,quote_fetched_at,recorded_at,audit_details,ledger_sha256,content_sha256,client_request_id').eq('user_id',uid).order('recorded_at',{ascending:false}).limit(60);
 if(uid!==currentOwner)return;
 if(e){error=T('历史快照读取失败：','Could not load saved snapshots: ')+String(e.message||e).slice(0,150);return;}
 stored=Array.isArray(data)?data:[];
 const canCompare=owner()===uid&&Array.isArray(window.investments)&&!ledger().some(x=>String(x.user_id||'')!==uid);
 if(canCompare){for(const row of stored){const hash=await ledgerHashFor(uid,row.snapshot_date);if(uid!==currentOwner)return;row._ledgerState=hash?(hash===row.ledger_sha256?'same':'changed'):'unknown';}}

}
async function refresh(force=false){const root=mount();if(!root)return;
 const uid=owner();if(uid!==currentOwner)clear(uid);
 if(!uid){render();return;}if(loading)return;const seq=++loadSeq;
 loading=true;error=T('正在读取复核与快照数据…','Loading audits and snapshots…');render();
 try{if(force)await window.mmhInvestDailyV1?.load?.(true);await loadHistory(uid);}catch(e){if(uid===currentOwner)error=T('读取失败：','Load failed: ')+String(e?.message||e).slice(0,150);}finally{loading=false;if(seq!==loadSeq&&owner()===currentOwner&&currentOwner){void refresh();}else if(seq===loadSeq&&uid===currentOwner){if(error.startsWith('正在')||error.startsWith('Loading'))error='';render();}}
}
async function deleteSnapshot(id){
 const uid=owner();if(!uid||!id||busy||typeof db==='undefined')return;
 if(!window.confirm(T('确定删除这份历史复核快照吗？只删除这份存档，不修改投资记录。','Delete this saved audit snapshot? This removes the archive only, not investment transactions.')))return;
 busy=true;error='';render();
 try{const auth=(await db.auth.getUser()).data?.user;if(!auth||auth.id!==uid||owner()!==uid)throw Error('Session changed');
  const {error:e}=await db.from('invest_daily_audit_snapshots').delete().eq('user_id',uid).eq('id',id);
  if(e)throw e;if(uid!==owner())return;error=T('已删除所选历史快照，投资账本未改变。','Archived snapshot deleted; investment ledger unchanged.');await loadHistory(uid);
 }catch(e){if(uid===owner())error=T('删除失败：','Delete failed: ')+String(e?.message||e).slice(0,140);}
 finally{busy=false;if(uid===owner())render();}
}
async function save(){if(busy)return;const uid=owner();const report=proof();if(!report.ok||!uid||uid!==currentOwner){error=T('当前无法通过独立复核。','Independent audit is not available.');render();return;}
 if(typeof db==='undefined'){error=T('云端未连接，不能存档。','Cloud unavailable; snapshot not saved.');render();return;}
 busy=true;error='';render();
 try{
  const active=(await db.auth.getUser()).data?.user;if(!active||active.id!==uid||owner()!==uid)throw Error('Session changed');
  const record=await buildSnapshot(report);if(!record)throw Error('Cryptographic digest unavailable or incomplete ledger');
  if(owner()!==uid)throw Error('Session changed');
  // Same draft retains a stable idempotency key after network-response uncertainty.
  if(pending&&pending.record?.content_sha256!==record.content_sha256)throw Error(T('上一份提交尚未核实，请先重新读取再保存其他内容。','Previous submission unconfirmed. Reload before changing the capture.'));
  if(!pending){if(!globalThis.crypto?.randomUUID)throw Error('Secure request ID unavailable');pending={record,requestId:globalThis.crypto.randomUUID()};}
  const findExisting=async()=>{
   const {data,error:queryError}=await db.from('invest_daily_audit_snapshots').select('id').eq('user_id',uid).eq('snapshot_date',record.snapshot_date).eq('content_sha256',record.content_sha256).limit(1);
   if(queryError)throw queryError;return Array.isArray(data)&&data.length>0;
  };
  if(await findExisting()){error=T('该日期和数据内容已保存，无需重复存档。','Identical snapshot already saved.');pending=null;await loadHistory(uid);render();return;}
  const {error:writeError}=await db.from('invest_daily_audit_snapshots').insert({...pending.record,client_request_id:pending.requestId});
  if(writeError){let confirmed=false;try{confirmed=await findExisting();}catch(_){}if(!confirmed){throw writeError;}}
  if(owner()!==uid)return;
  pending=null;error=T('历史快照已保存。','Audit snapshot saved.');await loadHistory(uid);
 }catch(e){if(owner()===uid)error=T('未能确认保存；再次点击将使用相同请求编号核对：','Save unconfirmed; retry retains original request ID: ')+String(e?.message||e).slice(0,140);
 }finally{busy=false;if(owner()===uid)render();}
}
let timer=0;function schedule(){clearTimeout(timer);timer=setTimeout(()=>{if($('invest')?.classList.contains('active'))void refresh();},220);}
['mmhvault:invest-daily-ready','mmhvault:data-loaded','mmhvault:page-visible','mmhvault:config-owner-changed','mmhvault-language-change','languagechange'].forEach(ev=>window.addEventListener(ev,schedule,{passive:true}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();},{passive:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.mmhInvestSnapshotsV18={proof,buildSnapshot,refresh,render,clear};
})();
