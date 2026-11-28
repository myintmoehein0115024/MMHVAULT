import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
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
 // Birthday profile: exact markup, original module and scoped theme CSS, no production requests.
 const bdContext=await browser.newContext({viewport:{width:390,height:844}});
 try{
  const bdStart='<div class="panel mmh-birthday-settings-v34216"';
  const birthday=extract(bdStart,'\n</div>\n\n<div class="mmh-manager-overlay-v1"');
  const form=extract('<form class="mmh-profile-edit-v1" id="mmhProfileFormV1">','</form>')+'</form>';
  const originalCss=extract('<style id="mmhvault-v34216-birthday-settings-css">','</style>').split('>').slice(1).join('>');
  const themeCss=readFileSync(new URL('../css/mmhvault-settings-life-p928.css',import.meta.url),'utf8');
  const ageCode=extract('<script id="mmhvault-v34216-age-js">','</script>').replace('<script id="mmhvault-v34216-age-js">','');
  const origin='https://birthday-fixture.invalid/';
  await bdContext.route('**/*',route=>route.request().url()===origin?route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="mmh-workspace-active"><main id="settings" class="page active"><section id="stPage_profile" class="st-page">'+form+birthday+'</section></main></body></html>'}):route.abort());
  const p=await bdContext.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(origin);assert.equal(await p.evaluate(()=>document.characterSet),'UTF-8');
  await p.addStyleTag({content:'*{box-sizing:border-box}body{margin:0;padding:12px;font:14px system-ui,sans-serif;--text:#eef1ff;--muted:#9da6d2}body.light{--text:#17213a;--muted:#5f6f8e}.panel{width:100%;padding:15px}.toolbar h2{margin:0}.mmh-profile-edit-v1{display:grid;grid-template-columns:1fr;gap:8px}.mmh-profile-edit-v1 input{max-width:100%}'+originalCss+'\n'+themeCss});
  await p.addScriptTag({content:'let currentSessionUser={id:"synthetic-a"};window.birthdayFixture={owner:id=>{currentSessionUser={id};dispatchEvent(new Event("mmhvault:config-owner-changed"))},lang:l=>{document.documentElement.lang=l;dispatchEvent(new Event("mmhvault-language-change"))}};'+ageCode});
  const input=p.locator('#mmhBirthDateInputV34215'),panel=p.locator('#mmhBirthdaySettingsV34215');
  assert.equal(await panel.count(),1);assert.equal(await input.inputValue(),'');assert.equal(await input.getAttribute('min'),'1900-01-01');assert.match(await input.getAttribute('max'),/^\d{4}-\d{2}-\d{2}$/);
  assert(await panel.evaluate(el=>el.previousElementSibling?.id==='mmhProfileFormV1'&&!el.closest('form')));
  await input.fill('2000-02-20');await input.blur();
  assert.equal(await p.evaluate(()=>localStorage.getItem('mmhvault_birth_date_v34216_synthetic-a')),'2000-02-20');
  assert.match(await p.locator('#mmhSettingsAgeValueV34215').textContent(),/years/);
  assert(await input.evaluate(el=>{const old=el.value;el.value='2999-01-01';const bad=el.validity.rangeOverflow;el.value=old;return bad}));
  await p.evaluate(()=>birthdayFixture.owner('synthetic-b'));assert.equal(await input.inputValue(),'');assert.equal(await p.locator('#mmhSettingsAgeValueV34215').textContent(),'—');
  await input.fill('2001-03-04');await input.blur();
  await p.evaluate(()=>birthdayFixture.owner('guest'));assert(await input.isDisabled());assert.equal(await input.inputValue(),'');
  await p.evaluate(()=>birthdayFixture.owner('synthetic-a'));assert.equal(await input.inputValue(),'2000-02-20');
  for(const width of [320,390,768,1280]){
   await p.setViewportSize({width,height:844});
   for(const [lang,title,age] of [['en','Birthday','years'],['zh-CN','生日','岁'],['my','မွေးနေ့','နှစ်']]){
    await p.evaluate(l=>birthdayFixture.lang(l),lang);
    assert.equal(await panel.locator('h2').textContent(),title);assert((await p.locator('#mmhSettingsAgeValueV34215').textContent()).includes(age));
    for(const light of [false,true]){
     await p.evaluate(v=>document.body.classList.toggle('light',v),light);
     const result=await panel.evaluate(el=>{
      const input=el.querySelector('input'),r=el.getBoundingClientRect(),ir=input.getBoundingClientRect(),styles=getComputedStyle(el);
      return {bg:styles.backgroundColor,scheme:styles.colorScheme,overflow:el.scrollWidth>el.clientWidth+1,inputFits:ir.left>=r.left&&ir.right<=r.right&&ir.height>=44,gridFits:[...el.querySelectorAll('.mmh-birthday-preview-v34216>div')].every(x=>x.scrollWidth<=x.clientWidth+1),text:getComputedStyle(el.querySelector('.mmh-birthday-preview-v34216 b')).color,inputColor:getComputedStyle(input).color};
     });
     assert.equal(result.bg,light?'rgb(255, 255, 255)':'rgb(28, 37, 49)');assert.equal(result.scheme,light?'light':'dark');assert.equal(result.text,light?'rgb(36, 51, 71)':'rgb(232, 237, 244)');assert.equal(result.inputColor,result.text);assert(!result.overflow&&result.inputFits&&result.gridFits,JSON.stringify({width,lang,light,result}));
    }
   }
  }
  await input.fill('');await input.blur();assert.equal(await p.evaluate(()=>localStorage.getItem('mmhvault_birth_date_v34216_synthetic-a')),'');
  assert.deepEqual(errors,[]);
  console.log('PASS: birthday profile isolated Chromium native date field, owner separation, 24 responsive locale/theme combinations, local storage and clear');
 }finally{await bdContext.close()}

 // Installation guide: actual DOM/SVG and three scoped styles, simulated browser identity only.
 const installContext=await browser.newContext({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (Android 14; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0'});
 try{
  const origin='https://install-fixture.invalid/';
  await installContext.route('**/*',route=>route.request().url()===origin?route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="settings"><section id="stPage_icon"></section></main></body></html>'}):route.abort());
  await installContext.addInitScript(()=>{Object.defineProperty(document,'referrer',{get:()=> 'android-app://synthetic.fixture'});const original=window.matchMedia.bind(window);window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:!!window.syntheticStandalone}:original(q)});
  const p=await installContext.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(origin);
  assert.equal(await p.evaluate(()=>document.characterSet),'UTF-8');
  const styleIds=['mmhvault-settings-working-controls-v4','mmhvault-personal-install-illustrations-v265','mmhvault-install-guide-v5-css'];
  const guideCss=styleIds.map(id=>{const tag='<style id="'+id+'">';return extract(tag,'</style>').slice(tag.length)}).join('\n');
  const codeTag='<script id="mmhvault-settings-control-feedback-v4">';
  const guideCode=extract(codeTag,'</script>').slice(codeTag.length);
  await p.addStyleTag({content:'*{box-sizing:border-box}body{margin:0;padding:12px;background:#101820;color:#eef1ff;font:14px system-ui,sans-serif}body.light{background:white;color:#243e55}button,select{max-width:100%;font:inherit}'+guideCss});
  await p.evaluate(()=>localStorage.setItem('mmhvault_language_v3363','en'));
  await p.addScriptTag({content:guideCode});
  const button=p.locator('#stInstallAppV4'),guide=p.locator('#stInstallGuideV5'),picker=p.locator('#stInstallDeviceV5'),status=p.locator('#stInstallStatusV4');
  assert(await guide.isHidden());assert.match(await status.textContent(),/full browser app/);
  await button.click();assert(await guide.isVisible());assert.equal(await picker.inputValue(),'android-firefox');
  assert.match(await guide.locator('li').first().textContent(),/full Firefox/);
  await picker.focus();await picker.selectOption('android-chrome');
  assert.equal(await picker.inputValue(),'android-chrome');assert(await picker.evaluate(el=>document.activeElement===el));
  assert.match(await guide.locator('li').first().textContent(),/full Chrome/);
  const lang=async l=>p.evaluate(v=>{localStorage.setItem('mmhvault_language_v3363',v);document.documentElement.lang=v;dispatchEvent(new Event('mmhvault-language-change'))},l);
  await lang('zh');assert.equal(await picker.inputValue(),'android-chrome');assert(await picker.evaluate(el=>document.activeElement===el));
  const devices=['ios','ios-other','android-chrome','android-firefox','android-other','desktop'];
  const locales=[['en','Your device & browser'],['zh','您的设备与浏览器'],['my','သင့်စက်နှင့် ဘရောက်ဇာ']];
  for(const [l,label] of locales){
   await lang(l);assert((await guide.locator('label').textContent()).includes(label));
   for(const device of devices){
    await picker.selectOption(device);assert.equal(await picker.inputValue(),device);
    const result=await guide.evaluate(el=>[...el.querySelectorAll('li')].map(li=>{
     const svg=li.querySelector('svg'),span=li.querySelector('.st-install-step-copy-v265>span:last-child'),r=svg?.getBoundingClientRect();
     return {text:span?.textContent,svg:svg?.namespaceURI==='http://www.w3.org/2000/svg'&&svg.getAttribute('viewBox')&&svg.querySelector('rect')&&r.width>0&&r.height>0,hidden:svg?.parentElement.getAttribute('aria-hidden')};
    }));
    assert(result.length>=3&&result.every(x=>x.text&&x.svg&&x.hidden==='true'),JSON.stringify({l,device,result}));
    if(l==='my')assert(result.every(x=>/[\u1000-\u109f]/.test(x.text)));
    assert.equal(await guide.locator('button').count(),0,'Custom Tab cannot show native install action');
   }
  }
  let cases=0;
  for(const width of [320,390,768,1280]){
   await p.setViewportSize({width,height:844});
   for(const [l] of locales){
    await lang(l);
    for(const light of [false,true]){
     await p.evaluate(v=>document.body.classList.toggle('light',v),light);
     await picker.selectOption(devices[cases%devices.length]);
     const result=await guide.evaluate(el=>{
      const r=el.getBoundingClientRect(),select=el.querySelector('select'),sr=select.getBoundingClientRect(),art=el.querySelector('.st-install-illustration-v265'),accent=art.querySelector('.accent')||el.querySelector('.accent');
      const inside=x=>{const b=x.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1&&b.width>0&&b.height>0};
      return {overflow:el.scrollWidth>el.clientWidth+1,selectFits:inside(select)&&sr.height>=44,artFits:[...el.querySelectorAll('svg')].every(inside),bg:getComputedStyle(art).backgroundColor,stroke:getComputedStyle(accent).stroke,status:getComputedStyle(document.getElementById('stInstallStatusV4')).color};
     });
     assert(!result.overflow&&result.selectFits&&result.artFits,JSON.stringify({width,l,light,result}));
     assert.equal(result.bg,light?'rgb(237, 243, 247)':'rgb(19, 35, 49)');
     assert.equal(result.stroke,light?'rgb(20, 123, 98)':'rgb(112, 212, 176)');
     assert.equal(result.status,light?'rgb(66, 87, 107)':'rgb(150, 174, 197)');cases++;
    }
   }
  }
  await p.evaluate(()=>{window.syntheticStandalone=true;dispatchEvent(new Event('mmhvault-language-change'))});
  assert.equal(await guide.locator('li').count(),0);assert(await guide.locator('p').isVisible());
  assert.deepEqual(errors,[]);
  console.log('PASS: installation guide isolated Chromium SVG, 18 device/locale and '+cases+' responsive theme/locale cases, focus, Custom Tab and simulated standalone');
 }finally{await installContext.close()}
 // Candidate-only test: pinned upstream assets, hash checked before isolated rendering.
 // No font files are committed, no application runtime requests are introduced.
 const revision='5026800714d07231937d92eb4cceabf06e05d74e';
 const candidates=[
  ['zh-CN','notosanssc','NotoSansSC[wght].ttf','fb0637bafbcd804fe32152370a1225990745b4bc'],
  ['zh-CN','notoserifsc','NotoSerifSC[wght].ttf','eab063faf229160a52d3760f5555150e4eb9e5bf'],
  ['zh-CN','zcoolqingkehuangyou','ZCOOLQingKeHuangYou-Regular.ttf','982a3b80143268592f573feb196791fbc2330e17'],
  ['my','notosansmyanmar','NotoSansMyanmar[wdth,wght].ttf','a7af8e405d24076f2930c0840523110b3236560b'],
  ['my','notoserifmyanmar','NotoSerifMyanmar-Regular.ttf','86adf96a587b326f5961b9550d54029608bdc760'],
  ['my','padauk','Padauk-Regular.ttf','a6882fbb2177bec0271a0b10821a33100efe1fc7'],
  ['my','tharlon','Tharlon-Regular.ttf','d3840f3ccd173b3da87e0ed476d33027ad880490'],
  ['zh-CN','lxgwwenkai','LXGWWenKai-Regular.ttf','7f8f031dc5c6c5ba1913d93c36d4667c1e311cea']
 ];
 const samples={'zh-CN':'账户余额与储蓄交易投资设置财务目标汇率预算收入支出','my':'လက်ကျန်ငွေနှင့်စုဆောင်းငွေမြန်မာဘာသာ၀၁၂၃၄၅၆၇၈၉'};
 const results={};
 const lazyCandidates=new Map();
 const chinesePackInputs=new Map();
 const fullPacks=new Map();
 const renderOnlyCandidates=new Map();
 const python=process.env.MMH_FONTQA_PYTHON;
 if(process.env.CI)assert(python,'CI must provide isolated font compression interpreter');
 // Inspect official release archives in memory only; no installation or extracted files.
 // Smiley's digest is pinned from the previous exact-head QA observation,
 // not an upstream published checksum. Zhuque's archive digest is published.
 if(python){
  const releaseArchives=[
   {folder:'smileysans',url:'https://github.com/atelier-anchor/smiley-sans/releases/download/v2.0.1/smiley-sans-v2.0.1.zip',size:5781344,sha256:'299c0be6c960ae37361762eca76f7d0cd516615435bb96c0d4b98a1e70178a07',publishedDigest:false,member:'SmileySans-Oblique.ttf',memberSha256:'b447d7e781f08bc95c4c9f23ba71ed2b8ebb639aa7184485c71c4ca5afcd25c4',licenseUrl:'https://raw.githubusercontent.com/atelier-anchor/smiley-sans/v2.0.1/LICENSE',licenseHash:'d4511630b94994b2b3eb0c99cec1a11cac804004'},
   {folder:'zhuquefangsong',url:'https://github.com/TrionesType/zhuque/releases/download/v0.212/ZhuqueFangsong-v0.212.zip',size:5743932,sha256:'bb8b661a7643d2296a72d9d10530a00949419c4e527fb61783f73c2ba1a8c062',publishedDigest:true,member:'ZhuqueFangsong-Regular.ttf',memberSha256:'558c62730844fe54ba220146ed62f859d4e2880188d92d985f8921c6e3743bc4',licenseUrl:'https://raw.githubusercontent.com/TrionesType/zhuque/v0.212/LICENSE.txt',licenseHash:'1091c8f8b724daaa25b0c941ae3115217744c6c6'}
  ];
  const archiveInspector=String.raw`
import hashlib, io, json, pathlib, sys, zipfile
from fontTools.ttLib import TTFont
source = sys.stdin.buffer.read()
sample = set(map(ord, sys.argv[1]))
with zipfile.ZipFile(io.BytesIO(source)) as archive:
    entries = archive.infolist()
    assert len(entries) <= 256 and sum(e.file_size for e in entries) <= 80*1024*1024, "archive bounds"
    fonts, licenses = [], []
    for entry in entries:
        if entry.is_dir():
            continue
        assert 0 <= entry.file_size <= 40*1024*1024, "entry bounds"
        path = pathlib.PurePosixPath(entry.filename)
        assert not path.is_absolute() and ".." not in path.parts and "\\" not in entry.filename, "unsafe archive path"
        suffix = path.suffix.lower()
        if suffix in (".ttf", ".otf", ".woff2"):
            data = archive.read(entry)
            with TTFont(io.BytesIO(data)) as font:
                chars = set(font.getBestCmap())
                names = font["name"]
                fonts.append({"path": entry.filename, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "family": names.getDebugName(1), "style": names.getDebugName(2), "sourceCount": len(chars), "missingSample": sorted(sample-chars)})
        elif ("license" in path.name.lower() or "ofl" in path.name.lower()) and entry.file_size <= 65536:
            data = archive.read(entry)
            licenses.append({"path": entry.filename, "sha256": hashlib.sha256(data).hexdigest(), "gitBlob": hashlib.sha1(b"blob "+str(len(data)).encode()+b"\x00"+data).hexdigest(), "oflNotice": b"SIL OPEN FONT LICENSE VERSION 1.1" in data.upper()})
    assert fonts, "no supported fonts in archive"
    print(json.dumps({"fonts": fonts, "licenses": licenses}, ensure_ascii=True))
`;
  for(const spec of releaseArchives){
   const licResponse=await fetch(spec.licenseUrl,{redirect:'error',signal:AbortSignal.timeout(30000)});
   assert(licResponse.ok,spec.folder+' release license HTTP '+licResponse.status);
   const license=Buffer.from(await licResponse.arrayBuffer());
   assert(license.length>0&&license.length<=65536,spec.folder+' license size');
   assert.equal(createHash('sha1').update('blob '+license.length+String.fromCharCode(0)).update(license).digest('hex'),spec.licenseHash,spec.folder+' release license hash');
   assert.match(license.toString('utf8'),/SIL OPEN FONT LICENSE Version 1\.1/i);
   const response=await fetch(spec.url,{redirect:'follow',signal:AbortSignal.timeout(45000)});
   assert(response.ok,spec.folder+' archive HTTP '+response.status);
   const final=new URL(response.url);
   assert(final.protocol==='https:'&&['github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(final.hostname),spec.folder+' archive host');
   const bytes=Buffer.from(await response.arrayBuffer());
   assert.equal(bytes.length,spec.size,spec.folder+' release archive size');
   const sha256=createHash('sha256').update(bytes).digest('hex');
   assert.equal(sha256,spec.sha256,spec.folder+' pinned archive digest');
   const audit=spawnSync(python,['-c',archiveInspector,samples['zh-CN']],{input:bytes,maxBuffer:1024*1024,timeout:45000});
   assert.ifError(audit.error);
   assert.equal(audit.status,0,spec.folder+' release inspection: '+audit.stderr?.toString().slice(-2000));
   const inspected=JSON.parse(audit.stdout.toString());
   const member=inspected.fonts.find(x=>x.path===spec.member);
   assert(member&&member.sha256===spec.memberSha256&&member.missingSample.length===0,spec.folder+' exact render member');
   const extracted=spawnSync(python,['-c','import io,sys,zipfile;sys.stdout.buffer.write(zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())).read(sys.argv[1]))',spec.member],{input:bytes,maxBuffer:40*1024*1024,timeout:15000});
   assert.ifError(extracted.error);assert.equal(extracted.status,0,extracted.stderr?.toString());
   assert.equal(createHash('sha256').update(extracted.stdout).digest('hex'),spec.memberSha256);
   renderOnlyCandidates.set(spec.folder,extracted.stdout);candidates.push(['zh-CN',spec.folder,spec.member,null]);
   console.log('FONT-RELEASE-AUDIT '+JSON.stringify({folder:spec.folder,archiveSha256:sha256,publishedDigestVerified:spec.publishedDigest,upstreamLicenseGitBlob:spec.licenseHash,...inspected}));
  }
  console.log('PASS: two Chinese release archives inspected in memory (metadata and coverage diagnostics only; no production assets)');
 }

 // License metadata audit only: never add these files to the pack or runtime until reviewed.
 if(python){
  const mySources=[
   {folder:'pyidaungsu-regular',url:'https://raw.githubusercontent.com/mcfnlp/Pyidaungsu/ff1cd8dfe8c451244329d7a6181c83e769226cac/Pyidaungsu2.5.3/Release/Pyidaungsu-2.5.3_Regular.ttf',blob:'fbea7504343083ae069bbb42f2b0e8b6d944534f',size:189468,license:'OFL-1.1'},
   {folder:'pyidaungsu-bold',url:'https://raw.githubusercontent.com/mcfnlp/Pyidaungsu/ff1cd8dfe8c451244329d7a6181c83e769226cac/Pyidaungsu2.5.3/Release/Pyidaungsu-2.5.3_Bold.ttf',blob:'87f2f157fcd5744727d2fc1855bdf0d8afc0799e',size:234480,license:'OFL-1.1'},
   {folder:'myanmar3',url:'https://raw.githubusercontent.com/eimg/myanmar3/91529979b1d4860ce9b3a761fffcbdedb6479b15/mm3.ttf',blob:'6bb1960e59f904c85a32c09598c1919ae3996315',size:98100,license:'LGPL-2.1-or-later'}
  ];
  const inspectMyanmar=String.raw`
import io, json, sys
from fontTools.ttLib import TTFont
with TTFont(io.BytesIO(sys.stdin.buffer.read())) as font:
    names = font["name"]
    chars = set(font.getBestCmap())
    license_text = names.getDebugName(13) or ""
    print(json.dumps({"family": names.getDebugName(1), "style": names.getDebugName(2), "version": names.getDebugName(5), "copyright": names.getDebugName(0), "licenseText": license_text, "licenseUrl": names.getDebugName(14), "fsType": font["OS/2"].fsType, "sourceCount": len(chars), "missingSample": sorted(set(map(ord, sys.argv[1]))-chars), "shapingTables": [tag for tag in ("GSUB", "GPOS") if tag in font]}, ensure_ascii=True))
`;
  for(const spec of mySources){
   const response=await fetch(spec.url,{redirect:'error',signal:AbortSignal.timeout(30000)});
   assert(response.ok,spec.folder+' pinned metadata HTTP '+response.status);
   const data=Buffer.from(await response.arrayBuffer());
   assert.equal(data.length,spec.size,spec.folder+' exact size');
   assert.equal(createHash('sha1').update('blob '+data.length+String.fromCharCode(0)).update(data).digest('hex'),spec.blob,spec.folder+' exact Git blob hash');
   const audit=spawnSync(python,['-c',inspectMyanmar,samples.my],{input:data,maxBuffer:65536,timeout:15000});
   assert.ifError(audit.error);assert.equal(audit.status,0,audit.stderr?.toString());
   const metadata=JSON.parse(audit.stdout.toString());
   if(spec.license==='OFL-1.1')assert.match(metadata.licenseText,/SIL Open Font License, Version 1\.1/i);
   else assert.match(metadata.licenseText,/GNU Lesser General Public License[\s\S]*version 2\.1[\s\S]*later version/i);
   console.log('FONT-MYANMAR-LICENSE-AUDIT '+JSON.stringify({folder:spec.folder,declaredLicense:spec.license,sourceBlob:spec.blob,...metadata}));
   if(spec.folder!=='pyidaungsu-bold'){assert.equal(metadata.missingSample.length,0,spec.folder+' render sample coverage');renderOnlyCandidates.set(spec.folder,data);candidates.push(['my',spec.folder,spec.folder+'.ttf',spec.blob]);}
  }
  console.log('PASS: pinned Myanmar font embedded license metadata inspected (not redistribution approval or rendering validation)');
 }
 const compressionScript=`
import io, sys
from fontTools.ttLib import TTFont
from fontTools import subset
font=TTFont(io.BytesIO(sys.stdin.buffer.read()))
sample=sys.argv[2]
before=set(font.getBestCmap())
assert set(map(ord,sample)) <= before, "source sample coverage"
if sys.argv[1]=="zh-CN":
    options=subset.Options()
    options.layout_features=["*"]
    sub=subset.Subsetter(options=options)
    sub.populate(text=sample)
    sub.subset(font)
font.flavor="woff2"
output=io.BytesIO()
font.save(output)
data=output.getvalue()
check=TTFont(io.BytesIO(data))
after=set(check.getBestCmap())
assert set(map(ord,sample)) <= after, "compressed sample coverage"
if sys.argv[1]=="my":
    assert before==after, "full Myanmar cmap preservation"
sys.stdout.buffer.write(data)
`;
 for(const [locale,folder,file,expected] of candidates){
  const renderOnly=renderOnlyCandidates.has(folder);
  let bytes=renderOnlyCandidates.get(folder),license=null;
  const licenseHashes={"notosanssc":"1c9f43281b8f216c5461fe9ac729afbade7724e4","notoserifsc":"94d1bf7b52481343e2983fb7751e8b7abe1ea07b","zcoolqingkehuangyou":"bd3df5cf6f237a4afaea70106f8243da07cd8cd8","notosansmyanmar":"c94c47416f38b8ddec9f3fbc9e0241998d7823dc","notoserifmyanmar":"94d1bf7b52481343e2983fb7751e8b7abe1ea07b","padauk":"57410e8e9eb58b0cce938440696cf36e2daf8fcf","tharlon":"6ef7b18ea7f5b430f10160034ecdcd0295335954","lxgwwenkai":"bb1634cb03ee7202d5c66bf2754705493bd73e1e"};
  if(!renderOnly){
  const lxgw=folder==='lxgwwenkai';
   const root=lxgw?'https://raw.githubusercontent.com/lxgw/LxgwWenKai/f4cc16fa07f7d115135d203065e711d43c3076d3/':'https://raw.githubusercontent.com/google/fonts/'+revision+'/ofl/'+folder+'/';
   const licenseResponse=await fetch(root+'OFL.txt',{redirect:'error',signal:AbortSignal.timeout(30000)});
  assert(licenseResponse.ok,folder+' license HTTP '+licenseResponse.status);
  license=Buffer.from(await licenseResponse.arrayBuffer());
  assert(license.length>0&&license.length<=65536,folder+' license size');
  assert.equal(createHash('sha1').update('blob '+license.length+String.fromCharCode(0)).update(license).digest('hex'),licenseHashes[folder],folder+' exact license blob hash');
  assert.match(license.toString('utf8'),/SIL OPEN FONT LICENSE Version 1\.1/i,folder+' OFL notice');
  const url=root+(lxgw?'fonts/TTF/':'')+encodeURIComponent(file);
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(45000)});
  assert(response.ok,folder+' pinned asset HTTP '+response.status);
  bytes=Buffer.from(await response.arrayBuffer());
  assert(bytes.length>0&&bytes.length<=40*1024*1024,folder+' asset size bounds');
  const actual=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(actual,expected,folder+' exact Git blob hash');
  if(locale==='zh-CN')chinesePackInputs.set(folder,{bytes,license,expected,licenseHash:licenseHashes[folder]});
  }
  let compressed=null,packManifest=null;
  if(python&&!renderOnly){
   if(locale==='my'){
    const temp=mkdtempSync(join(tmpdir(),'mmh-font-pack-'));
    try{
     const sourcePath=join(temp,'source.ttf'),licensePath=join(temp,'source-license.txt'),output=join(temp,'candidate');
     writeFileSync(sourcePath,bytes);writeFileSync(licensePath,license);
     const script=fileURLToPath(new URL('../tools/personal-font-pack-v265.py',import.meta.url));
     const build=(source,lic,dest)=>spawnSync(python,[script,folder,'--source',source,'--license',lic,'--output',dest],{maxBuffer:4*1024*1024,timeout:120000});
     const generated=build(sourcePath,licensePath,output);
     assert.ifError(generated.error);assert.equal(generated.status,0,folder+' pack generation: '+generated.stderr?.toString().slice(-2000));
     compressed=readFileSync(join(output,'font.woff2'));
     packManifest=JSON.parse(readFileSync(join(output,'manifest.json'),'utf8'));
     assert.equal(packManifest.output_sha256,createHash('sha256').update(compressed).digest('hex'));
     assert.equal(packManifest.source_git_blob,expected);assert.equal(packManifest.license_git_blob,licenseHashes[folder]);
     assert.deepEqual(readFileSync(join(output,'OFL.txt')),license);
     const generatedCSS=readFileSync(join(output,'font.css'),'utf8');
     assert(generatedCSS.includes(packManifest.family));
     fullPacks.set(folder,{css:generatedCSS,files:new Map([['font.woff2',compressed]])});
     if(folder==='padauk'){
      const repeat=join(temp,'repeat'),again=build(sourcePath,licensePath,repeat);
      assert.ifError(again.error);assert.equal(again.status,0,again.stderr?.toString());assert.deepEqual(readFileSync(join(repeat,'font.woff2')),compressed,'deterministic pack');
      const badSource=join(temp,'bad.ttf'),badLicense=join(temp,'bad.txt');writeFileSync(badSource,Buffer.concat([bytes,Buffer.from([0])]));writeFileSync(badLicense,Buffer.concat([license,Buffer.from([0])]));
      assert.notEqual(build(badSource,licensePath,join(temp,'reject-source')).status,0,'tampered font rejected');
      assert.notEqual(build(sourcePath,badLicense,join(temp,'reject-license')).status,0,'tampered license rejected');
      assert.notEqual(build(sourcePath,licensePath,output).status,0,'existing output protected');
      assert.deepEqual(readFileSync(join(output,'font.woff2')),compressed,'existing output unchanged');
     }
    }finally{rmSync(temp,{recursive:true,force:true})}
   }else{
    const conversion=spawnSync(python,['-c',compressionScript,locale,samples[locale]],{input:bytes,maxBuffer:50*1024*1024,timeout:120000});
    assert.ifError(conversion.error);
    assert.equal(conversion.status,0,folder+' compression: '+conversion.stderr?.toString().slice(-2000));
    compressed=conversion.stdout;
   }
   assert(compressed.length>0&&compressed.length<bytes.length,folder+' compressed size');
   assert.equal(compressed.subarray(0,4).toString(),'wOF2',folder+' WOFF2 signature');
  }
  if(compressed)lazyCandidates.set(folder,{locale,bytes:compressed});
  const fixture=await browser.newContext({viewport:{width:768,height:400}});
  try{
   await fixture.route('**/*',route=>{
    const url=route.request().url(),headers={'Access-Control-Allow-Origin':'*'};
    if(url==='https://font-fixture.invalid/candidate.ttf')return route.fulfill({status:200,contentType:'font/ttf',headers,body:bytes});
    if(compressed&&url==='https://font-fixture.invalid/candidate.woff2')return route.fulfill({status:200,contentType:'font/woff2',headers,body:compressed});
    return route.abort();
   });
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
    let compression=null;
    if(compressed){
     const measure=()=>p.locator('#glyphs').evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);const b=r.getBoundingClientRect();return {width:b.width,height:b.height}});
     const originalBounds=await measure();
     await p.addStyleTag({content:'@font-face{font-family:CandidateCompressed;src:url(https://font-fixture.invalid/candidate.woff2) format("woff2");font-display:block}#glyphs{font-family:CandidateCompressed,sans-serif}'});
     await p.evaluate(async()=>{const loaded=await document.fonts.load('32px CandidateCompressed',document.querySelector('#glyphs').textContent);if(!loaded.length)throw Error('compressed candidate not loaded');await document.fonts.ready;document.querySelector('#glyphs').getBoundingClientRect()});
     const {fonts:compressedFonts}=await session.send('CSS.getPlatformFontsForNode',{nodeId});
     const used=compressedFonts.filter(x=>x.glyphCount>0);
     assert(used.length>0&&used.every(x=>x.isCustomFont),folder+' compressed sample rendered without fallback');
     assert.equal(used.reduce((n,x)=>n+x.glyphCount,0),rendered.reduce((n,x)=>n+x.glyphCount,0),folder+' compressed glyph count');
     const bounds=await measure();
     assert(Math.abs(bounds.width-originalBounds.width)<=1&&Math.abs(bounds.height-originalBounds.height)<=1,folder+' compressed text geometry');
     const compressedPixels=createHash('sha256').update(await p.locator('#glyphs').screenshot({animations:'disabled'})).digest('hex');
     compression={kind:locale==='zh-CN'?'sample-only subset':'full font',bytes:compressed.length,pixelEqual:compressedPixels===pixels};
     if(packManifest){assert.equal(compressedPixels,pixels,folder+' renamed candidate retains identical sample pixels');compression.packFamily=packManifest.family;compression.packSha256=packManifest.output_sha256;compression.packCodepoints=packManifest.codepoints;}
    }
    (results[locale]??=[]).push({folder,bytes:bytes.length,pixels,compression,fonts:rendered.map(x=>({family:x.familyName,postScript:x.postScriptName,glyphs:x.glyphCount}))});
   }finally{await session.detach()}
  }finally{await fixture.close()}
 }
 for(const [locale,fonts] of Object.entries(results)){
  assert.equal(new Set(fonts.map(x=>x.pixels)).size,fonts.length,locale+' candidate sample images must differ');
  console.log('FONT-CANDIDATE '+JSON.stringify({locale,fonts}));
 }
 if(python){assert.equal(results['zh-CN'].length,6);assert.equal(results.my.length,6)}
 console.log('PASS: '+candidates.length+' pinned candidate assets rendered isolated sample text without platform fallback; distinct sample images per locale (not redistribution approval, full coverage or application integration)');
 if(python){
  console.log('PASS: eight WOFF2 candidates rendered sample without fallback and preserved glyph count and geometry (Chinese sample subset only; Myanmar full cmap preserved; no assets distributed)');
  console.log('PASS: four reproducible Myanmar candidate packs preserve source license, cmap, axes and sample pixels; tampered source/license and overwrite rejected');
  // Same-origin loading prototype; candidates are ephemeral, not deployable assets.
  const origin='https://mmh-font-fixture.invalid';
  const ctx=await browser.newContext();
  const requests=[];
  let rejectFont='';
  try{
   await ctx.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin!==origin)return route.abort();
    if(url.pathname==='/')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body class="mmh-workspace-active"><main class="page"><div id="text"></div></main></body></html>'});
    const match=/^\/fonts\/([a-z]+)\.woff2$/.exec(url.pathname);
    if(!match)return route.fulfill({status:404,body:''});
    const folder=match[1],candidate=lazyCandidates.get(folder);
    requests.push(folder);
    if(!candidate||folder===rejectFont)return route.fulfill({status:404,body:''});
    return route.fulfill({status:200,contentType:'font/woff2',headers:{'Cache-Control':'public, max-age=31536000, immutable'},body:candidate.bytes});
   });
   const page=await ctx.newPage();
   await page.goto(origin+'/');
   const aliases={notosanssc:'MMH Personal Chinese A',notoserifsc:'MMH Personal Chinese B',zcoolqingkehuangyou:'MMH Personal Chinese C',lxgwwenkai:'MMH Personal Chinese D',notosansmyanmar:'MMH Personal Myanmar A',notoserifmyanmar:'MMH Personal Myanmar B',padauk:'MMH Personal Myanmar C',tharlon:'MMH Personal Myanmar D'};
   // Use actual Settings helper and CSS, not a hand-written font selection implementation.
   const faces=[...lazyCandidates].map(([name])=>'@font-face{font-family:"'+aliases[name]+'";src:url("/fonts/'+name+'.woff2") format("woff2");font-display:swap}').join('');
   await page.locator('main').evaluate(el=>{el.id='settings';el.insertAdjacentHTML('afterbegin','<div id="rows"></div>')});
   await page.addStyleTag({content:faces+'body{font-family:system-ui,sans-serif}'+css});
   await page.addScriptTag({content:`const $=id=>document.getElementById(id);let owner='a';const store=new Map();const prefOwner=()=>owner;const lsGet=k=>store.get(k)??null;const lsSet=(k,v)=>{store.set(k,v);return true};`+row+helpers+`addFontV265($('rows'));window.fontFixture={owner:id=>{owner=id;dispatchEvent(new Event('mmhvault:config-owner-changed'))},lang:id=>{document.documentElement.lang=id;dispatchEvent(new Event('mmhvault-language-change'))}};`});
   const setText=async locale=>{await page.evaluate(l=>fontFixture.lang(l),locale);await page.locator('#text').evaluate((el,s)=>{el.textContent=s},samples[locale])};
   const settle=()=>page.evaluate(async()=>{document.querySelector('#text').getBoundingClientRect();await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});
   const select=async (locale,style)=>{await setText(locale);await page.locator('#stPref_fontV265').selectOption(style);await settle()};
   await setText('my');await settle();assert.deepEqual(requests,[],'System must not request candidate fonts');
   await page.evaluate(()=>document.body.classList.add('auth-page-active'));
   await select('my','modern');assert.deepEqual(requests,[],'Auth page including preview must not request candidate fonts');
   await page.evaluate(()=>document.body.classList.remove('auth-page-active'));
   await select('my','modern');assert.deepEqual(requests,['notosansmyanmar'],'Only selected Myanmar font requested');
   await select('my','modern');assert.deepEqual(requests,['notosansmyanmar'],'Repeat selection reuses loaded font');
   await select('zh-CN','elegant');assert.deepEqual(requests,['notosansmyanmar','notoserifsc'],'Language/choice switch loads only requested Chinese candidate');
   await page.evaluate(()=>fontFixture.owner('guest'));await settle();assert(await page.locator('#stPref_fontV265').isDisabled());assert.equal(requests.length,2,'Guest requests no candidate');
   await page.evaluate(()=>fontFixture.owner('a'));await settle();assert.equal(await page.locator('#stPref_fontV265').inputValue(),'elegant');
   await select('zh-CN','system');assert.equal(requests.length,2,'System reset requests no candidate');
   rejectFont='padauk';await select('my','minimal');assert.deepEqual(requests,['notosansmyanmar','notoserifsc','padauk']);
   const fallback=await page.locator('#text').evaluate(el=>{const b=el.getBoundingClientRect();return {text:el.textContent,width:b.width,height:b.height}});
   assert(fallback.text===samples.my&&fallback.width>0&&fallback.height>0,'Missing font retains visible text layout');
   console.log('PASS: isolated same-origin font loading with actual Settings helper/CSS: System/auth/guest zero requests, selected-only fetch, language/owner memory and missing-asset fallback');
  }finally{await ctx.close()}
  // Exercise the new isolated bundle assembly with synthetic tiny pack outputs.
  // Real candidate bytes are verified by the individual pack cases below.
  const bundleTool=fileURLToPath(new URL('../tools/personal-font-bundle-v265.py',import.meta.url));
  const bundleTest=String.raw`
import hashlib, importlib.util, json, sys, tempfile
from pathlib import Path
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location("bundle",sys.argv[1])
bundle=importlib.util.module_from_spec(spec)
spec.loader.exec_module(bundle)
original_candidates={**bundle.pack.CANDIDATES,**bundle.pack.CHINESE}
with tempfile.TemporaryDirectory() as temp:
    root=Path(temp); source=root/"sources"; source.mkdir()
    ui=root/"app.html"; ui.write_text("<html>测试</html>",encoding="utf-8")
    for name, (filename, _, _, family) in original_candidates.items():
        folder=source/name; folder.mkdir()
        data=("synthetic-"+name).encode(); notice=("synthetic notice "+name).encode()
        (folder/filename).write_bytes(data); (folder/"OFL.txt").write_bytes(notice)
        dest=bundle.pack.CHINESE if name in bundle.pack.CHINESE else bundle.pack.CANDIDATES
        dest[name]=(filename,bundle.pack.git_blob(data),bundle.pack.git_blob(notice),family)
    def fake(name,font,license_data,dest):
        dest.mkdir()
        is_chinese=name in bundle.pack.CHINESE
        specs=bundle.pack.CHINESE if is_chinese else bundle.pack.CANDIDATES
        _,font_hash,license_hash,family=specs[name]
        filename="part-0.woff2" if is_chinese else "font.woff2"
        data=b"synthetic-output-"+font
        (dest/filename).write_bytes(data); (dest/"OFL.txt").write_bytes(license_data)
        result={"family":family,"source_git_blob":font_hash,"license_git_blob":license_hash}
        item={"file":filename,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest()}
        if is_chinese: result["groups"]=[item]
        else: result.update(output_bytes=item["bytes"],output_sha256=item["sha256"])
        (dest/"manifest.json").write_text(json.dumps(result),encoding="utf-8")
        (dest/"font.css").write_text('@font-face{font-family:"'+family+'";src:url("./'+filename+'")}',encoding="utf-8")
        return result
    bundle.pack.build=fake
    bundle.pack.build_chinese=lambda name,font,lic,ui,dest:fake(name,font,lic,dest)
    output=root/"bundle"
    result=bundle.build_bundle(source,ui,output)
    assert len(result["candidates"])==8
    css=(output/"fonts.css").read_text()
    assert len(set(r["family"] for r in result["candidates"]))==8
    assert result["stylesheet_sha256"]==hashlib.sha256((output/"fonts.css").read_bytes()).hexdigest()
    for rec in result["candidates"]:
        assert (output/rec["license"]).is_file()
        assert (output/rec["manifest"]).is_file()
        for item in rec["files"]:
            assert './'+rec["candidate"]+'/'+item["file"] in css
            assert (output/rec["candidate"]/item["file"]).is_file()
    def rejects(call):
        try: call()
        except ValueError: return
        raise AssertionError("expected rejection")
    rejects(lambda:bundle.build_bundle(source,ui,output))
    rejects(lambda:bundle.build_bundle(source,ui,bundle.REPO/"forbidden-font-test"))
    name=next(iter(original_candidates)); (source/name/"OFL.txt").write_bytes(b"tampered")
    rejects(lambda:bundle.build_bundle(source,ui,root/"rejected"))
    assert not (root/"rejected").exists()
    assert not list(root.glob(".mmh-font-qa-*"))
`;
  const bundleCheck=spawnSync(python,['-c',bundleTest,bundleTool],{maxBuffer:1024*1024,timeout:30000});
  assert.ifError(bundleCheck.error);
  assert.equal(bundleCheck.status,0,bundleCheck.stderr?.toString());
  console.log('PASS: isolated eight-candidate bundle assembly, CSS paths, notices, hashes, tamper/overwrite/repository output guards (synthetic pack outputs; not actual full bundle)');
  // English candidate diagnostics only. Preserve the approved device stacks until visual review.
  const englishCandidates=[
   ['modern','inter','Inter[opsz,wght].ttf','047c92f6e2212473dc436020afed689527076d44','21f6aff961064c2e429f570995e446bcdd555422'],
   ['elegant','lora','Lora[wght].ttf','ee1914c3746140523de2940d267ec2215bd85d5b','d0ce7fe062e60eaa92c4af3ee1bebe81c5141b4e'],
   ['minimal','roboto','Roboto[wdth,wght].ttf','5522a368d9072fd88c299916e61fcff369949061','9c48e05a24fa2267e207ecf17560291b5621c197'],
   ['digital','jetbrainsmono','JetBrainsMono[wght].ttf','aa310be8b717fe3774f9444dd89d5f4101cc6d10','821a3dac22aff15a1f1c9689a1d79c45bb58ca39'],
   ['soft','nunito','Nunito[wght].ttf','2ec1f4b0676c83ef33049db87b311171699e9192','c8210f08ca3cece05b4f7baa428afe8e1abe3293'],
   ['bold','montserrat','Montserrat[wght].ttf','c97aca18592834d8706549c279cb8d5ac5d85f69','fe576a2ee1f96353b05d030c0b7620d525cc53a8']
  ];
  const englishResults=[];
  for(const [style,folder,file,fontBlob,licenseBlob] of englishCandidates){
   const base='https://raw.githubusercontent.com/google/fonts/'+revision+'/ofl/'+folder+'/';
   const pinned=async(name,expected,max)=>{
    const response=await fetch(base+encodeURIComponent(name),{redirect:'error',signal:AbortSignal.timeout(30000)});
    assert(response.ok,folder+' '+name+' HTTP '+response.status);
    const bytes=Buffer.from(await response.arrayBuffer());
    assert(bytes.length>0&&bytes.length<=max,folder+' '+name+' size');
    assert.equal(createHash('sha1').update('blob '+bytes.length+String.fromCharCode(0)).update(bytes).digest('hex'),expected,folder+' pinned Git blob');
    return bytes;
   };
   const license=await pinned('OFL.txt',licenseBlob,65536);
   assert.match(license.toString('utf8'),/SIL OPEN FONT LICENSE Version 1\.1/i);
   const bytes=await pinned(file,fontBlob,4*1024*1024);
   const enCtx=await browser.newContext({viewport:{width:640,height:240}});
   try{
    await enCtx.route('**/*',route=>route.request().url()==='https://english-font-fixture.invalid/candidate.ttf'?route.fulfill({status:200,contentType:'font/ttf',headers:{'Access-Control-Allow-Origin':'*'},body:bytes}):route.abort());
    const page=await enCtx.newPage();
    await page.setContent('<html lang="en"><body><div id="sample" style="font-size:28px;line-height:1.5;background:white;color:black"><span id="regular" style="font-weight:400">Balance &amp; savings 1,234.56 USD</span><br><span id="heavy" style="font-weight:700">Transactions +98.76</span></div></body></html>');
    await page.addStyleTag({content:'@font-face{font-family:EnglishCandidate;src:url(https://english-font-fixture.invalid/candidate.ttf) format("truetype");font-weight:400 700;font-display:block}#sample{font-family:EnglishCandidate,sans-serif}'});
    await page.evaluate(async()=>{for(const [weight,id] of [[400,'regular'],[700,'heavy']]){const el=document.getElementById(id);const loaded=await document.fonts.load(weight+' 28px EnglishCandidate',el.textContent);if(!loaded.length)throw Error('English font not loaded');el.getBoundingClientRect()}await document.fonts.ready});
    const session=await enCtx.newCDPSession(page);
    try{
     await session.send('DOM.enable');await session.send('CSS.enable');
     const {root}=await session.send('DOM.getDocument');
     const rendered=[];
     for(const id of ['regular','heavy']){
      const {nodeId}=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#'+id});
      const {fonts}=await session.send('CSS.getPlatformFontsForNode',{nodeId});
      const used=fonts.filter(f=>f.glyphCount>0);
      assert(used.length>0&&used.every(f=>f.isCustomFont),folder+' '+id+' no platform fallback');
      rendered.push({id,fonts:used.map(f=>({family:f.familyName,postScript:f.postScriptName,glyphs:f.glyphCount}))});
     }
     const pixels=createHash('sha256').update(await page.locator('#sample').screenshot({animations:'disabled'})).digest('hex');
     englishResults.push({style,folder,bytes:bytes.length,pixels,rendered});
    }finally{await session.detach()}
   }finally{await enCtx.close()}
  }
  assert.equal(englishResults.length,6);
  assert.equal(new Set(englishResults.map(x=>x.pixels)).size,6,'six English candidate sample images must differ');
  console.log('FONT-ENGLISH-CANDIDATES '+JSON.stringify(englishResults));
  console.log('PASS: six pinned English candidate samples at 400/700 rendered distinct images without platform fallback (render-only; approved runtime stacks unchanged)');
  // Partition full Chinese source cmap into common UI glyphs and bounded rare-glyph shards.
  // Prototype only: no generated fonts are distributed or deployed.
  assert.equal(chinesePackInputs.size,4,'all four pinned Chinese candidates required');
  for(const [folder,input] of chinesePackInputs){
  const chinesePartitionSource=input.bytes,chinesePartitionLicense=input.license;
  const partitionTemp=mkdtempSync(join(tmpdir(),'mmh-chinese-pack-'));
  let bundle,partitionCss;
  try{
   const sourcePath=join(partitionTemp,'source.ttf'),licensePath=join(partitionTemp,'OFL-source.txt'),uiPath=join(partitionTemp,'ui.html'),output=join(partitionTemp,'candidate');
   writeFileSync(sourcePath,chinesePartitionSource);writeFileSync(licensePath,chinesePartitionLicense);writeFileSync(uiPath,app);
   const script=fileURLToPath(new URL('../tools/personal-font-pack-v265.py',import.meta.url));
   const build=(source,lic,dest)=>spawnSync(python,[script,folder,'--source',source,'--license',lic,'--ui-source',uiPath,'--output',dest],{maxBuffer:8*1024*1024,timeout:180000});
   const generated=build(sourcePath,licensePath,output);
   assert.ifError(generated.error);assert.equal(generated.status,0,generated.stderr?.toString().slice(-2000));
   bundle=JSON.parse(readFileSync(join(output,'manifest.json'),'utf8'));
   assert.equal(bundle.source_git_blob,input.expected);
   assert.equal(bundle.license_git_blob,input.licenseHash);
   assert.deepEqual(readFileSync(join(output,'OFL.txt')),chinesePartitionLicense);
   assert.equal(bundle.family,({notosanssc:'MMH Personal Chinese A',notoserifsc:'MMH Personal Chinese B',zcoolqingkehuangyou:'MMH Personal Chinese C',lxgwwenkai:'MMH Personal Chinese D'})[folder]);
   const isWenKai=folder==='lxgwwenkai';
   assert.equal(bundle.source_repository,isWenKai?'lxgw/LxgwWenKai':'google/fonts');
   assert.equal(bundle.source_revision,isWenKai?'f4cc16fa07f7d115135d203065e711d43c3076d3':revision);
   assert.equal(bundle.source_path,(isWenKai?'fonts/TTF/':'ofl/'+folder+'/')+bundle.source_file);
   if(folder==='notosanssc')assert.equal(bundle.sourceCount,30890);
   assert.equal(bundle.missing_ui_han_count,bundle.missing_ui_han.length);
   assert.equal(bundle.source_uvs_count,bundle.preserved_uvs_count+bundle.missing_uvs_count);
   assert.equal(bundle.missing_uvs_count,0,folder+' all source variation mappings retained');
   if(folder==='notosanssc'||folder==='notoserifsc')assert.equal(bundle.source_uvs_count,25,folder+' pinned source variation count');
   for(const n of [bundle.source_uvs_count,bundle.preserved_uvs_count,bundle.missing_uvs_count,bundle.missing_ui_han_count])assert(Number.isSafeInteger(n)&&n>=0);
   assert(bundle.groups.length>1&&bundle.groups[0].codes.length>0);
   partitionCss=readFileSync(join(output,'font.css'),'utf8');
   assert.equal((partitionCss.match(/@font-face/g)||[]).length,bundle.groups.length);
   assert.equal(new Set(bundle.groups.map(g=>g.family)).size,bundle.groups.length);
   for(const g of bundle.groups){
    assert.equal(g.file,'part-'+g.id+'.woff2');
    const bytes=readFileSync(join(output,g.file));assert.equal(bytes.length,g.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),g.sha256);
    assert(partitionCss.includes('src:url("./'+g.file+'")'));g.data=bytes.toString('base64');
   }
   fullPacks.set(folder,{css:partitionCss,files:new Map(bundle.groups.map(g=>[g.file,Buffer.from(g.data,'base64')]))});
   const badLicense=join(partitionTemp,'bad-license.txt');writeFileSync(badLicense,Buffer.concat([chinesePartitionLicense,Buffer.from([0])]));
   assert.notEqual(build(sourcePath,badLicense,join(partitionTemp,'reject-license')).status,0,'Chinese tampered license rejected');
   assert.notEqual(build(sourcePath,licensePath,output).status,0,'Chinese existing output protected');
  }finally{rmSync(partitionTemp,{recursive:true,force:true})}
  const lookup=new Map();
  for(const g of bundle.groups){
   assert.equal(Buffer.from(g.data,'base64').length,g.bytes);
   for(const cp of g.codes){assert(!lookup.has(cp),'disjoint CSS ranges');lookup.set(cp,g.id)}
  }
  assert.equal(lookup.size,bundle.sourceCount);
  for(const cp of bundle.missing_ui_han)assert(!lookup.has(cp),'unsupported UI Han is not advertised');
  const rare=bundle.groups[1].codes.find(cp=>cp>=0x4e00&&cp<=0x9fff)??bundle.groups[1].codes[0];
  const splitCtx=await browser.newContext(),splitRequests=[];
  try{
   await splitCtx.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin!==origin)return route.abort();
    if(url.pathname==='/')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"></head><body class="mmh-workspace-active"><main class="page active" id="settings"><div id="rows"></div><p id="sample"></p></main></body></html>'});
    const m=/^\/part-(\d+)\.woff2$/.exec(url.pathname);
    const g=m&&bundle.groups[Number(m[1])];
    if(!g)return route.fulfill({status:404,body:''});
    splitRequests.push(g.id);
    return route.fulfill({status:200,contentType:'font/woff2',body:Buffer.from(g.data,'base64')});
   });
   const p=await splitCtx.newPage();await p.goto(origin+'/');
   // Exercise the real Settings cascade with the full generated partition CSS, not an inline family override.
   await p.addStyleTag({content:'body{font-family:system-ui,sans-serif}#sample{font-size:28px;font-weight:400}'+css});
   await p.addScriptTag({content:`const $=id=>document.getElementById(id);let owner='a';const store=new Map();const prefOwner=()=>owner;const lsGet=k=>store.get(k)??null;const lsSet=(k,v)=>{store.set(k,v);return true};`+row+helpers+`addFontV265($('rows'));window.fontFixture={owner:id=>{owner=id;dispatchEvent(new Event('mmhvault:config-owner-changed'))}};`});
   const picker=p.locator('#stPref_fontV265');
   assert.equal(await picker.inputValue(),'system');
   const matches=[];
   for(const style of ['modern','elegant','minimal','digital','soft','bold']){
    await picker.selectOption(style);
    const family=await p.locator('#sample').evaluate(el=>getComputedStyle(el).fontFamily);
    if(family.includes(bundle.family))matches.push(style);
   }
   assert.equal(matches.length,1,folder+' maps to exactly one actual Settings choice');
   await picker.selectOption('system');
   await p.addStyleTag({content:partitionCss});
   const set=async s=>{await p.locator('#sample').evaluate((el,value)=>{el.textContent=value},s);await p.evaluate(async()=>{document.querySelector('#sample').getBoundingClientRect();await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))})};
   await set(samples['zh-CN']);assert.deepEqual(splitRequests,[],'System with full pack CSS makes no font requests');
   await picker.selectOption(matches[0]);await set(samples['zh-CN']);assert.deepEqual([...new Set(splitRequests)],[0],'selected Settings style loads only core');
   const mixed=samples['zh-CN']+String.fromCodePoint(rare);
   await set(mixed);assert.deepEqual([...new Set(splitRequests)].sort((a,b)=>a-b),[0,lookup.get(rare)].sort((a,b)=>a-b),'rare character requests only matching shard');
   const session=await splitCtx.newCDPSession(p);
   try{await session.send('DOM.enable');await session.send('CSS.enable');const {root}=await session.send('DOM.getDocument');const {nodeId}=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#sample'});const {fonts}=await session.send('CSS.getPlatformFontsForNode',{nodeId});assert(fonts.some(x=>x.glyphCount>0)&&fonts.filter(x=>x.glyphCount>0).every(x=>x.isCustomFont),'mixed sample renders without platform fallback')}finally{await session.detach()}
   const fetched=splitRequests.length;
   await picker.selectOption('system');await set(samples['zh-CN']);assert.equal(splitRequests.length,fetched,'System reset does not fetch other shards');
   await picker.selectOption(matches[0]);await set(mixed);assert.equal(splitRequests.length,fetched,'reselecting style reuses full pack shards');
   await p.evaluate(()=>fontFixture.owner('guest'));await set(mixed);assert(await picker.isDisabled());assert.equal(splitRequests.length,fetched,'guest does not request other shards');
   console.log('FONT-PARTITION '+JSON.stringify({folder,style:matches[0],missingUiHan:bundle.missing_ui_han_count,sourceUvs:bundle.source_uvs_count,preservedUvs:bundle.preserved_uvs_count,missingUvs:bundle.missing_uvs_count,sourceCount:bundle.sourceCount,shards:bundle.groups.length,coreBytes:bundle.groups[0].bytes,totalBytes:bundle.groups.reduce((n,g)=>n+g.bytes,0),largestBytes:Math.max(...bundle.groups.map(g=>g.bytes)),requests:splitRequests}));
   console.log('PASS: pinned Chinese offline pack, source cmap partition, original license, shard hashes, coverage diagnostics, tampered license/overwrite rejection, generated CSS and mixed sample rendering (isolated '+folder+' candidate)');
  }finally{await splitCtx.close()}
  }
  // Use all eight actual generated packs together in one isolated workspace,
  // without generating them a second time or distributing any font assets.
  assert.equal(fullPacks.size,8);
  const combinedCSS=[...fullPacks].map(([name,pack])=>pack.css.replaceAll('src:url("./','src:url("./'+name+'/')).join('\n');
  const combinedOrigin='https://mmh-font-bundle-fixture.invalid';
  const allCtx=await browser.newContext(),allRequests=[];
  try{
   await allCtx.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin!==combinedOrigin)return route.abort();
    if(url.pathname==='/')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><link rel="stylesheet" href="/fonts/fonts.css"></head><body class="mmh-workspace-active"><main id="settings" class="page active"><div id="rows"></div><p id="sample"></p></main></body></html>'});
    if(url.pathname==='/fonts/fonts.css')return route.fulfill({status:200,contentType:'text/css',body:combinedCSS});
    const match=/^\/fonts\/([a-z]+)\/(font|part-\d+)\.woff2$/.exec(url.pathname);
    const data=match&&fullPacks.get(match[1])?.files.get(match[2]+'.woff2');
    if(!data)return route.fulfill({status:404,body:''});
    allRequests.push({folder:match[1],file:match[2]+'.woff2'});
    return route.fulfill({status:200,contentType:'font/woff2',body:data});
   });
   const page=await allCtx.newPage();
   await page.goto(combinedOrigin+'/');
   await page.addStyleTag({content:'body{font-family:system-ui,sans-serif}#sample{font-size:28px;font-weight:400}'+css});
   await page.addScriptTag({content:`const $=id=>document.getElementById(id);let owner='a';const store=new Map();const prefOwner=()=>owner;const lsGet=k=>store.get(k)??null;const lsSet=(k,v)=>{store.set(k,v);return true};`+row+helpers+`addFontV265($('rows'));window.fontFixture={owner:id=>{owner=id;dispatchEvent(new Event('mmhvault:config-owner-changed'))},lang:id=>{document.documentElement.lang=id;dispatchEvent(new Event('mmhvault-language-change'))}};`});
   const picker=page.locator('#stPref_fontV265');
   const settle=()=>page.evaluate(async()=>{document.querySelector('#sample').getBoundingClientRect();await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});
   const setText=async locale=>{await page.evaluate(l=>fontFixture.lang(l),locale);await page.locator('#sample').evaluate((el,s)=>{el.textContent=s},samples[locale]);await settle()};
   await setText('zh-CN');assert.equal(await picker.inputValue(),'system');assert.deepEqual(allRequests,[]);
   const styleCases=[['zh-CN','modern','notosanssc'],['zh-CN','elegant','notoserifsc'],['zh-CN','minimal','lxgwwenkai'],['zh-CN','digital','zcoolqingkehuangyou'],['my','modern','notosansmyanmar'],['my','elegant','notoserifmyanmar'],['my','minimal','padauk'],['my','bold','tharlon']];
   const session=await allCtx.newCDPSession(page);
   try{
    await session.send('DOM.enable');await session.send('CSS.enable');
    const {root}=await session.send('DOM.getDocument');
    const {nodeId}=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#sample'});
    for(const [locale,style,folder] of styleCases){
     await picker.selectOption('system');await settle();
     await setText(locale);assert.equal(await picker.inputValue(),'system');
     const before=allRequests.length;
     await picker.selectOption(style);await settle();
     assert.deepEqual(allRequests.slice(before),[{folder,file:locale==='zh-CN'?'part-0.woff2':'font.woff2'}],folder+' only selected core/full font requested');
     const {fonts}=await session.send('CSS.getPlatformFontsForNode',{nodeId});
     assert(fonts.some(f=>f.glyphCount>0)&&fonts.filter(f=>f.glyphCount>0).every(f=>f.isCustomFont),folder+' custom sample rendered');
    }
    const before=allRequests.length;
    await picker.selectOption('system');await settle();
    await setText('zh-CN');await picker.selectOption('modern');await settle();
    assert.equal(allRequests.length,before,'previously loaded family reused');
    await page.evaluate(()=>fontFixture.owner('guest'));await settle();
    assert(await picker.isDisabled());assert.equal(allRequests.length,before,'guest no font requests');
   }finally{await session.detach()}
   console.log('FONT-COMBINED '+JSON.stringify({families:fullPacks.size,requests:allRequests,cssBytes:Buffer.byteLength(combinedCSS)}));
   console.log('PASS: all eight actual full font packs coexist in one same-origin Settings fixture with selected-only requests, custom glyphs, reuse and guest isolation (not deployed)');
  }finally{await allCtx.close()}
 }
}finally{await browser.close()}
