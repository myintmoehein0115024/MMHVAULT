/* MMHVAULT Liquid Invest P3.2 — scoped presentation mount only.
   Reuses the original investment editor form and its submit, upload and cancel handlers. */
(function () {
  'use strict';
  function mountEditor() {
    const form = document.getElementById('editInvForm');
    if (!form || form.dataset.mmhInvestP32 === '1') return;
    const actions = Array.from(form.children).find(node => node.classList && node.classList.contains('actions'));
    if (!actions) return;
    const scroll = document.createElement('div');
    scroll.className = 'mmh-invest-edit-scroll-p32';
    // Move the live form fields rather than cloning or replacing them: data and handlers survive.
    while (form.firstChild && form.firstChild !== actions) scroll.appendChild(form.firstChild);
    form.insertBefore(scroll, actions);
    form.classList.add('mmh-invest-edit-p32');
    form.dataset.mmhInvestP32 = '1';
    const drop = scroll.querySelector('.receipt-dropzone-v3300');
    if (drop && !drop.querySelector('.mmh-invest-receipt-cta-p32')) {
      const hint = document.createElement('span');
      hint.className = 'mmh-invest-receipt-cta-p32';
      hint.textContent = 'Browse files ↗';
      drop.appendChild(hint);
    }
  }
  function syncInvestmentDelete() {
    const overlay = document.getElementById('mmhVaultDialogV449');
    if (!overlay) return;
    const title = overlay.querySelector('#mmhVaultDialogTitleV449')?.textContent?.trim() || '';
    const shouldShow = overlay.classList.contains('show') && title === 'Delete Investment';
    if (overlay.classList.contains('mmh-invest-confirm-p32') !== shouldShow) {
      overlay.classList.toggle('mmh-invest-confirm-p32',shouldShow);
    }
  }
  function boot() {
    const editBody = document.getElementById('editModalBody');
    const overlay = document.getElementById('mmhVaultDialogV449');
    if (editBody && !editBody.dataset.mmhP32Observer) {
      editBody.dataset.mmhP32Observer = '1';
      new MutationObserver(mountEditor).observe(editBody,{childList:true});
      mountEditor();
    }
    if (overlay && !overlay.dataset.mmhP32Observer) {
      overlay.dataset.mmhP32Observer = '1';
      new MutationObserver(syncInvestmentDelete).observe(overlay,{attributes:true,attributeFilter:['class']});
      syncInvestmentDelete();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
