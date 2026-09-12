
/* MMHVAULT · visual-only motion helpers */
(function(){
  const onScroll = () => document.body.classList.toggle('mmh-scrolled', window.scrollY > 18);
  onScroll();
  window.addEventListener('scroll', onScroll, {passive:true});

  if (!('IntersectionObserver' in window)) return;
  const items = document.querySelectorAll('.card,.panel,.feature-card,.feature,.security-card,.experience-card,.about-card,.mmh-dash372-card');
  items.forEach(el => {
    if (el.classList.contains('mmh-visual-reveal')) return;
    el.classList.add('mmh-visual-ready');
  });
})();

/* Premium visual pass 2: decorative layer only */
(function(){
  const root = document.documentElement;
  if (!root.dataset.mmhPremiumVisual2) root.dataset.mmhPremiumVisual2 = '1';

  const syncScrollState = () => {
    document.body.classList.toggle('mmh-deep-scroll', window.scrollY > 160);
  };
  syncScrollState();
  window.addEventListener('scroll', syncScrollState, {passive:true});
})();

/* Premium visual pass 3: subtle active-page pulse, presentation only */
(function(){
  const markActivePage = () => {
    const pageIds = ['dashboard','transactions','invest','analyze','exchange','settings'];
    const active = pageIds.find(id => {
      const el = document.getElementById(id);
      if (!el) return false;
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    });
    if (active) document.documentElement.dataset.mmhActivePage = active;
  };
  markActivePage();
  window.addEventListener('hashchange', markActivePage, {passive:true});
})();

/* Premium visual pass 4: visual-only observer for major dashboard cards */
(function(){
  if (!('IntersectionObserver' in window)) return;
  const targets = document.querySelectorAll('.mmh-command-v34210,.mmh-dash372-card');
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      entry.target.classList.toggle('mmh-in-view',entry.isIntersecting);
    });
  },{threshold:.18});
  targets.forEach(el=>observer.observe(el));
})();

/* Premium visual pass 5 marker — presentation only */
(function(){
  document.documentElement.dataset.mmhTypographySystem = 'premium-v5';
})();

/* Premium visual pass 6 marker — dashboard composition only */
(function(){
  document.documentElement.dataset.mmhDashboardComposition = 'premium-v6';
})();

/* Premium visual pass 7 marker — Transactions + Invest presentation only */
(function(){
  document.documentElement.dataset.mmhSecondaryPages = 'premium-v7';
})();

/* Premium visual pass 8 marker — analytics presentation only */
(function(){
  document.documentElement.dataset.mmhAnalyticsSystem = 'premium-v8';
})();

/* Premium visual pass 9 marker — Settings / Data Center presentation only */
(function(){
  document.documentElement.dataset.mmhControlCenter = 'premium-v9';
})();

/* Premium visual pass 10 marker — final micro-detail layer */
(function(){
  document.documentElement.dataset.mmhMicroPolish = 'premium-v10';
})();

/* Premium visual pass 11 marker — art direction finalization only */
(function(){
  document.documentElement.dataset.mmhArtDirection = 'premium-v11-final';
})();

/* Premium visual pass 12 marker — entry experience only */
(function(){
  document.documentElement.dataset.mmhEntryPolish = 'premium-v12';
})();

/* Premium visual pass 13: ambient pointer light, presentation-only */
(function(){
  if (window.matchMedia && !window.matchMedia('(hover:hover) and (pointer:fine) and (min-width:901px)').matches) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let raf = 0, x = 50, y = 18;
  const apply = () => {
    raf = 0;
    document.documentElement.style.setProperty('--mmh-pointer-x', x + '%');
    document.documentElement.style.setProperty('--mmh-pointer-y', y + '%');
  };

  window.addEventListener('pointermove', (e) => {
    x = Math.max(4, Math.min(96, (e.clientX / Math.max(1, window.innerWidth)) * 100));
    y = Math.max(3, Math.min(97, (e.clientY / Math.max(1, window.innerHeight)) * 100));
    if (!raf) raf = requestAnimationFrame(apply);
  }, {passive:true});

  window.addEventListener('pointerleave', () => {
    x = 50; y = 18;
    if (!raf) raf = requestAnimationFrame(apply);
  }, {passive:true});
})();
