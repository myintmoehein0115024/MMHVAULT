// MMHVAULT v5.5.1 — visual data integrity fix. v5.4 HUD injection removed; existing HTML signal data remains the single source of truth.
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

/* MMHVAULT v5.5 — adaptive performance governor. Keeps the visual system intact while
   reducing expensive layers on constrained devices and pausing work outside the viewport. */
(() => {
  const home = document.querySelector('.future-home');
  const root = home?.querySelector('.earth-signal-layer');
  if (!home || !root || root.dataset.mmhPerfInstalled) return;
  root.dataset.mmhPerfInstalled = '1';

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia?.('(max-width: 700px)').matches;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const lowPower = cores <= 4 || memory <= 4;

  if (lowPower) home.classList.add('mmh-perf-low');
  if ((cores <= 2 || memory <= 2) && !reduced) home.classList.add('mmh-perf-saver');

  // On touch devices there is no pointer-parallax benefit, so avoid keeping the
  // heavy desktop layers alive. CSS supplies the dedicated mobile presentation.
  if (mobile || coarse) return;

  let visible = true;
  let idleTimer = 0;
  let lastInput = performance.now();
  const markInput = () => {
    lastInput = performance.now();
    home.classList.remove('mmh-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => home.classList.add('mmh-idle'), 1800);
  };
  window.addEventListener('pointermove', markInput, {passive:true});
  window.addEventListener('wheel', markInput, {passive:true});
  window.addEventListener('scroll', markInput, {passive:true});

  const io = new IntersectionObserver(entries => {
    visible = !!entries[0]?.isIntersecting && !document.hidden;
    home.classList.toggle('mmh-offscreen', !visible);
  }, {rootMargin:'120px 0px', threshold:0});
  io.observe(home);

  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    home.classList.toggle('mmh-offscreen', !visible);
  }, {passive:true});

  window.addEventListener('pagehide', () => {
    clearTimeout(idleTimer);
    io.disconnect();
  }, {once:true});
})();

/* MMHVAULT v5.6 — cinematic landing intro. Adds a self-contained overlay only. */
(() => {
  const boot = () => {
    const home = document.querySelector('.future-home');
    if (!home || home.dataset.mmhCinematicInstalled) return;
    home.dataset.mmhCinematicInstalled = '1';
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const intro = document.createElement('div');
    intro.className = 'mmh-cinematic-intro';
    intro.setAttribute('aria-hidden', 'true');
    intro.innerHTML = `
      <div class="mmh-cinematic-intro__grid"></div>
      <div class="mmh-cinematic-intro__ring"></div>
      <div class="mmh-cinematic-intro__ticks"><i></i><i></i><i></i><i></i></div>
      <div class="mmh-cinematic-intro__label"><b>MMHVAULT</b>&nbsp;&nbsp; INITIALIZING · FINANCIAL INTELLIGENCE</div>`;
    home.prepend(intro);
    home.classList.add('mmh-cinematic-intro');

    // Keep the opening short and non-blocking. A hard fallback guarantees the
    // overlay can never remain above the interface if an animation is delayed.
    const finish = () => {
      if (home.classList.contains('mmh-cinematic-done')) return;
      home.classList.add('mmh-cinematic-done');
      window.setTimeout(() => intro.remove(), 800);
    };
    window.setTimeout(finish, 1780);
    intro.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'opacity') intro.remove();
    }, {passive:true});
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
