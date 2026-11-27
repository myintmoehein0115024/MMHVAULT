import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const app=fs.readFileSync('app.html','utf8');
const css=fs.readFileSync('css/mmhvault-liquid-goals-p911.css','utf8');
const start=app.indexOf('<section class="page" id="goals"'),end=app.indexOf('<section class="page" id="recurring"',start);
assert.ok(start>=0&&end>start);
const markup=app.slice(start,end).replace('class="page" id="goals"','class="page active" id="goals"');
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,393,768,1440])for(const light of [false,true]){
  const page=await browser.newPage({viewport:{width,height:900}});
  try{
   await page.route('**/*',r=>r.abort());
   await page.setContent('<style>body{margin:0;font:14px system-ui}.page{box-sizing:border-box;padding:10px}button,input,select,textarea{font:inherit}'+css+'</style><body class="mmh-workspace-active'+(light?' light':'')+'">'+markup+'</body>');
   assert.equal(await page.locator('#goalFormPanelV113').isVisible(),false);
   await page.locator('#goalFormPanelV113').evaluate(el=>el.hidden=false);
   await page.locator('#goalNameV113').fill('Synthetic goal');
   const labels={en:['Active','Completed','Archived','All'],zh:['进行中','已完成','已归档','全部'],my:['လုပ်ဆောင်နေဆဲ','ပြီးဆုံး','သိမ်းဆည်းထား','အားလုံး']};
   for(const [lang,copy] of Object.entries(labels)){
    await page.locator('.goal-filters-v113 button').evaluateAll((buttons,copy)=>buttons.forEach((b,i)=>b.textContent=copy[i]),copy);
    const m=await page.evaluate(()=>{
     const q=s=>document.querySelector(s),style=s=>getComputedStyle(q(s));
     const k=[...document.querySelectorAll('.goals-kpis-v113 article')];
     return {overflow:document.documentElement.scrollWidth>innerWidth+2,kpis:k.length,accents:k.every(x=>getComputedStyle(x,'::after').backgroundImage.includes('linear-gradient')),head:style('.goals-head-v113').backgroundImage,card:style('.goals-kpis-v113 article').backgroundColor,form:style('#goalNameV113').minHeight,filters:[...document.querySelectorAll('.goal-filters-v113 button')].every(b=>b.getBoundingClientRect().width>0)};
    });
    assert.ok(!m.overflow&&m.kpis===4&&m.accents&&m.head==='none'&&m.filters,JSON.stringify({width,lang,m}));
    assert.equal(m.card,light?'rgb(255, 255, 255)':'rgb(28, 37, 49)');
    assert.equal(m.form,'44px');
    assert.equal(await page.locator('#goalNameV113').inputValue(),'Synthetic goal');
    console.log('PASS Goals fixture',width,light?'light':'dark',lang);
   }
   await page.locator('#goalFormPanelV113').evaluate(el=>el.hidden=true);
   assert.equal(await page.locator('#goalFormPanelV113').isVisible(),false);
  }finally{await page.close();}
 }
}finally{await browser.close();}
