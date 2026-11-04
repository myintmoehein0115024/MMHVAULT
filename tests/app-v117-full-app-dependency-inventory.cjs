/* APP V11.7 — read-only startup dependency inventory.
 * Run against the checked-out current app.html. No browser, database or token.
 * Report all literal Supabase table names, without echoing URLs/keys/SQL.
 * An occurrence is NOT by itself evidence that a table is a hard boot gate.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../app.html'),'utf8');
assert.ok(source.length>1000000,'Expected full APP source, not the two-table QA fixture');
const lineno=index=>source.slice(0,index).split('\n').length;
const entries=new Map();
const re=/\.from\s*\(\s*(['"`])([a-z][a-z_0-9]*)\1\s*\)/gi;
for(const m of source.matchAll(re)){
  const table=m[2],lines=entries.get(table)||[];
  lines.push(lineno(m.index));
  entries.set(table,lines);
}
const startup=[];
for(const m of source.matchAll(/\b(?:async\s+function\s+loadAll\s*\(|function\s+loadAll\s*\(|(?:const|let|var)\s+loadAll\s*=\s*(?:async\s*)?|\bloadAll\s*\()/g)){
  startup.push({line:lineno(m.index),kind:/loadAll\s*\(/.test(m[0])?'call-or-definition':'assignment'});
}
// Locate actual loadAll DEFINITIONS separately from incidental calls. We
// print a small sanitized control-flow excerpt so a reviewer can distinguish
// awaited boot reads from optional feature queries without copying API keys.
const bootDefinitions=[...source.matchAll(/\b(?:async\s+)?function\s+loadAll\s*\(|\b(?:const|let|var)\s+loadAll\s*=\s*(?:async\s*)?/g)];
const scrub=line=>line
  .replace(/https?:\/\/[^\s'"`)]+/g,'[redacted-url]')
  .replace(/\b(?:sb_publishable|sb_secret|eyJ)[a-zA-Z0-9_.-]{12,}/g,'[redacted-token]')
  .trim().slice(0,185);
const bootContexts=bootDefinitions.slice(0,4).map(m=>({
  line:lineno(m.index),
  nearbyReviewLines:source.slice(m.index,m.index+16000).split('\n').slice(0,180)
    .filter(line=>/\b(?:await|throw|Promise|return)\b|\.from\s*\(|\.error\b|\bloadAll\s*\(|\bread\s*\(/.test(line))
    .slice(0,70).map(scrub)
}));
console.log('APP_V117_BOOT_SOURCE_REVIEW='+JSON.stringify({
  definitions:bootContexts,
  caution:'Excerpt is bounded and may include subsequent functions. Inspect actual source before treating tables as required.'
}));
// The wallet hard-stop uses an indirect helper: inspect the function's
// declaration/read body instead of guessing a wallet table name.
const walletDefinitions=[...source.matchAll(/\b(?:async\s+)?function\s+mmhPersonalReadWalletV191\b|\b(?:const|let|var)\s+mmhPersonalReadWalletV191\s*=/g)];
const walletContexts=walletDefinitions.slice(0,3).map(m=>({
  line:lineno(m.index),
  nearbyReviewLines:source.slice(m.index,m.index+3000).split('\n').slice(0,26)
    .map(scrub)
}));
console.log('APP_V117_WALLET_SOURCE_REVIEW='+JSON.stringify({
  definitions:walletContexts,
  caution:'Wallet loader may be defined in another module. Do not infer a table name from an unresolved call.'
}));
// Guard against a future PR accidentally softening the historical session
// bootstrap. The full APP remains blocked when the required owner data
// services do not load; an incomplete two-table QA must never appear ready.
assert.ok(bootDefinitions.length,'Full APP authenticated loadAll definition missing');
assert.ok(walletDefinitions.length,'Wallet movement loader definition missing');
const bootGuard=source.slice(bootDefinitions[0].index,bootDefinitions[0].index+16000);
for(const [purpose,pattern] of [
  ['ledger',/read\s*\(\s*['"]transactions['"]/],
  ['investments',/read\s*\(\s*['"]investments['"]/],
  ['custom investments',/read\s*\(\s*['"]custom_investments['"]/],
  ['wallet read',/mmhPersonalReadWalletV191\s*\(\s*loadOwner\s*\)/],
  ['hard failure',/if\s*\(\s*hardErrors\.length\s*\)\s*throw\s+new\s+Error/],
  ['session owner',/currentSessionUser\?\.id\s*!==\s*loadOwner/]
])assert.match(bootGuard,pattern,purpose+' must remain protected by the real APP startup guard');
const walletGuard=source.slice(walletDefinitions[0].index,walletDefinitions[0].index+1000);
assert.match(walletGuard,/mmhPersonalReadAllV191\s*\(\s*['"]crypto_wallet_movements['"]\s*,\s*owner\s*\)/,
  'Wallet loader must have a known owner-scoped table dependency');
// Check the precise minimal boot query contract for the three missing tables.
// We derive these only from current source; this does NOT authorize DDL.
const hardBootReads=[...bootGuard.matchAll(/\bread\s*\(\s*['"]([a-z_]+)['"]\s*,\s*['"]([a-z_]+)['"]\s*\)/g)]
  .map(m=>({table:m[1],dateSort:m[2]}));
const bootSortByTable=new Map(hardBootReads.map(x=>[x.table,x.dateSort]));
assert.equal(bootSortByTable.get('transactions'),'tx_date');
assert.equal(bootSortByTable.get('investments'),'inv_date');
assert.equal(bootSortByTable.get('custom_investments'),'inv_date');
const helperMatch=/\b(?:async\s+)?function\s+mmhPersonalReadAllV191\s*\(|\b(?:const|let)\s+mmhPersonalReadAllV191\s*=/.exec(source);
assert.ok(helperMatch,'Owner-filtered shared finance reader not found');
const helperGuard=source.slice(helperMatch.index,helperMatch.index+2000);
assert.match(helperGuard,/\.from\s*\(\s*table\s*\)\.select\(['"]\*['"]\)\.eq\(['"]user_id['"],\s*owner\)/,
  'Full APP shared reader must still query only signed-in owner rows');
assert.match(helperGuard,/\.order\(order,\s*\{ascending:true\}\)/,
  'Full APP read depends on a sortable column (normally id)');
assert.match(helperGuard,/currentSessionUser\?\.id\s*!==\s*owner/,
  'Owner switch must invalidate the shared reader');
const helperBody=source.slice(helperMatch.index,helperMatch.index+6500).split('\n').slice(0,65);
const helperReview=helperBody.filter(line=>/mmhPersonalReadAllV191|\.from\s*\(|\b(?:select|eq|read|throw|owner|user_id|return)\b/.test(line))
  .slice(0,35).map(scrub);
console.log('APP_V117_MINIMAL_SCHEMA_CONTRACT='+JSON.stringify({
  sharedReaderLine:lineno(helperMatch.index),sharedReaderReview:helperReview,
  hardBootReads,indirectWalletTable:'crypto_wallet_movements',
  additionalBootCandidates:['investments','custom_investments','crypto_wallet_movements'],
  warning:'Read-only static inference. Validate actual required columns, Data API grants and owner RLS before a separate schema approval.'
}));
const inventory=[...entries.entries()].sort((a,b)=>a[0].localeCompare(b[0]))
  .map(([table,lines])=>({table,references:lines.length,firstLines:lines.slice(0,6)}));
assert.ok(startup.length,'Full APP startup entrypoint loadAll not found: review bootstrap');
assert.ok(entries.has('transactions'),'Full APP ledger reference missing');
assert.ok(entries.has('personal_configuration'),'Owner-scoped config reference missing');
// Explicitly show what the APPROVED Staging schema can serve. We do not
// create, query or imply permission to create any other tables.
const authorized=new Set(['transactions','personal_configuration']);
const additional=inventory.filter(x=>!authorized.has(x.table));
console.log('APP_V117_READ_ONLY_BOOT_DEPENDENCY_INVENTORY='+JSON.stringify({
  startup:startup.slice(0,12),
  authorizedFinanceTables:[...authorized],
  allLiteralDataTableReferences:inventory,
  notInApprovedTwoTableSandbox:additional.map(x=>x.table),
  note:'References are static only; manually review loadAll failure handling before classifying hard versus optional. No Staging schema changes.'
}));
