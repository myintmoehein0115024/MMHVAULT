(()=>{
 const root=document.querySelector('.feature-architecture-v64'); if(!root) return;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(reduce) return;
 let tx=0,ty=0,rx=0,ry=0;
 addEventListener('pointermove',e=>{
   const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;
   tx=x*16;ty=y*12;rx=y*-2.5;ry=x*3;
   root.style.setProperty('--mmh-vx',tx.toFixed(2)+'px');root.style.setProperty('--mmh-vy',ty.toFixed(2)+'px');
   root.style.setProperty('--mmh-rx',rx.toFixed(2)+'deg');root.style.setProperty('--mmh-ry',ry.toFixed(2)+'deg');
 });
 const cards=[...root.querySelectorAll('.arch-node')];
 cards.forEach((c,i)=>{c.addEventListener('pointerenter',()=>root.dataset.focus=i);c.addEventListener('pointerleave',()=>delete root.dataset.focus)});
 let raf=0; const tick=()=>{raf=requestAnimationFrame(tick);root.style.transform=`translate3d(var(--mmh-vx,0px),var(--mmh-vy,0px),0) translateY(-50%) rotateX(var(--mmh-rx,0deg)) rotateY(var(--mmh-ry,0deg))`};
 // keep the base vertical centering from the existing page visual
 root.style.setProperty('--mmh-vx','0px');root.style.setProperty('--mmh-vy','0px');tick();
 const obs=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting){cancelAnimationFrame(raf)}else{cancelAnimationFrame(raf);tick()}}),{threshold:.05});obs.observe(root);
})();