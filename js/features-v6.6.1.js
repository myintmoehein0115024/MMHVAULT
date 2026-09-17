/* MMHVAULT FEATURES v6.6 — reliable WebGL globe + pointer depth */
(()=>{
  const host=document.querySelector('.feature-architecture-v65');
  const canvas=document.getElementById('feature-earth-canvas');
  if(!host||!canvas) return;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:false});
  if(!gl) return;

  const vs=`attribute vec3 a; attribute vec3 n; attribute vec2 u; uniform mat4 p; uniform mat4 v; uniform mat4 m; varying vec3 N; varying vec2 U; varying vec3 P; void main(){ vec4 q=m*vec4(a,1.0); N=mat3(m)*n; U=u; P=q.xyz; gl_Position=p*v*q; }`;
  const fs=`precision mediump float; varying vec3 N; varying vec2 U; varying vec3 P; uniform sampler2D t; uniform float r; void main(){ vec3 nn=normalize(N); vec3 light=normalize(vec3(-0.35,0.62,0.8)); float diff=max(dot(nn,light),0.0); float rim=pow(max(1.0-dot(nn,vec3(0.0,0.0,1.0)),2.2); vec2 uv=vec2(fract(U.x+r),U.y); vec3 tex=texture2D(t,uv).rgb; vec3 col=tex*(0.16+1.06*diff); col += vec3(0.01,0.07,0.13)*rim; float edge=smoothstep(0.72,0.98,length(P.xy)); col += vec3(0.02,0.12,0.18)*rim*(1.0-edge*0.42); gl_FragColor=vec4(col,1.0); }`;
  const makeShader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.warn('[MMHVAULT Features] shader error',gl.getShaderInfoLog(s));return null;}return s;};
  const pr=gl.createProgram();
  const sv=makeShader(gl.VERTEX_SHADER,vs),sf=makeShader(gl.FRAGMENT_SHADER,fs);
  if(!sv||!sf)return;
  gl.attachShader(pr,sv);gl.attachShader(pr,sf);gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){console.warn('[MMHVAULT Features] link error',gl.getProgramInfoLog(pr));return;}
  gl.useProgram(pr);

  const L=64,O=96,P=[],N=[],U=[],I=[];
  for(let y=0;y<=L;y++){
    const v=y/L,ph=v*Math.PI,cp=Math.cos(ph),sp=Math.sin(ph);
    for(let x=0;x<=O;x++){
      const u=x/O,th=u*Math.PI*2,ct=Math.cos(th),st=Math.sin(th);
      const px=sp*ct,py=cp,pz=sp*st;P.push(px,py,pz);N.push(px,py,pz);U.push(u,1-v);
    }
  }
  for(let y=0;y<L;y++)for(let x=0;x<O;x++){const a=y*(O+1)+x,b=a+1,c=a+O+1,d=c+1;I.push(a,c,b,b,c,d);}
  const buffer=(target,data,usage=gl.STATIC_DRAW)=>{const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,data,usage);return b;};
  const bp=buffer(gl.ARRAY_BUFFER,new Float32Array(P)),bn=buffer(gl.ARRAY_BUFFER,new Float32Array(N)),bu=buffer(gl.ARRAY_BUFFER,new Float32Array(U)),bi=buffer(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(I));
  const indexType=gl.UNSIGNED_INT;
  const ap=gl.getAttribLocation(pr,'a'),an=gl.getAttribLocation(pr,'n'),au=gl.getAttribLocation(pr,'u');
  const bind=(b,a,n)=>{gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,n,gl.FLOAT,false,0,0);};
  bind(bp,ap,3);bind(bn,an,3);bind(bu,au,2);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,bi);

  const up=gl.getUniformLocation(pr,'p'),uv=gl.getUniformLocation(pr,'v'),um=gl.getUniformLocation(pr,'m'),ur=gl.getUniformLocation(pr,'r'),ut=gl.getUniformLocation(pr,'t');
  gl.uniform1i(ut,0);
  const tx=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,tx);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  const img=new Image();img.decoding='async';img.src='images/mmhvault-earth-v4.9.16.jpg';
  let textureReady=false;
  img.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,tx);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);textureReady=true;};
  img.onerror=()=>console.warn('[MMHVAULT Features] globe texture failed to load');

  const persp=(f,a,n,z)=>{const q=1/Math.tan(f/2),nf=1/(n-z);return new Float32Array([q/a,0,0,0,0,q,0,0,0,0,(z+n)*nf,-1,0,0,2*z*n*nf,0]);};
  const ident=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
  const ry=t=>[Math.cos(t),0,-Math.sin(t),0,0,1,0,0,Math.sin(t),0,Math.cos(t),0,0,0,0,1];
  const rx=t=>[1,0,0,0,0,Math.cos(t),Math.sin(t),0,0,-Math.sin(t),Math.cos(t),0,0,0,0,1];
  const mul=(a,b)=>{const o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;};
  let px=0,py=0,mx=0,my=0,paused=false,last=0;
  host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();px=(e.clientX-r.left)/Math.max(1,r.width)-.5;py=(e.clientY-r.top)/Math.max(1,r.height)-.5;});
  host.addEventListener('pointerleave',()=>{px=0;py=0;});
  const resize=()=>{const r=canvas.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,1.75);canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));gl.viewport(0,0,canvas.width,canvas.height);};
  new ResizeObserver(resize).observe(canvas);resize();
  new IntersectionObserver(es=>{paused=!es[0].isIntersecting;},{threshold:.05}).observe(host);
  const frame=ms=>{
    last=ms; const t=ms*.001; if(paused){if(!reduce)requestAnimationFrame(frame);return;}
    const r=canvas.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,1.75),w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));
    if(canvas.width!==w||canvas.height!==h)resize();
    mx+=(px-mx)*.055;my+=(py-my)*.055;
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
    gl.uniformMatrix4fv(up,false,persp(Math.PI/3.15,canvas.width/canvas.height,.1,8));
    gl.uniformMatrix4fv(uv,false,new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,-3.0,1]));
    gl.uniformMatrix4fv(um,false,new Float32Array(mul(ry((reduce?0:t*.085)+mx*.20),rx(my*.16))));
    gl.uniform1f(ur,reduce?0:t*.0125);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tx);
    if(textureReady) gl.drawElements(gl.TRIANGLES,I.length,indexType,0);
    if(!reduce) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();


/* MMHVAULT FEATURES v6.6.1 — restrained card pointer depth
   Loaded after the legacy micro-interaction script so this last listener wins. */
(()=>{
  const root=document.querySelector('.future-features .feature-architecture-v65');
  if(!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const desktop=()=>window.innerWidth>=901;
  const cards=root.querySelectorAll('.arch65-card');
  cards.forEach(card=>{
    card.addEventListener('pointermove',e=>{
      if(!desktop()) return;
      const r=card.getBoundingClientRect();
      if(!r.width || !r.height) return;
      const x=(e.clientX-r.left)/r.width-.5;
      const y=(e.clientY-r.top)/r.height-.5;
      const rx=(-y*0.85).toFixed(2);
      const ry=(x*0.85).toFixed(2);
      const z=card.classList.contains('c3')?150:12;
      card.style.transform=`perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translate3d(0,-1px,${z}px) scale(1.003)`;
    },{passive:true});
    card.addEventListener('pointerleave',()=>{card.style.transform='';},{passive:true});
  });
})();
