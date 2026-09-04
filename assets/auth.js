const SUPABASE_URL="https://vrypucmyrztxgiqhjspd.supabase.co";
const SUPABASE_KEY="sb_publishable_H38v4XbO0ARnSJToD42wGg_27-SZ3Ao";
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let mmhvaultAuthMode="signin";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[m]));
const appUrl=()=>new URL('app.html',location.href).toString();
function setAuthMode(mode){
  mmhvaultAuthMode=mode==="signup"?"signup":"signin";
  const signInTab=$("authSignInTab"),signUpTab=$("authSignUpTab"),title=$("authTitle"),subtitle=$("authSubtitle"),submit=$("authSubmitText"),bottom=$("authBottom"),forgot=$("forgotPasswordBtn");
  if(signInTab){signInTab.classList.toggle("active",mmhvaultAuthMode==="signin");signInTab.setAttribute("aria-selected",mmhvaultAuthMode==="signin"?"true":"false");}
  if(signUpTab){signUpTab.classList.toggle("active",mmhvaultAuthMode==="signup");signUpTab.setAttribute("aria-selected",mmhvaultAuthMode==="signup"?"true":"false");}
  if(title)title.textContent=mmhvaultAuthMode==="signup"?"Create Your Account":"Welcome Back";
  if(subtitle)subtitle.textContent=mmhvaultAuthMode==="signup"?"Start managing your wealth with MMHVAULT":"Access your MMHVAULT account";
  if(submit)submit.textContent=mmhvaultAuthMode==="signup"?"Create Account":"Sign In";
  if(forgot)forgot.style.display=mmhvaultAuthMode==="signup"?"none":"inline";
  if(bottom)bottom.innerHTML=mmhvaultAuthMode==="signup"?`Already have an account? <button type="button" onclick="window.myFinanceSetAuthMode('signin')">Sign in →</button>`:`Don't have an account? <button type="button" onclick="window.myFinanceSetAuthMode('signup')">Sign up →</button>`;
}
window.myFinanceSetAuthMode=setAuthMode;
function showMsg(html){const el=$("authMsg");if(el)el.innerHTML=html;}
/* V3.28.6: Login page stays visible even when a session already exists. */
async function auth(e){
  if(e)e.preventDefault();
  if(mmhvaultAuthMode==="signup") return createAccount();
  const email=$("email")?.value.trim()||"", password=$("password")?.value||"";
  showMsg('<div class="notice">Signing in…</div>');
  try{
    const r=await db.auth.signInWithPassword({email,password});
    if(r.error){showMsg(`<div class="notice err">${esc(r.error.message==="Invalid login credentials"?"Incorrect email or password.":r.error.message)}</div>`);return false;}
    sessionStorage.setItem('myfinance_show_welcome','1');
    location.replace(appUrl());
  }catch(err){console.error(err);showMsg(`<div class="notice err">${esc(err?.message||'Unable to sign in.')}</div>`);}
  return false;
}
async function signInWithGoogle(){
  const btn=$("googleLoginBtn");
  if(btn){btn.disabled=true;btn.innerHTML='<span>Connecting to Google…</span>';}
  showMsg('<div class="notice">Opening Google sign-in…</div>');
  try{
    sessionStorage.setItem('myfinance_show_welcome','1');
    const r=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.href}});
    if(r.error) throw r.error;
  }catch(err){
    sessionStorage.removeItem('myfinance_show_welcome');
    console.error(err);showMsg(`<div class="notice err">${esc(err?.message||'Unable to sign in with Google.')}</div>`);
    if(btn){btn.disabled=false;btn.innerHTML='<span>Continue with Google</span>';}
  }
}
window.myFinanceGoogleLogin=signInWithGoogle;
async function createAccount(){
  const email=$("email")?.value.trim()||"", password=$("password")?.value||"";
  showMsg('<div class="notice">Creating account…</div>');
  try{
    const r=await db.auth.signUp({email,password});
    if(r.error){showMsg(`<div class="notice err">${esc(r.error.message)}</div>`);return;}
    if(r.data?.session){sessionStorage.setItem('myfinance_show_welcome','1');location.replace(appUrl());}
    else showMsg('<div class="notice ok">Account created. Please confirm your email if required.</div>');
  }catch(err){showMsg(`<div class="notice err">${esc(err?.message||'Unable to create account.')}</div>`);}
}
window.myFinanceCreateAccount=createAccount;
async function forgotPassword(){
  const email=$("email")?.value.trim()||"";
  if(!email){showMsg('<div class="notice err">Enter your email first.</div>');return;}
  showMsg('<div class="notice">Sending reset email…</div>');
  try{const r=await db.auth.resetPasswordForEmail(email,{redirectTo:location.href});showMsg(r.error?`<div class="notice err">${esc(r.error.message)}</div>`:'<div class="notice ok">Password reset email sent. Please check your inbox.</div>');}
  catch(err){showMsg(`<div class="notice err">${esc(err?.message||'Unable to send reset email.')}</div>`);}
}
window.myFinanceForgotPassword=forgotPassword;
function bind(){
  $("passwordToggle")?.addEventListener('click',()=>{const p=$("password"),b=$("passwordToggle");if(!p||!b)return;const show=p.type==='password';p.type=show?'text':'password';b.textContent=show?'Hide':'Show';});
  const form=$("authForm");if(form)form.addEventListener('submit',auth);
  const back=()=>location.href='index.html';
  document.querySelectorAll('[data-auth-back]').forEach(b=>b.addEventListener('click',back));
  db.auth.onAuthStateChange((event,session)=>{if(event!=="INITIAL_SESSION"&&session)location.replace(appUrl());});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
