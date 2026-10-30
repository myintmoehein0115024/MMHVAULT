// N10 conditional MFA gate for the draft AI Edge endpoint (NOT deployed).
// Only call after the Supabase Auth server has validated the bearer JWT.
// A verified-factor observation from Auth is an additional defensive check.
export function evaluateMfaAssurance(assurance, authHasVerifiedFactor = false) {
  if (!assurance || typeof assurance !== "object") return "unavailable";
  const { currentLevel, nextLevel } = assurance;
  const validCurrent = currentLevel === null || currentLevel === "aal1" || currentLevel === "aal2";
  const validNext = nextLevel === null || nextLevel === "aal1" || nextLevel === "aal2";
  if (!validCurrent || !validNext) return "unavailable";
  // If the verified user record reports MFA enrollment, never allow AAL1.
  // This also catches mismatches from older SDKs that do not process a
  // supplied JWT when no session is persisted on the Edge Function.
  if (authHasVerifiedFactor === true) {
    if (nextLevel !== "aal2") return "unavailable";
    return currentLevel === "aal2" ? "allowed" : "required";
  }
  if (nextLevel === "aal2") {
    return currentLevel === "aal2" ? "allowed" : "required";
  }
  if (nextLevel === "aal1") return "allowed";
  // Official Supabase Auth semantics: a verified legacy JWT may have
  // currentLevel and nextLevel BOTH null when the JWT omits "aal" and
  // no verified second factor exists. Do not lock this user out.
  if (currentLevel === null && nextLevel === null) return "allowed";
  // Other null nextLevel cases indicate an inconsistent authentication state.
  return "unavailable";
}
