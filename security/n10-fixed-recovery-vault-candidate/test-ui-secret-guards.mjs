// Offline UI leak-guard regression checks for the UNDEPLOYED fixed recovery feature.
// Static source contracts only: NOT a browser, database, password or signed-JWT test.
// Run: node security/n10-fixed-recovery-vault-candidate/test-ui-secret-guards.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const src=readFileSync(resolve(dirname(fileURLToPath(import.meta.url)),
  '../../js/mmhvault-n10-a7-83-security-center.js'),'utf8');
const cases=[
 ['all recovery views use 45s auto-hide',()=>{
   assert.equal((src.match(/clearTimer=setTimeout\(hideKey,45000\)/g)||[]).length,2);
   assert.doesNotMatch(src,/clearTimer=setTimeout\(hideKey,60000\)/);
 }],
 ['UI never claims 60s recovery-key view',()=>{
   assert.doesNotMatch(src,/Saved words verified.*60 seconds/);
   assert.doesNotMatch(src,/恢复词验证通过，60 秒后自动隐藏/);
 }],
 ['explicitly clears password and words on hide',()=>{
   assert.match(src,/function hideKey\(\)[\s\S]*?verifiedPhrase='';[\s\S]*?mmhA783KeyQr'[\s\S]*?replaceChildren\(\)/);
   assert.match(src,/function hideKey\(\)[\s\S]*?mmhA783Phrase'\)\.value=''/);
   assert.match(src,/function hideKey\(\)[\s\S]*?mmhN10VaultPassword'[\s\S]*?field\.value=''/);
 }],
 ['request owner, epoch and active-modal bound',()=>{
   assert.match(src,/epoch===secretEpoch&&userId===owner&&recoveryModalActive\(\)/);
   assert.match(src,/if\(!sameSecretRequest\(epoch,userId\)\)return/);
 }],
 ['secret response is discarded on logout and account switch',()=>{
   assert.match(src,/event==='SIGNED_OUT'\|\|\(event==='SIGNED_IN'&&owner&&session\?\.user\?\.id!==owner\)/);
   assert.match(src,/if\(event==='SIGNED_OUT'\)owner=''/);
 }],
 ['backgrounding and navigation hide the phrase',()=>{
   assert.match(src,/document\.addEventListener\('visibilitychange',[\s\S]*?if\(document\.hidden\)\{hideKey\(\)/);
   assert.match(src,/window\.addEventListener\('pagehide',[\s\S]*?hideKey\(\)/);
 }],
 ['modal closure immediately hides the phrase',()=>{
   assert.match(src,/if\(section\.id==='mmhA783Recovery'\)\{hideKey\(\)/);
 }],
 ['password field matches server max and uses password input',()=>{
   assert.match(src,/id="mmhN10VaultPassword" type="password"[^\n]*maxlength="20"/);
 }],
 ['backup normalizes whitespace identically to original verification',()=>{
   assert.equal((src.match(/\.replace\(\/\\s\+\/g,' '\)/g)||[]).length>=2,true);
   assert.doesNotMatch(src,/\.replace\(\/\\\\s\+\/g,' '\)/);
 }],
 ['QR save requires currently visible verified secret',()=>{
   assert.match(src,/if\(!verifiedPhrase\)return;/);
   assert.match(src,/verifiedPhrase='';/);
 }],
];
let fail=0;
for(const [name,test] of cases){
 try{test();console.log('PASS',name)}
 catch(e){fail++;console.error('FAIL',name,e.message)}
}
console.log(`${cases.length-fail}/${cases.length} UI secret-guard static checks`);
if(fail)process.exitCode=1;
