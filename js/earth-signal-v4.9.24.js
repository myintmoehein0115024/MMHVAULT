// MMHVAULT v5.2 — living financial signal + global flow + spatial Earth interaction.
(() => {
  const root = document.querySelector('.future-home .earth-signal-layer');
  const earth = document.querySelector('.future-home .mmh-home-earth-v4-9-17');
  if (!root || !earth || root.dataset.mmhFlowInstalled) return;
  root.dataset.mmhFlowInstalled = '1';
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const vals = {
    flow: root.querySelector('[data-sig-value="flow"]'),
    digital: root.querySelector('[data-sig-value="digital"]'),
    reserve: root.querySelector('[data-sig-value="reserve"]')
  };

  const field = document.createElement('div');
  field.className = 'mmh-financial-flow-field';
  field.setAttribute('aria-hidden', 'true');
  field.innerHTML = `
    <svg class="mmh-financial-flow-svg" viewBox="0 0 1000 760" preserveAspectRatio="none">
      <defs>
        <linearGradient id="mmhFlowCyan924" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5fd9ff" stop-opacity="0"/><stop offset=".48" stop-color="#69d9ff" stop-opacity=".72"/><stop offset="1" stop-color="#69d9ff" stop-opacity="0"/></linearGradient>
        <linearGradient id="mmhFlowGold924" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f3ce72" stop-opacity="0"/><stop offset=".5" stop-color="#f3ce72" stop-opacity=".68"/><stop offset="1" stop-color="#f3ce72" stop-opacity="0"/></linearGradient>
        <filter id="mmhFlowGlow924" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <g class="mmh-flow-arcs" filter="url(#mmhFlowGlow924)">
        <path class="cyan" d="M72 275 C250 118 350 140 500 370 C650 600 760 625 928 440"/><path class="blue" d="M48 500 C210 620 350 560 500 390 C650 220 770 150 950 275"/><path class="gold" d="M118 650 C300 560 380 520 500 388 C620 256 720 250 886 112"/><path class="gold soft" d="M140 104 C305 210 375 265 500 380 C625 495 700 550 870 650"/>
      </g>
      <g class="mmh-flow-nodes">
        <g class="node cyan" transform="translate(72 275)"><circle r="4"/><circle class="ring" r="10"/></g><g class="node blue" transform="translate(48 500)"><circle r="3.5"/><circle class="ring" r="9"/></g><g class="node gold" transform="translate(118 650)"><circle r="3.5"/><circle class="ring" r="9"/></g><g class="node gold" transform="translate(886 112)"><circle r="3.5"/><circle class="ring" r="9"/></g><g class="node cyan" transform="translate(928 440)"><circle r="4"/><circle class="ring" r="10"/></g><g class="node blue" transform="translate(950 275)"><circle r="3.5"/><circle class="ring" r="9"/></g><g class="node gold" transform="translate(870 650)"><circle r="3.5"/><circle class="ring" r="9"/></g>
      </g>
    </svg>`;
  root.prepend(field);

  const spatial = document.createElement('div');
  spatial.className = 'mmh-earth-spatial-layer';
  spatial.setAttribute('aria-hidden', 'true');
  spatial.innerHTML = `<div class="mmh-depth-shadow"></div><div class="mmh-spatial-scan"></div><div class="mmh-space-points"><i class="mmh-space-point cyan" style="left:28%;top:31%"></i><i class="mmh-space-point blue" style="left:72%;top:29%"></i><i class="mmh-space-point gold" style="left:80%;top:57%"></i><i class="mmh-space-point cyan" style="left:24%;top:62%"></i><i class="mmh-space-point blue" style="left:37%;top:77%"></i><i class="mmh-space-point gold" style="left:65%;top:76%"></i></div>`;
  root.prepend(spatial);

  const arcs = [...field.querySelectorAll('.mmh-flow-arcs path')];
  const nodes = [...field.querySelectorAll('.mmh-flow-nodes .node')];
  const pointer = {x:0,y:0,tx:0,ty:0};
  let raf = 0;
  let scanAngle = -18;
  const start = performance.now();

  function pointerMove(e){
    const r=earth.getBoundingClientRect();
    pointer.tx=((e.clientX-r.left)/Math.max(1,r.width)-.5)*2;
    pointer.ty=((e.clientY-r.top)/Math.max(1,r.height)-.5)*2;
  }
  earth.addEventListener('pointermove',pointerMove,{passive:true});
  earth.addEventListener('pointerleave',()=>{pointer.tx=0;pointer.ty=0;},{passive:true});

  function loop(now){
    const t=(now-start)/1000;
    pointer.x += (pointer.tx-pointer.x)*.055;
    pointer.y += (pointer.ty-pointer.y)*.055;
    if(!reduced){
      if(vals.flow) vals.flow.textContent=(68.4+Math.sin(t*.42)*2.1).toFixed(1);
      if(vals.digital) vals.digital.textContent=(4.8+Math.sin(t*.75+.8)*1.2).toFixed(1)+'%';
      if(vals.reserve) vals.reserve.textContent=(1.9+Math.cos(t*.58+1.2)*.7).toFixed(1)+'%';
      root.style.setProperty('--mmh-flow-x',(pointer.x*7).toFixed(2)+'px');
      root.style.setProperty('--mmh-flow-y',(pointer.y*5).toFixed(2)+'px');
      root.style.setProperty('--mmh-space-x',(pointer.x*4.5).toFixed(2)+'px');
      root.style.setProperty('--mmh-space-y',(pointer.y*3.5).toFixed(2)+'px');
      root.style.setProperty('--mmh-space-rx',(-pointer.y*2.2).toFixed(2)+'deg');
      root.style.setProperty('--mmh-space-ry',(pointer.x*3.2).toFixed(2)+'deg');
      spatial.style.setProperty('--scan-angle',(scanAngle+=0.045).toFixed(2)+'deg');
      spatial.style.opacity=(.76+Math.sin(t*.45)*.08).toFixed(2);
      root.style.transform=`translate3d(${Math.sin(t*.26)*1.1}px,${Math.cos(t*.22)*.7}px,0)`;
      arcs.forEach((p,i)=>{const speed=i%2?31:25;p.style.strokeDashoffset=`-${((t*speed+i*90)%900)}`;});
      nodes.forEach((n,i)=>{const pulse=.72+(Math.sin(t*(1.05+i*.09)+i)*.28+.28);n.style.setProperty('--node-pulse',pulse.toFixed(2));});
    }
    raf=requestAnimationFrame(loop);
  }
  const onVisibility=()=>{if(document.hidden){cancelAnimationFrame(raf);}else{raf=requestAnimationFrame(loop);}};
  document.addEventListener('visibilitychange',onVisibility,{passive:true});
  window.addEventListener('pagehide',()=>cancelAnimationFrame(raf),{once:true});
  raf=requestAnimationFrame(loop);
})();

/* MMHVAULT v5.3 — scroll-driven 3D transformation layer. */
(() => {
  const home = document.querySelector('.future-home');
  const root = home?.querySelector('.earth-signal-layer');
  if (!home || !root || root.dataset.mmhScrollInstalled) return;
  root.dataset.mmhScrollInstalled = '1';
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia?.('(max-width: 700px)').matches;
  if (reduced || mobile) return;

  const depth = document.createElement('div');
  depth.className = 'mmh-scroll-depth-fade';
  depth.setAttribute('aria-hidden', 'true');
  root.prepend(depth);

  let target = 0, current = 0, raf = 0;
  let visible = true;

  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const smoothstep = n => n * n * (3 - 2 * n);

  function measure(){
    const rect = home.getBoundingClientRect();
    const h = Math.max(1, rect.height);
    // The first ~78% of the hero is the active transformation zone.
    target = clamp((-rect.top) / Math.max(1, h * .78), 0, 1);
  }

  function render(){
    current += (target - current) * .075;
    const p = smoothstep(current);
    const y = -p * 34;
    const scale = 1 - p * .14;
    const rotate = p * -3.2;
    const rx = p * 1.7;
    const ry = p * -2.6;
    const fade = 1 - p * .08;
    root.style.setProperty('--mmh-scroll-progress', p.toFixed(4));
    root.style.setProperty('--mmh-scroll-y', y.toFixed(2) + 'px');
    root.style.setProperty('--mmh-scroll-scale', scale.toFixed(4));
    root.style.setProperty('--mmh-scroll-rotate', rotate.toFixed(2) + 'deg');
    root.style.setProperty('--mmh-scroll-rx', rx.toFixed(2) + 'deg');
    root.style.setProperty('--mmh-scroll-ry', ry.toFixed(2) + 'deg');
    root.style.opacity = fade.toFixed(3);
    if (visible && (Math.abs(target-current) > .0005 || current > .0005)) raf = requestAnimationFrame(render);
    else raf = 0;
  }

  function update(){
    measure();
    if (!raf && visible) raf = requestAnimationFrame(render);
  }

  const io = new IntersectionObserver(entries => {
    visible = !!entries[0]?.isIntersecting;
    if (visible) update(); else { cancelAnimationFrame(raf); raf = 0; }
  }, {threshold:[0,.02,.15,.5,1]});
  io.observe(home);
  window.addEventListener('scroll', update, {passive:true});
  window.addEventListener('resize', update, {passive:true});
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (visible) update(); else { cancelAnimationFrame(raf); raf = 0; }
  }, {passive:true});
  window.addEventListener('pagehide', () => { cancelAnimationFrame(raf); io.disconnect(); }, {once:true});
  update();
})();

/* MMHVAULT v5.4 — interactive financial HUD. */
(() => {
  const home = document.querySelector('.future-home');
  const root = home?.querySelector('.earth-signal-layer');
  const earth = home?.querySelector('.mmh-home-earth-v4-9-17');
  if (!home || !root || !earth || root.dataset.mmhHudInstalled) return;
  root.dataset.mmhHudInstalled = '1';
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia?.('(max-width: 700px)').matches;
  if (mobile) return;

  const hud = document.createElement('div');
  hud.className = 'mmh-financial-hud';
  hud.setAttribute('aria-hidden', 'true');
  hud.innerHTML = `
    <div class="mmh-hud-grid"></div>
    <div class="mmh-hud-card" data-side="top" data-focus="flow">
      <div class="mmh-hud-kicker">Global Flow</div>
      <div class="mmh-hud-value"><span data-hud-value="flow">68.4</span><small>INDEX</small></div>
      <div class="mmh-hud-sub">CAPITAL MOVEMENT · LIVE</div>
      <div class="mmh-hud-spark"><i style="--h:42%"></i><i style="--h:68%"></i><i style="--h:51%"></i><i style="--h:82%"></i><i style="--h:62%"></i><i style="--h:94%"></i><i style="--h:72%"></i><i style="--h:88%"></i></div>
    </div>
    <div class="mmh-hud-card" data-side="left" data-focus="digital">
      <div class="mmh-hud-kicker">Digital Assets</div>
      <div class="mmh-hud-value"><span data-hud-value="digital">+4.8</span><small>%</small></div>
      <div class="mmh-hud-sub">BTC · ETH · LIQUIDITY</div>
    </div>
    <div class="mmh-hud-card" data-side="right" data-focus="reserve">
      <div class="mmh-hud-kicker gold">Reserve</div>
      <div class="mmh-hud-value"><span data-hud-value="reserve">1.9</span><small>%</small></div>
      <div class="mmh-hud-sub">STABILITY · LIQUID BUFFER</div>
    </div>
    <div class="mmh-hud-status"><span class="pulse"></span><b>SYSTEM PULSE</b><span>GLOBAL SIGNAL NETWORK</span></div>
    <div class="mmh-hud-coords">LAT 16.84° · LONG 96.17° · SIGNAL 05:42:18</div>
    <i class="mmh-hud-crosshair" style="left:50%;top:50%"></i>
  `;
  root.appendChild(hud);

  const cards = [...hud.querySelectorAll('.mmh-hud-card')];
  const crosshair = hud.querySelector('.mmh-hud-crosshair');
  const values = {
    flow: hud.querySelector('[data-hud-value="flow"]'),
    digital: hud.querySelector('[data-hud-value="digital"]'),
    reserve: hud.querySelector('[data-hud-value="reserve"]')
  };
  const pointer = {x:0,y:0,tx:0,ty:0};
  let raf=0, active=true, start=performance.now();

  function move(e){
    const r=earth.getBoundingClientRect();
    pointer.tx=((e.clientX-r.left)/Math.max(1,r.width)-.5)*2;
    pointer.ty=((e.clientY-r.top)/Math.max(1,r.height)-.5)*2;
  }
  earth.addEventListener('pointermove',move,{passive:true});
  earth.addEventListener('pointerleave',()=>{pointer.tx=0;pointer.ty=0;},{passive:true});

  function render(now){
    if(!active) return;
    const t=(now-start)/1000;
    pointer.x += (pointer.tx-pointer.x)*.07;
    pointer.y += (pointer.ty-pointer.y)*.07;
    if(!reduced){
      const px=pointer.x, py=pointer.y;
      hud.style.setProperty('--hud-parallax-x',(px*5).toFixed(2)+'px');
      hud.style.setProperty('--hud-parallax-y',(py*4).toFixed(2)+'px');
      cards.forEach((card,i)=>{
        const depth=[1,.72,.88][i] || .8;
        card.style.setProperty('--hud-x',(px*10*depth).toFixed(2)+'px');
        card.style.setProperty('--hud-y',(py*7*depth).toFixed(2)+'px');
        card.style.setProperty('--hud-rx',(-py*1.4*depth).toFixed(2)+'deg');
        card.style.setProperty('--hud-ry',(px*2*depth).toFixed(2)+'deg');
      });
      crosshair.style.transform=`translate(-50%,-50%) translate3d(${px*18}px,${py*14}px,0)`;
      if(values.flow) values.flow.textContent=(68.4+Math.sin(t*.43)*1.7+Math.sin(t*.13)*.45).toFixed(1);
      if(values.digital) values.digital.textContent='+'+(4.8+Math.sin(t*.72+.6)*.9).toFixed(1);
      if(values.reserve) values.reserve.textContent=(1.9+Math.cos(t*.51+1.1)*.45).toFixed(1);
    }
    raf=requestAnimationFrame(render);
  }

  // A subtle focus state follows the nearest HUD module without requiring clicks.
  function focusFromPointer(){
    if(reduced) return;
    const ax=Math.abs(pointer.x), ay=Math.abs(pointer.y);
    cards.forEach(c=>c.classList.remove('is-focus'));
    if(ax<.28 && ay<.42) cards[0]?.classList.add('is-focus');
    else if(pointer.x<-.12) cards[1]?.classList.add('is-focus');
    else if(pointer.x>.12) cards[2]?.classList.add('is-focus');
  }
  const focusLoop=()=>{focusFromPointer();if(active) setTimeout(focusLoop,180)};
  focusLoop();

  const io=new IntersectionObserver(entries=>{
    active=!!entries[0]?.isIntersecting && !document.hidden;
    if(active && !raf) raf=requestAnimationFrame(render);
    if(!active && raf){cancelAnimationFrame(raf);raf=0;}
  },{threshold:[0,.08,.35,1]});
  io.observe(home);
  document.addEventListener('visibilitychange',()=>{
    active=!document.hidden;
    if(active && !raf) raf=requestAnimationFrame(render);
    if(!active && raf){cancelAnimationFrame(raf);raf=0;}
  },{passive:true});
  window.addEventListener('pagehide',()=>{active=false;cancelAnimationFrame(raf);io.disconnect();},{once:true});
  raf=requestAnimationFrame(render);
})();
