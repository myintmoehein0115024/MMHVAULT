/* Smoke-test the real double-click APP file:// entrypoint in Chrome.
 * No real Auth login, network write, production access or local server. */
'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright-core');
const file=path.resolve(__dirname,'../dist/app-v117-staging/OPEN-ME-STAGING.html');
const LOCAL=pathToFileURL(file).href;
const STAGE='https://ldivswlhtgmznzwhzsoi.supabase.co';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,
   args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const ctx=await browser.newContext({serviceWorkers:'block',
    viewport:{width:393,height:800}});
  const page=await ctx.newPage(),forbidden=[],localFailures=[],apiRequests=[];
  page.on('request',req=>{
    const url=req.url();
    if(url.includes('vrypucmyrztxgiqhjspd.supabase.co'))forbidden.push(url);
    if(url.startsWith(STAGE))apiRequests.push(url);
  });
  page.on('requestfailed',req=>{
    if(req.url().startsWith('file://')&&/\.(?:js|mjs|css)(?:\?|$)/.test(req.url()))
      localFailures.push(req.url());
  });
  await page.route('https://cdn.jsdelivr.net/**',route=>route.abort());
  await page.route(STAGE+'/**',route=>route.abort());
  const response=await page.goto(LOCAL,{waitUntil:'load',timeout:30000});
  assert.ok(response,'Chrome must open file:// HTML');
  assert.match(await page.title(),/STAGING FILE MODE/);
  assert.equal(await page.locator('#mmh-v117-staging-banner').isVisible(),true);
  assert.equal(await page.locator('script[type="module"][src]').count(),0);
  assert.equal(await page.locator('#mmh-v117-inline-hierarchy').count(),1);
  await page.waitForFunction(()=>!!window.MMHV11HierarchyLive,
    {timeout:15000}).catch(()=>{throw Error('Inlined hierarchy boot failed from file://')});
  assert.deepEqual(localFailures,[],'Local classic scripts and CSS must load via file://');
  assert.deepEqual(forbidden,[],'No requests to Production Supabase from local APP');
  assert.ok(apiRequests.every(x=>x.startsWith(STAGE)),'Only Staging origin may be contacted');
  console.log('PASS: real APP local file:// opens with V11.7 hierarchy loaded and no Production API');
  await ctx.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
