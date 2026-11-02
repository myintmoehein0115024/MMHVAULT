// MMHVAULT N10 release-preview provenance and finance-immutability gate.
// Review-only: reads committed source and Git history. No user data or network.
import assert from 'node:assert/strict';
import {readFileSync,appendFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const m=JSON.parse(readFileSync('security/n10-release-composite/manifest.json','utf8'));
function git(args){return execFileSync('git',args,{encoding:'utf8',maxBuffer:12*1024*1024});}
function trimGit(args){return git(args).trim();}
assert.equal(m.schema,'mmhvault-n10-source-composite-v1');
assert.equal(m.production_release,'HOLD','QA is not a release authorization');
assert.equal(trimGit(['rev-parse','origin/main']),m.base_main,
 'Public main advanced since this snapshot. Resync before accepting a release.');
assert.equal(trimGit(['merge-base','origin/main','HEAD']),m.base_main,
 'Composite must be based on public main');
const sourceFiles=m.source_prs.flatMap(x=>x.include);
assert.equal(sourceFiles.length,36,'expected complete four-review source inventory');
assert.equal(new Set(sourceFiles).size,36,'no duplicate or overlapping paths');
const extras=[
 '.github/workflows/n10-release-composite-review.yml',
 'docs/N10_RELEASE_COMPOSITE_REVIEW_20261102.md',
 'security/n10-release-composite/check-composite.mjs',
 'security/n10-release-composite/manifest.json'
];
const allowed=new Set([...sourceFiles,...extras]);
assert.equal(allowed.size,40,'exact allowed 40-file review bundle');
const diff=trimGit(['diff','--name-status','--no-renames','origin/main...HEAD'])
 .split('\n').filter(Boolean).map(row=>row.split('\t'));
assert.equal(diff.length,allowed.size,'composite must change precisely 40 files');
for(const [status,path] of diff){
 assert.ok(allowed.delete(path),'out-of-scope or duplicated file: '+path);
 assert.ok(status==='A'||(status==='M'&&path==='app.html'),
  'review is not allowed to change existing production sources: '+path);
}
assert.equal(allowed.size,0,'missing required reviewed source files');
for(const pr of m.source_prs){
 assert.equal(trimGit(['rev-parse','origin/'+pr.branch]),pr.head,
  'source PR has moved: '+pr.number);
 for(const file of pr.include){
  const exact=trimGit(['rev-parse',pr.head+':'+file]);
  const copied=trimGit(['rev-parse','HEAD:'+file]);
  assert.equal(copied,exact,'modified copied source blob: '+file);
 }
 for(const omitted of pr.excluded){
  assert.ok(!diff.some(([,p])=>p===omitted),'original branch CI leaked into integration '+omitted);
 }
}
const off=[
 ['security/n10-fixed-recovery-vault-candidate/index.ts',/const RECOVERY_RELEASE_ENABLED=false/],
 ['security/n10-username-bind-candidate/index.ts',/const enabled=false/],
 ['security/n10-phrase-verify-candidate/index.ts',/const CANDIDATE_RELEASE_ENABLED=false/]
];
for(const [name,pattern] of off){
 assert.match(readFileSync(name,'utf8'),pattern,'backend candidate unexpectedly enabled: '+name);
}
assert.equal(trimGit(['diff','--name-only','origin/main...HEAD','--','login.html','js/mmhvault-n10-a7-69-username.js']),'',
 'deployed login and username script cannot change in source-only review');
assert.equal(trimGit(['diff','--name-only','origin/main...HEAD','--','index.html','landing-assets']),'',
 'Landing/SEO must stay identical to main');
// Reuse PR25's five audited Auth-source boundaries. Finance, cloud synchronization,
// PWA and every unrelated byte must remain identical to the current public App.
const appMain=git(['show','origin/main:app.html']);
const appCandidate=readFileSync('app.html','utf8');
function stripOnlyApprovedAuth(source,isCandidate){
 let copy=source;
 if(isCandidate){
  const intro='// Keep the callback synchronous; all subsequent Auth RPCs run in a macrotask.\n'+
    '// Masking and ticket invalidation above remain immediate.\n';
  assert.equal(copy.split(intro).length,2,'Auth callback audit comment changed');
  copy=copy.replace(intro,'');
  const start=copy.indexOf('// N10 app entry: an explicit legacy null AAL1 needs fresh Auth verification.\n');
  const end=copy.indexOf('let activeEnterUserId=""',start+1);
  assert.ok(start>=0&&end>start,'N10 Auth helper boundaries');
  copy=copy.slice(0,start)+copy.slice(end);
 }
 const sections=[
  ['function mmhvaultFinishAuthBootV3285(session){','/* P9.47:'],
  ['db.auth.onAuthStateChange((event,session)=>{','mmhvaultAuthBootTimerV3285=setTimeout('],
  ['async function enter(session){','async function copyCustomerIdV375(){'],
  ['async function mmhVaultReconcileSessionV1239(','window.mmhVaultHandleOnlineV1239='],
  ['function mmhVaultResumeLifecycleV1239(','function currency(a){']
 ];
 for(const [begin,end] of sections){
  const first=copy.indexOf(begin),last=copy.indexOf(end,first+begin.length);
  assert.ok(first>=0&&last>first,'approved Auth section boundary: '+begin);
  assert.equal(copy.indexOf(begin,first+1),-1,'duplicate Auth section: '+begin);
  copy=copy.slice(0,first)+'/* N10_AUTH_SCOPED_SECTION '+begin+' */\n'+copy.slice(last);
 }
 return copy;
}
assert.equal(stripOnlyApprovedAuth(appCandidate,true),stripOnlyApprovedAuth(appMain,false),
 'Finance/PWA/App data source differs outside the approved Auth sections');
console.log('PASS: frozen 36 source blobs and four audit files; no overlap or source drift.');
console.log('PASS: production login, Landing and entire finance/PWA source preserved.');
console.log('PASS: all three backend candidates stay hard-OFF. Production release HOLD.');
const report=[
 '### N10 composed review provenance',
 '- Public base: '+m.base_main.slice(0,12),
 '- Source commits: '+m.source_prs.map(p=>'PR #'+p.number+' '+p.head.slice(0,8)).join(', '),
 '- 36 identical candidate source blobs + 4 QA-only files',
 '- Non-Auth financial App and Landing/SEO: exactly preserved',
 '- All backend release flags OFF; no production deploy or real signed Auth',
 '- Production decision: HOLD (integration review is not deployment)'
].join('\n');
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,report+'\n');
