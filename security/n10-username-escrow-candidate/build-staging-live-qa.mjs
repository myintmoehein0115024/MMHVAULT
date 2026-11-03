/**
 * N10 AUTH STAGING: temporary two-user QA release bundle, explicit expiry.
 * NOT production. NOT deployed by CI. OFF automatically after UTC deadline.
 * Separately authorized owner testing scope: Staging-only synthetic A/B.
 * Used only alongside the existing hard-OFF review bundle.
 */
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join,resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {buildStagingBundle} from './build-staging-bundle.mjs';

export const WINDOW_END_UTC='2026-11-04T13:00:00.000Z';
function one(src,from,to){
 assert.equal(src.split(from).length,2,'QA reviewed anchor drift: '+from.slice(0,80));
 return src.replace(from,to);
}
export async function buildTemporaryQaBundle(target){
 assert.equal(typeof target,'string','output path required');
 const output=resolve(target||'.');
 assert.ok(output.startsWith(resolve(tmpdir())+sep) && !target.includes('..'),'only isolated /tmp output');
 const working=await mkdtemp(join(tmpdir(),'n10-staging-source-'));
 try{
  await buildStagingBundle(working);
  let src=await readFile(join(working,'index.ts'),'utf8');
  const helper=await readFile(join(working,'immutable-signup-escrow.mjs'),'utf8');
  src=one(src,"const RELEASE_ENABLED=false; // REVIEW ONLY. DO NOT DEPLOY OR ENABLE.",
            "const RELEASE_ENABLED=true; // STAGING only, expires automatically.");
  // Different review versions use a different exact comment. Fail when both drift.
  src=one(src,"const RELEASE_ENABLED=true; // STAGING only, expires automatically.",
            "const RELEASE_ENABLED=true; // TEST-ONLY with expiry and strict QA allowlist.\nconst QA_WINDOW_END_UTC='"+WINDOW_END_UTC+"';\nfunction qaWindowOpen(){return RELEASE_ENABLED&&Date.now()<Date.parse(QA_WINDOW_END_UTC);}");
  src=one(src,"enabled:RELEASE_ENABLED&&configured()","enabled:qaWindowOpen()&&configured()");
  src=one(src,"if(!RELEASE_ENABLED)return reply(origin,'registration_not_released',503);",
            "if(!qaWindowOpen())return reply(origin,'registration_not_released',503);");
  assert.match(src,/const PROJECT='ldivswlhtgmznzwhzsoi';/);
  assert.match(src,/const ORIGIN='https:\/\/mmhvault-n10-vault-staging\.pages\.dev';/);
  assert.match(src,/const CAPTCHA=Deno\.env\.get\('N10_STAGING_SIGNUP_TURNSTILE_SECRET'\)\|\|'';/);
  assert.match(src,/QA_USERNAMES\.length===2&&QA_ALLOWLIST\.size===2/);
  assert.match(src,/if\(!QA_ALLOWLIST\.has\(username\)\)return reply\(origin,'staging_qa_only',403\);/);
  assert.match(src,/if\(!qaWindowOpen\(\)\)return reply\(origin,'registration_not_released',503\);/);
  assert.match(src,/const QA_WINDOW_END_UTC='2026-11-04T13:00:00\.000Z';/);
  assert.doesNotMatch(src,/vrypucmyrztxgiqhjspd|https:\/\/mmhvault\.com\b|admin\.auth\.admin\.deleteUser\(/);
  assert.doesNotMatch(src,/N10A740_TURNSTILE_SECRET|production:true|public_signup:true/);
  await mkdir(output,{recursive:true});
  await writeFile(join(output,'index.ts'),src,{mode:0o600});
  await writeFile(join(output,'immutable-signup-escrow.mjs'),helper,{mode:0o600});
  return {expiresAt:WINDOW_END_UTC,stagingOnly:true,allowlistRequired:true,autoExpires:true};
 }finally{await rm(working,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await buildTemporaryQaBundle(process.argv[2]);
 console.log(JSON.stringify(result));
}
