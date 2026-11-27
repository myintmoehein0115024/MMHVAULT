// Personal-only synthetic browser smoke tests. No login, network, or financial writes.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const js=readFileSync('js/mmhvault-forecast-v1.js','utf8');
const css=readFileSync('css/mmhvault-liquid-forecast-p916.css','utf8');
const app=readFileSync('app.html','utf8');
const marker='// Shared V2 currency menu: Accounts and History use the same renderer, labels, ordering and rows.';
const finish='window.MMHCurrencyPickerV3=Object.freeze({render:renderSharedCurrencyV3,flag:sharedCurrencyFlagV3});';
const from=app.indexOf(marker),to=app.indexOf(finish,from);
assert.ok(from>=0&&to>from,'real shared renderer found');
const shared=app.slice(from,to+finish.length);
new Function(shared);
new Function(js);
const browser=await chromium.launch({headless:true});
try {
 for(const width of [393,1440]) for(const lang of ['en','zh','my']) for(const dark of [false,true]) {
  const page=await browser.newPage({viewport:{width,height:844},colorScheme:dark?'dark':'light'});
  page.setDefaultTimeout(8000);
  console.log('START synthetic browser',width,lang,dark?'dark':'light');
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.request().url()==='https://forecast.test/'?route.fulfill({contentType:'text/html',body:'<!doctype html><html><body class="mmh-workspace-active"><header id="fixture-header">Workspace</header><div id="fixture-scroll"><main id="forecast" class="page active"><div id="mmhForecastRootV1"></div></main><div style="height:500px"></div></div><div id="mmhVaultDialogV449"></div></body></html>'}):route.abort());
  await page.goto('https://forecast.test/');
  await page.addStyleTag({content:':root{--uv-card:'+(dark?'#161b22':'#fff')+';--uv-raised:'+(dark?'#222934':'#f5f6f8')+';--uv-line:'+(dark?'#414956':'#ddd')+';--uv-text:'+(dark?'#eee':'#222')+';--uv-muted:#777;--uv-accent:#4388bb;--uv-positive:#16844f;--uv-negative:#b93b3b}body{margin:0;font-family:system-ui}#fixture-header{position:fixed;inset:0 0 auto;height:70px;z-index:10000;background:#223;color:white}#fixture-scroll{position:fixed;inset:70px 0 0 '+(width>760?'200':'0')+'px;overflow:auto;transform:translateZ(0);contain:paint}#forecast{transform:translateZ(0)}#mmhVaultDialogV449.show{position:fixed;inset:20%;background:#777;z-index:10001}'+css});
  await page.evaluate(language=>{document.documentElement.lang=language;window.MMHVAULT_CONFIG={accounts:[]};localStorage.setItem('mmhvault_language_v3363',language);window.currentSessionUser={id:'synthetic-browser-only'};window.rates={usd_thb:35,usd_cny:7,usd_mmk:4000};window.mmhvaultCashUSD=()=>10000;window.mmhvaultInvestmentValueUSD=()=>2000;window.mmhDashboardReceivableUSD=()=>500;},lang);
  await page.addScriptTag({content:shared});
  await page.addScriptTag({content:js});
  const dialog=page.locator('.fc-dialog');
  const within=async locator=>{const b=await locator.boundingBox();assert.ok(b&&b.x>=-1&&b.y>=-1&&b.x+b.width<=width+1&&b.y+b.height<=844+1,'element within viewport');return b;};
  const anchored=async (trigger,menu)=>{await menu.and(page.locator(':popover-open')).waitFor({state:'visible',timeout:8000});const a=await trigger.boundingBox(),m=await within(menu);assert.ok(Math.min(Math.abs(m.y-(a.y+a.height)),Math.abs(m.y+m.height-a.y))<=8,'menu vertically adjacent to trigger');assert.ok(m.x<=a.x+a.width+1&&m.x+m.width>=a.x-1,'menu horizontally overlaps trigger');};
  for(const selector of ['[data-fc-picker-kind="view"]','[data-fc-date-picker="end"]','[data-fc-date-picker="selected"]']){
   console.log('CHECK anchored picker',selector);
   const p=page.locator(selector),trigger=p.locator('summary');await trigger.click();await anchored(trigger,p.locator('.fc-shared-menu,.fc-choice-menu'));await page.keyboard.press('Escape');assert.equal(await p.getAttribute('open'),null);
  }
  await page.locator('[data-fc-open-modal="months"]').click();
  await dialog.waitFor();
  const title=await dialog.locator('h2').textContent();
  assert.equal(title,({en:'Month-by-month forecast',zh:'逐月资产预测',my:'လစဉ်ခန့်မှန်းချက်'})[lang]);
  const bounds=await dialog.boundingBox();
  await within(dialog);await within(dialog.locator('.fc-dialog-header'));await within(dialog.locator('.fc-dialog-footer'));assert.ok(bounds&&Math.abs(bounds.y+bounds.height/2-422)<=3,'dialog vertically centered after workspace scroll');
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
  await menu.waitFor();await anchored(dialog.locator('.fc-shared-picker[open] summary'),menu);
  assert.ok(await menu.locator('.ap-currency-section-v2').count()>0,'real shared grouped renderer');
  const search=menu.locator('input[type=search]');
  await search.fill('JPY');
  await menu.locator('[data-ap-currency="JPY"]').click();
  await dialog.locator('input[data-fc-rate="JPY"]').waitFor();
  await dialog.locator('[data-fc-back-modal]').click();
  assert.ok(await dialog.locator('input[data-fc-base]').count()>0,'FX returns to monthly plan');
  await page.evaluate(()=>document.getElementById('mmhVaultDialogV449').classList.add('show'));await dialog.waitFor({state:'hidden'});await page.evaluate(()=>document.getElementById('mmhVaultDialogV449').classList.remove('show'));await dialog.waitFor({state:'visible'});await within(dialog.locator('.fc-dialog-header'));
  await page.keyboard.press('Escape');
  await dialog.waitFor({state:'detached'});
  assert.deepEqual(errors,[]);
  console.log('PASS synthetic browser',width,lang,dark?'dark':'light');
  await page.close();
 }
} finally {await browser.close();}
