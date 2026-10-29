/* Windowed production preview: source checks and virtual UTC boundary.
 * Must NOT deploy to main or Supabase without user supervision.
 */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const client=fs.readFileSync('review/N10-A7.54-20261030-0140-QA-CLIENT-STRICT-WINDOW-NEVER-DEPLOY.js','utf8');
const edge=fs.readFileSync('review/N10-A7.54-20261030-0140-EDGE-STRICT-WINDOW-NEVER-DEPLOY.ts','utf8');
const currentClient=fs.readFileSync('js/mmhvault-n10-a7-54b-liveflow.js','utf8');
const edgeRestore=fs.readFileSync('review/N10-A7.54-CLOSED-UID-HEALTH-PREDEPLOY.ts','utf8');
new vm.Script(client);new vm.Script(edge);new vm.Script(currentClient);new vm.Script(edgeRestore);
const from='2026-10-29T18:40:00.000Z',to='2026-10-29T18:50:00.000Z';
for(const source of [client,edge]){assert.ok(source.includes(from));assert.ok(source.includes(to));}
assert.match(client,/const QA_CLOSED = false;/);
assert.match(client,/const LIVE_REQUESTS_ALLOWED = true;/);
assert.match(client,/&& withinWindow\(\)/);
assert.match(client,/location\.hostname==='mmhvault\.com'/);
assert.doesNotMatch(client,/\.auth\.setSession\s*\(|(?:localStorage|sessionStorage)\s*\./);
assert.match(edge,/const CODE_GATE_OPEN = true;/);
assert.match(edge,/const MAX_WINDOW_MS = 15 \* 60 \* 1000;/);
assert.match(edge,/qaAllowlistReady\(\)/);
assert.match(edge,/!qaUidAllowed\(uid\)/);
assert.match(edge,/!qaUidAllowed\(user\.id\)/);
assert.match(edge,/env\('N10A740_PRODUCTION_ENABLED'\) === 'true'/);
assert.match(edge,/if\(!ready\(\)\) return respond\(origin,503,'n10a740_disabled'\)/);
assert.match(edge,/if\(!ready\(\)\) return respond\(origin,503,'n10a740_window_closed'\)/);
assert.match(currentClient,/const QA_CLOSED = true;/);
assert.match(currentClient,/const LIVE_REQUESTS_ALLOWED = false;/);
assert.match(edgeRestore,/const CODE_GATE_OPEN = false;/);
assert.match(edgeRestore,/const WINDOW_END_UTC = '1970-01-01T00:00:00.000Z';/);
assert.equal(Date.parse(to)-Date.parse(from),600000);
function allowedAt(iso,flag=true,allowA=true,allowB=true){
 const ms=Date.parse(iso);
 return ms>=Date.parse(from)&&ms<Date.parse(to)&&flag&&allowA&&allowB;
}
assert.equal(allowedAt('2026-10-29T18:39:59.999Z'),false);
assert.equal(allowedAt('2026-10-29T18:40:00.000Z'),true);
assert.equal(allowedAt('2026-10-29T18:45:00.000Z'),true);
assert.equal(allowedAt('2026-10-29T18:49:59.999Z'),true);
assert.equal(allowedAt('2026-10-29T18:50:00.000Z'),false);
assert.equal(allowedAt('2026-10-29T18:50:00.001Z'),false);
assert.equal(allowedAt('2026-10-29T18:44:00.000Z',false),false);
assert.equal(allowedAt('2026-10-29T18:44:00.000Z',true,true,false),false);
const assertNoSecrets=s=>{assert.doesNotMatch(s,/N10A754_TEST_UID_[AB]\s*=\s*['"][0-9a-f-]+['"]/i);};
assertNoSecrets(edge);assertNoSecrets(client);
console.log('PASS: UTC 01:40–01:50 Asia/Bangkok exact 600000ms, before/after fail-closed, dual UID and manual flag required, restore refs unchanged. Code review only, no live requests.');
