import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('./',import.meta.url);
const html=readFileSync(new URL('./preview/signup.html',root),'utf8');
const css=readFileSync(new URL('./signup.css',root),'utf8');
const js=readFileSync(new URL('./signup.js',root),'utf8');
const headers=readFileSync(new URL('./_headers',root),'utf8');

test('real Staging preview is separate from existing mock and production',()=>{
 assert.match(html,/N10 Username Staging QA/);
 assert.match(html,/name="robots" content="noindex,nofollow,noarchive"/);
 assert.match(html,/src="\.\.\/signup\.js"/);
 assert.match(html,/src="https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?render=explicit"/);
 assert.match(html,/content="default-src 'none';/);
 assert.match(html,/form-action 'none'/);
 assert.match(html,/connect-src https:\/\/ldivswlhtgmznzwhzsoi\.supabase\.co/);
 assert.doesNotMatch(html,/vrypucmyrztxgiqhjspd|https:\/\/mmhvault\.com/);
 assert.match(js,/const ORIGIN='https:\/\/mmhvault-n10-vault-staging\.pages\.dev'/);
 assert.match(js,/const EDGE='https:\/\/ldivswlhtgmznzwhzsoi\.supabase\.co\/functions\/v1\/mmh-n10-staging-username-escrow-20261103'/);
 assert.doesNotMatch(js,/vrypucmyrztxgiqhjspd|https:\/\/mmhvault\.com\b/);
});
test('all 3 language modes are present, and form stays locked unless live preflight explicitly enables',()=>{
 for(const lang of ['zh','en','my'])assert.match(js,new RegExp('\\b'+lang+':\\{'));
 for(const key of ['ready','closed','invalid','auth_unavailable','preparedExpired'])assert.ok(js.includes(key));
 assert.match(js,/setReady\(false\);refresh\(\);/);
 assert.match(js,/data\.code!=='preflight_ok'\|\|data\.qa_only!==true\|\|data\.production!==false/);
 assert.match(js,/const nowReady=data\.enabled===true/);
 assert.match(js,/if\(!enabled\|\|busy\)return;/);
 assert.match(js,/NAME_RE\.test\(username\)/);
 assert.match(js,/action:'preflight'/);
 assert.match(js,/action:'prepare_signup'/);
 assert.match(js,/action:'signup'/);
});
test('recovery words and sign-in tokens are not persisted or interpolated as HTML',()=>{
 assert.doesNotMatch(js,/localStorage|sessionStorage|indexedDB|document\.cookie|console\.(?:log|info|debug)|innerHTML|sendBeacon|XMLHttpRequest/);
 assert.match(js,/prepared=\{phrase:words\.join\(' '\),ticket,username\}/);
 assert.match(js,/clearPhrase\(\)/);
 assert.match(js,/45_?000|45000/);
 assert.match(js,/document\.addEventListener\('visibilitychange'/);
 assert.match(js,/window\.addEventListener\('pagehide'/);
 assert.match(js,/item\.append\(n,document\.createTextNode\(word\)\)/);
 assert.match(js,/credentials:'omit',cache:'no-store',redirect:'error'/);
 assert.match(js,/const SITEKEY='0x4AAAAAAFlXEfEHAP1TUxjr'/);
 assert.match(js,/const ACTION='mmh_n10a769_prepare_signup'/);
});
test('safe-area and responsive layout, private modal, no default alert',()=>{
 assert.match(css,/viewport-fit=cover|safe-area-inset-top/);
 assert.match(css,/@media\(max-width:570px\)/);
 assert.match(css,/\.modal\[hidden\]\{display:none\}/);
 assert.match(html,/role="dialog" aria-modal="true"/);
 assert.doesNotMatch(js,/\balert\(|\bconfirm\(|\bprompt\(/);
});

test('Staging-only Pages CSP permits Turnstile script AND iframe without relaxing default deny',()=>{
 const csp=headers.split('\n').find(x=>x.includes('Content-Security-Policy:'))||'';
 assert.match(csp,/default-src 'none'/);
 assert.match(csp,/script-src 'self' https:\/\/cdn\.jsdelivr\.net https:\/\/challenges\.cloudflare\.com/);
 assert.match(csp,/frame-src https:\/\/challenges\.cloudflare\.com/);
 assert.match(csp,/connect-src https:\/\/ldivswlhtgmznzwhzsoi\.supabase\.co https:\/\/challenges\.cloudflare\.com/);
 assert.match(csp,/frame-ancestors 'none'/);
 assert.match(csp,/form-action 'none'/);
 assert.doesNotMatch(csp,/unsafe-inline|unsafe-eval|\*\s*;/);
});
