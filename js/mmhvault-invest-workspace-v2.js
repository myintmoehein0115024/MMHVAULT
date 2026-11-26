/* MMHVAULT Invest 2.0.15 — lifecycle-safe investment workspaces.
 * Reparents existing modules; local hypothetical calculations only.
 * Never writes financial data, requests market data, or touches Supabase.
 */
(()=>{'use strict';
 if(window.__mmhInvestWorkspaceV2)return;
 window.__mmhInvestWorkspaceV2=true;
 const root=document.getElementById('invest');
 if(!root)return;
 const $=id=>document.getElementById(id);
 const KEYS=['overview','strategy','data'];
 const SLOTS={
  overview:['mmhFiveOverviewNotice','mmhInvestDailyV1','mmhInvestDrawdownV16'],
  strategy:['mmhInvestPositionMixV215','mmhInvestWatchV13'],
  data:['mmhInvestSnapshotsV18','mmhInvestAutoV19','mmhInvestAutoPnlV110','mmhInvestPnlArchiveV111','mmhInvestGuidanceV12','mmhInvestRiskV14','mmhInvestPlansV15']
 };
 const ARCHIVED=new Set(['mmhInvestGuidanceV12','mmhInvestRiskV14','mmhInvestPlansV15']);
 const TARGETS=new Map(Object.entries(SLOTS).flatMap(([key,ids])=>ids.map(id=>[id,key])));
 const STRINGS={
  overview:{zh:'概况与收益',en:'Summary & P/L',my:'အနှစ်ချုပ်နှင့် အမြတ်အရှုံး'},strategy:{zh:'投资策略',en:'Strategy',my:'ရင်းနှီးမြှုပ်နှံမှု မဟာဗျူဟာ'},data:{zh:'数据中心',en:'Data Center',my:'ဒေတာစင်တာ'},
  heading:{zh:'投资工作区',en:'Investment Workspace'},
  headingSub:{zh:'总览合并持仓和收益，策略与数据中心独立查看。',en:'Holdings and performance together, with separate strategy and data views.'},
  overviewTitle:{zh:'我的投资概况',en:'Investment overview'},
  overviewDesc:{zh:'持仓、市值和累计盈亏集中在这里。其他详细分析按需切换。',en:'Holdings, market value and cumulative P/L, without the long scroll.'},
  returnsTitle:{zh:'每日收益与回撤',en:'Performance & P/L'},
  returnsDesc:{zh:'每日盈亏、历史走势和币种贡献。资料不足时仍显示待核实。',en:'Daily returns, trends and drawdowns; incomplete data stays unverified.'},
  strategyTitle:{zh:'智能观察与投资计划',en:'Strategy & Plans'},
  strategyDesc:{zh:'观察补仓或减仓条件、设置关注价、模拟分批投入。不会自动交易。',en:'Review watch conditions and staged-buy scenarios; never auto-trades.'},
  dataTitle:{zh:'投资数据与核对中心',en:'Data & Reconciliation'},
  dataDesc:{zh:'历史报价、自动采集、独立复核和审计记录集中查看。',en:'Historical quotes, automated capture, P/L checks and audit archives.'},
  dataHint:{zh:'收益显示“待核实”时，请在数据中心查看报价和交易核对状态。',en:'If P/L is unverified, review quote coverage and ledger checks in Data Center.'},
  toReturns:{zh:'查看收益明细',en:'View performance'},
  toStrategy:{zh:'打开投资策略',en:'Open strategies'},
  toData:{zh:'查看数据状态',en:'Review data status'},
  archive:{zh:'旧版策略工具（可展开）',en:'Previous strategy tools',my:'ယခင် မဟာဗျူဟာ ကိရိယာများ'},
  calculator:{zh:'分批投资计算器',en:'Staged investment calculator',my:'အဆင့်လိုက် ရင်းနှီးမြှုပ်နှံမှု တွက်ချက်စက်'},
  holding:{zh:'持仓',en:'Holding',my:'ပိုင်ဆိုင်မှု'},
  capital:{zh:'追加投入',en:'Additional capital',my:'ထပ်မံ ရင်းနှီးငွေ'},
  price:{zh:'假设单位价格',en:'Assumed unit price',my:'ခန့်မှန်း တစ်ယူနစ်ဈေး'},
  added:{zh:'新增数量',en:'Additional units',my:'ထပ်တိုး အရေအတွက်'},
  totalUnits:{zh:'总数量',en:'Total units',my:'စုစုပေါင်း အရေအတွက်'},
  average:{zh:'模拟买入后平均成本 · 不含新增手续费',en:'New average cost · excludes new fees',my:'ထပ်ဝယ်ပြီးနောက် ပျမ်းမျှကုန်ကျစရိတ် · အခကြေးငွေ အသစ်မပါ'},
  averageChange:{zh:'相对当前均价变动',en:'Change vs current average cost',my:'လက်ရှိ ပျမ်းမျှကုန်ကျစရိတ်နှင့် ပြောင်းလဲမှု'},
  mixTitle:{zh:'持仓集中度 · USD',en:'Position concentration · USD',my:'ပိုင်ဆိုင်မှု စုစည်းမှု · USD'},
  noHolding:{zh:'暂无已核实的持仓',en:'No verified holdings available',my:'အတည်ပြုထားသော ပိုင်ဆိုင်မှု မရှိပါ'},
  moreMenu:{zh:'右上角可打开投资记录、新增数据及项目管理。',en:'Use the top-right icons for records, adding data and project management.'}
 };
 const lang=()=>{try{const l=String(window.getMMHVAULTLanguage?.()||document.documentElement.lang||'en').toLowerCase();return /^zh/.test(l)?'zh':/^(my|mm)/.test(l)?'my':'en';}catch(_){return 'en'}};
 const tr=(k)=>STRINGS[k]?.[lang()]||STRINGS[k]?.en||k;
 let active='overview',host=null,observer=null,scheduled=false;
 let calcOwner=null,calcRows=[];
 const currentOwner=()=>{try{return typeof currentSessionUser!=='undefined'?currentSessionUser?.id||null:null;}catch(_){return null;}};
 const ownData=uid=>!!uid&&uid===currentOwner()&&window.mmhWalletDataOwnerV191===uid;
 function calculateAverage(q,budget,basis,price){if(![q,budget,basis,price].every(Number.isFinite)||q<=0||budget<=0||basis<0||price<=0)return null;const added=budget/price,total=q+added,avg=(basis+budget)/total;return [added,total,avg].every(Number.isFinite)&&added>0?{added,total,avg}:null;}
 function calcPanel(){return $('mmhInvestSimpleCalcV215');}
 function drawCalc(){const p=calcPanel();if(!p)return;const pick=p.querySelector('select'),cap=p.querySelector('[data-calc-cap]'),price=p.querySelector('[data-calc-price]'),selected=pick.value;const available=ownData(calcOwner)?calcRows:[];const keys=JSON.stringify(available.map(x=>x.key));if(p.dataset.keys!==keys){pick.replaceChildren();for(const x of available){const o=document.createElement('option');o.value=x.key;o.textContent=x.name+' · '+x.currency;pick.append(o);}if(available.some(x=>x.key===selected))pick.value=selected;else{cap.value='';price.value='';}p.dataset.keys=keys;}const row=available.find(x=>x.key===pick.value);for(const input of [pick,cap,price])input.disabled=!row;p.querySelector('[data-calc-cap-label]').textContent=tr('capital')+(row?' ('+row.currency+')':'');p.querySelector('[data-calc-price-label]').textContent=tr('price')+(row?' ('+row.currency+'/'+row.unit+')':'');const n=row&&calculateAverage(row.quantity,Number(cap.value),row.cost,Number(price.value));const fmt=(x,d)=>x.toLocaleString(undefined,{maximumFractionDigits:d});p.querySelector('[data-calc-units]').textContent=!row?tr('noHolding'):n?tr('added')+': '+fmt(n.added,10)+' · '+tr('totalUnits')+': '+fmt(n.total,10):'—';const change=n&&row.cost>0?(n.avg/(row.cost/row.quantity)-1)*100:null;p.querySelector('[data-calc-change]').textContent=change!==null&&Number.isFinite(change)?tr('averageChange')+': '+(change>0?'+':'')+fmt(change,2)+'%':'';p.querySelector('[data-calc-average]').textContent=n?(row.currency==='USD'?'$ ':'K ')+n.avg.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:6}):'—';}
 function clearPositionMix(){const mix=$('mmhUnifiedAllocationV1');if(!mix)return;const title=tr('mixTitle'),message=tr('noHolding');if(mix.children.length===2&&mix.firstElementChild?.textContent===title&&mix.lastElementChild?.textContent===message)return;const h=document.createElement('span'),msg=document.createElement('span');h.textContent=title;msg.textContent=message;mix.replaceChildren(h,msg);}
 function updateStrategy(uid,rows){if(!ownData(uid)){uid=null;rows=[];clearPositionMix();}if(uid!==calcOwner){const p=calcPanel();if(p){p.querySelector('[data-calc-cap]').value='';p.querySelector('[data-calc-price]').value='';p.dataset.keys='';}}calcOwner=uid;calcRows=Array.isArray(rows)?rows.filter(x=>x&&['USD','MMK'].includes(x.currency)&&typeof x.key==='string'&&typeof x.name==='string'&&Number.isFinite(x.quantity)&&x.quantity>0&&Number.isFinite(x.cost)&&x.cost>=0):[];drawCalc();}
 function destinationFor(id,key){return ARCHIVED.has(id)?$('iw2-archive-body'):$('iw2-slot-'+key);}
 function build(){
  const parent=$('mmhFiveoverview');if(!parent)return false;
  // The original Invest page creates #mmhFiveoverview asynchronously.
  // If it is replaced after a legacy render, reconstruct a fresh workspace.
  if(host&&host.isConnected){if(host.parentNode!==parent)parent.prepend(host);return true;}
  host=null;
  host=document.createElement('div');host.id='mmhInvestWorkspaceV2';host.className='iw2-workspace';
  host.innerHTML=`
   <div class="iw2-intro"><div><span class="iw2-eyebrow">MMHVAULT / INVEST</span><h2 data-iw2-t="heading"></h2><p data-iw2-t="headingSub"></p></div></div>
   <div class="iw2-tabbar" role="tablist" aria-label="Investment workspace">
    ${KEYS.map((k,i)=>`<button type="button" class="iw2-tab" role="tab" id="iw2-tab-${k}" aria-controls="iw2-pane-${k}" aria-selected="${i===0?'true':'false'}" tabindex="${i===0?'0':'-1'}" data-iw2-tab="${k}"><span class="iw2-tab-mark" aria-hidden="true">${['◈','◇','▤'][i]}</span><span data-iw2-t="${k}"></span></button>`).join('')}
   </div>
   ${KEYS.map((k,i)=>`<section class="iw2-pane" id="iw2-pane-${k}" role="tabpanel" tabindex="0" aria-labelledby="iw2-tab-${k}" ${i?'hidden':''}>
    <div class="iw2-section-heading"><h3 data-iw2-t="${k}Title"></h3><p data-iw2-t="${k}Desc"></p></div>
    
    <div class="iw2-content" id="iw2-slot-${k}"></div>
   </section>`).join('')}
   <p class="iw2-footer" data-iw2-t="moreMenu"></p>`;
  parent.prepend(host);
  const calc=document.createElement('section');calc.id='mmhInvestSimpleCalcV215';calc.innerHTML='<h3 data-iw2-t="calculator"></h3><label><span data-iw2-t="holding"></span><select></select></label><div class="iw215-inputs"><label><span data-calc-cap-label></span><input type="number" min="0" step="any" inputmode="decimal" data-calc-cap></label><label><span data-calc-price-label></span><input type="number" min="0" step="any" inputmode="decimal" data-calc-price></label></div><p data-iw2-t="average" class="iw215-result-label"></p><strong data-calc-average aria-live="polite">—</strong><p data-calc-units></p><p data-calc-change></p>';$('iw2-slot-strategy').append(calc);
  calc.addEventListener('input',drawCalc);calc.querySelector('select').addEventListener('change',()=>{calc.querySelector('[data-calc-cap]').value='';calc.querySelector('[data-calc-price]').value='';drawCalc();});
  const archive=document.createElement('details');archive.id='iw2-archive';archive.innerHTML='<summary data-iw2-t="archive"></summary><div id="iw2-archive-body"></div>';$('iw2-slot-data').append(archive);
  drawCalc();
  host.addEventListener('click',e=>{
   const button=e.target.closest('button[data-iw2-tab],button[data-iw2-go]');if(!button||!host.contains(button))return;
   const key=button.dataset.iw2Tab||button.dataset.iw2Go;
   if(!KEYS.includes(key))return;
   activate(key,true);
  });
  host.querySelector('.iw2-tabbar').addEventListener('keydown',e=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
   const index=KEYS.indexOf(e.target.closest('[data-iw2-tab]')?.dataset.iw2Tab);
   if(index<0)return;
   e.preventDefault();
   const next=e.key==='Home'?0:e.key==='End'?KEYS.length-1:(index+(e.key==='ArrowRight'?1:-1)+KEYS.length)%KEYS.length;
   activate(KEYS[next],true);$('iw2-tab-'+KEYS[next])?.focus();
  });
  translate();bindTop();if(root.classList.contains('active'))window.mmhRenderUnifiedInvestV1?.();return true;
 }
 function translate(){if(!host)return;for(const el of host.querySelectorAll('[data-iw2-t]')){const value=tr(el.dataset.iw2T);if(el.textContent!==value)el.textContent=value;}syncTop();drawCalc();}
 function syncTop(){
  const labels={
   investSubOverviewV371:{en:'Overview',zh:'总览',my:'ခြုံငုံသုံးသပ်ချက်'},
   investSubPortfolioV371:{en:'Investment records',zh:'投资记录',my:'ရင်းနှီးမြှုပ်နှံမှု မှတ်တမ်းများ'},
   investSubAddV371:{en:'Add investment data',zh:'新增投资数据',my:'ရင်းနှီးမြှုပ်နှံမှု ဒေတာထည့်ရန်'},
   investSubManageV1:{en:'Manage investment projects and assets',zh:'管理投资项目与资产',my:'ရင်းနှီးမြှုပ်နှံမှု ပိုင်ဆိုင်မှုများ စီမံရန်'}
  };
  for(const [id,translations] of Object.entries(labels)){const el=$(id);if(!el)continue;const label=translations[lang()];el.setAttribute('aria-label',label);el.title=label;if(id==='investSubOverviewV371'&&el.textContent!==label)el.textContent=label;}
  const overview=$('investSubOverviewV371'),shown=!!$('mmhFiveoverview')&&!$('mmhFiveoverview').hidden;
  if(overview){overview.classList.toggle('active',shown);overview.setAttribute('aria-selected',String(shown));}
 }
 function bindTop(){if(!$('mmhInvestPageOptionsV1')||!host)return;root.classList.add('mmh-invest-nav-ready');syncTop();}
 function activate(key,userInitiated){
  active=KEYS.includes(key)?key:'overview';
  if(!host)return;
  for(const k of KEYS){
   const selected=active===k,button=$('iw2-tab-'+k),panel=$('iw2-pane-'+k);
   if(button){button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;}
   if(panel)panel.hidden=!selected;
  }
  syncTop();
  if(userInitiated){$('iw2-tab-'+active)?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
   // The source modules remain mounted and retain their event handlers / input state.
   // A resize event lets responsive charts settle after their pane becomes visible.
   window.requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  }
 }
 function relocate(){
  if(!build())return;
  const parent=$('mmhFiveoverview');
  if(!parent)return;
  // Preserve the original overview summary/holdings. Do not duplicate
  // investment components: their listeners and private state stay intact.
  for(const el of [...parent.children]){
   if(el===host)continue;
   const destination=TARGETS.get(el.id)||(el.classList.contains('mmh-ui-panel')?'overview':null);
   if(destination){const slot=destinationFor(el.id,destination);if(slot&&el.parentNode!==slot)slot.append(el);}
  }
  // Legacy extensions can mount after the overview and can re-mount on
  // data-loaded/page-visible events. Find them anywhere in Invest, not just
  // as direct overview children, then put them back in their single slot.
  for(const [id,destination] of TARGETS){
   const el=root.querySelector('[id="'+id+'"]'),slot=destinationFor(id,destination);
   if(el&&slot&&el.parentNode!==slot)slot.append(el);
  }
  // Only suppress the redundant routine footer; custom exclusion/other warnings stay visible.
  const note=$('mmhFiveOverviewNotice');
  if(note){const routine=['Based on recorded investments; unavailable prices are marked.','仅统计已记录的投资；价格不可用时会注明。'].includes(note.textContent.trim());note.dataset.iw2Routine=String(routine);}
  if(!ownData(calcOwner))updateStrategy(null,[]);
  activate(active,false);
 }
 function schedule(){
  if(scheduled)return;
  scheduled=true;
  window.requestAnimationFrame(()=>{scheduled=false;relocate();});
 }
 function relevant(node,parent){
  if(node.nodeType!==1)return false;
  if(node===host||node.id==='mmhFiveoverview'||node.id==='mmhFivePages'||TARGETS.has(node.id))return true;
  if(parent&&node.parentNode===parent&&node.classList?.contains('mmh-ui-panel'))return true;
  // A whole investment page might be mounted/replaced in one DOM operation.
  return !!node.querySelector?.('#mmhFiveoverview,#mmhFivePages,'+
    [...TARGETS.keys()].map(id=>'[id="'+id+'"]').join(','));
 }

 // Compact Overview only: preserve all source nodes, calculations and event handlers.
 function installCompactOverview(){
  if(!$('mmhInvestCompactOverviewStyleV207')){
   const style=document.createElement('style');style.id='mmhInvestCompactOverviewStyleV207';
   style.textContent=`
html body #invest#invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhFiveOverviewNotice[data-iw2-routine="true"]{display:none!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhFiveoverview #mmhInvestDrawdownV16{display:none!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview .iw2-data-reminder{font-size:11px!important;line-height:1.45!important;padding:6px 9px!important;margin:0 0 8px!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview .iw2-content{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:10px!important;min-width:0!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview .iw2-content > .mmh-ui-panel{margin:0!important;padding:10px!important;min-width:0!important;box-shadow:none!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhUnifiedInvestV1 .mmh-ui-panel{padding:10px!important;margin-bottom:10px!important;box-shadow:none!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhUnifiedInvestV1 .mmh-ui-heading{margin-bottom:8px!important;gap:6px!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhUnifiedKpisV1{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhUnifiedKpisV1 .mmh-ui-kpi{padding:10px!important;min-height:0!important;min-width:0!important;box-shadow:none!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhUnifiedKpisV1 .mmh-ui-kpi strong{font-size:clamp(16px,1.8vw,24px)!important;line-height:1.3!important;overflow-wrap:anywhere}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhUnifiedKpisV1 .mmh-ui-kpi :is(span,small){line-height:1.35!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhUnifiedAllocationV1{gap:6px!important;margin-top:8px!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhUnifiedAllocationV1 .mmh-mix-card{padding:8px!important;min-height:0!important}


























@media(max-width:1000px){html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhUnifiedKpisV1{grid-template-columns:repeat(2,minmax(0,1fr))!important}}

@media(max-width:360px){html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhUnifiedKpisV1{grid-template-columns:minmax(0,1fr)!important}}
/* V2 flat summary: actual relocated panels and holdings; no data/render changes. */
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview .iw2-content > .mmh-ui-panel{background:var(--uv-card)!important;background-image:none!important;border:1px solid var(--uv-line)!important;border-radius:8px!important;box-shadow:none!important;backdrop-filter:none!important;padding:10px!important;margin:0!important;min-height:0!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview .iw2-content > .mmh-ui-panel::before,html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview .iw2-content > .mmh-ui-panel::after{content:none!important;display:none!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview .mmh-ui-heading{margin:0 0 8px!important;padding:0 0 6px!important;min-height:0!important;border-color:var(--uv-line)!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview .mmh-ui-heading h2{font:600 14px/1.4 var(--mmh-notice-font,system-ui)!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedKpisV1 .mmh-ui-kpi{background:var(--uv-raised)!important;background-image:none!important;border:1px solid var(--uv-line)!important;border-radius:6px!important;padding:9px!important;min-height:0!important;height:auto!important;box-shadow:none!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedKpisV1 .mmh-ui-kpi strong{font-family:var(--mmh-notice-font,system-ui)!important;font-size:clamp(16px,1.55vw,22px)!important;letter-spacing:-.02em!important;font-variant-numeric:tabular-nums!important;margin:4px 0!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedKpisV1 .mmh-ui-kpi strong span{font-family:inherit!important;font-size:clamp(12px,1.2vw,16px)!important;line-height:1.35!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedAllocationV1{gap:5px!important;margin-top:5px!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedAllocationV1 .mmh-mix-card{padding:6px 8px!important;min-height:0!important;border-radius:6px!important;box-shadow:none!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedFiltersV1{margin:0 0 7px!important;padding:0!important;gap:5px!important;flex-wrap:wrap!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedFiltersV1 button{min-height:32px!important;padding:5px 9px!important;font-size:12px!important;border-radius:6px!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedListV1{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))!important;gap:7px!important;margin:0!important;border:0!important;overflow:visible!important;background:transparent!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedListV1 .mmh-overview-card{background:var(--uv-raised)!important;background-image:none!important;border:1px solid var(--uv-line)!important;border-radius:7px!important;box-shadow:none!important;padding:9px!important;margin:0!important;min-width:0!important;min-height:0!important;height:auto!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedListV1 .mmh-overview-card-head{margin:0 0 5px!important;padding:0 0 5px!important;gap:5px!important;min-height:0!important;border-color:var(--uv-line)!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedListV1 .mmh-overview-card-head b{font:650 14px/1.3 var(--mmh-notice-font,system-ui)!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedListV1 .mmh-overview-card-head span{color:var(--uv-muted)!important;font-size:10px!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedListV1 .mmh-overview-fields{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important;margin:0!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedListV1 [data-invest-holding-v144] .mmh-overview-fields{grid-template-columns:repeat(3,minmax(0,1fr))!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedListV1 .mmh-overview-field{padding:0!important;border:0!important;background:none!important;margin:0!important;min-width:0!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedListV1 .mmh-overview-field:nth-child(6){grid-column:auto!important;padding:0!important;border:0!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedListV1 .mmh-overview-field small,html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedListV1 .mmh-overview-field em{font-size:10px!important;line-height:1.35!important;margin:0!important;color:var(--uv-muted)!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedListV1 .mmh-overview-field b{font:650 13px/1.35 var(--mmh-notice-font,system-ui)!important;font-variant-numeric:tabular-nums!important;margin:3px 0 0!important;color:var(--uv-text)!important;overflow-wrap:anywhere!important}










html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhFiveOverviewNotice{padding:6px 8px!important;margin:0!important;font-size:11px!important;background:transparent!important;background-image:none!important;border-color:var(--uv-line)!important;box-shadow:none!important}
@media(max-width:760px){html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedListV1{grid-template-columns:minmax(0,1fr)!important}html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedListV1 .mmh-overview-card{padding:9px!important}html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedFiltersV1 button{min-height:44px!important}}
@media(max-width:380px){html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedListV1 [data-invest-holding-v144] .mmh-overview-fields{grid-template-columns:repeat(2,minmax(0,1fr))!important}html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedListV1 .mmh-overview-field:nth-child(6){grid-column:1/-1!important}}

html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedListV1 .mmh-overview-field.mmh-pl-profit :is(b,em),html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedKpisV1 .mmh-pl-profit{color:var(--uv-positive)!important}
html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedListV1 .mmh-overview-field.mmh-pl-loss :is(b,em),html body #invest#invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #iw2-pane-overview #mmhUnifiedKpisV1 .mmh-pl-loss{color:var(--uv-negative)!important}


/* V2.0.15: allocation lives only in Strategy; compact native KPI rows. */
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhUnifiedKpisV1{margin:0!important;min-height:0!important;height:auto!important;gap:0!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhUnifiedKpisV1>:is(table,.mmh-native-roi-v214,.mmh-native-note-v214){min-height:0!important;height:auto!important;margin:0!important;padding:0!important;border-radius:0!important;background:transparent!important;background-image:none!important;box-shadow:none!important;border:0!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhUnifiedKpisV1 .mmh-native-kpi-v214 :is(th,td){padding:6px 7px!important;background:transparent!important;background-image:none!important;color:var(--uv-text)!important;font:inherit!important;font-weight:550!important;text-shadow:none!important;box-shadow:none!important;border-bottom:1px solid var(--uv-line)!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhUnifiedKpisV1 .mmh-native-kpi-v214 thead th{color:var(--uv-muted)!important;font-size:11px!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhUnifiedKpisV1 .mmh-native-kpi-v214 .mmh-pl-profit{color:var(--uv-positive)!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhUnifiedKpisV1 .mmh-native-kpi-v214 .mmh-pl-loss{color:var(--uv-negative)!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhUnifiedKpisV1 .mmh-native-total-v214 :is(th,td){font-weight:750!important;background:var(--uv-raised,var(--uv-card))!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhUnifiedKpisV1 .mmh-native-roi-v214{display:flex!important;justify-content:space-between;align-items:center;gap:8px!important;padding:6px 7px!important;font-size:11px!important;color:var(--uv-muted)!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhUnifiedKpisV1 .mmh-native-note-v214{font-size:10px!important;color:var(--uv-muted)!important;padding:2px 7px!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest .mmh-ui-panel:has(>#mmhUnifiedKpisV1){min-height:0!important;height:auto!important;display:block!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #iw2-slot-strategy{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;align-items:stretch!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #iw2-slot-strategy>:is(#mmhInvestPositionMixV215,#mmhInvestSimpleCalcV215,#mmhInvestWatchV13){min-width:0!important;min-height:0!important;height:auto!important;margin:0!important;padding:12px!important;box-sizing:border-box;background:var(--uv-card)!important;background-image:none!important;border:1px solid var(--uv-line)!important;border-radius:8px!important;box-shadow:none!important;color:var(--uv-text)!important}
#iw2-slot-strategy>#mmhInvestPositionMixV215{order:1}#iw2-slot-strategy>#mmhInvestSimpleCalcV215{order:2}#iw2-slot-strategy>#mmhInvestWatchV13{order:3;grid-column:1/-1}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestPositionMixV215 #mmhUnifiedAllocationV1{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:8px!important;height:auto!important;min-height:0!important;max-width:none!important;padding:0!important;margin:0!important;background:transparent!important;overflow:visible!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestPositionMixV215 #mmhUnifiedAllocationV1>span:first-child{font-size:14px!important;font-weight:650!important;color:var(--uv-text)!important;padding:0!important;margin:0 0 4px!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestPositionMixV215 #mmhUnifiedAllocationV1 .mmh-mix-card{display:grid!important;grid-template-columns:minmax(48px,.5fr) minmax(0,2fr) 64px;align-items:center;gap:8px!important;background:transparent!important;border:0!important;padding:0!important;margin:0!important;box-shadow:none!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestPositionMixV215 .mmh-mix-label{display:contents!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestPositionMixV215 .mmh-mix-label b{grid-column:1;grid-row:1;color:var(--uv-text)!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestPositionMixV215 .mmh-mix-label span{grid-column:3;grid-row:1;text-align:right;color:var(--uv-text)!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestPositionMixV215 .mmh-mix-track{grid-column:2;grid-row:1;margin:0!important;height:7px!important;background:var(--uv-line)!important}
#mmhInvestPositionMixV215 .mmh-overview-mix-hint{display:none!important}
#mmhInvestSimpleCalcV215 h3{font-size:14px!important;margin:0 0 10px!important;color:var(--uv-text)!important}
#mmhInvestSimpleCalcV215 label{display:grid;gap:4px;min-width:0;font-size:11px;color:var(--uv-muted)!important}
#mmhInvestSimpleCalcV215 .iw215-inputs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}
html body #invest #mmhInvestSimpleCalcV215 :is(input,select){box-sizing:border-box;width:100%;min-width:0;min-height:36px;padding:6px 8px!important;background:var(--uv-raised,var(--uv-card))!important;color:var(--uv-text)!important;border:1px solid var(--uv-line)!important;border-radius:6px!important;font-size:13px!important;box-shadow:none!important}
#mmhInvestSimpleCalcV215 p{font-size:11px!important;color:var(--uv-muted)!important;margin:6px 0!important}
#mmhInvestSimpleCalcV215 .iw215-result-label{margin:10px 0 2px!important}
#mmhInvestSimpleCalcV215 strong{display:block;font-size:22px!important;margin:2px 0!important;color:var(--uv-text)!important;overflow-wrap:anywhere}
#iw2-archive{order:99;grid-column:1/-1;border:1px solid var(--uv-line);border-radius:8px;padding:8px;color:var(--uv-text);background:var(--uv-card)}
#iw2-archive>summary{cursor:pointer;font-size:12px}#iw2-archive-body{display:grid;gap:8px;margin-top:8px}
/* V2.0.15 Strategy watchlist: keep safety messages and action handlers. */
html body #invest#invest#invest#invest#invest#invest#invest#invest #iw2-slot-strategy #mmhInvestWatchV13 .ivw13-kicker,html body #invest#invest#invest#invest#invest#invest#invest#invest #iw2-slot-strategy #mmhInvestWatchV13 [data-watch-desc]{display:none!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #iw2-slot-strategy #mmhInvestWatchV13 .ivw13-title{display:flex!important;justify-content:space-between!important;align-items:center!important;flex-wrap:wrap!important;gap:8px!important;margin:0 0 8px!important;padding:0!important;min-height:0!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #iw2-slot-strategy #mmhInvestWatchV13 .ivw13-title h2{font-size:14px!important;line-height:1.4!important;font-weight:650!important;margin:0!important;padding:0!important;color:var(--uv-text)!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #iw2-slot-strategy #mmhInvestWatchV13 .ivw13-list{gap:6px!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #iw2-slot-strategy #mmhInvestWatchV13 .ivw13-item{min-width:0!important;min-height:0!important;margin:0!important;padding:8px!important;border:1px solid var(--uv-line)!important;border-radius:6px!important;background:var(--uv-raised,var(--uv-card))!important;background-image:none!important;box-shadow:none!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #iw2-slot-strategy #mmhInvestWatchV13 .ivw13-foot{font-size:11px!important;line-height:1.5!important;color:var(--uv-muted)!important;margin:8px 0 0!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #iw2-slot-strategy{align-items:stretch!important}
/* V2.0.16: balanced Strategy cards and compact watch controls. */
html body #invest#invest#invest#invest#invest#invest#invest#invest #iw2-pane-strategy:not([hidden]){min-height:0!important;height:auto!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #iw2-slot-strategy{align-content:start!important;grid-auto-rows:auto!important;min-height:0!important;height:auto!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 :is(.ivw13-item-top,.ivw13-datum){min-width:0!important;overflow-wrap:anywhere}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 dialog .ivw13-fields :is(input,select){min-width:0!important;max-width:100%!important;box-sizing:border-box}


html body #invest#invest#invest#invest#invest#invest#invest#invest #iw2-slot-strategy>#mmhInvestPositionMixV215{display:flex!important;flex-direction:column!important;align-self:stretch!important;max-height:none!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestPositionMixV215 #mmhUnifiedAllocationV1{flex:1;align-content:center!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 .ivw13-item{display:grid!important;grid-template-columns:minmax(105px,.8fr) minmax(210px,2fr) auto!important;gap:6px 12px!important;align-items:center!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 .ivw13-item-top{display:flex!important;flex-wrap:wrap;align-items:center!important;gap:5px!important;margin:0!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 .ivw13-datum{display:flex!important;flex-wrap:wrap!important;gap:8px 20px!important;margin:0!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 .ivw13-item>p{grid-column:1/-1;margin:0!important;font-size:11px!important;color:var(--uv-muted)!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 .ivw13-buttons{grid-column:3;grid-row:1;display:flex!important;justify-content:flex-end!important;gap:4px!important;margin:0!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 .ivw13-buttons button{flex:0 0 auto!important;width:32px!important;min-width:32px!important;min-height:32px!important;padding:5px!important;display:inline-flex!important;align-items:center;justify-content:center}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 .ivw13-met .ivw13-status{color:var(--uv-positive)!important;border-color:var(--uv-positive)!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 .ivw13-pending .ivw13-status{color:var(--uv-accent)!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 .ivw13-paused .ivw13-status{color:var(--uv-muted)!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 .ivw13-buttons .ivw13-danger{color:var(--uv-negative)!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 dialog.ivw216-dialog{position:fixed!important;inset:0!important;margin:auto!important;width:min(520px,calc(100vw - 28px))!important;max-height:calc(100dvh - 32px)!important;overflow:auto!important;box-sizing:border-box;padding:16px!important;background:var(--uv-card)!important;color:var(--uv-text)!important;border:1px solid var(--uv-line)!important;border-radius:12px!important;box-shadow:0 16px 56px #0004!important}
#mmhInvestWatchV13 dialog.ivw216-dialog::backdrop{background:#0006}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 dialog.ivw216-dialog:not([open]){display:none!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 .ivw13-buttons button::before,html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 .ivw13-buttons button::after{display:none!important;content:none!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 .ivw13-buttons button svg{display:block!important;flex:none!important;width:16px!important;height:16px!important}
#mmhInvestSimpleCalcV215 [data-calc-change]:empty{display:none!important}
@media(min-width:900px) and (hover:hover) and (pointer:fine),(min-width:1100px){html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 dialog.ivw216-dialog{inset-inline-start:var(--wv-shell-rail,var(--wv-nav,240px))!important;inset-block-start:var(--wv-shell-top,64px)!important;max-height:calc(100dvh - var(--wv-shell-top,64px) - 32px)!important}}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 dialog .ivw13-editor{padding:0!important;border:0!important;margin:0!important;background:transparent!important;box-shadow:none!important}
#mmhInvestWatchV13 .ivw216-feedback:empty{display:none}
@media(max-width:1000px){
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 .ivw13-item{grid-template-columns:minmax(0,1fr) auto!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 .ivw13-datum{grid-column:1/-1}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 .ivw13-buttons{grid-column:2}
}
@media(max-width:760px){
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 .ivw13-buttons button{width:44px!important;min-width:44px!important;min-height:44px!important}
}
@media(max-width:760px){
html body #invest#invest#invest#invest#invest#invest#invest#invest #iw2-slot-strategy{grid-template-columns:minmax(0,1fr)!important}
html body #invest #mmhInvestSimpleCalcV215 :is(input,select){min-height:44px!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #iw2-slot-strategy #mmhInvestWatchV13 button{min-height:44px!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestPositionMixV215 .mmh-mix-label b{min-width:0!important;overflow-wrap:anywhere!important}
}
@media(max-width:420px){
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 dialog .ivw13-fields{grid-template-columns:minmax(0,1fr)!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 .ivw13-item{grid-template-columns:minmax(0,1fr)!important}
html body #invest#invest#invest#invest#invest#invest#invest#invest #mmhInvestWatchV13 .ivw13-buttons{grid-column:1;grid-row:auto;justify-content:flex-end!important}
}

`;
   document.head.append(style);
  }
  root.classList.add('mmh-invest-summary-compact');
 }
 function initialize(){
  installCompactOverview();
  // Observe #invest BEFORE trying to build. The five-page navigation may
  // create its overview after DOMContentLoaded, or after data becomes ready.
  if(!observer){
   observer=new MutationObserver(records=>{
    const parent=$('mmhFiveoverview');
    for(const change of records){
     if(change.type!=='childList')continue;
     if(change.target.id==='mmhFiveOverviewNotice'){schedule();break;}
     if([...change.addedNodes,...change.removedNodes].some(n=>relevant(n,parent))){schedule();break;}
    }
   });
   observer.observe(root,{childList:true,subtree:true});
  }
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
 // Recover after any original Invest render without changing its handlers.
 for(const event of ['mmhvault:page-visible','mmhvault:data-loaded','mmhvault:cache-restored','mmhvault:market-updated','mmhvault:invest-daily-ready','mmhvault:config-owner-changed','languagechange','mmhvault-language-change']){
  window.addEventListener(event,()=>{if(event.includes('language'))translate();if(!ownData(calcOwner))updateStrategy(null,[]);schedule();},{passive:true});
 }
 // The 5-page legacy navigation creates its sections on demand.
 // Wrapping is unnecessary and brittle; the root observer catches creation.
 window.mmhInvestWorkspaceV2={activate:(key)=>{schedule();window.requestAnimationFrame(()=>activate(key,true))},relocate,syncTop,updateStrategy};
})();
