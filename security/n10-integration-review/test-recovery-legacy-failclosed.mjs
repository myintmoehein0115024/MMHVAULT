// N10: safely handle an existing verifier with no encrypted original.
// Offline synthetic tests; no backend, secrets or production account calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const src=readFileSync('js/mmhvault-n10-a7-83-security-center.js','utf8');
function block(a,b){
 const start=src.indexOf(a),end=src.indexOf(b,start);
 assert.ok(start>=0&&end>start);
 return src.slice(start,end);
}
const handler=block('async function loadVaultMode(){','function showVaultWords(words){');
const mode=block('function vaultStatusMode(mode){','function recoveryModalActive(){');
test('legacy encrypted-backfill feature stays separately OFF',()=>{
 assert.match(src,/const N10_FIXED_VAULT_UI_RELEASED=false;/);
 assert.match(src,/const N10_LEGACY_BACKFILL_RELEASED=false;/);
 assert.match(src,/if\(action==='backup_existing'&&!N10_LEGACY_BACKFILL_RELEASED\)/);
 assert.match(src,/!N10_FIXED_VAULT_UI_RELEASED\|\|!N10_LEGACY_BACKFILL_RELEASED\|\|busy/);
 assert.match(src,/!\['status','reveal'\]\.includes\(action\)/);
});
test('no encrypted backup means not_recoverable, never a password-only reveal',async()=>{
 let selection='',notice='',calls=0;
 const ctx={
  N10_FIXED_VAULT_UI_RELEASED:true,usernameOnly:true,
  secretEpoch:3,owner:'synthetic-owner',
  recoveryModalActive:()=>true,sameSecretRequest:()=>true,
  vaultApi:async()=>{calls++;return {ok:true,body:{code:'backup_status',backed_up:false}}},
  vaultStatusMode:next=>{selection=next},status:next=>{notice=next},
 };
 const fn=runInNewContext('('+handler+')',ctx);
 await fn();
 assert.equal(calls,1);
 assert.equal(selection,'not_recoverable');
 assert.match(notice,/cannot be recovered from the verifier/);
 assert.doesNotMatch(notice,/new words|regenerate/);
});
test('real encrypted backup can enter the existing read-only reveal mode',async()=>{
 let selection='';
 const ctx={
  N10_FIXED_VAULT_UI_RELEASED:true,usernameOnly:true,
  secretEpoch:1,owner:'synthetic-owner',recoveryModalActive:()=>true,
  sameSecretRequest:()=>true,vaultApi:async()=>({ok:true,body:{code:'backup_status',backed_up:true}}),
  vaultStatusMode:next=>{selection=next},status:()=>{},
 };
 await runInNewContext('('+handler+')',ctx)();
 assert.equal(selection,'ready');
});
test('backup button cannot appear even if mode was incorrectly set',()=>{
 const elements={
  mmhN10VaultRecoveryControls:{hidden:false},
  mmhN10VaultReveal:{hidden:false},
  mmhN10VaultBackup:{hidden:false},
  mmhN10VaultInfo:{textContent:'',dataset:{}},
  mmhA783PhrasePrivacy:{hidden:false},
  mmhA783KeyVerify:{hidden:false}
 };
 const oldNote={hidden:false},label={hidden:false},phrase={hidden:false};
 const ctx={
  N10_LEGACY_BACKFILL_RELEASED:false,
  vaultMode:'unknown',a783Text:val=>val,
  $:id=>elements[id],
  vaultRecovery:{querySelector:s=>s.includes(':scope > p')?oldNote:
     s.includes('label[')?label:phrase},
 };
 const fn=runInNewContext('('+mode+')',ctx);
 fn('backup_needed');
 assert.equal(elements.mmhN10VaultRecoveryControls.hidden,true);
 assert.equal(elements.mmhN10VaultBackup.hidden,true);
 assert.equal(elements.mmhN10VaultReveal.hidden,true);
 assert.equal(label.hidden,false);
 fn('ready');
 assert.equal(elements.mmhN10VaultRecoveryControls.hidden,false);
 assert.equal(elements.mmhN10VaultReveal.hidden,false);
 assert.equal(elements.mmhN10VaultBackup.hidden,true);
});
test('legacy warning is present in all three Recovery UI languages',()=>{
 const message='No encrypted copy exists for this account. The original ten words cannot be recovered from the verifier. If you saved them, you can still verify them here.';
 assert.match(src,/Object\.assign\(A783_DYNAMIC_ZH,/);
 assert.ok(src.includes("'"+message+"':'该账户没有加密保存原始十词"));
 assert.ok(src.includes("'"+message+"':'ဤအကောင့်"));
});
