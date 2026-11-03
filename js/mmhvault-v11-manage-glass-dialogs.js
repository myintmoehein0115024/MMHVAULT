/* MMHVAULT APP V11.4 — isolated glass UI for Manage Transaction Fields.
 * The canonical ledger, category persistence and history remain under V11 ownership.
 */
(() => {
  'use strict';
  const api=window.MMHV11TxFieldPrefs;
  if(!api||window.MMHV11ManageGlassV14)return;
  const fields={type:['Type','类型','အမျိုးအစား'],transaction:['Transaction','交易','ငွေစာရင်း'],category:['Category','分类','အုပ်စု']};
  const language=()=>{try{return String(localStorage.getItem('mmhvault_language_v3363')||document.documentElement.lang||'en').toLowerCase();}catch(_){return 'en';}};
  const tr=(en,zh,my)=>language().startsWith('zh')?zh:/^(my|mm|burmese)/.test(language())?my:en;
  const name=f=>tr(...fields[f]);
  const el=(tag,cls,text)=>{
    const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;
  };
  const btn=(label,callback,cls='')=>{
    const b=el('button','mmh-v14-btn '+cls,label);b.type='button';b.addEventListener('click',callback);return b;
  };
  const host=()=>document.getElementById('mmhManagerCategoriesPanelV445');
  const panel=()=>document.getElementById('mmhV12Manage');
  const oldCard=()=>host()?.querySelector('section.mmh-manager-card-v445');
  const nativeForm=()=>panel()?.querySelector('.mmh-manager-form-v445')||oldCard()?.querySelector('.mmh-manager-form-v445');
  const categories=()=>api.getCategoryEntries?.()||[];
  const entries=field=>field==='category'?categories():api.fieldItems(field);
  let modal=null,observer=null,observed=null,scheduled=false,lastFocus=null;
  const groupLabel=group=>{
    const names={
      Income:['Income','收入','ဝင်ငွေ'],Expense:['Expense','支出','အသုံးစရိတ်'],
      Personal:['Personal','个人','ကိုယ်ရေးကိုယ်တာ'],
      LoanIncome:['Loan income','借款收入','ချေးငွေဝင်ငွေ'],
      LoanExpense:['Loan expense','借出支出','ချေးငွေအသုံး'],
      Transfer:['Transfer','转账','လွှဲပြောင်း']
    };
    return names[group]?tr(...names[group]):String(group);
  };
  function summary(){
    const owner=api.isManaged(),h=host(),p=panel();
    if(!owner||!h||!p){
      h?.classList.remove('mmh-v14-enabled');
      document.getElementById('mmhV14Manage')?.remove();
      if(modal)close();
      return;
    }
    let root=document.getElementById('mmhV14Manage');
    if(!root){root=el('section');root.id='mmhV14Manage';h.insertBefore(root,p);}
    h.classList.add('mmh-v14-enabled');
    root.replaceChildren();
    const state=api.readiness(),top=el('div','mmh-v14-top'),left=el('div');
    left.append(el('h3','mmh-v14-heading',tr('Manage Transaction Fields','管理记账字段','ငွေစာရင်းအကွက်များ စီမံရန်')));
    left.append(el('div','mmh-v14-sub',tr('Manage your own bookkeeping labels and categories.','按自己的记账习惯管理字段。','သင့်စာရင်းပုံစံအတိုင်း စီမံနိုင်သည်။')));
    top.append(left);
    top.append(el('span','mmh-v14-state'+(state.ready?'':' is-unready'),state.ready?
      tr('Ready to record','可以开始记账','မှတ်တမ်းတင်နိုင်ပါပြီ'):
      tr('Setup needed','需要完成设置','ဆက်လက်သတ်မှတ်ရန် လိုအပ်')));
    root.append(top);
    const cards=el('div','mmh-v14-cards');root.append(cards);
    for(const field of ['type','transaction','category']){
      const items=entries(field),card=el('article','mmh-v14-card'),head=el('div','mmh-v14-card-top');
      head.append(el('h4','',name(field)),el('span','mmh-v14-count',String(items.length)+' '+tr('added','项','ခု')));
      card.append(head);
      const snippets=items.slice(0,3).map(x=>x.label||x.name).join(' · ');
      card.append(el('div','mmh-v14-samples',snippets?(snippets+(items.length>3?'…':'')):
        tr('No entries yet','尚未添加','မထည့်ရသေးပါ')));
      const manage=btn(tr('Manage ','管理 ','စီမံရန် ')+name(field),()=>open(field),'mmh-v14-manage');
      manage.setAttribute('aria-haspopup','dialog');card.append(manage);cards.append(card);
    }
    const preview=el('div','mmh-v14-preview');
    preview.append(el('strong','',tr('Add Transaction preview','新增交易显示预览','မှတ်တမ်းအသစ် အစမ်းကြည့်ရန်')));
    if(!state.ready)preview.append(el('div','mmh-v14-desc',state.reason));
    else {
      const chips=el('div','mmh-v14-chips');
      for(const field of ['type','transaction','category'])if(state.active[field])chips.append(el('span','mmh-v14-chip',name(field)));
      preview.append(chips);
    }
    root.append(preview);
  }
  function feedback(text,error=false){
    if(!modal)return;
    modal.feedback.textContent=text;
    modal.feedback.classList.toggle('is-error',error);
    modal.feedback.hidden=!text;
    modal.feedback.setAttribute('role',error?'alert':'status');
  }
  function renderList(){
    if(!modal||!api.isManaged())return;
    const {field,title,subtitle,list,nativeSlot,editorSlot}=modal;
    title.textContent=tr('Manage ','管理 ','စီမံရန် ')+name(field);
    subtitle.textContent=field==='category'?
      tr('Removing a Category here does not delete historical transactions.',
        '这里移除分类不会删除历史交易记录。',
        'ဖယ်ရှားခြင်းသည် မှတ်တမ်းဟောင်းများကို မဖျက်ပါ။'):
      tr('Custom names always retain their original financial meaning.',
        '自定义名称始终保留原有财务含义。',
        'မူလ ငွေစာရင်းအဓိပ္ပာယ်ကို ထိန်းသိမ်းထားသည်။');
    list.replaceChildren();
    if(field==='category'){
      if(modal.categoryForm&&modal.categoryForm.parentElement!==nativeSlot)nativeSlot.append(modal.categoryForm);
      nativeSlot.hidden=!modal.categoryForm;
      if(!modal.categoryForm)nativeSlot.replaceChildren(el('div','mmh-v14-help',tr(
        'Category editor unavailable; reopen Manage.','分类编辑器暂不可用，请重新打开 Manage。',
        'Category ပြင်ရန် မရနိုင်ပါ။')));
    } else nativeSlot.hidden=true;
    const items=entries(field);
    if(!items.length)list.append(el('div','mmh-v14-empty',tr('Nothing added yet','尚未添加','မထည့်ရသေးပါ')));
    for(const item of items){
      const row=el('div','mmh-v14-row'),info=el('div','mmh-v14-entry',item.label||item.name);
      info.append(el('small','',field==='category'?groupLabel(item.group):
        tr('Financial meaning: ','财务归属：','ငွေစာရင်းအဓိပ္ပာယ်: ')+
        (api.describeCanonical?.(field,item.canonical)||item.canonical)));
      row.append(info);
      const actions=el('div','mmh-v14-actions');
      const edit=btn(tr('Edit','编辑','ပြင်ရန်'),()=>{
        if(field==='category'){
          if(typeof window.mmhVaultEditCategoryV449==='function'){
            close();window.mmhVaultEditCategoryV449(item.group,item.name);
          }else feedback(tr('Category editor is unavailable.','分类编辑暂不可用。','ပြင်ဆင်ရန် မရနိုင်ပါ။'),true);
        } else {modal.chosen=item;modal.confirm=null;paintEditor();}
      });
      edit.setAttribute('aria-label',tr('Edit ','编辑 ','ပြင်ရန် ')+(item.label||item.name));
      const remove=btn(tr('Remove','移除','ဖယ်ရှား'),()=>{
        modal.confirm=item;modal.chosen=null;paintEditor();
      },'mmh-v14-danger');
      remove.setAttribute('aria-label',tr('Remove ','移除 ','ဖယ်ရှားရန် ')+(item.label||item.name));
      actions.append(edit,remove);
      if(field==='category'&&typeof window.mmhVaultArchiveCategoryV445==='function'){
        const archive=btn(tr('Archive','归档','သိမ်းဆည်းရန်'),()=>{
          close();window.mmhVaultArchiveCategoryV445(item.group,item.name);
        });
        archive.setAttribute('aria-label',tr('Archive ','归档 ','သိမ်းရန် ')+item.name);
        actions.append(archive);
      }
      row.append(actions);list.append(row);
    }
    if(field==='category'){
      const archived=api.getArchivedCategoryEntries?.()||[];
      if(archived.length){
        list.append(el('h4','',tr('Archived Categories','已归档分类','သိမ်းထားသော အုပ်စုများ')));
        for(const item of archived){
          const row=el('div','mmh-v14-row'),info=el('div','mmh-v14-entry',item.name);
          info.append(el('small','',groupLabel(item.group)));row.append(info);
          const restore=btn(tr('Restore','恢复','ပြန်ယူရန်'),()=>{
            if(typeof window.mmhVaultRestoreCategoryV445==='function'){
              window.mmhVaultRestoreCategoryV445(item.group,item.name);
              feedback(tr('Category restored.','分类已恢复。','ပြန်ယူပြီးပါပြီ။'));
              schedule();
            }else feedback(tr('Restore unavailable.','恢复暂不可用。','ပြန်ယူ၍မရပါ။'),true);
          });
          row.append(restore);list.append(row);
        }
      }
    }
    if(field!=='category'){
      const add=btn(tr('+ Add ','+ 新增 ','+ အသစ်ထည့်ရန် ')+name(field),()=>{
        modal.chosen={new:true};modal.confirm=null;paintEditor();modal.editorSlot.querySelector('input')?.focus();
      },'mmh-v14-manage');
      add.style.marginTop='14px';list.append(add);
    }
    if(modal.confirm||modal.chosen)paintEditor();
    else{editorSlot.hidden=true;editorSlot.replaceChildren();}
  }
  function clearEditor(){
    if(!modal)return;
    modal.chosen=null;modal.confirm=null;modal.editorSlot.replaceChildren();modal.editorSlot.hidden=true;
  }
  function paintEditor(){
    if(!modal||!api.isManaged())return;
    const slot=modal.editorSlot;slot.replaceChildren();slot.hidden=false;
    if(modal.confirm){
      const item=modal.confirm;
      slot.append(el('h4','',tr('Confirm removal','确认移除','ဖယ်ရှားရန် အတည်ပြုပါ')));
      slot.append(el('p','mmh-v14-help',modal.field==='category'?
        tr('Remove from future entries only. Historical records and stored Categories stay intact.',
          '仅从未来交易选项移除；历史记录及已有分类仍保留。',
          'မှတ်တမ်းဟောင်းများ မပြောင်းလဲပါ။'):
        tr('This removes the display option, not existing ledger records.',
          '只移除显示选项，不更改历史账目。',
          'မှတ်တမ်းဟောင်းများ မပြောင်းလဲပါ။')));
      const footer=el('div','mmh-v14-footer');
      footer.append(btn(tr('Cancel','取消','မလုပ်တော့ပါ'),clearEditor));
      footer.append(btn(tr('Remove','确认移除','ဖယ်ရှားပါ'),()=>{
        const ok=modal.field==='category'?!!api.removeCategory?.(item.raw):
          !!api.removeName(modal.field,item);
        if(!modal)return;
        if(ok){
          clearEditor();feedback(tr('Removed from new-entry choices.','已从新交易选项移除。','အသစ်အတွက် ဖယ်ရှားပြီးပါပြီ။'));
          summary();renderList();
        }else feedback(tr('Removal was not saved.','移除未保存。','မသိမ်းနိုင်ပါ။'),true);
      },'mmh-v14-danger'));
      slot.append(footer);return;
    }
    const item=modal.chosen;
    if(!item){slot.hidden=true;return;}
    const isNew=!!item.new;
    slot.append(el('h4','',isNew?tr('Add a display name','添加显示名称','အမည်အသစ် ထည့်ရန်'):
      tr('Edit display name','编辑显示名称','အမည် ပြင်ရန်')));
    const label=el('label','mmh-v14-field');label.append(el('span','',tr('Display name','显示名称','ပြသမည့်အမည်')));
    const input=el('input','mmh-v14-input');
    input.type='text';input.maxLength=40;input.autocomplete='off';input.value=isNew?'':item.label;
    label.append(input);slot.append(label);
    const meaning=el('label','mmh-v14-field');meaning.append(el('span','',tr('Financial meaning','财务归属','ငွေစာရင်းအဓိပ္ပာယ်')));
    const select=el('select','mmh-v14-select');
    for(const choice of api.canonicalChoices?.(modal.field)||[]){
      const option=el('option','',choice.label);option.value=choice.value;
      if(!isNew&&choice.value===item.canonical)option.selected=true;
      select.append(option);
    }
    select.disabled=!isNew;meaning.append(select);slot.append(meaning);
    slot.append(el('p','mmh-v14-help',tr('Names never change the underlying accounting code.',
      '修改名称不会改变真实收入、支出或转账代码。',
      'အမည်ပြောင်းသော်လည်း စာရင်းကုဒ် မပြောင်းပါ။')));
    const footer=el('div','mmh-v14-footer');
    footer.append(btn(tr('Cancel','取消','မလုပ်တော့ပါ'),clearEditor));
    const save=btn(tr('Save changes','保存修改','သိမ်းဆည်းရန်'),()=>{
      const value=input.value.trim();
      if(!value){feedback(tr('Enter a display name.','请输入名称。','အမည် ဖြည့်ပါ။'),true);input.focus();return;}
      const canonical=isNew?select.value:item.canonical;
      const ok=api.saveName(modal.field,isNew?null:item,canonical,value);
      if(!modal)return;
      if(ok){
        clearEditor();feedback(tr('Changes saved.','修改已保存。','သိမ်းဆည်းပြီးပါပြီ။'));
        summary();renderList();
      }else feedback(tr('Could not save. Check the name and financial meaning.',
        '保存失败，请检查名称和财务归属。','အမည်နှင့် အဓိပ္ပာယ်ကို စစ်ဆေးပါ။'),true);
    },'mmh-v14-manage');
    footer.append(save);slot.append(footer);
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();save.click();}});
  }
  function close(){
    if(!modal)return;
    const previous=modal;modal=null;
    if(previous.categoryForm){const card=oldCard();if(card)card.append(previous.categoryForm);}
    previous.overlay.remove();document.body.classList.remove('mmh-v14-modal-open');
    api.refreshManage();
    if(lastFocus?.isConnected)lastFocus.focus();
    lastFocus=null;
  }
  function open(field){
    if(!api.isManaged()||!fields[field])return;
    if(modal)close();
    lastFocus=document.activeElement;
    const overlay=el('div','mmh-v14-shade'),dialog=el('div','mmh-v14-dialog');
    dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
    const header=el('div','mmh-v14-dialog-head'),text=el('div');
    const title=el('h3');title.id='mmhV14DialogTitle';
    const subtitle=el('div','mmh-v14-desc');text.append(title,subtitle);header.append(text);
    const closeButton=btn('×',close,'mmh-v14-close');
    closeButton.setAttribute('aria-label',tr('Close','关闭','ပိတ်ရန်'));header.append(closeButton);
    dialog.setAttribute('aria-labelledby',title.id);
    const content=el('div','mmh-v14-scroll'),nativeSlot=el('div','mmh-v14-native'),
      list=el('div','mmh-v14-list'),editorSlot=el('div','mmh-v14-editor'),
      status=el('div','mmh-v14-feedback');
    editorSlot.hidden=true;status.hidden=true;
    content.append(nativeSlot,list,editorSlot,status);dialog.append(header,content);overlay.append(dialog);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    overlay.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();close();return;}
      if(e.key!=='Tab')return;
      const focusable=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])')]
        .filter(x=>x.getClientRects().length);
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    });
    modal={field,overlay,dialog,title,subtitle,nativeSlot,list,editorSlot,feedback:status,
      categoryForm:field==='category'?nativeForm():null,chosen:null,confirm:null};
    document.body.append(overlay);document.body.classList.add('mmh-v14-modal-open');
    renderList();closeButton.focus();
  }
  function sync(){
    scheduled=false;
    const p=panel();
    if(p&&observed!==p&&typeof MutationObserver==='function'){
      observer?.disconnect();observed=p;observer=new MutationObserver(schedule);observer.observe(p,{childList:true});
    }
    summary();
    if(modal){
      if(!api.isManaged())close();
      else if(!modal.chosen&&!modal.confirm)renderList();
    }
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(sync);
    else setTimeout(sync,0);
  }
  function boot(){
    sync();
    for(const event of ['mmhvault:config-owner-changed','mmhvault:config-cloud-synced',
      'mmhvault:category-config-changed','mmhvault:data-loaded','mmhvault-language-change'])
      window.addEventListener(event,schedule);
  }
  window.MMHV11ManageGlassV14={open,close,refresh:schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();