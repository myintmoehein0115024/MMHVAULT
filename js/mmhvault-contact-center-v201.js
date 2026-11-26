
(()=>{
'use strict';
const $=id=>document.getElementById(id), lang=()=>{let l='en';try{l=(localStorage.getItem('mmhvault_language_v3363')||'en').toLowerCase()}catch(_){}return l.startsWith('zh')?1:/^(my|mm)/.test(l)?2:0};
const t=(en,zh,my)=>[en,zh,my][lang()];
const make=(tag,cls,txt)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(txt)el.textContent=txt;return el};
const launcher=make('button');launcher.id='mmhContactLauncherV2';launcher.type='button';launcher.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.7 8.7 0 0 1-3.8-.9L3 21l1.9-5.7a8.7 8.7 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3H13a8.5 8.5 0 0 1 8 8.5z"/></svg>';launcher.setAttribute('aria-haspopup','dialog');launcher.setAttribute('aria-controls','mmhContactLayerV2');launcher.setAttribute('aria-expanded','false');
const layer=make('div');layer.id='mmhContactLayerV2';layer.inert=true;layer.setAttribute('aria-hidden','true');
const scrim=make('div','mc-scrim'),drawer=make('aside','mc-drawer'),head=make('div','mc-head'),heading=make('div','mc-heading'),body=make('div','mc-body');
drawer.setAttribute('role','dialog');drawer.setAttribute('aria-modal','true');drawer.setAttribute('aria-labelledby','mmhContactTitleV2');
const back=make('button','mc-icon'),x=make('button','mc-icon'),feedback=make('button','mc-icon');const setIcon=(el,path)=>{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',path);svg.append(p);el.append(svg)};setIcon(back,'m15 18-6-6 6-6');setIcon(x,'m6 6 12 12M18 6 6 18');setIcon(feedback,'M4 4h16v13H9l-5 4V4zm4 5h8m-8 4h5');back.type=x.type=feedback.type='button';const title=make('strong');title.id='mmhContactTitleV2';const sub=make('small');heading.append(title,sub);head.append(back,heading,feedback,x);drawer.append(head,body);layer.append(scrim,drawer);document.body.append(launcher,layer);
let mode='home',mounted=null,previousFocus=null,settingsSnapshot=null,originalSupport=null,originalFeedback=null,frame=null,supportCleanup=null,feedbackCleanup=null;
function labels(){launcher.title=t('Contact MMHVAULT','联系 MMHVAULT','MMHVAULT ကို ဆက်သွယ်ရန်');launcher.setAttribute('aria-label',launcher.title);x.setAttribute('aria-label',t('Close','关闭','ပိတ်ရန်'));back.setAttribute('aria-label',t('Back','返回','နောက်သို့'));back.hidden=mode==='home';feedback.hidden=mode!=='support';feedback.title=t('Feedback & replies','反馈与回复','အကြံပြုချက်များ');feedback.setAttribute('aria-label',feedback.title);title.textContent=mode==='ai'?t('AI Assistant','AI 助手','AI အကူအညီ'):mode==='support'?t('MMHVAULT Support','MMHVAULT 人工客服','MMHVAULT ဝန်ဆောင်မှု'):mode==='feedback'?t('Feedback & replies','反馈与回复','အကြံပြုချက်များ'):launcher.title;sub.textContent='';sub.hidden=true}
function signedIn(){try{return !!currentSessionUser?.id}catch(_){return false}}
function workspaceScroll(){try{return mmhWorkspaceScrollYV2()}catch(_){return null}}
function restoreWorkspaceScroll(y){if(Number.isFinite(y))try{mmhWorkspaceScrollToV2({top:y,behavior:'instant'})}catch(_){}}
function release(){if(feedbackCleanup){feedbackCleanup();feedbackCleanup=null;}if(supportCleanup){supportCleanup();supportCleanup=null;}if(mounted){const {page,parent,next,backId}=mounted;mounted=null;$(backId)?.click();page.hidden=true;if(parent.isConnected){if(next?.parentNode===parent)parent.insertBefore(page,next);else parent.append(page)}if(settingsSnapshot){for(const [el,hidden] of settingsSnapshot.pages)if(el.isConnected)el.hidden=hidden;settingsSnapshot.settings.classList.toggle('st-in-subpage',settingsSnapshot.sub);restoreWorkspaceScroll(settingsSnapshot.scroll);settingsSnapshot=null;}}if(frame){frame.remove();frame=null;}body.replaceChildren();body.classList.remove('mc-ai')}
function choice(icon,name,desc,fn){const b=make('button','mc-choice'),copy=make('span');b.type='button';copy.append(make('b','',name),make('small','',desc));b.append(make('span','',icon),copy,make('span','','›'));b.onclick=fn;body.append(b)}
function buttonLink(text,fn){const b=make('button','mc-link',text);b.type='button';b.onclick=fn;body.append(b);return b}
// Keep all support mutations with the existing authenticated service. The drawer only controls presentation.
function supportDraftState(text,photos,busy){return{hasDraft:!!String(text||'').trim()||photos>0,busy:!!busy}}
function attachSupportUI(page){
 const thread=$('csThreadV1518'),input=$('csMessageV1518'),send=$('csSendV1518'),preview=$('csPhotoPreviewV1518'),emoji=$('csEmojiPanelV1518'),toggle=$('csEmojiToggleV1518');
 if(!thread||!input||!send||!preview)return()=>{};
 const jump=make('button','mc-support-jump',t('↓ Latest messages','↓ 最新消息','↓ နောက်ဆုံးစာများ'));jump.type='button';jump.hidden=true;thread.after(jump);
 const near=()=>thread.scrollHeight-thread.scrollTop-thread.clientHeight<=80;
 const updateJump=()=>{jump.hidden=near()};const goLatest=()=>{thread.scrollTop=thread.scrollHeight;updateJump()};
 const resize=()=>{input.style.height='auto';input.style.height=Math.min(110,Math.max(52,input.scrollHeight))+'px'};
 // The backend owns the send button's disabled state. Prevent edits to a submitted draft until it finishes.
 const sync=()=>{
   const {hasDraft,busy}=supportDraftState(input.value,preview.childElementCount,send.disabled);
   input.readOnly=busy;page.classList.toggle('mc-support-busy',busy);send.setAttribute('aria-busy',String(busy));
   if(busy||!hasDraft)send.setAttribute('aria-disabled','true');else send.removeAttribute('aria-disabled');
   toggle?.setAttribute('aria-expanded',String(!!emoji&&!emoji.hidden));resize();updateJump();
 };
 const guard=e=>{
   const busy=send.disabled,target=e.target;
   if(target?.closest?.('#csSendV1518')&&!supportDraftState(input.value,preview.childElementCount,busy).hasDraft){e.preventDefault();e.stopImmediatePropagation();return}
   if(busy&&target?.closest?.('#csEmojiPanelV1518,#csEmojiToggleV1518,#csPhotoBtnV1518,#csClearPhotosV1518,.cs-preview-remove-v201')){e.preventDefault();e.stopImmediatePropagation()}
 };
 const key=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&(send.disabled||!supportDraftState(input.value,preview.childElementCount,false).hasDraft)){e.preventDefault();e.stopImmediatePropagation()}};
 const observer=new MutationObserver(sync);observer.observe(send,{attributes:true,attributeFilter:['disabled']});observer.observe(preview,{childList:true});observer.observe(thread,{childList:true});if(emoji)observer.observe(emoji,{attributes:true,attributeFilter:['hidden']});
 thread.addEventListener('scroll',updateJump,{passive:true});jump.addEventListener('click',goLatest);input.addEventListener('input',sync);input.addEventListener('keydown',key,true);page.addEventListener('click',guard,true);
 // Emoji insertion in the legacy service is programmatic and does not emit an input event.
 const afterClick=()=>queueMicrotask(sync);page.addEventListener('click',afterClick);sync();
 return()=>{observer.disconnect();thread.removeEventListener('scroll',updateJump);jump.remove();input.removeEventListener('input',sync);input.removeEventListener('keydown',key,true);page.removeEventListener('click',guard,true);page.removeEventListener('click',afterClick);input.readOnly=false;input.style.removeProperty('height');page.classList.remove('mc-support-busy');send.removeAttribute('aria-busy');send.removeAttribute('aria-disabled')};
}
function feedbackViewState(historyOpen,busy){return{compose:!historyOpen,history:!!historyOpen,busy:!!busy}}
function attachFeedbackUI(page){
 const form=$('fbFormV14'),submit=$('fbSubmitV14'),toggle=$('fbMyToggleV136'),history=$('fbMyBodyV136'),notice=$('fbMsgV14'),compose=page.querySelector('.fb-compose-v136'),records=page.querySelector('.fb-my-panel-v136');
 if(!form||!submit||!toggle||!history||!compose||!records)return()=>{};
 const nav=make('div','mc-feedback-tabs'),newTab=make('button','',t('New feedback','提交反馈','အကြံပြုချက်အသစ်')),historyTab=make('button','',t('My feedback','我的反馈','ကျွန်ုပ်၏ အကြံပြုချက်များ'));
 nav.setAttribute('role','group');nav.setAttribute('aria-label',t('Feedback views','反馈视图','အကြံပြုချက် မြင်ကွင်းများ'));
 newTab.type=historyTab.type='button';newTab.setAttribute('aria-controls','fbFormV14');historyTab.setAttribute('aria-controls','fbMyBodyV136');nav.append(newTab,historyTab);page.prepend(nav);
 const noticeParent=notice?.parentNode,noticeNext=notice?.nextSibling;if(notice)nav.after(notice);
 page.classList.add('mc-feedback-v205');
 let active=true,lastOpen=null;
 const sync=()=>{
   if(!active)return;
   const view=feedbackViewState(!history.hidden,submit.disabled);
   compose.hidden=!view.compose;records.hidden=!view.history;form.inert=view.busy;
   newTab.setAttribute('aria-pressed',String(view.compose));historyTab.setAttribute('aria-pressed',String(view.history));
   newTab.disabled=historyTab.disabled=view.busy;
   const list=$('fbListV14');if(list){
     for(const badge of list.querySelectorAll('.fb-status')){const label={new:t('Pending','待处理','စောင့်ဆိုင်းနေသည်'),working:t('In progress','处理中','ဆောင်ရွက်နေသည်'),resolved:t('Resolved','已解决','ဖြေရှင်းပြီး')}[badge.dataset.status];if(label&&badge.textContent!==label)badge.textContent=label}
   }
   if(lastOpen!==null&&lastOpen!==view.history){body.scrollTop=0;if(view.history&&compose.contains(document.activeElement))historyTab.focus({preventScroll:true})}
   lastOpen=view.history;
 };
 newTab.onclick=()=>{if(!submit.disabled&&!history.hidden)toggle.click();sync()};
 historyTab.onclick=()=>{if(!submit.disabled&&history.hidden)toggle.click();sync()};
 const observer=new MutationObserver(sync);observer.observe(history,{attributes:true,attributeFilter:['hidden']});observer.observe(submit,{attributes:true,attributeFilter:['disabled']});
 const list=$('fbListV14');if(list)observer.observe(list,{childList:true,subtree:true});
 sync();
 const relabel=()=>{newTab.textContent=t('New feedback','提交反馈','အကြံပြုချက်အသစ်');historyTab.textContent=t('My feedback','我的反馈','ကျွန်ုပ်၏ အကြံပြုချက်များ');sync()};window.addEventListener('mmhvault-language-change',relabel);window.addEventListener('languagechange',relabel);
 return()=>{active=false;observer.disconnect();window.removeEventListener('mmhvault-language-change',relabel);window.removeEventListener('languagechange',relabel);form.inert=false;compose.hidden=false;records.hidden=false;page.classList.remove('mc-feedback-v205');nav.remove();if(notice&&noticeParent){if(noticeNext?.parentNode===noticeParent)noticeParent.insertBefore(notice,noticeNext);else noticeParent.append(notice)}};
}
function show(which='home'){release();mode=which;labels();x.focus({preventScroll:true});
 if(which==='home'){choice('✧',t('Ask AI Assistant','联系 AI 助手','AI ကို မေးရန်'),t('Finance questions & app guides','财务问答和使用指南','ငွေစာရင်းနှင့် အသုံးပြုနည်း'),()=>show('ai'));choice('♧',t('Contact Customer Support','联系人工客服','ဖောက်သည်ဝန်ဆောင်မှု'),t('Account questions, issues & feedback','账户问题、故障及反馈','အကောင့် ပြဿနာနှင့် အကြံပြုချက်'),()=>show('support'));return}
 if(!signedIn()){body.append(make('p','mc-text',t('Sign in to use this service.','请登录后使用此服务。','အသုံးပြုရန် အကောင့်ဝင်ပါ။')));return}
 if(which==='ai'){body.classList.add('mc-ai');try{window.mmhWriteAISnapshotV1115?.()}catch(_){}const child=make('iframe');frame=child;child.title=title.textContent;child.src='ai-chat.html?contact=v2&ui=201';child.addEventListener('load',()=>{
  if(frame!==child||mode!=='ai'||!layer.classList.contains('is-open'))return;
  try{
    const doc=child.contentDocument;if(!doc)return;
    const b=doc.getElementById('backApp');if(b)b.onclick=e=>{e.preventDefault();if(frame===child)show('home')};
    doc.addEventListener('keydown',e=>{
      if(e.key!=='Escape'||e.defaultPrevented||e.isComposing||frame!==child||mode!=='ai'||!layer.classList.contains('is-open'))return;
      const panels=[['contactHistory','contactHistoryClose',el=>!el.hidden],['modelDock','contactAISettings',el=>el.classList.contains('contact-settings-open')],['appGuide','contactAIGuide',el=>el.classList.contains('contact-guide-open')]];
      for(const [panelId,buttonId,isOpen] of panels){const panel=doc.getElementById(panelId),button=doc.getElementById(buttonId);if(panel&&button&&isOpen(panel)){e.preventDefault();button.click();button.focus({preventScroll:true});return}}
      e.preventDefault();close();
    });
  }catch(_){}
});body.append(child);return}
 const settings=$('settings'),page=$(which==='support'?'stPage_supportV1518':'stPage_feedback'),open=which==='support'?originalSupport:originalFeedback;
 
 if(!settings||!page||!open){body.append(make('p','mc-text',t('Service is not ready. Close and reopen this panel.','服务尚未准备好，请关闭后重新打开。','ဝန်ဆောင်မှု အဆင်သင့် မဖြစ်သေးပါ။')));return}
 settingsSnapshot={settings,scroll:workspaceScroll(),sub:settings.classList.contains('st-in-subpage'),pages:[...settings.querySelectorAll('.st-page,#stSettingsHomeV3')].filter(p=>p!==page).map(p=>[p,p.hidden])};
 mounted={page,parent:page.parentNode,next:page.nextSibling,backId:which==='support'?'csBackV1518':'fbBackV14'};body.append(page);open();if(which==='support')supportCleanup=attachSupportUI(page);else if(which==='feedback')feedbackCleanup=attachFeedbackUI(page);
 // Opening the old service should not change the underlying workspace.
 for(const [el,hidden] of settingsSnapshot.pages)if(el.isConnected)el.hidden=hidden;
 settings.classList.toggle('st-in-subpage',settingsSnapshot.sub);restoreWorkspaceScroll(settingsSnapshot.scroll);
 if(which==='feedback')x.focus({preventScroll:true});
}
function open(which='home'){if(!document.body.classList.contains('mmh-workspace-active'))return;previousFocus=layer.classList.contains('is-open')?previousFocus:document.activeElement;layer.inert=false;layer.setAttribute('aria-hidden','false');layer.classList.add('is-open');launcher.setAttribute('aria-expanded','true');show(which);if(which==='home')x.focus({preventScroll:true})}
function close(){if(!layer.classList.contains('is-open'))return;release();layer.classList.remove('is-open');launcher.setAttribute('aria-expanded','false');layer.inert=true;layer.setAttribute('aria-hidden','true');if(previousFocus?.isConnected&&previousFocus.getClientRects().length)previousFocus.focus({preventScroll:true});previousFocus=null}
launcher.onclick=()=>open();back.onclick=()=>show(mode==='feedback'?'support':'home');feedback.onclick=()=>show('feedback');x.onclick=close;scrim.onclick=close;
document.addEventListener('keydown',e=>{if(!layer.classList.contains('is-open'))return;if(e.key==='Escape'&&!e.isComposing){const emoji=$('csEmojiPanelV1518');if(mode==='support'&&emoji&&!emoji.hidden){e.preventDefault();e.stopPropagation();emoji.hidden=true;$('csEmojiToggleV1518')?.focus();return}e.preventDefault();e.stopPropagation();close()}else if(e.key==='Tab'){const nodes=[...drawer.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),iframe')].filter(n=>n.getClientRects().length&&n.tabIndex>=0);if(nodes.length&&!drawer.contains(document.activeElement)){e.preventDefault();(e.shiftKey?nodes.at(-1):nodes[0]).focus()}else if(nodes.length&&e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1).focus()}else if(nodes.length&&!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0].focus()}}},true);
document.addEventListener('focusin',e=>{if(layer.classList.contains('is-open')&&!drawer.contains(e.target))x.focus({preventScroll:true})},true);
function bind(){if(!originalSupport&&typeof window.mmhOpenSupportV1518==='function'){originalSupport=window.mmhOpenSupportV1518;window.mmhOpenSupportV1518=()=>open('support')}if(!originalFeedback&&typeof window.mmhOpenFeedbackV136==='function'){originalFeedback=window.mmhOpenFeedbackV136;window.mmhOpenFeedbackV136=()=>open('feedback')}if(layer.classList.contains('is-open')&&!document.body.classList.contains('mmh-workspace-active'))close()}
new MutationObserver(bind).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
window.addEventListener('mmhvault:config-owner-changed',close);window.addEventListener('pagehide',close);
for(const event of ['mmhvault-language-change','languagechange'])window.addEventListener(event,()=>{labels();if(mode==='home'&&layer.classList.contains('is-open'))show('home')});
const viewport=window.visualViewport;function resizeDrawer(){if(!viewport)return;layer.style.setProperty('--mc-visible-height',Math.round(viewport.height)+'px');layer.style.setProperty('--mc-visible-top',Math.round(viewport.offsetTop)+'px')}if(viewport){viewport.addEventListener('resize',resizeDrawer);viewport.addEventListener('scroll',resizeDrawer);resizeDrawer()}
labels();bind();
})();
