/* Native Add Transaction integration REVIEW ONLY.
 * Audit current full APP save/refresh path without reading databases,
 * credentials or connected account data; output sanitized source fragments.
 */
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../app.html'),'utf8');
const lines=app.split('\n');
const patterns=[
  ['native-ledger-insert',/db\.from\(["']transactions["']\)\.insert\(row\)\.select\(['"]id['"]\)/],
  ['ledger-callback',/MMHV11HierarchyLive\?\.onLedgerInserted/],
  ['transaction-save-handler',/addEventListener\(["']submit["']/],
  ['refresh-data-event',/mmhvault:data-loaded/],
  ['accounts-recalc',/\bupdateAccountLocks\s*\(/],
  ['analyze-render',/\brenderAnalyze\s*\(/],
];
function safe(line){
 return line
  .replace(/https?:\/\/[^\s"']+/g,'[url]')
  .replace(/(?:sb_publishable|sb_secret|eyJ)[A-Za-z0-9_.-]{12,}/g,'[token]')
  .slice(0,210);
}
// Native lifecycle read: identify post-submit reload, legacy selector rewrite
// and Analyze/Account source-of-truth. This reports SOURCE CODE ONLY.
for(const [name,pattern] of [
  ['native-handler-bind',/txForm\.addEventListener\(['"]submit['"]/],
  ['native-selection-reset',/txType\.value=selected\.type;syncTransactionGroup\(\)/],
  ['native-render',/function render\(\)/],
  ['analyze-function',/function renderAnalyze\(\)/],
  ['legacy-selector',/function updateCategories\(\)/],
  ['legacy-category-registry',/\bCATS\s*=/],
  ['canonical-registry-rebuild',/function mmhVaultRebuildConfigArrays\s*\(/]
]){
 const ix=lines.findIndex(line=>pattern.test(line));
 if(ix<0){console.log('APP_V117_SOURCE_NOT_FOUND_'+name);continue;}
 const radius=name==='native-handler-bind'?28:name==='native-render'?24:17;
 console.log('APP_V117_SOURCE_REVIEW_'+name+'='+JSON.stringify({
  line:ix+1,code:lines.slice(Math.max(0,ix-radius),Math.min(lines.length,ix+radius))
   .map((line,k)=>(Math.max(0,ix-radius)+k+1)+': '+safe(line))
 }));
}
for(const [name,needle] of patterns){
 const at=lines.findIndex(x=>needle.test(x));
 assert.notEqual(at,-1,'Missing '+name+' integration anchor');
 const start=Math.max(0,at-(name==='native-ledger-insert'?28:8));
 const end=Math.min(lines.length,at+(name==='native-ledger-insert'?65:13));
 const code=lines.slice(start,end).map((l,i)=>(start+i+1)+': '+safe(l));
 console.log('APP_V117_SOURCE_REVIEW_'+name+'='+JSON.stringify({line:at+1,code}));
}
