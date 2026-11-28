import {readFileSync} from 'node:fs';
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
  ['my','tharlon','Tharlon-Regular.ttf','d3840f3ccd173b3da87e0ed476d33027ad880490']
 ];
 const samples={'zh-CN':'账户余额与储蓄交易投资设置财务目标汇率预算收入支出','my':'လက်ကျန်ငွေနှင့်စုဆောင်းငွေမြန်မာဘာသာ၀၁၂၃၄၅၆၇၈၉'};
 const results={};
 const lazyCandidates=new Map();
 let chinesePartitionSource=null;
 const python=process.env.MMH_FONTQA_PYTHON;
 if(process.env.CI)assert(python,'CI must provide isolated font compression interpreter');
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
  const licenseHashes={"notosanssc":"1c9f43281b8f216c5461fe9ac729afbade7724e4","notoserifsc":"94d1bf7b52481343e2983fb7751e8b7abe1ea07b","zcoolqingkehuangyou":"bd3df5cf6f237a4afaea70106f8243da07cd8cd8","notosansmyanmar":"c94c47416f38b8ddec9f3fbc9e0241998d7823dc","notoserifmyanmar":"94d1bf7b52481343e2983fb7751e8b7abe1ea07b","padauk":"57410e8e9eb58b0cce938440696cf36e2daf8fcf","tharlon":"6ef7b18ea7f5b430f10160034ecdcd0295335954"};
  const licenseResponse=await fetch('https://raw.githubusercontent.com/google/fonts/'+revision+'/ofl/'+folder+'/OFL.txt',{redirect:'error',signal:AbortSignal.timeout(30000)});
  assert(licenseResponse.ok,folder+' license HTTP '+licenseResponse.status);
  const license=Buffer.from(await licenseResponse.arrayBuffer());
  assert(license.length>0&&license.length<=65536,folder+' license size');
  assert.equal(createHash('sha1').update('blob '+license.length+String.fromCharCode(0)).update(license).digest('hex'),licenseHashes[folder],folder+' exact license blob hash');
  assert.match(license.toString('utf8'),/SIL OPEN FONT LICENSE Version 1\.1/i,folder+' OFL notice');
  const url='https://raw.githubusercontent.com/google/fonts/'+revision+'/ofl/'+folder+'/'+encodeURIComponent(file);
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(45000)});
  assert(response.ok,folder+' pinned asset HTTP '+response.status);
  const bytes=Buffer.from(await response.arrayBuffer());
  assert(bytes.length>0&&bytes.length<=40*1024*1024,folder+' asset size bounds');
  const actual=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(actual,expected,folder+' exact Git blob hash');
  if(folder==='notosanssc')chinesePartitionSource=bytes;
  let compressed=null;
  if(python){
   const conversion=spawnSync(python,['-c',compressionScript,locale,samples[locale]],{input:bytes,maxBuffer:50*1024*1024,timeout:120000});
   assert.ifError(conversion.error);
   assert.equal(conversion.status,0,folder+' compression: '+conversion.stderr?.toString().slice(-2000));
   compressed=conversion.stdout;
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
    }
    (results[locale]??=[]).push({folder,bytes:bytes.length,pixels,compression,fonts:rendered.map(x=>({family:x.familyName,postScript:x.postScriptName,glyphs:x.glyphCount}))});
   }finally{await session.detach()}
  }finally{await fixture.close()}
 }
 for(const [locale,fonts] of Object.entries(results)){
  assert.equal(new Set(fonts.map(x=>x.pixels)).size,fonts.length,locale+' candidate sample images must differ');
  console.log('FONT-CANDIDATE '+JSON.stringify({locale,fonts}));
 }
 console.log('PASS: seven pinned OFL candidate assets rendered isolated sample text without platform fallback; three Chinese and four Myanmar distinct sample images (not full coverage or application integration)');
 if(python){
  console.log('PASS: seven WOFF2 candidates rendered sample without fallback and preserved glyph count and geometry (Chinese sample subset only; Myanmar full cmap preserved; no assets distributed)');
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
   const faces=[...lazyCandidates].map(([name])=>'@font-face{font-family:"Candidate-'+name+'";src:url("/fonts/'+name+'.woff2") format("woff2");font-display:swap}').join('');
   await page.addStyleTag({content:faces+'body{font-family:system-ui,sans-serif}body.mmh-workspace-active:not(.auth-page-active)[data-mmh-personal-font-v265] #text{font-family:var(--mmh-personal-font-v265),sans-serif}'});
   const setText=locale=>page.locator('#text').evaluate((el,s)=>{el.textContent=s},samples[locale]);
   const settle=()=>page.evaluate(async()=>{document.querySelector('#text').getBoundingClientRect();await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});
   const select=async folder=>{
    await setText(lazyCandidates.get(folder).locale);
    await page.evaluate(name=>{document.body.setAttribute('data-mmh-personal-font-v265','candidate');document.body.style.setProperty('--mmh-personal-font-v265','"Candidate-'+name+'"')},folder);
    await settle();
   };
   await setText('my');await settle();assert.deepEqual(requests,[],'System must not request candidate fonts');
   await page.evaluate(()=>document.body.classList.add('auth-page-active'));
   await select('notosansmyanmar');assert.deepEqual(requests,[],'Auth page must not request candidate fonts');
   await page.evaluate(()=>document.body.classList.remove('auth-page-active'));
   await select('notosansmyanmar');assert.deepEqual(requests,['notosansmyanmar'],'Only selected Myanmar font requested');
   await select('notosansmyanmar');assert.deepEqual(requests,['notosansmyanmar'],'Repeat selection reuses loaded font');
   await select('notoserifsc');assert.deepEqual(requests,['notosansmyanmar','notoserifsc'],'Language/choice switch loads only the requested Chinese candidate');
   await page.evaluate(()=>{document.body.removeAttribute('data-mmh-personal-font-v265');document.body.style.removeProperty('--mmh-personal-font-v265')});
   await settle();assert.equal(requests.length,2,'System reset requests no candidate');
   rejectFont='padauk';await select('padauk');assert.deepEqual(requests,['notosansmyanmar','notoserifsc','padauk']);
   const fallback=await page.locator('#text').evaluate(el=>{const b=el.getBoundingClientRect();return {text:el.textContent,width:b.width,height:b.height}});
   assert(fallback.text===samples.my&&fallback.width>0&&fallback.height>0,'Missing font retains visible text layout');
   console.log('PASS: isolated same-origin font loading prototype: System/auth zero requests, selected-only fetch, repeated selection reuse, language switch, System reset and missing-asset fallback');
  }finally{await ctx.close()}
  // Partition full Chinese source cmap into common UI glyphs and bounded rare-glyph shards.
  // Prototype only: no generated fonts are distributed or deployed.
  assert(chinesePartitionSource,'pinned Chinese source required');
  const partitionScript=`
import io, json, sys
from fontTools.ttLib import TTFont
from fontTools import subset
from base64 import b64encode
source=sys.stdin.buffer.read()
original=TTFont(io.BytesIO(source))
all_chars=set(original.getBestCmap())
# Only Han characters are split; non-Han combining marks and other script glyphs stay together.
def han(cp):
    return 0x3400<=cp<=0x4DBF or 0x4E00<=cp<=0x9FFF or 0xF900<=cp<=0xFAFF or 0x20000<=cp<=0x323AF
ui=set(map(ord,sys.argv[1]))
base={cp for cp in all_chars if not han(cp)} | (ui & all_chars)
rest=sorted(all_chars-base)
groups=[sorted(base)]+[rest[i:i+1024] for i in range(0,len(rest),1024)]
assert len(groups)>1 and all(groups)
output=[]
seen=set()
for i,group in enumerate(groups):
    font=TTFont(io.BytesIO(source),recalcTimestamp=False)
    opts=subset.Options()
    opts.layout_features=["*"]
    sub=subset.Subsetter(options=opts)
    sub.populate(unicodes=group)
    sub.subset(font)
    font.flavor="woff2"
    buffer=io.BytesIO()
    font.save(buffer)
    data=buffer.getvalue()
    actual=set(TTFont(io.BytesIO(data)).getBestCmap())
    # Extra mapped glyphs, if any, are not advertised by CSS unicode-range.
    assert set(group)<=actual and not seen.intersection(group)
    seen.update(group)
    output.append({"id":i,"codes":group,"bytes":len(data),"data":b64encode(data).decode("ascii")})
assert seen==all_chars
print(json.dumps({"sourceCount":len(all_chars),"groups":output}))
`;
  // Derive common Han characters only from static application source; never use account data.
  const ui=[...new Set([...app.matchAll(/[\u3400-\u4dbf\u4e00-\u9fff]/g)].map(x=>x[0]).concat([...samples['zh-CN']]))].join('');
  const partition=spawnSync(python,['-c',partitionScript,ui],{input:chinesePartitionSource,maxBuffer:60*1024*1024,timeout:180000});
  assert.ifError(partition.error);assert.equal(partition.status,0,partition.stderr?.toString().slice(-2000));
  const bundle=JSON.parse(partition.stdout.toString());
  assert(bundle.groups.length>1&&bundle.groups[0].codes.length>0);
  const lookup=new Map();
  for(const g of bundle.groups){
   assert.equal(Buffer.from(g.data,'base64').length,g.bytes);
   for(const cp of g.codes){assert(!lookup.has(cp),'disjoint CSS ranges');lookup.set(cp,g.id)}
  }
  assert.equal(lookup.size,bundle.sourceCount);
  const rare=bundle.groups[1].codes.find(cp=>cp>=0x4e00&&cp<=0x9fff)??bundle.groups[1].codes[0];
  const ranges=codes=>{
   const out=[];let start=codes[0],end=start;
   for(const cp of codes.slice(1)){if(cp===end+1){end=cp;continue}out.push('U+'+start.toString(16)+(end===start?'':'-'+end.toString(16)));start=end=cp}
   out.push('U+'+start.toString(16)+(end===start?'':'-'+end.toString(16)));return out.join(',');
  };
  const splitCtx=await browser.newContext(),splitRequests=[];
  try{
   await splitCtx.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin!==origin)return route.abort();
    if(url.pathname==='/')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html lang="zh-CN"><body><p id="sample"></p></body></html>'});
    const m=/^\/part-(\d+)\.woff2$/.exec(url.pathname);
    const g=m&&bundle.groups[Number(m[1])];
    if(!g)return route.fulfill({status:404,body:''});
    splitRequests.push(g.id);
    return route.fulfill({status:200,contentType:'font/woff2',body:Buffer.from(g.data,'base64')});
   });
   const p=await splitCtx.newPage();await p.goto(origin+'/');
   const css=bundle.groups.map(g=>'@font-face{font-family:SplitCandidate;src:url("/part-'+g.id+'.woff2") format("woff2");font-weight:100 900;font-display:swap;unicode-range:'+ranges(g.codes)+'}').join('');
   await p.addStyleTag({content:css+'#sample{font:400 28px SplitCandidate,sans-serif}'});
   const set=async s=>{await p.locator('#sample').evaluate((el,value)=>{el.textContent=value},s);await p.evaluate(async()=>{document.querySelector('#sample').getBoundingClientRect();await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))})};
   await set(samples['zh-CN']);assert.deepEqual([...new Set(splitRequests)],[0],'UI sample only loads core');
   const mixed=samples['zh-CN']+String.fromCodePoint(rare);
   await set(mixed);assert.deepEqual([...new Set(splitRequests)].sort((a,b)=>a-b),[0,lookup.get(rare)].sort((a,b)=>a-b),'rare character requests only matching shard');
   const session=await splitCtx.newCDPSession(p);
   try{await session.send('DOM.enable');await session.send('CSS.enable');const {root}=await session.send('DOM.getDocument');const {nodeId}=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#sample'});const {fonts}=await session.send('CSS.getPlatformFontsForNode',{nodeId});assert(fonts.some(x=>x.glyphCount>0)&&fonts.filter(x=>x.glyphCount>0).every(x=>x.isCustomFont),'mixed sample renders without platform fallback')}finally{await session.detach()}
   console.log('FONT-PARTITION '+JSON.stringify({sourceCount:bundle.sourceCount,shards:bundle.groups.length,coreBytes:bundle.groups[0].bytes,totalBytes:bundle.groups.reduce((n,g)=>n+g.bytes,0),largestBytes:Math.max(...bundle.groups.map(g=>g.bytes)),requests:splitRequests}));
   console.log('PASS: full source Chinese cmap partition, selected unicode-range shard requests and mixed sample rendering (isolated Noto Sans SC prototype)');
  }finally{await splitCtx.close()}
 }
}finally{await browser.close()}
