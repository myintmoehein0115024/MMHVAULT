// MMHVAULT v4.9.19 — CPU canvas sphere projection, no WebGL, no fetch.
(() => {
  const host = document.querySelector('.mmh-home-earth-v4-9-17');
  if (!host) return;
  const canvas = host.querySelector('.earth-canvas');
  const texture = host.querySelector('.earth-texture');
  if (!canvas || !texture) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 360, H = 360, radius = 170, mapData = null, mapW = 0, mapH = 0;
  let start = performance.now(), spin = 0, dpr = 1, raf = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    const box = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.max(220, Math.round(box.width * dpr));
    H = Math.max(220, Math.round(box.height * dpr));
    canvas.width = W; canvas.height = H;
    radius = Math.min(W,H) * 0.455;
  }

  function loadTexture() {
    if (!texture.complete || !texture.naturalWidth) return false;
    const oc = document.createElement('canvas');
    oc.width = texture.naturalWidth; oc.height = texture.naturalHeight;
    const ox = oc.getContext('2d');
    if (!ox) return false;
    ox.drawImage(texture,0,0);
    try { mapData = ox.getImageData(0,0,oc.width,oc.height).data; }
    catch (e) { return false; }
    mapW = oc.width; mapH = oc.height;
    texture.style.display = 'none';
    return true;
  }

  function drawEarth(t) {
    if (!mapData && !loadTexture()) {
      raf = requestAnimationFrame(drawEarth); return;
    }
    const img = ctx.createImageData(W,H);
    const out = img.data;
    const cx = W/2, cy = H/2;
    const r = radius;
    const yaw = (reduce ? 0.65 : (t-start)*0.00034) + pointer.x*0.08;
    const pitch = pointer.y*0.10;
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);

    for (let y=0; y<H; y++) {
      const ny = (y-cy)/r;
      for (let x=0; x<W; x++) {
        const nx = (x-cx)/r;
        const rr = nx*nx + ny*ny;
        if (rr > 1) continue;
        const nz = Math.sqrt(1-rr);

        // Rotate sphere in 3D (yaw + subtle pitch).
        let px = nx*cosY + nz*sinY;
        let pz = -nx*sinY + nz*cosY;
        let py = ny*cosP - pz*sinP;
        pz = ny*sinP + pz*cosP;

        // Equirectangular UV mapping.
        let lon = Math.atan2(px,pz) / (Math.PI*2) + 0.5;
        let lat = 0.5 - Math.asin(Math.max(-1,Math.min(1,py))) / Math.PI;
        lon = lon - Math.floor(lon);
        const sx = Math.min(mapW-1, Math.max(0, Math.floor(lon*mapW)));
        const sy = Math.min(mapH-1, Math.max(0, Math.floor(lat*mapH)));
        const si = (sy*mapW+sx)*4;
        const oi = (y*W+x)*4;

        // Directional lighting: cool blue key light from upper-left, warm low fill.
        const lx = -0.36, ly = -0.28, lz = 0.88;
        const dot = Math.max(0, nx*lx + ny*ly + nz*lz);
        const rim = Math.pow(Math.max(0,1-nz),2.7);
        const night = 0.14 + dot*0.95;
        const warm = rim*0.16;
        const noise = ((x*13 + y*7) & 7) * 0.35;

        let rrC = mapData[si] * (night + warm) + 5 + noise;
        let ggC = mapData[si+1] * (night + warm) + 8 + noise;
        let bbC = mapData[si+2] * (night + warm) + 12 + noise;

        // Boost warm city lights already present in the texture.
        const lum = (mapData[si]*0.2126 + mapData[si+1]*0.7152 + mapData[si+2]*0.0722)/255;
        const city = Math.max(0, lum-0.58) * (1-dot) * 1.65;
        rrC += 110*city; ggC += 78*city; bbC += 28*city;

        out[oi]   = Math.max(0,Math.min(255,rrC));
        out[oi+1] = Math.max(0,Math.min(255,ggC));
        out[oi+2] = Math.max(0,Math.min(255,bbC));
        out[oi+3] = 255;
      }
    }
    ctx.clearRect(0,0,W,H);
    ctx.putImageData(img,0,0);

    // Atmospheric rim and subtle terminator glow.
    const grad = ctx.createRadialGradient(cx-r*0.2,cy-r*0.3,r*0.45,cx,cy,r*1.08);
    grad.addColorStop(0,'rgba(255,255,255,0)');
    grad.addColorStop(0.72,'rgba(62,170,245,0.02)');
    grad.addColorStop(0.91,'rgba(77,186,255,0.12)');
    grad.addColorStop(0.985,'rgba(123,220,255,0.42)');
    grad.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(cx,cy,r*1.01,0,Math.PI*2); ctx.fill();

    raf = requestAnimationFrame(drawEarth);
  }

  function onMove(e){
    const r=host.getBoundingClientRect();
    pointer.tx=((e.clientX-r.left)/r.width-0.5)*2;
    pointer.ty=((e.clientY-r.top)/r.height-0.5)*2;
  }
  function animatePointer(){
    pointer.x += (pointer.tx-pointer.x)*0.05;
    pointer.y += (pointer.ty-pointer.y)*0.05;
    requestAnimationFrame(animatePointer);
  }
  host.addEventListener('pointermove',onMove,{passive:true});
  host.addEventListener('pointerleave',()=>{pointer.tx=0;pointer.ty=0},{passive:true});
  window.addEventListener('resize',resize,{passive:true});
  // Watch the host, not only the canvas. The canvas can report its first size
  // before the surrounding Hero grid has completed its initial layout.
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => resize());
    ro.observe(host);
  }
  texture.addEventListener('load',()=>{loadTexture();resize();});
  const stabilize = () => { resize(); requestAnimationFrame(() => { resize(); requestAnimationFrame(resize); }); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(stabilize);
  stabilize();
  animatePointer(); drawEarth(performance.now());
})();
