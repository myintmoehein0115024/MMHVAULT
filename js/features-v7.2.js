/* MMHVAULT FEATURES v7.2 — live planetary rotation + orbiting satellites */
(()=>{
  const host=document.querySelector('.future-features .feature-architecture-v65');
  const canvas=document.getElementById('feature-earth-canvas');
  const earth=document.querySelector('.future-features .arch65-earth');
  if(!host||!canvas||!earth)return;
  host.classList.add('arch-v72-live');
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motionOK=!reduce;

  const orbitEls=[...host.querySelectorAll('.arch65-orbit')];
  orbitEls.forEach((el,i)=>{
    el.dataset.orbitIndex=String(i);
    el.querySelectorAll('.arch65-satellite').forEach(n=>n.remove());
  });

  const satSpecs=[
    {orbit:orbitEls[0],phase:.25,speed:.78,cls:'arch65-satellite arch65-sat-cyan'},
    {orbit:orbitEls[0],phase:3.40,speed:.78,cls:'arch65-satellite arch65-sat-cyan'},
    {orbit:orbitEls[1],phase:1.20,speed:.58,cls:'arch65-satellite arch65-sat-gold'},
    {orbit:orbitEls[1],phase:4.40,speed:.58,cls:'arch65-satellite arch65-sat-gold'},
    {orbit:orbitEls[2],phase:2.10,speed:.44,cls:'arch65-satellite arch65-sat-cyan'}
  ];
  const satellites=satSpecs.map(s=>{
    const el=document.createElement('span');
    el.className=s.cls;
    s.orbit.appendChild(el);
    return {...s,el};
  });

  // Keep card tilt extremely subtle; cards never receive a large Z jump.
  if(motionOK){
    host.querySelectorAll('.arch65-card').forEach(card=>{
      card.addEventListener('pointermove',e=>{
        const r=card.getBoundingClientRect();
        const x=((e.clientX-r.left)/Math.max(1,r.width)-.5);
        const y=((e.clientY-r.top)/Math.max(1,r.height)-.5);
        card.style.setProperty('--card-rx',`${(-y*.32).toFixed(2)}deg`);
        card.style.setProperty('--card-ry',`${(x*.32).toFixed(2)}deg`);
      },{passive:true});
      card.addEventListener('pointerleave',()=>{
        card.style.removeProperty('--card-rx');
        card.style.removeProperty('--card-ry');
      },{passive:true});
    });
  }

  let gl=null;
  try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:false});}catch{}
  let paused=false,last=0,earthAngle=0,orbitT=0,textureReady=false;

  const setFallback=()=>{
    earth.dataset.fallback='1';
    canvas.style.display='none';
    earth.classList.remove('webgl-ready');
  };

  const mat4Mul=(a,b)=>{
    const o=new Float32Array(16);
    for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
    return o;
  };
  const perspective=(f,a,n,z)=>{const q=1/Math.tan(f/2),nf=1/(n-z);return new Float32Array([q/a,0,0,0,0,q,0,0,0,0,(z+n)*nf,-1,0,0,2*z*n*nf,0]);};
  const rx=t=>new Float32Array([1,0,0,0,0,Math.cos(t),Math.sin(t),0,0,-Math.sin(t),Math.cos(t),0,0,0,0,1]);
  const ry=t=>new Float32Array([Math.cos(t),0,-Math.sin(t),0,0,1,0,0,Math.sin(t),0,Math.cos(t),0,0,0,0,1]);

  if(gl){
    const vs=`attribute vec3 a;attribute vec3 n;attribute vec2 u;uniform mat4 p;uniform mat4 v;uniform mat4 m;varying vec3 N;varying vec2 U;varying vec3 P;void main(){vec4 q=m*vec4(a,1.0);N=mat3(m)*n;U=u;P=q.xyz;gl_Position=p*v*q;}`;
    const fs=`precision mediump float;varying vec3 N;varying vec2 U;varying vec3 P;uniform sampler2D t;uniform float r;void main(){vec3 nn=normalize(N);vec3 light=normalize(vec3(-0.35,0.62,0.8));float diff=max(dot(nn,light),0.0);float rim=pow(max(1.0-dot(nn,vec3(0.0,0.0,1.0)),2.2);vec2 uv=vec2(fract(U.x+r),U.y);vec3 tex=texture2D(t,uv).rgb;vec3 col=tex*(0.20+1.08*diff);col+=vec3(0.01,0.07,0.13)*rim;float edge=smoothstep(0.70,0.98,length(P.xy));col+=vec3(0.02,0.12,0.18)*rim*(1.0-edge*0.35);gl_FragColor=vec4(col,1.0);}`;
    const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return gl.getShaderParameter(s,gl.COMPILE_STATUS)?s:null;};
    const sv=shader(gl.VERTEX_SHADER,vs),sf=shader(gl.FRAGMENT_SHADER,fs);
    if(sv&&sf){
      const pr=gl.createProgram();gl.attachShader(pr,sv);gl.attachShader(pr,sf);gl.linkProgram(pr);
      if(gl.getProgramParameter(pr,gl.LINK_STATUS)){
        gl.useProgram(pr);
        const L=56,O=84,P=[],N=[],U=[],I=[];
        for(let y=0;y<=L;y++){const v=y/L,ph=v*Math.PI,cp=Math.cos(ph),sp=Math.sin(ph);for(let x=0;x<=O;x++){const u=x/O,th=u*Math.PI*2,ct=Math.cos(th),st=Math.sin(th);const px=sp*ct,py=cp,pz=sp*st;P.push(px,py,pz);N.push(px,py,pz);U.push(u,1-v);}}
        for(let y=0;y<L;y++)for(let x=0;x<O;x++){const a=y*(O+1)+x,b=a+1,c=a+O+1,d=c+1;I.push(a,c,b,b,c,d);}
        const makeBuf=(target,data)=>{const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,data,gl.STATIC_DRAW);return b;};
        const bp=makeBuf(gl.ARRAY_BUFFER,new Float32Array(P));
        const bn=makeBuf(gl.ARRAY_BUFFER,new Float32Array(N));
        const bu=makeBuf(gl.ARRAY_BUFFER,new Float32Array(U));
        const bi=makeBuf(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(I));
        const bind=(b,a,n)=>{gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,n,gl.FLOAT,false,0,0);};
        const ap=gl.getAttribLocation(pr,'a'),an=gl.getAttribLocation(pr,'n'),au=gl.getAttribLocation(pr,'u');
        bind(bp,ap,3);bind(bn,an,3);bind(bu,au,2);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,bi);
        const up=gl.getUniformLocation(pr,'p'),uv=gl.getUniformLocation(pr,'v'),um=gl.getUniformLocation(pr,'m'),ur=gl.getUniformLocation(pr,'r'),ut=gl.getUniformLocation(pr,'t');
        gl.uniform1i(ut,0);
        const tx=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tx);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([4,18,30,255]));
        const img=new Image();img.decoding='async';img.onload=()=>{try{gl.bindTexture(gl.TEXTURE_2D,tx);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);textureReady=true;earth.classList.add('webgl-ready');}catch{setFallback();}};img.onerror=setFallback;img.src='images/mmhvault-earth-v4.9.16.jpg';
        const resize=()=>{const r=canvas.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,1.6);canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));gl.viewport(0,0,canvas.width,canvas.height);};
        new ResizeObserver(resize).observe(canvas);resize();
        new IntersectionObserver(es=>{paused=!es[0].isIntersecting;},{threshold:.05}).observe(host);

        const updateOrbit=(el,index,t)=>{
          const configs=[
            {rx:66,ry:-16,rz:-14,s:0.72},
            {rx:63,ry:15,rz:18,s:-0.56},
            {rx:11,ry:70,rz:-12,s:0.38}
          ];
          const q=configs[index];
          el.style.transform=`translate3d(-50%,-50%,0) rotateX(${q.rx}deg) rotateY(${q.ry}deg) rotateZ(${(q.rz+t*q.s)%360}deg)`;
        };

        const frame=ms=>{
          const dt=Math.min(40,Math.max(0,ms-last||16));last=ms;
          if(!paused){
            if(motionOK){earthAngle+=dt*0.00072;orbitT+=dt*0.00155;}
            if(textureReady){
              gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
              gl.uniformMatrix4fv(up,false,perspective(Math.PI/3.12,canvas.width/canvas.height,.1,8));
              gl.uniformMatrix4fv(uv,false,new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,-3.02,1]));
              gl.uniformMatrix4fv(um,false,mat4Mul(ry(earthAngle),rx(Math.sin(orbitT*.33)*.025)));
              gl.uniform1f(ur,earthAngle); // IMPORTANT: actually advances the texture longitude.
              gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tx);
              gl.drawElements(gl.TRIANGLES,I.length,gl.UNSIGNED_SHORT,0);
            }
            if(motionOK){
              orbitEls.forEach((el,i)=>updateOrbit(el,i,orbitT));
              satellites.forEach(s=>{
                const a=s.phase+orbitT*(s.speed*0.9);
                const x=50+Math.cos(a)*50;
                const y=50+Math.sin(a)*50;
                s.el.style.left=`${x.toFixed(2)}%`;s.el.style.top=`${y.toFixed(2)}%`;
                s.el.style.transform=`scale(${(0.86+0.18*(0.5+0.5*Math.sin(a*1.7))).toFixed(2)})`;
              });
            }
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }else setFallback();
    }else setFallback();
  }else setFallback();

  if(!gl){
    orbitEls.forEach((el,i)=>{el.style.animation=`f72-glint-a ${6+i*1.3}s linear infinite`;});
  }
})();
