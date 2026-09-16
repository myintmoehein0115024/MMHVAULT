/* MMHVAULT v4.8.5 — hybrid cinematic interaction */
(function(){
  'use strict';
  const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine=window.matchMedia&&window.matchMedia('(pointer:fine)').matches;
  const page=document.querySelector('.future-page');
  if(!page) return;
  if(fine&&!reduced){
    const hero=page.querySelector('.future-hero');
    const orbit=hero&&hero.querySelector('.future-orbit');
    if(hero&&orbit){
      let raf=0,tx=0,ty=0,cx=0,cy=0;
      hero.addEventListener('pointermove',e=>{
        const r=hero.getBoundingClientRect();
        tx=((e.clientX-r.left)/r.width-.5)*10;
        ty=((e.clientY-r.top)/r.height-.5)*7;
        if(!raf) raf=requestAnimationFrame(function loop(){
          cx+=(tx-cx)*.08; cy+=(ty-cy)*.08;
          orbit.style.translate=cx+'px '+cy+'px';
          raf=Math.abs(tx-cx)+Math.abs(ty-cy)>.02?requestAnimationFrame(loop):0;
        });
      });
      hero.addEventListener('pointerleave',()=>{tx=0;ty=0});
    }
  }
  // Add a one-time visual activation class without changing content or layout.
  requestAnimationFrame(()=>document.documentElement.classList.add('mmh-hybrid-ready'));
})();
