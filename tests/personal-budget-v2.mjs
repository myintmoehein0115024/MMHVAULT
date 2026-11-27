import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const app=readFileSync('app.html','utf8'),path='css/mmhvault-liquid-budget-p910.css';
const start=app.indexOf('<section class="page" id="budget"'),end=app.indexOf('<section class="page" id="goals"',start);
assert.ok(start>=0&&end>start);
const markup=app.slice(start,end).trim();
assert.match(app,/sharedIds=\["budgetCurrencyV110"/);
assert.match(app,/if\(!ok\|\|user\(\)\?\.id!==owner\|\|state\.month!==targetMonth\)return/);
const quick=app.match(/row\.className='budget-quick-v147';\s*row\.innerHTML='([^']+)'/);
assert.ok(quick,'actual quick review source');
const css=[...app.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>|<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].flatMap(m=>{
 if(m[1])return [m[1]];
 const file=m[2].split('?')[0].replace(/^\.\//,'');
 return /^css\/mmhvault-.*\.css$/.test(file)&&existsSync(file)?[readFileSync(file,'utf8')]:[];
});
assert.ok(css.some(s=>s.includes('Personal V2.0.62')));
const browser=await chromium.launch();
const copy=app.match(/const budgetCopyV262=Object\.freeze\(\{[\s\S]*?\n\}\);\nfunction budgetCopyTextV262[\s\S]*?\n\}\n/);
assert.ok(copy,'actual Budget translation source');
const translator=new Function(copy[0]+';return budgetCopyTextV262;')();
const fixtureEl={closest:s=>s==='#budget'?{}:null},categoryEl={closest:s=>s==='#budget'||s.includes('.budget-category-name-v110>span')?{}:null};
for(const lang of ['en','zh','my']){
 for(const base of ['No category limit','QUICK REVIEW','Category limits: ฿ 23,000.00','145.92% used · ฿ 10,331.11 over budget','Budget exceeded by ฿ 10,331.11. Review this month’s individual spending or adjust the plan.','2 expense records could not be converted because an exchange rate is unavailable.']){
 const t=translator(base,fixtureEl,lang);if(lang==='en')assert.equal(t,base);else assert.notEqual(t,base);
 if(base.includes('฿')){
  const amounts=s=>s.match(/฿ \d[\d,]*\.\d{2}(?!\d)/g)||[];
  assert.ok(amounts(base).length>0,'fixture contains a formatted amount');
  assert.deepEqual(amounts(t),amounts(base),`${lang}: ${base}`);
 }
 }
 assert.equal(translator('Spent',categoryEl,lang),'Spent','member category name preserved');
 assert.equal(translator('Spent',{closest:()=>null},lang),'Spent','other pages untouched');
}
const labels=Object.fromEntries(['en','zh','my'].map(lang=>[lang,['MONTHLY BUDGET','SPENT','REMAINING','UTILIZATION','Analyze spending','Transaction history'].map(base=>translator(base,fixtureEl,lang))]));
try{
 // Run the actual app text/attribute engine in Chromium, without booting auth,
 // finance services or the unrelated Invest/Transactions translation surfaces.
 const actual=(start,end)=>{
  const a=app.indexOf(start),b=app.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,start);return app.slice(a,b);
 };
 const engine=copy[0]+actual('const goalCopyV263=','const mmhI18nTextStateV135=new WeakMap();')+actual('function translateAttributes(root){','function translateDynamicText(base){')+actual('const mmhI18nTextStateV135=new WeakMap();','window.mmhI18nTextV135=')+actual('function walk(root){','function syncLanguageChoices()');
 const switchPage=await browser.newPage();
 try{
  await switchPage.route('**/*',r=>r.abort());
  await switchPage.setContent('<section id="budget" aria-label="Budget"><h2>Monthly Budget</h2><label>Month<input aria-label="Budget month"></label><div id="progress">145.92% used · ฿ 10,331.11 over budget</div><div class="budget-category-name-v110"><span>Spent</span></div><div class="budget-category-meta-v110"><span>Spent <b>฿ 1,607.00</b></span></div></section>');
  const results=await switchPage.evaluate(({engine})=>{
   const run=new Function(engine+`
    let lang='en';
    const investCopySurfaceV236=()=>false,txUiSurfaceV2=()=>false;
    const root=document.querySelector('#budget'),progress=root.querySelector('#progress');
    const read=()=>({title:root.querySelector('h2').textContent,label:root.getAttribute('aria-label'),month:root.querySelector('input').getAttribute('aria-label'),progress:progress.textContent,category:root.querySelector('.budget-category-name-v110 span').textContent,amount:root.querySelector('.budget-category-meta-v110 b').textContent});
    const states=[];
    for(const next of ['en','zh','my','en']){lang=next;translateRoot(root);states.push(read());}
    lang='zh';translateRoot(root);progress.firstChild.nodeValue='80.00% used · ฿ 4,500.00 remaining';translateRoot(root);states.push(read());
    lang='my';translateRoot(root);states.push(read());
    lang='en';translateRoot(root);states.push(read());
    return states;`);
   return run();
  },{engine});
  assert.equal(results.length,7);
  for(const [index,lang] of ['en','zh','my','en','zh','my','en'].entries()){
   const state=results[index],base=index<4?'145.92% used · ฿ 10,331.11 over budget':'80.00% used · ฿ 4,500.00 remaining';
   assert.deepEqual(state,{title:translator('Monthly Budget',fixtureEl,lang),label:translator('Budget',fixtureEl,lang),month:translator('Budget month',fixtureEl,lang),progress:translator(base,fixtureEl,lang),category:'Spent',amount:'฿ 1,607.00'},`language switch ${index} ${lang}`);
  }
  console.log('PASS isolated Budget actual translation-engine switch and dynamic refresh: 7 states');
 }finally{await switchPage.close();}
 for(const width of [320,393,768,1440])for(const lang of ['en','zh','my'])for(const light of [false,true]){
 const page=await browser.newPage({viewport:{width,height:844}});await page.route('**/*',r=>r.abort());
 await page.setContent('<html lang="'+lang+'"><body class="mmh-workspace-active '+(light?'light':'')+'"><main class="wrap">'+markup.replace('class="page" id="budget"','class="page active" id="budget"')+'</main></body></html>');
 await page.evaluate(({quick,labels})=>{
 const root=document.querySelector('#budget'),kpis=root.querySelector('.budget-kpis-v110');
 const row=document.createElement('div');row.className='budget-quick-v147';row.innerHTML=quick;kpis.after(row);
 [...kpis.children].forEach((e,i)=>{e.querySelector('span').textContent=labels[i];e.querySelector('strong').textContent=['฿ 22,500.00','฿ 32,831.11','฿ −10,331.11','145.92%'][i]});
 root.querySelector('#budgetRemainingV110').className='over';
 root.querySelector('#budgetUsageV110').className='over';
 [...row.querySelectorAll('button b')].forEach((e,i)=>e.textContent=labels[i+4]);
 const select=root.querySelector('#budgetCurrencyV110');select.hidden=true;select.classList.add('mmh-shared-native-v217');const btn=document.createElement('button');btn.type='button';btn.className='mmh-cat-trigger-v2 mmh-shared-trigger-v217';btn.textContent='฿ THB';select.after(btn);
 const host=root.querySelector('#budgetCategoryListV110');host.innerHTML='<div class="budget-category-row-v110 over"><div class="budget-category-copy-v110"><div class="budget-category-name-v110"><span>Transport</span></div><div class="budget-category-meta-v110"><span>Spent <b>฿ 1,607.00</b></span><span>133.92% used</span></div></div><label class="budget-category-input-v110"><span>฿</span><input type="number" value="1200"></label><div class="budget-category-bar-v110"><span style="width:100%"></span></div></div>';
 },{quick:quick[1],labels:labels[lang]});
 for(const content of css)await page.addStyleTag({content});
 const result=await page.evaluate(()=>{
 const root=document.querySelector('#budget'),rect=e=>e.getBoundingClientRect(),cards=[...root.querySelectorAll('.budget-kpi-v110')],month=root.querySelector('#budgetMonthV110'),picker=root.querySelector('.mmh-shared-trigger-v217'),head=root.querySelector('.budget-head-v110'),row=root.querySelector('.budget-quick-v147');
 return {root:rect(root).width,overflow:root.scrollWidth-root.clientWidth,cards:cards.map(e=>({width:rect(e).width,height:rect(e).height,bg:getComputedStyle(e).backgroundImage,color:getComputedStyle(e.querySelector('strong')).color})),head:getComputedStyle(head).backgroundImage,month:rect(month).height,picker:rect(picker).height,quick:getComputedStyle(row).backgroundImage,category:rect(root.querySelector('.budget-category-row-v110')).width};
 });
 assert.ok(result.root>0&&result.overflow<=2,JSON.stringify(result));assert.equal(result.cards.length,4);assert.ok(result.cards.every(c=>c.width>0&&c.height>0&&c.bg.includes('linear-gradient')),JSON.stringify(result));
 assert.equal(result.head,'none');assert.equal(result.quick,'none');assert.ok(Math.abs(result.month-result.picker)<=3,JSON.stringify(result));
 assert.ok(result.category>0);
 const quickButtons=page.locator('.budget-quick-v147 button');assert.equal(await quickButtons.count(),2);
 for(const b of await quickButtons.all()){await b.evaluate(e=>e.onclick=()=>e.dataset.testClicked='yes');await b.click({timeout:5000});assert.equal(await b.getAttribute('data-test-clicked'),'yes');}
 console.log('PASS isolated Budget fixture',width,lang,light?'light':'dark');await page.close();
 }
}finally{await browser.close()}
