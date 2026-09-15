document.addEventListener("DOMContentLoaded",()=>{const h=document.querySelector(".site-header"),b=document.querySelector(".menu-toggle");if(b&&h)b.onclick=()=>{h.classList.toggle("menu-open");b.setAttribute("aria-expanded",h.classList.contains("menu-open"))};const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");io.unobserve(e.target)}}),{threshold:.12});document.querySelectorAll(".reveal").forEach(x=>io.observe(x));});
/* v4.4.0 Global Landing Polish */
document.querySelectorAll('.feature-card,.security-card,.showcase-card').forEach(c=>{c.addEventListener('pointermove',e=>{if(matchMedia('(pointer:coarse)').matches)return;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;c.style.setProperty('--mx',x);c.style.setProperty('--my',y);});});

/* v4.4.1 Responsive QA: shared header state + safe mobile navigation. */
document.addEventListener('DOMContentLoaded',()=>{
  const header=document.querySelector('.site-header');
  if(!header)return;
  const updateHeader=()=>header.classList.toggle('is-scrolled',window.scrollY>18);
  updateHeader();
  window.addEventListener('scroll',updateHeader,{passive:true});

  const menu=header.querySelector('.menu-toggle');
  const links=header.querySelector('.links');
  if(menu&&links){
    links.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
      header.classList.remove('menu-open');
      menu.setAttribute('aria-expanded','false');
    }));
    document.addEventListener('click',e=>{
      if(!header.classList.contains('menu-open'))return;
      if(!header.contains(e.target)){
        header.classList.remove('menu-open');
        menu.setAttribute('aria-expanded','false');
      }
    });
  }
});
