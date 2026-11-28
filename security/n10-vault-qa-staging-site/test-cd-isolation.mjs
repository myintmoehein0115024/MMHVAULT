// Offline C/D-only Staging QA UI; zero credentials or network requests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('./',import.meta.url);
const f=name=>readFileSync(new URL(name,root),'utf8');
const pages=[f('preview/cd-signup.html'),f('preview/cd-mfa.html')];
const clients=[f('cd-signup.js'),f('cd-mfa.js')];
test('C/D pages are independent and noindexed',()=>{
 assert.match(pages[0],/src="\.\.\/cd-signup\.js"/);
 assert.match(pages[1],/src="\.\.\/cd-mfa\.js"/);
 assert.match(pages[1],/value="n10qa_c_20261104"/);
 assert.match(pages[1],/value="n10qa_d_20261104"/);
 for(const html of pages){assert.match(html,/noindex,nofollow,noarchive/);assert.match(html,/viewport-fit=cover/);}
});
test('C/D clients use dedicated backend services and owner selector rejection',()=>{
 assert.match(clients[0],/const NAME_RE=\/\^\(\?:n10qa_c_20261104\|n10qa_d_20261104\)\$\//);
 assert.match(clients[1],/const ALLOWED=Object\.freeze\(\['n10qa_c_20261104','n10qa_d_20261104'\]\)/);
 assert.match(clients[0],/mmh-n10-staging-username-escrow-cd-20261104/);
 assert.match(clients[1],/mmh-n10-staging-username-escrow-cd-20261104/);
 assert.match(clients[1],/mmh-n10-username-vault-qa-cd-20261104/);
 assert.match(clients[1],/target_username:'n10qa_c_20261104'/);
 assert.match(clients[1],/owner==='n10qa_d_20261104'/);
});
test('do not reference A/B or Production services; secrets remain volatile',()=>{
 for(const source of pages.concat(clients)){
  assert.doesNotMatch(source,/n10qa_[ab]_20261103/);
  assert.doesNotMatch(source,/mmh-n10-staging-username-escrow-20261103/);
  assert.doesNotMatch(source,/mmh-n10-username-vault-qa-20261103/);
  assert.doesNotMatch(source,/vrypucmyrztxgiqhjspd|https:\/\/mmhvault\.com\//);
  assert.doesNotMatch(source,/localStorage\.setItem|sessionStorage\.setItem|document\.cookie\s*=/);
 }
 assert.match(clients[0],/clearPhrase\(\)/);
 assert.match(clients[1],/clearVaultWords\(\)/);
 assert.match(clients[1],/45000/);
});
