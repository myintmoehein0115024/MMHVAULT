'use strict';
// Read-only scan of all fetched, reachable Git blobs. Never prints secret values.
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
function git(args,options={}) {return execFileSync('git',args,{encoding:'utf8',maxBuffer:128*1024*1024,...options});}
const entries=git(['rev-list','--objects','--all']).trim().split('\n').filter(Boolean);
const ids=[...new Set(entries.map(line=>line.split(' ')[0]))];
const blobPaths=new Map(entries.map(line=>[line.split(' ')[0],line.slice(41)]));
const metadata=git(['cat-file','--batch-check=%(objectname) %(objecttype) %(objectsize)'],{input:ids.join('\n')+'\n'});
const mainBlobs=new Set(git(['ls-tree','-r','origin/main']).split('\n').map(s=>s.match(/^\d+ blob ([a-f0-9]{40})\t/)).filter(Boolean).map(m=>m[1]));
const rules=[
 ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
 ['github-access-token',/(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9_]{20,})/g],
 ['supabase-secret',/sb_secret_[A-Za-z0-9_-]{16,}/g],
 ['aws-access-key',/AKIA[0-9A-Z]{16}/g],
 ['stripe-live-key',/(?:sk|rk)_live_[A-Za-z0-9]{16,}/g],
 ['slack-secret',/xox[baprs]-[A-Za-z0-9-]{20,}/g],
 ['credential-assignment',/(?:SUPABASE_SERVICE_ROLE_KEY|service_role_key|CF_API_TOKEN|CLOUDFLARE_API_TOKEN|OPENAI_API_KEY|JWT_SECRET|SMTP_PASSWORD)\s*[:=]\s*['"](?!(?:process\.env|import\.meta|\$\{|YOUR_|<))[A-Za-z0-9_./+=-]{18,}['"]/g],
 ['service-role-jwt',/(?:service_role|SERVICE_ROLE)[^\n]{0,60}eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{15,}/g]
];
const maxBytes=8*1024*1024;
let blobs=0,scanned=0,skippedLarge=0,skippedBinary=0,errors=0,matchedObjects=0,mainMatches=0,historicalOnlyMatches=0;
const counts=Object.fromEntries(rules.map(([n])=>[n,0]));
const fingerprints=new Set();
const categories={frontend:0,server:0,tests:0,docs:0,workflow:0,other:0};
const assignmentNames={};
const assignmentKinds={fixtureMarkers:0,noFixtureMarkers:0,structuredJwt:0,longOpaque:0};
const uniqueAssignments=new Map();
for(const line of metadata.trim().split('\n')) {
 const [id,type,sizeStr]=line.split(' ');
 if(type!=='blob')continue;
 blobs++;
 const size=Number(sizeStr);
 if(!Number.isFinite(size)||size>maxBytes){skippedLarge++;continue;}
 let buf;
 try{buf=execFileSync('git',['cat-file','blob',id],{maxBuffer:maxBytes+1024,timeout:30000});}
 catch{errors++;continue;}
 if(buf.includes(0)){skippedBinary++;continue;}
 scanned++;
 const body=buf.toString('utf8');
 let found=false;
 for(const [name,pattern] of rules) {
  pattern.lastIndex=0;
  const matches=[...body.matchAll(pattern)];
  if(matches.length){
   counts[name]++;found=true;
   for(const m of matches){
    const digest=createHash('sha256').update(m[0]).digest('hex');
    fingerprints.add(digest);
    if(name==='credential-assignment'){
     const label=(m[0].match(/^[A-Za-z_]+/)||['unknown'])[0];
     const v=(m[0].match(/['"]([^'"]+)['"]$/)||[])[1]||'';
     const context=body.slice(Math.max(0,m.index-180),Math.min(body.length,m.index+m[0].length+180));
     const fixture=/(?:fake|mock|dummy|fixture|test[-_ ]|sample|example|placeholder|testonly)/i.test(context);
     if(!uniqueAssignments.has(digest))uniqueAssignments.set(digest,{label,fixture,length:v.length,jwt:/^eyJ[a-zA-Z0-9_-]+\./.test(v),opaque:/^[a-zA-Z0-9_-]{32,}$/.test(v)});
    }
   }
  }
 }
 if(found){
  matchedObjects++;
  if(mainBlobs.has(id))mainMatches++;else historicalOnlyMatches++;
  const p=blobPaths.get(id)||'';
  const group=/^(?:tests\/|security\/|landing-assets\/.*(?:check|test)\.cjs)/.test(p)?'tests':
   /^(?:docs\/|email-templates\/)/.test(p)?'docs':
   /^\.github\//.test(p)?'workflow':
   /^analytics-worker\/src\//.test(p)?'server':
   /^(?:js\/|app\.html$|login\.html$|admin\.html$|index\.html$)/.test(p)?'frontend':'other';
  categories[group]++;
 }
}
for(const item of uniqueAssignments.values()){
 assignmentNames[item.label]=(assignmentNames[item.label]||0)+1;
 assignmentKinds[item.fixture?'fixtureMarkers':'noFixtureMarkers']++;
 if(item.jwt)assignmentKinds.structuredJwt++;
 if(item.opaque)assignmentKinds.longOpaque++;
}
console.log(JSON.stringify({reachableObjects:ids.length,blobObjects:blobs,scannedTextBlobs:scanned,skippedBinary,skippedLarge,errors,matchedObjects,mainMatches,historicalOnlyMatches,distinctMatchedPatterns:fingerprints.size,matchObjectCategories:categories,assignmentNames,assignmentKinds,matchedRuleCounts:counts},null,2));
// Intentionally omit paths, object IDs, matched lines and secret values from public logs.
if(matchedObjects||skippedLarge||errors)process.exitCode=1;
