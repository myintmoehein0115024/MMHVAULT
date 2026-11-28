/* N10 real Staging MFA A/B test. Tokens, TOTP codes and QR only in volatile memory.
   No persistent auth session, analytics, logs, password export or production access. */
(() => {
'use strict';
const BASE='https://ldivswlhtgmznzwhzsoi.supabase.co';
const EDGE=BASE+'/functions/v1/mmh-n10-staging-username-escrow-20261103';
const ORIGIN='https://mmhvault-n10-vault-staging.pages.dev';
const KEY='sb_publishable_LxIB8564OZD48HQ8Mfsc0A_apkgERZo'; // public Staging key
const SITEKEY='0x4AAAAAAFlXEfEHAP1TUxjr'; // public Staging-only widget key
const VAULT_EDGE=BASE+'/functions/v1/mmh-n10-username-vault-qa-20261103';
const ALLOWED=Object.freeze(['n10qa_a_20261103','n10qa_b_20261103']);
const $=id=>document.getElementById(id);
const STRINGS={
 zh:{title:'双账户 MFA 真实验收',intro:'使用新注册的 A / B 用户名和测试密码，绑定 Google Authenticator 并验证 AAL2。',statusLabel:'测试状态',statusTitle:'真实身份验证',checking:'正在检查测试环境…',refresh:'重新检查测试服务',loginTitle:'使用新注册的测试用户名登录',loginNote:'仅允许两个专用测试账户。使用各自的密码，不要在聊天中发送。',owner:'选择测试账户',password:'测试账户密码',human:'完成人机验证才能登录 Staging。',signIn:'安全登录',mfaTitle:'绑定或验证 Authenticator',totpLabel:'输入 Authenticator 六位动态验证码',enroll:'绑定 Google Authenticator',verify:'验证二级动态码',logout:'退出并清除测试会话',foot:'仅 Staging 测试 · 不保存密码、动态码或 MFA 密钥到浏览器存储',qrTitle:'使用 Authenticator 扫描二维码',qrNote:'二维码只属于当前测试账户，请勿截图或转发。',qrVerifyNote:'完成扫描后关闭弹窗，输入应用里的六位码。',qrDone:'已扫描，开始验证',closed:'Staging 注册与登录测试已安全关闭，不需要输入密码。',ready:'Staging A/B 登录入口已开放，等待人机验证。',captchaLoading:'正在加载安全验证…',captchaError:'人机验证加载失败，请检查网络再试。',offline:'网络或测试服务暂不可用。',passwordNeeded:'请输入对应的测试账户密码（6–20 位）。',captchaNeeded:'请先完成人机验证。',working:'正在安全验证账户身份…',loginFail:'登录失败，请检查密码或测试权限。不要反复尝试。',loginOK:'用户名登录成功，正在确认 MFA 状态…',enrollReady:'尚未绑定 MFA，可开始绑定 Google Authenticator。',enrolled:'绑定二维码已生成，请使用 Google Authenticator 扫描。',manualOnly:'二维码无法显示。请使用下方的手动密钥绑定 Authenticator。',manualToggle:'无法扫描？显示手动绑定密钥',manualNote:'只在 Authenticator 中输入密钥，不要截图或发送给别人。',already:'已绑定 MFA，请输入六位动态验证码验证登录。',enterCode:'请输入六位数字动态验证码。',codeFail:'动态验证码验证失败，请检查设备时间和验证码。',aalFail:'无法确认 AAL2，操作已中止。',passed:'MFA AAL2 PASS · 已通过真实二级验证',qrInvalid:'二维码格式不安全，已停止绑定。',ownerFail:'测试身份不匹配，已拒绝访问。',secretExpired:'二维码已隐藏；若尚未绑定，请重新开始。',codeChecking:'正在验证六位动态码…',signed:'已登录测试账户',signedOut:'已退出，敏感资料已清理。'},
 en:{title:'Real A/B MFA QA',intro:'Use the two newly registered QA usernames and passwords to bind an authenticator and verify AAL2.',statusLabel:'TEST STATUS',statusTitle:'Real identity verification',checking:'Checking isolated Staging…',refresh:'Recheck test service',loginTitle:'Sign in with a registered QA username',loginNote:'Only the two authorized QA accounts are accepted. Never send your password in chat.',owner:'Test account',password:'QA password',human:'Complete human verification before signing in.',signIn:'Secure sign-in',mfaTitle:'Bind or verify Authenticator',totpLabel:'Enter the six-digit Authenticator code',enroll:'Bind Google Authenticator',verify:'Verify security code',logout:'Sign out and erase the session',foot:'Staging only · No password, TOTP code or MFA secret persists in the browser',qrTitle:'Scan with your Authenticator',qrNote:'This QR belongs only to the current test account. Do not screenshot or forward it.',qrVerifyNote:'After scanning, close this dialog and enter your six-digit code.',qrDone:'Scanned · Continue',closed:'Staging registration and login are closed. Do not enter a password.',ready:'Staging A/B login is ready. Complete human verification.',captchaLoading:'Loading security verification…',captchaError:'Verification did not load. Check your network and retry.',offline:'Network or Staging test service unavailable.',passwordNeeded:'Enter your QA password (6–20 characters).',captchaNeeded:'Complete human verification first.',working:'Verifying your account securely…',loginFail:'Login rejected. Check your password and QA access; avoid repeated attempts.',loginOK:'Username sign-in verified. Checking MFA status…',enrollReady:'MFA is not bound yet. Bind Google Authenticator.',enrolled:'Enrollment QR generated. Scan it with your Authenticator.',manualOnly:'QR could not be displayed. Enter the manual key below in your Authenticator.',manualToggle:'Cannot scan? Show manual enrollment key',manualNote:'Enter this key only in your Authenticator. Never share it.',already:'MFA is already bound. Verify the six-digit code to sign in.',enterCode:'Enter a valid six-digit code.',codeFail:'Verification failed. Check the code and device clock.',aalFail:'Could not confirm AAL2, so access was denied.',passed:'MFA AAL2 PASS · Real second factor verified',qrInvalid:'Invalid QR format. Enrollment stopped.',ownerFail:'Test identity mismatch. Access denied.',secretExpired:'QR is hidden. Start enrollment again if needed.',codeChecking:'Verifying the security code…',signed:'Signed in as QA account',signedOut:'Signed out; sensitive session erased.'},
 my:{title:'A/B MFA စမ်းသပ်မှု',intro:'အသစ်ဖန်တီးထားသော QA အသုံးပြုသူအမည်များဖြင့် ဝင်ရောက်၍ Authenticator နှင့် AAL2 ကို စစ်ဆေးပါ။',statusLabel:'စမ်းသပ်မှု အခြေအနေ',statusTitle:'အကောင့် လုံခြုံရေး စစ်ဆေးခြင်း',checking:'Staging ကို စစ်ဆေးနေသည်…',refresh:'ပြန်လည်စစ်ဆေးရန်',loginTitle:'QA အသုံးပြုသူအမည်ဖြင့် ဝင်ရန်',loginNote:'ခွင့်ပြုထားသော QA အကောင့်နှစ်ခုအတွက်သာ ဖြစ်သည်။ စကားဝှက်ကို မမျှဝေပါနှင့်။',owner:'QA အကောင့်',password:'QA စကားဝှက်',human:'ဝင်ရောက်ရန် လူသားဖြစ်ကြောင်း စစ်ဆေးပါ။',signIn:'လုံခြုံစွာ ဝင်ရန်',mfaTitle:'Authenticator ကို ချိတ်ဆက် / စစ်ဆေးပါ',totpLabel:'Authenticator မှ ဂဏန်း ၆ လုံး ထည့်ပါ',enroll:'Google Authenticator ချိတ်ဆက်ရန်',verify:'ဒုတိယအဆင့် စစ်ဆေးရန်',logout:'ထွက်ရန်နှင့် Session ရှင်းရန်',foot:'Staging စမ်းသပ်မှုသာ · စကားဝှက်၊ MFA ကုဒ်နှင့် လျှို့ဝှက်သော့ကို မသိမ်းဆည်းပါ',qrTitle:'Authenticator ဖြင့် QR စကင်ဖတ်ပါ',qrNote:'ဤ QR သည် ယခု QA အကောင့်အတွက်သာ ဖြစ်သည်။ မမျှဝေပါနှင့်။',qrVerifyNote:'QR စကင်ဖတ်ပြီး ဂဏန်း ၆ လုံးကို ထည့်ပါ။',qrDone:'စကင်ဖတ်ပြီး · ဆက်ရန်',closed:'Staging စမ်းသပ်ဝင်ရောက်မှုကို ပိတ်ထားသည်။',ready:'Staging QA ဝင်ရောက်မှု ဖွင့်ထားသည်။ လူသားစစ်ဆေးမှုကို ပြုလုပ်ပါ။',captchaLoading:'လူသားစစ်ဆေးမှုကို ဖွင့်နေသည်…',captchaError:'စစ်ဆေးမှု မရရှိနိုင်ပါ။ ပြန်လည်ကြိုးစားပါ။',offline:'Staging ဝန်ဆောင်မှု မရရှိနိုင်ပါ။',passwordNeeded:'QA စကားဝှက် ထည့်ပါ။',captchaNeeded:'လူသားစစ်ဆေးမှု ပြီးစီးရမည်။',working:'အကောင့်ကို စစ်ဆေးနေသည်…',loginFail:'ဝင်ရောက်မှု မအောင်မြင်ပါ။ ထပ်မံ မကြိုးစားခင် စစ်ဆေးပါ။',loginOK:'ဝင်ရောက်မှု အောင်မြင်ပါပြီ။ MFA ကို စစ်ဆေးနေသည်…',enrollReady:'MFA မချိတ်ဆက်ရသေးပါ။ Google Authenticator ချိတ်ဆက်နိုင်သည်။',enrolled:'QR ရရှိပါပြီ။ Authenticator ဖြင့် စကင်ဖတ်ပါ။',manualOnly:'QR မပြနိုင်ပါ။ အောက်ပါ လျှို့ဝှက်သော့ကို Authenticator တွင် ကိုယ်တိုင် ထည့်ပါ။',manualToggle:'QR စကင်မရပါက လျှို့ဝှက်သော့ကို ပြရန်',manualNote:'ဤသော့ကို Authenticator တွင်သာ ထည့်ပါ။ မမျှဝေပါနှင့်။',already:'MFA ချိတ်ဆက်ပြီးဖြစ်သည်။ ဂဏန်း ၆ လုံးဖြင့် စစ်ဆေးပါ။',enterCode:'ဂဏန်း ၆ လုံး ကုဒ် ထည့်ပါ။',codeFail:'ကုဒ် မမှန်ပါ။ ဖုန်း၏ အချိန်ကို စစ်ဆေးပါ။',aalFail:'AAL2 အဆင့်ကို အတည်မပြုနိုင်ပါ။',passed:'MFA AAL2 PASS · ဒုတိယအဆင့် အောင်မြင်',qrInvalid:'QR အချက်အလက် မမှန်ကန်ပါ။',ownerFail:'QA အကောင့် မကိုက်ညီပါ။',secretExpired:'QR ဖျောက်ထားပါပြီ။ လိုအပ်လျှင် ပြန်စပါ။',codeChecking:'ကုဒ်ကို စစ်ဆေးနေသည်…',signed:'QA အကောင့်ဖြင့် ဝင်ပြီး',signedOut:'ထွက်ပြီးပါပြီ။ Session ရှင်းလင်းပြီးပါပြီ။'}
};
let lang='zh',enabled=false,busy=false,widget=null,token='',owner=null,factorId='',mfaVerified=false,qrTimer=null,captchaTimer=null,waitStart=0,client=null;
let vaultBusy=false,vaultBackupReady=false,vaultHideTimer=null,vaultTickTimer=null,vaultHideAt=0;
const tr=k=>STRINGS[lang]?.[k]||STRINGS.en[k]||'Service error';
function status(k){$('status').textContent=tr(k);$('status').dataset.state=k;}
function setVisible(id,val){$(id).classList.toggle('is-hidden',!val);}
function clearQr(){
 clearTimeout(qrTimer);qrTimer=null;$('qr').removeAttribute('src');$('manualSecret').textContent='';$('manualToggle').onclick=null;
 $('manualSection').hidden=true;$('qrWrap').hidden=false;$('manualToggle').hidden=false;
 $('qrModal').hidden=true;
}
// Supabase can return an already prefixed data URL or SVG markup.
// Only accept local image formats; never use an external URL or HTML injection.
function safeSvgMarkup(svg){
 return /^<svg(?:\s|>)[\s\S]*<\/svg>\s*$/i.test(svg) &&
  !/<!|<\?|<\s*(?:script|foreignObject|iframe|image|use|a|animate|set|style|text|filter|feimage)\b|\bon[a-z]+\s*=|\b(?:href|style)\s*=|\burl\s*\(/i.test(svg);
}
function qrImageSource(qr){
 if(typeof qr!=='string'||qr.length<50||qr.length>400000)return null;
 if(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/i.test(qr))return qr;
 const svgData=/^data:image\/svg\+xml(?:;utf-8|;utf8|;charset=utf-8)?,([\s\S]+)$/i.exec(qr);
 let svg=qr;
 if(svgData){
  try{svg=decodeURIComponent(svgData[1]);}catch{return null;}
 }
 if(!safeSvgMarkup(svg))return null;
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function manualTotpSecret(value){
 const s=typeof value==='string'?value.replace(/\s/g,'').toUpperCase():'';
 return /^[A-Z2-7]{16,128}$/.test(s)?s:'';
}
async function clearOwnUnverifiedFactor(){
 const {data,error}=await client.auth.mfa.listFactors();
 if(error||!Array.isArray(data?.all))throw Error('factor_state_unavailable');
 const verified=data.all.some(f=>f.factor_type==='totp'&&f.status==='verified');
 if(verified)throw Error('verified_factor_present');
 // Explicit enrollment click only. Never touch an unrelated or verified factor.
 const own=data.all.filter(f=>f.factor_type==='totp'&&f.status==='unverified'&&
  f.friendly_name==='MMHVAULT N10 Staging MFA');
 if(own.length>3)throw Error('too_many_unverified_factors');
 for(const f of own){
  const {error:removeError}=await client.auth.mfa.unenroll({factorId:f.id});
  if(removeError)throw Error('unverified_factor_cleanup_failed');
 }
}
function clearChallenge(){token='';if(widget!==null&&window.turnstile){try{window.turnstile.reset(widget);}catch{widget=null;}}}
function stopWait(){clearTimeout(captchaTimer);captchaTimer=null;waitStart=0;}
function renderLanguage(){
 document.documentElement.lang=lang==='zh'?'zh-CN':lang==='my'?'my':'en';
 document.querySelectorAll('[data-t]').forEach(el=>{const k=el.dataset.t;if(STRINGS[lang][k])el.textContent=tr(k);});
 document.querySelectorAll('[data-lang]').forEach(btn=>{btn.classList.toggle('active',btn.dataset.lang===lang);btn.setAttribute('aria-pressed',String(btn.dataset.lang===lang));});
 const k=$('status').dataset.state;if(k)status(k);
}
function canLogin(){
 return enabled&&!busy&&!!token&&!owner&&$('pwd').value.length>=6&&$('pwd').value.length<=20&&ALLOWED.includes($('owner').value);
}
function updateLogin(){ $('signIn').disabled=!canLogin(); }
function setEnabled(next){
 enabled=!!next; $('dot').classList.toggle('ready',enabled);
 $('pwd').disabled=!enabled||!!owner;
 $('owner').disabled=!!owner;
 if(!enabled){$('pwd').value='';clearChallenge();stopWait();}
 updateLogin();
}
function renderCaptcha(){
 if(!enabled||owner||widget!==null)return;
 if(!window.turnstile||typeof window.turnstile.render!=='function'){
  if(!waitStart)waitStart=Date.now();
  if(Date.now()-waitStart<12000){status('captchaLoading');clearTimeout(captchaTimer);captchaTimer=setTimeout(renderCaptcha,300);}
  else{stopWait();status('captchaError');}
  return;
 }
 stopWait();
 try{
  widget=window.turnstile.render('#turnstile',{sitekey:SITEKEY,action:'mmh_n10a769_login',theme:'dark',
   callback:t=>{token=typeof t==='string'?t:'';updateLogin();},
   'expired-callback':()=>{token='';updateLogin();},
   'error-callback':()=>{token='';updateLogin();status('captchaError');return true;}
  });
 }catch{widget=null;status('captchaError');}
}
async function post(data){
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),15000);
 try{
  const response=await fetch(EDGE,{method:'POST',headers:{'Content-Type':'application/json'},
   credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',
   body:JSON.stringify(data),signal:ac.signal});
  const raw=await response.text();if(raw.length>6000)throw Error('large_response');
  const json=JSON.parse(raw);if(!json||typeof json!=='object'||Array.isArray(json))throw Error('bad_response');
  return {response,json};
 }finally{clearTimeout(timer);}
}
async function refresh(){
 if(location.origin!==ORIGIN||location.protocol!=='https:'){setEnabled(false);status('offline');return;}
 busy=true;setEnabled(false);$('refresh').disabled=true;status('checking');
 try{
  const {json}=await post({action:'preflight'});
  if(json.code!=='preflight_ok'||json.qa_only!==true||json.production!==false)throw Error('invalid_staging');
  setEnabled(json.enabled===true&&json.setup_complete===true);
  status(enabled?'ready':'closed');if(enabled)renderCaptcha();
 }catch{setEnabled(false);status('offline');}
 finally{busy=false;$('refresh').disabled=false;updateLogin();}
}
const VAULT_STRINGS={
 zh:{title:'密码验证查看固定十词',intro:'只查看已加密保存的原始十词，不重新生成或覆盖历史密钥。',check:'检查本账户加密备份',password:'再次输入当前账户密码',reveal:'验证密码并查看原始十词',crossCheck:'安全检查：B 无法请求 A 的数据',privacy:'恢复词仅在私密弹窗显示 45 秒；切换标签、退出或关闭后立即清理。',modalTitle:'已保存的原始十词',modalNote:'只属于当前经过 MFA 和密码验证的账户。请勿截图或发送恢复词。',hide:'立即隐藏恢复词',locked:'Recovery Vault 当前安全关闭。请勿输入密码。',available:'已有加密备份，可以验证密码查看固定十词。',missing:'没有可恢复的原始十词加密备份，禁止重新生成。',busy:'正在执行安全检查…',invalid:'请输入正确长度的当前账户密码。',failed:'服务拒绝或校验失败，未显示恢复词。',crossPassed:'B→A 越权字段请求已被服务器拒绝，没有返回恢复数据。',crossFailed:'跨账户拒绝验证尚未通过，请停止查看操作。',expired:'45 秒已到，恢复词已清理。',seconds:'秒后隐藏'},
 en:{title:'View original fixed 10 recovery words',intro:'Read only the encrypted original backup. Never regenerate or overwrite recovery keys.',check:'Check my encrypted backup',password:'Re-enter your current password',reveal:'Verify password and reveal original words',crossCheck:'Isolation check: B cannot request A’s data',privacy:'Words appear in a private modal for 45 seconds, and disappear on tab switch, close or sign-out.',modalTitle:'Original saved recovery words',modalNote:'Only for the current MFA- and password-verified account. Never screenshot or share.',hide:'Hide recovery words now',locked:'Recovery Vault is securely disabled. Do not enter a password.',available:'Encrypted backup exists; verify your password to see the original fixed words.',missing:'No encrypted original backup exists. No regeneration is permitted.',busy:'Checking security controls…',invalid:'Enter your current password (6–20 characters).',failed:'Verification or service access failed; recovery words were not shown.',crossPassed:'B→A owner override was rejected; no recovery data returned.',crossFailed:'Cross-account rejection not confirmed. Stop sensitive operations.',expired:'45 seconds elapsed. Words were cleared.',seconds:'seconds until hidden'},
 my:{title:'မူရင်း ပြန်လည်ရယူရေး စကားလုံး ၁၀ လုံး ကြည့်ရန်',intro:'ယခင် ကုဒ်ဝှက်သိမ်းထားသော မူရင်းစကားလုံးများကိုသာ ကြည့်မည်။ အသစ်မထုတ်ပါ။',check:'မိမိ၏ ကုဒ်ဝှက်သိမ်းထားမှု စစ်ဆေးရန်',password:'လက်ရှိ စကားဝှက်ကို ထပ်ထည့်ပါ',reveal:'စကားဝှက်ဖြင့် မူရင်းစကားလုံးများ ကြည့်ရန်',crossCheck:'B က A ၏ဒေတာကို မရနိုင်ကြောင်း စစ်ဆေးရန်',privacy:'စကားလုံးများကို ၄၅ စက္ကန့်သာ ပြသမည်။ ထွက်လျှင် ချက်ချင်း ရှင်းမည်။',modalTitle:'သိမ်းထားသော မူရင်းစကားလုံးများ',modalNote:'MFA နှင့် စကားဝှက်အတည်ပြုထားသော ယခုအကောင့်အတွက်သာ ဖြစ်သည်။ မမျှဝေပါနှင့်။',hide:'စကားလုံးများ ချက်ချင်း ဖျောက်ရန်',locked:'Recovery Vault ကို လုံခြုံရေးအရ ပိတ်ထားသည်။',available:'ကုဒ်ဝှက်ထားသော မူရင်းစကားလုံးများ ရှိသည်။ စကားဝှက်ဖြင့် ကြည့်နိုင်သည်။',missing:'မူရင်း အရန်သိမ်းချက် မရှိပါ။ အသစ် မထုတ်ပေးပါ။',busy:'လုံခြုံရေး စစ်ဆေးနေသည်…',invalid:'လက်ရှိ စကားဝှက်ကို ထည့်ပါ။',failed:'စစ်ဆေးမှု မအောင်မြင်ပါ။ စကားလုံးများ မပြပါ။',crossPassed:'B မှ A ကို တောင်းဆိုမှု ပယ်ချခံရပါသည်။ ဒေတာ မထုတ်ပေးပါ။',crossFailed:'အခြားအကောင့်စစ်ဆေးမှု မအောင်မြင်သေးပါ။',expired:'၄၅ စက္ကန့် ပြည့်ပြီး စကားလုံးများ ရှင်းလင်းပြီးပါပြီ။',seconds:'စက္ကန့်အတွင်း ဖျောက်မည်'}
};
function vt(key){return VAULT_STRINGS[lang]?.[key]||VAULT_STRINGS.en[key]||'Unavailable';}
function vaultMessage(key){$('vaultMessage').textContent=vt(key);$('vaultMessage').dataset.key=key;}
function clearVaultWords(){
 clearTimeout(vaultHideTimer);clearInterval(vaultTickTimer);
 vaultHideTimer=null;vaultTickTimer=null;vaultHideAt=0;
 $('vaultWords').replaceChildren();$('vaultTimer').textContent='';$('vaultModal').hidden=true;
}
function clearVault(){
 clearVaultWords();$('vaultPassword').value='';vaultBackupReady=false;vaultBusy=false;
 setVisible('vaultPanel',false);setVisible('vaultRevealBox',false);setVisible('vaultCrossCheck',false);
 vaultMessage('locked');
}
function renderVaultLanguage(){
 document.querySelectorAll('[data-vault-text]').forEach(el=>{const k=el.dataset.vaultText; if(VAULT_STRINGS[lang]?.[k])el.textContent=vt(k);});
 const key=$('vaultMessage').dataset.key;if(key)vaultMessage(key);
}
function revealWords(words){
 if(!Array.isArray(words)||words.length!==10||words.some(w=>typeof w!=='string'||!/^[a-z]{2,13}$/.test(w)))
  throw Error('invalid_recovery_words');
 clearVaultWords();
 for(const [i,w] of words.entries()){
  const item=document.createElement('div');item.className='word';
  const no=document.createElement('b');no.textContent=String(i+1).padStart(2,'0');
  item.append(no,document.createTextNode(w));$('vaultWords').append(item);
 }
 $('vaultModal').hidden=false;vaultHideAt=Date.now()+45000;
 const tick=()=>{
  const remaining=Math.max(0,Math.ceil((vaultHideAt-Date.now())/1000));
  $('vaultTimer').textContent=String(remaining)+' '+vt('seconds');
  if(remaining===0){clearVaultWords();vaultMessage('expired');}
 };
 tick();vaultTickTimer=setInterval(tick,300);
 vaultHideTimer=setTimeout(()=>{clearVaultWords();vaultMessage('expired');},45000);
 $('vaultHide').focus();
}
async function vaultRequest(payload){
 if(!mfaVerified||!owner||!client)throw Error('aal2_required');
 await ownerAal2();
 const {data,error}=await client.auth.getSession();
 const session=data?.session;
 if(error||!session?.access_token||!session.expires_at||session.expires_at*1000<=Date.now())
  throw Error('signed_session_required');
 const ac=new AbortController(),timeout=setTimeout(()=>ac.abort(),16000);
 try{
  const res=await fetch(VAULT_EDGE,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:ac.signal,
   headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+session.access_token},
   body:JSON.stringify(payload)});
  const raw=await res.text();if(raw.length>3800)throw Error('oversized_response');
  const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('bad_response');
  return {status:res.status,value};
 }finally{clearTimeout(timeout);}
}
async function checkVault(){
 if(!mfaVerified||vaultBusy)return;
 vaultBusy=true;vaultBackupReady=false;setVisible('vaultRevealBox',false);clearVaultWords();vaultMessage('busy');
 try{
  const {status:s,value}=await vaultRequest({action:'status'});
  if(s===200&&value.code==='backup_status'&&value.backed_up===true){
   vaultBackupReady=true;setVisible('vaultRevealBox',true);vaultMessage('available');
  }else if(s===200&&value.code==='backup_status'&&value.backed_up===false)vaultMessage('missing');
  else vaultMessage(s===503?'locked':'failed');
 }catch{vaultMessage('failed');}
 finally{vaultBusy=false;}
}
async function viewOriginalWords(){
 if(!mfaVerified||!vaultBackupReady||vaultBusy)return;
 const password=$('vaultPassword').value;$('vaultPassword').value='';
 if(password.length<6||password.length>20){vaultMessage('invalid');return;}
 vaultBusy=true;clearVaultWords();vaultMessage('busy');
 try{
  const {status:s,value}=await vaultRequest({action:'reveal',password});
  if(s===200&&value.code==='recovery_key'){revealWords(value.words);vaultMessage('available');}
  else vaultMessage('failed');
 }catch{vaultMessage('failed');}
 finally{vaultBusy=false;}
}
async function crossOwnerNegativeTest(){
 if(owner!=='n10qa_b_20261103'||!mfaVerified||vaultBusy)return;
 vaultBusy=true;clearVaultWords();vaultMessage('busy');
 try{
  // A genuine signed B/AAL2 request trying to override owner to A.
  // The read-only Vault MUST reject extra owner fields BEFORE fetching any backup.
  const {status:s,value}=await vaultRequest({action:'reveal',target_username:'n10qa_a_20261103'});
  if(s===400&&value.code==='unexpected_request_field'&&!('words' in value))vaultMessage('crossPassed');
  else vaultMessage('crossFailed');
 }catch{vaultMessage('crossFailed');}
 finally{vaultBusy=false;}
}

function clearSessionUI(){
 clearVault();clearQr();$('pwd').value='';$('totp').value='';owner=null;factorId='';mfaVerified=false;
 setVisible('loginPanel',true);setVisible('mfaPanel',false);setVisible('enroll',false);setVisible('verifyBox',false);setVisible('result',false);
 $('signedAs').textContent='';$('factorStatus').textContent='';
 $('owner').disabled=false;updateLogin();
}
async function verifiedOwner(){
 if(!client||!owner)throw Error('owner_not_set');
 const {data,error}=await client.auth.getUser();const u=data?.user;
 if(error||!u?.id||u.is_anonymous||u.app_metadata?.mmhvault_auth_kind!=='username_only'||
    u.app_metadata?.mmhvault_username!==owner||!ALLOWED.includes(owner))throw Error('owner_mismatch');
 return u;
}
async function ownerAal2(){
 await verifiedOwner();
 const {data,error}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
 if(error||data?.currentLevel!=='aal2')throw Error('aal2_missing');
 const fs=await client.auth.mfa.listFactors();
 if(fs.error||!(fs.data?.totp||[]).some(x=>x.id===factorId&&x.status==='verified'))throw Error('verified_factor_missing');
 return true;
}
async function factorState(){
 await verifiedOwner();
 const fs=await client.auth.mfa.listFactors();if(fs.error)throw Error('factor_unavailable');
 const verified=(fs.data?.totp||[]).find(x=>x.status==='verified');
 factorId=verified?.id||'';
 setVisible('enroll',!factorId);
 setVisible('verifyBox',!!factorId);
 $('factorStatus').textContent=tr(factorId?'already':'enrollReady');
}
async function act(task){
 if(busy)return;busy=true;$('signIn').disabled=true;$('enroll').disabled=true;$('verify').disabled=true;
 try{await task();}catch{
  if(owner&&!mfaVerified){$('factorStatus').textContent=tr('codeFail');}
  else status('loginFail');
 }finally{busy=false;$('enroll').disabled=false;$('verify').disabled=false;updateLogin();}
}
async function login(){
 if(!canLogin()){status(token?'passwordNeeded':'captchaNeeded');return;}
 const username=$('owner').value, password=$('pwd').value,captcha_token=token;
 clearChallenge();$('pwd').value='';
 await act(async()=>{
  status('working');
  const {response,json}=await post({action:'login',username,password,captcha_token});
  if(!response.ok||json.code!=='login_success'||typeof json.access_token!=='string'||typeof json.refresh_token!=='string')
   throw Error('login_denied');
  await client.auth.signOut({scope:'local'}).catch(()=>{});
  const {data,error}=await client.auth.setSession({access_token:json.access_token,refresh_token:json.refresh_token});
  if(error||!data?.user?.id)throw Error('session_failed');
  owner=username;await verifiedOwner();
  setVisible('loginPanel',false);setVisible('mfaPanel',true);
  $('signedAs').textContent=tr('signed')+' '+(username===ALLOWED[0]?'A':'B');
  status('loginOK');
  await factorState();
 });
}
async function enroll(){
 await act(async()=>{
  await verifiedOwner();
  if(factorId)throw Error('already_verified');
  // Previous QR rejection can leave a pending factor; clean only our own
  // unverified QA factor after the account owner explicitly clicks Enroll.
  await clearOwnUnverifiedFactor();
  const {data,error}=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'MMHVAULT N10 Staging MFA'});
  if(error||!data?.id||data?.type!=='totp')throw Error('enroll_failed');
  const qr=qrImageSource(data.totp?.qr_code);
  const secret=manualTotpSecret(data.totp?.secret);
  if(!qr&&!secret){
   // Only the brand-new unverified factor from this request may be cleaned.
   await client.auth.mfa.unenroll({factorId:data.id}).catch(()=>{});
   status('qrInvalid');return;
  }
  factorId=data.id;
  clearQr();
  $('qrWrap').hidden=!qr;
  if(qr)$('qr').src=qr;
  $('manualToggle').hidden=!qr||!secret;
  if(!qr){
   $('manualSecret').textContent=secret;
   $('manualSection').hidden=false;
  }else{
   // Hold the manual key only until the modal closes or the timer expires.
   $('manualToggle').onclick=()=>{
    $('manualSecret').textContent=secret;
    $('manualSection').hidden=false;
    $('manualToggle').hidden=true;
   };
  }
  $('qrModal').hidden=false;
  $('factorStatus').textContent=tr(qr?'enrolled':'manualOnly');
  setVisible('enroll',false);setVisible('verifyBox',true);
  clearTimeout(qrTimer);
  qrTimer=setTimeout(()=>{clearQr();status('secretExpired');},120000);
  $('qrDone').focus();
 });
}
async function verify(){
 const code=$('totp').value.trim();$('totp').value='';
 if(!/^\d{6}$/.test(code)||!factorId){status('enterCode');return;}
 await act(async()=>{
  await verifiedOwner();status('codeChecking');
  const {data:challenge,error:ce}=await client.auth.mfa.challenge({factorId});
  if(ce||!challenge?.id)throw Error('challenge_failed');
  const {error:ve}=await client.auth.mfa.verify({factorId,challengeId:challenge.id,code});
  if(ve)throw Error('verify_failed');
  await ownerAal2();
  mfaVerified=true;clearQr();setVisible('verifyBox',false);setVisible('enroll',false);
  $('factorStatus').textContent=tr('passed');$('result').textContent=tr('passed');setVisible('result',true);
  $('dot').classList.add('ready');status('passed');
  setVisible('vaultPanel',true);vaultMessage('locked');
  setVisible('vaultCrossCheck',owner==='n10qa_b_20261103');
 });
}
async function logout(){
 clearVault();
 if(client){try{await client.auth.signOut({scope:'local'});}catch{}}
 clearSessionUI();clearChallenge();setEnabled(false);status('signedOut');
}
$('vaultStatusBtn').addEventListener('click',checkVault);
$('vaultRevealBtn').addEventListener('click',viewOriginalWords);
$('vaultCrossCheck').addEventListener('click',crossOwnerNegativeTest);
$('vaultHide').addEventListener('click',clearVaultWords);
$('vaultClose').addEventListener('click',clearVaultWords);
$('pwd').addEventListener('input',updateLogin);
$('owner').addEventListener('change',()=>{clearChallenge();updateLogin();});
$('refresh').addEventListener('click',refresh);
$('signIn').addEventListener('click',login);
$('enroll').addEventListener('click',enroll);
$('verify').addEventListener('click',verify);
$('logout').addEventListener('click',logout);
$('qrDone').addEventListener('click',clearQr);
$('closeQr').addEventListener('click',clearQr);
document.querySelectorAll('[data-lang]').forEach(x=>x.addEventListener('click',()=>{lang=x.dataset.lang;renderLanguage();renderVaultLanguage();if(owner&&!mfaVerified)$('factorStatus').textContent=tr(factorId?'already':'enrollReady');}));
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearVaultWords();clearQr();}});
window.addEventListener('pagehide',()=>{clearVault();clearQr();$('pwd').value='';$('totp').value='';if(client)void client.auth.signOut({scope:'local'}).catch(()=>{});});
if(location.origin===ORIGIN&&window.supabase?.createClient){
 client=window.supabase.createClient(BASE,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'mmh-n10-mfa-qa-volatile'}});
 renderLanguage();renderVaultLanguage();setEnabled(false);clearVault();refresh();
}else{renderLanguage();renderVaultLanguage();setEnabled(false);clearVault();status('offline');}
})();