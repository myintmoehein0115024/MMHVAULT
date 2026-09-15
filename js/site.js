(function(){
  function init(){
    var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('show');io.unobserve(e.target)}})},{threshold:.08});
      document.querySelectorAll('.reveal').forEach(function(x){io.observe(x)});
    }else{document.querySelectorAll('.reveal').forEach(function(x){x.classList.add('show')})}

    var header=document.querySelector('.site-header');
    var toggle=document.querySelector('.menu-toggle');
    var links=header&&header.querySelector('.links');
    function closeMenu(){if(!header||!toggle)return;header.classList.remove('menu-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open navigation')}
    function openMenu(){if(!header||!toggle)return;header.classList.add('menu-open');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Close navigation')}
    if(header&&toggle&&links){
      toggle.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();header.classList.contains('menu-open')?closeMenu():openMenu()});
      toggle.addEventListener('touchend',function(e){e.preventDefault();header.classList.contains('menu-open')?closeMenu():openMenu()},{passive:false});
      links.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){closeMenu()})});
      document.addEventListener('click',function(e){if(header.classList.contains('menu-open')&&!header.contains(e.target))closeMenu()});
      window.addEventListener('resize',function(){if(window.innerWidth>900)closeMenu()});
    }

    document.querySelectorAll('[data-parallax]').forEach(function(el){
      window.addEventListener('pointermove',function(e){
        if(window.innerWidth<=900||reduce)return;
        var x=(e.clientX/window.innerWidth-.5)*10,y=(e.clientY/window.innerHeight-.5)*10;
        el.style.transform='perspective(1200px) rotateY('+(x/4)+'deg) rotateX('+(-y/5)+'deg) translate3d('+x+'px,'+y+'px,0)';
      },{passive:true});
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
