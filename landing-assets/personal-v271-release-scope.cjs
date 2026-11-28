/* Candidate-scoped V2 Personal release gate; no deployment or credentials.
 * Legacy Landing remains the default. Only the approved V2.0.71 Personal
 * branch, exact reviewed base and strictly bounded diff can use V2 checks.
 * Any unexpected path or runtime change fails closed; do not broaden by default.
 */
'use strict';
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const {createHash}=require('node:crypto');
const base='c73c94455dd36d8ad769bfe508a03dd92afe4140';
const personalBranch='personal/v2.0.71-settings-device-guide';
const runtime={
 'app.html':'666a1e4a07fa024be16e0c0b728d4d0f9e2b23d0',
 'images/mmhvault-install-desktop-v271.webp':'f86ffdaaab968d26ca37ad7720c69abfa4f3f6c6',
 'images/mmhvault-install-android-chrome-v271.webp':'569c7068953bd45cf46a8d80d8f9069c966e7aca',
 'images/mmhvault-install-ipad-v271.webp':'5b44c7bd1361b04bc19fd765d1ac27cc47752974',
 'images/mmhvault-install-ios-v271.webp':'14df6b3199ff962a1b4f15bce7fd88703cd9f952',
 'images/mmhvault-personal-v2-icon-180.png':'c4634e36bcea842cd723fa98e8a97bd0877edef1',
 'images/mmhvault-personal-v2-icon-192.png':'a098b3738f7d60cef098940422778e92438c627d',
 'images/mmhvault-personal-v2-icon-512.png':'712d9a9c93840d3787726721e49a779ab6cee44f'
};
const replacements={
 'index.html':[['/images/mmhvault-personal-v2-icon-180.png','/apple-touch-icon.png?v=pwa24-20261029'],['./mmh-manifest-v2.webmanifest?v=personal-v271','./mmh-manifest-v2.webmanifest']],
 'login.html':[['/images/mmhvault-personal-v2-icon-180.png','/apple-touch-icon.png?v=pwa24-20261029'],['./mmh-manifest-v2.webmanifest?v=personal-v271','./mmh-manifest-v2.webmanifest']],
 'mmh-manifest-v2.webmanifest':[['./images/mmhvault-personal-v2-icon-192.png','./images/icon-192.png?v=pwa26-20261029'],['./images/mmhvault-personal-v2-icon-512.png','./images/icon-512.png?v=pwa26-20261029']]
};
const allowed=new Set([...Object.keys(runtime),...Object.keys(replacements),
 'docs/PERSONAL_DEVELOPMENT_HANDOFF.md',
 'tests/personal-settings-currency-v265.mjs',
 'tests/personal-settings-details-browser-v267.mjs',
 'tests/personal-settings-font-browser-v265.mjs',
 'tests/personal-settings-home-browser-v266.mjs',
 'tests/personal-settings-install-browser-v265.mjs',
 'landing-assets/personal-v271-release-scope.cjs',
 'landing-assets/personal-v271-public-browser.cjs',
 '.github/workflows/landing-release-check.yml'
]);
const git=(...args)=>execFileSync('git',args,{maxBuffer:64*1024*1024});
const blob=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
function classify(event,head,baseSha,paths){
 if(event!=='pull_request'||head!==personalBranch)return 'legacy';
 assert.equal(baseSha,base,'Personal V2.0.71 base advanced: re-review required');
 assert(paths.length>0&&paths.every(p=>allowed.has(p)),'Personal V2.0.71 out-of-scope path: '+paths.filter(p=>!allowed.has(p)).join(', '));
 assert([...Object.keys(runtime),...Object.keys(replacements)].every(p=>paths.includes(p)),'Incomplete reviewed Personal candidate');
 return 'personal-v271';
}
function selfTest(){
 const paths=[...Object.keys(runtime),...Object.keys(replacements)];
 assert.equal(classify('pull_request',personalBranch,base,paths),'personal-v271');
 assert.equal(classify('pull_request','release/landing-seo-pwa-test',base,paths),'legacy');
 assert.equal(classify('push',personalBranch,base,paths),'legacy');
 for(const path of ['business.html','business/index.html','robots.txt','sitemap.xml','landing-assets/landing-release-check.cjs','production.sql','.github/workflows/deploy.yml'])assert.throws(()=>classify('pull_request',personalBranch,base,[...paths,path]));
 assert.throws(()=>classify('pull_request',personalBranch,'0'.repeat(40),paths));
 assert.throws(()=>classify('pull_request',personalBranch,base,paths.slice(1)));
}
function verify(){
 const event=process.env.MMH_GATE_EVENT||'';
 const head=process.env.MMH_GATE_HEAD||'';
 if(event!=='pull_request'||head!==personalBranch)return 'legacy';
 const baseSha=process.env.MMH_GATE_BASE||'';
 assert.equal(baseSha,base,'Personal V2.0.71 base advanced: re-review required');
 git('merge-base','--is-ancestor',base,'HEAD');
 const paths=git('diff','--no-renames','--name-only','-z',base,'HEAD').toString('utf8').split('\0').filter(Boolean);
 const mode=classify(event,head,baseSha,paths);
 for(const [path,expected] of Object.entries(runtime))assert.equal(blob(fs.readFileSync(path)),expected,'Reviewed Personal runtime changed: '+path);
 for(const [path,changes] of Object.entries(replacements)){
  let restored=fs.readFileSync(path,'utf8');
  for(const [after,before] of changes){
   assert.equal(restored.split(after).length,2,path+' reviewed PWA reference count');
   restored=restored.replace(after,before);
  }
  assert.deepEqual(Buffer.from(restored),git('show',base+':'+path),path+' unexpected non-PWA change');
 }
 return mode;
}
selfTest();
if(require.main===module){
 const mode=verify();
 process.stdout.write(mode+'\n');
}
