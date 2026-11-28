// Actual installation-guide script and scoped CSS in isolated Chromium or WebKit.
// Synthetic host only: no authenticated app, native installation, or production requests.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const engine=process.env.MMH_SETTINGS_BROWSER||'chromium';
assert(['chromium','webkit'].includes(engine),'supported Settings fixture engine');
const browserType=engine==='webkit'?webkit:chromium;

const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const script=app.match(/<script id="mmhvault-settings-control-feedback-v4">([\s\S]*?)<\/script>/)?.[1];
assert(script,'actual installation script required');
const ids=new Set(['mmhvault-personal-install-illustrations-v265','mmhvault-install-guide-v5-css','mmhvault-install-guide-layout-v6']);
const styles=[...app.matchAll(/<style id="([^"]+)">([\s\S]*?)<\/style>/g)].filter(m=>ids.has(m[1]));
assert.equal(styles.length,ids.size,'all actual guide CSS blocks required');
const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui;margin:8px}button,select{font:inherit}*,*::before,*::after{box-sizing:border-box}</style>'+styles.map(m=>'<style>'+m[2]+'</style>').join('')+'</head><body><main id="settings"><section id="stPage_icon"><header class="st-page-head">Settings</header><div class="panel">MMHVAULT</div></section></main></body></html>';
const browser=await browserType.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:360,height:800}});
 const origin='https://mmh-settings-install-fixture.invalid';
 const unexpected=[],errors=[];
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.href===origin+'/')return route.fulfill({status:200,contentType:'text/html',body:html});if(url.origin===origin&&/^\/images\/mmhvault-install-(ios|ipad|android-chrome|desktop)-v271\.webp$/.test(url.pathname))return route.fulfill({status:200,contentType:'image/webp',body:readFileSync(new URL('..'+url.pathname,import.meta.url))});unexpected.push(url.href);return route.abort()});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/');
 await page.addScriptTag({content:script});
 const guide=page.locator('#stInstallGuideV5'),button=page.locator('#stInstallAppV4');
 const picker=page.locator('#stInstallDeviceV5');
 const close=page.locator('#stInstallCloseV265'),host=page.locator('#stPage_icon');
 assert.equal(await guide.isVisible(),false);
 const hostBefore=await host.boundingBox();
 await button.click();
 assert.equal(await guide.isVisible(),true);
 assert.equal(await guide.evaluate(el=>el.matches(':modal')),true);
 assert.equal(await button.getAttribute('aria-expanded'),'true');
 assert.equal(await close.evaluate(el=>el===document.activeElement),true);
 assert.deepEqual(await host.boundingBox(),hostBefore,'opening modal must not reflow Settings');
 await page.keyboard.press('Escape');
 await guide.waitFor({state:'hidden'});
 await page.waitForFunction(()=>document.getElementById('stInstallAppV4').getAttribute('aria-expanded')==='false');
 assert.equal(await button.evaluate(el=>el===document.activeElement),true);
 await button.click();await close.click();await guide.waitFor({state:'hidden'});
 await button.click();await page.mouse.click(2,2);await guide.waitFor({state:'hidden'});
 await button.click();
 const cases=[['ios',4,'ios'],['ios-other',5,'ios'],['ipad',4,'ipad'],['ipad-other',5,'ipad'],['android-chrome',4,'android-chrome'],['android-firefox',4,null],['android-other',5,'android-chrome'],['desktop',3,null],['desktop-chrome',3,'desktop'],['desktop-edge',3,'desktop'],['desktop-safari',3,null]];
 const locale=async lang=>page.evaluate(lang=>{localStorage.setItem('mmhvault_language_v3363',lang);document.documentElement.lang=lang;dispatchEvent(new Event('mmhvault-language-change'))},lang);
 let count=0;
 for(const width of [360,1280]){
  await page.setViewportSize({width,height:800});
  for(const light of [false,true]){
   await page.evaluate(light=>document.body.classList.toggle('light',light),light);
   for(const [lang,label,pattern] of [['en','Add to Home Screen',/[A-Za-z]/],['zh','添加到主屏幕',/[\u4e00-\u9fff]/],['my','ပင်မမျက်နှာပြင်သို့ ထည့်ပါ',/[\u1000-\u109f]/]]){
    await locale(lang);
    assert.equal(await button.textContent(),label);
    for(const [device,n,art] of cases){
     await picker.focus();
     await picker.selectOption(device);
     assert.equal(await picker.inputValue(),device);
     assert.equal(await page.evaluate(()=>document.activeElement.id),'stInstallDeviceV5','focus retained on redraw');
     assert.equal(await guide.locator('li').count(),n);
     assert.equal(await guide.locator('li svg').count(),art?0:n);
     const picture=guide.locator('.st-install-art-image-v271');
     assert.equal(await picture.count(),art?1:0);
     if(art){assert.equal(await picture.getAttribute('src'),'./images/mmhvault-install-'+art+'-v271.webp');assert.deepEqual(await picture.evaluate(async im=>{await im.decode();return [im.naturalWidth,im.naturalHeight]}),[1672,941]);}
     assert.equal(await guide.locator('.st-install-art-zoom-v271').count(),art?1:0);
     assert.match(await guide.locator('h3').textContent(),pattern);
     for(const copy of await guide.locator('.st-install-step-copy-v265>span:last-child').allTextContents())assert.match(copy,pattern);
     const geometry=await guide.evaluate(el=>{
      const r=el.getBoundingClientRect();
      return {width:r.width,inside:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1,overflow:el.scrollWidth-el.clientWidth,background:getComputedStyle(el).backgroundColor,illustrations:[...el.querySelectorAll('svg')].every(svg=>{const b=svg.getBoundingClientRect();return b.width>0&&b.height>0&&b.left>=r.left-1&&b.right<=r.right+1})};
     });
     assert(geometry.width>0&&geometry.inside&&geometry.overflow<=1&&geometry.illustrations,JSON.stringify({width,light,lang,device,geometry}));
     assert.equal(geometry.background,light?'rgb(237, 244, 249)':'rgb(16, 30, 44)');
     count++;
    }
   }
  }
 }
 // Zoom inside the guide without overflowing the dialog; failed artwork leaves localized instructions.
 await page.setViewportSize({width:360,height:800});await picker.selectOption('ipad');
 const zoom=guide.locator('.st-install-art-zoom-v271'),view=guide.locator('#stInstallArtViewV271');
 await zoom.click();assert.equal(await zoom.getAttribute('aria-expanded'),'true');
 assert.ok(await view.evaluate(el=>el.scrollWidth>el.clientWidth));
 await view.evaluate(el=>el.scrollLeft=200);assert.ok(await view.evaluate(el=>el.scrollLeft>0));
 await zoom.click();assert.equal(await zoom.getAttribute('aria-expanded'),'false');
 assert.ok(await view.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
 await guide.locator('.st-install-art-image-v271').evaluate(el=>el.dispatchEvent(new Event('error')));
 assert.equal(await guide.locator('.st-install-art-v271').isVisible(),false);
 assert.equal(await guide.locator('li').count(),4);
 // Real wheel scrolling in compact portrait and landscape, with the close control pinned.
 let scrollCases=0;
 for(const viewport of [{width:320,height:480},{width:667,height:320}]){
  await page.setViewportSize(viewport);
  for(const light of [false,true]){
   await page.evaluate(light=>document.body.classList.toggle('light',light),light);
   for(const lang of ['en','zh','my']){
    await locale(lang);await picker.selectOption('ios-other');
    await guide.evaluate(el=>{el.scrollTop=0});
    const bounds=await guide.boundingBox();
    const metrics=await guide.evaluate(el=>({height:el.clientHeight,full:el.scrollHeight,touch:getComputedStyle(el).touchAction}));
    assert(metrics.full>metrics.height,'short viewport must expose a scrollable guide');
    assert(metrics.touch.includes('pan-y'),'vertical touch pan must be permitted');
    await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height-18);
    await page.mouse.wheel(0,2400);
    await page.waitForFunction(()=>{const el=document.querySelector('#stInstallGuideV5');return el.scrollTop>0&&el.scrollTop+el.clientHeight>=el.scrollHeight-2});
    const end=await guide.evaluate(el=>{const r=el.getBoundingClientRect(),n=el.querySelector('.st-install-note').getBoundingClientRect(),c=el.querySelector('#stInstallCloseV265').getBoundingClientRect();return {bottom:n.bottom<=r.bottom+1,close:c.top>=r.top-1&&c.bottom<=r.bottom+1}});
    assert(end.bottom&&end.close,JSON.stringify({viewport,light,lang,end}));
    await page.mouse.wheel(0,-2400);
    await page.waitForFunction(()=>document.querySelector('#stInstallGuideV5').scrollTop<=1);
    scrollCases++;
   }
  }
 }
 console.log('PASS: real wheel scrolling, final note and pinned close button in '+engine+', '+scrollCases+' compact portrait/landscape cases');
 await page.setViewportSize({width:1280,height:800});
 await picker.selectOption('ios-other');
 await locale('zh');assert.equal(await picker.inputValue(),'ios-other');
 await locale('my');assert.equal(await picker.inputValue(),'ios-other');
 // Simulated browser prompt events: exercise actual DOM handler, not OS installation.
 await close.click();await guide.waitFor({state:'hidden'});
 await page.evaluate(()=>{const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=async()=>{window.promptCount=(window.promptCount||0)+1;window.wasModal=document.querySelector('#stInstallGuideV5').open};e.userChoice=Promise.resolve({outcome:'dismissed'});dispatchEvent(e)});
 await button.click();await guide.waitFor({state:'visible'});
 assert.deepEqual(await page.evaluate(()=>[window.promptCount,window.wasModal]),[1,false],'native prompt takes priority');
 await locale('en');
 assert.equal(await page.locator('#stInstallStatusV4').textContent(),'Installation cancelled. You can still follow the manual guide.');
 await close.click();await guide.waitFor({state:'hidden'});
 await page.evaluate(()=>{const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=async()=>{window.promptCount++};e.userChoice=Promise.resolve({outcome:'accepted'});dispatchEvent(e)});
 await button.click();await page.waitForFunction(()=>document.getElementById('stInstallStatusV4').textContent==='Installation accepted.');
 assert.equal(await guide.isVisible(),false);
 await button.click();await guide.waitFor({state:'visible'});
 await page.evaluate(()=>dispatchEvent(new Event('mmhvault:config-owner-changed')));
 await guide.waitFor({state:'hidden'});
 await page.evaluate(()=>dispatchEvent(new Event('appinstalled')));
 assert.equal(await page.locator('#stInstallStatusV4').textContent(),'MMHVAULT has been installed.');
 await locale('zh');assert.match(await page.locator('#stInstallStatusV4').textContent(),/已安装/);
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
 console.log('PASS: actual Settings guide script/CSS in isolated '+engine+', '+count+' locale/device/viewport/theme cases; focus, prompt feedback and no network');
 await context.close();
}finally{await browser.close()}


// Separate actual birthday runtime fixture: account isolation, calendar and modal layout.
{
 const birthday=app.match(/<div class="panel mmh-birthday-settings-v34216" id="mmhBirthdaySettingsV34215">[\s\S]*?(?=\n<\/div>\n\n<div class="mmh-manager-overlay-v1")/)?.[0];
 const code=app.match(/<script id="mmhvault-v34216-age-js">([\s\S]*?)<\/script>/)?.[1];
 const css=app.match(/<style id="mmhvault-v34216-birthday-settings-css">([\s\S]*?)<\/style>/)?.[1];
 const profileCss=app.match(/<style id="mmhvault-personal-profile-v271">([\s\S]*?)<\/style>/)?.[1];
 const v2=readFileSync(new URL('../css/mmhvault-settings-life-p928.css',import.meta.url),'utf8');
 assert(birthday&&code&&css&&profileCss,'actual birthday markup/runtime/CSS required');
 const instance=await browserType.launch({headless:true});
 try{
  const context=await instance.newContext({viewport:{width:360,height:800},timezoneId:'UTC'});
  const origin='https://mmh-settings-birthday-fixture.invalid',unexpected=[],errors=[];
  const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui;margin:8px}*,*::before,*::after{box-sizing:border-box}</style><style>'+css+'</style><style>'+v2+'</style><style>'+profileCss+'</style></head><body class="mmh-workspace-active"><main id="settings" class="page active"><section class="st-page" id="stPage_profile"><div id="mmhProfileCardV271"><form id="mmhProfileFormV1">'+birthday+'</form></div></section></main></body></html>';
  await context.route('**/*',route=>route.request().url()===origin+'/'?route.fulfill({status:200,contentType:'text/html',body:html}):route.request().url()===origin+'/images/mmhvault-v2-auth-mark.webp'?route.fulfill({status:200,contentType:'image/webp',body:readFileSync(new URL('../images/mmhvault-v2-auth-mark.webp',import.meta.url))}):(unexpected.push(route.request().url()),route.abort()));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-28T12:00:00Z'));
  await page.goto(origin+'/');
  await page.addScriptTag({content:"var currentSessionUser={id:'fixture-a'};\n"+code});
  const panel=page.locator('#mmhBirthdaySettingsV34215'),input=page.locator('#mmhBirthOpenV271'),picker=page.locator('#mmhBirthPickerV271');
  const age=page.locator('#mmhSettingsAgeValueV34215'),next=page.locator('#mmhSettingsBirthdayValueV34215'),countdown=page.locator('#mmhSettingsBirthdayCountdownV34215');
  const blank=async()=>{for(const value of [age,next,countdown])assert.equal(await value.textContent(),'0')};
  const owner=async id=>page.evaluate(id=>{currentSessionUser=id?{id}:null;dispatchEvent(new Event('mmhvault:config-owner-changed'))},id);
  const locale=async lang=>page.evaluate(lang=>{document.documentElement.lang=lang;dispatchEvent(new Event('mmhvault-language-change'))},lang);
  const stored=async id=>page.evaluate(id=>localStorage.getItem('mmhvault_birth_date_v34216_'+id),id);
  // Native dialog top-layer visibility may settle asynchronously in WebKit.
  // Keep one real click per opening; never retry the click or force the dialog open.
  const open=async()=>{
   await picker.waitFor({state:'hidden',timeout:5000});
   await input.click();
   try{await picker.waitFor({state:'visible',timeout:5000});}
   catch(error){
    const diagnostic=await picker.evaluate(el=>({open:el.open,display:getComputedStyle(el).display,visibility:getComputedStyle(el).visibility,active:document.activeElement?.id,triggerDisabled:document.getElementById('mmhBirthOpenV271').disabled,lang:document.documentElement.lang,width:innerWidth}));
    throw new Error('Birthday picker did not become visible after one click: '+JSON.stringify(diagnostic),{cause:error});
   }
   assert.equal(await picker.evaluate(el=>el.open),true);
  };
  const choose=async(y,m,d)=>{await page.locator('#mmhBirthYearV271').selectOption(String(y));await page.locator('#mmhBirthMonthV271').selectOption(String(m-1));await page.locator('#mmhBirthDaysV271 button').filter({hasText:new RegExp('^'+d+'$')}).click();};
  const confirm=()=>page.locator('#mmhBirthConfirmV271').click();
  await blank();await open();await choose(2000,11,29);await confirm();
  assert.equal(await stored('fixture-a'),'2000-11-29');
  assert.match(await age.textContent(),/^25 years/);
  assert.equal(await countdown.textContent(),'1 days');
  let cases=0;
  for(const width of [360,1280]){
   await page.setViewportSize({width,height:800});
   for(const light of [false,true]){
    await page.evaluate(light=>document.body.classList.toggle('light',light),light);
    for(const [lang,heading,unit] of [['en','Birthday','years'],['zh-CN','生日','岁'],['my','မွေးနေ့','နှစ်']]){
     await locale(lang);
     assert.equal(await panel.locator('.mmh-birthday-field-v34216 span').textContent(),heading);
     assert((await age.textContent()).includes(unit));
     assert.equal(await stored('fixture-a'),'2000-11-29');
     assert(!(await page.locator('#mmhBirthDetailsV271').isVisible()));
     await open();
     const geometry=await picker.evaluate(el=>{
      const r=el.getBoundingClientRect();return {inside:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1,overflow:el.scrollWidth-el.clientWidth};
     });
     assert(geometry.inside&&geometry.overflow<=2,JSON.stringify({width,light,lang,geometry}));
     await page.locator('#mmhBirthCancelV271').click();cases++;
    }
   }
  }
  await open();await choose(2002,1,1);await owner('fixture-b');await blank();
  assert(!(await picker.isVisible()));assert.equal(await stored('fixture-b'),null);assert.equal(await stored('fixture-a'),'2000-11-29');
  await open();await choose(2004,2,29);await page.locator('#mmhBirthTimeV271').fill('09:15');await confirm();
  assert.equal(await stored('fixture-b'),'2004-02-29T09:15');
  await open();await page.locator('#mmhBirthClearV271').click();await confirm();assert.equal(await stored('fixture-b'),'');await blank();
  await owner('guest');assert.equal(await input.isDisabled(),true);await blank();
  await owner('fixture-a');assert.equal(await input.isDisabled(),false);
  await open();await page.locator('#mmhBirthYearV271').selectOption('2026');await page.locator('#mmhBirthMonthV271').selectOption('11');
  assert(await page.locator('#mmhBirthDaysV271 button').filter({hasText:/^31$/}).isDisabled());
  await page.locator('#mmhBirthCancelV271').click();assert.equal(await stored('fixture-a'),'2000-11-29');
  await owner(null);await blank();assert.equal(await input.isDisabled(),true);
  assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
  console.log('PASS: actual birthday dialogs in isolated '+engine+', '+cases+' locale/viewport/theme cases; clear, optional time, stale edit and owner isolation');
  await context.close();
 }finally{await instance.close()}
}

// Verify committed Personal-only icons, manifest identity and actual browser decoding.
// No network or native install; legacy shared/Business resources are retained.
{
 const {createHash}=await import('node:crypto');
 const source=readFileSync(new URL('../images/mmhvault-v2-auth-mark.webp',import.meta.url));
 assert.equal(createHash('sha1').update('blob '+source.length+'\0').update(source).digest('hex'),'140fe9415437ae9560600c6a69cee20d3c30c758','approved original mark');
 // Compare against the exact released V2.0.70 Git blobs, not the obsolete L1.70 Landing template.
 // Revert only two approved PWA references per file; everything else must be byte-identical.
 const gitBlobHash=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 const baseline=[
   [
     "index.html",
     "b33125d3c107319506347b8dcdedb76813a61a76",
     [
       [
         "/images/mmhvault-personal-v2-icon-180.png",
         "/apple-touch-icon.png?v=pwa24-20261029"
       ],
       [
         "./mmh-manifest-v2.webmanifest?v=personal-v271",
         "./mmh-manifest-v2.webmanifest"
       ]
     ]
   ],
   [
     "login.html",
     "8ec382edfa3241d394cb5ec92e41011ea22bfba8",
     [
       [
         "/images/mmhvault-personal-v2-icon-180.png",
         "/apple-touch-icon.png?v=pwa24-20261029"
       ],
       [
         "./mmh-manifest-v2.webmanifest?v=personal-v271",
         "./mmh-manifest-v2.webmanifest"
       ]
     ]
   ],
   [
     "mmh-manifest-v2.webmanifest",
     "3e62a0760a3e69e69526b6fe37908d316557a149",
     [
       [
         "./images/mmhvault-personal-v2-icon-192.png",
         "./images/icon-192.png?v=pwa26-20261029"
       ],
       [
         "./images/mmhvault-personal-v2-icon-512.png",
         "./images/icon-512.png?v=pwa26-20261029"
       ]
     ]
   ]
 ];
 for(const [path,sha,replacements] of baseline){
  let restored=readFileSync(new URL('../'+path,import.meta.url),'utf8');
  for(const [newValue,oldValue] of replacements){
   assert.equal(restored.split(newValue).length,2,path+' exact reference count: '+newValue);
   restored=restored.replace(newValue,oldValue);
  }
  assert.equal(gitBlobHash(Buffer.from(restored,'utf8')),sha,path+' only approved PWA changes');
 }
 for(const [path,sha] of Object.entries({'apple-touch-icon.png':'efe60c939e353d7109371f7d1c855509e25de166','images/icon-192.png':'1ee0967345dedfffd56dd6920196dc46f282060e','images/icon-512.png':'2e430d0b863c32eeec88b9ad50089448eda88365'})){
  assert.equal(gitBlobHash(readFileSync(new URL('../'+path,import.meta.url))),sha,path+' original shared icon unchanged');
 }
 console.log('PASS: exact released Landing/Login/manifest preservation apart from Personal PWA references; shared icons unchanged');
 const expected={
  180:'dc28dfa0fec9680c2bebdfcd6f7a4ea58a76b260ef280ef2dc822bb1f7392a4f',
  192:'9f1721ac61220d16ba0a4917900a743bdbe7e6e7b07d5f2aac9b000db4939b2a',
  512:'12fd1f8aadf2302461c5e47cecf30478025be7f4a1b76be9e02897cecd31733d'
 };
 const manifest=JSON.parse(readFileSync(new URL('../mmh-manifest-v2.webmanifest',import.meta.url),'utf8'));
 assert.equal(manifest.id,'./mmhvault-personal-v2');
 assert.equal(manifest.start_url,'./login.html?source=pwa&install=v2');
 assert.equal(manifest.scope,'./');
 assert.deepEqual(manifest.icons,[192,512].map(size=>({src:'./images/mmhvault-personal-v2-icon-'+size+'.png',sizes:size+'x'+size,type:'image/png',purpose:'any'})));
 for(const path of ['app.html','login.html','index.html']){
  const page=readFileSync(new URL('../'+path,import.meta.url),'utf8');
  assert.ok(page.includes('href="/images/mmhvault-personal-v2-icon-180.png"'),path+' touch icon');
  assert.ok(page.includes('href="./mmh-manifest-v2.webmanifest?v=personal-v271"'),path+' refreshed Personal manifest');
  assert.ok(!/apple-touch-icon\.png\?v=pwa2[45]-20261029/.test(page),path+' no old touch icon reset');
 }
 const instance=await browserType.launch({headless:true});
 try{
  const page=await instance.newPage();await page.route('**/*',route=>route.abort());
  for(const size of [180,192,512]){
   const png=readFileSync(new URL('../images/mmhvault-personal-v2-icon-'+size+'.png',import.meta.url));
   assert.equal(createHash('sha256').update(png).digest('hex'),expected[size]);
   assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
   assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
   const dimensions=await page.evaluate(async src=>{const image=new Image();image.src=src;await image.decode();return [image.naturalWidth,image.naturalHeight];},'data:image/png;base64,'+png.toString('base64'));
   assert.deepEqual(dimensions,[size,size]);
  }
  console.log('PASS: committed approved Personal V2 PNG icons, exact hashes, manifest identity, HTML links and '+engine+' decode');
 }finally{await instance.close();}
}


// Real V2 public homepage, with offline baseline/candidate replay on identical assets.
// This is not a replacement for the legacy shared Landing gate or a live-site test.
{
 const candidate=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const baseline=candidate.replace('/images/mmhvault-personal-v2-icon-180.png','/apple-touch-icon.png?v=pwa24-20261029').replace('./mmh-manifest-v2.webmanifest?v=personal-v271','./mmh-manifest-v2.webmanifest');
 const {createHash}=await import('node:crypto');
 const bytes=Buffer.from(baseline);
 assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'b33125d3c107319506347b8dcdedb76813a61a76','exact released V2.0.70 homepage');
 const instance=await browserType.launch({headless:true});
 const origin='https://mmh-public-v271.invalid';
 const assets={'/images/mmhvault-v2-auth-mark.webp':'image/webp','/favicon.png':'image/png','/apple-touch-icon.png':'image/png','/images/mmhvault-personal-v2-icon-180.png':'image/png','/mmh-manifest-v2.webmanifest':'application/manifest+json'};
 try{
  for(const width of [360,390,768,1024,1280,1440]){
   const samples=[];
   for(const [label,html] of [['baseline',baseline],['candidate',candidate]]){
    const context=await instance.newContext({viewport:{width,height:900},reducedMotion:'reduce',colorScheme:'light'});
    const unexpected=[],errors=[];
    await context.route('**/*',route=>{
     const url=new URL(route.request().url());
     if(url.origin===origin&&url.pathname==='/')return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html});
     if(url.origin===origin&&assets[url.pathname]){
      let body=readFileSync(new URL('..'+url.pathname,import.meta.url));
      if(label==='baseline'&&url.pathname==='/mmh-manifest-v2.webmanifest')body=Buffer.from(body.toString().replace('./images/mmhvault-personal-v2-icon-192.png','./images/icon-192.png?v=pwa26-20261029').replace('./images/mmhvault-personal-v2-icon-512.png','./images/icon-512.png?v=pwa26-20261029'));
      return route.fulfill({status:200,contentType:assets[url.pathname],body});
     }
     if(url.href==='https://static.cloudflareinsights.com/beacon.min.js')return route.fulfill({status:200,contentType:'application/javascript',body:''});
     unexpected.push(url.href);return route.abort();
    });
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/');await page.locator('header .brand img').evaluate(img=>img.decode());
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://mmhvault.com/');
    assert.equal(await page.locator('main h1').count(),1);
    assert.ok(await page.locator('a[href="/login.html"]').count()>0);
    assert.ok(await page.locator('a[href="/register/"]').count()>0);
    const metrics=[];
    for(const lang of ['en','zh','my']){
     await page.locator('#langToggle').click();await page.locator('[data-lang-choice="'+lang+'"]').click();
     assert.equal(await page.locator('html').getAttribute('lang'),lang==='zh'?'zh-CN':lang);
     for(const theme of ['light','dark']){
      await page.locator('#themeToggle').click();await page.locator('[data-theme-choice="'+theme+'"]').click();
      assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
      const result=await page.evaluate(()=>{
       const root=document.documentElement;
       const measure=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(v=>Math.round(v*100)/100)};
       return {overflow:Math.max(0,root.scrollWidth-root.clientWidth),header:measure('header'),hero:measure('#landing-hero'),features:measure('#features')};
      });
      metrics.push({lang,theme,...result});
     }
    }
    if(width<=1100){
     const menu=page.locator('#menuToggle');await menu.click();
     assert.equal(await menu.getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');
     assert.equal(await menu.getAttribute('aria-expanded'),'false');
    }
    await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
    assert.ok(await page.evaluate(()=>scrollY>0),'homepage scroll');
    assert.deepEqual(errors,[],label+' page errors');
    assert.deepEqual(unexpected,[],label+' unexpected requests');
    samples.push(metrics);await context.close();
   }
   assert.deepEqual(samples[1],samples[0],engine+' '+width+' baseline/candidate visual geometry');
   console.log('PASS: '+engine+' V2 public '+width+'px six locale/theme baseline parity; overflow px '+samples[0].map(x=>x.overflow).join(','));
  }
 }finally{await instance.close()}
}
