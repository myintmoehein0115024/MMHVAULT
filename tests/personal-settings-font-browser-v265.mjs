import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const extract=(start,end)=>{const a=app.indexOf(start),b=app.indexOf(end,a);assert(a>=0&&b>a,start);return app.slice(a,b)};
const tag='<style id="mmhvault-personal-font-v265-css">';
const css=extract(tag,'</style>').slice(tag.length);
const legacyAccountFont=extract('html body #mmhVaultDialogV449#mmhVaultDialogV449 .mmh-account-detail-v148 :is(.mmh-tx-detail-amount-v800,.mmh-tx-detail-hero-v800 h2,.mmh-account-balance-card-v149 b){','}\n')+'}';
const legacyChoiceFont=extract('html body .wv-choice-menu-v2{','}\n')+'}';
const helpers=extract('const fontStylesV265=','function disclosure(title,source)');
const row=extract('function row(icon,label,id,options,value)','function group(title)');
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.route('**/*',route=>route.abort());
 const page=await context.newPage();
 await page.setContent('<html lang="en"><body class="mmh-workspace-active"><div id="header"><h2 id="headerText">Workspace</h2></div><div id="bottomNav"><label id="railText">Navigation</label></div><main class="page active" id="settings"><div id="rows"></div><h2 id="sample">Balance</h2><button id="icon" class="icon" aria-hidden="true">?</button></main><div id="mmhVaultDialogV449"><div class="mmh-account-detail-v148"><span id="accountAmount" class="mmh-tx-detail-amount-v800">100</span><div class="mmh-tx-detail-hero-v800"><h2 id="accountTitle">Account</h2></div><div class="mmh-account-balance-card-v149"><b id="accountBalance">200</b></div></div></div><div class="wv-choice-menu-v2" id="choiceMenu"><button><span>Language</span></button></div></body></html>');
 await page.addStyleTag({content:'body{font-family:Arial,sans-serif}h2,label{font-family:Arial,sans-serif!important}#icon{font-family:monospace!important}.st-row{display:flex;align-items:center;gap:8px}.st-row select{margin-left:auto}'+css+'\n'+legacyAccountFont+'\n'+legacyChoiceFont});
 await page.addScriptTag({content:`const $=id=>document.getElementById(id);let owner='a';let fail=false;const store=new Map();const prefOwner=()=>owner;const lsGet=k=>store.get(k)??null;const lsSet=(k,v)=>{if(fail)return false;store.set(k,v);return true};`+row+helpers+`addFontV265($('rows'));window.fontFixture={owner:id=>{owner=id;dispatchEvent(new Event('mmhvault:config-owner-changed'))},lang:id=>{document.documentElement.lang=id;dispatchEvent(new Event('mmhvault-language-change'))},fail:v=>{fail=v}};`});
 const select=page.locator('#stPref_fontV265'),family=id=>page.locator(id).evaluate(el=>getComputedStyle(el).fontFamily);
 assert.equal(await select.inputValue(),'system');
 const base=await family('#sample'),icon=await family('#icon'),accountBase=await family('#accountAmount');
 const choiceBase=await family('#choiceMenu');assert.match(choiceBase,/Inter/);
 assert.match(accountBase,/system-ui/);
 assert.match(base,/Arial/);
 await select.selectOption('elegant');
 assert.match(await family('#sample'),/Georgia/);assert.match(await family('#headerText'),/Georgia/);assert.match(await family('#railText'),/Georgia/);
 assert.equal(await family('#icon'),icon);assert.match(await family('#choiceMenu'),/Georgia/);
 for(const id of ['#accountAmount','#accountTitle','#accountBalance'])assert.match(await family(id),/Georgia/);
 await page.evaluate(()=>fontFixture.lang('zh-CN'));assert.equal(await select.inputValue(),'system');
 await select.selectOption('minimal');assert.match(await family('#sample'),/LXGW WenKai/);
 assert.equal(await page.locator('#stFontLabelV265').textContent(),'字体样式');
 await page.evaluate(()=>fontFixture.lang('my'));assert.equal(await select.inputValue(),'system');
 await select.selectOption('soft');assert.match(await family('#sample'),/Myanmar3/);
 await page.evaluate(()=>fontFixture.lang('en'));assert.equal(await select.inputValue(),'elegant');
 await page.evaluate(()=>fontFixture.owner('b'));assert.equal(await select.inputValue(),'system');assert.equal(await family('#sample'),base);
 await page.evaluate(()=>fontFixture.owner('a'));assert.equal(await select.inputValue(),'elegant');
 await page.evaluate(()=>fontFixture.fail(true));await select.selectOption('digital');assert.equal(await select.inputValue(),'elegant');assert.match(await page.locator('#stFontStatusV265').textContent(),/Unable to save/);
 await page.evaluate(()=>fontFixture.fail(false));await select.selectOption('system');assert.equal(await family('#sample'),base);assert.equal(await family('#accountAmount'),accountBase);assert.equal(await family('#choiceMenu'),choiceBase);
 await select.selectOption('digital');await page.evaluate(()=>document.body.classList.add('auth-page-active'));assert.equal(await family('#sample'),base);assert.equal(await family('#accountAmount'),accountBase);assert.equal(await family('#choiceMenu'),choiceBase);
 await page.evaluate(()=>{document.body.classList.remove('auth-page-active');fontFixture.owner('guest')});assert.equal(await select.isDisabled(),true);assert.equal(await family('#sample'),base);
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:844});await page.evaluate(()=>fontFixture.owner('a'));
  for(const locale of ['en','zh-CN','my']){
   await page.evaluate(l=>fontFixture.lang(l),locale);await select.selectOption('elegant');
   assert(await page.locator('#stFontPreviewV265').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   assert(await select.evaluate(el=>el.getBoundingClientRect().height>=44));
  }
 }
 // Inspect actual platform fonts rather than assuming a computed CSS stack is installed.
 const cdp=await context.newCDPSession(page);
 try{
  await cdp.send('DOM.enable');await cdp.send('CSS.enable');
  const {root}=await cdp.send('DOM.getDocument');
  const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#sample'});
  assert(nodeId>0);
  for(const [locale,sample] of [['en','Balance and savings'],['zh-CN','账户余额与储蓄'],['my','လက်ကျန်ငွေနှင့် စုဆောင်းငွေ']]){
   await page.evaluate(l=>fontFixture.lang(l),locale);
   await page.locator('#sample').evaluate((el,s)=>{el.textContent=s},sample);
   const styles={};
   for(const style of ['system','modern','elegant','minimal','digital','soft','bold']){
    await select.selectOption(style);
    await page.evaluate(async()=>{await document.fonts.ready;document.querySelector('#sample').getBoundingClientRect()});
    const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
    assert(Array.isArray(fonts)&&fonts.some(f=>f.glyphCount>0),locale+' '+style+' has rendered glyphs');
    styles[style]=fonts.filter(f=>f.glyphCount>0).map(f=>({family:f.familyName,postScript:f.postScriptName,glyphs:f.glyphCount,custom:f.isCustomFont}));
   }
   const distinct=new Set(Object.values(styles).map(fonts=>JSON.stringify(fonts.map(f=>[f.family,f.postScript]).sort()))).size;
   console.log('FONT-DIAGNOSTIC '+JSON.stringify({locale,distinctRenderedFontSets:distinct,styles}));
   if(distinct<7)console.log('FONT-LIMITATION '+locale+': some styles share actual platform fonts; do not infer glyph differentiation from CSS.');
  }
 }finally{await cdp.detach()}
 console.log('PASS: font selector, computed family cascade including legacy account detail and workspace choice menu, language/owner memory, blocked storage, auth isolation and responsive preview (isolated Chromium; glyph availability not verified)');
 await context.close();
 // Candidate-only test: pinned upstream assets, hash checked before isolated rendering.
 // No font files are committed, no application runtime requests are introduced.
 const revision='5026800714d07231937d92eb4cceabf06e05d74e';
 const candidates=[
  ['zh-CN','notosanssc','NotoSansSC[wght].ttf','fb0637bafbcd804fe32152370a1225990745b4bc'],
  ['zh-CN','notoserifsc','NotoSerifSC[wght].ttf','eab063faf229160a52d3760f5555150e4eb9e5bf'],
  ['zh-CN','zcoolqingkehuangyou','ZCOOLQingKeHuangYou-Regular.ttf','982a3b80143268592f573feb196791fbc2330e17'],
  ['my','notosansmyanmar','NotoSansMyanmar[wdth,wght].ttf','a7af8e405d24076f2930c0840523110b3236560b'],
  ['my','notoserifmyanmar','NotoSerifMyanmar-Regular.ttf','86adf96a587b326f5961b9550d54029608bdc760'],
  ['my','padauk','Padauk-Regular.ttf','a6882fbb2177bec0271a0b10821a33100efe1fc7']
 ];
 const samples={'zh-CN':'账户余额与储蓄交易投资设置财务目标汇率预算收入支出','my':'လက်ကျန်ငွေနှင့်စုဆောင်းငွေမြန်မာဘာသာ၀၁၂၃၄၅၆၇၈၉'};
 const results={};
 for(const [locale,folder,file,expected] of candidates){
  const url='https://raw.githubusercontent.com/google/fonts/'+revision+'/ofl/'+folder+'/'+encodeURIComponent(file);
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(45000)});
  assert(response.ok,folder+' pinned asset HTTP '+response.status);
  const bytes=Buffer.from(await response.arrayBuffer());
  assert(bytes.length>0&&bytes.length<=40*1024*1024,folder+' asset size bounds');
  const actual=createHash('sha1').update('blob '+bytes.length+'\\0').update(bytes).digest('hex');
  assert.equal(actual,expected,folder+' exact Git blob hash');
  const fixture=await browser.newContext({viewport:{width:768,height:400}});
  try{
   await fixture.route('**/*',route=>route.request().url()==='https://font-fixture.invalid/candidate.ttf'?route.fulfill({status:200,contentType:'font/ttf',headers:{'Access-Control-Allow-Origin':'*'},body:bytes}):route.abort());
   const p=await fixture.newPage();
   await p.setContent('<html><body><div id="glyphs" style="font-size:32px;font-weight:400;line-height:1.6;color:black;background:white"></div></body></html>');
   await p.locator('#glyphs').evaluate((el,s)=>{el.textContent=s},samples[locale]);
   await p.addStyleTag({content:'@font-face{font-family:Candidate;src:url(https://font-fixture.invalid/candidate.ttf) format("truetype");font-display:block}#glyphs{font-family:Candidate,sans-serif}'});
   await p.evaluate(async()=>{const loaded=await document.fonts.load('32px Candidate',document.querySelector('#glyphs').textContent);if(!loaded.length)throw Error('candidate not loaded');await document.fonts.ready;document.querySelector('#glyphs').getBoundingClientRect()});
   const session=await fixture.newCDPSession(p);
   try{
    await session.send('DOM.enable');await session.send('CSS.enable');
    const {root}=await session.send('DOM.getDocument');
    const {nodeId}=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#glyphs'});
    const {fonts}=await session.send('CSS.getPlatformFontsForNode',{nodeId});
    const rendered=fonts.filter(x=>x.glyphCount>0);
    assert(rendered.length>0&&rendered.every(x=>x.isCustomFont),folder+' sample rendered without platform fallback: '+JSON.stringify(rendered));
    const image=await p.locator('#glyphs').screenshot({animations:'disabled'});
    const pixels=createHash('sha256').update(image).digest('hex');
    (results[locale]??=[]).push({folder,bytes:bytes.length,pixels,fonts:rendered.map(x=>({family:x.familyName,postScript:x.postScriptName,glyphs:x.glyphCount}))});
   }finally{await session.detach()}
  }finally{await fixture.close()}
 }
 for(const [locale,fonts] of Object.entries(results)){
  assert.equal(new Set(fonts.map(x=>x.pixels)).size,fonts.length,locale+' candidate sample images must differ');
  console.log('FONT-CANDIDATE '+JSON.stringify({locale,fonts}));
 }
 console.log('PASS: six pinned OFL candidate assets rendered isolated sample text without platform fallback; three distinct sample images per language (not full coverage or application integration)');
}finally{await browser.close()}
