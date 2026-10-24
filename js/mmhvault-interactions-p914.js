/* MMHVAULT P9.14 — Asia market currency picker. UI-only progressive enhancement.
   The original select remains the source of truth for the existing rates module.
   Does not write any account/rate data or replace financial calculation handlers. */
(() => {
  'use strict';
  const init = () => {
    const root = document.getElementById('exAsiaV10');
    const select = document.getElementById('asiaBaseV10');
    if (!root || !select || select.dataset.p914Enhanced === '1' || typeof HTMLDialogElement === 'undefined' || !('showModal' in HTMLDialogElement.prototype)) return;

    const oldLabel = select.closest('label');
    if (!oldLabel || !oldLabel.parentElement) return;
    // Avoid the label element opening a native select when its caption is tapped.
    const field = document.createElement('div');
    field.className = 'mmh-asia-picker-field-p914';
    while (oldLabel.firstChild) field.appendChild(oldLabel.firstChild);
    oldLabel.replaceWith(field);
    const caption = field.querySelector('span');
    if (caption) caption.id = 'mmhAsiaPickerCaptionP914';
    select.dataset.p914Enhanced = '1';
    select.classList.add('mmh-asia-native-select-p914');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = 'mmhAsiaPickerTriggerP914';
    trigger.className = 'mmh-asia-picker-trigger-p914';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-labelledby', caption ? `${caption.id} mmhAsiaPickerValueP914` : 'mmhAsiaPickerValueP914');
    const value = document.createElement('span');
    value.id = 'mmhAsiaPickerValueP914';
    const arrow = document.createElement('span');
    arrow.className = 'mmh-asia-picker-arrow-p914';
    arrow.textContent = '⌄';
    arrow.setAttribute('aria-hidden', 'true');
    trigger.append(value, arrow);
    field.appendChild(trigger);

    const overlay = document.createElement('dialog');
    overlay.className = 'mmh-asia-picker-dialog-p914';
    overlay.id = 'mmhAsiaPickerDialogP914';
    overlay.setAttribute('aria-labelledby', 'mmhAsiaPickerTitleP914');
    overlay.innerHTML = '<div class="mmh-asia-picker-shell-p914"><div class="mmh-asia-picker-head-p914"><div><div class="mmh-asia-picker-eyebrow-p914">MMHVAULT · ASIA MARKET</div><h3 id="mmhAsiaPickerTitleP914"></h3></div><button type="button" class="mmh-asia-picker-close-p914" aria-label="Close">✕</button></div><div class="mmh-asia-picker-search-wrap-p914"><input type="search" class="mmh-asia-picker-search-p914" autocomplete="off" spellcheck="false" /></div><div class="mmh-asia-picker-options-p914" aria-label="Currencies"></div><div class="mmh-asia-picker-foot-p914"></div></div>';
    document.body.appendChild(overlay);
    const title = overlay.querySelector('h3');
    const close = overlay.querySelector('.mmh-asia-picker-close-p914');
    const search = overlay.querySelector('.mmh-asia-picker-search-p914');
    const options = overlay.querySelector('.mmh-asia-picker-options-p914');
    const foot = overlay.querySelector('.mmh-asia-picker-foot-p914');
    const cn = () => document.documentElement.lang?.startsWith('zh') || document.body.dataset.lang === 'zh' || (typeof lang !== 'undefined' && lang === 'zh');
    const tr = (en, zh) => cn() ? zh : en;
    const valueText = () => select.selectedOptions[0]?.textContent?.trim() || select.value || '—';

    const sync = () => { value.textContent = valueText(); };
    const choose = currency => {
      if (![...select.options].some(option => option.value === currency)) return;
      select.value = currency;
      // Original Asia rates draw(), quick shortcuts and live preview stay authoritative.
      select.dispatchEvent(new Event('change', { bubbles: true }));
      sync();
      overlay.close('selected');
    };
    const render = () => {
      const q = search.value.trim().toLocaleLowerCase();
      options.replaceChildren();
      const filtered = [...select.options].filter(option => (option.textContent + ' ' + option.value).toLocaleLowerCase().includes(q));
      for (const option of filtered) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'mmh-asia-picker-option-p914';
        button.setAttribute('aria-pressed', String(option.value === select.value));
        const left = document.createElement('span');
        left.className = 'mmh-asia-picker-option-label-p914';
        left.textContent = option.textContent;
        const right = document.createElement('span');
        right.className = 'mmh-asia-picker-check-p914';
        right.textContent = option.value === select.value ? '✓' : '›';
        button.append(left, right);
        button.addEventListener('click', () => choose(option.value));
        options.appendChild(button);
      }
      if (!filtered.length) {
        const empty = document.createElement('p');
        empty.className = 'mmh-asia-picker-empty-p914';
        empty.textContent = tr('No matching currencies', '没有匹配的货币');
        options.appendChild(empty);
      }
      foot.textContent = tr(`${filtered.length} currencies · Reference rates only`, `${filtered.length} 种货币 · 仅供参考`);
    };
    const open = () => {
      if (overlay.open) return;
      title.textContent = tr('Select reference currency', '选择基准货币');
      close.setAttribute('aria-label', tr('Close currency picker', '关闭货币选择'));
      search.placeholder = tr('Search by currency or country', '搜索货币或国家');
      search.setAttribute('aria-label', search.placeholder);
      search.value = '';
      render();
      try {
        overlay.showModal();
        trigger.setAttribute('aria-expanded', 'true');
        requestAnimationFrame(() => search.focus({ preventScroll: true }));
      } catch (error) {
        console.warn('[MMHVAULT] Currency picker fallback:', error);
        // If showModal fails, keep the native selector usable.
        select.classList.remove('mmh-asia-native-select-p914');
        select.removeAttribute('aria-hidden');
        select.tabIndex = 0;
        trigger.hidden = true;
      }
    };
    trigger.addEventListener('click', open);
    close.addEventListener('click', () => overlay.close('cancel'));
    overlay.addEventListener('click', event => { if (event.target === overlay) overlay.close('cancel'); });
    overlay.addEventListener('close', () => {
      trigger.setAttribute('aria-expanded', 'false');
      if (!trigger.hidden && trigger.isConnected) trigger.focus({ preventScroll: true });
    });
    search.addEventListener('input', render);
    select.addEventListener('change', sync);
    new MutationObserver(sync).observe(select, { childList: true, characterData: true, subtree: true });
    ['mmhvault-language-change', 'languagechange'].forEach(ev => window.addEventListener(ev, () => { sync(); if (overlay.open) { title.textContent = tr('Select reference currency', '选择基准货币'); render(); } }));
    sync();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
