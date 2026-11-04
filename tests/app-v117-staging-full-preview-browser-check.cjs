/* Browser smoke of the locally built COMPLETE APP staging preview.
 * No live network: CDN SDK is blocked and Staging API is mock-routed.
 * This verifies the browser-enforced connection boundary, not APP login.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const PREVIEW='http://127.0.0.1:8768/dist/app-v117-staging/app.html';
const STAGE='https://ldivswlhtgmznzwhzsoi.supabase.co';
const PROD='https://vrypucmyrztxgiqhjspd.supabase.co';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,
   args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({viewport:{width:393,height:844},
    serviceWorkers:'block'});
  const page=await context.newPage(),forbiddenNet=[],allowedAPI=[];
  page.on('request',req=>{
    if(req.url().startsWith(PROD))forbiddenNet.push(req.url());
  });
  await page.route('https://cdn.jsdelivr.net/**',route=>route.abort());
  await page.route(STAGE+'/**',route=>{
    const u=new URL(route.request().url());
    if(/^(\/auth\/v1\/(token|user|logout)|\/rest\/v1\/(transactions|personal_configuration))$/.test(u.pathname)){
      allowedAPI.push(u.pathname);
      return route.fulfill({status:200,headers:{'access-control-allow-origin':'*',
        'content-type':'application/json'},body:'[]'});
    }
    forbiddenNet.push(u.pathname);
    return route.fulfill({status:403,body:'blocked'});
  });
  const response=await page.goto(PREVIEW,{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(response.status(),200,'full APP preview is served via local HTTP');
  assert.match(await page.title(),/APP V11\.7 — STAGING ONLY/);
  assert.equal(await page.locator('#mmh-v117-staging-banner').isVisible(),true);
  const meta=await page.locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content');
  assert.match(meta,/connect-src https:\/\/ldivswlhtgmznzwhzsoi\.supabase\.co\/auth\/v1\/token/);
  assert.match(meta,/worker-src 'none'/);
  const proof=await page.evaluate(async()=>{
    const attempt=async url=>{
      try{return (await fetch(url)).ok}catch(_){return false}
    };
    return {
      prod:await attempt('https://vrypucmyrztxgiqhjspd.supabase.co/rest/v1/transactions'),
      n10:await attempt('https://ldivswlhtgmznzwhzsoi.supabase.co/functions/v1/mmh-n10-security'),
      finance:await attempt('https://ldivswlhtgmznzwhzsoi.supabase.co/rest/v1/transactions?select=id'),
      config:await attempt('https://ldivswlhtgmznzwhzsoi.supabase.co/rest/v1/personal_configuration?select=user_id'),
      investments:await attempt('https://ldivswlhtgmznzwhzsoi.supabase.co/rest/v1/investments?select=id'),
      customInvestments:await attempt('https://ldivswlhtgmznzwhzsoi.supabase.co/rest/v1/custom_investments?select=id'),
      wallet:await attempt('https://ldivswlhtgmznzwhzsoi.supabase.co/rest/v1/crypto_wallet_movements?select=id')
    };
  });
  assert.equal(proof.prod,false,'Production data host blocked by CSP');
  assert.equal(proof.n10,false,'Staging N10 Edge functions blocked by CSP');
  assert.equal(proof.finance,true,'Approved Staging ledger endpoint remains reachable');
  assert.equal(proof.config,true,'Approved Staging owner config endpoint remains reachable');
  assert.equal(proof.investments,false,'Unapproved Staging investments endpoint must remain blocked');
  assert.equal(proof.customInvestments,false,'Unapproved custom investments endpoint must remain blocked');
  assert.equal(proof.wallet,false,'Unapproved wallet movements endpoint must remain blocked');
  assert.deepEqual(forbiddenNet,[],'browser sent no request to disallowed API origin or path');
  assert.ok(allowedAPI.includes('/rest/v1/transactions'));
  assert.ok(allowedAPI.includes('/rest/v1/personal_configuration'));
  console.log('PASS APP V11.7 Chrome local full APP staging CSP smoke — production/N10 blocked; finance only');
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
