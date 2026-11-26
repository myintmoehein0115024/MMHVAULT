/* MMHVAULT Invest 2.0.5 — lifecycle-safe overview workspaces. Presentation/navigation only.
 * Reparents existing module roots; NEVER duplicates them, requests financial data,
 * changes calculations, overrides source module events, or touches Supabase.
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
  strategy:['mmhInvestGuidanceV12','mmhInvestWatchV13','mmhInvestRiskV14','mmhInvestPlansV15'],
  data:['mmhInvestSnapshotsV18','mmhInvestAutoV19','mmhInvestAutoPnlV110','mmhInvestPnlArchiveV111']
 };
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
  moreMenu:{zh:'右上角可打开投资记录、新增数据及项目管理。',en:'Use the top-right icons for records, adding data and project management.'}
 };
 const lang=()=>{try{const l=String(window.getMMHVAULTLanguage?.()||document.documentElement.lang||'en').toLowerCase();return /^zh/.test(l)?'zh':/^(my|mm)/.test(l)?'my':'en';}catch(_){return 'en'}};
 const tr=(k)=>STRINGS[k]?.[lang()]||STRINGS[k]?.en||k;
 let active='overview',host=null,observer=null,scheduled=false;
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
    ${k==='overview'?`<p class="iw2-data-reminder" data-iw2-t="dataHint"></p>`:''}
    <div class="iw2-content" id="iw2-slot-${k}"></div>
   </section>`).join('')}
   <p class="iw2-footer" data-iw2-t="moreMenu"></p>`;
  parent.prepend(host);
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
  translate();bindTop();return true;
 }
 function translate(){if(!host)return;for(const el of host.querySelectorAll('[data-iw2-t]')){const value=tr(el.dataset.iw2T);if(el.textContent!==value)el.textContent=value;}syncTop();}
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
   if(destination){const slot=$('iw2-slot-'+destination);if(slot&&el.parentNode!==slot)slot.append(el);}
  }
  // Legacy extensions can mount after the overview and can re-mount on
  // data-loaded/page-visible events. Find them anywhere in Invest, not just
  // as direct overview children, then put them back in their single slot.
  for(const [id,destination] of TARGETS){
   const el=root.querySelector('[id="'+id+'"]'),slot=$('iw2-slot-'+destination);
   if(el&&slot&&el.parentNode!==slot)slot.append(el);
  }
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
  if(!$('mmhInvestCompactOverviewStyleV205')){
   const style=document.createElement('style');style.id='mmhInvestCompactOverviewStyleV205';
   style.textContent=`
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
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhFiveoverview #mmhInvestDailyV1{display:grid!important;grid-template-columns:minmax(0,1.45fr) minmax(0,1fr)!important;gap:8px!important;padding:12px!important;margin:0!important;min-width:0!important;background:var(--uv-card)!important;background-image:none!important;border:1px solid var(--uv-line)!important;border-radius:9px!important;box-shadow:none!important;color:var(--uv-text)!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 > :is(.idv1-head,.idv1-cards,.idv1-controls,.idv1-breakdown,.idv1-gold-note,.idv1-note,.idv1-status){grid-column:1/-1!important;min-width:0!important;margin:0!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 .idv1-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;flex-wrap:wrap!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 .idv1-kicker{display:none!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 .idv1-head h2{font:600 15px/1.4 var(--mmh-notice-font,system-ui)!important;color:var(--uv-text)!important;margin:0!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 .idv1-head p{font-size:11px!important;line-height:1.4!important;color:var(--uv-muted)!important;margin:3px 0 0!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 :is(.idv1-summary-group,.idv1-chart-group,.idv1-asset-section){padding:8px!important;margin:0!important;min-width:0!important;background:var(--uv-card)!important;background-image:none!important;border:1px solid var(--uv-line)!important;border-radius:7px!important;box-shadow:none!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 .idv1-summary-row{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 .idv1-stat{padding:7px!important;min-width:0!important;min-height:0!important;background:var(--uv-raised)!important;background-image:none!important;box-shadow:none!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 .idv1-stat b{font-size:clamp(13px,1.5vw,19px)!important;line-height:1.35!important;overflow-wrap:anywhere}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 :is(.idv1-group-label,.idv1-chart-head small,.idv1-break-head span,.idv1-stat small){font-size:11px!important;color:var(--uv-muted)!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 .idv1-controls{display:flex!important;align-items:center!important;justify-content:space-between!important;flex-wrap:wrap!important;gap:6px!important;padding:2px 0!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 :is(.idv1-period,.idv1-symbol-filter){gap:4px!important;flex-wrap:wrap!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 :is(.idv1-period button,.idv1-symbol-filter button,.idv1-refresh){min-height:32px!important;padding:5px 8px!important;font-size:11px!important;background:var(--uv-raised)!important;background-image:none!important;color:var(--uv-text)!important;border:1px solid var(--uv-line)!important;border-radius:6px!important;box-shadow:none!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 :is(.idv1-period button.active,.idv1-symbol-filter button.active){color:var(--uv-accent)!important;border-color:var(--uv-accent)!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 > #idv1Trend{grid-column:1!important;min-width:0!important;margin:0!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 > #idv1History{grid-column:2!important;min-width:0!important;margin:0!important;align-self:stretch!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 .idv1-table-scroll{max-height:220px!important;overflow:auto!important;overscroll-behavior:contain}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 .idv1-chart-scroll{max-width:100%!important;overflow-x:auto!important;overscroll-behavior-inline:contain}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 .idv1-bar-track{height:100px!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 .idv1-break-head{margin:0 0 6px!important;gap:4px!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 .idv1-break-head h3{font-size:13px!important;margin:0!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 .idv1-break-card{padding:7px!important;min-width:0!important;min-height:0!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 :is(.idv1-note,.idv1-gold-note,.idv1-status,.idv1-verify){font-size:11px!important;line-height:1.45!important;color:var(--uv-muted)!important;padding:4px 0!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 .idv1-up{color:var(--uv-positive)!important}
html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 .idv1-down{color:var(--uv-negative)!important}
@media(max-width:1000px){html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhUnifiedKpisV1{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media(max-width:760px){html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhFiveoverview #mmhInvestDailyV1{grid-template-columns:minmax(0,1fr)!important;padding:9px!important;gap:6px!important}html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 > :is(#idv1Trend,#idv1History){grid-column:1/-1!important}html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 .idv1-table-scroll{max-height:176px!important}html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 :is(.idv1-period button,.idv1-symbol-filter button,.idv1-refresh){min-height:44px!important}}
@media(max-width:360px){html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhUnifiedKpisV1{grid-template-columns:minmax(0,1fr)!important}html body #invest#invest#invest#invest#invest#invest.mmh-invest-summary-compact #mmhInvestDailyV1 .idv1-summary-row{grid-template-columns:minmax(0,1fr)!important}}
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
     if([...change.addedNodes,...change.removedNodes].some(n=>relevant(n,parent))){schedule();break;}
    }
   });
   observer.observe(root,{childList:true,subtree:true});
  }
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
 // Recover after any original Invest render without changing its handlers.
 for(const event of ['mmhvault:page-visible','mmhvault:data-loaded','mmhvault:cache-restored','mmhvault:market-updated','mmhvault:invest-daily-ready','languagechange','mmhvault-language-change']){
  window.addEventListener(event,()=>{if(event.includes('language'))translate();schedule();},{passive:true});
 }
 // The 5-page legacy navigation creates its sections on demand.
 // Wrapping is unnecessary and brittle; the root observer catches creation.
 window.mmhInvestWorkspaceV2={activate:(key)=>{schedule();window.requestAnimationFrame(()=>activate(key,true))},relocate,syncTop};
})();
