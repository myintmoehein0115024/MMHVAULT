/* MMHVAULT v1.2.5 Boot Quarantine Service Worker
   Temporary safe shell: no application HTML/data caching and no fetch interception. */
'use strict';
const VERSION='1.2.5-boot-quarantine';
self.addEventListener('install',event=>{self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
  try{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('mmhvault-')).map(k=>caches.delete(k)));}catch(_){}
  await self.clients.claim();
})());});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
