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
    header.querySelectorAll(".links a").forEach(link=>link.addEventListener("click",()=>{
      header.classList.remove("menu-open");
      menu.setAttribute("aria-expanded","false");
    }));
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

/* MMHVAULT V4.3.3 · section micro-interactions */
document.addEventListener("DOMContentLoaded",()=>{
  const reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduceMotion || !window.matchMedia("(hover: hover)").matches) return;

  document.querySelectorAll(".card").forEach(card=>{
    card.addEventListener("pointermove",e=>{
      const r=card.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5;
      const y=(e.clientY-r.top)/r.height-.5;
      card.style.setProperty("--card-x",`${x*2.2}deg`);
      card.style.setProperty("--card-y",`${-y*1.7}deg`);
      card.style.transform=`translateY(${card.matches(":nth-child(3)")?28:card.matches(":nth-child(2)")?14:0}px) perspective(900px) rotateY(${x*2.2}deg) rotateX(${-y*1.7}deg)`;
    });
    card.addEventListener("pointerleave",()=>{
      card.style.transform="";
    });
  });
});

/* MMHVAULT V4.3.4 · closing-section micro-interactions */
document.addEventListener("DOMContentLoaded",()=>{
  const reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cta=document.querySelector(".cta");
  if(!cta || reduceMotion || !window.matchMedia("(hover: hover)").matches) return;

  cta.addEventListener("pointermove",e=>{
    const r=cta.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width-.5;
    const y=(e.clientY-r.top)/r.height-.5;
    cta.style.setProperty("--cta-glow-x",`${50+x*22}%`);
    cta.style.setProperty("--cta-glow-y",`${35+y*18}%`);
  });
  cta.addEventListener("pointerleave",()=>{
    cta.style.removeProperty("--cta-glow-x");
    cta.style.removeProperty("--cta-glow-y");
  });
});

/* MMHVAULT V4.3.5 · final polish micro-interactions */
document.addEventListener("DOMContentLoaded",()=>{
  const reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduceMotion || !window.matchMedia("(hover: hover)").matches) return;

  document.querySelectorAll(".showcase-media").forEach(media=>{
    media.addEventListener("pointermove",e=>{
      const r=media.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5;
      const y=(e.clientY-r.top)/r.height-.5;
      media.style.setProperty("--media-glow-x",`${50+x*18}%`);
      media.style.setProperty("--media-glow-y",`${50+y*18}%`);
    });
    media.addEventListener("pointerleave",()=>{
      media.style.removeProperty("--media-glow-x");
      media.style.removeProperty("--media-glow-y");
    });
  });
});
