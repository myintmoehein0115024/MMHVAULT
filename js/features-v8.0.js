/* MMHVAULT FEATURES v8.0 — clean planetary system */
(()=>{
  const host=document.querySelector('.future-features .feature-architecture-v65');
  if(!host) return;
  host.innerHTML=`
    <div class="f8-scene" aria-hidden="true">
      <div class="f8-grid"></div>
      <div class="f8-orbit-layer">
        <svg class="f8-orbit-svg" viewBox="0 0 1000 720" preserveAspectRatio="none">
          <g class="f8-orbit" transform="rotate(-12 580 382)">
            <ellipse cx="580" cy="382" rx="340" ry="138" class="cyan"></ellipse>
            <circle cx="890" cy="382" r="4.2" class="f8-sat cyan"></circle>
            <circle cx="890" cy="382" r="9" class="f8-sat-ring" stroke="#67ddff"></circle>
          </g>
          <g class="f8-orbit gold" transform="rotate(22 580 382)">
            <ellipse cx="580" cy="382" rx="365" ry="148" class="goldline"></ellipse>
            <circle cx="580" cy="234" r="4.2" class="f8-sat gold"></circle>
            <circle cx="580" cy="234" r="9" class="f8-sat-ring" stroke="#f2c969"></circle>
          </g>
          <g class="f8-orbit vert" transform="rotate(-58 580 382)">
            <ellipse cx="580" cy="382" rx="176" ry="270" class="sub"></ellipse>
            <circle cx="580" cy="112" r="3.8" class="f8-sat cyan"></circle>
            <circle cx="580" cy="112" r="8" class="f8-sat-ring" stroke="#67ddff"></circle>
          </g>
        </svg>
      </div>
      <div class="f8-earth-wrap">
        <div class="f8-earth">
          <div class="f8-earth-texture"></div>
          <div class="f8-earth-shade"></div>
          <div class="f8-earth-rim"></div>
        </div>
        <div class="f8-earth-glow"></div>
      </div>
      <div class="f8-callout f8-c1"><span class="num">01</span><strong>DATA LAYER</strong><span>Real-time market data<br>across global assets</span></div>
      <div class="f8-callout f8-c2"><span class="num">02</span><strong>ANALYTICS ENGINE</strong><span>Turn data into<br>insights and signals</span></div>
      <div class="f8-callout f8-c3"><span class="num">03</span><strong>STRATEGY LAYER</strong><span>Build, simulate<br>and optimize</span></div>
      <div class="f8-callout gold f8-c4"><span class="num">04</span><strong>RISK CONTROL</strong><span>Monitor, protect<br>and stay balanced</span></div>
      <div class="f8-callout f8-c5"><span class="num">05</span><strong>EXECUTION LAYER</strong><span>Connect and move<br>with confidence</span></div>
      <div class="f8-callout f8-c6"><span class="num">06</span><strong>USER INTERFACE</strong><span>Simple. Clear.<br>Actionable.</span></div>
      <div class="f8-caption f8-cap1">REAL-TIME<br>DATA FLOW</div>
      <div class="f8-caption f8-cap2">GLOBAL<br>MARKETS</div>
      <div class="f8-caption f8-cap3">ASSETS<br>IN MOTION</div>
      <div class="f8-caption f8-cap4">INTELLIGENT<br>DECISIONS</div>
    </div>`;

  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced) return;

  // Gentle scene parallax; deliberately tiny so the composition stays stable.
  const scene=host.querySelector('.f8-scene');
  let tx=0,ty=0,raf=0,px=0,py=0;
  const apply=()=>{raf=0;scene.style.transform=`translate3d(${(px*5).toFixed(1)}px,${(py*4).toFixed(1)}px,0)`};
  host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();px=((e.clientX-r.left)/r.width-.5);py=((e.clientY-r.top)/r.height-.5);if(!raf)raf=requestAnimationFrame(apply)},{passive:true});
  host.addEventListener('pointerleave',()=>{px=0;py=0;if(!raf)raf=requestAnimationFrame(apply)},{passive:true});
})();
