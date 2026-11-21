/**
 * MMHVAULT N10: standalone review-only browser transport for viewing ORIGINAL
 * recovery words. No production entrypoint imports this file. Release OFF.
 * The future server MUST independently validate signed session, owner, MFA,
 * password, Vault ownership and rate limits. Browser guards are not authorization.
 */
export const ORIGINAL_RECOVERY_ENDPOINT = 'https://vrypucmyrztxgiqhjspd.supabase.co/functions/v1/mmh-n10-fixed-recovery';
const TRUSTED_ORIGIN = 'https://mmhvault.com';
const MAX_RESULT_BYTES = 2500;
const RESPONSE_CODES = new Set([
  'backup_status', 'recovery_key', 'backup_not_ready', 'invalid_credentials',
  'mfa_required', 'sign_in_required', 'session_expired', 'too_many_attempts',
  'username_only_required', 'recovery_service_not_released', 'unavailable',
  'mfa_unavailable', 'session_check_unavailable', 'rate_unavailable',
]);
function allowedUrl(locationOrigin) {
  try {
    return new URL(locationOrigin).origin === TRUSTED_ORIGIN &&
      new URL(locationOrigin).protocol === 'https:';
  } catch { return false; }
}
async function boundedJson(response) {
  const contentType = response.headers?.get?.('content-type') || '';
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) throw Error('bad_content_type');
  const length = response.headers?.get?.('content-length');
  if (length && (!/^\d+$/.test(length) || +length > MAX_RESULT_BYTES)) throw Error('bad_length');
  if (!response.body?.getReader) throw Error('missing_stream');
  const reader = response.body.getReader();
  const chunks = [];
  let lengthRead = 0;
  try {
    for (;;) {
      const {value, done} = await reader.read();
      if (done) break;
      lengthRead += value.length;
      if (lengthRead > MAX_RESULT_BYTES) {
        await reader.cancel('response too large');
        throw Error('oversized_response');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const data = new Uint8Array(lengthRead);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  const parsed = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(data));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('bad_json');
  return parsed;
}
export function createRecoveryTransport({
  auth, fetcher = fetch,
  origin = typeof location === 'undefined' ? '' : location.origin,
  releaseEnabled = false,
  timeoutMs = 12000,
  setTimer = setTimeout, clearTimer = clearTimeout,
} = {}) {
  if (!auth || typeof auth.getUser !== 'function' || typeof auth.getSession !== 'function' ||
      typeof fetcher !== 'function' || typeof setTimer !== 'function' ||
      typeof clearTimer !== 'function') throw Error('invalid_recovery_transport_dependencies');
  return async function request(action, fields = {}) {
    // Hard OFF until an explicitly approved UI integration passes this gate.
    // The independent server-side release flag remains OFF before backend QA.
    if (releaseEnabled !== true || !allowedUrl(origin)) return {code: 'unavailable'};
    if (action !== 'status' && action !== 'reveal') return {code: 'unavailable'};
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return {code: 'unavailable'};
    if (action === 'reveal' &&
       (typeof fields.password !== 'string' || fields.password.length < 6 || fields.password.length > 20))
      return {code: 'invalid_credentials'};
    try {
      // Verify the precise bearer token being sent, rather than trusting
      // the unverified user object stored in the browser session.
      const {data: sessionData, error: sessionError} = await auth.getSession();
      const session = sessionData?.session;
      if (sessionError || typeof session?.access_token !== 'string' || !session.access_token)
        return {code: 'sign_in_required'};
      const {data: userData, error: userError} = await auth.getUser(session.access_token);
      const user = userData?.user;
      if (userError || !user?.id || user.is_anonymous === true ||
          session.user?.id !== user.id) return {code: 'sign_in_required'};
      const signalController = new AbortController();
      const timeout = setTimer(() => signalController.abort(), timeoutMs);
      try {
        const body = action === 'status' ? {action: 'status'} : {action: 'reveal', password: fields.password};
        const result = await fetcher(ORIGINAL_RECOVERY_ENDPOINT, {
          method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error',
          referrerPolicy: 'no-referrer', signal: signalController.signal,
          headers: {'content-type': 'application/json', authorization: 'Bearer ' + session.access_token},
          body: JSON.stringify(body),
        });
        if (!result || result.redirected === true) return {code: 'unavailable'};
        const data = await boundedJson(result);
        // Never disclose a server response after local logout, account switch,
        // or silent token rotation during the awaited request. This is a UI
        // defense-in-depth check, not a substitute for server-side revocation.
        const {data: currentSessionData, error: currentSessionError} = await auth.getSession();
        const currentSession = currentSessionData?.session;
        if (currentSessionError || currentSession?.user?.id !== user.id ||
            currentSession?.access_token !== session.access_token)
          return {code: 'sign_in_required'};
        const {data: currentUserData, error: currentUserError} = await auth.getUser(currentSession.access_token);
        if (currentUserError || currentUserData?.user?.id !== user.id ||
            currentUserData.user.is_anonymous === true)
          return {code: 'sign_in_required'};
        if (!RESPONSE_CODES.has(data.code)) return {code: 'unavailable'};
        // A status request must NEVER accept words, even from a broken or
        // compromised server. Likewise reveal cannot be treated as status.
        if (action === 'status' && data.code === 'recovery_key') return {code: 'unavailable'};
        if (action === 'reveal' && data.code === 'backup_status') return {code: 'unavailable'};
        if (!result.ok && data.code === 'recovery_key') return {code: 'unavailable'};
        if (data.code === 'backup_status') {
          if (!result.ok || typeof data.backed_up !== 'boolean') return {code: 'unavailable'};
          return {code: 'backup_status', backed_up: data.backed_up};
        }
        if (data.code === 'recovery_key') {
          if (!result.ok || !Array.isArray(data.words) || data.words.length !== 10 ||
              data.words.some(w => typeof w !== 'string' || !/^[a-z]{2,13}$/.test(w)) ||
              data.expires_in_seconds !== 45) return {code: 'unavailable'};
          return {code: 'recovery_key', words: [...data.words], expires_in_seconds: 45};
        }
        return {code: data.code};
      } finally { clearTimer(timeout); }
    } catch { return {code: 'unavailable'}; }
  };
}
