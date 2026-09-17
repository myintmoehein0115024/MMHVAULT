/* MMHVAULT FEATURES v7.3 — live Earth + orbital system */
(()=>{
  const host=document.querySelector('.future-features .feature-architecture-v65');
  const canvas=document.getElementById('feature-earth-canvas');
  const earth=document.querySelector('.future-features .arch65-earth');
  if(!host||!canvas||!earth)return;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motionOK=!reduce;

  // Kill legacy motion nodes that can create duplicate or oversized visuals.
  host.querySelectorAll('.arch65-caption,.arch65-signal,.arch65-flow-dot,.arch65-halo,.arch65-grid').forEach(n=>n.remove());

  // Add front halves of the orbital planes once. This gives a clean behind/in-front read.
  if(motionOK && !host.querySelector('.arch73-front-orbit')){
    [['a','a'],['b','b'],['c','c']].forEach(([cls])=>{
      const el=document.createElement('div');
      el.className=`arch73-front-orbit ${cls}`;
      el.setAttribute('aria-hidden','true');
      host.appendChild(el);
    });
  }

  const orbitEls=[...host.querySelectorAll('.arch65-orbit')];
  orbitEls.forEach(el=>el.querySelectorAll('.arch65-satellite').forEach(n=>n.remove()));
  const satSpecs=[
    {orbit:orbitEls[0],phase:.40,speed:.48,cls:'arch65-satellite arch65-sat-cyan'},
    {orbit:orbitEls[0],phase:3.45,speed:.48,cls:'arch65-satellite arch65-sat-cyan'},
    {orbit:orbitEls[1],phase:1.34,speed:-.37,cls:'arch65-satellite arch65-sat-gold'},
    {orbit:orbitEls[1],phase:4.36,speed:-.37,cls:'arch65-satellite arch65-sat-gold'},
    {orbit:orbitEls[2],phase:2.15,speed:.28,cls:'arch65-satellite arch65-sat-cyan'}
  ].filter(s=>s.orbit);
  const satellites=satSpecs.map(s=>{
    const el=document.createElement('span');
    el.className=s.cls;
    s.orbit.appendChild(el);
    return {...s,el};
  });

  // Tiny card tilt only; no large jumps or translation.
  if(motionOK){
    host.querySelectorAll('.arch65-card').forEach(card=>{
      card.addEventListener('pointermove',e=>{
        const r=card.getBoundingClientRect();
        const x=((e.clientX-r.left)/Math.max(1,r.width)-.5);
        const y=((e.clientY-r.top)/Math.max(1,r.height)-.5);
        card.style.setProperty('--card-rx',`${(-y*.22).toFixed(2)}deg`);
        card.style.setProperty('--card-ry',`${(x*.22).toFixed(2)}deg`);
      },{passive:true});
      card.addEventListener('pointerleave',()=>{
        card.style.removeProperty('--card-rx');card.style.removeProperty('--card-ry');
      },{passive:true});
    });
  }

  let gl=null;
  try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:false});}catch{}

  if(gl){
    const vs=`attribute vec3 a;attribute vec3 n;attribute vec2 u;uniform mat4 p;uniform mat4 v;uniform mat4 m;varying vec3 N;varying vec2 U;varying vec3 P;void main(){vec4 q=m*vec4(a,1.0);N=mat3(m)*n;U=u;P=q.xyz;gl_Position=p*v*q;}`;
    const fs=`precision mediump float;varying vec3 N;varying vec2 U;varying vec3 P;uniform sampler2D t;uniform float shift;void main(){vec3 nn=normalize(N);vec3 light=normalize(vec3(-0.35,0.62,0.8));float diff=max(dot(nn,light),0.0);float rim=pow(max(1.0-dot(nn,vec3(0.0,0.0,1.0)),2.15);vec2 uv=vec2(fract(U.x+shift),U.y);vec3 tex=texture2D(t,uv).rgb;vec3 col=tex*(0.20+1.05*diff);col+=vec3(0.008,0.055,0.11)*rim;float edge=smoothstep(0.67,0.98,length(P.xy));col+=vec3(0.015,0.10,0.17)*rim*(1.0-edge*0.35);gl_FragColor=vec4(col,1.0);}`;
    const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return gl.getShaderParameter(s,gl.COMPILE_STATUS)?s:null;};
    const sv=shader(gl.VERTEX_SHADER,vs),sf=shader(gl.FRAGMENT_SHADER,fs);
    if(!(sv&&sf)){canvas.style.display='none';return;}
    const pr=gl.createProgram();gl.attachShader(pr,sv);gl.attachShader(pr,sf);gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){canvas.style.display='none';return;}
    gl.useProgram(pr);

    // 56 x 84 sphere grid => Uint16 index path works on WebGL1.
    const L=56,O=84,P=[],N=[],U=[],I=[];
    for(let y=0;y<=L;y++){
      const v=y/L,ph=v*Math.PI,cp=Math.cos(ph),sp=Math.sin(ph);
      for(let x=0;x<=O;x++){
        const u=x/O,th=u*Math.PI*2,ct=Math.cos(th),st=Math.sin(th);
        const px=sp*ct,py=cp,pz=sp*st;
        P.push(px,py,pz);N.push(px,py,pz);U.push(u,1-v);
      }
    }
    for(let y=0;y<L;y++)for(let x=0;x<O;x++){
      const a=y*(O+1)+x,b=a+1,c=a+O+1,d=c+1;I.push(a,c,b,b,c,d);
    }
    const makeBuf=(target,data)=>{const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,data,gl.STATIC_DRAW);return b;};
    const bp=makeBuf(gl.ARRAY_BUFFER,new Float32Array(P)),bn=makeBuf(gl.ARRAY_BUFFER,new Float32Array(N)),bu=makeBuf(gl.ARRAY_BUFFER,new Float32Array(U)),bi=makeBuf(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(I));
    const bind=(b,a,n)=>{gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,n,gl.FLOAT,false,0,0);};
    const ap=gl.getAttribLocation(pr,'a'),an=gl.getAttribLocation(pr,'n'),au=gl.getAttribLocation(pr,'u');bind(bp,ap,3);bind(bn,an,3);bind(bu,au,2);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,bi);
    const up=gl.getUniformLocation(pr,'p'),uv=gl.getUniformLocation(pr,'v'),um=gl.getUniformLocation(pr,'m'),ush=gl.getUniformLocation(pr,'shift'),ut=gl.getUniformLocation(pr,'t');gl.uniform1i(ut,0);
    const tx=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tx);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([4,18,30,255]));
    const img=new Image();img.decoding='async';img.onload=()=>{try{gl.bindTexture(gl.TEXTURE_2D,tx);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);earth.classList.add('webgl-ready');}catch{canvas.style.display='none';}};img.onerror=()=>{canvas.style.display='none';};img.src='images/mmhvault-earth-v4.9.16.jpg';

    const perspective=(f,a,n,z)=>{const q=1/Math.tan(f/2),nf=1/(n-z);return new Float32Array([q/a,0,0,0,0,q,0,0,0,0,(z+n)*nf,-1,0,0,2*z*n*nf,0]);};
    const rx=t=>new Float32Array([1,0,0,0,0,Math.cos(t),Math.sin(t),0,0,-Math.sin(t),Math.cos(t),0,0,0,0,1]);
    const ry=t=>new Float32Array([Math.cos(t),0,-Math.sin(t),0,0,1,0,0,Math.sin(t),0,Math.cos(t),0,0,0,0,1]);
    const mul=(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;};
    const resize=()=>{const r=canvas.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,1.6);canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));gl.viewport(0,0,canvas.width,canvas.height);};
    if('ResizeObserver' in window)new ResizeObserver(resize).observe(canvas);window.addEventListener('resize',resize,{passive:true});resize();
    const io=new IntersectionObserver(es=>{host.dataset.paused=es[0]&&es[0].isIntersecting===false?'1':'0';},{threshold:.02});io.observe(host);

    let last=performance.now(),earthAngle=0,shift=0;
    const frame=now=>{
      const dt=Math.min(50,Math.max(0,now-last));last=now;
      if(host.dataset.paused!=='1'&&motionOK){earthAngle += dt*0.00027; shift += dt*0.000035;}
      if(host.dataset.paused!=='1'){
        gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
        gl.uniformMatrix4fv(up,false,perspective(Math.PI/3.08,canvas.width/canvas.height,.1,8));
        gl.uniformMatrix4fv(uv,false,new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,-3.0,1]));
        gl.uniformMatrix4fv(um,false,mul(ry(earthAngle),rx(Math.sin(now*.00018)*.012)));
        gl.uniform1f(ush,shift);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tx);gl.drawElements(gl.TRIANGLES,I.length,gl.UNSIGNED_SHORT,0);
        if(motionOK){
          satellites.forEach(s=>{
            const a=s.phase+now*0.00025*s.speed;
            const x=50+Math.cos(a)*50,y=50+Math.sin(a)*50;
            s.el.style.left=`${x.toFixed(2)}%`;s.el.style.top=`${y.toFixed(2)}%`;
          });
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }else{
    canvas.style.display='none';
  }
})();
