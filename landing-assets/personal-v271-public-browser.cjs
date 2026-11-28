/* V2.0.71 public routes: exact released baseline versus candidate.
 * Only public informational HTML and reviewed local images are served.
 * No auth navigation, financial endpoints, external requests or deployment.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const {chromium,webkit}=require('playwright');
const base='c73c94455dd36d8ad769bfe508a03dd92afe4140';
const origin='https://mmh-public-gate-v271.invalid';
const routes={'/about/':'about/index.html','/register/':'register/index.html','/features/':'features/index.html','/business/':'business/index.html','/privacy.html':'privacy.html','/terms.html':'terms.html','/security.html':'security.html'};
const assets={'/images/mmhvault-v2-auth-mark.webp':'image/webp','/apple-touch-icon.png':'image/png','/favicon.png':'image/png'};
const widths=[320,393,440,768,1024,1051,1100,1200,1290,1440,1920];
const engine=process.env.MMH_SETTINGS_BROWSER||'chromium';
assert(['chromium','webkit'].includes(engine));
const released=path=>execFileSync('git',['show',base+':'+path],{maxBuffer:10*1024*1024});
const sources={};
for(const path of [...Object.values(routes),...Object.keys(assets).map(p=>p.slice(1))]){
 const baseline=released(path),candidate=fs.readFileSync(path);
 assert.deepEqual(candidate,baseline,'protected public asset '+path);
 sources[path]={baseline,candidate};
}
async function sample(browser,route,width,mode){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',colorScheme:'light'});
 const errors=[],unexpected=[];
 try{
  await context.route('**/*',request=>{
   const url=new URL(request.request().url());
   if(url.origin===origin&&url.pathname===route)return request.fulfill({status:200,contentType:'text/html; charset=utf-8',body:sources[routes[route]][mode]});
   if(url.origin===origin&&assets[url.pathname])return request.fulfill({status:200,contentType:assets[url.pathname],body:sources[url.pathname.slice(1)][mode]});
   if(url.href==='https://static.cloudflareinsights.com/beacon.min.js')return request.fulfill({status:200,contentType:'application/javascript',body:''});
   unexpected.push(url.href);return request.abort();
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(origin+route,{waitUntil:'load'});
  assert.equal(response.status(),200);
  assert.equal(await page.locator('h1').count(),1);
  assert.equal(await page.locator('link[rel=canonical]').count(),1);
  assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://mmhvault.com'+route);
  assert.ok(await page.locator('a[href="/login.html"]').count()>0);
  assert.equal(await page.locator('meta[name=robots]').evaluateAll(nodes=>nodes.some(n=>/noindex/i.test(n.content))),false);
  await page.locator('img.mmh-brand-image').first().evaluate(img=>img.decode());
  const metrics=[];
  for(const lang of ['en','zh','my']){
   await page.locator('#langToggle').click();await page.locator('[data-lang-choice="'+lang+'"]').click();
   assert.equal(await page.locator('html').getAttribute('lang'),lang==='zh'?'zh-CN':lang);
   for(const theme of ['light','dark']){
    await page.locator('#themeToggle').click();await page.locator('[data-theme-choice="'+theme+'"]').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
    metrics.push(await page.evaluate(()=>{
     const root=document.documentElement;
     const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(v=>Math.round(v*100)/100)};
     return {overflow:Math.max(0,root.scrollWidth-root.clientWidth),header:rect('header'),heading:rect('h1'),title:document.title,lang:root.lang,theme:root.dataset.theme};
    }));
   }
  }
  const menu=page.locator('#menuToggle');
  if(await menu.isVisible()){
   await menu.click();assert.equal(await menu.getAttribute('aria-expanded'),'true');
   await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');
  }
  const scroll=await page.evaluate(()=>{window.scrollTo(0,document.documentElement.scrollHeight);return {max:document.documentElement.scrollHeight-innerHeight,y:scrollY}});
  if(scroll.max>2)assert(scroll.y>0,'public page scroll');
  assert.deepEqual(errors,[],route+' page errors');
  assert.deepEqual(unexpected,[],route+' unexpected requests');
  return metrics;
 }finally{await context.close()}
}
(async()=>{
 const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
 try{
  for(const route of Object.keys(routes))for(const width of widths){
   const old=await sample(browser,route,width,'baseline');
   const next=await sample(browser,route,width,'candidate');
   assert.deepEqual(next,old,engine+' '+route+' '+width+' public V2 parity');
   console.log('PASS '+engine+' '+route+' '+width+' EN/ZH/MY themes; baseline overflow px '+old.map(x=>x.overflow).join(','));
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
