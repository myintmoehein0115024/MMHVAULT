import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const app=fs.readFileSync('app.html','utf8'),css=fs.readFileSync('css/mmhvault-liquid-recurring-p912.css','utf8');
const start=app.indexOf('<section class="page" id="recurring"'),end=app.indexOf('<section class="page" id="life-planner"',start);
assert.ok(start>=0&&end>start);
const markup=app.slice(start,end).replace('class="page" id="recurring"','class="page active" id="recurring"');
const inline=(tag,id)=>{const start=app.indexOf('<'+tag+' id="'+id+'">'),end=app.indexOf('</'+tag+'>',start);assert.ok(start>=0&&end>start,id);return app.slice(app.indexOf('>',start)+1,end)};
const base=inline('style','mmhvault-recurring-v114-css');
const actual=inline('script','mmhvault-recurring-v114-js');
const slice=(a,b)=>{const i=actual.indexOf(a),j=actual.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return actual.slice(i,j)};
const render=slice('function render(){','  function edit(id)');
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,393,768,1440])for(const light of [false,true]){
  const page=await browser.newPage({viewport:{width,height:900}});
  try{
   await page.route('**/*',r=>r.abort());
   await page.setContent('<style>body{margin:0;font:14px system-ui}.page{box-sizing:border-box;padding:10px}button,input,select,textarea{font:inherit}'+base+css+'</style><body class="mmh-workspace-active'+(light?' light':'')+'">'+markup+'</body>');
   assert.equal(await page.locator('#recurringFormPanelV114').isVisible(),false);
   await page.locator('#recurringFormPanelV114').evaluate(el=>el.hidden=false);
   await page.locator('#recurringNameV114').fill('Synthetic schedule');
   await page.evaluate(render=>{
    const rows=[{id:'one',name:'Synthetic long schedule '+ 'X'.repeat(65),status:'active',next_due_date:'2030-01-01',frequency:'monthly',tx_type:'Expense',tx_group:'Expense',category:'Long category',reminder_days:3},{id:'two',name:'Paused fixture',status:'paused',next_due_date:'2030-02-01',frequency:'yearly',tx_type:'Transfer',tx_group:'Transfer',category:'Transfer',reminder_days:7}];
    const $=id=>document.getElementById(id),state={rows,mode:'all'},scope=()=>$('recurring'),dayDelta=()=>2,frequencyLabel=x=>({monthly:'Monthly',yearly:'Yearly'}[x]),dueInfo=r=>({cls:r.status==='paused'?'paused':'upcoming',kind:r.status==='paused'?'paused':'upcoming',label:r.status==='paused'?'Paused':'Due in 2d'}),amountSummary=()=>({main:'MMK 123,456,789.12 → THB 123,456,789.12',meta:'Synthetic account '+ 'X'.repeat(50)}),E=s=>String(s??'').replace(/[&<>"']/g,'_'),noop=()=>{};
    new Function('state','$','page','dayDelta','frequencyLabel','dueInfo','amountSummary','E','recordNow','openDetail','edit','togglePause','remove',render+';render();')(state,$,scope,dayDelta,frequencyLabel,dueInfo,amountSummary,E,noop,noop,noop,noop,noop);
   },render);
   assert.equal(await page.locator('.recurring-card-v114').count(),2);
   assert.equal(await page.locator('.recurring-card-v114.paused [data-rec-record]').isDisabled(),true);
   assert.equal(await page.locator('.recurring-card-v114.upcoming [data-rec-record]').isEnabled(),true);
   const samples={en:['Active','Paused','All'],zh:['进行中','已暂停','全部'],my:['ဆောင်ရွက်ဆဲ','ခေတ္တရပ်ထား','အားလုံး']};
   for(const [locale,labels] of Object.entries(samples)){
    await page.locator('.recurring-filters-v114 button').evaluateAll((nodes,labels)=>nodes.forEach((n,i)=>n.textContent=labels[i]),labels);
    const m=await page.evaluate(()=>{const q=s=>document.querySelector(s),s=x=>getComputedStyle(q(x)),cards=[...document.querySelectorAll('.recurring-kpis-v114 article')];return {overflow:document.documentElement.scrollWidth>innerWidth+2,accents:cards.every(x=>getComputedStyle(x,'::after').backgroundImage.includes('linear-gradient')),count:cards.length,head:s('.recurring-head-v114').backgroundImage,card:s('.recurring-kpis-v114 article').backgroundColor,form:s('#recurringNameV114').minHeight,clip:[...document.querySelectorAll('.recurring-card-value-v114 strong,.recurring-card-actions-v114 button')].some(el=>el.scrollWidth>el.clientWidth+2)}});
    assert.ok(!m.overflow&&!m.clip&&m.accents&&m.count===4&&m.head==='none',JSON.stringify({width,locale,m}));
    assert.equal(m.card,light?'rgb(255, 255, 255)':'rgb(28, 37, 49)');
    assert.equal(m.form,'44px');
    console.log('PASS Recurring layout and actual row renderer (stubbed data/helpers)',width,light?'light':'dark',locale);
   }
   await page.addStyleTag({content:inline('style','mmhCategoriesEditPickersV2')});
   await page.addScriptTag({content:inline('script','mmhCategoriesEditPickersLogicV2')});
   const type=page.locator('#recurringTypeV114 + button.mmh-shared-trigger-v217'),native=page.locator('#recurringTypeV114'),menu=page.locator('#mmhCategoryPickerV2');
   await type.waitFor({state:'visible'});
   await type.click();await menu.waitFor({state:'visible'});
   const bounds=await menu.boundingBox();assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=width+1);
   await page.evaluate(()=>{window.__changes=[];document.getElementById('recurringTypeV114').addEventListener('change',e=>window.__changes.push(e.target.value))});
   await menu.getByRole('option',{name:'Income',exact:true}).click();await menu.waitFor({state:'hidden'});
   assert.equal(await native.inputValue(),'Income');assert.deepEqual(await page.evaluate(()=>window.__changes),['Income']);
   await type.click();await menu.waitFor({state:'visible'});await page.keyboard.press('Escape');await menu.waitFor({state:'hidden'});
   const geo=await page.evaluate(()=>({picker:document.querySelector('#recurringTypeV114 + button').getBoundingClientRect().height,input:document.querySelector('#recurringNameV114').getBoundingClientRect().height}));
   assert.ok(Math.abs(geo.picker-geo.input)<=3,JSON.stringify(geo));
   assert.equal(await native.evaluate(el=>getComputedStyle(el).minHeight),'0px');
   assert.equal(await page.locator('#recurringNameV114').inputValue(),'Synthetic schedule');
   console.log('PASS Recurring actual shared picker, selection, change, Escape and control geometry',width,light?'light':'dark',JSON.stringify(geo));
   await page.locator('#recurringFormPanelV114').evaluate(el=>el.hidden=true);
   assert.equal(await page.locator('#recurringFormPanelV114').isVisible(),false);
  }finally{await page.close()}
 }
}finally{await browser.close()}
