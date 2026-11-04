/* Onboarding source contract: no financial/server mutations; APP retains canonical handlers. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.html'),'utf8');
const guide=fs.readFileSync(path.join(root,'js/mmhvault-transaction-onboarding-live-v1.mjs'),'utf8');
const state=fs.readFileSync(path.join(root,'js/mmhvault-transaction-onboarding-state-v1.mjs'),'utf8');
const css=fs.readFileSync(path.join(root,'css/mmhvault-transaction-onboarding-v1.css'),'utf8');
assert.match(app,/src="js\/mmhvault-v11-manage-hierarchy-live\.mjs\?v=0\.7\.0"/);
assert.match(app,/src="js\/mmhvault-transaction-onboarding-live-v1\.mjs\?v=1\.0\.0"/);
assert.match(app,/href="css\/mmhvault-transaction-onboarding-v1\.css\?v=1\.0\.0"/);
assert.equal((app.match(/src="js\/mmhvault-transaction-onboarding-live-v1\.mjs/g)||[]).length,1);
assert.match(app,/id="txForm"/);
assert.match(app,/id="txAddPanel"/);
assert.match(app,/id="mmhManagerCategoriesPanelV445"/);
assert.match(app,/id="txHistoryPanel"/);
assert.match(app,/class="mmh-glass-tx-nav-v1"/);
assert.match(guide,/mmhTxOnboardingHelpBarV1/);
assert.match(guide,/nav\.before\(bar\)/);
assert.match(guide,/childList:true/);
for(const [name,script] of [['live',guide],['state',state]]){
  for(const dangerous of [
    /\bdb\s*\.\s*from\s*\(/,/\b(?:fetch|XMLHttpRequest|sendBeacon)\s*\(/,
    /\b(?:insert|update|upsert|remove)\s*\(\s*['"]transactions['"]/,
    /(?:MMHVAULT_CONFIG|MMHVAULT_CONFIG_OWNER|currentSessionUser)\s*=(?!=)/,
    /window\.transactions\s*=/,/\bresetMyCloudDataV380\s*\(/,
    /(?:create|delete)\s+table\b/i
  ])assert.doesNotMatch(script,dangerous,name+' must not change core finance or backend');
}
assert.match(guide,/window\.mmhWalletDataOwnerV191===id/);
assert.match(guide,/mmhvault:config-owner-changed/);
assert.match(guide,/languagechange/);
assert.match(guide,/isAutoEligible/);
assert.match(state,/STORAGE_PREFIX='mmhvault_tx_onboarding_v1_'/);
assert.match(css,/@media\(max-width:690px\)/);
assert.match(css, /prefers-reduced-motion:reduce/);
console.log('PASS onboarding is UI-only, owner-scoped, tri-lingual, responsive and separate from V11.7 ledger');
