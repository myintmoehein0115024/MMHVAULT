/* MMHVAULT FEATURES v7.5 — true rotating equirectangular Earth + orbital satellites */
(()=>{
  const host=document.querySelector('.future-features .feature-architecture-v65');
  const canvas=document.getElementById('feature-earth-canvas');
  if(!host||!canvas)return;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr=()=>Math.min(window.devicePixelRatio||1,1.6);

  // Remove/disable previous orbit implementation so it cannot fight this one.
  host.querySelectorAll('.arch65-orbit').forEach(el=>el.remove());
  host.querySelectorAll('.arch65-satellite').forEach(el=>el.remove());

  // Build a single SVG orbital rig. Each satellite is positioned on the same ellipse as its path.
  const svgNS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(svgNS,'svg');
  svg.classList.add('v75-orbit-svg');
  svg.setAttribute('viewBox','0 0 100 100');
  svg.setAttribute('preserveAspectRatio','none');
  host.appendChild(svg);
  const center={x:56,y:54};
  const orbits=[
    {rx:33,ry:15,rot:-10,color:'cyan',speed:.050,phase:.15,glint:true},
    {rx:36,ry:18,rot:13,color:'gold',speed:-.036,phase:2.10,glint:true},
    {rx:16,ry:34,rot:-8,color:'dim',speed:.022,phase:4.00,glint:false},
  ];
  const orbitState=orbits.map((o,i)=>{
    const g=document.createElementNS(svgNS,'g');g.classList.add('v75-orbit-group');
    g.dataset.rotation=String(o.rot); g.dataset.speed=String(o.speed);
    const e=document.createElementNS(svgNS,'ellipse');
    e.classList.add('v75-orbit',o.color);e.setAttribute('cx',center.x);e.setAttribute('cy',center.y);e.setAttribute('rx',o.rx);e.setAttribute('ry',o.ry);e.setAttribute('transform',`rotate(${o.rot} ${center.x} ${center.y})`);
    g.appendChild(e);
    let glint=null;
    if(o.glint){glint=document.createElementNS(svgNS,'ellipse');glint.classList.add('v75-orbit-glint',o.color);glint.setAttribute('cx',center.x);glint.setAttribute('cy',center.y);glint.setAttribute('rx',o.rx);glint.setAttribute('ry',o.ry);glint.setAttribute('transform',`rotate(${o.rot} ${center.x} ${center.y})`);g.appendChild(glint);}
    const sats=[];
    const count=i===2?1:2;
    for(let k=0;k<count;k++){
      const c=document.createElementNS(svgNS,'circle');c.classList.add('v75-satellite',o.color==='dim'?'cyan':o.color);c.setAttribute('r',o.color==='dim'?'0.55':'0.78');g.appendChild(c);sats.push({el:c,phase:o.phase+k*Math.PI+0.35});
    }
    svg.appendChild(g);
    return {o,g,e,glint,sats,angle:0};
  });
  // A faint planetary axis—small enough to avoid competing with the Earth.
  const axis=document.createElementNS(svgNS,'line');axis.classList.add('v75-planetary-axis');axis.setAttribute('x1','56');axis.setAttribute('y1','18');axis.setAttribute('x2','56');axis.setAttribute('y2','90');axis.setAttribute('transform','rotate(-7 56 54)');svg.appendChild(axis);

  // ---- Reliable 2D sphere renderer ---------------------------------------
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)return;
  const texture=new Image();texture.decoding='async';
  texture.src='images/mmhvault-earth-v4.9.16.jpg';
  let texW=1,texH=1,texData=null,textureReady=false;
  const texCanvas=document.createElement('canvas');
  const texCtx=texCanvas.getContext('2d',{willReadFrequently:true});
  const prepareTexture=()=>{
    if(!texture.naturalWidth)return;
    texW=Math.min(900,texture.naturalWidth);texH=Math.max(2,Math.round(texW*texture.naturalHeight/texture.naturalWidth));
    texCanvas.width=texW;texCanvas.height=texH;texCtx.drawImage(texture,0,0,texW,texH);texData=texCtx.getImageData(0,0,texW,texH).data;textureReady=true;
  };
  texture.onload=prepareTexture;

  let size=360,logicalCanvas=360,off=null,offCtx=null,offImg=null,mapX=null,mapY=null,mapZ=null,radius=179;
  let rotation=0,last=0,renderLast=0,paused=false;
  const fit=()=>{
    const r=canvas.getBoundingClientRect();
    logicalCanvas=Math.max(240,Math.min(480,Math.round(Math.min(r.width,r.height))));
    size=Math.max(260,Math.min(390,Math.round(logicalCanvas*.78)));radius=(size-2)/2;
    off=document.createElement('canvas');off.width=size;off.height=size;offCtx=off.getContext('2d');offImg=offCtx.createImageData(size,size);
    const n=size*size;mapX=new Float32Array(n);mapY=new Float32Array(n);mapZ=new Float32Array(n);
    const c=(size-1)/2;
    for(let y=0;y<size;y++){
      const sy=(y-c)/radius;
      for(let x=0;x<size;x++){
        const sx=(x-c)/radius,idx=y*size+x,r=sx*sx+sy*sy;
        if(r<=1){mapX[idx]=sx;mapY[idx]=-sy;mapZ[idx]=Math.sqrt(Math.max(0,1-r));}else{mapX[idx]=2;}
      }
    }
  };
  fit();
  const ro='ResizeObserver' in window?new ResizeObserver(fit):null;if(ro)ro.observe(canvas);window.addEventListener('resize',fit,{passive:true});

  const renderEarth=()=>{
    if(!textureReady||!offImg||!texData)return;
    const pixels=offImg.data;
    const lx=-.30,ly=.60,lz=.74,inv2=Math.PI*2,invPi=1/Math.PI;
    for(let i=0,p=0;i<mapX.length;i++,p+=4){
      const x=mapX[i];if(x===2){pixels[p]=pixels[p+1]=pixels[p+2]=0;pixels[p+3]=0;continue;}
      const y=mapY[i],z=mapZ[i];
      let lon=Math.atan2(x,z)+rotation;let u=(lon/inv2+.5)%1;if(u<0)u+=1;
      const lat=Math.asin(Math.max(-1,Math.min(1,y)));const v=.5-lat*invPi;
      const sx=Math.max(0,Math.min(texW-1,Math.floor(u*texW)));const sy=Math.max(0,Math.min(texH-1,Math.floor(v*texH)));const q=(sy*texW+sx)*4;
      const rr=texData[q]||0,gg=texData[q+1]||0,bb=texData[q+2]||0;
      const light=Math.max(0,x*lx+y*ly+z*lz);const rim=Math.pow(Math.max(0,1-z),2.15);const shade=.22+.92*light;
      // Slight warm night lights are already present in source texture; preserve them.
      pixels[p]=Math.min(255,rr*shade+2*rim);pixels[p+1]=Math.min(255,gg*shade+9*rim);pixels[p+2]=Math.min(255,bb*shade+20*rim);pixels[p+3]=255;
    }
    offCtx.putImageData(offImg,0,0);
    const c=logicalCanvas/2;ctx.setTransform(dpr(),0,0,dpr(),0,0);ctx.clearRect(0,0,logicalCanvas,logicalCanvas);
    const ox=(logicalCanvas-size)/2;ctx.globalAlpha=1;ctx.drawImage(off,ox,ox,size,size);
    const g=ctx.createRadialGradient(c-18,c-26, size*.16, c,c,size*.54);g.addColorStop(0,'rgba(85,192,245,.02)');g.addColorStop(.78,'rgba(46,145,212,.035)');g.addColorStop(1,'rgba(20,92,150,.16)');ctx.globalCompositeOperation='screen';ctx.fillStyle=g;ctx.beginPath();ctx.arc(c,c,radius,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over';
  };
  const positionSatellites=(o,t)=>{
    o.angle+=o.o.speed*.001*(t-(o._lastT||t)||0);o._lastT=t;
    const rx=o.o.rx,ry=o.o.ry,rot=o.o.rot*Math.PI/180,cr=Math.cos(rot),sr=Math.sin(rot);
    o.sats.forEach(s=>{const a=s.phase+o.angle*60;const ex=rx*Math.cos(a),ey=ry*Math.sin(a);const x=center.x+ex*cr-ey*sr,y=center.y+ex*sr+ey*cr;s.el.setAttribute('cx',x.toFixed(2));s.el.setAttribute('cy',y.toFixed(2));});
  };
  let frame=0;
  const loop=now=>{
    if(!last)last=now;const dt=Math.min(40,now-last);last=now;
    if(!paused&&!reduce)rotation+=(dt*0.00016); // ~9.2°/s
    if(!paused&&now-renderLast>30){renderEarth();orbitState.forEach(o=>positionSatellites(o,now));orbitState.forEach((o,i)=>{o.g.style.transform=`rotate(${(o.o.speed*now*0.018).toFixed(3)}deg ${center.x}px ${center.y}px)`;if(o.glint)o.glint.style.strokeDashoffset=`${((now*.012*(i?-.8:1))%90).toFixed(2)}`;});renderLast=now;}
    frame=requestAnimationFrame(loop);
  };
  const io=new IntersectionObserver(es=>{paused=!(es[0]&&es[0].isIntersecting);},{threshold:.05});io.observe(host);
  requestAnimationFrame(loop);
})();
