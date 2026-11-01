
/* Only presentation language. Never touches credentials or authentication. */
(() => {
  'use strict';
  const locales = new Set(['en','zh','my']);
  const key='mmhvault.landing.language';
  let locale='en';
  try { const saved=localStorage.getItem(key); if(locales.has(saved))locale=saved; } catch(_){}
  const change = code => {
    if(!locales.has(code))return;
    locale=code;
    document.documentElement.lang=code==='zh'?'zh-CN':code;
    document.querySelectorAll('[data-en][data-zh][data-my]').forEach(el=>{
      el.textContent=el.getAttribute('data-'+code)||el.getAttribute('data-en')||'';
    });
    document.querySelectorAll('[data-lang]').forEach(el=>{
      el.setAttribute('aria-pressed',String(el.getAttribute('data-lang')===code));
    });
    try{localStorage.setItem(key,code)}catch(_){}
  };
  document.querySelectorAll('[data-lang]').forEach(btn=>btn.addEventListener('click',()=>change(btn.getAttribute('data-lang'))));
  change(locale);
})();
