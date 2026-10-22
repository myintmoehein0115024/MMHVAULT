/* MMHVAULT Transactions P2.5: in-page Basic Information pickers.
 * Native selects stay authoritative (including current option set and value).
 * No transaction persistence/amount logic is modified. */
(() => {
  'use strict';
  const compact = window.matchMedia('(max-width: 620px)');
  const fields = ['txType', 'txGroup', 'txCategory'];
  const enhanced = new Map();
  let openState = null;
  let serial = 0;

  const getLabel = select => {
    const chosen = select.options[select.selectedIndex];
    return String(chosen?.textContent || select.options[0]?.textContent || 'Select').trim();
  };
  const refresh = select => {
    const trigger = enhanced.get(select);
    if (!trigger || !trigger.isConnected) return;
    trigger.querySelector('.mmh-p25-picker-value').textContent = getLabel(select);
    trigger.disabled = select.disabled;
    trigger.setAttribute('aria-disabled', String(select.disabled));
    if (openState?.select === select) {
      // The source options may be replaced when Type/Transaction changes.
      dismiss();
    }
  };
  function dismiss(refocus=false) {
    if (!openState) return;
    const { menu, trigger } = openState;
    openState = null;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-controls');
    menu.remove();
    if (refocus && trigger.isConnected) trigger.focus({preventScroll:true});
  }
  function open(select, trigger) {
    dismiss();
    if (!compact.matches || select.disabled) return;
    const menu = document.createElement('div');
    menu.className = 'mmh-p25-picker-menu';
    const menuId = `mmhP25List${++serial}`;
    menu.id = menuId;
    menu.setAttribute('role','listbox');
    menu.setAttribute('aria-label', select.closest('label')?.firstChild?.textContent?.trim() || 'Select');
    const options = Array.from(select.options);
    options.forEach((option, index) => {
      const entry = document.createElement('button');
      entry.type='button';
      entry.setAttribute('role','option');
      entry.setAttribute('aria-selected', String(index===select.selectedIndex));
      entry.disabled = option.disabled || (option.closest('optgroup')?.disabled || false);
      const title=document.createElement('span');
      title.className='mmh-p25-option-label';
      title.textContent = option.textContent || option.value;
      const tick=document.createElement('span');
      tick.className='mmh-p25-option-tick';
      tick.setAttribute('aria-hidden','true');
      tick.textContent = index===select.selectedIndex ? '✓' : '';
      entry.append(title,tick);
      entry.addEventListener('click',e => {
        e.preventDefault();e.stopPropagation();
        if(entry.disabled)return;
        const different = select.selectedIndex !== index;
        select.selectedIndex = index;
        dismiss(true);
        if(different){
          // Trigger original application form logic, category repopulation, and balance rules.
          select.dispatchEvent(new Event('input',{bubbles:true}));
          select.dispatchEvent(new Event('change',{bubbles:true}));
        }
        refresh(select);
        // Related fields often update their options synchronously.
        fields.forEach(id => {const el=document.getElementById(id);if(el)refresh(el);});
      });
      menu.appendChild(entry);
    });
    const rect = trigger.getBoundingClientRect();
    const vh = window.visualViewport?.height || window.innerHeight;
    const bottom = Math.min(window.innerHeight,vh+(window.visualViewport?.offsetTop||0));
    const below = bottom - rect.bottom - 12;
    const above = rect.top - 12;
    const desired = Math.min(310, options.length*46 + 18);
    const upward = below < Math.min(180,desired) && above > below;
    const available = Math.max(100, Math.min(310, (upward?above:below) - 8));
    const width = Math.min(rect.width,document.documentElement.clientWidth-20);
    menu.style.width = `${width}px`;
    menu.style.left = `${Math.max(10,Math.min(rect.left,document.documentElement.clientWidth-width-10))}px`;
    menu.style.maxHeight = `${available}px`;
    if(upward){menu.style.bottom=`${Math.max(8,window.innerHeight-rect.top+6)}px`;}
    else {menu.style.top=`${Math.max(8,rect.bottom+6)}px`;}
    document.body.appendChild(menu);
    trigger.setAttribute('aria-expanded','true');
    trigger.setAttribute('aria-controls',menuId);
    openState={select,trigger,menu};
    const active=menu.querySelector('[aria-selected="true"]');
    if(active){active.scrollIntoView({block:'nearest'});active.focus({preventScroll:true});}
  }
  function install(select) {
    if(!select || enhanced.has(select) || select.dataset.mmhP25Enhanced==='1') return;
    select.dataset.mmhP25Enhanced='1';
    const shell = document.createElement('span');
    shell.className='mmh-p25-picker-shell';
    select.parentNode.insertBefore(shell,select);
    shell.appendChild(select);
    select.classList.add('mmh-p25-picker-source');
    const trigger=document.createElement('button');
    trigger.type='button';trigger.className='mmh-p25-picker-trigger';
    trigger.setAttribute('aria-haspopup','listbox');
    trigger.setAttribute('aria-expanded','false');
    const name=document.createElement('span');name.className='mmh-p25-picker-value';
    const chev=document.createElement('span');chev.className='mmh-p25-picker-chevron';chev.textContent='⌄';chev.setAttribute('aria-hidden','true');
    trigger.append(name,chev);shell.appendChild(trigger);
    enhanced.set(select,trigger);
    trigger.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      if(openState?.select===select)dismiss();else open(select,trigger);
    });
    select.addEventListener('change',()=>refresh(select));
    new MutationObserver(()=>refresh(select)).observe(select,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','selected','label']});
    refresh(select);
  }
  function init() {
    fields.forEach(id=>install(document.getElementById(id)));
    document.addEventListener('click',event=>{
      if(openState && !openState.menu.contains(event.target) && !openState.trigger.contains(event.target))dismiss();
    });
    document.addEventListener('keydown',event=>{
      if(!openState)return;
      if(event.key==='Escape'){event.preventDefault();dismiss(true);return;}
      if(event.key==='Tab'){dismiss();return;}
      if(event.key==='ArrowDown'||event.key==='ArrowUp'||event.key==='Home'||event.key==='End'){
        event.preventDefault();
        const entries=Array.from(openState.menu.querySelectorAll('button:not(:disabled)'));
        if(!entries.length)return;
        const index=entries.indexOf(document.activeElement);
        const next=event.key==='Home'?0:event.key==='End'?entries.length-1:(index+(event.key==='ArrowDown'?1:-1)+entries.length)%entries.length;
        entries[next]?.focus({preventScroll:true});
      }
    });
    document.addEventListener('scroll',event=>{
      if(openState && event.target!==openState.menu && !openState.menu.contains(event.target))dismiss();
    },true);
    window.addEventListener('resize',()=>dismiss());
    window.visualViewport?.addEventListener('resize',()=>dismiss());
    compact.addEventListener?.('change',()=>dismiss());
    document.addEventListener('mmhvault:list-rendered',()=>fields.forEach(id=>{const s=document.getElementById(id);if(s)refresh(s);}));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
