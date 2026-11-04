/* L1.64 — macOS Playwright WebKit (Safari-engine) public-only smoke.
 * Tests rendering and interaction, NOT an FPS claim for physical Safari.
 * Never reaches auth, backend, Supabase or user financial endpoints.
 */
'use strict';
const assert=require('node:assert/strict');
const {webkit}=require('playwright-core');
const origin='http://127.0.0.1:8765';
const routes=['/','/about/','/features/','/register/','/business/',
  '/security.html','/privacy.html','/terms.html'];
function pass(condition,label,detail){
  assert.ok(condition,label+(detail?' '+JSON.stringify(detail):''));
  console.log('PASS '+label);
}
(async()=>{
 const browser=await webkit.launch({headless:true});
 let cases=0;
 try{
  for(const path of routes){
   for(const width of [1280,1440]){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    // Local WebKit checks do not exercise the unrelated Cloudflare RUM beacon.
    // Neutralize its script at request time; production HTML/analytics are intact.
    await context.route('https://static.cloudflareinsights.com/**',
      route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const response=await page.goto(origin+path,{waitUntil:'load',timeout:30000});
    pass(response?.status()===200,'WebKit public route '+path+' '+width+'px');
    const metrics=await page.evaluate(()=>{
      const header=document.querySelector('.site-header');
      const h=getComputedStyle(header);
      const sheet=[...document.querySelectorAll('link[rel="stylesheet"]')]
        .find(l=>l.href.includes('safari-performance-l164.css'));
      const cards=[...document.querySelectorAll('.showcase-v2 .showcase-card')];
      const cardStyles=cards.map(el=>getComputedStyle(el));
      window.scrollTo({top:Math.min(550,Math.max(0,document.documentElement.scrollHeight-innerHeight)),behavior:'instant'});
      const y=window.scrollY;
      const x=window.scrollX;
      return {
        safariSheet:sheet?.href,
        headerBackdrop:h.backdropFilter,
        headerWebkitBackdrop:h.webkitBackdropFilter,
        headerBackground:h.backgroundImage,
        headerTop:header.getBoundingClientRect().top,
        scrollY:y,scrollX:x,
        cardCount:cards.length,
        cardBlurOff:cardStyles.every(s=>s.backdropFilter==='none'&&s.webkitBackdropFilter==='none'),
        ambientOff:document.body.classList.contains('l131')
          ?getComputedStyle(document.querySelector('.ambient')).filter==='none':true,
        heroGlowOff:document.body.classList.contains('l131')
          ?getComputedStyle(document.querySelector('.hero'),'::after').filter==='none':true,
        canonical:document.querySelector('link[rel="canonical"]')?.href,
        horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2
      };
    });
    pass(metrics.safariSheet?.includes('?v=l165') &&
      metrics.headerBackdrop==='none'&&metrics.headerWebkitBackdrop==='none'&&
      metrics.headerBackground.includes('linear-gradient')&&
      metrics.cardBlurOff&&metrics.ambientOff&&metrics.heroGlowOff&&
      metrics.canonical?.startsWith('https://mmhvault.com/')&&
      !metrics.horizontalOverflow&&metrics.scrollX===0&&
      (metrics.scrollY<10||Math.abs(metrics.headerTop)<=2),
      'WebKit desktop compositing and scroll integrity '+path+' '+width,metrics);
    const trigger=page.locator('#locale-trigger');
    await trigger.click();
    const option=page.locator('#locale-menu [data-lang="zh"]');
    await option.click();
    pass(await page.evaluate(()=>document.documentElement.lang==='zh-CN'),
      'WebKit translated menu remains functional '+path+' '+width);
    pass(errors.length===0,'WebKit no page exceptions '+path+' '+width,errors);
    await context.close();
    cases++;
   }
  }
  // L1.65: keep premium hover shadow end states without interpolating them.
  for(const width of [1280,1440]){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'no-preference'});
    await context.route('https://static.cloudflareinsights.com/**',
      route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const response=await page.goto(origin+'/',{waitUntil:'load',timeout:30000});
    const card=page.locator('.showcase-v2 .showcase-card').first();
    const before=await card.evaluate(el=>{
      const css=getComputedStyle(el);
      return {transition:css.transitionProperty,shadow:css.boxShadow,
        glow:getComputedStyle(document.querySelector('#business .business-stage'),'::after').filter};
    });
    await card.hover();
    await page.waitForTimeout(350);
    const after=await card.evaluate(el=>getComputedStyle(el).boxShadow);
    const props=before.transition.split(',').map(x=>x.trim());
    pass(response?.status()===200&&before.glow==='none'&&
      !props.includes('box-shadow')&&props.includes('opacity')&&props.includes('transform')&&
      props.includes('border-color')&&before.shadow!==after&&errors.length===0,
      'L1.65 WebKit desktop hover and Business glow parity '+width+'px',
      {before,after,errors});
    await context.close();
  }
  // 390px mobile stays outside the desktop compositing override.
  for(const path of ['/','/about/']){
    const context=await browser.newContext({viewport:{width:390,height:844}});
    const page=await context.newPage();
    await page.goto(origin+path,{waitUntil:'load'});
    const metrics=await page.evaluate(()=>{
      const h=getComputedStyle(document.querySelector('.site-header'));
      return {desktopRule:matchMedia('(min-width:1025px)').matches,
        background:h.backgroundImage,cssLoaded:[...document.styleSheets].some(s=>s.href?.includes('safari-performance-l164.css')),
        mobileBusinessBlur:document.querySelector('#business .business-stage')?
          getComputedStyle(document.querySelector('#business .business-stage'),'::after').filter:null};
    });
    pass(!metrics.desktopRule&&metrics.cssLoaded&&metrics.background.includes('gradient')&&
      (path!=='/'||metrics.mobileBusinessBlur==='blur(40px)'),
      'WebKit mobile baseline is not overridden '+path,metrics);
    await context.close();
  }
  console.log('L1.65 MACOS WEBKIT QA PASS: '+cases+' desktop routes + 2 hover + 2 mobile guards');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
