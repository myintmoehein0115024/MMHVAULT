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
