/* N10-A7.54D: two actual same-page scripts, old locked UI + proposed
 * login integration. Entirely fake browser, fake SDK/Turnstile, no network.
 * Production files remain byte-for-byte unchanged and hard-closed.
 */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const old=fs.readFileSync('js/mmhvault-n10-a7-53-qa.js','utf8');
const current=fs.readFileSync('js/mmhvault-n10-a7-54b-liveflow.js','utf8');
const proposal=fs.readFileSync('review/N10-A7.54D-QA-LANG-INTEROP-PROPOSED-NOT-DEPLOYED.js','utf8');
const html=fs.readFileSync('n10-a7-53-qa.html','utf8');
assert.match(old,/const QA_CLOSED = true;/);
assert.match(old,/const BACKEND_REQUESTS_ALLOWED = false;/);
assert.match(current,/const QA_CLOSED = true;/);
assert.match(current,/const LIVE_REQUESTS_ALLOWED = false;/);
assert.match(proposal,/const QA_CLOSED = true;/);
assert.match(proposal,/const LIVE_REQUESTS_ALLOWED = false;/);
assert.match(html,/noindex,nofollow/);
assert.equal((html.match(/<button disabled id="qa54b/g)||[]).length,4);
new vm.Script(old);new vm.Script(proposal);

function node(){
 const listeners={};
 return {value:'',disabled:true,readOnly:true,hidden:false,style:{width:''},
   textContent:'',options:[{textContent:''},{textContent:''},{textContent:''}],
   listeners,
   getAttribute:k=>({'data-zh':'安全测试','data-en':'QA only'})[k]||'',
   addEventListener:(event,handler)=>((listeners[event]??=[]).push(handler)),
   fire(event,arg){for(const fn of listeners[event]||[])fn(arg||{target:{value:this.value}});}
 };
}
function makePage({approved=false,host='mmhvault.com'}={}){
 const els=new Map(),names=['badge','portalMode','hostReadout','progressText','progressNote','progressFill','langToggle','qa54cBackendStat'];
 for(const k of ['A','B'])for(const part of ['Name','Password','Bind','Login','Mode','Captcha','Status'])names.push('qa54b'+part+k);
 for(const id of names)els.set(id,node());
 for(const k of ['A','B'])els.get('qa54bMode'+k).value='bind';
 const selectors=Array.from({length:6},()=>{const e=node();e.value='pending';return e});
 const textNodes=[node(),node()],widgets=[],network=[];
 const document={
  readyState:'complete',documentElement:{lang:'zh-CN'},
  getElementById:id=>els.get(id),
  querySelectorAll:s=>s==='#checklist select'?selectors:
    s==='[data-zh][data-en]'?textNodes:
    s==='.qaFields input'?['A','B'].flatMap(k=>[els.get('qa54bName'+k),els.get('qa54bPassword'+k)]):
    s==='button.disabledAction'?['A','B'].flatMap(k=>[els.get('qa54bBind'+k),els.get('qa54bLogin'+k)]):[],
  createElement:()=>{throw Error('Remote SDK loading forbidden in combined fake test')},
  addEventListener:()=>{throw Error('Document must already be complete')}
 };
 const window={
  supabase:{createClient:()=>({auth:{}})},
  turnstile:{render:(place,options)=>{widgets.push({place,options});return widgets.length-1},remove:()=>{},reset:()=>{}},
  addEventListener:()=>{}
 };
 const context={document,window,location:{protocol:'https:',hostname:host},fetch:()=>{network.push('unexpected');throw Error('no network')},
   JSON,Promise,Date,Array,Object,String,RegExp,Number,Error,setTimeout,clearTimeout,AbortController};
 vm.runInNewContext(old,context,{timeout:2500});
 let js=proposal;
 if(approved)js=js.replace('const QA_CLOSED = true;','const QA_CLOSED = false;')
  .replace('const LIVE_REQUESTS_ALLOWED = false;','const LIVE_REQUESTS_ALLOWED = true;');
 vm.runInNewContext(js,context,{timeout:2500});
 return {els,widgets,network,document};
}
async function flush(){for(let i=0;i<24;i++)await Promise.resolve();}
(async()=>{
 const closed=makePage();await flush();
 assert.deepEqual(closed.network,[]);
 assert.equal(closed.widgets.length,0);
 for(const k of ['A','B']){
  assert.equal(closed.els.get('qa54bName'+k).disabled,true);
  assert.equal(closed.els.get('qa54bBind'+k).disabled,true);
 }
 closed.els.get('langToggle').fire('click');
 assert.equal(closed.els.get('badge').textContent,'N10-A7.54-A · LOCKED');
 const wrong=makePage({approved:true,host:'evil.example'});await flush();
 assert.equal(wrong.widgets.length,0);
 assert.equal(wrong.els.get('qa54bNameA').disabled,true);
 const allowed=makePage({approved:true});await flush();
 assert.equal(allowed.widgets.length,2);
 for(const k of ['A','B']){
  assert.equal(allowed.els.get('qa54bName'+k).disabled,false,'old locked module must not permanently disable QA when approved');
  assert.equal(allowed.els.get('qa54bPassword'+k).disabled,false);
  assert.equal(allowed.els.get('qa54bBind'+k).disabled,true,'CAPTCHA proof required before binding');
  assert.equal(allowed.els.get('qa54bLogin'+k).disabled,true,'CAPTCHA + prior bind required before login');
 }
 assert.match(allowed.els.get('badge').textContent,/QA CLIENT ENABLED/);
 allowed.els.get('langToggle').fire('click');
 assert.equal(allowed.document.documentElement.lang,'en');
 assert.match(allowed.els.get('badge').textContent,/QA CLIENT ENABLED/,'language toggle must not falsely announce LOCKED during authorized QA');
 assert.match(allowed.els.get('portalMode').textContent,/QA BROWSER READY/);
 assert.deepEqual(allowed.network,[]);
 console.log('PASS N10-A7.54D combined legacy display + proposed QA integration: closed zero network, A/B controls unlock only with explicit mocked authority, CAPTCHA still required, language toggle truthful, wrong host closed; production code unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1});
