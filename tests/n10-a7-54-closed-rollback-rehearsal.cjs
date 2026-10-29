/* N10-A7.54 safe rehearsal: operator restore set verified using exact blobs.
 * No production write, no real secrets, no network. A positive test never
 * authorizes opening real login or proves manual Secrets can be changed.
 */
'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const sha1=s=>crypto.createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0'+s).digest('hex');
const expected={
  html:'5e0b127b2253cb02f00ae8b61cb17a06709c050a',
  display:'b3ccd83fc92ed30634799059b7a5b081d46259bf',
  flow:'3d2609b08e289939867a33587abb7841e33e828b'
};
const restore={
  html:read('review/N10-A7.54-LOCKED-ROLLBACK-QA-HTML.html'),
  display:read('review/N10-A7.54-LOCKED-ROLLBACK-DISPLAY-JS.js'),
  flow:read('js/mmhvault-n10-a7-54b-liveflow.js'),
  edge:read('review/N10-A7.54-CLOSED-UID-HEALTH-PREDEPLOY.ts'),
  oldEdge:read('review/N10-A7.52-PRODUCTION-EDGE-V4-CLOSED-ROLLBACK.ts')
};
for(const k of ['html','display','flow']) assert.equal(sha1(restore[k]),expected[k],k+' production blob changed');
assert.equal(sha1(read('n10-a7-53-qa.html')),expected.html);
assert.equal(sha1(read('js/mmhvault-n10-a7-53-qa.js')),expected.display);
assert.equal(sha1(read('js/mmhvault-n10-a7-54b-liveflow.js')),expected.flow);
function closed(s){
 assert.match(s.html,/noindex,nofollow/);
 assert.match(s.html,/form-action 'none'/);
 assert.equal((s.html.match(/<button disabled id="qa54b/g)||[]).length,4);
 assert.equal((s.html.match(/disabled readonly/g)||[]).length,4);
 assert.match(s.display,/const QA_CLOSED = true;/);
 assert.match(s.display,/const BACKEND_REQUESTS_ALLOWED = false;/);
 assert.match(s.flow,/const QA_CLOSED = true;/);
 assert.match(s.flow,/const LIVE_REQUESTS_ALLOWED = false;/);
 assert.match(s.edge,/const CODE_GATE_OPEN = false;/);
 assert.match(s.edge,/const WINDOW_END_UTC = '1970-01-01T00:00:00.000Z';/);
 assert.match(s.edge,/await allowedPairHealth\(\)/);
}
closed(restore);
const fictional={
 ...restore,
 display:restore.display.replace('const QA_CLOSED = true;','const QA_CLOSED = false;'),
 flow:restore.flow.replace('const LIVE_REQUESTS_ALLOWED = false;','const LIVE_REQUESTS_ALLOWED = true;'),
 edge:restore.edge.replace('const CODE_GATE_OPEN = false;','const CODE_GATE_OPEN = true;')
};
assert.notEqual(fictional.flow,restore.flow);
const recovered={...fictional,display:restore.display,flow:restore.flow,edge:restore.edge,html:restore.html};
closed(recovered);
for(const k of ['html','display','flow','edge'])assert.equal(recovered[k],restore[k]);
assert.match(restore.oldEdge,/const CODE_GATE_OPEN = false;/);
assert.match(restore.oldEdge,/const WINDOW_END_UTC = '1970-01-01T00:00:00.000Z';/);
console.log('PASS closed rollback dry-run: exact production Git blobs for QA HTML/display/flow; saved v7 admin-health Edge code and v4 fallback all CLOSED; mocked restore returns exact known-good bytes. No production changes.');
