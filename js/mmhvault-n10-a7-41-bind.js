/* N10-A7.81: Production username binding for an already verified email account. */
(()=>{'use strict';
  const ENABLED=true; // Dedicated N10-A7.81 binding endpoint verifies current account ownership
  const SITE_KEY='0x4AAAAAAFrRIiFC7KoLQn2q'; // public site key, private key remains server-side
  const ORIGIN='https://vrypucmyrztxgiqhjspd.supabase.co';
  const API=ORIGIN+'/functions/v1/mmh-n10a781-bind';
  const NAME=/^[a-z][a-z0-9_]{3,19}$/;
  const node=id=>document.getElementById(id);
  const form=node('mmhA741BindForm'),username=node('mmhA741Name'),password=node('mmhA741Password');
  const submit=node('mmhA741BindSubmit'),status=node('mmhA741BindStatus'),captcha=node('mmhA741BindCaptcha');
  if(!form||!username||!password||!submit||!status||!captcha)return;
  let lang=localStorage.getItem('mmhvault-language')==='zh'?'zh':'en';
  let client=null,busy=false,token='',captchaId=null,loading=null,completed=false,serverReady=false,hasVerifiedSession=false;
  const tr=(zh,en)=>lang==='zh'?zh:en;
  function message(zh,en){status.textContent=tr(zh,en);}
  function safeReady(){return ENABLED===true && serverReady && hasVerifiedSession && /^0x[A-Za-z0-9]+$/.test(SITE_KEY) &&
    location.protocol==='https:' && location.hostname==='mmhvault.com' &&
    window.supabase?.createClient && MMH_A741_PROJECT===ORIGIN &&
    typeof MMH_A741_PUBLISHABLE==='string' && MMH_A741_PUBLISHABLE.startsWith('sb_publishable_');}
  function paint(){
    document.documentElement.lang=lang;
    const labels=[
      ['mmhA741Title','绑定用户名','Link a username'],
      ['mmhA741Intro','仅用于已有、已验证邮箱的账户。绑定用户名不会创建新账户或改变资产数据。操作时须输入当前账户密码。','For an existing, verified email account. Linking a username does not create a new account or change your financial data. Verify your current password to finish.'],
      ['mmhA741NameLabel','新用户名','New username'],
      ['mmhA741NameHint','以英文字母开头，可使用小写字母、数字及下划线。','Start with a letter; use lowercase letters, digits or underscores.'],
      ['mmhA741PasswordLabel','当前账户密码','Current account password'],
      ['mmhA741PasswordHint','请勿分享密码。仅使用 Google 登录的账户可能需要先通过邮箱重置设置密码。','Never share your password. Google-only accounts may need to set a password through verified email recovery first.'],
      ['mmhA741Back','返回财务主页','Back to dashboard'],
      ['mmhA741Recovery','邮箱找回 / 登录','Email recovery / sign in']
    ];
    for(const [id,zh,en] of labels){const el=node(id);if(el)el.textContent=tr(zh,en);}
    username.placeholder=tr('4–20 个字符','4–20 characters');
    password.placeholder=tr('当前密码','Current password');
    submit.textContent=busy?tr('正在验证…','Verifying…'):tr('绑定用户名','Link username');
    const ready=safeReady();
    username.disabled=busy||completed||!ready;
    password.disabled=busy||completed||!ready;
    if(!ready){password.value='';token='';captcha.hidden=true;}
    submit.disabled=busy||completed||!ready||!token;
    if(!ready)message(hasVerifiedSession?'安全服务正在检查，请稍后重试。':'请先使用已验证的邮箱账户登录，然后返回此页绑定用户名。',hasVerifiedSession?'Security service is being checked. Please retry shortly.':'Sign in with your verified email account first, then return here to link your username.');
  }
  function clearChallenge(){token='';if(captchaId!==null&&window.turnstile?.reset)try{window.turnstile.reset(captchaId)}catch(_){};paint();}
  async function challenge(){
    if(!safeReady()||captchaId!==null||completed)return;
    if(!loading){
      loading=new Promise((resolve,reject)=>{
        if(window.turnstile?.render)return resolve();
        const script=document.createElement('script');
        script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async=true;script.defer=true;
        script.onload=()=>window.turnstile?.render?resolve():reject(Error('turnstile_unavailable'));
        script.onerror=()=>reject(Error('turnstile_unavailable'));
        document.head.appendChild(script);
      }).catch(e=>{loading=null;throw e});
    }
    try{
      await loading;if(!safeReady()||completed)return;
      captcha.hidden=false;
      captchaId=window.turnstile.render(captcha,{sitekey:SITE_KEY,theme:'dark',
        action:'mmh_n10a781_bind',appearance:'interaction-only',
        callback:t=>{token=typeof t==='string'?t:'';paint()},
        'expired-callback':()=>{token='';paint()},
        'error-callback':()=>{token='';paint()}});
    }catch(_){message('验证码暂不可用。','Verification unavailable.')}
  }
  async function preflight(){
    try{
      const r=await fetch(API,{method:'POST',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'preflight'})});
      const j=await r.json();
      serverReady=r.ok&&j?.enabled===true&&j?.username_linking===true;
    }catch(_){serverReady=false}
    if(serverReady){
      try{await verifiedSession();hasVerifiedSession=true;}
      catch(_){hasVerifiedSession=false;}
    }
    paint();
    if(safeReady()){
      message('验证已完成。请选择一个新的用户名，并输入当前邮箱账户密码进行绑定。','Ready. Choose a username and enter the current password for your email account.');
      void challenge();
    }
  }
  async function verifiedSession(){
    if(!client)client=window.supabase.createClient(MMH_A741_PROJECT,MMH_A741_PUBLISHABLE);
    const remote=await client.auth.getUser();
    const local=await client.auth.getSession();
    if(remote.error||local.error||!remote.data?.user?.id||
       !remote.data.user.email_confirmed_at||remote.data.user.is_anonymous||
       !local.data?.session?.access_token||
       local.data.session.user?.id!==remote.data.user.id)throw Error('auth_missing');
    return local.data.session.access_token;
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!safeReady()||busy||completed||!token){paint();return;}
    const name=username.value.trim().toLowerCase(),pwd=password.value,used=token;
    if(!NAME.test(name)||pwd.length<1||pwd.length>128){
      message('请检查用户名及密码。','Check username and password.');return;
    }
    busy=true;token='';password.value='';paint();
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),15000);
    try{
      const jwt=await verifiedSession();
      if(!safeReady())throw Error('gate_closed');
      const response=await fetch(API,{method:'POST',mode:'cors',credentials:'omit',
        cache:'no-store',referrerPolicy:'no-referrer',signal:ctrl.signal,
        headers:{'Content-Type':'application/json','apikey':MMH_A741_PUBLISHABLE,'Authorization':'Bearer '+jwt},
        body:JSON.stringify({action:'bind',username:name,password:pwd,captcha_token:used})});
      const result=await response.json().catch(()=>null);
      if(response.ok&&result?.code==='bind_success'){
        completed=true;username.value=name;
        message('用户名已绑定到当前账户。今后可以使用用户名和原密码登录，也可以继续使用邮箱登录。','Username linked to your existing account. You can now sign in with the username and current password, or continue using email.');
        return;
      }
      if(response.status===409){message('此用户名不可用或当前账户已绑定。','Username unavailable or this account is already linked.');return;}
      if(response.status===401){message('请先登录已验证的邮箱账户，并确认填写的是当前账户密码。','Sign in to your verified email account and check the current password.');return;}
      if(response.status===429){message('安全检查次数过多，请稍后再试。','Too many attempts. Try again later.');return;}
      throw Error('bind_failed');
    }catch(_){message('绑定未完成，请重新验证账户后再试。','Could not link username. Please verify your account and try again.');}
    finally{clearTimeout(timer);busy=false;clearChallenge();}
  });
  node('mmhA741Language')?.addEventListener('click',()=>{
    lang=lang==='zh'?'en':'zh';
    localStorage.setItem('mmhvault-language',lang);paint();
  });
  window.addEventListener('pagehide',()=>{password.value='';token='';});
  paint();
  void preflight();
})();
