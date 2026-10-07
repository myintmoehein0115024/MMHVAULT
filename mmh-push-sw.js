/* MMHVAULT Notification 2.0 · Push-only Service Worker v1.12.3
   No fetch interception, no page cache, no navigation controller logic. */
self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}
  catch(_e){try{data={body:event.data?.text?.()||''}}catch(_){data={}}}
  const title=String(data.title||'MMHVAULT');
  const options={
    body:String(data.body||''),
    icon:new URL('./images/icon-192.png',self.registration.scope).href,
    badge:new URL('./images/icon-192.png',self.registration.scope).href,
    tag:String(data.tag||data.alert_id||'mmhvault-financial-alert'),
    renotify:false,
    data:{
      url:data.url||new URL('./app.html',self.registration.scope).href,
      alert_id:data.alert_id||'',
      target_page:data.target_page||'',
      severity:data.severity||'info'
    }
  };
  const work=[self.registration.showNotification(title,options)];
  try{if(typeof self.navigator?.setAppBadge==='function')work.push(self.navigator.setAppBadge(Number(data.app_badge||1)||1))}catch(_e){}
  event.waitUntil(Promise.allSettled(work));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const payload=event.notification.data||{};
  const target=new URL(payload.url||'./app.html',self.registration.scope).href;
  event.waitUntil((async()=>{
    try{if(typeof self.navigator?.clearAppBadge==='function')await self.navigator.clearAppBadge()}catch(_e){}
    const wins=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of wins){
      try{
        if(new URL(client.url).origin===new URL(target).origin){
          if('navigate'in client)await client.navigate(target);
          await client.focus();
          return;
        }
      }catch(_e){}
    }
    await self.clients.openWindow(target);
  })());
});
