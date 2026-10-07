/* MMHVAULT Notification 2.0 · Push-only Service Worker v1.12.2
   No fetch interception, no page cache, no navigation control. */
self.addEventListener('push',event=>{
  let data={};try{data=event.data?event.data.json():{}}catch(_e){try{data={body:event.data?.text?.()||''}}catch(_){data={}}}
  const title=String(data.title||'MMHVAULT');
  const options={body:String(data.body||''),icon:new URL('./images/icon-192.png',self.registration.scope).href,badge:new URL('./images/icon-192.png',self.registration.scope).href,tag:String(data.tag||data.alert_id||'mmhvault-financial-alert'),renotify:false,data:{url:data.url||new URL('./app.html',self.registration.scope).href,alert_id:data.alert_id||'',target_page:data.target_page||'',severity:data.severity||'info'}};
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();const payload=event.notification.data||{};const target=new URL(payload.url||'./app.html',self.registration.scope).href;
  event.waitUntil((async()=>{const wins=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of wins){try{if(new URL(client.url).origin===new URL(target).origin){if('navigate'in client)await client.navigate(target);await client.focus();return}}catch(_e){}}await self.clients.openWindow(target)})());
});
