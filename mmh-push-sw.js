/* MMHVAULT Notification 2.0 · Push-only Service Worker v1.12.3
   No fetch interception, no page cache, no navigation controller logic. */
const clamp=(value,max)=>String(value??'').slice(0,max);
function safeTarget(raw){
  const fallback=new URL('./app.html',self.registration.scope);
  try{
    const scope=new URL(self.registration.scope);
    const target=new URL(raw||fallback.href,self.registration.scope);
    if(target.origin!==scope.origin||!target.pathname.startsWith(scope.pathname))return fallback.href;
    return target.href;
  }catch(_e){return fallback.href}
}
self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}
  catch(_e){try{data={body:event.data?.text?.()||''}}catch(_){data={}}}
  const title=clamp(data.title||'MMHVAULT',120);
  const options={
    body:clamp(data.body||'',240),
    icon:new URL('./images/icon-192.png',self.registration.scope).href,
    badge:new URL('./images/icon-192.png',self.registration.scope).href,
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
        const clientURL=new URL(client.url),targetURL=new URL(target),scopeURL=new URL(self.registration.scope);
        if(clientURL.origin===targetURL.origin&&clientURL.pathname.startsWith(scopeURL.pathname)){
          if('navigate'in client)await client.navigate(target);
          await client.focus();
          return;
        }
      }catch(_e){}
    }
    await self.clients.openWindow(target);
  })());
});
