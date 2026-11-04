import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';

const source=readFileSync(new URL('../ui/trend-chart.js',import.meta.url),'utf8');
const htmlPage=readFileSync(new URL('../../admin-analytics.html',import.meta.url),'utf8');
function element(tag){
  return {
    tagName:tag,
    attributes:{},
    children:[],
    textContent:'',
    className:'',
    clientWidth:360,
    setAttribute(k,v){this.attributes[k]=String(v)},
    append(...items){this.children.push(...items)},
    appendChild(item){this.children.push(item);return item},
    replaceChildren(...items){this.children=items}
  };
}
function initialize(){
  const window={};
  const document={createElement:element,createElementNS:(_,tag)=>element(tag)};
  runInNewContext(source,{window,document,Intl,Date,Object,Math,Number,Set,String,Array});
  return window.MMHAnalyticsChart;
}
function collect(el){
  return [el,...(el.children||[]).flatMap(collect)];
}
const day='2026-11-04';
const hour='2026-11-04T08:00:00Z';

test('normalizer accepts only validated 7d/30d daily groups or hourly 24h buckets',()=>{
  const chart=initialize();
  const daily=chart.parseBuckets([{date:day,visits:3,pageViews:5}],'day');
  assert.equal(daily.length,1);
  const hourly=chart.parseBuckets([{date:hour,visits:2,pageViews:4}],'hour');
  assert.equal(hourly.length,1);
  for(const [data,kind] of [
    [[{date:day,visits:2,pageViews:4}],'hour'],
    [[{date:hour,visits:2,pageViews:4}],'day'],
    [[{date:'<img src=x onerror=alert(1)>',visits:1,pageViews:1}],'day'],
    [[{date:day,visits:-1,pageViews:2}],'day'],
    [[{date:day,visits:1,pageViews:Infinity}],'day'],
    [[{date:day,visits:1,pageViews:1},{date:day,visits:2,pageViews:2}],'day'],
    [Array.from({length:26},(_,i)=>({date:'2026-11-04T'+String(i%24).padStart(2,'0')+':00:00Z',visits:i,pageViews:i})),'hour'],
    [undefined,'day']
  ])assert.equal(chart.parseBuckets(data,kind),null);
});

test('small mobile width renders an SVG with verified text and no unsafe HTML',()=>{
  const chart=initialize();
  const container=element('div');container.clientWidth=320;
  assert.equal(chart.render(container,[
    {date:'2026-11-03',visits:2,pageViews:4},
    {date:day,visits:5,pageViews:7}
  ],'day'),true);
  const nodes=collect(container);
  const svg=nodes.find(x=>x.tagName==='svg');
  assert.ok(svg,'SVG chart exists');
  assert.equal(svg.attributes.viewBox,'0 0 320 270');
  assert.equal(svg.attributes.role,'img');
  assert.equal(nodes.filter(x=>x.tagName==='circle').length,4);
  assert.ok(nodes.some(x=>x.tagName==='title'&&String(x.textContent).includes('Visits: 5')));
  assert.ok(nodes.some(x=>String(x.textContent).includes('Missing intervals are not estimated.')));
  assert.doesNotMatch(source,/\.innerHTML\s*=/);
});

test('single point and empty verified dataset render safely without synthetic zero points',()=>{
  const chart=initialize(),container=element('div');container.clientWidth=640;
  chart.render(container,[{date:hour,visits:1,pageViews:3}],'hour');
  assert.equal(collect(container).filter(x=>x.tagName==='circle').length,2);
  const result=chart.render(container,[],'hour');
  assert.equal(result,true);
  assert.equal(collect(container).filter(x=>x.tagName==='circle').length,0);
  assert.match(container.children[0].textContent,/No recorded/);
  assert.equal(chart.render(container,[{date:'not-a-date',visits:1,pageViews:1}],'day'),false);
  assert.match(container.children[0].textContent,/unavailable/);
});

test('the admin page links the local chart module and keeps unique visitors conditional',()=>{
  assert.match(htmlPage,/analytics-worker\/ui\/trend-chart\.js/);
  assert.match(htmlPage,/MMHAnalyticsChart\.render/);
  assert.match(htmlPage,/window\.addEventListener\('resize'/);
  assert.match(htmlPage,/Unavailable in verified RUM data/);
  assert.match(htmlPage,/Number\.isSafeInteger\(data\[key\]\)/);
  assert.match(htmlPage,/@media\(max-width:650px\)/);
});

test('administrator page inline browser initializer is valid JavaScript',()=>{
  const script=htmlPage.match(/<script>\s*([\s\S]*?)<\/script>/);
  assert.ok(script,'administrator inline initializer must be present');
  assert.doesNotThrow(()=>new Script(script[1]));
});

test('30d timeline uses the real full window: two recent observed dates do not span 30 days',()=>{
  const chart=initialize(),container=element('div');container.clientWidth=800;
  assert.equal(chart.render(container,[
    {date:'2026-11-03',visits:10,pageViews:10},
    {date:'2026-11-04',visits:10,pageViews:10}
  ],'day','30d','2026-11-04T09:26:03.000Z'),true);
  const nodes=collect(container);
  const dots=nodes.filter(x=>x.tagName==='circle');
  assert.equal(dots.length,4);
  assert.ok(dots.every(d=>Number(d.attributes.cx)>700),
    'only November 3 and 4 have points, so all dots belong at the right edge');
  const labels=nodes.filter(x=>x.tagName==='text').map(x=>x.textContent);
  assert.ok(labels.includes('10-05'),'full 30-day start appears on X axis');
  assert.ok(labels.includes('11-04'),'end of observed window appears on X axis');
  assert.equal(nodes.filter(x=>x.tagName==='path').length,3,
    'only one consecutive daily segment is filled and linked for each series');
});
test('24h missing hours stay blank: no invented zero and no line across the gap',()=>{
  const chart=initialize(),container=element('div');container.clientWidth=960;
  assert.equal(chart.render(container,[
    {date:'2026-11-03T17:00:00Z',visits:5,pageViews:5},
    {date:'2026-11-04T08:00:00Z',visits:5,pageViews:6}
  ],'hour','24h','2026-11-04T09:26:03.000Z'),true);
  const nodes=collect(container);
  assert.equal(nodes.filter(x=>x.tagName==='circle').length,4);
  assert.equal(nodes.filter(x=>x.tagName==='path').length,0,
    'no solid line or area filling unobserved hours');
  const dots=nodes.filter(x=>x.tagName==='circle');
  assert.ok(Number(dots[1].attributes.cx)-Number(dots[0].attributes.cx)>400);
  assert.ok(nodes.some(x=>String(x.textContent).includes('Lines connect only consecutive observed periods.')));
});
test('invalid or inconsistent snapshot period fails closed instead of positioning false data',()=>{
  const chart=initialize(),container=element('div');
  const sample=[{date:'2026-11-04',visits:2,pageViews:3}];
  assert.equal(chart.render(container,sample,'day','24h','2026-11-04T09:26:03.000Z'),false);
  assert.equal(chart.render(container,sample,'day','30d','not-a-time'),false);
  assert.equal(chart.render(container,[{date:'2026-09-01',visits:2,pageViews:3}],
    'day','30d','2026-11-04T09:26:03.000Z'),false);
});

test('single recent 24h observation stays near its real UTC hour, not centered',()=>{
  const chart=initialize(),container=element('div');container.clientWidth=360;
  assert.equal(chart.render(container,[{date:'2026-11-04T08:00:00Z',visits:2,pageViews:3}],
    'hour','24h','2026-11-04T09:26:03.000Z'),true);
  const nodes=collect(container),dots=nodes.filter(x=>x.tagName==='circle');
  assert.equal(dots.length,2);
  assert.ok(dots.every(dot=>Number(dot.attributes.cx)>300),
    'real observed hour must remain on the right end of the 24-hour time window');
  assert.equal(nodes.filter(x=>x.tagName==='path').length,0,
    'a single observed hour cannot be interpreted as a continuous trend');
});

test('V2.3 hourly Bangkok display shifts labels without changing verified values',()=>{
  const chart=initialize(),container=element('div');container.clientWidth=375;
  const bucket=[{date:'2026-11-04T18:00:00Z',visits:4,pageViews:6}];
  assert.equal(chart.render(container,bucket,'hour','24h','2026-11-04T18:30:00.000Z','Asia/Bangkok'),true);
  const nodes=collect(container),cells=nodes.filter(x=>x.tagName==='td').map(x=>x.textContent);
  assert.ok(cells.includes('11-05 01:00'),'UTC+7 wraps correctly onto the next date');
  assert.ok(cells.includes('4'));assert.ok(cells.includes('6'));
  const markers=nodes.filter(x=>x.tagName==='circle');
  assert.equal(markers.length,2);
  assert.equal(markers[0].attributes.tabindex,'0','markers are keyboard focusable');
  assert.match(markers[0].attributes['aria-label'],/Bangkok/);
  const note=nodes.find(x=>x.className==='chart-note');
  assert.match(note.textContent,/Bangkok \(UTC\+7\)/);
  const details=nodes.find(x=>x.tagName==='details');
  assert.ok(details,'native touch/keyboard accessible inspector');
});
test('V2.3 daily data must stay UTC-grouped even when an hourly zone was selected',()=>{
  const chart=initialize(),container=element('div');container.clientWidth=375;
  assert.equal(chart.render(container,[{date:'2026-11-04',visits:9,pageViews:10}],
    'day','7d','2026-11-04T18:30:00.000Z','Asia/Bangkok'),true);
  const nodes=collect(container),cells=nodes.filter(x=>x.tagName==='td').map(x=>x.textContent);
  assert.ok(cells.includes('2026-11-04'));
  assert.ok(!cells.includes('2026-11-05'),'never reassign UTC daily counts to local day');
  assert.match(nodes.find(x=>x.className==='chart-note').textContent,/UTC calendar days/);
});
test('V2.3 inspector lists exactly verified buckets, never fills missing zero rows',()=>{
  const chart=initialize(),container=element('div');container.clientWidth=800;
  assert.equal(chart.render(container,[
    {date:'2026-11-04T10:00:00Z',visits:1,pageViews:2},
    {date:'2026-11-04T12:00:00Z',visits:4,pageViews:4}
  ],'hour','24h','2026-11-04T12:30:00.000Z','UTC'),true);
  const nodes=collect(container);
  assert.equal(nodes.filter(x=>x.tagName==='tbody').flatMap(x=>x.children).length,2);
  assert.equal(nodes.filter(x=>x.tagName==='td').length,6);
  assert.equal(nodes.filter(x=>x.tagName==='circle').length,4);
  assert.equal(nodes.filter(x=>x.tagName==='path').length,0,'missing 11:00 stays unconnected');
  assert.equal(chart.render(container,[], 'hour','24h','2026-11-04T12:30:00.000Z','UTC'),true);
  assert.equal(collect(container).filter(x=>x.tagName==='td').length,0,'empty data is not filled');
  assert.equal(chart.render(container,[
    {date:'2026-11-04T12:00:00Z',visits:1,pageViews:1}
  ],'hour','24h','2026-11-04T12:30:00.000Z','untrusted-zone'),false);
});
test('V2.3 page exposes accessible hourly timezone selector while preserving UTC day semantics',()=>{
  assert.match(htmlPage,/id="timeZone"/);
  assert.match(htmlPage,/Bangkok \(UTC\+7\)/);
  assert.match(htmlPage,/timeZone'\)\.disabled=selectedRange!=='24h'/);
  assert.match(htmlPage,/latestChart\.timeZone/);
});
