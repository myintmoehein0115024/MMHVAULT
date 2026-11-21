// N10 review-only visual smoke. Local synthetic page, no real auth or finance.
// Executes the actual same-owner code generated from the full current app.html.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium,webkit} from 'playwright';
import {generateAppEntryPreview} from './preview.mjs';

const original=readFileSync('app.html','utf8');
const preview=generateAppEntryPreview(original);
const first=preview.indexOf('    if(liveOwner===nextOwner){');
const last=preview.indexOf('    if(mmhvaultAuthBootSettledV3285)',first);
assert.ok(first>=0&&last>first,'candidate same-owner check not found');
const sameOwner=preview.slice(first,last);
assert.match(sameOwner,/mmhP947GuardV947\('switch'\)/);
assert.match(sameOwner,/n10Version!==mmhN10GateVersionV1100/);
const html=String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:#061525;color:#edf4fb;font:16px system-ui,sans-serif}
#workspace{margin:60px auto;padding:32px;width:min(96%,900px);background:#10283e;border:1px solid #406080;border-radius:22px}
#fake-total{font-size:36px;font-weight:800}#fake-note{opacity:.7}
#mmhP947AccountGuard{position:fixed;inset:0;z-index:2147483647;background:#030a14;color:#fafafa;
 display:none;align-items:center;justify-content:center;padding:24px;text-align:center;touch-action:none}
#mmhP947AccountGuard>.card{width:min(100%,430px);border:1px solid #597189;
 padding:28px;border-radius:20px;background:#0a2132}
#mmhP947AccountGuard[data-phase="error"] .card{border-color:#efba89}
</style></head><body>
<main id="workspace"><h1>Simulated private account</h1>
<div id="fake-total">$1,234 FAKE</div><p id="fake-note">No real user data or network.</p></main>
<div id="mmhP947AccountGuard" hidden role="status" aria-live="polite">
<div class="card"><strong id="guard-title">Checking your account…</strong>
<p>Private account content stays covered until verification finishes.</p></div></div>
</body></html>`;
const localScript=String.raw`
let mmhP947AuthGateTicket=0,mmhN10GateVersionV1100=0;
let currentSessionUser={id:'owner-A'};
let db={auth:{}};
const history=[];
function mmhP947GuardV947(phase){
 const layer=document.getElementById('mmhP947AccountGuard');
 layer.hidden=false;layer.style.display='flex';layer.dataset.phase=phase;
 document.getElementById('guard-title').textContent=phase==='error'
    ?'Security check could not finish':'Checking your account…';
 history.push('mask:'+phase);
}
function mmhP947UnlockV947(){
 const layer=document.getElementById('mmhP947AccountGuard');
 layer.hidden=true;layer.style.display='none';history.push('unlock');
}
function applyUserProfile(user){history.push('profile:'+user.id);}
window.__resolveGates=[];
function mmhN10AssessWorkspaceMfaV1100(){
 return new Promise(resolve=>{window.__resolveGates.push(resolve);});
}
function handleSameOwner(liveOwner,nextOwner,session){
${sameOwner}
}
window.__history=history;
window.__start=()=>{
 handleSameOwner('owner-A','owner-A',{user:{id:'owner-A'}});
};
window.__finish=decision=>window.__resolveGates[0](decision);
window.__finishAt=(index,decision)=>window.__resolveGates[index](decision);
window.__signOut=()=>{currentSessionUser=null;mmhP947AuthGateTicket++;};
window.__switchOwner=()=>{currentSessionUser={id:'owner-B'};mmhP947AuthGateTicket++;};
window.__invalidate=()=>{mmhN10GateVersionV1100++;};
`;
const server=createServer((req,res)=>{
 if(req.url!=='/'){res.writeHead(404);res.end();return}
 res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
 res.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const address='http://127.0.0.1:'+server.address().port+'/';

async function checkViewport(engine,name,options) {
 const browser=await engine.launch({headless:true});
 try {
  const context=await browser.newContext(options);
  async function create() {
   const page=await context.newPage();
   const errs=[];
   page.on('pageerror',e=>errs.push(e.message));
   await page.route('**/*',route=>{
    const target=new URL(route.request().url());
    if(target.hostname==='127.0.0.1')return route.continue();
    return route.abort();
   });
   await page.goto(address);
   await page.addScriptTag({content:localScript});
   return {page,errs};
  }
  for (const scenario of ['allow','deny','switch','invalidate','signout','rapid']) {
   const {page,errs}=await create();
   try {
    await page.evaluate(()=>window.__start());
    const locked=await page.evaluate(()=>{
      const layer=document.getElementById('mmhP947AccountGuard');
      const rect=layer.getBoundingClientRect();
      return {hidden:layer.hidden,display:getComputedStyle(layer).display,
        covers:rect.width>=window.innerWidth-2&&rect.height>=window.innerHeight-2,
        top:document.elementFromPoint(window.innerWidth/2,window.innerHeight/2)?.closest('#mmhP947AccountGuard')?.id,
        history:[...window.__history]};
    });
    assert.equal(locked.hidden,false,name+' '+scenario);
    assert.equal(locked.display,'flex',name+' '+scenario);
    assert.equal(locked.covers,true,name+' '+scenario+' overlay does not cover viewport');
    assert.equal(locked.top,'mmhP947AccountGuard',name+' '+scenario+' click-through');
    assert.deepEqual(locked.history,['mask:switch'],name+' '+scenario+' must mask synchronously');
    if(scenario==='switch')await page.evaluate(()=>window.__switchOwner());
    if(scenario==='invalidate')await page.evaluate(()=>window.__invalidate());
    if(scenario==='signout')await page.evaluate(()=>window.__signOut());
    if(scenario==='rapid'){
      await page.evaluate(()=>window.__start());
      await page.waitForFunction(()=>window.__resolveGates.length===2);
      await page.evaluate(()=>window.__finishAt(0,'allow'));
      await page.waitForTimeout(35);
      const halfway=await page.evaluate(()=>({
        hidden:document.getElementById('mmhP947AccountGuard').hidden,
        events:[...window.__history]
      }));
      assert.equal(halfway.hidden,false,'first rapid result must NOT unlock');
      assert.equal(halfway.events.includes('unlock'),false,'obsolete rapid result must be ignored');
      await page.evaluate(()=>window.__finishAt(1,'allow'));
    }else{
      await page.evaluate(decision=>window.__finish(decision),
        scenario==='deny'?'deny':'allow');
    }
    await page.waitForTimeout(60);
    const after=await page.evaluate(()=>({
      hidden:document.getElementById('mmhP947AccountGuard').hidden,
      history:[...window.__history]
    }));
    if(scenario==='allow'||scenario==='rapid'){
      assert.deepEqual(after.history,scenario==='rapid'
        ? ['mask:switch','mask:switch','profile:owner-A','unlock']
        : ['mask:switch','profile:owner-A','unlock']);
      assert.equal(after.hidden,true,'valid owner must be unlocked');
    } else {
      assert.equal(after.hidden,false,'denied or stale owner must remain covered');
      assert.equal(after.history.includes('unlock'),false);
      assert.equal(after.history.some(x=>x.startsWith('profile:')),false);
    }
    assert.deepEqual(errs,[],name+' '+scenario+' unexpected script error');
    console.log('PASS',name,scenario,'viewport mask and token/owner guard');
   }finally{await page.close();}
  }
  await context.close();
 }finally{await browser.close();}
}
try {
 await checkViewport(chromium,'desktop Chromium',{viewport:{width:1280,height:800}});
 await checkViewport(chromium,'mobile Chromium',{
  viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await checkViewport(webkit,'mobile WebKit',{
  viewport:{width:375,height:812},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 console.log('18/18 isolated desktop/mobile browser checks passed');
}finally {
 await new Promise(resolve=>server.close(resolve));
}
