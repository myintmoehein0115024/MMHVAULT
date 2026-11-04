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

  function render(container,trend,granularity,range,updatedAt,timeZone='UTC'){
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
    // Timezone is display-only: never change RUM groups, API filters, or totals.
    if(timeZone!=='UTC'&&timeZone!=='Asia/Bangkok'){
      clear(container,'Unsupported chart display time zone.');
      return false;
    }
    const zone=granularity==='hour'?timeZone:'UTC';
    const clock=new Intl.DateTimeFormat('en-GB',{
      timeZone:zone,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
    });
    const clockLabel=timestamp=>{
      const parts=Object.fromEntries(clock.formatToParts(new Date(timestamp)).map(p=>[p.type,p.value]));
      return parts.month+'-'+parts.day+' '+parts.hour+':'+parts.minute;
    };
    // Display the entire selected UTC period, not just the dates with data.
    const period=range||(granularity==='hour'?'24h':'7d');
    const days={'24h':1,'7d':7,'30d':30};
    if(!Object.hasOwn(days,period)||((period==='24h')!==(granularity==='hour'))){
      clear(container,'Verified chart period is unavailable.');
      return false;
    }
    const step=granularity==='hour'?3600000:86400000;
    let endTime;
    if(updatedAt!==undefined){
      endTime=Date.parse(updatedAt);
      if(typeof updatedAt!=='string'||!Number.isFinite(endTime)||
         new Date(endTime).toISOString()!==updatedAt){
        clear(container,'Verified chart timestamp is unavailable.');
        return false;
      }
    }else{
      // Preview/test fallback when no verified Worker timestamp is supplied.
      endTime=Date.parse(points[points.length-1].date+(granularity==='day'?'T00:00:00Z':''));
    }
    const endBucket=Math.floor(endTime/step)*step;
    const firstBucket=Math.floor((endTime-days[period]*86400000)/step)*step;
    const timed=points.map(p=>({...p,time:Date.parse(p.date+(granularity==='day'?'T00:00:00Z':''))}));
    if(timed.some(p=>p.time<firstBucket||p.time>endBucket)){
      clear(container,'Verified chart dates are outside the selected period.');
      return false;
    }
    const width=Math.max(300,Math.min(1000,container.clientWidth||720));
    const height=270,top=26,left=46,right=20,bottom=50;
    const plotWidth=width-left-right,plotHeight=height-top-bottom;
    const topValue=Math.max(...points.flatMap(p=>[p.visits,p.pageViews]),1);
    const maximum=Math.max(4,Math.ceil(topValue/4)*4);
    const x=time=>left+((time-firstBucket)/(endBucket-firstBucket))*plotWidth;
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
      role:'img','aria-label':'Verified Cloudflare Web Analytics trend. '+points.length+' observed time buckets. '+(granularity==='hour'?zone+' hour labels.':'UTC calendar-day groups.')});
    const title=make('title',{},'Visits and page views over time — Cloudflare Web Analytics');
    const desc=make('desc',{},'Only actual Cloudflare time buckets are plotted. '+(granularity==='hour'?'Displayed hour labels use '+zone+'.':'Daily groups always use UTC calendar dates.')+' Missing periods are not filled in.');
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
    const toPath=pts=>pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' ');
    // Only connect adjacent observed hours or days; do not interpolate
    // over missing buckets, invent zeros, or spread a short trend across 30d.
    const contiguousRuns=key=>{
      const runs=[];let run=[],previous=null;
      for(const p of timed){
        if(previous!==null&&p.time-previous!==step){if(run.length)runs.push(run);run=[]}
        run.push([x(p.time),y(p[key])]);previous=p.time;
      }
      if(run.length)runs.push(run);
      return runs;
    };
    for(const run of contiguousRuns('visits')){
      if(run.length<2)continue;
      const baseline=y(0),first=run[0],last=run[run.length-1];
      svg.appendChild(make('path',{d:toPath(run)+' L'+last[0].toFixed(2)+' '+baseline.toFixed(2)+' L'+first[0].toFixed(2)+' '+baseline.toFixed(2)+' Z',fill:'url(#mmhvault-trend-fill)'}));
    }
    for(const [key,color] of [['pageViews','#73b3f5'],['visits','#d9b978']]){
      for(const run of contiguousRuns(key)){
        if(run.length>1)svg.appendChild(make('path',{d:toPath(run),fill:'none',stroke:color,'stroke-width':2.8,'stroke-linejoin':'round','stroke-linecap':'round'}));
      }
      for(const point of timed){
        const dot=make('circle',{cx:x(point.time),cy:y(point[key]),r:4.8,fill:color,stroke:'#142034','stroke-width':2});
        const periodLabel=granularity==='hour'?clockLabel(point.time)+' ('+zone+')':point.date+' UTC day';
        const detail=periodLabel+' | Visits: '+number.format(point.visits)+' | Page views: '+number.format(point.pageViews);
        dot.setAttribute('tabindex','0');
        dot.setAttribute('role','img');
        dot.setAttribute('aria-label',detail);
        dot.appendChild(make('title',{},detail));
        svg.appendChild(dot);
      }
    }
    // Regular UTC timeline ticks, including the beginning and end of the period.
    const count=width<420?3:width<690?4:6;
    for(let i=0;i<count;i++){
      const timestamp=firstBucket+Math.round(((endBucket-firstBucket)*i/(count-1))/step)*step;
      const date=new Date(timestamp).toISOString();
      const edge=i===0||i===count-1;
      const labelText=granularity==='day'?date.slice(5,10):
        edge?clockLabel(timestamp):clockLabel(timestamp).slice(6);
      svg.appendChild(make('text',{x:x(timestamp),y:height-25,
        'text-anchor':i===0?'start':i===count-1?'end':'middle',
        fill:'#aebdd1','font-size':12},labelText));
    }
    wrap.appendChild(svg);
    wrap.appendChild(html('p','chart-note',
      (granularity==='hour'?'Hourly observations · '+(zone==='UTC'?'UTC':'Bangkok (UTC+7)'):'Daily observations · UTC calendar days')+
      ' · Only verified Cloudflare data shown. Missing intervals are not estimated. Lines connect only consecutive observed periods.'));
    // Native disclosure works with keyboard, touch and screen readers, and lists
    // exactly the verified buckets returned by Cloudflare, without invented zeros.
    const details=html('details','chart-details');
    details.appendChild(html('summary','chart-details-summary','Inspect observed buckets ('+timed.length+')'));
    const scroll=html('div','chart-table-scroll'),table=html('table','chart-table');
    const thead=html('thead'),heading=html('tr');
    for(const text of [granularity==='hour'?'Hour ('+(zone==='UTC'?'UTC':'Bangkok UTC+7')+')':'UTC day','Visits','Page views']){
      const th=html('th','',text);th.setAttribute('scope','col');heading.appendChild(th);
    }
    thead.appendChild(heading);table.appendChild(thead);
    const tbody=html('tbody');
    for(const point of timed){
      const row=html('tr');
      const bucket=granularity==='hour'?clockLabel(point.time):point.date;
      for(const value of [bucket,number.format(point.visits),number.format(point.pageViews)])
        row.appendChild(html('td','',value));
      tbody.appendChild(row);
    }
    table.appendChild(tbody);scroll.appendChild(table);details.appendChild(scroll);wrap.appendChild(details);
    container.replaceChildren(wrap);
    return true;
  }
  root.MMHAnalyticsChart={parseBuckets,render,clear};
})(typeof window!=='undefined'?window:globalThis);
