// N10 candidate-only MFA decision. No network, storage or user data.
// Return an explicit decision rather than letting missing assurance states pass.
export function evaluateMfaAssurance(assurance) {
  if (!assurance || typeof assurance !== "object") return "unavailable";
  const { currentLevel, nextLevel } = assurance;
  // nextLevel is computed from the account's verified factors and MUST be known.
  // A missing AAL on a legacy JWT may yield currentLevel === null (AAL1).
  if (nextLevel !== "aal1" && nextLevel !== "aal2") return "unavailable";
  if (currentLevel !== null && currentLevel !== "aal1" && currentLevel !== "aal2") {
    return "unavailable";
  }
  if (nextLevel === "aal2" && currentLevel !== "aal2") return "required";
  return "allowed";
}
