/* Public Landing subpages only: language and navigation presentation.
 * No auth, cookies, credential submission, redirection, or financial data. */
(() => {
  'use strict';
  const locales = new Set(['en','zh','my']);
  const storageKey='mmhvault.landing.language';
  const trigger=document.querySelector('#public-locale-trigger');
  const menu=document.querySelector('#public-locale-menu');
  const flag=document.querySelector('.public-locale-flag');
  const name=document.querySelector('.public-locale-name');
  const display={
    en:{name:'English',flag:'🇬🇧'},
    zh:{name:'中文',flag:'🇨🇳'},
    my:{name:'မြန်မာ',flag:'🇲🇲'}
  };
  let locale='en';
  try {
    const stored=window.localStorage.getItem(storageKey);
    if(locales.has(stored))locale=stored;
  }catch(_){ /* Cookie/storage disabled: English works without it. */ }

  function closeMenu(restoreFocus=false){
    if(!menu||!trigger)return;
    const wasOpen=!menu.hidden;
    menu.hidden=true;
    trigger.setAttribute('aria-expanded','false');
    if(restoreFocus&&wasOpen)trigger.focus();
  }
  function changeLanguage(code){
    if(!locales.has(code))return;
    locale=code;
    document.documentElement.lang=code==='zh'?'zh-CN':code;
    document.querySelectorAll('[data-en][data-zh][data-my]').forEach(el=>{
      el.textContent=el.getAttribute('data-'+code)||el.getAttribute('data-en')||'';
    });
    document.querySelectorAll('[data-lang]').forEach(btn=>{
      btn.setAttribute('aria-pressed',String(btn.getAttribute('data-lang')===code));
    });
    if(flag)flag.textContent=display[code].flag;
    if(name)name.textContent=display[code].name;
    try{window.localStorage.setItem(storageKey,code)}catch(_){}
  }
  document.querySelectorAll('[data-lang]').forEach(btn=>{
    btn.addEventListener('click',()=>{changeLanguage(btn.getAttribute('data-lang'));closeMenu();});
  });
  if(trigger&&menu){
    trigger.addEventListener('click',()=>{
      const open=menu.hidden;
      menu.hidden=!open;
      trigger.setAttribute('aria-expanded',String(open));
    });
    document.addEventListener('pointerdown',event=>{
      if(!event.target.closest('.public-locale-picker'))closeMenu();
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape')closeMenu(true);
    });
  }
  // Compact public navigation: native <details> preserves keyboard access,
  // while outside click and Escape make its popover feel like the Landing menu.
  const navDetails=document.querySelector('.public-nav-details');
  if(navDetails){
    document.addEventListener('pointerdown',event=>{
      if(navDetails.open&&!navDetails.contains(event.target))navDetails.open=false;
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&navDetails.open){
        navDetails.open=false;
        const summary=navDetails.querySelector('summary');
        if(summary)summary.focus();
      }
    });
    navDetails.querySelectorAll('a').forEach(anchor=>{
      anchor.addEventListener('click',()=>{navDetails.open=false;});
    });
  }
  changeLanguage(locale);
})();
