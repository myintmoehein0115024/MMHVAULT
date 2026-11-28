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
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.href===origin+'/')return route.fulfill({status:200,contentType:'text/html',body:html});if(url.origin===origin&&(/^\/images\/mmhvault-install-(ios|ipad|android-chrome|desktop)-v271\.webp$/.test(url.pathname)||url.pathname==='/images/mmhvault-v2-auth-mark.webp'))return route.fulfill({status:200,contentType:'image/webp',body:readFileSync(new URL('..'+url.pathname,import.meta.url))});return route.abort()});
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
    assert.ok(selectChecks.every(x=>x.h>=44&&x.w>0&&x.right<=x.rowRight+1&&x.scheme===(light?'light':'dark')&&x.image==='none'&&['auto','menulist','menulist-button'].includes(x.appearance)&&x.options.length),label+' V2 native dropdown appearance: '+JSON.stringify(selectChecks));
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
 const deviceCases=[["Mozilla iPhone Safari/605.1",1,"ios"],["Mozilla iPhone CriOS/130 Safari/605.1",1,"ios-other"],["Mozilla iPad Safari/605.1",5,"ipad"],["Mozilla Macintosh Safari/605.1",5,"ipad"],["Mozilla iPad CriOS/130 Safari/605.1",5,"ipad-other"],["Mozilla Macintosh Safari/605.1",0,"desktop-safari"],["Mozilla Windows Chrome/130.0 Safari/537.36",0,"desktop-chrome"],["Mozilla Windows Chrome/130.0 Safari/537.36 Edg/130.0",0,"desktop-edge"],["Mozilla Windows Firefox/130.0",0,"desktop"],["Mozilla Android Mobile Chrome/130.0 Safari/537.36",5,"android-chrome"],["Mozilla Android Mobile Firefox/130.0",5,"android-firefox"],["Mozilla Android Mobile SamsungBrowser/26 Chrome/130",5,"android-other"],["Mozilla Android Chrome/130.0 Safari/537.36",5,"android-tablet-chrome"],["Mozilla Android Tablet Firefox/130.0",5,"android-tablet-firefox"],["Mozilla Android Tablet SamsungBrowser/26 Chrome/130",5,"android-tablet-other"],["Mozilla Tablet Firefox/130",5,"tablet-other"]];
 for(const [ua,touch,device] of deviceCases){
  await page.evaluate(([ua,touch])=>{Object.defineProperty(navigator,'userAgent',{configurable:true,value:ua});Object.defineProperty(navigator,'maxTouchPoints',{configurable:true,value:touch})},[ua,touch]);
  await page.locator('#stAppIconGuideV270').click();
  const g=page.locator('#stInstallGuideV5');
  assert.equal(await g.locator('#stInstallDeviceV5').inputValue(),device,'detected '+device);
  assert.equal(await g.locator('#stInstallDeviceV5').isVisible(),false);
  assert.equal(await g.locator('.st-detected-device-v271').count(),1);
  const art=({"ios":"ios","ios-other":"ios","ipad":"ipad","ipad-other":"ipad","android-chrome":"android-chrome","android-firefox":"android-chrome","android-other":"android-chrome","android-tablet-chrome":"ipad","android-tablet-firefox":"ipad","android-tablet-other":"ipad","tablet-other":"ipad","desktop":"desktop","desktop-chrome":"desktop","desktop-edge":"desktop","desktop-safari":"desktop"})[device];
  const picture=g.locator('.st-install-art-image-v271');
  assert.equal(await picture.count(),art?1:0,'only device-appropriate artwork');
  if(art){assert.equal(await picture.getAttribute('src'),'./images/mmhvault-install-'+art+'-v271.webp');await picture.evaluate(img=>img.decode())}
  if(device==='desktop-safari')assert.match(await g.locator('ol').innerText(),/Add to Dock/);
  if(device==='android-tablet-firefox'||device==='android-firefox')assert.match(await g.locator('ol').innerText(),/Choose Install or Add to Home screen/);
  if(device.startsWith('android-tablet-'))assert.doesNotMatch(await g.locator('ol').innerText(),/Share icon|Safari/);
  await g.locator('#stInstallCloseV265').click();await page.waitForFunction(()=>document.activeElement?.id==='stAppIconGuideV270');
 }
 console.log('PASS: V2.0.71 direct guide automatic device detection, '+deviceCases.length+' simulated UA cases');
 await page.evaluate(()=>document.getElementById('stPage_general').hidden=true);
 await page.evaluate(()=>document.getElementById('stSettingsHomeV3').hidden=true);
 assert.equal(await page.locator('#stSettingsHomeV3').isVisible(),false,'detail navigation must keep overview hidden');
 console.log('PASS: V2.0.70 Settings overview and direct logo guide, '+cases+' '+engine+' cases, synthetic profile, duplicate entries hidden, compact grid and translations');

 // V2.0.72: exercise actual new control script and shared currency renderer.
 const combo=app.match(/<script id="mmhvault-personal-settings-combo-v272-js">([\s\S]*?)<\/script>/)?.[1];
 const avatarBind=app.match(/for\(const id of \['accountAvatarV372','accountDisplayNameV372'\]\)\{[^\n]+\}/)?.[0];
 const renderer=app.slice(app.indexOf('const flagMap={USD:'),app.indexOf('function setupDisplayPickerV3('));
 assert(combo&&avatarBind&&renderer.includes('window.MMHCurrencyPickerV3=Object.freeze'),'actual runtime sources');
 await page.evaluate(()=>{const root=document.getElementById('settings');root.classList.remove('st-in-subpage');document.getElementById('stSettingsHomeV3').hidden=false;
  document.querySelector('.account-center-avatar-v375').id='accountAvatarV372';document.querySelector('.account-center-name-v375').id='accountDisplayNameV372';
  const [currency,font]=document.querySelectorAll('#stPage_general select');currency.id='stPref_currency';font.id='stPref_fontV265';
  currency.replaceChildren(...'USD THB MMK CNY AMD JPY KRW KPW HKD MOP TWD MNT BND IDR KHR LAK MYR PHP SGD VND INR EUR AUD'.split(' ').map(v=>new Option(v,v)));
  font.replaceChildren(...[['system','System'],['modern','Modern'],['elegant','Elegant'],['minimal','Minimal'],['digital','Digital'],['soft','Soft'],['bold','Bold']].map(([v,t])=>new Option(t,v)));
  window.fixtureChanges=[];for(const s of [currency,font])s.addEventListener('change',()=>window.fixtureChanges.push([s.id,s.value]));
  window.fixtureProfile=[];window.mmhOpenSettingsSectionV3=(id,trigger)=>window.fixtureProfile.push([id,trigger.id]);
 });
 await page.addScriptTag({content:'(()=>{const $=id=>document.getElementById(id);'+avatarBind+'})();'});
 await page.addScriptTag({content:'(()=>{const MMHVAULT_CONFIG={accounts:[]};'+renderer+'})();'});
 await page.addScriptTag({content:combo});
 let comboCases=0;
 for(const width of [360,760,1100,1500]){
  await page.setViewportSize({width,height:width===360?640:900});
  for(const light of [false,true])for(const lang of ['en','zh','my']){
   await page.evaluate(([light,lang])=>{document.body.classList.toggle('light',light);document.documentElement.lang=lang;localStorage.setItem('mmhvault_language_v3363',lang);dispatchEvent(new Event('mmhvault-language-change'))},[light,lang]);
   const avatar=page.locator('#accountAvatarV372');
   const layout=await avatar.evaluate(e=>{const a=e.getBoundingClientRect(),n=document.getElementById('accountDisplayNameV372').getBoundingClientRect(),card=e.closest('.account-center-card-v375').getBoundingClientRect();return {center:Math.abs(a.x+a.width/2-card.x-card.width/2),nameCenter:Math.abs(n.x+n.width/2-card.x-card.width/2),stack:a.bottom<=n.top+1,size:a.width,height:a.height}});
   assert.ok(layout.center<=2&&layout.nameCenter<=2&&layout.stack&&layout.size>=72&&Math.abs(layout.size-layout.height)<=1,JSON.stringify({engine,width,lang,layout}));
   assert.equal(await page.locator('.st-profile-link').isVisible(),false);
   await avatar.click();assert.deepEqual(await page.evaluate(()=>window.fixtureProfile.at(-1)),['profile','accountAvatarV372']);
   await avatar.focus();await page.keyboard.press('Enter');assert.deepEqual(await page.evaluate(()=>window.fixtureProfile.at(-1)),['profile','accountAvatarV372']);
   await page.evaluate(()=>{document.getElementById('stSettingsHomeV3').hidden=true;document.getElementById('settings').classList.add('st-in-subpage');document.getElementById('stPage_general').hidden=false;document.getElementById('stPref_currency').value='USD';document.getElementById('stPref_fontV265').value='system';window.mmhRefreshSettingsCombosV272()});
   const buttons=page.locator('#stPage_general .st-combo-trigger-v272'),currency=buttons.nth(0),font=buttons.nth(1),dialog=page.locator('#stComboV272');
   assert.equal(await buttons.count(),2);assert.equal(await page.locator('#stPref_currency').isVisible(),false);assert.equal(await page.locator('#stPref_fontV265').isVisible(),false);
   const dims=await buttons.evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height,overflow:r.right-e.parentElement.getBoundingClientRect().right}}));
   assert.ok(dims.every(d=>d.h>=44&&d.w>0&&d.overflow<=1)&&Math.abs(dims[0].w-dims[1].w)<=1,JSON.stringify(dims));
   await currency.click();assert.equal(await dialog.evaluate(e=>e.open),true);
   const box=await dialog.evaluate(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height,fits:r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1}});
   assert.ok(box.fits&&box.w<=360&&box.h<=480,JSON.stringify(box));
   const search=dialog.locator('#stComboSearchV272');await search.fill('JPY');
   assert.equal(await dialog.locator('button[data-ap-currency]').count(),1);await dialog.locator('button[data-ap-currency="JPY"]').click();
   await dialog.waitFor({state:'hidden'});assert.equal(await page.locator('#stPref_currency').inputValue(),'JPY');
   assert.deepEqual(await page.evaluate(()=>window.fixtureChanges.at(-1)),['stPref_currency','JPY']);
   await page.waitForFunction(()=>document.activeElement?.classList.contains('st-combo-trigger-v272'));
   assert.match(await currency.innerText(),/JPY/);
   await font.click();assert.equal(await search.isVisible(),false);assert.equal(await dialog.locator('button[data-st-choice-v272]').count(),7);
   await dialog.locator('button[data-st-choice-v272="modern"]').click();await dialog.waitFor({state:'hidden'});
   assert.equal(await page.locator('#stPref_fontV265').inputValue(),'modern');assert.deepEqual(await page.evaluate(()=>window.fixtureChanges.at(-1)),['stPref_fontV265','modern']);
   await font.click();await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
   await page.waitForFunction(()=>document.activeElement?.classList.contains('st-combo-trigger-v272'));
   // A choice opened for a previous owner must not write after owner change.
   for(const button of [currency,font]){
    await button.click();
    const blocked=await dialog.evaluate(d=>{const choice=[...d.querySelectorAll('button[data-ap-currency],button[data-st-choice-v272]')].find(b=>b.getAttribute('aria-pressed')!=='true');if(!choice)throw Error('missing alternate option');const count=window.fixtureChanges.length;window.dispatchEvent(new Event('mmhvault:config-owner-changed'));choice.click();return {open:d.open,unchanged:window.fixtureChanges.length===count}});
    assert.deepEqual(blocked,{open:false,unchanged:true});
    await dialog.waitFor({state:'hidden'});await page.waitForFunction(()=>document.activeElement?.classList.contains('st-combo-trigger-v272'));
   }
   await page.evaluate(()=>{document.getElementById('stPref_fontV265').disabled=true});
   assert.equal(await font.isDisabled(),true);
   await page.evaluate(()=>{document.getElementById('stPref_fontV265').disabled=false;document.getElementById('stPage_general').hidden=true;document.getElementById('settings').classList.remove('st-in-subpage');document.getElementById('stSettingsHomeV3').hidden=false});
   comboCases++;
  }
 }
 console.log('PASS: V2.0.72 actual centered identity, avatar routing hook, searchable shared currency menu, font menu and existing change event bridge; '+comboCases+' '+engine+' cases (synthetic profile/preferences)');
 // Actual welcome markup, scoped CSS and existing handlers, isolated from authenticated data.
 const welcome=app.match(/<div aria-hidden="true" class="getting-started-backdrop" id="gettingStarted">[\s\S]*?(?=<main class="wrap">)/)?.[0];
 const welcomeHandlers=app.match(/let gettingStartedStep=0;[\s\S]*?window\.myFinanceGsBack=gsBack;/)?.[0];
 assert.ok(welcome&&welcomeHandlers&&app.includes('id="mmh-personal-welcome-v273"'));
 const safeArea=readFileSync(new URL('../css/mmhvault-dialog-safe-area-p959.css',import.meta.url),'utf8');
 await page.setContent('<!doctype html><html lang="en"><head>'+css+'<style>'+safeArea+'</style>'+app.match(/<style id="mmh-personal-welcome-v273">[\s\S]*?<\/style>/)[0]+'</head><body class="mmh-workspace-active">'+welcome+'</body></html>');
 await page.addScriptTag({content:'const $=id=>document.getElementById(id);let currentSessionUser={id:"fixture-welcome"};'+welcomeHandlers+'window.fixtureWelcomeOpen=()=>openGettingStarted(currentSessionUser);'});
 const welcomeLogo=readFileSync(new URL('../images/mmhvault-v2-auth-mark.webp',import.meta.url));
 assert.equal(await page.locator('#gettingStarted .gs-logo-img').getAttribute('src'),'images/mmhvault-v2-auth-mark.webp');
 await page.locator('#gettingStarted .gs-logo-img').evaluate(async(e,base64)=>{e.src='data:image/webp;base64,'+base64;await e.decode()},welcomeLogo.toString('base64'));
 let welcomeCases=0;
 for(const [width,height] of [[320,480],[390,844],[768,500],[1440,900]])for(const light of [false,true])for(const lang of ['en','zh','my']){
  await page.setViewportSize({width,height});
  await page.evaluate(([light,lang])=>{document.body.classList.toggle('light',light);document.documentElement.lang=lang;localStorage.setItem('mmhvault_language_v3363',lang);localStorage.removeItem('myfinance_getting_started_done_fixture-welcome');window.fixtureWelcomeOpen()},[light,lang]);
  const root=page.locator('#gettingStarted'),card=root.locator('.getting-started-card');
  const words={en:['Welcome to MMHVAULT','Skip','Next','Get Started'],zh:['欢迎使用 MMHVAULT','跳过','下一步','开始使用'],my:['MMHVAULT မှ ကြိုဆိုပါသည်','ကျော်ရန်','ရှေ့သို့','စတင်ရန်']}[lang];
  const skip=root.locator('.gs-actions .right button:not(.primary)');
  assert.equal(await skip.count(),1);assert.equal(await skip.innerText(),words[1]);
  assert.equal(await root.locator('#gsTitle').innerText(),words[0]);
  assert.ok(await root.locator('.gs-logo-img').evaluate(e=>e.complete&&e.naturalWidth>0&&e.naturalHeight>0));
  assert.equal(await root.locator('[data-gs-copy-v273]').count(),18);
  for(let step=0;step<3;step++){
   assert.equal(await root.locator('.gs-step.active').getAttribute('data-gs-step'),String(step));
   assert.equal(await root.locator('.gs-dot.active').count(),step+1);
   assert.equal(await root.locator('#gsNextBtn').innerText(),words[step===2?3:2]);
   const checkLayout=await root.locator('.gs-step.active .gs-check [data-gs-copy-v273]').evaluateAll(es=>es.every(e=>e.clientWidth>40&&e.scrollWidth<=e.clientWidth+1&&getComputedStyle(e).flexGrow==='1'));
   assert.ok(checkLayout,JSON.stringify({width,light,lang,step}));
   const geometry=await card.evaluate(e=>{const r=e.getBoundingClientRect();return {fits:r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1,bg:getComputedStyle(e).backgroundColor}});
   assert.ok(geometry.fits,JSON.stringify({width,height,light,step,geometry}));assert.equal(geometry.bg,light?'rgb(255, 255, 255)':'rgb(17, 17, 18)');
   if(step===1){await root.locator('#gsBackBtn').click();assert.equal(await root.locator('.gs-step.active').getAttribute('data-gs-step'),'0');await root.locator('#gsNextBtn').click();}
   await root.locator('#gsNextBtn').click();
  }
  assert.equal(await root.isVisible(),false);
  await page.evaluate(()=>window.fixtureWelcomeOpen());assert.equal(await root.isVisible(),false);
  await page.evaluate(()=>{localStorage.removeItem('myfinance_getting_started_done_fixture-welcome');window.fixtureWelcomeOpen()});
  await skip.click();assert.equal(await root.isVisible(),false);
  welcomeCases++;
 }
 console.log('PASS: V2.0.73 welcome actual markup/CSS and existing step handlers; '+welcomeCases+' '+engine+' cases (synthetic owner, no production)');

 // Market UI only: actual new markup, style and script; existing FX controls are isolated fixture nodes.
 const marketMarkup=app.match(/<div id="mmhMarketShellV273"[\s\S]*?(?=<div class="ex-template-head">)/)?.[0];
 const marketStyle=app.match(/<style id="mmh-personal-market-v273">[\s\S]*?<\/style>/)?.[0];
 const marketScript=app.match(/<script id="mmh-personal-market-v273-js">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(marketMarkup&&marketStyle&&marketScript);
 assert.doesNotMatch(marketScript,/\b(?:fetch|XMLHttpRequest|setInterval|supabase)\b/);
 await page.setContent('<!doctype html><html lang="en"><head>'+css+marketStyle+'</head><body class="mmh-workspace-active"><section id="exchange" class="page active">'+marketMarkup+'<div class="ex-template-head">Legacy</div><div id="exCurrencyCardsV7">Existing rates</div><div id="mmhExchangeV2StagingRoot" hidden>Existing V2</div><div class="panel exchange-converter-panel">Converter</div><div class="panel ex-rate-editor">Editor</div><section id="exAsiaSummaryV130">Asia</section><section id="exAsiaV10" hidden>Asia detail</section></section></body></html>');
 // Mount the actual module's style after the shell, matching runtime injection order.
 const fxModule=readFileSync(new URL('../exchange-v2/exchange-v2-ui-v1.mjs',import.meta.url),'utf8');
 const fxCss=fxModule.match(/const CSS=`([\s\S]*?)`;/)?.[1];assert.ok(fxCss);
 await page.addStyleTag({content:fxCss});
 await page.addScriptTag({content:marketScript});
 let marketCases=0;
 for(const width of [320,390,768,1440])for(const light of [false,true])for(const lang of ['en','zh','my']){
  await page.setViewportSize({width,height:800});
  await page.evaluate(([light,lang])=>{document.body.classList.toggle('light',light);document.documentElement.lang=lang;localStorage.setItem('mmhvault_language_v3363',lang);dispatchEvent(new Event('mmhvault-language-change'))},[light,lang]);
  const root=page.locator('#exchange'),shell=root.locator('#mmhMarketShellV273'),nav=shell.locator('nav');
  const expected={en:'Market',zh:'市场',my:'ဈေးကွက်'}[lang];
  assert.equal(await shell.locator('h1').innerText(),expected);
  for(const view of ['overview','exchange','gold','crypto','oil']){
   await nav.locator('[data-mv-view="'+view+'"]').click();
   assert.equal(await root.getAttribute('data-mv273'),view);
   assert.equal(await nav.locator('[aria-pressed=true]').count(),1);
   assert.equal(await root.locator('.exchange-converter-panel').isVisible(),view==='exchange');
   assert.equal(await root.locator('.ex-rate-editor').isVisible(),view==='exchange');
   const fx=root.locator('#mmhExchangeV2StagingRoot');
   assert.equal(await fx.getAttribute('hidden'),'');
   // Existing production loader can explicitly force its mounted root visible.
   await fx.evaluate(e=>{e.hidden=false;e.dataset.exchangeV2Mounted='yes';e.dataset.unifiedAccounting='yes';e.classList.add('fxv2')});
   assert.equal(await fx.isVisible(),view==='exchange');
   await fx.evaluate(e=>{e.hidden=true;delete e.dataset.exchangeV2Mounted;delete e.dataset.unifiedAccounting;e.classList.remove('fxv2')});
   for(const name of ['overview','gold','crypto','oil'])assert.equal(await shell.locator('[data-mv-panel="'+name+'"]').isVisible(),view===name);
   const dims=await shell.evaluate(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth,overflow:[...e.querySelectorAll('.mv273-card')].filter(n=>n.getClientRects().length).some(n=>n.scrollWidth>n.clientWidth+1)}});
   assert.ok(dims.left>=-1&&dims.right<=dims.width+1&&!dims.overflow,JSON.stringify({width,light,lang,view,dims}));
  }
  await nav.locator('[data-mv-view="overview"]').click();
  await shell.locator('[data-mv-panel="overview"] button[data-mv-view="gold"]').click();
  assert.equal(await root.getAttribute('data-mv273'),'gold');
  assert.equal(await shell.locator('[data-mv-panel="gold"] .mv273-quote b').allTextContents().then(xs=>xs.every(x=>x==='—')),true);
  // Actual native detail dialogs; rotate coverage across all nine reference instruments.
  const detail=shell.locator('#mmhMarketDetailV273');
  const detailCopy={en:['Price history','Historical data is not available in this view.','Close'],zh:['历史价格','此界面暂未接入历史行情。','关闭'],my:['ဈေးနှုန်းမှတ်တမ်း','ဤမြင်ကွင်းတွင် သမိုင်းဝင်ဈေးနှုန်းဒေတာ မရရှိသေးပါ။','ပိတ်ရန်']}[lang];
  for(const [view,keys] of [['gold',['xau','localgold']],['crypto',['btc','eth','sol']],['oil',['ron92','ron95','diesel','edible']]]){
   await nav.locator('[data-mv-view="'+view+'"]').click();
   const key=keys[marketCases%keys.length],trigger=shell.locator('[data-mv-detail="'+key+'"]');
   await trigger.click();await detail.waitFor({state:'visible'});
   assert.equal(await detail.evaluate(e=>e.open),true);
   assert.equal(await detail.locator('[data-mv-copy="history"]').innerText(),detailCopy[0]);
   assert.equal(await detail.locator('[data-mv-copy="nohistory"]').innerText(),detailCopy[1]);
   assert.equal(await detail.locator('.mv273-detail-current strong').innerText(),'—');
   assert.equal(await detail.locator('.mv273-detail-head button').getAttribute('aria-label'),detailCopy[2]);
   assert.ok((await detail.locator('h2').innerText()).length>0);
   assert.equal(await detail.locator('canvas,svg').count(),0);
   const bounds=await detail.evaluate(e=>{const r=e.getBoundingClientRect();return {fits:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1,overflow:e.scrollWidth>e.clientWidth+1}});
   assert.ok(bounds.fits&&!bounds.overflow,JSON.stringify({width,lang,view,bounds}));
   if(view==='gold')await page.keyboard.press('Escape');
   else if(view==='crypto')await detail.locator('.mv273-detail-foot button').click();
   else await page.evaluate(()=>window.dispatchEvent(new Event('mmhvault:config-owner-changed')));
   await detail.waitFor({state:'hidden'});
   await page.waitForFunction(key=>document.activeElement?.dataset.mvDetail===key,key);
  }
  marketCases++;
 }
 console.log('PASS: V2.0.73 Market layout, five views, three languages, preserved FX fixture, native reference details and no synthetic prices; '+marketCases+' '+engine+' cases (isolated DOM)');

 // V2.0.74: mount the actual production Market presentation module alongside the older template.
 const mountedMarket=readFileSync(new URL('../js/mmhvault-market-workspace-v2.js',import.meta.url),'utf8');
 await page.setContent('<!doctype html><html lang="en"><head>'+css+marketStyle+'</head><body class="mmh-workspace-active"><section id="exchange" class="page active">'+marketMarkup+'<div class="ex-template-head">Legacy hero</div><div id="exCurrencyCardsV7" class="ex-currency-cards">Existing rates</div><div id="mmhExchangeV2StagingRoot" hidden>Existing V2</div><div class="panel exchange-converter-panel">Converter</div><div class="panel ex-rate-editor">Editor</div><section id="exAsiaSummaryV130">Asia</section><section id="exAsiaV10" hidden>Asia detail</section></section></body></html>');
 await page.addScriptTag({content:marketScript});
 await page.evaluate(()=>{if(typeof currentSessionUser==='undefined')window.currentSessionUser={id:'fixture-market-a'};else currentSessionUser={id:'fixture-market-a'};localStorage.setItem('mmhvault_settings_display_v2_fixture-market-a',JSON.stringify({currency:'MMK'}));localStorage.removeItem('mmhvault_market_base_v276_fixture-market-a')});
 await page.addScriptTag({content:mountedMarket});
 await page.addStyleTag({content:fxCss});
 await page.locator('#exchange[data-market-v2-mounted=yes]').waitFor();
 let mountedCases=0;
 for(const width of [320,390,430,768,1024,1440])for(const light of [false,true])for(const lang of ['en','zh','my']){
  await page.setViewportSize({width,height:800});
  await page.evaluate(([light,lang])=>{document.body.classList.toggle('light',light);document.documentElement.lang=lang;localStorage.setItem('mmhvault_language_v3363',lang);dispatchEvent(new Event('mmhvault-language-change'))},[light,lang]);
  const root=page.locator('#exchange'),nav=root.locator('.mv2-nav'),panel=root.locator('.mv2-surface');
  assert.equal(await nav.locator('button').count(),5);
  assert.equal(await root.locator('.ex-template-head').isVisible(),false);
  assert.equal(await root.locator('#mmhMarketShellV273').isVisible(),false);
  for(const [kind,count] of [['all',4],['currency',4],['gold',4],['crypto',4],['oil',6]]){
   await nav.locator('[data-mv2-section="'+kind+'"]').click();
   assert.equal(await nav.locator('[aria-selected=true]').count(),1);
   assert.equal(await root.getAttribute('data-market-view'),'market');
   assert.equal(await root.locator('.exchange-converter-panel').isVisible(),false);
   if(kind==='currency'){
    const board=panel.locator('.mv275-board'),ticker=panel.locator('.mv275-ticker'),dialog=panel.locator('.mv275-history-dialog');
    assert.ok(await board.isVisible());assert.ok(await ticker.isVisible());
    assert.equal(await panel.locator('.mv274-category-cards').isVisible(),false);
    assert.equal(await panel.locator('.mv274-category-extra').isVisible(),false);
    assert.equal(await panel.locator('.mv2-back').isVisible(),false);
    assert.deepEqual(await board.locator('tbody tr').evaluateAll(rs=>rs.slice(0,21).map(r=>r.dataset.fxCode)),['USD','THB','CNY','EUR','SGD','MYR','JPY','GBP','KRW','AED','TWD','AUD','NZD','CAD','HKD','INR','MOP','PHP','KHR','VND','LAK']);
    assert.ok((await board.locator('tbody td').allTextContents()).every(x=>x==='—'));
    const fits=await board.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1});assert.ok(fits,JSON.stringify({width,light,lang}));
    assert.equal(await ticker.locator('button').count(),0);assert.equal(await ticker.locator('.mv275-ticker-head').count(),0);assert.equal(await panel.locator('.mv277-toolbar .mv274-convert').count(),1);
    assert.equal(await ticker.locator('.mv275-track').evaluate(e=>getComputedStyle(e).animationPlayState),'running');
    const base=panel.locator('.mv277-base-trigger'),picker=panel.locator('.mv277-picker');assert.equal(await board.getAttribute('data-fx-choice'),'GLOBAL');assert.equal(await board.getAttribute('data-fx-base'),'MMK');
    assert.equal(await panel.locator('.mv2-detail .mv2-search').isVisible(),false);await base.click();await picker.waitFor({state:'visible'});assert.equal(await picker.evaluate(e=>e.tagName),'DIV');assert.equal(await picker.locator('[data-ap-currency=KPW]').count(),1);await picker.locator('input').fill('THB');assert.equal(await picker.locator('[data-ap-currency=THB]').count(),1);await picker.locator('[data-ap-currency=THB]').click();await picker.waitFor({state:'hidden'});assert.equal(await board.getAttribute('data-fx-base'),'THB');assert.equal(await board.locator('tr[data-fx-code=THB]').count(),0);assert.equal(await board.locator('tr[data-fx-code=MMK]').count(),1);
    await page.evaluate(()=>{localStorage.setItem('mmhvault_settings_display_v2_fixture-market-a',JSON.stringify({currency:'JPY'}));dispatchEvent(new Event('mmhvault:data-loaded'))});assert.equal(await board.getAttribute('data-fx-base'),'THB');assert.equal(await board.getAttribute('data-fx-choice'),'THB');
    await page.evaluate(()=>{currentSessionUser={id:'fixture-market-b'};localStorage.setItem('mmhvault_settings_display_v2_fixture-market-b',JSON.stringify({currency:'SGD'}));dispatchEvent(new Event('mmhvault:config-owner-changed'))});assert.equal(await board.getAttribute('data-fx-base'),'SGD');assert.equal(await board.getAttribute('data-fx-choice'),'GLOBAL');
    await page.evaluate(()=>{currentSessionUser={id:'fixture-market-a'};dispatchEvent(new Event('mmhvault:config-owner-changed'))});assert.equal(await board.getAttribute('data-fx-choice'),'THB');
    await base.click();await picker.waitFor({state:'visible'});await picker.locator('[data-ap-currency=GLOBAL]').click();await picker.waitFor({state:'hidden'});assert.equal(await board.getAttribute('data-fx-base'),'JPY');
    await page.evaluate(()=>{localStorage.setItem('mmhvault_settings_display_v2_fixture-market-a',JSON.stringify({currency:'MMK'}));dispatchEvent(new Event('mmhvault:data-loaded'))});assert.equal(await board.getAttribute('data-fx-base'),'MMK');
    const trend=board.locator('[data-fx-trend=USD]');assert.equal(await trend.locator('svg').count(),1);await trend.click();assert.ok(await dialog.isVisible());
    assert.equal(await dialog.locator('svg,canvas').count(),0);
    assert.equal(await dialog.locator('tbody tr').count(),1);
    const d=await dialog.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.height<=innerHeight});assert.ok(d);
    await dialog.locator('header button').click();assert.equal(await dialog.isVisible(),false);
    await page.waitForFunction(()=>document.activeElement?.dataset.fxTrend==='USD');
    await board.locator('[data-fx-trend=THB]').click();await dialog.waitFor({state:'visible'});await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
    await page.waitForFunction(()=>document.activeElement?.dataset.fxTrend==='THB');
    await board.locator('[data-fx-trend=CNY]').click();await dialog.waitFor({state:'visible'});await page.evaluate(()=>dispatchEvent(new Event('mmhvault:config-owner-changed')));await dialog.waitFor({state:'hidden'});
    const search=panel.locator('.mv2-detail .mv2-search');await panel.locator('.mv277-toolbar .mv277-icon').click();await search.waitFor({state:'visible'});assert.equal(await search.evaluate(e=>getComputedStyle(e).position),'fixed');await search.fill('THB');assert.deepEqual(await board.locator('tbody tr').evaluateAll(rs=>rs.map(r=>r.dataset.fxCode)),['THB']);await search.press('Escape');assert.equal(await search.isVisible(),false);await base.click();await picker.waitFor({state:'visible'});await page.keyboard.press('Escape');await picker.waitFor({state:'hidden'});
    continue;
   }
   const cards=kind==='all'?panel.locator(':scope > .mv2-grid'):panel.locator('.mv274-category-cards');
   assert.equal(await cards.locator('.mv2-card').count(),count);
   const dims=await cards.evaluate(e=>{const r=e.getBoundingClientRect();return {fits:r.left>=-1&&r.right<=innerWidth+1,columns:getComputedStyle(e).gridTemplateColumns.split(' ').length}});
   assert.ok(dims.fits,JSON.stringify({width,light,lang,kind,dims}));
   assert.equal(dims.columns,width<=850?2:4);
   if(kind==='all')assert.equal(await panel.locator('.mv274-snapshot-row').count(),5);
   if(kind==='oil'){assert.equal(await panel.locator('.mv274-energy-group').count(),2);assert.deepEqual(await cards.locator('.mv2-value').allTextContents(),Array(6).fill('—'))}
  }
  await nav.locator('[data-mv2-section="currency"]').click();
  await root.locator('.mv274-convert').click();
  assert.equal(await root.getAttribute('data-market-view'),'convert');
  assert.equal(await panel.isVisible(),false);
  assert.equal(await root.locator('.exchange-converter-panel').isVisible(),true);
  await root.locator('.mv274-convert').click();
  assert.equal(await panel.isVisible(),true);
  await nav.locator('[data-mv2-section="gold"]').click();
  await panel.locator('.mv274-category-cards button').first().click();
  assert.equal(await root.getAttribute('data-market-detail'),'instrument');
  assert.equal(await panel.locator('.mv2-history svg').count(),0);
  assert.ok(await panel.locator('.mv2-history').isVisible());
  mountedCases++;
 }
 // Mount the real converter UI with a synthetic session, never production data.
 const converterModule=readFileSync(new URL('../exchange-v2/exchange-v2-ui-v1.mjs',import.meta.url),'utf8').replace(/^import .*$/gm,'').replaceAll('export function ','function ');
 const mockConverter=`const ASIA_CURRENCIES_V1=[{code:'USD',en:'US Dollar',zh:'美元',flag:'🇺🇸'},{code:'MMK',en:'Myanmar Kyat',zh:'缅元',flag:'🇲🇲'},{code:'THB',en:'Thai Baht',zh:'泰铢',flag:'🇹🇭'},{code:'JPY',en:'Japanese Yen',zh:'日元',flag:'🇯🇵'}];const canonicalPairV1=x=>x;const createExchangeV2SessionV1=()=>({state:()=>({status:'ready',user_id:'fixture-converter',pairs:[]}),quote:()=>({available:false,reason:'missing'}),refresh:async()=>{},clear:()=>{}});`;
 await page.addScriptTag({content:mockConverter+converterModule+";window.mountFixtureConverter=mountExchangeV2V1;"});
 await page.evaluate(()=>{const root=document.getElementById('mmhExchangeV2StagingRoot');root.replaceChildren();delete root.dataset.exchangeV2Mounted;window.fixtureConverter=window.mountFixtureConverter({root,db:{},integrated:true});root.hidden=false});
 for(const width of [320,390,768,1440])for(const light of [false,true])for(const lang of ['en','zh','my']){
  await page.setViewportSize({width,height:800});
  await page.evaluate(([light,lang])=>{document.body.classList.toggle('light',light);document.documentElement.lang=lang;localStorage.setItem('mmhvault_language_v3363',lang);dispatchEvent(new Event('mmhvault-language-change'))},[light,lang]);
  const root=page.locator('#exchange'),fx=root.locator('#mmhExchangeV2StagingRoot');
  await root.locator('[data-mv2-section=currency]').click();if(await root.getAttribute('data-market-view')!=='convert')await root.locator('.mv274-convert').click();
  const from=fx.locator('[data-v2-pick=from]'),menu=fx.locator('.fxv2-inline-picker');await from.click();await menu.waitFor({state:'visible'});assert.equal(await menu.evaluate(e=>e.tagName),'DIV');
  await menu.locator('input').fill('THB');await menu.locator('[data-ap-currency=THB]').click();await menu.waitFor({state:'hidden'});assert.match(await from.textContent(),/THB/);
  await fx.locator('[data-v2-action=add]').click();const editor=fx.locator('dialog');await editor.waitFor({state:'visible'});await editor.locator('[data-v2-pick=quote]').click();await menu.waitFor({state:'visible'});assert.equal(await editor.locator('.fxv2-inline-picker').count(),1);await menu.locator('input').fill('JPY');await menu.locator('[data-ap-currency=JPY]').click();assert.match(await editor.locator('[data-v2-pick=quote]').textContent(),/JPY/);await editor.locator('[data-v2-action=cancel]').last().click();await editor.waitFor({state:'hidden'});
  await root.locator('.mv274-convert').click();
 }
 console.log('PASS: V2.0.78 real converter UI with synthetic session, 24 '+engine+' cases, no write or production calls');
 console.log('PASS: V2.0.78 mounted Market, compact ticker, inline toolbar, nonmodal shared-style currency dropdown, owner-scoped overrides and reset, collapsible search, history dialog, responsive sections and converter; '+mountedCases+' '+engine+' isolated cases');
}finally{await browser.close()}
