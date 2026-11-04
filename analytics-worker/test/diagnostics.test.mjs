import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const endpoint='https://analytics.example.test/api/admin/website-analytics?range=7d';
const env={
  ALLOWED_ORIGIN:'https://mmhvault.com',
  CF_ANALYTICS_TOKEN:'fixture-not-a-real-token',
  SUPABASE_ANON_KEY:'fixture-not-a-real-key',
  CF_ACCOUNT_ID:'fixture-account',
  CF_SITE_TAG:'fixture-site',
  SUPABASE_URL:'https://supabase.example.test'
};

async function simulateCloudflare(reply) {
  const previousFetch=globalThis.fetch;
  const previousError=console.error;
  const logs=[];
  let cloudflareCalls=0;
  try {
    console.error=(...args)=>logs.push(args);
    globalThis.fetch=async (url)=>{
      const host=String(url);
      if (host.includes('/auth/v1/user')) return new Response(JSON.stringify({id:'synthetic-admin'}),{status:200});
      if (host.includes('/rest/v1/rpc/mmh_is_admin')) return new Response('true',{status:200});
      cloudflareCalls++;
      if (reply instanceof Error) throw reply;
      return new Response(JSON.stringify(reply.body||{}),{status:reply.status||200});
    };
    const res=await worker.fetch(new Request(endpoint,{headers:{
      Authorization:'Bearer fake.jwt.value',
      Origin:'https://mmhvault.com'
    }}),env);
    return {status:res.status,body:await res.json(),logs,cloudflareCalls};
  } finally {
    globalThis.fetch=previousFetch;
    console.error=previousError;
  }
}

test('GraphQL errors get a category code but never leak upstream error details',async()=>{
  const r=await simulateCloudflare({body:{errors:[{message:'secret-sentinel-sensitive-upstream-error'}]}});
  assert.equal(r.status,503);
  assert.deepEqual(r.body,{error:'analytics_unavailable'});
  assert.equal(r.cloudflareCalls,1);
  assert.deepEqual(r.logs,[['MMH_ANALYTICS_V2_FAILURE',{code:'CF_GRAPHQL_ERROR'}]]);
  assert.doesNotMatch(JSON.stringify(r.logs),/secret-sentinel/);
});

test('Cloudflare non-2xx response uses only allowlisted HTTP error category',async()=>{
  const r=await simulateCloudflare({status:403,body:{message:'token-sentinel'}});
  assert.equal(r.status,503);
  assert.deepEqual(r.logs,[['MMH_ANALYTICS_V2_FAILURE',{code:'CF_HTTP_ERROR'}]]);
  assert.doesNotMatch(JSON.stringify(r.logs),/token-sentinel/);
});

test('unexpected exception is sanitized in logs and client response',async()=>{
  const r=await simulateCloudflare(new Error('dangerous-error-sentinel-jwt-value'));
  assert.equal(r.status,503);
  assert.deepEqual(r.body,{error:'analytics_unavailable'});
  assert.deepEqual(r.logs,[['MMH_ANALYTICS_V2_FAILURE',{code:'ANALYTICS_UNEXPECTED_ERROR'}]]);
  assert.doesNotMatch(JSON.stringify(r),/dangerous-error-sentinel/);
});

test('invalid RUM metrics fail closed and log no individual visitor details',async()=>{
  const r=await simulateCloudflare({body:{data:{viewer:{accounts:[{
    rumPageloadEventsAdaptiveGroups:[{count:-1,dimensions:{date:'2026-11-04'},sum:{visits:0}}]
  }]}}}});
  assert.equal(r.status,503);
  assert.deepEqual(r.logs,[['MMH_ANALYTICS_V2_FAILURE',{code:'CF_METRICS_INVALID'}]]);
});

test('unexpected account count is classified without exposing account identifiers',async()=>{
  const r=await simulateCloudflare({body:{data:{viewer:{accounts:[]}}}});
  assert.equal(r.status,503);
  assert.deepEqual(r.logs,[['MMH_ANALYTICS_V2_FAILURE',{code:'CF_ACCOUNT_MISMATCH'}]]);
});
