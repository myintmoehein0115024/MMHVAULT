/* MMHVAULT FEATURES v7.4 — reliable canvas Earth + synchronized orbital system */
(()=>{
  const host=document.querySelector('.future-features .feature-architecture-v65');
  const canvas=document.getElementById('feature-earth-canvas');
  const earth=document.querySelector('.future-features .arch65-earth');
  if(!host||!canvas||!earth)return;

  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motionOK=!reduce;

  // Remove older decorative layers that made the planet feel like a panel stack.
  host.querySelectorAll('.arch65-caption,.arch65-signal,.arch65-flow-dot,.arch65-halo,.arch65-grid,.arch73-front-orbit').forEach(n=>n.remove());

  const orbitEls=[...host.querySelectorAll('.arch65-orbit')];
  orbitEls.forEach(el=>el.querySelectorAll('.arch65-satellite').forEach(n=>n.remove()));

  // Each beacon lives inside its parent orbit, so its local position follows the exact same 3D transform.
  const specs=[
    {orbit:orbitEls[0],phase:.32,speed:.58,color:'cyan'},
    {orbit:orbitEls[0],phase:3.46,speed:.58,color:'cyan'},
    {orbit:orbitEls[1],phase:1.18,speed:-.43,color:'gold'},
    {orbit:orbitEls[1],phase:4.42,speed:-.43,color:'gold'},
    {orbit:orbitEls[2],phase:2.10,speed:.30,color:'cyan'}
  ].filter(s=>s.orbit);
  const sats=specs.map(s=>{
    const el=document.createElement('span');
    el.className=`arch65-satellite arch65-sat-${s.color}`;
    s.orbit.appendChild(el);
    return {...s,el};
  });

  // Very small pointer response. The layout itself never shifts.
  if(motionOK){
    host.querySelectorAll('.arch65-card').forEach(card=>{
      card.addEventListener('pointermove',e=>{
        const r=card.getBoundingClientRect();
        const x=((e.clientX-r.left)/Math.max(1,r.width)-.5);
        const y=((e.clientY-r.top)/Math.max(1,r.height)-.5);
        card.style.setProperty('--rx',`${(-y*.12).toFixed(2)}deg`);
        card.style.setProperty('--ry',`${(x*.12).toFixed(2)}deg`);
        card.style.transform=`translate3d(0,-1px,2px) rotateX(var(--rx)) rotateY(var(--ry))`;
      },{passive:true});
      card.addEventListener('pointerleave',()=>{card.style.removeProperty('--rx');card.style.removeProperty('--ry');card.style.removeProperty('transform');},{passive:true});
    });
  }

  // ---- Reliable 2D Earth sphere renderer ---------------------------------
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)return;
  const img=new Image();
  img.decoding='async';
  let textureReady=false;
  let texW=1,texH=1;
  let texCanvas=document.createElement('canvas');
  let texCtx=texCanvas.getContext('2d');
  let texData=new Uint8ClampedArray([4,18,30,255]);

  const prepareTexture=()=>{
    if(!img.naturalWidth||!img.naturalHeight)return;
    texW=Math.min(720,img.naturalWidth);
    texH=Math.max(2,Math.round(texW*(img.naturalHeight/img.naturalWidth)));
    texCanvas.width=texW;texCanvas.height=texH;
    texCtx.clearRect(0,0,texW,texH);
    texCtx.drawImage(img,0,0,texW,texH);
    texData=texCtx.getImageData(0,0,texW,texH).data;
    textureReady=true;
  };
  img.onload=prepareTexture;
  img.src='images/mmhvault-earth-v4.9.16.jpg';

  let renderW=320,renderH=320,radius=158;
  let mapX=null,mapY=null,mapZ=null,pixels=null,offscreen=null;
  let baseRotation=0;
  let frameLast=0,renderLast=0,paused=false;

  const prepare=()=>{
    const rect=canvas.getBoundingClientRect();
    const d=Math.min(window.devicePixelRatio||1,1.5);
    const cssSize=Math.max(220,Math.min(540,Math.round(Math.min(rect.width,rect.height))));
    renderW=Math.max(220,Math.min(360,Math.round(cssSize*.70)));
    renderH=renderW;
    radius=(renderW-2)/2;
    canvas.width=Math.round(renderW*d);
    canvas.height=Math.round(renderH*d);
    ctx.setTransform(canvas.width/renderW,0,0,canvas.height/renderH,0,0);
    offscreen=ctx.createImageData(renderW,renderH);
    pixels=offscreen.data;
    const count=renderW*renderH;
    mapX=new Float32Array(count);mapY=new Float32Array(count);mapZ=new Float32Array(count);
    for(let y=0;y<renderH;y++){
      const ny=(y-(renderH-1)/2)/radius;
      for(let x=0;x<renderW;x++){
        const nx=(x-(renderW-1)/2)/radius;
        const idx=y*renderW+x;
        const rr=nx*nx+ny*ny;
        if(rr<=1){
          mapX[idx]=nx;
          mapY[idx]=-ny;
          mapZ[idx]=Math.sqrt(Math.max(0,1-rr));
        }else{
          mapX[idx]=2;mapY[idx]=0;mapZ[idx]=0;
        }
      }
    }
  };
  const resizeObserver='ResizeObserver' in window ? new ResizeObserver(prepare) : null;
  if(resizeObserver)resizeObserver.observe(canvas);
  window.addEventListener('resize',prepare,{passive:true});
  prepare();

  const renderEarth=()=>{
    if(!textureReady)return;
    const iw=texW,ih=texH;
    if(!iw||!ih)return;
    const lightX=-.38,lightY=.60,lightZ=.70;
    const invTwoPi=1/(Math.PI*2),invPi=1/Math.PI;
    for(let i=0,p=0;i<mapX.length;i++,p+=4){
      const nx=mapX[i];
      if(nx===2){pixels[p]=0;pixels[p+1]=0;pixels[p+2]=0;pixels[p+3]=0;continue;}
      const ny=mapY[i],nz=mapZ[i];
      let lon=Math.atan2(nx,nz)+baseRotation;
      let u=(lon*invTwoPi+.5)%1;if(u<0)u+=1;
      const lat=Math.asin(Math.max(-1,Math.min(1,ny)));
      const v=0.5-lat*invPi;
      const sx=Math.min(iw-1,Math.max(0,Math.floor(u*iw)));
      const sy=Math.min(ih-1,Math.max(0,Math.floor(v*ih)));
      // Pixel read from an offscreen texture is done once per render size, cached below.
      const q=(sy*iw+sx)*4;
      const rr=texData[q]||0,gg=texData[q+1]||0,bb=texData[q+2]||0;
      const diff=Math.max(0,nx*lightX+ny*lightY+nz*lightZ);
      const rim=Math.pow(Math.max(0,1-nz),2.25);
      const shade=0.20+0.95*diff;
      pixels[p]=Math.min(255,rr*shade+2*rim);
      pixels[p+1]=Math.min(255,gg*shade+12*rim);
      pixels[p+2]=Math.min(255,bb*shade+22*rim);
      pixels[p+3]=255;
    }
    ctx.clearRect(0,0,renderW,renderH);
    ctx.putImageData(offscreen,0,0);
    // Atmosphere, specular haze and night-side edge.
    const g=ctx.createRadialGradient(renderW*.43,renderH*.40,renderW*.18,renderW*.50,renderH*.50,renderW*.52);
    g.addColorStop(0,'rgba(90,205,255,.02)');
    g.addColorStop(.72,'rgba(45,154,222,.03)');
    g.addColorStop(1,'rgba(20,92,150,.18)');
    ctx.globalCompositeOperation='screen';ctx.fillStyle=g;ctx.beginPath();ctx.arc(renderW/2,renderH/2,radius,0,Math.PI*2);ctx.fill();
    ctx.globalCompositeOperation='source-over';
  };

  const setOrbit=(el,index,t)=>{
    const cfg=[
      {rx:67,ry:-18,base:-10,amp:360,dur:22},
      {rx:63,ry:16,base:18,amp:-360,dur:28},
      {rx:12,ry:69,base:-10,amp:360,dur:34}
    ][index];
    if(!cfg)return;
    const spin=(t/cfg.dur)%1;
    const deg=cfg.base+cfg.amp*spin;
    el.style.transform=`translate3d(-50%,-50%,0) rotateX(${cfg.rx}deg) rotateY(${cfg.ry}deg) rotateZ(${deg}deg)`;
  };

  const loop=now=>{
    if(!frameLast)frameLast=now;
    const dt=Math.min(50,Math.max(0,now-frameLast));frameLast=now;
    if(!paused&&motionOK){
      baseRotation+=dt*0.00038;
    }
    if(now-renderLast>32){
      if(!paused){
        renderEarth();
        if(motionOK){
          orbitEls.forEach((el,i)=>setOrbit(el,i,now*.001*1));
          sats.forEach(s=>{
            const a=s.phase+now*0.00034*s.speed;
            const x=50+Math.cos(a)*50;
            const y=50+Math.sin(a)*50;
            s.el.style.left=`${x.toFixed(2)}%`;
            s.el.style.top=`${y.toFixed(2)}%`;
            const pulse=.90+.14*Math.sin(a*1.7);
            s.el.style.transform=`scale(${pulse.toFixed(2)})`;
          });
        }
      }
      renderLast=now;
    }
    requestAnimationFrame(loop);
  };

  new IntersectionObserver(es=>{paused=!(es[0]&&es[0].isIntersecting);},{threshold:.02}).observe(host);
  requestAnimationFrame(loop);
})();
