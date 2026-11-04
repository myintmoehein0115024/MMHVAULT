import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = name => fs.readFileSync(new URL('../' + name,import.meta.url),'utf8');
const admin = read('admin.html');
const analytics = read('admin-analytics.html');
const premiumJs = read('js/mmhvault-admin-premium-workspace-v1.js');
const premiumCss = read('css/mmhvault-admin-premium-workspace-v1.css');
const analyticsCss = read('css/mmhvault-admin-analytics-premium-v1.css');

test('premium Admin has only one navigation entry for Analytics, no duplicate header shortcut',()=>{
  assert.match(admin,/<button id="adminAnalyticsTab"[^>]*>网站统计<\/button>/);
  assert.doesNotMatch(admin,/<button[^>]*id="adminAnalyticsShortcut"/);
  assert.match(admin,/css\/mmhvault-admin-premium-workspace-v1\.css\?v=1\.0\.0/);
  assert.match(admin,/js\/mmhvault-admin-premium-workspace-v1\.js\?v=1\.0\.0/);
  assert.match(admin,/id="adminAnalyticsFrame"/);
  assert.match(admin,/window\.mmhAdminAnalytics=\{activate,deactivate,isActive:/);
  assert.match(admin,/if\(frame\.style\.height!==nextHeight\)frame\.style\.height=nextHeight/);
});

test('server-only administrator verification and original feature controls remain intact',()=>{
  for (const marker of [
    "client.rpc('mmh_is_admin')","client.rpc('mmh_admin_overview'",
    "id=\"adminUsageView\"","id=\"adminFeedbackView\"",
    "id=\"adminChatView\"","id=\"adminNoticeTab\"",
    "id=\"adminAnalyticsView\"","id=\"logout\"","id=\"refresh\"",
    "id=\"searchForm\"","id=\"acReplyFormV1517\""
  ]) {
    // The notice tab is created by its protected original module, not duplicated in static HTML.
    if(marker==='id="adminNoticeTab"'){
      assert.match(admin,/noticeTab\.id='adminNoticeTab'/);
    }else assert.ok(admin.includes(marker), 'Missing original Admin control: '+marker);
  }
  assert.match(analytics,/client\.rpc\('mmh_is_admin'\)/);
  assert.match(analytics,/data\.source!=='cloudflare-web-analytics'/);
  assert.match(analytics,/!data\.verified/);
  assert.match(analytics,/Unique visitors/);
  assert.match(analytics,/Unavailable in verified RUM data/);
});

test('premium enhancements are presentation-only, scoped and responsive',()=>{
  assert.match(premiumJs,/const authorized=!dash\.hidden/);
  assert.match(premiumJs,/data-admin-view/);
  assert.match(premiumJs,/feedbackValue\.textContent='—'/);
  assert.doesNotMatch(premiumJs,/\b(?:fetch|XMLHttpRequest|rpc|signOut|signInWithOAuth)\s*\(/);
  assert.doesNotMatch(premiumJs,/\binnerHTML\s*=/);
  assert.match(premiumCss,/body\.admin-premium-v1 #dashboard:not\(\[hidden\]\)/);
  assert.match(premiumCss,/@media\(max-width:900px\)/);
  assert.match(premiumCss,/@media\(max-width:600px\)/);
  assert.match(premiumCss, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(analytics,/css\/mmhvault-admin-analytics-premium-v1\.css\?v=1\.0\.0/);
  assert.match(analyticsCss,/body\.mmh-analytics-embedded/);
  assert.match(analyticsCss,/Unavailable|verified-analytics|Cloudflare/i);
  // No screenshot placeholder metrics, accounts or member content embedded in Admin source.
  assert.doesNotMatch(premiumJs,/124,680|286,410|62,893|MMH888/);
});

test('premium layout script has valid syntax and no direct HTML injection',()=>{
  assert.doesNotThrow(()=>new vm.Script(premiumJs));
  assert.doesNotMatch(premiumJs,/eval\(|new Function\(/);
  assert.doesNotMatch(premiumJs,/\.src\s*=|postMessage\(/);
});
