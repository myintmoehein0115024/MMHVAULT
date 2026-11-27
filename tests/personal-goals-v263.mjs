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

   const cardStart=app.indexOf('function card(r){const [icon,label]=typeInfo(r.goal_type)');
   const cardEnd=app.indexOf('  function render(){',cardStart);
   const detailStart=app.indexOf('async function openDetail(id){const r=state.rows.find(x=>x.id===id)');
   const detailEnd=app.indexOf('  async function load(){',detailStart);
   assert.ok(cardStart>=0&&cardEnd>cardStart&&detailStart>=0&&detailEnd>detailStart);
   const base=app.indexOf('.goal-detail-v113{display:grid');
   const baseStart=app.lastIndexOf('<style',base),baseEnd=app.indexOf('</style>',base);
   assert.ok(baseStart>=0&&baseEnd>base);
   await page.addStyleTag({content:app.slice(app.indexOf('>',baseStart)+1,baseEnd)});
   await page.addStyleTag({content:css});
   await page.evaluate(async ({cardSource,detailSource})=>{
     const rows=[{id:'active',name:'Synthetic goal',goal_type:'custom',currency:'MMK',current_amount:123456789.12,target_amount:987654321.98,target_date:'2030-01-01',status:'active',note:'Synthetic note '.repeat(10)},{id:'archived',name:'Archived fixture',goal_type:'custom',currency:'MMK',current_amount:0,target_amount:100,status:'archived'}];
     const state={rows},typeInfo=()=>['O','Custom'],progress=()=>12.5,normalizeStatus=r=>r.status,monthlyNeed=()=>12345678.91,monthsLeft=()=>12,remaining=r=>r.target_amount-r.current_amount,money=(n,c)=>c+' '+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}),esc=s=>String(s??''),editGoal=()=>{},$=id=>document.getElementById(id);
     const build=new Function('state','typeInfo','progress','normalizeStatus','monthlyNeed','monthsLeft','remaining','money','esc','editGoal','$',[cardSource,detailSource,'return {card,openDetail}'].join(String.fromCharCode(10)));
     const {card,openDetail}=build(state,typeInfo,progress,normalizeStatus,monthlyNeed,monthsLeft,remaining,money,esc,editGoal,$);
     $('goalListV113').innerHTML=rows.map(card).join('');
     window.mmhVaultOpenDialogV449=async options=>{
       window.__fixtureActions=options.actions.map(a=>a.label);
       $('mmhVaultDialogV449')?.remove();
       const overlay=document.createElement('div');overlay.id='mmhVaultDialogV449';
       const dialog=document.createElement('div');dialog.className=options.dialogClass;dialog.style.margin='auto';dialog.style.overflow='auto';dialog.innerHTML=options.body;
       overlay.append(dialog);document.body.append(overlay);
     };
     window.__fixtureOpenDetail=openDetail;
     await openDetail('active');
   },{cardSource:app.slice(cardStart,cardEnd),detailSource:app.slice(detailStart,detailEnd)});
   assert.equal(await page.locator('.goal-card-v113').count(),2);
   assert.equal(await page.locator('[data-goal-delete]').count(),1);
   assert.equal(await page.locator('.goal-detail-grid-v113>div').count(),6);
   assert.deepEqual(await page.evaluate(()=>window.__fixtureActions),['Close','Update progress','Edit Goal']);
   const details=await page.evaluate(()=>{
     const d=document.querySelector('.mmh-goal-dialog-v149');
     return {width:d.getBoundingClientRect().width,background:getComputedStyle(d).backgroundColor,heroFont:getComputedStyle(d.querySelector('.goal-detail-hero-v113 strong')).fontFamily,overflow:document.documentElement.scrollWidth>innerWidth+2,clipped:[...document.querySelectorAll('.goal-meta-grid-v113 b')].some(e=>e.scrollWidth>e.clientWidth+2)};
   });
   assert.ok(details.width<=width-20&&!details.overflow&&!details.clipped,JSON.stringify({width,details}));
   assert.equal(details.background,light?'rgb(255, 255, 255)':'rgb(28, 37, 49)');
   assert.ok(!details.heroFont.includes('Georgia'));
   await page.evaluate(()=>window.__fixtureOpenDetail('archived'));
   assert.deepEqual(await page.evaluate(()=>window.__fixtureActions),['Close','Edit Goal']);
   console.log('PASS Goals actual card/detail templates with stubbed data and dialog host',width,light?'light':'dark');


   // Actual shared i18n engine, isolated from authenticated app boot.
   const actual=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return app.slice(i,j)};
   const engine=actual('const goalCopyV263=','const mmhI18nTextStateV135=new WeakMap();')+actual('function translateAttributes(root){','function translateDynamicText(base){')+actual('const mmhI18nTextStateV135=new WeakMap();','window.mmhI18nTextV135=')+actual('function walk(root){','function syncLanguageChoices()');
   const states=await page.evaluate(({engine})=>{
     const root=document.querySelector('#goals'),dialog=document.querySelector('.mmh-goal-dialog-v149');
     // Reset manually injected sample filter labels to the English source.
     root.querySelectorAll('.goal-filters-v113 button').forEach((b,i)=>b.textContent=['Active','Completed','Archived','All'][i]);
     root.querySelector('.goal-card-title-v113 h3').textContent='Savings';
     const meta=root.querySelector('#goalNextMetaV113');meta.setAttribute('data-goal-user-copy-v263','');meta.textContent='No dated goals';
     const run=new Function('root','dialog',engine+`
       let lang='en';const investCopySurfaceV236=()=>false,txUiSurfaceV2=()=>false;
       return ['en','zh','my','en'].map(next=>{
         lang=next;translateRoot(root);translateRoot(dialog);
         const q=s=>root.querySelector(s);
         return {title:q('h1').textContent,type:q('#goalTypeV113 option').textContent,currency:[...q('#goalCurrencyV113').options].map(x=>x.value),name:q('.goal-card-title-v113 h3').textContent,meta:q('#goalNextMetaV113').textContent,placeholder:q('#goalNameV113').placeholder,amount:q('.goal-amount-v113 strong').textContent,status:q('.goal-status-v113').textContent,detail:dialog.querySelector('.goal-detail-grid-v113 span').textContent};
       });
     `);return run(root,dialog);
   },{engine});
   const expected=[['Financial Goals','Emergency Fund','active','Progress'],['财务目标','应急基金','进行中','进度'],['ငွေကြေးရည်မှန်းချက်များ','အရေးပေါ်ရန်ပုံငွေ','ဆောင်ရွက်ဆဲ','တိုးတက်မှု'],['Financial Goals','Emergency Fund','active','Progress']];
   for(const [i,state] of states.entries()){
     assert.deepEqual([state.title,state.type,state.status,state.detail],expected[i]);
     assert.deepEqual(state.currency,['THB','MMK','USD','CNY']);
     assert.equal(state.name,'Savings');assert.equal(state.meta,'No dated goals');assert.equal(state.amount,'MMK 123,456,789.12');
   }
   assert.equal(states[0].placeholder,states[3].placeholder);
   assert.notEqual(states[0].placeholder,states[1].placeholder);
   assert.notEqual(states[0].placeholder,states[2].placeholder);
   console.log('PASS Goals actual translation engine, 4 language states and protected names/currencies',width,light?'light':'dark');
   // Exercise the actual existing shared picker implementation, not a stand-in.
   await page.locator('#mmhVaultDialogV449').evaluate(el=>el.remove());
   const inline=(tag,id)=>{
     const start=app.indexOf('<'+tag+' id="'+id+'">'),end=app.indexOf('</'+tag+'>',start);
     assert.ok(start>=0&&end>start,id);
     return app.slice(app.indexOf('>',start)+1,end);
   };
   await page.addStyleTag({content:inline('style','mmhCategoriesEditPickersV2')});
   await page.addScriptTag({content:inline('script','mmhCategoriesEditPickersLogicV2')});
   const currency=page.locator('#goalCurrencyV113');
   const trigger=page.locator('#goalCurrencyV113 + button.mmh-shared-trigger-v217');
   const type=page.locator('#goalTypeV113 + button.mmh-shared-trigger-v217');
   await trigger.waitFor({state:'visible'});
   await type.waitFor({state:'visible'});
   await page.evaluate(()=>{window.__goalPickerChanges=[];document.getElementById('goalCurrencyV113').addEventListener('change',e=>window.__goalPickerChanges.push(e.target.value))});
   const menu=page.locator('#mmhCategoryPickerV2');
   await trigger.scrollIntoViewIfNeeded();
   await trigger.click();
   await menu.waitFor({state:'visible'});
   assert.equal(await menu.getByRole('option').count(),4);
   const bounds=await menu.boundingBox();
   assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=width+1);
   await menu.getByRole('option',{name:/MMK/}).click();
   await menu.waitFor({state:'hidden'});
   assert.equal(await currency.inputValue(),'MMK');
   assert.deepEqual(await page.evaluate(()=>window.__goalPickerChanges),['MMK']);
   await trigger.getByText(/MMK/).waitFor();
   await type.scrollIntoViewIfNeeded();
   await type.click();
   await menu.waitFor({state:'visible'});
   await page.keyboard.press('Escape');
   await menu.waitFor({state:'hidden'});
   assert.equal(await type.getAttribute('aria-expanded'),'false');
   // Mutation observer and language-change event must refresh the selected label.
   for(const label of ['应急基金','အရေးပေါ်ရန်ပုံငွေ','Emergency Fund']){
     await page.locator('#goalTypeV113').evaluate((el,label)=>{
       el.selectedOptions[0].textContent=label;
       window.dispatchEvent(new Event('mmhvault-language-change'));
     },label);
     await type.getByText(label,{exact:true}).waitFor();
   }
   assert.deepEqual(await currency.locator('option').evaluateAll(options=>options.map(o=>o.value)),['THB','MMK','USD','CNY']);
   const geometry=await page.evaluate(()=>({picker:document.querySelector('#goalCurrencyV113 + button').getBoundingClientRect().height,input:document.querySelector('#goalNameV113').getBoundingClientRect().height}));
   console.log('PASS Goals actual shared picker selection, Escape and locale refresh',width,light?'light':'dark',JSON.stringify(geometry));
   await page.locator('#goalFormPanelV113').evaluate(el=>el.hidden=true);
   assert.equal(await page.locator('#goalFormPanelV113').isVisible(),false);
  }finally{await page.close();}
 }
}finally{await browser.close();}
