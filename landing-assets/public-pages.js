/* L1.16 — Public-only translations and exact Landing-header interactions.
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

  // L1.29: mirror the Landing menu action label across every public page.
  const navToggleLabels={
    en:{open:'Open navigation menu',close:'Close navigation menu'},
    zh:{open:'打开导航菜单',close:'关闭导航菜单'},
    my:{open:'လမ်းညွှန်မီနူး ဖွင့်ရန်',close:'လမ်းညွှန်မီနူး ပိတ်ရန်'}
  };
  function syncNavToggleLabel(){
    if(toggle)toggle.setAttribute('aria-label',
      header?.classList.contains('menu-open')?navToggleLabels[locale].close:navToggleLabels[locale].open);
  }

  function closeExplore(restoreFocus=false){
    if(!explore?.open)return;
    const focusedInside=explore.contains(document.activeElement)&&
      document.activeElement!==exploreSummary;
    explore.open=false;
    if((restoreFocus||focusedInside)&&exploreSummary)exploreSummary.focus({preventScroll:true});
  }
  function closeNav(restoreFocus=false){
    if(!header||!toggle)return;
    const wasOpen=header.classList.contains('menu-open');
    const focusedInside=!!nav&&nav.contains(document.activeElement);
    header.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded','false');
    syncNavToggleLabel();
    closeExplore();
    if((restoreFocus&&wasOpen)||
      (focusedInside&&nav&&getComputedStyle(nav).display==='none'))toggle.focus({preventScroll:true});
  }
  function closeLanguage(restoreFocus=false){
    if(!menu||!trigger)return;
    const wasOpen=!menu.hidden;
    const focusedInside=menu.contains(document.activeElement);
    menu.hidden=true;
    trigger.setAttribute('aria-expanded','false');
    if((restoreFocus&&wasOpen)||focusedInside)trigger.focus({preventScroll:true});
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
    syncNavToggleLabel();
    if(nav)nav.setAttribute('aria-label',
      code==='zh'?'主导航':code==='my'?'အဓိကလမ်းညွှန်':'Primary navigation');
    try{window.localStorage.setItem(storageKey,code)}catch(_){}
  }

  document.querySelectorAll('[data-lang]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      changeLanguage(btn.dataset.lang);
      closeLanguage();
      trigger?.focus({preventScroll:true});
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
      active?.focus({preventScroll:true});
    }
  });
  trigger?.addEventListener('keydown',event=>{
    if(event.key!=='ArrowDown')return;
    event.preventDefault();
    if(menu.hidden)trigger.click();
    else menu.querySelector('button')?.focus({preventScroll:true});
  });
  menu?.addEventListener('keydown',event=>{
    if(event.key!=='ArrowDown'&&event.key!=='ArrowUp')return;
    event.preventDefault();
    const buttons=[...menu.querySelectorAll('button[data-lang]')];
    const current=buttons.indexOf(document.activeElement);
    const next=(current+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
    buttons[next]?.focus({preventScroll:true});
  });
  if(header&&nav&&toggle&&explore){
    toggle.addEventListener('click',event=>{
      closeExplore();
      closeLanguage();
      const open=header.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded',String(open));
      syncNavToggleLabel();
      // L1.61: keyboard-opened responsive menu starts at its first link.
      // Leave pointer and touch activation unchanged.
      if(open && event.detail===0)
        nav.querySelector('a')?.focus({preventScroll:true});
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
    // L1.22: dismiss one header layer per Escape, keeping focus visible.
    document.addEventListener('keydown',event=>{
      if(event.key!=='Escape')return;
      if(!menu.hidden){
        closeLanguage(true);
        event.preventDefault();
        return;
      }
      if(explore.open){
        closeExplore(true);
        event.preventDefault();
        return;
      }
      if(header.classList.contains('menu-open')){
        closeNav(true);
        event.preventDefault();
      }
    });
    const media=window.matchMedia('(min-width: 1361px)');
    media.addEventListener?.('change',event=>{
      if(event.matches)closeNav();
    });
  }
  changeLanguage(locale);

  // L1.37: synchronize the same public language preference across open tabs.
  // Keep document routes, menu focus, credentials and App state untouched.
  window.addEventListener('storage', event => {
    const next = event.newValue;
    if (event.key !== storageKey || !locales.has(next) || next === locale) return;
    changeLanguage(next);
    closeLanguage();
  });

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
      // L1.58: rotate.
      const mq=matchMedia('(max-width:620px)');
      let io;
      function bind(){
        io?.disconnect();
        const mobileReveal=mq.matches;
        const o=new IntersectionObserver(es=>{
          for(const e of es)if(e.isIntersecting){
            e.target.classList.add('mm-public-shown');
            o.unobserve(e.target);
          }
        },{threshold:.045,rootMargin:mobileReveal?'0px 0px 12% 0px':'0px 0px -4% 0px'});
        io=o;
        for(const e of targets)if(!e.classList.contains('mm-public-shown'))o.observe(e);
      }
      bind();
      mq.addEventListener?mq.addEventListener('change',bind):mq.addListener?.(bind);
      // L1.60: settle pending reveals.
      const reduced=matchMedia('(prefers-reduced-motion: reduce)');
      const settle=()=>{
        if(!reduced.matches)return;
        io.disconnect();
        for(const el of targets)el.classList.add('mm-public-shown');
      };
      reduced.addEventListener?reduced.addEventListener('change',settle):reduced.addListener?.(settle);
    }
  }
})();
