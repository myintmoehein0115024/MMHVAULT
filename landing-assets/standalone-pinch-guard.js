/* MMHVAULT L1.27 — no accidental pinch zoom inside installed PWA only.
   Do not alter the ordinary Safari/Chrome page, the viewport meta tag, or
   operating-system accessibility zoom. Normal one-finger scrolling remains. */
(() => {
  'use strict';
  const standalone = Boolean(window.matchMedia &&
    window.matchMedia('(display-mode: standalone)').matches) ||
    navigator.standalone === true;
  if (!standalone) return;
  const root = document.documentElement;
  root.classList.add('mmh-standalone-pinch-guard');
  // Touch-action allows ordinary panning, but deliberately omits pinch-zoom.
  root.style.touchAction = 'pan-x pan-y';
  if (document.body) document.body.style.touchAction = 'pan-x pan-y';
  const block = event => {
    if (event.cancelable) event.preventDefault();
  };
  document.addEventListener('gesturestart', block, {passive:false});
  document.addEventListener('gesturechange', block, {passive:false});
  const multiTouchOnly = event => {
    if (event.touches && event.touches.length > 1) block(event);
  };
  document.addEventListener('touchstart', multiTouchOnly, {passive:false});
  document.addEventListener('touchmove', multiTouchOnly, {passive:false});
})();
