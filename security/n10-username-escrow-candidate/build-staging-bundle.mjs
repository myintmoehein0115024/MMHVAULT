/**
 * Build a HARD-OFF, Staging-only username enrollment Edge candidate.
 * Writes ONLY to an ephemeral /tmp location. Never deploys or reads secrets.
 * A separate owner approval is required before any Staging Edge deployment.
 */
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';

const sourceFile=new URL('./username-edge-REVIEW-ONLY.ts',import.meta.url);
const helperFile=new URL('./immutable-signup-escrow.mjs',import.meta.url);
const canonicalFile=new URL('../n10-signup-escrow-review/immutable-signup-escrow.mjs',import.meta.url);
const isMain=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
function digest(s){return createHash('sha256').update(s,'utf8').digest('hex');}
function once(src,from,to){
 assert.equal(src.split(from).length,2,'candidate source drift: '+from.slice(0,80));
 return src.replace(from,to);
}
export async function buildStagingBundle(target){
 if(typeof target!=='string'||!target)throw Error('staging_output_required');
 const output=resolve(target);
 if(!output.startsWith(resolve(tmpdir())+sep)||output.includes('..'))
  throw Error('staging_output_must_be_in_tmp');
 const [original,helper,canonical]=await Promise.all([
  readFile(sourceFile,'utf8'),readFile(helperFile,'utf8'),readFile(canonicalFile,'utf8')]);
 assert.equal(helper,canonical,'reviewed immutable escrow helper drifted');
 assert.match(original,/const RELEASE_ENABLED=false;/);
 assert.match(original,/if\(!RELEASE_ENABLED\)return reply\(origin,'registration_not_released',503\);/);
 assert.match(original,/from '\.\/immutable-signup-escrow\.mjs';/);
 const imports=[...original.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map(m=>m[1]).sort();
 assert.deepEqual(imports,[
  './immutable-signup-escrow.mjs',
  'npm:@scure/bip39@1.6.0/wordlists/english',
  'npm:@supabase/supabase-js@2.57.4'
 ].sort(),'only pinned npm and local reviewed helper allowed');
 let src=original;
 src=once(src,"const PROJECT='vrypucmyrztxgiqhjspd';","const PROJECT='ldivswlhtgmznzwhzsoi';");
 src=once(src,"const ORIGIN='https://mmhvault.com';","const ORIGIN='https://mmhvault-n10-vault-staging.pages.dev';");
 src=once(src,"const SITE_HOST='mmhvault.com';","const SITE_HOST='mmhvault-n10-vault-staging.pages.dev';");
 src=once(src,"const ALIAS_DOMAIN='no-mail.mmhvault.invalid';","const ALIAS_DOMAIN='no-mail.n10-staging.mmhvault.invalid';");
 src=once(src,"'mmh-a769-prod:'+v","'mmh-a769-staging:'+v");
 src=once(src,'production:true,qa_only:false,limited_signup:false,public_signup:true',
                   'production:false,qa_only:true,limited_signup:false,public_signup:false');
 // Any error after Auth creation is ambiguous once the verifier or escrow may
 // have been written. NEVER delete an Auth user; quarantine this exact
 // newly-created account and require manual reconciliation.
 src=once(src,
  "const {error:deleteError}=await admin.auth.admin.deleteUser(createdUid);\n   return !deleteError;",
  "await admin.auth.admin.updateUserById(createdUid,{ban_duration:'876000h'});\n   return false; // always require manual reconciliation; never delete Auth");
 src="// STAGING-ONLY REVIEW BUILD — HARD OFF. NO AUTOMATIC DEPLOYMENT.\n"+src;
 assert.match(src,/const RELEASE_ENABLED=false;/);
 assert.match(src,/const PROJECT='ldivswlhtgmznzwhzsoi';/);
 assert.match(src,/const ORIGIN='https:\/\/mmhvault-n10-vault-staging\.pages\.dev';/);
 assert.match(src,/const SITE_HOST='mmhvault-n10-vault-staging\.pages\.dev';/);
 assert.match(src,/if\(!RELEASE_ENABLED\)return reply\(origin,'registration_not_released',503\);/);
 assert.doesNotMatch(src,/vrypucmyrztxgiqhjspd|https:\/\/mmhvault\.com\b|const RELEASE_ENABLED=true;/);
 assert.doesNotMatch(src,/admin\.auth\.admin\.deleteUser\(/);
 assert.doesNotMatch(src,/production:true|qa_only:false|public_signup:true/);
 assert.doesNotMatch(helper,/from\s*['"]|\bimport\s*\(/);
 await mkdir(output,{recursive:true});
 const files=[{name:'index.ts',text:src},{name:'immutable-signup-escrow.mjs',text:helper}];
 await Promise.all(files.map(f=>writeFile(join(output,f.name),f.text,{flag:'w',mode:0o600})));
 return {output,files:files.map(f=>({name:f.name,sha256:digest(f.text)})),
  releaseEnabled:false,stagingOnly:true,deployPerformed:false};
}
if(isMain)console.log(JSON.stringify(await buildStagingBundle(process.argv[2])));
