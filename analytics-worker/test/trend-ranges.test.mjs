import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const base='https://analytics.example.test/api/admin/website-analytics?range=';
const env={
  ALLOWED_ORIGIN:'https://mmhvault.com',
  SUPABASE_URL:'https://supabase.example.test',
  SUPABASE_ANON_KEY:'synthetic-publishable-key',
  CF_ANALYTICS_TOKEN:'synthetic-analytics-token',
  CF_ACCOUNT_ID:'synthetic-account',
  CF_SITE_TAG:'synthetic-site'
};
const request=(range)=>new Request(base+range,{headers:{
  Origin:'https://mmhvault.com',Authorization:'Bearer synthetic.jwt.token'
}});
async function run(range,groups,options={}){
  const origFetch=globalThis.fetch,origError=console.error;
  const seen=[],errors=[];
  try{
    console.error=(...args)=>errors.push(args);
    globalThis.fetch=async(url,init)=>{
      if(String(url).includes('/auth/v1/user'))return Response.json({id:'synthetic-admin'});
      if(String(url).includes('/rest/v1/rpc/mmh_is_admin'))return Response.json(true);
      seen.push(JSON.parse(init.body));
      return Response.json(options.graphQLError?{errors:[{message:'Denied upstream'}]}:
        {data:{viewer:{accounts:[{rumPageloadEventsAdaptiveGroups:groups}]}}});
    };
    const response=await worker.fetch(request(range),env);
    return {status:response.status,data:await response.json(),seen,errors};
  }finally{
    globalThis.fetch=origFetch;console.error=origError;
  }
}
const today=()=>new Date().toISOString().slice(0,10);
const currentHour=()=>new Date().toISOString().slice(0,13)+':00:00Z';

test('rolling 24h uses verified hourly buckets, preserves page views, and never fabricates visitors',async()=>{
  const hour=currentHour();
  const result=await run('24h',[{count:9,dimensions:{datetimeHour:hour},sum:{visits:4}}]);
  assert.equal(result.status,200);
  assert.equal(result.data.granularity,'hour');
  assert.deepEqual(result.data.trend,[{date:hour,visits:4,pageViews:9}]);
  assert.equal(result.data.visits,4);
  assert.equal(result.data.pageViews,9);
  assert.equal(result.data.uniqueVisitors,null);
  assert.match(result.seen[0].query,/orderBy: \[datetimeHour_ASC\]/);
  assert.match(result.seen[0].query,/dimensions \{ datetimeHour \}/);
  assert.match(result.seen[0].query,/bot: 0/);
  assert.match(result.seen[0].query,/requestHost: "mmhvault\.com"/);
});

test('7d daily buckets are reported without fabricated missing-day zeros',async()=>{
  const day=today();
  const result=await run('7d',[{count:5,dimensions:{date:day},sum:{visits:2}}]);
  assert.equal(result.status,200);
  assert.equal(result.data.granularity,'day');
  assert.deepEqual(result.data.trend,[{date:day,visits:2,pageViews:5}]);
  assert.equal(result.data.trend.length,1);
  assert.match(result.seen[0].query,/orderBy: \[date_ASC\]/);
});

test('30d supports daily data and keeps the current protected worker contract',async()=>{
  const result=await run('30d',[{count:3,dimensions:{date:today()},sum:{visits:1}}]);
  assert.equal(result.status,200);
  assert.equal(result.data.granularity,'day');
  assert.equal(result.data.source,'cloudflare-web-analytics');
  assert.equal(result.data.verified,true);
});

test('malformed, duplicate or out-of-range hourly data fails closed',async()=>{
  const hour=currentHour();
  for(const groups of [
    [{count:1,dimensions:{date:today()},sum:{visits:1}}],
    [{count:1,dimensions:{datetimeHour:'2020-01-01T00:00:00Z'},sum:{visits:1}}],
    [{count:1,dimensions:{datetimeHour:'2026-11-04T99:00:00Z'},sum:{visits:1}}],
    [{count:1,dimensions:{datetimeHour:hour},sum:{visits:1}},{count:2,dimensions:{datetimeHour:hour},sum:{visits:1}}],
    [{count:-1,dimensions:{datetimeHour:hour},sum:{visits:1}}],
    Array.from({length:26},()=>({count:1,dimensions:{datetimeHour:hour},sum:{visits:1}}))
  ]){
    const result=await run('24h',groups);
    assert.equal(result.status,503);
    assert.deepEqual(result.data,{error:'analytics_unavailable'});
  }
});

test('GraphQL errors remain 503 and are not converted into zero values',async()=>{
  const result=await run('24h',[],{graphQLError:true});
  assert.equal(result.status,503);
  assert.deepEqual(result.data,{error:'analytics_unavailable'});
});

test('empty verified RUM groups are empty observations, not a distinct visitor estimate',async()=>{
  const result=await run('24h',[]);
  assert.equal(result.status,200);
  assert.deepEqual(result.data.trend,[]);
  assert.equal(result.data.uniqueVisitors,null);
});
