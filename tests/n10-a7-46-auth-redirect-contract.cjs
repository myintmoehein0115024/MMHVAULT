/* N10-A7.46 — candidate-only deterministic login URL and UID redirect contracts.
 * Executes function source from login.html, not a reimplementation.
 * No accounts, network requests, production DB, real secrets, or passwords.
 */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('login.html','utf8');
function extract(start,end){
 const i=html.indexOf(start),j=html.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,'Unable to locate function range: '+start);
 return html.slice(i,j);
}
const urls=extract('function nextTargetV160()','async function verifiedRedirectV946(');
assert.match(urls,/function nextTargetV160\(\)/);
assert.match(urls,/function loginCallbackUrlV160\(\)/);
function makeUrlFns(search){
 const location={href:'https://mmhvault.com/login.html'+search,search};
 return new Function('location','URL','URLSearchParams',urls+
   '\nreturn {nextTargetV160,appUrl,loginCallbackUrlV160};')(location,URL,URLSearchParams);
}
const cases=[
 ['', 'app.html'],
 ['?next=business.html','business.html'],
 ['?next=username-setup.html','username-setup.html'],
 ['?next=https%3A%2F%2Fevil.example','app.html'],
 ['?next=%2F%2Fevil.example','app.html'],
 ['?next=%2Flogin.html','app.html'],
 ['?next=..%2Fapp.html','app.html'],
 ['?next=business.html%3Ffoo%3Dbar','app.html'],
 ['?next=username-setup.html%23x','app.html'],
 ['?next=javascript%3Aalert%281%29','app.html']
];
for(const [search,expected] of cases){
 const {nextTargetV160,appUrl,loginCallbackUrlV160}=makeUrlFns(search);
 assert.equal(nextTargetV160(),expected);
 assert.equal(appUrl(),'https://mmhvault.com/'+expected);
 const target=new URL(loginCallbackUrlV160());
 assert.equal(target.origin,'https://mmhvault.com');
 assert.equal(target.pathname,'/login.html');
 assert.equal(target.searchParams.get('next'),expected==='app.html'?null:expected);
}
assert.match(html,/db\.auth\.signInWithOAuth\(\{provider:'google',options:\{redirectTo:loginCallbackUrlV160\(\)\}\}\)/);
assert.match(html,/emailRedirectTo:loginCallbackUrlV160\(\)/);
assert.match(html,/resetPasswordForEmail\(email,\{redirectTo:recoveryRedirectUrlV943\(\)\}\)/);
const recovery=extract('function recoveryRedirectUrlV943()', 'function showRecoveryV943()');
const recovered=new Function('location','URL',recovery+
'\nreturn recoveryRedirectUrlV943();')({href:'https://mmhvault.com/login.html?next=username-setup.html'},URL);
assert.equal(recovered,'https://mmhvault.com/login.html?recovery=1','Recovery must not inherit next or expose tokens');

const fn=extract('async function verifiedRedirectV946(', 'function openForm(id)');
async function redirect({remote='user-a',cached='user-a',expected='user-a',recovery=false}={}){
 let replaced=[],errors=[];
 const db={auth:{
  getUser:async()=>({data:{user:{id:remote}}}),
  getSession:async()=>({data:{session:{user:{id:cached}}}})
 }};
 const location={href:'https://mmhvault.com/login.html?next=username-setup.html',
  search:'?next=username-setup.html',replace:u=>{replaced.push(u)}};
 const source=[
  'let verifiedRedirectInFlightV946=false;',
  'const recoveryCallbackPendingV944='+Boolean(recovery)+';',
  'const recoveryModeV943=false,recoveryCompletedV943=false;',
  urls,fn,
  'return verifiedRedirectV946('+JSON.stringify(expected)+');'
 ].join('\n');
 const ok=await new Function('location','URL','URLSearchParams','db','msg',source)(
  location,URL,URLSearchParams,db,t=>{errors.push(t)});
 return {ok,replaced,errors};
}
(async()=>{
 const good=await redirect();
 assert.equal(good.ok,true);assert.deepEqual(good.replaced,['https://mmhvault.com/username-setup.html']);
 const wrongRemote=await redirect({remote:'user-b'});
 assert.equal(wrongRemote.ok,false);assert.equal(wrongRemote.replaced.length,0);
 const wrongCache=await redirect({cached:'user-b'});
 assert.equal(wrongCache.ok,false);assert.equal(wrongCache.replaced.length,0);
 const blocked=await redirect({recovery:true});
 assert.equal(blocked.ok,false);assert.equal(blocked.replaced.length,0);
 const app=makeUrlFns('').appUrl();
 assert.equal(app,'https://mmhvault.com/app.html');
 console.log('PASS N10-A7.46: '+cases.length+' URL cases, recovery isolation, UID-bound redirects and Google/email callback wiring.');
})().catch(e=>{console.error(e);process.exitCode=1});
