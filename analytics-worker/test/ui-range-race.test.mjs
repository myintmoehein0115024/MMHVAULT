import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Each response is intentionally controlled so an older request can finish last.
const html=readFileSync(new URL('../../admin-analytics.html',import.meta.url),'utf8');
const inline=html.split('<script>')[1]?.split('</script>')[0];
if(!inline)throw Error('Admin Analytics initializer not found');

function harness() {
  const handlers={},requests=[],renders=[],elements={};
  for(const id of ['range','timeZone','refresh','status','visits','pageViews','uniqueVisitors','trend','updated']){
    elements[id]={value:id==='range'?'7d':id==='timeZone'?'UTC':'',textContent:'',disabled:false,
      addEventListener(event,handler){handlers[id+':'+event]=handler}};
  }
  const chart={
    clear(){},
    render(_el,trend,granularity,range,updatedAt,timeZone){renders.push({trend,granularity,range,updatedAt,timeZone});return true}
  };
  const client={
    auth:{async getSession(){return {data:{session:{access_token:'synthetic.test.jwt'}}}}},
    async rpc(){return {data:true,error:null}}
  };
  const window={
    supabase:{createClient(){return client}},
    MMHAnalyticsChart:chart,
    addEventListener(name,handler){handlers['window:'+name]=handler}
  };
  const fetch=(url,options)=>new Promise(resolve=>requests.push({url,options,resolve}));
  runInNewContext(inline,
    {window,document:{getElementById:id=>elements[id]},Intl,AbortController,
      fetch,setTimeout,clearTimeout,encodeURIComponent,requestAnimationFrame:cb=>cb()});
  return {elements,handlers,requests,renders};
}
const settled=async()=>{for(let i=0;i<16;i++)await Promise.resolve()};
function answer(range,visits){
  const date=range==='24h'?'2026-11-04T09:00:00Z':'2026-11-04';
  return {status:200,ok:true,async json(){return {
    source:'cloudflare-web-analytics',verified:true,visits,pageViews:visits+1,
    uniqueVisitors:null,granularity:range==='24h'?'hour':'day',
    trend:[{date,visits,pageViews:visits+1}],updatedAt:'2026-11-04T09:00:00Z'
  }}};
}
test('rapid range switches never let a stale response overwrite the latest range',async()=>{
  const h=harness();await settled();
  assert.equal(h.requests.length,1);
  assert.match(h.requests[0].url,/range=7d/);
  h.elements.range.value='24h';
  h.handlers['range:change']();
  await settled();
  assert.equal(h.requests.length,2);
  assert.match(h.requests[1].url,/range=24h/);
  assert.equal(h.requests[0].options.signal.aborted,true);
  h.requests[1].resolve(answer('24h',11));
  await settled();
  assert.equal(h.elements.visits.textContent,'11');
  assert.equal(h.renders.at(-1).granularity,'hour');
  assert.equal(h.elements.status.textContent,'Connected');
  h.requests[0].resolve(answer('7d',9000));
  await settled();
  assert.equal(h.elements.visits.textContent,'11');
  assert.equal(h.renders.length,1);
  assert.equal(h.elements.refresh.disabled,false);
  assert.equal(h.elements.uniqueVisitors.textContent,'—');
});
test('refresh after a range change keeps the most recent response only',async()=>{
  const h=harness();await settled();
  h.elements.range.value='30d';h.handlers['range:change']();await settled();
  h.handlers['refresh:click']();await settled();
  assert.equal(h.requests.length,3);
  assert.ok(h.requests[1].options.signal.aborted);
  h.requests[2].resolve(answer('30d',7));await settled();
  h.requests[1].resolve(answer('30d',500));h.requests[0].resolve(answer('7d',900));
  await settled();
  assert.equal(h.elements.visits.textContent,'7');
  assert.equal(h.renders.length,1);
});

test('display-only Bangkok time switch does not fetch or modify verified totals',async()=>{
  const h=harness();await settled();
  assert.equal(h.elements.timeZone.disabled,true,'daily view should keep UTC days');
  h.elements.range.value='24h';h.handlers['range:change']();await settled();
  assert.equal(h.elements.timeZone.disabled,false);
  h.requests[1].resolve(answer('24h',7));await settled();
  const previousRequestCount=h.requests.length;
  assert.equal(h.renders.at(-1).timeZone,'UTC');
  h.elements.timeZone.value='Asia/Bangkok';
  h.handlers['timeZone:change']();
  assert.equal(h.requests.length,previousRequestCount,'time labels do not trigger new analytics queries');
  assert.equal(h.renders.at(-1).timeZone,'Asia/Bangkok');
  assert.equal(h.elements.visits.textContent,'7');
  assert.equal(h.elements.pageViews.textContent,'8');
  assert.equal(h.elements.uniqueVisitors.textContent,'—');
  h.elements.range.value='30d';h.handlers['range:change']();await settled();
  assert.equal(h.elements.timeZone.disabled,true,'daily range is always UTC calendar days');
  h.requests[2].resolve(answer('30d',10));await settled();
  assert.equal(h.renders.at(-1).timeZone,'UTC');
  assert.equal(h.elements.visits.textContent,'10');
});
