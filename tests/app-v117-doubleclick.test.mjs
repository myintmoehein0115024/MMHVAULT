/* Verify Mac double-click local Staging entrypoint without a server. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mmh-v117-file-qa-'));
const builder=path.join(root,'tests','build-app-v117-staging-preview.cjs');
const second=path.join(root,'tests','build-app-v117-doubleclick.cjs');
const PUBLIC='sb_publishable_SYNTHETIC_FILE_ONLY_QA_0123456789';

test('double-click entrypoint includes inlined hierarchy and no production URL or scripts requiring CORS',()=>{
 const pre=spawnSync(process.execPath,[builder],{
   cwd:root,encoding:'utf8',env:{...process.env,MMH_V117_STAGING_OUTPUT_DIR:dir,MMH_V117_STAGING_PUBLISHABLE_KEY:PUBLIC}
 });
 assert.equal(pre.status,0,pre.stderr);
 const built=spawnSync(process.execPath,[second],{cwd:root,encoding:'utf8',env:{...process.env,MMH_V117_STAGING_OUTPUT_DIR:dir}});
 assert.equal(built.status,0,built.stderr);
 const html=fs.readFileSync(path.join(dir,'OPEN-ME-STAGING.html'),'utf8');
 assert.match(html,/name="mmhvault-local-doubleclick"/);
 assert.match(html,/id="mmh-v117-inline-hierarchy"/);
 assert.doesNotMatch(html,/<script[^>]+type="module"[^>]+src=/i);
 assert.doesNotMatch(html,/vrypucmyrztxgiqhjspd\.supabase\.co/);
 assert.doesNotMatch(html,/sb_publishable_H38v4XbO0ARnSJToD42wGg_27-SZ3Ao/);
 assert.match(html,/connect-src https:\/\/ldivswlhtgmznzwhzsoi\.supabase\.co\/auth\/v1\/token/);
 assert.match(html,/https:\/\/ldivswlhtgmznzwhzsoi\.supabase\.co\/rest\/v1\/transactions/);
 assert.doesNotMatch(html,/mmhvault-transaction-field-layout-v11\.js/);
 assert.match(html,/APP V11\.7 · STAGING ONLY · DOUBLE-CLICK MODE/);
 assert.match(html,/window\.MMHV11HierarchyLive/);
 assert.ok(fs.existsSync(path.join(dir,'READ-ME-FIRST.txt')));
 assert.match(fs.readFileSync(path.join(dir,'READ-ME-FIRST.txt'),'utf8'),/NO TERMINAL/);
 assert.ok(fs.statSync(path.join(dir,'OPEN-ME-STAGING.html')).size>1000000);
});
