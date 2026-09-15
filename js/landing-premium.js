document.addEventListener("DOMContentLoaded",()=>{
  const header=document.querySelector(".site-header");
  const menu=document.querySelector(".menu-toggle");
  const links=document.querySelectorAll(".links a");

  const setMenu=(open)=>{
    if(!header||!menu)return;
    header.classList.toggle("menu-open",open);
    menu.setAttribute("aria-expanded",String(open));
  };

  if(menu){
    menu.addEventListener("click",()=>setMenu(!header.classList.contains("menu-open")));
    links.forEach(link=>link.addEventListener("click",()=>setMenu(false)));
    document.addEventListener("click",e=>{
      if(header.classList.contains("menu-open")&&!header.contains(e.target))setMenu(false);
    });
  }

  const syncHeader=()=>{
    if(header)header.classList.toggle("is-scrolled",window.scrollY>18);
  };
  syncHeader();
  window.addEventListener("scroll",syncHeader,{passive:true});

  const reveals=[...document.querySelectorAll(".reveal")];
  reveals.forEach((el,i)=>el.style.setProperty("--reveal-delay",`${Math.min(i%5,4)*70}ms`));
  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add("visible");
      io.unobserve(entry.target);
    }
  }),{threshold:.12,rootMargin:"0px 0px -5% 0px"});
  reveals.forEach(el=>io.observe(el));

  const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover=window.matchMedia("(hover: hover)").matches;
  if(!reduce&&canHover){
    const heroArt=document.querySelector(".hero-art");
    if(heroArt){
      heroArt.addEventListener("pointermove",e=>{
        const r=heroArt.getBoundingClientRect();
        const x=(e.clientX-r.left)/r.width-.5;
        const y=(e.clientY-r.top)/r.height-.5;
        heroArt.style.setProperty("--mx",`${x.toFixed(3)}`);
        heroArt.style.setProperty("--my",`${y.toFixed(3)}`);
      });
      heroArt.addEventListener("pointerleave",()=>{
        heroArt.style.removeProperty("--mx");
        heroArt.style.removeProperty("--my");
      });
    }
  }
});
