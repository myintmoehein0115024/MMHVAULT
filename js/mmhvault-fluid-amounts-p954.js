/* MMHVAULT P9.54 — currency-safe fit for read-only values, without mutating amount data.
 * No network, no finance calculations, no HTML rewrites, no storage or auth changes.
 */
(()=>{'use strict';
  const SELECTORS=[
    '#cashflow-analyze .cfa-budget-comparison b',
    '#cashflow-analyze .cfa-card>strong',
    '#cashflow-analyze .cfa-mini-card>strong',
    '#cashflow-analyze .cfa-breakdown-value b',
    '#reports .report-kpi-v115>strong', '#reports .report-mini-v115 b',
    '#reports .report-compare-row-v115>b', '#reports .report-category-amount-v115',
    '#reports .report-category-row-v115 b', '#reports .report-goal-row-v115 b',
    '#dashboard .mmh-networth-value', '#dashboard .mmh-command-stat b',
    '#dashboard .mmh-mini-metrics b','#dashboard .pf-kpi-value-v500',
    '#dashboard .pf-kpi-v500 strong','#dashboard .data-center-stat-v380 b',
    '#transactions .tx-mobile-amount-v371', '#transactions .mmh-history-amount-summary',
    '#invest .mmh-ui-kpi strong','#invest .mmh-overview-field b',
    '#accounts-page .am-summary>strong','#accounts-page .am-summary-grid b',
    '#accounts-page .am-row-value','#exchange .exchange-converter-result .value',
    '#cashflow-analyze .cfa-money', '#rateCards strong',
    '.cashflow-card-v371 .value','.fin-health-card .value',
    '.mmh-life-fund-card b','.mmh-life-spending-card b',
    '.life-fund-card b','.life-spending-card b','.mmh-fund-amount',
    '.lf-amount','.li-money','.li-kpi strong','.li-kpi b',
    '.ls-metrics strong','.ls-metrics b',
    '#cashflow-analyze .budget-kpi-v110 strong',
    '#dashboard .budget-kpi-v110 strong',
    ':is(#dashboard,#transactions,#invest,#accounts-page,#cashflow-analyze,#reports,#exchange,#analyze,#settings) :is([class*="-amount"],[class*="-balance"],[class*="-value"],[class*="-metric"])',
    'body.mmh-p954-business .kpi b', 'body.mmh-p954-business .metric b',
    'body.mmh-p954-business .activity-amount', 'body.mmh-p954-business .statement-balance',
    'body.mmh-p954-business .reorder-metric b'
  ].join(',');
  // Match formatted amount / percentage outputs only. Never touch notes, labels, user inputs.
  const looksNumeric=s=>/(?:[$฿¥￥]|\b(?:USD|THB|MMK|RMB|CNY|K)\b|\d[\d,.]*\s?%)/i.test(s)||/^[+−\-]?\s*[\d,.]+(?:\s*[A-Z]{0,3})?$/.test(s);
  const tracked=new Set();const pending=new Set();const trackedByParent=new WeakMap();let scheduled=false;
  const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const visible=el=>el.isConnected&&el.getClientRects().length>0&&el.getBoundingClientRect().width>0;
  function findSpace(el){
    const p=el.parentElement;if(!p)return 0;
    const style=getComputedStyle(el);const r=el.getBoundingClientRect();
    if((style.display==='block'||style.display==='grid'||style.display==='flex')&&el.clientWidth>0){return el.clientWidth;}
    const ps=getComputedStyle(p);const pr=p.getBoundingClientRect();
    let free=p.clientWidth-parseFloat(ps.paddingLeft||0)-parseFloat(ps.paddingRight||0);
    if(ps.display.includes('flex')||ps.display.includes('grid')){
      let sibling=0;
      for(const n of p.children){if(n===el||getComputedStyle(n).display==='none')continue;
        sibling+=n.getBoundingClientRect().width;
      }
      free-=sibling+Math.max(0,p.children.length-1)*parseFloat(ps.columnGap||ps.gap||0);
      // For flex-shrink layouts use parent's measured available space, not overflowing child size.
    }else if(r.width>0&&r.width<=free){free=Math.min(free,r.width)}
    // Cashflow breakdown b shares space with a fixed percent chip and the category label.
    if(el.matches('#cashflow-analyze .cfa-breakdown-value b')){
      const row=p.parentElement;const rs=row&&getComputedStyle(row);
      if(row&&rs&&rs.display.includes('flex')){
        const label=row.firstElementChild;const badge=p.querySelector('.cfa-breakdown-rate');
        const rest=(label?.getBoundingClientRect().width||0)+(badge?.getBoundingClientRect().width||0)+22;
        free=Math.min(free,Math.max(25,row.clientWidth-rest));
      }
    }
    return Math.max(0,free);
  }
  function widthAt(el,size,text){
    const st=getComputedStyle(el);
    ctx.font=`${st.fontStyle} ${st.fontWeight} ${size}px ${st.fontFamily}`;
    const raw=ctx.measureText(text).width;
    const letter=parseFloat(getComputedStyle(el).letterSpacing);return raw*1.075+(Number.isFinite(letter)?Math.max(0,letter)*Math.max(0,text.length-1):0)+2.5;
  }
  function fit(el){
    if(!visible(el))return;
    const text=el.textContent.trim();
    if(!text||text.length>80||!looksNumeric(text))return;
    el.classList.add('mmh-money-fit-p954');
    // Read the stylesheet's natural font for the current breakpoint/currency, not the last fitted size.
    el.style.removeProperty('font-size');
    const style=getComputedStyle(el),base=parseFloat(style.fontSize),space=findSpace(el);
    if(!(base>0&&space>3))return;
    const min=Math.min(base,window.innerWidth<=375?11.5:12);
    let low=min,high=base,result=base;
    if(widthAt(el,base,text)>space){
      result=min;
      for(let i=0;i<10;i++){const mid=(low+high)/2;
        if(widthAt(el,mid,text)<=space){result=mid;low=mid}else high=mid;
      }
    }
    el.style.setProperty('font-size',`${Math.max(min,result).toFixed(2)}px`,'important');
    const tooWide=widthAt(el,min,text)>space+1;
    el.dataset.mmhFitOverflow=tooWide?'1':'0';
    if(tooWide&&el.matches('#cashflow-analyze .cfa-budget-comparison b')){
      const grid=el.closest('.cfa-budget-comparison');
      if(grid){
        const klass=!grid.classList.contains('mmh-p954-expanded')
          ?'mmh-p954-expanded':'mmh-p955-single-column';
        if(!grid.classList.contains(klass)){
          grid.classList.add(klass);
          grid.querySelectorAll('b').forEach(x=>pending.add(x));
          plan();
        }
      }
    }
    if(tooWide&&el.matches('#reports .report-kpi-v115>strong')){
      const grid=el.closest('.report-kpis-v115');
      if(grid&&!grid.classList.contains('mmh-p955-single-column')){
        grid.classList.add('mmh-p955-single-column');
        grid.querySelectorAll('.report-kpi-v115>strong').forEach(x=>pending.add(x));
        plan();
      }
    }
  }
  function plan(){if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;
      const todo=Array.from(pending);pending.clear();for(const el of todo)try{fit(el)}catch(e){/* malformed widget should not interrupt the page */}
    });
  }
  const resize=new ResizeObserver(entries=>{
    for(const e of entries){for(const el of trackedByParent.get(e.target)||[])pending.add(el)}plan();
  });
  const seenParents=new WeakSet();
  function register(el){if(!el||tracked.has(el))return;
    tracked.add(el);pending.add(el);
    const p=el.parentElement;if(p){let group=trackedByParent.get(p);if(!group){group=new Set();trackedByParent.set(p,group)}group.add(el);if(!seenParents.has(p)){seenParents.add(p);resize.observe(p)}}
  }
  function scan(root){if(!root)return;
    if(root.nodeType===1&&root.matches?.(SELECTORS))register(root);
    root.querySelectorAll?.(SELECTORS).forEach(register);
    plan();
  }
  function start(){if(document.body?.classList.contains('business-app'))document.body.classList.add('mmh-p954-business');
    if(document.querySelector('.business-shell,.business-app,#businessDashboard'))document.body.classList.add('mmh-p954-business');
    scan(document);
    function resetValueLayout(el){
      if(!el?.matches?.(SELECTORS))return;
      const budget=el.closest('.cfa-budget-comparison');
      if(budget)budget.classList.remove('mmh-p954-expanded','mmh-p955-single-column');
      const report=el.closest('.report-kpis-v115');
      if(report)report.classList.remove('mmh-p955-single-column');
      pending.add(el);
      if(budget)budget.querySelectorAll('b').forEach(x=>pending.add(x));
      if(report)report.querySelectorAll('.report-kpi-v115>strong').forEach(x=>pending.add(x));
    }
    const observer=new MutationObserver(records=>{
      for(const m of records){
        if(m.type==='characterData'){
          let p=m.target.parentElement;
          while(p&&p!==document.body&&!p.matches?.(SELECTORS))p=p.parentElement;
          if(p?.matches?.(SELECTORS))resetValueLayout(p);
        }else{
          if(m.target.matches?.(SELECTORS))resetValueLayout(m.target);
          for(const n of m.addedNodes){
            if(n.nodeType===1)scan(n);
            else if(n.nodeType===3&&n.parentElement?.matches?.(SELECTORS))resetValueLayout(n.parentElement);
          }
        }
      }
      plan();
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
    // Inactive pages have display:none: refit existing amounts when a route becomes visible.
    const routeObserver=new MutationObserver(records=>{for(const m of records){if(m.target.classList.contains('active')||getComputedStyle(m.target).display!=='none')scan(m.target)}});
    document.querySelectorAll('.page').forEach(page=>routeObserver.observe(page,{attributes:true,attributeFilter:['class','hidden']}));
    const rescan=()=>{
      document.querySelectorAll('.cfa-budget-comparison.mmh-p954-expanded,.cfa-budget-comparison.mmh-p955-single-column,.report-kpis-v115.mmh-p955-single-column')
        .forEach(grid=>grid.classList.remove('mmh-p954-expanded','mmh-p955-single-column'));
      for(const el of tracked){if(el.isConnected)pending.add(el);else tracked.delete(el)}
      scan(document);plan();
    };
    window.addEventListener('resize',rescan,{passive:true});
    window.addEventListener('orientationchange',rescan,{passive:true});
    window.addEventListener('mmhvault-language-change',rescan);
    window.addEventListener('languagechange',rescan);
    document.addEventListener('change',event=>{if(event.target.matches?.('select,[type=number],[type=month]'))rescan()},true);
    // Diagnostic entry for read-only responsive QA, not a finance API.
    window.mmhRefitAmountsP954=rescan;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
