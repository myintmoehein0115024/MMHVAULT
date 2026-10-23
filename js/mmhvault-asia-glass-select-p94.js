/* MMHVAULT P9.4 — Asia currency reference picker.
   Presentation adapter: retains the original #asiaBaseV10 select as the single data source.
   All existing exchange-rate calculations, fetches, saved rates, and update handlers are untouched. */
(()=>{'use strict';
  const SELECT_ID='asiaBaseV10', PAGE_ID='exAsiaV10';
  let initialized=false;
  const start=()=>{
    if(initialized)return true;
    const select=document.getElementById(SELECT_ID),page=document.getElementById(PAGE_ID);
    if(!select||!page||!select.closest('.asia-controls')||!select.options.length)return false;
    if(select.dataset.p94Ready==='1'){initialized=true;return true;}
    const field=select.parentElement;
    if(!field)return false;
    initialized=true;
    select.dataset.p94Ready='1';
    const originallyTabindex=select.getAttribute('tabindex');
    select.setAttribute('tabindex','-1');
    select.setAttribute('aria-hidden','true');
    const button=document.createElement('button');
    button.type='button';button.className='mmh-asia-picker-trigger-p94';
    button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-controls','mmhAsiaPickerListP94');
    button.setAttribute('aria-label',select.getAttribute('aria-label')||'Reference currency');
    const selected=document.createElement('span');selected.className='mmh-asia-picker-label-p94';
    const chevron=document.createElement('span');chevron.className='mmh-asia-picker-chevron-p94';chevron.setAttribute('aria-hidden','true');chevron.textContent='⌄';
    button.append(selected,chevron);select.insertAdjacentElement('afterend',button);
    const veil=document.createElement('div');veil.className='mmh-asia-picker-veil-p94';veil.hidden=true;
    const panel=document.createElement('div');panel.className='mmh-asia-picker-popover-p94';panel.hidden=true;
    panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Choose reference currency');
    panel.setAttribute('aria-modal','false');panel.tabIndex=-1;
    const heading=document.createElement('div');heading.className='mmh-asia-picker-heading-p94';
    const title=document.createElement('strong');
    const close=document.createElement('button');close.type='button';close.className='mmh-asia-picker-close-p94';close.setAttribute('aria-label','Close');close.textContent='×';
    heading.append(title,close);
    const search=document.createElement('input');search.type='search';search.className='mmh-asia-picker-search-p94';search.autocomplete='off';search.spellcheck=false;
    const menu=document.createElement('div');menu.id='mmhAsiaPickerListP94';menu.className='mmh-asia-picker-list-p94';menu.setAttribute('role','listbox');menu.setAttribute('aria-label','Reference currency options');menu.tabIndex=-1;
    panel.append(heading,search,menu);document.body.append(veil,panel);
    let open=false,activeIndex=-1,values=[],lastFocus=null,resizePending=false;
    const isChinese=()=>document.documentElement.lang.toLowerCase().startsWith('zh')||document.body.dataset.lang==='zh';
    const updateLabels=()=>{
      title.textContent=isChinese()?'选择基准货币':'Choose reference currency';
      search.placeholder=isChinese()?'搜索货币、国家或代码':'Search currency, country or code';
      search.setAttribute('aria-label',search.placeholder);
      panel.setAttribute('aria-label',title.textContent);
      close.setAttribute('aria-label',isChinese()?'关闭':'Close');
    };
    const sync=()=>{
      const current=[...select.options].find(o=>o.value===select.value);
      selected.textContent=current?.textContent||select.value||'—';
      button.title=selected.textContent;
    };
    const optionNodes=()=>[...menu.querySelectorAll('[role="option"]')];
    const highlight=index=>{
      const nodes=optionNodes();
      if(!nodes.length){activeIndex=-1;return;}
      activeIndex=Math.max(0,Math.min(index,nodes.length-1));
      nodes.forEach((node,i)=>{
        node.dataset.active=String(i===activeIndex);
        node.tabIndex=i===activeIndex?0:-1;
      });
      nodes[activeIndex].scrollIntoView({block:'nearest'});
    };
    const render=()=>{
      const query=search.value.toLocaleLowerCase().trim();
      values=[...select.options].filter(o=>o.value&&(`${o.value} ${o.textContent}`).toLocaleLowerCase().includes(query));
      const frag=document.createDocumentFragment();
      for(const o of values){
        const item=document.createElement('button');item.type='button';
        item.className='mmh-asia-picker-option-p94';item.setAttribute('role','option');item.dataset.value=o.value;
        item.setAttribute('aria-selected',String(o.value===select.value));
        const code=document.createElement('strong');code.textContent=o.value==='CNY'?'RMB':o.value;
        const name=document.createElement('span');name.textContent=o.textContent.includes(' · ')?o.textContent.split(' · ').slice(1).join(' · '):o.textContent;
        const mark=document.createElement('span');mark.className='mmh-asia-picker-check-p94';mark.textContent=o.value===select.value?'✓':'';mark.setAttribute('aria-hidden','true');
        item.append(code,name,mark);frag.append(item);
      }
      menu.replaceChildren(frag);
      if(!values.length){
        const empty=document.createElement('div');empty.className='mmh-asia-picker-empty-p94';empty.textContent=isChinese()?'没有匹配的货币':'No matching currencies';menu.append(empty);
        activeIndex=-1;return;
      }
      const pos=values.findIndex(o=>o.value===select.value);highlight(pos>=0?pos:0);
    };
    const position=()=>{
      if(!open)return;
      if(window.innerWidth<=600){panel.style.cssText='';return;}
      const r=button.getBoundingClientRect(),vw=window.innerWidth,vh=window.innerHeight;
      const width=Math.min(Math.max(288,r.width),Math.max(220,vw-24));
      const left=Math.min(Math.max(12,r.left),Math.max(12,vw-width-12));
      const spaceBelow=Math.max(0,vh-r.bottom-12),spaceAbove=Math.max(0,r.top-12);
      const below=spaceBelow>=Math.min(310,spaceAbove)||spaceBelow>=260;
      const available=(below?spaceBelow:spaceAbove);
      const height=Math.min(432,Math.max(170,available));
      panel.style.left=`${Math.round(left)}px`;panel.style.width=`${Math.round(width)}px`;
      panel.style.maxHeight=`${Math.round(height)}px`;
      panel.style.top=below?`${Math.round(r.bottom+7)}px`:'auto';
      panel.style.bottom=below?'auto':`${Math.round(vh-r.top+7)}px`;
      panel.dataset.placement=below?'bottom':'top';
    };
    const closeMenu=(restore=true)=>{
      if(!open)return;
      open=false;veil.hidden=true;panel.hidden=true;button.setAttribute('aria-expanded','false');
      button.classList.remove('is-open');document.documentElement.classList.remove('mmh-asia-select-open-p94');
      search.value='';
      if(restore&&page.classList.contains('active')&&document.contains(button))button.focus({preventScroll:true});
    };
    const choose=value=>{
      if(![...select.options].some(o=>o.value===value))return;
      if(select.value!==value){select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));}
      sync();closeMenu();
    };
    const openMenu=()=>{
      if(open)return;
      updateLabels();sync();lastFocus=document.activeElement;
      open=true;veil.hidden=false;panel.hidden=false;
      button.setAttribute('aria-expanded','true');button.classList.add('is-open');
      document.documentElement.classList.add('mmh-asia-select-open-p94');
      render();position();
      search.focus({preventScroll:true});
    };
    button.addEventListener('click',()=>open?closeMenu():openMenu());
    close.addEventListener('click',()=>closeMenu());veil.addEventListener('click',()=>closeMenu());
    menu.addEventListener('click',event=>{const target=event.target.closest('[data-value]');if(target&&menu.contains(target))choose(target.dataset.value)});
    search.addEventListener('input',()=>{render();position()});
    panel.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();closeMenu();return;}
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        event.preventDefault();highlight(activeIndex+(event.key==='ArrowDown'?1:-1));return;
      }
      if(event.key==='Home'){event.preventDefault();highlight(0);return;}
      if(event.key==='End'){event.preventDefault();highlight(values.length-1);return;}
      if(event.key==='Enter'&&values.length){event.preventDefault();choose(values[Math.max(activeIndex,0)].value);return;}
      if(event.key==='Tab'){closeMenu(false);}
    });
    button.addEventListener('keydown',event=>{
      if(['ArrowDown','ArrowUp',' ','Enter'].includes(event.key)&&!open){event.preventDefault();openMenu()}
    });
    // Keep the new UI synchronized when the existing rates script rebuilds native options,
    // when quick-currency buttons call draw() without dispatching change, or language switches.
    const observer=new MutationObserver(()=>{sync();if(open){const oldQuery=search.value;render();search.value=oldQuery;position()}});
    observer.observe(select,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['selected']});
    select.addEventListener('change',()=>{sync();if(open)render()});
    ['mmhvault-language-change','languagechange'].forEach(event=>window.addEventListener(event,()=>{updateLabels();sync();if(open)render()}));
    window.addEventListener('resize',()=>{if(!resizePending){resizePending=true;requestAnimationFrame(()=>{resizePending=false;position()})}},{passive:true});
    window.addEventListener('scroll',event=>{if(open&&!panel.contains(event.target))closeMenu(false)},{capture:true,passive:true});
    window.addEventListener('mmhvault:page-visible',()=>{if(!page.classList.contains('active'))closeMenu(false)});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)closeMenu(false)});
    sync();updateLabels();page.classList.add('mmh-asia-select-ready-p94');
    return true;
  };
  if(!start()){
    // Dynamic DOM startup fallback; disconnect immediately once the real Asia view exists.
    const watcher=new MutationObserver(()=>{if(start())watcher.disconnect()});
    watcher.observe(document.documentElement,{subtree:true,childList:true});
    document.addEventListener('DOMContentLoaded',()=>{if(start())watcher.disconnect()},{once:true});
  }
})();
