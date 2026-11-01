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
  // L1.15 — public-page counterpart to the main Landing's six-item
  // navigation, Explore disclosure, and compact hamburger. Presentation only.
  const header=document.querySelector('.public-site-header');
  const nav=document.querySelector('#public-primary-nav');
  const toggle=document.querySelector('.public-site-menu-toggle');
  const explore=document.querySelector('#public-explore');
  const exploreSummary=explore?.querySelector('summary');
  function closeExplore(restoreFocus=false){
    if(!explore?.open)return;
    explore.open=false;
    if(restoreFocus&&exploreSummary)exploreSummary.focus();
  }
  function closeNav(restoreFocus=false){
    if(!header||!toggle)return;
    const open=header.classList.contains('menu-open');
    header.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded','false');
    closeExplore();
    if(restoreFocus&&open)toggle.focus();
  }
  if(header&&nav&&toggle&&explore){
    toggle.addEventListener('click',()=>{
      const open=!header.classList.contains('menu-open');
      closeExplore();
      closeMenu();
      header.classList.toggle('menu-open',open);
      toggle.setAttribute('aria-expanded',String(open));
    });
    nav.querySelectorAll('a').forEach(a=>{
      a.addEventListener('click',()=>{closeExplore();closeNav();});
    });
    explore.addEventListener('toggle',()=>{
      if(explore.open)closeMenu();
    });
    document.addEventListener('pointerdown',event=>{
      if(explore.open&&!explore.contains(event.target))closeExplore();
      if(header.classList.contains('menu-open')&&!header.contains(event.target))
        closeNav();
    });
    document.addEventListener('keydown',event=>{
      if(event.key!=='Escape')return;
      if(explore.open){closeExplore(true);return;}
      if(header.classList.contains('menu-open'))closeNav(true);
    });
    const media=window.matchMedia('(min-width: 1361px)');
    media.addEventListener?.('change',event=>{if(event.matches)closeNav();});
  }
  changeLanguage(locale);
})();
