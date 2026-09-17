/* MMHVAULT v6.0.1 — corrected 3D interaction layer. Presentation only. */
(()=>{
  if(window.__mmhVaultV601)return; window.__mmhVaultV601=true;
  const page=document.querySelector('.future-page'); if(!page)return;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const coarse=window.matchMedia?.('(pointer: coarse)').matches;
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const set=(n,v)=>page.style.setProperty(n,v);
  const hero=page.querySelector('.future-hero');
  if(!reduced&&!coarse&&hero){
    let tx=0,ty=0,x=0,y=0,raf=0;
    const render=()=>{raf=0;x+=(tx-x)*.1;y+=(ty-y)*.1;
      if(page.classList.contains('future-home')){
        set('--mmh-home-earth-x',(x*6.5).toFixed(2)+'px');set('--mmh-home-earth-y',(y*4.5).toFixed(2)+'px');
        set('--mmh-home-earth-rx',(-y*1.7).toFixed(2)+'deg');set('--mmh-home-earth-ry',(x*2.6).toFixed(2)+'deg');
        set('--mmh-home-copy-x',(x*-1.6).toFixed(2)+'px');set('--mmh-home-copy-y',(y*-1).toFixed(2)+'px');
      }else{
        set('--mmh-page-x',(x*5.5).toFixed(2)+'px');set('--mmh-page-y',(y*3.5).toFixed(2)+'px');
        set('--mmh-page-rx',(-y*1.25).toFixed(2)+'deg');set('--mmh-page-ry',(x*1.9).toFixed(2)+'deg');
      }
      if(Math.abs(x-tx)>.003||Math.abs(y-ty)>.003)raf=requestAnimationFrame(render);
    };
    hero.addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect();tx=clamp((e.clientX-r.left)/Math.max(1,r.width)*2-1,-1,1);ty=clamp((e.clientY-r.top)/Math.max(1,r.height)*2-1,-1,1);if(!raf)raf=requestAnimationFrame(render)},{passive:true});
    hero.addEventListener('pointerleave',()=>{tx=ty=0;if(!raf)raf=requestAnimationFrame(render)},{passive:true});
  }
  if(!reduced&&!coarse&&page.classList.contains('future-features'))bindTilt('.network-map','--mmh-net-rx','--mmh-net-ry',2.1,3.2);
  if(!reduced&&!coarse&&page.classList.contains('future-experience'))bindTilt('.loop-system','--mmh-loop-rx','--mmh-loop-ry',2,2.8);
  if(!reduced&&!coarse&&page.classList.contains('future-about'))bindTilt('.about-rail','--mmh-about-rx','--mmh-about-ry',1.5,2.2);
  if(!reduced&&!coarse&&page.classList.contains('future-features'))page.querySelectorAll('.future-cell').forEach(card=>{
    card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();const x=clamp((e.clientX-r.left)/Math.max(1,r.width)*2-1,-1,1);const y=clamp((e.clientY-r.top)/Math.max(1,r.height)*2-1,-1,1);card.style.setProperty('--mmh-card-ry',(x*3.5).toFixed(2)+'deg');card.style.setProperty('--mmh-glow-x',((x+1)*50).toFixed(1)+'%');card.style.setProperty('--mmh-glow-y',((y+1)*50).toFixed(1)+'%')},{passive:true});
    card.addEventListener('pointerleave',()=>{card.style.setProperty('--mmh-card-ry','0deg')},{passive:true});
  });
  if('IntersectionObserver'in window){const targets=[...page.querySelectorAll('.future-section,.future-footer-cta,.signature-shell')];const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('mmh-visible');io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -7% 0px'});targets.forEach(el=>io.observe(el));}else page.querySelectorAll('.future-section,.future-footer-cta,.signature-shell').forEach(el=>el.classList.add('mmh-visible'));
  function bindTilt(sel,rx,ry,ax,ay){const el=page.querySelector(sel);if(!el)return;el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();const x=clamp((e.clientX-r.left)/Math.max(1,r.width)*2-1,-1,1);const y=clamp((e.clientY-r.top)/Math.max(1,r.height)*2-1,-1,1);set(rx,(-y*ax).toFixed(2)+'deg');set(ry,(x*ay).toFixed(2)+'deg')},{passive:true});el.addEventListener('pointerleave',()=>{set(rx,'0deg');set(ry,'0deg')},{passive:true})}
})();
