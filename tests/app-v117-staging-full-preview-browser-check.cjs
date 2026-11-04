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
    if(/^(\/auth\/v1\/(token|user|logout)|\/rest\/v1\/(transactions|personal_configuration|investments|custom_investments|crypto_wallet_movements))$/.test(u.pathname)){
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
  assert.equal(proof.investments,true,'Approved owner-read-only Staging investments endpoint allowed');
  assert.equal(proof.customInvestments,true,'Approved owner-read-only custom investments endpoint allowed');
  assert.equal(proof.wallet,true,'Approved owner-read-only wallet movements endpoint allowed');
  assert.deepEqual(forbiddenNet,[],'browser sent no request to disallowed API origin or path');
  assert.ok(allowedAPI.includes('/rest/v1/transactions'));
  assert.ok(allowedAPI.includes('/rest/v1/personal_configuration'));
  for(const table of ['investments','custom_investments','crypto_wallet_movements'])
    assert.ok(allowedAPI.includes('/rest/v1/'+table),
      'approved Staging-only boot REST route must be requested: '+table);
  console.log('PASS APP V11.7 Chrome local full APP staging CSP smoke — Production/N10 blocked; exactly five finance REST routes');

  // Reproduce the real native signed-out route: app.html -> login.html.
  // The Pages build MUST ship a proper login.html rather than falling back
  // to index.html and bouncing forever to /app.html (navy flash bug).
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.js',
    route=>route.fulfill({status:200,contentType:'application/javascript',body:
      "window.supabase={createClient:function(url,key){window.__qaClientUrl=url;window.__qaPublicKey=key;window.__qaSignins=0;return {auth:{signInWithPassword:async function(args){window.__qaSignins++;return {data:{session:{user:{id:'fixture-A',email:args.email}}},error:null};}}};}};"}));
  const loginResponse=await page.goto(PREVIEW.replace('/app.html','/login.html'),
    {waitUntil:'load',timeout:30000});
  assert.equal(loginResponse.status(),200,'Native app signed-out redirect has a real Staging login page');
  assert.match(await page.title(),/STAGING TEST LOGIN/);
  assert.equal(await page.locator('#qaLoginForm').isVisible(),true);
  assert.equal(await page.locator('#qaEmail').isVisible(),true);
  assert.equal(await page.locator('#qaPassword').isVisible(),true);
  const loginSource=await page.content();
  assert.ok(loginSource.includes(STAGE));
  assert.ok(!loginSource.includes(PROD));
  assert.ok(!loginSource.includes('functions/v1/'));
  assert.equal(await page.evaluate(()=>window.__qaClientUrl),STAGE,
    'Staging login initializes Supabase SDK with Staging only');

  // Native INITIAL_SESSION=null routes through index.html; this second
  // anonymous path must also reach QA login, never bounce to app.html.
  await page.goto(PREVIEW.replace('/app.html','/index.html'),
    {waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForURL(/\/login\.html$/,{timeout:10000});
  assert.equal(await page.locator('#qaLoginForm').isVisible(),true,
    'Anonymous native index route must settle on Staging login without a loop');
  await page.locator('#qaEmail').fill('production@example.test');
  await page.locator('#qaPassword').fill('not-a-real-password');
  await page.locator('#qaSubmit').click();
  assert.match(await page.locator('#status').textContent(),/Only dedicated v117qa synthetic/);
  assert.equal(await page.evaluate(()=>window.__qaSignins),0,
    'Non-fixture identity must never be submitted to Auth');

  // The credential is synthetic and the SDK is mocked. Assert that a
  // successful QA-only sign-in navigates to APP without real login/network.
  await page.route('**/app.html',route=>route.fulfill({status:200,
    contentType:'text/html',body:'<!doctype html><title>Mock APP route</title><div id="qa-route-success">Staging APP navigation OK</div>'}));
  await page.locator('#qaEmail').fill('fixture-v117qa-a@example.test');
  await page.locator('#qaPassword').fill('synthetic-only-not-a-real-password');
  await page.locator('#qaSubmit').click();
  await page.waitForSelector('#qa-route-success',{timeout:10000});
  assert.match(page.url(),/\/app\.html$/,
    'Only native APP route is navigated to after synthetic sign-in');
  console.log('PASS APP V11.7 isolated Staging login route — visible, fixture-gated, mocked Auth, no redirect loop');
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
