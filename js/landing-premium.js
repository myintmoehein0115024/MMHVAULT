document.addEventListener("DOMContentLoaded",()=>{
  const header=document.querySelector(".site-header");
  const menu=document.querySelector(".menu-toggle");
  const heroArt=document.querySelector(".hero-art");
  const reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if(menu&&header){
    menu.onclick=()=>{
      header.classList.toggle("menu-open");
      menu.setAttribute("aria-expanded",header.classList.contains("menu-open"));
    };
  }

  const updateHeader=()=>{
    if(header) header.classList.toggle("is-scrolled",window.scrollY>18);
  };
  updateHeader();
  window.addEventListener("scroll",updateHeader,{passive:true});

  if(heroArt&&!reduceMotion&&window.matchMedia("(hover: hover)").matches){
    heroArt.addEventListener("pointermove",e=>{
      const r=heroArt.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5;
      const y=(e.clientY-r.top)/r.height-.5;
      heroArt.style.setProperty("--mx",`${x*3.2}deg`);
      heroArt.style.setProperty("--my",`${-y*2.2}deg`);
    });
    heroArt.addEventListener("pointerleave",()=>{
      heroArt.style.setProperty("--mx","0deg");
      heroArt.style.setProperty("--my","0deg");
    });
  }

  const io=new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){
      e.target.classList.add("visible");
      io.unobserve(e.target);
    }
  }),{threshold:.12});
  document.querySelectorAll(".reveal").forEach(x=>io.observe(x));
});
