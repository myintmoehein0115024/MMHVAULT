// Isolated actual Report export control flow in Chromium; no real financial data,
// network, actual html2canvas/jsPDF or production writes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const script=app.match(/<script id="mmhvault-report-export-v116-js">([\s\S]*?)<\/script>/)?.[1];
assert(script,'actual export script required');
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext();
 const origin='https://mmh-report-export-fixture.invalid';
 const unexpected=[];
 await context.route('**/*',route=>{
  if(route.request().url()===origin+'/')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body><main id="reports" class="active"><div class="report-shell-v115"><div class="report-controls-v115"><input id="reportMonthV115" value="2026-11"><select id="reportCurrencyV115"><option>USD</option><option>THB</option></select></div><p id="syntheticReport">Synthetic report only</p></div></main></body></html>'});
  unexpected.push(route.request().url());return route.abort();
 });
 const page=await context.newPage();await page.goto(origin+'/');
 await page.addScriptTag({content:[
  "var currentSessionUser={id:'fixture-a'};",
  "const fixture={mode:'month',year:2026,monthlyToken:1,annualToken:1,ready:true,rate:true,hold:false,release:null,captures:[],downloads:[],pdf:[],messages:[],toasts:[]};",
  "window.fixture=fixture;localStorage.setItem('mmhvault_language_v3363','en');",
  "window.MMHReportPeriodV201={get:()=>({mode:fixture.mode,year:fixture.year}),annualExportTokenV265:()=>fixture.annualToken};",
  "window.mmhMonthlyReportExportTokenV265=()=>fixture.monthlyToken;window.mmhLegacyReportDisplayV265=()=>fixture.rate?'0':'—';window.MMHBalanceBridgeV202={current:()=>({ready:fixture.ready})};",
  "window.MMHUI={message:(m)=>fixture.messages.push(m),toast:(m)=>fixture.toasts.push(m)};",
  "window.html2canvas=async(stage,opts)=>{fixture.captures.push({text:stage.textContent,ids:stage.querySelectorAll('[id]').length,scale:opts.scale});if(fixture.hold)await new Promise(r=>fixture.release=r);const canvas=document.createElement('canvas');canvas.width=400;canvas.height=500;const ctx=canvas.getContext('2d');ctx.fillStyle='#234';ctx.fillRect(0,0,400,500);return canvas};",
  "window.jspdf={jsPDF:class {constructor(){this.pages=1;this.images=0}addPage(){this.pages++}addImage(){this.images++}setFontSize(){}setTextColor(){}text(){}save(name){fixture.pdf.push({name,pages:this.pages,images:this.images})}}};",
  "document.addEventListener('click',e=>{const a=e.target.closest?.('a[download]');if(a){e.preventDefault();fixture.downloads.push(a.download)}},true);",
  script,
  "window.MMHReportExportV116.install();"
 ].join('\n')});
 const snapshot=()=>page.evaluate(()=>({captures:fixture.captures,downloads:fixture.downloads,pdf:fixture.pdf,messages:fixture.messages,toasts:fixture.toasts,stages:document.querySelectorAll('.report-export-stage-v116').length}));
 const run=type=>page.evaluate(type=>window.MMHReportExportV116[type](),type);
 const clean=async()=>{const s=await snapshot();assert.equal(s.stages,0);for(const id of ['reportExportImageV116','reportExportPdfV116'])assert.equal(await page.locator('#'+id).isDisabled(),false);return s};
 await run('exportImage');let s=await clean();
 assert.deepEqual(s.downloads,['MMHVAULT-Report-2026-11-USD.png']);
 assert.equal(s.captures.length,1);assert.equal(s.captures[0].ids,0);assert.equal(s.captures[0].scale,2);
 assert.match(s.captures[0].text,/Synthetic report only/);assert.equal(s.messages.length,0);
 await run('exportPdf');s=await clean();
 assert.equal(s.pdf[0].name,'MMHVAULT-Report-2026-11-USD.pdf');assert(s.pdf[0].pages>1);assert.equal(s.pdf[0].images,s.pdf[0].pages);
 await page.evaluate(()=>{fixture.mode='year';document.querySelector('#reportCurrencyV115').value='THB'});
 await run('exportPdf');s=await clean();assert.equal(s.pdf[1].name,'MMHVAULT-Report-2026-Annual-THB.pdf');
 await page.evaluate(()=>{fixture.mode='month';document.querySelector('#reportCurrencyV115').value='USD'});
 // While capture is suspended, each change must cancel before download/save.
 for(const [type,change] of [
  ['exportImage',"fixture.monthlyToken++"],
  ['exportPdf',"currentSessionUser={id:'fixture-b'}"],
  ['exportImage',"dispatchEvent(new Event('mmhvault:market-updated'))"],
  ['exportPdf',"fixture.ready=false"],
  ['exportImage',"document.querySelector('#reportCurrencyV115').value='THB'"],
  ['exportPdf',"document.querySelector('#reports').classList.remove('active')"]
 ]){
  const before=await snapshot();
  await page.evaluate(()=>{fixture.hold=true;fixture.release=null});
  const pending=run(type);
  await page.waitForFunction(()=>typeof fixture.release==='function');
  await page.evaluate(change);
  await page.evaluate(()=>{fixture.hold=false;fixture.release();fixture.release=null});
  await pending;s=await clean();
  assert.equal(s.downloads.length,before.downloads.length,change);
  assert.equal(s.pdf.length,before.pdf.length,change);
  assert.equal(s.messages.length,before.messages.length+1,change);
  await page.evaluate(()=>{currentSessionUser={id:'fixture-a'};fixture.ready=true;document.querySelector('#reportCurrencyV115').value='USD';document.querySelector('#reports').classList.add('active')});
 }
 for(const change of ["fixture.monthlyToken=null","currentSessionUser=null","fixture.rate=false"]){
  const before=await snapshot();await page.evaluate(change);await run('exportImage');s=await clean();
  assert.equal(s.captures.length,before.captures.length,change);
  assert.equal(s.downloads.length,before.downloads.length,change);
  assert.equal(s.messages.length,before.messages.length+1,change);
  await page.evaluate(()=>{fixture.monthlyToken=3;currentSessionUser={id:'fixture-a'};fixture.rate=true});
 }
 assert.deepEqual(unexpected,[]);
 console.log('PASS: actual Report export control flow with synthetic canvas/PDF adapters, monthly/annual naming, stage cleanup, cancellation on token/owner/market/readiness/currency/page change and no external requests');

 // Exercise the actual pinned export libraries in a second isolated context.
 // Real generated files stay in Playwright's temporary download directory.
 const visual=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 try{
  const blocked=[];
  await visual.route('**/*',route=>{
   if(route.request().url()===origin+'/')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body class="mmh-workspace-active"><main id="reports" class="page active"><div class="report-shell-v115"><header class="report-head-v115"><div><h1>Financial Report</h1><p>Sample data only</p></div><div class="report-controls-v115"><input id="reportMonthV115" value="2026-11"><select id="reportCurrencyV115"><option>USD</option></select></div></header><section class="report-kpis-v115"><article class="report-kpi-v115 income"><span>Income</span><strong>$1,234.00</strong><small>Sample</small></article><article class="report-kpi-v115 expense"><span>Expenses</span><strong>$234.00</strong><small>Sample</small></article><article class="report-kpi-v115 remaining"><span>Balance</span><strong>$1,000.00</strong></article></section><div class="report-panel-v115"><h2>Monthly summary</h2><div id="sampleRows"></div></div></div></main></body></html>'});
   if(route.request().url().startsWith('blob:'))return route.continue();
   blocked.push(route.request().url());return route.abort();
  });
  const v=await visual.newPage();await v.goto(origin+'/');
  for(const id of ['mmhvault-monthly-report-v115-css','mmhvault-v123-report-safe-responsive','mmhvault-report-export-v116-css']){
   const css=app.match(new RegExp('<style id="'+id+'">([\\s\\S]*?)<\\/style>'))?.[1];assert(css,id);await v.addStyleTag({content:css});
  }
  await v.addStyleTag({content:'body{margin:0;background:#06111f;color:#e4edf4;font-family:system-ui,sans-serif}*{box-sizing:border-box}'});
  await v.addScriptTag({path:'node_modules/html2canvas/dist/html2canvas.min.js'});
  await v.addScriptTag({path:'node_modules/jspdf/dist/jspdf.umd.min.js'});
  await v.addScriptTag({content:[
   "var currentSessionUser={id:'visual-fixture'};",
   "window.visualErrors=[];window.MMHUI={message:m=>visualErrors.push(m),toast:()=>{}};",
   "window.MMHReportPeriodV201={get:()=>({mode:'month',year:2026})};window.mmhMonthlyReportExportTokenV265=()=>1;window.mmhLegacyReportDisplayV265=()=> '0';window.MMHBalanceBridgeV202={current:()=>({ready:true})};",
   "for(let i=0;i<36;i++){const el=document.createElement('div');el.className='report-mini-v115';el.innerHTML='<span>Sample row '+(i+1)+'</span><b>$12.34</b>';document.querySelector('#sampleRows').append(el)}",
   "window.visualCapture=[];const realCapture=window.html2canvas;window.html2canvas=async(stage,options)=>{const bounds=stage.getBoundingClientRect();const canvas=await realCapture(stage,options);const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let varied=0;for(let i=0;i<pixels.length;i+=64){if(pixels[i]!==6||pixels[i+1]!==17||pixels[i+2]!==31)varied++}visualCapture.push({width:canvas.width,height:canvas.height,stageWidth:bounds.width,stageHeight:bounds.height,varied});return canvas};",
   script,"window.MMHReportExportV116.install();"
  ].join('\n')});
  for(const [method,name] of [['exportImage','MMHVAULT-Report-2026-11-USD.png'],['exportPdf','MMHVAULT-Report-2026-11-USD.pdf']]){
   const [download]=await Promise.all([v.waitForEvent('download',{timeout:45000}),v.evaluate(method=>window.MMHReportExportV116[method](),method)]);
   assert.equal(download.suggestedFilename(),name);assert.equal(await download.failure(),null);
   const bytes=readFileSync(await download.path());assert(bytes.length>10000,name+' contains real output');
   if(method==='exportImage'){
    assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16),2360);assert(bytes.readUInt32BE(20)>1000);
   }else{
    assert.match(bytes.subarray(0,8).toString(),/^%PDF-/);
    assert((bytes.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length>=2,'real multipage PDF');
   }
   const result=await v.evaluate(()=>({errors:visualErrors,capture:visualCapture.at(-1),stages:document.querySelectorAll('.report-export-stage-v116').length}));
   assert.deepEqual(result.errors,[]);assert.equal(result.stages,0);assert.equal(result.capture.stageWidth,1180);assert.equal(result.capture.width,2360);assert(result.capture.varied>1000,'nonblank captured report');
   console.log('REPORT-REAL-EXPORT '+JSON.stringify({name,bytes:bytes.length,...result.capture}));
  }
  assert.deepEqual(blocked,[]);
  console.log('PASS: real pinned html2canvas/jsPDF produced nonblank fixed-width PNG and multipage PDF from synthetic mobile report with actual scoped CSS; no external requests');
 }finally{await visual.close()}
}finally{await browser.close()}
