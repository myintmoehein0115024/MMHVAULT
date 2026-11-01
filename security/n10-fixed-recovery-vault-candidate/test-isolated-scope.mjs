// N10 PR #11: prevent unrelated production/Landing/finance edits sneaking
// into the separate Vault-only review branch. GitHub Actions checkout MUST
// use fetch-depth: 0; no deployment, credentials or network requests here.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const output=execFileSync('git',[
 'diff','--name-status','--no-renames','origin/main...HEAD'
],{encoding:'utf8',maxBuffer:2_000_000});

const entries=output.trim().split('\n').filter(Boolean).map(line=>{
 const [status,path,...extra]=line.split('\t');
 assert.equal(extra.length,0,'unexpected diff record');
 assert.ok(/^[A-Z][0-9]*$/.test(status),'invalid git status');
 assert.ok(path&&!path.includes('..'),'invalid path');
 return {status,path};
});
assert.ok(entries.length>0,'expected an independent Vault review diff');

// No wildcard approval for new SQL/Edge files: a new executable artifact
// requires explicitly updating and reviewing this safety allowlist.
const approvedSql=new Set([
 'n10_fixed_recovery_READ_ONLY_PREFLIGHT.sql',
 'n10_fixed_recovery_vault_STAGING_CANDIDATE.sql',
 'n10_installed_staging_vault_READ_ONLY_AUDIT_20261101.sql',
 'n10_staging_session_guard_V2_EMERGENCY_DISABLE_REVIEW_ONLY.sql',
 'n10_staging_session_guard_V2_UPGRADE_REVIEW_ONLY.sql'
]);
const approvedReviewCode=new Set([
 'index.ts',
 'mfa-assurance.mjs',
 'retire-joint-qa-edge-REVIEW_ONLY.ts',
 'session-guard.mjs',
 'test-backend-only-review.mjs',
 'test-isolated-scope.mjs',
 'test-mfa-assurance.mjs',
 'test-retired-joint-qa-stub.mjs',
 'test-session-guard.mjs',
 'test-session-upgrade-review.mjs'
]);
const allowed=path=>(
 path==='.github/workflows/n10-vault-backend-only-review.yml' ||
 /^docs\/N10_[A-Z0-9_]+\.md$/.test(path) ||
 (path.startsWith('docs/sql/')&&approvedSql.has(path.slice('docs/sql/'.length))) ||
 (path.startsWith('security/n10-fixed-recovery-vault-candidate/') &&
  approvedReviewCode.has(path.slice('security/n10-fixed-recovery-vault-candidate/'.length)))
);
for(const rejected of ['app.html','login.html','docs/sql/n10_unreviewed.sql',
 'security/n10-fixed-recovery-vault-candidate/unknown.ts',
 'security/n10-fixed-recovery-vault-candidate/unknown.sh',
 '.github/workflows/deploy-production.yml']){
 assert.equal(allowed(rejected),false,'unexpectedly allowed '+rejected);
}
const unexpected=entries.filter(x=>x.status.startsWith('D')||!allowed(x.path));
if(unexpected.length){
 console.error('REJECTED: N10 Vault review contains unexpected paths or deletions:');
 for(const item of unexpected) console.error(item.status+' '+item.path);
 process.exitCode=1;
}else{
 console.log('PASS scope: '+entries.length+' changes limited to disabled N10 Vault review');
}
