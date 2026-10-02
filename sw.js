/* MMHVAULT v1.2.0 PWA Core Service Worker */
'use strict';
const VERSION='1.2.0-pwa-core-beta';
const CACHE_PREFIX='mmhvault-';
const SHELL_CACHE=`${CACHE_PREFIX}shell-${VERSION}`;
const RUNTIME_CACHE=`${CACHE_PREFIX}runtime-${VERSION}`;
const CDN_CACHE=`${CACHE_PREFIX}cdn-${VERSION}`;
const APP_FALLBACK='./app.html';
const PRECACHE=[
  './app.html',
  './index.html',
  './login.html',
  './css/mmhvault.css',
  './css/mmhvault-v4.css?v=4.3.0',
  './css/mmhvault-premium-motion.css?v=20260929-bg1',
  './js/mmhvault-v4.js?v=4.3.0',
  './js/mmhvault-premium-motion.js',
  './images/icon-192.png?v=4.3.0',
  './images/icon-512.png?v=4.3.0',
  './images/mmhvault-logo-transparent.png',
  './images/mmhvault-bg-v342.webp',
  './other/manifest.webmanifest'
];
const SAFE_CDN_HOSTS=new Set(['cdn.jsdelivr.net','unpkg.com']);
const PRIVATE_PATH_PARTS=['/rest/v1/','/auth/v1/','/storage/v1/','/functions/v1/','/realtime/v1/'];
const isPrivateRequest=req=>{
  try{const u=new URL(req.url);return !!req.headers.get('authorization')||PRIVATE_PATH_PARTS.some(p=>u.pathname.includes(p))}catch(_){return true}
};
const putSafe=async(cache,req,res)=>{try{if(res&&(res.ok||res.type==='opaque'))await cache.put(req,res.clone())}catch(_){}};

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(SHELL_CACHE);
    await Promise.allSettled(PRECACHE.map(async path=>{
      try{const req=new Request(path,{cache:'reload'}),res=await fetch(req);if(res.ok)await cache.put(req,res.clone())}catch(_){}
    }));
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)&&![SHELL_CACHE,RUNTIME_CACHE,CDN_CACHE].includes(k)).map(k=>caches.delete(k)));
    await self.clients.claim();
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    clients.forEach(c=>c.postMessage({type:'MMHVAULT_SW_ACTIVATED',version:VERSION}));
  })());
});

async function navigation(req){
  const cache=await caches.open(SHELL_CACHE);
  try{
    const res=await fetch(req);
    if(res.ok&&String(res.headers.get('content-type')||'').includes('text/html')){
      await putSafe(cache,req,res);
      const u=new URL(req.url);if(u.pathname.endsWith('/app.html'))await putSafe(cache,new Request(APP_FALLBACK),res);
    }
    return res;
  }catch(_){
    return (await cache.match(req,{ignoreSearch:true}))||(await cache.match(APP_FALLBACK,{ignoreSearch:true}))||Response.error();
  }
}

async function staleWhileRevalidate(req,cacheName){
  const cache=await caches.open(cacheName);
  const cached=await cache.match(req,{ignoreVary:false});
  const fresh=fetch(req).then(async res=>{await putSafe(cache,req,res);return res}).catch(()=>null);
  return cached||(await fresh)||Response.error();
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||isPrivateRequest(req))return;
  const url=new URL(req.url);
  if(req.mode==='navigate'&&url.origin===self.location.origin){event.respondWith(navigation(req));return}
  if(url.origin===self.location.origin){
    if(['script','style','image','font','manifest'].includes(req.destination)||/\.(?:js|css|png|jpe?g|webp|svg|ico|woff2?|webmanifest)$/i.test(url.pathname)){
      event.respondWith(staleWhileRevalidate(req,RUNTIME_CACHE));
    }
    return;
  }
  if(SAFE_CDN_HOSTS.has(url.hostname)&&['script','style','font'].includes(req.destination)){
    event.respondWith(staleWhileRevalidate(req,CDN_CACHE));
  }
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
  if(event.data?.type==='MMHVAULT_VERSION'&&event.source)event.source.postMessage({type:'MMHVAULT_VERSION',version:VERSION});
});
