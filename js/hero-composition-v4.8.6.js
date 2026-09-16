/* MMHVAULT v4.8.6 — Hero composition interaction */
(function(){
  'use strict';
  const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const fine=window.matchMedia?.('(pointer:fine)').matches;
  const hero=document.querySelector('.future-page .future-hero');
  const orbit=hero?.querySelector('.future-orbit');
  if(!hero||!orbit||reduce||!fine) return;
  let raf=0,px=0,py=0,cx=0,cy=0;
  hero.addEventListener('pointermove',e=>{
    const r=hero.getBoundingClientRect();
    px=((e.clientX-r.left)/r.width-.5)*12;
    py=((e.clientY-r.top)/r.height-.5)*8;
    if(raf) return;
    const tick=()=>{
      cx+=(px-cx)*.075; cy+=(py-cy)*.075;
      orbit.style.translate=`${cx}px ${cy}px`;
      if(Math.abs(px-cx)+Math.abs(py-cy)>.03) raf=requestAnimationFrame(tick); else raf=0;
    };
    raf=requestAnimationFrame(tick);
  });
  hero.addEventListener('pointerleave',()=>{px=0;py=0});
})();
