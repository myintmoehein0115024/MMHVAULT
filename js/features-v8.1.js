/* MMHVAULT FEATURES v8.1 — real motion layer */
(()=>{
  const host=document.querySelector('.future-features .feature-architecture-v65');
  if(!host) return;
  host.innerHTML=`
    <div class="f81-scene" aria-hidden="true">
      <div class="f81-vignette"></div>
      <div class="f81-orbits">
        <svg viewBox="0 0 1000 720" preserveAspectRatio="none">
          <g class="f81-orbit" id="f81-back-a"><ellipse class="f81-o-back" cx="610" cy="370" rx="350" ry="145"/></g>
          <g class="f81-orbit" id="f81-back-b"><ellipse class="f81-o-back" cx="610" cy="370" rx="330" ry="135"/></g>
          <g class="f81-orbit" id="f81-cyan"><ellipse class="f81-o-cyan" cx="610" cy="370" rx="350" ry="145"/><circle id="f81-csat" class="f81-satellite f81-sat-c" r="4.5"/><circle id="f81-cring" class="f81-sat-ring f81-sat-c" r="10"/></g>
          <g class="f81-orbit" id="f81-gold"><ellipse class="f81-o-gold" cx="610" cy="370" rx="330" ry="135"/><circle id="f81-gsat" class="f81-satellite f81-sat-g" r="4.5"/><circle id="f81-gring" class="f81-sat-ring f81-sat-g" r="10"/></g>
          <g class="f81-orbit" id="f81-vert"><ellipse class="f81-o-cyan" cx="610" cy="370" rx="155" ry="250" opacity=".42"/></g>
        </svg>
      </div>
      <div class="f81-scan"></div>
      <div class="f81-earth"><canvas id="f81-earth-canvas" width="320" height="320"></canvas></div>

      <div class="f81-tag f81-t1"><span class="num">01</span><strong data-en="DATA LAYER" data-zh="数据层">DATA LAYER</strong><span data-en="Real-time market data" data-zh="实时市场数据">Real-time market data</span></div>
      <div class="f81-tag f81-t2"><span class="num">02</span><strong data-en="ANALYTICS ENGINE" data-zh="分析引擎">ANALYTICS ENGINE</strong><span data-en="Insights and signals" data-zh="洞察与信号">Insights and signals</span></div>
      <div class="f81-tag f81-t3"><span class="num">03</span><strong data-en="STRATEGY LAYER" data-zh="策略层">STRATEGY LAYER</strong><span data-en="Build and optimize" data-zh="构建与优化">Build and optimize</span></div>
      <div class="f81-tag gold f81-t4"><span class="num">04</span><strong data-en="RISK CONTROL" data-zh="风险控制">RISK CONTROL</strong><span data-en="Monitor and protect" data-zh="监控与保护">Monitor and protect</span></div>
      <div class="f81-tag f81-t5"><span class="num">05</span><strong data-en="EXECUTION LAYER" data-zh="执行层">EXECUTION LAYER</strong><span data-en="Connect and move" data-zh="连接与执行">Connect and move</span></div>
      <div class="f81-tag f81-t6"><span class="num">06</span><strong data-en="USER INTERFACE" data-zh="用户界面">USER INTERFACE</strong><span data-en="Simple. Clear. Actionable." data-zh="简单。清晰。可执行。">Simple. Clear. Actionable.</span></div>

      <div class="f81-label f81-l1" data-en="REAL-TIME DATA FLOW" data-zh="实时数据流">REAL-TIME DATA FLOW</div>
      <div class="f81-label f81-l2" data-en="GLOBAL MARKETS" data-zh="全球市场">GLOBAL MARKETS</div>
      <div class="f81-label f81-l3" data-en="ASSETS IN MOTION" data-zh="资产流动">ASSETS IN MOTION</div>
      <div class="f81-label f81-l4" data-en="INTELLIGENT DECISIONS" data-zh="智能决策">INTELLIGENT DECISIONS</div>
    </div>`;

  const applyLang=()=>{
    const zh=localStorage.getItem('mmhvault-language')==='zh';
    host.querySelectorAll('[data-en][data-zh]').forEach(el=>{el.textContent=zh?el.dataset.zh:el.dataset.en;});
  };
  applyLang();
  document.querySelectorAll('.landing-lang button[data-lang]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(applyLang,0)));

  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas=host.querySelector('#f81-earth-canvas');
  const ctx=canvas.getContext('2d',{alpha:true});
  const img=new Image(); img.decoding='async'; img.src='images/mmhvault-earth-v4.9.16.jpg';
  const W=canvas.width,H=canvas.height;
  const N=W*H, srcX=new Int32Array(N), srcY=new Int32Array(N), mask=new Uint8Array(N), light=new Uint8Array(N);
  let texture=null, texW=0, texH=0;

  function buildMap(){
    const radius=W/2-2, cx=W/2-0.5, cy=H/2-0.5;
    for(let y=0;y<H;y++){
      for(let x=0;x<W;x++){
        const i=y*W+x; const nx=(x-cx)/radius, ny=(y-cy)/radius;
        const rr=nx*nx+ny*ny;
        if(rr>1){mask[i]=0;continue}
        const nz=Math.sqrt(Math.max(0,1-rr));
        const lon=Math.atan2(nx,nz); const lat=Math.asin(ny);
        srcX[i]=lon; srcY[i]=lat; mask[i]=1;
        // directional light from upper-left/front
        const lx=-0.38, ly=-0.20, lz=0.90;
        const d=Math.max(0,nx*lx+ny*ly+nz*lz);
        light[i]=Math.round(55+200*(0.20+0.80*d));
      }
    }
  }
  function sample(ix,iy,rot){
    let lon=srcX[ix];
    let u=(lon + rot) / (2*Math.PI) + .5;
    u=u-Math.floor(u);
    let sy=(srcY[iy]/Math.PI)+.5; sy=Math.max(0,Math.min(0.9999,sy));
    const x=Math.min(texW-1,Math.floor(u*texW));
    const y=Math.min(texH-1,Math.floor(sy*texH));
    return (y*texW+x)*4;
  }
  function drawEarth(rot){
    if(!texture) return;
    const out=ctx.createImageData(W,H), d=out.data, t=texture.data;
    for(let y=0;y<H;y++){
      for(let x=0;x<W;x++){
        const i=y*W+x, o=i*4;
        if(!mask[i]){d[o+3]=0;continue}
        const si=sample(i,i,rot), br=light[i]/255;
        d[o]=Math.min(255,t[si]*br);
        d[o+1]=Math.min(255,t[si+1]*br);
        d[o+2]=Math.min(255,t[si+2]*br);
        d[o+3]=245;
      }
    }
    ctx.clearRect(0,0,W,H);ctx.putImageData(out,0,0);
  }
  function loadTexture(){
    if(!img.complete || !img.naturalWidth) return false;
    const off=document.createElement('canvas');off.width=img.naturalWidth;off.height=img.naturalHeight;
    const ox=off.getContext('2d',{willReadFrequently:true});ox.drawImage(img,0,0);texture=ox.getImageData(0,0,off.width,off.height);texW=off.width;texH=off.height;return true;
  }

  buildMap();
  img.addEventListener('load',()=>{loadTexture(); if(reduced) drawEarth(0)});

  let lastEarth=0,last=performance.now(); let earthRot=0;
  let a1=0,a2=Math.PI,a3=0;
  const gC=host.querySelector('#f81-cyan'),gG=host.querySelector('#f81-gold'),gV=host.querySelector('#f81-vert');
  const satC=host.querySelector('#f81-csat'),ringC=host.querySelector('#f81-cring');
  const satG=host.querySelector('#f81-gsat'),ringG=host.querySelector('#f81-gring');
  const reduceDetail=window.matchMedia('(max-width:680px)').matches;
  const cx=610,cy=370;

  const place=(el,ring,rx,ry,angle,rotDeg)=>{
    const t=(angle%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
    const rad=rotDeg*Math.PI/180, ca=Math.cos(rad), sa=Math.sin(rad);
    let x=rx*Math.cos(t), y=ry*Math.sin(t);
    const xr=x*ca-y*sa, yr=x*sa+y*ca;
    el.setAttribute('cx',(cx+xr).toFixed(2)); el.setAttribute('cy',(cy+yr).toFixed(2));
    ring.setAttribute('cx',(cx+xr).toFixed(2)); ring.setAttribute('cy',(cy+yr).toFixed(2));
  };
  function tick(now){
    const dt=Math.min(0.05,(now-last)/1000); last=now;
    if(now-lastEarth>33 || reduced){
      earthRot+=(reduced?0:0.22*dt); drawEarth(earthRot); lastEarth=now;
    }
    a1+=dt*0.42; a2-=dt*0.31; a3+=dt*0.22;
    gC.setAttribute('transform',`rotate(${(-10+a1*180/Math.PI).toFixed(2)} ${cx} ${cy})`);
    gG.setAttribute('transform',`rotate(${(16+a2*180/Math.PI).toFixed(2)} ${cx} ${cy})`);
    gV.setAttribute('transform',`rotate(${(-58+a3*180/Math.PI).toFixed(2)} ${cx} ${cy})`);
    place(satC,ringC,350,145,a1,-10); place(satG,ringG,330,135,a2,16);
    raf=requestAnimationFrame(tick);
  }
  let raf=requestAnimationFrame(tick);

  // very subtle hover response, never a large jump
  const scene=host.querySelector('.f81-scene');
  let px=0,py=0,pr=0;
  const apply=()=>{pr=0;scene.style.transform=`translate3d(${(px*3).toFixed(1)}px,${(py*3).toFixed(1)}px,0)`};
  host.addEventListener('pointermove',e=>{if(matchMedia('(pointer:coarse)').matches)return;const r=host.getBoundingClientRect();px=(e.clientX-r.left)/r.width-.5;py=(e.clientY-r.top)/r.height-.5;if(!pr)pr=requestAnimationFrame(apply)},{passive:true});
  host.addEventListener('pointerleave',()=>{px=py=0;if(!pr)pr=requestAnimationFrame(apply)},{passive:true});
})();
