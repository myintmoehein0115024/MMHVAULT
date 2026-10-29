/* N10-A7.49: Secret-readiness contract in a local-only Node VM.
 * No connection to Supabase, Cloudflare, external services or real secrets.
 * The deployed Edge source, prod env, and production database are NOT modified.
 */
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const original=fs.readFileSync('review/N10-A7.40-PRODUCTION-EDGE-CANDIDATE-NEVER-DEPLOY.ts','utf8');
const front=fs.readFileSync('js/mmhvault-n10-a7-40-username.js','utf8');
const bind=fs.readFileSync('js/mmhvault-n10-a7-41-bind.js','utf8');
const names=['N10A740_TURNSTILE_SECRET','N10A740_RATE_HMAC_KEY','N10A740_PRODUCTION_ENABLED'];
for(const key of names)assert.ok(original.includes("env('"+key+"')"),'Missing required private config identifier '+key);
assert.match(original,/const CODE_GATE_OPEN = false;/);
assert.match(original,/const WINDOW_START_UTC = '1970-01-01T00:00:00.000Z';/);
assert.match(original,/const WINDOW_END_UTC = '1970-01-01T00:00:00.000Z';/);
assert.match(front,/const ENABLED=false;/);
assert.match(bind,/const ENABLED=false;/);
assert.doesNotMatch(front+bind,/N10A740_RATE_HMAC_KEY|N10A740_TURNSTILE_SECRET|sb_secret_|SUPABASE_SERVICE_ROLE_KEY/);
const pub='0x4AAAAAAFrRIiFC7KoLQn2q';
assert.ok(front.includes("const TURNSTILE_SITE_KEY='"+pub+"';"));
assert.ok(bind.includes("const SITE_KEY='"+pub+"';"));
const valid={
 SUPABASE_URL:'https://vrypucmyrztxgiqhjspd.supabase.co',
 SUPABASE_ANON_KEY:'FAKE_PUBLIC_KEY_0000000000000',
 SUPABASE_SERVICE_ROLE_KEY:'FAKE_SERVICE_ROLE_000000000',
 N10A740_TURNSTILE_SECRET:'FAKE_TURNSTILE_SECRET_000000',
 N10A740_RATE_HMAC_KEY:'FAKE_64_CHAR_HMAC_'+('A'.repeat(48)),
 N10A740_PRODUCTION_ENABLED:'true'
};
const start=JSON.stringify(new Date(Date.now()-120000).toISOString());
const end=JSON.stringify(new Date(Date.now()+120000).toISOString());
function simulatedReady(settings,{memoryOpen=false,memoryWindow=false}={}){
 let code=original;
 if(memoryOpen)code=code.replace('const CODE_GATE_OPEN = false;', 'const CODE_GATE_OPEN = true;');
 if(memoryWindow)code=code.replace("'1970-01-01T00:00:00.000Z';",""+start+";")
   .replace("'1970-01-01T00:00:00.000Z';",""+end+";");
 assert.match(original,/CODE_GATE_OPEN = false/,'Source in repository must stay closed');
 let handler=null;
 const sandbox={
  Deno:{env:{get:n=>settings[n]??''},serve:fn=>{handler=fn;}},
  TextEncoder,TextDecoder,crypto:webcrypto,URL,URLSearchParams,
  Request,Response,AbortSignal,Uint8Array,Date,Set,Map,Error,Number,JSON,
  fetch:async()=>{throw Error('Offline readiness test must not fetch anything');}
 };
 const ready=vm.runInNewContext(code+'\nready()',sandbox,{timeout:1500,filename:'N10A749_OFFLINE_ONLY.ts'});
 assert.equal(typeof handler,'function');
 return ready;
}
assert.equal(simulatedReady(valid),false,'Production hard lock must override all populated env secrets');
assert.equal(simulatedReady(valid,{memoryOpen:true}),false,'Expired window must override enabled code');
assert.equal(simulatedReady(valid,{memoryWindow:true}),false,'Code gate must override active window');
assert.equal(simulatedReady(valid,{memoryOpen:true,memoryWindow:true}),true,'All prerequisites should be needed');
const missing=[
 ['missing Turnstile Secret',{N10A740_TURNSTILE_SECRET:''}],
 ['missing HMAC Secret',{N10A740_RATE_HMAC_KEY:''}],
 ['short HMAC Secret',{N10A740_RATE_HMAC_KEY:'short'}],
 ['missing service key',{SUPABASE_SERVICE_ROLE_KEY:''}],
 ['wrong project',{SUPABASE_URL:'https://wrong.supabase.co'}],
 ['no anon key',{SUPABASE_ANON_KEY:''}],
 ['environment flag false',{N10A740_PRODUCTION_ENABLED:'false'}]
];
for(const [label,override] of missing){
 assert.equal(simulatedReady({...valid,...override},{memoryOpen:true,memoryWindow:true}),false,label+' must fail closed');
}
console.log('PASS N10-A7.49: 11 local readiness contracts, distinct secret names, locked frontend and no private key literals.');
