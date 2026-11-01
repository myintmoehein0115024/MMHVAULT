// N10 MFA-only: review changes are restricted to explicit files.
// Read-only local git check; no network, DB, Auth, Vault, or deployment.
// Run with actions/checkout fetch-depth: 0.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const allowed=new Set([
 '.github/workflows/n10-mfa-only-review.yml',
 'docs/N10_MFA_ONLY_PRODUCTION_RELEASE_RUNBOOK_20261101.md',
 'docs/N10_MFA_ONLY_REVIEW_CANDIDATE_20261101.md',
 'js/mmhvault-n10-a7-83-security-center.js',
 'security/n10-mfa-only/test-browser-mfa-smoke.mjs',
 'security/n10-mfa-only/test-change-scope.mjs',
 'security/n10-mfa-only/test-mfa-isolation.mjs',
 'security/n10-mfa-only/test-real-app-dom-bootstrap.mjs'
]);
for(const denied of ['app.html','login.html','index.html','docs/sql/n10_unreviewed.sql',
 'security/n10-mfa-only/unreviewed.ts','.github/workflows/deploy.yml']){
 assert.equal(allowed.has(denied),false);
}
const lines=execFileSync('git',['diff','--name-status','--no-renames','origin/main...HEAD'],
 {encoding:'utf8',maxBuffer:2000000}).trim().split('\n').filter(Boolean);
assert.ok(lines.length>0,'review branch has no changes');
const bad=[];
for(const line of lines){
 const parts=line.split('\t');
 assert.equal(parts.length,2,'unusual git diff record');
 const [status,path]=parts;
 if(!/^[AMT]$/.test(status)||!allowed.has(path))bad.push({status,path});
}
if(bad.length){
 console.error('FAIL: MFA-only contains unexpected edits or deletions:',bad);
 process.exitCode=1;
}else console.log('PASS: '+lines.length+' MFA-only review files; no App, login, Landing, Vault or finance diff');


// MAIN_DRIFT_OVERLAP_GUARD: additionally block changes to the same file on
// current main and this review branch since their common ancestor. GitHub
// mergeable=true alone does not replace this explicit independent check.
// This runs read-only with the checkout's fetched origin/main and local git.
const baseSha=execFileSync('git',['merge-base','origin/main','HEAD'],{
 encoding:'utf8',maxBuffer:2000000
}).trim();
assert.match(baseSha,/^[a-f0-9]{40}$/,'missing merge base for main drift check');
const mainChanged=new Set(execFileSync('git',[
 'diff','--name-only','--no-renames',baseSha,'origin/main'
],{encoding:'utf8',maxBuffer:2000000}).trim().split('\n').filter(Boolean));
const branchPaths=new Set(
 lines.map(line=>line.split('\t')[1])
);
const overlap=[...branchPaths].filter(path=>mainChanged.has(path));
if(overlap.length){
 console.error('BLOCKED: these N10 files also changed on current main:',overlap);
 process.exitCode=1;
}else{
 console.log('PASS: no overlapping main drift ('+mainChanged.size+
   ' main paths checked against '+branchPaths.size+' N10 paths)');
}
