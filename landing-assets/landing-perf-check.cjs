/* MMHVAULT L1.11 — reproducible, public-only lab performance samples.
 * The browser loads only the public HTML files from a local static server.
 * Results are diagnostics, NOT Google PageSpeed Insights / real-world CWV scores.
 * No auth endpoints, cookies, finance APIs, secrets or production writes.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const origin='http://127.0.0.1:8765';
const pages=[
  {route:'/',hero:'cinematic-lake.webp'},
  {route:'/about/',hero:'cinematic-lake.webp'},
  {route:'/features/',hero:'personal-business-concept.webp'},
  {route:'/register/',hero:'personal-business-concept.webp'}
];
const viewports=[
  {name:'mobile',width:393,height:852},
  {name:'desktop',width:1440,height:900}
];
const samples=[];
function ok(value,message){assert.ok(value,message);console.log('PASS '+message);}
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    for(const viewport of viewports){
      for(const info of pages){
        const ctx=await browser.newContext({
          viewport:{width:viewport.width,height:viewport.height},
          deviceScaleFactor:1,reducedMotion:'reduce'
        });
        await ctx.addInitScript(()=>{
          window.__publicPerf={lcp:0,cls:0};
          try{
            new PerformanceObserver(list=>{
              for(const e of list.getEntries())window.__publicPerf.lcp=e.startTime;
            }).observe({type:'largest-contentful-paint',buffered:true});
          }catch(_){}
          try{
            new PerformanceObserver(list=>{
              for(const e of list.getEntries()){
                if(!e.hadRecentInput)window.__publicPerf.cls+=e.value;
              }
            }).observe({type:'layout-shift',buffered:true});
          }catch(_){}
        });
        const page=await ctx.newPage();
        const cdp=await ctx.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions',{
          offline:false,latency:100,downloadThroughput:240000,uploadThroughput:120000
        });
        const failures=[];
        const external=[];
        const requests=[];
        page.on('pageerror',e=>failures.push('JavaScript '+e.message));
        page.on('request',q=>{
          const url=q.url();
          if(!url.startsWith(origin)&&!url.startsWith('data:'))external.push(url);
          if(url.includes('/login.html')||url.includes('/app.html')||url.includes('/supabase/')){
            failures.push('Unexpected private-path request '+url);
          }
        });
        page.on('requestfinished',async request=>{
          const response=await request.response();
          if(response&&request.url().startsWith(origin)){
            requests.push({url:request.url().replace(origin,''),
              status:response.status(),type:request.resourceType()});
          }
        });
        page.on('requestfailed',r=>failures.push('Network '+r.url()+' '+r.failure()?.errorText));
        const response=await page.goto(origin+info.route,{waitUntil:'load',timeout:45000});
        ok(response&&response.status()===200,info.route+' '+viewport.name+' HTML 200');
        await page.waitForTimeout(500);
        const metrics=await page.evaluate(()=>{
          const paint=performance.getEntriesByType('paint');
          const n=performance.getEntriesByType('navigation')[0];
          const resources=performance.getEntriesByType('resource')
            .filter(r=>r.name.startsWith(location.origin))
            .map(r=>({name:new URL(r.name).pathname,bytes:r.transferSize,
                decoded:r.decodedBodySize,duration:r.duration}));
          const fcp=paint.find(p=>p.name==='first-contentful-paint');
          return {fcp:Math.round(fcp?.startTime||0),
            lcp:Math.round(window.__publicPerf?.lcp||0),
            cls:Number((window.__publicPerf?.cls||0).toFixed(4)),
            dcl:Math.round(n?.domContentLoadedEventEnd||0),
            loaded:Math.round(n?.loadEventEnd||0),
            resourceCount:resources.length,
            transferBytes:Math.round(resources.reduce((acc,r)=>acc+r.bytes,0)),
            resources
          };
        });
        ok(metrics.fcp>0,info.route+' '+viewport.name+' FCP recorded');
        ok(metrics.lcp>0,info.route+' '+viewport.name+' LCP recorded');
        ok(failures.length===0,info.route+' '+viewport.name+' no errors '+failures.join('; '));
        ok(external.length===0,info.route+' '+viewport.name+' no third-party requests');
        ok(requests.every(r=>r.status<400),info.route+' '+viewport.name+' no local HTTP errors');
        if(info.route!=='/'){
          ok(await page.locator('link[rel="preload"][as="image"]').count()===1,
            info.route+' '+viewport.name+' single hero image preload');
          const href=await page.locator('link[rel="preload"][as="image"]').getAttribute('href');
          ok(href.endsWith('/'+info.hero),
            info.route+' '+viewport.name+' preload matches visible hero asset');
        }
        ok(metrics.resources.some(r=>r.name.endsWith('/'+info.hero)),
          info.route+' '+viewport.name+' priority image actually requested');
        const heroRequestCount=requests.filter(r=>r.url.endsWith('/'+info.hero)).length;
        ok(heroRequestCount===1,info.route+' '+viewport.name+' no redundant hero fetches');
        // Guard against silent page-weight regressions, not a field CWV threshold.
        // Budgets include uncompressed local-server assets; CDN may compress more.
        const resourceBudget=info.route==='/'?850000:350000;
        ok(metrics.transferBytes<=resourceBudget,
          info.route+' '+viewport.name+' resource weight '+
          metrics.transferBytes+' B under '+resourceBudget+' B budget');
        const sample={route:info.route,viewport:viewport.name,
          width:viewport.width,throttle:'100ms latency, 1.92 Mbps download (lab)',
          fcpMs:metrics.fcp,lcpMs:metrics.lcp,cls:metrics.cls,
          domContentLoadedMs:metrics.dcl,loadMs:metrics.loaded,
          resourceCount:metrics.resourceCount,
          transferredBytes:metrics.transferBytes,
          totalRequests:requests.length,
          heroRequests:heroRequestCount,
          largestResources:[...metrics.resources]
             .sort((a,b)=>b.decoded-a.decoded).slice(0,6)
             .map(r=>({name:r.name,transferBytes:r.bytes,decodedBytes:r.decoded,
               loadDurationMs:Math.round(r.duration)}))};
        console.log('LAB DIAGNOSTICS '+JSON.stringify(sample));
        samples.push(sample);
        await ctx.close();
      }
    }
    const directory=path.join(process.cwd(),'landing-perf-reports');
    fs.mkdirSync(directory,{recursive:true});
    fs.writeFileSync(path.join(directory,'public-lab.json'),
      JSON.stringify({schema:'mmhvault-public-lab-v1',
        note:'Local CI lab only, not PageSpeed Insights or field Core Web Vitals.',
        samples},null,2)+'\n');
    console.log('PUBLIC LAB COMPLETE: '+samples.length+' readings written');
  }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
