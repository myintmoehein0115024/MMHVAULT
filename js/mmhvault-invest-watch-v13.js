/* MMHVAULT Invest 1.3 — account-scoped price/risk WATCH PLANS.
 * Rules only; no brokerage action, cash movement, background push or market forecast.
 * Never present manually entered Gold quotes as verified real-time prices.
 */
(()=>{'use strict';
if(window.__mmhInvestWatchV13)return;window.__mmhInvestWatchV13=true;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lang=()=>{try{return window.getMMHVAULTLanguage?.()==='zh'||document.documentElement.lang?.toLowerCase().startsWith('zh')}catch(_){return false}};
const T=(cn,en)=>lang()?cn:en;
const owner=()=>{try{return typeof currentSessionUser!=='undefined'?String(currentSessionUser?.id||''):''}catch(_){return ''}};
const money=(n,asset)=>`${asset==='Gold'?'K ':'$'}${Number(n).toLocaleString(undefined,{maximumFractionDigits:asset==='Gold'?2:6})}`;
const table='invest_price_watch_plans';
let activeOwner='',rows=[],loaded=false,pending=false,readToken=0,editing='',formOpen=false,warning='',draftRequestId='',draftSignature='';
const rowId=v=>String(v||'');
const validSymbol=v=>/^[A-Z0-9]{2,12}$/.test(v);
const readSnapshot=()=>window.mmhInvestDailyV1?.guidanceSnapshot?.();
function cryptoWeight(snapshot,sym){
 const ledger=new Map();const symbols=(snapshot?.holdings||[]).filter(x=>x.asset==='Crypto');
 for(const rec of symbols){const k=String(rec.symbol||'').toUpperCase(),q=Number(rec.quantity);if(!validSymbol(k)||!Number.isFinite(q))return null;ledger.set(k,(ledger.get(k)||0)+q)}
 let total=0,specific=0;
 for(const [key,qty] of ledger){if(qty < -1e-8)return null;if(qty<=1e-8)continue;const price=Number(snapshot?.live?.[key]?.price);if(!(price>0))return null;const amount=qty*price;total+=amount;if(key===sym)specific=amount;}
 return total>0?100*specific/total:null;
}
function evaluate(plan,snapshot,now=Date.now()){
 const base={state:'unknown',current:null,unit:plan.condition==='weight_above'?'%':plan.currency,reason:'missing'};
 if(!snapshot?.owner||snapshot.owner!==owner())return {...base,reason:'account'};
 if(!plan.is_active)return {...base,state:'paused',reason:'paused'};
 if(plan.asset_type==='Gold'){
  const list=(snapshot.goldQuotes||[]).filter(q=>Number(q.price)>0&&/^\d{4}-\d{2}-\d{2}$/.test(q.date)).sort((a,b)=>b.date.localeCompare(a.date));
  return {...base,state:'manual',current:list[0]?Number(list[0].price):null,reason:'manual',observed:list[0]?.date||''};
 }
 const stamped=Number(snapshot.quotedAt);
 if(snapshot.quoteAvailable!==true||!Number.isFinite(stamped)||stamped>now||now-stamped>300000)return {...base,reason:'stale'};
 const price=Number(snapshot.live?.[plan.symbol]?.price);
 if(!(price>0))return {...base,reason:'quote'};
 let observed=price;
 if(plan.condition==='weight_above'){
  observed=cryptoWeight(snapshot,plan.symbol);
  if(!Number.isFinite(observed))return {...base,reason:'portfolio'};
 }
 const threshold=Number(plan.target_value);
 if(!(threshold>0))return {...base,reason:'threshold'};
 const met=plan.condition==='price_below'?observed<=threshold:observed>=threshold;
 return {...base,state:met?'met':'pending',current:observed,reason:'fresh',observed:new Date(stamped).toISOString()};
}
function snapshotMatches(){const s=readSnapshot();return s&&s.owner===activeOwner?s:null}
function getDB(){try{return typeof db!=='undefined'?db:null}catch(_){return null}}
function reset(next=''){readToken++;activeOwner=next;rows=[];loaded=false;pending=false;warning='';editing='';formOpen=false;draftRequestId='';draftSignature='';const root=$('mmhInvestWatchV13');if(root){root.querySelector('[data-watch-list]')?.replaceChildren();root.querySelector('[data-watch-form]')?.replaceChildren();}}
function rootUI(){const anchor=$('mmhInvestGuidanceV12')||$('mmhInvestDailyV1');if(!anchor)return null;
 let root=$('mmhInvestWatchV13');if(root)return root;
 root=document.createElement('section');root.id='mmhInvestWatchV13';root.className='ivw13-root';
 root.innerHTML=`<div class="ivw13-title"><div><div class="ivw13-kicker">INVEST · PERSONAL WATCH PLANS</div><h2></h2><p data-watch-desc></p></div><button type="button" data-watch-new class="ivw13-primary"></button></div><div data-watch-feedback class="ivw13-feedback" role="status" aria-live="polite"></div><div data-watch-form></div><div data-watch-list class="ivw13-list"></div><p class="ivw13-foot"></p>`;
 anchor.insertAdjacentElement('afterend',root);
 root.addEventListener('click',e=>{
  const newBtn=e.target.closest('[data-watch-new]');if(newBtn){editing='';formOpen=!formOpen;draftRequestId='';draftSignature='';renderForm();return;}
  const edit=e.target.closest('[data-watch-edit]');if(edit){editing=rowId(edit.dataset.watchEdit);formOpen=true;draftRequestId='';draftSignature='';renderForm();return;}
  const cancel=e.target.closest('[data-watch-cancel]');if(cancel){formOpen=false;editing='';draftRequestId='';draftSignature='';renderForm();return;}
  const flip=e.target.closest('[data-watch-toggle]');if(flip)toggle(rowId(flip.dataset.watchToggle));
  const del=e.target.closest('[data-watch-delete]');if(del)remove(rowId(del.dataset.watchDelete));
  const refresh=e.target.closest('[data-watch-reload]');if(refresh)load(true);
 });
 root.addEventListener('submit',e=>{if(e.target.matches('[data-watch-editor]')){e.preventDefault();save(new FormData(e.target));}});
 root.addEventListener('change',e=>{if(e.target.matches('[name="asset_type"],[name="condition"],[name="intent"]'))formMode();});
 return root;
}
function statusText(s){
 if(s.state==='met')return T('关注条件已达到','Watch condition met');
 if(s.state==='pending')return T('尚未达到','Not reached');
 if(s.state==='manual')return T('仅人工核对','Manual review only');
 if(s.state==='paused')return T('已暂停','Paused');
 return T('待核实','Needs verification');
}
function explanation(s){
 if(s.reason==='stale')return T('实时报价超过 5 分钟或不可用，暂停判断。','Live quote is unavailable or older than five minutes.');
 if(s.reason==='portfolio')return T('有持仓价格或数量无法核对，暂停仓位比例判断。','Cannot verify every position and quote.');
 if(s.reason==='manual')return T('金价来自手动记录，不自动判定条件达成，也不发送推送。','Gold quote is manually recorded; never triggers an automatic alert or push.');
 if(s.reason==='quote')return T('当前币种缺少有效实时报价。','No valid current price for this asset.');
 if(s.reason==='account')return T('账户或数据源尚未完成校验。','Account or source has not been verified.');
 if(s.reason==='paused')return T('此项关注已关闭。','This watch is turned off.');
 return T('该条件只是个人关注线，不代表必须交易。','This threshold is for review, not a trading instruction.');
}
function labelCondition(row){return ({price_below:T('价格低于或等于','Price at or below'),price_above:T('价格高于或等于','Price at or above'),weight_above:T('仓位占比高于或等于','Portfolio weight at or above')})[row.condition]||row.condition;}
function renderRows(){const r=rootUI();if(!r)return;const list=r.querySelector('[data-watch-list]');
 if(!activeOwner){list.innerHTML=`<p class="ivw13-empty">${T('登录后可以保存个人关注条件。','Sign in to save your watch plans.')}</p>`;return;}
 if(!loaded){list.innerHTML=`<p class="ivw13-empty">${T('正在载入云端关注计划…','Loading saved watch plans…')}</p>`;return;}
 if(!rows.length){list.innerHTML=`<p class="ivw13-empty">${T('暂未设置关注计划。可以先为一种持仓添加价格或仓位参考线。','No watch plans yet. Add a price or allocation reference for one asset.')}</p>`;return;}
 const snapshot=snapshotMatches();
 list.innerHTML=rows.map(row=>{const status=evaluate(row,snapshot),metric=status.current==null?'—':status.unit==='%'?`${status.current.toFixed(2)}%`:money(status.current,row.asset_type);const val=row.condition==='weight_above'?`${Number(row.target_value)}%`:money(row.target_value,row.asset_type);
 return `<article class="ivw13-item ivw13-${status.state}"><div class="ivw13-item-top"><div><b>${esc(row.symbol)}</b><span>${row.intent==='add'?T('补仓关注','Add watch'):T('减仓关注','Trim watch')}</span></div><span class="ivw13-status">${statusText(status)}</span></div><div class="ivw13-datum"><span>${labelCondition(row)} <b>${esc(val)}</b></span><span>${T('最新可用参考','Available reference')} <b>${esc(metric)}</b></span></div><p>${explanation(status)}</p><div class="ivw13-buttons"><button type="button" data-watch-edit="${esc(row.id)}">${T('编辑','Edit')}</button><button type="button" data-watch-toggle="${esc(row.id)}">${row.is_active?T('暂停','Pause'):T('恢复','Resume')}</button><button type="button" class="ivw13-danger" data-watch-delete="${esc(row.id)}">${T('删除','Delete')}</button></div></article>`}).join('');
}
function formMode(){const form=$('mmhInvestWatchV13')?.querySelector('[data-watch-editor]');if(!form)return;
 const asset=form.elements.asset_type.value,intent=form.elements.intent.value,kind=form.elements.condition;
 for(const option of kind.options){const compatible=asset==='Gold'?option.value!=='weight_above':(intent==='add'?option.value==='price_below':option.value!=='price_below');option.hidden=!compatible;option.disabled=!compatible;}
 if(kind.selectedOptions.length===0||kind.selectedOptions[0].disabled)kind.value=asset==='Gold'?(intent==='add'?'price_below':'price_above'):(intent==='add'?'price_below':'price_above');
 const unit=form.querySelector('[data-watch-unit]');unit.textContent=kind.value==='weight_above'?'%':asset==='Gold'?'MMK / kyattha':'USD';
 const symbol=form.elements.symbol;if(asset==='Gold'){symbol.value='GOLD';symbol.readOnly=true;}else if(symbol.readOnly){symbol.readOnly=false;symbol.value='BTC'}
}
function renderForm(){const r=rootUI();if(!r)return;const f=r.querySelector('[data-watch-form]');
 if(!formOpen){f.innerHTML='';return;}
 const row=rows.find(x=>x.id===editing),data=row||{asset_type:'Crypto',symbol:'BTC',intent:'add',condition:'price_below',target_value:'',is_active:true};
 f.innerHTML=`<form class="ivw13-editor" data-watch-editor><div class="ivw13-form-head"><b>${row?T('编辑关注计划','Edit watch plan'):T('新增关注计划','New watch plan')}</b><button type="button" data-watch-cancel aria-label="${T('关闭表单','Close form')}">×</button></div><div class="ivw13-fields">
 <label>${T('投资类型','Asset class')}<select name="asset_type" ${row?'disabled':''}><option value="Crypto" ${data.asset_type==='Crypto'?'selected':''}>Crypto</option><option value="Gold" ${data.asset_type==='Gold'?'selected':''}>Gold</option></select></label>
 <label>${T('投资品种','Asset symbol')}<input name="symbol" value="${esc(data.symbol)}" maxlength="12" required autocomplete="off" ${row?'readonly':''}></label>
 <label>${T('关注目的','Review intent')}<select name="intent"><option value="add" ${data.intent==='add'?'selected':''}>${T('补仓关注','Add review')}</option><option value="trim" ${data.intent==='trim'?'selected':''}>${T('减仓关注','Trim review')}</option></select></label>
 <label>${T('触发条件','Condition')}<select name="condition"><option value="price_below" ${data.condition==='price_below'?'selected':''}>${T('价格低于或等于','Price at/below')}</option><option value="price_above" ${data.condition==='price_above'?'selected':''}>${T('价格高于或等于','Price at/above')}</option><option value="weight_above" ${data.condition==='weight_above'?'selected':''}>${T('仓位占比高于或等于','Weight at/above')}</option></select></label>
 <label class="ivw13-wide">${T('你设置的参考阈值','Your reference threshold')} <small data-watch-unit></small><input name="target_value" inputmode="decimal" type="number" min="0.000001" max="999999999999" step="any" value="${data.target_value||''}" required></label>
 </div><p class="ivw13-hint">${T('只有页面打开且行情新鲜时，才会显示是否达到条件；Gold 的手动金价只供人工核对。不会自动买卖或后台推送。','Condition status updates only while this page is open with fresh data. Gold manual quotes are review-only. No auto-trades or background push.')}</p><div class="ivw13-form-actions"><button type="button" data-watch-cancel>${T('取消','Cancel')}</button><button class="ivw13-primary" type="submit" ${pending?'disabled':''}>${row?T('保存修改','Save changes'):T('保存关注计划','Save watch')}</button></div></form>`;
 formMode();
}
function feedback(msg,err=false){warning=msg;const el=rootUI()?.querySelector('[data-watch-feedback]');if(el){el.textContent=msg;el.classList.toggle('ivw13-error',err);}}
async function confirmedSession(expected){const dbc=getDB();if(!dbc)throw Error(T('Supabase 尚不可用。','Supabase is unavailable.'));
 const {data,error}=await dbc.auth.getUser();if(error||!data?.user||String(data.user.id)!==expected||owner()!==expected)throw Error(T('登录身份已变化，请重新打开页面。','Session changed. Reopen this page.'));return dbc;
}
async function load(force=false){const r=rootUI();if(!r)return;const user=owner();if(user!==activeOwner)reset(user);if(!user){renderRows();return;}if(pending||(!force&&loaded))return;
 const token=++readToken;pending=true;renderRows();try{
  const dbc=await confirmedSession(user);const {data,error}=await dbc.from(table).select('id,user_id,client_request_id,asset_type,symbol,intent,condition,target_value,currency,is_active,version,created_at').eq('user_id',user).order('created_at',{ascending:false}).limit(200);
  if(error)throw error;if(token!==readToken||owner()!==user)return;
  if((data||[]).length>=200)throw Error(T('关注计划过多，请先整理，暂不显示不完整列表。','Too many watches to read safely. Reduce entries.'));
  rows=(data||[]).filter(x=>x.user_id===user);loaded=true;feedback('');
 }catch(err){if(token===readToken&&owner()===user){rows=[];loaded=false;feedback(T('无法读取关注计划：','Cannot read watches: ')+String(err.message||err),true);}}
 finally{if(token===readToken){pending=false;renderRows();if(formOpen&&!r.querySelector('[data-watch-editor]'))renderForm();}}
}
async function save(fd){const user=owner();if(!user||pending)return;
 const old=rows.find(x=>x.id===editing),asset=old?old.asset_type:String(fd.get('asset_type')||'Crypto'),symbol=(old?old.symbol:String(fd.get('symbol')||'').trim().toUpperCase()),intent=String(fd.get('intent')||'add'),condition=String(fd.get('condition')||'price_below'),value=Number(fd.get('target_value'));
 if(!validSymbol(symbol)||(asset==='Gold'&&symbol!=='GOLD')||!['Gold','Crypto'].includes(asset)||!['add','trim'].includes(intent)||!['price_below','price_above','weight_above'].includes(condition)||
 (asset==='Gold'&&condition==='weight_above')||(intent==='add'&&condition!=='price_below')||(intent==='trim'&&condition==='price_below')||!(value>0&&value<=999999999999)||(condition==='weight_above'&&value>100)){
  feedback(T('请检查币种、方向和有效阈值。','Check the asset, direction and threshold.'),true);return;
 }
 if(!old&&rows.length>=50){feedback(T('最多管理 50 项关注计划。','Limit of 50 watch plans.'),true);return;}
 const fingerprint=JSON.stringify([asset,symbol,intent,condition,value]);
 if(!old&&draftSignature&&draftSignature!==fingerprint){feedback(T('上一次提交结果未核实，请先刷新云端数据后重新建立计划。','Previous save remains uncertain. Verify cloud data before creating a changed plan.'),true);return;}
 if(!old&&!draftSignature)draftSignature=fingerprint;
 if(!old&&!draftRequestId)draftRequestId=globalThis.crypto?.randomUUID?.()||'';
 const requestId=old?old.client_request_id:draftRequestId;if(!requestId){feedback(T('当前浏览器无法安全生成保存编号。','Cannot generate a secure request ID.'),true);return;}
 pending=true;const submit=rootUI()?.querySelector('[data-watch-editor] button[type=submit]');if(submit)submit.disabled=true;try{const dbc=await confirmedSession(user);
 const fields={intent,condition,target_value:value};let result;
 if(old){result=await dbc.from(table).update({...fields,version:Number(old.version)+1,updated_at:new Date().toISOString()}).eq('id',old.id).eq('user_id',user).eq('version',old.version).select('id').maybeSingle();if(!result.error&&!result.data)throw Error(T('其他设备已修改此关注计划，请刷新。','This watch was changed elsewhere. Refresh.'));}
 else{result=await dbc.from(table).insert({user_id:user,client_request_id:requestId,asset_type:asset,symbol,intent,condition,target_value:value,currency:asset==='Gold'?'MMK':'USD',is_active:true}).select('id').maybeSingle();}
 if(result.error)throw result.error;if(owner()!==user)return;formOpen=false;editing='';draftRequestId='';draftSignature='';loaded=false;rows=[];renderForm();feedback(T('保存成功。','Saved.'));}
 catch(err){if(owner()===user){
   // A lost response may hide a successful insert. Verify idempotency key without creating a second request.
   let recovered=false;
   if(!old){try{const dbc=await confirmedSession(user);const check=await dbc.from(table).select('id').eq('user_id',user).eq('client_request_id',requestId).maybeSingle();recovered=!!check?.data&&!check.error;}catch(_){/* Keep the draft ID for safe retry */}}
   if(recovered){formOpen=false;editing='';draftRequestId='';draftSignature='';loaded=false;rows=[];renderForm();feedback(T('已在云端确认原提交成功。','Previous save was confirmed in the cloud.'));}
   else feedback(T('保存状态暂未确认，保留本次请求编号；请稍后重试或刷新核对：','Save status uncertain; request ID preserved. Retry later or verify cloud data: ')+String(err.message||err),true);
  }}
 finally{pending=false;const submit=rootUI()?.querySelector('[data-watch-editor] button[type=submit]');if(submit)submit.disabled=false;if(owner()===user)await load(true);else reset(owner());}
}
async function toggle(id){const user=owner(),row=rows.find(x=>x.id===id);if(!user||!row||pending)return;pending=true;try{const dbc=await confirmedSession(user);const {data,error}=await dbc.from(table).update({is_active:!row.is_active,version:Number(row.version)+1,updated_at:new Date().toISOString()}).eq('user_id',user).eq('id',id).eq('version',row.version).select('id').maybeSingle();if(error)throw error;if(!data)throw Error(T('数据可能已被其他设备修改。','Watch changed on another device.'));loaded=false;}
 catch(err){if(owner()===user)feedback(String(err.message||err),true);}finally{pending=false;if(owner()===user)await load(true);}}
async function remove(id){const user=owner(),row=rows.find(x=>x.id===id);if(!user||!row||pending)return;if(!confirm(T('确定删除这项关注计划？不会影响投资交易。','Delete this watch? No investment trades will be changed.')))return;
 pending=true;try{const dbc=await confirmedSession(user);const {error}=await dbc.from(table).delete().eq('user_id',user).eq('id',id);if(error)throw error;loaded=false;}
 catch(err){if(owner()===user)feedback(String(err.message||err),true);}finally{pending=false;if(owner()===user)await load(true);}}
function localize(){const r=rootUI();if(!r)return;r.querySelector('h2').textContent=T('自定义补仓／减仓关注计划','Personal Add / Trim Watch Plans');r.querySelector('[data-watch-desc]').textContent=T('为自己的仓位设置关注价位与风险参考线，只在 Invest 页面内核对。','Set your own price and allocation thresholds; check them on this Invest page.');r.querySelector('[data-watch-new]').textContent=formOpen?T('隐藏表单','Hide form'):T('+ 新增关注计划','+ Add watch');r.querySelector('.ivw13-foot').textContent=T('仅供参考：触发价不等于合适的成交价。页面关闭后不会自动扫描或推送。金价属于人工记录，不能证明市场实时达标。','For review only: a threshold does not mean a trade is appropriate. No background scans or push after closing this page. Manual Gold quotes cannot verify live market levels.');}
function paint(){const r=rootUI();if(!r)return;const user=owner();if(user!==activeOwner){reset(user);if(user)load(true);}localize();renderRows();if(formOpen&&r.querySelector('[data-watch-editor]')==null)renderForm();}
let delay=0;function schedule(){clearTimeout(delay);delay=setTimeout(()=>{const invest=$('invest');if(invest?.classList.contains('active')){paint();if(owner()&&(!loaded&&!pending))load();}},170)}
['mmhvault:invest-daily-ready','mmhvault:data-loaded','mmhvault:page-visible','mmhvault:config-owner-changed','languagechange','mmhvault-language-change'].forEach(n=>window.addEventListener(n,schedule,{passive:true}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
setInterval(()=>{if(!document.hidden&&$('invest')?.classList.contains('active')){if(owner()!==activeOwner)reset(owner());paint();}},60000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.mmhInvestWatchV13={evaluate,cryptoWeight,paint,load};
})();
