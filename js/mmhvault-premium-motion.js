
/* MMHVAULT · visual-only motion helpers */
(function(){
  const onScroll = () => document.body.classList.toggle('mmh-scrolled', window.scrollY > 18);
  onScroll();
  window.addEventListener('scroll', onScroll, {passive:true});

  if (!('IntersectionObserver' in window)) return;
  const items = document.querySelectorAll('.card,.panel,.feature-card,.feature,.security-card,.experience-card,.about-card,.mmh-dash372-card');
  items.forEach(el => {
    if (el.classList.contains('mmh-visual-reveal')) return;
    el.classList.add('mmh-visual-ready');
  });
})();

/* Premium visual pass 2: decorative layer only */
(function(){
  const root = document.documentElement;
  if (!root.dataset.mmhPremiumVisual2) root.dataset.mmhPremiumVisual2 = '1';

  const syncScrollState = () => {
    document.body.classList.toggle('mmh-deep-scroll', window.scrollY > 160);
  };
  syncScrollState();
  window.addEventListener('scroll', syncScrollState, {passive:true});
})();

/* Premium visual pass 3: subtle active-page pulse, presentation only */
(function(){
  const markActivePage = () => {
    const pageIds = ['dashboard','transactions','invest','analyze','exchange','settings'];
    const active = pageIds.find(id => {
      const el = document.getElementById(id);
      if (!el) return false;
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    });
    if (active) document.documentElement.dataset.mmhActivePage = active;
  };
  markActivePage();
  window.addEventListener('hashchange', markActivePage, {passive:true});
})();

/* Premium visual pass 4: visual-only observer for major dashboard cards */
(function(){
  if (!('IntersectionObserver' in window)) return;
  const targets = document.querySelectorAll('.mmh-command-v34210,.mmh-dash372-card');
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      entry.target.classList.toggle('mmh-in-view',entry.isIntersecting);
    });
  },{threshold:.18});
  targets.forEach(el=>observer.observe(el));
})();

/* Premium visual pass 5 marker — presentation only */
(function(){
  document.documentElement.dataset.mmhTypographySystem = 'premium-v5';
})();

/* Premium visual pass 6 marker — dashboard composition only */
(function(){
  document.documentElement.dataset.mmhDashboardComposition = 'premium-v6';
})();

/* Premium visual pass 7 marker — Transactions + Invest presentation only */
(function(){
  document.documentElement.dataset.mmhSecondaryPages = 'premium-v7';
})();

/* Premium visual pass 8 marker — analytics presentation only */
(function(){
  document.documentElement.dataset.mmhAnalyticsSystem = 'premium-v8';
})();

/* Premium visual pass 9 marker — Settings / Data Center presentation only */
(function(){
  document.documentElement.dataset.mmhControlCenter = 'premium-v9';
})();

/* Premium visual pass 10 marker — final micro-detail layer */
(function(){
  document.documentElement.dataset.mmhMicroPolish = 'premium-v10';
})();

/* Premium visual pass 11 marker — art direction finalization only */
(function(){
  document.documentElement.dataset.mmhArtDirection = 'premium-v11-final';
})();

/* Premium visual pass 12 marker — entry experience only */
(function(){
  document.documentElement.dataset.mmhEntryPolish = 'premium-v12';
})();

/* Premium visual pass 13: ambient pointer light, presentation-only */
(function(){
  if (window.matchMedia && !window.matchMedia('(hover:hover) and (pointer:fine) and (min-width:901px)').matches) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let raf = 0, x = 50, y = 18;
  const apply = () => {
    raf = 0;
    document.documentElement.style.setProperty('--mmh-pointer-x', x + '%');
    document.documentElement.style.setProperty('--mmh-pointer-y', y + '%');
  };

  window.addEventListener('pointermove', (e) => {
    x = Math.max(4, Math.min(96, (e.clientX / Math.max(1, window.innerWidth)) * 100));
    y = Math.max(3, Math.min(97, (e.clientY / Math.max(1, window.innerHeight)) * 100));
    if (!raf) raf = requestAnimationFrame(apply);
  }, {passive:true});

  window.addEventListener('pointerleave', () => {
    x = 50; y = 18;
    if (!raf) raf = requestAnimationFrame(apply);
  }, {passive:true});
})();
/* MMHVAULT v5.0 — financial particle field, global nodes, depth parallax. */
(() => {
  const root=document.querySelector('.future-home .mmh-home-earth-v4-9-17');
  if(!root) return;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const layer=document.createElement('div');
  layer.className='financial-depth-layer';
  const canvas=document.createElement('canvas');
  layer.appendChild(canvas);
  root.appendChild(layer);
  const ctx=canvas.getContext('2d');
  if(!ctx) return;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  let w=1,h=1,cx=0,cy=0,scale=1;
  const particles=Array.from({length:reduced?10:34},(_,i)=>({
    orbit:i%3, a:Math.random()*Math.PI*2, speed:(.055+Math.random()*.09)*(i%2?-1:1), phase:Math.random()*6.28, size:.7+Math.random()*1.7, alpha:.18+Math.random()*.48
  }));
  const nodes=[
    {x:.29,y:.38,c:'cyan',p:.2},{x:.66,y:.31,c:'blue',p:1.8},{x:.74,y:.58,c:'gold',p:3.1},{x:.39,y:.69,c:'cyan',p:4.4},{x:.55,y:.47,c:'blue',p:5.3}
  ];
  function resize(){const r=layer.getBoundingClientRect();w=Math.max(1,r.width);h=Math.max(1,r.height);canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);cx=w/2;cy=h/2;scale=Math.min(w,h)/2;}
  new ResizeObserver(resize).observe(layer); resize();
  let px=0,py=0,tx=0,ty=0;
  root.addEventListener('pointermove',e=>{const r=root.getBoundingClientRect();px=((e.clientX-r.left)/r.width-.5)*2;py=((e.clientY-r.top)/r.height-.5)*2;},{passive:true});
  root.addEventListener('pointerleave',()=>{px=py=0;},{passive:true});
  const colors={cyan:[92,213,255],blue:[74,157,255],gold:[245,207,116]};
  const rgba=(c,a)=>`rgba(${colors[c].join(',')},${a})`;
  function ellipsePoint(a,orbit){
    const rx=scale*(orbit===0?.58:orbit===1?.68:.76), ry=scale*(orbit===0?.17:orbit===1?.25:.34);
    const rot=orbit===0?-.28:orbit===1?.48:-.72;
    const x=Math.cos(a)*rx,y=Math.sin(a)*ry;
    return {x:cx+x*Math.cos(rot)-y*Math.sin(rot),y:cy+x*Math.sin(rot)+y*Math.cos(rot)};
  }
  const start=performance.now();
  function frame(now){
    const t=(now-start)/1000; tx+=(px-tx)*.045;ty+=(py-ty)*.045;
    root.style.setProperty('--earth-px',(tx*9).toFixed(2)+'px');
    root.style.setProperty('--earth-py',(ty*7).toFixed(2)+'px');
    root.style.setProperty('--earth-tilt-x',(tx*3.2).toFixed(2)+'deg');
    root.style.setProperty('--earth-tilt-y',(-ty*2.2).toFixed(2)+'deg');
    ctx.clearRect(0,0,w,h);
    // very subtle orbital guide arcs
    ctx.save(); ctx.translate(cx,cy);
    [0,1,2].forEach(o=>{const rx=scale*(o===0?.58:o===1?.68:.76),ry=scale*(o===0?.17:o===1?.25:.34),rot=o===0?-.28:o===1?.48:-.72;ctx.save();ctx.rotate(rot);ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.strokeStyle=rgba(o===2?'gold':o?'blue':'cyan',.075);ctx.lineWidth=1;ctx.stroke();ctx.restore();});
    ctx.restore();
    particles.forEach(p=>{p.a+=p.speed*(reduced?.08:1)/60;const q=ellipsePoint(p.a,p.orbit);const c=p.orbit===2?'gold':p.orbit===1?'blue':'cyan';const pulse=.7+.3*Math.sin(t*.9+p.phase);ctx.beginPath();ctx.arc(q.x,q.y,p.size*pulse,0,Math.PI*2);ctx.fillStyle=rgba(c,p.alpha*pulse);ctx.shadowBlur=10;ctx.shadowColor=rgba(c,.35);ctx.fill();});
    // Global nodes with restrained pulse rings.
    nodes.forEach(n=>{const x=n.x*w,y=n.y*h,pulse=.5+.5*Math.sin(t*1.05+n.p);const c=colors[n.c];ctx.beginPath();ctx.arc(x,y,2.2,0,Math.PI*2);ctx.fillStyle=`rgba(${c.join(',')},${.5+.35*pulse})`;ctx.shadowBlur=12;ctx.shadowColor=`rgba(${c.join(',')},.5)`;ctx.fill();ctx.beginPath();ctx.arc(x,y,5+8*pulse,0,Math.PI*2);ctx.strokeStyle=`rgba(${c.join(',')},${.07+.08*pulse})`;ctx.lineWidth=1;ctx.stroke();});
    ctx.shadowBlur=0;
    if(!reduced) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* MMHVAULT v5.0 — bundled into the existing loaded premium-motion entrypoint. */
(function(){ document.documentElement.dataset.mmhLanding3D='v5'; })();
