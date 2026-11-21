import assert from 'node:assert/strict';
import test from 'node:test';
import {attachRecoveryViewLifecycle} from './recovery-view-lifecycle.mjs';
function setup({invalidAuth=false,initiallyHidden=false,initiallyFocused=undefined}={}) {
 let hiddenCount=0, callback, unsubscribed=0;
 const doc=new EventTarget(), win=new EventTarget(), close=new EventTarget();
 doc.hidden=initiallyHidden;
 if (initiallyFocused !== undefined) doc.hasFocus=()=>initiallyFocused;
 const auth={onAuthStateChange(fn){
   callback=fn;
   return invalidAuth?{data:{}}:{data:{subscription:{unsubscribe(){unsubscribed++}}}};
 }};
 const controller={hide(){hiddenCount++}};
 const harness={doc,win,close,auth,controller,
   hides:()=>hiddenCount,emitAuth:e=>callback(e),unsubs:()=>unsubscribed};
 return harness;
}
test('backgrounding the page immediately hides recovery words',()=>{
 const h=setup();const binding=attachRecoveryViewLifecycle({
  controller:h.controller,documentRef:h.doc,windowRef:h.win,auth:h.auth,
 });
 h.doc.hidden=true;h.doc.dispatchEvent(new Event('visibilitychange'));
 assert.equal(h.hides(),1);binding.destroy();
});
test('foreground visibility alone must not change a key view',()=>{
 const h=setup();const binding=attachRecoveryViewLifecycle({
  controller:h.controller,documentRef:h.doc,windowRef:h.win,auth:h.auth,
 });
 h.doc.dispatchEvent(new Event('visibilitychange'));
 assert.equal(h.hides(),0);binding.destroy();
});
test('switching to another application hides words even when the page is still visible',()=>{
 const h=setup();const binding=attachRecoveryViewLifecycle({
  controller:h.controller,documentRef:h.doc,windowRef:h.win,auth:h.auth,
 });
 assert.equal(h.doc.hidden,false);
 h.win.dispatchEvent(new Event('blur'));
 assert.equal(h.hides(),1);
 h.win.dispatchEvent(new Event('focus'));
 assert.equal(h.hides(),1,'focus must never automatically re-expose the key');
 binding.destroy();
});
test('page navigation hides original words before leaving',()=>{
 const h=setup();const binding=attachRecoveryViewLifecycle({
  controller:h.controller,documentRef:h.doc,windowRef:h.win,auth:h.auth,
 });
 h.win.dispatchEvent(new Event('pagehide'));assert.equal(h.hides(),1);binding.destroy();
});
test('existing glass-modal close control triggers hide',()=>{
 const h=setup();const binding=attachRecoveryViewLifecycle({
  controller:h.controller,documentRef:h.doc,windowRef:h.win,auth:h.auth,
  closeTargets:[h.close],
 });
 h.close.dispatchEvent(new Event('click'));assert.equal(h.hides(),1);binding.destroy();
});
for(const event of ['SIGNED_OUT','SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED','PASSWORD_RECOVERY','MFA_CHALLENGE_VERIFIED']){
 test('auth event '+event+' clears recovery words',()=>{
  const h=setup();const binding=attachRecoveryViewLifecycle({
   controller:h.controller,documentRef:h.doc,windowRef:h.win,auth:h.auth,
  });
  h.emitAuth(event);assert.equal(h.hides(),1);binding.destroy();
 });
}
test('initial session event does not clear an unopened view',()=>{
 const h=setup();const binding=attachRecoveryViewLifecycle({
  controller:h.controller,documentRef:h.doc,windowRef:h.win,auth:h.auth,
 });
 h.emitAuth('INITIAL_SESSION');assert.equal(h.hides(),0);binding.destroy();
});
test('already-unfocused desktop window locks words during observer installation',()=>{
 const h=setup({initiallyFocused:false});
 const binding=attachRecoveryViewLifecycle({
  controller:h.controller,documentRef:h.doc,windowRef:h.win,auth:h.auth,
 });
 assert.equal(h.doc.hidden,false,'visibility alone must not be the only guard');
 assert.equal(h.hides(),1,'attach must immediately lock when focus was already lost');
 binding.destroy();
});
test('currently-focused document does not falsely lock during attachment',()=>{
 const h=setup({initiallyFocused:true});
 const binding=attachRecoveryViewLifecycle({
  controller:h.controller,documentRef:h.doc,windowRef:h.win,auth:h.auth,
 });
 assert.equal(h.hides(),0);
 binding.destroy();
});
test('already hidden document is locked immediately at installation',()=>{
 const h=setup({initiallyHidden:true});const binding=attachRecoveryViewLifecycle({
  controller:h.controller,documentRef:h.doc,windowRef:h.win,auth:h.auth,
 });
 assert.equal(h.hides(),1);binding.destroy();
});
test('destroy unsubscribes and removes all event listeners',()=>{
 const h=setup();const binding=attachRecoveryViewLifecycle({
  controller:h.controller,documentRef:h.doc,windowRef:h.win,auth:h.auth,
  closeTargets:[h.close],
 });
 binding.destroy();binding.destroy();
 assert.equal(h.hides(),1);assert.equal(h.unsubs(),1);
 h.doc.hidden=true;h.doc.dispatchEvent(new Event('visibilitychange'));
 h.win.dispatchEvent(new Event('pagehide'));h.win.dispatchEvent(new Event('blur'));h.close.dispatchEvent(new Event('click'));
 h.emitAuth('SIGNED_OUT');
 assert.equal(h.hides(),1);
});
test('failed auth-observer initialization aborts and cleans up safely',()=>{
 const h=setup({invalidAuth:true});
 assert.throws(()=>attachRecoveryViewLifecycle({
  controller:h.controller,documentRef:h.doc,windowRef:h.win,auth:h.auth,
  closeTargets:[h.close],
 }),{message:'recovery_lifecycle_unavailable'});
 assert.equal(h.hides(),1);
 h.doc.hidden=true;h.doc.dispatchEvent(new Event('visibilitychange'));
 h.win.dispatchEvent(new Event('pagehide'));h.win.dispatchEvent(new Event('blur'));h.close.dispatchEvent(new Event('click'));
 assert.equal(h.hides(),1);
});
