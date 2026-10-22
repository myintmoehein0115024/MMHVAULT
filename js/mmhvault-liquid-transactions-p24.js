/* MMHVAULT Transactions P6.2.2 — mobile account lock synchronization.
 * Original <select> remains authoritative; dispatches the same native change event.
 * This file contains no financial mutation or data logging. */
(() => {
  'use strict';
  const mobile = window.matchMedia('(max-width: 620px)');
  const ids = ['fromAccount', 'toAccount'];
  let current = null;
  let observer = null;
  function close(focus=false) {
    if (!current) return;
    const {trigger,menu} = current;
    trigger.setAttribute('aria-expanded','false');
    menu.remove();
    current = null;
    if (focus && trigger.isConnected) trigger.focus({preventScroll:true});
  }
  function labelOf(select) {
    if (select.disabled) return '—';
    // A cleared, unselected native source must not visually claim that the
    // first account was selected.  Keep the native select authoritative.
    const option = select.selectedOptions[0];
    return option ? (option.textContent||'').trim() : 'Select account';
  }
  function update(select) {
    if (!select || !select.isConnected) return;
    const trigger = select.parentElement?.querySelector('.mmh-p24-account-trigger');
    const locked = !!select.disabled;
    if (trigger) {
      trigger.querySelector('.mmh-p24-account-name').textContent=labelOf(select);
      trigger.disabled=locked;
      trigger.tabIndex=locked?-1:0;
      trigger.setAttribute('aria-disabled',String(locked));
      if(locked && current?.select===select)close();
    }
    const accountLabel=select.closest('label');
    const amountId=select.id==='fromAccount'?'fromAmount':select.id==='toAccount'?'toAmount':null;
    const amountLabel=amountId ? document.getElementById(amountId)?.closest('label') : null;
    // Both sides of the one-sided transaction are a single UI decision:
    // Income -> Deposit to, Expense -> Pay from, Transfer -> both.
    // The source controls and financial rules remain unchanged.
    [accountLabel,amountLabel].forEach(label=>{
      if(!label)return;
      label.classList.toggle('mmh-p24-side-inactive',locked);
      if(locked)label.setAttribute('aria-hidden','true');
      else if(!label.classList.contains('tx-field-hidden-v141'))label.removeAttribute('aria-hidden');
    });
  }
  function open(select,trigger) {
    close();
    if (!mobile.matches || select.disabled || trigger.disabled) return;
    const menu=document.createElement('div');
    menu.className='mmh-p24-account-menu';
    menu.setAttribute('role','listbox');
    menu.setAttribute('aria-label',select.closest('label')?.firstChild?.textContent?.trim()||'Account');
    menu.id='mmhP24AccountMenu';
    const opts=Array.from(select.options);
    opts.forEach((option,index) => {
      const b=document.createElement('button');
      b.type='button';
      b.setAttribute('role','option');
      b.setAttribute('aria-selected',String(index===select.selectedIndex));
      b.disabled=option.disabled;
      const name=document.createElement('span');
      name.textContent=option.textContent||option.value;
      const check=document.createElement('span');
      check.className='mmh-p24-check';
      check.setAttribute('aria-hidden','true');
      check.textContent=index===select.selectedIndex?'✓':'';
      b.append(name,check);
      b.addEventListener('click',(event)=>{
        event.preventDefault();
        event.stopPropagation();
        if (select.disabled || trigger.disabled || option.disabled) {close();return;}
        const changed=select.selectedIndex!==index;
        select.selectedIndex=index;
        if (changed) {
          select.dispatchEvent(new Event('input',{bubbles:true}));
          select.dispatchEvent(new Event('change',{bubbles:true}));
        }
        update(select);
        close(true);
      });
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    trigger.setAttribute('aria-expanded','true');
    trigger.setAttribute('aria-controls','mmhP24AccountMenu');
    current={select,trigger,menu};
    const rect=trigger.getBoundingClientRect();
    const vw=document.documentElement.clientWidth;
    const vv=window.visualViewport;
    const usableBottom=Math.min(window.innerHeight,vv?.height||window.innerHeight);
    const spaceBelow=usableBottom-rect.bottom-12;
    const spaceAbove=rect.top-12;
    const maxHeight=Math.min(300,Math.max(135,Math.max(spaceAbove,spaceBelow)-12));
    menu.style.width=`${Math.min(rect.width,vw-20)}px`;
    menu.style.left=`${Math.max(10,Math.min(rect.left,vw-rect.width-10))}px`;
    menu.style.maxHeight=`${maxHeight}px`;
    if (spaceBelow>=Math.min(180,maxHeight)||spaceBelow>=spaceAbove) {
      menu.style.top=`${Math.min(usableBottom-15,rect.bottom+7)}px`;
    } else {
      menu.style.bottom=`${Math.max(10,usableBottom-rect.top+7)}px`;
    }
    const selected=menu.querySelector('[aria-selected="true"]');
    if (selected) {selected.scrollIntoView({block:'nearest'});selected.focus({preventScroll:true});}
  }
  function install(select) {
    if(!select||select.dataset.mmhP24Enhanced==='1')return;
    select.dataset.mmhP24Enhanced='1';
    const wrap=document.createElement('span');
    wrap.className='mmh-p24-account-wrap';
    select.parentNode.insertBefore(wrap,select);
    wrap.appendChild(select);
    select.classList.add('mmh-p24-native');
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='mmh-p24-account-trigger';
    btn.setAttribute('aria-label','Select account');
    btn.setAttribute('aria-haspopup','listbox');
    btn.setAttribute('aria-expanded','false');
    btn.setAttribute('aria-disabled',String(!!select.disabled));
    const name=document.createElement('span');name.className='mmh-p24-account-name';
    const chevron=document.createElement('span');chevron.className='mmh-p24-account-chevron';chevron.textContent='⌄';chevron.setAttribute('aria-hidden','true');
    btn.append(name,chevron);wrap.appendChild(btn);
    update(select);
    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(current?.select===select){close();return;}open(select,btn);});
    select.addEventListener('change',()=>update(select));
    // Native updateAccountLocks() writes the disabled property. The observer
    // mirrors it to the visual trigger, not just the selected text.
    new MutationObserver(()=>update(select)).observe(select,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['selected','disabled']});
  }
  function init() {
    ids.forEach(id=>install(document.getElementById(id)));
    // Update once more after the other transaction initializers have run.
    // This is idempotent and touches only the visible picker state.
    window.requestAnimationFrame?.(()=>ids.forEach(id=>{
      const select=document.getElementById(id);if(select)update(select);
    }));
    document.addEventListener('click',e=>{if(current&&!current.menu.contains(e.target)&&!current.trigger.contains(e.target))close();});
    document.addEventListener('keydown',e=>{
      if(!current)return;
      if(e.key==='Escape'){e.preventDefault();close(true);}
      else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        e.preventDefault();
        const list=Array.from(current.menu.querySelectorAll('button:not([disabled])'));
        const i=list.indexOf(document.activeElement);
        list[(i+(e.key==='ArrowDown'?1:-1)+list.length)%list.length]?.focus({preventScroll:true});
      }else if(e.key==='Tab'){close();}
    });
    document.addEventListener('scroll',event=>{if(current&&(event.target===current.menu||current.menu.contains(event.target)))return;close();},true);
    window.addEventListener('resize',()=>close());
    mobile.addEventListener?.('change',()=>close());
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
