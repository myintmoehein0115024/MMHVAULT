/* APP V11 · Private account photo persistence. NO account/balance/transaction writes.
 * Requires approved, owner-RLS-protected mmh_account_images_v11 table.
 * Offline/undeployed state safely retains device-local images with pending retries.
 */
(() => {
  'use strict';
  if(window.MMHAccountImageCloudV11)return;
  const TABLE='mmh_account_images_v11';
  const LIMIT=160000;
  const UID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const validId=id=>typeof id==='string'&&id.length>=1&&id.length<=120&&!/[\x00-\x1f<>]/.test(id);
  const validImage=image=>typeof image==='string'&&(image===''||(image.length<=LIMIT&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)));
  const uid=()=>typeof currentSessionUser==='undefined'?'':String(currentSessionUser?.id||'');
  const visualKey=id=>'mmhvault_account_visuals_v1_'+id;
  const pendingKey=id=>'mmhvault_account_photo_pending_v11_'+id;
  const accountIds=()=>new Set((typeof MMHVAULT_CONFIG==='undefined'?[]:MMHVAULT_CONFIG.accounts||[]).map(a=>String(a?.id||'')));
  const active=id=>UID.test(id)&&uid()===id&&typeof db!=='undefined';
  const readObject=k=>{try{const value=JSON.parse(localStorage.getItem(k)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch(_){return {}}};
  const readPending=id=>new Set(Object.keys(readObject(pendingKey(id))).filter(validId));
  const setPending=(id,accountId,enabled)=>{
    const items=readObject(pendingKey(id));
    if(enabled)items[accountId]=true;else delete items[accountId];
    try{localStorage.setItem(pendingKey(id),JSON.stringify(items))}catch(_){}
  };
  function status(message){
    const page=document.getElementById('accounts-page');
    if(!page)return;
    let node=document.getElementById('mmhAccountPhotoCloudStatusV11');
    if(!node){
      node=document.createElement('p');
      node.id='mmhAccountPhotoCloudStatusV11';
      node.setAttribute('role','status');
      node.style.cssText='margin:8px 0 14px;padding:11px 14px;border:1px solid rgba(213,176,100,.37);border-radius:12px;background:rgba(48,39,23,.42);color:#efce91;font-size:12px;line-height:1.6;';
      const header=page.querySelector('.ap-heading');
      if(header)header.after(node);else page.prepend(node);
    }
    node.textContent=message||'';
    node.hidden=!message;
  }
  async function verified(owner){
    if(!active(owner))return false;
    const {data,error}=await db.auth.getUser();
    return !error&&data?.user?.id===owner&&active(owner);
  }
  async function write(owner,id,image,insertOnly=false){
    if(!active(owner)||!validId(id)||!validImage(image)||!accountIds().has(id))return false;
    if(!await verified(owner))return false;
    const row={user_id:owner,account_id:id,image_data:image,updated_at:new Date().toISOString()};
    try{
      const opts={onConflict:'user_id,account_id'};
      if(insertOnly)opts.ignoreDuplicates=true;
      const {error}=await db.from(TABLE).upsert(row,opts);
      if(error)throw error;
      return active(owner);
    }catch(e){
      console.warn('[MMHVAULT] Account photo cloud storage unavailable; local photo retained.',e);
      return false;
    }
  }
  let epoch=0,loading=null,scheduled=0;
  async function save(owner,id,image) {
    if(!active(owner)||!validId(id)||!accountIds().has(id)||!validImage(image))return false;
    ++epoch;
    setPending(owner,id,true); // Local copy was written by Accounts before this call.
    const ok=await write(owner,id,image,false);
    if(ok&&active(owner)){
      setPending(owner,id,false);
      if(readPending(owner).size===0)status('');
    }else if(active(owner)){
      status('账户图片已保存在本机，但云端尚未同步。联网后将自动重试。');
    }
    return ok;
  }
  async function hydrate(owner) {
    if(!active(owner)||!await verified(owner))return false;
    const serial=epoch;
    let data;
    try{
      const response=await db.from(TABLE).select('account_id,image_data,updated_at').eq('user_id',owner).limit(500);
      if(response.error)throw response.error;
      data=Array.isArray(response.data)?response.data:[];
    }catch(e){
      // RLS table not yet deployed or network offline: do not alter browser photos.
      console.warn('[MMHVAULT] Account photo cloud read unavailable; using local photos.',e);
      return false;
    }
    if(!active(owner)||epoch!==serial)return false;
    const known=accountIds(),local=readObject(visualKey(owner)),pending=readPending(owner),remote=new Set();
    let changed=false;
    for(const row of data){
      const id=String(row?.account_id||''),image=row?.image_data;
      if(!known.has(id)||!validId(id)||!validImage(image))continue;
      remote.add(id);
      if(pending.has(id))continue; // User's unsynced recent edit must not be erased.
      const old=local[id]&&typeof local[id]==='object'?local[id]:{};
      if((old.image||'')!==image){local[id]={...old,image};changed=true}
    }
    if(changed){
      try{localStorage.setItem(visualKey(owner),JSON.stringify(local))}catch(e){console.warn('[MMHVAULT] Local image cache full.',e)}
      if(active(owner)){window.mmhAccountsRefreshV1?.();window.dispatchEvent(new CustomEvent('mmhvault:account-image-cloud-loaded',{detail:{ownerId:owner}}))}
    }
    // Retry explicit offline edits. Tombstones also sync (removed images stay removed).
    for(const id of pending){
      if(!active(owner)||epoch!==serial)return false;
      if(!known.has(id)){setPending(owner,id,false);continue}
      const image=String(local[id]?.image||'');
      if(!validImage(image))continue;
      if(await write(owner,id,image,false))setPending(owner,id,false);
    }
    // Adopt historical device-local photos only when the cloud row is absent.
    // ignoreDuplicates prevents accidentally overwriting another device's image.
    for(const [id,visual] of Object.entries(local)){
      if(!active(owner)||epoch!==serial)return false;
      if(!known.has(id)||remote.has(id)||pending.has(id))continue;
      const image=visual?.image;
      if(image&&validImage(image))await write(owner,id,image,true);
    }
    if(active(owner)&&readPending(owner).size===0)status('');
    return active(owner);
  }
  function schedule(){
    clearTimeout(scheduled);
    scheduled=setTimeout(()=>{
      const owner=uid();
      if(!active(owner)||document.hidden)return;
      if(loading){loading.finally(schedule);return}
      loading=hydrate(owner).finally(()=>{loading=null});
    },250);
  }
  window.MMHAccountImageCloudV11={save,hydrate,validImage,version:'1.0.0'};
  window.addEventListener('mmhvault:config-owner-changed',()=>{++epoch;clearTimeout(scheduled);schedule()});
  window.addEventListener('mmhvault:config-cloud-synced',schedule);
  window.addEventListener('mmhvault:data-loaded',schedule);
  window.addEventListener('online',schedule);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
