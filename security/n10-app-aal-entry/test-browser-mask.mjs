// N10 synthetic in-browser verification of the actual app account mask / AAL gate.
// Localhost fixture only. No production, Supabase, JWT, recovery keys or live data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium,webkit} from 'playwright';

const source=readFileSync(new URL('../../app.html',import.meta.url),'utf8');
const cut=(begin,end)=>{
  const a=source.indexOf(begin);
  assert.ok(a>=0,'Missing '+begin);
  const b=source.indexOf(end,a+begin.length);
  assert.ok(b>a,'Missing '+end);
  return source.slice(a,b);
};
const guard=cut('function mmhP947GuardV947(','let mmhvaultAuthRedirectingV1239=false;');
const decision=cut('function mmhN10AalDecisionV20261102(data){','let activeEnterUserId=""');
const reconcile=cut('async function mmhVaultReconcileSessionV1239(','window.mmhVaultHandleOnlineV1239=');
const auth=cut('db.auth.onAuthStateChange((event,session)=>{','mmhvaultAuthBootTimerV3285=setTimeout(');
const resume=cut('function mmhVaultResumeLifecycleV1239(','function currency(a){');
const pageSource='let mmhP947AuthGateTicket=0;let mmhVaultSessionCheckPromiseV1239=null;let mmhvaultAuthRedirectingV1239=false;let mmhVaultLastSessionCheckV1239=0;\n'+guard+decision+reconcile+resume+auth;
const shell='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#122;color:white;font:18px system-ui"><main id="private-data" style="margin:100px auto;padding:30px;width:60%;background:#355">SYNTHETIC PRIVATE FINANCE CONTENT — NOT REAL USER DATA</main></body></html>';
const server=createServer((req,res)=>{
  res.setHeader('Content-Type','text/html;charset=utf-8');
  if(req.url?.startsWith('/login.html')){res.end('<!doctype html><html><body>Simulated MFA challenge. No account access.</body></html>');return;}
  if(req.url==='/'){res.end(shell);return;}
  res.writeHead(404);res.end('Not found');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port,base='http://127.0.0.1:'+port+'/';
function setupSynthetic(){
 const uid='synthetic-owner';
 window.currentSessionUser={id:uid};
 window.mmhvaultAuthBootSettledV3285=true;
 window.realtimeReady=true;window.realtimeChannelOwnerV1235=uid;
 window.__mmhSessionEpochV1239=1;window.__mmhLastCloudLoadAtV1235=Date.now();
 window.__synthetic={aal:{currentLevel:'aal2',nextLevel:'aal2'},delayUser:false,resolveUser:null,offlineUser:false,cloudLoads:0,profileRefreshes:0};
 window.loadAll=async()=>{window.__synthetic.cloudLoads++;return {ok:true};};
 window.applyUserProfile=()=>{window.__synthetic.profileRefreshes++;};
 window.subscribeRealtime=()=>{throw Error('Unexpected realtime reconnect');};
 window.mmhvaultFinishAuthBootV3285=()=>{throw Error('Unexpected boot');};
 window.db={auth:{
   onAuthStateChange(fn){window.__authCallback=fn;return {data:{subscription:{unsubscribe(){}}}};},
   getSession:async()=>({data:{session:{user:{id:uid}}},error:null}),
   getUser:()=>window.__synthetic.delayUser?new Promise(resolve=>{window.__synthetic.resolveUser=resolve;}):
     Promise.resolve(window.__synthetic.offlineUser?{error:Error('Synthetic offline')}:{data:{user:{id:uid}},error:null}),
   mfa:{
     getAuthenticatorAssuranceLevel:async()=>({data:window.__synthetic.aal,error:null}),
     listFactors:async()=>({data:{all:[]},error:null})
   }
 }};
 window.mmhVaultSwitchSessionV1239=async()=>({ok:false}); // Synthetic: stay masked, no account B data loaded.
 window.mmhVaultSignOutCleanupV1239=()=>location.replace('login.html');
}
let completed=0;
async function exercise(browserType,viewport){
  const browser=await browserType.launch({headless:true});
  const errors=[];
  try{
    const context=await browser.newContext({viewport});
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.hostname==='127.0.0.1'&&url.port===String(port))return route.continue();
      return route.abort();
    });
    const reset=async()=>{
      await page.goto(base);
      await page.addScriptTag({content:'('+setupSynthetic.toString()+')();'});
      await page.addScriptTag({content:pageSource});
    };
    await reset();
    // Refresh must cover old finance data before any asynchronous auth returns.
    await page.evaluate(()=>{
      window.__synthetic.delayUser=true;
      window.__authCallback('TOKEN_REFRESHED',{user:{id:'synthetic-owner'}});
    });
    await page.waitForFunction(()=>!!window.__synthetic.resolveUser);
    const masked=await page.evaluate(()=>{
      const secret=document.querySelector('#private-data');
      const guard=document.querySelector('#mmhP947AccountGuard');
      const box=secret.getBoundingClientRect();
      const top=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
      return !!guard&&!guard.hidden&&guard.style.display==='flex'&&guard.contains(top);
    });
    assert.equal(masked,true,'Overlay must cover private DOM while Auth is pending');
    await page.evaluate(()=>{
      window.__synthetic.delayUser=false;
      window.__synthetic.resolveUser({data:{user:{id:'synthetic-owner'}},error:null});
    });
    await page.waitForFunction(()=>document.querySelector('#mmhP947AccountGuard')?.hidden===true);
    completed++;
    // Broken AAL must keep the overlay visible with no private-data leak.
    await page.evaluate(()=>{
      window.__synthetic.aal={currentLevel:'bad',nextLevel:'aal1'};
      window.__authCallback('TOKEN_REFRESHED',{user:{id:'synthetic-owner'}});
    });
    await page.waitForFunction(()=>document.querySelector('#mmhP947AccountGuardTitle')?.textContent==='Sign-in verification failed');
    const denied=await page.evaluate(()=>{const g=document.querySelector('#mmhP947AccountGuard');return !g.hidden&&g.style.display==='flex';});
    assert.equal(denied,true,'Unknown AAL must remain masked');
    completed++;
    // Network/user verification failure also remains covered; no navigation.
    await page.evaluate(()=>{
      window.__synthetic.aal={currentLevel:'aal2',nextLevel:'aal2'};
      window.__synthetic.offlineUser=true;
      window.__authCallback('TOKEN_REFRESHED',{user:{id:'synthetic-owner'}});
    });
    await page.waitForFunction(()=>document.querySelector('#mmhP947AccountGuardTitle')?.textContent==='Sign-in verification failed');
    const offline=await page.evaluate(()=>{const g=document.querySelector('#mmhP947AccountGuard');return !g.hidden;});
    assert.equal(offline,true,'Failed verification must not expose content');
    completed++;
    // AAL1 with required MFA routes to sign-in challenge, never finance.
    await reset();
    await page.evaluate(()=>{
      window.__synthetic.aal={currentLevel:'aal1',nextLevel:'aal2'};
      window.__authCallback('SIGNED_IN',{user:{id:'synthetic-owner'}});
    });
    await page.waitForURL(/login\.html\?mfa=1$/);
    assert.equal(await page.locator('#private-data').count(),0,'Login challenge must not contain private workspace');
    completed++;
    // Safari BFCache restore: mask immediately before any server response.
    await reset();
    await page.evaluate(()=>{
      window.__synthetic.delayUser=true;
      window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
    });
    const bfcacheMasked=await page.evaluate(()=>{
      const g=document.querySelector('#mmhP947AccountGuard'),box=document.querySelector('#private-data').getBoundingClientRect();
      return !!g&&!g.hidden&&g.contains(document.elementFromPoint(box.x+box.width/2,box.y+box.height/2));
    });
    assert.equal(bfcacheMasked,true,'BFCache restore must mask old financial DOM synchronously');
    await page.waitForFunction(()=>!!window.__synthetic.resolveUser);
    await page.evaluate(()=>{
      window.__synthetic.delayUser=false;
      window.__synthetic.resolveUser({data:{user:{id:'synthetic-owner'}},error:null});
    });
    await page.waitForFunction(()=>document.querySelector('#mmhP947AccountGuard')?.hidden===true);
    completed++;
    // A restored page with invalid AAL must never unlock.
    await reset();
    await page.evaluate(()=>{
      window.__synthetic.aal={currentLevel:'invalid',nextLevel:'aal1'};
      window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
    });
    await page.waitForFunction(()=>document.querySelector('#mmhP947AccountGuardTitle')?.textContent==='Sign-in verification failed');
    assert.equal(await page.evaluate(()=>document.querySelector('#mmhP947AccountGuard')?.hidden),false);
    completed++;
    // Switch A to B: no previously rendered A data can become the click target.
    await reset();
    await page.evaluate(()=>window.__authCallback('SIGNED_IN',{user:{id:'synthetic-new-owner'}}));
    const switchedMasked=await page.evaluate(()=>{
      const g=document.querySelector('#mmhP947AccountGuard'),box=document.querySelector('#private-data').getBoundingClientRect();
      return !!g&&!g.hidden&&g.contains(document.elementFromPoint(box.x+box.width/2,box.y+box.height/2));
    });
    assert.equal(switchedMasked,true,'Switching identity must synchronously mask the old finance workspace');
    completed++;
    // Sign-out always covers old content until navigation completes.
    await reset();
    await page.evaluate(()=>window.__authCallback('SIGNED_OUT',null));
    await page.waitForURL(/login\.html$/);
    assert.equal(await page.locator('#private-data').count(),0,'Signed-out page must not contain financial data');
    completed++;
    assert.deepEqual(errors,[],browserType.name()+' browser script errors');
    await context.close();
  }finally{await browser.close();}
}
try{
  for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
    for(const [label,viewport] of [['desktop',{width:1280,height:800}],['mobile',{width:390,height:844}]]){
      await exercise(engine,viewport);
      console.log('PASS '+name+' '+label+' synthetic overlay, valid AAL, error, offline and MFA transition');
    }
  }
  assert.equal(completed,32);
  console.log('PASS: 32 browser scenarios across Chromium/WebKit desktop+mobile (synthetic fixtures only).');
}finally{await new Promise(resolve=>server.close(resolve));}
