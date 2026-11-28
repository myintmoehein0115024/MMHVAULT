import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('./',import.meta.url);
const html=readFileSync(new URL('./preview/mfa.html',base),'utf8');
const js=readFileSync(new URL('./mfa.js',base),'utf8');
test('read-only Vault controls are on isolated MFA page, not production',()=>{
 for(const id of ['vaultPanel','vaultStatusBtn','vaultRevealBox','vaultPassword','vaultRevealBtn','vaultCrossCheck','vaultModal','vaultWords','vaultHide','vaultClose'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/id="vaultPanel"/);
 assert.match(html,/class="glass is-hidden" id="vaultPanel"/);
 assert.match(html,/role="dialog" aria-modal="true"/);
 assert.match(js,/const VAULT_EDGE=BASE\+'\/functions\/v1\/mmh-n10-username-vault-qa-20261103'/);
 assert.doesNotMatch(js,/vrypucmyrztxgiqhjspd|https:\/\/mmhvault\.com\b/);
});
test('authenticated session and AAL2 are mandatory for viewing original words',()=>{
 assert.match(js,/async function vaultRequest\(payload\)/);
 assert.match(js,/if\(!mfaVerified\|\|!owner\|\|!client\)throw Error\('aal2_required'\)/);
 assert.match(js,/await ownerAal2\(\)/);
 assert.match(js,/client\.auth\.getSession\(\)/);
 assert.match(js,/session\.expires_at\*1000<=Date\.now\(\)/);
 assert.match(js,/Authorization':'Bearer '\+session\.access_token/);
 assert.match(js,/credentials:'omit',cache:'no-store',redirect:'error'/);
 assert.match(js,/await vaultRequest\(\{action:'reveal',password\}\)/);
 assert.match(js,/if\(s===200&&value\.code==='recovery_key'\)/);
 assert.match(js,/if\(password\.length<6\|\|password\.length>20\)/);
});
test('B signed-session cross-owner attempt uses injected target owner and expects zero words',()=>{
 assert.match(js,/if\(owner!=='n10qa_b_20261103'\|\|!mfaVerified\|\|vaultBusy\)return/);
 assert.match(js,/await vaultRequest\(\{action:'reveal',target_username:'n10qa_a_20261103'\}\)/);
 assert.match(js,/s===400&&value\.code==='unexpected_request_field'&&\!\('words' in value\)/);
 assert.match(js,/vaultMessage\('crossPassed'\)/);
 assert.match(js,/setVisible\('vaultCrossCheck',owner==='n10qa_b_20261103'\)/);
});
test('recovery words are never persisted and immediately hidden on navigation or timeout',()=>{
 assert.match(js,/vaultHideTimer=setTimeout\(\(\)=>\{clearVaultWords\(\);vaultMessage\('expired'\);\},45000\)/);
 assert.match(js,/clearVaultWords\(\);vaultMessage\('expired'\)/);
 assert.match(js,/document\.addEventListener\('visibilitychange'/);
 assert.match(js,/window\.addEventListener\('pagehide'/);
 assert.match(js,/clearVault\(\);clearQr\(\)/);
 assert.match(js,/document\.createTextNode\(w\)/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|indexedDB|document\.cookie|innerHTML|console\.log|sendBeacon/);
});
test('reveal never attempts regenerate or overwrite existing fixed words',()=>{
 assert.doesNotMatch(js,/qa_initialize|backup_existing|rotate_recovery_key|replacePhrase|generateRecoveryWords/);
 assert.match(js,/await vaultRequest\(\{action:'status'\}\)/);
 assert.match(js,/await vaultRequest\(\{action:'reveal',password\}\)/);
 for(const lang of ['zh','en','my'])assert.match(js,new RegExp('(?:^|\\s)'+lang+':\\{title:', 'm'));
});
