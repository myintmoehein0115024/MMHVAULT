function goToLogin(){location.href='login.html';}
window.mmHVaultOpenLoginV327=goToLogin;
window.mmHVaultShowLandingV327=()=>{};
(function(){
  const boot=()=>{
    const root=document.getElementById('mmhvaultLandingV327'); if(!root)return;
    root.querySelectorAll('[href]').forEach(a=>{if(a.getAttribute('href')==='#login')a.setAttribute('href','login.html');});
    if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('reduced-motion-v328');
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
/* V3.28.4: Landing is always the public entry page. Auth routing happens on login.html. */
;

/* V3.27.3 motion preserved */

(function(){
  function boot(){
    const root=document.getElementById('mmhvaultLandingV327');
    if(!root || root.dataset.motionReady==='2') return;
    root.dataset.motionReady='2';
    const live=document.getElementById('landingLiveTextV327');
    const note=document.getElementById('landingDynamicNoteV327');
    const title=document.getElementById('landingChartTitleV327');
    const status=document.getElementById('landingChartStatusV327');
    const dots=[...root.querySelectorAll('.landing-hero-progress-v327 span')];
    const slides=[
      ['WEALTH WORKSPACE · READY WHEN YOU ARE','WEALTH OVERVIEW','PRIVATE VIEW','See the full picture. Make the next move with clarity.'],
      ['TRACK · UNDERSTAND · GROW','CASH FLOW SIGNAL','LIVE INSIGHT','Turn everyday money movement into a clearer financial picture.'],
      ['PLAN · DECIDE · BUILD','WEALTH DIRECTION','PERSONAL RULES','Your goals, savings habits and investments in one connected view.']
    ];
    let ix=0, timerId=0;
    const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function setSlide(i){
      ix=(i+slides.length)%slides.length; const a=slides[ix];
      if(live) live.textContent=a[0]; if(title) title.textContent=a[1]; if(status) status.textContent=a[2]; if(note) note.textContent=a[3];
      dots.forEach((d,k)=>d.classList.toggle('active',k===ix));
    }
    dots.forEach((d,i)=>d.addEventListener('click',()=>{setSlide(i);schedule();},{passive:true}));
    function schedule(){
      if(reduced || document.hidden) return;
      clearTimeout(timerId); timerId=setTimeout(()=>{setSlide(ix+1);schedule();},6500);
    }
    setSlide(0); schedule();
    document.addEventListener('visibilitychange',()=>{clearTimeout(timerId); if(!document.hidden) schedule();},{passive:true});
    const cards=[...root.querySelectorAll('.landing-service-grid-v327 article')];
    if('IntersectionObserver' in window){
      const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('reveal-v327');io.unobserve(entry.target)}}),{threshold:.12});
      cards.forEach(c=>io.observe(c));
    }else cards.forEach(c=>c.classList.add('reveal-v327'));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();

/* V3.27.5 polish preserved */

(function(){
  function harden(){
    const root=document.getElementById('mmhvaultLandingV327');
    if(!root) return;
    root.querySelectorAll('.landing-service-grid-v327 article').forEach((card)=>{
      card.classList.add('reveal-v327');
      card.style.opacity='1';
      card.style.transform='none';
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',harden,{once:true});
  else harden();
})();
