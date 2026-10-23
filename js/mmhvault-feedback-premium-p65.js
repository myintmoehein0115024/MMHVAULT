/* MMHVAULT P6.5 — Feedback Premium Liquid Glass
   Progressive enhancement of EXISTING Feedback form and history only.
   No database calls, money logic, authentication, storage changes or new submit handlers. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  let done=false;
  const zh=()=>{try{return localStorage.getItem('mmhvault_language_v3363')==='zh';}catch(_){return false;}};
  const T=(en,cn)=>zh()?cn:en;
  function copyElement(tag,cls,en,cn){const e=document.createElement(tag);e.className=cls;e.dataset.en=en;e.dataset.zh=cn;e.textContent=T(en,cn);return e;}
  function heading(number,en,cn,subEn,subZh){const wrap=document.createElement('div');wrap.className='mmh-fb65-step-title';const n=document.createElement('span');n.className='mmh-fb65-step-no';n.textContent=number;const txt=document.createElement('div');txt.append(copyElement('strong','mmh-fb65-step-name',en,cn),copyElement('small','mmh-fb65-step-sub',subEn,subZh));wrap.append(n,txt);return wrap;}
  function setCount(input,node,max){if(!input||!node)return;node.textContent=(input.value?.length||0)+'/'+max;}
  function addCounter(input,ref,max){if(!input||!ref)return;const item=document.createElement('span');item.className='mmh-fb65-count';item.setAttribute('aria-hidden','true');ref.append(item);input.addEventListener('input',()=>setCount(input,item,max));setCount(input,item,max);}
  function attachPhotoRemoveButtons(){
    const preview=$('fbPhotoPreviewV15'),input=$('fbPhotosV15');if(!preview||!input)return;
    Array.from(preview.children).forEach((tile,i)=>{
      if(tile.querySelector('.mmh-fb65-remove'))return;
      const b=document.createElement('button');b.type='button';b.className='mmh-fb65-remove';b.setAttribute('aria-label',T('Remove photo','移除图片')+' '+(i+1));b.textContent='×';
      b.addEventListener('click',()=>{
        const files=Array.from(input.files||[]).filter((_,idx)=>idx!==i);
        if(typeof DataTransfer==='undefined')return;
        const dt=new DataTransfer();files.forEach(f=>dt.items.add(f));
        try{input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));}catch(_){}
      });tile.append(b);
    });
  }
  function enhance(){
    if(done)return true;
    const page=$('stPage_feedback'),form=$('fbFormV14'),tabs=$('mmhFeedbackTabsP63');
    const compose=page?.querySelector('.fb-compose-v136'),history=page?.querySelector('.fb-my-panel-v136');
    const rating=$('fbRatingV15'),photo=$('fbPhotosV15');
    if(!page||!form||!tabs||!compose||!history||!rating||!photo)return false;
    done=true;page.classList.add('mmh-feedback-premium-p65');
    const header=page.querySelector(':scope > .st-page-head');
    if(header){const text=document.createElement('div');text.className='mmh-fb65-head-copy';const h=header.querySelector('h2');if(h)text.append(h);text.append(copyElement('strong','mmh-fb65-head-kicker','We value your feedback','感谢您的反馈'),copyElement('p','mmh-fb65-head-description','Share an issue, an idea, or a suggestion to improve MMHVAULT.','分享问题、建议或想法，帮助 MMHVAULT 持续改进。'));header.append(text);}
    const nameTitle=compose.querySelector('.fb-heading h3');if(nameTitle){nameTitle.dataset.en='Feedback details';nameTitle.dataset.zh='反馈详情';nameTitle.textContent=T('Feedback details','反馈详情');}
    const nameSub=compose.querySelector('.fb-heading .fb-note');if(nameSub){nameSub.dataset.en='Tell us what happened or what you would like to suggest.';nameSub.dataset.zh='告诉我们发生了什么，或您希望改进什么。';nameSub.textContent=T(nameSub.dataset.en,nameSub.dataset.zh);}
    const fields=form.querySelector('.fb-fields'),description=form.querySelector('.fb-body-label');
    const ratingBox=form.querySelector('.fb-rating-v15'),photos=form.querySelector('.fb-photo-v15');
    const privacy=form.querySelector(':scope > .fb-note'),submit=$('fbSubmitV14');
    if(fields&&description){const detail=document.createElement('div');detail.className='mmh-fb65-step mmh-fb65-details';detail.append(heading('1','Feedback details','反馈内容','What should our team know?','请描述您希望我们了解的情况。')); fields.before(detail);detail.append(fields,description);const input=$('fbTitleV14'),area=$('fbBodyV14');if(input?.parentElement)addCounter(input,input.parentElement,120);if(description)addCounter(area,description,4000);if(input)input.placeholder=T('Short title (e.g. Transaction issue)','简要标题（例如：交易问题）');if(area)area.placeholder=T('Explain the issue or suggestion in detail…','请详细描述您遇到的问题或建议…');}
    if(ratingBox){const step=document.createElement('div');step.className='mmh-fb65-step mmh-fb65-rating';step.append(heading('2','Rate your experience','体验评分','Choose the score that best describes your experience.','选择最符合您体验的评分。'));ratingBox.before(step);step.append(ratingBox);}
    if(photos){const step=document.createElement('div');step.className='mmh-fb65-step mmh-fb65-photos';step.append(heading('3','Attachments','附件图片','Upload up to three screenshots for context.','最多上传三张截图帮助说明问题。'));photos.before(step);step.append(photos);const preview=$('fbPhotoPreviewV15');if(preview){const observer=new MutationObserver(()=>attachPhotoRemoveButtons());observer.observe(preview,{childList:true});attachPhotoRemoveButtons();}}
    if(submit){const foot=document.createElement('div');foot.className='mmh-fb65-form-footer';submit.before(foot);if(privacy)foot.append(privacy);const actions=document.createElement('div');actions.className='mmh-fb65-footer-actions';const clear=document.createElement('button');clear.type='button';clear.className='mmh-fb65-clear';clear.dataset.en='Clear text';clear.dataset.zh='清空文字';clear.textContent=T('Clear text','清空文字');clear.addEventListener('click',()=>{const title=$('fbTitleV14'),body=$('fbBodyV14');if(title){title.value='';title.dispatchEvent(new Event('input',{bubbles:true}));}if(body){body.value='';body.dispatchEvent(new Event('input',{bubbles:true}));}});actions.append(clear,submit);foot.append(actions);}
    const aside=document.createElement('aside');aside.className='mmh-fb65-aside';aside.setAttribute('aria-label',T('Feedback guidance','反馈说明'));
    const art=document.createElement('div');art.className='mmh-fb65-art';art.setAttribute('aria-hidden','true');aside.append(art);
    const inner=document.createElement('div');inner.className='mmh-fb65-aside-inner';inner.append(copyElement('h3','mmh-fb65-aside-title','Your feedback helps us grow','您的反馈推动我们改进'),copyElement('p','mmh-fb65-aside-intro','Every suggestion helps make MMHVAULT more useful, secure, and easier to use.','每一条建议，都能帮助 MMHVAULT 变得更安全、更实用、更易使用。'));
    const guide=document.createElement('div');guide.className='mmh-fb65-guide';
    [['✧','Feature requests','功能建议','Share ideas for future improvements.','分享希望增加的功能。'],['!','Report issues','报告问题','Describe unexpected behavior or errors.','说明错误或异常行为。'],['◉','General feedback','一般反馈','Tell us what you like or want improved.','告诉我们您喜欢或希望改进的地方。']].forEach(([ic,en,cn,se,sc])=>{const row=document.createElement('div');row.className='mmh-fb65-guide-row';const badge=document.createElement('span');badge.className='mmh-fb65-guide-icon';badge.textContent=ic;const copy=document.createElement('div');copy.append(copyElement('strong','',en,cn),copyElement('small','',se,sc));row.append(badge,copy);guide.append(row);});
    inner.append(guide);const help=document.createElement('p');help.className='mmh-fb65-help';help.append(copyElement('strong','','Track your feedback','查看处理状态'),copyElement('span','','Use “My feedback” to see your submissions, status and replies.','可在「我的反馈」中查看历史记录、处理状态与回复。'));inner.append(help);aside.append(inner);
    compose.after(aside);
    const origTabs=tabs.querySelectorAll('button');origTabs.forEach((b,i)=>{b.classList.add('mmh-fb65-tab');b.dataset.icon=i===0?'✎':'▤';});
    function translate(){const chinese=zh();page.dataset.fb65Lang=chinese?'zh':'en';page.querySelectorAll('[data-en][data-zh]').forEach(n=>{if(n.matches('input,textarea,option'))return;n.textContent=chinese?n.dataset.zh:n.dataset.en;});const title=$('fbTitleV14'),area=$('fbBodyV14');if(title)title.placeholder=T('Short title (e.g. Transaction issue)','简要标题（例如：交易问题）');if(area)area.placeholder=T('Explain the issue or suggestion in detail…','请详细描述您遇到的问题或建议…');}
    translate();
    ['languagechange','mmhvault-language-change'].forEach(e=>window.addEventListener(e,()=>{queueMicrotask(translate);}));
    return true;
  }
  function boot(){if(enhance())return;const watcher=new MutationObserver(()=>{if(enhance())watcher.disconnect();});watcher.observe(document.body,{subtree:true,childList:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
