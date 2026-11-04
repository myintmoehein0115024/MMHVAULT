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

// Pinpoint real native Add Transaction event wiring and post-save refresh.
// Do not mistake an unrelated inner render() or unrelated submit handler.
for(const [name,pattern] of [
  ['native-save-call',/\bawait\s+addTransaction\s*\(/],
  ['native-save-reference',/\baddTransaction\s*\(/],
  ['transaction-form-lookup',/['"]txForm['"]/],
  ['transactions-global-updated',/\btransactions\s*=\s*\(/],
  ['loadAll-invoke',/\bawait\s+loadAll\s*\(/],
]){
 const at=lines.map((line,i)=>pattern.test(line)?i:-1).filter(i=>i>=0).slice(-10);
 console.log('APP_V117_NATIVE_WIRING_'+name+'='+JSON.stringify(at.map(ix=>({
   line:ix+1,
   code:lines.slice(Math.max(0,ix-6),Math.min(lines.length,ix+11))
     .map((line,k)=>(Math.max(0,ix-6)+k+1)+': '+safe(line))
 }))));
}

// Inspect every binding/bridge to the real native save function and exact
// post-save updater rather than inferring behavior from unrelated pages.
for(const [name,token] of [
  ['addTransaction-binding','addTransaction'],
  ['native-onsubmit-assignment','txForm.onsubmit'],
  ['native-onsubmit-lookup',"'txForm').onsubmit"],
  ['loader-update','transactions='],
  ['data-change','mmhvault:data-change']
]){
 const matches=[];
 for(let i=0;i<lines.length;i++)if(lines[i].includes(token))matches.push(i);
 console.log('APP_V117_NATIVE_BOUNDED_'+name+'='+JSON.stringify(
   matches.slice(0,22).map(ix=>({
    line:ix+1,around:lines.slice(Math.max(0,ix-3),Math.min(lines.length,ix+5))
      .map((l,k)=>(Math.max(0,ix-3)+k+1)+': '+safe(l))
   }))
 ));
}

// Main native add form wraps base addTransaction with validation, busy guard,
// cloud reload and feedback. Capture bounded body for regression review.
const txWrapperAt=lines.findIndex(x=>x.includes('const old=txForm.onsubmit;'));
if(txWrapperAt>=0)console.log('APP_V117_TX_WRAPPER_REVIEW='+JSON.stringify({
  line:txWrapperAt+1,code:lines.slice(txWrapperAt,txWrapperAt+73).map((l,k)=>
   (txWrapperAt+k+1)+': '+safe(l))
}));
