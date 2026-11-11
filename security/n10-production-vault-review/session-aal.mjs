/**
 * Review-only N10 Vault: derive required DB session assurance from factors
 * returned by server-side admin.mfa.listFactors after a valid Auth JWT.
 * Browser-supplied claims must never be used to choose the assurance level.
 * This helper does NOT validate JWTs and cannot authorize Vault disclosure.
 */
export function sessionAalFromVerifiedFactors(factors) {
  if (!Array.isArray(factors)) return null;
  let hasVerified = false;
  for (const item of factors) {
    if (!item || typeof item !== 'object' ||
        (item.status !== 'verified' && item.status !== 'unverified'))
      return null;
    if (item.status === 'verified') hasVerified = true;
  }
  return hasVerified ? 'aal2' : 'aal1';
}
