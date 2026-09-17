/* MMHVAULT FEATURES v6.8 — vivid financial motion + reliable textured WebGL Earth */
(()=>{
  const host=document.querySelector('.future-features .feature-architecture-v65');
  const canvas=document.getElementById('feature-earth-canvas');
  const earth=document.querySelector('.future-features .arch65-earth');
  if(!host||!canvas||!earth) return;

  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motionOK=!reduce;
  const orbitEls=[...host.querySelectorAll('.arch65-orbit')];
  orbitEls.forEach(el=>el.dataset.js='1');
  const flowDots=[...host.querySelectorAll('.arch65-flow-dot')];
  const flowSeeds=flowDots.map((_,i)=>({phase:i*1.03, speed:0.18+(i%3)*0.035, rx:29+(i%3)*4, ry:27+(i%2)*5, cx:50, cy:50}));

  // Subtle pointer depth, intentionally capped to avoid the previous large jump.
  let targetX=0,targetY=0,curX=0,curY=0;
  host.addEventListener('pointermove',e=>{
    const r=host.getBoundingClientRect();
    targetX=((e.clientX-r.left)/Math.max(1,r.width)-.5);
    targetY=((e.clientY-r.top)/Math.max(1,r.height)-.5);
  },{passive:true});
  host.addEventListener('pointerleave',()=>{targetX=0;targetY=0;},{passive:true});

  // Keep six cards visually stable. The small tilt is driven via CSS vars so no z-jump occurs.
  if(motionOK){
    host.querySelectorAll('.arch65-card').forEach(card=>{
      card.addEventListener('pointermove',e=>{
        const r=card.getBoundingClientRect();
        const x=((e.clientX-r.left)/Math.max(1,r.width)-.5);
        const y=((e.clientY-r.top)/Math.max(1,r.height)-.5);
        card.style.setProperty('--card-rx',`${(-y*0.45).toFixed(2)}deg`);
        card.style.setProperty('--card-ry',`${(x*0.45).toFixed(2)}deg`);
      },{passive:true});
      card.addEventListener('pointerleave',()=>{
        card.style.removeProperty('--card-rx');
        card.style.removeProperty('--card-ry');
      },{passive:true});
    });
  }

  // WebGL path. Uint16 is sufficient for this sphere and works on WebGL1 without extension assumptions.
  let gl=null;
  try{ gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:false}); }catch{}

  let webglReady=false, earthAngle=0, orbitAngle=0, paused=false, last=0;

  const setFallback=()=>{
    earth.dataset.fallback='1';
    canvas.style.display='none';
  };

  const mat4Mul=(a,b)=>{
    const o=new Float32Array(16);
    for(let c=0;c<4;c++) for(let r=0;r<4;r++) o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
    return o;
  };
  const perspective=(f,a,n,z)=>{
    const q=1/Math.tan(f/2),nf=1/(n-z);
    return new Float32Array([q/a,0,0,0,0,q,0,0,0,0,(z+n)*nf,-1,0,0,2*z*n*nf,0]);
  };
  const ry=t=>new Float32Array([Math.cos(t),0,-Math.sin(t),0,0,1,0,0,Math.sin(t),0,Math.cos(t),0,0,0,0,1]);
  const rx=t=>new Float32Array([1,0,0,0,0,Math.cos(t),Math.sin(t),0,0,-Math.sin(t),Math.cos(t),0,0,0,0,1]);

  if(gl){
    const vs=`attribute vec3 a; attribute vec3 n; attribute vec2 u; uniform mat4 p; uniform mat4 v; uniform mat4 m; varying vec3 N; varying vec2 U; varying vec3 P; void main(){ vec4 q=m*vec4(a,1.0); N=mat3(m)*n; U=u; P=q.xyz; gl_Position=p*v*q; }`;
    const fs=`precision mediump float; varying vec3 N; varying vec2 U; varying vec3 P; uniform sampler2D t; uniform float r; void main(){ vec3 nn=normalize(N); vec3 light=normalize(vec3(-0.35,0.62,0.8)); float diff=max(dot(nn,light),0.0); float rim=pow(max(1.0-dot(nn,vec3(0.0,0.0,1.0)),2.2); vec2 uv=vec2(fract(U.x+r),U.y); vec3 tex=texture2D(t,uv).rgb; vec3 col=tex*(0.17+1.08*diff); col += vec3(0.01,0.07,0.13)*rim; float edge=smoothstep(0.70,0.98,length(P.xy)); col += vec3(0.02,0.12,0.18)*rim*(1.0-edge*0.40); gl_FragColor=vec4(col,1.0); }`;
    const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return gl.getShaderParameter(s,gl.COMPILE_STATUS)?s:null;};
    const pr=gl.createProgram();
    const sv=shader(gl.VERTEX_SHADER,vs),sf=shader(gl.FRAGMENT_SHADER,fs);
    if(sv&&sf){
      gl.attachShader(pr,sv);gl.attachShader(pr,sf);gl.linkProgram(pr);
      if(gl.getProgramParameter(pr,gl.LINK_STATUS)){
        gl.useProgram(pr);
        const L=64,O=96,P=[],N=[],U=[],I=[];
        for(let y=0;y<=L;y++){
          const v=y/L,ph=v*Math.PI,cp=Math.cos(ph),sp=Math.sin(ph);
          for(let x=0;x<=O;x++){
            const u=x/O,th=u*Math.PI*2,ct=Math.cos(th),st=Math.sin(th);
            const px=sp*ct,py=cp,pz=sp*st;P.push(px,py,pz);N.push(px,py,pz);U.push(u,1-v);
          }
        }
        for(let y=0;y<L;y++) for(let x=0;x<O;x++){
          const a=y*(O+1)+x,b=a+1,c=a+O+1,d=c+1;I.push(a,c,b,b,c,d);
        }
        const buffer=(target,data,usage=gl.STATIC_DRAW)=>{const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,data,usage);return b;};
        const bp=buffer(gl.ARRAY_BUFFER,new Float32Array(P));
        const bn=buffer(gl.ARRAY_BUFFER,new Float32Array(N));
        const bu=buffer(gl.ARRAY_BUFFER,new Float32Array(U));
        const bi=buffer(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(I));
        const indexType=gl.UNSIGNED_SHORT;
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
        // 1x1 placeholder keeps WebGL texture state complete before the photo arrives.
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([4,18,30,255]));
        const img=new Image(); img.decoding='async';
        let textureReady=false;
        img.onload=()=>{
          try{
            gl.bindTexture(gl.TEXTURE_2D,tx);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
            gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
            textureReady=true; webglReady=true; earth.classList.add('webgl-ready');
          }catch(err){console.warn('[MMHVAULT Features] texture upload failed',err);setFallback();}
        };
        img.onerror=()=>{console.warn('[MMHVAULT Features] globe texture failed to load');setFallback();};
        img.src='images/mmhvault-earth-v4.9.16.jpg';

        const resize=()=>{
          const r=canvas.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,1.65);
          canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));
          gl.viewport(0,0,canvas.width,canvas.height);
        };
        new ResizeObserver(resize).observe(canvas);resize();
        new IntersectionObserver(es=>{paused=!es[0].isIntersecting;},{threshold:.05}).observe(host);

        const drawOrbit=(el,base,speed,dir)=>{
          const x=base.x,y=base.y;
          const ang=base.z+orbitAngle*speed*dir;
          el.style.transform=`translate3d(-50%,-50%,0) rotateX(${x}deg) rotateY(${y}deg) rotateZ(${ang}deg)`;
        };

        const frame=ms=>{
          const dt=Math.min(40,Math.max(0,ms-last||16)); last=ms;
          if(!paused){
            if(motionOK){ earthAngle += dt*0.00020; orbitAngle += dt*0.00115; }
            curX+=(targetX-curX)*.055;curY+=(targetY-curY)*.055;
            if(textureReady){
              gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
              gl.uniformMatrix4fv(up,false,perspective(Math.PI/3.20,canvas.width/canvas.height,.1,8));
              gl.uniformMatrix4fv(uv,false,new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,-3.0,1]));
              gl.uniformMatrix4fv(um,false,mat4Mul(ry((motionOK?earthAngle:0)+curX*.16),rx(curY*.11)));
              gl.uniform1f(ur,motionOK?earthAngle*.035:0);
              gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tx);
              gl.drawElements(gl.TRIANGLES,I.length,indexType,0);
            }
            if(motionOK){
              const tau=ms*0.001;
              flowDots.forEach((dot,i)=>{
                const s=flowSeeds[i];
                const a=s.phase+tau*s.speed;
                const x=s.cx+Math.cos(a)*s.rx;
                const y=s.cy+Math.sin(a)*s.ry;
                dot.style.left=x.toFixed(2)+'%';
                dot.style.top=y.toFixed(2)+'%';
                dot.style.transform=`translate(-50%,-50%) scale(${(0.72+0.42*(0.5+0.5*Math.sin(a*1.7))).toFixed(2)})`;
                dot.style.opacity=(0.46+0.46*(0.5+0.5*Math.sin(a*1.3))).toFixed(2);
              });
              drawOrbit(orbitEls[0],{x:66,y:10,z:-22},.38,1);
              drawOrbit(orbitEls[1],{x:62,y:-12,z:18},.30,-1);
              drawOrbit(orbitEls[2],{x:8,y:68,z:-14},.22,1);
            }else{
              flowDots.forEach((dot,i)=>{
                dot.style.left=(30+i*8)+'%';
                dot.style.top=(22+(i%3)*26)+'%';
                dot.style.transform='translate(-50%,-50%) scale(.82)';
                dot.style.opacity='.55';
              });
            }
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }else setFallback();
    }else setFallback();
  }else setFallback();

  // CSS fallback: gently rotate the stage while retaining the map image clipped inside the sphere.
  if(!gl || !webglReady){
    let raf=0, t=0;
    const fallbackFrame=ms=>{
      if(!earth.dataset.fallback){raf=requestAnimationFrame(fallbackFrame);return;}
      t=ms*.0001;
      if(motionOK){earth.style.transform=`translate(-50%,-50%) rotateZ(${Math.sin(t)*1.1}deg)`;}
      raf=requestAnimationFrame(fallbackFrame);
    };
    raf=requestAnimationFrame(fallbackFrame);
  }
})();
