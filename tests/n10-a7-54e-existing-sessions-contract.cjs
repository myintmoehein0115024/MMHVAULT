/* N10-A7.54E — isolated QA browser-session contract.
 * Compares the exact production login page and locked QA JS; no live auth.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const login=fs.readFileSync('login.html','utf8');
const qa=fs.readFileSync('js/mmhvault-n10-a7-54b-liveflow.js','utf8');
const html=fs.readFileSync('n10-a7-53-qa.html','utf8');
const project='https://vrypucmyrztxgiqhjspd.supabase.co';
const publicKey='sb_publishable_H38v4XbO0ARnSJToD42wGg_27-SZ3Ao';
const sdk='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.js';
assert.ok(login.includes("const SUPABASE_URL='"+project+"'"));
assert.ok(login.includes("const SUPABASE_KEY='"+publicKey+"'"));
assert.ok(login.includes(sdk),'existing production login SDK version');
assert.match(login,/supabase\.createClient\(SUPABASE_URL,SUPABASE_KEY\)/);
assert.ok(!login.includes('storageKey:'),'login uses SDK origin/localStorage default key');
assert.ok(qa.includes("const PROJECT = '"+project+"';"));
assert.ok(qa.includes("const PUBLIC_KEY = '"+publicKey+"';"));
assert.ok(qa.includes("const SDK_URL = '"+sdk+"';"));
assert.match(qa,/auth:\{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false\}/);
assert.match(qa,/auth:\{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false\}/);
assert.match(qa,/const QA_CLOSED = true;/);
assert.match(qa,/const LIVE_REQUESTS_ALLOWED = false;/);
assert.match(qa,/const originReady = \(\) => location\.protocol==='https:' && location\.hostname==='mmhvault\.com';/);
assert.match(html,/noindex,nofollow/);
assert.equal((html.match(/<button disabled id="qa54b/g)||[]).length,4);
assert.match(qa,/await instance\.auth\.getUser\(\)/);
assert.match(qa,/await instance\.auth\.getSession\(\)/);
assert.match(qa,/session\.user\?\.id !== user\.id/);
assert.doesNotMatch(qa,/\.auth\.setSession\s*\(|(?:localStorage|sessionStorage)\s*\./);
assert.doesNotMatch(qa,/sb_secret_|service_role|N10A754_TEST_UID_[AB]/i);
const hash=str=>crypto.createHash('sha256').update(str).digest('hex').slice(0,14);
console.log('PASS N10-A7.54E: production login and closed QA agree on Supabase project/publishable key/SDK 2.57.4/default session storage; verified UID check and nonpersistent proof verifier; per-browser storage isolation remains a real browser responsibility; no live calls. Evidence SHA '+hash(login)+'/'+hash(qa));
