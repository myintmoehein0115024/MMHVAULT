// Offline-only regression tests: no network, secrets, Auth or Supabase writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {runInNewContext} from 'node:vm';
import {buildStagingBundle} from './build-staging-bundle.mjs';
import {createEscrowedUsernameEnrollment} from './immutable-signup-escrow.mjs';

async function withBundle(run){
 const dir=await mkdtemp(join(tmpdir(),'n10-staging-bundle-'));
 try{
  const summary=await buildStagingBundle(dir);
  const edge=await readFile(join(dir,'index.ts'),'utf8');
  return await run({dir,summary,edge});
 }finally{await rm(dir,{recursive:true,force:true});}
}
test('Staging build is hard OFF and bound only to the Staging project and preview origin',async()=>{
 await withBundle(async({dir,summary,edge})=>{
  assert.equal(summary.stagingOnly,true);
  assert.equal(summary.releaseEnabled,false);
  assert.equal(summary.deployPerformed,false);
  assert.deepEqual((await readdir(dir)).sort(),['immutable-signup-escrow.mjs','index.ts']);
  assert.match(edge,/const RELEASE_ENABLED=false;/);
  assert.match(edge,/const PROJECT='ldivswlhtgmznzwhzsoi';/);
  assert.match(edge,/const ORIGIN='https:\/\/mmhvault-n10-vault-staging\.pages\.dev';/);
  assert.match(edge,/const SITE_HOST='mmhvault-n10-vault-staging\.pages\.dev';/);
  assert.match(edge,/const ALIAS_DOMAIN='no-mail\.n10-staging\.mmhvault\.invalid';/);
  assert.match(edge,/mmh-a769-prod/); // existing Staging Vault verifier protocol
  assert.match(edge,/const HMAC=Deno\.env\.get\('N10_FIXED_RECOVERY_QA_HMAC_KEY'\)\|\|'';/);
  assert.match(edge,/const CAPTCHA=Deno\.env\.get\('N10_STAGING_SIGNUP_TURNSTILE_SECRET'\)\|\|'';/);
  assert.match(edge,/N10_STAGING_SIGNUP_QA_USERNAMES/);
  assert.match(edge,/QA_USERNAMES\.length===2&&QA_ALLOWLIST\.size===2/);
  assert.match(edge,/if\(!QA_ALLOWLIST\.has\(username\)\)return reply\(origin,'staging_qa_only',403\);/);
  assert.doesNotMatch(edge,/N10A740_TURNSTILE_SECRET/);
  assert.match(edge,/production:false,qa_only:true,limited_signup:false,public_signup:false/);
  assert.match(edge,/if\(!RELEASE_ENABLED\)return reply\(origin,'registration_not_released',503\);/);
  assert.doesNotMatch(edge,/vrypucmyrztxgiqhjspd|https:\/\/mmhvault\.com\b|production:true|public_signup:true|const RELEASE_ENABLED=true;/);
  assert.doesNotMatch(edge,/admin\.auth\.admin\.deleteUser\(/);
  assert.match(edge,/if\(quarantineRequired\)return false;/);
  assert.match(edge,/backupPossiblyWritten=true;/);
  assert.match(edge,/if\(sessionAttempted\|\|backupPossiblyWritten\)\{/);
  assert.match(edge,/rollbackNewUser:async\(\{newlyCreatedUserId\}\)=>\{\s*quarantineRequired=true;/);
  assert.ok(summary.files.every(f=>/^[a-f0-9]{64}$/.test(f.sha256)));
 });
});
test('Staging build cannot write outside ephemeral tmp',async()=>{
 for(const path of ['', '/', '.',join(process.cwd(),'security'),
   '/tmp/../etc/n10-staging','/var/tmp/n10-staging']){
  await assert.rejects(buildStagingBundle(path));
 }
});
test('A simulated failed Vault escrow quarantines ONLY the just-created Staging user, never deletes',async()=>{
 await withBundle(async({edge})=>{
  const start=edge.indexOf('async function enroll(username,pwd,ticket,input){');
  const end=edge.indexOf('async function loginPassword(username,pwd){');
  assert.ok(start>0&&end>start);
  const handler=edge.slice(start,end);
  const owner='41111111-1111-4111-8111-111111111111';
  const ticket='51111111-1111-4111-8111-111111111111';
  const phrase='alpha bravo charlie delta echo foxtrot golf hotel india juliet';
  const actions=[];
  let savedUser=null;
  const admin={
   rpc:async(name)=>{
    actions.push(name);
    if(name==='mmh_n10_recovery_backup_exists')return {data:false,error:null};
    if(name==='mmh_n10a769_claim_enrollment')return {data:true,error:null};
    if(name==='mmh_n10_recovery_backup_put')return {data:null,error:Error('synthetic put unavailable')};
    throw Error('unexpected rpc '+name);
   },
   from:()=>({
    insert:async()=>({error:null}),
    delete:()=>{actions.push('releaseReservation');return {eq:()=>({eq:()=>Promise.resolve({error:null})})};}
   }),
   auth:{admin:{
    createUser:async({email,app_metadata})=>{
     actions.push('createUser');
     savedUser={id:owner,email,app_metadata};
     return {data:{user:savedUser},error:null};
    },
    getUserById:async()=>({data:{user:savedUser},error:null}),
    updateUserById:async(id,arg)=>{
     actions.push('banUser:'+id);
     assert.equal(id,owner);assert.ok(arg.ban_duration);
     return {error:null};
    },
    deleteUser:async()=>{throw Error('MUST NOT DELETE');}
   }}
  };
  const ctx={
   normalizedPhrase:v=>v===phrase?v:null,
   quota:async()=>true,mac:async()=> 'synthetic-mac',
   admin,crypto:{randomUUID:()=> '77777777-7777-4777-8777-777777777777'},
   ALIAS_DOMAIN:'no-mail.n10-staging.mmhvault.invalid',
   createEscrowedUsernameEnrollment
  };
  const enroll=runInNewContext('('+handler.trim()+')',ctx);
  const result=await enroll('synthetic_owner','syntheticPwd9',ticket,phrase);
  assert.equal(result.code,'auth_unavailable');
  assert.ok(actions.includes('banUser:'+owner));
  assert.ok(!actions.includes('deleteUser'));
  assert.ok(!actions.includes('releaseReservation'),'manual reconciliation keeps claimed name for 30 minutes');
  assert.ok(!actions.includes('mmh_n10_recovery_backup_get'));
 });
});
