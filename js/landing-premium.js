document.addEventListener("DOMContentLoaded",()=>{
  const header=document.querySelector(".site-header");
  const menu=document.querySelector(".menu-toggle");

  if(menu&&header){
    menu.addEventListener("click",()=>{
      const open=header.classList.toggle("menu-open");
      menu.setAttribute("aria-expanded",String(open));
    });

    header.querySelectorAll(".links a").forEach(link=>link.addEventListener("click",()=>{
      header.classList.remove("menu-open");
      menu.setAttribute("aria-expanded","false");
    }));
  }

  const updateHeader=()=>{
    const scrolled=window.scrollY>24;
    header?.classList.toggle("header-scrolled",scrolled);
    document.body.classList.toggle("landing-scrolled",scrolled);
  };
  updateHeader();
  window.addEventListener("scroll",updateHeader,{passive:true});

  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add("visible");
      io.unobserve(entry.target);
    }
  }),{threshold:.12,rootMargin:"0px 0px -4% 0px"});
  document.querySelectorAll(".reveal").forEach((el,index)=>{
    if(!el.style.transitionDelay && index<8) el.style.transitionDelay=`${Math.min(index*45,280)}ms`;
    io.observe(el);
  });

  let raf=0;
  window.addEventListener("pointermove",event=>{
    if(raf)return;
    raf=requestAnimationFrame(()=>{
      document.body.style.setProperty("--mx",`${(event.clientX/window.innerWidth)*100}%`);
      document.body.style.setProperty("--my",`${(event.clientY/window.innerHeight)*100}%`);
      raf=0;
    });
  },{passive:true});
});
