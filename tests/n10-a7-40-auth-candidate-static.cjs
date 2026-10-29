/* N10-A7.40 candidate-only static regression, no network or credential use. */
'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const app=fs.readFileSync('app.html'),login=fs.readFileSync('login.html','utf8');
const client=fs.readFileSync('js/mmhvault-n10-a7-40-username.js','utf8');
const bind=fs.readFileSync('js/mmhvault-n10-a7-41-bind.js','utf8');
const setup=fs.readFileSync('username-setup.html','utf8');
const edge=fs.readFileSync('review/N10-A7.40-PRODUCTION-EDGE-CANDIDATE-NEVER-DEPLOY.ts','utf8');
const sql=fs.readFileSync('review/N10-A7.40-PRODUCTION-DB-CANDIDATE-NEVER-RUN.sql','utf8');
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
 username_setup_discoverable:()=>assert.match(login,/href="username-setup\.html"/),
 username_setup_redirect_allowlisted:()=>assert.match(login,/next==='username-setup\.html'/),
 uid_handoff_mutex:()=>{assert.match(login,/MMHVAULT_N10_A741_USERNAME_HANDOFF/);assert.match(client,/if\(!navigated\)throw Error/);},
 bind_page_isolated:()=>assert.match(setup,/mmhvault-n10-a7-41-bind\.js/),
 bind_frontend_closed:()=>{assert.match(bind,/const ENABLED=false;/);assert.match(bind,/const SITE_KEY='0x4AAAAAAFrRIiFC7KoLQn2q';/);},
 bind_verifies_remote_uid:()=>{assert.match(bind,/client\.auth\.getUser\(\)/);assert.match(bind,/client\.auth\.getSession\(\)/);},
 edge_remains_closed:()=>{assert.match(edge,/const CODE_GATE_OPEN = false;/);assert.match(edge,/N10A740_PRODUCTION_ENABLED/);},
 edge_public_status_no_secret_presence:()=>assert.doesNotMatch(edge,/prerequisites_present:/),
 db_rpc_no_privilege_elevation:()=>{assert.match(sql,/LANGUAGE plpgsql SECURITY INVOKER/);assert.doesNotMatch(sql,/LANGUAGE plpgsql SECURITY DEFINER/);},
 db_rpc_service_only:()=>{assert.match(sql,/REVOKE ALL ON FUNCTION public\.mmh_n10a740_take_attempt\([\s\S]*?FROM PUBLIC, anon, authenticated;/);assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.mmh_n10a740_take_attempt\([\s\S]*?TO service_role;/);},
 db_username_uid_unique:()=>assert.match(sql,/user_id uuid NOT NULL UNIQUE REFERENCES auth\.users\(id\) ON DELETE CASCADE/),
 };
for(const [name,fn] of Object.entries(checks)){fn();process.stdout.write('PASS '+name+'\n');}
console.log('N10-A7.40 static checks completed:',Object.keys(checks).length);
