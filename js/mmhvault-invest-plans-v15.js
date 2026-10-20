/* MMHVAULT Invest 1.5 | Cloud-synced read-only planning snapshots and crypto concentration review.
 * Does not reserve cash, execute trades, change holdings, or make trade recommendations.
 * Every saved plan is a dated historical scenario, not a live or guaranteed valuation.
 */
(()=>{'use strict';
if(window.__mmhInvestPlansV15)return;window.__mmhInvestPlansV15=true;
const $=id=>document.getElementById(id), TABLE='invest_risk_plans_v15',LIMIT=100,MAX_SAVED=50;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const zh=()=>{try{return window.getMMHVAULTLanguage?.()==='zh'||document.documentElement.lang?.toLowerCase().startsWith('zh')}catch(_){return false}};
const T=(cn,en)=>zh()?cn:en;
const owner=()=>{try{return typeof currentSessionUser!=='undefined'?String(currentSessionUser?.id||''):''}catch(_){return ''}};
const getDB=()=>{try{return typeof db!=='undefined'?db:null}catch(_){return null}};
const dollar=n=>Number.isFinite(Number(n))?'$'+Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const pct=n=>Number.isFinite(Number(n))?Number(n).toFixed(1)+'%':'—';
const validSymbol=s=>/^[A-Z0-9]{2,12}$/.test(String(s||''));
let active='',records=[],loaded=false,loading=false,busy=false,loadSeq=0,pendingDraft=null,requestId='',warn='',savedAt=0;
function clear(next=''){
 loadSeq++;active=next;records=[];loaded=false;loading=false;busy=false;pendingDraft=null;requestId='';warn='';savedAt=0;
 const r=$('mmhInvestPlansV15');if(r){r.querySelector('[data-ip15-preview]')?.replaceChildren();r.querySelector('[data-ip15-list]')?.replaceChildren();r.querySelector('[data-ip15-status]')?.replaceChildren();}
}
function snapshot(){const s=window.mmhInvestDailyV1?.guidanceSnapshot?.();return s?.owner===owner()?s:null;}
function positionState(){return window.mmhInvestRiskV14?.positions?.(snapshot())||{ok:false,reason:'source'};}
function currentPlan(){
 const risk=$('mmhInvestRiskV14'),form=risk?.querySelector('[data-ivr-form]');
 if(!form||!risk.querySelector('.ivr14-summary'))return {ok:false,reason:'first'};
 const state=positionState();if(!state.ok)return {ok:false,reason:'quote'};
 const inputs=Object.fromEntries(new FormData(form));
 const held=state.rows.find(x=>x.sym===inputs.symbol);
 if(!held)return {ok:false,reason:'holding'};
 const result=window.mmhInvestRiskV14?.calculatePlan?.({...inputs,symbol:held.sym,price:held.price,existingQuantity:held.qty,existingBasis:held.basis,portfolioValue:state.total});
 if(!result?.ok)return {ok:false,reason:'changed'};
 if(result.budget<=0||result.budget>999999999||!validSymbol(held.sym))return {ok:false,reason:'changed'};
 // Supabase stores explicitly user-approved historical scenario inputs; not current financial truth.
 const data={title:held.sym+' '+T('分批模拟','staged scenario'),symbol:held.sym,currency:'USD',stages:result.stages,
  budget:+result.budget.toFixed(2),user_cash_reference:+result.cash.toFixed(2),per_order_cap:+result.entries[0].spend.toFixed(2),
  fee_percent:+(result.fee*100).toFixed(4),weight_cap:+result.cap.toFixed(2),quote_price:held.price,
  quote_timestamp:new Date(state.quoteAt).toISOString(),position_qty:held.qty,position_basis:held.basis,portfolio_value:state.total};
 // Per-order cap is independently read from form (not average spend), using strict validation.
 data.per_order_cap=Number(inputs.perOrderCap);
 if(Object.values(data).some(v=>typeof v==='number'&&!Number.isFinite(v)))return {ok:false,reason:'changed'};
 return {ok:true,data,result,quotedAt:state.quoteAt};
}
function capModel(rows){
 const state=positionState();if(!state.ok)return {ok:false,reason:state.reason};
 const sorted=state.rows.map(x=>({...x,weight:100*x.value/state.total})).sort((a,b)=>b.value-a.value);
 const top3=sorted.slice(0,3).reduce((sum,x)=>sum+x.weight,0);
 const hhi=sorted.reduce((sum,x)=>sum+(x.weight/100)**2,0);
 return {ok:true,total:state.total,rows:sorted,top1:sorted[0].weight,top3,hhi,at:state.quoteAt};
}
function root(){const anchor=$('mmhInvestRiskV14');if(!anchor)return null;
 let r=$('mmhInvestPlansV15');if(r)return r;
 r=document.createElement('section');r.id='mmhInvestPlansV15';r.className='ip15-root';anchor.insertAdjacentElement('afterend',r);
 r.innerHTML=`<div class="ip15-title"><div><span class="ip15-kicker">INVEST · RISK & SAVED PLANS</span><h2 data-ip15-heading></h2><p data-ip15-desc></p></div></div>
 <div data-ip15-risk></div><div class="ip15-savebar"><div><b data-ip15-save-title></b><p data-ip15-save-desc></p></div><button type="button" data-ip15-capture class="ip15-gold"></button></div>
 <div data-ip15-preview aria-live="polite"></div><div class="ip15-saved-head"><h3 data-ip15-list-title></h3><button type="button" data-ip15-reload></button></div>
 <div data-ip15-status role="status" aria-live="polite"></div><div data-ip15-list></div><p data-ip15-foot class="ip15-foot"></p>`;
 r.addEventListener('click',e=>{
  if(e.target.closest('[data-ip15-capture]'))capture();
  if(e.target.closest('[data-ip15-commit]'))commit();
  if(e.target.closest('[data-ip15-discard]')){pendingDraft=null;requestId='';renderPreview();}
  if(e.target.closest('[data-ip15-reload]'))load(true);
  const archive=e.target.closest('[data-ip15-archive]');if(archive)toggle(archive.dataset.ip15Archive);
  const del=e.target.closest('[data-ip15-delete]');if(del)remove(del.dataset.ip15Delete);
 });
 return r;
}
function feedback(msg='',error=false){warn=msg;const e=root()?.querySelector('[data-ip15-status]');if(e){e.textContent=msg;e.classList.toggle('ip15-error',error);}}
function reason(r){return ({first:T('请先在上方完成一次“模拟补仓后仓位”，再保存该次方案。','Run the staged-buy calculator above before saving this scenario.'),quote:T('实时行情缺失或过期，暂不能建立可靠的模拟快照。','Quotes are missing or stale. This scenario cannot be captured.'),holding:T('所选持仓已改变，先重新模拟。','Selected holding changed. Run the model again.'),changed:T('参数或数据已变化，请重新完成模拟。','Inputs or data have changed. Recalculate first.'),source:T('分批模拟模块尚未就绪。','Staged-buy model is not available.')})[r]||T('目前无法核实数据。','Data cannot be verified.');}
function renderRisk(){const r=root();if(!r)return;const e=r.querySelector('[data-ip15-risk]');const model=capModel();
 if(!model.ok){e.innerHTML=`<div class="ip15-missing">${T('组合风险需要完整、五分钟内更新的 Crypto 行情与持仓成本。缺失数据时不会显示估算集中度。','Concentration review needs complete, fresh crypto quotes and reconciled positions. Missing data is not estimated.')}</div>`;return;}
 const top=model.rows[0],risk=model.top1>45?T('单币种比例较高，请检查是否符合你的风险预算。','Single-coin concentration is high. Review your allocation limits.'):model.top1>35?T('最大仓位已超过 35% 参考线；这是风险提醒，不是减仓指令。','Top weight exceeds a 35% reference line. This is a risk flag, not a trade instruction.'):T('最大仓位未超过 35% 参考线，仍需结合其他资产和个人承受能力。','Top weight is below the 35% reference line. Consider other assets and your risk capacity too.');
 e.innerHTML=`<div class="ip15-risk-grid"><div><small>${T('Crypto 组合市值','Crypto value')}</small><b>${dollar(model.total)}</b></div><div><small>${T('最大单币种占比','Largest coin weight')}</small><b>${pct(model.top1)}</b><span>${esc(top.sym)}</span></div><div><small>${T('前三币种合计','Top-three weight')}</small><b>${pct(model.top3)}</b></div></div>
 <div class="ip15-bar">${model.rows.slice(0,8).map(x=>`<div><span>${esc(x.sym)}</span><div class="ip15-track"><i style="width:${Math.min(100,x.weight).toFixed(3)}%"></i></div><b>${pct(x.weight)}</b></div>`).join('')}</div>
 <p class="ip15-risk-note">${esc(risk)} ${T('此比例仅覆盖 Crypto，不含 Gold、现金或其他资产。','Weights cover crypto only, not Gold, cash or other assets.')}</p>`;
}
function renderPreview(){const r=root();if(!r)return;const el=r.querySelector('[data-ip15-preview]');if(!pendingDraft){el.replaceChildren();return;}
 const {data,result}=pendingDraft;
 el.innerHTML=`<div class="ip15-preview-card"><div class="ip15-preview-head"><strong>${T('保存前确认历史快照','Confirm scenario snapshot')}</strong><span>${esc(data.symbol)} · ${esc(new Date(data.quote_timestamp).toLocaleString())}</span></div><div class="ip15-preview-metrics"><div><small>${T('参考行情','Captured quote')}</small><b>${dollar(data.quote_price)}</b></div><div><small>${T('模拟总投入','Hypothetical budget')}</small><b>${dollar(data.budget)}</b></div><div><small>${T('模拟后均价','Projected average')}</small><b>${dollar(result.projectedAvg)}</b></div><div><small>${T('模拟后仓位','Projected weight')}</small><b>${pct(result.projectedWeight)}</b></div></div><p>${result.capExceeded?T('注意：该方案超过你自己设定的仓位上限，仅保存作为风险情境。','Warning: scenario exceeds your weight cap. Saved as a risk scenario only.'):T('这是按当时价格和假设条件生成的方案，不会随行情自动更新。','This is a dated hypothetical scenario and will not update with markets.')}</p><div class="ip15-buttons"><button type="button" data-ip15-commit class="ip15-gold" ${busy?'disabled':''}>${T('确认保存快照','Confirm save')}</button><button type="button" data-ip15-discard ${busy?'disabled':''}>${T('取消','Cancel')}</button></div></div>`;
}
function capture(){if(busy)return;const uid=owner();if(!uid){feedback(T('请先登录账户。','Sign in first.'),true);return;}
 if(pendingDraft){feedback(T('已有一项待确认的快照，请先保存或取消。','Confirm or cancel the pending snapshot first.'),true);return;}
 const r=currentPlan();if(!r.ok){feedback(reason(r.reason),true);return;}
 if(!globalThis.crypto?.randomUUID){feedback(T('浏览器无法生成安全请求编号，暂不保存。','Cannot generate secure request ID in this browser.'),true);return;}
 pendingDraft={data:r.data,result:r.result,owner:uid};requestId=crypto.randomUUID();feedback(T('请核对这次模拟的数据，然后确认保存。','Review the scenario before saving.'));
 renderPreview();
}
async function session(uid){const dbc=getDB();if(!dbc?.auth?.getUser)throw Error(T('Supabase 暂不可用。','Supabase is unavailable.'));
 const {data,error}=await dbc.auth.getUser();if(error||data?.user?.id!==uid||owner()!==uid)throw Error(T('登录账户已改变，请重新打开。','Login changed. Reopen the page.'));return dbc;
}
function stillSameDraft(){const r=currentPlan();if(!r.ok||!pendingDraft)return false;
 const x=pendingDraft.data,y=r.data;
 // A newly updated live quote or edited 1.4 model invalidates the prior confirmation.
 return owner()===pendingDraft.owner&&Object.keys(x).every(k=>x[k]===y[k]);
}
async function commit(){const uid=owner(),d=pendingDraft;if(!uid||busy||!d||d.owner!==uid)return;
 if(!loaded||loading){feedback(T('需要先确认云端计划列表完整加载，请刷新后重试。','Cloud plans must load completely before saving. Refresh and retry.'),true);return;}
 if(!stillSameDraft()){feedback(T('行情或模拟参数已变化，请取消并重新模拟后保存。','Quote or model changed. Discard and rerun the scenario.'),true);return;}
 if(records.length>=MAX_SAVED){feedback(T('最多保存 50 个投资草案，请先归档或整理。','Limit of 50 planning snapshots. Review older records.'),true);return;}
 busy=true;renderPreview();try{
  const dbc=await session(uid);
  const payload={...d.data,user_id:uid,client_request_id:requestId,is_archived:false};
  const {error}=await dbc.from(TABLE).insert(payload).select('id').maybeSingle();if(error)throw error;
  if(owner()!==uid)return;
  pendingDraft=null;requestId='';renderPreview();loaded=false;feedback(T('模拟快照已保存，未发生任何真实交易。','Scenario saved. No trade was executed.'));
 }catch(e){if(owner()===uid){let recovered=false;
   try{const dbc=await session(uid);const r=await dbc.from(TABLE).select('id,user_id').eq('user_id',uid).eq('client_request_id',requestId).maybeSingle();recovered=!!r.data&&!r.error;}catch(_){}
   if(recovered){pendingDraft=null;requestId='';renderPreview();loaded=false;feedback(T('已核实之前的提交成功，没有重复新增。','Earlier save confirmed; no duplicate created.'));}
   else feedback(T('保存结果尚未确认。保留相同请求编号，稍后可重试；不要更改模拟参数。','Save outcome unknown. Same request ID retained for safe retry; do not change the model.')+' '+String(e?.message||e),true);
  }}finally{busy=false;if(owner()===uid){renderPreview();await load(true);}else clear(owner());}
}
async function load(force=false){const r=root();if(!r)return;const uid=owner();if(uid!==active)clear(uid);if(!uid){renderList();return;}
 if(loading||busy||(!force&&loaded&&Date.now()-savedAt<60000))return;
 const token=++loadSeq;loading=true;renderList();try{const dbc=await session(uid);
  const {data,error}=await dbc.from(TABLE).select('id,user_id,client_request_id,title,symbol,stages,budget,quote_price,quote_timestamp,position_qty,position_basis,portfolio_value,weight_cap,fee_percent,per_order_cap,user_cash_reference,is_archived,version,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(LIMIT+1);
  if(error)throw error;if(token!==loadSeq||owner()!==uid)return;
  if((data||[]).length>LIMIT)throw Error(T('计划记录过多，拒绝显示不完整列表。','Too many records; refusing an incomplete list.'));
  records=(data||[]).filter(x=>x.user_id===uid);loaded=true;savedAt=Date.now();if(!pendingDraft)feedback('');
 }catch(e){if(token===loadSeq&&owner()===uid){records=[];loaded=false;feedback(T('无法读取计划：','Cannot read saved plans: ')+String(e?.message||e),true);}}
 finally{if(token===loadSeq){loading=false;renderList();}}
}
function renderList(){const r=root();if(!r)return;const el=r.querySelector('[data-ip15-list]');if(!active){el.innerHTML=`<div class="ip15-missing">${T('请先登录以查看私人投资草案。','Sign in to view your saved private scenarios.')}</div>`;return;}
 if(!loaded){el.innerHTML=`<div class="ip15-missing">${T('正在读取投资计划…','Loading planning snapshots…')}</div>`;return;}
 if(!records.length){el.innerHTML=`<div class="ip15-missing">${T('还没有保存过投资方案。先用上方分批模拟器计算，再保存快照。','No saved scenarios yet. Calculate above, then capture a snapshot.')}</div>`;return;}
 el.innerHTML=records.map(x=>{const old=Number(x.quote_price),budget=Number(x.budget),qty=Number(x.position_qty),basis=Number(x.position_basis),count=Number(x.stages);
  const historical=Number.isFinite(old)&&old>0&&Number.isFinite(qty)&&qty>0&&Number.isFinite(basis)&&Number.isFinite(budget)&&budget>0;
  const summary=historical?`<span>${T('保存时价格','Saved quote')} <b>${dollar(old)}</b></span><span>${T('假设总预算','Scenario budget')} <b>${dollar(budget)}</b></span><span>${T('现有平均成本','Saved basis/qty')} <b>${dollar(basis/qty)}</b></span>`:`<span>${T('历史快照待核对','Stored snapshot needs review')}</span>`;
  return `<article class="ip15-item ${x.is_archived?'ip15-archived':''}"><div class="ip15-row"><div><b>${esc(x.title)}</b><small>${esc(x.symbol)} · ${esc(String(count))} ${T('批','tranches')} · ${esc(new Date(x.created_at).toLocaleDateString())}</small></div><span class="ip15-chip">${x.is_archived?T('已归档','Archived'):T('草案','Draft')}</span></div><div class="ip15-item-data">${summary}</div><p>${T('保存在当时行情下的模拟参数，不是当前估值、不代表已有现金或真实交易。','Historical what-if inputs, not today’s valuation, verified available cash, or an executed trade.')}</p><div class="ip15-buttons"><button type="button" data-ip15-archive="${esc(x.id)}">${x.is_archived?T('恢复','Restore'):T('归档','Archive')}</button><button type="button" class="ip15-delete" data-ip15-delete="${esc(x.id)}">${T('删除','Delete')}</button></div></article>`;
 }).join('');
}
async function toggle(id){const uid=owner(),row=records.find(x=>x.id===id);if(!uid||!row||busy)return;busy=true;try{const dbc=await session(uid);
 const {data,error}=await dbc.from(TABLE).update({is_archived:!row.is_archived,version:Number(row.version)+1,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',uid).eq('version',row.version).select('id').maybeSingle();if(error)throw error;if(!data)throw Error(T('数据被另一台设备修改，请刷新。','Another device changed this plan. Refresh.'));
 loaded=false;feedback(T('计划状态已更新。','Plan status updated.'));
 }catch(e){if(owner()===uid)feedback(String(e?.message||e),true);}finally{busy=false;if(owner()===uid)await load(true);else clear(owner());}
}
async function remove(id){const uid=owner(),row=records.find(x=>x.id===id);if(!uid||!row||busy)return;
 if(!confirm(T('确认删除这份模拟计划？不会影响原始投资。','Delete this saved scenario? Existing investments are unaffected.')))return;
 busy=true;try{const dbc=await session(uid);const {data,error}=await dbc.from(TABLE).delete().eq('user_id',uid).eq('id',id).eq('version',row.version).select('id').maybeSingle();if(error)throw error;if(!data)throw Error(T('记录已变化，请刷新。','Record changed. Refresh.'));loaded=false;
 }catch(e){if(owner()===uid)feedback(String(e?.message||e),true);}finally{busy=false;if(owner()===uid)await load(true);else clear(owner());}
}
function localize(){const r=root();if(!r)return;
 r.querySelector('[data-ip15-heading]').textContent=T('投资仓位风险与计划保存','Portfolio Risk & Saved Plans');
 r.querySelector('[data-ip15-desc]').textContent=T('仅依据已核实的 Crypto 持仓比例观察集中风险，并保存每次模拟的历史快照。','Review crypto concentration and save dated staged-buy what-if snapshots.');
 r.querySelector('[data-ip15-save-title]').textContent=T('保存上方分批模拟结果','Save staged-buy scenario above');
 r.querySelector('[data-ip15-save-desc]').textContent=T('先运行上方分批模拟，再复核当前行情与投入参数。','First run the calculator above; then confirm the quote and budget inputs.');
 r.querySelector('[data-ip15-capture]').textContent=T('复核并保存计划','Review & save scenario');
 r.querySelector('[data-ip15-list-title]').textContent=T('我的历史投资计划','My saved scenarios');
 r.querySelector('[data-ip15-reload]').textContent=T('刷新云端','Refresh cloud');
 r.querySelector('[data-ip15-foot]').textContent=T('保存计划不占用真实资金、不自动交易、不会自动更新价格，也不向外部发出提醒。多个草案可能互斥，不能将其预算简单相加当作资金预留。','Saved plans do not reserve real funds, place orders, update quotes automatically, or send push. Alternative scenarios may overlap; do not sum them as reserved cash.');
}
let t=0;function schedule(){clearTimeout(t);t=setTimeout(()=>{if(!$('invest')?.classList.contains('active'))return;
 const uid=owner();if(uid!==active)clear(uid);
 if(root()){localize();renderRisk();if(!loaded&&!loading&&!busy&&uid)load();else renderList();if(pendingDraft)renderPreview();}
 },180);}
['mmhvault:invest-daily-ready','mmhvault:data-loaded','mmhvault:page-visible','mmhvault:config-owner-changed','languagechange','mmhvault-language-change'].forEach(evt=>window.addEventListener(evt,schedule,{passive:true}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
setInterval(()=>{if(!document.hidden&&$('invest')?.classList.contains('active')){if(owner()!==active)clear(owner());schedule();}},60000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.mmhInvestPlansV15={capModel,currentPlan,renderRisk,load,clear};
})();
