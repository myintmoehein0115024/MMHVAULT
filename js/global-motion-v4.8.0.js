/* MMHVAULT v4.8.0 — Global Motion System */
(function(){
  'use strict';
  var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var page=document.querySelector('.future-page');
  if(!page)return;
  var selectors='.future-page > section, .future-page .future-card, .future-page .command-card, .future-page .feature-card, .future-page .trust-card, .future-page .experience-card, .future-page .principle-card, .future-page .timeline-item, .future-page .signature-section';
  var items=Array.prototype.slice.call(document.querySelectorAll(selectors));
  items.forEach(function(el,i){el.classList.add('mmh-reveal');el.dataset.delay=String((i%5));});
  if(reduced){items.forEach(function(el){el.classList.add('is-visible');});return;}
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('is-visible');io.unobserve(entry.target);}});},{threshold:.12,rootMargin:'0px 0px -8% 0px'});
    items.forEach(function(el){io.observe(el);});
  }else{items.forEach(function(el){el.classList.add('is-visible');});}
  var visual=page.querySelector('.signature-section .signature-svg');
  if(visual && window.matchMedia('(min-width: 901px)').matches){
    visual.classList.add('mmh-parallax');
    var raf=0,tx=0,ty=0;
    page.addEventListener('mousemove',function(e){
      var r=page.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      tx=x*5;ty=y*3;
      if(!raf)raf=requestAnimationFrame(function(){visual.style.transform='translate3d('+tx.toFixed(2)+'px,'+ty.toFixed(2)+'px,0)';raf=0;});
    });
    page.addEventListener('mouseleave',function(){visual.style.transform='translate3d(0,0,0)';});
  }
})();
