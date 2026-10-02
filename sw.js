/* MMHVAULT v1.2.4 Loading-Recovery Service Worker */
'use strict';
const VERSION='1.2.4-loading-recovery';
const PREFIX='mmhvault-';
const CACHE=`${PREFIX}safe-${VERSION}`;
const FALLBACK='./app.html';
const PRECACHE=['./app.html','./login.html','./index.html','./css/mmhvault.css','./images/icon-192.png','./images/icon-512.png','./images/mmhvault-logo-transparent.png','./images/mmhvault-bg-v342.webp','./other/manifest.webmanifest'];
const isPrivate=req=>{try{const u=new URL(req.url);return u.hostname.endsWith('.supabase.co')||!!req.headers.get('authorization')||!!req.headers.get('apikey')}catch(_){return true}};
async function safePut(cache,req,res){try{if(res&&res.ok&&res.type!=='opaque')await cache.put(req,res.clone())}catch(_){}}
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil((async()=>{const c=await caches.open(CACHE);await Promise.allSettled(PRECACHE.map(async p=>{try{const req=new Request(p,{cache:'reload'});const res=await fetch(req);if(res.ok)await c.put(req,res.clone())}catch(_){}}))})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})())});
async function networkFirst(req,fallback=false){const c=await caches.open(CACHE);try{const res=await fetch(req,{cache:'no-cache'});await safePut(c,req,res);return res}catch(_){const hit=await c.match(req,{ignoreSearch:false})||await c.match(req,{ignoreSearch:true});if(hit)return hit;if(fallback){const app=await c.match(FALLBACK,{ignoreSearch:true});if(app)return app}return Response.error()}}
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET'||isPrivate(req))return;const u=new URL(req.url);if(u.origin!==self.location.origin)return;if(req.mode==='navigate'){event.respondWith(networkFirst(req,true));return}if(['script','style','image','font','manifest'].includes(req.destination)||/\.(?:js|css|png|jpe?g|webp|svg|ico|woff2?|webmanifest)$/i.test(u.pathname))event.respondWith(networkFirst(req,false))});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
