import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const extract=(start,end)=>{const a=app.indexOf(start),b=app.indexOf(end,a);assert(a>=0&&b>a,start);return app.slice(a,b)};
const tag='<style id="mmhvault-personal-font-v265-css">';
const css=extract(tag,'</style>').slice(tag.length);
const helpers=extract('const fontStylesV265=','function disclosure(title,source)');
const row=extract('function row(icon,label,id,options,value)','function group(title)');
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.route('**/*',route=>route.abort());
 const page=await context.newPage();
 await page.setContent('<html lang="en"><body class="mmh-workspace-active"><div id="header"><h2 id="headerText">Workspace</h2></div><div id="bottomNav"><label id="railText">Navigation</label></div><main class="page active" id="settings"><div id="rows"></div><h2 id="sample">Balance</h2><button id="icon" class="icon" aria-hidden="true">?</button></main></body></html>');
 await page.addStyleTag({content:'body{font-family:Arial,sans-serif}h2,label{font-family:Arial,sans-serif!important}#icon{font-family:monospace!important}.st-row{display:flex;align-items:center;gap:8px}.st-row select{margin-left:auto}'+css});
 await page.addScriptTag({content:`const $=id=>document.getElementById(id);let owner='a';let fail=false;const store=new Map();const prefOwner=()=>owner;const lsGet=k=>store.get(k)??null;const lsSet=(k,v)=>{if(fail)return false;store.set(k,v);return true};`+row+helpers+`addFontV265($('rows'));window.fontFixture={owner:id=>{owner=id;dispatchEvent(new Event('mmhvault:config-owner-changed'))},lang:id=>{document.documentElement.lang=id;dispatchEvent(new Event('mmhvault-language-change'))},fail:v=>{fail=v}};`});
 const select=page.locator('#stPref_fontV265'),family=id=>page.locator(id).evaluate(el=>getComputedStyle(el).fontFamily);
 assert.equal(await select.inputValue(),'system');
 const base=await family('#sample'),icon=await family('#icon');
 assert.match(base,/Arial/);
 await select.selectOption('elegant');
 assert.match(await family('#sample'),/Georgia/);assert.match(await family('#headerText'),/Georgia/);assert.match(await family('#railText'),/Georgia/);
 assert.equal(await family('#icon'),icon);
 await page.evaluate(()=>fontFixture.lang('zh-CN'));assert.equal(await select.inputValue(),'system');
 await select.selectOption('minimal');assert.match(await family('#sample'),/LXGW WenKai/);
 assert.equal(await page.locator('#stFontLabelV265').textContent(),'字体样式');
 await page.evaluate(()=>fontFixture.lang('my'));assert.equal(await select.inputValue(),'system');
 await select.selectOption('soft');assert.match(await family('#sample'),/Myanmar3/);
 await page.evaluate(()=>fontFixture.lang('en'));assert.equal(await select.inputValue(),'elegant');
 await page.evaluate(()=>fontFixture.owner('b'));assert.equal(await select.inputValue(),'system');assert.equal(await family('#sample'),base);
 await page.evaluate(()=>fontFixture.owner('a'));assert.equal(await select.inputValue(),'elegant');
 await page.evaluate(()=>fontFixture.fail(true));await select.selectOption('digital');assert.equal(await select.inputValue(),'elegant');assert.match(await page.locator('#stFontStatusV265').textContent(),/Unable to save/);
 await page.evaluate(()=>fontFixture.fail(false));await select.selectOption('system');assert.equal(await family('#sample'),base);
 await select.selectOption('digital');await page.evaluate(()=>document.body.classList.add('auth-page-active'));assert.equal(await family('#sample'),base);
 await page.evaluate(()=>{document.body.classList.remove('auth-page-active');fontFixture.owner('guest')});assert.equal(await select.isDisabled(),true);assert.equal(await family('#sample'),base);
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:844});await page.evaluate(()=>fontFixture.owner('a'));
  for(const locale of ['en','zh-CN','my']){
   await page.evaluate(l=>fontFixture.lang(l),locale);await select.selectOption('elegant');
   assert(await page.locator('#stFontPreviewV265').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   assert(await select.evaluate(el=>el.getBoundingClientRect().height>=44));
  }
 }
 console.log('PASS: font selector, computed family cascade, language/owner memory, blocked storage, auth isolation and responsive preview (isolated Chromium; glyph availability not verified)');
 await context.close();
}finally{await browser.close()}
