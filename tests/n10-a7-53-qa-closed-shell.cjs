/* N10-A7.53: main-deploy candidate QA hard-lock safety contract (offline). */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('n10-a7-53-qa.html','utf8'),js=fs.readFileSync('js/mmhvault-n10-a7-53-qa.js','utf8');
assert.match(html,/name="robots" content="noindex,nofollow,noarchive,nosnippet,noimageindex"/);
assert.match(html,/Content-Security-Policy[^>]*connect-src 'none'/);
assert.match(html,/script-src 'self'/);
assert.match(html,/form-action 'none'/);
assert.match(html,/script src="\.\/js\/mmhvault-n10-a7-53-qa\.js" defer/);
assert.equal((html.match(/<select /g)||[]).length,6);
assert.equal((html.match(/<button disabled class="disabledAction"/g)||[]).length,2);
assert.doesNotMatch(html,/<(?:form|iframe|img)\b|on(?:load|click|error)\s*=|<script\s*src="https?:/i);
assert.equal((html.match(/<input /g)||[]).length,4);
assert.equal((html.match(/<input [^>]*disabled readonly /g)||[]).length,4);
assert.equal((html.match(/<input [^>]*type="password"/g)||[]).length,2);
assert.doesNotMatch(html,/sb_secret_|SUPABASE_SERVICE_ROLE_KEY|N10A740_RATE_HMAC_KEY|N10A740_TURNSTILE_SECRET|access_token|refresh_token/i);
assert.match(js,/const QA_CLOSED = true;/);
assert.match(js,/el\.value='';el\.disabled=true;el\.readOnly=true;/);
assert.match(js,/const BACKEND_REQUESTS_ALLOWED = false;/);
assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|createClient|(?:window|globalThis)\.localStorage|\bimport\s*\(/);
assert.doesNotMatch(js,/\beval\s*\(|new Function\s*\(|\.cookie\s*=/);
new vm.Script(js);
function mock(hostname,protocol){
 const nodes=new Map();
 for(const id of ['badge','hostReadout','portalMode','langToggle','progressText','progressNote','progressFill']){
  const handlers={};nodes.set(id,{textContent:'',style:{},handlers,addEventListener:(name,fn)=>handlers[name]=fn});
 }
 const selects=Array.from({length:6},()=>{const handlers={};return {value:'pending',handlers,options:[{},{},{}],addEventListener:(name,fn)=>handlers[name]=fn};});
 const translates=Array.from({length:10},()=>({textContent:'',getAttribute:key=>key==='data-zh'?'中文':'English'}));
 const inputs=Array.from({length:4},()=>({disabled:false,readOnly:false,value:'pretend'}));
 const blockedButtons=Array.from({length:2},()=>({disabled:false}));
 const document={readyState:'complete',documentElement:{lang:'zh-CN'},getElementById:id=>nodes.get(id),
  querySelectorAll:q=>q==='#checklist select'?selects:q==='[data-zh][data-en]'?translates:q==='.qaFields input'?inputs:q==='button.disabledAction'?blockedButtons:[],
  addEventListener:()=>{throw Error('unexpected DOM listener')}};
 vm.runInNewContext(js,{document,location:{hostname,protocol},fetch:()=>{throw Error('fetch is forbidden')},console},{timeout:1600});
 return {nodes,selects,document,inputs,blockedButtons};
}
const a=mock('mmhvault.com','https:');
assert.equal(a.nodes.get('badge').textContent,'N10-A7.54-A · LOCKED');
assert.match(a.nodes.get('portalMode').textContent,/NO NETWORK/);
assert.ok(a.inputs.every(x=>x.disabled&&x.readOnly&&x.value===''));
assert.ok(a.blockedButtons.every(x=>x.disabled));
a.selects.forEach(s=>s.value='yes');a.selects[0].handlers.change();
assert.equal(a.nodes.get('progressFill').style.width,'100%');
assert.equal(a.nodes.get('badge').textContent,'N10-A7.54-A · LOCKED');
a.nodes.get('langToggle').handlers.click();assert.equal(a.document.documentElement.lang,'en');
assert.equal(a.nodes.get('portalMode').textContent,'LOCKED / NO NETWORK');
assert.match(mock('myintmoehein0115024.github.io','https:').nodes.get('portalMode').textContent,/CLOSED/);
assert.match(mock('mmhvault.com','http:').nodes.get('hostReadout').textContent,/preview only/);
console.log('PASS N10-A7.54-A: noindex/CSP deny network, four disabled and blank A/B previews, no secret fields, dual lock, zh/en UI and host isolation.');
