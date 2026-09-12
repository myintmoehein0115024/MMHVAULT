
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
