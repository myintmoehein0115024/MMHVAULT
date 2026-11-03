import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const base='https://analytics.example.test/api/admin/website-analytics';
const env={ALLOWED_ORIGIN:'https://mmhvault.com'};
async function call(path=base,init={},bindings=env){
  return worker.fetch(new Request(path,init),bindings);
}
test('unconfigured service fails closed',async()=>{
  const r=await call();assert.equal(r.status,503);
  assert.equal((await r.json()).error,'analytics_not_configured');
});
test('disallowed origin is denied',async()=>{
  const r=await call(base,{headers:{Origin:'https://evil.example'}});
  assert.equal(r.status,403);
  assert.equal(r.headers.get('access-control-allow-origin'),null);
});
test('invalid time range rejected',async()=>{
  const r=await call(base+'?range=all');
  assert.equal(r.status,400);
});
test('unknown path denied',async()=>{
  const r=await call('https://analytics.example.test/other');
  assert.equal(r.status,404);
});
test('missing bearer token rejected after configuration',async()=>{
  const configured={...env,CF_ANALYTICS_TOKEN:'test',SUPABASE_ANON_KEY:'test',CF_ACCOUNT_ID:'test',CF_SITE_TAG:'test',SUPABASE_URL:'https://supabase.example.test'};
  const r=await call(base,{},configured);
  assert.equal(r.status,401);
});
test('only configured origin receives CORS',async()=>{
  const r=await call(base,{headers:{Origin:'https://mmhvault.com'}});
  assert.equal(r.headers.get('access-control-allow-origin'),'https://mmhvault.com');
});

test('non-admin is rejected before querying Cloudflare',async()=>{
  const configured={...env,CF_ANALYTICS_TOKEN:'test',SUPABASE_ANON_KEY:'test',CF_ACCOUNT_ID:'test',CF_SITE_TAG:'test',SUPABASE_URL:'https://supabase.example.test'};
  const previous=globalThis.fetch;let calls=0;
  globalThis.fetch=async(url)=>{calls++;return String(url).includes('/auth/v1/user')?new Response(JSON.stringify({id:'test-user'}),{status:200}):new Response('false',{status:200})};
  try{
    const r=await call(base,{headers:{Authorization:'Bearer mock.jwt.token'}},configured);
    assert.equal(r.status,403);
    assert.equal(calls,2);
  }finally{globalThis.fetch=previous}
});
test('verified admin gets no fabricated data when GraphQL fails',async()=>{
  const configured={...env,CF_ANALYTICS_TOKEN:'test',SUPABASE_ANON_KEY:'test',CF_ACCOUNT_ID:'test',CF_SITE_TAG:'test',SUPABASE_URL:'https://supabase.example.test'};
  const previous=globalThis.fetch;let calls=0;
  globalThis.fetch=async(url)=>{
    calls++;
    if(String(url).includes('/auth/v1/user'))return new Response(JSON.stringify({id:'test-user'}),{status:200});
    if(String(url).includes('supabase.example.test'))return new Response('true',{status:200});
    return new Response(JSON.stringify({errors:[{message:'Not authorized'}]}),{status:200,headers:{'content-type':'application/json'}});
  };
  try{
    const r=await call(base,{headers:{Authorization:'Bearer mock.jwt.token'}},configured);
    assert.equal(r.status,503);
    assert.equal((await r.json()).error,'analytics_unavailable');
    assert.equal(calls,3);
  }finally{globalThis.fetch=previous}
});
test('verified admin receives validated aggregated RUM metrics',async()=>{
  const configured={...env,CF_ANALYTICS_TOKEN:'test',SUPABASE_ANON_KEY:'test',CF_ACCOUNT_ID:'test',CF_SITE_TAG:'test',SUPABASE_URL:'https://supabase.example.test'};
  const previous=globalThis.fetch;
  globalThis.fetch=async(url)=>{
    if(String(url).includes('/auth/v1/user'))return new Response(JSON.stringify({id:'test-user'}),{status:200});
    if(String(url).includes('supabase.example.test'))return new Response('true',{status:200});
    return new Response(JSON.stringify({data:{viewer:{accounts:[{rumPageloadEventsAdaptiveGroups:[{count:5,dimensions:{date:new Date().toISOString().slice(0,10)},sum:{visits:3}}]}]}}}),{status:200});
  };
  try{
    const r=await call(base,{headers:{Authorization:'Bearer mock.jwt.token'}},configured);
    assert.equal(r.status,200);
    const data=await r.json();
    assert.equal(data.pageViews,5);assert.equal(data.visits,3);
    assert.equal(data.uniqueVisitors,null);assert.equal(data.verified,true);
  }finally{globalThis.fetch=previous}
});

test('invalid Supabase identity cannot reach admin RPC or Cloudflare',async()=>{
  const configured={...env,CF_ANALYTICS_TOKEN:'test',SUPABASE_ANON_KEY:'test',CF_ACCOUNT_ID:'test',CF_SITE_TAG:'test',SUPABASE_URL:'https://supabase.example.test'};
  const previous=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;return new Response('unauthorized',{status:401})};
  try{
    const r=await call(base,{headers:{Authorization:'Bearer mock.jwt.token'}},configured);
    assert.equal(r.status,401);assert.equal(calls,1);
  }finally{globalThis.fetch=previous}
});

test('malformed Cloudflare metrics are never displayed',async()=>{
  const configured={...env,CF_ANALYTICS_TOKEN:'test',SUPABASE_ANON_KEY:'test',CF_ACCOUNT_ID:'test',CF_SITE_TAG:'test',SUPABASE_URL:'https://supabase.example.test'};
  const previous=globalThis.fetch;
  globalThis.fetch=async(url)=>{
    if(String(url).includes('/auth/v1/user'))return new Response(JSON.stringify({id:'test-user'}),{status:200});
    if(String(url).includes('supabase.example.test'))return new Response('true',{status:200});
    return new Response(JSON.stringify({data:{viewer:{accounts:[{rumPageloadEventsAdaptiveGroups:[{count:-2,dimensions:{date:'invalid'},sum:{visits:999}}]}]}}}),{status:200});
  };
  try{
    const r=await call(base,{headers:{Authorization:'Bearer mock.jwt.token'}},configured);
    assert.equal(r.status,503);
    assert.equal((await r.json()).error,'analytics_unavailable');
  }finally{globalThis.fetch=previous}
});
