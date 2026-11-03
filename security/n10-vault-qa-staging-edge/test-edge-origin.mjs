import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const dir='security/n10-vault-qa-staging-edge/';
const v2=readFileSync(dir+'rollback/v2-index.ts','utf8');
const v3=readFileSync(dir+'index.ts','utf8');
const oldLine="const ORIGIN='https://myintmoehein0115024.github.io';";
const newLine="const ORIGIN='https://mmhvault-n10-vault-staging.pages.dev';";
assert(v2.includes(oldLine),'original v2 source must be immutable');
assert(v3.includes(newLine),'dedicated Staging-only Pages origin');
const originalStatus="return error||typeof data!=='boolean'?out(origin,'unavailable',503):out(origin,'backup_status',200,{backed_up:data});";
const revisedStatus="return error||typeof data!=='boolean'?out(origin,'unavailable',503):out(origin,'backup_status',200,{backed_up:data,window_expires_at:QA_WINDOW_END_UTC,server_utc_now:new Date().toISOString()});";
assert(v2.includes(originalStatus),'archived original status handler');
assert(v3.includes(revisedStatus),'only authenticated status provides UTC deadline and server clock');
assert.equal(v3,v2.replace(oldLine,newLine).replace(originalStatus,revisedStatus),'only QA origin and authenticated status metadata may change');
for(const source of [v2,v3]){
 assert(source.includes("const RECOVERY_RELEASE_ENABLED=false;"));
 assert(source.includes("const QA_WINDOW_END_UTC='1970-01-01T00:00:00.000Z';"));
 assert(source.includes('const QA_IDENTITIES=new Map<string,string>([]);'));
 assert(source.includes("const EXPECTED_BASE='https://ldivswlhtgmznzwhzsoi.supabase.co';"));
 assert(source.includes("if(origin!==ORIGIN)return out(origin,'origin_denied',403);"));
 assert(source.includes("if(!RECOVERY_RELEASE_ENABLED)return out(origin,'recovery_service_not_released',503);"));
 assert(!source.includes('vrypucmyrztxgiqhjspd'));
 assert(!source.includes("https://mmhvault.com"));
}
for(const dep of ['mfa-assurance.mjs','session-guard.mjs','session-aal.mjs']){
 const v=readFileSync(dir+dep,'utf8');
 assert(v.length>250);
}
console.log('PASS: Staging Edge differs from v2 only by QA origin and authenticated window status');
