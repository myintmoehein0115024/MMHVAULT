/* MMHVAULT N10-A7.40: production integration CANDIDATE only.
 * Username login is HARD-DISABLED until a separate production backend and security release.
 * Never use QA / Staging endpoints, secrets or test identities here.
 */
(()=>{'use strict';
  const ENABLED=false; // release gate; NEVER enable before production approval
  const PROJECT_ORIGIN='https://vrypucmyrztxgiqhjspd.supabase.co';
  const EDGE_URL=PROJECT_ORIGIN+'/functions/v1/mmh-n10-a740-username';
  const TURNSTILE_SITE_KEY=''; // public production-only key, intentionally not configured
  const ID_PATTERN=/^[a-z][a-z0-9_]{3,19}$/;
  const $=id=>document.getElementById(id);
  const form=$('usernameSignIn'),email=$('signin'),user=$('mmhA740Username'),pass=$('mmhA740Password');
  const submit=$('mmhA740Submit'),status=$('mmhA740Status'),captcha=$('mmhA740Captcha');
  if(!form||!email||!user||!pass||!submit||!status||!captcha)return;
  const isZh=()=>window.getMMHVAULTLanguage?.()==='zh';
  const tr=(zh,en)=>isZh()?zh:en;
  let pending=false,token='',widgetId=null,challengeLoading=null;
  function setStatus(zh,en){status.textContent=tr(zh,en);}
  function safeReady(){
    return ENABLED===true && !!TURNSTILE_SITE_KEY &&
      /^0x[A-Za-z0-9]+$/.test(TURNSTILE_SITE_KEY) &&
      location.protocol==='https:' &&
      location.hostname==='mmhvault.com' &&
      typeof db!=='undefined' && !!db?.auth?.setSession &&
      typeof SUPABASE_URL!=='undefined' && SUPABASE_URL===PROJECT_ORIGIN &&
      EDGE_URL.startsWith(PROJECT_ORIGIN+'/functions/v1/');
  }
  function paint(){
    for(const b of document.querySelectorAll('[data-mmh-a740-method]')){
      const selected=b.dataset.mmhA740Method===(form.classList.contains('active')?'username':'email');
      b.setAttribute('aria-pressed',String(selected));
      b.textContent=b.dataset.mmhA740Method==='username'?tr('用户名','Username'):tr('邮箱','Email');
    }
    for(const label of form.querySelectorAll('label')){
      if(label.htmlFor==='mmhA740Username')label.textContent=tr('用户名','Username');
      if(label.htmlFor==='mmhA740Password')label.textContent=tr('密码','Password');
    }
    user.placeholder=tr('输入用户名','Your username');pass.placeholder=tr('输入密码','Password');
    submit.textContent=pending?tr('正在验证…','Verifying…'):tr('登录','Sign In');
    const help=$('mmhA740Forgot');
    if(help)help.textContent=tr('通过邮箱重置密码','Reset password by email');
    const helpPara=form.querySelector('.mmh-a740-help');
    if(helpPara&&help)helpPara.firstChild.textContent=tr('忘记密码？ ','Forgot your password? ');
    const available=safeReady();
    user.disabled=pending||!available;
    pass.disabled=pending||!available;
    if(!available){pass.value='';token='';captcha.hidden=true;}
    submit.disabled=pending||!available||!token;
    if(!available)setStatus('用户名登录将在安全集成完成后开放。','Username sign-in will be available after secure integration.');
  }
  function resetChallenge(){
    token='';
    if(widgetId!==null&&window.turnstile?.reset){try{window.turnstile.reset(widgetId)}catch(_){}}
    paint();
  }
  function switchMethod(mode){
    if(pending)return;
    const username=mode==='username';
    email.classList.toggle('active',!username);form.classList.toggle('active',username);
    if(username){paint();if(safeReady())void renderChallenge();}
    else {pass.value='';resetChallenge();}
    paint();
  }
  document.querySelectorAll('[data-mmh-a740-method]').forEach(b=>b.addEventListener('click',()=>switchMethod(b.dataset.mmhA740Method)));
  document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',paint));
  $('mmhA740Forgot')?.addEventListener('click',()=>{switchMethod('email');$('signinEmail')?.focus();});
  async function renderChallenge(){
    if(!safeReady()||widgetId!==null)return;
    if(!challengeLoading){
      challengeLoading=new Promise((resolve,reject)=>{
        if(window.turnstile?.render)return resolve();
        const script=document.createElement('script');
        script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async=true;script.defer=true;
        script.onload=()=>window.turnstile?.render?resolve():reject(Error('challenge_unavailable'));
        script.onerror=()=>reject(Error('challenge_unavailable'));document.head.appendChild(script);
      }).catch(err=>{challengeLoading=null;throw err});
    }
    try{
      await challengeLoading;if(!safeReady()||!form.classList.contains('active'))return;
      captcha.hidden=false;
      widgetId=window.turnstile.render(captcha,{
        sitekey:TURNSTILE_SITE_KEY,theme:'dark',action:'mmh_n10a740_login',
        callback:value=>{token=typeof value==='string'?value:'';paint()},
        'expired-callback':()=>{token='';paint()},
        'error-callback':()=>{token='';paint()}
      });
    }catch(_){setStatus('验证服务暂时不可用。','Verification service unavailable.')}
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(pending||!safeReady()||!token){paint();return;}
    const username=user.value.trim().toLowerCase(),password=pass.value;
    if(!ID_PATTERN.test(username)||password.length<1||password.length>128){
      setStatus('请检查用户名或密码。','Please check your username or password.');return;
    }
    const usedToken=token;token='';pass.value='';pending=true;paint();
    const abort=new AbortController();
    const timer=setTimeout(()=>abort.abort(),15000);
    let handedOff=false;
    try{
      const response=await fetch(EDGE_URL,{
        method:'POST',mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',
        headers:{'Content-Type':'application/json','Accept':'application/json',apikey:SUPABASE_KEY},
        body:JSON.stringify({action:'login',username,password,captcha_token:usedToken}),
        signal:abort.signal
      });
      const body=await response.json().catch(()=>null);
      if(!response.ok||body?.code!=='login_success'||!body?.access_token||!body?.refresh_token)
        throw Error('login_denied');
      // Suppress the legacy SIGNED_IN auto-redirect while this handler verifies UID.
      // Otherwise both paths can race and treat a valid login as a failed redirect.
      window.MMHVAULT_N10_A741_USERNAME_HANDOFF=true;
      handedOff=true;
      const assigned=await db.auth.setSession({access_token:body.access_token,refresh_token:body.refresh_token});
      if(assigned.error||!assigned.data?.user?.id)throw Error('session_invalid');
      const uid=assigned.data.user.id;
      const remote=await db.auth.getUser();
      const cached=await db.auth.getSession();
      if(remote.error||remote.data?.user?.id!==uid||cached.error||cached.data?.session?.user?.id!==uid)
        throw Error('identity_mismatch');
      const navigated=await verifiedRedirectV946(uid); // existing verified login->app.html path
      if(!navigated)throw Error('verified_navigation_not_completed');
    }catch(_){
      if(handedOff){try{await db.auth.signOut({scope:'local'})}catch(__){}}
      setStatus('登录未完成，请重试。','Could not sign in. Please try again.');
    }finally{
      window.MMHVAULT_N10_A741_USERNAME_HANDOFF=false;
      clearTimeout(timer);pending=false;resetChallenge();
    }
  });
  window.addEventListener('pagehide',()=>{pass.value='';token='';});
  paint();
})();
