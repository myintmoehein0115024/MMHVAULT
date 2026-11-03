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
