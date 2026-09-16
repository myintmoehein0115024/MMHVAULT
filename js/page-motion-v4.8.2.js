(function(){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const page=document.querySelector('.future-page'); if(!page) return;
  const key=page.className.split(/\s+/).find(c=>c.indexOf('future-')===0)||'';
  document.documentElement.dataset.motionPage=key.replace('future-','');
  const targets=page.querySelectorAll('.future-section,.future-hero,.future-panel,.feature-card,.loop-card,.timeline-item');
  if(!('IntersectionObserver' in window)) return;
  const io=new IntersectionObserver((entries)=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('motion-in');io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -8% 0px'});
  targets.forEach((el,i)=>{el.style.setProperty('--motion-delay',Math.min(i*35,280)+'ms');io.observe(el)});
})();
