/**
 * Local-only N10 Edge build preflight. Does NOT deploy a function or access
 * Supabase, Auth, user records or credentials.
 *
 * Usage: node build-review-bundle.mjs /tmp/mmhvault-n10-review-bundle
 * Output has index.ts and one immutable local helper, suitable for Deno
 * static type checking. Release is explicitly hard OFF.
 */
import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve, join, sep} from 'node:path';
import {tmpdir} from 'node:os';

const root=fileURLToPath(new URL('.',import.meta.url));
const sourceFile=new URL('./username-edge-REVIEW-ONLY.ts',import.meta.url);
const helperFile=new URL('./immutable-signup-escrow.mjs',import.meta.url);
const canonicalFile=new URL('../n10-signup-escrow-review/immutable-signup-escrow.mjs',import.meta.url);
const isMain=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
function digest(s){return createHash('sha256').update(s,'utf8').digest('hex');}

export async function buildReviewBundle(target){
 if(typeof target!=='string'||!target)throw Error('review_output_required');
 const output=resolve(target);
 const tmp=resolve(tmpdir())+sep;
 if(!output.startsWith(tmp)||output.includes('..'))
  throw Error('review_output_must_be_in_tmp');
 const [src,helper,canonical]=await Promise.all([
  readFile(sourceFile,'utf8'),readFile(helperFile,'utf8'),readFile(canonicalFile,'utf8')
 ]);
 assert.equal(helper,canonical,'vendored security orchestrator drifted from reviewed implementation');
 assert.match(src,/const RELEASE_ENABLED=false;/);
 assert.doesNotMatch(src,/const RELEASE_ENABLED=true;/);
 assert.match(src,/const PROJECT='vrypucmyrztxgiqhjspd';/);
 assert.match(src,/const ORIGIN='https:\/\/mmhvault.com';/);
 assert.match(src,/if\(!RELEASE_ENABLED\)return reply\(origin,'registration_not_released',503\);/);
 assert.match(src,/from '\.\/immutable-signup-escrow\.mjs';/);
 const imported=[...src.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map(x=>x[1]);
 assert.deepEqual(imported.sort(),[
  './immutable-signup-escrow.mjs',
  'npm:@scure/bip39@1.6.0/wordlists/english',
  'npm:@supabase/supabase-js@2.57.4',
 ].sort(),'only exact pinned npm dependencies plus in-bundle shared helper permitted');
 assert.doesNotMatch(helper,/from\s*['"]|\bimport\s*\(/);
 assert.doesNotMatch(src,/ldivswlhtgmznzwhzsoi/);
 assert.doesNotMatch(helper,/SUPABASE_SERVICE_ROLE_KEY|process\.env|fetch\s*\(/);
 await mkdir(output,{recursive:true});
 const targets=[{name:'index.ts',text:src},{name:'immutable-signup-escrow.mjs',text:helper}];
 await Promise.all(targets.map(f=>writeFile(join(output,f.name),f.text,{flag:'w',mode:0o600})));
 return {output,files:targets.map(f=>({name:f.name,sha256:digest(f.text)})),releaseEnabled:false,
  origin:'https://mmhvault.com',reviewOnly:true};
}
if(isMain){
 const result=await buildReviewBundle(process.argv[2]);
 console.log(JSON.stringify(result));
}
