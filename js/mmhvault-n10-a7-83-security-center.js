/* N10-A7.83: Account Security Center (authenticated users only).
   Never persists recovery words, TOTP secrets or JWTs in localStorage. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const root=$('mmhA783SecurityCenter');if(!root)return;
const API='https://vrypucmyrztxgiqhjspd.supabase.co/functions/v1/mmh-n10a783-phrase-verify';
let owner='',busy=false,pendingFactor='',pendingSecret='',factorId='',verifiedPhrase='',clearTimer=null,usernameOnly=false;
function client(){return typeof db!=='undefined'?db:null;}
function label(id,v){if($(id))$(id).textContent=v;}
function hideKey(){verifiedPhrase='';$('mmhA783KeyDisplay').hidden=true;$('mmhA783KeyQr').replaceChildren();$('mmhA783KeyWords').replaceChildren();$('mmhA783Phrase').value='';if(clearTimer)clearTimeout(clearTimer);}
function clearMfa(){pendingSecret='';pendingFactor='';$('mmhA783TotpSetup').hidden=true;$('mmhA783TotpQr').removeAttribute('src');$('mmhA783TotpSecret').textContent='';$('mmhA783TotpCode').value='';}
function status(t){label('mmhA783Status',t)}
async function verifiedUser(){
 const c=client();if(!c)throw Error('Authentication is unavailable');
 const {data,error}=await c.auth.getUser();if(error||!data?.user?.id||data.user.is_anonymous)throw Error('Please sign in');
 const {data:session,error:e}=await c.auth.getSession();
 if(e||session?.session?.user?.id!==data.user.id||!session.session.access_token)throw Error('Session needs refreshing');
 return {user:data.user,jwt:session.session.access_token};
}
async function api(action,extra={}){
 const a=await verifiedUser();
 const r=await fetch(API,{method:'POST',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json',Authorization:'Bearer '+a.jwt},body:JSON.stringify({action,...extra})});
 const d=await r.json().catch(()=>({code:'unavailable'}));
 return {ok:r.ok,body:d};
}
async function refresh(){
 if(busy)return;
 try{
   const {user}=await verifiedUser();
   if(owner&&owner!==user.id){hideKey();clearMfa();}
   owner=user.id;
   const [r,identities,factors,aal]=await Promise.all([
    api('status'),client().auth.getUserIdentities(),client().auth.mfa.listFactors(),client().auth.mfa.getAuthenticatorAssuranceLevel()
   ]);
   if(!r.ok)throw Error('Account security status is unavailable');
   const profile=r.body;usernameOnly=profile.username_only===true;
   const name=profile.username;
   label('mmhA783UsernameStatus',name?'@'+name:'Not linked');
   $('mmhA783BindUsername').hidden=!!name;
   $('mmhA783Recovery').hidden=!usernameOnly;
   label('mmhA783RecoveryStatus',usernameOnly?'Your original 10-word key remains valid. The original words cannot be retrieved from their secure verifier.':'Permanent ten-word recovery is available to username-only accounts.');
   if(identities.error)throw identities.error;
   const google=(identities.data?.identities||user.identities||[]).some(x=>x.provider==='google');
   label('mmhA783GoogleStatus',google?'Connected to this account':'Not connected');
   $('mmhA783LinkGoogle').disabled=google;
   $('mmhA783LinkGoogle').textContent=google?'Google connected':'Connect Google';
   if(factors.error||aal.error)throw factors.error||aal.error;
   const verified=(factors.data?.totp||[]).find(f=>f.status==='verified');
   factorId=verified?.id||'';
   label('mmhA783TotpStatus',verified?'Authenticator enabled':'Not enabled');
   $('mmhA783TotpStart').hidden=!!verified;
   $('mmhA783TotpRemove').hidden=!verified;
   $('mmhA783TotpRemove').disabled=!!verified&&aal.data?.currentLevel!=='aal2';
   label('mmhA783TotpHelp',verified
    ?(aal.data?.currentLevel==='aal2'?'Two-step verification is active for this session.':'Verify your six-digit code at sign-in to manage this factor.')
    :'Use Google Authenticator or another TOTP app. After binding, a six-digit code is required on new sign-ins.');
   status('Security details updated.');
 }catch(_){status('Sign in to view account security, or try again after refreshing.');}
}
$('mmhA783Refresh').addEventListener('click',()=>void refresh());
$('mmhA783BindUsername').addEventListener('click',async()=>{
 try{await verifiedUser();location.assign('username-setup.html?v=10.781.4');}catch{status('Please sign in before linking a username.');}
});
$('mmhA783LinkGoogle').addEventListener('click',async()=>{
 if(busy)return;busy=true;
 try{
   const {user}=await verifiedUser();
   const existing=await client().auth.getUserIdentities();
   if(existing.error)throw existing.error;
   if((existing.data?.identities||[]).some(x=>x.provider==='google')){status('Google is already connected.');return}
   const aal=await client().auth.mfa.getAuthenticatorAssuranceLevel();
   if(aal.error||(aal.data?.nextLevel==='aal2'&&aal.data?.currentLevel!=='aal2'))throw Error('Complete two-step verification first.');
   sessionStorage.setItem('mmh_a783_google_link_expected_uid',user.id);
   status('Opening Google authorization. Your original finance account will stay the same.');
   const {error}=await client().auth.linkIdentity({provider:'google',options:{redirectTo:'https://mmhvault.com/app.html?google_link=1'}});
   if(error)throw error;
 }catch(_){
   sessionStorage.removeItem('mmh_a783_google_link_expected_uid');
   status('Unable to link Google. Account linking may require enabling identity linking in authentication settings. No finance data was changed.');
 }finally{busy=false;}
});
$('mmhA783KeyVerify').addEventListener('click',async()=>{
 if(busy)return;const raw=$('mmhA783Phrase').value.trim().toLowerCase().replace(/\s+/g,' ');
 if(raw.split(' ').length!==10){status('Enter your existing ten words in the original order.');return}
 busy=true;
 try{
  const r=await api('verify_saved_phrase',{phrase:raw});
  if(!r.ok||r.body?.verified!==true)throw Error('invalid');
  verifiedPhrase=raw;hideKey();verifiedPhrase=raw;
  const list=$('mmhA783KeyWords');list.replaceChildren();
  raw.split(' ').forEach((w,i)=>{const el=document.createElement('div');el.className='mmh-a783-word';el.textContent=String(i+1).padStart(2,'0')+'  '+w;list.append(el)});
  const qr=$('mmhA783KeyQr');qr.replaceChildren();
  if(typeof QRCode==='function'){
   const name=$('mmhA783UsernameStatus').textContent.replace(/^@/,'');
   new QRCode(qr,{text:'MMHVAULT-RECOVERY-V1\nUSERNAME:'+name+'\nPHRASE:'+raw,width:186,height:186,colorDark:'#000',colorLight:'#fff',correctLevel:QRCode.CorrectLevel.L});
  }
  $('mmhA783KeyDisplay').hidden=false;$('mmhA783Phrase').value='';
  clearTimer=setTimeout(hideKey,60000);
  status('Saved words verified. Backup view will close automatically after 60 seconds.');
 }catch(_){hideKey();status('The recovery words could not be verified. Check the order.');}
 finally{busy=false;}
});
$('mmhA783KeyHide').addEventListener('click',hideKey);
$('mmhA783KeySaveQr').addEventListener('click',()=>{
 if(!verifiedPhrase)return;
 const qr=$('mmhA783KeyQr'),canvas=qr.querySelector('canvas'),img=qr.querySelector('img');
 const src=canvas?.toDataURL('image/png')||img?.src;if(!src)return;
 const a=document.createElement('a');a.href=src;a.download='MMHVAULT-Private-Recovery-QR.png';document.body.append(a);a.click();a.remove();
});
$('mmhA783TotpStart').addEventListener('click',async()=>{
 if(busy)return;
 if(!$('mmhA783TotpConsent')?.checked){status('Please confirm that you understand the backup requirements before enabling two-step verification.');return}
 busy=true;
 try{
  await verifiedUser();
  const existing=await client().auth.mfa.listFactors();
  if(existing.error||existing.data?.totp?.some(x=>x.status==='verified'))throw Error('Already enrolled');
  const {data,error}=await client().auth.mfa.enroll({factorType:'totp',friendlyName:'MMHVAULT Authenticator'});
  if(error||!data?.id||!data?.totp?.qr_code)throw error||Error('Enrollment unavailable');
  pendingFactor=data.id;pendingSecret=data.totp.secret||'';
  $('mmhA783TotpQr').src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(data.totp.qr_code);
  $('mmhA783TotpSecret').textContent=pendingSecret;
  $('mmhA783TotpSetup').hidden=false;
  status('Scan this QR with Google Authenticator, then enter its six-digit code. Do not share this secret.');
 }catch(_){status('Could not start authenticator setup. Please check the account and try again.');}
 finally{busy=false;}
});
$('mmhA783TotpConfirm').addEventListener('click',async()=>{
 if(busy||!pendingFactor)return;
 const code=$('mmhA783TotpCode').value.trim();if(!/^\d{6}$/.test(code)){status('Enter a six-digit authenticator code.');return}
 busy=true;
 try{
  const {data:challenge,error:challengeError}=await client().auth.mfa.challenge({factorId:pendingFactor});
  if(challengeError||!challenge?.id)throw challengeError||Error('challenge_failed');
  const {error}=await client().auth.mfa.verify({factorId:pendingFactor,challengeId:challenge.id,code});
  if(error)throw error;
  clearMfa();status('Authenticator enabled. New sign-ins will require a six-digit code.');
  setTimeout(()=>void refresh(),0);
 }catch(_){status('Could not verify this code. Check your device time and try a new code.');}
 finally{busy=false;$('mmhA783TotpCode').value='';}
});
$('mmhA783TotpCancel').addEventListener('click',async()=>{
 const id=pendingFactor;clearMfa();
 if(id){try{await client().auth.mfa.unenroll({factorId:id})}catch(_){}}
 status('Authenticator setup cancelled.');
});
$('mmhA783TotpRemove').addEventListener('click',()=>{
 $('mmhA783TotpRemoveConfirm').hidden=false;
 status('To remove your authenticator, enter REMOVE below. Only the verified owner can continue.');
});
$('mmhA783TotpRemoveNow').addEventListener('click',async()=>{
 if($('mmhA783TotpRemoveText').value!=='REMOVE'||!factorId)return;
 const aal=await client().auth.mfa.getAuthenticatorAssuranceLevel();
 if(aal.error||aal.data?.currentLevel!=='aal2'){status('Complete two-step verification before removing an authenticator.');return}
 const {error}=await client().auth.mfa.unenroll({factorId});if(error){status('Unable to remove the authenticator.');return}
 $('mmhA783TotpRemoveText').value='';$('mmhA783TotpRemoveConfirm').hidden=true;status('Authenticator removed.');void refresh();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)hideKey();});
window.addEventListener('pagehide',()=>{hideKey();clearMfa();});
root.closest('details')?.addEventListener('toggle',e=>{if(e.target.open)void refresh()});
if(client()){
 client().auth.onAuthStateChange((event)=>{if(['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED'].includes(event))setTimeout(()=>{if(event==='SIGNED_OUT'){owner='';hideKey();clearMfa();}else void refresh()},0)});
 setTimeout(refresh,400);
}
})();