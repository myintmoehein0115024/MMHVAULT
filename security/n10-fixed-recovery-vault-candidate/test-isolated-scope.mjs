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

const allowed=path=>(
 path==='.github/workflows/n10-vault-backend-only-review.yml' ||
 /^docs\/N10_[A-Z0-9_]+\.md$/.test(path) ||
 /^docs\/sql\/n10_[A-Za-z0-9_.-]+\.sql$/.test(path) ||
 /^security\/n10-fixed-recovery-vault-candidate\/[A-Za-z0-9_.-]+$/.test(path)
);
const unexpected=entries.filter(x=>x.status.startsWith('D')||!allowed(x.path));
if(unexpected.length){
 console.error('REJECTED: N10 Vault review contains unexpected paths or deletions:');
 for(const item of unexpected) console.error(item.status+' '+item.path);
 process.exitCode=1;
}else{
 console.log('PASS scope: '+entries.length+' changes limited to disabled N10 Vault review');
}
