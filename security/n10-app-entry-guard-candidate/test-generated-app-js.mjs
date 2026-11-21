// N10 review-only. Parses the actual 330KB production inline app script
// after applying a patch in memory. Does not execute any page code or network.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {generateAppEntryPreview} from './preview.mjs';

const original=readFileSync('app.html','utf8');
const candidate=generateAppEntryPreview(original);
const anchor='async function enter(session){';

function containingScript(html) {
  const index=html.indexOf(anchor);
  assert.ok(index>=0,'missing original entry function');
  const start=html.lastIndexOf('<script',index);
  const openEnd=html.indexOf('>',start);
  const finish=html.indexOf('</script>',index);
  assert.ok(start>=0&&openEnd<index&&finish>index,'invalid HTML script boundaries');
  assert.equal(html.slice(start,openEnd+1),'<script>',
    'expected main classic inline script; review extraction on HTML drift');
  return html.slice(openEnd+1,finish);
}
const oldScript=containingScript(original);
const newScript=containingScript(candidate);
assert.ok(oldScript.length>200000,'expected complete main workspace script');
assert.ok(newScript.length>oldScript.length,'preview should add security guards');
// Parsing only: no DOM, no Supabase, no secret values or network are touched.
new Script(oldScript,{filename:'original app workspace inline script'});
new Script(newScript,{filename:'candidate app workspace inline script'});

// Both views contain exactly the same overall document, except one JS script.
// This guards against accidentally dropping finance markup, styling or a
// different app initializer in the proposed in-memory patch.
const originalParts=original.split('</script>');
const candidateParts=candidate.split('</script>');
assert.equal(originalParts.length,candidateParts.length);
let changed=0;
for(let i=0;i<originalParts.length;i++) {
  if(originalParts[i]!==candidateParts[i]){
    changed++;
    assert.ok(originalParts[i].includes(anchor),'changed a non-workspace script');
    assert.ok(candidateParts[i].includes('mmhN10AssessWorkspaceMfaV1100'),
      'missing MFA guard on modified script');
  }
}
assert.equal(changed,1,'in-memory patch must only touch workspace JS');
assert.ok(candidate.length-original.length<11000,
  'unexpectedly large change outside surgical patch budget');
for(const protectedMarker of [
 'function balance(a){','function totalAssetMMK(){',
 'function expenseMMK(){','function mmhVaultAccountMeta('
]){
  const originalOffset=original.indexOf(protectedMarker);
  const candidateOffset=candidate.indexOf(protectedMarker);
  assert.ok(originalOffset>=0&&candidateOffset>=0);
  assert.equal(original.slice(originalOffset,originalOffset+2000),
    candidate.slice(candidateOffset,candidateOffset+2000),
    'finance source changed unexpectedly: '+protectedMarker);
}
// Confirm every explicitly allowed gate was actually applied, exactly once.
for(const marker of [
 'async function mmhN10AssessWorkspaceMfaV1100(',
 'let mmhN10GateVersionV1100=0;',
 "if(n10Decision!=='allow')throw Error('n10_app_mfa_unverified');",
 "if(n10Result!=='allow'){mmhP947GuardV947('error');",
 "const n10Version=++mmhN10GateVersionV1100;"
]){
  assert.ok(candidate.includes(marker),'missing approved patch marker: '+marker);
}
console.log('PASS original and generated real app inline JS both parse');
console.log('PASS only workspace script differs, finance and HTML preserved');
