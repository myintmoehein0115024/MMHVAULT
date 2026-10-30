/* MMHVAULT N10-A7.56 — Username registration UI only.
 * Production server registration is deliberately NOT implemented or activated.
 * Never create fictitious email accounts, store plaintext credentials,
 * or treat Supabase user_metadata as a unique username claim.
 */
(()=>{
  'use strict';
  const REGISTER_ENABLED=false;
  const emailForm=document.getElementById('signup');
  const nameForm=document.getElementById('usernameSignUp');
  const status=document.getElementById('mmhA756Status');
  const button=document.getElementById('mmhA756Submit');
  if(!emailForm||!nameForm||!status||!button)return;
  const name=document.getElementById('mmhA756Name');
  const password=document.getElementById('mmhA756Password');
  const confirm=document.getElementById('mmhA756Confirm');
  const isZh=()=>window.getMMHVAULTLanguage?.()==='zh';
  function closedMessage(){
    return isZh()?'用户名独立注册尚未开放，目前可使用邮箱注册。':
      'Username-only registration is not available yet. Email registration remains available.';
  }
  function paint(){
    // This is a presentation switch only; no registration request is possible.
    button.disabled=true;
    status.textContent=closedMessage();
    const current=nameForm.classList.contains('active')?'username':'email';
    document.querySelectorAll('[data-mmh-a756-signup-method]').forEach(el=>{
      const selected=el.dataset.mmhA756SignupMethod===current;
      el.setAttribute('aria-pressed',String(selected));
      el.textContent=el.dataset.mmhA756SignupMethod==='username'?(isZh()?'用户名':'Username'):(isZh()?'邮箱':'Email');
    });
  }
  function select(method){
    if(document.getElementById('recovery')?.classList.contains('active'))return;
    const username=method==='username';
    emailForm.classList.toggle('active',!username);
    nameForm.classList.toggle('active',username);
    document.querySelectorAll('#authTabs .tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.target==='signup'));
    if(!username){password.value='';confirm.value='';}
    window.applyMMHVAULTLanguage?.();
    paint();
  }
  document.querySelectorAll('[data-mmh-a756-signup-method]').forEach(b=>{
    b.addEventListener('click',()=>select(b.dataset.mmhA756SignupMethod));
  });
  document.querySelectorAll('.mmh-lang-switcher [data-lang]').forEach(b=>b.addEventListener('click',paint));
  nameForm.addEventListener('submit',event=>{
    event.preventDefault();
    // Fail closed even if a browser extension manually enables the button.
    password.value='';confirm.value='';
    button.disabled=true;
    status.textContent=closedMessage();
  });
  window.addEventListener('pagehide',()=>{password.value='';confirm.value='';});
  if(REGISTER_ENABLED!==false)throw Error('Username registration is not available in this release');
  // The existing Sign Up top tab and data-switch buttons use openForm() in
  // the main login script. Keep this view in sync without overriding those.
  document.querySelectorAll('[data-switch],[data-target]').forEach(b=>b.addEventListener('click',paint));
  paint();
})();