// N10 Vault review-only: pure input helpers used by a DISABLED Edge candidate.
// No connection, persistence, credentials, recovery data or network requests.
// Never log contents of parsed requests or recovery words.
export function normalizePhrase(value) {
  if (typeof value !== 'string' || value.length > 240) return null;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ');
  return /^([a-z]{2,13} ){9}[a-z]{2,13}$/.test(normalized) ? normalized : null;
}

export function equal64(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' ||
      a.length !== 64 || b.length !== 64) return false;
  let diff = 0;
  for (let i = 0; i < 64; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Bounded streaming parser: the *actual* decoded body is limited, even if
// a client omits or lies about Content-Length. Do not accept arrays/scalars.
export async function readBoundedJson(req) {
  const h = req.headers.get('content-length');
  if (h !== null && (!/^\d+$/.test(h) || Number(h) > 1200))
    throw Error('oversize');
  if (!req.body) throw Error('missing_body');
  const reader = req.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 1200) {
        await reader.cancel('too_large');
        throw Error('oversize');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let pos = 0;
  for (const chunk of chunks) { bytes.set(chunk, pos); pos += chunk.byteLength; }
  const body = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes));
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw Error('invalid_json');
  return body;
}
