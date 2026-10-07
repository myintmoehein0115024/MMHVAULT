/* MMHVAULT Notification 2.0 · Push-only Service Worker v1.12.8
   Dedicated registration scope: ./mmh-push-scope/
   No fetch interception, no page cache, no navigation controller logic. */
const clamp=(value,max)=>String(value??'').slice(0,max);
const APP_BASE=new URL('./',self.location.href);
const APP_URL=new URL('app.html',APP_BASE);
const ICON_URL=new URL('images/icon-192.png',APP_BASE).href;
function safeTarget(raw){
  try{
    const target=new URL(raw||APP_URL.href,APP_URL.href);
    /* Push notifications may only reopen the authenticated Personal app entrypoint.
       Query/hash are allowed for the alert deep-link; other MMHVAULT pages are not. */
    if(target.origin!==APP_URL.origin||target.pathname!==APP_URL.pathname)return APP_URL.href;
    return target.href;
  }catch(_e){return APP_URL.href}
}
self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}
  catch(_e){try{data={body:event.data?.text?.()||''}}catch(_){data={}}}
  const title=clamp(data.title||'MMHVAULT',120);
  const options={
    body:clamp(data.body||'',240),
    icon:ICON_URL,
    badge:ICON_URL,
    tag:clamp(data.tag||data.alert_id||'mmhvault-financial-alert',180),
    renotify:false,
    data:{
      url:safeTarget(data.url),
      alert_id:clamp(data.alert_id||'',80),
      target_page:clamp(data.target_page||'',80),
      severity:clamp(data.severity||'info',24)
    }
  };
  const work=[self.registration.showNotification(title,options)];
  try{if(typeof self.navigator?.setAppBadge==='function')work.push(self.navigator.setAppBadge(Math.max(1,Math.min(99,Number(data.app_badge||1)||1))))}catch(_e){}
  event.waitUntil(Promise.allSettled(work));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const payload=event.notification.data||{};
  const target=safeTarget(payload.url);
  event.waitUntil((async()=>{
    try{if(typeof self.navigator?.clearAppBadge==='function')await self.navigator.clearAppBadge()}catch(_e){}
    const wins=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of wins){
      try{
        const clientURL=new URL(client.url),targetURL=new URL(target);
        if(clientURL.origin===APP_URL.origin&&clientURL.pathname===APP_URL.pathname){
          if('navigate'in client&&clientURL.href!==targetURL.href)await client.navigate(target);
          await client.focus();
          return;
        }
      }catch(_e){}
    }
    await self.clients.openWindow(target);
  })());
});
