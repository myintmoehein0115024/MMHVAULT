/* MMHVAULT v4.9.1 — living globe controller */
(() => {
  const globe = document.querySelector('.mmh-dynamic-globe');
  if (!globe) return;
  const surface = globe.querySelector('.mmh-globe-surface');
  const core = globe.querySelector('.mmh-globe-core');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let start = performance.now();
  let raf = 0;
  let px = 0, py = 0;
  let tx = 0, ty = 0;

  function frame(now) {
    const elapsed = (now - start) / 1000;
    const spin = (elapsed * 5.5) % 360;
    tx += (px - tx) * 0.035;
    ty += (py - ty) * 0.035;
    if (!reduced) {
      // A slow Y rotation gives the Earth a living, dimensional turn.
      surface.style.transform = `rotateY(${spin + tx * 5}deg) rotateX(${ty * 2}deg)`;
      core.style.transform = `translate3d(0,${Math.sin(elapsed * .55) * 4}px,0)`;
    }
    raf = requestAnimationFrame(frame);
  }
  function pointerMove(e) {
    const r = globe.getBoundingClientRect();
    px = ((e.clientX - r.left) / r.width - .5) * 2;
    py = ((e.clientY - r.top) / r.height - .5) * 2;
  }
  function resetPointer(){ px = 0; py = 0; }
  globe.addEventListener('pointermove', pointerMove, {passive:true});
  globe.addEventListener('pointerleave', resetPointer, {passive:true});
  window.addEventListener('pagehide', () => cancelAnimationFrame(raf), {once:true});
  raf = requestAnimationFrame(frame);
})();
