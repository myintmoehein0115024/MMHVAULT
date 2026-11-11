/**
 * MMHVAULT N10 fixed original recovery words — offline orchestration candidate.
 * NOT DEPLOYED. The production username Edge, Auth, SQL and UI are unchanged.
 *
 * The REAL service must invoke the original signed reservation/HMAC logic and
 * owner-pinned, service-role-only Vault RPCs. This module never generates,
 * resets or rotates an existing Recovery Key.
 */
const USERNAME = /^[a-z][a-z0-9_]{3,19}$/;
const TICKET = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID = TICKET;
const WORDS = /^([a-z]{2,13} ){9}[a-z]{2,13}$/;
const REQUIRED = [
  'vaultReady', 'claimReservation', 'createNewUser', 'saveLegacyVerifier',
  'encryptOriginalWords', 'readBackOriginalWords', 'linkUsername',
  'createVerifiedSession', 'rollbackNewUser', 'releaseReservation',
];

function normalizeWords(input) {
  if (typeof input !== 'string' || input.length > 250) return null;
  const text = input.trim().toLowerCase().replace(/\s+/g, ' ');
  return WORDS.test(text) ? text : null;
}

function sameWords(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  // Fixed-length lexical comparison to reject any mismatched escrow copy.
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return difference === 0;
}

export function createEscrowedUsernameEnrollment(dependencies) {
  if (!dependencies || REQUIRED.some(k => typeof dependencies[k] !== 'function'))
    throw Error('invalid_signup_escrow_dependencies');
  const deps = dependencies;
  return async function enrollNewUsername({username, password, ticket, originalWords} = {}) {
    const phrase = normalizeWords(originalWords);
    if (!USERNAME.test(username || '') || !TICKET.test(ticket || '') ||
        typeof password !== 'string' || password.length < 6 || password.length > 20 ||
        !phrase) return {ok: false, code: 'invalid_enrollment'};
    // Mandatory caller validation against the *actual* BIP39 wordlist and
    // reservation HMAC remains part of claimReservation on the server.
    let claimed = false;
    let newUserId = null;
    let rollbackFailed = false;
    let ambiguousCreation = false;
    let creationStarted = false;
    let result;
    try {
      // No new Auth user is created if Vault/RPC is unavailable at preflight.
      if (await deps.vaultReady() !== true)
        return {ok: false, code: 'encrypted_backup_unavailable'};
      if (await deps.claimReservation({username, ticket, phrase}) !== true)
        return {ok: false, code: 'invalid_enrollment'};
      claimed = true;
      creationStarted = true;
      const created = await deps.createNewUser({username, password});
      // No cleanup or access is allowed for an existing or ambiguous user.
      if (!created || created.newlyCreated !== true || !UUID.test(created.id || '')) {
        ambiguousCreation = true;
        throw Error('create_new_user_not_confirmed');
      }
      newUserId = created.id;
      if (await deps.saveLegacyVerifier({userId: newUserId, phrase}) !== true)
        throw Error('verifier_failed');
      if (await deps.encryptOriginalWords({userId: newUserId, phrase}) !== true)
        throw Error('vault_write_failed');
      const originalFromVault = await deps.readBackOriginalWords({userId: newUserId});
      if (!sameWords(originalFromVault, phrase))
        throw Error('vault_readback_mismatch');
      if (await deps.linkUsername({userId: newUserId, username}) !== true)
        throw Error('username_link_failed');
      const session = await deps.createVerifiedSession({userId: newUserId, password});
      if (!session || session.userId !== newUserId || session.verified !== true ||
          typeof session.accessToken !== 'string' || !session.accessToken ||
          typeof session.refreshToken !== 'string' || !session.refreshToken)
        throw Error('session_failed');
      // Only now may caller declare registration successful.
      result = {ok: true, code: 'signup_success', userId: newUserId, session};
    } catch {
      // Rollback ONLY the exact just-created account in this invocation;
      // never touch any existing user, financial account or transaction.
      if (creationStarted && !newUserId) ambiguousCreation = true;
      if (newUserId) {
        try {
          if (await deps.rollbackNewUser({newlyCreatedUserId: newUserId}) !== true)
            rollbackFailed = true;
        } catch { rollbackFailed = true; }
      }
      result = {ok: false, code: rollbackFailed || ambiguousCreation ?
        'manual_reconciliation_required' : 'registration_not_completed'};
    } finally {
      if (claimed) {
        try { await deps.releaseReservation({username, ticket}); }
        catch { /* Reservation cleanup requires independent expiry/reconciliation. */ }
      }
    }
    return result;
  };
}
