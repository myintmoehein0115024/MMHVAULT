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
const widths=[320,393,440,768,1024,1051,1100,1200,1290,1440,1920];
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
   // L1.45 CSSOM rule-for-rule equivalence: compare the current compact CSS
   // against the readable predecessor from origin/main using Chrome's own
   // stylesheet parser. This fails on rule/value/order/selector differences.
   // These tests never load an authenticated route or call external services.
   {
     const previous=fs.readFileSync('landing-assets/landing.css','utf8');
     const currentCss=fs.readFileSync('landing-assets/landing.min.css','utf8');
     const ctx=await browser.newContext({
       viewport:{width:393,height:852},reducedMotion:'reduce'
     });
     const page=await ctx.newPage(),failures=[],cssResponses=[];
     page.on('pageerror',e=>failures.push(e.message));
     page.on('response',r=>{
       if(r.url().includes('/landing-assets/landing.min.css'))
         cssResponses.push({status:r.status(),url:r.url()});
     });
     await page.goto(origin+'/',{waitUntil:'load',timeout:30000});
     const cssom=await page.evaluate(({before,after})=>{
       const originalSheet=new CSSStyleSheet();
       const compactSheet=new CSSStyleSheet();
       originalSheet.replaceSync(before);
       compactSheet.replaceSync(after);
       const a=[...originalSheet.cssRules].map(x=>x.cssText);
       const b=[...compactSheet.cssRules].map(x=>x.cssText);
       const mismatch=a.findIndex((rule,i)=>rule!==b[i]);
       const styles=[...document.querySelectorAll('link[rel="stylesheet"]')]
         .filter(x=>x.href.includes('/landing-assets/landing.min.css'));
       return {same:a.length===b.length&&mismatch===-1,
         originalRuleCount:a.length,compactRuleCount:b.length,
         mismatch,oldRule:mismatch<0?null:a[mismatch]?.slice(0,240),
         newRule:mismatch<0?null:b[mismatch]?.slice(0,240),
         requestedStyle:styles.map(x=>({href:x.href,loaded:!!x.sheet})),
         heroWidth:document.querySelector('#hero-title').getBoundingClientRect().width};
     },{before:previous,after:currentCss});
     ensure(cssom.same&&cssom.originalRuleCount>150&&
       previous.length-currentCss.length>=8000&&
       cssom.requestedStyle.length===1&&
       cssom.requestedStyle[0].href.endsWith('/landing-assets/landing.min.css?v=l145')&&
       cssom.requestedStyle[0].loaded&&
       cssom.heroWidth>0&&
       cssResponses.length===1&&cssResponses[0].status===200&&
       failures.length===0,
       'L1.45 byte reduction preserves every parsed CSS rule '+JSON.stringify({
         cssom,oldBytes:Buffer.byteLength(previous),newBytes:Buffer.byteLength(currentCss),
         cssResponses,failures
       }));
     await ctx.close();
   }

   // L1.47 Chrome CSSOM header bundle parity: original Explore and shared
   // header styles remain readable and the combined request must preserve
   // every rule in exactly the same cascade order.
   {
     const originals=[
       fs.readFileSync('landing-assets/explore-l114.css','utf8'),
       fs.readFileSync('landing-assets/shared-header-l116.css','utf8')
     ];
     const merged=fs.readFileSync('landing-assets/header-explore-l147.min.css','utf8');
     const ctx=await browser.newContext({viewport:{width:393,height:852},reducedMotion:'reduce'});
     const page=await ctx.newPage(),errors=[],requests=[];
     page.on('pageerror',error=>errors.push(error.message));
     page.on('response',response=>{
       const url=new URL(response.url());
       if(url.origin===origin && url.pathname.startsWith('/landing-assets/') &&
         url.pathname.endsWith('.css')){
         requests.push({path:url.pathname,status:response.status(),
           version:url.searchParams.get('v')});
       }
     });
     await page.goto(origin+'/',{waitUntil:'load',timeout:30000});
     const checks=await page.evaluate(({source,bundle})=>{
       const cssRules=content=>{
         const sheet=new CSSStyleSheet();
         sheet.replaceSync(content);
         return [...sheet.cssRules].map(rule=>rule.cssText);
       };
       const oldRules=source.flatMap(cssRules);
       const bundledRules=cssRules(bundle);
       const index=oldRules.findIndex((rule,i)=>rule!==bundledRules[i]);
       const link=[...document.querySelectorAll('link[rel="stylesheet"]')]
         .filter(el=>new URL(el.href).pathname==='/landing-assets/header-explore-l147.min.css');
       const header=document.querySelector('.site-header').getBoundingClientRect();
       const explore=document.querySelector('#landing-explore');
       return {ruleCount:oldRules.length,bundledCount:bundledRules.length,
         same:oldRules.length===bundledRules.length && index===-1,
         firstMismatch:index,linkCount:link.length,loaded:link[0]?.sheet!=null,
         cacheVersion:link.length===1?new URL(link[0].href).searchParams.get('v'):null,
         navExists:!!explore,headerRight:header.right,
         oldLinkCount:[...document.querySelectorAll('link[rel="stylesheet"]')]
           .filter(el=>/\/(?:explore-l114|shared-header-l116)\.css$/.test(new URL(el.href).pathname)).length
       };
     },{source:originals,bundle:merged});
     const hits=requests.filter(r=>r.path==='/landing-assets/header-explore-l147.min.css');
     const missingOld=requests.filter(r=>
       ['/landing-assets/explore-l114.css','/landing-assets/shared-header-l116.css'].includes(r.path));
     ensure(checks.same&&checks.ruleCount>=90&&checks.linkCount===1&&checks.loaded&&
       checks.cacheVersion==='l147'&&checks.navExists&&checks.headerRight<=394&&
       checks.oldLinkCount===0&&hits.length===1&&hits[0].status===200&&
       missingOld.length===0&&originals.join('').length-merged.length>2500&&errors.length===0,
       'L1.47 combined header CSS parses identically and saves one request '+
         JSON.stringify({checks,oldBytes:originals.reduce((sum,c)=>sum+Buffer.byteLength(c),0),
           newBytes:Buffer.byteLength(merged),hits,missingOld,errors}));
     await ctx.close();
   }

   // L1.46 CSSOM critical style parity: keep editable original CSS and prove
   // that Chrome parses every rule identically in the compact runtime copy.
   {
     const payload=['cinematic','premium-l131'].map(name=>({
       name,
       before:fs.readFileSync('landing-assets/'+name+'.css','utf8'),
       after:fs.readFileSync('landing-assets/'+name+'.min.css','utf8')
     }));
     const ctx=await browser.newContext({viewport:{width:393,height:852},reducedMotion:'reduce'});
     const page=await ctx.newPage(),failures=[],requests=[];
     page.on('pageerror',error=>failures.push(error.message));
     page.on('response',response=>{
       const url=new URL(response.url());
       if(url.origin===origin&&
          /\/(?:cinematic|premium-l131)\.min\.css$/.test(url.pathname)){
         requests.push({path:url.pathname,status:response.status(),
           version:url.searchParams.get('v')});
       }
     });
     await page.goto(origin+'/',{waitUntil:'load',timeout:30000});
     const result=await page.evaluate(styles=>{
       const checked=[];
       for(const {name,before,after} of styles){
         const oldSheet=new CSSStyleSheet(),newSheet=new CSSStyleSheet();
         oldSheet.replaceSync(before);newSheet.replaceSync(after);
         const original=[...oldSheet.cssRules].map(rule=>rule.cssText);
         const compact=[...newSheet.cssRules].map(rule=>rule.cssText);
         const firstMismatch=original.findIndex((rule,i)=>rule!==compact[i]);
         const linked=[...document.querySelectorAll('link[rel="stylesheet"]')]
           .filter(link=>new URL(link.href).pathname==='/landing-assets/'+name+'.min.css');
         checked.push({name,originalRules:original.length,compactRules:compact.length,
           identical:original.length===compact.length&&firstMismatch===-1,
           firstMismatch,links:linked.map(link=>({loaded:!!link.sheet,
             version:new URL(link.href).searchParams.get('v')}))});
       }
       return {checked,
         heroWidth:document.querySelector('#hero-title').getBoundingClientRect().width,
         headerRight:document.querySelector('.site-header').getBoundingClientRect().right};
     },payload);
     ensure(result.checked.length===2&&result.checked.every(x=>
       x.identical&&x.originalRules>10&&x.links.length===1&&
       x.links[0].loaded&&x.links[0].version==='l146')&&
       result.heroWidth>0&&result.headerRight<=394&&
       requests.length===2&&requests.every(x=>x.status===200&&x.version==='l146')&&
       payload.every(x=>x.before.length-x.after.length>=500)&&failures.length===0,
       'L1.46 compact critical CSS identical Chrome rules and single requests '+
       JSON.stringify({result,bytes:payload.map(x=>({name:x.name,
         original:Buffer.byteLength(x.before),compact:Buffer.byteLength(x.after)})),requests,failures}));
     await ctx.close();
   }

   // L1.44 — hold the small animation-only CSS until after DOMContentLoaded.
   // Hero and first-screen navigation must render normally without waiting.
   // A fast scroll while delayed must not cause invisible feature cards.
   for(const width of [393,768,1440]){
     const ctx=await browser.newContext({
       viewport:{width,height:852},reducedMotion:'no-preference',
       isMobile:width===393,hasTouch:width===393
     });
     const page=await ctx.newPage(),failures=[];
     page.on('pageerror',e=>failures.push(e.message));
     let releaseMotion;
     const held=new Promise(resolve=>{releaseMotion=resolve;});
     let heldCount=0;
     await page.route('**/landing-assets/motion-l132.css*',async route=>{
       heldCount++;
       await held;
       await route.continue();
     });
     let early;
     try{
       await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:15000});
       early=await page.evaluate(()=>{
         const hero=document.querySelector('#hero-title').getBoundingClientRect();
         const header=document.querySelector('.site-header').getBoundingClientRect();
         const style=document.querySelector('link[href*="/landing-assets/motion-l132.css"]');
         return {motionMedia:style?.media,cssPending:!style?.sheet,
           heroTop:hero.top,heroLeft:hero.left,heroHeight:hero.height,
           headerRight:header.right,rootMotion:document.documentElement.classList.contains('mm-motion-active')};
       });
       ensure(heldCount===1&&early.motionMedia==='print'&&
         early.cssPending&&early.rootMotion&&early.heroHeight>20&&
         early.heroLeft>=-1&&early.headerRight<=width+1&&failures.length===0,
         'L1.44 '+width+'px Hero renders while motion CSS is delayed '+JSON.stringify({early,failures}));
       await page.locator('.showcase-grid > .showcase-card').first().scrollIntoViewIfNeeded();
       const scrolled=await page.evaluate(()=>{
         const el=document.querySelector('.showcase-grid > .showcase-card');
         const css=getComputedStyle(el);
         return {y:scrollY,opacity:css.opacity,visible:el.getBoundingClientRect().height>0};
       });
       ensure(scrolled.y>200&&scrolled.opacity==='1'&&scrolled.visible,
         'L1.44 '+width+'px fast scroll keeps content visible before animation CSS '+JSON.stringify(scrolled));
     }finally{releaseMotion();}
     await page.waitForLoadState('load',{timeout:18000});
     await page.waitForFunction(()=>{
       const link=document.querySelector('link[href*="/landing-assets/motion-l132.css"]');
       return link?.media==='all'&&link.sheet?.cssRules.length>0;
     },null,{timeout:8000});
     await page.waitForTimeout(700);
     const after=await page.evaluate(()=>{
       const header=document.querySelector('.site-header').getBoundingClientRect();
       const card=document.querySelector('.showcase-grid > .showcase-card');
       const style=getComputedStyle(card);
       return {headerRight:header.right,opacity:style.opacity,
         shown:card.classList.contains('mm-shown'),
         scrollX,scrollY,transitions:style.transitionProperty};
     });
     ensure(after.headerRight<=width+1&&after.scrollX===0&&
       after.opacity==='1'&&after.shown&&
       after.transitions.includes('opacity')&&failures.length===0,
       'L1.44 '+width+'px deferred CSS preserves scroll reveal and no clipping '+JSON.stringify(after));
     await ctx.close();
   }
   // A no-script browser still loads the progressive motion CSS normally;
   // this does not hide any content because no motion-active class is applied.
   {
     const ctx=await browser.newContext({viewport:{width:393,height:852},javaScriptEnabled:false});
     const page=await ctx.newPage();
     await page.goto(origin+'/',{waitUntil:'load',timeout:25000});
     const state=await page.evaluate(()=>{
       const links=[...document.querySelectorAll('link[href*="/landing-assets/motion-l132.css"]')];
       return {media:links.map(x=>x.media),
         loaded:links.some(x=>(x.media===''||x.media==='all')&&x.sheet?.cssRules.length>0),
         rootMotion:document.documentElement.classList.contains('mm-motion-active'),
         headerRight:document.querySelector('.site-header').getBoundingClientRect().right};
     });
     ensure(state.media.includes('print')&&
       (state.media.includes('')||state.media.includes('all'))&&
       state.loaded&&!state.rootMotion&&state.headerRight<=394,
       'L1.44 no-JS fallback keeps animation stylesheet accessible '+JSON.stringify(state));
     await ctx.close();
   }

   // L1.43: public-only cold-cache performance lab (no production telemetry).
   // Fixed 1.5 Mbps / 120ms simulated network and 2x CPU; these numbers are
   // reproducible CI diagnostics, NOT claims about a real visitor's speed.
   const l143Samples=[];
   for(const width of [393,768,1440]){
     const ctx=await browser.newContext({
       viewport:{width,height:852},
       deviceScaleFactor:width===393?3:(width===768?2:1),
       isMobile:width===393,hasTouch:width===393,
       reducedMotion:'reduce',serviceWorkers:'block'
     });
     const page=await ctx.newPage(),failures=[];
     page.on('pageerror',e=>failures.push('JS '+e.message));
     page.on('requestfailed',r=>failures.push('Network '+r.url()+' '+r.failure()?.errorText));
     page.on('response',r=>{
       if(r.url().startsWith(origin)&&r.status()>=400)
         failures.push('HTTP '+r.status()+' '+r.url());
     });
     await page.addInitScript(()=>{
       window.__l143Perf={lcp:0,cls:0,lcpElement:null};
       try{
         new PerformanceObserver(list=>{
           for(const entry of list.getEntries()){
             window.__l143Perf.lcp=entry.startTime;
             window.__l143Perf.lcpElement=entry.element?.tagName||null;
           }
         }).observe({type:'largest-contentful-paint',buffered:true});
         new PerformanceObserver(list=>{
           for(const entry of list.getEntries()){
             if(!entry.hadRecentInput)window.__l143Perf.cls+=entry.value;
           }
         }).observe({type:'layout-shift',buffered:true});
       }catch(_){}
     });
     const cdp=await ctx.newCDPSession(page);
     await cdp.send('Network.enable');
     await cdp.send('Network.emulateNetworkConditions',{
       offline:false,latency:120,downloadThroughput:187500,uploadThroughput:62500
     });
     await cdp.send('Emulation.setCPUThrottlingRate',{rate:2});
     try{
       await page.goto(origin+'/',{waitUntil:'load',timeout:35000});
       await page.waitForTimeout(250);
       const sample=await page.evaluate(()=>{
         const paint=performance.getEntriesByType('paint');
         const nav=performance.getEntriesByType('navigation')[0];
         const resources=performance.getEntriesByType('resource')
           .filter(r=>r.name.startsWith(location.origin+'/'));
         const byFile=path=>resources.filter(r=>new URL(r.name).pathname===path);
         const hero=document.querySelector('.hero-device-cinematic');
         const heroArt=document.querySelector('.hero-art');
         const viewport=innerWidth;
         const header=document.querySelector('.site-header').getBoundingClientRect();
         const photo=byFile('/landing-assets/personal-business-concept.webp');
         const lake=byFile('/landing-assets/cinematic-lake.webp');
         const record={
           width:viewport,
           fcpMs:Math.round(paint.find(x=>x.name==='first-contentful-paint')?.startTime||0),
           lcpMs:Math.round(window.__l143Perf?.lcp||0),
           lcpElement:window.__l143Perf?.lcpElement||null,
           cls:Number((window.__l143Perf?.cls||0).toFixed(4)),
           domContentLoadedMs:Math.round(nav?.domContentLoadedEventEnd||0),
           loadMs:Math.round(nav?.loadEventEnd||0),
           resourceCount:resources.length,
           transferredBytes:resources.reduce((sum,r)=>sum+(r.transferSize||0),0),
           heroRequestCount:photo.length,
           heroEncodedBytes:photo.reduce((sum,r)=>sum+(r.encodedBodySize||0),0),
           lakeRequestCount:lake.length,
           cssRequests:resources.filter(r=>new URL(r.name).pathname.endsWith('.css')).length,
           headerRight:Math.round(header.right),
           heroDecoded:!!(hero?.complete&&hero?.naturalWidth>0),
           heroReady:heroArt?.classList.contains('is-photo-ready')||false
         };
         return record;
       });
       ensure(sample.width===width&&sample.fcpMs>0&&sample.lcpMs>0&&
         sample.loadMs>0&&sample.heroDecoded&&sample.heroReady&&
         sample.heroRequestCount>=1&&sample.heroRequestCount<=2&&
         sample.headerRight<=width+1&&sample.cssRequests>=6&&
         sample.cls<0.25&&failures.length===0,
         'L1.43 '+width+'px throttled cold-cache LCP/FCP/CLS/image baseline '+JSON.stringify({sample,failures}));
       l143Samples.push(sample);
     }finally{await ctx.close()}
   }
   const l143Report={
     version:'L1.43',
     method:'Chrome desktop CI with emulated 1.5 Mbps, 120ms latency, 2x CPU, cold cache',
     disclaimer:'Lab measurements only; not field Core Web Vitals, not a guaranteed speed gain',
     samples:l143Samples
   };
   fs.writeFileSync(path.join(screenshots,'performance-l143.json'),
     JSON.stringify(l143Report,null,2)+'\n');
   console.log('L1.43 PERFORMANCE LAB '+JSON.stringify(l143Report));

   // L1.42: hold the noncritical Business stylesheet on a slow connection.
   // The Hero must still finish parsing and rendering without waiting for it.
   for(const width of [393,768]){
     const ctx=await browser.newContext({viewport:{width,height:852},
       reducedMotion:'reduce',isMobile:width===393,hasTouch:width===393});
     const page=await ctx.newPage(),failures=[];
     page.on('pageerror',e=>failures.push(e.message));
     let releaseStyle;
     const heldStyle=new Promise(resolve=>{releaseStyle=resolve});
     let heldRequests=0;
     await page.route('**/landing-assets/business.css*',async route=>{
       heldRequests++;
       await heldStyle;
       await route.continue();
     });
     let early;
     try{
       await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:8500});
       early=await page.evaluate(()=>{
         const header=document.querySelector('.site-header').getBoundingClientRect();
         const heading=document.querySelector('#hero-title').getBoundingClientRect();
         const stylesheet=document.querySelector('link[href*="/landing-assets/business.css"]');
         const business=document.querySelector('#business').getBoundingClientRect();
         return {
           media:stylesheet?.media,handler:stylesheet?.getAttribute('onload'),
           heroVisible:heading.height>0&&heading.width>0&&
             getComputedStyle(document.querySelector('#hero-title')).display!=='none',
           headerRight:header.right,heroLeft:heading.left,heroTop:heading.top,
           businessTop:business.top
         };
       });
       ensure(heldRequests===1 && early.media==='print' &&
         early.handler==="this.onload=null;this.media='all'" &&
         early.heroVisible && early.headerRight<=width+1 &&
         early.heroLeft>=-1 && early.businessTop>852 &&
         failures.length===0,
         'L1.42 '+width+'px initial Hero renders while below-fold CSS is still held '+JSON.stringify({early,heldRequests,failures}));
     }finally{releaseStyle();}
     await page.waitForLoadState('load',{timeout:15000});
     await page.waitForFunction(()=>{
       const el=document.querySelector('link[href*="/landing-assets/business.css"]');
       return el?.media==='all'&&el.sheet?.cssRules.length>0;
     },{timeout:10000});
     const done=await page.evaluate(()=>{
       const business=document.querySelector('#business');
       const hero=document.querySelector('#hero-title').getBoundingClientRect();
       return {background:getComputedStyle(business).backgroundImage,
         heroLeft:hero.left,heroTop:hero.top,scrollX,
         businessHeight:business.getBoundingClientRect().height};
     });
     ensure(done.background!=='none'&&done.businessHeight>300&&
       Math.abs(done.heroLeft-early.heroLeft)<2 &&
       Math.abs(done.heroTop-early.heroTop)<2 &&
       done.scrollX===0&&failures.length===0,
       'L1.42 '+width+'px Business styles activate without shifting Hero '+JSON.stringify(done));
     await ctx.close();
   }

   // No-JavaScript users retain normal Business presentation via <noscript>.
   {
     const ctx=await browser.newContext({viewport:{width:393,height:852},javaScriptEnabled:false});
     const page=await ctx.newPage();
     await page.goto(origin+'/',{waitUntil:'load',timeout:25000});
     const state=await page.evaluate(()=>{
       const links=[...document.querySelectorAll('link[href*="/landing-assets/business.css"]')];
       const business=document.querySelector('#business');
       return {media:links.map(x=>x.media),
         loaded:links.some(x=>(x.media===''||x.media==='all')&&x.sheet?.cssRules.length>0),
         sectionHeight:business.getBoundingClientRect().height};
     });
     ensure(state.media.includes('print')&&(state.media.includes('all')||state.media.includes(''))&&
       state.loaded&&state.sectionHeight>300,
       'L1.42 no-script fallback retains styled Business concept '+JSON.stringify(state));
     await ctx.close();
   }

   // L1.41 — catch the post-deploy mixed-cache regression seen on small
   // screens. All first-party homepage CSS/JS must share this release key;
   // load all nine successfully while retaining a bounded mobile header.
   for(const width of [393,768,1440]){
     const context=await browser.newContext({
       viewport:{width,height:852},reducedMotion:'reduce',
       isMobile:width===393,hasTouch:width===393
     });
     const page=await context.newPage();
     const failures=[],loaded=[];
     page.on('pageerror',e=>failures.push(e.message));
     page.on('requestfailed',req=>failures.push(req.url()+' '+req.failure()?.errorText));
     page.on('response',r=>{
       const url=new URL(r.url());
       if(url.origin!==origin||!url.pathname.startsWith('/landing-assets/'))return;
       if(!/\.(css|js)$/.test(url.pathname))return;
       loaded.push({path:url.pathname,version:url.searchParams.get('v'),status:r.status()});
     });
     await load(page,'/',failures);
     const layout=await page.evaluate(()=>{
       const styles=[...document.querySelectorAll('link[rel="stylesheet"][href*="/landing-assets/"]')];
       const scripts=[...document.querySelectorAll('script[defer][src*="/landing-assets/"]')];
       const brand=document.querySelector('.site-header .brand').getBoundingClientRect();
       const hero=document.querySelector('.hero').getBoundingClientRect();
       const grid=document.querySelector('.showcase-grid').getBoundingClientRect();
       return {
         styles:styles.map(e=>new URL(e.href).searchParams.get('v')),
         scripts:scripts.map(e=>new URL(e.src).searchParams.get('v')),
         brand:{left:brand.left,right:brand.right,width:brand.width},
         hero:{left:hero.left,right:hero.right},
         grid:{left:grid.left,right:grid.right},
         viewport:innerWidth
       };
     });
     ensure(layout.styles.length===6&&layout.scripts.length===2 &&
       layout.styles.filter(v=>v==='l145').length===1 &&
       layout.styles.filter(v=>v==='l146').length===2 &&
       layout.styles.filter(v=>v==='l147').length===1 &&
       layout.styles.filter(v=>v==='l141').length===2 &&
       layout.scripts.every(v=>v==='l141') &&
       loaded.length===8 && loaded.every(r=>r.status===200&&
         r.version===(r.path==='/landing-assets/landing.min.css'?'l145':
           ['/landing-assets/cinematic.min.css','/landing-assets/premium-l131.min.css'].includes(r.path)?'l146':
           r.path==='/landing-assets/header-explore-l147.min.css'?'l147':'l141')) &&
       new Set(loaded.map(r=>r.path)).size===8 && failures.length===0,
       'L1.47 '+width+'px eight CSS/JS requests with consistent cache keys '+JSON.stringify({loaded,failures}));
     ensure(layout.brand.left>=-1&&layout.brand.right<=width+1 &&
       layout.brand.width<width*.8 &&
       layout.hero.left>=-1&&layout.hero.right<=width+1 &&
       layout.grid.left>=-1&&layout.grid.right<=width+1,
       'L1.41 '+width+'px header/Hero/cards stay inside viewport '+JSON.stringify(layout));
     await context.close();
   }

   // L1.16 — actual layout parity, not only matching class names. The same
   // header and both expanded menus must occupy the SAME positions when
   // switching between the Landing and each public introduction route.
   for(const [width,lang,routes] of [
     [393,'en',publicRoutes.slice(1)],
     [1440,'en',publicRoutes.slice(1)],
     [1100,'zh',['/about/','/features/','/business/']],
     [393,'my',['/about/','/features/','/business/']]
   ]){
     const ctx=await browser.newContext({viewport:{width,height:852},
       deviceScaleFactor:1,reducedMotion:'reduce'});
     const page=await ctx.newPage();
     await page.addInitScript(language=>{
       try{localStorage.setItem('mmhvault.landing.language',language)}catch(_){}
     },lang);
     async function geometry(){
       return page.evaluate(()=>{
         const selectors={
           outer:'.site-header',row:'.site-header .header-inner',
           brand:'.site-header .brand',symbol:'.site-header .brand-symbol',
           wordmark:'.site-header .brand-copy strong',
           brandCaption:'.site-header .brand-copy small',
           links:'.site-header #primary-nav',
           actions:'.site-header .header-actions',
           locale:'.site-header .locale-trigger',
           signin:'.site-header .signin-link',
           started:'.site-header .header-cta',
           toggle:'.site-header .menu-toggle',
           explore:'.site-header .nav-explore>summary',
           dropdown:'.site-header .nav-explore-menu'
         };
         const output={};
         for(const [name,selector] of Object.entries(selectors)){
           const el=document.querySelector(selector);
           if(!el){output[name]={missing:true};continue;}
           const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
           output[name]={
             rect:[rect.x,rect.y,rect.width,rect.height]
               .map(n=>Math.round(n*2)/2),
             display:style.display,position:style.position,
             font:style.fontSize,color:style.color,
             background:style.backgroundColor,
             padding:style.padding,gap:style.gap
           };
         }
         output.menuLabel=document.querySelector('.site-header .nav-explore>summary')?.textContent.trim();
         return output;
       });
     }
     await page.goto(origin+'/',{waitUntil:'load'});
     const baseline=await geometry();
     for(const route of routes){
       await page.goto(origin+route,{waitUntil:'load'});
       const actual=await geometry();
       const diffs=[];
       for(const key of Object.keys(baseline)){
         if(key==='menuLabel'){
           if(baseline[key]!==actual[key])diffs.push(key+': '+baseline[key]+' != '+actual[key]);
           continue;
         }
         if(!actual[key]||actual[key].missing){diffs.push(key+' missing');continue;}
         for(const prop of ['display','position','font','color','background','padding','gap']){
           if(baseline[key][prop]!==actual[key][prop])
             diffs.push(key+'.'+prop+': '+baseline[key][prop]+' / '+actual[key][prop]);
         }
         for(let n=0;n<4;n++){
           if(Math.abs(baseline[key].rect[n]-actual[key].rect[n])>1.5)
             diffs.push(key+'.rect['+n+']: '+baseline[key].rect[n]+' / '+actual[key].rect[n]);
         }
       }
       ensure(diffs.length===0,
         'L1.16 '+width+'px '+lang+' '+route+' header identical to Landing '+JSON.stringify(diffs.slice(0,15)));
     }
     const compact=width<=1360;
     async function menuGeometry(){
       if(compact)await page.locator('.site-header .menu-toggle').click();
       await page.locator('#landing-explore > summary').click();
       const shot=await geometry();
       shot.linksText=await page.locator('#landing-explore .nav-explore-menu a').allTextContents();
       return shot;
     }
     await page.goto(origin+'/',{waitUntil:'load'});
     const openLanding=await menuGeometry();
     await page.goto(origin+'/about/',{waitUntil:'load'});
     const openAbout=await menuGeometry();
     const openDiffs=[];
     for(const key of ['links','dropdown','toggle','outer','row','explore']){
       for(let n=0;n<4;n++){
         if(Math.abs(openLanding[key].rect[n]-openAbout[key].rect[n])>1.5)
           openDiffs.push(key+': '+JSON.stringify(openLanding[key].rect)+' vs '+JSON.stringify(openAbout[key].rect));
       }
     }
     ensure(openDiffs.length===0&&
       JSON.stringify(openLanding.linksText)===JSON.stringify(openAbout.linksText),
       'L1.16 '+width+'px '+lang+' both expanded menus match geometry and text '+JSON.stringify(openDiffs));
     if(lang==='en'){
       await page.screenshot({path:path.join(screenshots,
         'l116-shared-about-open-'+width+'.png'),fullPage:false,animations:'disabled'});
     }
     await ctx.close();
   }

   // L1.37: same-origin tabs must stay in one public display language without
   // reloads, flicker, scroll navigation, or rewriting the permanent Hero.
   for(const width of [393,1440]){
     const ctx=await browser.newContext({viewport:{width,height:852},reducedMotion:'reduce'});
     const home=await ctx.newPage();
     const features=await ctx.newPage();
     const errors=[];
     for(const page of [home,features])page.on('pageerror',e=>errors.push(e.message));
     await load(home,'/',errors);
     await load(features,'/features/',errors);
     const fixedHero=await home.locator('[data-hero-fixed]').allTextContents();
     await home.locator('#locale-trigger').click();
     await home.locator('#locale-menu button[data-lang="zh"]').click();
     await features.waitForFunction(()=>document.documentElement.lang==='zh-CN');
     ensure((await features.locator('.locale-active-name').textContent()).trim()==='中文' &&
       (await features.locator('.locale-active-flag').textContent()).trim()==='🇨🇳',
       'L1.37 '+width+'px Landing zh selection updates open Features tab without reload');
     await features.locator('#locale-trigger').click();
     await features.locator('#locale-menu button[data-lang="my"]').click();
     await home.waitForFunction(()=>document.documentElement.lang==='my');
     ensure((await home.locator('.locale-active-name').textContent()).trim()==='မြန်မာ' &&
       (await home.locator('.locale-active-flag').textContent()).trim()==='🇲🇲' &&
       JSON.stringify(await home.locator('[data-hero-fixed]').allTextContents())===JSON.stringify(fixedHero),
       'L1.37 '+width+'px Features my selection updates Landing but never its fixed Hero');
     await features.locator('#locale-trigger').click();
     await features.locator('#locale-menu button[data-lang="en"]').click();
     await home.waitForFunction(()=>document.documentElement.lang==='en');
     ensure((await home.locator('.locale-active-name').textContent()).trim()==='English' &&
       JSON.stringify(await home.locator('[data-hero-fixed]').allTextContents())===JSON.stringify(fixedHero) &&
       errors.length===0,
       'L1.37 '+width+'px repeated cross-tab language changes stay stable and error-free');
     await ctx.close();
   }

   // L1.38: consistent gentle panel motion on Landing and public pages,
   // including the phone language picker, Explore menu and compact nav.
   for(const route of ['/','/features/']){
     for(const motion of ['no-preference','reduce']){
       const ctx=await browser.newContext({
         viewport:{width:393,height:852},reducedMotion:motion
       });
       const page=await ctx.newPage();
       const failures=[];
       page.on('pageerror',error=>failures.push(error.message));
       await load(page,route,failures);
       const locale=page.locator('#locale-menu');
       await page.locator('#locale-trigger').click();
       const state=await locale.evaluate(el=>{
         const css=getComputedStyle(el),r=el.getBoundingClientRect();
         return {animation:css.animationName,duration:parseFloat(css.animationDuration),
           blur:css.backdropFilter||css.webkitBackdropFilter,
           x:r.left,right:r.right,width:innerWidth};
       });
       ensure(state.blur.includes('24px')&&
         (motion==='reduce'
           ? state.animation==='none'
           : state.animation.includes('mmh-public-panel-in')&&Math.abs(state.duration-.22)<.02)&&
         state.x>=-1&&state.right<=state.width+1,
         'L1.38 '+route+' '+motion+' 393px stable language panel '+JSON.stringify(state));
       await page.keyboard.press('Escape');
       await page.locator('.menu-toggle').click();
       const navigation=await page.locator('#primary-nav').evaluate(el=>{
         const css=getComputedStyle(el),r=el.getBoundingClientRect();
         return {animation:css.animationName,duration:parseFloat(css.animationDuration),
           x:r.left,right:r.right,width:innerWidth};
       });
       ensure((motion==='reduce'
           ? navigation.animation==='none'
           : navigation.animation.includes('mmh-public-panel-in')&&Math.abs(navigation.duration-.22)<.02)&&
         navigation.x>=-1&&navigation.right<=navigation.width+1&&failures.length===0,
         'L1.38 '+route+' '+motion+' 393px stable nav panel '+JSON.stringify(navigation));
       await ctx.close();
     }
   }

   // L1.25 — emulate slow image decoding independently of network speed.
   // The HTML mockup must remain on screen until decoded pixels are ready,
   // even when image.complete and naturalWidth already indicate download.
   for(const width of [320,393,768,1440]){
     const ctx=await browser.newContext({
       viewport:{width,height:852},reducedMotion:'reduce',
       isMobile:width<=393,hasTouch:width<=393
     });
     const page=await ctx.newPage();
     const errors=[];
     page.on('pageerror',e=>errors.push(e.message));
     await page.addInitScript(()=>{
       const nativeDecode=HTMLImageElement.prototype.decode;
       window.__mmhHeroDecodeTest={calls:0,release:null};
       HTMLImageElement.prototype.decode=function(){
         if(!this.classList.contains('hero-device-cinematic'))
           return nativeDecode.call(this);
         window.__mmhHeroDecodeTest.calls+=1;
         return nativeDecode.call(this).then(()=>new Promise(resolve=>{
           window.__mmhHeroDecodeTest.release=resolve;
         }));
       };
     });
     await load(page,'/',errors);
     await page.waitForFunction(()=>typeof window.__mmhHeroDecodeTest?.release==='function',
       {timeout:15000});
     const held=await page.evaluate(()=>{
       const image=document.querySelector('.hero-device-cinematic');
       const art=image.closest('.hero-art');
       return {
         complete:image.complete,naturalWidth:image.naturalWidth,
         decoded:art.classList.contains('is-photo-ready'),
         calls:window.__mmhHeroDecodeTest.calls,
         fallbackVisible:getComputedStyle(art.querySelector('.desktop-frame')).display!=='none',
         x:scrollX
       };
     });
     ensure(held.complete&&held.naturalWidth>0&&!held.decoded&&
       held.calls===1&&held.fallbackVisible&&held.x===0,
       width+'px Hero keeps original mockup until photo decode '+JSON.stringify(held));
     const scroll=await page.evaluate(()=>{
       window.scrollTo({top:Math.min(180,Math.max(0,document.documentElement.scrollHeight-innerHeight)),
         behavior:'instant'});
       return {x:scrollX,y:scrollY};
     });
     await page.evaluate(()=>window.__mmhHeroDecodeTest.release());
     await page.waitForFunction(()=>
       document.querySelector('.hero-art')?.classList.contains('is-photo-ready'));
     const after=await page.evaluate(()=>({x:scrollX,y:scrollY,
       decoded:document.querySelector('.hero-art').classList.contains('is-photo-ready')}));
     ensure(after.decoded&&after.x===0&&Math.abs(after.y-scroll.y)<=2,
       width+'px decoded Hero reveals without horizontal or vertical scroll jump '+
       JSON.stringify({before:scroll,after}));
     ensure(errors.length===0,width+'px slow decoding has no JS exceptions');
     await ctx.close();
   }
   // L1.40: test ordinary-motion rendering too (the previous decode suite
   // runs with reduced motion, which cannot detect an accidental 300ms gap).
   // On <=900px the decoded photo must be instantly opaque when the fallback
   // is removed; on desktop the original cinematic rule stays untouched.
   for(const width of [320,393,768,1440]){
     const ctx=await browser.newContext({
       viewport:{width,height:852},reducedMotion:'no-preference',
       isMobile:width<=393,hasTouch:width<=393
     });
     const page=await ctx.newPage();
     const errors=[];
     page.on('pageerror',e=>errors.push(e.message));
     await load(page,'/',errors);
     await page.waitForFunction(()=>
       document.querySelector('.hero-art')?.classList.contains('is-photo-ready'));
     const state=await page.evaluate(()=>{
       const art=document.querySelector('.hero-art');
       const image=art.querySelector('.hero-device-cinematic');
       const frame=art.querySelector('.desktop-frame');
       const style=getComputedStyle(image);
       return {
         ready:art.classList.contains('is-photo-ready'),
         duration:style.transitionDuration,
         opacity:style.opacity,
         display:style.display,
         fallbackDisplay:getComputedStyle(frame).display,
         x:scrollX,docWidth:document.documentElement.scrollWidth,viewport:innerWidth
       };
     });
     const mobile=width<=900;
     ensure(state.ready && errors.length===0 &&
       state.fallbackDisplay==='none' &&
       (mobile
         ? state.opacity==='1'&&state.display!=='none'&&state.duration==='0s'
         : state.display==='none'&&state.duration==='0.3s') &&
       state.x===0 && state.docWidth<=state.viewport+2,
       'L1.40 '+width+'px decoded Hero avoids phone opacity gap while desktop stays original '+
       JSON.stringify(state));
     await ctx.close();
   }

   // A genuine decode failure must leave accessible HTML in place rather
   // than dismissing the fallback and showing an empty Hero.
   {
     const ctx=await browser.newContext({
       viewport:{width:393,height:852},reducedMotion:'reduce',isMobile:true,hasTouch:true
     });
     const page=await ctx.newPage();
     const errors=[];
     page.on('pageerror',e=>errors.push(e.message));
     await page.addInitScript(()=>{
       const nativeDecode=HTMLImageElement.prototype.decode;
       window.__mmhFailedDecodeCalls=0;
       HTMLImageElement.prototype.decode=function(){
         if(!this.classList.contains('hero-device-cinematic'))
           return nativeDecode.call(this);
         window.__mmhFailedDecodeCalls++;
         return Promise.reject(new DOMException('simulated failed decode','EncodingError'));
       };
     });
     await load(page,'/',errors);
     await page.waitForFunction(()=>window.__mmhFailedDecodeCalls>0);
     const fallback=await page.evaluate(()=>{
       const art=document.querySelector('.hero-art');
       return {
         decoded:art.classList.contains('is-photo-ready'),
         hasFallback:!!art.querySelector('.desktop-frame'),
         fallbackVisible:getComputedStyle(art.querySelector('.desktop-frame')).display!=='none',
         calls:window.__mmhFailedDecodeCalls
       };
     });
     ensure(!fallback.decoded&&fallback.hasFallback&&fallback.fallbackVisible&&
       fallback.calls===1&&errors.length===0,
       '393px failed image decode keeps HTML device demo '+JSON.stringify(fallback));
     await ctx.close();
   }

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
     // L1.24 — preload should point to the actual Hero visual, not a
     // separately painted lake background. The below-fold business image
     // stays lazy; all paths and the original Hero layout stay unchanged.
     if([320,393,1440].includes(width)){
       const loading=await page.evaluate(()=>{
         const preloads=[...document.querySelectorAll('link[rel="preload"][as="image"]')];
         const hero=document.querySelector('img.hero-device-cinematic');
         const business=document.querySelector('.business-visual-frame img');
         return {
           preloadCount:preloads.length,
           preloadHref:preloads[0]?.href,
           preloadType:preloads[0]?.type,
           preloadPriority:preloads[0]?.getAttribute('fetchpriority'),
           imageSrc:hero?.currentSrc,
           imagePriority:hero?.getAttribute('fetchpriority'),
           imageReady:!!(hero?.complete&&hero?.naturalWidth>0),
           imageSize:[hero?.getAttribute('width'),hero?.getAttribute('height')],
           businessLazy:business?.getAttribute('loading'),
           businessAsync:business?.getAttribute('decoding'),
           businessSrc:business?.src
         };
       });
       ensure(loading.preloadCount===1&&
         loading.preloadHref===loading.imageSrc&&
         loading.preloadType==='image/webp'&&
         loading.preloadPriority==='high'&&
         loading.imagePriority==='high'&&loading.imageReady&&
         JSON.stringify(loading.imageSize)===JSON.stringify(['1600','900'])&&
         loading.businessLazy==='lazy'&&loading.businessAsync==='async'&&
         loading.businessSrc===loading.imageSrc,
         width+'px first-screen photo preloads once and below-fold image remains lazy '+JSON.stringify(loading));
     }
     // L1.19 — tiny phone CTAs remain touchable without text clipping.
     if(width<=620){
       const ctas=await page.locator('.hero .hero-buttons .button').evaluateAll(els=>
         els.map(el=>{const r=el.getBoundingClientRect();return {
           height:r.height,width:r.width,left:r.left,right:r.right,
           scrollWidth:el.scrollWidth,clientWidth:el.clientWidth
         }}));
       ensure(ctas.length===2&&ctas.every(x=>
         x.height>=47&&x.width>95&&x.left>=-2&&x.right<=width+2&&
         x.scrollWidth<=x.clientWidth+3),
         width+'px Landing CTAs fit and retain 48px touch targets '+JSON.stringify(ctas));
     }
     ensure(await page.locator('h1#hero-title').count()===1,width+'px single homepage H1');
     ensure(await page.locator('.hero-device-cinematic').evaluate(img=>img.complete&&img.naturalWidth>0),
       width+'px concept Hero photograph loaded');
     if(width>=1361){
       const header=await page.evaluate(()=>{
         const brand=document.querySelector('.site-header .brand').getBoundingClientRect();
         const nav=document.querySelector('#primary-nav').getBoundingClientRect();
         const actions=document.querySelector('.site-header .header-actions').getBoundingClientRect();
         return {brandRight:Math.round(brand.right),navLeft:Math.round(nav.left),
           navRight:Math.round(nav.right),actionsLeft:Math.round(actions.left),
           navHeight:Math.round(nav.height),navTop:Math.round(nav.top),
           actionsTop:Math.round(actions.top)};
       });
       ensure(header.brandRight<=header.navLeft+3 &&
         header.navRight<=header.actionsLeft+3 &&
         Math.abs(header.navTop-header.actionsTop)<32 &&
         header.navHeight<=70,
         width+'px six-item desktop navigation remains one line '+JSON.stringify(header));
       ensure(await page.locator('#landing-explore > summary').isVisible(),
         width+'px Explore disclosure visible on desktop');
     }else{
       ensure(await page.locator('.site-header .menu-toggle').isVisible(),
         width+'px responsive compact menu replaces overflowing six-item nav');
     }
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

     // L1.32: language selection must translate the six product names and
     // current story, without mutating the official English SEO snippet.
     const canonicalEnglishDescription=await page.locator('meta[name="description"]')
       .getAttribute('content');
     const expectedFeatureNames={
       en:['Dashboard','Transactions','Accounts','Invest','Analyze','Life Planner'],
       zh:['财务总览','收支记录','账户管理','投资组合','财务分析','生活规划'],
       my:['အကျဉ်းချုပ်','ငွေစာရင်း','အကောင့်များ','ရင်းနှီးမြှုပ်နှံမှု','စိစစ်ချက်','ဘဝအစီအစဉ်']
     };
     // L1.33: Myanmar labels use a readable native-script font and line
     // rhythm without clipping in the compact two-column feature chooser.
     // English and Chinese have no new styles or dimensions.
     // User-requested fixed multilingual Hero must not change with language.
     const immutable=await page.locator('[data-hero-fixed]').allTextContents();
     for(const language of ['zh','my','en']){
       await page.locator('#locale-trigger').click();
       await page.locator('#locale-menu button[data-lang="'+language+'"]').click();
       const after=await page.locator('[data-hero-fixed]').allTextContents();
       ensure(JSON.stringify(after)===JSON.stringify(immutable),
         width+'px fixed three-language Hero remains unchanged in '+language);
       const exploreLabels={en:'Explore',zh:'了解更多',my:'ပိုမိုလေ့လာရန်'};
       ensure((await page.locator('#landing-explore > summary [data-i18n="navExplore"]').textContent()).trim()===exploreLabels[language],
         width+'px Explore translated correctly in '+language);
       const featureNames=(await page.locator('.product-tab-copy strong').allTextContents())
         .map(s=>s.trim());
       const storyName=(await page.locator('[data-app-story-title]').textContent()).trim();
       ensure(JSON.stringify(featureNames)===JSON.stringify(expectedFeatureNames[language]) &&
         storyName===expectedFeatureNames[language][0],
         'L1.32 '+width+'px '+language+' feature tabs and story fully translated '+
           JSON.stringify({featureNames,storyName}));
       if(language==='my'&&[320,393,440,768,1440].includes(width)){
         const typography=await page.locator('.features-explorer.app-showcase')
           .evaluate(root=>{
             const tabs=[...root.querySelectorAll('.product-tab')];
             const names=tabs.map(tab=>{
               const label=tab.querySelector('.product-tab-copy strong');
               const style=getComputedStyle(label);
               const r=label.getBoundingClientRect();
               const t=tab.getBoundingClientRect();
               return {
                 font:style.fontFamily,letterSpacing:style.letterSpacing,
                 fontSize:parseFloat(style.fontSize),
                 lineHeight:parseFloat(style.lineHeight),
                 overflowWrap:style.overflowWrap,wordBreak:style.wordBreak,
                 minHeight:parseFloat(getComputedStyle(tab).minHeight),
                 fits:r.right<=t.right+2&&r.left>=t.left-2,
                 textFits:label.scrollWidth<=label.clientWidth+2,
                 height:t.height
               };
             });
             const h3=getComputedStyle(root.querySelector('.app-story h3'));
             return {names,storyFont:h3.fontFamily,storyLineHeight:parseFloat(h3.lineHeight),
               storyFontSize:parseFloat(h3.fontSize),horizontalScroll:scrollX};
           });
         ensure(typography.names.length===6&&typography.names.every(m=>
           m.font.includes('Noto Sans Myanmar')&&['normal','0px'].includes(m.letterSpacing)&&
           m.lineHeight/m.fontSize>=1.75&&m.overflowWrap==='anywhere'&&
           m.wordBreak==='normal'&&m.fits&&m.textFits&&
           (width>620||m.minHeight>=75))&&
           typography.storyFont.includes('Noto Sans Myanmar')&&
           typography.storyLineHeight/typography.storyFontSize>=1.6&&
           typography.horizontalScroll===0,
           'L1.33 '+width+'px Burmese showcase typography fits with readable line spacing '+
             JSON.stringify(typography));
       }
     // L1.34: EN / ZH / MY switch must never shrink mobile chooser cards or
     // truncate a translated title. The Hero and document scroll remain native.
     if([320,393,440].includes(width)){
       const mobileCards=await page.locator('.features-explorer.app-showcase .product-tab')
         .evaluateAll(tabs=>tabs.map(tab=>{
           const strong=tab.querySelector('.product-tab-copy strong');
           const card=getComputedStyle(tab);
           return {minHeight:parseFloat(card.minHeight),
             textFits:strong.scrollWidth<=strong.clientWidth+2,
             cardFits:tab.scrollWidth<=tab.clientWidth+3};
         }));
       ensure(mobileCards.length===6&&mobileCards.every(card=>
           card.minHeight>=93&&card.textFits&&card.cardFits),
         'L1.34 '+width+'px '+language+' stable mobile feature buttons '+
           JSON.stringify(mobileCards));
     }
       // L1.35: compact header uses the CURRENT locale flag, not a static
       // globe. The tap target stays unchanged across all three languages.
       if(width<=700){
         const indicator=await page.locator('.site-header .locale-trigger').evaluate(btn=>{
           const flag=btn.querySelector('.locale-active-flag');
           const globe=btn.querySelector('.locale-globe');
           const bounds=btn.getBoundingClientRect();
           const icon=flag.getBoundingClientRect();
           return {flag:flag.textContent.trim(),flagVisible:getComputedStyle(flag).display!=='none',
             globeHidden:getComputedStyle(globe).display==='none',
             width:Math.round(bounds.width),height:Math.round(bounds.height),
             centered:Math.abs((icon.left+icon.width/2)-(bounds.left+bounds.width/2))<=4};
         });
         const expected={en:'🇬🇧',zh:'🇨🇳',my:'🇲🇲'}[language];
         ensure(indicator.flag===expected&&indicator.flagVisible&&indicator.globeHidden&&
           indicator.width===44&&indicator.height===44&&
           indicator.centered,
           'L1.35 '+width+'px '+language+' mobile selected language remains visible and centered '+
           JSON.stringify(indicator));
       }
       // L1.36: both compact header buttons meet a comfortable 44px touch
       // target at 320/393/440px, without moving outside the viewport.
       if(width<=700){
         const targets=await page.locator('.site-header .header-actions').evaluate(root=>
           ['.locale-trigger','.menu-toggle'].map(selector=>{
             const el=root.querySelector(selector),r=el.getBoundingClientRect();
             return {selector,width:Math.round(r.width),height:Math.round(r.height),
               left:Math.round(r.left),right:Math.round(r.right),
               visible:getComputedStyle(el).display!=='none'};
           }));
         ensure(targets.length===2&&targets.every(t=>t.visible&&t.width>=44&&t.height>=44&&
           t.left>=0&&t.right<=width+1),
           'L1.36 '+width+'px '+language+' compact header buttons have 44px touch area '+
           JSON.stringify(targets));
       }
       if(language==='en'){
         const englishDescription=await page.locator('meta[name="description"]')
           .getAttribute('content');
         ensure(englishDescription===canonicalEnglishDescription &&
           englishDescription.includes('official personal finance and wealth management website'),
           'L1.32 '+width+'px restores canonical English SEO description');
       }
     }
     await page.locator('[data-product-tab="accounts"]').click();
     ensure(await page.locator('[data-product-tab="accounts"]').getAttribute('aria-selected')==='true',
       width+'px Accounts feature tab responds');
     ensure(await page.locator('[data-product-panel="accounts"]').isVisible(),
       width+'px Accounts concept panel displayed');
     if([320,393,1440].includes(width)){
       for(const language of ['zh','my','en']){
         await page.locator('#locale-trigger').click();
         await page.locator('#locale-menu button[data-lang="'+language+'"]').click();
         const selectedTitle=(await page.locator('[data-app-story-title]').textContent()).trim();
         const accountTab=(await page.locator('[data-product-tab="accounts"] .product-tab-copy strong')
           .textContent()).trim();
         ensure(selectedTitle===expectedFeatureNames[language][2] &&
           accountTab===selectedTitle &&
           await page.locator('[data-product-tab="accounts"]').getAttribute('aria-selected')==='true',
           'L1.32 '+width+'px active Accounts story stays translated in '+language);
       }
     }
     // L1.21 — accessible instant swap for reduced-motion preference.
     const settled=await page.locator('[data-product-panel]').evaluateAll(panels=>({
       visible:panels.filter(p=>!p.hidden).map(p=>p.dataset.productPanel),
       animated:panels.some(p=>p.classList.contains('mmh-preview-enter')||
         p.classList.contains('mmh-preview-exit')),
       inactiveInert:panels.filter(p=>p.hidden).every(p=>p.inert),
       selectedAria:panels.find(p=>!p.hidden)?.getAttribute('aria-hidden')
     }));
     ensure(JSON.stringify(settled.visible)===JSON.stringify(['accounts']) &&
       !settled.animated && settled.inactiveInert && settled.selectedAria==='false',
       width+'px reduced-motion preview shows one accessible panel with no crossfade');

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
       // L1.19 — public detail CTA layout adapts to narrow phones and tablets.
       if(['/about/','/features/','/register/'].includes(route)&&width<=600){
         const actions=await page.locator('.feature-hero .actions').evaluate(el=>{
           const links=[...el.querySelectorAll('.action')].map(a=>{
             const r=a.getBoundingClientRect();
             return {left:r.left,right:r.right,top:r.top,height:r.height,width:r.width,
               scrollWidth:a.scrollWidth,clientWidth:a.clientWidth};
           });
           return {display:getComputedStyle(el).display,links};
         });
         ensure(actions.display==='grid'&&actions.links.length>=1&&
           actions.links.every(x=>x.height>=49&&x.left>=-2&&
             x.right<=width+2&&x.scrollWidth<=x.clientWidth+3),
           route+' '+width+'px responsive public CTA touch targets '+JSON.stringify(actions));
         if(actions.links.length>=2&&[320,393].includes(width)){
           const [one,two]=actions.links;
           ensure(width===320
             ? Math.abs(one.left-two.left)<=2&&two.top>=one.top+one.height-2
             : Math.abs(one.top-two.top)<=2&&Math.abs(one.width-two.width)<=2,
             route+' '+width+'px action columns adapt without clipping');
         }
       }
       if(['/privacy.html','/security.html','/terms.html'].includes(route)&&width<=600){
         const related=await page.locator('.policy-related a').evaluateAll(els=>
           els.map(el=>el.getBoundingClientRect().height));
         ensure(related.every(height=>height>=47),
           route+' '+width+'px related-policy touch targets remain accessible');
       }
       ensure(!await page.locator('body').evaluate(b=>b.classList.contains('mm-public-motion')),
         route+' '+width+'px reduced-motion page never activates reveal');
       ensure(await page.locator('h1').count()===1,route+' '+width+'px has one H1');
       // L1.20 — public search metadata is parseable and tied to the official
       // parent website, without changing any existing UI or account paths.
       if([393,1440].includes(width)&&[
         '/features/','/register/','/security.html','/privacy.html','/terms.html'
       ].includes(route)){
         const semantic=await page.evaluate(()=>{
           const nodes=[...document.querySelectorAll('script[data-mmh-l120="webpage"]')];
           if(nodes.length!==1)return {count:nodes.length};
           const data=JSON.parse(nodes[0].textContent);
           const entity=data['@graph']?.find(x=>x['@type']==='WebPage');
           return {
             count:nodes.length,
             type:entity?.['@type'],
             id:entity?.['@id'],
             url:entity?.url,
             parent:entity?.isPartOf?.['@id'],
             about:entity?.about?.['@id'],
             canonical:document.querySelector('link[rel="canonical"]')?.href,
             breadcrumbs:data['@graph']?.filter(x=>x['@type']==='BreadcrumbList').length
           };
         });
         const expectedUrl='https://mmhvault.com'+route;
         ensure(semantic.count===1 && semantic.type==='WebPage' &&
           semantic.id===expectedUrl+'#page' &&
           semantic.url===expectedUrl && semantic.canonical===expectedUrl &&
           semantic.parent==='https://mmhvault.com/#website' &&
           semantic.about==='https://mmhvault.com/#'+(
             ['/features/','/register/'].includes(route)?'software':'brand') &&
           (['/features/','/register/'].includes(route)||semantic.breadcrumbs===1),
           route+' '+width+'px official site semantic graph '+JSON.stringify(semantic));
       }

       ensure(await page.locator('link[rel="canonical"]').count()===1,
         route+' '+width+'px canonical unique');
       // L1.17 — neither Chinese nor Burmese should be simultaneously
       // rendered in the highlighted bottom summary of an English page.
       // One live paragraph must track the user-selected locale.
       const localized=['/features/','/register/'].includes(route);
       const localizedBlock=page.locator('.lang-summary-localized');
       if(localized){
         ensure(await localizedBlock.count()===1 &&
           await localizedBlock.locator('p').count()===1 &&
           await localizedBlock.locator('p[lang]').count()===0,
           route+' '+width+'px only one language paragraph exists');
         const p=localizedBlock.locator('p');
         ensure((await p.textContent()).trim()===(await p.getAttribute('data-en')) &&
           await p.isVisible(),
           route+' '+width+'px default summary is English only');
       }else{
         ensure(await page.locator('.lang-summary').count()===0,
           route+' has no static bilingual summary');
       }
       if(route==='/business/'){
         ensure(await page.locator('body.business-page').count()===1,
           route+' dedicated concept page, not private business.html');
         ensure(await page.locator('.business-availability').count()===1,
           route+' preview-only status visible');
         ensure(await page.locator('link[rel="canonical"]').getAttribute('href')==='https://mmhvault.com/business/',
           route+' canonical targets own route');
         ensure(await page.locator('header #landing-explore a[href="/business/"]').count()===1,
           route+' Business appears in identical Explore listing');
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
           const bar=document.querySelector('header .header-inner').getBoundingClientRect();
           const brand=document.querySelector('header .brand').getBoundingClientRect();
           const nav=document.querySelector('header #primary-nav').getBoundingClientRect();
           const actions=document.querySelector('header .header-actions').getBoundingClientRect();
           return {barHeight:Math.round(bar.height),brandRight:Math.round(brand.right),
             brandTop:Math.round(brand.top),brandBottom:Math.round(brand.bottom),
             navLeft:Math.round(nav.left),navRight:Math.round(nav.right),
             navTop:Math.round(nav.top),navHeight:Math.round(nav.height),
             actionsLeft:Math.round(actions.left),actionsTop:Math.round(actions.top),
             actionsBottom:Math.round(actions.bottom)};
         });
         ensure(header.barHeight<=112&&header.brandRight<=header.actionsLeft+4 &&
           header.brandTop<=header.actionsBottom+8&&header.actionsTop<=header.brandBottom+8,
           route+' '+width+'px header on one row '+JSON.stringify(header));
         const explore=page.locator('header #landing-explore');
         if(width<=1360){
           ensure(await page.locator('header .menu-toggle').isVisible(),
             route+' '+width+'px hamburger visible');
           ensure(!await page.locator('header #primary-nav').isVisible(),
             route+' '+width+'px compact menu starts closed');
           await page.locator('header .menu-toggle').click();
           ensure(await page.locator('header .menu-toggle').getAttribute('aria-expanded')==='true'&&
             await page.locator('header #primary-nav').isVisible(),
             route+' '+width+'px compact navigation opens');
           ensure(await page.locator('header #primary-nav>a[href="/#business"]').isVisible()&&
             await page.locator('header #primary-nav>a[href="/#security"]').isVisible(),
             route+' '+width+'px Business/Security follow Landing sections');
           await explore.locator('summary').click();
           ensure(await explore.evaluate(d=>d.open)&&
             await explore.locator('a[href="/business/"]').isVisible()&&
             await explore.locator('a[href="/features/"]').isVisible(),
             route+' '+width+'px Explore contains public introduction routes');
           await page.keyboard.press('Escape');
           ensure(!await explore.evaluate(d=>d.open),
             route+' '+width+'px Escape closes Explore');
           await page.keyboard.press('Escape');
           ensure(!await page.locator('header #primary-nav').isVisible(),
             route+' '+width+'px Escape closes hamburger');
         }else{
           ensure(await page.locator('header #primary-nav').isVisible()&&
             await page.locator('header #primary-nav>a[href="/#business"]').isVisible(),
             route+' '+width+'px desktop six-item navigation visible');
           ensure(header.brandRight<=header.navLeft+4&&
             header.navRight<=header.actionsLeft+4&&
             header.navHeight<=70&&Math.abs(header.navTop-header.actionsTop)<32,
             route+' '+width+'px no desktop navigation wrap '+JSON.stringify(header));
           await explore.locator('summary').click();
           ensure(await explore.locator('a[href="/about/"]').isVisible(),
             route+' '+width+'px desktop Explore opens');
           await page.keyboard.press('Escape');
           ensure(!await explore.evaluate(d=>d.open),
             route+' '+width+'px desktop Explore Escape');
         }
         if([393,1100,1366,1440].includes(width)){
           await page.screenshot({path:path.join(screenshots,
             'unified-header-'+route.replace(/\W/g,'-')+'-'+width+'.png'),
             fullPage:false,animations:'disabled'});
         }
       }
       if(['/register/','/features/','/about/','/business/'].includes(route)){
         ensure(await page.locator('body.public-landing-page .feature-hero').count()===1,
           route+' inherited premium Landing shell');
         ensure(await page.locator('header .brand-copy').isVisible(),
           route+' shared Landing wordmark is visible');
         ensure(await page.locator('header .header-cta').getAttribute('href')==='/login.html',
           route+' Get Started goes only to existing secure access');
         ensure(await page.locator('.page-breadcrumb a').getAttribute('href')==='/',
           route+' clearly linked as a Landing subpage');
       }
       if(['/register/','/features/','/about/','/business/'].includes(route)&&[320,393,768,1100,1290,1291,1440].includes(width)){
         const trigger=page.locator('#locale-trigger');
         const localeName=page.locator('.locale-active-name');
         if([393,1100,1290,1291,1440].includes(width)){
           await page.screenshot({path:path.join(screenshots,
             route.replaceAll('/','')+'-'+width+'-en.png'),fullPage:true,animations:'disabled'});
         }
         await trigger.click();
         ensure(await trigger.getAttribute('aria-expanded')==='true',route+' language menu opens at '+width);
         await page.locator('#locale-menu button[data-lang="zh"]').click();
         ensure(await localeName.textContent()==='中文' && await page.locator('h1').isVisible(),
           route+' Chinese language updates menu and title');
         if(localized){
           const p=localizedBlock.locator('p');
           ensure((await p.textContent()).trim()===(await p.getAttribute('data-zh')) &&
             await localizedBlock.locator('p').count()===1,
             route+' '+width+'px Chinese selection displays Chinese statement only');
         }
         ensure(await trigger.getAttribute('aria-expanded')==='false',route+' language menu closes on selection');
         await trigger.click();
         await page.locator('#locale-menu button[data-lang="my"]').click();
         ensure(await localeName.textContent()==='မြန်မာ' && await page.locator('h1').isVisible(),
           route+' Burmese language updates menu and title');
         // L1.35: the standalone public header uses the same selected
         // mobile indicator as the homepage; no extra nav or oversized tap area.
         if(width<=700){
           const status=await trigger.evaluate(btn=>{
             const flag=btn.querySelector('.locale-active-flag');
             const globe=btn.querySelector('.locale-globe');
             const rect=btn.getBoundingClientRect();
             return {selected:flag.textContent.trim(),visible:getComputedStyle(flag).display!=='none',
               hiddenGlobe:getComputedStyle(globe).display==='none',
               width:Math.round(rect.width),height:Math.round(rect.height)};
           });
           ensure(status.selected==='🇲🇲'&&status.visible&&status.hiddenGlobe&&
             status.width===44&&status.height===44,
             'L1.35 '+route+' '+width+'px mobile public header exposes active Myanmar '+
             JSON.stringify(status));
         }
         if(localized){
           const p=localizedBlock.locator('p');
           ensure((await p.textContent()).trim()===(await p.getAttribute('data-my')) &&
             await localizedBlock.locator('p').count()===1,
             route+' '+width+'px Burmese selection displays Burmese statement only');
         }
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
         ensure(await page.locator('.locale-active-name').textContent()==='မြန်မာ',
           route+' language preference persists across reload at '+width);
         if(localized){
           const p=page.locator('.lang-summary-localized>p');
           ensure((await p.textContent()).trim()===(await p.getAttribute('data-my')),
             route+' '+width+'px selected Burmese summary remains after reload');
           await page.locator('#locale-trigger').click();
           await page.locator('#locale-menu button[data-lang="en"]').click();
           ensure((await p.textContent()).trim()===(await p.getAttribute('data-en')) &&
             await page.locator('.lang-summary-localized>p').count()===1,
             route+' '+width+'px switched back to one English statement');
         }
       }
       await ctx.close();
     }
   }

   // L1.27 — the public browser tab title must agree with the canonical
   // static SEO title after initialization and every language switch.
   // A language change from mid-page must not reset reading position.
   for(const route of ['/','/features/','/security.html']){
     for(const width of [393,1440]){
       const ctx=await browser.newContext({
         viewport:{width,height:852},reducedMotion:'reduce'
       });
       const page=await ctx.newPage();
       const errors=[];
       page.on('pageerror',e=>errors.push(e.message));
       await load(page,route,errors);
       const documentPath=route==='/'?'index.html'
         :route.endsWith('/')?route.slice(1)+'index.html':route.slice(1);
       const originalTitle=fs.readFileSync(documentPath,'utf8')
         .split('<title>')[1]?.split('</title>')[0];
       const seo=await page.evaluate(()=>({
         runtime:document.title,
         path:location.pathname
       }));
       ensure(!!originalTitle&&seo.runtime===originalTitle &&
         (route!=='/'||seo.runtime==='MMHVAULT | Personal Finance & Wealth'),
         route+' '+width+'px initial browser title matches static HTML SEO '+JSON.stringify(seo));
       if(route==='/'){
         await page.evaluate(()=>window.scrollTo({
           top:Math.min(700,Math.max(0,document.documentElement.scrollHeight-innerHeight-120)),
           behavior:'instant'
         }));
       }
       const initial=await page.evaluate(()=>({
         y:scrollY,x:scrollX,path:location.pathname,hash:location.hash,
         headerTop:document.querySelector('.site-header').getBoundingClientRect().top,
         headerPosition:getComputedStyle(document.querySelector('.site-header')).position,
         htmlOverflow:getComputedStyle(document.documentElement).overflow,
         bodyOverflow:getComputedStyle(document.body).overflow
       }));
       for(const language of ['zh','my','en']){
         // Click the actual visible button coordinate; Playwright locator.click
         // may auto-scroll a sticky ancestor before dispatching a pointer click.
         const triggerBox=await page.locator('#locale-trigger').boundingBox();
         ensure(!!triggerBox&&triggerBox.y>=-2&&
           triggerBox.y+triggerBox.height<=852,
           route+' '+width+'px language trigger stays reachable while scrolling');
         await page.mouse.click(triggerBox.x+triggerBox.width/2,
           triggerBox.y+triggerBox.height/2);
         const opened=await page.evaluate(()=>({
           y:scrollY,x:scrollX,
           headerTop:document.querySelector('.site-header').getBoundingClientRect().top,
           focus:document.activeElement?.getAttribute('data-lang')
         }));
         const optionBox=await page.locator('#locale-menu [data-lang="'+language+'"]').boundingBox();
         ensure(!!optionBox&&optionBox.y>=-2&&
           optionBox.y+optionBox.height<=852,
           route+' '+width+'px '+language+' language choice stays on screen');
         await page.mouse.click(optionBox.x+optionBox.width/2,
           optionBox.y+optionBox.height/2);
         const after=await page.evaluate(()=>({
           title:document.title,htmlTitle:document.querySelector('head title')?.textContent,
           lang:document.documentElement.lang,
           path:location.pathname,hash:location.hash,
           y:scrollY,x:scrollX
         }));
         ensure(after.title===originalTitle &&
           after.htmlTitle===originalTitle &&
           after.lang===(language==='zh'?'zh-CN':language) &&
           after.path===initial.path&&after.hash===initial.hash &&
           Math.abs(after.x-initial.x)<=2 &&
           (route!=='/'||initial.y<100||
             (after.y>100&&Math.abs(after.y-initial.y)<280)),
           route+' '+width+'px '+language+' language preserves title and scroll context '+JSON.stringify({initial,opened,after}));
       }
       ensure(errors.length===0,
         route+' '+width+'px language switching has no missing assets or JS errors');
       await ctx.close();
     }
   }

   // L1.26 — dismissing a menu by tapping outside must never strand keyboard
   // focus on links or language buttons which have just become hidden.
   // Simulate the outside DOM event directly to keep focus where it would be
   // for users on browsers that don't focus noninteractive touched content.
   for(const route of ['/','/features/','/security.html']){
     for(const width of [393,1440]){
       const ctx=await browser.newContext({
         viewport:{width,height:852},reducedMotion:'reduce'
       });
       const page=await ctx.newPage();
       const errs=[];
       page.on('pageerror',e=>errs.push(e.message));
       await load(page,route,errs);
       const mobile=width===393;
       if(mobile)await page.locator('.site-header .menu-toggle').click();
       await page.locator('#landing-explore > summary').click();
       const inner=page.locator('#landing-explore .nav-explore-menu a').first();
       await inner.focus();
       ensure(await inner.evaluate(el=>document.activeElement===el),
         route+' '+width+'px Explore link is keyboard-focused');
       await page.evaluate(()=>{
         const name=document.body.classList.contains('public-landing-page')
           ? 'pointerdown':'click';
         const event=name==='pointerdown'
           ? new PointerEvent(name,{bubbles:true})
           : new MouseEvent(name,{bubbles:true});
         document.body.dispatchEvent(event);
       });
       const dismissed=await page.evaluate(()=>{
         const nav=document.getElementById('primary-nav');
         const active=document.activeElement;
         const toggle=document.querySelector('.site-header .menu-toggle');
         const summary=document.querySelector('#landing-explore > summary');
         return {
           open:document.getElementById('landing-explore').open,
           navOpen:document.querySelector('.site-header').classList.contains('menu-open'),
           focusedToggle:active===toggle,
           focusedSummary:active===summary,
           hiddenFocus:!!active.closest('[hidden]')||
             !!(nav.contains(active)&&getComputedStyle(nav).display==='none')
         };
       });
       ensure(!dismissed.open&&!dismissed.navOpen&&!dismissed.hiddenFocus&&
         (mobile?dismissed.focusedToggle:dismissed.focusedSummary),
         route+' '+width+'px outside dismisses Explore without hidden focus '+JSON.stringify(dismissed));

       const trigger=page.locator('#locale-trigger');
       await trigger.click();
       ensure(await trigger.getAttribute('aria-expanded')==='true',
         route+' '+width+'px language picker opens');
       await page.evaluate(()=>{
         const name=document.body.classList.contains('public-landing-page')
           ? 'pointerdown':'click';
         document.body.dispatchEvent(name==='pointerdown'
           ? new PointerEvent(name,{bubbles:true})
           : new MouseEvent(name,{bubbles:true}));
       });
       const language=await page.evaluate(()=>{
         const trigger=document.getElementById('locale-trigger');
         const menu=document.getElementById('locale-menu');
         return {hidden:menu.hidden,
           focusTrigger:document.activeElement===trigger,
           aria:trigger.getAttribute('aria-expanded')};
       });
       ensure(language.hidden&&language.focusTrigger&&language.aria==='false',
         route+' '+width+'px outside language dismissal restores visible trigger '+JSON.stringify(language));
       ensure(errs.length===0,route+' '+width+'px dismissals have no JS errors');
       await ctx.close();
     }
   }

   // L1.28 — closing public menus must restore keyboard focus without
   // scrolling an already-positioned page, including compact navigation.
   for(const route of ['/','/features/']){
     for(const width of [393,1440]){
       const ctx=await browser.newContext({viewport:{width,height:852},reducedMotion:'reduce'});
       const page=await ctx.newPage();
       const errors=[];
       page.on('pageerror',e=>errors.push(e.message));
       await load(page,route,errors);
       await page.evaluate(()=>{
         window.__mmhFocusRestores=[];
         const original=HTMLElement.prototype.focus;
         HTMLElement.prototype.focus=function(options){
           if(this.matches('.menu-toggle,.nav-explore>summary,.locale-trigger'))
             window.__mmhFocusRestores.push({
               target:this.matches('.menu-toggle')?'menu':this.matches('.locale-trigger')?'language':'explore',
               preserve:options?.preventScroll===true
             });
           return original.call(this,options);
         };
       });
       if(width===393)await page.locator('.site-header .menu-toggle').click();
       await page.locator('#landing-explore > summary').click();
       await page.locator('#landing-explore .nav-explore-menu a').first().focus();
       async function placedY(){
         return page.evaluate(()=>{
           const limit=Math.max(0,document.documentElement.scrollHeight-innerHeight);
           scrollTo({top:Math.min(510,limit),left:0,behavior:'instant'});
           return scrollY;
         });
       }
       let before=await placedY();
       await page.keyboard.press('Escape');
       let after=await page.evaluate(()=>({
         y:scrollY,focus:document.activeElement===document.querySelector('#landing-explore > summary'),
         restored:window.__mmhFocusRestores.at(-1)
       }));
       ensure(Math.abs(after.y-before)<=2 && after.focus &&
         after.restored?.target==='explore' && after.restored.preserve,
         route+' '+width+'px Explore restores focus without scroll '+JSON.stringify({before,after}));
       if(width===393){
         before=await placedY();
         await page.keyboard.press('Escape');
         after=await page.evaluate(()=>({
           y:scrollY,focus:document.activeElement===document.querySelector('.menu-toggle'),
           restored:window.__mmhFocusRestores.at(-1)
         }));
         ensure(Math.abs(after.y-before)<=2 && after.focus &&
           after.restored?.target==='menu' && after.restored.preserve,
           route+' mobile navigation Escape retains scroll '+JSON.stringify({before,after}));
       }
       await page.locator('#locale-trigger').click();
       before=await placedY();
       await page.keyboard.press('Escape');
       after=await page.evaluate(()=>({
         y:scrollY,focus:document.activeElement===document.querySelector('#locale-trigger'),
         restored:window.__mmhFocusRestores.at(-1)
       }));
       ensure(Math.abs(after.y-before)<=2 && after.focus &&
         after.restored?.target==='language' && after.restored.preserve,
         route+' '+width+'px language Escape retains scroll '+JSON.stringify({before,after}));
       ensure(errors.length===0,route+' '+width+'px L1.28 focus paths have no browser errors');
       await ctx.close();
     }
   }
   // Motion is only for ordinary-motion browsers; reduced-motion remains still.
   for(const motion of ['no-preference','reduce']){
     const ctx=await browser.newContext({viewport:{width:393,height:852},reducedMotion:motion});
     const page=await ctx.newPage();
     await page.goto(origin+'/',{waitUntil:'load'});
     await page.locator('.site-header .menu-toggle').click();
     const menuMotion=await page.locator('#primary-nav').evaluate(el=>getComputedStyle(el).animationName);
     await page.locator('#landing-explore > summary').click();
     const exploreMotion=await page.locator('#landing-explore .nav-explore-menu')
       .evaluate(el=>getComputedStyle(el).animationName);
     await page.locator('#locale-trigger').click();
     const languageMotion=await page.locator('#locale-menu')
       .evaluate(el=>getComputedStyle(el).animationName);
     const names=[menuMotion,exploreMotion,languageMotion];
     ensure(names.every(name=>motion==='reduce'?name==='none':name.includes('mmh-public-panel-in')),
       'L1.28 public panel opening honors '+motion+' '+JSON.stringify(names));
     await ctx.close();
   }


   // L1.29 — mobile navigation reports the correct open/close action in
   // English, Chinese and Burmese, on Home and public introduction pages.
   for(const route of ['/','/features/','/security.html']){
     for(const width of [393,1100]){
       for(const [lang,openLabel,closeLabel] of [
         ['en','Open navigation menu','Close navigation menu'],
         ['zh','打开导航菜单','关闭导航菜单'],
         ['my','လမ်းညွှန်မီနူး ဖွင့်ရန်','လမ်းညွှန်မီနူး ပိတ်ရန်']
       ]){
         const ctx=await browser.newContext({viewport:{width,height:852},
           reducedMotion:'reduce'});
         const page=await ctx.newPage();
         const errors=[];
         page.on('pageerror',e=>errors.push(e.message));
         await page.addInitScript(code=>{
           try{localStorage.setItem('mmhvault.landing.language',code)}catch(_){}
         },lang);
         await load(page,route,errors);
         const toggle=page.locator('.site-header .menu-toggle');
         ensure(await toggle.getAttribute('aria-label')===openLabel &&
           await toggle.getAttribute('aria-expanded')==='false',
           'L1.29 '+route+' '+width+'px '+lang+' initially announces open');
         await toggle.click();
         ensure(await toggle.getAttribute('aria-label')===closeLabel &&
           await toggle.getAttribute('aria-expanded')==='true',
           'L1.29 '+route+' '+width+'px '+lang+' opened menu announces close');
         await toggle.click();
         ensure(await toggle.getAttribute('aria-label')===openLabel &&
           await toggle.getAttribute('aria-expanded')==='false',
           'L1.29 '+route+' '+width+'px '+lang+' tap closes and announces open');
         await toggle.click();
         await page.keyboard.press('Escape');
         ensure(await toggle.getAttribute('aria-label')===openLabel &&
           await toggle.getAttribute('aria-expanded')==='false',
           'L1.29 '+route+' '+width+'px '+lang+' Escape resets action label');
         await toggle.click();
         await page.evaluate(()=>{
           const name=document.body.classList.contains('public-landing-page')
             ?'pointerdown':'click';
           document.body.dispatchEvent(name==='pointerdown'
             ?new PointerEvent(name,{bubbles:true})
             :new MouseEvent(name,{bubbles:true}));
         });
         ensure(await toggle.getAttribute('aria-label')===openLabel &&
           await toggle.getAttribute('aria-expanded')==='false'&&errors.length===0,
           'L1.29 '+route+' '+width+'px '+lang+' outside dismissal resets label');
         await ctx.close();
       }
     }
   }

   // Resizing from compact to desktop closes mobile navigation and Explore.
   // The current keyboard focus must stay visible after the breakpoint switch.
   for(const route of ['/','/features/']){
     const ctx=await browser.newContext({
       viewport:{width:393,height:852},reducedMotion:'reduce'
     });
     const page=await ctx.newPage();
     await load(page,route,[]);
     await page.locator('.site-header .menu-toggle').click();
     await page.locator('#landing-explore > summary').click();
     await page.locator('#landing-explore .nav-explore-menu a').first().focus();
     await page.setViewportSize({width:1440,height:900});
     await page.waitForFunction(()=>
       !document.querySelector('.site-header').classList.contains('menu-open'));
     const state=await page.evaluate(()=>{
       const active=document.activeElement,nav=document.getElementById('primary-nav');
       return {
         expanded:document.querySelector('.menu-toggle').getAttribute('aria-expanded'),
         exploreOpen:document.getElementById('landing-explore').open,
         focusSummary:active===document.querySelector('#landing-explore > summary'),
         visibleFocus:!!active.getClientRects().length,
         navDisplay:getComputedStyle(nav).display
       };
     });
     ensure(state.expanded==='false'&&!state.exploreOpen&&
       state.focusSummary&&state.visibleFocus&&state.navDisplay!=='none',
       route+' responsive breakpoint retains visible header focus '+JSON.stringify(state));
     await ctx.close();
   }

   // L1.22 — keyboard dismissal must be identical on Landing and public
   // branches, restoring focus to a visible control instead of a hidden menu.
   for(const route of ['/','/features/','/security.html']){
     for(const width of [393,1440]){
       const ctx=await browser.newContext({viewport:{width,height:852},
         reducedMotion:'reduce'});
       const page=await ctx.newPage();
       const failures=[];
       page.on('pageerror',e=>failures.push(e.message));
       await load(page,route,failures);
       const explore=page.locator('#landing-explore');
       const summary=explore.locator('summary');
       const hamburger=page.locator('.site-header .menu-toggle');
       if(width===393){
         await hamburger.click();
         ensure(await hamburger.getAttribute('aria-expanded')==='true',
           route+' compact menu opens before keyboard dismissal');
       }
       await summary.click();
       ensure(await explore.evaluate(el=>el.open),
         route+' '+width+'px Explore menu opens before Escape');
       await page.keyboard.press('Escape');
       ensure(!await explore.evaluate(el=>el.open) &&
         await summary.evaluate(el=>document.activeElement===el) &&
         (width!==393 || await hamburger.getAttribute('aria-expanded')==='true'),
         route+' '+width+'px Escape only closes Explore and restores summary focus');
       if(width===393){
         await page.keyboard.press('Escape');
         ensure(await hamburger.getAttribute('aria-expanded')==='false' &&
           !await page.locator('#primary-nav').isVisible() &&
           await hamburger.evaluate(el=>document.activeElement===el),
           route+' mobile Escape next closes hamburger and restores toggle focus');
       }
       const locale=page.locator('#locale-trigger');
       await locale.click();
       ensure(await locale.getAttribute('aria-expanded')==='true',
         route+' '+width+'px language selector opens');
       await page.keyboard.press('Escape');
       ensure(await locale.getAttribute('aria-expanded')==='false' &&
         await locale.evaluate(el=>document.activeElement===el),
         route+' '+width+'px Escape dismisses language panel and restores globe focus');
       ensure(failures.length===0,
         route+' '+width+'px keyboard navigation has no missing assets or JS errors');
       await ctx.close();
     }
   }

   // L1.39: real IntersectionObserver configuration in phone and desktop
   // browsers. Only mobile receives a positive early-reveal bottom margin.
   for(const width of [393,1440]){
     for(const [route,expected] of [
       ['/',width<=620?'0px 0px 24% 0px':'0px 0px -6% 0px'],
       ['/features/',width<=620?'0px 0px 12% 0px':'0px 0px -4% 0px']
     ]){
       const ctx=await browser.newContext({viewport:{width,height:852},reducedMotion:'no-preference'});
       const page=await ctx.newPage();
       const errors=[];
       page.on('pageerror',err=>errors.push(err.message));
       await page.addInitScript(()=>{
         const Native=window.IntersectionObserver;
         window.__mmhL139ObserverMargins=[];
         if(typeof Native==='function')window.IntersectionObserver=class extends Native{
           constructor(callback,options){
             if(options?.rootMargin)window.__mmhL139ObserverMargins.push(options.rootMargin);
             super(callback,options);
           }
         };
       });
       await load(page,route,errors);
       const margins=await page.evaluate(()=>window.__mmhL139ObserverMargins);
       ensure(margins.includes(expected)&&errors.length===0,
         'L1.40 '+route+' '+width+'px correct early scroll reveal margin '+JSON.stringify(margins));
       await ctx.close();
     }
   }

   // L1.23 — verify actual browser transitions avoid expensive blur filters,
   // preserve progressive reveals and use quicker phone timings.
   for(const width of [393,1440]){
     for(const [route,selector] of [
       ['/', '.showcase-grid > .showcase-card.mm-reveal'],
       ['/features/', '.grid > .item.mm-public-reveal'],
       ['/security.html', '.policy-card.mm-public-reveal']
     ]){
       const ctx=await browser.newContext({
         viewport:{width,height:852},reducedMotion:'no-preference'
       });
       const page=await ctx.newPage();
       const failures=[];
       page.on('pageerror',e=>failures.push(e.message));
       await load(page,route,failures);
       const metrics=await page.evaluate(selector=>{
         const el=document.querySelector(selector);
         if(!el)return {missing:selector};
         const style=getComputedStyle(el);
         return {
           filter:style.filter,
           transition:style.transitionProperty.split(',').map(s=>s.trim()),
           durations:style.transitionDuration.split(',').map(s=>parseFloat(s)),
           visibleFallback:el.classList.contains('mm-shown')||
             el.classList.contains('mm-public-shown'),
           rootMotion:document.documentElement.classList.contains('mm-motion-active'),
           publicMotion:document.body.classList.contains('mm-public-motion')
         };
       },selector);
       const fast=width<=620;
       const expected=route==='/' ? (fast?[.41,.44]:[.55,.59])
         : (fast?[.41,.445]:[.56,.6]);
       ensure(!metrics.missing && metrics.filter==='none' &&
         metrics.transition[0]==='opacity'&&metrics.transition[1]==='transform' &&
         metrics.durations.length>=2&&
         expected.every((v,i)=>Math.abs(metrics.durations[i]-v)<.012) &&
         (route==='/'?metrics.rootMotion:metrics.publicMotion),
         route+' '+width+'px compositor-friendly scroll reveal '+JSON.stringify(metrics));
       await ctx.close();
     }
   }

   // L1.18 — animated public pages remain visible, language-neutral and
   // keep reduced-motion as the default fallback in the main viewport loop.
   for(const [route,target] of [
     ['/features/','.grid>.item'],
     ['/security.html','.policy-card']
   ]){
     const ctx=await browser.newContext({
       viewport:{width:393,height:852},reducedMotion:'no-preference'
     });
     const page=await ctx.newPage();
     const errors=[];
     page.on('pageerror',e=>errors.push(e.message));
     await load(page,route,errors);
     ensure(await page.locator('body').evaluate(b=>b.classList.contains('mm-public-motion')),
       route+' unobtrusive public reveal enhancement activates');
     const item=page.locator(target).first();
     ensure(await item.evaluate(e=>e.classList.contains('mm-public-reveal')),
       route+' reveal target registered');
     await item.scrollIntoViewIfNeeded();
     await page.waitForTimeout(850);
     ensure(await item.evaluate(e=>e.classList.contains('mm-public-shown')),
       route+' scrolled card becomes visible');
     ensure((await item.evaluate(e=>Number(getComputedStyle(e).opacity)))>.98,
       route+' full opacity after reveal');
     ensure(errors.length===0,route+' scroll enhancement has no JS exception');
     await ctx.close();
   }

   // L1.30 — a shared /#feature-* link should render exactly its intended
   // screen on first paint, without showing Dashboard or transitional clones.
   // Normal subsequent hash changes must continue to work as before.
   for(const width of [393,1440]){
     for(const name of ['accounts','invest','life']){
       const ctx=await browser.newContext({
         viewport:{width,height:852},reducedMotion:'no-preference'
       });
       const page=await ctx.newPage();
       const errors=[];
       page.on('pageerror',e=>errors.push(e.message));
       const response=await page.goto(origin+'/#feature-'+name,{
         waitUntil:'domcontentloaded',timeout:25000
       });
       ensure(response?.status()===200,'L1.30 deep link '+name+' HTTP 200');
       const first=await page.locator('[data-product-panel]').evaluateAll(panels=>({
         visible:panels.filter(panel=>!panel.hidden).map(panel=>panel.dataset.productPanel),
         transitioning:panels.some(panel=>panel.classList.contains('mmh-preview-enter')||
           panel.classList.contains('mmh-preview-exit')||
           panel.classList.contains('mmh-preview-running')),
         accessible:panels.filter(panel=>!panel.hidden).every(panel=>
           !panel.inert&&panel.getAttribute('aria-hidden')==='false'),
         othersInert:panels.filter(panel=>panel.hidden).every(panel=>
           panel.inert&&panel.getAttribute('aria-hidden')==='true')
       }));
       const chosen=await page.locator('[data-product-tab="'+name+'"]')
         .getAttribute('aria-selected');
       ensure(JSON.stringify(first.visible)===JSON.stringify([name])&&
         !first.transitioning&&first.accessible&&first.othersInert&&
         chosen==='true',
         'L1.30 '+width+'px '+name+' opens correct preview without initial flash '+
         JSON.stringify(first));
       await page.evaluate(()=>{location.hash='#feature-analyze'});
       await page.waitForFunction(()=>document.querySelector('.product-stage')?.dataset.productCurrent==='analyze');
       await page.waitForTimeout(400);
       const settled=await page.locator('[data-product-panel]').evaluateAll(panels=>({
         visible:panels.filter(panel=>!panel.hidden).map(panel=>panel.dataset.productPanel),
         transitioning:panels.some(panel=>panel.classList.contains('mmh-preview-enter')||
           panel.classList.contains('mmh-preview-exit')),
         othersInert:panels.filter(panel=>panel.hidden).every(panel=>panel.inert)
       }));
       ensure(JSON.stringify(settled.visible)===JSON.stringify(['analyze'])&&
         !settled.transitioning&&settled.othersInert&&errors.length===0,
         'L1.30 '+width+'px hash navigation still settles correctly');
       await ctx.close();
     }
   }

   // L1.31: tapping the already-selected demo tab must not jump its
   // internal scroll or prematurely finish a running crossfade. Keyboard
   // navigation keeps the document's current scroll while moving focus.
   for(const width of [393,1440]){
     const ctx=await browser.newContext({
       viewport:{width,height:852},reducedMotion:'no-preference'
     });
     const page=await ctx.newPage();
     const errors=[];
     page.on('pageerror',e=>errors.push(e.message));
     await load(page,'/',errors);
     await page.locator('[data-product-tab="accounts"]').click();
     await page.waitForTimeout(400);
     const before=await page.evaluate(()=>{
       const pane=document.querySelector('.app-sim-content');
       // Accommodate tall and short content across responsive sizes: the
       // actual scrollable preview gets a shorter test viewport when needed.
       if(pane.scrollHeight-pane.clientHeight<100)pane.style.maxHeight='260px';
       pane.scrollTop=Math.min(140,pane.scrollHeight-pane.clientHeight);
       return {scroll:pane.scrollTop,doc:window.scrollY};
     });
     ensure(before.scroll>35,
       'L1.31 '+width+'px inner preview supports vertical scrolling');
     await page.locator('[data-product-tab="accounts"]').click();
     const repeat=await page.evaluate(()=>{
       const pane=document.querySelector('.app-sim-content');
       return {
         scroll:pane.scrollTop,active:document.querySelector('.product-stage').dataset.productCurrent,
         transitioning:[...document.querySelectorAll('[data-product-panel]')]
           .some(panel=>panel.classList.contains('mmh-preview-enter')||
             panel.classList.contains('mmh-preview-exit'))
       };
     });
     ensure(Math.abs(repeat.scroll-before.scroll)<=1&&
       repeat.active==='accounts'&&!repeat.transitioning,
       'L1.31 '+width+'px repeating active tab preserves preview scroll '+
         JSON.stringify({before,repeat}));
     const accountTab=page.locator('[data-product-tab="accounts"]');
     await accountTab.focus();
     const beforeKey=await page.evaluate(()=>window.scrollY);
     await page.keyboard.press('ArrowDown');
     const afterKey=await page.evaluate(()=>({
       scroll:window.scrollY,
       focus:document.activeElement?.getAttribute('data-product-tab'),
       current:document.querySelector('.product-stage').dataset.productCurrent
     }));
     ensure(afterKey.current==='invest'&&afterKey.focus==='invest'&&
       Math.abs(afterKey.scroll-beforeKey)<=2,
       'L1.31 '+width+'px arrow navigation focuses next tab without page jump '+
         JSON.stringify({beforeKey,afterKey}));
     await page.waitForTimeout(400);
     const duplicate=await page.evaluate(()=>{
       const tab=document.querySelector('[data-product-tab="transactions"]');
       tab.click();
       tab.click();
       return {
         current:document.querySelector('.product-stage').dataset.productCurrent,
         inFlight:[...document.querySelectorAll('[data-product-panel]')].some(p=>
           p.classList.contains('mmh-preview-enter')||
           p.classList.contains('mmh-preview-exit'))
       };
     });
     ensure(duplicate.current==='transactions'&&duplicate.inFlight,
       'L1.31 '+width+'px duplicate tap preserves in-flight crossfade');
     await page.waitForTimeout(430);
     const final=await page.locator('[data-product-panel]').evaluateAll(panels=>({
       visible:panels.filter(p=>!p.hidden).map(p=>p.dataset.productPanel),
       transient:panels.some(p=>p.classList.contains('mmh-preview-enter')||
         p.classList.contains('mmh-preview-exit')),
       othersInert:panels.filter(p=>p.hidden).every(p=>p.inert)
     }));
     ensure(JSON.stringify(final.visible)===JSON.stringify(['transactions'])&&
       !final.transient&&final.othersInert&&errors.length===0,
       'L1.31 '+width+'px duplicate tab settles to one accessible screen');
     await ctx.close();
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
     await page.locator('header #primary-nav>a[href="/#business"]').click();
     await page.waitForURL(url=>url.pathname==='/'&&url.hash==='#business');
     ensure(new URL(page.url()).pathname==='/'&&new URL(page.url()).hash==='#business',
       'About top-level Business opens Landing Business showcase');
     await page.goto(origin+'/about/',{waitUntil:'load'});
     await page.locator('header #landing-explore > summary').click();
     await page.locator('header #landing-explore a[href="/business/"]').click();
     await page.waitForURL('**/business/');
     ensure(new URL(page.url()).pathname==='/business/'&&!new URL(page.url()).hash,
       'About Explore opens independent Business concept');
     ensure(await page.locator('body.public-landing-page.business-page').count()===1,
       'Business route remains its independent introduction page');
     ensure(await page.locator('header #landing-explore a[href="/business/"]').count()===1,
       'Business has matching Explore item on the standalone page');
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
     await page.locator('header .menu-toggle').click();
     await page.locator('header #landing-explore > summary').click();
     await page.locator('header #landing-explore a[href="/business/"]').click();
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
   // L1.21 — central panel crossfade must never show an empty frame.
   await page.locator('[data-product-tab="transactions"]').click();
   await page.waitForTimeout(85);
   const inFlight=await page.evaluate(()=>{
     const old=document.querySelector('[data-product-panel="dashboard"]');
     const next=document.querySelector('[data-product-panel="transactions"]');
     const layer=document.querySelector('.app-sim-content');
     return {
       count:[...document.querySelectorAll('[data-product-panel]')].filter(p=>!p.hidden).length,
       outgoing:old.classList.contains('mmh-preview-exit'),
       entering:next.classList.contains('mmh-preview-enter'),
       opacitySum:Number(getComputedStyle(old).opacity)+Number(getComputedStyle(next).opacity),
       panePosition:getComputedStyle(layer).position,
       nestedFlash:[...next.querySelectorAll('.app-metric,.app-mock-card')]
         .some(el=>el.getAnimations().length>0)
     };
   });
   ensure(inFlight.count===2&&inFlight.outgoing&&inFlight.entering&&
     inFlight.opacitySum>.70&&inFlight.panePosition==='relative'&&!inFlight.nestedFlash,
     'Crossfade keeps both panels painted without nested card flashing '+JSON.stringify(inFlight));
   await page.waitForTimeout(400);
   const transitioned=await page.locator('[data-product-panel]').evaluateAll(panels=>
     panels.filter(p=>!p.hidden).map(p=>p.dataset.productPanel));
   ensure(JSON.stringify(transitioned)===JSON.stringify(['transactions']),
     'Crossfade leaves only the selected transaction screen accessible');
   for(const name of ['accounts','invest','analyze']){
     await page.locator('[data-product-tab="'+name+'"]').click();
   }
   await page.waitForTimeout(400);
   const rapid=await page.locator('[data-product-panel]').evaluateAll(panels=>({
     visible:panels.filter(p=>!p.hidden).map(p=>p.dataset.productPanel),
     hasTransient:panels.some(p=>p.classList.contains('mmh-preview-enter')||
       p.classList.contains('mmh-preview-exit')),
     othersInert:panels.filter(p=>p.hidden).every(p=>p.inert),
     selectedAria:panels.find(p=>!p.hidden)?.getAttribute('aria-hidden')
   }));
   ensure(JSON.stringify(rapid.visible)===JSON.stringify(['analyze'])&&
     !rapid.hasTransient&&rapid.othersInert&&rapid.selectedAria==='false',
     'Rapid switching cancels stale fades and keeps only final screen '+JSON.stringify(rapid));

   ensure(errors.length===0,'Liquid motion produces no JS exceptions');
   await ctx.close();
   console.log('PUBLIC LANDING BROWSER QA PASS: '+widths.length+' Landing viewports, '+
      (publicRoutes.length-1)*4+' public-page viewports, language and state interactions');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
