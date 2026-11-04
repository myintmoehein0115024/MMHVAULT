import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const admin=read('admin.html');
const analytics=read('admin-analytics.html');
const premiumJs=read('js/mmhvault-admin-premium-workspace-v1.js');
const premiumCss=read('css/mmhvault-admin-premium-workspace-v1.css');
const analyticsCss=read('css/mmhvault-admin-analytics-premium-v1.css');

test('register-users page is the first Admin tab, with original searchable and paginated real member directory',()=>{
 assert.match(admin,/<button id="adminUsageTab" aria-pressed="true">注册用户<\/button>/);
 assert.match(admin,/<h2>注册用户列表<\/h2>/);
 for(const id of ['adminUsageView','registered','today','month','recent','users','search','searchForm','prev','next','page','updated']){
   assert.ok(admin.includes('id="'+id+'"'),'Original user directory element missing: '+id);
 }
 assert.match(admin,/client\.rpc\('mmh_admin_overview',\{p_search:search,p_offset:offset\}\)/);
 assert.match(admin,/offset\+50>=total/);
 assert.match(admin,/for\(const u of data\.users\)/);
 assert.match(admin,/row\.dataset\.memberUid=typeof u\.id==='string'\?u\.id:''/);
 assert.match(admin,/detail\.textContent='详情'/);
 assert.match(admin,/fields\.append\(cell\)|fields\.append\(cell\)/);
 assert.match(admin,/\['用户名','username'\]/);
 assert.match(admin,/\['邮箱','email'\]/);
 assert.match(admin,/\['Google','google_email'\]/);
});

test('website statistics loads only from its own tab and keeps exactly one verified iframe',()=>{
 assert.match(admin,/<button id="adminAnalyticsTab"[^>]*>网站统计<\/button>/);
 assert.equal((admin.match(/id="adminAnalyticsFrame"/g)||[]).length,1);
 assert.doesNotMatch(admin,/<button[^>]*id="adminAnalyticsShortcut"/);
 assert.match(admin,/if\(which==='analytics'\)\{window\.mmhAdminAnalytics\?\.activate\(\)\}else\{window\.mmhAdminAnalytics\?\.deactivate\(\)\}/);
 assert.doesNotMatch(admin,/which==='analytics'\|\|which==='usage'/);
 assert.match(admin,/\$\('refresh'\)\.onclick=\(\)=>\{if\(window\.mmhAdminAnalytics\?\.isActive\(\)\)window\.mmhAdminAnalytics\.refresh\(\);else load\(\)\}/);
 assert.match(admin,/window\.mmhAdminAnalytics=\{activate,deactivate,isActive:/);
 assert.match(admin,/if\(frame\.style\.height!==nextHeight\)frame\.style\.height=nextHeight/);
});

test('KPI cards remain in registration view, not a shared container on other Admin tabs',()=>{
 assert.doesNotMatch(premiumJs,/dash\.insertBefore\(metrics,nav\)/);
 assert.match(premiumJs,/metrics=usage\?\.querySelector\(':scope>\.metrics'\)/);
 assert.doesNotMatch(premiumJs,/admPendingFeedbackV1|adm-overview-band|adm-overview-tiles/);
 assert.match(premiumJs,/dash\.dataset\.adminPage=authorized&&!usage\.hidden\?'registered-users':'other'/);
 assert.match(premiumJs,/new MutationObserver\(sync\)\.observe\(usage,\{attributes:true,attributeFilter:\['hidden'\]\}\)/);
 assert.match(premiumCss,/body\.admin-premium-v1 #dashboard\[data-admin-page="registered-users"\]/);
 assert.match(premiumCss,/#adminUsageView>\.metrics\{\s*display:grid!important/);
 assert.match(premiumCss,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
 assert.match(premiumCss,/@media\(max-width:900px\)/);
 assert.match(premiumCss,/@media\(max-width:520px\)/);
});

test('page-one release cache-busts both scripts and styles without touching Analytics business logic',()=>{
 assert.match(admin,/css\/mmhvault-admin-premium-workspace-v1\.css\?v=1\.1\.0/);
 assert.match(admin,/js\/mmhvault-admin-premium-workspace-v1\.js\?v=1\.1\.0/);
 assert.match(analytics,/css\/mmhvault-admin-analytics-premium-v1\.css\?v=1\.0\.0/);
 assert.match(analytics,/client\.rpc\('mmh_is_admin'\)/);
 assert.match(analytics,/data\.source!=='cloudflare-web-analytics'/);
 assert.match(analytics,/!data\.verified/);
 assert.match(analytics,/Unavailable in verified RUM data/);
 assert.match(analyticsCss,/body\.mmh-analytics-embedded/);
});

test('administrator auth, feedback, chat, notice and finance privacy boundary remain',()=>{
 for(const marker of [
  "client.rpc('mmh_is_admin')","client.rpc('mmh_admin_overview'",
  "id=\"adminFeedbackView\"","id=\"adminChatView\"",
  "id=\"acReplyFormV1517\"","id=\"logout\"","id=\"refresh\"",
  "noticeTab.id='adminNoticeTab'","client.auth.onAuthStateChange",
  "detail.textContent='详情'"
 ])assert.ok(admin.includes(marker),'Missing protected original feature '+marker);
 assert.doesNotMatch(premiumJs,/\b(?:fetch|XMLHttpRequest|rpc|signOut|signInWithOAuth)\s*\(/);
 assert.doesNotMatch(premiumJs,/\binnerHTML\s*=/);
 assert.doesNotMatch(premiumJs,/\b(?:eval|Function)\(/);
 assert.doesNotMatch(premiumJs,/124,680|286,410|62,893|MMH888/);
 assert.doesNotThrow(()=>new vm.Script(premiumJs));
});
