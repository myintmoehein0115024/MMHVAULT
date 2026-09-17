/* MMHVAULT FEATURES v6.5.1 — WebGL Earth + spatial interaction */
(()=>{
  const host=document.querySelector('.feature-architecture-v65');
  const canvas=document.getElementById('feature-earth-canvas');
  if(!host||!canvas)return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:false});
  if(!gl)return;
  const vs=`attribute vec3 a;attribute vec3 n;attribute vec2 u;uniform mat4 p,v,m;varying vec3 N;varying vec2 U;void main(){vec4 q=m*vec4(a,1.);N=mat3(m)*n;U=u;gl_Position=p*v*q;}`;
  const fs=`precision mediump float;varying vec3 N;varying vec2 U;uniform sampler2D t;uniform float r;void main(){vec3 n=normalize(N),l=normalize(vec3(-.42,.62,.78));float d=max(dot(n,l),0.);float rim=pow(1.-max(dot(n,vec3(0.,0.,1.)),0.),2.7);vec3 tex=texture2D(t,vec2(fract(U.x+r),U.y)).rgb;vec3 c=tex*(.20+.98*d);c+=vec3(.015,.10,.18)*rim;gl_FragColor=vec4(c,1.);}`;
  const sh=(type,s)=>{const x=gl.createShader(type);gl.shaderSource(x,s);gl.compileShader(x);return x;};
  const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);gl.useProgram(pr);
  const L=56,O=76,P=[],N=[],U=[],I=[];
  for(let y=0;y<=L;y++){const v=y/L,ph=v*Math.PI;for(let x=0;x<=O;x++){const u=x/O,th=u*Math.PI*2,s=Math.sin(ph),cx=Math.cos(th),cz=Math.sin(th);P.push(s*cx,Math.cos(ph),s*cz);N.push(s*cx,Math.cos(ph),s*cz);U.push(u,1-v);}}
  for(let y=0;y<L;y++)for(let x=0;x<O;x++){const a=y*(O+1)+x,b=a+1,c=a+O+1,d=c+1;I.push(a,c,b,b,c,d);}
  const buf=(target,data)=>{const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,data,gl.STATIC_DRAW);return b;};
  const bp=buf(gl.ARRAY_BUFFER,new Float32Array(P)),bn=buf(gl.ARRAY_BUFFER,new Float32Array(N)),bu=buf(gl.ARRAY_BUFFER,new Float32Array(U)),bi=buf(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(I));
  const ap=gl.getAttribLocation(pr,'a'),an=gl.getAttribLocation(pr,'n'),au=gl.getAttribLocation(pr,'u');
  const bind=(b,a,n)=>{gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,n,gl.FLOAT,false,0,0);};bind(bp,ap,3);bind(bn,an,3);bind(bu,au,2);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,bi);
  const tx=gl.createTexture(),img=new Image();img.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,tx);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.generateMipmap(gl.TEXTURE_2D);draw(0);};img.src='images/mmhvault-earth-v4.9.16.jpg';
  const up=gl.getUniformLocation(pr,'p'),uv=gl.getUniformLocation(pr,'v'),um=gl.getUniformLocation(pr,'m'),ur=gl.getUniformLocation(pr,'r');
  const persp=(f,a,n,z)=>{const q=1/Math.tan(f/2),nf=1/(n-z);return new Float32Array([q/a,0,0,0,0,q,0,0,0,0,(z+n)*nf,-1,0,0,2*z*n*nf,0]);};
  const ry=t=>[Math.cos(t),0,-Math.sin(t),0,0,1,0,0,Math.sin(t),0,Math.cos(t),0,0,0,0,1],rx=t=>[1,0,0,0,0,Math.cos(t),Math.sin(t),0,0,-Math.sin(t),Math.cos(t),0,0,0,0,1];
  const mul=(a,b)=>{const o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;};
  let mx=0,my=0,txm=0,tym=0,paused=false,last=0;
  host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();txm=(e.clientX-r.left)/r.width-.5;tym=(e.clientY-r.top)/r.height-.5;});
  host.addEventListener('pointerleave',()=>{txm=0;tym=0;});
  const resize=()=>{const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.6);canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));gl.viewport(0,0,canvas.width,canvas.height);};
  new ResizeObserver(resize).observe(canvas);resize();
  new IntersectionObserver(e=>paused=!e[0].isIntersecting,{threshold:.05}).observe(host);
  const draw=ms=>{last=ms;const t=ms*.001,r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.6);if(canvas.width!==Math.round(r.width*d)||canvas.height!==Math.round(r.height*d))resize();mx+=(txm-mx)*.06;my+=(tym-my)*.06;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.uniformMatrix4fv(up,false,persp(Math.PI/3.18,canvas.width/canvas.height,.1,10));gl.uniformMatrix4fv(uv,false,new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,-3.1,1]));gl.uniformMatrix4fv(um,false,new Float32Array(mul(ry((reduce?0:t*.10)+mx*.18),rx(my*.09))));gl.uniform1f(ur,reduce?0:t*.014);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tx);gl.drawElements(gl.TRIANGLES,I.length,gl.UNSIGNED_SHORT,0);if(!paused&&!reduce)requestAnimationFrame(draw);};
  draw(0);
})();
