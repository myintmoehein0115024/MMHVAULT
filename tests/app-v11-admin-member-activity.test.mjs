import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const admin=read('admin.html');
const script=read('js/mmhvault-admin-member-activity-v11.js');
const css=read('css/mmhvault-admin-member-activity-v11.css');
const sql=read('docs/sql/app-v11-admin-member-transaction-activity-REVIEW-ONLY.sql');
const id='00000000-0000-4000-8000-000000000001';

test('APP V11 detail button is wired to each server-authorized member row',()=>{
  assert.match(admin,/row\.dataset\.memberUid=typeof u\.id==='string'\?u\.id:''/);
  assert.match(admin,/detail\.textContent='详情'/);
  assert.match(admin,/activity\.append\(status,last,detail\)/);
  assert.match(admin,/css\/mmhvault-admin-member-activity-v11\.css\?v=1\.0\.0/);
  assert.match(admin,/js\/mmhvault-admin-member-activity-v11\.js\?v=1\.0\.0/);
  assert.match(admin,/client\.rpc\('mmh_admin_overview'/);
  assert.match(css,/admin-member-activity-dialog-v11::backdrop/);
  assert.match(css,/@media\(max-width:500px\)/);
});

test('SQL candidate requires server-side admin check before reading member transaction counts',()=>{
  const body=sql.replace(/--[^\n]*/g,'');
  const helper=body.indexOf('CREATE OR REPLACE FUNCTION mmh_admin.member_transaction_activity');
  const publicRpc=body.indexOf('CREATE OR REPLACE FUNCTION public.mmh_admin_member_transaction_activity');
  assert.ok(helper>=0&&publicRpc>helper);
  const first=body.slice(helper,publicRpc);
  assert.match(first,/SECURITY DEFINER[\s\S]*SET search_path TO ''/);
  assert.ok(first.indexOf('mmh_admin.is_admin()')<first.indexOf('FROM public.transactions'));
  assert.match(first,/auth\.uid\(\) IS NULL OR NOT mmh_admin\.is_admin\(\)/);
  assert.match(first,/WHERE t\.user_id = p_user_id/);
  assert.match(first,/count\(\*\) FILTER \(WHERE t\.created_at >= now\(\) - interval '30 days'\)/);
  assert.match(first,/max\(t\.created_at\)/);
  assert.match(body.slice(publicRpc),/SECURITY INVOKER/);
  assert.match(body,/REVOKE ALL ON FUNCTION mmh_admin\.member_transaction_activity\(uuid\) FROM PUBLIC/);
  assert.match(body,/REVOKE ALL ON FUNCTION public\.mmh_admin_member_transaction_activity\(uuid\) FROM anon/);
  assert.match(body,/GRANT EXECUTE ON FUNCTION public\.mmh_admin_member_transaction_activity\(uuid\) TO authenticated/);
  assert.doesNotMatch(body,/\b(?:DELETE\s+FROM|UPDATE\s+public\.transactions|TRUNCATE\s+|DROP\s+TABLE)\b/i);
  assert.doesNotMatch(body,/\b(?:t\.from_amount|t\.to_amount|t\.note|t\.category)\b/);
});

function harness({
  rpcData={total_transactions:19,added_last_30_days:4,last_added_at:'2026-11-02T10:00:00Z'},
  rpcError=null,authError=null,owner=id,dashboardHidden=false
}={}) {
  const docEvents=new Map(),dialogEvents=new Map(),authEvents=[];
  const elements=new Map();
  const el=n=>{
    if(!elements.has(n))elements.set(n,{hidden:false,textContent:'',isConnected:true});
    return elements.get(n);
  };
  el('dashboard').hidden=dashboardHidden;
  const row={
    dataset:{memberUid:owner},
    querySelectorAll:()=>[{textContent:'Member One'},{textContent:'-'}],
    querySelector:()=>({textContent:'会员 ID：0099 · 注册：2026-10-31'})
  };
  el('users').contains=(x)=>x===row;
  const button={closest:()=>row,isConnected:true,focus(){}};
  const close={addEventListener:()=>{}};
  const dlg={
    open:false,innerHTML:'',events:dialogEvents,querySelector:()=>close,
    setAttribute(){},addEventListener:(k,fn)=>dialogEvents.set(k,fn),
    showModal(){this.open=true},
    close(){this.open=false;dialogEvents.get('close')?.()},
  };
  let called=0,args=null;
  const client={
    auth:{
      getUser:async()=>authError?{error:authError,data:{user:null}}:{data:{user:{id:'admin'}}},
      onAuthStateChange:fn=>authEvents.push(fn)
    },
    rpc:async(name,params)=>{called++;args={name,params};return {data:rpcData,error:rpcError}}
  };
  const doc={
    body:{appendChild(){}},
    createElement:tag=>{assert.equal(tag,'dialog');return dlg},
    getElementById:el,
    addEventListener:(k,fn)=>docEvents.set(k,fn)
  };
  const window={mmhAdminClient:client};
  vm.runInNewContext(script,{document:doc,window,Date,Number,String,Error,Promise,console});
  return {
    el,dlg,button,called:()=>called,args:()=>args,
    click:async()=>{docEvents.get('click')({target:{closest:()=>button}});await new Promise(setImmediate)},
    logout:()=>authEvents.forEach(fn=>fn('SIGNED_OUT'))
  };
}
test('admin sees only total count, last 30 days and last recorded entry time',async()=>{
  const h=harness();await h.click();
  assert.equal(h.called(),1);
  assert.equal(h.args().name,'mmh_admin_member_transaction_activity');
  assert.equal(h.args().params.p_user_id,id);
  assert.equal(h.el('amaTotalV11').textContent,'19');
  assert.equal(h.el('amaRecentV11').textContent,'4');
  assert.match(h.el('amaLastV11').textContent,/北京时间/);
  assert.equal(h.el('amaMetricsV11').hidden,false);
});
test('zero records are displayed as 0 and never as missing data',async()=>{
  const h=harness({rpcData:{total_transactions:0,added_last_30_days:0,last_added_at:null}});
  await h.click();
  assert.equal(h.el('amaTotalV11').textContent,'0');
  assert.equal(h.el('amaRecentV11').textContent,'0');
  assert.equal(h.el('amaLastV11').textContent,'尚未录入');
});
test('missing backend RPC is reported clearly without inventing a count',async()=>{
  const h=harness({rpcError:{code:'PGRST202',message:'function not in schema cache'},rpcData:null});
  await h.click();
  assert.match(h.el('amaStatusV11').textContent,/统计服务尚未启用/);
  assert.equal(h.el('amaMetricsV11').hidden,true);
});
test('no details requests are sent if no valid member ID or dashboard locked',async()=>{
  const a=harness({owner:'unsafe'});
  await a.click();assert.equal(a.called(),0);
  const b=harness({dashboardHidden:true});
  await b.click();assert.equal(b.called(),0);
});
test('signed-out clients do not query the summary RPC',async()=>{
  const h=harness({authError:{message:'Expired'}});
  await h.click();
  assert.equal(h.called(),0);
  assert.match(h.el('amaStatusV11').textContent,/登录已过期/);
});
test('invalid summary response never renders fabricated metrics',async()=>{
  const h=harness({rpcData:{total_transactions:1,added_last_30_days:10}});
  await h.click();
  assert.equal(h.el('amaMetricsV11').hidden,true);
});
test('logout invalidates the dialog and closes it',async()=>{
  const h=harness();await h.click();assert.equal(h.dlg.open,true);
  h.logout();assert.equal(h.dlg.open,false);
});
