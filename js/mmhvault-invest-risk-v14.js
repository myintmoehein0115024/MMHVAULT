/* MMHVAULT Invest 1.4 | Read-only staged-buy risk calculator.
 * A what-if model, not a trading recommendation, market forecast, cash validation, or order.
 * No client storage, network writes, database writes, or changes to financial calculation functions.
 */
(()=>{'use strict';
if(window.__mmhInvestRiskV14)return;window.__mmhInvestRiskV14=true;
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const zh=()=>{try{return window.getMMHVAULTLanguage?.()==='zh'||document.documentElement.lang?.toLowerCase().startsWith('zh')}catch(_){return false}};
const T=(cn,en)=>zh()?cn:en;
const money=x=>Number.isFinite(x)?'$'+x.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const qtyFmt=x=>Number.isFinite(x)?x.toLocaleString(undefined,{maximumFractionDigits:9}):'—';
const percent=x=>Number.isFinite(x)?x.toFixed(2)+'%':'—';
const owner=()=>{try{return typeof currentSessionUser!=='undefined'?String(currentSessionUser?.id||''):''}catch(_){return ''}};
const close=(a,b,eps=1e-7)=>Math.abs(a-b)<=eps*Math.max(1,Math.abs(a),Math.abs(b));
const EPS=1e-9;
let lastOwner='',lastLanguage='',lastSymbols='',dirty=false;
// Pure, deterministic model for local simulations. Returns no direction on whether to trade.
function calculatePlan(data){
 const bad=reason=>({ok:false,reason});
 const n=key=>Number(data?.[key]);
 const required=['price','existingQuantity','existingBasis','portfolioValue','budget','availableCash','perOrderCap','feePercent','weightCap'];
 if(required.some(k=>data?.[k]===null||data?.[k]===undefined||data?.[k]===''||!Number.isFinite(n(k))))return bad('input');
 const price=n('price'),q=n('existingQuantity'),basis=n('existingBasis'),portfolio=n('portfolioValue'),budget=n('budget'),cash=n('availableCash'),perOrderCap=n('perOrderCap'),fee=n('feePercent')/100,cap=n('weightCap');
 const stages=Number(data?.stages);
 if(!(price>0)||q<EPS||basis<0||portfolio<=0||!(budget>0)||!(cash>=0)||!(perOrderCap>0)||!Number.isInteger(stages)||stages<1||stages>5||fee<0||fee>0.05||!(cap>0&&cap<=100))return bad('input');
 const ownValue=q*price;if(ownValue>portfolio+0.05||!Number.isFinite(ownValue))return bad('portfolio');
 const stageSpend=budget/stages;
 if(budget>cash+1e-7)return bad('cash');
 if(stageSpend>perOrderCap+1e-7)return bad('orderCap');
 // Pure illustrative execution prices. No probabilistic or technical price prediction.
 const discounts=[0,0.05,0.10,0.15,0.20];
 const entries=Array.from({length:stages},(_,i)=>{
  const executionPrice=price*(1-discounts[i]);
  const spend=i===stages-1?budget-stageSpend*i:stageSpend;
  const feeAmount=spend*fee/(1+fee);
  const acquired=(spend-feeAmount)/executionPrice;
  return {step:i+1,executionPrice,discount:discounts[i]*100,spend,feeAmount,acquired};
 });
 const addedQty=entries.reduce((s,x)=>s+x.acquired,0);
 const fees=entries.reduce((s,x)=>s+x.feeAmount,0);
 const projectedQty=q+addedQty;
 const projectedBasis=basis+budget;
 const projectedAvg=projectedBasis/projectedQty;
 // Assumes entire staged plan executes, other crypto holdings and their prices remain unchanged.
 const projectedSymbolValue=projectedQty*price;
 const projectedPortfolioValue=portfolio+addedQty*price;
 const projectedWeight=100*projectedSymbolValue/projectedPortfolioValue;
 const currentWeight=100*ownValue/portfolio;
 const stressedSymbolValue=projectedSymbolValue*0.9;
 const stressedPortfolio=projectedPortfolioValue-projectedSymbolValue*0.1;
 const stressedWeight=100*stressedSymbolValue/stressedPortfolio;
 const unrealizedAtCurrent=projectedSymbolValue-projectedBasis;
 const currentAvg=basis/q;
 return {ok:true,symbol:String(data.symbol||''),stages,entries,price,q,basis,currentAvg,currentWeight,portfolio,budget,cash,cap,fee,
  fees,addedQty,projectedQty,projectedBasis,projectedAvg,projectedWeight,projectedPortfolioValue,
  unrealizedAtCurrent,stressedSymbolValue,stressedWeight,lossIfPriceFallsTenPercent:projectedSymbolValue*0.1,
  capExceeded:projectedWeight>cap+EPS,cashAfter:cash-budget};
}
function snapshot(){const s=window.mmhInvestDailyV1?.guidanceSnapshot?.();const uid=owner();return uid&&s?.owner===uid?s:null}
function positions(s){
 if(!s||s.quoteAvailable!==true)return {ok:false,reason:'live'};
 const at=Number(s.quotedAt),now=Date.now();if(!Number.isFinite(at)||at>now||now-at>300000)return {ok:false,reason:'live'};
 if(typeof window.mmHVaultCryptoLedgerV336!=='function')return {ok:false,reason:'ledger'};
 const sum=new Map();
 for(const x of s.holdings||[]){if(x.asset!=='Crypto')continue;const sym=String(x.symbol||'').trim().toUpperCase(),q=Number(x.quantity);
  if(!/^[A-Z0-9]{2,12}$/.test(sym)||!Number.isFinite(q))return {ok:false,reason:'ledger'};
  sum.set(sym,(sum.get(sym)||0)+q);
 }
 const result=[];let total=0;
 for(const [sym,held] of sum){
  if(held < -EPS)return {ok:false,reason:'ledger'};
  const ledger=window.mmHVaultCryptoLedgerV336(sym);
  const lq=Number(ledger?.qty),basis=Number(ledger?.basis);
  if(!Number.isFinite(lq)||!Number.isFinite(basis)||basis<0||!close(lq,held)||lq< -EPS)return {ok:false,reason:'ledger'};
  if(lq<=EPS)continue;
  const price=Number(s.live?.[sym]?.price);
  if(!(price>0))return {ok:false,reason:'quote'};
  total+=lq*price;
  result.push({sym,qty:lq,basis,price,value:lq*price});
 }
 if(result.length===0||!(total>0))return {ok:false,reason:'none'};
 result.sort((a,b)=>b.value-a.value||a.sym.localeCompare(b.sym));
 return {ok:true,rows:result,total,quoteAt:at};
}
function root(){const anchor=$('mmhInvestWatchV13')||$('mmhInvestGuidanceV12')||$('mmhInvestDailyV1');if(!anchor)return null;
 let box=$('mmhInvestRiskV14');if(box)return box;
 box=document.createElement('section');box.id='mmhInvestRiskV14';box.className='ivr14-root';anchor.insertAdjacentElement('afterend',box);
 box.addEventListener('submit',event=>{if(!event.target.matches('[data-ivr-form]'))return;event.preventDefault();preview();});
 box.addEventListener('change',event=>{if(event.target.matches('[name="symbol"]')){dirty=false;renderForm();}const output=box.querySelector('[data-ivr-result]');if(output?.textContent)output.innerHTML=`<p class="ivr14-info">${T('输入条件已变化，请重新模拟。','Inputs changed. Recalculate to update the results.')}</p>`;});
 box.addEventListener('input',event=>{if(event.target.closest('[data-ivr-form]')){const output=box.querySelector('[data-ivr-result]');if(output?.textContent)output.innerHTML=`<p class="ivr14-info">${T('输入条件已变化，请重新模拟。','Inputs changed. Recalculate to update the results.')}</p>`;}});
 box.addEventListener('click',event=>{if(event.target.closest('[data-ivr-clear]')){dirty=false;renderForm(true);}if(event.target.closest('[data-ivr-refresh]')){window.mmhInvestDailyV1?.load?.(true);renderForm(false);}});
 return box;
}
function unavailable(reason){return ({owner:T('请先登录本人账户，并等待 Invest 数据加载。','Sign in and wait for your own Invest records.'),live:T('行情已过期或不可用。请刷新后核对，暂不计算补仓方案。','Live quotes are stale or unavailable. Refresh before modeling.'),ledger:T('持仓数据或成本记录无法核对，暂停计算。','The current position or cost basis cannot be reconciled.'),quote:T('至少一个持仓品种缺少报价，无法核对组合仓位。','A held asset has no valid quote, so portfolio weights cannot be verified.'),none:T('当前没有可模拟的 Crypto 持仓。','No current crypto holding is available for this calculator.'),portfolio:T('组合市值不一致，请刷新数据。','Portfolio valuation is inconsistent. Refresh the data.'),cash:T('计划总投入大于你手动填写的可动用现金上限。','Planned spend exceeds your manually entered available cash.'),orderCap:T('每一批计划投入超过了你设置的单笔上限。请增加批数或减少总预算。','Each tranche exceeds your per-order limit. Increase stages or reduce budget.'),input:T('请检查预算、批数、手续费和参考上限。','Check amount, stages, fee and reference limits.')})[reason]||T('数据暂不能核实。','Data cannot be verified.');}
function formMarkup(rows,old,selected){const chosen=rows.find(x=>x.sym===selected)||rows[0];const get=(k,d='')=>old?.[k]??d;
 return `<form data-ivr-form class="ivr14-form"><div class="ivr14-inputs">
 <label>${T('选择已持有 Crypto','Held crypto')}<select name="symbol">${rows.map(x=>`<option value="${esc(x.sym)}" ${x.sym===chosen.sym?'selected':''}>${esc(x.sym)}</option>`).join('')}</select></label>
 <label>${T('假设总投入 · USD','Illustrative total budget · USD')}<input name="budget" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="100" value="${esc(get('budget'))}" required></label>
 <label>${T('你确认可动用的现金 · USD','Cash you confirm available · USD')}<input name="availableCash" type="number" min="0" step="0.01" inputmode="decimal" placeholder="300" value="${esc(get('availableCash'))}" required></label>
 <label>${T('每笔投入上限 · USD','Per-order cap · USD')}<input name="perOrderCap" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="50" value="${esc(get('perOrderCap'))}" required></label>
 <label>${T('分批数量','Number of tranches')}<select name="stages">${[1,2,3,4,5].map(n=>`<option value="${n}" ${String(get('stages','3'))===String(n)?'selected':''}>${n}</option>`).join('')}</select></label>
 <label>${T('模拟手续费 (%)','Illustrative fee (%)')}<input name="feePercent" type="number" min="0" max="5" step="0.01" inputmode="decimal" value="${esc(get('feePercent','0.1'))}" required></label>
 <label>${T('单一币种仓位参考上限 (%)','Single-coin weight cap (%)')}<input name="weightCap" type="number" min="1" max="100" step="0.1" inputmode="decimal" value="${esc(get('weightCap','35'))}" required></label>
 </div><div class="ivr14-actions"><button type="submit" class="ivr14-primary">${T('模拟补仓后仓位','Calculate what-if plan')}</button><button type="button" data-ivr-clear>${T('清空输入','Clear')}</button><button type="button" data-ivr-refresh>${T('刷新行情','Refresh quotes')}</button></div></form>`;
}
function renderResults(r){const capClass=r.capExceeded?'ivr14-warn':'';
 return `<div class="ivr14-summary"><div><small>${T('目前平均持仓成本','Current average basis')}</small><b>${money(r.currentAvg)}</b></div><div><small>${T('假设补仓后平均成本','Projected average basis')}</small><b>${money(r.projectedAvg)}</b></div><div><small>${T('当前仓位占比','Current portfolio share')}</small><b>${percent(r.currentWeight)}</b></div><div class="${capClass}"><small>${T('补仓后仓位占比','Projected portfolio share')}</small><b>${percent(r.projectedWeight)}</b></div><div><small>${T('预计新增数量','Illustrative units acquired')}</small><b>${qtyFmt(r.addedQty)} ${esc(r.symbol)}</b></div><div><small>${T('预计手续费（含在预算中）','Fees within total spend')}</small><b>${money(r.fees)}</b></div></div>
 <p class="ivr14-indicator ${r.capExceeded?'ivr14-warn':'ivr14-neutral'}">${r.capExceeded?T('模拟后将超过你设置的单币种仓位上限；请重新评估预算。','Projected holding exceeds your own weight cap. Review the budget.'):T('模拟仓位未超过你设置的参考线，但不等于这笔投资适合你的风险承受能力。','Projected allocation stays within your reference cap. That does not establish personal suitability.')}</p>
 <div class="ivr14-table"><table><thead><tr><th>${T('批次','Stage')}</th><th>${T('假设价格','Hypothetical price')}</th><th>${T('每笔金额','Spend')}</th><th>${T('模拟购得数量','Estimated units')}</th></tr></thead><tbody>${r.entries.map(x=>`<tr><td>${x.step}</td><td>${money(x.executionPrice)} <small>(−${x.discount}%)</small></td><td>${money(x.spend)}</td><td>${qtyFmt(x.acquired)}</td></tr>`).join('')}</tbody></table></div>
 <div class="ivr14-stress"><strong>${T('价格波动情境检查','Price-shock illustration')}</strong><p>${T('假设所有批次完成、其他资产价格不变，并且该币价格随后较当前参考价下跌 10%，这部分持仓市值会额外减少约','Assume all stages fill and other holdings do not move. If this coin subsequently drops 10% from the current reference, its position would lose approximately')} <b>${money(r.lossIfPriceFallsTenPercent)}</b> ${T('（相对于当前价格计算；不是未来预测）。','of mark-to-market value versus the current price; this is not a forecast.')}</p></div>
 <div class="ivr14-fine">${T('假设价格依次为当前报价的 100%、95%、90%、85%、80%；没有承诺订单会成交。成本采用原有 Crypto 加权平均成本口径，手续费从每笔预算内扣除。投后占比假定其他 Crypto 持仓价格不变，未验证银行或交易所实际可用余额。','Execution prices are illustrative at 100%, 95%, 90%, 85%, 80% of the current price; fills are not assured. Average cost follows the existing crypto weighted-average ledger and fees are included in each spend. Portfolio weights assume all other coins stay flat. Actual cash or exchange balances have not been verified.')}</div>`;
}
function preview(){const box=root();if(!box)return;const form=box.querySelector('[data-ivr-form]');if(!form)return;
 const s=snapshot(),state=positions(s),out=box.querySelector('[data-ivr-result]');if(!state.ok){out.innerHTML=`<p class="ivr14-alert">${esc(unavailable(state.reason))}</p>`;return;}
 const inputs=Object.fromEntries(new FormData(form));dirty=true;
 const chosen=state.rows.find(x=>x.sym===inputs.symbol);if(!chosen){out.innerHTML=`<p class="ivr14-alert">${T('持仓品种已变化，请重新选择。','Holdings changed; select the asset again.')}</p>`;return;}
 const res=calculatePlan({...inputs,price:chosen.price,existingQuantity:chosen.qty,existingBasis:chosen.basis,portfolioValue:state.total});
 out.innerHTML=res.ok?renderResults(res):`<p class="ivr14-alert">${esc(unavailable(res.reason))}</p>`;
}
function renderForm(forceClear=false){const box=root();if(!box)return;
 const currentOwner=owner(),language=zh()?'zh':'en';const s=snapshot(),state=positions(s);
 if(currentOwner!==lastOwner){lastOwner=currentOwner;dirty=false;forceClear=true;box.replaceChildren();lastSymbols='';}
 if(!box.querySelector('[data-ivr-body]')){
 box.innerHTML=`<div class="ivr14-head"><div><div class="ivr14-kicker">INVEST · WHAT-IF RISK BUDGET</div><h2>${T('智能分批补仓模拟','Staged-buy risk simulator')}</h2><p>${T('查看模拟投入后的成本和仓位变化，不会自动买入或占用资金。','Explore projected cost and allocation without placing or reserving any trades.')}</p></div></div><div data-ivr-body></div><div data-ivr-result role="status" aria-live="polite"></div><p class="ivr14-disclaimer">${T('仅为风险预算计算器，不是个性化买卖建议。请自行核实紧急备用金、现金需求、税费、价格滑点和可承受损失。Gold 暂未纳入自动计算。','An arithmetic planning tool, not personalized trade advice. Verify emergency reserves, cash needs, taxes, slippage and acceptable losses yourself. Gold is excluded until quote and unit data are reliable.')}</p>`;
 }
 box.querySelector('h2').textContent=T('智能分批补仓模拟','Staged-buy risk simulator');
 box.querySelector('.ivr14-head p').textContent=T('查看模拟投入后的成本和仓位变化，不会自动买入或占用资金。','Explore projected cost and allocation without placing or reserving any trades.');
 box.querySelector('.ivr14-disclaimer').textContent=T('仅为风险预算计算器，不是个性化买卖建议。请自行核实紧急备用金、现金需求、税费、价格滑点和可承受损失。Gold 暂未纳入自动计算。','An arithmetic planning tool, not personalized trade advice. Verify emergency reserves, cash needs, taxes, slippage and acceptable losses yourself. Gold is excluded until quote and unit data are reliable.');
 const body=box.querySelector('[data-ivr-body]');const previous=body.querySelector('form');const input={};if(previous&&!forceClear){for(const entry of new FormData(previous).entries())input[entry[0]]=entry[1]}
 const symbols=state.ok?state.rows.map(x=>x.sym).join('|'):'';const selected=input.symbol||state.rows?.[0]?.sym||'';
 if(!state.ok){body.innerHTML=`<p class="ivr14-alert">${esc(unavailable(currentOwner?state.reason:'owner'))}</p>`;box.querySelector('[data-ivr-result]').replaceChildren();dirty=false;return;}
 body.innerHTML=formMarkup(state.rows,forceClear?null:input,selected);
 if(forceClear||language!==lastLanguage||symbols!==lastSymbols){box.querySelector('[data-ivr-result]').replaceChildren();dirty=false;}
 lastLanguage=language;lastSymbols=symbols;
}
let scheduled=0;function schedule(){clearTimeout(scheduled);scheduled=setTimeout(()=>{const invest=$('invest');if(invest?.classList.contains('active')){
 // Preserve input values across fresh quote updates; the user must rerun the simulation.
 const previousOwner=lastOwner;const r=root();if(!r)return;
 if(owner()!==previousOwner){renderForm(true);return;}
 const form=r.querySelector('[data-ivr-form]');const fresh=positions(snapshot());if(!fresh.ok){renderForm(false);return;}
 if(!form || lastLanguage!==(zh()?'zh':'en') || lastSymbols!==fresh.rows.map(x=>x.sym).join('|'))renderForm(false);
 const result=r.querySelector('[data-ivr-result]');if(result?.textContent&&result.querySelector('.ivr14-summary'))result.innerHTML=`<p class="ivr14-info">${T('行情可能变化，请重新点击“模拟”更新结果。','Quotes may have changed. Run the calculator again.')}</p>`;
 }},170)}
['mmhvault:invest-daily-ready','mmhvault:market-updated','mmhvault:data-loaded','mmhvault:page-visible','mmhvault:config-owner-changed','languagechange','mmhvault-language-change'].forEach(event=>window.addEventListener(event,schedule,{passive:true}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
setInterval(()=>{if(!document.hidden&&$('invest')?.classList.contains('active')){const r=root();if(r){const state=positions(snapshot());if(owner()!==lastOwner||!state.ok){renderForm(owner()!==lastOwner);}else if(r.querySelector('.ivr14-summary')){r.querySelector('[data-ivr-result]').innerHTML=`<p class="ivr14-info">${T('行情可能已变化，请重新模拟。','Quote may have changed. Recalculate.')}</p>`;}}}},60000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.mmhInvestRiskV14={calculatePlan,positions,preview,renderForm};
})();
