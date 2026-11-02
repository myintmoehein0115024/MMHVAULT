/**
 * Synthetic oracle for reviewing a future N10 Staging session + MFA guard.
 * Mirrors the intended SQL predicate; NEVER reads sessions or connects to DB.
 * Not imported by any production frontend, Edge function, or backend.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function evaluateSyntheticAalSession({
  userId, sessionId, expectedAal, session, factors = [], nowMs = Date.now()
} = {}) {
  if (typeof userId !== 'string' || !UUID.test(userId) ||
      typeof sessionId !== 'string' || !UUID.test(sessionId) ||
      !session || typeof session !== 'object' || !Array.isArray(factors) ||
      !Number.isFinite(nowMs)) return false;
  if (session.id !== sessionId || session.user_id !== userId) return false;
  if (session.not_after !== null && session.not_after !== undefined) {
    const expiresAt = Date.parse(session.not_after);
    if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) return false;
  }
  if (expectedAal === 'aal1') {
    return session.aal === 'aal1' &&
      (session.factor_id === null || session.factor_id === undefined) &&
      !factors.some(f => f?.user_id === userId && f?.status === 'verified');
  }
  if (expectedAal === 'aal2') {
    return session.aal === 'aal2' &&
      typeof session.factor_id === 'string' && UUID.test(session.factor_id) &&
      factors.some(f => f?.id === session.factor_id &&
                        f?.user_id === userId &&
                        f?.status === 'verified');
  }
  return false;
}
