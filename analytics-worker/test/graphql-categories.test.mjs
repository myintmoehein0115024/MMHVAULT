import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const endpoint='https://analytics.example.test/api/admin/website-analytics?range=7d';
const env={
  ALLOWED_ORIGIN:'https://mmhvault.com',
  SUPABASE_URL:'https://supabase.example.test',
  SUPABASE_ANON_KEY:'synthetic-anon-key',
  CF_ANALYTICS_TOKEN:'synthetic-analytics-token',
  CF_ACCOUNT_ID:'synthetic-account',
  CF_SITE_TAG:'synthetic-site'
};
const req=()=>new Request(endpoint,{headers:{
  Origin:'https://mmhvault.com',Authorization:'Bearer fake.jwt.value'
}});

async function runWithGraphQLError(message,extensionCode){
  const previousFetch=globalThis.fetch, previousError=console.error;
  const logs=[];let gqlCalls=0;
  try{
    console.error=(...args)=>logs.push(args);
    globalThis.fetch=async(url,init)=>{
      const u=String(url);
      if(u.includes('/auth/v1/user'))return Response.json({id:'synthetic-id'});
      if(u.includes('/rest/v1/rpc/mmh_is_admin'))return Response.json(true);
      gqlCalls++;
      const json={errors:[{message,extensions:extensionCode?{code:extensionCode}:undefined}]};
      return Response.json(json);
    };
    const response=await worker.fetch(req(),env);
    return {response,logs,gqlCalls};
  }finally{globalThis.fetch=previousFetch;console.error=previousError;}
}

for(const [label,error,code] of [
  ['authentication','Authentication error: invalid token with PRIVATE_TOKEN_SENTINEL','CF_GRAPHQL_AUTH_ERROR'],
  ['authorization','You are not authorized to view these records, PRIVATE_ID_SENTINEL','CF_GRAPHQL_ACCESS_DENIED'],
  ['schema','Cannot query field "nonexistent" on type PRIVATE_SCHEMA_SENTINEL','CF_GRAPHQL_SCHEMA_ERROR'],
  ['rate limiting','rate limit exceeded, PRIVATE_RATE_SENTINEL','CF_GRAPHQL_LIMIT_ERROR'],
  ['unclassified','upstream unexpected PRIVATE_BODY_SENTINEL','CF_GRAPHQL_UNCLASSIFIED']
]){
  test('GraphQL '+label+' is categorized without leaking upstream messages',async()=>{
    const {response,logs,gqlCalls}=await runWithGraphQLError(error);
    assert.equal(response.status,503);
    assert.deepEqual(await response.json(),{error:'analytics_unavailable'});
    assert.equal(gqlCalls,1);
    assert.deepEqual(logs,[['MMH_ANALYTICS_V2_FAILURE',{code,phase:'CF_VALIDATION'}]]);
    assert.doesNotMatch(JSON.stringify(logs),/PRIVATE_|synthetic-analytics-token|fake.jwt/);
  });
}

test('validated Web Analytics query pins hostname and excludes bots',async()=>{
  const previousFetch=globalThis.fetch;
  let query=null,vars=null;
  globalThis.fetch=async(url,init)=>{
    const u=String(url);
    if(u.includes('/auth/v1/user'))return Response.json({id:'synthetic-id'});
    if(u.includes('/rest/v1/rpc/mmh_is_admin'))return Response.json(true);
    const body=JSON.parse(init.body);
    query=body.query;vars=body.variables;
    return Response.json({data:{viewer:{accounts:[{
      rumPageloadEventsAdaptiveGroups:[{count:3,dimensions:{date:new Date().toISOString().slice(0,10)},sum:{visits:1}}]
    }]}}});
  };
  try{
    const response=await worker.fetch(req(),env);
    assert.equal(response.status,200);
    assert.match(query,/requestHost:\s*"mmhvault\.com"/);
    assert.match(query,/bot:\s*0/);
    assert.match(query,/siteTag:\s*\$siteTag/);
    assert.equal(vars.siteTag,'synthetic-site');
    const result=await response.json();
    assert.equal(result.pageViews,3);
    assert.equal(result.visits,1);
    assert.equal(result.uniqueVisitors,null);
  }finally{globalThis.fetch=previousFetch;}
});
