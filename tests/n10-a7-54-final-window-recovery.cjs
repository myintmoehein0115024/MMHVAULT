/* N10-A7.54 FINAL: no-network operational window + rollback contract.
 * Does not access production, change Edge verify_jwt, save Secrets or write files.
 */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),crypto=require('node:crypto');
const read=p=>fs.readFileSync(p,'utf8');
const originalClient=read('js/mmhvault-n10-a7-54b-liveflow.js');
const candidateClient=read('review/N10-A7.54-FINAL-0245-0255-CLIENT-NOT-LIVE.js');
const originalEdge=read('review/N10-A7.54-CLOSED-UID-HEALTH-PREDEPLOY.ts');
const candidateEdge=read('review/N10-A7.54-FINAL-0245-0255-EDGE-NOT-LIVE.ts');
const html=read('n10-a7-53-qa.html'),oldUI=read('js/mmhvault-n10-a7-53-qa.js');
const sha1=t=>crypto.createHash('sha1').update('blob '+Buffer.byteLength(t)+'\0'+t).digest('hex');
const expect={html:'5e0b127b2253cb02f00ae8b61cb17a06709c050a',
  oldUI:'b3ccd83fc92ed30634799059b7a5b081d46259bf',
  flow:'25ea63c6b9a65a1f53c13c9b83713e97d594741b'};
assert.equal(sha1(html),expect.html);
assert.equal(sha1(oldUI),expect.oldUI);
assert.equal(sha1(originalClient),expect.flow);
assert.match(originalClient,/const QA_CLOSED = true;/);
assert.match(originalClient,/const LIVE_REQUESTS_ALLOWED = false;/);
assert.match(oldUI,/const QA_CLOSED = true;/);
assert.match(oldUI,/const BACKEND_REQUESTS_ALLOWED = false;/);
assert.match(originalEdge,/const CODE_GATE_OPEN = false;/);
assert.match(originalEdge,/const WINDOW_END_UTC = '1970-01-01T00:00:00.000Z';/);
assert.equal((html.match(/<button disabled id="qa54b/g)||[]).length,4);
assert.equal((html.match(/disabled readonly/g)||[]).length,4);
assert.match(html,/noindex,nofollow/);
assert.match(html,/form-action 'none'/);
const start='2026-10-29T19:45:00.000Z',end='2026-10-29T19:55:00.000Z';
assert.equal(Date.parse(end)-Date.parse(start),10*60*1000);
for(const code of [candidateClient,candidateEdge]){assert.ok(code.includes(start));assert.ok(code.includes(end));new vm.Script(code);}
assert.match(candidateClient,/const QA_CLOSED = false;/);
assert.match(candidateClient,/const LIVE_REQUESTS_ALLOWED = true;/);
assert.match(candidateClient,/&& withinWindow\(\)/);
assert.match(candidateClient,/setTimeout\(\(\)=>\{/);
assert.match(candidateClient,/if\(active\(\)\)showApprovedClientMode\(\)/);
assert.match(candidateEdge,/const CODE_GATE_OPEN = true;/);
assert.match(candidateEdge,/qaAllowlistReady\(\)/);
assert.match(candidateEdge,/!qaUidAllowed\(uid\)/);
assert.match(candidateEdge,/!qaUidAllowed\(user\.id\)/);
assert.match(candidateEdge,/env\('N10A740_PRODUCTION_ENABLED'\) === 'true'/);
assert.match(candidateEdge,/await allowedPairHealth\(\)/);
assert.match(candidateEdge,/if\(!ready\(\)\) return respond\(origin,503,'n10a740_window_closed'\)/);
assert.doesNotMatch(candidateClient,/\.auth\.setSession\s*\(|(?:localStorage|sessionStorage)\s*\./);
assert.doesNotMatch(candidateClient,/service_role|sb_secret_|N10A754_TEST_UID_[AB]/i);
assert.doesNotMatch(candidateEdge,/N10A754_TEST_UID_A\s*=\s*['"][0-9a-f]{8}/i);
assert.doesNotMatch(candidateEdge,/N10A754_TEST_UID_B\s*=\s*['"][0-9a-f]{8}/i);
// Test exact allowlist windows, including end exclusive.
const active=iso=>{const t=Date.parse(iso);return t>=Date.parse(start)&&t<Date.parse(end);};
assert.equal(active('2026-10-29T19:44:59.999Z'),false);
assert.equal(active(start),true);
assert.equal(active('2026-10-29T19:50:00.000Z'),true);
assert.equal(active('2026-10-29T19:54:59.999Z'),true);
assert.equal(active(end),false);
// Candidate is off unless operator changes *both* the browser and server
// source gates under explicit authorization; restoring below is exact.
const restored={
  qaHTML:html,displayJS:oldUI,flowJS:originalClient,
  edgeJS:originalEdge,verifyJwt:true,prodFlag:false
};
assert.equal(sha1(restored.flowJS),expect.flow);
assert.ok(restored.edgeJS.includes("const CODE_GATE_OPEN = false;"));
assert.equal(restored.verifyJwt,true);
assert.equal(restored.prodFlag,false);
console.log('PASS N10-A7.54 FINAL: exact 02:45-02:55 Bangkok window boundaries, original QA blob hashes, 2 UID + Secret gate, restoration recipe Edge closed/JWT on, page closed, no real network.');
