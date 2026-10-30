/* N10-A7.83: Account Security Center (authenticated users only).
   Never persists recovery words, TOTP secrets or JWTs in localStorage. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const root=$('mmhA783SecurityCenter');if(!root)return;
const API='https://vrypucmyrztxgiqhjspd.supabase.co/functions/v1/mmh-n10a783-phrase-verify';

const A783_STATIC_ZH={"ACCOUNT SECURITY":"账户安全","Refresh":"刷新","Login methods & recovery":"登录方式与账户恢复","Manage your existing account without creating a second wallet or transferring finance records.":"管理现有账户，不会创建第二个财务账户或迁移财务记录。","Username":"用户名","Existing email users can add a username and continue using their original password and data.":"邮箱用户可绑定用户名，继续使用原密码及全部原有数据。","Link a username":"绑定用户名","Permanent recovery key":"永久恢复密钥","10 words":"十个单词","Your permanent recovery key is verified, not stored as readable words.":"系统仅保存密钥校验值，不会以可读取的形式保存原始恢复词。","For your protection, the original ten words cannot be retrieved from their secure verifier. Enter the words you saved to verify them and re-create your QR code locally.":"原始恢复词无法从校验值中找回。请输入您保存的十个单词，验证后可在本机重新生成恢复二维码。","Your saved 10 words, in the original order":"请输入原有十词，顺序必须一致","Verify saved words":"验证恢复词","Save my QR":"保存二维码","Hide key":"隐藏密钥","This backup view automatically closes after one minute. Anyone with these words can log in.":"恢复词将于 60 秒后自动隐藏。持有这组恢复词的人可能使用它登录您的账户，请妥善保管。","Google account":"Google 账户","Link Google to this same account. Linking does not transfer assets or create a new finance UID.":"将 Google 账号关联到同一个账户，不会迁移资产或创建新 UID。","Connect Google":"关联 Google","Authenticator · Two-step verification":"身份验证器 · 双重验证","Use a time-based six-digit code for additional protection during sign-in.":"登录时使用动态六位验证码，进一步保护账户。","Before enabling: save a backup of your authenticator codes or setup on a second trusted device. If you lose your authenticator, the permanent 10-word key alone does not bypass the second step. Do not enable until you have a recovery plan.":"开启前，请备份验证器或配置第二台可信设备。如果丢失验证器，仅凭永久十词无法跳过第二步验证。请确认有恢复方案后再开启。","I understand this second-step recovery limitation.":"我已理解双重验证的账户恢复限制。","Set up Authenticator":"设置身份验证器","Scan the QR with Google Authenticator or a compatible app. Do not share this QR or setup secret.":"使用 Google Authenticator 或其他兼容应用扫描二维码，不要分享二维码或设置密钥。","Manual setup key":"手动设置密钥","Six-digit code":"六位动态验证码","Verify & enable":"验证并开启","Cancel":"取消","Remove authenticator":"解绑身份验证器","Removing the last factor reduces account protection. Type REMOVE to confirm.":"移除最后一个验证器将降低账户安全性。请输入 REMOVE 确认。","Confirm removal":"确认解绑","Sign in to manage account security.":"登录后即可管理账户安全。"};
const A783_DYNAMIC_ZH={"Not linked":"未绑定","Permanent ten-word recovery is available to username-only accounts.":"永久十词恢复功能适用于纯用户名账户。","Your original 10-word key remains valid. The original words cannot be retrieved from their secure verifier.":"原始十词密钥仍然有效，但无法从安全校验值中还原原文。","Connected to this account":"已关联本账户","Not connected":"未关联","Google connected":"已关联 Google","Authenticator enabled":"已启用身份验证器","Not enabled":"未启用","Two-step verification is active for this session.":"本次会话已通过双重验证。","Verify your six-digit code at sign-in to manage this factor.":"请在登录时完成六位验证码验证后再管理此验证器。","Use Google Authenticator or another TOTP app. After binding, a six-digit code is required on new sign-ins.":"支持 Google Authenticator 等标准 TOTP 应用，绑定后登录需验证六位动态码。","Security details updated.":"安全信息已更新。","Sign in to view account security, or try again after refreshing.":"请登录后查看账户安全，或刷新页面重试。","Please sign in before linking a username.":"请先登录再绑定用户名。","Google is already connected.":"Google 已绑定。","Opening Google authorization. Your original finance account will stay the same.":"正在前往 Google 授权，原财务账户不会变更。","Unable to link Google. Account linking may require enabling identity linking in authentication settings. No finance data was changed.":"Google 关联未完成。可能需要在认证设置中开放身份关联，财务数据未被修改。","Enter your existing ten words in the original order.":"请输入原始十个单词，并保持原有顺序。","Saved words verified. Backup view will close automatically after 60 seconds.":"恢复词验证通过，60 秒后自动隐藏。","The recovery words could not be verified. Check the order.":"恢复词验证失败，请检查单词及顺序。","Please confirm that you understand the backup requirements before enabling two-step verification.":"开启双重验证前，请先确认已了解备份要求。","Already enrolled":"已经绑定","Could not start authenticator setup. Please check the account and try again.":"无法开始验证器设置，请检查账户后重试。","Scan this QR with Google Authenticator, then enter its six-digit code. Do not share this secret.":"请扫描二维码并输入六位动态码，切勿分享设置密钥。","Enter a six-digit authenticator code.":"请输入六位动态验证码。","Authenticator enabled. New sign-ins will require a six-digit code.":"验证器已启用，后续登录需要六位动态码。","Could not verify this code. Check your device time and try a new code.":"验证码无效，请检查设备时间并输入新的验证码。","Authenticator setup cancelled.":"已取消验证器设置。","To remove your authenticator, enter REMOVE below. Only the verified owner can continue.":"解绑验证器请输入 REMOVE，只有已验证的账户所有者可以继续。","Complete two-step verification before removing an authenticator.":"解绑前请先完成双重验证。","Unable to remove the authenticator.":"无法解绑验证器。","Authenticator removed.":"已解绑验证器。"};
Object.assign(A783_STATIC_ZH,{"Show setup key":"显示设置密钥","Hide setup key":"隐藏设置密钥"});
Object.assign(A783_STATIC_ZH,{"Show words":"显示恢复词","Hide words":"隐藏恢复词","Recovery words stay hidden while typing. Show only in private.":"输入时默认隐藏恢复词，仅在私人环境中显示。"});
function a783IsZh(){return (localStorage.getItem('mmhvault_language_v3363')||document.documentElement.lang||'').toLowerCase().startsWith('zh');}
function a783Text(en){return a783IsZh()?(A783_DYNAMIC_ZH[en]||A783_STATIC_ZH[en]||en):en;}
const a783FixedNodes=[];
root.querySelectorAll('h3,p,b,strong,span,button,label').forEach(el=>{
  const en=el.textContent.trim();
  if(!Object.prototype.hasOwnProperty.call(A783_STATIC_ZH,en))return;
  const textNode=[...el.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&node.nodeValue.trim());
  if(el.children.length&&(!textNode||el.children.length>1))return;
  a783FixedNodes.push({el,en,node:el.children.length?textNode:null});
});
const a783Placeholders=[];
root.querySelectorAll('[placeholder]').forEach(el=>{
  const en=el.getAttribute('placeholder');
  if(en==='word1 word2 word3 … word10'||en==='000000'||en==='REMOVE')a783Placeholders.push({el,en});
});
function a783RenderLanguage(){
  a783FixedNodes.forEach(({el,en,node})=>{
    const translated=a783Text(en);
    if(node){node.nodeValue=' '+translated;}else{el.textContent=translated;}
  });
  a783Placeholders.forEach(({el,en})=>el.placeholder=a783IsZh()?(en==='word1 word2 word3 … word10'?'按顺序输入十个单词':en):en);
  root.querySelectorAll('[data-mmh-a783-dynamic-en]').forEach(el=>{
    el.textContent=a783Text(el.dataset.mmhA783DynamicEn);
  });
}
function a783Action(id,en){const el=$(id);if(el){el.dataset.mmhA783DynamicEn=en;el.textContent=a783Text(en);}}
window.addEventListener('mmhvault-language-change',a783RenderLanguage);
document.addEventListener('click',event=>{
 if(event.target.closest('.language-choice-v3363'))setTimeout(a783RenderLanguage,0);
});

let owner='',busy=false,pendingFactor='',pendingSecret='',factorId='',verifiedPhrase='',clearTimer=null,usernameOnly=false;
function client(){return typeof db!=='undefined'?db:null;}
function label(id,v){const el=$(id);if(el){el.dataset.mmhA783DynamicEn=v;el.textContent=a783Text(v);}}
function hideKey(){verifiedPhrase='';$('mmhA783KeyDisplay').hidden=true;$('mmhA783KeyQr').replaceChildren();$('mmhA783KeyWords').replaceChildren();$('mmhA783Phrase').value='';$('mmhA783Phrase').type='password';$('mmhA783PhraseToggle').setAttribute('aria-pressed','false');a783Action('mmhA783PhraseToggle','Show words');if(clearTimer)clearTimeout(clearTimer);}
function clearMfa(){pendingSecret='';pendingFactor='';$('mmhA783TotpSetup').hidden=true;$('mmhA783TotpQr').replaceChildren();$('mmhA783TotpSecret').textContent='';$('mmhA783TotpSecret').hidden=true;$('mmhA783TotpCode').value='';a783Action('mmhA783KeyReveal','Show setup key');}
async function cancelPendingMfa(){const id=pendingFactor;clearMfa();if(!id)return true;try{const r=await client().auth.mfa.unenroll({factorId:id});return !r.error}catch(_){return false}}
function displayTotpQr(totp){
 const holder=$('mmhA783TotpQr');holder.replaceChildren();
 if(typeof QRCode==='function' && String(totp.uri||'').startsWith('otpauth://')){
  new QRCode(holder,{text:totp.uri,width:188,height:188,colorDark:'#132335',colorLight:'#fff',correctLevel:QRCode.CorrectLevel.M});return;
 }
 const code=String(totp.qr_code||''),comma=code.indexOf(',');
 let src='';
 if(code.startsWith('data:image/svg+xml')&&comma>0){const body=code.slice(comma+1);src=body.trimStart().startsWith('<svg')?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(body):code;}
 else if(code.trimStart().startsWith('<svg'))src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(code);
 if(!src)throw Error('QR generation unavailable');
 const img=document.createElement('img');img.src=src;img.alt='Authenticator QR';img.width=188;img.height=188;holder.append(img);
}
function status(t){label('mmhA783Status',t)}
function resetSensitiveState(){
 usernameOnly=false;factorId='';
 $('mmhA783Recovery').hidden=true;$('mmhA783BindUsername').hidden=true;
 $('mmhA783TotpStart').hidden=true;$('mmhA783TotpRemove').hidden=true;
 $('mmhA783TotpRemoveConfirm').hidden=true;
 $('mmhA783LinkGoogle').disabled=true;
 label('mmhA783UsernameStatus','—');label('mmhA783GoogleStatus','—');label('mmhA783TotpStatus','—');
}
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
   if(owner!==user.id)return; // Ignore responses from a previous account after sign-out/switch.
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
   a783Action('mmhA783LinkGoogle',google?'Google connected':'Connect Google');
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
 }catch(_){hideKey();clearMfa();resetSensitiveState();status('Sign in to view account security, or try again after refreshing.');}
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
$('mmhA783PhraseToggle').addEventListener('click',()=>{
 const input=$('mmhA783Phrase'),button=$('mmhA783PhraseToggle');
 const visible=input.type==='password';
 input.type=visible?'text':'password';
 button.setAttribute('aria-pressed',String(visible));
 a783Action('mmhA783PhraseToggle',visible?'Hide words':'Show words');
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
  for(const factor of (existing.data?.totp||[]).filter(x=>x.status==='unverified')){const r=await client().auth.mfa.unenroll({factorId:factor.id});if(r.error)throw Error('Pending factor cleanup failed');}
  const {data,error}=await client().auth.mfa.enroll({factorType:'totp',friendlyName:'MMHVAULT Authenticator'});
  if(error||!data?.id||!data?.totp?.qr_code)throw error||Error('Enrollment unavailable');
  pendingFactor=data.id;pendingSecret=data.totp.secret||'';
  displayTotpQr(data.totp);
  $('mmhA783TotpSecret').hidden=true;
  $('mmhA783TotpSecret').textContent='';
  a783Action('mmhA783KeyReveal','Show setup key');
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
$('mmhA783KeyReveal').addEventListener('click',()=>{
 if(!pendingFactor)return;
 const el=$('mmhA783TotpSecret');el.hidden=!el.hidden;el.textContent=el.hidden?'':pendingSecret;
 a783Action('mmhA783KeyReveal',el.hidden?'Show setup key':'Hide setup key');
});
$('mmhA783TotpCancel').addEventListener('click',async()=>{
 const ok=await cancelPendingMfa();status(ok?'Authenticator setup cancelled.':'Unable to cancel setup; refresh before retrying.');
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
document.addEventListener('visibilitychange',()=>{if(document.hidden){hideKey();if(pendingFactor)void cancelPendingMfa();}});
window.addEventListener('pagehide',()=>{hideKey();if(pendingFactor)void cancelPendingMfa();else clearMfa();});
// Accordion only within the existing card, never move the parent Settings panels.
const sections=[...root.querySelectorAll('.mmh-a783-section')];
function collapse(section){section.classList.remove('mmh-a785-open');section.querySelector('.mmh-a783-title')?.setAttribute('aria-expanded','false');if(section.id==='mmhA783Recovery')hideKey();if(section.querySelector('#mmhA783TotpSetup')&&pendingFactor)void cancelPendingMfa();}
sections.forEach(section=>{
 const title=section.querySelector(':scope > .mmh-a783-title');if(!title)return;
 title.tabIndex=0;title.setAttribute('role','button');title.setAttribute('aria-expanded','false');
 const toggle=()=>{const opening=!section.classList.contains('mmh-a785-open');sections.forEach(other=>{if(other!==section)collapse(other)});if(opening){section.classList.add('mmh-a785-open');title.setAttribute('aria-expanded','true')}else collapse(section)};
 title.addEventListener('click',toggle);
 title.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
});
const settingsPage=$('settings');let wasVisible=false;
function onPageChange(){
 const sec=$('stPage_security');
 const visible=!!(settingsPage?.classList.contains('active')&&(sec?!sec.hidden:true));
 if(wasVisible&&!visible){hideKey();if(pendingFactor)void cancelPendingMfa();else clearMfa();sections.forEach(collapse)}
 if(!wasVisible&&visible)void refresh();
 wasVisible=visible;
}
if(settingsPage){new MutationObserver(onPageChange).observe(settingsPage,{attributes:true,subtree:true,attributeFilter:['class','hidden']});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',onPageChange,{once:true});else onPageChange();}
a783RenderLanguage();
if(client()){
 client().auth.onAuthStateChange((event)=>{if(['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED'].includes(event))setTimeout(()=>{if(event==='SIGNED_OUT'){owner='';hideKey();clearMfa();resetSensitiveState();status('Sign in to manage account security.');}else void refresh()},0)});
 setTimeout(refresh,400);
}
})();