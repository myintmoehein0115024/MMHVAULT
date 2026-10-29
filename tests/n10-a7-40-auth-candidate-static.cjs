/* N10-A7.40 candidate-only static regression, no network or credential use. */
'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const app=fs.readFileSync('app.html'),login=fs.readFileSync('login.html','utf8');
const client=fs.readFileSync('js/mmhvault-n10-a7-40-username.js','utf8');
const gitBlobSha=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const checks={
 app_exact_production_baseline:()=>assert.equal(gitBlobSha(app),'4abf71a70ad3c1f3388de2418e219ab13ba2d330'),
 email_password_preserved:()=>assert.match(login,/db\.auth\.signInWithPassword\(\{email,password\}\)/),
 email_registration_preserved:()=>assert.match(login,/db\.auth\.signUp\(\{/),
 google_oauth_preserved:()=>assert.match(login,/db\.auth\.signInWithOAuth\(\{/),
 password_recovery_preserved:()=>assert.match(login,/PASSWORD_RECOVERY/),
 verified_redirect_preserved:()=>assert.match(login,/verifiedRedirectV946/),
 isolated_username_form:()=>assert.match(login,/id="usernameSignIn"/),
 username_20_limit:()=>assert.match(login,/id="mmhA740Username"[^>]*maxlength="20"/),
 frontend_fail_closed:()=>assert.match(client,/const ENABLED=false;/),
 production_only_endpoint:()=>{assert.match(client,/https:\/\/vrypucmyrztxgiqhjspd\.supabase\.co/);assert.doesNotMatch(client,/ldivswlhtgmznzwhzsoi|pages\.dev|MMHVAULT-Auth-QA/);},
 no_embedded_secrets:()=>assert.doesNotMatch(client,/sb_secret_|service_role|N10A6_TURNSTILE_SECRET|N10A6_RATE_HMAC_KEY/),
 captcha_server_path:()=>assert.match(client,/captcha_token:usedToken/),
 uid_consistency:()=>{assert.match(client,/db\.auth\.getUser\(\)/);assert.match(client,/db\.auth\.getSession\(\)/);},
 no_raw_browser_alert:()=>assert.doesNotMatch(client,/\balert\s*\(/),
 no_username_password_logging:()=>assert.doesNotMatch(client,/console\.(?:log|info|warn|error)\s*\(/),
 };
for(const [name,fn] of Object.entries(checks)){fn();process.stdout.write('PASS '+name+'\n');}
console.log('N10-A7.40 static checks completed:',Object.keys(checks).length);
