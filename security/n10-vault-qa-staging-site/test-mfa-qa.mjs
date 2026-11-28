import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const dir=new URL('./',import.meta.url);
const html=readFileSync(new URL('./preview/mfa.html',dir),'utf8');
const js=readFileSync(new URL('./mfa.js',dir),'utf8');
const css=readFileSync(new URL('./mfa.css',dir),'utf8');
const headers=readFileSync(new URL('./_headers',dir),'utf8');
test('dedicated MFA site is isolated, indexed nowhere and aligned to exact Staging origin',()=>{
 assert.match(html,/noindex,nofollow,noarchive/);
 assert.match(html,/src="\.\.\/mfa\.js"/);
 assert.match(html,/src="https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?render=explicit"/);
 assert.match(html,/src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\.57\.4/);
 assert.match(js,/const BASE='https:\/\/ldivswlhtgmznzwhzsoi\.supabase\.co'/);
 assert.match(js,/const ORIGIN='https:\/\/mmhvault-n10-vault-staging\.pages\.dev'/);
 assert.match(js,/const ALLOWED=Object\.freeze\(\['n10qa_a_20261103','n10qa_b_20261103'\]\)/);
 assert.doesNotMatch(js,/vrypucmyrztxgiqhjspd|https:\/\/mmhvault\.com\b|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/);
 assert.match(headers,/script-src 'self' https:\/\/cdn\.jsdelivr\.net https:\/\/challenges\.cloudflare\.com/);
 assert.match(headers,/frame-src https:\/\/challenges\.cloudflare\.com/);
});
test('username login uses MFA-safe session handoff without persistence',()=>{
 assert.match(js,/action:'login',username,password,captcha_token/);
 assert.match(js,/action:'mmh_n10a769_login'/);
 assert.match(js,/credentials:'omit',cache:'no-store',redirect:'error'/);
 assert.match(js,/client\.auth\.setSession\(\{access_token:json\.access_token,refresh_token:json\.refresh_token\}\)/);
 assert.match(js,/persistSession:false,autoRefreshToken:false,detectSessionInUrl:false/);
 assert.match(js,/json\.code!=='login_success'/);
 assert.match(js,/data\?\.user\?\.id/);
 assert.match(js,/u\.app_metadata\?\.mmhvault_auth_kind!=='username_only'/);
 assert.match(js,/u\.app_metadata\?\.mmhvault_username!==owner/);
 assert.match(js,/client\.auth\.getUser\(\)/);
 assert.match(js,/client\.auth\.signOut/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|indexedDB|document\.cookie|innerHTML|console\.(?:log|info|debug)|eval\(/);
});
test('MFA enrollment is QR-only and requires verified server-issued challenge and AAL2',()=>{
 assert.match(js,/client\.auth\.mfa\.enroll\(\{factorType:'totp'/);
 assert.match(js,/client\.auth\.mfa\.challenge\(\{factorId\}\)/);
 assert.match(js,/client\.auth\.mfa\.verify\(\{factorId,challengeId:challenge\.id,code\}\)/);
 assert.match(js,/getAuthenticatorAssuranceLevel\(\)/);
 assert.match(js,/currentLevel!=='aal2'/);
 assert.match(js,/client\.auth\.mfa\.listFactors\(\)/);
 assert.match(js,/x\.id===factorId&&x\.status==='verified'/);
 assert.match(js,/function safeSvgMarkup\(svg\)/);
 assert.match(js,/function qrImageSource\(qr\)/);
 assert.match(js,/function manualTotpSecret\(value\)/);
 assert.match(js,/clearOwnUnverifiedFactor\(\)/);
 assert.match(js,/f.status==='unverified'/);
 assert.match(js,/f.friendly_name==='MMHVAULT N10 Staging MFA'/);
 assert.match(js,/client.auth.mfa.unenroll\(\{factorId:f.id\}\)/);
 assert.match(js,/qrTimer=setTimeout\(\(\)=>\{clearQr\(\);status\('secretExpired'\);\},120000\)/);
 assert.match(js,/clearQr\(\)/);
 assert.match(js,/code\.length|\\d\{6\}/);
 assert.doesNotMatch(js,/\balert\(|\bconfirm\(|\bprompt\(/);
});
test('responsive premium QA layout with modal and no production auth changes',()=>{
 assert.match(css,/@media\(max-width:570px\)/);
 assert.match(html,/viewport-fit=cover/);
 assert.match(html,/role="dialog" aria-modal="true"/);
 assert.match(html,/id="loginPanel"/);
 assert.match(html,/id="mfaPanel"/);
 assert.match(html,/id="qrModal"/);
 assert.match(html,/data-lang="zh"/);
 assert.match(html,/data-lang="en"/);
 assert.match(html,/data-lang="my"/);
 assert.match(js,/\bzh:\{title:/);
 assert.match(js,/\ben:\{title:/);
 assert.match(js,/\bmy:\{title:/);
});

test('synthetic QR data supports safe raw SVG and official data URL variants, never external URLs',()=>{
 const start=js.indexOf('function safeSvgMarkup(svg){');
 const end=js.indexOf('\nasync function clearOwnUnverifiedFactor()',start);
 assert.ok(start>0&&end>start);
 const source=js.slice(start,end);
 const {qrImageSource,manualTotpSecret}=runInNewContext(
  '(()=>{'+source+';return {qrImageSource,manualTotpSecret}})()',
  {decodeURIComponent,encodeURIComponent}
 );
 const raw='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect x="0" y="0" width="256" height="256" fill="#fff"/><path d="M0 0 L100 100"/></svg>';
 const canonical='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(raw);
 assert.equal(qrImageSource(raw),canonical);
 assert.equal(qrImageSource('data:image/svg+xml;utf-8,'+raw),canonical);
 assert.equal(qrImageSource('data:image/svg+xml;utf8,'+encodeURIComponent(raw)),canonical);
 assert.equal(qrImageSource('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(raw)),canonical);
 assert.equal(qrImageSource('data:image/png;base64,'+'a'.repeat(70)),'data:image/png;base64,'+'a'.repeat(70));
 assert.equal(qrImageSource('https://evil.example/qr.png'),null);
 assert.equal(qrImageSource('javascript:alert(1)'),null);
 assert.equal(qrImageSource('<svg onload="alert(1)">'+raw+'</svg>'),null);
 assert.equal(qrImageSource('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),null);
 assert.equal(qrImageSource('<svg><image href="https://evil.example/secret"/></svg>'),null);
 assert.equal(qrImageSource('data:text/html,<h1>x</h1>'),null);
 assert.equal(manualTotpSecret('jbsw y3dp ehpk 3pxp'),'JBSWY3DPEHPK3PXP');
 assert.equal(manualTotpSecret('javascript:alert(1)'),'');
});
test('private MFA secret and QR cleared on close, timeout and page navigation',()=>{
 assert.match(js,/manualSecret'\)\.textContent=''/);
 assert.match(js,/manualToggle'\)\.onclick=null/);
 assert.match(js,/qrTimer=setTimeout\(\(\)=>\{clearQr\(\);status\('secretExpired'\);\},120000\)/);
 assert.match(js,/document.addEventListener\('visibilitychange'/);
 assert.match(js,/window.addEventListener\('pagehide'/);
 assert.match(html,/id="manualSection"/);
 assert.match(html,/id="manualSecret"/);
 assert.match(html,/id="manualToggle"/);
});
