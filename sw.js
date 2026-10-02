/* MMHVAULT v1.2.2 PWA rollback retirement worker */
'use strict';
self.addEventListener('install',event=>{
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    try{
      const keys=await caches.keys();
      await Promise.allSettled(keys.filter(k=>k.startsWith('mmhvault-')).map(k=>caches.delete(k)));
    }catch(_e){}
    try{await self.registration.unregister();}catch(_e){}
    try{
      const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
      for(const client of clients){try{client.postMessage({type:'MMHVAULT_SW_RETIRED'});}catch(_e){}}
    }catch(_e){}
  })());
});
self.addEventListener('fetch',()=>{});
