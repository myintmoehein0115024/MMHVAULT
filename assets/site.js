document.addEventListener('DOMContentLoaded',()=>{
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('show');io.unobserve(e.target)}}),{threshold:.12});
  document.querySelectorAll('.reveal').forEach(x=>io.observe(x));
  document.querySelectorAll('[data-parallax]').forEach(el=>{window.addEventListener('pointermove',e=>{if(matchMedia('(max-width:900px)').matches||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const x=(e.clientX/innerWidth-.5)*10,y=(e.clientY/innerHeight-.5)*10;el.style.transform=`perspective(1200px) rotateY(${x/4}deg) rotateX(${-y/5}deg) translate3d(${x}px,${y}px,0)`},{passive:true})});
  const header=document.querySelector('.site-header'), toggle=document.querySelector('.menu-toggle');
  if(header&&toggle){
    toggle.addEventListener('click',()=>{const open=header.classList.toggle('menu-open');toggle.setAttribute('aria-expanded',open?'true':'false');});
    header.querySelectorAll('.links a').forEach(a=>a.addEventListener('click',()=>{header.classList.remove('menu-open');toggle.setAttribute('aria-expanded','false')}));
    document.addEventListener('click',e=>{if(header.classList.contains('menu-open')&&!header.contains(e.target)){header.classList.remove('menu-open');toggle.setAttribute('aria-expanded','false')}});
  }
});