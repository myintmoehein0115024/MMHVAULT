/* MMHVAULT V4.0 Unified Experience Foundation */
(function(){
  const api={};
  function stack(){let s=document.querySelector('.mmh-v4-toast-stack');if(!s){s=document.createElement('div');s.className='mmh-v4-toast-stack';document.body.appendChild(s)}return s}
  api.toast=function(title,message,type='success',duration=3200){
    const el=document.createElement('div');el.className='mmh-v4-toast '+type;
    el.innerHTML='<div class="mmh-v4-toast-title"></div><div class="mmh-v4-toast-message"></div>';
    el.querySelector('.mmh-v4-toast-title').textContent=title||'';
    el.querySelector('.mmh-v4-toast-message').textContent=message||'';
    stack().appendChild(el);
    const close=()=>{el.classList.add('out');setTimeout(()=>el.remove(),230)};
    if(duration>0)setTimeout(close,duration);return {close,element:el};
  };
  api.confirm=function({title,message,confirmText='Confirm',cancelText='Cancel',danger=false}={}){
    return new Promise(resolve=>{
      const bg=document.createElement('div');bg.className='mmh-v4-modal-backdrop';
      const box=document.createElement('div');box.className='mmh-v4-modal';
      box.innerHTML='<h3></h3><p></p><div class="mmh-v4-modal-actions"><button class="cancel"></button><button class="primary"></button></div>';
      box.querySelector('h3').textContent=title||'';box.querySelector('p').textContent=message||'';
      const ok=box.querySelector('.primary');ok.textContent=confirmText; if(danger){ok.classList.remove('primary');ok.classList.add('danger')}
      const cancel=box.querySelector('.cancel');cancel.textContent=cancelText;
      const done=v=>{bg.remove();resolve(v)};
      ok.addEventListener('click',()=>done(true),{once:true});cancel.addEventListener('click',()=>done(false),{once:true});
      bg.addEventListener('click',e=>{if(e.target===bg)done(false)});bg.appendChild(box);document.body.appendChild(bg);ok.focus();
    });
  };
  window.MMHV4=Object.assign(window.MMHV4||{},api);
  document.addEventListener('DOMContentLoaded',()=>document.documentElement.classList.add('mmh-v4-ready'),{once:true});
})();
