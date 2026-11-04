/* MMHVAULT Analytics V2.3: verified aggregated Cloudflare RUM breakdowns.
 * Safe text nodes only. No visitor IDs, client tracking or local storage.
 */
(function(root){
  'use strict';
  const TYPES=[
    ['countries','Countries'],['pages','Popular pages'],
    ['referrers','Referral domains'],['browsers','Browsers'],['devices','Device types']
  ];
  const make=(tag,className,value)=>{
    const el=document.createElement(tag);
    if(className)el.className=className;
    if(value!==undefined)el.textContent=String(value);
    return el;
  };
  const numeric=new Intl.NumberFormat('en-US');
  const countryNames=typeof Intl.DisplayNames==='function'?
    new Intl.DisplayNames(['en'],{type:'region'}):null;
  function labelFor(type,value){
    if(type==='countries'&&/^[A-Z]{2}$/.test(value)&&countryNames){
      const translated=countryNames.of(value);
      if(translated&&translated!==value)return translated+' ('+value+')';
    }
    if(type==='devices')return value.charAt(0).toUpperCase()+value.slice(1);
    return value;
  }
  function clear(container,message='Verified breakdowns have not been loaded.'){
    if(!container)return;
    container.replaceChildren(make('p','breakdown-empty',message));
  }
  function render(container,data,selectedRange){
    if(!container||!data||data.source!=='cloudflare-web-analytics'||
       data.verified!==true||data.range!==selectedRange||data.uniqueVisitors!==null||
       data.groupMetric!=='pageViews'||!data.categories)return false;
    // Reject the complete response if any category is invalid. Never show a
    // partially trusted result or fabricate zeros from missing API data.
    for(const [type] of TYPES){
      const cat=data.categories[type];
      if(!cat||!Array.isArray(cat.rows)||cat.rows.length>10||
         typeof cat.moreMayExist!=='boolean')return false;
      for(const row of cat.rows){
        if(!row||typeof row.label!=='string'||!row.label||row.label.length>160||
           !Number.isSafeInteger(row.pageViews)||row.pageViews<0||
           !Number.isSafeInteger(row.visits)||row.visits<0)return false;
      }
    }
    const grid=make('div','breakdown-grid');
    for(const [type,title] of TYPES){
      const cat=data.categories[type];
      const card=make('article','panel breakdown-card');
      const head=make('h3','breakdown-heading',title);
      card.appendChild(head);
      if(!cat.rows.length){
        card.appendChild(make('p','breakdown-empty','No verified activity in this category.'));
      }else{
        const rows=make('ol','breakdown-list');
        const max=Math.max(1,...cat.rows.map(x=>x.pageViews));
        for(const record of cat.rows){
          const item=make('li','breakdown-row');
          const top=make('div','breakdown-row-header');
          top.appendChild(make('span','breakdown-label',labelFor(type,record.label)));
          top.appendChild(make('span','breakdown-total',numeric.format(record.pageViews)));
          item.appendChild(top);
          const rail=make('div','breakdown-rail');
          rail.setAttribute('aria-hidden','true');
          const fill=make('div','breakdown-rail-fill');
          fill.style.width=(100*record.pageViews/max).toFixed(2)+'%';
          rail.appendChild(fill);
          item.appendChild(rail);
          item.appendChild(make('p','breakdown-detail',
            numeric.format(record.pageViews)+' page views · '+numeric.format(record.visits)+' visits'));
          rows.appendChild(item);
        }
        card.appendChild(rows);
      }
      if(cat.moreMayExist)card.appendChild(make('p','breakdown-limited','Showing top results; more groups may exist.'));
      grid.appendChild(card);
    }
    container.replaceChildren(grid);
    return true;
  }
  root.MMHAnalyticsBreakdowns={render,clear};
})(typeof window!=='undefined'?window:globalThis);
