// Offline UI leak-guard regression checks for the UNDEPLOYED fixed recovery feature.
// Static source contracts only: NOT a browser, database, password or signed-JWT test.
// Run: node security/n10-fixed-recovery-vault-candidate/test-ui-secret-guards.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
const src=readFileSync(resolve(dirname(fileURLToPath(import.meta.url)),
  '../../js/mmhvault-n10-a7-83-security-center.js'),'utf8');
const cases=[
 ['draft Vault UI release remains OFF at four independent entry points',()=>{
   assert.match(src,/const N10_FIXED_VAULT_UI_RELEASED=false;/);
   assert.match(src,/async function vaultApi\(action,extra=\{\}\)\{\s*if\(!N10_FIXED_VAULT_UI_RELEASED\)throw Error\('vault_release_locked'\)/);
   assert.match(src,/async function loadVaultMode\(\)\{\s*if\(!N10_FIXED_VAULT_UI_RELEASED\)\{vaultStatusMode\('unavailable'\);return;\}/);
   assert.match(src,/mmhN10VaultBackup'\)\.addEventListener\('click',async\(\)=>\{\s*if\(!N10_FIXED_VAULT_UI_RELEASED/);
   assert.match(src,/mmhN10VaultReveal'\)\.addEventListener\('click',async\(\)=>\{\s*if\(!N10_FIXED_VAULT_UI_RELEASED/);
 }],
 ['TOTP uses all-factor list to discover unverified records (synthetic behavior)',()=>{
   const helper=src.match(/function inspectTotpFactors\(data\)\{[\s\S]*?\n\}/)?.[0];
   assert.ok(helper,'missing pure factor classifier');
   const inspect=runInNewContext('('+helper+')',Object.create(null));
   const inventory={all:[
     {id:'pending-01',factor_type:'totp',status:'unverified'},
     {id:'verified-02',factor_type:'totp',status:'verified'},
     {id:'phone-03',factor_type:'phone',status:'verified'}
   ],totp:[{id:'verified-02',factor_type:'totp',status:'verified'}]};
   const got=inspect(inventory);
   assert.equal(got.allTotp.length,2);
   assert.equal(got.pending.length,1);
   assert.equal(got.pending[0].id,'pending-01');
   assert.equal(got.verified.length,1);
   assert.equal(got.verified[0].id,'verified-02');
   assert.equal(got.unknown.length,0);
   const missingFromTotp=inspect({all:[{id:'orphan',factor_type:'totp',status:'unverified'}],totp:[]});
   assert.equal(missingFromTotp.pending.length,1);
   assert.equal(missingFromTotp.verified.length,0);
   assert.equal(inspect({all:[]}).allTotp.length,0);
   assert.equal(inspect({all:[{factor_type:'totp',status:'unexpected'}]}).unknown.length,1);
   assert.throws(()=>inspect({totp:[]}),/factor_inventory_unavailable/);
   assert.throws(()=>inspect(null),/factor_inventory_unavailable/);
   assert.match(src,/const before=inspectTotpFactors\(existing\.data\)/);
   assert.match(src,/for\(const factor of before\.pending\)/);
   assert.match(src,/inspectTotpFactors\(checked\.data\)\.allTotp\.length!==0/);
   assert.doesNotMatch(src,/for\(const factor of \(existing\.data\?\.totp\|\|\[\]\)\.filter\(x=>x\.status==='unverified'\)\)/);
 }],
 ['new TOTP binding uses distinct name, owner recheck and confirms AAL2 plus verified factor',()=>{
   assert.match(src,/const name='MMHVAULT Authenticator '\+crypto\.randomUUID\(\)\.slice\(0,8\)/);
   assert.match(src,/const afterOwner=await verifiedUser\(\)/);
   assert.match(src,/afterOwner\.user\.id!==user\.id/);
   const flow=src.slice(src.indexOf("mmhA783TotpStart').addEventListener"),src.indexOf("mmhA783TotpConfirm').addEventListener"));
   const marks=[
     'const before=inspectTotpFactors(existing.data)',
     'for(const factor of before.pending)',
     'const checked=await client().auth.mfa.listFactors()',
     'inspectTotpFactors(checked.data).allTotp.length!==0',
     'const afterOwner=await verifiedUser()',
     'const {data,error}=await client().auth.mfa.enroll'
   ];
   let cursor=-1;
   for(const m of marks){const at=flow.indexOf(m);assert.ok(at>cursor,'expected ordered fail-closed step: '+m);cursor=at;}
   const verifier=src.slice(src.indexOf("mmhA783TotpConfirm').addEventListener"),src.indexOf("mmhA783KeyReveal').addEventListener"));
   const proof=[
     'await client().auth.mfa.verify',
     'await client().auth.mfa.getAuthenticatorAssuranceLevel()',
     "assurance.data?.currentLevel!=='aal2'",
     'await client().auth.mfa.listFactors()',
     'inspectTotpFactors(checked.data).verified.some(x=>x.id===id)',
     "clearMfa();status('Authenticator enabled."
   ];
   cursor=-1;
   for(const m of proof){const at=verifier.indexOf(m);assert.ok(at>cursor,'verification success must follow server check: '+m);cursor=at;}
 }],
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
