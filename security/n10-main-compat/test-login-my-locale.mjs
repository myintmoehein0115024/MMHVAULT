/* N10-only release regression: trilingual login without Auth/Recovery Key mutations. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const html=read('login.html');
const username=read('js/mmhvault-n10-a7-69-username.js');
const localeSource=read('js/mmhvault-n10-auth-my.js');
const sandbox={window:{}};
vm.runInNewContext(localeSource,sandbox,{timeout:1000});
const my=sandbox.window.MMHVAULT_N10_MY_LOCALE;

test('language controls expose English, Chinese and Burmese without changing login endpoint',()=>{
  for(const lang of ['en','zh','my'])assert.match(html,new RegExp('data-lang="'+lang+'"'));
  assert.match(html,/document\.documentElement\.lang=zh\(\)\?'zh-CN':currentLang==='my'\?'my':'en'/);
  assert.ok(html.indexOf('mmhvault-n10-auth-my.js')<html.indexOf('const T={'),'load the locale before translation initialization');
  assert.match(html,/window\.getMMHVAULTLanguage=\(\)=>currentLang/);
  assert.match(html,/\['en','zh','my'\]\.includes\(lang\)/);
  assert.match(html,/mmhvault_language_v3363/);
  assert.ok(html.includes('mmhvault.landing.language'));
  assert.match(html,/\.n10-mfa-eyebrow/);
  assert.match(html,/\.n10-mfa-footnote/);
  assert.match(username,/const tr=\(zh,en\)=>\{const lang=window\.getMMHVAULTLanguage/);
});

test('Burmese pack covers current login Chinese keys and username English dynamic messages',()=>{
  assert.equal(typeof my?.translate,'function');
  assert.equal(typeof my?.has,'function');
  const originalChineseTable=html.slice(html.indexOf('const T={'),html.indexOf('const buttons='));
  const chineseKeys=[...originalChineseTable.matchAll(/'([^']+)'\s*:/g)].map(match=>match[1]);
  const usernameEn=[...username.matchAll(/tr\(\s*'(?:\\'|[^'])*'\s*,\s*'((?:\\'|[^'])*)'/g)].map(match=>match[1]);
  const critical=[
    'Email or Username','Use Recovery Key','Username','Password',
    'Confirm backup & create account','Your permanent recovery key',
    'Enter your username and ten recovery words in the original order.',
    'Two-step verification','Authenticator code','Verify & continue',
    'Verification failed. Try a fresh code from your authenticator.',
    'Enter a valid email address or username.','Return to Sign In',
    'This recovery link is invalid or has expired. Request a new email from the Sign In page.'
  ];
  const missing=[...new Set([...chineseKeys,...usernameEn,...critical])].filter(k=>!my.has(k));
  assert.deepEqual(missing,[], 'every pre-existing translated label and tested sign-in status must have Burmese copy');
});

test('Burmese content changes labels only; English fallback is stable',()=>{
  for(const key of ['Password','Sign in with Google','Create a username account','Verify & continue']){
    const translated=my.translate(key);
    assert.ok(translated&&translated!==key&&/[\u1000-\u109f]/u.test(translated),key);
  }
  assert.equal(my.translate('unknown-key-stays-english'),'unknown-key-stays-english');
  assert.equal(my.translate('horse battery staple random secret'), 'horse battery staple random secret');
  assert.match(html,/const tr=authTrV1531;/);
  assert.match(html,/window\.translateMMHVAULTMessage\?\.\(en\)/);
  assert.match(username,/window\.translateMMHVAULTMessage\?\.\(en\)/);
});

test('all inline login scripts are syntactically valid',()=>{
  const matches=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  let count=0;
  for(const match of matches){
    if(!match[1].trim())continue;
    assert.doesNotThrow(()=>new vm.Script(match[1],{filename:'login-inline-script.js'}));
    count++;
  }
  assert.ok(count>=2);
});

test('Burmese UI has no authority to bypass backend security release gates',()=>{
  const reviewer=read('security/n10-username-escrow-candidate/username-edge-REVIEW-ONLY.ts');
  const vault=read('security/n10-production-vault-review/index.ts');
  assert.match(reviewer,/const RELEASE_ENABLED=false/);
  assert.match(vault,/const RECOVERY_RELEASE_ENABLED=false/);
  assert.doesNotMatch(localeSource,/fetch\s*\(|\.auth\.|sessionStorage|localStorage\.setItem|recovery_words\s*=/);
});
