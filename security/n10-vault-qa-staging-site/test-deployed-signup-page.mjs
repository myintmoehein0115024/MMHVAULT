// Actual public Staging Pages response test; no secrets or auth data.
import test from 'node:test';
import assert from 'node:assert/strict';

const BASE='https://mmhvault-n10-vault-staging.pages.dev';
async function get(path){
 const r=await fetch(BASE+path,{method:'GET',redirect:'follow',signal:AbortSignal.timeout(12000),cache:'no-store'});
 return {status:r.status,contentType:r.headers.get('content-type')||'',csp:r.headers.get('content-security-policy')||'',body:await r.text()};
}
test('deployed Staging username signup page contains a guarded real API client',async()=>{
 const page=await get('/preview/signup.html');
 assert.equal(page.status,200);
 assert.match(page.body,/N10 Username Staging QA/);
 assert.match(page.csp,/script-src[^;]*https:\/\/challenges\.cloudflare\.com/);
 assert.match(page.csp,/frame-src https:\/\/challenges\.cloudflare\.com/);
 assert.match(page.csp,/connect-src[^;]*https:\/\/challenges\.cloudflare\.com/);
 assert.match(page.body,/name="robots" content="noindex,nofollow,noarchive"/);
 assert.match(page.body,/src="\.\.\/signup\.js"/);
 assert.match(page.body,/id="serverStatus"/);
 assert.doesNotMatch(page.body,/vrypucmyrztxgiqhjspd/);
 const client=await get('/signup.js');
 assert.equal(client.status,200);
 assert.match(client.body,/const EDGE='https:\/\/ldivswlhtgmznzwhzsoi\.supabase\.co/);
 assert.match(client.body,/setReady\(false\);refresh\(\);/);
});
