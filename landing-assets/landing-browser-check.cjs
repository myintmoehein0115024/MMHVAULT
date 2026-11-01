/* MMHVAULT Landing L1.34 — isolated public-page browser QA.
 * Runs on a local static server in GitHub Actions.
 * No authentication, backend, financial data or production writes.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright-core');
const origin='http://127.0.0.1:8765';
const widths=[320,393,440,768,1024,1200,1440,1920];
const publicRoutes=['/','/about/','/register/','/features/','/business/','/privacy.html','/terms.html','/security.html'];
const screenshots=path.join(process.cwd(),'landing-qa-screenshots');
fs.mkdirSync(screenshots,{recursive:true});
function ensure(condition,message){assert.ok(condition,message);console.log('PASS '+message)}
async function load(page,route,failures){
  const response=await page.goto(origin+route,{waitUntil:'load',timeout:25000});
  ensure(response && response.status()===200,route+' HTTP 200');
  await page.waitForTimeout(100);
  const widths=await page.evaluate(()=>({
    window:window.innerWidth,
    document:document.documentElement.scrollWidth,
    body:document.body.scrollWidth
  }));
  if(widths.document > widths.window+2){
    const outside=await page.evaluate(()=>[...document.querySelectorAll('body *')]
      .map(el=>{
        const r=el.getBoundingClientRect();
        const st=getComputedStyle(el);
        return {tag:el.tagName,className:typeof el.className==='string'?el.className.slice(0,100):'',
          left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),
          position:st.position,overflow:st.overflowX};
      })
      .filter(r=>r.width>10 && (r.right>innerWidth+5 || r.left< -5))
      .sort((a,b)=>b.right-a.right).slice(0,24));
    console.error('RESPONSIVE OFFENDERS '+route+' '+widths.window+'px '+JSON.stringify(outside));
  }
  // Decorative blurred ambience may extend outside the viewport in layout
  // metrics while overflow-x:clip prevents all *actual* horizontal scrolling.
  const horizontalTravel=await page.evaluate(()=>{
    const beforeX=scrollX, beforeY=scrollY;
    window.scrollTo({left:1000,top:beforeY,behavior:'instant'});
    const traveled=scrollX;
    window.scrollTo({left:beforeX,top:beforeY,behavior:'instant'});
    return traveled;
  });
  ensure(horizontalTravel<=2,
    route+' no user-scrollable sideways overflow '+JSON.stringify({...widths,horizontalTravel}));
  ensure(failures.length===0,route+' no JS exceptions or missing local assets: '+failures.join('; '));
  return widths;
}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
   for(const width of widths){
     const ctx=await browser.newContext({
       viewport:{width,height:852},deviceScaleFactor:1,
       reducedMotion:'reduce',isMobile:width<=440,hasTouch:width<=440
     });
     const page=await ctx.newPage();
     const failures=[];
     page.on('pageerror',e=>failures.push('exception '+e.message));
     page.on('response',r=>{
       if(r.url().startsWith(origin) && r.status()>=400)failures.push(r.status()+' '+r.url());
     });
     await load(page,'/',failures);
     ensure(await page.locator('h1#hero-title').count()===1,width+'px single homepage H1');
     ensure(await page.locator('.hero-device-cinematic').evaluate(img=>img.complete&&img.naturalWidth>0),
       width+'px concept Hero photograph loaded');
     if([320,393,768,1024].includes(width)){
       await page.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}));
       await page.screenshot({
         path:path.join(screenshots,'landing-firstscreen-'+width+'.png'),
         fullPage:false,animations:'disabled'
       });
     }
     if(width<=1024){
       const clipped=await page.evaluate(()=>{
         const selectors=[
           '.site-header .brand','.site-header .locale-trigger','.site-header .menu-toggle',
           '.hero .hero-name','.hero .hero-statement',
           '.hero .hero-script-zh','.hero .hero-script-my','.hero .hero-script-en',
           '.hero .hero-buttons'
         ];
         return selectors.flatMap(selector=>{
           const el=document.querySelector(selector);
           if(!el || getComputedStyle(el).display==='none')return [];
           const box=el.getBoundingClientRect();
           const range=document.createRange();
           range.selectNodeContents(el);
           const text=range.getBoundingClientRect();
           const extendsPast=box.left< -4||box.right>innerWidth+4||
             (text.width>0&&(text.left< -4||text.right>innerWidth+4));
           const hiddenText=el.scrollWidth>el.clientWidth+5;
           return extendsPast||hiddenText?[{
             selector,left:Math.round(box.left),right:Math.round(box.right),
             contentRight:Math.round(text.right),scrollWidth:el.scrollWidth,
             clientWidth:el.clientWidth
           }]:[];
         });
       });
       ensure(clipped.length===0,
         width+'px home branding, controls and three-language Hero stay onscreen '+JSON.stringify(clipped));
     }

     // User-requested fixed multilingual Hero must not change with language.
     const immutable=await page.locator('[data-hero-fixed]').allTextContents();
     for(const language of ['zh','my','en']){
       await page.locator('#locale-trigger').click();
       await page.locator('#locale-menu button[data-lang="'+language+'"]').click();
       const after=await page.locator('[data-hero-fixed]').allTextContents();
       ensure(JSON.stringify(after)===JSON.stringify(immutable),
         width+'px fixed three-language Hero remains unchanged in '+language);
     }
     await page.locator('[data-product-tab="accounts"]').click();
     ensure(await page.locator('[data-product-tab="accounts"]').getAttribute('aria-selected')==='true',
       width+'px Accounts feature tab responds');
     ensure(await page.locator('[data-product-panel="accounts"]').isVisible(),
       width+'px Accounts concept panel displayed');
     await page.locator('[data-business-view="business"]').click();
     ensure(await page.locator('[data-business-view="business"]').getAttribute('aria-pressed')==='true',
       width+'px Business concept switch responds');
     ensure(await page.locator('body').evaluate(b=>!b.innerHTML.includes('user-scalable=no')),
       width+'px browser zoom not disabled');
     if(width===393||width===1440)await page.screenshot({
       path:path.join(screenshots,'landing-'+width+'.png'),fullPage:true,animations:'disabled'
     });
     ensure(failures.length===0,width+'px interactive Landing has no missing assets / exceptions');
     await ctx.close();
     console.log('PASS viewport '+width+' complete');
   }

   for(const route of publicRoutes.slice(1)){
     for(const width of [320,393,600,768,960,1100,1200,1290,1291,1366,1440]){
       const ctx=await browser.newContext({viewport:{width,height:852},reducedMotion:'reduce'});
       const page=await ctx.newPage();
       const failures=[];
       page.on('pageerror',e=>failures.push('exception '+e.message));
       page.on('response',r=>{
         if(r.url().startsWith(origin)&&r.status()>=400)failures.push(r.status()+' '+r.url());
       });
       await load(page,route,failures);
       ensure(await page.locator('h1').count()===1,route+' '+width+'px has one H1');
       ensure(await page.locator('link[rel="canonical"]').count()===1,
         route+' '+width+'px canonical unique');
       if(route==='/business/'){
         ensure(await page.locator('body.business-page').count()===1,
           route+' dedicated concept page, not private business.html');
         ensure(await page.locator('.business-availability').count()===1,
           route+' preview-only status visible');
         ensure(await page.locator('link[rel="canonical"]').getAttribute('href')==='https://mmhvault.com/business/',
           route+' canonical targets own route');
         ensure(await page.locator('header nav>a[href="/business/"]').getAttribute('aria-current')==='page',
           route+' Business marked selected');
       }
       if(['/security.html','/privacy.html','/terms.html'].includes(route)){
         ensure(await page.locator('body.public-landing-page.policy-page').count()===1,
           route+' inherits Landing finance brand presentation');
         ensure(await page.locator('article.policy-card').count()===1,
           route+' keeps legal/policy copy in a readable card');
         ensure(await page.locator('.public-footer').count()===1,
           route+' has the shared public footer');
         if([393,1440].includes(width)){
           await page.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}));
           await page.screenshot({path:path.join(screenshots,
             'policy-'+route.slice(1,-5)+'-'+width+'.png'),
             fullPage:false,animations:'disabled'});
         }
       }
       if(['/register/','/features/','/about/','/business/','/security.html','/privacy.html','/terms.html'].includes(route)){
         const header=await page.evaluate(()=>{
           const bar=document.querySelector('header .bar').getBoundingClientRect();
           const brand=document.querySelector('header .brand').getBoundingClientRect();
           const nav=document.querySelector('header nav').getBoundingClientRect();
           return {barHeight:Math.round(bar.height),barBottom:Math.round(bar.bottom),
             brandTop:Math.round(brand.top),brandBottom:Math.round(brand.bottom),
             navTop:Math.round(nav.top),navBottom:Math.round(nav.bottom)};
         });
         ensure(header.barHeight<=112&&header.navTop<=header.brandBottom+8&&
           header.brandTop<=header.navBottom+8,
           route+' '+width+'px single-row header without 2nd line '+JSON.stringify(header));
         const details=page.locator('header .public-nav-details');
         if(width<=1290){
           ensure(await details.isVisible(),route+' '+width+'px responsive menu is visible');
           await details.locator('summary').click();
           ensure(await details.evaluate(d=>d.open),route+' '+width+'px compact menu opens');
           ensure(await details.locator('a[href="/features/"]').isVisible()&&
             await details.locator('a[href="/register/"]').isVisible(),
             route+' '+width+'px compact menu includes public routes');
           await page.keyboard.press('Escape');
           ensure(!await details.evaluate(d=>d.open),route+' '+width+'px Escape closes menu');
         }else{
           ensure(!await details.isVisible()&&
             await page.locator('header nav>a[href="/features/"]').isVisible(),
             route+' '+width+'px full navigation is visible');
         }
       }
       if(['/register/','/features/','/about/','/business/'].includes(route)){
         ensure(await page.locator('body.public-landing-page .feature-hero').count()===1,
           route+' inherited premium Landing shell');
         ensure(await page.locator('header .brand-wordmark').isVisible(),
           route+' shared Landing wordmark is visible');
         ensure(await page.locator('header .feature-nav-cta').getAttribute('href')==='/login.html',
           route+' Get Started goes only to existing secure access');
         ensure(await page.locator('.page-breadcrumb a').getAttribute('href')==='/',
           route+' clearly linked as a Landing subpage');
       }
       if(['/register/','/features/','/about/','/business/'].includes(route)&&[320,393,768,1100,1290,1291,1440].includes(width)){
         const trigger=page.locator('#public-locale-trigger');
         const localeName=page.locator('.public-locale-name');
         if([393,1100,1290,1291,1440].includes(width)){
           await page.screenshot({path:path.join(screenshots,
             route.replaceAll('/','')+'-'+width+'-en.png'),fullPage:true,animations:'disabled'});
         }
         await trigger.click();
         ensure(await trigger.getAttribute('aria-expanded')==='true',route+' language menu opens at '+width);
         await page.locator('#public-locale-menu button[data-lang="zh"]').click();
         ensure(await localeName.textContent()==='中文' && await page.locator('h1').isVisible(),
           route+' Chinese language updates menu and title');
         ensure(await trigger.getAttribute('aria-expanded')==='false',route+' language menu closes on selection');
         await trigger.click();
         await page.locator('#public-locale-menu button[data-lang="my"]').click();
         ensure(await localeName.textContent()==='မြန်မာ' && await page.locator('h1').isVisible(),
           route+' Burmese language updates menu and title');
         const localeOverflow=await page.evaluate(()=>{
           const previousY=scrollY;
           scrollTo({left:900,top:previousY,behavior:'instant'});
           const extra=scrollX;
           scrollTo({left:0,top:previousY,behavior:'instant'});
           return {extra,width:innerWidth,document:document.documentElement.scrollWidth};
         });
         if(localeOverflow.extra>2){
           const candidates=await page.evaluate(()=>{
             scrollTo({left:0,top:scrollY,behavior:'instant'});
             return [...document.querySelectorAll('body *')]
             .map(el=>{const r=el.getBoundingClientRect();return {
               tag:el.tagName,cls:typeof el.className==='string'?el.className.slice(0,75):'',
               text:(el.textContent||'').slice(0,55),x:Math.round(r.left),right:Math.round(r.right),
               width:Math.round(r.width),overflow:getComputedStyle(el).overflowX};
             })
             .filter(x=>x.right>innerWidth+3 && x.width>8)
             .sort((a,b)=>b.right-a.right).slice(0,22);
           });
           console.error('PUBLIC LOCALE OVERFLOW '+route+' '+JSON.stringify(candidates));
         }
         ensure(localeOverflow.extra<=2,route+' Burmese locale has no sideways scroll '+JSON.stringify(localeOverflow));
         if(width===393){
           await page.screenshot({path:path.join(screenshots,
             route.replaceAll('/','')+'-'+width+'-my.png'),fullPage:true,animations:'disabled'});
         }
         await page.reload({waitUntil:'load'});
         ensure(await page.locator('.public-locale-name').textContent()==='မြန်မာ',
           route+' language preference persists across reload at '+width);
       }
       await ctx.close();
     }
   }

   // L1.12 — end-to-end route consistency: public Security is a first-class
   // branded page, Business is the Landing section, and Home does not leave #top.
   {
     const ctx=await browser.newContext({viewport:{width:1440,height:900},
       reducedMotion:'reduce'});
     const page=await ctx.newPage();
     await page.goto(origin+'/',{waitUntil:'load'});
     await page.locator('#primary-nav > a[href="#business"]').click();
     await page.waitForFunction(()=>location.hash==='#business');
     ensure(new URL(page.url()).pathname==='/' &&
       new URL(page.url()).hash==='#business',
       'Landing Business top navigation stays in the Business showcase');
     await page.locator('#primary-nav > a[href="#security"]').click();
     await page.waitForFunction(()=>location.hash==='#security');
     ensure(new URL(page.url()).pathname==='/' &&
       new URL(page.url()).hash==='#security',
       'Landing Security top navigation stays in the security showcase');
     const explore=page.locator('#landing-explore');
     await explore.locator('summary').click();
     ensure(await explore.evaluate(x=>x.open) &&
       await explore.locator('a[href="./business/"]').isVisible() &&
       await explore.locator('a[href="./security.html"]').isVisible(),
       'Explore independently exposes Business and Security details');
     await page.keyboard.press('Escape');
     ensure(!await explore.evaluate(x=>x.open),
       'Escape closes Explore disclosure');
     await explore.locator('summary').click();
     await explore.locator('a[href="./security.html"]').click();
     await page.waitForURL('**/security.html');
     ensure(await page.locator('body.public-landing-page.policy-page').count()===1,
       'Explore Security Details opens existing public policy');
     await page.locator('header .brand').click();
     await page.waitForURL(url=>url.pathname==='/');
     ensure(new URL(page.url()).pathname==='/' &&
       !new URL(page.url()).hash,'Independent Security Home returns to canonical Landing');
     await page.goto(origin+'/about/',{waitUntil:'load'});
     await page.locator('header nav>a[href="/business/"]').click();
     await page.waitForURL('**/business/');
     ensure(new URL(page.url()).pathname==='/business/'&&!new URL(page.url()).hash,
       'About Business navigation opens its own dedicated URL');
     ensure(await page.locator('body.public-landing-page.business-page').count()===1,
       'Business route has its own premium Landing branch');
     ensure(await page.locator('header nav>a[href="/business/"]').getAttribute('aria-current')==='page',
       'Business navigation is active on the Business route');
     await page.locator('.business-hero .action.gold').click();
     await page.waitForFunction(()=>location.hash==='#business-focus');
     ensure(new URL(page.url()).pathname==='/business/',
       'Business concept CTA stays inside Business, not Landing');
     await page.locator('header .brand').click();
     await page.waitForURL(url=>url.pathname==='/');
     ensure(new URL(page.url()).pathname==='/'&&!new URL(page.url()).hash,
       'Business Home returns to clean canonical Landing');
     await page.locator('#landing-explore > summary').click();
     await page.locator('#landing-explore .nav-explore-menu a[href="./business/"]').click();
     await page.waitForURL('**/business/');
     ensure(new URL(page.url()).pathname==='/business/',
       'Landing Explore opens independent Business concept information');
     await page.goto(origin+'/security.html',{waitUntil:'load'});
     await page.setViewportSize({width:393,height:852});
     await page.locator('header .public-nav-details summary').click();
     await page.locator('header .public-nav-panel a[href="/business/"]').click();
     await page.waitForURL('**/business/');
     ensure(new URL(page.url()).pathname==='/business/',
       'Security compact Business menu also opens dedicated Business URL');

     // The same information dropdown must work from the mobile hamburger.
     await page.goto(origin+'/',{waitUntil:'load'});
     await page.setViewportSize({width:393,height:852});
     await page.locator('.site-header .menu-toggle').click();
     ensure(await page.locator('#primary-nav > a[href="#business"]').isVisible() &&
       await page.locator('#primary-nav > a[href="#security"]').isVisible(),
       'Mobile Landing Business and Security links are local');
     await page.locator('#landing-explore > summary').click();
     ensure(await page.locator('#landing-explore .nav-explore-menu a[href="./about/"]').isVisible() &&
       await page.locator('#landing-explore .nav-explore-menu a[href="./register/"]').isVisible(),
       'Mobile Explore menu exposes standalone descriptions');
     await page.screenshot({path:path.join(screenshots,'landing-explore-393.png'),fullPage:false,animations:'disabled'});
     await page.locator('#landing-explore .nav-explore-menu a[href="./features/"]').click();
     await page.waitForURL('**/features/');
     ensure(new URL(page.url()).pathname==='/features/',
       'Mobile Explore opens the independent Features page');
     await ctx.close();
   }
      const ctx=await browser.newContext({viewport:{width:393,height:852},reducedMotion:'no-preference'});
   const page=await ctx.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await load(page,'/',errors);
   ensure(await page.evaluate(()=>document.documentElement.classList.contains('mm-motion-active')),
      'Progressive reveal enabled when browser permits motion');
   await page.locator('#features').scrollIntoViewIfNeeded();
   await page.waitForTimeout(850);
   ensure(await page.locator('.mm-shown').count()>0,'Scroll reveal completes after entering viewport');
   ensure(errors.length===0,'Liquid motion produces no JS exceptions');
   await ctx.close();
   console.log('PUBLIC LANDING BROWSER QA PASS: '+widths.length+' Landing viewports, '+
      (publicRoutes.length-1)*4+' public-page viewports, language and state interactions');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
