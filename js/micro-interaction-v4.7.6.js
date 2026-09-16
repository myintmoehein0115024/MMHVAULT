(function(){
  'use strict';
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var page=document.querySelector('.future-page');
  if(!page)return;
  var bar=document.createElement('div');bar.className='mm-scroll-progress';bar.setAttribute('aria-hidden','true');bar.innerHTML='<i></i>';document.body.appendChild(bar);
  var fill=bar.firstElementChild;
  function progress(){var d=document.documentElement,s=d.scrollHeight-window.innerHeight;fill.style.width=(s>0?(window.scrollY/s)*100:0)+'%';}
  progress();window.addEventListener('scroll',progress,{passive:true});window.addEventListener('resize',progress,{passive:true});
  if(reduce)return;
  var targets=page.querySelectorAll('.future-section,.future-hero-inner,.future-cell,.future-principle,.future-step,.future-command,.signature-shell');
  targets.forEach(function(el){el.classList.add('mm-reveal');});
  if('IntersectionObserver' in window){var io=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target);}})},{threshold:.12,rootMargin:'0px 0px -6% 0px'});targets.forEach(function(el){io.observe(el);});}
  var cards=page.querySelectorAll('.future-cell,.future-principle,.future-step,.future-command');
  cards.forEach(function(card){card.addEventListener('mousemove',function(e){if(window.innerWidth<900)return;var r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform='perspective(900px) rotateX('+(-y*2.4)+'deg) rotateY('+(x*2.4)+'deg) translateY(-2px)';});card.addEventListener('mouseleave',function(){card.style.transform='';});});
  var shells=page.querySelectorAll('.signature-shell');
  shells.forEach(function(shell){shell.addEventListener('mouseenter',function(){shell.classList.add('mm-hover');});shell.addEventListener('mouseleave',function(){shell.classList.remove('mm-hover');});shell.addEventListener('mousemove',function(e){if(window.innerWidth<1000)return;var r=shell.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;shell.style.transform='perspective(1400px) rotateX('+(-y*1.2)+'deg) rotateY('+(x*1.2)+'deg)';});shell.addEventListener('mouseleave',function(){shell.style.transform='';});});
})();
