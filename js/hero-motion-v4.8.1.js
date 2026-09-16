/* MMHVAULT v4.8.1 — Hero Motion controller */
(function(){
  'use strict';
  var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero=document.querySelector('.future-hero');
  if(!hero||reduced)return;
  var orbit=hero.querySelector('.future-orbit');
  if(!orbit||!window.matchMedia('(min-width: 901px)').matches)return;
  var raf=0,tx=0,ty=0;
  hero.addEventListener('mousemove',function(e){
    var r=hero.getBoundingClientRect();
    var x=(e.clientX-r.left)/r.width-.5;
    var y=(e.clientY-r.top)/r.height-.5;
    tx=x*7;ty=y*4;
    if(!raf)raf=requestAnimationFrame(function(){orbit.style.marginLeft=tx.toFixed(2)+'px';orbit.style.marginTop=ty.toFixed(2)+'px';raf=0;});
  });
  hero.addEventListener('mouseleave',function(){orbit.style.marginLeft='0px';orbit.style.marginTop='0px';});
})();
