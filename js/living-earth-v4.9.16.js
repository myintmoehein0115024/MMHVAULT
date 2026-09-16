// MMHVAULT v4.9.16 — lightweight interaction only; no WebGL, no fetch.
(() => {
  const host = document.querySelector('.mmh-home-earth-v4-9-16');
  if (!host) return;
  const sphere = host.querySelector('.mmh-home-earth-sphere');
  if (!sphere || !window.matchMedia) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  let tx=0, ty=0, cx=0, cy=0;
  function tick(){
    cx += (tx-cx)*0.06; cy += (ty-cy)*0.06;
    sphere.style.transform = `translate(-50%,-50%) rotateX(${cy*2}deg) rotateY(${cx*2.5}deg)`;
    requestAnimationFrame(tick);
  }
  host.addEventListener('pointermove',(e)=>{
    const r=host.getBoundingClientRect();
    tx=Math.max(-1,Math.min(1,((e.clientX-r.left)/r.width-.5)*2));
    ty=Math.max(-1,Math.min(1,((e.clientY-r.top)/r.height-.5)*2));
  },{passive:true});
  host.addEventListener('pointerleave',()=>{tx=0;ty=0},{passive:true});
  tick();
})();
