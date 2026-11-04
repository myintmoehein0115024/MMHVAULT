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
