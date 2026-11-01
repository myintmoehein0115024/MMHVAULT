/* MMHVAULT L1.32 — Liquid Flow, presentation-only progressive enhancement.
   Does not fetch data, access localStorage, modify auth, use pinch gestures,
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

  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(!entry.isIntersecting)continue;
      entry.target.classList.add('mm-shown');
      observer.unobserve(entry.target);
    }
  },{rootMargin:'0px 0px -6% 0px',threshold:0.065});
  elements.filter(el=>!el.classList.contains('mm-shown')).forEach(el=>observer.observe(el));

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
  const play=(node,delay=0,travel=10,duration=460)=>{
    if(!permitted() || typeof node.animate!=='function')return;
    const old=activeAnimations.get(node);
    if(old)old.cancel();
    const animation=node.animate([
      {opacity:.32,transform:'translate3d(0,'+travel+'px,0)'},
      {opacity:1,transform:'translate3d(0,0,0)'}
    ],{duration,delay,easing:'cubic-bezier(.19,.77,.22,1)',fill:'none'});
    activeAnimations.set(node,animation);
  };
  const productStage=document.querySelector('.features-explorer .product-stage');
  if(productStage){
    const watch=new MutationObserver(records=>{
      if(!permitted())return;
      if(!records.some(r=>r.oldValue!==productStage.dataset.productCurrent)){
        return;
      }
      const panel=productStage.querySelector('[data-product-panel]:not([hidden])');
      if(!panel)return;
      const parts=[...panel.querySelectorAll('.app-page-heading,.app-metric-grid,.app-mock-card')].slice(0,7);
      if(parts.length){
        parts.forEach((part,i)=>play(part,Math.min(i*56,220),10,450));
      } else play(panel,0,10,450);
      const story=document.querySelector('.features-explorer .app-story');
      if(story)play(story,75,7,400);
    });
    watch.observe(productStage,{attributes:true,attributeFilter:['data-product-current'],attributeOldValue:true});
  }

  const businessStage=document.querySelector('#business .business-stage');
  if(businessStage){
    const watch=new MutationObserver(records=>{
      if(!permitted())return;
      if(!records.some(r=>r.oldValue!==businessStage.dataset.currentView))return;
      const nodes=[...businessStage.querySelectorAll('.business-mode-context,.business-ui-heading,.business-ui .business-metric,.business-ui .business-stat')].slice(0,6);
      if(nodes.length)nodes.forEach((n,i)=>play(n,Math.min(i*45,155),8,420));
      else play(businessStage,0,6,380);
    });
    watch.observe(businessStage,{attributes:true,attributeFilter:['data-current-view'],attributeOldValue:true});
  }
})();
