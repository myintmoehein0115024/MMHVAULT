/* Review-only verification of the complete APP → Auth-Staging preview builder.
 * CI uses a synthetic publishable key, not any live Supabase credentials.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const builder=path.join(root,'tests','build-app-v117-staging-preview.cjs');
const out=path.join(root,'dist','app-v117-staging');
const STAGE='ldivswlhtgmznzwhzsoi.supabase.co';
const PROD='vrypucmyrztxgiqhjspd.supabase.co';
const PUBLIC='sb_publishable_SYNTHETIC_STAGING_QA_ONLY_0123456789';

test('preview build fails closed if the exact staging key is absent',()=>{
 const result=spawnSync(process.execPath,[builder],{
   cwd:root,encoding:'utf8',env:{...process.env,MMH_V117_STAGING_PUBLISHABLE_KEY:''}
 });
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/Dedicated Auth-Staging publishable key required/);
});

test('preview is generated from the current APP without production endpoints',()=>{
 const result=spawnSync(process.execPath,[builder],{
   cwd:root,encoding:'utf8',env:{...process.env,MMH_V117_STAGING_PUBLISHABLE_KEY:PUBLIC},
   maxBuffer:1024*1024
 });
 assert.equal(result.status,0,result.stderr);
 const html=fs.readFileSync(path.join(out,'app.html'),'utf8');
 assert.ok(html.length>1000000,'full app.html was copied, not a small standalone fixture');
 assert.match(html,/MMHVAULT APP V11\.7 — STAGING ONLY/);
 assert.match(html,new RegExp('https://'+STAGE.replaceAll('.','\\.')));
 assert.ok(!html.includes(PROD));
 assert.ok(!html.includes('sb_publishable_H38v4XbO0ARnSJToD42wGg_27-SZ3Ao'));
 assert.ok(html.includes(PUBLIC));
 assert.match(html,/connect-src https:\/\/ldivswlhtgmznzwhzsoi\.supabase\.co/);
 assert.match(html,/default-src 'self'/);
 assert.match(html,/worker-src 'none'/);
 assert.match(html,/mmhvault-v11-manage-hierarchy-live\.mjs\?v=0\.7\.0/);
 assert.doesNotMatch(html,/mmhvault-transaction-field-layout-v11\.js/);
 assert.ok(fs.existsSync(path.join(out,'js','mmhvault-v11-manage-hierarchy-live.mjs')));
 assert.ok(fs.existsSync(path.join(out,'js','mmhvault-v11-manage-hierarchy-model.mjs')));
 assert.ok(fs.existsSync(path.join(out,'css')));
 assert.ok(fs.existsSync(path.join(out,'README-STAGING-QA.txt')));
 assert.match(result.stdout,/"originReplacements":3/);
});
