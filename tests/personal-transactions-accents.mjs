import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const path='css/mmhvault-liquid-transactions-p21.css',full=readFileSync(path,'utf8'),marker='/* Personal V2.0.59';
const split=full.indexOf(marker);assert.ok(split>0);
const previous=full.slice(0,split),addition=full.slice(split),app=readFileSync('app.html','utf8');
const markup=app.match(/<div class="hc-totals">(<div><span[^>]*>[^<]*<\/span><b[^>]*><\/b><\/div>){3}<\/div>/)?.[0];
assert.ok(markup,'actual calendar summary markup found');
for(const id of ['hcIncome','hcExpense','hcRemaining'])assert.ok(markup.includes('id="'+id+'"'));
const blocks=[...app.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>|<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].flatMap(m=>{
 if(m[1])return /#transactions|#txHistoryPanel|\.hc-totals/.test(m[1])?[{css:m[1]}]:[];
 const file=m[2].split('?')[0].replace(/^\.\//,'');
 if(!/^css\/mmhvault-.*\.css$/.test(file)||!existsSync(file))return [];
 const css=file===path?previous:readFileSync(file,'utf8');
 return /#transactions|#txHistoryPanel|\.hc-totals/.test(css)?[{css,file}]:[];
});
const idx=blocks.findIndex(x=>x.file===path);assert.ok(idx>=0,'stylesheet referenced in actual app order');
const browser=await chromium.launch();
try{
 for(const width of [393,768,1440])for(const lang of ['en','zh','my'])for(const light of [false,true]){
  const page=await browser.newPage({viewport:{width,height:844}});
  await page.route('**/*',r=>r.abort());
  await page.setContent('<html lang="'+lang+'"><body class="mmh-workspace-active '+(light?'light':'')+'"><main id="transactions" class="page active"><div id="txHistoryPanel" class="tx-tab-panel-v371"><div class="panel"><div class="hc-shell"><div class="hc-toolbar"><button id="fixtureFilter">Filter</button></div><div id="mmhHistorySummaryV2">'+markup+'</div></div><div id="txList">Records</div></div></div></main><section id="unrelated"><div class="hc-totals"><div>Other</div></div></section></body></html>');
  const labels={en:['MONTHLY INCOME','MONTHLY EXPENSE','MONTHLY NET'],zh:['月收入','月支出','月结余'],my:['လစဉ် ဝင်ငွေ','လစဉ် အသုံးစရိတ်','လစဉ် အသားတင်လက်ကျန်']}[lang];
  await page.evaluate(labels=>{['hcIncomeLabelV4','hcExpenseLabelV4','hcRemainingLabelV3'].forEach((id,i)=>document.getElementById(id).textContent=labels[i]);['hcIncome','hcExpense','hcRemaining'].forEach((id,i)=>document.getElementById(id).textContent=['123,456.78','23,456.78','100,000.00'][i])},labels);
  for(const block of blocks)await page.addStyleTag({content:block.css});
  const state=()=>page.evaluate(()=>['hcIncome','hcExpense','hcRemaining'].map(id=>document.getElementById(id).parentElement).concat([document.getElementById('fixtureFilter'),document.getElementById('txList'),document.querySelector('#unrelated .hc-totals > div')]).map(e=>{const p=getComputedStyle(e),r=e.getBoundingClientRect();return {target:e.querySelector('b[id]')?.id||e.id||'unrelated',rect:[r.x,r.y,r.width,r.height],bg:p.backgroundImage,size:p.backgroundSize,pos:p.backgroundPosition,repeat:p.backgroundRepeat,color:p.backgroundColor,pointer:p.pointerEvents}}));
  const before=await state();
  assert.deepEqual(before.map(c=>c.target),['hcIncome','hcExpense','hcRemaining','fixtureFilter','txList','unrelated'],'explicit target order, independent of DOM order');
  assert.equal(await page.locator('#transactions .hc-totals > div').count(),3);
  await page.evaluate(({idx,addition})=>{const style=document.querySelectorAll('style')[idx];style.textContent+=addition;if(!style.sheet||![...style.sheet.cssRules].some(r=>r.cssText.includes('--hc-edge-rgb')))throw Error('Accent rules were not parsed');},{idx,addition});
  const after=await state();
  assert.deepEqual(after.map(x=>x.rect),before.map(x=>x.rect),'existing geometry unchanged');
  for(const [i,c] of after.slice(0,3).entries()){assert.match(c.size,/2px$/,JSON.stringify(c));assert.equal(c.pos,'50% 100%');assert.equal(c.repeat,'no-repeat');assert.equal(c.color,before[i].color);assert.equal(c.pointer,before[i].pointer);assert.match(c.bg,/linear-gradient/);}
  assert.equal(new Set(after.slice(0,3).map(c=>c.bg)).size,3);
  assert.deepEqual(after.slice(3),before.slice(3),'filter, list and unrelated panel unchanged');
  await page.locator('#fixtureFilter').evaluate(e=>e.onclick=()=>e.dataset.clicked='yes');
  await page.locator('#fixtureFilter').click();assert.equal(await page.locator('#fixtureFilter').getAttribute('data-clicked'),'yes');
  console.log('PASS transactions accent',width,lang,light?'light':'dark');await page.close();
 }
}finally{await browser.close()}
