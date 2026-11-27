import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const path='css/mmhvault-cashflow-v2.css',full=readFileSync(path,'utf8'),marker='/* Personal V2.0.61';
const split=full.indexOf(marker);assert.ok(split>0);
const previous=full.slice(0,split),addition=full.slice(split),app=readFileSync('app.html','utf8');
const ui=readFileSync('js/mmhvault-cashflow-v2-ui.mjs','utf8'),release=readFileSync('js/mmhvault-cashflow-v2-release.mjs','utf8');
const kpis=ui.match(/function kpis\(s\)\{([\s\S]*?)\n \}/)?.[1];
assert.ok(kpis&&kpis.includes('class="cfv2-metrics cfv2-kpis"'),'actual summary markup');
assert.deepEqual([...kpis.matchAll(/metric\('([^']+)'/g)].map(m=>m[1]),['income','expense','net','savings'],'actual metric order');
assert.ok(ui.includes("tab==='summary'?kpis(s)+summary(s):analysisPage(s)"));
assert.ok(release.includes('legacy.before(root)')&&release.includes("root.id='mmhCashflowV2ReleaseRoot'")&&release.includes('legacy.hidden=true'));
const keys=['income','expense','net','savings'];
const labels=keys.map(key=>{const m=ui.match(new RegExp(key+":(\\[[^\\]]+\\])"));assert.ok(m,key);const x=[...m[1].matchAll(/'([^']*)'/g)].map(m=>m[1]);assert.equal(x.length,3);return x;});
const blocks=[...app.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>|<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].flatMap(m=>{
 if(m[1])return /#cashflow-analyze|cfv2-|mmhCashflowV2ReleaseRoot/.test(m[1])?[{css:m[1]}]:[];
 const file=m[2].split('?')[0].replace(/^\.\//,'');
 if(!/^css\/mmhvault-.*\.css$/.test(file)||!existsSync(file))return [];
 const css=file===path?previous:readFileSync(file,'utf8');
 return /#cashflow-analyze|cfv2-|mmhCashflowV2ReleaseRoot/.test(css)?[{css,file}]:[];
});
const idx=blocks.findIndex(x=>x.file===path);assert.ok(idx>=0,'existing stylesheet referenced');
const browser=await chromium.launch();
try{
 for(const width of [393,768,1440])for(const lang of ['en','zh','my'])for(const light of [false,true]){
  const page=await browser.newPage({viewport:{width,height:844}});await page.route('**/*',r=>r.abort());
  const i=['en','zh','my'].indexOf(lang),negative=light;
  const kinds=['positive','negative',negative?'negative':'positive',negative?'':'positive'],values=['1,234.56','456.78',negative?'−100.00':'777.78',negative?'−8.1%':'63.0%'];
  const cards=keys.map((key,j)=>'<div class="cfv2-metric '+kinds[j]+'"><span>'+labels[j][i]+'</span><strong>'+values[j]+'</strong></div>').join('');
  await page.setContent('<html lang="'+lang+'"><body class="mmh-workspace-active '+(light?'light':'')+'"><section id="cashflow-analyze" class="page active"><div id="mmhCashflowV2ReleaseRoot"><div class="cfv2"><header class="cfv2-top cfv2-toolbar"><div class="cfv2-tabs" role="group"><button type="button" data-action="tab" data-key="summary" aria-pressed="true">Cash Flow</button><button type="button" data-action="tab" data-key="analysis" aria-pressed="false">Analyze</button></div><div class="cfv2-toolbar-controls"><div class="cfv2-filter-anchor"><button type="button" data-action="filters" aria-expanded="false" aria-controls="cfv2-advanced-filters">Filter</button><div id="cfv2-advanced-filters" class="cfv2-filters" hidden></div></div></div></header><p class="cfv2-muted cfv2-range">2026-11-01 – 2026-11-30</p><div class="cfv2-metrics cfv2-kpis">'+cards+'</div><section class="cfv2-card" id="fixtureOther"><div class="cfv2-metrics"><div class="cfv2-metric positive"><span>Other</span><strong>25</strong></div></div></section><div class="cfv2-dialog" data-cfv2-kind="report" hidden><div class="cfv2-metrics"><div class="cfv2-metric">Report</div></div></div></div></div><div class="cfa-shell" hidden inert>Legacy</div></section><section id="unrelated"><div class="cfv2-metric">Other page</div></section></body></html>');
  for(const block of blocks)await page.addStyleTag({content:block.css});
  const target='#mmhCashflowV2ReleaseRoot > .cfv2 > .cfv2-kpis > .cfv2-metric';
  assert.equal(await page.locator(target).count(),4);
  for(const c of await page.locator(target).all())assert.ok(await c.isVisible());
  const filter=page.locator('[data-action="filters"]');assert.ok(await filter.isVisible());
  const settle=()=>page.evaluate(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await Promise.allSettled(document.getAnimations().filter(a=>a.constructor.name==='CSSTransition').map(a=>a.finished));await new Promise(r=>requestAnimationFrame(r));});
  const state=()=>page.evaluate(sel=>{const cards=[...document.querySelectorAll(sel)];const controls=['[data-action="filters"]','[data-action="tab"][data-key="analysis"]','#fixtureOther .cfv2-metric','[data-cfv2-kind="report"] .cfv2-metric','#unrelated .cfv2-metric'].map(s=>document.querySelector(s));return [...cards,...controls].map(e=>{const p=getComputedStyle(e),r=e.getBoundingClientRect();return {rect:[r.x,r.y,r.width,r.height],bg:p.backgroundImage,size:p.backgroundSize,pos:p.backgroundPosition,repeat:p.backgroundRepeat,color:p.backgroundColor,fg:p.color,valueColor:e.querySelector('strong')?getComputedStyle(e.querySelector('strong')).color:null,content:e.textContent};});},target);
  await settle();const before=await state();assert.ok(before.slice(0,4).every(c=>c.rect[2]>0&&c.rect[3]>0));
  await page.evaluate(({idx,addition})=>{document.querySelectorAll('style')[idx].textContent+=addition;},{idx,addition});await settle();
  const after=await state();assert.deepEqual(after.map(c=>c.rect),before.map(c=>c.rect),'geometry unchanged');
  const rgb=['91, 207, 171','232, 140, 153','133, 205, 240','168, 156, 234'];
  for(let j=0;j<4;j++){const c=after[j];assert.match(c.size,/2px$/);assert.equal(c.pos,'50% 100%');assert.equal(c.repeat,'no-repeat');assert.ok(c.bg.includes(rgb[j]),c.bg);for(const key of ['color','fg','valueColor','content'])assert.equal(c[key],before[j][key]);}
  assert.deepEqual(after.slice(4),before.slice(4),'other controls, metrics, report and unrelated page unchanged');
  await filter.evaluate(e=>e.onclick=()=>e.dataset.clicked='yes');await filter.click({timeout:5000});assert.equal(await filter.getAttribute('data-clicked'),'yes');
  console.log('PASS cashflow accent',width,lang,light?'light':'dark');await page.close();
 }
}finally{await browser.close()}
