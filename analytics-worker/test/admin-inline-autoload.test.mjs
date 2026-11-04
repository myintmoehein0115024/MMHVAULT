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
  assert.doesNotMatch(admin,/<button[^>]*id="adminAnalyticsShortcut"/); // Removed duplicated header link; sidebar is canonical.
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
  handlers['window:message']({origin:'https://mmhvault.com',source:frame.contentWindow,data:{type:'mmhvault-analytics-height',height:1900}});
  assert.equal(frame.style.height,'780px','inactive frame must ignore late height events');
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

test('same verified administrator session refreshes do not destroy the embedded workbench',()=>{
  const start=admin.indexOf('client.auth.onAuthStateChange(');
  const end=admin.indexOf(');boot();',start);
  assert.ok(start>=0&&end>start);
  const callbackRegistration=admin.slice(start,end+2);
  const events=[];
  let handler;
  const ctx={
    generation:8,
    allowed:true,
    verifiedAdminUserId:'admin-a',
    client:{auth:{onAuthStateChange(fn){handler=fn}}},
    clear(){events.push('clear');ctx.allowed=false;ctx.verifiedAdminUserId=null},
    setTimeout(fn,delay){events.push('schedule');assert.equal(delay,0)},
    boot(){events.push('boot')}
  };
  runInNewContext(callbackRegistration,ctx);
  assert.equal(typeof handler,'function');
  for(const event of ['INITIAL_SESSION','SIGNED_IN','TOKEN_REFRESHED']){
    handler(event,{user:{id:'admin-a'}});
    assert.equal(ctx.generation,8,event+' must not reset admin generation');
    assert.equal(ctx.allowed,true,event+' must keep approved dashboard open');
    assert.deepEqual(events,[],event+' must not tear down iframe');
  }
  handler('SIGNED_OUT',null);
  assert.equal(ctx.generation,9,'sign-out must reset session generation');
  assert.equal(ctx.allowed,false,'sign-out must hide the administrator dashboard');
  assert.deepEqual(events,['clear','schedule'],'sign-out must schedule fresh verification');
});

test('identity change and other security events still reset the administrator gate',()=>{
  const start=admin.indexOf('client.auth.onAuthStateChange(');
  const end=admin.indexOf(');boot();',start);
  const code=admin.slice(start,end+2);
  for(const [event,session] of [
    ['SIGNED_IN',{user:{id:'different-admin'}}],
    ['USER_UPDATED',{user:{id:'admin-a'}}],
    ['SIGNED_IN',null]
  ]){
    let handler;
    const actions=[];
    const ctx={
      generation:3,allowed:true,verifiedAdminUserId:'admin-a',
      client:{auth:{onAuthStateChange(fn){handler=fn}}},
      clear(){ctx.allowed=false;ctx.verifiedAdminUserId=null;actions.push('clear')},
      setTimeout(fn,delay){actions.push('schedule');assert.equal(delay,0)},
      boot(){}
    };
    runInNewContext(code,ctx);
    handler(event,session);
    assert.equal(ctx.allowed,false,event+' must invalidate the old verified identity');
    assert.equal(ctx.generation,4);
    assert.deepEqual(actions,['clear','schedule']);
  }
});
