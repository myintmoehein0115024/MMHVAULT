/* Offline-only synthetic review: zero Supabase traffic, zero real accounts. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {buildOfflineCreateUserAttributes, decryptOfflineEnvelope,
  OFFLINE_REVIEW_MARKER, RELEASE_ENABLED} from './atomic-auth-escrow.mjs';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const key=webcrypto.getRandomValues(new Uint8Array(32));
const original='alpha bravo charlie delta echo foxtrot golf hotel india juliet';
const fakeWords=new Set(original.split(' '));
const valid=w=>fakeWords.has(w); // SYNTHETIC fixture; real BIP39 integration unapproved.
const args={marker:OFFLINE_REVIEW_MARKER,username:'n10review_demo',password:'OnlySynthetic!1',
  originalWords:original,verifyWordlist:valid,rawEncryptionKey:key,keyId:'offline-key-v1'};
const build=opts=>buildOfflineCreateUserAttributes({...args,...opts});
const open=(v,opts={})=>decryptOfflineEnvelope({marker:OFFLINE_REVIEW_MARKER,
  username:'n10review_demo',envelope:v,rawEncryptionKey:key,...opts});

test('hard-OFF: no production or Staging call, and no live Supabase imports',()=>{
  assert.equal(RELEASE_ENABLED,false);
  const file=readFileSync(resolve(dirname(fileURLToPath(import.meta.url)),'atomic-auth-escrow.mjs'),'utf8');
  assert.doesNotMatch(file,/\bfetch\s*\(|\bcreateClient\s*\(|\.rpc\s*\(|\.createUser\s*\(/);
  assert.match(file,/N10_SYNTHETIC_REVIEW_ONLY/);
});
test('single-request synthetic payload includes encrypted recovery and never plaintext words',async()=>{
  const p=await build();
  assert.equal(p.email,'n10review_demo@no-mail.mmhvault.invalid');
  assert.equal(p.email_confirm,true);
  assert.equal(p.app_metadata.mmhvault_username,'n10review_demo');
  assert.equal(p.app_metadata.mmhvault_auth_kind,'username_only');
  assert.equal(p.app_metadata.mmhvault_initial_recovery_envelope.alg,'A256GCM');
  assert.ok(!JSON.stringify(p).includes(original));
  assert.equal(await open(p.app_metadata.mmhvault_initial_recovery_envelope),original);
});
test('nonce is fresh; new ciphertext cannot silently replace an original without detection outside this proposal',async()=>{
  const a=(await build()).app_metadata.mmhvault_initial_recovery_envelope;
  const b=(await build()).app_metadata.mmhvault_initial_recovery_envelope;
  assert.notEqual(a.iv,b.iv);
  assert.notEqual(a.ct,b.ct);
  assert.equal(await open(a),original);
  assert.equal(await open(b),original);
});
test('wrong owner, wrong key, or changed ciphertext never reveals words',async()=>{
  const v=(await build()).app_metadata.mmhvault_initial_recovery_envelope;
  await assert.rejects(open(v,{username:'n10review_other'}));
  await assert.rejects(open(v,{rawEncryptionKey:webcrypto.getRandomValues(new Uint8Array(32))}));
  await assert.rejects(open({...v,ct:v.ct.slice(0,-1)+(v.ct.endsWith('A')?'B':'A')}));
});
test('fail closed on missing marker, unverified words, invalid username and invalid encryption key',async()=>{
  await assert.rejects(build({marker:null}),/review_gate_closed/);
  await assert.rejects(build({username:'admin'}),/invalid_review_username/);
  await assert.rejects(build({originalWords:'alpha bravo'}),/invalid_review_phrase/);
  await assert.rejects(build({verifyWordlist:()=>false}),/invalid_review_phrase/);
  await assert.rejects(build({rawEncryptionKey:new Uint8Array(8)}),/invalid_review_encryption_key/);
  await assert.rejects(open({v:1,alg:'A256GCM',kid:'offline-key-v1',iv:'_',ct:'a'}));
});
