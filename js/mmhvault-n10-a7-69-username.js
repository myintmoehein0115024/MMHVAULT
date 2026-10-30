/* MMHVAULT N10-A7.69 — Production username-only UI. Fail closed until Edge preflight enabled.
   Auth account creation and ten-word credential verification always occur on the server.
   Browser never stores the permanent phrase, passwords or service credentials in storage.
*/
(()=>{'use strict';
const $=id=>document.getElementById(id),API='https://vrypucmyrztxgiqhjspd.supabase.co/functions/v1/mmh-n10a769-username';
const SITEKEY='0x4AAAAAAFrRIiFC7KoLQn2q'; // Cloudflare public site key only
const USER_RX=/^[a-z][a-z0-9_]{3,19}$/;
const PILOT_RX=/^qa_[a-z0-9_]{3,16}$/;
const signup=$('usernameSignUp'),login=$('usernameSignIn'),sname=$('mmhA756Name'),spass=$('mmhA756Password'),sconfirm=$('mmhA756Confirm'),terms=$('mmhA756Terms');
const sbutton=$('mmhA756Submit'),sstatus=$('mmhA756Status'),uname=$('mmhA740Username'),upass=$('mmhA740Password'),ubutton=$('mmhA740Submit'),ustatus=$('mmhA740Status');
const backup=$('mmhA769Backup'),wordsPanel=$('mmhA769WordGrid'),qr=$('mmhA769Qr'),backupAgree=$('mmhA769BackupAgree'),captchaRegister=$('mmhA769Captcha'),captchaLogin=$('mmhA740Captcha'),smartCaptcha=$('smartCaptcha'),smartStatus=$('smartStatus'),smartInput=$('signinEmail'),smartPassword=$('signinPassword'),smartForm=$('signin');
const modeButtons=[...document.querySelectorAll('[data-mmh-a769-login-mode]')],phraseArea=$('mmhA769PhraseArea'),passArea=$('mmhA769PassArea');
if(!signup||!login||!backup||!sbutton||!ubutton||!captchaRegister||!captchaLogin)return;
const tr=(zh,en)=>window.getMMHVAULTLanguage?.()==='zh'?zh:en;
let pilotOnly=false,enabled=false,loading=false,selected='password',prepared=null,accountCreated=false,captchaWidget=null,captchaArea=null,captchaAction='',captchaToken='';
const inputWords=Array.from(phraseArea?.querySelectorAll('input[data-a769-word]')||[]);
function showStatus(t,el){if(el)el.textContent=t;}
/* First-party feedback only. The backend verifies each challenge token. */
function activeSecurityBox(){
  if(signup.classList.contains('active'))return $('mmhA780SignupSecurity');
  if(login.classList.contains('active'))return $('mmhA780SigninSecurity');
  return null;
}
function securityState(kind){
  const box=activeSecurityBox();if(!box)return;
  box.dataset.state=kind;
  const el=box.querySelector('[data-mmh-security-text]');if(!el)return;
  const values={
    checking:tr('正在进行安全检查…','Checking connection security…'),
    ready:tr('浏览器检查已就绪 · 提交时继续核验','Browser check ready · Final verification on submit'),
    error:tr('安全检查暂未完成，请重新尝试','Security check incomplete. Please retry.'),
    idle:tr('安全检查将在此自动进行','A security check will run automatically.')
  };
  el.textContent=values[kind]||values.idle;
}
function resetCaptcha(){captchaToken='';if(captchaWidget!==null&&typeof turnstile!=='undefined'){try{turnstile.remove(captchaWidget)}catch(_){}}captchaWidget=null;captchaArea=null;captchaAction='';securityState(enabled?'checking':'idle');}
function smartUsername(){const v=smartInput?.value.trim()||'';return v!==''&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function action(){return signup.classList.contains('active')?'prepare_signup':smartForm.classList.contains('active')?'login':selected==='phrase'?'phrase_login':'login';}
function loadCaptcha(){
  if(!enabled)return;
  // Turnstile cannot reliably render inside the hidden Email form's sibling.
  if(!signup.classList.contains('active')&&!login.classList.contains('active')&&!(smartForm.classList.contains('active')&&smartUsername())){resetCaptcha();return;}
  const target=signup.classList.contains('active')?captchaRegister:smartForm.classList.contains('active')?smartCaptcha:captchaLogin;
  const next=action();
  if(captchaWidget!==null&&captchaArea===target&&captchaAction===next)return;
  resetCaptcha();captchaArea=target;captchaAction=next;securityState('checking');
  if(typeof turnstile==='undefined')return;
  // An Invisible widget has no branding footprint; the Siteverify backend remains required.
  try{target.hidden=false;captchaWidget=turnstile.render(target,{
    sitekey:SITEKEY,theme:'dark',appearance:'interaction-only',action:'mmh_n10a769_'+next,
    callback:v=>{captchaToken=v;securityState('ready');},
    'expired-callback':()=>{captchaToken='';securityState('error');},
    'error-callback':()=>{captchaToken='';securityState('error');}
  });
  // A browser privacy setting may block background verification. Never report
  // success without a token; instead offer a visible retry after the timeout.
  setTimeout(()=>{
    if(enabled&&captchaArea===target&&captchaAction===next&&!captchaToken)securityState('error');
  },12000);
  }
  catch(e){securityState('error');}
}
function asyncLoadCaptcha(){if(document.querySelector('script[data-a769-turnstile]'))return;
  const el=document.createElement('script');el.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';el.async=true;el.defer=true;el.dataset.a769Turnstile='1';el.onload=loadCaptcha;el.onerror=()=>securityState('error');document.head.append(el);
}
async function request(data){
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),22000);
 try{const response=await fetch(API,{method:'POST',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',mode:'cors',headers:{'Content-Type':'application/json'},signal:ac.signal,body:JSON.stringify(data)});let body;try{body=await response.json()}catch{body={code:'invalid_response'}}return {response,body};}
 catch(error){if(error?.name==='AbortError')throw new Error('request_timeout');if(typeof navigator!=='undefined'&&navigator.onLine===false)throw new Error('offline');throw new Error('connection_unavailable');}
 finally{clearTimeout(timer);}
}
function setEnabled(on){
 enabled=on;sbutton.disabled=!on;ubutton.disabled=!on;
 // Make the limited pilot restriction visible beside the field itself, not only
 // in a banner that may be outside the mobile viewport.
 if(pilotOnly){
   sname.placeholder='qa_example001';
   // Existing email-account users may link an ordinary username; only new
   // username-only account registrations remain inside the qa_ pilot.
   sname.setAttribute('pattern','qa_[a-z0-9_]{3,16}');
   uname.setAttribute('pattern','[a-z][a-z0-9_]{3,19}');
   const hint=$('mmhA769PilotHint');
   if(hint)hint.textContent=tr('当前仅开放 qa_ 开头的测试用户名，例如 qa_test001；其他用户名尚未开放。','Pilot only: usernames must start with qa_, for example qa_test001. Other names are not released yet.');
 }
 if(!on){showStatus(tr('用户名注册正在进行正式安全验收，暂时未开放。','Username signup is under final security acceptance.'),sstatus);showStatus(tr('用户名登录尚未正式开放，原邮箱及 Google 登录照常使用。','Username login is not released. Email and Google login still work.'),ustatus);return}
 showStatus(pilotOnly?tr('受限生产验收：仅允许 qa_ 开头的测试用户名。请使用测试密码，不要使用现有账户密码。','Limited production pilot: use a qa_ test username and a separate test password.'):tr('请输入用户名及密码，然后完成人机验证。','Enter your username and password, then complete the verification.'),sstatus);
 showStatus(tr('可使用用户名和密码登录。独立用户名账户也支持永久十词。','Sign in using your username and password. Username-only accounts also support their permanent ten-word key.'),ustatus);
 asyncLoadCaptcha();loadCaptcha();
}
async function preflight(){
 try{const x=await request({action:'preflight'});pilotOnly=x.body?.qa_only===true;setEnabled(x.response.ok&&x.body?.production===true&&x.body?.enabled===true);}
 catch{setEnabled(false);}
}
const recoveryHost=document.createElement('div');
recoveryHost.id='mmhN10RecoveryDialog';
recoveryHost.setAttribute('role','dialog');
recoveryHost.setAttribute('aria-modal','true');
recoveryHost.setAttribute('aria-label','Your recovery key');
const recoveryPanel=document.createElement('div');
recoveryPanel.id='mmhN10RecoveryPanel';
recoveryHost.appendChild(recoveryPanel);
document.body.appendChild(recoveryHost);
recoveryPanel.appendChild(backup);
const modalConfirm=$('mmhA769ModalConfirm');
function closeRecoveryModal(){recoveryHost.classList.remove('mmh-open');document.body.classList.remove('mmh-n10-modal-lock');}
function openRecoveryModal(){recoveryHost.classList.add('mmh-open');document.body.classList.add('mmh-n10-modal-lock');modalConfirm?.focus();}
recoveryHost.addEventListener('keydown',event=>{
 if(event.key==='Escape'){event.preventDefault();$('mmhA769Cancel')?.focus();}
 if(event.key==='Tab'){
  const available=[...recoveryPanel.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href]')].filter(el=>el.getClientRects().length);
  if(!available.length)return;
  const first=available[0],last=available[available.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }
});
modalConfirm?.addEventListener('click',()=>{if(!backupAgree.checked||!prepared||loading)return;signup.requestSubmit();});
function clearPhrase(){if(prepared){prepared.phrase.fill('');prepared=null}accountCreated=false;wordsPanel?.replaceChildren();qr?.replaceChildren();backupAgree.checked=false;backup.classList.add('mmh-a769-hidden');closeRecoveryModal();}
function viewBackup(){
 if(!prepared||!wordsPanel||!qr)return;
 wordsPanel.replaceChildren();
 prepared.phrase.forEach((word,i)=>{const node=document.createElement('div');node.className='mmh-a769-word';const index=document.createElement('small');index.textContent=String(i+1).padStart(2,'0')+'.';node.append(index,document.createTextNode(word));wordsPanel.appendChild(node)});
 qr.replaceChildren();
 try{if(typeof QRCode==='function')new QRCode(qr,{text:'MMHVAULT-RECOVERY-V1\nUSERNAME:'+prepared.username+'\nPHRASE:'+prepared.phrase.join(' '),width:206,height:206,colorDark:'#000',colorLight:'#fff',correctLevel:QRCode.CorrectLevel.L});
 else qr.textContent=tr('二维码组件暂不可用，请手动备份单词。','QR component unavailable; back up the words manually.');}
 catch{qr.textContent=tr('二维码生成失败，请手动保存十词。','Could not create QR. Write down the ten words.')}
 backup.classList.remove('mmh-a769-hidden');openRecoveryModal();
 showStatus(tr('先保存全部 10 个词和二维码，再完成注册。','Save all ten words and the QR code before completing registration.'),sstatus);
 sbutton.textContent=tr('完成备份并创建账户','Confirm backup & create account');sbutton.disabled=true;if(modalConfirm)modalConfirm.disabled=true;
}
function updateSignupState(){const blocked=!enabled||loading||(!!prepared&&!backupAgree.checked);sbutton.disabled=blocked;if(modalConfirm)modalConfirm.disabled=blocked||!prepared;}
backupAgree?.addEventListener('change',updateSignupState);
$('mmhA769Copy')?.addEventListener('click',async()=>{
 if(!prepared)return;try{await navigator.clipboard.writeText(prepared.phrase.join(' '));showStatus(tr('已复制十词。剪贴板可能被其他应用读取。','Words copied. Other apps may access your clipboard.'),sstatus)}catch{showStatus(tr('复制失败，请手动记录。','Copy failed; please write down the words.'),sstatus)}
});
$('mmhA769SaveQr')?.addEventListener('click',()=>{
 const c=qr.querySelector('canvas'),img=qr.querySelector('img'),data=c?.toDataURL('image/png')||img?.src;
 if(!data)return;const a=document.createElement('a');a.href=data;a.download='MMHVAULT-Private-Recovery-Key.png';document.body.append(a);a.click();a.remove();
});
$('mmhA769Cancel')?.addEventListener('click',()=>{if(accountCreated){showStatus(tr('账户已创建，请先保存恢复词。','Your account exists. Save the recovery words first.'),sstatus);return;}clearPhrase();sbutton.textContent=tr('生成十词并开始备份','Generate recovery key');sbutton.disabled=!enabled;showStatus(tr('注册已取消。用户名预留约 30 分钟自动释放。','Cancelled. Username reservation expires in about 30 minutes.'),sstatus);loadCaptcha()});
async function handoff(body,expected){
 if(!db||!body?.access_token||!body?.refresh_token||!body?.user_id||body.user_id!==expected)throw Error('identity_not_verified');
 window.MMHVAULT_N10_A741_USERNAME_HANDOFF=true;
 try{
  const s=await db.auth.setSession({access_token:body.access_token,refresh_token:body.refresh_token});
  if(s.error||s.data?.user?.id!==expected||s.data?.session?.user?.id!==expected)throw Error('session_unavailable');
  const remote=await db.auth.getUser();const cache=await db.auth.getSession();
  if(remote.error||remote.data?.user?.id!==expected||cache.error||cache.data?.session?.user?.id!==expected)throw Error('session_not_verified');
  const navigated=await verifiedRedirectV946(expected);
  const mfaLayer=document.getElementById('mmhMfaDialogV783');
  const mfaPending=mfaLayer?.dataset.owner===expected&&mfaLayer.style.display==='grid';
  if(navigated!==true&&!mfaPending)throw Error('verified_redirect_failed');
 }catch(e){window.MMHVAULT_N10_A741_USERNAME_HANDOFF=false;try{await db.auth.signOut({scope:'local'})}catch(_){}throw e}
}
signup.addEventListener('submit',async e=>{
 e.preventDefault();e.stopImmediatePropagation();if(loading||!enabled)return;
 const username=sname.value.trim().toLowerCase(),pwd=spass.value;
 // Conceal visible password fields once the user submits, including validation failures.
 for(const field of [spass,sconfirm]){
   if(field.type==='text'){
     field.type='password';
     const eye=field.parentElement?.querySelector('.eye');
     if(eye)eye.textContent=tr('显示','Show');
   }
 }
 if(!USER_RX.test(username)){showStatus(tr('用户名须为 4–20 位：小写字母开头，只能使用小写字母、数字或下划线。','Username must be 4–20 characters, start with a lowercase letter, and contain only lowercase letters, numbers or underscores.'),sstatus);sname.focus();return}
 if(pilotOnly&&!PILOT_RX.test(username)){showStatus(tr('当前是生产测试阶段，用户名必须以 qa_ 开头，例如 qa_test001。普通用户名暂未开放。','Production pilot: username must start with qa_, for example qa_test001. Regular usernames are not open yet.'),sstatus);sname.focus();return}
 if(pwd.length<6||pwd.length>20){showStatus(tr('测试密码须为 6–20 个字符。','Test password must be 6–20 characters.'),sstatus);spass.focus();return}
 if(pwd!==sconfirm.value){showStatus(tr('两次密码不一致，请重新检查确认密码。','Passwords do not match. Check the confirmation password.'),sstatus);sconfirm.focus();return}
 if(!terms.checked){showStatus(tr('请先同意使用条款及隐私声明。','Agree to the terms and privacy notice first.'),sstatus);return}
 if(!prepared&&!captchaToken){showStatus(tr('请先完成人机验证。','Complete the human verification first.'),sstatus);return}
 if(accountCreated){showStatus(tr('账户已创建，请返回登录页面。','Account already created. Return to sign in.'),sstatus);return;}
 if(prepared&&(prepared.username!==username||!backupAgree.checked)){showStatus(tr('用户名已变化或未确认备份，请重新开始注册。','Username changed or backup not confirmed. Restart the process.'),sstatus);return}
 loading=true;sbutton.disabled=true;
 try{
  if(!prepared){
   showStatus(tr('正在生成备份凭证…','Preparing your permanent recovery key…'),sstatus);
   const r=await request({action:'prepare_signup',username,captcha_token:captchaToken});
   if(!r.response.ok||r.body?.code!=='phrase_prepared'||r.body.recovery_words?.length!==10||typeof r.body.ticket!=='string')throw Error(r.body?.code||'prepare_failed');
   prepared={username,phrase:[...r.body.recovery_words],ticket:r.body.ticket};
   viewBackup();
  }else{
   showStatus(tr('正在创建正式账户…','Creating your production account…'),sstatus);
   const r=await request({action:'signup',username,password:pwd,ticket:prepared.ticket,phrase:prepared.phrase.join(' ')});
   if(!r.response.ok||r.body?.code!=='signup_success')throw Error(r.body?.code||'signup_failed');
   const expected=r.body.user_id;
   // A confirmed account can survive a failed redirect; keep the recovery words
   // in memory until the sign-in handoff has succeeded.
   accountCreated=true;
   showStatus(tr('账户已创建，正在核实登录身份…','Account created; verifying sign-in…'),sstatus);
   await handoff(r.body,expected);
   clearPhrase();spass.value='';sconfirm.value='';
  }
 }catch(err){showStatus(accountCreated?tr('账户已创建，但自动登录尚未完成。请妥善保管恢复词，然后使用用户名登录。','Account created, but sign-in did not complete. Save your recovery words and sign in with your username.'):tr('操作未完成，请检查网络后重试。','Operation not completed. Check your connection and retry.'),sstatus);if(prepared){openRecoveryModal();}else{resetCaptcha();loadCaptcha()}}
 finally{loading=false;updateSignupState()}
},true);
function chooseMode(mode){
 selected=mode==='phrase'?'phrase':'password';
 modeButtons.forEach(x=>{const on=x.dataset.mmhA769LoginMode===selected;x.setAttribute('aria-pressed',String(on))});
 passArea?.classList.toggle('mmh-a769-hidden',selected==='phrase');
 phraseArea?.classList.toggle('mmh-a769-hidden',selected!=='phrase');
 upass.required=selected==='password';resetCaptcha();loadCaptcha();
 showStatus(tr(selected==='phrase'?'输入完整且顺序正确的十词。':'使用用户名和密码登录。',selected==='phrase'?'Enter all ten words in the original order.':'Sign in with username and password.'),ustatus);
}
modeButtons.forEach(b=>b.addEventListener('click',()=>chooseMode(b.dataset.mmhA769LoginMode)));
function fillPhrase(s){const arr=s.trim().toLowerCase().split(/\s+/);if(arr.length!==10||!arr.every(w=>/^[a-z]+$/.test(w)))return false;inputWords.forEach((el,i)=>el.value=arr[i]);return true;}
inputWords[0]?.addEventListener('paste',e=>{if(fillPhrase(e.clipboardData?.getData('text')||'')){e.preventDefault();showStatus(tr('十词已填入，请核对顺序。','Ten words filled; verify the order.'),ustatus)}});
$('mmhA769QrFileBtn')?.addEventListener('click',()=>$('mmhA769QrFile')?.click());
$('mmhA769QrFile')?.addEventListener('change',async e=>{
 const f=e.target.files?.[0];e.target.value='';if(!f)return;
 if(f.size>4000000||typeof BarcodeDetector==='undefined'||typeof createImageBitmap==='undefined'){showStatus(tr('此浏览器不支持二维码读取，请手动输入十词。','QR reading unavailable; enter the ten words.'),ustatus);return}
 try{const bmp=await createImageBitmap(f);let rs;try{rs=await new BarcodeDetector({formats:['qr_code']}).detect(bmp)}finally{bmp.close()}
   const match=/^MMHVAULT-RECOVERY-V1\nUSERNAME:([a-z][a-z0-9_]{3,19})\nPHRASE:([a-z ]+)$/i.exec(rs?.[0]?.rawValue||'');if(!match||!fillPhrase(match[2]))throw Error('invalid');uname.value=match[1];showStatus(tr('二维码已读取。','QR code read successfully.'),ustatus);
 }catch{showStatus(tr('二维码读取失败，请输入十词。','Could not read QR; enter the ten words.'),ustatus)}
});
$('mmhA740Forgot')?.addEventListener('click',e=>{e.preventDefault();chooseMode('phrase')});
login.addEventListener('submit',async e=>{
 e.preventDefault();e.stopImmediatePropagation();if(loading||!enabled)return;
 const username=uname.value.trim().toLowerCase();
 if(!USER_RX.test(username)){showStatus(tr('用户名格式不正确，请输入 4–20 个小写字母、数字或下划线。','Enter a 4–20 character username using lowercase letters, numbers or underscores.'),ustatus);return}
 if(!captchaToken){showStatus(tr('请完成人机验证。','Complete the human verification.'),ustatus);return}
 const body=selected==='phrase'?{phrase:inputWords.map(x=>x.value.trim().toLowerCase()).join(' ')}:{password:upass.value};
 if(selected==='password'&&(body.password.length<6||body.password.length>20)){showStatus(tr('请输入 6–20 位密码。','Password must be 6–20 characters.'),ustatus);return}
 loading=true;ubutton.disabled=true;
 try{showStatus(tr('正在核实身份…','Verifying your identity…'),ustatus);
   const r=await request({action:selected==='phrase'?'phrase_login':'login',username,captcha_token:captchaToken,...body});
   if(!r.response.ok||!['login_success','phrase_login_success'].includes(r.body?.code))throw Error(r.body?.code||'login_failed');
   upass.value='';inputWords.forEach(el=>el.value='');
   await handoff(r.body,r.body.user_id);
 }catch(err){showStatus(tr('登录未成功，请核对账户信息或网络连接。','Unable to sign in. Check your credentials or connection.'),ustatus)}
 finally{loading=false;ubutton.disabled=!enabled;resetCaptcha();loadCaptcha();}
},true);
smartInput?.addEventListener('input',()=>{if(!smartForm.classList.contains('active'))return;smartStatus.hidden=true;if(smartUsername()&&enabled)loadCaptcha();else if(captchaArea===smartCaptcha)resetCaptcha();});
smartForm?.addEventListener('submit',async e=>{
 if(!smartUsername())return;e.preventDefault();e.stopImmediatePropagation();smartStatus.hidden=false;
 const username=smartInput.value.trim().toLowerCase(),password=smartPassword.value;
 if(!USER_RX.test(username)){showStatus('Enter a valid username.',smartStatus);return;}
 if(!enabled){showStatus('Username sign-in is currently unavailable.',smartStatus);return;}
 if(password.length<6||password.length>20){showStatus('Password must be 6–20 characters.',smartStatus);return;}
 if(!captchaToken){loadCaptcha();showStatus('Complete security verification and retry.',smartStatus);return;}
 if(loading)return;
 loading=true;const btn=smartForm.querySelector('button[type="submit"]');btn.disabled=true;
 try{showStatus('Signing in…',smartStatus);const r=await request({action:'login',username,password,captcha_token:captchaToken});
 if(!r.response.ok||r.body?.code!=='login_success')throw Error('failed');smartPassword.value='';await handoff(r.body,r.body.user_id);}
 catch(_){showStatus('Sign-in failed. Check your details or connection.',smartStatus);}
 finally{loading=false;btn.disabled=false;resetCaptcha();loadCaptcha();}
},true);
$('smartRecovery')?.addEventListener('click',()=>{uname.value=smartUsername()?smartInput.value.trim().toLowerCase():'';openForm('usernameSignIn');chooseMode('phrase');setTimeout(loadCaptcha,0);});
// Old username scripts are removed from the HTML. Method switching remains contained here.
document.querySelectorAll('[data-mmh-a740-method]').forEach(btn=>btn.addEventListener('click',()=>{
 if(btn.dataset.mmhA740Method==='email')openForm('signin');else openForm('usernameSignIn');
 setTimeout(loadCaptcha,0);
}));
document.querySelectorAll('[data-mmh-a756-signup-method]').forEach(btn=>btn.addEventListener('click',()=>{
 openForm(btn.dataset.mmhA756SignupMethod==='email'?'signup':'usernameSignUp');setTimeout(loadCaptcha,0);
}));
document.querySelectorAll('[data-switch]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(loadCaptcha,0)));
document.querySelectorAll('#authTabs .tab').forEach(btn=>btn.addEventListener('click',()=>setTimeout(loadCaptcha,0)));
document.querySelectorAll('[data-mmh-security-retry]').forEach(btn=>btn.addEventListener('click',()=>{
 if(!enabled||loading)return;
 resetCaptcha();loadCaptcha();
}));
window.addEventListener('pagehide',()=>{clearPhrase();upass.value='';spass.value='';sconfirm.value='';inputWords.forEach(x=>x.value='');});
window.addEventListener('mmhvault-language-change',()=>{
 if(!enabled){setEnabled(false);return;}
 securityState(captchaToken?'ready':'checking');
});
chooseMode('password');void preflight();
})();