import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const base='https://analytics.example.test/api/admin/website-analytics-breakdowns';
const env={
  ALLOWED_ORIGIN:'https://mmhvault.com',
  CF_ANALYTICS_TOKEN:'synthetic-only-token',
  SUPABASE_ANON_KEY:'synthetic-anon-key',
  CF_ACCOUNT_ID:'synthetic-account',
  CF_SITE_TAG:'synthetic-site',
  SUPABASE_URL:'https://supabase.example.test'
};
const good={
  countries:[{count:15,dimensions:{countryName:'TH'},sum:{visits:14}},
    {count:2,dimensions:{countryName:'CN'},sum:{visits:2}}],
  pages:[{count:14,dimensions:{requestPath:'/'},sum:{visits:14}},
    {count:3,dimensions:{requestPath:'/index.html'},sum:{visits:2}},
    {count:1,dimensions:{requestPath:'/invite/super-secret-token'},sum:{visits:1}}],
  referrers:[{count:12,dimensions:{refererHost:''},sum:{visits:12}},
    {count:3,dimensions:{refererHost:'www.google.com'},sum:{visits:3}}],
  browsers:[{count:9,dimensions:{userAgentBrowser:'Chrome'},sum:{visits:8}},
    {count:6,dimensions:{userAgentBrowser:'Safari'},sum:{visits:6}}],
  devices:[{count:12,dimensions:{deviceType:'desktop'},sum:{visits:11}},
    {count:5,dimensions:{deviceType:'mobile'},sum:{visits:5}}]
};
function clone(value){return JSON.parse(JSON.stringify(value))}
async function harness({groups=good,admin=true,identity=true,graphqlError=false}={}){
  const previous=globalThis.fetch,calls=[];
  globalThis.fetch=async(url,init)=>{
    calls.push({url:String(url),init});
    if(String(url).includes('/auth/v1/user'))return identity?
      new Response(JSON.stringify({id:'synthetic-admin'}),{status:200}):
      new Response('unauthorized',{status:401});
    if(String(url).includes('/rest/v1/rpc/mmh_is_admin'))
      return new Response(JSON.stringify(admin),{status:200});
    if(String(url).includes('api.cloudflare.com/client/v4/graphql'))
      return new Response(JSON.stringify(graphqlError?
        {errors:[{message:'Not authorized synthetic GraphQL'}]}:
        {data:{viewer:{accounts:[clone(groups)]}}}),{status:200});
    throw Error('Unexpected network request');
  };
  return {calls,restore(){globalThis.fetch=previous}};
}
function request(path=base,origin='https://mmhvault.com'){
  return new Request(path,{headers:{Origin:origin,Authorization:'Bearer synthetic.jwt.token'}});
}
test('Cloudflare RUM breakdowns are strictly scoped and verified without exposing secrets',async()=>{
  const h=await harness();
  try{
    const r=await worker.fetch(request(),env);
    assert.equal(r.status,200);
    assert.equal(r.headers.get('cache-control'),'private, no-store');
    const body=await r.json();
    assert.equal(body.source,'cloudflare-web-analytics');
    assert.equal(body.verified,true);
    assert.equal(body.range,'7d');
    assert.equal(body.groupMetric,'pageViews');
    assert.equal(body.uniqueVisitors,null);
    assert.equal(body.categories.countries.rows[0].label,'TH');
    assert.equal(body.categories.countries.rows[0].pageViews,15);
    assert.equal(body.categories.countries.rows[0].visits,14);
    assert.equal(body.categories.referrers.rows[0].label,'Direct / unknown');
    assert.equal(body.categories.pages.rows[0].label,'/');
    assert.ok(!JSON.stringify(body).includes('super-secret-token'));
    assert.equal(body.categories.pages.rows.at(-1).label,'Other / hidden paths');
    assert.equal(h.calls.length,3);
    const upstream=h.calls.at(-1),query=JSON.parse(upstream.init.body);
    for(const name of ['countryName','requestPath','refererHost','userAgentBrowser','deviceType']){
      assert.ok(query.query.includes(name));
    }
    assert.match(query.query,/requestHost:"mmhvault.com",bot:0/);
    assert.equal(query.variables.siteTag,'synthetic-site');
    assert.equal(query.variables.accountTag,'synthetic-account');
    assert.equal(upstream.init.headers.Authorization,'Bearer synthetic-only-token');
    assert.ok(!JSON.stringify(body).includes('synthetic-only-token'));
  }finally{h.restore()}
});
test('non-admin cannot query Cloudflare breakdowns',async()=>{
  const h=await harness({admin:false});
  try{
    const r=await worker.fetch(request(),env);
    assert.equal(r.status,403);
    assert.equal((await r.json()).error,'forbidden');
    assert.equal(h.calls.length,2);
  }finally{h.restore()}
});
test('invalid JWT fails before admin RPC or Cloudflare',async()=>{
  const h=await harness({identity:false});
  try{
    const r=await worker.fetch(request(),env);
    assert.equal(r.status,401);
    assert.equal(h.calls.length,1);
  }finally{h.restore()}
});
test('invalid range, untrusted origin and unknown route are denied',async()=>{
  const h=await harness();
  try{
    assert.equal((await worker.fetch(request(base+'?range=forever'),env)).status,400);
    assert.equal((await worker.fetch(request(base,'https://evil.example'),env)).status,403);
    assert.equal((await worker.fetch(request(base+'/nonexistent'),env)).status,404);
    assert.equal(h.calls.length,0);
  }finally{h.restore()}
});
test('Cloudflare errors fail closed and never pretend to contain zero traffic',async()=>{
  const h=await harness({graphqlError:true});
  try{
    const r=await worker.fetch(request(),env);
    assert.equal(r.status,503);
    assert.deepEqual(await r.json(),{error:'analytics_unavailable'});
    assert.equal(r.headers.get('cache-control'),'private, no-store');
  }finally{h.restore()}
});
test('malformed or duplicate breakdown rows fail closed',async()=>{
  for(const mutation of [
    g=>g.countries[0].count=-1,
    g=>g.countries.push(clone(g.countries[0])),
    g=>g.devices[0].sum.visits='fake',
    g=>delete g.browsers
  ]){
    const bad=clone(good);mutation(bad);
    const h=await harness({groups:bad});
    try{
      const r=await worker.fetch(request(),env);
      assert.equal(r.status,503);
      assert.deepEqual(await r.json(),{error:'analytics_unavailable'});
    }finally{h.restore()}
  }
});
test('private paths and untrusted hosts are not returned verbatim',async()=>{
  const g=clone(good);
  g.pages=[{count:3,dimensions:{requestPath:'/reset/abc123'},sum:{visits:3}},
    {count:2,dimensions:{requestPath:'/account?secret=abc'},sum:{visits:2}}];
  g.referrers=[{count:1,dimensions:{refererHost:'<script>alert(1)</script>'},sum:{visits:1}}];
  const h=await harness({groups:g});
  try{
    const r=await worker.fetch(request(),env);
    assert.equal(r.status,200);
    const result=await r.json(),text=JSON.stringify(result);
    assert.equal(result.categories.pages.rows.length,1);
    assert.equal(result.categories.pages.rows[0].pageViews,5);
    assert.equal(result.categories.pages.rows[0].label,'Other / hidden paths');
    assert.equal(result.categories.referrers.rows[0].label,'Unknown');
    assert.doesNotMatch(text,/script|secret=abc|reset\/abc/i);
  }finally{h.restore()}
});
test('empty verified groups return empty lists without fabricated category counts',async()=>{
  const empty=Object.fromEntries(Object.keys(good).map(name=>[name,[]]));
  const h=await harness({groups:empty});
  try{
    const r=await worker.fetch(request(),env);
    assert.equal(r.status,200);
    const result=await r.json();
    for(const category of Object.values(result.categories)){
      assert.deepEqual(category.rows,[]);
      assert.equal(category.moreMayExist,false);
    }
    assert.equal(result.uniqueVisitors,null);
  }finally{h.restore()}
});

test('30-day breakdowns fail closed until live Cloudflare country groups are reconciled',async()=>{
  const h=await harness();
  try{
    const r=await worker.fetch(request(base+'?range=30d'),env);
    assert.equal(r.status,503);
    assert.deepEqual(await r.json(),{error:'breakdown_range_unverified'});
    assert.equal(h.calls.length,2,'still verify administrator, but never query unverified 30d groups');
    assert.ok(!h.calls.some(c=>c.url.includes('api.cloudflare.com')));
  }finally{h.restore()}
});
