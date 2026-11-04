/* MMHVAULT Analytics V2.1 — dependency-free, verified RUM SVG trend chart.
 * No personal data, local storage, tracking, remote script or unsafe HTML injection.
 * Missing buckets are not invented as zero-valued observations.
 */
(function(root){
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const MAX_POINTS={hour:25,day:31};

  function parseBuckets(trend,granularity){
    if(!Object.hasOwn(MAX_POINTS,granularity)||!Array.isArray(trend)||
       trend.length>MAX_POINTS[granularity])return null;
    const parsed=[],seen=new Set();
    for(const point of trend){
      if(!point||typeof point.date!=='string'||
         !Number.isSafeInteger(point.visits)||point.visits<0||
         !Number.isSafeInteger(point.pageViews)||point.pageViews<0||
         seen.has(point.date))return null;
      if(granularity==='hour'){
        if(!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):00:00Z$/.test(point.date))return null;
        const t=Date.parse(point.date);
        if(!Number.isFinite(t)||new Date(t).toISOString().replace('.000Z','Z')!==point.date)return null;
      }else{
        if(!/^\d{4}-\d{2}-\d{2}$/.test(point.date))return null;
        const t=Date.parse(point.date+'T00:00:00Z');
        if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==point.date)return null;
      }
      seen.add(point.date);
      parsed.push({date:point.date,visits:point.visits,pageViews:point.pageViews});
    }
    return parsed.sort((a,b)=>a.date.localeCompare(b.date));
  }

  function make(tag,attrs,text){
    const el=document.createElementNS(NS,tag);
    for(const [key,value] of Object.entries(attrs||{}))el.setAttribute(key,String(value));
    if(text!==undefined)el.textContent=String(text);
    return el;
  }
  function html(tag,className,text){
    const el=document.createElement(tag);
    if(className)el.className=className;
    if(text!==undefined)el.textContent=String(text);
    return el;
  }
  function labelFor(date,granularity){
    return granularity==='hour'?date.slice(11,16):date.slice(5);
  }
  function clear(container,message){
    container.replaceChildren(html('div','chart-empty',message));
  }

  function render(container,trend,granularity){
    if(!container)return false;
    const points=parseBuckets(trend,granularity);
    if(!points){
      clear(container,'Verified chart data is unavailable for this period.');
      return false;
    }
    if(!points.length){
      clear(container,'No recorded Web Analytics activity for this period.');
      return true;
    }
    const width=Math.max(300,Math.min(1000,container.clientWidth||720));
    const height=270,top=26,left=46,right=20,bottom=50;
    const plotWidth=width-left-right,plotHeight=height-top-bottom;
    const topValue=Math.max(...points.flatMap(p=>[p.visits,p.pageViews]),1);
    const maximum=Math.max(4,Math.ceil(topValue/4)*4);
    const x=index=>left+(points.length===1?plotWidth/2:(index/(points.length-1))*plotWidth);
    const y=value=>top+plotHeight-(value/maximum)*plotHeight;
    const number=new Intl.NumberFormat('en-US');

    const wrap=html('div','chart-shell');
    const legend=html('div','chart-legend');
    for(const [label,color] of [['Visits','gold'],['Page views','blue']]){
      const item=html('span','legend-item');
      item.appendChild(html('span','legend-swatch '+color));
      item.appendChild(html('span','',label));
      legend.appendChild(item);
    }
    wrap.appendChild(legend);

    const svg=make('svg',{viewBox:'0 0 '+width+' '+height,width:'100%',height:height,
      role:'img','aria-label':'Verified Cloudflare Web Analytics trend. '+points.length+' observed time buckets, UTC.'});
    const title=make('title',{},'Visits and page views over time — Cloudflare Web Analytics');
    const desc=make('desc',{},'Only time buckets returned by the verified Cloudflare API are plotted. The timeline is shown in UTC.');
    svg.append(title,desc);

    const defs=make('defs');
    const gradient=make('linearGradient',{id:'mmhvault-trend-fill',x1:'0',y1:'0',x2:'0',y2:'1'});
    gradient.append(make('stop',{offset:'0%','stop-color':'#d9b978','stop-opacity':'0.25'}),
                    make('stop',{offset:'100%','stop-color':'#d9b978','stop-opacity':'0.005'}));
    defs.appendChild(gradient);
    svg.appendChild(defs);

    for(let i=0;i<=4;i++){
      const val=maximum*i/4,py=y(val);
      svg.appendChild(make('line',{x1:left,y1:py,x2:width-right,y2:py,stroke:'#35455f','stroke-width':1,'stroke-opacity':'.68'}));
      const tick=make('text',{x:left-9,y:py+4,'text-anchor':'end',fill:'#98abc3','font-size':12});
      tick.textContent=number.format(val);
      svg.appendChild(tick);
    }
    const coords=key=>points.map((p,i)=>[x(i),y(p[key])]);
    const toPath=pts=>pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' ');
    const visits=coords('visits'),pageViews=coords('pageViews');
    if(visits.length>1){
      const baseline=y(0),first=visits[0],last=visits[visits.length-1];
      svg.appendChild(make('path',{d:toPath(visits)+' L'+last[0].toFixed(2)+' '+baseline.toFixed(2)+' L'+first[0].toFixed(2)+' '+baseline.toFixed(2)+' Z',fill:'url(#mmhvault-trend-fill)'}));
    }
    for(const [coordsList,color] of [[pageViews,'#73b3f5'],[visits,'#d9b978']]){
      if(coordsList.length>1)svg.appendChild(make('path',{d:toPath(coordsList),fill:'none',stroke:color,'stroke-width':2.8,'stroke-linejoin':'round','stroke-linecap':'round'}));
      for(let i=0;i<coordsList.length;i++){
        const [cx,cy]=coordsList[i],point=points[i];
        const dot=make('circle',{cx,cy,r:4.8,fill:color,stroke:'#142034','stroke-width':2});
        dot.appendChild(make('title',{},point.date+' UTC | Visits: '+number.format(point.visits)+' | Page views: '+number.format(point.pageViews)));
        svg.appendChild(dot);
      }
    }
    const labelIndices=new Set([0,points.length-1]);
    const every=Math.max(1,Math.ceil(points.length/(width<420?3:width<690?4:6)));
    for(let i=0;i<points.length;i+=every)labelIndices.add(i);
    for(const i of [...labelIndices].sort((a,b)=>a-b)){
      const label=make('text',{x:x(i),y:height-25,'text-anchor':i===0?'start':i===points.length-1?'end':'middle',fill:'#aebdd1','font-size':12},labelFor(points[i].date,granularity));
      svg.appendChild(label);
    }
    wrap.appendChild(svg);
    wrap.appendChild(html('p','chart-note',
      (granularity==='hour'?'Hourly':'Daily')+' observations · UTC · Only verified Cloudflare data shown. Missing intervals are not estimated.'));
    container.replaceChildren(wrap);
    return true;
  }
  root.MMHAnalyticsChart={parseBuckets,render,clear};
})(typeof window!=='undefined'?window:globalThis);
