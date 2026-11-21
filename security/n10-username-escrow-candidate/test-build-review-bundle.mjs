import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {buildReviewBundle} from './build-review-bundle.mjs';

test('package exactly the reviewed two files with hard OFF release gate',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'n10-bundle-sim-'));
 try{
  const result=await buildReviewBundle(temp);
  assert.equal(result.releaseEnabled,false);
  assert.equal(result.reviewOnly,true);
  assert.equal(result.origin,'https://mmhvault.com');
  assert.deepEqual((await readdir(temp)).sort(),['immutable-signup-escrow.mjs','index.ts']);
  for(const f of result.files){
   const source=await readFile(join(temp,f.name),'utf8');
   assert.equal(createHash('sha256').update(source).digest('hex'),f.sha256);
  }
  const index=await readFile(join(temp,'index.ts'),'utf8');
  assert.match(index,/const RELEASE_ENABLED=false;/);
  assert.match(index,/from '\.\/immutable-signup-escrow\.mjs'/);
  assert.doesNotMatch(index,/\.\.\/n10-signup-escrow-review/);
  assert.match(index,/mmh_n10_recovery_backup_put/);
  assert.match(index,/mmh_n10_recovery_backup_get/);
 }finally{await rm(temp,{force:true,recursive:true});}
});
test('refuse to write a reviewed bundle into a repository or sensitive location',async()=>{
 for(const path of ['.',join(process.cwd(),'security'),'/', '/var/tmp/n10-review',
   '/tmp/../etc/n10-review','']){
  await assert.rejects(buildReviewBundle(path));
 }
});
test('all imported bundle modules are pinned or local',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'n10-module-sim-'));
 try{
  await buildReviewBundle(temp);
  const src=await readFile(join(temp,'index.ts'),'utf8');
  const imports=[...src.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map(m=>m[1]);
  assert.deepEqual(imports.sort(),[
   './immutable-signup-escrow.mjs',
   'npm:@scure/bip39@1.6.0/wordlists/english',
   'npm:@supabase/supabase-js@2.57.4',
  ].sort());
  assert.equal(imports.some(x=>x.startsWith('https://')||x.startsWith('../')),false);
 }finally{await rm(temp,{force:true,recursive:true});}
});
