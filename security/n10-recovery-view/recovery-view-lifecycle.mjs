/**
 * N10 Recovery Key view lifetime protections — review-only, NOT LOADED.
 * Reuses the existing Password & Devices modal; never constructs a second UI.
 * A future integration must keep the already-running original UI OFF until
 * the separately reviewed Vault service and signed E2E safety gates pass.
 */
const INVALIDATING_AUTH_EVENTS = new Set([
  'SIGNED_OUT', 'SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED',
  'PASSWORD_RECOVERY', 'MFA_CHALLENGE_VERIFIED',
]);
export function attachRecoveryViewLifecycle({
  controller,
  documentRef,
  windowRef,
  auth,
  closeTargets = [],
} = {}) {
  if (typeof controller?.hide !== 'function' ||
      typeof documentRef?.addEventListener !== 'function' ||
      typeof windowRef?.addEventListener !== 'function' ||
      typeof auth?.onAuthStateChange !== 'function' ||
      !Array.isArray(closeTargets) ||
      closeTargets.some(el => typeof el?.addEventListener !== 'function'))
    throw Error('invalid_recovery_lifecycle_dependencies');

  let closed = false;
  let subscription = null;
  const hide = () => { if (!closed) controller.hide(); };
  const onVisibility = () => { if (documentRef.hidden === true) hide(); };
  const onPageHide = () => hide();
  const onClose = () => hide();
  const onAuth = event => {
    if (INVALIDATING_AUTH_EVENTS.has(event)) hide();
  };
  const subscriptions = [];
  const wire = (target, event, handler) => {
    target.addEventListener(event, handler);
    subscriptions.push([target, event, handler]);
  };
  const detach = () => {
    for (const [target, event, handler] of subscriptions)
      target.removeEventListener(event, handler);
    subscriptions.length = 0;
    if (subscription) {
      try { subscription.unsubscribe(); } catch { /* already signed out */ }
      subscription = null;
    }
  };

  try {
    wire(documentRef, 'visibilitychange', onVisibility);
    wire(windowRef, 'pagehide', onPageHide);
    for (const target of closeTargets) wire(target, 'click', onClose);
    const result = auth.onAuthStateChange(onAuth);
    subscription = result?.data?.subscription;
    if (typeof subscription?.unsubscribe !== 'function')
      throw Error('recovery_auth_observer_unavailable');
    if (documentRef.hidden === true) hide();
  } catch {
    detach();
    controller.hide();
    throw Error('recovery_lifecycle_unavailable');
  }

  return Object.freeze({
    destroy() {
      if (closed) return;
      hide();
      closed = true;
      detach();
    },
  });
}
