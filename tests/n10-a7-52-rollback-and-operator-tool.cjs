/* N10-A7.52 production-v4 rollback and local operator-tool safety contract.
 * Candidate-only; never deploys, executes real credentials, or touches any live data.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const rollback=read('review/N10-A7.52-PRODUCTION-EDGE-V4-CLOSED-ROLLBACK.ts');
const prior=read('review/N10-A7.50-EDGE-ADMIN-HEALTH-CLOSED.ts');
assert.equal(rollback,prior,'Rollback snapshot must be the same verified v4 closed function');
assert.equal((rollback.match(/const CODE_GATE_OPEN = false;/g)||[]).length,1);
for(const s of ["const WINDOW_START_UTC = '1970-01-01T00:00:00.000Z';","const WINDOW_END_UTC = '1970-01-01T00:00:00.000Z';","if(!ready()) return respond(origin,503,'n10a740_disabled');","if(data.action==='configuration_health')","if(!await verifiedAdmin(bearer))"]){
 assert.ok(rollback.includes(s),'Missing fail-closed/admin invariant: '+s);
}
const snapSha=crypto.createHash('sha256').update(rollback).digest('hex');
assert.match(snapSha,/^[0-9a-f]{64}$/);
assert.doesNotMatch(rollback,/const CODE_GATE_OPEN = true;/);
const test=read('tests/n10-a7-52-two-uid-edge-e2e-vm.cjs');
assert.match(test,/filename:'N10A752-MEMORY-ONLY.ts'/);
assert.match(test,/const original=fs.readFileSync\('review\/N10-A7.52-PRODUCTION-EDGE-V4-CLOSED-ROLLBACK.ts'/);
assert.doesNotMatch(test,/https?:\/\/(?!vrypucmyrztxgiqhjspd\.supabase\.co)/);
const html=read('review/N10-A7.52-TWO-ACCOUNT-MANUAL-ACCEPTANCE-OFFLINE.html');
assert.match(html,/<title>MMHVAULT · N10-A7.52/);
assert.match(html,/不会自动调用 Supabase/);
assert.match(html,/未经另行|没有获得单独 N10-A7.53 授权前/);
assert.doesNotMatch(html,/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|<script[^>]+src=/i);
// Expected mentions of 'localStorage' only appear in a human-readable statement.
// No credentials form fields, network actions or private API keys.
assert.doesNotMatch(html,/<input\b|<textarea\b|<form\b|<iframe\b|sb_secret_|SB_SERVICE_ROLE|N10A740_RATE_HMAC_KEY|N10A740_TURNSTILE_SECRET/i);
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,'No local checklist script');
const script=match[1];
new vm.Script(script,{filename:'N10-A7.52-checklist-local-only.html'});
assert.match(script,/const phases=\[/);
assert.match(script,/document\.getElementById\('copy'\)/);
assert.doesNotMatch(script,/eval\(|new Function|fetch\(|import\s*\(|serviceWorker|navigator\.sendBeacon/);
const qs=JSON.parse(script.match(/const phases=(\[[^;]+\]);\nconst container/)[1]);
assert.equal(qs.length,4);
assert.equal(qs.reduce((n,section)=>n+section.items.length,0),24);
assert.equal(qs.some(x=>x.name.includes('回滚')),true);
assert.ok(qs.flatMap(x=>x.items).some(s=>s.includes('限流')));
assert.ok(qs.flatMap(x=>x.items).some(s=>s.includes('B')));
console.log('PASS N10-A7.52 rollback byte-equality, shut gates, 24-item offline tool, private-data and no-network checks. Snapshot SHA-256: '+snapSha.slice(0,12)+'…');
