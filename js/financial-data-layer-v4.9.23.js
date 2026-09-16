// MMHVAULT v4.9.23 — subtle data-layer motion only.
(() => {
  const layer = document.querySelector('.earth-data-layer');
  if (!layer) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const panels = [...layer.querySelectorAll('.earth-data-panel')];
  if (reduce) return;
  let t0 = performance.now();
  const tick = (now) => {
    const t = (now - t0) / 1000;
    panels.forEach((el, i) => {
      const x = Math.sin(t * 0.45 + i * 1.6) * 2.2;
      const y = Math.cos(t * 0.36 + i * 1.1) * 1.6;
      el.style.transform = `translate3d(${x}px,${y}px,0)`;
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
