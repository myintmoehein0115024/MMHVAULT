import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const app=fs.readFileSync('app.html','utf8'),js=fs.readFileSync('js/mmhvault-forecast-v1.js','utf8'),css=fs.readFileSync('css/mmhvault-forecast-v1.css','utf8');
const start=js.indexOf(' const planLabels='),end=js.indexOf(' const esc=s=>',start);
assert.ok(start>=0&&end>start);
const source=js.slice(start,end);
const cssStart=css.indexOf('/* Personal V2.0.63: sibling navigation');
assert.ok(cssStart>=0);
const shells=['budget','goals','recurring'].map((id,i)=>{
 const match=app.match(new RegExp('<section class="page" id="'+id+'"[^>]*>\\s*<div class="([^"]+)"'));
 assert.ok(match,id);return '<section class="page" id="'+id+'"><div class="'+match[1]+'"><h1>'+id+'</h1></div></section>';
}).join('');
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,393,768,1440])for(const light of [false,true]){
  const page=await browser.newPage({viewport:{width,height:900}});
  try{
   await page.route('**/*',r=>r.abort());
   await page.setContent('<style>body{margin:0;font:14px system-ui}.page{padding:10px;box-sizing:border-box}'+css.slice(cssStart)+'</style><body class="mmh-workspace-active'+(light?' light':'')+'">'+shells+'</body>');
   await page.evaluate(source=>{
    let locale='en';const language=()=>locale;
    window.navTargets=[];window.setPage=id=>window.navTargets.push(id);
    const run=new Function('language',source+';return syncPlanningNavV263;')(language);
    window.syncFixture=code=>{locale=code;run();};
   },source);
   for(const code of ['en','zh','my','en']){
    await page.evaluate(code=>window.syncFixture(code),code);
    const facts=await page.evaluate(()=>{
     return [...document.querySelectorAll('.fc-planning-nav-v263')].map(nav=>{
      const back=nav.querySelector('button'),links=[...nav.querySelectorAll('.fc-planning-links-v263 button')];
      const b=back.getBoundingClientRect(),r=nav.getBoundingClientRect(),last=links.at(-1).getBoundingClientRect();
      return {id:nav.closest('section').id,label:back.textContent,labels:links.map(x=>x.getAttribute('aria-label')),targets:links.map(x=>x.dataset.fcSibling),current:links.filter(x=>x.hasAttribute('aria-current')).map(x=>x.dataset.fcSibling),heights:[back,...links].map(x=>x.getBoundingClientRect().height),overflow:last.right>r.right+1||b.right>links[0].getBoundingClientRect().left,first:nav.parentElement.firstElementChild===nav};
     });
    });
    assert.equal(facts.length,3);
    for(const f of facts){
     assert.equal(f.label,{en:'Future Assets',zh:'未来资产',my:'အနာဂတ်ပိုင်ဆိုင်မှု'}[code]);
     assert.deepEqual(f.targets,['budget','goals','recurring'].filter(id=>id!==f.id));assert.deepEqual(f.current,[]);assert.ok(f.labels.every(Boolean));assert.ok(f.first&&!f.overflow,JSON.stringify({width,code,f}));assert.ok(f.heights.every(h=>h===44));
    }
   }
   await page.locator('#budget [data-fc-sibling="forecast"]').click();
   await page.locator('#budget [data-fc-sibling="goals"]').click();
   await page.locator('#goals [data-fc-sibling="recurring"]').click();
   await page.locator('#recurring [data-fc-sibling="budget"]').click();
   for(const id of ['budget','goals','recurring'])assert.equal(await page.locator('#'+id+' [data-fc-sibling="'+id+'"]').count(),0);
   await page.locator('#budget [data-fc-sibling="recurring"]').click();
   await page.locator('#goals [data-fc-sibling="budget"]').click();
   await page.locator('#recurring [data-fc-sibling="goals"]').click();
   await page.locator('#goals [data-fc-sibling="forecast"]').click();
   await page.locator('#recurring [data-fc-sibling="forecast"]').click();
   assert.deepEqual(await page.evaluate(()=>window.navTargets),['forecast','goals','recurring','budget','recurring','budget','goals','forecast','forecast']);
   console.log('PASS planning nav',width,light?'light':'dark','EN/ZH/MY roundtrip, 3 pages and click targets');
  }finally{await page.close();}
 }
}finally{await browser.close();}
