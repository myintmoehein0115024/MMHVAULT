/* MMHVAULT v6.0 — page-specific 3D interaction system. Presentation only. */
(() => {
  if (window.__mmhVaultV60) return;
  window.__mmhVaultV60 = true;
  const page = document.querySelector('.future-page');
  if (!page) return;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;

  const clamp = (n,a,b) => Math.min(b, Math.max(a,n));
  const set = (name,val) => page.style.setProperty(name,val);

  // Safe home composition: only move visual layers, never replace data nodes.
  if (page.classList.contains('future-home')) {
    const hero = page.querySelector('.future-hero');
    const earth = page.querySelector('.mmh-home-earth-v4-9-17');
    if (!reduced && !coarse && hero && earth) {
      let tx=0,ty=0,x=0,y=0,raf=0;
      const move=e=>{
        const r=hero.getBoundingClientRect();
        tx=clamp((e.clientX-r.left)/Math.max(1,r.width)*2-1,-1,1);
        ty=clamp((e.clientY-r.top)/Math.max(1,r.height)*2-1,-1,1);
        if(!raf)raf=requestAnimationFrame(render);
      };
      const leave=()=>{tx=0;ty=0;if(!raf)raf=requestAnimationFrame(render)};
      const render=()=>{
        raf=0;x+=(tx-x)*.1;y+=(ty-y)*.1;
        set('--mmh-home-earth-x',(x*7).toFixed(2)+'px');
        set('--mmh-home-earth-y',(y*5).toFixed(2)+'px');
        set('--mmh-home-earth-rx',(-y*1.8).toFixed(2)+'deg');
        set('--mmh-home-earth-ry',(x*2.8).toFixed(2)+'deg');
        set('--mmh-home-copy-x',(x*-2.2).toFixed(2)+'px');
        set('--mmh-home-copy-y',(y*-1.4).toFixed(2)+'px');
        if(Math.abs(x-tx)>.003||Math.abs(y-ty)>.003)raf=requestAnimationFrame(render);
      };
      hero.addEventListener('pointermove',move,{passive:true});
      hero.addEventListener('pointerleave',leave,{passive:true});
    }
  }

  // Page-wide cursor depth for the secondary marketing pages.
  if (!reduced && !coarse && !page.classList.contains('future-home')) {
    const hero=page.querySelector('.future-hero');
    if(hero){
      let tx=0,ty=0,x=0,y=0,raf=0;
      const move=e=>{
        const r=hero.getBoundingClientRect();
        tx=clamp((e.clientX-r.left)/Math.max(1,r.width)*2-1,-1,1);
        ty=clamp((e.clientY-r.top)/Math.max(1,r.height)*2-1,-1,1);
        if(!raf)raf=requestAnimationFrame(render);
      };
      const leave=()=>{tx=ty=0;if(!raf)raf=requestAnimationFrame(render)};
      const render=()=>{
        raf=0;x+=(tx-x)*.12;y+=(ty-y)*.12;
        set('--mmh-page-x',(x*6).toFixed(2)+'px');
        set('--mmh-page-y',(y*4).toFixed(2)+'px');
        set('--mmh-page-rx',(-y*1.35).toFixed(2)+'deg');
        set('--mmh-page-ry',(x*2.1).toFixed(2)+'deg');
        if(Math.abs(x-tx)>.003||Math.abs(y-ty)>.003)raf=requestAnimationFrame(render);
      };
      hero.addEventListener('pointermove',move,{passive:true});
      hero.addEventListener('pointerleave',leave,{passive:true});
    }
  }

  if (!reduced && !coarse && page.classList.contains('future-features')) {
    const map=page.querySelector('.network-map');
    if(map){
      map.addEventListener('pointermove',e=>{
        const r=map.getBoundingClientRect();
        const x=clamp((e.clientX-r.left)/Math.max(1,r.width)*2-1,-1,1);
        const y=clamp((e.clientY-r.top)/Math.max(1,r.height)*2-1,-1,1);
        set('--mmh-net-rx',(-y*2.2).toFixed(2)+'deg');set('--mmh-net-ry',(x*3.4).toFixed(2)+'deg');
      },{passive:true});
      map.addEventListener('pointerleave',()=>{set('--mmh-net-rx','0deg');set('--mmh-net-ry','0deg')},{passive:true});
    }
  }
  if (!reduced && !coarse && page.classList.contains('future-experience')) {
    const loop=page.querySelector('.loop-system');
    if(loop){
      loop.addEventListener('pointermove',e=>{
        const r=loop.getBoundingClientRect();
        const x=clamp((e.clientX-r.left)/Math.max(1,r.width)*2-1,-1,1);
        const y=clamp((e.clientY-r.top)/Math.max(1,r.height)*2-1,-1,1);
        set('--mmh-loop-rx',(-y*2.1).toFixed(2)+'deg');set('--mmh-loop-ry',(x*3).toFixed(2)+'deg');
      },{passive:true});
      loop.addEventListener('pointerleave',()=>{set('--mmh-loop-rx','0deg');set('--mmh-loop-ry','0deg')},{passive:true});
    }
  }
  if (!reduced && !coarse && page.classList.contains('future-about')) {
    const rail=page.querySelector('.about-rail');
    if(rail){
      rail.addEventListener('pointermove',e=>{
        const r=rail.getBoundingClientRect();
        const x=clamp((e.clientX-r.left)/Math.max(1,r.width)*2-1,-1,1);
        const y=clamp((e.clientY-r.top)/Math.max(1,r.height)*2-1,-1,1);
        set('--mmh-about-rx',(-y*1.6).toFixed(2)+'deg');set('--mmh-about-ry',(x*2.4).toFixed(2)+'deg');
      },{passive:true});
      rail.addEventListener('pointerleave',()=>{set('--mmh-about-rx','0deg');set('--mmh-about-ry','0deg')},{passive:true});
    }
  }

  // Scroll reveal: lightweight IntersectionObserver, no content changes.
  if ('IntersectionObserver' in window) {
    const targets=[...page.querySelectorAll('.future-section,.future-footer-cta,.signature-shell')];
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting) { entry.target.classList.add('mmh-visible'); io.unobserve(entry.target); }
    }),{threshold:.12,rootMargin:'0px 0px -7% 0px'});
    targets.forEach(el=>io.observe(el));
  } else {
    page.querySelectorAll('.future-section,.future-footer-cta,.signature-shell').forEach(el=>el.classList.add('mmh-visible'));
  }
})();
