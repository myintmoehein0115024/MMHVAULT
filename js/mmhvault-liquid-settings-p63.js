/* MMHVAULT Settings P6.3: a compact, progressive-feedback tab navigation.
   The original feedback form, list, RPC, pagination and existing toggle
   remain the owners of all data and operations. No requests are made here. */
(() => {
  'use strict';
  const feedbackId='stPage_feedback';
  let watcher=null;
  let installed=false;
  const lang=()=>{try{return localStorage.getItem('mmhvault_language_v3363')==='zh'?'zh':'en'}catch(_){return 'en'}};
  function enhance() {
    if(installed)return true;
    const page=document.getElementById(feedbackId);
    if(!page)return false;
    const header=page.querySelector(':scope > .st-page-head');
    const compose=page.querySelector(':scope > .fb-compose-v136');
    const history=page.querySelector(':scope > .fb-my-panel-v136');
    const original=page.querySelector('#fbMyToggleV136');
    if(!header||!compose||!history||!original)return false;
    if(page.querySelector('#mmhFeedbackTabsP63')){installed=true;return true;}
    const tabs=document.createElement('div');
    tabs.id='mmhFeedbackTabsP63';
    tabs.className='mmh-fb-tabs-p63';
    tabs.setAttribute('role','tablist');
    tabs.setAttribute('aria-label','Feedback views');
    const specs=[['compose','New feedback','新建反馈'],['history','My feedback','我的反馈']];
    const buttons={};
    for(const [name,en,zh] of specs){
      const b=document.createElement('button');
      b.type='button';
      b.id='mmhFeedbackTabP63_'+name;
      b.dataset.en=en;b.dataset.zh=zh;
      b.setAttribute('role','tab');
      b.setAttribute('aria-controls',name==='compose'?compose.id||'fbFormV14':'fbMyBodyV136');
      b.textContent=lang()==='zh'?zh:en;
      tabs.appendChild(b);
      buttons[name]=b;
    }
    function updateView(name){
      page.dataset.mmhFeedbackView=name;
      for(const key of Object.keys(buttons)){
        const selected=key===name;
        buttons[key].setAttribute('aria-selected',String(selected));
        buttons[key].tabIndex=selected?0:-1;
      }
    }
    function select(name){
      const shouldOpen=name==='history';
      if((original.getAttribute('aria-expanded')==='true')!==shouldOpen){
        original.click(); // triggers original feedback loading / state logic
      }
      updateView(name);
    }
    buttons.compose.addEventListener('click',()=>select('compose'));
    buttons.history.addEventListener('click',()=>select('history'));
    tabs.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
      event.preventDefault();
      const other=page.dataset.mmhFeedbackView==='history'?'compose':'history';
      select(other);buttons[other].focus();
    });
    header.insertAdjacentElement('afterend',tabs);
    original.addEventListener('click',()=>{
      // Existing onclick updates aria-expanded synchronously.
      updateView(original.getAttribute('aria-expanded')==='true'?'history':'compose');
    });
    new MutationObserver(()=>{
      updateView(original.getAttribute('aria-expanded')==='true'?'history':'compose');
    }).observe(original,{attributes:true,attributeFilter:['aria-expanded']});
    const translate=()=>{
      const selected=lang();
      for(const b of Object.values(buttons))b.textContent=b.dataset[selected];
      tabs.setAttribute('aria-label',selected==='zh'?'反馈视图':'Feedback views');
    };
    ['languagechange','mmhvault-language-change'].forEach(e=>window.addEventListener(e,translate));
    translate();
    updateView(original.getAttribute('aria-expanded')==='true'?'history':'compose');
    installed=true;
    return true;
  }
  if(enhance())return;
  const start=()=>{
    if(enhance())return;
    // Observe until the feedback module is dynamically created; disconnect immediately.
    watcher=new MutationObserver(()=>{if(enhance()){watcher.disconnect();watcher=null;}});
    watcher.observe(document.body,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
