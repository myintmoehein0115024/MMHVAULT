import assert from 'node:assert/strict';
import test from 'node:test';
import {createRecoveryTransport, ORIGINAL_RECOVERY_ENDPOINT} from './recovery-transport.mjs';
const words = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet'.split(' ');
const goodAuth = () => ({getUser:async()=>({data:{user:{id:'same-user'}}}),getSession:async()=>({data:{session:{user:{id:'same-user'},access_token:'synthetic-token'}}})});
const respond = (code, extra={}, status=200) => new Response(JSON.stringify({code,...extra}),{status,headers:{'content-type':'application/json'}});
function harness({auth=goodAuth(),releaseEnabled=true,origin='https://mmhvault.com',reply=respond('backup_status',{backed_up:true})}={}) {
 const calls=[];
 const request = createRecoveryTransport({auth,releaseEnabled,origin,
  fetcher:async (url,options)=>{calls.push({url,options});return reply},
  setTimer:()=>7, clearTimer:()=>{},
 });
 return {request,calls};
}
test('default release gate stays OFF, even with valid auth', async()=>{
 const h=harness({releaseEnabled:false});assert.deepEqual(await h.request('status'),{code:'unavailable'});assert.equal(h.calls.length,0);
});
test('only HTTPS site origin can reach endpoint', async()=>{
 for(const origin of ['http://mmhvault.com','https://evil.example','https://mmhvault.com.evil.example','bad origin']) {
  const h=harness({origin});assert.deepEqual(await h.request('status'),{code:'unavailable'});assert.equal(h.calls.length,0);
 }
});
test('status sends only action, no credentials/cookies/referrer', async()=>{
 const h=harness();assert.deepEqual(await h.request('status',{password:'must-not-send'}),{code:'backup_status',backed_up:true});
 const c=h.calls[0];assert.equal(c.url,ORIGINAL_RECOVERY_ENDPOINT);assert.equal(c.options.method,'POST');
 assert.equal(c.options.credentials,'omit');assert.equal(c.options.cache,'no-store');assert.equal(c.options.referrerPolicy,'no-referrer');assert.equal(c.options.redirect,'error');
 assert.equal(c.options.headers.authorization,'Bearer synthetic-token');assert.deepEqual(JSON.parse(c.options.body),{action:'status'});
});
test('reveal sends only requested action/password', async()=>{
 const h=harness({reply:respond('recovery_key',{words,expires_in_seconds:45})});
 assert.deepEqual(await h.request('reveal',{password:'test-pass',phrase:'must-not-send',replace:true}),{code:'recovery_key',words,expires_in_seconds:45});
 assert.deepEqual(JSON.parse(h.calls[0].options.body),{action:'reveal',password:'test-pass'});
});
test('all write, rotate, and backup actions are blocked locally', async()=>{
 const h=harness();for(const action of ['backup_existing','rotate','replace','reset','signup','delete'])
  assert.deepEqual(await h.request(action,{password:'test-pass'}),{code:'unavailable'});
 assert.equal(h.calls.length,0);
});
test('invalid password never leaves browser', async()=>{
 const h=harness();for(const pass of ['', 'a','x'.repeat(21),null])
  assert.deepEqual(await h.request('reveal',{password:pass}),{code:'invalid_credentials'});
 assert.equal(h.calls.length,0);
});
test('different Auth owner vs token owner blocks request',async()=>{
 const auth=goodAuth();auth.getSession=async()=>({data:{session:{user:{id:'other-user'},access_token:'synthetic-token'}}});
 const h=harness({auth});assert.deepEqual(await h.request('status'),{code:'sign_in_required'});assert.equal(h.calls.length,0);
});
test('missing/invalid Auth session blocks request',async()=>{
 const auth=goodAuth();auth.getUser=async()=>({data:{user:null}});
 const h=harness({auth});assert.deepEqual(await h.request('status'),{code:'sign_in_required'});assert.equal(h.calls.length,0);
});
test('network errors do not leak tokens or raw errors',async()=>{
 const broken=createRecoveryTransport({auth:goodAuth(),origin:'https://mmhvault.com',releaseEnabled:true,fetcher:()=>{throw new Error('secret exposed?')}});
 assert.deepEqual(await broken('status'),{code:'unavailable'});
});
test('no forged recovery key on HTTP error',async()=>{
 const h=harness({reply:respond('recovery_key',{words,expires_in_seconds:45},403)});
 assert.deepEqual(await h.request('reveal',{password:'test-pass'}),{code:'unavailable'});
});
test('wrong word count, capitalization or expiry fails closed',async()=>{
 for (const body of [
   {words:words.slice(1),expires_in_seconds:45},
   {words:[...words.slice(0,9),'UPPER'],expires_in_seconds:45},
   {words,expires_in_seconds:120},
 ]){
  const h=harness({reply:respond('recovery_key',body)});
  assert.deepEqual(await h.request('reveal',{password:'test-pass'}),{code:'unavailable'});
 }
});
test('oversized backend response is rejected before disclosure',async()=>{
 const r = new Response(JSON.stringify({code:'recovery_key',words,expires_in_seconds:45,extra:'z'.repeat(9000)}));
 const h=harness({reply:r});assert.deepEqual(await h.request('reveal',{password:'test-pass'}),{code:'unavailable'});
});
test('server error code allows password retry UX without disclosing data',async()=>{
 const h=harness({reply:respond('invalid_credentials',{},401)});
 assert.deepEqual(await h.request('reveal',{password:'test-pass'}),{code:'invalid_credentials'});
});
test('legacy without encrypted copy clearly communicates no saved backup',async()=>{
 const h=harness({reply:respond('backup_status',{backed_up:false})});
 assert.deepEqual(await h.request('status'),{code:'backup_status',backed_up:false});
});

test('logout while reveal is pending blocks the original words',async()=>{
 let reads=0;
 const auth=goodAuth();
 auth.getSession=async()=>{
   reads++;
   return {data:{session:reads===1?
     {user:{id:'same-user'},access_token:'synthetic-token'}:null}};
 };
 const h=harness({auth,reply:respond('recovery_key',{words,expires_in_seconds:45})});
 const result=await h.request('reveal',{password:'test-pass'});
 assert.deepEqual(result,{code:'sign_in_required'});
 assert.equal(reads,2);
});
test('silent token rotation during request blocks a stale response',async()=>{
 let reads=0;
 const auth=goodAuth();
 auth.getSession=async()=>({data:{session:{
   user:{id:'same-user'},access_token:++reads===1?'synthetic-token':'next-token'
 }}});
 const h=harness({auth,reply:respond('recovery_key',{words,expires_in_seconds:45})});
 assert.deepEqual(await h.request('reveal',{password:'test-pass'}),{code:'sign_in_required'});
});
test('switching identity while request is pending blocks stale words',async()=>{
 let checks=0;
 const auth=goodAuth();
 auth.getUser=async()=>({data:{user:{id:++checks===1?'same-user':'other-user'}}});
 const h=harness({auth,reply:respond('recovery_key',{words,expires_in_seconds:45})});
 assert.deepEqual(await h.request('reveal',{password:'test-pass'}),{code:'sign_in_required'});
 assert.equal(checks,2);
});
test('the status request is also invalidated by a session change',async()=>{
 let reads=0;
 const auth=goodAuth();
 auth.getSession=async()=>({data:{session:{
  user:{id:'same-user'},access_token:++reads===1?'synthetic-token':'new-token'
 }}});
 const h=harness({auth});
 assert.deepEqual(await h.request('status'),{code:'sign_in_required'});
});
