(() => {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const once = new WeakSet();
  const activate = el => { el.classList.add('is-active'); if (el.matches('.signal-chart,.network-map')) el.classList.add('is-live'); once.add(el); };
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting && !once.has(e.target)) activate(e.target); });
    }, {threshold:.16, rootMargin:'0px 0px -8% 0px'});
    document.querySelectorAll('.future-cell,.future-step,.future-trust-item,.future-principle,.future-stat').forEach(el => io.observe(el));
    document.querySelectorAll('.signal-chart,.network-map').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.future-cell,.future-step,.future-trust-item,.future-principle,.future-stat,.signal-chart,.network-map').forEach(activate);
  }
  document.querySelectorAll('.signal-chart').forEach(chart => {
    const line = chart.querySelector('.main-line');
    if (line) chart.style.setProperty('--flow', 0 + 'px');
  });
  if (!reduce && window.matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.future-cell,.future-step,.future-trust-item,.future-principle').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect(), x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
        card.style.transform=`perspective(900px) rotateX(${(-y*1.5).toFixed(2)}deg) rotateY(${(x*1.8).toFixed(2)}deg) translateY(-3px)`;
      });
      card.addEventListener('pointerleave',()=>{card.style.transform='';});
    });
  }
})();
