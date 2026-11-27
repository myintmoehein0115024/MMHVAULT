import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const path='css/mmhvault-accounts-directory-v1.css',full=readFileSync(path,'utf8'),marker='/* Personal V2.0.58';
const split=full.indexOf(marker);assert.ok(split>0);
const previous=full.slice(0,split),addition=full.slice(split);
const app=readFileSync('app.html','utf8');
assert.ok(app.includes(path),'existing Accounts stylesheet referenced by app');
const source=readFileSync('js/mmhvault-accounts-directory-v1.js','utf8');
for(const token of ['am-v2-balance-main','am-v2-balance-controls','am-directory-ready-v1','am-summary'])assert.ok(source.includes(token),'fixture structural token '+token);
const cssBlocks=[...app.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>|<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].flatMap(m=>{
 if(m[1])return /#accounts-page|\.am-summary/.test(m[1])?[{css:m[1]}]:[];
 const file=m[2].split('?')[0].replace(/^\.\//,'');
 if(!/^css\/mmhvault-.*\.css$/.test(file)||!existsSync(file))return [];
 const css=file===path?previous:readFileSync(file,'utf8');
 return /#accounts-page|\.am-summary/.test(css)?[{css,file}]:[];
});
assert.ok(cssBlocks.some(x=>x.file===path),'Accounts stylesheet discovered in app order');
const browser=await chromium.launch();
try{
 for(const width of [393,768,1440])for(const lang of ['en','zh','my'])for(const light of [false,true]){
  const page=await browser.newPage({viewport:{width,height:844}});
  await page.route('**/*',r=>r.abort());
  const labels={en:['Total balance','Accounts','Currencies'],zh:['总余额','账户','币种'],my:['စုစုပေါင်းလက်ကျန်','အကောင့်များ','ငွေကြေးများ']}[lang];
  const summary='<div class="am-summary"><div class="am-v2-balance-main"><div class="am-top"><span class="am-v2-total-label">'+labels[0]+'</span><details class="am-v3-balance-info"><summary>Info</summary><p>FX information</p></details></div><strong id="amNet">123,456.78</strong></div><div class="am-v2-balance-controls"><div class="am-v2-display-row"><button id="apCurrencyPickerV2">USD</button></div><div class="am-directory-stats-v1"><div class="am-directory-stat-v1"><strong>4</strong><small>'+labels[1]+'</small></div><div class="am-directory-stat-v1"><strong>3</strong><small>'+labels[2]+'</small></div></div><details class="am-v2-breakdown" hidden><summary>Breakdown</summary><div class="am-summary-grid"><div>100</div><div>20</div></div></details></div></div>';
  await page.setContent('<html lang="'+lang+'"><body class="mmh-workspace-active '+(light?'light':'')+'"><main id="accounts-page" class="page active"><div class="am-shell am-directory-ready-v1"><div id="amHome">'+summary+'<section class="am-directory-main-v1"><button id="amAdd">Add</button></section></div></div></main><section id="unrelated"><div class="am-summary">Other panel</div></section></body></html>');
  for(const block of cssBlocks)await page.addStyleTag({content:block.css});
  const state=()=>page.evaluate(()=>[...document.querySelectorAll('#amHome > .am-summary, #amHome .am-v2-balance-main, #amHome .am-v2-balance-controls, #apCurrencyPickerV2, #amAdd, #unrelated .am-summary')].map(e=>{const p=getComputedStyle(e,'::after'),r=e.getBoundingClientRect();return {rect:[r.x,r.y,r.width,r.height],bg:p.backgroundImage,height:p.height,bottom:p.bottom,left:p.left,right:p.right,pointer:p.pointerEvents}}));
  const before=await state();
  // Insert at the same cascade position as the production stylesheet, not at the end.
  const idx=cssBlocks.findIndex(x=>x.file===path);
  await page.evaluate(({idx,addition})=>{const styles=[...document.querySelectorAll('style')];const target=styles[idx];target.textContent+=addition;},{idx,addition});
  const after=await state();
  assert.deepEqual(after.map(x=>x.rect),before.map(x=>x.rect),'summary and controls geometry unchanged');
  assert.equal(after[0].height,'2px');assert.equal(after[0].bottom,'0px');assert.equal(after[0].left,'12px');assert.equal(after[0].right,'12px');assert.equal(after[0].pointer,'none');assert.match(after[0].bg,/linear-gradient/);
  assert.deepEqual(after.slice(1),before.slice(1),'children and unrelated panel unchanged');
  await page.locator('#apCurrencyPickerV2').evaluate(e=>e.addEventListener('click',()=>e.dataset.clicked='yes'));
  await page.locator('#apCurrencyPickerV2').click();assert.equal(await page.locator('#apCurrencyPickerV2').getAttribute('data-clicked'),'yes');
  assert.equal(await page.locator('.am-v2-breakdown').evaluate(e=>e.hidden),true);
  console.log('PASS accounts accent',width,lang,light?'light':'dark');await page.close();
 }
}finally{await browser.close()}
