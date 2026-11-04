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
