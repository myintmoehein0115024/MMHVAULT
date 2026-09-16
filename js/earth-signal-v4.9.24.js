// MMHVAULT v4.9.24 — dynamic color signal layer around the living Earth.
(() => {
  const root = document.querySelector('.future-home .earth-signal-layer');
  if (!root) return;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const vals = {
    flow: root.querySelector('[data-sig-value="flow"]'),
    digital: root.querySelector('[data-sig-value="digital"]'),
    reserve: root.querySelector('[data-sig-value="reserve"]')
  };
  if (reduced) return;
  const start = performance.now();
  function loop(now){
    const t=(now-start)/1000;
    if(vals.flow) vals.flow.textContent=(68.4+Math.sin(t*.42)*2.1).toFixed(1);
    if(vals.digital) vals.digital.textContent=(4.8+Math.sin(t*.75+.8)*1.2).toFixed(1)+'%';
    if(vals.reserve) vals.reserve.textContent=(1.9+Math.cos(t*.58+1.2)*.7).toFixed(1)+'%';
    root.style.transform=`translate3d(${Math.sin(t*.26)*1.1}px,${Math.cos(t*.22)*.7}px,0)`;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
