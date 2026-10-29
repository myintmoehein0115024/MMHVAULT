/* MMHVAULT N10-A7.54-C: offline dependency loading and precise CSP contract.
 * No network. The two source code gates are inverted only inside fake VM.
 */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const html=fs.readFileSync('n10-a7-53-qa.html','utf8');
const js=fs.readFileSync('js/mmhvault-n10-a7-54b-liveflow.js','utf8');
const oldHtml=fs.readFileSync('review/N10-A7.54B-ROLLBACK-CLOSED-QA-HTML.html','utf8');
const oldJs=fs.readFileSync('review/N10-A7.54B-ROLLBACK-CLOSED-QA-JS.js','utf8');
const SDK='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.js';
const CAPTCHA='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const PROJECT='https://vrypucmyrztxgiqhjspd.supabase.co';
assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive/);
assert.match(html,/<meta name="referrer" content="no-referrer">/);
assert.match(html,/<meta http-equiv="Content-Security-Policy"/);
const meta=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
assert.ok(meta);
const directives=Object.fromEntries(meta.split(';').map(s=>s.trim()).map(s=>{const first=s.split(/\s+/);return [first[0],first.slice(1)]}));
assert.deepEqual(directives['script-src'],["'self'",'https://cdn.jsdelivr.net','https://challenges.cloudflare.com']);
assert.deepEqual(directives['connect-src'],["'self'",PROJECT,'https://challenges.cloudflare.com']);
assert.deepEqual(directives['frame-src'],['https://challenges.cloudflare.com']);
assert.deepEqual(directives['form-action'],["'none'"]);
for(const key of ['default-src','worker-src','object-src','base-uri'])assert.deepEqual(directives[key],["'none'"]);
assert.ok(!meta.includes(" *")&&!meta.includes("unsafe-eval"));
assert.match(js,/const QA_CLOSED = true;/);
assert.match(js,/const LIVE_REQUESTS_ALLOWED = false;/);
assert.match(js,/async function initializeDependencies/);
assert.match(js,/if\(releaseApproved\(\)\)void initializeDependencies\(\)/);
assert.ok(js.includes(SDK)&&js.includes(CAPTCHA));
assert.doesNotMatch(js,/\.auth\.setSession\s*\(|(?:localStorage|sessionStorage)\s*\./);
assert.match(oldHtml,/connect-src 'none'/);
assert.match(oldJs,/const QA_CLOSED = true;/);
assert.match(oldJs,/const BACKEND_REQUESTS_ALLOWED = false;/);

function makeNode(){
 const listeners={};
 return {value:'',disabled:true,readOnly:true,hidden:true,textContent:'',
  listeners,addEventListener:(k,cb)=>listeners[k]=cb};
}
function browser({gate=false,requestGate=false,host='mmhvault.com',sdk=false,captcha=false,failSdk=false}={}){
 const nodes=new Map();
 for(const k of ['A','B'])for(const part of
  ['Name','Password','Bind','Login','Captcha','Mode','Status'])
   nodes.set('qa54b'+part+k,makeNode());
 const names=[],scripts=[],actions=[],winListeners={};
 const w={
   supabase:sdk?{createClient:()=>({auth:{}})}:undefined,
   turnstile:captcha?{render:(_node,options)=>{actions.push(options.action);return actions.length-1},reset:()=>{},remove:()=>{}}:undefined,
   addEventListener:(name,handler)=>{winListeners[name]=handler}
 };
 const document={
   readyState:'complete',getElementById:id=>nodes.get(id),
   documentElement:{lang:'zh-CN'},
   head:{appendChild(tag){
     assert.equal(tag.async,true);assert.equal(tag.crossOrigin,'anonymous');assert.equal(tag.referrerPolicy,'no-referrer');
     scripts.push(tag.src);
     if(tag.src===SDK){
       if(failSdk){tag.onerror?.();return;}
       w.supabase={createClient:()=>({auth:{}})};
     } else if(tag.src===CAPTCHA){
       w.turnstile={render:(_node,options)=>{actions.push(options.action);return actions.length-1},reset:()=>{},remove:()=>{}};
     } else throw Error('Unexpected dynamic script '+tag.src);
     tag.onload?.();
   }},
   createElement:name=>{assert.equal(name,'script');return {async:false,src:null,referrerPolicy:null,crossOrigin:null}},
   addEventListener:()=>{throw Error('No wait for DOM on complete document')}
 };
 let src=js;
 if(gate)src=src.replace('const QA_CLOSED = true;','const QA_CLOSED = false;');
 if(requestGate)src=src.replace('const LIVE_REQUESTS_ALLOWED = false;','const LIVE_REQUESTS_ALLOWED = true;');
 const fetch=()=>{throw Error('Forbidden external request inside offline dependency test')};
 vm.runInNewContext(src,{document,window:w,location:{protocol:'https:',hostname:host},
   setTimeout,clearTimeout,AbortController,URL,URLSearchParams,fetch,JSON,Promise,Error,Array,Object,RegExp},
   {timeout:2500,filename:'N10A754C-OFFLINE-MOCK.js'});
 return {nodes,scripts,actions,winListeners};
}
async function flush(){for(let i=0;i<12;i++)await Promise.resolve();}
(async()=>{
 const closed=browser();await flush();
 assert.deepEqual(closed.scripts,[]);assert.deepEqual(closed.actions,[]);
 for(const n of closed.nodes.values())assert.equal(n.disabled,true);
 const oneGate=browser({gate:true});await flush();assert.deepEqual(oneGate.scripts,[]);
 const otherGate=browser({requestGate:true});await flush();assert.deepEqual(otherGate.scripts,[]);
 const evil=browser({gate:true,requestGate:true,host:'example.test'});await flush();assert.deepEqual(evil.scripts,[]);
 const already=browser({gate:true,requestGate:true,sdk:true,captcha:true});await flush();
 assert.deepEqual(already.scripts,[]);assert.deepEqual(already.actions,['mmh_n10a740_bind','mmh_n10a740_bind']);
 const approved=browser({gate:true,requestGate:true});await flush();
 assert.deepEqual(approved.scripts,[SDK,CAPTCHA]);
 assert.deepEqual(approved.actions,['mmh_n10a740_bind','mmh_n10a740_bind']);
 for(const k of ['A','B']){
   assert.equal(approved.nodes.get('qa54bName'+k).disabled,false);
   assert.equal(approved.nodes.get('qa54bPassword'+k).disabled,false);
   assert.equal(approved.nodes.get('qa54bBind'+k).disabled,true,'Must require fresh CAPTCHA first');
 }
 const failed=browser({gate:true,requestGate:true,failSdk:true});await flush();
 assert.deepEqual(failed.scripts,[SDK]);
 assert.equal(failed.nodes.get('qa54bNameA').disabled,true);
 assert.match(failed.nodes.get('qa54bStatusA').textContent,/无法加载/);
 console.log('PASS N10-A7.54-C: exact-source CSP, no remote requests while locked, SDK pinned and only injected after dual gate, Turnstile staged after SDK, bad host and SDK failure remain closed.');
})().catch(e=>{console.error(e);process.exitCode=1});
