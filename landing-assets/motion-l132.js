/* MMHVAULT L1.32 — Liquid Flow, presentation-only progressive enhancement.
   Does not make network requests, read persistent storage, alter auth, or use pinch gestures,
   or change links and account behavior. Works with original Landing JS. */
(() => {
  'use strict';
  const root=document.documentElement;
  if(!document.body || !document.body.classList.contains('l131'))return;
  const motionPreference=window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)') : {matches:false};
  const permitted=() => !motionPreference.matches;
  if(!permitted() || !('IntersectionObserver' in window))return;

  const revealGroups=[
    {selector:'.showcase-section-header',step:0},
    {selector:'.showcase-grid > .showcase-card',step:85,limit:4},
    {selector:'.statement-band .statement-inner',step:0},
    {selector:'.features-explorer > .section-heading',step:0},
    {selector:'.features-explorer .product-picker, .features-explorer .product-stage, .features-explorer .app-story',step:85,limit:2},
    {selector:'#business .business-intro, #business .business-visual-strip, #business .business-stage',step:95,limit:2},
    {selector:'#about .why-intro',step:0},
    {selector:'#about .about-benefit-card',step:75,limit:3},
    {selector:'#security .security-panel',step:0},
    {selector:'.closing-section .closing-premium-panel',step:0},
    {selector:'.site-footer .footer-main',step:0}
  ];
  const elements=[];
  const seen=new Set();
  for(const group of revealGroups){
    const found=[...document.querySelectorAll(group.selector)];
    found.forEach((el,i)=>{
      if(seen.has(el) || el.hidden || el.closest('[hidden]'))return;
      seen.add(el);
      el.classList.add('mm-reveal');
      const delay=group.step*Math.min(i,group.limit||0);
      el.style.setProperty('--mm-delay',delay+'ms');
      elements.push(el);
    });
  }
  if(!elements.length)return;

  // Never hide visible first-screen content. No-JS / reduced-motion users see all.
  const vh=window.innerHeight||750;
  elements.forEach(el=>{
    const r=el.getBoundingClientRect();
    if(r.top < vh*.92 && r.bottom > 0)el.classList.add('mm-shown');
  });
  root.classList.add('mm-motion-active');

  // L1.57: recalculate phone-first reveal margins after orientation changes.
  // Keep already revealed sections visible; no scroll interception or repaint.
  const mobileRevealQuery=window.matchMedia
    ? window.matchMedia('(max-width: 620px)') : {matches:false};
  let observer;
  const bindRevealObserver=()=>{
    if(observer)observer.disconnect();
    const mobileReveal=mobileRevealQuery.matches;
    const nextObserver=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        entry.target.classList.add('mm-shown');
        nextObserver.unobserve(entry.target);
      }
    },{rootMargin:mobileReveal?'0px 0px 24% 0px':'0px 0px -6% 0px',threshold:mobileReveal?0:0.065});
    observer=nextObserver;
    elements.filter(el=>!el.classList.contains('mm-shown')).forEach(el=>observer.observe(el));
  };
  bindRevealObserver();
  if(typeof mobileRevealQuery.addEventListener==='function')
    mobileRevealQuery.addEventListener('change',bindRevealObserver);
  else if(typeof mobileRevealQuery.addListener==='function')
    mobileRevealQuery.addListener(bindRevealObserver);

  // Clicking a guide or an in-page navigation link must reveal the destination,
  // even if the user jumps directly to a hash without a normal scroll.
  const showNearby=()=>{
    const h=window.location.hash;
    if(!h || h.length>80)return;
    let target;
    try{target=document.getElementById(decodeURIComponent(h.slice(1)))}catch(_){return;}
    if(!target)return;
    const section=target.closest('section')||target;
    for(const el of elements){
      if(el===section || section.contains(el)){
        const r=el.getBoundingClientRect();
        if(r.top<window.innerHeight*1.22 && r.bottom>=-90){
          el.classList.add('mm-shown');
          observer.unobserve(el);
        }
      }
    }
  };
  window.addEventListener('hashchange',()=>requestAnimationFrame(showNearby),{passive:true});
  if(window.location.hash)requestAnimationFrame(showNearby);

  // Tab contents remain normal HTML; the existing product and business
  // interactions control their state. Animate only their newly visible content.
  const activeAnimations=new WeakMap();
  // L1.56: stop only Business concept WAAPI motion on tab hiding or
  // live reduced-motion changes, leaving presentation and data intact.
  const runningBusinessAnimations=new Set();
  const cancelInterruptedBusinessMotion=()=>{
    if(permitted() && !document.hidden)return;
    for(const animation of runningBusinessAnimations)animation.cancel();
    runningBusinessAnimations.clear();
  };
  if(typeof motionPreference.addEventListener==='function')
    motionPreference.addEventListener('change',cancelInterruptedBusinessMotion);
  else if(typeof motionPreference.addListener==='function')
    motionPreference.addListener(cancelInterruptedBusinessMotion);
  document.addEventListener('visibilitychange',cancelInterruptedBusinessMotion);
  const play=(node,delay=0,travel=10,duration=460)=>{
    if(!permitted() || document.hidden || typeof node.animate!=='function')return;
    const old=activeAnimations.get(node);
    if(old)old.cancel();
    const animation=node.animate([
      {opacity:.32,transform:'translate3d(0,'+travel+'px,0)'},
      {opacity:1,transform:'translate3d(0,0,0)'}
    ],{duration,delay,easing:'cubic-bezier(.19,.77,.22,1)',fill:'none'});
    activeAnimations.set(node,animation);
    runningBusinessAnimations.add(animation);
    const forget=()=>runningBusinessAnimations.delete(animation);
    animation.addEventListener('finish',forget,{once:true});
    animation.addEventListener('cancel',forget,{once:true});
  };
  // L1.21: data-product-current now drives the single coordinated crossfade
  // in landing.js and premium-l131.css. The former per-card staggered opacity
  // animation made dashboard figures flash after each feature selection.
  // Business concept transitions below remain unchanged.

  const businessStage=document.querySelector('#business .business-stage');
  if(businessStage){
    const watch=new MutationObserver(records=>{
      if(!permitted() || document.hidden)return;
      if(!records.some(r=>r.oldValue!==businessStage.dataset.currentView))return;
      const nodes=[...businessStage.querySelectorAll('.business-mode-context,.business-ui-heading,.business-ui .business-metric,.business-ui .business-stat')].slice(0,6);
      if(nodes.length)nodes.forEach((n,i)=>play(n,Math.min(i*45,155),8,420));
      else play(businessStage,0,6,380);
    });
    watch.observe(businessStage,{attributes:true,attributeFilter:['data-current-view'],attributeOldValue:true});
  }
})();
