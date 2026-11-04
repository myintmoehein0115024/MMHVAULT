/* Review-only verification of the complete APP → Auth-Staging preview builder.
 * CI uses a synthetic publishable key, not any live Supabase credentials.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const builder=path.join(root,'tests','build-app-v117-staging-preview.cjs');
const out=fs.mkdtempSync(path.join(os.tmpdir(),'mmh-v117-server-qa-'));
const STAGE='ldivswlhtgmznzwhzsoi.supabase.co';
const PROD='vrypucmyrztxgiqhjspd.supabase.co';
const PUBLIC='sb_publishable_SYNTHETIC_STAGING_QA_ONLY_0123456789';

test('preview build fails closed if the exact staging key is absent',()=>{
 const result=spawnSync(process.execPath,[builder],{
   cwd:root,encoding:'utf8',env:{...process.env,MMH_V117_STAGING_OUTPUT_DIR:out,MMH_V117_STAGING_PUBLISHABLE_KEY:''}
 });
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/Dedicated Auth-Staging publishable key required/);
});

test('preview is generated from the current APP without production endpoints',()=>{
 const result=spawnSync(process.execPath,[builder],{
   cwd:root,encoding:'utf8',env:{...process.env,MMH_V117_STAGING_OUTPUT_DIR:out,MMH_V117_STAGING_PUBLISHABLE_KEY:PUBLIC},
   maxBuffer:1024*1024
 });
 assert.equal(result.status,0,result.stderr);
 const html=fs.readFileSync(path.join(out,'app.html'),'utf8');
 assert.ok(html.length>1000000,'full app.html was copied, not a small standalone fixture');
 assert.match(html,/MMHVAULT APP V11\.7 — STAGING ONLY/);
 assert.match(html,new RegExp('https://'+STAGE.replaceAll('.','\\.')));
 assert.ok(!html.includes(PROD));
 assert.ok(!html.includes('sb_publishable_H38v4XbO0ARnSJToD42wGg_27-SZ3Ao'));
 assert.ok(html.includes(PUBLIC));
 assert.match(html,/connect-src https:\/\/ldivswlhtgmznzwhzsoi\.supabase\.co\/auth\/v1\/token/);
 assert.match(html,/https:\/\/ldivswlhtgmznzwhzsoi\.supabase\.co\/rest\/v1\/transactions/);
 assert.match(html,/https:\/\/ldivswlhtgmznzwhzsoi\.supabase\.co\/rest\/v1\/personal_configuration/);
 for(const table of ['investments','custom_investments','crypto_wallet_movements']){
   assert.ok(html.includes('https://'+STAGE+'/rest/v1/'+table),
     'Approved Auth-Staging boot-only route missing for '+table);
 }
 assert.doesNotMatch(html,/connect-src[^"]*\/functions\/v1\//);
 assert.ok(fs.existsSync(path.join(out,'START-STAGING-ON-MAC.sh')));
 const launcher=fs.readFileSync(path.join(out,'START-STAGING-ON-MAC.sh'),'utf8');
 assert.match(launcher,/python3 -m http.server 8769/);
 assert.match(launcher,/ruby -run -e httpd/,'macOS Ruby fallback must be available');
 assert.match(launcher,/require "webrick"/,'probe Ruby server before choosing it');
 assert.match(launcher,/python3 -c 'import http.server'/,'avoid Apple Xcode python3 stub');
 assert.ok(launcher.indexOf('command -v ruby')<launcher.indexOf('command -v python3'),
   'on macOS prefer working Ruby to Python3 developer tools stub');
 assert.ok(launcher.split('\n').length>8,'macOS launch script needs real newlines');
 const checkAssets=folder=>{
   for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
     const full=path.join(folder,entry.name);
     if(entry.isDirectory()){checkAssets(full);continue;}
     if(!/\.(?:js|mjs|html|css|json|txt)$/i.test(entry.name))continue;
     const asset=fs.readFileSync(full,'utf8');
     assert.ok(!asset.includes(PROD),'Production host survived in '+full);
     assert.ok(!asset.includes('sb_publishable_H38v4XbO0ARnSJToD42wGg_27-SZ3Ao'),'Production key survived in '+full);
   }
 };
 checkAssets(out);
 assert.match(html,/default-src 'self'/);
 assert.match(html,/worker-src 'none'/);
 assert.match(html,/mmhvault-v11-manage-hierarchy-live\.mjs\?v=0\.7\.0/);
 assert.doesNotMatch(html,/mmhvault-transaction-field-layout-v11\.js/);
 assert.ok(fs.existsSync(path.join(out,'js','mmhvault-v11-manage-hierarchy-live.mjs')));
 assert.ok(fs.existsSync(path.join(out,'js','mmhvault-v11-manage-hierarchy-model.mjs')));
 assert.ok(fs.existsSync(path.join(out,'css')));
 assert.ok(fs.existsSync(path.join(out,'README-STAGING-QA.txt')));
 // An unauthenticated native APP deliberately redirects to login.html.
 // This must not 404 into Pages' SPA fallback to index.html -> app.html,
 // which previously caused the reported blank, flickering boot loop.
 const login=fs.readFileSync(path.join(out,'login.html'),'utf8');
 assert.match(login,/MMHVAULT APP V11\.7 — STAGING TEST LOGIN/);
 assert.match(login,/id="qaLoginForm"/);
 assert.match(login,/id="qaEmail"/);
 assert.match(login,/id="qaPassword"/);
 assert.match(login,/v117qa/);
 assert.match(login,/signInWithPassword/);
 assert.match(login,/id="qaMfaForm"/);
 assert.match(login,/id="qaTotp"/);
 assert.match(login,/challengeAndVerify/);
 assert.match(login,/getAuthenticatorAssuranceLevel/);
 assert.match(login,/listFactors/);
 assert.match(login,/assurance\?\.currentLevel!=='aal2'/,
   'QA TOTP cannot redirect to APP unless Auth confirms AAL2');
 assert.match(login,/factors\.all\.some\(x=>x\?\.status==='verified'\)/,
   'legacy-null assurance must query verified server factors');
 assert.match(login,/Only dedicated v117qa synthetic Staging accounts/,
   'Sign-in remains restricted to synthetic QA addresses');
 assert.match(login,/location\.replace\('\.\/app\.html'\)/);
 assert.match(login,/sb_publishable_SYNTHETIC_STAGING_QA_ONLY_0123456789/);
 assert.ok(!login.includes(PROD));
 assert.ok(!login.includes('sb_publishable_H38v4XbO0ARnSJToD42wGg_27-SZ3Ao'));
 assert.doesNotMatch(login,/__AUTH_STAGING_PUBLISHABLE_KEY__/);
 assert.doesNotMatch(login,/\/functions\/v1\/|signUp\s*\(|resetPasswordForEmail\s*\(/);
 assert.match(login,/connect-src https:\/\/ldivswlhtgmznzwhzsoi\.supabase\.co\/auth\/v1\/token/);
 assert.match(login,/auth\/v1\/factors\/; img-src/,
   'TOTP factor challenge/verify routes restricted to Auth-Staging');
 assert.match(html,/https:\/\/ldivswlhtgmznzwhzsoi\.supabase\.co\/auth\/v1\/factors/,
   'Native full APP may read owner MFA factors in strict AAL check');
 assert.doesNotMatch(login,/connect-src[^"]*\/rest\/v1\//);
 const index=fs.readFileSync(path.join(out,'index.html'),'utf8');
 assert.match(index,/url=\.\/login\.html/);
 assert.doesNotMatch(index,/url=\.\/app\.html/);
 assert.match(html,/location\.replace\('index\.html'\)/,
   'Native anonymous auth boot must remain recognized by QA landing');
 assert.match(html,/location\.replace\('login\.html'\)/,
   'Native sign-out redirect must resolve to the same isolated QA login');
 assert.match(result.stdout,/"originReplacements":3/);
});
