/**
 * SYNTHETIC REVIEW ONLY — no network imports, credentials, Supabase client,
 * Auth mutation, session issuance, deployment or production integration.
 *
 * A candidate NEW username-account orchestration contract. A real backend
 * must be separately security-approved and explicitly authorized for Staging.
 */
import {buildOfflineCreateUserAttributes, decryptOfflineEnvelope,
  OFFLINE_REVIEW_MARKER, RELEASE_ENABLED} from './atomic-auth-escrow.mjs';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ENVELOPE_KEYS=['v','alg','kid','iv','ct'];

function sameString(a,b) {
  if(typeof a!=='string'||typeof b!=='string')return false;
  let diff=a.length^b.length;
  for(let i=0;i<Math.max(a.length,b.length);i++)
    diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);
  return diff===0;
}
function sameEnvelope(a,b) {
  return !!a && !!b && ENVELOPE_KEYS.every(k=>a[k]===b[k]) &&
    Object.keys(a).length===ENVELOPE_KEYS.length &&
    Object.keys(b).length===ENVELOPE_KEYS.length;
}
function validRecord(v,id,attributes) {
  return v && v.id===id && v.email===attributes.email &&
    v.app_metadata?.mmhvault_auth_kind==='username_only' &&
    v.app_metadata?.mmhvault_username===attributes.app_metadata.mmhvault_username &&
    sameEnvelope(v.app_metadata?.mmhvault_initial_recovery_envelope,
      attributes.app_metadata.mmhvault_initial_recovery_envelope);
}

/**
 * Strictly independent offline adapter callbacks:
 *   legacyNameFree, aliasFree, simulateCreate, simulateReadById.
 * No actual Auth API references occur in this module.
 * The adapter is not trusted evidence of real Supabase guarantees.
 */
export async function simulateInitialEscrowEnrollment({
  marker, username, password, originalWords, verifyWordlist, rawEncryptionKey,
  keyId, legacyNameFree, aliasFree, simulateCreate, simulateReadById
}={}) {
  if(RELEASE_ENABLED!==false||marker!==OFFLINE_REVIEW_MARKER)
    throw Error('review_gate_closed');
  if([legacyNameFree,aliasFree,simulateCreate,simulateReadById]
    .some(fn=>typeof fn!=='function'))throw Error('missing_offline_adapter');
  const attrs=await buildOfflineCreateUserAttributes({
    marker,username,password,originalWords,verifyWordlist,rawEncryptionKey,keyId
  });
  // Both old username namespaces and new alias email MUST be clear.
  // An online implementation still requires an authoritative race-free claim.
  let oldFree=false,newFree=false;
  try {
    oldFree=(await legacyNameFree(username))===true;
    newFree=(await aliasFree(attrs.email))===true;
  } catch {
    return {ok:false,code:'offline_preflight_unavailable'};
  }
  if(!oldFree||!newFree)return {ok:false,code:'offline_identity_collision'};

  // Once creation begins any ambiguous error must hold the identity.
  // Never retry, delete, reset, replace escrow, or issue a login session.
  try {
    const created=await simulateCreate(attrs);
    if(!created||created.newlyCreated!==true||
        !UUID.test(created.id||''))
      return {ok:false,code:'manual_reconciliation_required'};
    const fresh=await simulateReadById(created.id);
    if(!validRecord(fresh,created.id,attrs))
      return {ok:false,code:'manual_reconciliation_required'};
    const original=await decryptOfflineEnvelope({
      marker,username,envelope:fresh.app_metadata.mmhvault_initial_recovery_envelope,
      rawEncryptionKey
    });
    if(!sameString(original,originalWords.trim().toLowerCase().replace(/\s+/g,' ')))
      return {ok:false,code:'manual_reconciliation_required'};
    // NOTE: status allows a future *separate* login step only after review.
    // No token, password or plaintext phrase is returned to caller.
    return {ok:true,code:'offline_encrypted_escrow_verified_no_session'};
  } catch {
    return {ok:false,code:'manual_reconciliation_required'};
  }
}
