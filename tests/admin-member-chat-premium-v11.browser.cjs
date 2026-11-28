/* Admin Member Chat Premium V1.1: offline layout regression only.
 * Synthetic contacts and messages. No admin auth, network RPC or live content.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium,webkit}=require('playwright-core');
const root=path.resolve(__dirname,'..');
const read=pathName=>fs.readFileSync(path.join(root,pathName),'utf8');
const html=read('admin.html');
const css=read('css/mmhvault-admin-chat-premium-v11.css');
const start=html.indexOf('<section id="adminChatView" hidden>');
const end=html.indexOf('</main>',start);
assert.ok(start>=0&&end>start,'Chat markup must exist');
assert.equal((html.match(/id="acReplyFormV1517"/g)||[]).length,1,'The original reply form must not be duplicated');
assert.match(html,/css\/mmhvault-admin-chat-premium-v11\.css\?v=1\.0\.0/);
assert.match(css,/grid-template-rows:auto minmax\(0,1fr\) auto!important/);
for(const id of ['#adminChatView','#acConversationV1517','#acThreadV1517','#acReplyFormV1517','#acMemberListV1517'])
 assert.ok(css.includes(id),'Chat-only style contract missing: '+id);
for(const forbidden of ['#adminFeedbackView','#adminAnalyticsView','#adminUsageView','#adminNoticeView','mmh_update_feedback','mmh_list_feedback'])
 assert.ok(!css.includes(forbidden),'Cross-module selector or API forbidden: '+forbidden);
const chat=html.slice(start,end).replace('<section id="adminChatView" hidden>','<section id="adminChatView">');
const inline=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(x=>x[1]);
const style=text=>'<style>'+text+'</style>';
const pageHtml='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 inline.slice(0,3).map(style).join('')+
 style(read('css/mmhvault-admin-premium-workspace-v1.css'))+
 style(read('css/mmhvault-admin-feedback-premium-v1.css'))+
 style(css)+
 '</head><body class="admin-premium-v1">'+
 '<header><div class="brand"><b>MMHVAULT</b></div><div class="adm-header-actions"><button>退出后台</button></div></header>'+
 '<main><section id="dashboard" data-admin-page="other"><nav class="admin-tabs">'+
 '<button>注册用户</button><button>用户反馈</button><button aria-pressed="true">会员聊天</button><button>网站统计</button><button>通知与公告</button>'+
 '</nav>'+chat+'</main>'+
 inline.slice(3).map(style).join('')+'</body></html>';

async function populate(page){
 await page.setContent(pageHtml,{waitUntil:'load'});
 await page.evaluate(()=>{
  const byId=id=>document.getElementById(id);
  byId('acEmptyV1517').hidden=true;
  byId('acConversationV1517').hidden=false;
  byId('acPersonEmailV1517').textContent='long-username-testing-123456789abcdef@no-mail.mmhvault.invalid';
  byId('acPersonMetaV1517').textContent='会员 ID · 0010 · 30 条消息 · 最近 72 小时';
  byId('acMemberCountV1517').textContent='30';
  const members=byId('acMemberListV1517');
  for(let i=0;i<30;i++){
   const b=document.createElement('button');b.className='admin-chat-member-v1517';b.type='button';
   b.dataset.selected=String(i===0);
   const top=document.createElement('span');top.className='admin-chat-member-top-v1517';
   const strong=document.createElement('strong');strong.textContent='synthetic-long-user-'+i+'@example.invalid';
   const count=document.createElement('em');count.textContent='30';
   top.append(strong,count);
   const preview=document.createElement('span');preview.className='admin-chat-member-preview-v1517';
   preview.textContent='合成测试消息内容，不包含客户资料';
   const small=document.createElement('small');small.textContent='会员 ID · '+String(i+1).padStart(4,'0');
   const date=document.createElement('small');date.textContent='2026/11/6 13:00';
   b.append(top,preview,small,date);members.append(b);
  }
  const thread=byId('acThreadV1517');
  for(let i=0;i<30;i++){
   const row=document.createElement('div');
   row.className='admin-chat-row-v1517 '+(i%2?'admin':'member');
   const bubble=document.createElement('div');bubble.className='admin-chat-bubble-v1517';
   const p=document.createElement('p');p.textContent='长消息测试文字。'.repeat(38)+'\n'+'A long synthetic message. '.repeat(28);
   const small=document.createElement('small');small.textContent='2026/11/6 13:08';
   bubble.append(p,small);row.append(bubble);thread.append(row);
  }
  byId('acReplyV1517').value='这是浏览器合成测试回复';
 });
}
const selectors={
 panel:'#adminChatView .admin-chat-panel-v1518',
 shell:'#adminChatView .admin-chat-shell-v1517',
 members:'#acMemberListV1517',
 thread:'#acThreadV1517',
 form:'#acReplyFormV1517',
 send:'#acReplySendV1517'
};
async function inspect(browser,engine,spec){
 const page=await browser.newPage({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:1});
 const id=engine+'-'+spec.name;
 try{
  await populate(page);
  const result=await page.evaluate(({selectors,width})=>{
   const get=key=>document.querySelector(selectors[key]);
   const box=key=>{
    const rect=get(key).getBoundingClientRect();
    return {x:rect.x,y:rect.y,bottom:rect.bottom,right:rect.right,width:rect.width,height:rect.height};
   };
   const thread=get('thread'),members=get('members'),form=get('form');
   const panel=box('panel'),shell=box('shell'),threadBox=box('thread'),formBox=box('form'),send=box('send');
   const dockY=formBox.y,prevThreadScroll=thread.scrollTop;
   // Legacy chat CSS uses smooth scroll; disable animation only in this synthetic
   // geometry probe so scrollTop can be asserted immediately and deterministically.
   thread.style.scrollBehavior='auto';
   thread.scrollTop=850;
   const scrollT=thread.scrollTop;
   if(width>720)members.scrollTop=400;else members.scrollLeft=150;
   const scrollM=width>720?members.scrollTop:members.scrollLeft;
   const dockShift=Math.abs(form.getBoundingClientRect().y-dockY);
   const memberScrollable=width>720?members.scrollHeight>members.clientHeight+20:members.scrollWidth>members.clientWidth+20;
   const emoji=document.getElementById('acEmojiPanelV1518');
   const heightBefore=form.getBoundingClientRect().height;
   emoji.hidden=false;
   const heightAfter=form.getBoundingClientRect().height;
   emoji.hidden=true;
   return {
    panel,shell,threadBox,formBox,send,docWidth:document.documentElement.scrollWidth,
    viewportWidth:window.innerWidth,dockShift,scrollT,scrollM,prevThreadScroll,
    scrollable:thread.scrollHeight>thread.clientHeight+25,memberScrollable,
    emojiFormGrowth:Math.abs(heightBefore-heightAfter),composerHasHeight:form.clientHeight>0
   };
  },{selectors,width:spec.width});
  console.log('METRICS',id,JSON.stringify(result));
  await page.screenshot({path:path.join(root,'admin-chat-premium-v11-'+id+'.png'),fullPage:false});
  assert.ok(result.panel.height>480,id+': panel must be usable');
  assert.ok(result.shell.bottom<=result.panel.bottom+3,id+': shell stays inside panel');
  assert.ok(result.scrollable&&result.scrollT>80,id+': long message timeline scrolls inside shell');
  assert.ok(result.memberScrollable&&result.scrollM>20,id+': member navigation scrolls independently');
  assert.ok(result.threadBox.bottom<=result.formBox.y+3,id+': thread must not overlap reply form');
  assert.ok(result.send.bottom<=result.formBox.bottom+2,id+': send button must be reachable inside reply form');
  assert.ok(result.formBox.bottom<=result.panel.bottom+3,id+': reply dock remains inside panel');
  assert.ok(result.dockShift<2,id+': scrolling thread never moves reply dock');
  assert.ok(result.emojiFormGrowth<3,id+': emoji popover must not push reply below panel');
  assert.ok(result.docWidth<=spec.width+2,id+': no horizontal page overflow');
  console.log('PASS',id,JSON.stringify({panelHeight:Math.round(result.panel.height),
   threadHeight:Math.round(result.threadBox.height),formHeight:Math.round(result.formBox.height),
   scrollT:result.scrollT,scrollM:result.scrollM}));
 }finally{await page.close()}
}
(async()=>{
 let browser=null;
 try{
  const specs=[
   {name:'desktop-1440',width:1440,height:900},
   {name:'laptop-1366',width:1366,height:768},
   {name:'tablet-820',width:820,height:900},
   {name:'tablet-short',width:820,height:680},
   {name:'mobile-390',width:390,height:844},
   {name:'mobile-375',width:375,height:667}
  ];
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const spec of specs)await inspect(browser,'chromium',spec);
  await browser.close();browser=null;
  browser=await webkit.launch({headless:true});
  for(const spec of specs)await inspect(browser,'webkit',spec);
  console.log('All 12 Chrome and WebKit member-chat geometry scenarios passed.');
 }catch(e){console.error(e.stack||e.message);process.exitCode=1}
 finally{if(browser)await browser.close()}
})();
