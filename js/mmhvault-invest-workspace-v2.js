/* MMHVAULT Invest 2.0 — overview workspaces. Presentation/navigation only.
 * Reparents existing module roots; NEVER duplicates them, requests financial data,
 * changes calculations, overrides source module events, or touches Supabase.
 */
(()=>{'use strict';
 if(window.__mmhInvestWorkspaceV2)return;
 window.__mmhInvestWorkspaceV2=true;
 const root=document.getElementById('invest');
 if(!root)return;
 const $=id=>document.getElementById(id);
 const KEYS=['overview','returns','strategy','data'];
 const SLOTS={
  overview:['mmhFiveOverviewNotice'],
  returns:['mmhInvestDailyV1','mmhInvestDrawdownV16'],
  strategy:['mmhInvestGuidanceV12','mmhInvestWatchV13','mmhInvestRiskV14','mmhInvestPlansV15'],
  data:['mmhInvestSnapshotsV18','mmhInvestAutoV19','mmhInvestAutoPnlV110','mmhInvestPnlArchiveV111']
 };
 const TARGETS=new Map(Object.entries(SLOTS).flatMap(([key,ids])=>ids.map(id=>[id,key])));
 const STRINGS={
  overview:{zh:'总览',en:'Overview'},returns:{zh:'收益分析',en:'Performance'},strategy:{zh:'投资策略',en:'Strategy'},data:{zh:'数据中心',en:'Data Center'},
  heading:{zh:'投资工作区',en:'Investment Workspace'},
  headingSub:{zh:'总览只看重点，收益、策略和数据各自独立。',en:'A clear overview, with returns, strategies and data in their own spaces.'},
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
  moreMenu:{zh:'添加投资、投资历史、项目管理和实时行情仍在原有页面选择菜单中。',en:'Add Investment, Portfolio, Manage Projects and Live Prices remain in the existing page picker.'}
 };
 const lang=()=>{try{return (window.getMMHVAULTLanguage?.()==='zh'||/^zh/i.test(document.documentElement.lang))?'zh':'en';}catch(_){return 'en'}};
 const tr=(k)=>STRINGS[k]?.[lang()]||k;
 let active='overview',host=null,observer=null,scheduled=false;
 function build(){
  const parent=$('mmhFiveoverview');if(!parent)return false;
  if(host&&host.isConnected)return true;
  host=document.createElement('div');host.id='mmhInvestWorkspaceV2';host.className='iw2-workspace';
  host.innerHTML=`
   <div class="iw2-intro"><div><span class="iw2-eyebrow">MMHVAULT / INVEST</span><h2 data-iw2-t="heading"></h2><p data-iw2-t="headingSub"></p></div></div>
   <div class="iw2-tabbar" role="tablist" aria-label="Investment workspace">
    ${KEYS.map((k,i)=>`<button type="button" class="iw2-tab" role="tab" id="iw2-tab-${k}" aria-controls="iw2-pane-${k}" aria-selected="${i===0?'true':'false'}" tabindex="${i===0?'0':'-1'}" data-iw2-tab="${k}"><span class="iw2-tab-mark" aria-hidden="true">${['◈','↗','◇','▤'][i]}</span><span data-iw2-t="${k}"></span></button>`).join('')}
   </div>
   ${KEYS.map((k,i)=>`<section class="iw2-pane" id="iw2-pane-${k}" role="tabpanel" tabindex="0" aria-labelledby="iw2-tab-${k}" ${i?'hidden':''}>
    <div class="iw2-section-heading"><h3 data-iw2-t="${k}Title"></h3><p data-iw2-t="${k}Desc"></p></div>
    ${k==='overview'?`<div class="iw2-quicklinks"><button type="button" data-iw2-go="returns"><span class="iw2-link-icon" aria-hidden="true">↗</span><span data-iw2-t="toReturns"></span><span aria-hidden="true">→</span></button><button type="button" data-iw2-go="strategy"><span class="iw2-link-icon" aria-hidden="true">◇</span><span data-iw2-t="toStrategy"></span><span aria-hidden="true">→</span></button><button type="button" data-iw2-go="data"><span class="iw2-link-icon" aria-hidden="true">▤</span><span data-iw2-t="toData"></span><span aria-hidden="true">→</span></button></div><p class="iw2-data-reminder" data-iw2-t="dataHint"></p>`:''}
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
  translate();return true;
 }
 function translate(){if(!host)return;for(const el of host.querySelectorAll('[data-iw2-t]'))el.textContent=tr(el.dataset.iw2T)}
 function activate(key,userInitiated){
  active=KEYS.includes(key)?key:'overview';
  if(!host)return;
  for(const k of KEYS){
   const selected=active===k,button=$('iw2-tab-'+k),panel=$('iw2-pane-'+k);
   if(button){button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;}
   if(panel)panel.hidden=!selected;
  }
  if(userInitiated){$('iw2-tab-'+active)?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
   // The source modules remain mounted and retain their event handlers / input state.
   // A resize event lets responsive charts settle after their pane becomes visible.
   window.requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  }
 }
 function relocate(){
  if(!build())return;
  const parent=$('mmhFiveoverview');
  // Two legacy overview panels are the already-existing summary + holdings.
  // Only move their existing nodes, retaining identifiers and listeners.
  for(const el of [...parent.children]){
   if(el===host)continue;
   const destination=TARGETS.get(el.id)||((el.classList.contains('mmh-ui-panel'))?'overview':null);
   if(destination){const target=$('iw2-slot-'+destination);if(target&&el.parentNode!==target)target.append(el);}
  }
  for(const [id,destination] of TARGETS){
   const el=$(id),target=$('iw2-slot-'+destination);
   if(el&&target&&parent.contains(el)&&el.parentNode!==target)target.append(el);
  }
  activate(active,false);
 }
 function schedule(){if(scheduled)return;scheduled=true;window.requestAnimationFrame(()=>{scheduled=false;relocate()})}
 function initialize(){if(!build())return;
  relocate();activate('overview',false);
  const container=$('mmhFiveoverview');
  if(observer)observer.disconnect();
  observer=new MutationObserver(records=>{
   for(const change of records){
    if(change.type!=='childList'||!change.addedNodes.length)continue;
    if([...change.addedNodes].some(n=>n.nodeType===1 && (TARGETS.has(n.id)||(n.parentNode===container&&n.classList?.contains('mmh-ui-panel'))))){schedule();break;}
   }
  });
  observer.observe(container,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
 for(const event of ['languagechange','mmhvault-language-change'])window.addEventListener(event,()=>{translate();schedule()});
 window.mmhInvestWorkspaceV2={activate:(key)=>activate(key,true),relocate};
})();
