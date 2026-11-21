// N10 app-entry assurance helper — REVIEW ONLY. Not loaded by app.html.
// The caller must separately lock sensitive UI while awaiting this check.
// Frontend gating is defense in depth; APIs and RLS must enforce MFA themselves.
export async function assessWorkspaceMfa(auth, expectedUid, timeoutMs = 12000) {
  if (!auth || typeof expectedUid !== 'string' || !expectedUid) return 'deny';
  let timer;
  const limit = Number.isFinite(timeoutMs) && timeoutMs > 0 && timeoutMs <= 12000 ? timeoutMs : 12000;
  // Time out the whole check, not just the factor call. A late result must
  // never unlock an already-denied session. Default is a 12-second deadline.
  const verify = async () => {
  try {
    // Two session reads detect refresh/signout during asynchronous checks.
    // getUser validates the active bearer with Auth, not only cached user data.
    const first = await auth.getSession();
    const firstSession = first?.data?.session;
    if (first?.error || firstSession?.user?.id !== expectedUid ||
        typeof firstSession?.access_token !== 'string' ||
        !firstSession.access_token) return 'deny';
    const remote = await auth.getUser();
    if (remote?.error || remote?.data?.user?.id !== expectedUid ||
        remote.data.user.is_anonymous) return 'deny';

    const [assurance, inventory] = await Promise.all([
      auth.mfa.getAuthenticatorAssuranceLevel(), auth.mfa.listFactors()
    ]);
    const second = await auth.getSession();
    const lastSession = second?.data?.session;
    if (second?.error || lastSession?.user?.id !== expectedUid ||
        lastSession.access_token !== firstSession.access_token) return 'deny';
    if (assurance?.error || inventory?.error ||
        !Array.isArray(inventory?.data?.all)) return 'deny';
    // Unexpected types or factor statuses are not evidence of no MFA.
    if (inventory.data.all.some(f => !f ||
        (f.status !== 'verified' && f.status !== 'unverified'))) return 'deny';
    const hasVerified = inventory.data.all.some(f => f.status === 'verified');
    const current = assurance?.data?.currentLevel;
    const next = assurance?.data?.nextLevel;
    if (next !== 'aal1' && next !== 'aal2') return 'deny';
    if (next === 'aal2') {
      if (!hasVerified) return 'deny';  // inconsistent inventory
      if (current === 'aal2') return 'allow';
      if (current === 'aal1' || current === null) return 'challenge';
      return 'deny';
    }
    // No MFA promised: require an explicit AAL1 plus no verified factor.
    if (hasVerified || current !== 'aal1') return 'deny';
    return 'allow';
  } catch (_) {
    return 'deny'; // errors never unlock financial UI
  }
  };
  try {
    return await Promise.race([
      verify(),
      new Promise(resolve => { timer = setTimeout(() => resolve('deny'), limit); })
    ]);
  } catch (_) {
    return 'deny';
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
