/**
 * MMHVAULT N10: OFFLINE-ONLY proposal for first-time recovery escrow inside
 * the same Auth Admin createUser request. NO Supabase client, fetch, SQL or
 * deployment pathway exists in this file. Never use on real identities.
 *
 * SECURITY REVIEW REQUIRED: auth app_metadata is visible to the user/JWT.
 * This is AES-GCM ciphertext, NOT a server-enforced immutable vault.
 */
export const RELEASE_ENABLED = false;
export const OFFLINE_REVIEW_MARKER = 'N10_SYNTHETIC_REVIEW_ONLY';
const PROJECT = 'ldivswlhtgmznzwhzsoi';
const USERNAME = /^[a-z][a-z0-9_]{3,19}$/;
const KID = /^[a-zA-Z0-9_-]{3,48}$/;
const WORDS = /^([a-z]{2,13} ){9}[a-z]{2,13}$/;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function key32(raw) {
  if (!(raw instanceof Uint8Array) || raw.length !== 32)
    throw Error('invalid_review_encryption_key');
  return raw;
}
function b64url(raw) {
  return btoa(String.fromCharCode(...raw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function from64url(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(value))
    throw Error('invalid_ciphertext_encoding');
  const standard = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(standard.padEnd(Math.ceil(standard.length / 4) * 4, '=')), c => c.charCodeAt(0));
}
function identity(name) {
  if (typeof name !== 'string' || !USERNAME.test(name))
    throw Error('invalid_review_username');
  return {name, alias: name + '@no-mail.mmhvault.invalid'};
}
function aad({name, alias}) {
  return encoder.encode('MMHVAULT:N10:AUTH-METADATA:V1:' + PROJECT + ':' + name + ':' + alias);
}
async function importKey(raw) {
  return crypto.subtle.importKey('raw', key32(raw), {name: 'AES-GCM'}, false, ['encrypt', 'decrypt']);
}
function normalize(words, verifyWordlist) {
  if (typeof words !== 'string' || words.length > 250 || typeof verifyWordlist !== 'function')
    throw Error('invalid_review_phrase');
  const phrase = words.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!WORDS.test(phrase) || phrase.split(' ').some(w => verifyWordlist(w) !== true))
    throw Error('invalid_review_phrase');
  return phrase;
}
/**
 * Builds only a synthetic Auth Admin attributes object; intentionally does
 * not call createUser. An independent review + real Staging authorization
 * are required before ANY implementation may use this design.
 */
export async function buildOfflineCreateUserAttributes({
  marker, username, password, originalWords, verifyWordlist, rawEncryptionKey, keyId
} = {}) {
  if (marker !== OFFLINE_REVIEW_MARKER || RELEASE_ENABLED !== false)
    throw Error('review_gate_closed');
  const owner = identity(username);
  if (typeof password !== 'string' || password.length < 6 || password.length > 20 ||
      typeof keyId !== 'string' || !KID.test(keyId))
    throw Error('invalid_review_input');
  const phrase = normalize(originalWords, verifyWordlist);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await importKey(rawEncryptionKey);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    {name: 'AES-GCM', iv, additionalData: aad(owner), tagLength: 128},
    cryptoKey, encoder.encode(phrase)
  ));
  return {
    email: owner.alias,
    password,
    email_confirm: true,
    app_metadata: {
      mmhvault_auth_kind: 'username_only',
      mmhvault_username: owner.name,
      mmhvault_initial_recovery_envelope: {
        v: 1, alg: 'A256GCM', kid: keyId, iv: b64url(iv), ct: b64url(ciphertext)
      }
    }
  };
}
/** Offline ciphertext owner check ONLY. Not a login or Recovery Viewer API. */
export async function decryptOfflineEnvelope({
  marker, username, envelope, rawEncryptionKey
} = {}) {
  if (marker !== OFFLINE_REVIEW_MARKER || RELEASE_ENABLED !== false)
    throw Error('review_gate_closed');
  const owner = identity(username);
  if (!envelope || envelope.v !== 1 || envelope.alg !== 'A256GCM' ||
      !KID.test(envelope.kid || ''))
    throw Error('invalid_review_envelope');
  const iv = from64url(envelope.iv);
  const ciphertext = from64url(envelope.ct);
  if (iv.length !== 12 || ciphertext.length < 16 || ciphertext.length > 512)
    throw Error('invalid_review_envelope');
  const cryptoKey = await importKey(rawEncryptionKey);
  const phrase = decoder.decode(await crypto.subtle.decrypt(
    {name: 'AES-GCM', iv, additionalData: aad(owner), tagLength: 128},
    cryptoKey, ciphertext
  ));
  if (!WORDS.test(phrase)) throw Error('invalid_review_phrase');
  return phrase;
}
