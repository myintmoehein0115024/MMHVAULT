// N10 isolated Recovery Vault EN/ZH/MY language checks. No actual Auth,
 // secrets, Vault requests or production code loading.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync('js/mmhvault-n10-a7-83-security-center.js','utf8');
const start=source.indexOf('const A783_RECOVERY_MY=Object.freeze({');
const end=source.indexOf('const totpSetup=',start);
assert.ok(start>0&&end>start,'missing isolated trilingual Recovery Vault translations');
const functions=source.slice(start,end);
const zh={
 'View original 10 words':'查看原始十词',
 'Confirm current password':'验证当前密码'
};
function fixture(savedLang,htmlLang='en'){
 let value=savedLang;
 const ctx={
  A783_DYNAMIC_ZH:{},A783_STATIC_ZH:zh,
  localStorage:{getItem:()=>value},
  document:{documentElement:{lang:htmlLang}},
 };
 runInNewContext(functions+'\nthis.translate=a783Text;this.readLanguage=a783Language;this.getMyanmarKeys=()=>Object.keys(A783_RECOVERY_MY);',ctx);
 return {translate:value=>ctx.translate(value),getLanguage:()=>ctx.readLanguage(),
   keys:()=>Array.from(ctx.getMyanmarKeys()),setLanguage:next=>{value=next}};
}
test('English remains the default; missing translation falls back safely',()=>{
 const h=fixture('en');
 assert.equal(h.getLanguage(),'en');
 assert.equal(h.translate('View original 10 words'),'View original 10 words');
 assert.equal(h.translate('unknown_label'),'unknown_label');
});
test('Chinese continues to use the original mappings',()=>{
 const h=fixture('zh-CN');
 assert.equal(h.getLanguage(),'zh');
 assert.equal(h.translate('View original 10 words'),'查看原始十词');
});
test('Myanmar selection translates Recovery Vault controls and security guidance',()=>{
 const h=fixture('my');
 assert.equal(h.getLanguage(),'my');
 for(const label of [
  'Permanent recovery key','Confirm current password','Secure my original 10 words',
  'View original 10 words','This private key view automatically closes after 45 seconds. Never share these words or the QR code.',
  'Your fixed original recovery key is securely backed up. Confirm your password to view it.',
  'One-time setup: enter your previously saved original ten words and password to protect this SAME key.'
 ]){
  assert.ok(h.keys().includes(label),'missing Burmese phrase: '+label);
  const actual=h.translate(label);
  assert.notEqual(actual,label);
  assert.ok(/[\u1000-\u109f]/.test(actual),'not Burmese: '+label);
 }
});
test('Myanmar locale aliases and switching without remounting Auth',()=>{
 const h=fixture('en');
 h.setLanguage('mm');assert.equal(h.getLanguage(),'my');
 assert.ok(/[\u1000-\u109f]/.test(h.translate('View original 10 words')));
 h.setLanguage('bur');assert.equal(h.getLanguage(),'my');
 h.setLanguage('zh');assert.equal(h.getLanguage(),'zh');
 assert.equal(h.translate('Confirm current password'),'验证当前密码');
 h.setLanguage('en');assert.equal(h.getLanguage(),'en');
 assert.equal(h.translate('Confirm current password'),'Confirm current password');
});
test('HTML lang is used if no local preference exists',()=>{
 const h=fixture(null,'my-MM');
 assert.equal(h.getLanguage(),'my');
});
test('language change updates existing Vault note and password placeholder',()=>{
 assert.match(source,/note\.dataset\.mmhA783DynamicEn=noteKey;/);
 assert.match(source,/document\.querySelectorAll\('\[data-mmh-a783-dynamic-en\]'\)/);
 assert.match(source,/vaultPassword\.placeholder=/);
 assert.match(source,/window\.addEventListener\('mmhvault-language-change',a783RenderLanguage\)/);
 assert.match(source,/const N10_FIXED_VAULT_UI_RELEASED=false;/);
});
