/* MMHVAULT Admin Feedback Premium V1
 * Scoped DOM presentation + local filters for authorized feedbackRows.
 * All feedback reads and writes remain in the existing protected Admin controller.
 */
(()=>{'use strict';
 const view=document.getElementById('adminFeedbackView');
 const list=document.getElementById('afList');
 const dock=document.getElementById('afPremiumDockV1');
 const host=document.getElementById('afPremiumEditorHostV1');
 const dashboard=document.getElementById('dashboard');
 const search=document.getElementById('afPremiumSearchV1');
 const rating=document.getElementById('afPremiumRatingV1');
 const sort=document.getElementById('afPremiumSortV1');
 const refresh=document.getElementById('afRefresh');
 if(!view||!list||!dock||!host||!dashboard||!search||!rating||!sort||!refresh)return;
 if(view.classList.contains('af-premium-enhanced-v1'))return;
 let activeId=null,activeCard=null,activeForm=null,debounce=null;
 const drafts=new Map();
 const getCards=()=>Array.from(list.querySelectorAll(':scope > .af-thread-card-v1520'));
 const recordId=card=>card?.dataset.feedbackId||'';
 const saveDraft=(id,form)=>{
  if(!id||!form)return;
  const field=form.querySelector('textarea'),select=form.querySelector('select');
  if(field&&select)drafts.set(id,{reply:field.value,status:select.value});
 };
 const restoreDraft=(id,form)=>{
  const draft=drafts.get(id);if(!draft||!form)return;
  const field=form.querySelector('textarea'),select=form.querySelector('select');
  if(field)field.value=draft.reply;
  if(select)select.value=draft.status;
 };
 const bindDraftWatch=(id,form)=>{
  if(form.dataset.premiumBound==='1')return;
  form.dataset.premiumBound='1';
  form.addEventListener('input',()=>saveDraft(id,form));
  form.addEventListener('change',()=>saveDraft(id,form));
  form.addEventListener('submit',()=>{
   const result=form.querySelector('.af-result');
   if(!result)return;
   const observer=new MutationObserver(()=>{
    const msg=result.textContent||'';
    if(msg.startsWith('已保存')){drafts.delete(id);observer.disconnect()}
    else if(msg.startsWith('保存失败')||msg.includes('刷新后再回复'))observer.disconnect();
   });
   observer.observe(result,{subtree:true,childList:true,characterData:true});
   setTimeout(()=>observer.disconnect(),15000);
  });
 };
 function selectCard(card){
  if(!card||!list.contains(card)||dashboard.hidden||view.hidden)return;
  const id=recordId(card);if(!id)return;
  if(activeCard&&activeForm&&activeCard.isConnected&&host.contains(activeForm)){
    activeCard.append(activeForm);
  }
  const form=card.querySelector(':scope > form.af-editor-inline-v1520');
  if(!form)return;
  host.replaceChildren(form);
  activeForm=form;activeCard=card;activeId=id;
  bindDraftWatch(id,form);
  restoreDraft(id,form);
  for(const row of getCards()){
   const selected=row===card;
   row.dataset.active=String(selected);
   const button=row.querySelector('.af-premium-select-v1');
   if(button){button.setAttribute('aria-pressed',String(selected));button.textContent=selected?'✓ 正在处理':'选择处理'}
  }
  dock.hidden=false;
  const title=dock.querySelector('.af-premium-dock-title-v1 strong');
  if(title)title.textContent='处理选中的反馈 · '+(card.querySelector('.af-thread-head-v1520 b')?.textContent||'反馈');
 }
 function setupCards(){
  const cards=getCards();
  if(!cards.length){
   host.replaceChildren();dock.hidden=true;activeForm=null;activeCard=null;
   return;
  }
  for(const card of cards){
   if(!recordId(card))continue;
   if(!card.querySelector('.af-premium-select-v1')){
    const button=document.createElement('button');
    button.type='button';button.className='af-premium-select-v1';
    button.textContent='选择处理';button.setAttribute('aria-pressed','false');
    button.setAttribute('aria-label','选择此条反馈进行处理和回复');
    button.addEventListener('click',()=>selectCard(card));
    const header=card.querySelector('.af-thread-head-v1520');
    if(header)header.append(button);
   }
  }
  const target=cards.find(card=>recordId(card)===activeId)||cards[0];
  // A re-render replaces the old cards. Discard the old dock form and attach the
  // newly rendered form with its original, revision-aware submit callback.
  if(activeForm&&host.contains(activeForm)&&!activeCard?.isConnected){
   host.replaceChildren();activeForm=null;activeCard=null;
  }
  selectCard(target);
 }
 list.addEventListener('click',event=>{
  const target=event.target;
  if(target?.closest?.('button,a,input,textarea,select,label'))return;
  const card=target?.closest?.('.af-thread-card-v1520');
  if(card&&list.contains(card))selectCard(card);
 });
 new MutationObserver(mutations=>{
  if(mutations.some(m=>m.type==='childList'&&m.target===list))setupCards();
 }).observe(list,{childList:true});
 const rerender=()=>{
  if(dashboard.hidden||view.hidden)return;
  window.mmhFeedbackPremiumRerenderV1?.();
 };
 const schedule=()=>{
  clearTimeout(debounce);
  debounce=setTimeout(rerender,180);
 };
 search.addEventListener('input',schedule);
 rating.addEventListener('change',rerender);
 sort.addEventListener('change',rerender);
 refresh.addEventListener('click',()=>{drafts.clear();activeId=null});
 new MutationObserver(()=>{
  if(dashboard.hidden){clearTimeout(debounce);drafts.clear();host.replaceChildren();activeCard=null;activeForm=null;dock.hidden=true}
 }).observe(dashboard,{attributes:true,attributeFilter:['hidden']});
 view.classList.add('af-premium-enhanced-v1');
 setupCards();
})();
