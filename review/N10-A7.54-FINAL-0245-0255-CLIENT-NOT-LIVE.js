/* MMHVAULT N10-A7.54-C — CANDIDATE / NO PRODUCTION RELEASE
 * The QA page and this client are permanently inert in this review stage.
 * Switching either lock requires a SEPARATELY approved, time-scoped release.
 * No usernames, UIDs or secrets are embedded; only PUBLIC API/site keys.
 */
(() => {
  'use strict';
  const QA_CLOSED = false;
  const LIVE_REQUESTS_ALLOWED = true;
  const PROJECT = 'https://vrypucmyrztxgiqhjspd.supabase.co';
  const ENDPOINT = PROJECT + '/functions/v1/mmh-n10-a740-username';
  const PUBLIC_KEY = 'sb_publishable_H38v4XbO0ARnSJToD42wGg_27-SZ3Ao';
  const SITE_KEY = '0x4AAAAAAFrRIiFC7KoLQn2q';
  const USERNAME = /^[a-z][a-z0-9_]{3,19}$/;
  const REQ_TIMEOUT_MS = 12000;
  // The SDK version is pinned, matching the existing production login page.
  // These third-party scripts are loaded ONLY after BOTH closed gates are
  // explicitly changed during a separately approved test-window release.
  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.js';
  const TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  const originReady = () => location.protocol==='https:' && location.hostname==='mmhvault.com';
  const QA_START_UTC = '2026-10-29T19:45:00.000Z';
  const QA_END_UTC = '2026-10-29T19:55:00.000Z';
  const withinWindow = () => Date.now() >= Date.parse(QA_START_UTC) && Date.now() < Date.parse(QA_END_UTC);
  const releaseApproved = () => QA_CLOSED===false && LIVE_REQUESTS_ALLOWED===true && originReady() && withinWindow();
  const node = id => document.getElementById(id);
  const active = () => releaseApproved() &&
    window.supabase && typeof window.supabase.createClient === 'function' &&
    window.turnstile && typeof window.turnstile.render === 'function' &&
    typeof PUBLIC_KEY === 'string' && PUBLIC_KEY.startsWith('sb_publishable_') &&
    SITE_KEY.startsWith('0x');
  const loc = (zh, en) => document.documentElement.lang === 'en' ? en : zh;
  const slots = ['A', 'B'];
  let mainClient = null, verifier = null, dependencyPromise = null;
  function loadScript(url) {
    if(!releaseApproved() || typeof document.createElement!=='function' || !document.head)
      return Promise.reject(Error('gate_closed'));
    // All URLs are immutable literals, not assembled from UI or query strings.
    if(url!==SDK_URL && url!==TURNSTILE_URL)
      return Promise.reject(Error('script_not_allowlisted'));
    return new Promise((resolve,reject)=>{
      const tag=document.createElement('script');
      tag.src=url;tag.async=true;tag.referrerPolicy='no-referrer';
      tag.crossOrigin='anonymous';
      tag.onload=()=>{tag.onload=null;tag.onerror=null;resolve();};
      tag.onerror=()=>{tag.onload=null;tag.onerror=null;reject(Error('dependency_unavailable'));};
      document.head.appendChild(tag);
    });
  }
  async function initializeDependencies() {
    if(!releaseApproved())return;
    if(dependencyPromise)return dependencyPromise;
    dependencyPromise=(async()=>{
      if(!window.supabase?.createClient)await loadScript(SDK_URL);
      if(!releaseApproved())throw Error('gate_closed');
      if(!window.turnstile?.render)await loadScript(TURNSTILE_URL);
      if(!active())throw Error('dependency_not_ready');
      for(const k of slots)mountCaptcha(k);
      showApprovedClientMode();
      renderLocked();
    })().catch(()=>{
      renderLocked();
      for(const k of slots)say(k,'无法加载经批准的测试组件，请停止测试','Approved QA dependencies unavailable; stop testing');
    });
    return dependencyPromise;
  }
  const record = Object.fromEntries(slots.map(k => [k, {
    busy:false, token:'', widgetId:null, mode:'bind', boundUid:null, lastOperation:null
  }]));

  function say(k, zh, en) {
    const status = node('qa54bStatus'+k);
    if(status) status.textContent = loc(zh,en);
  }
  function showApprovedClientMode() {
    // DISPLAY ONLY. This never claims the backend is ready or that real login
    // has succeeded, and cannot change any Edge/production gate.
    if(!active())return;
    const badge=node('badge'),mode=node('portalMode'),backend=node('qa54cBackendStat');
    if(badge)badge.textContent='N10-A7.54 · QA CLIENT ENABLED';
    if(mode)mode.textContent='QA BROWSER READY · SERVER GATES REQUIRED';
    if(backend)backend.textContent=loc('仅提交时请求 · 服务端仍独立校验','Only on submit · Server checks independently');
  }

  function renderLocked() {
    for (const k of slots) {
      const field = node('qa54bName'+k), pass = node('qa54bPassword'+k);
      const bind = node('qa54bBind'+k), login = node('qa54bLogin'+k);
      const selector=node('qa54bMode'+k);
      const captcha = node('qa54bCaptcha'+k);
      if(!field || !pass || !bind || !login || !captcha) continue;
      const allowed=active() && !record[k].busy;
      field.disabled=!allowed;field.readOnly=!allowed;
      pass.disabled=!allowed;pass.readOnly=!allowed;
      if(selector)selector.disabled=!allowed;
      bind.disabled=!allowed || record[k].mode!=='bind' || !record[k].token;
      login.disabled=!allowed || record[k].mode!=='login' || !record[k].token || !record[k].boundUid;
      captcha.hidden=!allowed;
      if(!allowed){pass.value='';record[k].token='';}
      if(!active())say(k,'🔒 尚未获批真实测试 · 无请求','🔒 Live QA not authorized · No requests');
    }
  }
  function client() {
    if(!mainClient) mainClient=window.supabase.createClient(PROJECT,PUBLIC_KEY,{
      auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}
    });
    return mainClient;
  }
  function proofClient() {
    if(!verifier) verifier=window.supabase.createClient(PROJECT,PUBLIC_KEY,{
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
    });
    return verifier;
  }
  async function verifiedCurrentUser() {
    const instance=client();
    const userResponse=await instance.auth.getUser();
    const sessionResponse=await instance.auth.getSession();
    const user=userResponse?.data?.user, session=sessionResponse?.data?.session;
    if(userResponse.error || sessionResponse.error || !user?.id ||
       !user.email_confirmed_at || user.is_anonymous ||
       !session?.access_token || session.user?.id !== user.id)
      throw Error('current_user_not_verified');
    return {uid:user.id,access:session.access_token};
  }
  async function post(action,username,password,captchaToken,access) {
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),REQ_TIMEOUT_MS);
    try{
      const response=await fetch(ENDPOINT,{
        method:'POST',mode:'cors',credentials:'omit',cache:'no-store',
        referrerPolicy:'no-referrer',signal:ctrl.signal,
        headers:{
          'Content-Type':'application/json','apikey':PUBLIC_KEY,
          ...(access ? {'Authorization':'Bearer '+access} : {})
        },
        body:JSON.stringify({action,username,password,captcha_token:captchaToken})
      });
      const result=await response.json().catch(()=>null);
      return {status:response.status,result};
    } finally {clearTimeout(timer);}
  }
  async function revokeTemporary(access) {
    // Server-side best-effort revocation: never persist proof refresh tokens.
    if(!access) return;
    try {
      await fetch(PROJECT+'/auth/v1/logout?scope=local',{
        method:'POST',mode:'cors',credentials:'omit',cache:'no-store',
        referrerPolicy:'no-referrer',
        headers:{'apikey':PUBLIC_KEY,'Authorization':'Bearer '+access}
      });
    } catch { /* best effort; token naturally expires if provider is unreachable */ }
  }
  function clearSecretFields(k){
    const pass=node('qa54bPassword'+k);
    if(pass)pass.value='';
    record[k].token='';
    if(record[k].widgetId!==null && window.turnstile?.reset){
      try{window.turnstile.reset(record[k].widgetId);}catch{}
    }
  }
  async function perform(k,action) {
    const r=record[k],name=node('qa54bName'+k),pass=node('qa54bPassword'+k);
    if(!active() || r.busy || r.mode!==action || !r.token || !name || !pass) {renderLocked();return;}
    const username=name.value.trim().toLowerCase();
    let password=pass.value,token=r.token;
    if(!USERNAME.test(username) || password.length<6 || password.length>128) {
      say(k,'用户名或密码格式不正确','Invalid username or password format');return;
    }
    r.busy=true;r.token='';pass.value='';renderLocked();
    let proofAccess=null;
    try {
      if(!active())throw Error('gate_closed');
      let current=null;
      if(action==='bind'){
        current=await verifiedCurrentUser();
        // A/B label is NOT proof of UID; authoritative UID is server-verified.
      } else if(action==='login' && !r.boundUid) throw Error('bind_first');
      if(!active())throw Error('gate_closed');
      const out=await post(action,username,password,token,current?.access);
      if(action==='bind') {
        if(out.status!==200 || out.result?.code!=='bind_success')throw Error('bind_failed');
        const after=await verifiedCurrentUser();
        if(after.uid!==current.uid)throw Error('uid_changed');
        r.boundUid=current.uid;
        r.lastOperation='bind';
        say(k,'用户名已绑定：UID 未变化（QA）','Username bound: UID unchanged (QA)');
      } else {
        if(out.status!==200 || out.result?.code!=='login_success' ||
          typeof out.result.access_token!=='string' ||
          typeof out.result.refresh_token!=='string')throw Error('login_failed');
        proofAccess=out.result.access_token;
        const verified=await proofClient().auth.getUser(proofAccess);
        const who=verified?.data?.user;
        if(verified.error || !who?.id || who.id!==r.boundUid ||
          !who.email_confirmed_at || who.is_anonymous) throw Error('uid_mismatch');
        const currentSession=await verifiedCurrentUser();
        if(currentSession.uid!==r.boundUid)throw Error('current_session_mismatch');
        // DO NOT call setSession with the received proof or hand it to app.html.
        r.lastOperation='login';
        say(k,'登录验证通过：UID 匹配，未接管当前会话','Login verified: UID matches; current session untouched');
      }
    } catch {
      say(k,'测试未完成：请确认验证码、密码和当前账号，禁止分享凭据','QA not completed: verify challenge and account; never share credentials');
    } finally {
      // Never store access/refresh tokens in localStorage, app sessions, or UI.
      await revokeTemporary(proofAccess);
      proofAccess=null;password=null;token=null;
      r.busy=false;clearSecretFields(k);renderLocked();
    }
  }
  function mountCaptcha(k){
    if(!active() || record[k].widgetId!==null)return;
    const slot=node('qa54bCaptcha'+k);
    if(!slot)return;
    const r=record[k];
    r.widgetId=window.turnstile.render(slot,{
      sitekey:SITE_KEY,theme:'dark',
      action:r.mode==='login'?'mmh_n10a740_login':'mmh_n10a740_bind',
      callback:t=>{r.token=typeof t==='string'?t:'';renderLocked();},
      'expired-callback':()=>{r.token='';renderLocked();},
      'error-callback':()=>{r.token='';renderLocked();}
    });
  }
  function changeMode(k,mode){
    if(!active() || record[k].busy || !['bind','login'].includes(mode))return;
    const r=record[k];r.mode=mode;r.token='';
    if(r.widgetId!==null) {
      if(window.turnstile?.remove)try{window.turnstile.remove(r.widgetId);}catch{}
      r.widgetId=null;
    }
    mountCaptcha(k);renderLocked();
  }
  function start(){
    // The locked display module registers first. Restore truthful QA status
    // after its language toggle when, and only when, testing is authorized.
    // This controls presentation only, never authorization.
    node('langToggle')?.addEventListener('click',()=>{
      if(active())showApprovedClientMode();
    });
    for(const k of slots){
      node('qa54bBind'+k)?.addEventListener('click',()=>void perform(k,'bind'));
      node('qa54bLogin'+k)?.addEventListener('click',()=>void perform(k,'login'));
      node('qa54bName'+k)?.addEventListener('input',()=>{record[k].boundUid=null;renderLocked();});
      node('qa54bMode'+k)?.addEventListener('change',e=>changeMode(k,e?.target?.value||node('qa54bMode'+k)?.value));
    }
    // Closed candidate must not load SDK, render Turnstile, fetch, or read sessions.
    renderLocked();
    // A closed candidate NEVER inserts remote scripts, not even Turnstile.
    if(releaseApproved())void initializeDependencies();
    // UI closes itself at the hard UTC deadline; server separately rejects
    // requests beyond this window. A manual rollback is still mandatory.
    const untilEnd=Date.parse(QA_END_UTC)-Date.now();
    if(untilEnd>0 && untilEnd<=600000) setTimeout(()=>{
      for(const k of slots){ clearSecretFields(k); record[k].boundUid=null; }
      renderLocked();
    },untilEnd);
  }
  window.addEventListener('pagehide',()=>{
    for(const k of slots) {const pass=node('qa54bPassword'+k);if(pass)pass.value='';record[k].token='';}
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();