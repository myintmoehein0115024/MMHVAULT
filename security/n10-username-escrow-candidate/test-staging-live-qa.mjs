import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {runInNewContext} from 'node:vm';
import {buildTemporaryQaBundle,WINDOW_END_UTC} from './build-staging-live-qa.mjs';

test('temporary Staging release is owner-scoped, two-name gated, timed, and non-production',async()=>{
 const root=await mkdtemp(join(tmpdir(),'n10-timed-qa-'));
 try{
  const result=await buildTemporaryQaBundle(root);
  assert.equal(result.autoExpires,true);
  assert.equal(result.stagingOnly,true);
  assert.equal(result.allowlistRequired,true);
  assert.equal(result.expiresAt,WINDOW_END_UTC);
  const s=await readFile(join(root,'index.ts'),'utf8');
  const checks=[
   "const PROJECT='ldivswlhtgmznzwhzsoi'",
   "const ORIGIN='https://mmhvault-n10-vault-staging.pages.dev'",
   "const QA_WINDOW_END_UTC='2026-11-04T13:00:00.000Z'",
   'function qaWindowOpen(){return RELEASE_ENABLED&&Date.now()<Date.parse(QA_WINDOW_END_UTC);}',
   'enabled:qaWindowOpen()&&configured()',
   "if(!qaWindowOpen())return reply(origin,'registration_not_released',503)",
   "if(!QA_ALLOWLIST.has(username))return reply(origin,'staging_qa_only',403)",
   "N10_STAGING_SIGNUP_TURNSTILE_SECRET",
   'QA_USERNAMES.length===2&&QA_ALLOWLIST.size===2',
   'mmh_n10_recovery_backup_put',
   'mmh_n10_recovery_backup_get'
  ];
  for(const check of checks)assert.ok(s.includes(check),'missing '+check);
  for(const unsafe of [/vrypucmyrztxgiqhjspd/,/https:\/\/mmhvault\.com\b/,/admin\.auth\.admin\.deleteUser\(/,/public_signup:true/,/N10A740_TURNSTILE_SECRET/])
   assert.doesNotMatch(s,unsafe);
  assert.ok(s.includes('const RELEASE_ENABLED=true;'));
  const script=s.match(/const RELEASE_ENABLED=true;[^\n]*\nconst QA_WINDOW_END_UTC='[^\n]+';\nfunction qaWindowOpen\(\)\{[^}]+\}/)?.[0];
  assert.ok(script,'expiry gate must be contiguous with feature gate');
  const js="(()=>{"+script+"; return qaWindowOpen();})()";
  const DateBefore={now:()=>Date.parse(WINDOW_END_UTC)-1000,parse:Date.parse};
  const DateAfter={now:()=>Date.parse(WINDOW_END_UTC)+1000,parse:Date.parse};
  assert.equal(runInNewContext(js,{Date:DateBefore}),true,'opens before expiration');
  assert.equal(runInNewContext(js,{Date:DateAfter}),false,'expires without redeployment');
 }finally{await rm(root,{recursive:true,force:true});}
});
