import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const path='css/mmhvault-invest-workspace-v2.css',full=readFileSync(path,'utf8'),marker='/* Personal V2.0.60';
const split=full.indexOf(marker);assert.ok(split>0);
const previous=full.slice(0,split),addition=full.slice(split),app=readFileSync('app.html','utf8');
const panel=app.match(/<div class="mmh-ui-panel"><div class="mmh-ui-heading"><div><h2[^>]*>Investment Portfolio Overview<\/h2>[\s\S]*?<div class="mmh-ui-kpis" id="mmhUnifiedKpisV1"><\/div><\/div>/)?.[0];
assert.ok(panel,'actual portfolio overview panel found');
for(const token of ['mmh-native-kpi-v214','mmh-native-roi-v214','mmh-native-note-v214','mmh-native-total-v214','mmh-pl-profit','mmh-pl-loss'])assert.ok(app.includes(token),'actual render token '+token);
const blocks=[...app.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>|<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].flatMap(m=>{
 if(m[1])return /#invest|#mmhUnifiedKpisV1|\.mmh-ui-panel/.test(m[1])?[{css:m[1]}]:[];
 const file=m[2].split('?')[0].replace(/^\.\//,'');
 if(!/^css\/mmhvault-.*\.css$/.test(file)||!existsSync(file))return [];
 const css=file===path?previous:readFileSync(file,'utf8');
 return /#invest|#mmhUnifiedKpisV1|\.mmh-ui-panel/.test(css)?[{css,file}]:[];
});
const idx=blocks.findIndex(x=>x.file===path);assert.ok(idx>=0,'existing stylesheet referenced');
const browser=await chromium.launch();
try{
 for(const width of [393,768,1440])for(const lang of ['en','zh','my'])for(const light of [false,true]){
  const page=await browser.newPage({viewport:{width,height:844}});await page.route('**/*',r=>r.abort());
  await page.setContent('<html lang="'+lang+'"><body class="mmh-workspace-active '+(light?'light':'')+'"><section id="invest" class="page active"><div id="mmhUnifiedInvestV1"><button id="fixtureTab">Overview</button>'+panel+'<div class="mmh-ui-panel" id="fixtureHoldings">My Investments</div></div></section><section id="unrelated"><div class="mmh-ui-panel">Other page</div></section></body></html>');
  const labels={en:['Metric','Crypto','Gold','Holding Cost','Holding Value','Unrealized P/L','Realized P/L','Total P/L','Portfolio Return · USD'],zh:['投资指标','加密资产','黄金','持仓成本','持仓价值','未实现盈亏','已实现盈亏','累计综合盈亏','整体持仓回报率 · USD'],my:['ရင်းနှီးမြှုပ်နှံမှု','Crypto','ရွှေ','လက်ရှိပိုင်ဆိုင်မှု ကုန်ကျစရိတ်','လက်ရှိပိုင်ဆိုင်မှု တန်ဖိုး','မရရှိသေးသော အမြတ်/အရှုံး','ရရှိပြီးသော အမြတ်/အရှုံး','စုစုပေါင်း အမြတ်/အရှုံး','စုစုပေါင်း ပိုင်ဆိုင်မှု ပြန်ရနှုန်း · USD']}[lang];
  await page.evaluate(l=>{const k=document.getElementById('mmhUnifiedKpisV1');k.innerHTML='<table class="mmh-native-kpi-v214"><thead><tr><th scope="col">'+l[0]+'</th><th scope="col">'+l[1]+' · USD</th><th scope="col">'+l[2]+' · MMK</th></tr></thead><tbody>'+l.slice(3,8).map((x,i)=>'<tr'+(i===4?' class="mmh-native-total-v214"':'')+'><th scope="row">'+x+'</th><td class="'+(i<2?'mmh-pl-flat':'mmh-pl-profit')+'">123.45</td><td class="'+(i<2?'mmh-pl-flat':'mmh-pl-loss')+'">−234.56</td></tr>').join('')+'</tbody></table><div class="mmh-native-roi-v214"><span>'+l[8]+'</span><b class="mmh-pl-profit">+1.23%</b></div><div class="mmh-native-note-v214">Fixture only</div>';},labels);
  for(const block of blocks)await page.addStyleTag({content:block.css});
  const state=()=>page.evaluate(()=>{const k=document.getElementById('mmhUnifiedKpisV1');return [k.parentElement,k,k.querySelector('table'),k.querySelector('.mmh-native-roi-v214'),k.querySelector('.mmh-native-note-v214'),document.getElementById('fixtureTab'),document.getElementById('fixtureHoldings'),document.querySelector('#unrelated .mmh-ui-panel')].map(e=>{const p=getComputedStyle(e),r=e.getBoundingClientRect();return {rect:[r.x,r.y,r.width,r.height],bg:p.backgroundImage,size:p.backgroundSize,pos:p.backgroundPosition,repeat:p.backgroundRepeat,color:p.backgroundColor,fg:p.color,content:e.textContent};});});
  const before=await state();const plBefore=await page.locator('#mmhUnifiedKpisV1 :is(.mmh-pl-profit,.mmh-pl-loss)').evaluateAll(es=>es.map(e=>getComputedStyle(e).color));
  await page.evaluate(({idx,addition})=>{document.querySelectorAll('style')[idx].textContent+=addition;},{idx,addition});
  const after=await state();assert.deepEqual(after.map(c=>c.rect),before.map(c=>c.rect),'geometry unchanged');
  assert.match(after[0].size,/2px$/);assert.equal(after[0].pos,'50% 100%');assert.equal(after[0].repeat,'no-repeat');assert.match(after[0].bg,/linear-gradient/);assert.equal(after[0].color,before[0].color);assert.equal(after[0].content,before[0].content);
  assert.deepEqual(after.slice(1),before.slice(1),'table, ROI, note, other panel and unrelated page unchanged');
  assert.deepEqual(await page.locator('#mmhUnifiedKpisV1 :is(.mmh-pl-profit,.mmh-pl-loss)').evaluateAll(es=>es.map(e=>getComputedStyle(e).color)),plBefore,'existing P/L colors unchanged');
  await page.locator('#fixtureTab').evaluate(e=>e.onclick=()=>e.dataset.clicked='yes');await page.locator('#fixtureTab').click();assert.equal(await page.locator('#fixtureTab').getAttribute('data-clicked'),'yes');
  console.log('PASS investment accent',width,lang,light?'light':'dark');await page.close();
 }
}finally{await browser.close()}
