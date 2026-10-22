/* Invest 1.11 — explicit opt-in for provisional server P/L summaries. No trade writes. */
(()=>{'use strict';if(window.__mmhInvestAutoPnLV111)return;window.__mmhInvestAutoPnLV111=true;
const $=s=>document.querySelector(s),E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const owner=()=>{try{return typeof currentSessionUser!=='undefined'?String(currentSessionUser?.id||''):''}catch{return''}};
const api=()=>{try{return typeof db!=='undefined'?db:null}catch{return null}};
const T=(z,e)=>window.getMMHVAULTLanguage?.()==='zh'||document.documentElement.lang?.toLowerCase().startsWith('zh')?z:e;
const zone=m=>`${m<0?'-':'+'}${String(Math.floor(Math.abs(m)/60)).padStart(2,'0')}:${String(Math.abs(m)%60).padStart(2,'0')}`;
const money=n=>`${n<0?'−':n>0?'+':''}$${Math.abs(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
let st={uid:'',seq:0,busy:false,loading:false,enabled:false,quotesEnabled:false,offset:0,history:[],status:[],error:'',loaded:false,openId:''};let debounce=0;
function reset(uid=''){st={uid,seq:st.seq+1,busy:false,loading:false,enabled:false,quotesEnabled:false,offset:0,history:[],status:[],error:'',loaded:false,openId:''};const root=$('#mmhInvestPnlArchiveV111');if(root){root.querySelector('[data-i111-rows]')?.replaceChildren();root.querySelector('[data-i111-details]')?.replaceChildren();}}
function mount(){let root=$('#mmhInvestPnlArchiveV111');if(root)return root;
 const anchor=$('#mmhInvestAutoPnlV110')||$('#mmhInvestAutoV19');if(!anchor)return null;
 root=document.createElement('section');root.id='mmhInvestPnlArchiveV111';root.className='iv111-root';anchor.insertAdjacentElement('afterend',root);
 root.innerHTML=`<div class="iv111-head"><div><small>INVEST · PROVISIONAL HISTORY</small><h2 data-i111-title></h2><p data-i111-intro></p></div><button type="button" data-i111-refresh></button></div>
 <div class="iv111-opt"><div><strong data-i111-opt-title></strong><p data-i111-opt-info></p><small data-i111-offset></small></div><button type="button" data-i111-toggle></button></div>
 <div class="iv111-summary"><div><small data-i111-status-label></small><b data-i111-status></b></div><div><small data-i111-count-label></small><b data-i111-count></b></div><div><small data-i111-last-label></small><b data-i111-last></b></div></div>
 <h3 data-i111-logs-title></h3><div data-i111-logs></div><h3 data-i111-rows-title></h3><div data-i111-rows></div><div data-i111-details></div><p class="iv111-note" data-i111-note></p><p class="iv111-error" data-i111-error role="status" aria-live="polite"></p>`;
 root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-i111-refresh'))void load(true);
 else if(b.hasAttribute('data-i111-toggle'))void toggle();
 else if(b.dataset.i111Show){st.openId=st.openId===b.dataset.i111Show?'':b.dataset.i111Show;render();}
 else if(b.dataset.i111Delete)void remove(b.dataset.i111Delete);
 });return root;
}
const statusText=s=>({provisional:T('初步复算','Provisional P/L'),waiting_quotes:T('等待历史行情','Waiting for quotes'),missing_quote:T('报价不完整','Missing quotes'),invalid_ledger:T('投资流水需核对','Review investments'),no_position:T('没有可复算持仓','No eligible positions'),capacity:T('记录数量超过上限','Record capacity reached'),error:T('后台复算暂不可用','Server computation unavailable')})[s]||T('尚未复算','Not yet calculated');
function render(){const r=mount();if(!r)return;
 const words={'title':['每日收益 · 后台初步记录','Daily P/L · Provisional archive'],
 'intro':['独立授权后，即使关闭网站也能记录已结束日期的 Crypto 日盈亏。金额基于交易流水与历史行情复算，未经过交易所认证。','After separate consent, a scheduled job can retain completed-day Crypto P/L while the page is closed. Values are provisional, not exchange-certified.'],
 'opt-title':['独立开启后台收益复算','Separate consent for server-side P/L'],
 'opt-info':['与“自动历史报价采集”不同：后台需要读取你的 Crypto 买卖金额、数量及手续费以计算初步收益。不开启就不会为你运行收益复算。','Unlike quote capture, server-side P/L reads your own Crypto amounts, quantities and fees. It never runs unless explicitly enabled.'],
 'status-label':['收益复算授权','P/L consent'], 'count-label':['保留的初步版本','Saved provisional versions'], 'last-label':['最近已记录日期','Latest recorded date'],
 'logs-title':['后台复算状态','Background calculation status'], 'rows-title':['初步每日盈亏档案','Provisional daily P/L history'],
 'note':['重要：USDT 历史价格按近似 USD 使用；账本只有交易日期，没有精确成交时间。这里不是经过认证的交易所收益、净值或投资建议，不会自动交易。关闭复算开关会停止新的后台计算，已保留记录可单独删除。历史记录修改后旧版本可能失效。Gold 不在本模块。','USDT close prices approximate USD; the ledger lacks trade timestamps. This is not certified profit, NAV or trading advice, and makes no trades. Disabling stops new calculations, not stored history. Edited trades can make old versions stale. Gold is excluded.']};
 for(const [k,[z,e]] of Object.entries(words)){const target=r.querySelector('[data-i111-'+k+']');if(target)target.textContent=T(z,e)}
 r.querySelector('[data-i111-refresh]').textContent=st.loading?T('读取中…','Loading…'):T('刷新','Refresh');
 r.querySelector('[data-i111-refresh]').disabled=st.loading||st.busy;
 const toggle=r.querySelector('[data-i111-toggle]');toggle.textContent=st.busy?T('保存中…','Saving…'):st.enabled?T('关闭收益复算','Disable P/L'):T('开启收益复算','Enable P/L');
 toggle.disabled=st.busy||st.loading||!st.uid||(!st.enabled&&!st.quotesEnabled);
 r.querySelector('[data-i111-offset]').textContent=st.quotesEnabled?`UTC${zone(st.offset)} · `+T('跟随历史行情时区','Same offset as archived quotes'):T('需先开启 1.9 自动行情采集。','Enable 1.9 quote capture first.');
 r.querySelector('[data-i111-status]').textContent=!st.uid?T('未登录','Signed out'):!st.loaded?T('读取中','Loading'):st.enabled?T('已授权','Enabled'):T('已关闭','Disabled');
 r.querySelector('[data-i111-count]').textContent=String(st.history.length)+(st.history.length>=40?'+':'');
 r.querySelector('[data-i111-last]').textContent=st.history[0]?.pnl_date||'—';
 r.querySelector('[data-i111-logs]').innerHTML=st.status.length?st.status.map(x=>`<div class="iv111-status"><span>${E(x.pnl_date)} · UTC${zone(Number(x.offset_minutes))}</span><strong>${statusText(x.state)}</strong><small>${new Date(x.checked_at).toLocaleString()}</small></div>`).join(''):`<p class="iv111-empty">${T('尚无后台收益复算状态，只有授权并具备完整报价后才会生成。','No background result yet; complete quotes and explicit consent are required.')}</p>`;
 r.querySelector('[data-i111-rows]').innerHTML=st.history.length?st.history.map(x=>`<div class="iv111-record"><div><small>${E(x.pnl_date)} · UTC${zone(Number(x.offset_minutes))}</small><strong class="${Number(x.pnl_usd)>=0?'iv111-gain':'iv111-loss'}">${money(Number(x.pnl_usd))}</strong><small>${T('初步复算 · 非审计记录','Provisional · not audited')} · ${new Date(x.generated_at).toLocaleString()}</small></div><div class="iv111-buttons"><button type="button" data-i111-show="${E(x.id)}">${T('依据','Evidence')}</button><button type="button" data-i111-delete="${E(x.id)}">${T('删除','Delete')}</button></div></div>`).join(''):`<p class="iv111-empty">${T('尚无保存的初步收益。不会自动补造过去的盈亏。','No provisional P/L saved yet. Past returns will not be fabricated.')}</p>`;
 const row=st.history.find(x=>x.id===st.openId);
 r.querySelector('[data-i111-details]').innerHTML=row?`<div class="iv111-detail"><h4>${E(row.pnl_date)} · ${T('复算依据','Calculation inputs')}</h4><div class="iv111-table"><table><thead><tr><th>${T('币种','Coin')}</th><th>${T('数量：前→后','Quantity: start→end')}</th><th>${T('交易资金流','Trading cash flow')}</th><th>${T('当日初步盈亏','Provisional P/L')}</th></tr></thead><tbody>${(Array.isArray(row.details)?row.details:[]).map(x=>`<tr><td>${E(x.symbol)}</td><td>${E(x.qty_before)} → ${E(x.qty_after)}</td><td>${money(Number(x.cash_flow))}</td><td>${money(Number(x.pnl_usd))}</td></tr>`).join('')}</tbody></table></div><p>${T('原交易流水摘要','Ledger digest')}: <code>${E(String(row.ledger_hash||'').slice(0,16))}…</code> · ${T('行情摘要','Quote digest')}: <code>${E(String(row.quote_hash||'').slice(0,16))}…</code></p></div>`:'';
 r.querySelector('[data-i111-error]').textContent=st.error;
}
async function load(force=false){const uid=owner();if(uid!==st.uid)reset(uid);if(!uid){render();return;}if(st.busy||st.loading||(!force&&st.loaded))return;
 const sdk=api();if(!sdk){st.error=T('无法访问云端。','Cloud is unavailable.');render();return;}
 st.loading=true;const token=++st.seq;st.error='';render();
 try{const who=(await sdk.auth.getUser()).data?.user;if(!who||who.id!==uid)throw Error('session');
 const [consent,market,rows,logs]=await Promise.all([
 sdk.from('invest_auto_pnl_settings').select('enabled').eq('user_id',uid).maybeSingle(),
 sdk.from('invest_auto_quote_settings').select('enabled,offset_minutes').eq('user_id',uid).maybeSingle(),
 sdk.from('invest_auto_daily_pnl_previews').select('id,pnl_date,offset_minutes,pnl_usd,details,ledger_hash,quote_hash,generated_at').eq('user_id',uid).order('generated_at',{ascending:false}).limit(40),
 sdk.from('invest_auto_pnl_status').select('pnl_date,offset_minutes,state,checked_at').eq('user_id',uid).order('checked_at',{ascending:false}).limit(8)
 ]);
 if(consent.error||market.error||rows.error||logs.error)throw Error('read');
 if(token!==st.seq||uid!==st.uid)return;
 const again=(await sdk.auth.getUser()).data?.user;if(again?.id!==uid)throw Error('session');
 st.enabled=consent.data?.enabled===true;st.quotesEnabled=market.data?.enabled===true;st.offset=Number(market.data?.offset_minutes)||0;
 st.history=rows.data||[];st.status=logs.data||[];st.loaded=true;
 }catch{if(token===st.seq&&uid===st.uid)st.error=T('读取失败，请重试。','Cloud read failed. Retry.');}
 finally{if(token===st.seq&&uid===st.uid){st.loading=false;render();}}
}
async function toggle(){if(!st.uid||st.busy||st.loading)return;const uid=st.uid,on=!st.enabled;
 if(on&&!st.quotesEnabled){st.error=T('先开启 1.9 自动历史行情采集。','Enable 1.9 quote capture first.');render();return;}
 if(on&&!confirm(T('确认授权？后台将按计划读取你的 Crypto 投资日期、买卖金额、数量与手续费，并保存“初步”每日盈亏（非已审计收益）。可随时关闭，不进行任何实际交易。','Allow server-side processing of your Crypto trade dates, amounts, quantities and fees for provisional daily P/L? Never executes trades. This consent is separate and can be disabled.')))return;
 const sdk=api();if(!sdk)return;st.busy=true;st.error='';const token=++st.seq;render();
 try{const who=(await sdk.auth.getUser()).data?.user;if(who?.id!==uid)throw Error('session');
 const v=await sdk.from('invest_auto_pnl_settings').upsert({user_id:uid,enabled:on,updated_at:new Date().toISOString()},{onConflict:'user_id'});
 if(v.error)throw Error('save');if(token===st.seq&&uid===st.uid){st.enabled=on;st.error=T('已保存，你可以在下一次后台检查后查看结果。','Saved. Review after the next scheduled check.');}
 }catch{if(token===st.seq&&uid===st.uid)st.error=T('无法确认保存结果，请刷新检查。','Save could not be confirmed; refresh to check.');}
 finally{if(token===st.seq&&uid===st.uid){st.busy=false;render();}}
}
async function remove(id){const row=st.history.find(x=>String(x.id)===String(id));if(!row||!st.uid||st.busy)return;
 if(!confirm(T('删除这条初步收益记录？不会删除原始投资交易或历史行情。','Delete this provisional result? Trades and quotes remain unchanged.')))return;
 const uid=st.uid,token=++st.seq;st.busy=true;st.error='';render();
 try{const sdk=api();const who=(await sdk.auth.getUser()).data?.user;if(who?.id!==uid)throw Error('session');
 const r=await sdk.from('invest_auto_daily_pnl_previews').delete().eq('user_id',uid).eq('id',row.id);
 if(r.error)throw Error('delete');if(token===st.seq&&uid===st.uid){st.history=st.history.filter(x=>x.id!==row.id);st.openId='';st.error=T('已删除初步记录。','Provisional result deleted.');}
 }catch{if(token===st.seq&&uid===st.uid)st.error=T('删除失败，请刷新后重试。','Delete failed. Refresh and retry.');}
 finally{if(token===st.seq&&uid===st.uid){st.busy=false;render();}}
}
let timer=0;function schedule(force=true){const uid=owner();if(uid!==st.uid){reset(uid);render();}clearTimeout(timer);timer=setTimeout(()=>{if($('#invest')?.classList.contains('active'))void load(force);},350)}
['mmhvault:data-loaded','mmhvault:cache-restored','mmhvault:invest-daily-ready'].forEach(x=>window.addEventListener(x,()=>schedule(false)));
window.addEventListener('mmhvault:page-visible',e=>{if(e.detail?.page==='invest')schedule(true)});
['languagechange','mmhvault-language-change'].forEach(x=>window.addEventListener(x,render));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(true)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(false),{once:true});else schedule(false);
window.mmhInvestAutoPnLV111={refresh:()=>load(true)};
})();
