/* Offline browser geometry QA for Admin Feedback Premium V1.1.
 * Uses synthetic UI-only fixtures: no customer data, production credentials or RPCs.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const admin=read('admin.html');
const base=[...admin.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].slice(0,2).map(x=>x[1]);
assert.equal(base.length,2,'Expected Admin base and legacy Feedback styles');
const start=admin.indexOf('<section id="adminFeedbackView"');
const end=admin.indexOf('<section id="adminChatView"',start);
assert.ok(start>=0&&end>start,'Feedback markup must be isolatable');
const feedback=admin.slice(start,end).replace('class="af-premium-feedback-v1" hidden','class="af-premium-feedback-v1"');
const styles=[...base,read('css/mmhvault-admin-premium-workspace-v1.css'),read('css/mmhvault-admin-feedback-premium-v1.css')]
 .map(s=>'<style>'+s+'</style>').join('\n');
const fixture='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'</head>'+
 '<body class="admin-premium-v1" data-admin-unlocked="true">'+
 '<header><div class="brand"><b>MMHVAULT</b></div><div class="adm-header-actions"><button>退出后台</button></div></header>'+
 '<main><section id="dashboard" data-admin-page="other"><nav class="admin-tabs"><button>注册用户</button><button aria-pressed="true">用户反馈</button><button>会员聊天</button><button>网站统计</button></nav>'+feedback+'</section></main></body></html>';

async function mount(page){
 await page.setContent(fixture,{waitUntil:'load'});
 await page.evaluate(()=>{
  const $=id=>document.getElementById(id);
  $('afEmptyV1520').hidden=true;
  $('afDetailV1520').hidden=false;
  $('afPremiumDockV1').hidden=false;
  $('afPersonEmailV1520').textContent='synthetic@example.invalid';
  $('afPersonMetaV1520').textContent='浏览器 QA · 12 条长反馈';
  const members=$('afMemberListV1520');
  for(let i=1;i<=26;i++){
   const row=document.createElement('button');row.className='admin-feedback-member-v1520';row.type='button';
   row.dataset.selected=String(i===1);
   const top=document.createElement('span');top.className='admin-feedback-member-top-v1520';
   const title=document.createElement('strong');title.textContent='测试会员 '+i;
   const tag=document.createElement('em');tag.textContent='12';top.append(title,tag);
   const email=document.createElement('span');email.className='admin-feedback-member-email-v1520';
   email.textContent='synthetic-'+i+'@example.invalid';
   const preview=document.createElement('span');preview.className='admin-feedback-member-preview-v1520';
   preview.textContent='测试长反馈与滚动隔离';
   const date=document.createElement('small');date.textContent='2026-11-04';
   row.append(top,email,preview,date);members.append(row);
  }
  $('afMemberCountV1520').textContent='26';
  const thread=$('afList');
  for(let i=0;i<12;i++){
   const article=document.createElement('article');article.className='af-item af-thread-card-v1520';
   const head=document.createElement('div');head.className='af-thread-head-v1520';
   const title=document.createElement('b');title.textContent='浏览器测试反馈 '+(i+1);
   const badge=document.createElement('span');badge.className='af-badge';badge.textContent='待处理';
   head.append(title,badge);
   const body=document.createElement('p');body.className='af-body';
   body.textContent='这是专用于视觉回归测试的合成内容。'.repeat(30)+'\n'+'Long feedback text. '.repeat(42);
   article.append(head,body);thread.append(article);
  }
  const host=$('afPremiumEditorHostV1');
  const form=document.createElement('form');form.className='af-editor-inline-v1520';
  const status=document.createElement('div');status.className='af-editor-status-v1520';
  const label=document.createElement('label');label.textContent='处理状态';
  const select=document.createElement('select');
  for(const name of ['待处理','处理中','已解决']){
   const option=document.createElement('option');option.textContent=name;select.append(option)
  }
  label.append(select);status.append(label);
  const reply=document.createElement('label');reply.className='af-reply-label-v1520';reply.textContent='回复会员';
  const textarea=document.createElement('textarea');textarea.value='待回复';reply.append(textarea);
  const foot=document.createElement('div');foot.className='af-editor-foot-v1520';
  const msg=document.createElement('span');msg.className='af-result';
  const button=document.createElement('button');button.type='button';button.textContent='保存并回复';foot.append(msg,button);
  form.append(status,reply,foot);host.append(form);
 });
}
async function inspect(browser,spec){
 const page=await browser.newPage({viewport:{width:spec.width,height:spec.height}});
 try{
  await mount(page);
  const result=await page.evaluate(()=>{
   const get=s=>document.querySelector(s);
   const rect=s=>{
    const r=get(s).getBoundingClientRect();
    return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
   };
   const thread=get('#afList'),members=get('#afMemberListV1520'),dock=get('#afPremiumDockV1');
   const fields=[...get('.af-premium-filters-v1').querySelectorAll('select,input')].map(e=>e.getBoundingClientRect().height);
   const before=dock.getBoundingClientRect().bottom;
   thread.scrollTop=900;
   if(innerWidth>720)members.scrollTop=350;else members.scrollLeft=150;
   const after=dock.getBoundingClientRect().bottom;
   return{
    workspace:rect('.af-premium-workspace-v1'),thread:rect('#afList'),dock:rect('#afPremiumDockV1'),
    button:rect('#afPremiumEditorHostV1 button'),fields,
    threadScrolled:thread.scrollTop,memberScrolled:innerWidth>720?members.scrollTop:members.scrollLeft,
    dockShift:Math.abs(after-before),docWidth:document.documentElement.scrollWidth,
    threadScrollable:thread.scrollHeight>thread.clientHeight+20,
    memberScrollable:innerWidth>720?members.scrollHeight>members.clientHeight+20:members.scrollWidth>members.clientWidth+20,
    outerScrollHeight:document.documentElement.scrollHeight
   };
  });
  const name=spec.name;
  assert.ok(result.workspace.height>=350,name+': workspace must be usable');
  assert.ok(result.threadScrollable,name+': long feedback must scroll independently');
  assert.ok(result.memberScrollable,name+': members must scroll separately');
  assert.ok(result.threadScrolled>=100,name+': feedback timeline responds to scroll');
  assert.ok(result.memberScrolled>=30,name+': member navigation responds to scroll');
  assert.ok(result.thread.bottom<=result.dock.y+3,name+': history must not overlap composer');
  assert.ok(result.button.bottom<=result.workspace.bottom+3,name+': save button visible in workspace');
  assert.ok(result.dock.bottom<=result.workspace.bottom+3,name+': composer visible inside workspace');
  assert.ok(result.dockShift<=1,name+': scrolling does not shift composer');
  assert.ok(result.fields.every(v=>Math.abs(v-result.fields[0])<=2),name+': four equal-height filter controls');
  assert.ok(result.docWidth<=spec.width+2,name+': no horizontal document overflow');
  if(spec.width>720&&spec.height>=800)
   assert.ok(result.outerScrollHeight<=spec.height+110,name+': long feedback does not increase outer page height');
  console.log('PASS',name,JSON.stringify({workspace:Math.round(result.workspace.height),
    timeline:Math.round(result.thread.height),dock:Math.round(result.dock.height),
    docHeight:result.outerScrollHeight}));
  await page.screenshot({path:path.join(root,'feedback-v11-'+name+'.png'),fullPage:false});
 }finally{await page.close()}
}
(async()=>{
 let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const spec of [
   {name:'desktop-1440',width:1440,height:900},
   {name:'desktop-1280',width:1280,height:800},
   {name:'tablet-820',width:820,height:900},
   {name:'mobile-390',width:390,height:844},
   {name:'mobile-375',width:375,height:667}
  ])await inspect(browser,spec);
  console.log('All five browser geometry scenarios passed.');
 }catch(error){console.error(error.stack||error.message);process.exitCode=1}
 finally{if(browser)await browser.close()}
})();
