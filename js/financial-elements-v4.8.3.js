(function(){
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sections = document.querySelectorAll('.future-section');
  const activate = el => el.classList.add('is-live');
  if(reduce){ sections.forEach(activate); return; }
  const io = new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting) activate(e.target)}),{threshold:.18,rootMargin:'0px 0px -8% 0px'});
  sections.forEach(s=>io.observe(s));
  document.querySelectorAll('.future-stat').forEach((card,i)=>{
    card.addEventListener('pointermove',e=>{
      if(e.pointerType==='touch') return;
      const r=card.getBoundingClientRect(), x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
      card.style.setProperty('--fx',(x*5).toFixed(1)+'px'); card.style.setProperty('--fy',(y*3).toFixed(1)+'px');
    });
    card.addEventListener('pointerleave',()=>{card.style.setProperty('--fx','0px');card.style.setProperty('--fy','0px');});
    card.style.setProperty('--delay',(i*.08)+'s');
  });
})();
