/* MMHVAULT Invest 1.9 | opt-in scheduled historical market observations.
 * No investment changes; this is NOT an automatic audited P/L or official exchange statement.
 */
(()=>{'use strict';
if(window.__mmhInvestAutoV19)return;window.__mmhInvestAutoV19=true;
const $=id=>document.getElementById(id);
const T=(zh,en)=>{try{return window.getMMHVAULTLanguage?.()==='zh'||document.documentElement.lang?.toLowerCase().startsWith('zh')?zh:en}catch(_){return en}};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const owner=()=>{try{return String(typeof currentSessionUser!=='undefined'?currentSessionUser?.id||'':'')}catch(_){return ''}};
const client=()=>{try{return typeof db==='undefined'?null:db}catch(_){return null}};
const zoneString=m=>`${m<0?'-':'+'}${String(Math.floor(Math.abs(m)/60)).padStart(2,'0')}:${String(Math.abs(m)%60).padStart(2,'0')}`;
const offsetNow=()=>-new Date().getTimezoneOffset();
let uid='',seq=0,busy=false,enabled=false,offset=0,quoteRows=[],statuses=[],error='',loaded=false,loading=false;
function mount(){let root=$('mmhInvestAutoV19');if(root)return root;
 const after=$('mmhInvestSnapshotsV18')||$('mmhInvestDailyV1');if(!after)return null;
 root=document.createElement('section');root.id='mmhInvestAutoV19';root.className='iv19-root';after.insertAdjacentElement('afterend',root);
 root.innerHTML=`<div class="iv19-head"><div><span class="iv19-kicker">INVEST · AUTO MARKET HISTORY</span><h2 data-iv19-title></h2><p data-iv19-intro></p></div><button type="button" data-iv19-refresh></button></div>
  <div class="iv19-settings"><div class="iv19-setting-copy"><strong data-iv19-switch-title></strong><p data-iv19-switch-desc></p><small data-iv19-zone></small></div><button type="button" class="iv19-switch" data-iv19-toggle></button></div>
  <div class="iv19-stats"><div><span data-iv19-status-label></span><b data-iv19-state></b></div><div><span data-iv19-latest-label></span><b data-iv19-last></b></div><div><span data-iv19-data-label></span><b data-iv19-count></b></div></div>
  <div class="iv19-subhead"><h3 data-iv19-logs-title></h3><span data-iv19-logs-sub></span></div><div data-iv19-logs></div>
  <div class="iv19-subhead"><h3 data-iv19-quotes-title></h3><span data-iv19-quotes-sub></span></div><div data-iv19-quotes></div>
  <p class="iv19-caveat" data-iv19-caveat></p><p class="iv19-message" data-iv19-message role="status" aria-live="polite"></p>`;
 root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-iv19-toggle'))void toggle();else if(b.hasAttribute('data-iv19-refresh'))void load(true);
 });return root;
}
function clear(next=''){uid=next;seq++;loaded=false;loading=false;busy=false;enabled=false;offset=0;quoteRows=[];statuses=[];error='';const root=$('mmhInvestAutoV19');if(root){root.querySelector('[data-iv19-quotes]')?.replaceChildren();root.querySelector('[data-iv19-logs]')?.replaceChildren();root.querySelector('[data-iv19-message]')?.replaceChildren();}}
function statusLabel(s){return ({complete:T('报价已归档','Quotes captured'),incomplete:T('部分报价缺失','Partially captured'),empty:T('没有需采集的币种','No eligible crypto'),ledger_review:T('投资账本待核对','Ledger needs review'),fetch_error:T('行情暂不可用','Quotes unavailable'),capacity:T('服务容量不足','Capacity limited')})[s]||T('尚未采集','Not captured');}
function render(){const root=mount();if(!root)return;
 const words=[['title','自动历史报价记录','Automatic historical quote archive'],['intro','网站关闭后，可按固定时区自动采集已结束日期的 Crypto 日线报价；原始买卖与已审计收益不被修改。','Collect completed-day crypto closes at a fixed time-zone offset even when this site is closed. Trades and audited P/L stay unchanged.'],['switch-title','自动记录历史行情','Scheduled historical market quotes'],['switch-desc','需要你主动开启；后台只读取你自己的 Crypto 投资币种列表，以便选择要采集的公开行情。不会自动买卖。','Explicit opt-in. The backend reads your Crypto symbol list only to fetch public closes. No trading.'],['status-label','服务设置','Capture setting'],['latest-label','最近一次检查','Latest check'],['data-label','已归档报价条目','Stored quote rows shown'],['logs-title','采集情况','Capture status'],['logs-sub','最近 7 天 · 失败不会生成盈亏','Latest 7 · failures do not produce P/L'],['quotes-title','行情采集记录','Captured close prices'],['quotes-sub','最近 20 条 · 保留报价来源','Latest 20 · source retained'],['caveat','重要：自动记录的是“事后获取的历史行情”，并非当日实时抓取的官方结算单，也不是自动审计后的盈亏。自动采集不补齐全部旧历史。采用你开启时的固定 UTC 时差，夏令时变化需关闭后重新开启更新；数据缺失将明确标记。Gold 不在此自动采集中。','Important: these are historical closes fetched after the fact—not official live settlement or automatically audited P/L. Older history is not backfilled automatically. Fixed UTC offset is recorded when enabled; if daylight saving changes, disable and re-enable to update it. Missing data is marked. Gold is excluded.']];
 for(const [id,zh,en] of words){const target=root.querySelector(`[data-iv19-${id}]`);if(target)target.textContent=T(zh,en)}
 root.querySelector('[data-iv19-refresh]').textContent=T('刷新','Refresh');
 root.querySelector('[data-iv19-toggle]').textContent=busy?T('正在保存…','Saving…'):enabled?T('关闭自动采集','Disable capture'):T('开启自动采集','Enable capture');
 root.querySelector('[data-iv19-toggle]').disabled=busy||loading||!uid;
 root.querySelector('[data-iv19-zone]').textContent=(enabled?T('采集采用固定 UTC 时差：','Fixed capture offset: '):T('启用时将记录本设备的固定 UTC 时差：','This device will register a fixed UTC offset: '))+zoneString(enabled?offset:offsetNow());
 root.querySelector('[data-iv19-state]').textContent=!uid?T('未登录','Sign in first'):!loaded?T('等待读取','Loading…'):enabled?T('已开启','Enabled'):T('已关闭','Disabled');
 root.querySelector('[data-iv19-last]').textContent=statuses[0]?esc(statuses[0].quote_date)+' · '+statusLabel(statuses[0].state):'—';
 root.querySelector('[data-iv19-count]').textContent=String(quoteRows.length)+(quoteRows.length===20?'+':'');
 const logs=root.querySelector('[data-iv19-logs]');
 logs.innerHTML=statuses.length?statuses.map(s=>`<div class="iv19-row"><span>${esc(s.quote_date)} · UTC${zoneString(Number(s.offset_minutes))}</span><strong>${statusLabel(s.state)}</strong><small>${Number(s.stored_count)||0}/${Number(s.symbol_count)||0} ${T('币种参考数','asset references')}</small></div>`).join(''):`<p class="iv19-empty">${T('尚无后台采集结果；开启后将在下一个符合条件的调度周期检查。','No captured history yet. After enabling, the next scheduled cycle will check.')}</p>`;
 const q=root.querySelector('[data-iv19-quotes]');
 q.innerHTML=quoteRows.length?quoteRows.map(s=>`<div class="iv19-row"><span>${esc(s.quote_date)} · <b>${esc(s.symbol)}</b></span><strong>$${Number(s.usd_close).toLocaleString(undefined,{maximumFractionDigits:8})}</strong><small title="${esc(s.source_url)}">UTC${zoneString(Number(s.offset_minutes))} · ${T('来源：Binance 历史日线','Source: Binance historical daily bars')}</small></div>`).join(''):`<p class="iv19-empty">${T('没有自动归档的报价。','No automatic quotes archived.')}</p>`;
 root.querySelector('[data-iv19-message]').textContent=error;
}
async function load(force=false){const own=owner();if(!own){if(uid)clear();render();return;}if(uid!==own)clear(own);
 if(loading||busy)return;if(!force&&loaded)return;
 const sdk=client();if(!sdk){error=T('数据库尚未准备好。','Cloud not ready.');render();return;}
 loading=true;const cur=++seq;error='';render();
 try{const auth=(await sdk.auth.getUser()).data.user;if(!auth||auth.id!==own)throw Error('Sign-in session changed');
 const [s,r,q]=await Promise.all([
 sdk.from('invest_auto_quote_settings').select('enabled,offset_minutes').eq('user_id',own).maybeSingle(),
 sdk.from('invest_auto_capture_status').select('quote_date,offset_minutes,state,symbol_count,stored_count,checked_at').eq('user_id',own).order('checked_at',{ascending:false}).limit(7),
 sdk.from('invest_auto_crypto_quotes').select('quote_date,symbol,offset_minutes,usd_close,source_url,fetched_at').eq('user_id',own).order('quote_date',{ascending:false}).limit(20)
 ]);
 if(cur!==seq||uid!==own)return;
 if(s.error||r.error||q.error)throw Error('Read error');
 enabled=s.data?.enabled===true;offset=Number(s.data?.offset_minutes)||0;
 statuses=r.data||[];quoteRows=q.data||[];loaded=true;
 }catch(_e){if(cur===seq&&uid===own)error=T('暂时无法读取云端采集记录，请稍后刷新。','Could not load archived market quotes. Retry shortly.');}
 finally{if(cur===seq&&uid===own){loading=false;render();}}
}
async function toggle(){if(busy||loading||!uid)return;
 const current=uid,saveEnabled=!enabled,offsetAtEnable=offsetNow();
 if(saveEnabled&&(!Number.isInteger(offsetAtEnable)||offsetAtEnable<-720||offsetAtEnable>840||offsetAtEnable%15!==0)){
  error=T('设备时区偏移不支持自动采集。','Unsupported device offset.');render();return;}
 if(saveEnabled&&!window.confirm(T('确认开启？后台将按计划读取你自己的 Crypto 币种列表，并存储公开历史价格。可能产生 Supabase 调用额度消耗，不会保存任何买卖订单或自动交易。','Enable background checking of your Crypto symbol list and public historical prices? This may consume Supabase usage quota. No order or trading will occur.')))return;
 const sdk=client();if(!sdk)return;
 busy=true;error='';render();const thisSeq=seq;
 try{const auth=(await sdk.auth.getUser()).data.user;
  if(!auth||auth.id!==current||uid!==current)throw Error('Session mismatch');
  const payload={user_id:current,enabled:saveEnabled,offset_minutes:saveEnabled?offsetAtEnable:offset,updated_at:new Date().toISOString()};
  const r=await sdk.from('invest_auto_quote_settings').upsert(payload,{onConflict:'user_id'});
  if(r.error)throw r.error;
  if(thisSeq===seq&&uid===current){enabled=saveEnabled;offset=payload.offset_minutes;loaded=true;error=T('设置已保存。','Preference saved.');}
 }catch(_e){if(thisSeq===seq&&uid===current)error=T('保存失败，请刷新确认云端实际状态。','Save failed. Refresh to verify the cloud setting.');}
 finally{if(thisSeq===seq&&uid===current){busy=false;render();}}
}
let refreshTimer=0;
function schedule(force=false){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{
  const active=$('invest')?.classList.contains('active');if(active)void load(force);
},300)}
['mmhvault:data-loaded','mmhvault:cache-restored','mmhvault:invest-daily-ready'].forEach(ev=>window.addEventListener(ev,()=>schedule(false)));
['languagechange','mmhvault-language-change'].forEach(ev=>window.addEventListener(ev,()=>{render();schedule(false)}));
window.addEventListener('mmhvault:page-visible',e=>{if(e.detail?.page==='invest')schedule(true)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(true)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(false),{once:true});else schedule(false);
window.mmhInvestAutoV19={refresh:()=>load(true)};
})();
