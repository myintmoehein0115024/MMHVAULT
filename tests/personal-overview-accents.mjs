import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const path='css/mmhvault-liquid-dashboard-density-v3.css';
const full=readFileSync(path,'utf8'),marker='/* Personal V2.0.57';
const i=full.indexOf(marker);assert.ok(i>0);
const previous=full.slice(0,i),addition=full.slice(i);
const legacy=readFileSync('css/mmhvault-liquid-dashboard-v2.css','utf8');
const app=readFileSync('app.html','utf8');assert.ok(app.includes(path),'existing stylesheet referenced in Personal app');
const browser=await chromium.launch();
try{
for(const width of [393,768,1440])for(const lang of ['en','zh','my'])for(const light of [false,true]){
 const page=await browser.newPage({viewport:{width,height:844}});
 await page.route('**/*',r=>r.abort());
 const labels={en:['Total assets','Cash balance','Investment','Net cash flow'],zh:['总资产','现金余额','投资','净现金流'],my:['စုစုပေါင်းပိုင်ဆိုင်မှု','ငွေလက်ကျန်','ရင်းနှီးမြှုပ်နှံမှု','ငွေစီးဆင်းမှု']};
 const cards=labels[lang].map((label,i)=>'<article class="pf-kpi-v500"><span class="pf-kpi-label-v500">'+label+'</span><strong class="pf-kpi-value-v500">123,456.78</strong><button class="pf-kpi-icon-v500">i</button></article>').join('');
 await page.setContent('<html lang="'+lang+'"><body class="mmh-workspace-active '+(light?'light':'')+'"><main id="dashboard" class="page active"><div id="mmhPremiumDashboardV500"><div class="pf-kpis-v500">'+cards+'</div><article class="pf-card-v500">Other panel</article></div></main><section id="business"><article class="pf-kpi-v500">Other page</article></section></body></html>');
 await page.addStyleTag({content:legacy+'\n'+previous});
 const state=()=>page.evaluate(()=>[...document.querySelectorAll('.pf-kpi-v500,.pf-card-v500')].map(e=>{const p=getComputedStyle(e,'::after'),r=e.getBoundingClientRect();return {rect:[r.x,r.y,r.width,r.height],bg:p.backgroundImage,height:p.height,bottom:p.bottom,left:p.left,right:p.right,filter:p.filter,pointer:p.pointerEvents}}));
 const before=await state();await page.addStyleTag({content:addition});const after=await state();
 for(let n=0;n<4;n++){assert.deepEqual(after[n].rect,before[n].rect);assert.equal(after[n].height,'2px');assert.equal(after[n].bottom,'0px');assert.equal(after[n].left,'12px');assert.equal(after[n].right,'12px');assert.equal(after[n].filter,'none');assert.equal(after[n].pointer,'none');assert.match(after[n].bg,/linear-gradient/)}
 assert.equal(new Set(after.slice(0,4).map(x=>x.bg)).size,4);
 assert.deepEqual(after.slice(4),before.slice(4),'other panel and unrelated page unchanged');
 await page.locator('.pf-kpi-icon-v500').first().click();
 console.log('PASS overview accent',width,lang,light?'light':'dark');await page.close();
}
}finally{await browser.close()}
