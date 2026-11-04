/* Browser-only synthetic onboarding acceptance. Does not authenticate or hit Supabase. */
'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright-core');
const webkitMode=process.env.MMH_BROWSER_ENGINE==='webkit';
const id='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const url='http://127.0.0.1:8768/tests/transaction-onboarding-v1-browser-fixture.html';
const log=s=>process.stdout.write('PASS '+s+'\n');
(async()=>{
 const browser=webkitMode?await webkit.launch({headless:true}):
  await chromium.launch({headless:true,executablePath:process.env.MMH_CHROME_PATH||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:webkitMode?393:1440,height:850}});
  await page.route(/https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
  await page.goto(url,{waitUntil:'domcontentloaded'});
  const step=()=>page.locator('.mmh-onboard-title-v1');
  await step().waitFor({state:'visible'});
  assert.match(await step().innerText(),/first transaction/i);
  log('fresh owner first Transactions visit starts tutorial');
  assert.equal(await page.locator('#mmhTxOnboardingHelpV1').count(),1);
  await page.getByRole('button',{name:'Start guide'}).click();
  assert.match(await step().innerText(),/Manage workspace/);
  await page.locator('.mmh-glass-tx-nav-manage-v1').click();
  await page.waitForFunction(()=>document.querySelector('.mmh-onboard-title-v1')?.textContent?.includes('first type'));
  log('actual Manage click advances to Type coaching');
  const next=()=>page.getByRole('button',{name:'Continue'});
  assert.equal(await next().isDisabled(),true);
  await page.locator('#fixtureCreateType').click();
  await page.waitForFunction(()=>!Array.from(document.querySelectorAll('.mmh-onboard-cta-v1')).find(x=>x.textContent==='Continue')?.disabled);
  await next().click();
  assert.match(await step().innerText(),/Link a transaction/i);
  log('Type can advance only after actual owner configuration');
  await page.evaluate(()=>{localStorage.setItem('mmhvault_language_v3363','zh');window.dispatchEvent(new Event('languagechange'));});
  await page.waitForFunction(()=>document.querySelector('.mmh-onboard-title-v1')?.textContent==='关联交易项目');
  log('English -> Chinese respects site language');
  await page.evaluate(()=>{localStorage.setItem('mmhvault_language_v3363','my');window.dispatchEvent(new Event('languagechange'));});
  await page.waitForFunction(()=>document.querySelector('.mmh-onboard-title-v1')?.textContent?.includes('ချိတ်ဆက်'));
  log('Chinese -> Myanmar respects site language');
  await page.evaluate(()=>{localStorage.setItem('mmhvault_language_v3363','en');window.dispatchEvent(new Event('languagechange'));});
  await page.getByRole('button',{name:'Skip this step'}).click();
  assert.match(await step().innerText(),/category/i);
  await page.getByRole('button',{name:'Skip this step'}).click();
  assert.match(await step().innerText(),/transaction fields/i);
  await next().click();
  assert.match(await step().innerText(),/first transaction/i);
  assert.match(await page.locator('.mmh-onboard-note-v1').innerText(),/not set up an account/i);
  await page.getByRole('button',{name:'Skip this step'}).click();
  assert.match(await step().innerText(),/know the essentials/i);
  assert.match(await page.locator('.mmh-onboard-note-v1').innerText(),/no transaction was created/i);
  assert.equal(await page.evaluate(()=>window.transactions.length),0);
  await page.getByRole('button',{name:'Finish'}).click();
  await page.waitForFunction(()=>!document.querySelector('#mmhTransactionsOnboardStageV1'));
  const persisted=await page.evaluate(id=>JSON.parse(localStorage.getItem('mmhvault_tx_onboarding_v1_'+id)),id);
  assert.equal(persisted.status,'completed');assert.equal(persisted.hasSavedTransaction,false);
  log('skipped transaction never claims successful saving; owner completion is persisted');
  await page.evaluate(B=>window.__fixtureSwitchOwner(B,true),B);
  await page.waitForTimeout(200);
  assert.equal(await page.locator('#mmhTransactionsOnboardStageV1').count(),0);
  log('existing member with history and settings is never auto-coached');
  await page.getByRole('button',{name:'Help · Tutorial'}).click();
  await step().waitFor({state:'visible'});
  assert.match(await step().innerText(),/first transaction/i);
  log('legacy member can manually restart from Help');
  if(webkitMode){
   const box=await page.locator('.mmh-onboard-card-v1').boundingBox();
   assert.ok(box&&box.x>=0&&box.x+box.width<=394&&box.y+box.height<=852,'mobile tutorial stays within viewport');
   log('WebKit mobile floating card stays in viewport');
  }else{
   await page.setViewportSize({width:393,height:800});
   const box=await page.locator('.mmh-onboard-card-v1').boundingBox();
   assert.ok(box&&box.x>=0&&box.x+box.width<=394&&box.y+box.height<=802,'mobile card stays within viewport');
   log('Chrome desktop-to-mobile layout is responsive');
  }
  assert.equal(await page.evaluate(()=>window.__fixtureFinancePosts),0);
  log('no backend network, account writes or synthetic ledger inserts');
  await page.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
