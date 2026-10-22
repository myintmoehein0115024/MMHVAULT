/* MMHVAULT Liquid Glass: opt-in custom in-page notices, no blocking browser prompts.
   Existing financial confirm/CRUD handlers are deliberately not monkey-patched. */
(()=>{'use strict';
 if(window.MMHVaultGlassV2)return;
 const translate=(en,zh)=>{try{return localStorage.getItem('mmhvault_language_v3363')==='zh'?zh:en}catch(_){return en}};
 function toast(message,{title='',tone='info',duration=4600}={}){
   if(!document.body)return;
   let host=document.getElementById('mmhGlassToastsV2');
   if(!host){host=document.createElement('div');host.id='mmhGlassToastsV2';host.setAttribute('role','region');host.setAttribute('aria-label','MMHVAULT notices');document.body.appendChild(host)}
   const item=document.createElement('div');item.className='mmh-glass-toast-v2';item.dataset.tone=['success','error','warning'].includes(tone)?tone:'info';item.setAttribute('role',tone==='error'?'alert':'status');
   const icon=document.createElement('b');icon.setAttribute('aria-hidden','true');icon.textContent=tone==='success'?'✓':tone==='error'?'!':tone==='warning'?'!':'✦';icon.style.cssText='font-size:20px;color:'+(tone==='success'?'#52ecc4':tone==='error'?'#ffa0a9':'#ffd27c');
   const copy=document.createElement('div');copy.style.flex='1';const head=document.createElement('strong');head.textContent=String(title||'MMHVAULT');const body=document.createElement('span');body.textContent=String(message||'');copy.append(head,body);
   const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label',translate('Dismiss notification','关闭提示'));close.onclick=()=>{clearTimeout(timer);item.remove();if(!host.childElementCount)host.remove()};
   item.append(icon,copy,close);host.append(item);while(host.childElementCount>3)host.firstElementChild?.remove();
   const timer=setTimeout(()=>close.click(),Math.max(1800,Math.min(20000,Number(duration)||4600)));
   return ()=>close.click();
 }
 async function confirm({title='',message='',danger=false}={}){
   // Use the trusted existing in-page modal; do not return a fake synchronous boolean.
   if(typeof window.mmhVaultOpenDialogV449==='function'){
     const yes=translate('Confirm','确认'),no=translate('Cancel','取消');
     return !!(await window.mmhVaultOpenDialogV449({title:title||'MMHVAULT',message,actions:[{label:no,onClick:()=>{window.mmhVaultCloseDialogV449?.();return false;}},{label:yes,className:danger?'danger':'primary',onClick:()=>true}]}));
   }
   return false; // fail closed for destructive or financial actions.
 }
 window.MMHVaultGlassV2=Object.freeze({toast,confirm});
})();
