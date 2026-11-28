// V2.0.66 isolated Settings overview cascade QA; synthetic profile only, no production requests.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const external=readFileSync(new URL('../css/mmhvault-settings-life-p928.css',import.meta.url),'utf8');
const final=app.match(/<style id="mmhvault-personal-settings-home-v266">([\s\S]*?)<\/style>/)?.[1];
const grouping=app.match(/<script id="mmhvault-settings-template-groups-v7">([\s\S]*?)<\/script>/)?.[1];
assert(final&&grouping,'actual new CSS and legacy grouping script required');
const install=app.match(/<script id="mmhvault-settings-control-feedback-v4">([\s\S]*?)<\/script>/)?.[1];assert(install,'actual install dialog script');
const css=[...app.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>|<link\b[^>]*href="css\/mmhvault-settings-life-p928\.css[^"]*"[^>]*>/gi)].map(m=>'<style>'+(m[1]??external)+'</style>').join('');
const items=[['general','General','⚙'],['security','Password &amp; devices','⌑'],['icon','App icon','▣'],['data','Data &amp; backup','⇩']];
const buttons=items.map(([id,title,icon])=>'<button type="button" class="st-nav" aria-controls="stPage_'+id+'"><span class="st-icon" aria-hidden="true">'+icon+'</span><span class="st-nav-name">'+title+'</span><span class="st-chevron" aria-hidden="true">›</span></button>').join('');
const stats=['Day streak','Days recorded','Transactions'].map((x,i)=>'<div><b>'+[19,91,271][i]+'</b><small>'+x+'</small></div>').join('');
const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+css+'</head><body class="mmh-workspace-active"><main class="wrap"><section id="settings" class="page active"><h1>Settings</h1><div id="stSettingsHomeV3" class="st-home"><div id="settingsPanelAccountV371"><div class="panel"><div class="toolbar"><h2>My profile</h2><button class="btn danger">Logout</button></div><div class="account-center-v375"><div class="account-center-card-v375"><div class="account-center-head-v375"><div class="account-center-avatar-v375">MF</div><div><div class="account-center-name-v375">Sample profile</div><div class="account-center-email-v375">sample-long-address@example.invalid</div></div></div><div class="st-stats">'+stats+'</div><button class="st-nav st-profile-link">Edit profile</button></div></div></div></div><nav class="st-home-menu">'+buttons+'</nav></div>'+items.map(([id])=>'<section id="stPage_'+id+'" class="st-page" hidden>'+(id==='general'?'<div class="st-group"><div class="st-rows"><label class="st-row"><span class="st-icon">$</span><span>Default display currency</span><select><option>USD</option></select></label><label class="st-row"><span class="st-icon">Aa</span><span>Font style</span><select><option>System</option></select></label><div id="stFontPreviewV265">Balance · Income · Expenses</div><p id="stFontNoteV265">Font note</p><p id="stFontStatusV265" role="status"></p></div></div>':'Mock detail')+'</section>').join('')+'</section></main></body></html>';
const engine=process.env.MMH_SETTINGS_BROWSER||'chromium';
assert(['chromium','webkit'].includes(engine));
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1500,height:900}});
 const origin='https://mmh-settings-layout.invalid';
 await context.route('**/*',route=>route.request().url()===origin+'/'?route.fulfill({status:200,contentType:'text/html',body:html}):route.request().url()===origin+'/images/mmhvault-v2-auth-mark.webp'?route.fulfill({status:200,contentType:'image/webp',body:readFileSync(new URL('../images/mmhvault-v2-auth-mark.webp',import.meta.url))}):route.abort());
 const page=await context.newPage();
 await page.goto(origin+'/');
 await page.addScriptTag({content:install});
 await page.addScriptTag({content:grouping});
 await page.evaluate(()=>{const last=document.querySelector('.st-template-group:last-child');for(const [cls,text] of [['fb-nav','Feedback center'],['st-nav cs-entry-v1518','Live support']]){const b=document.createElement('button');b.className=cls;b.textContent=text;last.append(b)}});
 assert.equal(await page.locator('.st-template-group').count(),3);
 assert.equal(await page.locator('#settings>h1').isVisible(),false,'duplicate page title suppressed');
 assert.equal(await page.locator('.st-template-legacy-support-v268').isVisible(),false);
 assert.equal(await page.locator('.st-home-menu [aria-controls="stPage_icon"]').count(),0);
 assert.equal(await page.locator('#stPage_general [aria-controls="stPage_icon"]').count(),0);
 assert.equal(await page.locator('#stPage_general #stAppIconGuideV270').count(),1);
 assert.deepEqual(await page.locator('.st-template-group:nth-child(2) [aria-controls]').evaluateAll(es=>es.map(e=>e.getAttribute('aria-controls'))),['stPage_security','stPage_data']);
 let cases=0;
 for(const width of [360,760,1100,1500]){
  await page.setViewportSize({width,height:900});
  for(const light of [false,true]){
   await page.evaluate(light=>document.body.classList.toggle('light',light),light);
   for(const lang of ['en','zh','my']){
    await page.evaluate(lang=>{localStorage.setItem('mmhvault_language_v3363',lang);document.documentElement.lang=lang;dispatchEvent(new Event('mmhvault-language-change'))},lang);
    const result=await page.evaluate(()=>{
     const home=document.getElementById('stSettingsHomeV3'),menu=home.querySelector('.st-home-menu'),profile=home.querySelector('#settingsPanelAccountV371>.panel');
     const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
     const hidden=[...menu.querySelectorAll('.fb-nav,.cs-entry-v1518')].map(e=>getComputedStyle(e).display);
     const entries=[...menu.querySelectorAll('.st-nav[aria-controls]')].map(e=>({rect:rect(e),display:getComputedStyle(e).display,overflow:e.scrollWidth-e.clientWidth}));
     const groups=[...menu.querySelectorAll('.st-template-group')].filter(e=>getComputedStyle(e).display!=='none').map(rect);
     return {home:rect(home),menu:rect(menu),profile:rect(profile),hidden,entries,groups,heading:menu.querySelector('h3').textContent,columns:getComputedStyle(menu).gridTemplateColumns.split(' ').length};
    });
    const label=[width,light,lang].join('/');
    assert.deepEqual(result.hidden,['none','none'],label+' duplicate support hidden');
    assert.equal(result.entries.length,3,label);
    assert.equal(result.groups.length,2,label+' two visible groups');
    assert.ok(result.entries.every(x=>x.display!=='none'&&x.rect.w>0&&x.rect.h>=44&&x.overflow<=2),label+' three available home entries, no overflow');
    assert.ok(Math.abs(result.profile.x-result.menu.x)<=2&&Math.abs(result.profile.right-result.menu.right)<=2,label+' profile and menu align');
    assert.ok(result.groups.every(x=>x.h>0&&x.h<260&&x.x>=result.menu.x-2&&x.right<=result.menu.right+2),label+' compact groups');
    assert.equal(result.columns,1,label+' unified single settings card');
    assert.equal(result.heading,{en:'Preferences',zh:'偏好设置',my:'စိတ်ကြိုက်ဆက်တင်များ'}[lang],label+' actual group translation');
    assert.equal(await page.locator('#stPage_general .st-app-icon-row-v270 .st-nav-name').textContent(),{en:'App icon',zh:'应用图标',my:'အက်ပ်အိုင်ကွန်'}[lang]);
    await page.evaluate(()=>{document.getElementById('stSettingsHomeV3').hidden=true;document.getElementById('settings').classList.add('st-in-subpage');document.getElementById('stPage_general').hidden=false});
    const nested=page.locator('#stPage_general .st-app-icon-row-v270');
    assert.equal(await nested.isVisible(),true,label+' icon link visible in General');
    assert.equal(await nested.evaluate(e=>e.parentElement.classList.contains('st-rows')),true,label+' integrated into the existing General rows');
    assert.ok(await nested.evaluate(e=>e.getBoundingClientRect().height>=44&&e.scrollWidth-e.clientWidth<=2),label+' icon row fits');
    assert.equal(await page.locator('#stFontPreviewV265').isVisible(),false,label+' font sample hidden');
    assert.equal(await page.locator('#stPage_general .st-rows>.st-row').count(),3,label+' exactly three rows');
    assert.equal(await page.locator('#stFontNoteV265').evaluate(e=>e.parentElement.classList.contains('st-group')),true,label+' font note outside rows');
    const selectChecks=await page.locator('#stPage_general .st-rows>.st-row>select').evaluateAll(es=>es.map(e=>{const cs=getComputedStyle(e),r=e.getBoundingClientRect();return {w:r.width,h:r.height,right:r.right,rowRight:e.parentElement.getBoundingClientRect().right,scheme:cs.colorScheme,image:cs.backgroundImage,appearance:cs.appearance,options:[...e.options].map(o=>o.value)}}));
    assert.equal(selectChecks.length,2,label+' original native dropdowns');
    assert.ok(selectChecks.every(x=>x.h>=44&&x.w>0&&x.right<=x.rowRight+1&&x.scheme===(light?'light':'dark')&&x.image==='none'&&x.appearance==='auto'&&x.options.length),label+' V2 native dropdown appearance');
    assert.ok(Math.abs(selectChecks[0].w-selectChecks[1].w)<=1,label+' stable equal General dropdown widths');
    const logo=page.locator('#stAppIconGuideV270'),guide=page.locator('#stInstallGuideV5');
    assert.equal(await logo.locator('img').getAttribute('src'),'./images/mmhvault-v2-auth-mark.webp');
    await logo.click();assert.equal(await guide.evaluate(e=>e.open),true,label+' opens guide directly');
    assert.equal(await page.locator('#stPage_general').isVisible(),true,label+' General remains active');
    assert.equal(await guide.locator('#stInstallDeviceV5').isVisible(),false,label+' no device list in direct guide');
    assert.equal(await guide.locator('.st-install-brand-v271').getAttribute('src'),'./images/mmhvault-v2-auth-mark.webp');
    assert.equal(await page.locator('#stPage_icon').isVisible(),false,label+' no legacy icon navigation');
    await page.locator('#stInstallCloseV265').click();await page.waitForFunction(()=>document.activeElement?.id==='stAppIconGuideV270');
    await page.evaluate(()=>{document.getElementById('stPage_general').hidden=true;document.getElementById('settings').classList.remove('st-in-subpage');document.getElementById('stSettingsHomeV3').hidden=false});
    cases++;
   }
  }
 }
 await page.evaluate(()=>{document.getElementById('stSettingsHomeV3').hidden=true;document.getElementById('settings').classList.add('st-in-subpage');document.getElementById('stPage_general').hidden=false;localStorage.setItem('mmhvault_language_v3363','en')});
 const deviceCases=[['Mozilla iPhone Safari/605.1',1,'ios'],['Mozilla iPad Safari/605.1',5,'ipad'],['Mozilla Macintosh Safari/605.1',5,'ipad'],['Mozilla Macintosh Safari/605.1',0,'desktop-safari'],['Mozilla Windows Chrome/130.0 Safari/537.36',0,'desktop-chrome'],['Mozilla Windows Chrome/130.0 Safari/537.36 Edg/130.0',0,'desktop-edge'],['Mozilla Android Chrome/130.0 Safari/537.36',5,'android-chrome'],['Mozilla Android Firefox/130.0',5,'android-firefox']];
 for(const [ua,touch,device] of deviceCases){
  await page.evaluate(([ua,touch])=>{Object.defineProperty(navigator,'userAgent',{configurable:true,value:ua});Object.defineProperty(navigator,'maxTouchPoints',{configurable:true,value:touch})},[ua,touch]);
  await page.locator('#stAppIconGuideV270').click();
  const g=page.locator('#stInstallGuideV5');
  assert.equal(await g.locator('#stInstallDeviceV5').inputValue(),device,'detected '+device);
  assert.equal(await g.locator('#stInstallDeviceV5').isVisible(),false);
  assert.equal(await g.locator('.st-detected-device-v271').count(),1);
  if(device==='desktop-safari')assert.match(await g.locator('ol').innerText(),/Add to Dock/);
  await g.locator('#stInstallCloseV265').click();await page.waitForFunction(()=>document.activeElement?.id==='stAppIconGuideV270');
 }
 console.log('PASS: V2.0.71 direct guide automatic device detection, '+deviceCases.length+' simulated UA cases');
 await page.evaluate(()=>document.getElementById('stPage_general').hidden=true);
 await page.evaluate(()=>document.getElementById('stSettingsHomeV3').hidden=true);
 assert.equal(await page.locator('#stSettingsHomeV3').isVisible(),false,'detail navigation must keep overview hidden');
 console.log('PASS: V2.0.70 Settings overview and direct logo guide, '+cases+' '+engine+' cases, synthetic profile, duplicate entries hidden, compact grid and translations');
}finally{await browser.close()}
