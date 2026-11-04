/* APP V11.7 Staging signed-A/B QA page: browser harness with mocked
 * transport. No real token, Auth user, Supabase request or financial write.
 * The page itself remains configured for the FIXED staging project only.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright-core');
const engine=process.env.MMH_BROWSER_ENGINE==='webkit'?'webkit':'chrome';
const BASE='https://ldivswlhtgmznzwhzsoi.supabase.co/';
const PAGE='http://127.0.0.1:8768/tests/app-v117-staging-signed-ab-qa.html';
const users={
  A:{id:'a3fcb090-4580-4573-9db2-530c3ce9a111',email:'tester+v117qaa@example.com',token:'mock-token-A'},
  B:{id:'b3fcb090-4580-4573-9db2-530c3ce9b222',email:'tester+v117qab@example.com',token:'mock-token-B'}
};
const state={transactions:[],personal_configuration:[],nextId:7000};
let leak=false;
const responseHeaders={
 'access-control-allow-origin':'*',
 'access-control-allow-headers':'authorization,apikey,content-type,prefer,accept',
 'access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS',
 'content-type':'application/json'
};
async function fakeCloud(route){
 const req=route.request(),url=new URL(req.url()),method=req.method();
 const complete=(status,data)=>route.fulfill({status,headers:responseHeaders,body:JSON.stringify(data)});
 if(url.origin+'/ '===BASE){throw Error('Unexpected API route')}
 if(method==='OPTIONS')return route.fulfill({status:204,headers:responseHeaders,body:''});
 if(url.pathname==='/auth/v1/token'){
   const body=req.postDataJSON(),candidate=Object.values(users).find(u=>u.email===String(body?.email||'').toLowerCase());
   if(!candidate||!body?.password)return complete(403,{message:'Dedicated synthetic account required'});
   return complete(200,{access_token:candidate.token,user:{id:candidate.id,email:candidate.email}});
 }
 const token=String(req.headers()['authorization']||'').replace(/^Bearer\s+/i,'');
 const owner=Object.values(users).find(u=>u.token===token);
 if(!owner)return complete(401,{message:'Invalid mock token'});
 const table=url.pathname.slice('/rest/v1/'.length),rows=state[table];
 assert.ok(Array.isArray(rows),'Unknown QA REST table');
 const select=()=>rows.filter(row=>(leak&&table==='transactions'&&owner===users.B)||
    row.user_id===owner.id).filter(row=>{
   for(const [key,val] of url.searchParams){
     if(['select','order','limit'].includes(key))continue;
     if(!val.startsWith('eq.')||String(row[key])!==val.slice(3))return false;
   }
   return true;
 }).slice(0,url.searchParams.has('limit')?Number(url.searchParams.get('limit')):Infinity);
 if(method==='GET')return complete(200,select());
 if(method==='POST'){
   const body=req.postDataJSON();
   if(body.user_id!==owner.id)return complete(403,{code:'42501',message:'RLS forbidden'});
   if(table==='transactions')body.id=++state.nextId;
   else body.updated_at='2026-11-04T03:00:00.000Z';
   rows.push(JSON.parse(JSON.stringify(body)));
   return complete(201,[body]);
 }
 if(method==='PATCH'){
   const targets=new Set(select());const changed=[];
   for(const row of rows){
     if(row.user_id!==owner.id)continue;
     if(![...targets].some(t=>t===row)){
       // select returns original row objects; none of these are clones.
       continue;
     }
     Object.assign(row,req.postDataJSON());changed.push({...row});
   }
   return complete(200,changed);
 }
 if(method==='DELETE'){
   const targets=new Set(select()),changed=[];
   for(const row of [...rows]){
     if(row.user_id!==owner.id||!targets.has(row))continue;
     rows.splice(rows.indexOf(row),1);changed.push({...row});
   }
   return complete(200,changed);
 }
 return complete(405,{message:'Unsupported method'});
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,desc,attempts=130){
 for(let i=0;i<attempts;i++){if(await fn())return;await sleep(100)}
 throw Error('Timed out: '+desc);
}
(async()=>{
 const browser=engine==='webkit'?await webkit.launch({headless:true}):
   await chromium.launch({headless:true,channel:'chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({viewport:{width:393,height:850},serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route(BASE+'**',fakeCloud);
  const res=await page.goto(PAGE,{waitUntil:'load'});
  assert.equal(res.status(),200);
  for(const letter of ['A','B']){
    await page.locator('#email'+letter).fill(users[letter].email);
    await page.locator('#password'+letter).fill('synthetic-test-only');
    await page.locator('#btn'+letter).click();
    await until(async()=> (await page.locator('#login'+letter).textContent()).includes('已登录'),
      letter+' login');
    assert.equal(await page.locator('#password'+letter).inputValue(),'','password cleared after login');
  }
  await page.locator('#consent').check();
  assert.equal(await page.locator('#run').isEnabled(),true);
  await page.locator('#run').click();
  await until(async()=>await page.locator('#run').isEnabled(),'first QA run complete');
  const firstStatus=await page.locator('#state').textContent();
  const firstLog=await page.locator('#log').textContent();
  assert.match(firstStatus,/真实验收通过/);
  assert.match(firstStatus,/已清理/);
  assert.doesNotMatch(firstLog,/✗/);
  assert.ok((firstLog.match(/✓/g)||[]).length>=24,'all RLS and archive assertions ran');
  assert.equal(state.transactions.length,0,'all synthetic transactions cleaned');
  assert.equal(state.personal_configuration.length,0,'all synthetic config cleaned');
  assert.deepEqual(errors,[]);
  // Transport defect injection: leaking A's row to B MUST fail the UI
  // acceptance, and its cleanup must NOT be mislabeled as test success.
  leak=true;
  await page.locator('#run').click();
  await until(async()=>await page.locator('#run').isEnabled(),'failure-injection QA run complete');
  const second=await page.locator('#state').textContent();
  assert.match(second,/验收未通过/,'a bad RLS response never shows a pass');
  assert.match(second,/已清理/,'even failed QA cleans up fixtures');
  assert.equal(state.transactions.length,0);
  assert.equal(state.personal_configuration.length,0);
  assert.deepEqual(errors,[]);
  console.log('PASS APP V11.7 '+engine+
    ' standalone Staging QA UI: 27+ positive mock checks, injected failure, zero residual rows');
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
