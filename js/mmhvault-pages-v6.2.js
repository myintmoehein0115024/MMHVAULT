/* MMHVAULT v6.2 — secondary page interaction layer; presentation only. */
(()=>{
  if(window.__mmhVaultV62)return; window.__mmhVaultV62=true;
  const page=document.querySelector('.future-page'); if(!page)return;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const coarse=window.matchMedia?.('(pointer: coarse)').matches;
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  if(!reduced&&!coarse){
    const hero=page.querySelector('.future-hero');
    if(hero){let tx=0,ty=0,x=0,y=0,raf=0;
      const draw=()=>{raf=0;x+=(tx-x)*.08;y+=(ty-y)*.08;page.style.setProperty('--mmh62-mx',(x*7).toFixed(2)+'px');page.style.setProperty('--mmh62-my',(y*5).toFixed(2)+'px');if(Math.abs(x-tx)>.002||Math.abs(y-ty)>.002)raf=requestAnimationFrame(draw)};
      hero.addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect();tx=clamp((e.clientX-r.left)/Math.max(1,r.width)*2-1,-1,1);ty=clamp((e.clientY-r.top)/Math.max(1,r.height)*2-1,-1,1);if(!raf)raf=requestAnimationFrame(draw)},{passive:true});
      hero.addEventListener('pointerleave',()=>{tx=ty=0;if(!raf)raf=requestAnimationFrame(draw)},{passive:true});
    }
    if(page.classList.contains('future-security')){
      page.querySelectorAll('.future-trust-item').forEach((el,i)=>el.style.setProperty('--mmh62-delay',(i*90)+'ms'));
    }
  }
  if('IntersectionObserver' in window){
    const targets=page.querySelectorAll('.future-section,.signature-shell');
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('mmh62-in');io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -8% 0px'});
    targets.forEach(el=>io.observe(el));
  }
})();

/* v6.3 hero-stage pointer depth: same spatial logic as Home, presentation only. */
(()=>{
  const page=document.querySelector('.future-page'); const visual=page?.querySelector('.mmh-page-visual');
  if(!page||!visual||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||window.matchMedia?.('(pointer: coarse)').matches)return;
  let tx=0,ty=0,x=0,y=0,raf=0;
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const draw=()=>{raf=0;x+=(tx-x)*.09;y+=(ty-y)*.09;page.style.setProperty('--mmh-page-vx',(x*10).toFixed(2)+'px');page.style.setProperty('--mmh-page-vy',(y*7).toFixed(2)+'px');page.style.setProperty('--mmh-page-rx',(y*-2.2).toFixed(2)+'deg');page.style.setProperty('--mmh-page-ry',(x*2.8).toFixed(2)+'deg');if(Math.abs(x-tx)>.002||Math.abs(y-ty)>.002)raf=requestAnimationFrame(draw)};
  visual.addEventListener('pointermove',e=>{const r=visual.getBoundingClientRect();tx=clamp((e.clientX-r.left)/Math.max(1,r.width)*2-1,-1,1);ty=clamp((e.clientY-r.top)/Math.max(1,r.height)*2-1,-1,1);if(!raf)raf=requestAnimationFrame(draw)},{passive:true});
  visual.addEventListener('pointerleave',()=>{tx=ty=0;if(!raf)raf=requestAnimationFrame(draw)},{passive:true});
})();
