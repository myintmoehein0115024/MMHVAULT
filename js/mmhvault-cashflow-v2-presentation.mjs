/* Cashflow V2.0.10: opt-in adapter for the existing MMHCurrencyPickerV3.
 * Native selects remain usable if the Accounts component is not initialized.
 * No financial data, storage, network or global state is modified. */
export function currencyAllowed(select,code){
 return typeof code==='string'&&Array.from(select.options||[]).some(o=>o.value===code&&!o.disabled);
}
export function sharedPickerAvailable(api){
 return typeof api?.render==='function'&&typeof api?.flag==='function';
}
export function enhanceCurrencies(root,api,{labelFor,canChange=()=>true}={}){
 if(!root||!sharedPickerAvailable(api))return 0;
 const doc=root.ownerDocument;let count=0;
 for(const select of root.querySelectorAll('select[data-field="currency"],select[data-field="original"],select[name="currency"]')){
  const host=select.closest('label');if(!host||host.hidden)continue;
  const details=doc.createElement('details'),summary=doc.createElement('summary'),group=doc.createElement('div'),label=doc.createElement('label'),search=doc.createElement('input'),list=doc.createElement('div');
  details.className='cfv2-currency';group.className='ap-currency-choices-v2';list.className='ap-currency-list-v2';search.type='search';search.autocomplete='off';label.append(search);group.append(label,list);details.append(summary,group);
  const title=labelFor?.(select)||host.textContent.trim();
  const update=()=>{const code=select.value;summary.textContent=code?api.flag(code)+code:(select.selectedOptions[0]?.textContent||title);summary.setAttribute('aria-label',title+': '+summary.textContent)};
  try{
   // Shared renderer rewrites its label's textContent, so the input is a sibling.
   group.insertBefore(search,list);
   api.render({select,search,list,group,label:title,includeNative:false});
   // The shared renderer deliberately excludes the blank "All" option.
   // Keep the original filter's reset option explicit and unchanged.
   if(currencyAllowed(select,'')){const clear=doc.createElement('button');clear.type='button';clear.dataset.cfv2CurrencyClear='true';clear.textContent=Array.from(select.options).find(o=>o.value==='').textContent;group.insertBefore(clear,search)}
   update();host.after(details);host.hidden=true;count++;
  }catch{details.remove();continue}
  details.addEventListener('click',event=>{
   const option=event.target.closest('[data-ap-currency],[data-cfv2-currency-clear]');
   if(!option||!details.contains(option)||!canChange())return;
   const code=option.hasAttribute('data-cfv2-currency-clear')?'':option.dataset.apCurrency;
   if(!currencyAllowed(select,code))return;
   details.open=false;
   if(select.value!==code){select.value=code;update();select.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}))}
   if(details.isConnected)summary.focus({preventScroll:true});
  });
  details.addEventListener('toggle',()=>{if(details.open){search.value='';try{api.render({select,search,list,group,label:title,includeNative:false});list.scrollTop=0;/* retain summary focus; search remains the next keyboard target */}catch{host.hidden=false;details.remove()}}});
  details.addEventListener('keydown',event=>{if(event.key==='Escape'&&details.open){event.preventDefault();event.stopPropagation();details.open=false;summary.focus({preventScroll:true})}});
 }
 return count;
}
export function actionIdentity(element){
 if(!element?.dataset?.action)return null;
 return {action:element.dataset.action,key:element.dataset.key||''};
}
export function restoreAction(root,identity){
 if(!identity)return false;
 const target=Array.from(root.querySelectorAll('[data-action]')).find(e=>e.dataset.action===identity.action&&(e.dataset.key||'')===identity.key);
 if(!target||target.disabled)return false;
 target.focus({preventScroll:true});return true;
}
