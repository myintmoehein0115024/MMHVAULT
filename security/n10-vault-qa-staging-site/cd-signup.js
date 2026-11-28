/* MMHVAULT N10 - live, isolated Staging username enrollment QA client.
 * No production URLs, local persistence, analytics, Auth logs or secret echo.
 * Disabled entirely unless the server preflight explicitly permits QA.
 */
(() => {
'use strict';
const ORIGIN='https://mmhvault-n10-vault-staging.pages.dev';
const EDGE='https://ldivswlhtgmznzwhzsoi.supabase.co/functions/v1/mmh-n10-staging-username-escrow-cd-20261104';
const SITEKEY='0x4AAAAAAFlXEfEHAP1TUxjr'; // Public Staging widget key, NOT a secret.
const ACTION='mmh_n10a769_prepare_signup';
const WORD_RE=/^[a-z]{2,13}$/;
const NAME_RE=/^(?:n10qa_c_20261104|n10qa_d_20261104)$/;
const $=id=>document.getElementById(id);
const MESSAGES=Object.freeze({
 zh:{
  title:'用户名注册 · 真实连接验收',intro:'仅连接隔离的 Staging 测试环境。此页面使用真实注册接口，不是模拟注册。',
  statusTag:'服务连接状态',statusTitle:'注册安全开关',checking:'正在检查 Staging 注册接口…',
  refresh:'重新检查服务',signupTitle:'建立测试用户名账户',qaOnly:'仅限事先允许的两个 n10qa_ 测试用户名，不影响正式用户。',
  username:'测试用户名',password:'测试密码（6–20 位）',captchaNote:'通过验证后才可生成这次注册的固定十词。',
  prepare:'生成并核对固定十词',privacy:'本页面不会把密码、恢复词或会话保存到设备，也不会连接正式数据库。',
  foot:'仅限隔离环境安全验收 · 正式登录和财务数据保持不变',
  modalTitle:'请安全保存这 10 个固定恢复词',modalNote:'注册成功之前，后台必须先加密备份并核对原词。关闭窗口会立即清理敏感信息。',
  confirm:'已安全保存，完成注册',ready:'真实 Staging 注册入口已开放，仅允许受控 QA 用户名。',
  closed:'真实 Staging 注册目前安全关闭。稍后可重新检查；无需输入密码。',captchaLoading:'正在载入安全验证组件…',
  offline:'无法连接测试服务。请检查网络并重新检查。',captchaUnavailable:'验证组件暂时无法加载，注册保持关闭。',
  captchaRequired:'请先完成人机验证。',invalid:'请输入允许的 QA 用户名及 6–20 位密码。',
  preparing:'正在安全准备本次注册…',enrolling:'正在加密备份并核对固定十词…',
  preparedExpired:'45 秒已到，敏感信息已清除。本次预约无法直接恢复。',
  pending:'请在倒计时内确认已安全保存；不要截图或在聊天中发送这些词。',
  confirmed:'注册成功：原始十词已通过后台加密保存及一致性核对。下一步是 MFA 和恢复词查看验收。',
  failed:'当前无法完成注册。系统不会自动重试或重新生成已有恢复词；请先检查后台状态。',
  unlisted:'当前用户名不在 QA 允许范围。',username_unavailable:'此用户名已被占用或预约。请勿连续重复提交。',
  invalid_enrollment:'本次预约已失效；请勿重新生成原始词。',registration_rate_limited:'测试请求次数已达上限。',
  auth_unavailable:'认证暂不可用；如有已创建账户，需要后台核对，不能随意重试。',
  registration_not_released:'注册尚未开放。',staging_unavailable:'测试安全配置尚未就绪。',
  seconds:'秒后隐藏'
 },
 en:{
  title:'Username Signup · Live Staging QA',intro:'Connected only to an isolated Staging environment. This tests the real registration API, not simulated enrollment.',
  statusTag:'SERVICE CONNECTION',statusTitle:'Registration safety gate',checking:'Checking the Staging registration endpoint…',
  refresh:'Check service again',signupTitle:'Create a QA username account',qaOnly:'Only two preapproved n10qa_ usernames are allowed. Production accounts are untouched.',
  username:'QA username',password:'QA password (6–20 characters)',captchaNote:'Complete the verification to prepare the fixed original ten words.',
  prepare:'Prepare the original ten words',privacy:'No passwords, recovery words or sessions are stored on your device. No production data is accessed.',
  foot:'Isolated QA only · Production login and financial data remain unchanged',
  modalTitle:'Securely save these 10 fixed recovery words',modalNote:'Before signup is reported successful, the server must encrypt and read back the same words. Closing clears sensitive data.',
  confirm:'Saved securely · Complete signup',ready:'Live Staging signup is available to approved QA usernames only.',
  closed:'Live Staging signup is securely disabled. You can check again later; do not enter a password.',captchaLoading:'Loading the secure verification component…',
  offline:'Staging service unavailable. Check your connection and try again.',captchaUnavailable:'Verification could not load. Signup remains unavailable.',
  captchaRequired:'Complete the verification first.',invalid:'Enter an approved QA username and a 6–20-character password.',
  preparing:'Preparing the Staging signup securely…',enrolling:'Encrypting and verifying the exact original recovery words…',
  preparedExpired:'45 seconds elapsed; sensitive information was erased. This reservation cannot be automatically recovered.',
  pending:'Confirm you have safely stored the words before time expires. Never share or screenshot them.',
  confirmed:'Signup completed: original words were encrypted and checked by the server. MFA and private viewer QA remain next.',
  failed:'Signup cannot be completed. No automatic retries or reconstruction of existing recovery words.',
  unlisted:'The selected username is outside the QA allowlist.',username_unavailable:'That username is unavailable or reserved; do not resubmit repeatedly.',
  invalid_enrollment:'The reservation is no longer valid; do not regenerate original words.',registration_rate_limited:'Staging rate limit reached.',
  auth_unavailable:'Authentication is temporarily unavailable. An account may require manual reconciliation.',
  registration_not_released:'Registration is not released.',staging_unavailable:'Staging security configuration is not ready.',
  seconds:'seconds until hidden'
 },
 my:{
  title:'အသုံးပြုသူအမည် မှတ်ပုံတင်ခြင်း · စမ်းသပ်မှု',intro:'သီးသန့် Staging စမ်းသပ်ပတ်ဝန်းကျင်နှင့်သာ ချိတ်ဆက်ထားသည်။ အတုမဟုတ်သော မှတ်ပုံတင် API ကို စမ်းသပ်သည်။',
  statusTag:'ဝန်ဆောင်မှု အခြေအနေ',statusTitle:'မှတ်ပုံတင်မှု လုံခြုံရေး',checking:'Staging ဝန်ဆောင်မှုကို စစ်ဆေးနေသည်…',
  refresh:'ပြန်လည်စစ်ဆေးရန်',signupTitle:'စမ်းသပ်အကောင့် ဖန်တီးရန်',qaOnly:'ခွင့်ပြုထားသော n10qa_ အသုံးပြုသူအမည် နှစ်ခုအတွက်သာ ဖြစ်သည်။',
  username:'စမ်းသပ် အသုံးပြုသူအမည်',password:'စမ်းသပ် စကားဝှက် (၆–၂၀ လုံး)',captchaNote:'စစ်ဆေးမှုအောင်မြင်မှ အမြဲတမ်း ပြန်လည်ရယူရေး စကားလုံး ၁၀ လုံး ထုတ်ပေးမည်။',
  prepare:'မူရင်းစကားလုံး ၁၀ လုံး ပြင်ဆင်ရန်',privacy:'စကားဝှက်၊ ပြန်လည်ရယူရေး စကားလုံးနှင့် session ကို စက်တွင် မသိမ်းဆည်းပါ။',
  foot:'သီးသန့် Staging စမ်းသပ်မှုသာ · ပင်မဝက်ဘ်ဆိုက် မပြောင်းလဲပါ',
  modalTitle:'မူရင်း ပြန်လည်ရယူရေးစကားလုံး ၁၀ လုံးကို လုံခြုံစွာ သိမ်းပါ',modalNote:'မှတ်ပုံတင်ခြင်း မအောင်မြင်မီ မူရင်းစကားလုံးများကို ကုဒ်ဝှက်သိမ်းဆည်းပြီး ပြန်လည်စစ်ဆေးရမည်။',
  confirm:'လုံခြုံစွာ သိမ်းပြီး · မှတ်ပုံတင်ရန်',ready:'Staging မှတ်ပုံတင်ခြင်းကို ခွင့်ပြုထားသော QA အကောင့်များအတွက်သာ ဖွင့်ထားသည်။',
  closed:'Staging မှတ်ပုံတင်ခြင်းကို လုံခြုံရေးအရ ပိတ်ထားသည်။ စကားဝှက် မထည့်ပါနှင့်။',captchaLoading:'လုံခြုံရေး စစ်ဆေးမှုကို ဖွင့်နေသည်…',
  offline:'Staging ဝန်ဆောင်မှုနှင့် မချိတ်ဆက်နိုင်ပါ။',captchaUnavailable:'စစ်ဆေးမှု မရရှိနိုင်ပါ။ မှတ်ပုံတင်ခြင်း ပိတ်ထားသည်။',
  captchaRequired:'စစ်ဆေးမှုကို အရင်လုပ်ဆောင်ပါ။',invalid:'ခွင့်ပြုထားသော QA အမည်နှင့် ၆–၂၀ လုံး စကားဝှက်ကို ထည့်ပါ။',
  preparing:'မှတ်ပုံတင်ခြင်း ပြင်ဆင်နေသည်…',enrolling:'မူရင်းစကားလုံးများကို ကုဒ်ဝှက်သိမ်းဆည်းပြီး စစ်ဆေးနေသည်…',
  preparedExpired:'၄၅ စက္ကန့် ပြည့်သွားပြီ။ လျှို့ဝှက်အချက်အလက်များ ဖျက်သိမ်းပြီးပါပြီ။',
  pending:'အချိန်မကုန်မီ လုံခြုံစွာ သိမ်းဆည်းထားကြောင်း အတည်ပြုပါ။',
  confirmed:'မှတ်ပုံတင်ခြင်း အောင်မြင်ပါပြီ။ နောက်တစ်ဆင့်တွင် MFA နှင့် ပြန်လည်ကြည့်ရှုခြင်းကို စစ်ဆေးမည်။',
  failed:'မှတ်ပုံတင်ခြင်း မပြီးမြောက်ပါ။ အလိုအလျောက် ထပ်မံမကြိုးစားပါနှင့်။',
  unlisted:'ဤအမည်ကို QA စမ်းသပ်မှုအတွက် ခွင့်မပြုထားပါ။',
  username_unavailable:'ဤအသုံးပြုသူအမည်ကို အသုံးမပြုနိုင်ပါ။',invalid_enrollment:'မှတ်ပုံတင်မှု ကြိုတင်ခွင့်ပြုချက် သက်တမ်းကုန်သွားပြီ။',
  registration_rate_limited:'တောင်းဆိုမှု အရေအတွက် ပြည့်နေပြီ။',
  auth_unavailable:'ဝန်ဆောင်မှု မရရှိနိုင်ပါ။ အကောင့်အခြေအနေကို စစ်ဆေးရမည်။',
  registration_not_released:'မှတ်ပုံတင်ခြင်း ပိတ်ထားသည်။',staging_unavailable:'စမ်းသပ်မှု လုံခြုံရေး ပြင်ဆင်မှု မပြီးသေးပါ။',
  seconds:'စက္ကန့်အတွင်း ဖျောက်မည်'
 }
});
let lang='zh', enabled=false, busy=false, token='', widget=null, prepared=null;
let deadline=0, hideTimer=null, tickTimer=null, activeRequest=null;
let challengeRetryTimer=null, challengeWaitStarted=0;
function stopChallengeWatch(){clearTimeout(challengeRetryTimer);challengeRetryTimer=null;challengeWaitStarted=0;}
const msg=key=>MESSAGES[lang][key]||MESSAGES[lang].failed;
function message(key){$('serverStatus').textContent=msg(key);$('serverStatus').dataset.status=key;}
function clearTimers(){clearTimeout(hideTimer);clearInterval(tickTimer);hideTimer=null;tickTimer=null;}
function clearPhrase(){
 clearTimers();deadline=0;prepared=null;$('words').replaceChildren();$('countdown').textContent='';$('modal').hidden=true;
}
function resetChallenge(){
 token='';
 if(widget!==null&&window.turnstile){try{window.turnstile.reset(widget);}catch{widget=null;}}
}
function closeSensitive(){
 if(activeRequest){activeRequest.abort();activeRequest=null;}
 clearPhrase();$('password').value='';resetChallenge();
}
function renderLanguage(){
 document.documentElement.lang=lang==='zh'?'zh-CN':lang==='my'?'my':'en';
 document.querySelectorAll('[data-i18n]').forEach(el=>{const translated=MESSAGES[lang][el.dataset.i18n];if(translated)el.textContent=translated;});
 document.querySelectorAll('[data-lang]').forEach(el=>{el.classList.toggle('active',el.dataset.lang===lang);el.setAttribute('aria-pressed',String(el.dataset.lang===lang));});
 const key=$('serverStatus').dataset.status;if(key)message(key);
}
function setReady(yes){
 enabled=!!yes;
 const panel=$('signupCard');panel.classList.toggle('is-locked',!enabled);
 panel.setAttribute('aria-disabled',String(!enabled));
 $('username').disabled=!enabled;$('password').disabled=!enabled;
 $('statusDot').classList.toggle('ready',enabled);
 if(!enabled){stopChallengeWatch();clearPhrase();$('password').value='';resetChallenge();}
 $('prepare').disabled=!enabled||busy||!token;
}
function validateInput(){
 const username=$('username').value.trim().toLowerCase();
 const password=$('password').value;
 return NAME_RE.test(username)&&username.length<=20&&password.length>=6&&password.length<=20;
}
async function request(payload,limit=10000){
 const controller=new AbortController();activeRequest=controller;
 const t=setTimeout(()=>controller.abort(),limit);
 try{
  const res=await fetch(EDGE,{method:'POST',headers:{'Content-Type':'application/json'},
   credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',
   body:JSON.stringify(payload),signal:controller.signal});
  const text=await res.text();
  if(text.length>5000)throw Error('response_too_large');
  const value=JSON.parse(text);
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid_response');
  return {status:res.status,data:value};
 }finally{clearTimeout(t);if(activeRequest===controller)activeRequest=null;}
}
function renderChallenge(){
 if(!enabled||widget!==null)return;
 if(!window.turnstile||typeof window.turnstile.render!=='function'){
  if(!challengeWaitStarted)challengeWaitStarted=Date.now();
  if(Date.now()-challengeWaitStarted<12000){
   message('captchaLoading');
   clearTimeout(challengeRetryTimer);
   challengeRetryTimer=setTimeout(renderChallenge,300);
  }else{stopChallengeWatch();message('captchaUnavailable');}
  return;
 }
 stopChallengeWatch();
 try{
  widget=window.turnstile.render('#turnstile',{
   sitekey:SITEKEY,action:ACTION,theme:'dark',
   callback:v=>{token=typeof v==='string'?v:'';$('prepare').disabled=!enabled||busy||!token;},
   'expired-callback':()=>{token='';$('prepare').disabled=true;},
   'error-callback':()=>{token='';$('prepare').disabled=true;message('captchaUnavailable');return true;}
  });
 }catch{widget=null;message('captchaUnavailable');}
}
async function refresh(){
 if(location.origin!==ORIGIN){setReady(false);message('offline');return;}
 if(busy)return;
 busy=true;setReady(false);message('checking');$('refresh').disabled=true;
 try{
  const {data}=await request({action:'preflight'});
  if(data.code!=='preflight_ok'||data.qa_only!==true||data.production!==false)throw Error('invalid_staging');
  const nowReady=data.enabled===true;
  setReady(nowReady);message(nowReady?'ready':'closed');
  if(nowReady)renderChallenge();
 }catch{setReady(false);message('offline');}
 finally{busy=false;$('refresh').disabled=false;$('prepare').disabled=!enabled||!token;}
}
function showPhrase(words,ticket,username){
 if(!Array.isArray(words)||words.length!==10||words.some(w=>typeof w!=='string'||!WORD_RE.test(w))||
    typeof ticket!=='string'||!/^[0-9a-f-]{36}$/i.test(ticket))throw Error('invalid_phrase');
 clearPhrase();
 prepared={phrase:words.join(' '),ticket,username};
 for(const [i,word] of words.entries()){
  const item=document.createElement('div');item.className='word';
  const n=document.createElement('b');n.textContent=String(i+1).padStart(2,'0');
  item.append(n,document.createTextNode(word));$('words').append(item);
 }
 $('modal').hidden=false;deadline=Date.now()+45000;
 const tick=()=>{
  const s=Math.max(0,Math.ceil((deadline-Date.now())/1000));
  $('countdown').textContent=s+' '+msg('seconds');
  if(s===0){clearPhrase();message('preparedExpired');}
 };
 tick();tickTimer=setInterval(tick,350);hideTimer=setTimeout(()=>{clearPhrase();message('preparedExpired');},45000);
 $('confirm').focus();
}
async function prepare(){
 if(!enabled||busy)return;
 if(!validateInput()){message('invalid');return;}
 if(!token){message('captchaRequired');return;}
 busy=true;$('prepare').disabled=true;message('preparing');
 const username=$('username').value.trim().toLowerCase(),captured=token;
 resetChallenge();
 try{
  const {data}=await request({action:'prepare_signup',username,captcha_token:captured});
  if(data.code==='phrase_prepared'){showPhrase(data.recovery_words,data.ticket,username);message('pending');}
  else message(data.code==='username_unavailable'?'username_unavailable':data.code in MESSAGES[lang]?data.code:'failed');
 }catch{message('offline');}
 finally{busy=false;$('prepare').disabled=!enabled||!token;}
}
async function complete(){
 if(!prepared||Date.now()>=deadline||busy){clearPhrase();message('preparedExpired');return;}
 const {phrase,ticket,username}=prepared;
 const password=$('password').value;
 if(password.length<6||password.length>20){clearPhrase();message('invalid');return;}
 busy=true;clearPhrase();$('prepare').disabled=true;$('confirm').disabled=true;message('enrolling');
 try{
  const {data}=await request({action:'signup',username,password,ticket,phrase},25000);
  if(data.code==='signup_success'&&data.user_id&&!(!data.access_token||!data.refresh_token)){
   // Session credentials exist only transiently in this response; never store or render them.
   message('confirmed');setReady(false);
  }else message(data.code in MESSAGES[lang]?data.code:'failed');
 }catch{message('failed');}
 finally{$('password').value='';busy=false;$('confirm').disabled=false;resetChallenge();$('prepare').disabled=!enabled||!token;}
}
document.querySelectorAll('[data-lang]').forEach(btn=>btn.addEventListener('click',()=>{lang=btn.dataset.lang;renderLanguage();}));
$('refresh').addEventListener('click',refresh);
$('prepare').addEventListener('click',prepare);
$('confirm').addEventListener('click',complete);
$('closeModal').addEventListener('click',()=>{clearPhrase();$('password').value='';message('preparedExpired');});
document.addEventListener('visibilitychange',()=>{if(document.hidden)closeSensitive();});
window.addEventListener('pagehide',closeSensitive);
window.addEventListener('beforeunload',closeSensitive);
renderLanguage();setReady(false);refresh();
})();