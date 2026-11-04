import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';
const src=readFileSync(new URL('../ui/breakdowns.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../../admin-analytics.html',import.meta.url),'utf8');
function element(tag){
  return {
    tagName:tag,children:[],attributes:{},textContent:'',className:'',style:{},
    setAttribute(k,v){this.attributes[k]=String(v)},
    appendChild(c){this.children.push(c);return c},
    replaceChildren(...items){this.children=items}
  };
}
function initialize(){
  const window={};
  const document={createElement:element};
  runInNewContext(src,{window,document,Intl,Number,String,Array,Object,Math});
  return window.MMHAnalyticsBreakdowns;
}
function collect(e){return [e,...(e.children||[]).flatMap(collect)]}
function fixture(){
  const categories=Object.fromEntries(
    ['countries','pages','referrers','browsers','devices'].map(s=>[s,{
      rows:[{label:s==='countries'?'TH':'example',pageViews:5,visits:4}],
      moreMayExist:false
    }])
  );
  return {source:'cloudflare-web-analytics',verified:true,range:'7d',
    groupMetric:'pageViews',uniqueVisitors:null,categories};
}
test('renders 5 responsive Cloudflare groups using only safe DOM text nodes',()=>{
  const chart=initialize(),container=element('div'),data=fixture();
  assert.equal(chart.render(container,data,'7d'),true);
  const nodes=collect(container),cards=nodes.filter(n=>n.className==='panel breakdown-card');
  assert.equal(cards.length,5);
  assert.ok(nodes.some(n=>String(n.textContent).includes('Thailand (TH)')));
  assert.ok(nodes.some(n=>String(n.textContent).includes('5 page views · 4 visits')));
  assert.ok(nodes.some(n=>n.className==='breakdown-rail-fill'&&n.style.width==='100.00%'));
  assert.doesNotMatch(src,/\.innerHTML\s*=/);
  assert.match(page,/id="breakdowns"/);
  assert.match(page,/analytics-worker\/ui\/breakdowns\.js/);
  assert.match(page,/@media\(max-width:650px\).*?breakdown-grid/s);
});
test('refuses wrong period, unverified values and malformed numbers',()=>{
  const chart=initialize(),container=element('div');
  assert.equal(chart.render(container,fixture(),'24h'),false);
  const data=fixture();data.verified=false;
  assert.equal(chart.render(container,data,'7d'),false);
  const bad=fixture();bad.categories.devices.rows[0].pageViews=NaN;
  assert.equal(chart.render(container,bad,'7d'),false);
  const tooMany=fixture();tooMany.categories.pages.rows=Array(11).fill({label:'/',pageViews:1,visits:1});
  assert.equal(chart.render(container,tooMany,'7d'),false);
});
test('display labels never execute markup; text stays literal',()=>{
  const chart=initialize(),container=element('div'),data=fixture();
  data.categories.pages.rows[0].label='<img src=x onerror=alert(1)>';
  assert.equal(chart.render(container,data,'7d'),true);
  assert.ok(collect(container).some(n=>n.textContent==='<img src=x onerror=alert(1)>'));
  assert.equal(collect(container).filter(n=>n.tagName==='img').length,0);
});
test('empty source is explained as no verified groups, not zero unique visitors',()=>{
  const chart=initialize(),container=element('div'),data=fixture();
  for(const type of Object.keys(data.categories))data.categories[type].rows=[];
  assert.equal(chart.render(container,data,'7d'),true);
  assert.equal(collect(container).filter(n=>String(n.textContent).includes('No verified activity')).length,5);
  assert.ok(!collect(container).some(n=>String(n.textContent).includes('Unique visitors: 0')));
});
test('the page inline initialization remains valid and leaves primary chart independent',()=>{
  const inline=page.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inline);
  assert.doesNotThrow(()=>new Script(inline));
  assert.match(page,/await loadBreakdowns\(token,selectedRange,serial\)/);
  assert.doesNotMatch(page,/id="loadBreakdowns"/);
  assert.match(page,/selectedRange==='30d'/);
  assert.match(page,/Breakdowns unavailable\. Existing totals remain valid\./);
});
