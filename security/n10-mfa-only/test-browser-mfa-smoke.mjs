// N10 MFA-only synthetic browser smoke checks. No real Auth or Vault calls.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {chromium,webkit} from 'playwright';

const code=readFileSync(resolve('js/mmhvault-n10-a7-83-security-center.js'),'utf8');
assert.doesNotMatch(code,/N10_FIXED_VAULT_UI_RELEASED|VAULT_API|vaultApi\(|mmhN10VaultPassword/);
const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+
'<div id="settings" class="active"><div id="stPage_security"><div id="mmhA783SecurityCenter">'+
'<button id="mmhA783Refresh">Refresh</button><span id="mmhA783Status"></span>'+
'<span id="mmhA783UsernameStatus"></span><span id="mmhA783GoogleStatus"></span>'+
'<span id="mmhA783TotpStatus"></span><span id="mmhA783RecoveryStatus"></span>'+
'<span id="mmhA783TotpHelp"></span>'+
'<div class="mmh-a783-section" id="mmhA783Recovery">'+
'<div class="mmh-a783-title"><b>Permanent recovery key</b></div>'+
'<p class="mmh-a783-note">Recovery summary</p><label for="mmhA783Phrase">Saved phrase</label>'+
'<div class="mmh-a789-phrase-field"><input type="password" id="mmhA783Phrase"><button id="mmhA783PhraseToggle">Show words</button></div>'+
'<p id="mmhA783PhrasePrivacy"></p><button id="mmhA783KeyVerify">Verify</button>'+
'<div id="mmhA783KeyDisplay" hidden><div id="mmhA783KeyQr"></div>'+
'<div id="mmhA783KeyWords"></div><p class="mmh-a783-note"></p>'+
'<button id="mmhA783KeyHide">Hide key</button><button id="mmhA783KeySaveQr">Save QR</button></div></div>'+
'<div class="mmh-a783-section" id="syntheticMfaSection">'+
'<div class="mmh-a783-title"><b>Authenticator</b></div>'+
'<label><input type="checkbox" id="mmhA783TotpConsent">Consent</label>'+
'<button id="mmhA783TotpStart">Set up Authenticator</button>'+
'<p id="mmhA783TotpReleaseNotice">Unavailable</p>'+
'<div id="mmhA783TotpSetup" hidden><div id="mmhA783TotpQr"></div>'+
'<div id="mmhA783TotpSecret" hidden></div><input id="mmhA783TotpCode">'+
'<button id="mmhA783KeyReveal">Setup key</button>'+
'<button id="mmhA783TotpConfirm">Verify</button><button id="mmhA783TotpCancel">Cancel</button></div>'+
'<button id="mmhA783TotpRemove">Remove authenticator</button>'+
'<div id="mmhA783TotpRemoveConfirm" hidden><input id="mmhA783TotpRemoveText">'+
'<button id="mmhA783TotpRemoveNow">Confirm removal</button></div></div>'+
'<div class="mmh-a783-section" id="syntheticGoogleSection">'+
'<div class="mmh-a783-title"><b>Google account</b></div><button id="mmhA783LinkGoogle">Link</button></div>'+
'<div class="mmh-a783-section" id="syntheticUsernameSection">'+
'<div class="mmh-a783-title"><b>Username</b></div><button id="mmhA783BindUsername">Link username</button></div>'+
'</div></div></div></body></html>';
function setupSynthetic(){
  const uid='00000000-0000-4000-8000-0000000000aa';
  window.__fakeUserId=uid;
  window.__enrollReached=false;
  window.__unenrollCalls=[];
  window.__fetches=[];
  window.__verifyStarted=false;
  window.fetch=async (url,options={})=>{
    window.__fetches.push(String(url));
    if(!String(url).endsWith('/mmh-n10a783-phrase-verify'))throw Error('Forbidden external request');
    const action=JSON.parse(options.body||'{}').action;
    if(action==='verify_saved_phrase'){
      window.__verifyStarted=true;
      return new Promise(resolve=>{window.__resolveVerify=verified=>resolve({
        ok:true,json:async()=>({verified})
      });});
    }
    return {ok:true,json:async()=>({code:'account_status',username_only:true,username:'synthetic_user'})};
  };
  const mfa={
    listFactors:async()=>({data:{all:[],totp:[]},error:null}),
    getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:'aal1'},error:null}),
    unenroll:async({factorId})=>{window.__unenrollCalls.push(factorId);return {error:null};},
    enroll:async()=>{window.__enrollReached=true;return await new Promise(resolve=>{window.__resolveEnroll=resolve;});},
    challenge:async()=>{throw Error('No challenge allowed');},
    verify:async()=>{throw Error('No verification allowed');}
  };
  window.__mfa=mfa;
  window.db={auth:{
    getUser:async()=>({data:{user:{id:window.__fakeUserId,email:'synthetic@example.invalid',is_anonymous:false}},error:null}),
    getSession:async()=>({data:{session:{user:{id:window.__fakeUserId},access_token:'LOCAL_FAKE_NOT_JWT'}},error:null}),
    getUserIdentities:async()=>({data:{identities:[]},error:null}),
    mfa,
    onAuthStateChange:cb=>{window.__authCallback=cb;return {data:{subscription:{unsubscribe(){}}}};}
  }};
  window.__resolveSyntheticEnroll=()=>window.__resolveEnroll({
    data:{id:'synthetic-factor-01',totp:{
      secret:'NOT_A_SECRET',
      qr_code:'<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"></svg>',
      uri:'otpauth://totp/SYNTHETIC?secret=NOTREAL'
    }},error:null
  });
}
const server=createServer((req,res)=>{
 if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);}
 else {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
async function ready(page){
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='127.0.0.1'&&u.port===String(port))return route.continue();
   return route.abort();
 });
 await page.goto('http://127.0.0.1:'+port+'/');
 await page.addScriptTag({content:'('+setupSynthetic.toString()+')()'});
 await page.addScriptTag({content:code});
 await page.waitForTimeout(500);
 assert.deepEqual(errors,[],'script initialization should not throw');
 const controls=await page.evaluate(()=>({
   overlays:document.querySelectorAll('body > .mmh-n10-modal-overlay').length,
   vaultAbsent:document.getElementById('mmhN10VaultRecoveryControls')===null,
   startHidden:document.getElementById('mmhA783TotpStart').hidden
 }));
 assert.equal(controls.overlays,4);
 assert.equal(controls.vaultAbsent,true);
 assert.equal(controls.startHidden,false);
 return errors;
}
async function enrollPending(page){
 await page.locator('#syntheticMfaSection > .mmh-a783-title').click();
 await page.locator('#mmhA783TotpConsent').check();
 await page.locator('#mmhA783TotpStart').click();
 await page.waitForFunction(()=>window.__enrollReached===true);
}
try{
 for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch({headless:true});
  try{
   const page=await browser.newPage();
   const errors=await ready(page);
   await enrollPending(page);
   await page.locator('body > .mmh-n10-modal-overlay:not([hidden]) .mmh-n10-modal-close').click();
   await page.evaluate(()=>window.__resolveSyntheticEnroll());
   await page.waitForTimeout(100);
   const after=await page.evaluate(()=>({
     setupHidden:document.getElementById('mmhA783TotpSetup').hidden,
     qr:document.getElementById('mmhA783TotpQr').childElementCount,
     secret:document.getElementById('mmhA783TotpSecret').textContent,
     unenroll:window.__unenrollCalls,
     fetches:window.__fetches
   }));
   assert.equal(after.setupHidden,true);
   assert.equal(after.qr,0);
   assert.equal(after.secret,'');
   assert.deepEqual(after.unenroll,['synthetic-factor-01']);
   assert.ok(after.fetches.every(url=>url.endsWith('/mmh-n10a783-phrase-verify')));
   assert.deepEqual(errors,[]);
   await page.close();
   console.log('PASS',name,'late enrollment after modal close');

   const page2=await browser.newPage();
   const errors2=await ready(page2);
   await enrollPending(page2);
   await page2.evaluate(()=>{
     Object.defineProperty(document,'hidden',{configurable:true,value:true});
     document.dispatchEvent(new Event('visibilitychange'));
     Object.defineProperty(document,'hidden',{configurable:true,value:false});
   });
   await page2.evaluate(()=>window.__resolveSyntheticEnroll());
   await page2.waitForTimeout(100);
   const afterHide=await page2.evaluate(()=>({
     setupHidden:document.getElementById('mmhA783TotpSetup').hidden,
     qr:document.getElementById('mmhA783TotpQr').childElementCount,
     cancelCount:window.__unenrollCalls.length
   }));
   assert.equal(afterHide.setupHidden,true);
   assert.equal(afterHide.qr,0);
   assert.equal(afterHide.cancelCount,1);
   assert.deepEqual(errors2,[]);
   await page2.close();
   console.log('PASS',name,'background roundtrip invalidates late enrollment');

   const page3=await browser.newPage();
   const errors3=await ready(page3);
   await page3.locator('#mmhA783Recovery > .mmh-a783-title').click();
   const logout=await page3.evaluate(()=>{
     document.getElementById('mmhA783Phrase').value='fake words';
          document.getElementById('mmhA783KeyWords').textContent='FAKE_WORDS';
     window.__authCallback('SIGNED_OUT',null);
     return {
       phrase:document.getElementById('mmhA783Phrase').value,
              words:document.getElementById('mmhA783KeyWords').textContent,
       open:document.getElementById('mmhA783Recovery').classList.contains('mmh-a785-open')
     };
   });
   assert.deepEqual(logout,{phrase:'',words:'',open:false});
   assert.deepEqual(errors3,[]);
   await page3.close();
   console.log('PASS',name,'logout clears synthetic secret UI synchronously');

   // A starts enrollment. B signs in before Auth responds. Never show A's
   // QR, and never attempt to unenroll A's factor with B's credentials.
   const page4=await browser.newPage();
   const errors4=await ready(page4);
   await enrollPending(page4);
   const immediate=await page4.evaluate(()=>{
     const a=document.getElementById('mmhA783TotpSecret');
     a.hidden=false;a.textContent='SYNTHETIC_A_SECRET';
     document.getElementById('mmhA783TotpCode').value='123456';
     window.__fakeUserId='00000000-0000-4000-8000-0000000000bb';
     window.__authCallback('SIGNED_IN',{user:{id:window.__fakeUserId}});
     return {
       secret:a.textContent,
       code:document.getElementById('mmhA783TotpCode').value,
       open:document.getElementById('syntheticMfaSection').classList.contains('mmh-a785-open')
     };
   });
   assert.deepEqual(immediate,{secret:'',code:'',open:false});
   await page4.evaluate(()=>window.__resolveSyntheticEnroll());
   await page4.waitForTimeout(150);
   const switched=await page4.evaluate(()=>({
     hidden:document.getElementById('mmhA783TotpSetup').hidden,
     qr:document.getElementById('mmhA783TotpQr').childElementCount,
     secret:document.getElementById('mmhA783TotpSecret').textContent,
     unenroll:window.__unenrollCalls,
     fetches:window.__fetches
   }));
   assert.equal(switched.hidden,true);
   assert.equal(switched.qr,0);
   assert.equal(switched.secret,'');
   assert.deepEqual(switched.unenroll,[],'B must not unenroll A factor');
   assert.ok(switched.fetches.every(url=>url.endsWith('/mmh-n10a783-phrase-verify')));
   assert.deepEqual(errors4,[]);
   await page4.close();
   console.log('PASS',name,'A-to-B switch blocks late QR and cross-account cleanup');

   // A's recovery panel must wipe immediately on B's SIGNED_IN event.
   const page5=await browser.newPage();
   const errors5=await ready(page5);
   await page5.locator('#mmhA783Recovery > .mmh-a783-title').click();
   const recoverySwitch=await page5.evaluate(()=>{
     document.getElementById('mmhA783Phrase').value='NOT_REAL_RECOVERY_WORDS';
          document.getElementById('mmhA783KeyWords').textContent='NOT_REAL_WORDS';
     document.getElementById('mmhA783KeyDisplay').hidden=false;
     window.__fakeUserId='00000000-0000-4000-8000-0000000000bb';
     window.__authCallback('SIGNED_IN',{user:{id:window.__fakeUserId}});
     return {
       phrase:document.getElementById('mmhA783Phrase').value,
              words:document.getElementById('mmhA783KeyWords').textContent,
       displayed:!document.getElementById('mmhA783KeyDisplay').hidden,
       open:document.getElementById('mmhA783Recovery').classList.contains('mmh-a785-open')
     };
   });
   assert.deepEqual(recoverySwitch,{phrase:'',words:'',displayed:false,open:false});
   assert.deepEqual(errors5,[]);
   await page5.close();
   console.log('PASS',name,'A-to-B switch synchronously wipes recovery UI');

   // Verify that a server accepted the code is insufficient: Auth must also
   // report the expected assurance level AND the SAME verified factor ID.
   for(const [caseName,assurance,factors] of [
    ['AAL1 despite verify success','aal1',[{id:'synthetic-factor-01',factor_type:'totp',status:'verified'}]],
    ['AAL2 but matching factor unverified','aal2',[{id:'synthetic-factor-01',factor_type:'totp',status:'unverified'}]]
   ]){
    const checkPage=await browser.newPage();
    const checkErrors=await ready(checkPage);
    await enrollPending(checkPage);
    await checkPage.evaluate(()=>window.__resolveSyntheticEnroll());
    await checkPage.locator('#mmhA783TotpSetup').waitFor({state:'visible'});
    await checkPage.locator('#mmhA783TotpBackupConfirmed').check();
    await checkPage.evaluate(({assurance,factors})=>{
     window.__mfa.challenge=async()=>({data:{id:'synthetic-challenge'},error:null});
     window.__mfa.verify=async()=>({data:{},error:null});
     window.__mfa.getAuthenticatorAssuranceLevel=async()=>({
      data:{currentLevel:assurance,nextLevel:assurance},error:null
     });
     window.__mfa.listFactors=async()=>({data:{all:factors,totp:factors.filter(f=>f.status==='verified')},error:null});
    },{assurance,factors});
    await checkPage.locator('#mmhA783TotpCode').fill('123456');
    await checkPage.locator('#mmhA783TotpConfirm').click();
    await checkPage.waitForFunction(()=>document.getElementById('mmhA783Status').textContent.includes('Could not verify'));
    const failState=await checkPage.evaluate(()=>({
     words:document.getElementById('mmhA783Status').textContent,
     stillSetup:!document.getElementById('mmhA783TotpSetup').hidden,
     otp:document.getElementById('mmhA783TotpCode').value
    }));
    assert.equal(failState.stillSetup,true);
    assert.equal(failState.otp,'');
    assert.ok(!failState.words.includes('Authenticator enabled'));
    assert.deepEqual(checkErrors,[]);
    await checkPage.close();
    console.log('PASS',name,caseName,'cannot claim MFA success');
   }

   // Local fixture only: verify the modal CSS at compact CSS viewport sizes.
   // Not evidence of production CSS, real touch hardware or iPhone Safari.
   for(const width of [320,390]){
    const mobile=await browser.newPage({viewport:{width,height:568}});
    const mobileErrors=await ready(mobile);
    await mobile.locator('#mmhA783Recovery > .mmh-a783-title').click();
    const layout=await mobile.evaluate(()=>{
      const overlay=document.querySelector('body > .mmh-n10-modal-overlay:not([hidden])');
      const card=overlay.querySelector('.mmh-n10-modal-card');
      const scroll=overlay.querySelector('.mmh-n10-modal-scroll');
      const rect=card.getBoundingClientRect();
      return {
       width:window.innerWidth,cardLeft:rect.left,cardRight:rect.right,
       cardTop:rect.top,cardBottom:rect.bottom,scrollWidth:scroll.scrollWidth,
       clientWidth:scroll.clientWidth,focusInside:overlay.contains(document.activeElement),
       ariaDialog:card.getAttribute('role')
      };
    });
    assert.equal(layout.width,width);
    assert.ok(layout.cardLeft>=-1&&layout.cardRight<=width+1,'card overflows '+width+'px width: '+JSON.stringify(layout));
    assert.ok(layout.cardTop>=-1&&layout.cardBottom<=569,'card overflows viewport height: '+JSON.stringify(layout));
    assert.ok(layout.scrollWidth<=layout.clientWidth+1,'content horizontal overflow: '+JSON.stringify(layout));
    assert.equal(layout.focusInside,true);
    assert.equal(layout.ariaDialog,'dialog');
    assert.deepEqual(mobileErrors,[]);
    await mobile.close();
    console.log('PASS',name,'modal fits',width+'px viewport without horizontal overflow');
   }
   const keyboard=await browser.newPage({viewport:{width:390,height:844}});
   const keyboardErrors=await ready(keyboard);
   await keyboard.locator('#mmhA783Recovery > .mmh-a783-title').click();
   await keyboard.keyboard.press('Escape');
   const closed=await keyboard.evaluate(()=>({
    open:document.getElementById('mmhA783Recovery').classList.contains('mmh-a785-open'),
    overlays:[...document.querySelectorAll('body > .mmh-n10-modal-overlay:not([hidden])')].length,
    lock:document.body.classList.contains('mmh-n10-account-modal-open')
   }));
   assert.deepEqual(closed,{open:false,overlays:0,lock:false});
   assert.deepEqual(keyboardErrors,[]);
   await keyboard.close();
   console.log('PASS',name,'Escape closes mobile modal and releases page lock');

   // Verify sensitive recovery words do not appear if the original
   // Auth-confirmed response arrives after logout, owner switch, modal
   // close, or a hidden/foreground transition. All responses are simulated.
   for(const kind of ['signout','switch','close','background']){
     const recoveryPage=await browser.newPage();
     const recoveryErrors=await ready(recoveryPage);
     await recoveryPage.locator('#mmhA783Recovery > .mmh-a783-title').click();
     await recoveryPage.locator('#mmhA783Phrase').fill('alpha bravo charlie delta echo foxtrot golf hotel india juliet');
     await recoveryPage.locator('#mmhA783KeyVerify').click();
     await recoveryPage.waitForFunction(()=>window.__verifyStarted===true);
     if(kind==='signout'){
       await recoveryPage.evaluate(()=>window.__authCallback('SIGNED_OUT',null));
     }else if(kind==='switch'){
       await recoveryPage.evaluate(()=>{
         window.__fakeUserId='00000000-0000-4000-8000-0000000000bb';
         window.__authCallback('SIGNED_IN',{user:{id:window.__fakeUserId}});
       });
     }else if(kind==='close'){
       await recoveryPage.locator('body > .mmh-n10-modal-overlay:not([hidden]) .mmh-n10-modal-close').click();
     }else{
       await recoveryPage.evaluate(()=>{
         Object.defineProperty(document,'hidden',{configurable:true,value:true});
         document.dispatchEvent(new Event('visibilitychange'));
         Object.defineProperty(document,'hidden',{configurable:true,value:false});
       });
     }
     await recoveryPage.evaluate(()=>window.__resolveVerify(true));
     await recoveryPage.waitForTimeout(100);
     const visible=await recoveryPage.evaluate(()=>({
       display:document.getElementById('mmhA783KeyDisplay').hidden,
       words:document.getElementById('mmhA783KeyWords').textContent,
       raw:document.getElementById('mmhA783Phrase').value,
       qr:document.getElementById('mmhA783KeyQr').childElementCount,
       status:document.getElementById('mmhA783Status').textContent
     }));
     assert.equal(visible.display,true,'stale response reopened key view: '+kind);
     assert.equal(visible.words,'','stale recovery words displayed: '+kind);
     assert.equal(visible.raw,'','old input present: '+kind);
     assert.equal(visible.qr,0,'old QR visible: '+kind);
     assert.ok(!visible.status.includes('Saved words verified'),'false recovery success after '+kind);
     assert.deepEqual(recoveryErrors,[]);
     await recoveryPage.close();
     console.log('PASS',name,'late recovery response stays hidden after '+kind);
   }
  }finally{await browser.close();}
 }
 console.log('28/28 isolated browser smoke checks PASS');
}finally{await new Promise(resolve=>server.close(resolve));}
