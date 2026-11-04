import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';

const root=new URL('../../',import.meta.url);
const admin=readFileSync(new URL('admin.html',root),'utf8');
const analytics=readFileSync(new URL('admin-analytics.html',root),'utf8');
const embeddedScript=admin.match(/<script id="mmhvault-admin-analytics-embed-v24-script">([\s\S]*?)<\/script>/)?.[1];

test('admin workbench embeds Analytics without leaving the protected page',()=>{
  assert.match(admin,/id="adminAnalyticsTab"[^>]*aria-controls="adminAnalyticsView"/);
  assert.match(admin,/id="adminAnalyticsShortcut"/);
  assert.match(admin,/id="adminAnalyticsView" hidden/);
  assert.match(admin,/id="adminAnalyticsFrame"[^>]*title=/);
  assert.doesNotMatch(admin,/href="admin-analytics\.html"/);
  assert.match(admin,/showView\('analytics'\)/);
  assert.match(admin,/\['usage','feedback','chat','analytics'\]/);
  assert.match(admin,/window\.mmhAdminAnalytics\?\.deactivate\(true\)/);
  assert.match(admin,/window\.mmhAdminAnalytics\?\.isActive\(\)/);
  assert.match(admin,/window\.mmhAdminInboxSuspendV1517/);
  assert.match(admin,/function showView\(which/);
  assert.match(admin,/noticeView\.hidden=false/);
});

test('breakdowns automatically load after the verified KPI request, not before admin authorization',()=>{
  const gate=analytics.indexOf("client.rpc('mmh_is_admin')");
  const verified=analytics.indexOf("data.source!=='cloudflare-web-analytics'||!data.verified");
  const auto=analytics.indexOf("await loadBreakdowns(token,selectedRange,serial)");
  assert.ok(gate>=0&&verified>gate&&auto>verified);
  assert.match(analytics,/if\(selectedRange==='30d'\)/);
  assert.match(analytics,/30-day breakdowns are paused/);
  assert.doesNotMatch(analytics,/id="loadBreakdowns"/);
  assert.doesNotMatch(analytics,/lastBreakdownRequestAt/);
  assert.match(analytics,/requestSerial/);
  assert.match(analytics,/activeBreakdownController\.abort\(\)/);
  assert.match(analytics,/window\.addEventListener\('message',event=>/);
  assert.match(analytics,/event\.origin!==location\.origin/);
  assert.match(analytics,/event\.source!==window\.parent/);
  assert.match(analytics,/event\.data\?\.type!=='mmhvault-analytics-refresh'/);
  assert.doesNotMatch(analytics,/parent\.postMessage\(\{[^}]*token/);
});

test('in-frame controller waits for admin authentication and accepts only same-origin, frame-bound messages',()=>{
  assert.ok(embeddedScript);
  assert.doesNotThrow(()=>new Script(embeddedScript));
  const handlers={};
  const calls=[];
  const frame={
    style:{height:'780px'},
    contentWindow:{postMessage:(data,origin)=>calls.push({data,origin})},
    removeAttribute(k){if(k==='src')delete frame.src}
  };
  const dashboard={hidden:true};
  const view={hidden:true};
  const tab={click(){calls.push({kind:'tab-click'})}};
  const shortcut={addEventListener(name,cb){handlers['shortcut:'+name]=cb}};
  const items={adminAnalyticsFrame:frame,adminAnalyticsView:view,adminAnalyticsTab:tab,dashboard,adminAnalyticsShortcut:shortcut};
  const window={addEventListener(name,handler){handlers['window:'+name]=handler}};
  const document={getElementById:id=>items[id]};
  const location={origin:'https://mmhvault.com'};
  runInNewContext(embeddedScript,{window,document,location,Math,Number});
  const ctl=window.mmhAdminAnalytics;
  assert.ok(ctl);
  ctl.activate();
  assert.equal(ctl.isActive(),false,'before admin auth, no embedded frame');
  assert.equal(frame.src,undefined);
  dashboard.hidden=false;
  ctl.activate();
  assert.equal(ctl.isActive(),true);
  assert.equal(view.hidden,false);
  assert.equal(frame.src,'/admin-analytics.html?embedded=1');
  ctl.refresh();
  assert.equal(calls.length,1);
  assert.equal(calls[0].data.type,'mmhvault-analytics-refresh');
  assert.equal(calls[0].origin,'https://mmhvault.com');
  handlers['window:message']({origin:'https://evil.example',source:frame.contentWindow,data:{type:'mmhvault-analytics-height',height:1300}});
  assert.equal(frame.style.height,'780px');
  handlers['window:message']({origin:'https://mmhvault.com',source:{},data:{type:'mmhvault-analytics-height',height:1300}});
  assert.equal(frame.style.height,'780px');
  handlers['window:message']({origin:'https://mmhvault.com',source:frame.contentWindow,data:{type:'mmhvault-analytics-height',height:1300}});
  assert.equal(frame.style.height,'1300px');
  ctl.deactivate(true);
  assert.equal(ctl.isActive(),false);
  assert.equal(frame.src,undefined);
  assert.equal(view.hidden,true);
  assert.equal(frame.style.height,'780px');
});

test('embedded Analytics uses its own Supabase auth without passing JWT through parent',()=>{
  assert.match(analytics,/new URLSearchParams\(location\.search\)\.get\('embedded'\)==='1'/);
  assert.match(analytics,/body\.classList\.add\('mmh-analytics-embedded'\)/);
  assert.match(analytics,/shell\?\.scrollHeight/);
  assert.match(analytics,/postMessage\(\{type:'mmhvault-analytics-height',height:/);
  assert.doesNotMatch(admin,/postMessage\(\{[^}]*access_token/);
  assert.match(analytics,/Authorization:'Bearer '\+token/);
  assert.match(analytics,/mmh_is_admin/);
});
