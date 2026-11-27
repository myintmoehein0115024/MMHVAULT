// Personal-only synthetic browser smoke tests. No login, network, or financial writes.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const js=readFileSync('js/mmhvault-forecast-v1.js','utf8');
const css=readFileSync('css/mmhvault-liquid-forecast-p916.css','utf8');
new Function(js);
const browser=await chromium.launch({headless:true});
try {
 for(const width of [393,1440]) for(const lang of ['en','zh','my']) for(const dark of [false,true]) {
  const page=await browser.newPage({viewport:{width,height:844},colorScheme:dark?'dark':'light'});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.request().url()==='https://forecast.test/'?route.fulfill({contentType:'text/html',body:'<!doctype html><html><body class="mmh-workspace-active"><main id="forecast" class="page active"><div id="mmhForecastRootV1"></div></main></body></html>'}):route.abort());
  await page.goto('https://forecast.test/');
  await page.addStyleTag({content:':root{--uv-card:'+(dark?'#161b22':'#fff')+';--uv-raised:'+(dark?'#222934':'#f5f6f8')+';--uv-line:'+(dark?'#414956':'#ddd')+';--uv-text:'+(dark?'#eee':'#222')+';--uv-muted:#777;--uv-accent:#4388bb;--uv-positive:#16844f;--uv-negative:#b93b3b}body{margin:0;font-family:system-ui}'+css});
  await page.evaluate(language=>{localStorage.setItem('mmhvault_language_v3363',language);window.currentSessionUser={id:'synthetic-browser-only'};window.rates={usd_thb:35,usd_cny:7,usd_mmk:4000};window.mmhvaultCashUSD=()=>10000;window.mmhvaultInvestmentValueUSD=()=>2000;window.mmhDashboardReceivableUSD=()=>500;},lang);
  await page.addScriptTag({content:js});
  const dialog=page.locator('.fc-dialog');
  await page.locator('[data-fc-open-modal="months"]').click();
  await dialog.waitFor();
  const title=await dialog.locator('h2').textContent();
  assert.equal(title,({en:'Month-by-month forecast',zh:'逐月资产预测',my:'လစဉ်ခန့်မှန်းချက်'})[lang]);
  const bounds=await dialog.boundingBox();
  assert.ok(bounds&&bounds.x>=-1&&bounds.x+bounds.width<=width+1,'dialog within viewport');
  await dialog.locator('[data-fc-month-view]').first().click();
  assert.equal(await dialog.locator('input').count(),0,'view is read-only');
  await dialog.locator('[data-fc-back-modal]').click();
  await dialog.locator('[data-fc-month-edit]').first().click();
  assert.ok(await dialog.locator('input[data-fc-month]').count()>0,'month edit inputs');
  await dialog.locator('[data-fc-back-modal]').click();
  assert.equal(await dialog.locator('h2').textContent(),title);
  await page.keyboard.press('Escape');
  await dialog.waitFor({state:'detached'});
  await page.locator('[data-fc-open-modal="plan"]').click();
  await dialog.locator('.fc-shared-picker summary').first().click();
  const menu=dialog.locator('.fc-shared-picker[open] .fc-shared-menu');
  await menu.waitFor();
  const search=menu.locator('input[type=search]');
  await search.fill('JPY');
  await menu.locator('[data-ap-currency="JPY"]').click();
  await dialog.locator('input[data-fc-rate="JPY"]').waitFor();
  await dialog.locator('[data-fc-back-modal]').click();
  assert.ok(await dialog.locator('input[data-fc-base]').count()>0,'FX returns to monthly plan');
  await page.keyboard.press('Escape');
  await dialog.waitFor({state:'detached'});
  assert.deepEqual(errors,[]);
  console.log('PASS synthetic browser',width,lang,dark?'dark':'light');
  await page.close();
 }
} finally {await browser.close();}
