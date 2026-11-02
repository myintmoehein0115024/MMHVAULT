/* L1.16 — Public-only translations and exact Landing-header interactions.
 * Read-only presentation: no auth, fetch, history/URL rewrites or finance data.
 * Header markup and shared-header-l116.css are identical across public pages.
 */
(() => {
  'use strict';
  const locales=new Set(['en','zh','my']);
  const storageKey='mmhvault.landing.language';
  const header=document.querySelector('.site-header');
  const nav=document.querySelector('#primary-nav');
  const toggle=document.querySelector('.menu-toggle');
  const explore=document.querySelector('#landing-explore');
  const exploreSummary=explore?.querySelector('summary');
  const trigger=document.querySelector('#locale-trigger');
  const menu=document.querySelector('#locale-menu');
  const flag=document.querySelector('.locale-active-flag');
  const name=document.querySelector('.locale-active-name');
  const display={
    en:{name:'English',flag:'🇬🇧'},
    zh:{name:'中文',flag:'🇨🇳'},
    my:{name:'မြန်မာ',flag:'🇲🇲'}
  };
  let locale='en';
  try{
    const saved=window.localStorage.getItem(storageKey);
    if(locales.has(saved))locale=saved;
  }catch(_){/* Browser privacy mode: English is the fallback. */}

  function closeExplore(restoreFocus=false){
    if(!explore?.open)return;
    explore.open=false;
    if(restoreFocus&&exploreSummary)exploreSummary.focus();
  }
  function closeNav(restoreFocus=false){
    if(!header||!toggle)return;
    const wasOpen=header.classList.contains('menu-open');
    header.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded','false');
    closeExplore();
    if(restoreFocus&&wasOpen)toggle.focus();
  }
  function closeLanguage(restoreFocus=false){
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
    if(toggle)toggle.setAttribute('aria-label',
      code==='zh'?'打开导航菜单':code==='my'?'လမ်းညွှန်မီနူး ဖွင့်ရန်':'Open navigation menu');
    if(nav)nav.setAttribute('aria-label',
      code==='zh'?'主导航':code==='my'?'အဓိကလမ်းညွှန်':'Primary navigation');
    try{window.localStorage.setItem(storageKey,code)}catch(_){}
  }

  document.querySelectorAll('[data-lang]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      changeLanguage(btn.dataset.lang);
      closeLanguage();
      trigger?.focus();
    });
  });
  trigger?.addEventListener('click',()=>{
    const opening=!!menu?.hidden;
    closeNav();
    closeExplore();
    if(!menu)return;
    menu.hidden=!opening;
    trigger.setAttribute('aria-expanded',String(opening));
    if(opening){
      const active=menu.querySelector('[aria-pressed="true"]');
      active?.focus();
    }
  });
  trigger?.addEventListener('keydown',event=>{
    if(event.key!=='ArrowDown')return;
    event.preventDefault();
    if(menu.hidden)trigger.click();
    else menu.querySelector('button')?.focus();
  });
  menu?.addEventListener('keydown',event=>{
    if(event.key!=='ArrowDown'&&event.key!=='ArrowUp')return;
    event.preventDefault();
    const buttons=[...menu.querySelectorAll('button[data-lang]')];
    const current=buttons.indexOf(document.activeElement);
    const next=(current+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
    buttons[next]?.focus();
  });
  if(header&&nav&&toggle&&explore){
    toggle.addEventListener('click',()=>{
      closeExplore();
      closeLanguage();
      const open=header.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded',String(open));
    });
    nav.querySelectorAll('a').forEach(link=>{
      link.addEventListener('click',()=>{
        closeExplore();
        closeNav();
        closeLanguage();
      });
    });
    explore.addEventListener('toggle',()=>{
      if(explore.open)closeLanguage();
    });
    document.addEventListener('pointerdown',event=>{
      if(explore.open&&!explore.contains(event.target))closeExplore();
      if(header.classList.contains('menu-open')&&!header.contains(event.target))closeNav();
      if(!event.target.closest('.locale-picker'))closeLanguage();
    });
    document.addEventListener('keydown',event=>{
      if(event.key!=='Escape')return;
      const hadExplore=!!explore.open;
      const hadLocale=!menu.hidden;
      closeExplore(hadExplore);
      closeNav(!hadExplore&&!hadLocale);
      closeLanguage(!hadExplore&&hadLocale);
    });
    const media=window.matchMedia('(min-width: 1361px)');
    media.addEventListener?.('change',event=>{
      if(event.matches)closeNav();
    });
  }
  changeLanguage(locale);

  // L1.18 — progressive, one-shot reveals for informational pages only.
  // Existing page content is visible by default. No fetch, credentials,
  // tracking, navigation interception or persistent animation state.
  const motionAllowed=window.matchMedia &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    'IntersectionObserver' in window &&
    document.body?.classList.contains('public-landing-page');
  if(motionAllowed){
    const targets=[
      ...document.querySelectorAll(
        '.public-landing-page .grid>.item,'+
        '.public-landing-page .detail,'+
        '.public-landing-page .bottom-cta,'+
        '.public-landing-page .policy-card,'+
        '.public-landing-page .public-footer-layout'
      )
    ].filter(el=>!el.hidden&&!el.closest('[hidden]'));
    if(targets.length){
      const vh=window.innerHeight||800;
      targets.forEach((el,index)=>{
        el.classList.add('mm-public-reveal');
        // Keep visible initial-screen content visible immediately.
        const rect=el.getBoundingClientRect();
        if(rect.top<vh*.95&&rect.bottom>0)el.classList.add('mm-public-shown');
        el.style.setProperty('--mm-public-delay',Math.min(index%3,2)*55+'ms');
      });
      document.body.classList.add('mm-public-motion');
      const observer=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{
          if(!entry.isIntersecting)return;
          entry.target.classList.add('mm-public-shown');
          observer.unobserve(entry.target);
        });
      },{threshold:.045,rootMargin:'0px 0px -4% 0px'});
      targets.filter(el=>!el.classList.contains('mm-public-shown'))
        .forEach(el=>observer.observe(el));
    }
  }
})();
