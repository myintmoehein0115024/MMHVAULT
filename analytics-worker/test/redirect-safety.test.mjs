import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const endpoint='https://analytics.example.test/api/admin/website-analytics?range=7d';
const env={
  ALLOWED_ORIGIN:'https://mmhvault.com',
  SUPABASE_URL:'https://supabase.example.test',
  SUPABASE_ANON_KEY:'fixture-public-key',
  CF_ACCOUNT_ID:'fixture-account',
  CF_SITE_TAG:'fixture-site',
  CF_ANALYTICS_TOKEN:'fixture-token'
};
const request=()=>new Request(endpoint,{headers:{
  Authorization:'Bearer fixture.jwt.token',
  Origin:'https://mmhvault.com'
}});

test('all three outbound requests use Workers-compatible manual redirect handling',async()=>{
  const original=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async (url,init)=>{
    calls.push({url:String(url),init});
    assert.equal(init.redirect,'manual','Cloudflare Workers does not implement redirect:error');
    if(String(url).includes('/auth/v1/user'))
      return Response.json({id:'synthetic-user'});
    if(String(url).includes('/rest/v1/rpc/mmh_is_admin'))
      return Response.json(true);
    return Response.json({data:{viewer:{accounts:[{
      rumPageloadEventsAdaptiveGroups:[{
        count:2,dimensions:{date:new Date().toISOString().slice(0,10)},
        sum:{visits:1}
      }]
    }]}}});
  };
  try{
    const r=await worker.fetch(request(),env);
    assert.equal(r.status,200);
    assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[
      '/auth/v1/user','/rest/v1/rpc/mmh_is_admin','/client/v4/graphql'
    ]);
    const data=await r.json();
    assert.equal(data.pageViews,2);
    assert.equal(data.visits,1);
    assert.equal(data.uniqueVisitors,null);
  }finally{globalThis.fetch=original;}
});

test('Supabase identity 302 fails closed, without following redirect or querying more endpoints',async()=>{
  const original=globalThis.fetch;
  const seen=[];
  globalThis.fetch=async(url,init)=>{
    seen.push(String(url));
    assert.equal(init.redirect,'manual');
    return new Response(null,{status:302,headers:{Location:'https://untrusted.example.test/steal'}});
  };
  try{
    const r=await worker.fetch(request(),env);
    assert.equal(r.status,401);
    assert.equal((await r.json()).error,'authentication_required');
    assert.deepEqual(seen,['https://supabase.example.test/auth/v1/user']);
  }finally{globalThis.fetch=original;}
});

test('Supabase admin RPC 302 fails closed before Cloudflare query',async()=>{
  const original=globalThis.fetch;
  const seen=[];
  globalThis.fetch=async(url,init)=>{
    seen.push(String(url));
    assert.equal(init.redirect,'manual');
    if(String(url).includes('/auth/v1/user'))return Response.json({id:'synthetic-user'});
    return new Response(null,{status:302,headers:{Location:'https://untrusted.example.test/steal'}});
  };
  try{
    const r=await worker.fetch(request(),env);
    assert.equal(r.status,403);
    assert.equal((await r.json()).error,'forbidden');
    assert.equal(seen.length,2);
    assert.ok(seen[1].includes('/rest/v1/rpc/mmh_is_admin'));
  }finally{globalThis.fetch=original;}
});

test('Cloudflare GraphQL 302 returns sanitized 503, never follows token-bearing redirect',async()=>{
  const original=globalThis.fetch,originalError=console.error;
  const seen=[],logs=[];
  console.error=(...args)=>logs.push(args);
  globalThis.fetch=async(url,init)=>{
    seen.push(String(url));
    assert.equal(init.redirect,'manual');
    if(String(url).includes('/auth/v1/user'))return Response.json({id:'synthetic-user'});
    if(String(url).includes('/rest/v1/rpc/mmh_is_admin'))return Response.json(true);
    return new Response(null,{status:302,headers:{Location:'https://untrusted.example.test/token-steal'}});
  };
  try{
    const r=await worker.fetch(request(),env);
    assert.equal(r.status,503);
    assert.deepEqual(await r.json(),{error:'analytics_unavailable'});
    assert.equal(seen.length,3);
    assert.deepEqual(logs,[['MMH_ANALYTICS_V2_FAILURE',{code:'CF_HTTP_ERROR',phase:'CF_RESPONSE_STATUS'}]]);
    assert.doesNotMatch(JSON.stringify(logs),/token-steal|fixture-token/);
  }finally{
    globalThis.fetch=original;
    console.error=originalError;
  }
});
