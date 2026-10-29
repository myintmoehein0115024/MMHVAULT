/* N10-A7.42 — OFFLINE backend HTTP/security regression.
 * Rewrites the closed gate only in a VM sandbox, never modifies GitHub source.
 * All fetches are local stubs. No Supabase, Turnstile, users or production writes.
 */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const edge=fs.readFileSync('review/N10-A7.40-PRODUCTION-EDGE-CANDIDATE-NEVER-DEPLOY.ts','utf8');
assert.match(edge,/const CODE_GATE_OPEN = false;/);
assert.match(edge,/const WINDOW_START_UTC = '1970-01-01T00:00:00.000Z';/);
assert.match(edge,/const WINDOW_END_UTC = '1970-01-01T00:00:00.000Z';/);
const UID1='11111111-1111-4111-8111-111111111111',UID2='22222222-2222-4222-8222-222222222222';
const BASE='https://vrypucmyrztxgiqhjspd.supabase.co';
const PUB='sb_publishable_FAKE_FOR_MOCK_ONLY';
const SERVICE='FAKE_LEGACY_SERVICE_ROLE_FOR_MOCK_ONLY';
const h={'Content-Type':'application/json','Origin':'https://mmhvault.com','apikey':PUB};
const fixture=t=>({
  get:(name)=>({
    SUPABASE_URL:BASE,SUPABASE_ANON_KEY:PUB,SUPABASE_SERVICE_ROLE_KEY:SERVICE,
    N10A740_TURNSTILE_SECRET:'FAKE_CLOUDFLARE_SECRET',
    N10A740_RATE_HMAC_KEY:'MOCK_RATE_HMAC_KEY_0123456789_0123456789',
    N10A740_PRODUCTION_ENABLED:t?'true':'false'
  })[name]||''
});
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
function backend({enabled=true,alias='testuser',grantUid=UID1,confirmed=true}={}){
  const aliases=new Map(alias?[[alias,UID1]]:[]),buckets=new Map();
  const events={calls:[],tokens:[],logouts:0,authAttempts:0,bindings:0};
  const users={
    [UID1]:{id:UID1,email:'alice@example.test',email_confirmed_at:confirmed?'2026-01-01T00:00:00Z':null,is_anonymous:false},
    [UID2]:{id:UID2,email:'bob@example.test',email_confirmed_at:'2026-01-01T00:00:00Z',is_anonymous:false}
  };
  const identityToken=value=>(value==='mock-user-'+UID1||value==='mock-proof-'+UID1)?UID1:
    (value==='mock-user-'+UID2||value==='mock-proof-'+UID2)?UID2:null;
  const fetch=async(url,opts={})=>{
    events.calls.push({path:url,method:opts.method||'GET'});
    const u=new URL(url);
    const header=opts.headers||{};
    if(u.host==='challenges.cloudflare.com'){
      assert.equal(u.pathname,'/turnstile/v0/siteverify');
      const form=new URLSearchParams(opts.body);
      assert.equal(form.get('secret'),'FAKE_CLOUDFLARE_SECRET');
      const tok=form.get('response')||'';
      if(tok.startsWith('fail.'))return json({success:false},200);
      return json({
        success:true,hostname:tok.startsWith('wrong-host.')?'evil.example':'mmhvault.com',
        action:tok.startsWith('wrong-action.')?'other_action':
          tok.startsWith('bind.')?'mmh_n10a740_bind':'mmh_n10a740_login'
      });
    }
    assert.equal(u.origin,BASE,'Every service request must target mock production project');
    if(u.pathname.startsWith('/rest/v1/')||u.pathname.startsWith('/auth/v1/admin/')){
      assert.equal(header.apikey,SERVICE,'Privileged service call must use server-only key');
      assert.equal(header.Authorization,'Bearer '+SERVICE);
    }
    if(u.pathname==='/rest/v1/rpc/mmh_n10a740_take_attempt'){
      const args=JSON.parse(opts.body);
      assert.match(args.p_key,/^[0-9a-f]{64}$/);
      assert.ok(!args.p_key.includes('testuser'));
      const count=(buckets.get(args.p_key)||0)+1;
      buckets.set(args.p_key,count);
      return json(count<=args.p_limit);
    }
    if(u.pathname==='/rest/v1/mmh_n10a740_username_links'&&(opts.method||'GET')==='GET'){
      const v=(u.searchParams.get('username_key')||'').replace(/^eq\./,'');
      return json(aliases.has(v)?[{user_id:aliases.get(v)}]:[]);
    }
    if(u.pathname==='/rest/v1/mmh_n10a740_username_links'&&opts.method==='POST'){
      const v=JSON.parse(opts.body);
      assert.equal(header.Authorization,'Bearer '+SERVICE);
      if(aliases.has(v.username_key)||[...aliases.values()].includes(v.user_id))return json({code:'23505'},409);
      aliases.set(v.username_key,v.user_id);events.bindings++;
      return new Response(null,{status:201});
    }
    if(u.pathname.startsWith('/auth/v1/admin/users/')){
      const id=u.pathname.split('/').pop();
      return users[id]?json(users[id]):json({error:'not_found'},404);
    }
    if(u.pathname==='/auth/v1/user'){
      assert.equal(header.apikey,PUB);
      const access=(header.Authorization||'').replace(/^Bearer /,'');
      const uid=identityToken(access);
      return uid?json(users[uid]):json({error:'invalid_token'},401);
    }
    if(u.pathname==='/auth/v1/token'){
      events.authAttempts++;
      assert.equal(header.apikey,PUB);
      const {email,password}=JSON.parse(opts.body);
      if(password!=='correct-password'||!Object.values(users).some(x=>x.email===email))
        return json({error:'invalid_credentials'},400);
      const uid=grantUid;
      const grant={access_token:'mock-proof-'+uid,refresh_token:'mock-refresh-'+uid,
        expires_in:3600,user:{id:uid}};
      events.tokens.push(grant);
      return json(grant);
    }
    if(u.pathname==='/auth/v1/logout'){
      assert.equal(header.apikey,PUB);
      events.logouts++;
      return json({});
    }
    throw Error('Unexpected mock network target: '+u.pathname);
  };
  let handler;
  let source=edge;
  if(enabled){
    const start=new Date(Date.now()-10_000).toISOString();
    const end=new Date(Date.now()+120_000).toISOString();
    source=source.replace('const CODE_GATE_OPEN = false;','const CODE_GATE_OPEN = true;')
      .replace("const WINDOW_START_UTC = '1970-01-01T00:00:00.000Z';",
        'const WINDOW_START_UTC = '+JSON.stringify(start)+';')
      .replace("const WINDOW_END_UTC = '1970-01-01T00:00:00.000Z';",
        'const WINDOW_END_UTC = '+JSON.stringify(end)+';');
  }
  vm.runInNewContext(source,{
    Deno:{env:fixture(enabled),serve:fn=>{handler=fn}},
    fetch,Request,Response,URL,URLSearchParams,TextEncoder,TextDecoder,AbortSignal,
    crypto:webcrypto,Uint8Array,Date,Set,Error,Number,String,Array,JSON,RegExp
  },{timeout:2000,filename:'CANDIDATE-VM-ONLY.ts'});
  assert.equal(typeof handler,'function');
  const send=async({action='login',username='testuser',password='correct-password',
    captcha_token='login.fake-token-000000000001',origin='https://mmhvault.com',
    authorization='',method='POST',raw=null}={})=>{
    const headers={...h,Origin:origin};
    if(authorization)headers.Authorization=authorization;
    const request=new Request(BASE+'/functions/v1/mmh-n10-a740-username',{
      method,headers,...(method==='POST'?{body:raw===null?JSON.stringify({action,username,password,captcha_token}):raw}:{})
    });
    const resp=await handler(request);
    return {status:resp.status,body:resp.status===204?null:await resp.json()};
  };
  return {send,events,aliases,buckets};
}
(async()=>{
  {const c=backend({enabled:false});
    assert.equal((await c.send()).status,503);
    assert.equal((await c.send({action:'preflight'})).body.enabled,false);
    assert.equal(c.events.calls.length,0);}
  {const c=backend();
    assert.equal((await c.send({origin:'https://evil.example'})).status,403);
    assert.equal(c.events.calls.length,0);
    assert.equal((await c.send({action:'bad-action'})).status,400);
    assert.equal((await c.send({username:'A'})).status,401);
    assert.equal((await c.send({raw:'x'.repeat(4500)})).status,413);
    assert.equal((await c.send({captcha_token:'fail.00000000000000000000'})).status,403);
    assert.equal((await c.send({captcha_token:'wrong-host.00000000000000'})).status,403);
    assert.equal((await c.send({captcha_token:'wrong-action.0000000000000'})).status,403);
    assert.equal(c.events.authAttempts,0);}
  {const c=backend();
    const ok=await c.send();
    assert.equal(ok.status,200);
    assert.equal(ok.body.code,'login_success');
    assert.equal(ok.body.access_token,'mock-proof-'+UID1);
    assert.equal(c.events.logouts,0);
    const replay=await c.send();
    assert.equal(replay.status,403,'Captcha must not be reused');
    assert.equal(c.events.authAttempts,1);}
  {const c=backend();
    const failure=await c.send({password:'wrong-password'});
    assert.equal(failure.status,401);
    assert.equal(failure.body.access_token,undefined);
    assert.equal(c.events.authAttempts,1);}
  {const c=backend({grantUid:UID2});
    const fail=await c.send();
    assert.equal(fail.status,503,'Wrong UID must never receive proof tokens');
    assert.equal(fail.body.access_token,undefined);
    assert.equal(c.events.logouts,1,'Mismatch proof must be revoked');}
  {const c=backend({alias:null});
    const fail=await c.send();
    assert.equal(fail.status,401);
    assert.equal(c.events.authAttempts,0,'Unknown user must not password-exchange');}
  {const c=backend({confirmed:false});
    const fail=await c.send();
    assert.equal(fail.status,401);
    assert.equal(c.events.authAttempts,0);}
  {const c=backend({alias:null});
    const noAuth=await c.send({action:'bind',username:'testuser',captcha_token:'bind.a00000000000000000001'});
    assert.equal(noAuth.status,401);
    assert.equal(c.events.authAttempts,0);}
  {const c=backend({alias:null});
    const good=await c.send({action:'bind',username:'testuser',captcha_token:'bind.a00000000000000000001',
      authorization:'Bearer mock-user-'+UID1});
    assert.equal(good.status,200);
    assert.equal(good.body.code,'bind_success');
    assert.equal(c.aliases.get('testuser'),UID1);
    assert.equal(c.events.logouts,1,'Temporary password proof must be revoked after bind');
    assert.equal(c.events.bindings,1);
    const other=backend({alias:'testuser',grantUid:UID2});
    const collision=await other.send({action:'bind',username:'testuser',captcha_token:'bind.a00000000000000000002',
      authorization:'Bearer mock-user-'+UID2});
    assert.equal(collision.status,409,'Other UID cannot claim same name');
    assert.equal(other.events.bindings,0);}
  {const c=backend({alias:null,grantUid:UID2});
    const fail=await c.send({action:'bind',username:'testuser',captcha_token:'bind.a00000000000000000001',
      authorization:'Bearer mock-user-'+UID1});
    assert.equal(fail.status,401,'Mismatched password proof must reject binding');
    assert.equal(c.events.bindings,0);
    assert.equal(c.events.logouts,1);}
  {const c=backend({alias:null});
    for(let i=0;i<8;i++){
      const fail=await c.send({username:'testuser',password:'wrong-password',
        captcha_token:'login.unique-token-0000000'+String(i).padStart(5,'0')});
      assert.equal(fail.status,401);
    }
    const throttled=await c.send({username:'testuser',password:'correct-password',
      captcha_token:'login.unique-token-000000099999'});
    assert.equal(throttled.status,429,'Username must be limited after eight attempts');
    assert.equal(c.events.authAttempts,8);
  }
  console.log('PASS N10-A7.42 11 isolated security groups: closed gate, input bounds, Turnstile, token replay, UID check, privileged keys, binding, collision, temporary revoke and rate limit.');
})().catch(e=>{console.error(e);process.exitCode=1});
