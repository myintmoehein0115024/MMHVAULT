/* MMHVAULT N10 — independent Cloudflare Pages Staging Vault QA client.
 * NEVER use this with Production users, tokens or domains.
 * No login session persistence, analytics, plaintext storage, recovery uploads to chat.
 */
(() => {
'use strict';
const BASE='https://ldivswlhtgmznzwhzsoi.supabase.co';
const EDGE=BASE+'/functions/v1/mmh-n10-qa-joint-mfa-vault-20261101';
const TRUSTED_ORIGIN='https://mmhvault-n10-vault-staging.pages.dev';
const KEY='sb_publishable_LxIB8564OZD48HQ8Mfsc0A_apkgERZo';
const OWNERS=Object.freeze([
 'n10-staging-qa-a-20261103@example.invalid',
 'n10-staging-qa-b-20261103@example.invalid'
]);
const $=name=>document.getElementById(name);
const show=(name,yes)=>$(name).classList.toggle('hidden',!yes);
const message=s=>{$('status').textContent=s};
const info=s=>{$('backupStatus').textContent=s};
let user=null, pendingPhrase='', phraseTimeout=null, tick=null, busy=false, factorId='';
let windowConfirmed=false, windowDeadlineMonotonic=0, windowExpired=false;
const client=window.supabase?.createClient(BASE,KEY,{
 auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'mmh-n10-staging-only'}
});
function hidePhrase(){
 clearTimeout(phraseTimeout);clearInterval(tick);phraseTimeout=null;tick=null;
 $('words').replaceChildren();$('countdown').textContent='';
 show('phrasePanel',false);pendingPhrase='';show('manualBlock',false);
}
function displayPhrase(words,keepForRetry){
 hidePhrase();
 if(!Array.isArray(words)||words.length!==10||words.some(w=>typeof w!=='string'||!/^[a-z]+$/.test(w))){
  message('服务器返回格式异常。为了安全，无法显示密钥。');return
 }
 pendingPhrase=keepForRetry?words.join(' '):'';
 for(let i=0;i<words.length;i++){
  const d=document.createElement('div');d.className='word';
  const n=document.createElement('b');n.textContent=String(i+1).padStart(2,'0');
  d.append(n,document.createTextNode(words[i]));$('words').append(d);
 }
 show('phrasePanel',true);show('manualBlock',keepForRetry);
 const until=Date.now()+45000;
 const counter=()=>{
  const remaining=Math.max(0,Math.ceil((until-Date.now())/1000));
  $('countdown').textContent='剩余 '+remaining+' 秒';
  if(!remaining)hidePhrase();
 };
 counter();tick=setInterval(counter,500);phraseTimeout=setTimeout(hidePhrase,45000);
}
function clearInputs(){
 for(const id of ['loginPwd','totp','setupPwd','retryPwd','revealPwd'])$(id).value='';
}
function windowRemainingMs(){
 return windowConfirmed?Math.max(0,windowDeadlineMonotonic-performance.now()):0;
}
function discardWindow(expired=false){
 windowConfirmed=false;windowDeadlineMonotonic=0;windowExpired=expired;
 hidePhrase();clearInputs();
 renderWindowClock();
}
function renderWindowClock(){
 const remaining=windowRemainingMs();
 if(windowConfirmed&&remaining<=0){
  windowConfirmed=false;windowExpired=true;windowDeadlineMonotonic=0;
  hidePhrase();clearInputs();
  message('测试窗口已到期，敏感操作已自动禁用。请不要重复生成恢复词。');
 }
 const clock=$('windowInfo'),hint=$('gateHint');
 if(windowConfirmed){
  const s=Math.max(0,Math.floor(remaining/1000));
  clock.textContent='已确认 Staging 测试窗口 · 安全剩余 '+Math.floor(s/60)+'分'+String(s%60).padStart(2,'0')+'秒';
  clock.className='window-clock active';
  hint.textContent='倒计时由服务器时间计算，提前 5 秒保护。真正访问权限始终以服务器为准。';
 }else{
  clock.textContent=windowExpired?'本次敏感测试窗口已结束 · 如需继续请重新授权':'敏感测试尚未开放 · 平时无需倒计时';
  clock.className='window-clock'+(windowExpired?' expired':'');
  hint.textContent='您可以随时离开，之后重新登录检查。真正开始短时敏感测试后才会倒计时；未开放时，恢复词操作保持禁用。';
 }
 $('initBtn').disabled=busy||!windowConfirmed||remaining<=120000;
 $('retryBtn').disabled=busy||!windowConfirmed||remaining<=45000;
 $('revealBtn').disabled=busy||!windowConfirmed||remaining<=30000;
 // A closed Vault must never invite password entry for a disabled action.
 for(const [field,action] of [['setupPwd','initBtn'],['retryPwd','retryBtn'],['revealPwd','revealBtn']]){
  const input=$(field),locked=$(action).disabled;
  if(locked&&!input.disabled)input.value='';
  input.disabled=locked;
  input.placeholder=locked?'安全测试未开放，无需输入密码':'请输入当前测试账户密码';
 }
 $('passwordGateNote').textContent=windowConfirmed
  ?'只有倒计时和按钮允许时才需要重新输入测试密码。'
  :'恢复密钥操作尚未开放。您已通过登录和 MFA，无需再次输入密码。';
}
function armWindow(serverExpiry,serverNow){
 const until=Date.parse(serverExpiry),current=Date.parse(serverNow);
 const delta=until-current;
 if(!Number.isFinite(until)||!Number.isFinite(current)||!Number.isFinite(delta)
    ||delta<=5000||delta>600000) {
  discardWindow(delta<=5000&&Number.isFinite(delta));
  throw Error('qa_window_invalid_metadata');
 }
 windowConfirmed=true;windowExpired=false;
 // Server timestamp is authoritative; a five-second buffer accounts for transit.
 windowDeadlineMonotonic=performance.now()+delta-5000;
 renderWindowClock();
}
function requireWindow(seconds){
 if(!windowConfirmed||windowRemainingMs()<=seconds*1000)
  throw Error('qa_window_insufficient');
}
function resetView(){
 discardWindow(false);factorId='';user=null;
 show('signinSection',true);show('mfaSection',false);show('vaultSection',false);
}
const codes=Object.freeze({
 recovery_service_not_released:'Staging Vault QA 当前安全关闭（正常）。不必守候计时器，可在方便时再来检查。',
 qa_window_invalid_metadata:'服务器未返回有效的窗口截止时间；敏感操作已禁用。',
 qa_window_insufficient:'剩余时间不足，已阻止生成或查看操作。请不要重复点击。',
 qa_window_closed:'测试窗口已结束，Vault 自动拒绝请求。',
 mfa_required:'必须先完成二级验证，不能查看恢复密钥。',
 synthetic_qa_account_required:'仅允许预先审核的两名合成测试账户。',
 sign_in_required:'登录会话失效，请重新登录。',
 session_expired:'会话已注销或过期，请重新登录。',
 invalid_credentials:'测试密码不正确，已拒绝访问。',
 too_many_attempts:'验证次数超限，请在 15 分钟后再试。',
 backup_not_ready:'此账户还未完成加密备份，不能查看恢复密钥。',
 qa_already_initialized:'恢复词已经初始化，禁止重新生成。请检查是否已加密备份。',
 invalid_recovery_key:'恢复词校验失败，未覆盖原来的十词。',
 origin_denied:'页面来源不受信任；停止操作。',
 unavailable:'安全检查未完成；服务器已拒绝请求。',
 mfa_unavailable:'MFA 状态暂时不可验证，服务器已拒绝。',
 backup_unavailable:'备份操作未完成；请保存当前显示的合成词并暂停操作。',
 qa_initialize_unavailable:'合成十词初始化失败；不会偷偷重新生成。'
});
function errDesc(err){
 if(err?.qaCode)return codes[err.qaCode]||'Staging QA 拒绝请求（'+String(err.qaCode).slice(0,60)+'）。';
 return '请求未完成。请检查网络、密码和 Staging 状态。';
}
function checkOrigin(){
 if(location.origin!==TRUSTED_ORIGIN||location.protocol!=='https:'){
  message('安全锁定：请从独立的官方 Staging QA 链接打开。');
  document.querySelectorAll('button').forEach(x=>x.disabled=true);
  return false;
 }
 if(!client){
  message('无法加载身份验证组件；请检查网络后刷新。');return false;
 }
 message('页面已就绪；Staging Vault 默认关闭。您可随时登录做 MFA 检查，不必留在页面等待。');
 return true;
}
const canRun=checkOrigin();
async function act(fn){
 if(!canRun||busy)return;
 busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{await fn()}
 catch(e){
  if(e?.qaCode==='qa_window_closed')discardWindow(true);
  else if(e?.qaCode==='recovery_service_not_released')discardWindow(false);
  message(errDesc(e));
 }
 finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);renderWindowClock();}
}
async function verifiedUser(){
 const {data,error}=await client.auth.getUser();
 const person=data?.user;
 if(error||!person?.id||!OWNERS.includes(person.email?.toLowerCase())||person.email_confirmed_at==null
   ||person.app_metadata?.mmhvault_auth_kind!=null||person.app_metadata?.mmhvault_username!=null)
  throw Error('invalid_test_owner');
 if(user&&person.id!==user.id)throw Error('owner_changed');
 user=person;return person;
}
async function verifiedAal2(){
 await verifiedUser();
 const {data,error}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
 if(error||data?.currentLevel!=='aal2')throw Error('aal2_required');
}
async function callVault(action,fields={}){
 if(action==='qa_initialize')requireWindow(120);
 else if(action==='backup_existing')requireWindow(45);
 else if(action==='reveal')requireWindow(30);
 await verifiedAal2();
 const {data,error}=await client.auth.getSession();
 if(error||!data?.session?.access_token||!data.session.expires_at
   ||data.session.expires_at*1000<=Date.now())throw Error('signed_session_required');
 const ac=new AbortController();
 const timer=setTimeout(()=>ac.abort(),28000);
 try{
  const response=await fetch(EDGE,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',
   referrerPolicy:'no-referrer',signal:ac.signal,
   headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+data.session.access_token},
   body:JSON.stringify({action,...fields})
  });
  const value=await response.json().catch(()=>({code:'unavailable'}));
  if(!response.ok||!value?.code){const e=Error('qa_denied');e.qaCode=value?.code||'unavailable';throw e;}
  return value;
 }finally{clearTimeout(timer);}
}
function needPassword(id){
 const p=$(id).value;$(id).value='';
 if(typeof p!=='string'||p.length<6||p.length>20)throw Error('password_required');
 return p;
}
$('loginBtn').addEventListener('click',()=>act(async()=>{
 const email=$('account').value,password=$('loginPwd').value;
 $('loginPwd').value='';discardWindow(false);
 if(!OWNERS.includes(email)||password.length<6||password.length>20)throw Error('invalid_login');
 await client.auth.signOut({scope:'local'}).catch(()=>{});
 const {data,error}=await client.auth.signInWithPassword({email,password});
 if(error||!data?.user||data.user.email?.toLowerCase()!==email)throw Error('login_denied');
 user=null;await verifiedUser();
 show('signinSection',false);
 const level=await client.auth.mfa.getAuthenticatorAssuranceLevel();
 if(level.error||level.data?.nextLevel!=='aal2')throw Error('verified_mfa_required');
 if(level.data.currentLevel==='aal2'){
  await intoVault();return
 }
 const f=await client.auth.mfa.listFactors();
 if(f.error)throw Error('factor_unavailable');
 const t=(f.data?.totp||[]).find(v=>v.status==='verified');
 if(!t?.id)throw Error('verified_factor_missing');
 factorId=t.id;
 show('mfaSection',true);
 message('测试账户密码登录成功。现在输入 Authenticator 六位验证码。');
}));
async function intoVault(){
 await verifiedAal2();
 show('mfaSection',false);show('vaultSection',true);
 $('signedAs').textContent=user.email===OWNERS[0]?'已验证账户 A · MFA AAL2':'已验证账户 B · MFA AAL2';
 message('Staging AAL2 已通过；Vault 功能仍须经过服务端独立授权。');
 info('服务尚未开放时无需等待，之后可重新登录检查备份状态。');
 discardWindow(false);
}
$('mfaBtn').addEventListener('click',()=>act(async()=>{
 const code=$('totp').value.trim();$('totp').value='';
 if(!/^\d{6}$/.test(code)||!factorId)throw Error('mfa_code_required');
 await verifiedUser();
 const c=await client.auth.mfa.challenge({factorId});
 if(c.error||!c.data?.id)throw Error('challenge_unavailable');
 const v=await client.auth.mfa.verify({factorId,challengeId:c.data.id,code});
 if(v.error)throw Error('mfa_code_invalid');
 await intoVault();
}));
$('refreshStatusBtn').addEventListener('click',()=>act(async()=>{
 // Never retain a previously confirmed window if a fresh status check fails.
 discardWindow(false);
 const value=await callVault('status');
 if(value.code!=='backup_status'||typeof value.backed_up!=='boolean')throw Error('invalid_status');
 armWindow(value.window_expires_at,value.server_utc_now);
 info(value.backed_up?'✅ 已存在加密备份（不会重置十词）。':'尚无加密备份（合成测试账户）。');
 message('Staging Vault 状态读取成功；倒计时已经按服务器时间启动。');
}));
$('initBtn').addEventListener('click',()=>act(async()=>{
 requireWindow(120);
 let p=needPassword('setupPwd');
 let words=null, backup=false;
 try{
  const init=await callVault('qa_initialize',{password:p});
  if(init.code!=='qa_phrase_initialized'||!Array.isArray(init.words)||init.words.length!==10)
   throw Error('initialize_failed');
  words=init.words;
  // Do not leave a window between generation and the encrypted Vault attempt.
  const saved=await callVault('backup_existing',{password:p,phrase:words.join(' ')});
  backup=saved.code==='backup_ready';
 }catch(e){
  if(!words)throw e;
  message('合成十词已生成，但加密备份失败：'+errDesc(e));
 }finally{p='';}
 if(!words)return;
 info(backup?'✅ 合成十词已加密保存到 Staging Vault。':'加密备份未确认。可在显示期间重试。');
 displayPhrase(words,!backup);
 words=null;
 if(backup)message('合成十词已初始化并加密；请在45秒内确认内容。稍后可用密码查看原来的十词。');
}));
$('retryBtn').addEventListener('click',()=>act(async()=>{
 requireWindow(45);
 let p=needPassword('retryPwd');
 try{
  if(!pendingPhrase)throw Error('phrase_expired');
  const saved=await callVault('backup_existing',{password:p,phrase:pendingPhrase});
  if(saved.code!=='backup_ready')throw Error('backup_unavailable');
  pendingPhrase='';show('manualBlock',false);
  info('✅ 加密备份已完成。');message('Staging Vault 加密备份成功。');
 }finally{p='';}
}));
$('revealBtn').addEventListener('click',()=>act(async()=>{
 requireWindow(30);
 let p=needPassword('revealPwd');
 try{
  hidePhrase();
  const value=await callVault('reveal',{password:p});
  if(value.code!=='recovery_key')throw Error('invalid_reveal');
  displayPhrase(value.words,false);
  message('已通过账户、MFA 与当前密码验证。显示原来的十词，仅45秒，不会重新生成。');
 }finally{p='';}
}));
$('hideBtn').addEventListener('click',hidePhrase);
$('logoutBtn').addEventListener('click',()=>act(async()=>{
 await client.auth.signOut({scope:'local'}).catch(()=>{});
 resetView();message('已退出测试账户，敏感信息已清除。');
}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)hidePhrase();});
window.addEventListener('pagehide',()=>{hidePhrase();clearInputs();});
// A display-only local clock; the server remains the sole authorization authority.
setInterval(renderWindowClock,750);
renderWindowClock();
})();