// Inspect the actual production app.html Account Security markup against the
// MFA-only candidate. Network and Auth are entirely synthetic, and no file is
// changed on production main. No credentials, real OTP, service keys or Vault.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium,webkit} from 'playwright';
const html=readFileSync('app.html','utf8');
const source=readFileSync('js/mmhvault-n10-a7-83-security-center.js','utf8');
const open='<!-- N10-A7.83: Owner-only account security controls';
const close='<!-- P9.52: email recovery';
const first=html.indexOf(open),last=html.indexOf(close,first);
assert.ok(first>=0&&last>first,'Production account security HTML section must be found');
const realMarkup=html.slice(first,last);
const srcPath='js/mmhvault-n10-a7-83-security-center.js';
const assetMatches=[...html.matchAll(/<script\b[^>]*src=["']([^"']*mmhvault-n10-a7-83-security-center\.js[^"']*)["'][^>]*>/gi)];
assert.equal(assetMatches.length,1,'exactly one security JS entrypoint in app.html');
assert.ok(assetMatches[0][1].startsWith(srcPath+'?v='),'security JS needs versioned relative URL');
assert.ok(first<assetMatches[0].index,'security DOM must be parsed before script');
assert.ok(html.indexOf('const db=')<assetMatches[0].index,'db should initialize before security script');
assert.ok(html.indexOf('js/vendor/qrcode-1.0.0.min.js')<assetMatches[0].index,'QR library precedes security script');
assert.ok(!/<script\b/i.test(realMarkup),'section is self-contained DOM, not scripts');
const required=[
 'mmhA783SecurityCenter','mmhA783TotpSetup','mmhA783TotpStart',
 'mmhA783TotpConsent','mmhA783TotpConfirm','mmhA783TotpCode',
 'mmhA783TotpQr','mmhA783TotpSecret','mmhA783TotpRemove',
 'mmhA783TotpRemoveText','mmhA783TotpRemoveNow','mmhA783Recovery',
 'mmhA783KeyVerify','mmhA783KeyWords'
];
for(const id of required){
 const count=[...realMarkup.matchAll(new RegExp('id=["\x27]'+id+'["\x27]','g'))].length;
 assert.equal(count,1,'production DOM ID '+id+' must exist once');
}
assert.doesNotMatch(realMarkup,/id=["']mmhA783TotpBackupConfirmed["']/,
 'backup acknowledgment should be supplied exactly once by candidate bootstrap');
assert.match(source,/backupBox\.id='mmhA783TotpBackupConfirmed'/,
 'candidate must create backup acknowledgment');
assert.match(source,/confirmButton\?\.parentElement\?\.before\(backupLabel\)/,
 'backup acknowledgment must appear before verification actions');
console.log('PASS actual app.html DOM, script order, QR dependency and runtime backup acknowledgment contract');

// This is a release checklist warning, not a change to app.html.
// A separate, approved production integration must bump the app cache query
// when publishing new JS, otherwise clients may reuse a cached old script.
const assetVersion=assetMatches[0][1].split('?v=')[1];
console.log('RELEASE CHECKLIST: bump app.html security script cache token from',assetVersion,
  'when the approved code is actually deployed. This review branch does not change app.html.');
const shell='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+
 '<div id="settings" class="active"><div id="stPage_security">'+realMarkup+'</div></div></body></html>';
const server=createServer((req,res)=>{
 if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(shell)}
 else{res.writeHead(404);res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
function stubAuth(){
 const uid='00000000-0000-4000-8000-0000000000aa';
 window.__verified=false;
 window.__verifyCalls=0;
 const factor={id:'synthetic-totp-factor',factor_type:'totp',status:'verified'};
 window.db={auth:{
  getUser:async()=>({data:{user:{id:uid,is_anonymous:false}},error:null}),
  getSession:async()=>({data:{session:{user:{id:uid},access_token:'SYNTHETIC_LOCAL_ONLY'}},error:null}),
  getUserIdentities:async()=>({data:{identities:[]},error:null}),
  onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
  mfa:{
   listFactors:async()=>({data:{all:window.__verified?[factor]:[],
       totp:window.__verified?[factor]:[]},error:null}),
   getAuthenticatorAssuranceLevel:async()=>({data:{
     currentLevel:window.__verified?'aal2':'aal1',nextLevel:window.__verified?'aal2':'aal1'},error:null}),
   enroll:async()=>({data:{id:factor.id,totp:{
     qr_code:'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
     secret:'SYNTHETIC_ONLY_NOT_A_REAL_SECRET'}},error:null}),
   unenroll:async()=>({error:null}),
   challenge:async()=>({data:{id:'synthetic-challenge'},error:null}),
   verify:async()=>{window.__verifyCalls++;window.__verified=true;return {data:{},error:null}}
  }
 }};
 window.fetch=async()=>({ok:true,json:async()=>({
  code:'account_status',username_only:true,username:'synthetic_user'
 })});
}
try{
 for(const [engine,browserType] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await browserType.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width:390,height:844}});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    return url.hostname==='127.0.0.1'&&url.port===String(port)
      ?route.continue():route.abort();
   });
   await page.goto('http://127.0.0.1:'+port+'/');
   await page.addScriptTag({content:'('+stubAuth.toString()+')()'});
   await page.addScriptTag({content:source});
   const checkbox=page.locator('#mmhA783TotpBackupConfirmed');
   assert.equal(await checkbox.count(),1);
   assert.equal(await checkbox.isChecked(),false);
   const placement=await page.evaluate(()=>{
    const ack=document.getElementById('mmhA783TotpBackupConfirmed');
    const setup=document.getElementById('mmhA783TotpSetup');
    const actions=document.getElementById('mmhA783TotpConfirm').parentElement;
    return {inside:setup.contains(ack),
      before:!!(ack.closest('label').compareDocumentPosition(actions)&Node.DOCUMENT_POSITION_FOLLOWING),
      text:ack.parentElement.textContent.trim()};
   });
   assert.equal(placement.inside,true);
   assert.equal(placement.before,true);
   assert.ok(placement.text.includes('I have backed up this authenticator'));
   await page.evaluate(()=>{
    localStorage.setItem('mmhvault_language_v3363','zh');
    window.dispatchEvent(new Event('mmhvault-language-change'));
   });
   assert.ok((await checkbox.locator('..').textContent()).includes('我已安全备份'));
   await page.evaluate(()=>{
    localStorage.setItem('mmhvault_language_v3363','en');
    window.dispatchEvent(new Event('mmhvault-language-change'));
   });
   await page.waitForFunction(()=>document.getElementById('mmhA783TotpStart').disabled===false);
   await page.locator('#mmhA783SecurityCenter .mmh-a783-section').last().locator('.mmh-a783-title').click();
   await page.locator('#mmhA783TotpConsent').check();
   await page.locator('#mmhA783TotpStart').click();
   await page.locator('#mmhA783TotpSetup').waitFor({state:'visible'});
   await page.locator('#mmhA783TotpCode').fill('123456');
   await page.locator('#mmhA783TotpConfirm').click();
   assert.equal(await page.evaluate(()=>window.__verifyCalls),0,
      'must not allow MFA verify without a backup acknowledgment');
   assert.ok((await page.locator('#mmhA783Status').textContent()).includes('Save the authenticator'));
   await checkbox.check();
   await page.locator('#mmhA783TotpConfirm').click();
   await page.waitForFunction(()=>window.__verified===true);
   await page.waitForFunction(()=>document.getElementById('mmhA783TotpStatus').textContent==='Authenticator enabled');
   assert.equal(await page.evaluate(()=>window.__verifyCalls),1);
   assert.equal(await checkbox.isChecked(),false,'successful verification clears the acknowledgment');
   assert.deepEqual(errors,[]);
   await page.close();
   console.log('PASS',engine,'actual app.html Account Security DOM, bilingual injected acknowledgment, MFA backup gate and verified UI');
  }finally{await browser.close()}
 }
 console.log('2/2 actual-app DOM browser integration checks PASS');
}finally{await new Promise(resolve=>server.close(resolve))}
