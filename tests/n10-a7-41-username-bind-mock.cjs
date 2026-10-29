/* N10-A7.41: Username binding mock regression (zero real network or credentials).
 * In-memory fixture only; production source remains ENABLED=false and SITE_KEY=''.
 */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/mmhvault-n10-a7-41-bind.js','utf8');
assert.match(source,/const ENABLED=false;/);
assert.match(source,/const SITE_KEY='';/);
assert.match(source,/client\.auth\.getUser\(\)/);
assert.match(source,/client\.auth\.getSession\(\)/);
assert.doesNotMatch(source,/ldivswlhtgmznzwhzsoi|sb_secret_|SUPABASE_SERVICE_ROLE_KEY/);
function node(id){const handlers={};return {
 id,textContent:'',value:'',placeholder:'',disabled:false,hidden:false,
 addEventListener:(n,f)=>{handlers[n]=f},fire:(n)=>handlers[n]?.({preventDefault(){}})
};}
async function scenario(opt={}){
 const nodes=new Map();
 for(const id of ['mmhA741BindForm','mmhA741Name','mmhA741Password','mmhA741BindSubmit',
  'mmhA741BindStatus','mmhA741BindCaptcha','mmhA741Language','mmhA741Title','mmhA741Intro',
  'mmhA741NameLabel','mmhA741NameHint','mmhA741PasswordLabel','mmhA741PasswordHint',
  'mmhA741Back','mmhA741Recovery'])nodes.set(id,node(id));
 let challenge=null,authCalls=0,networkCalls=0;
 const auth={
  getUser:async()=>{authCalls++;return {data:{user:{
    id:opt.mismatch?'other-user':'expected-user',
    email_confirmed_at:opt.unverified?null:'2026-10-29',is_anonymous:false
  }}}},
  getSession:async()=>({data:{session:{user:{id:'expected-user'},access_token:'MOCK_JWT'}}})
 };
 const window={supabase:{createClient:()=>({auth})},
  turnstile:{render:(_,opts)=>(challenge=opts,123),reset(){}},addEventListener(){}};
 const document={getElementById:id=>nodes.get(id),documentElement:{lang:'en'}};
 const localStorage={getItem:()=>null,setItem(){}};
 const code=opt.closed?source:source.replace('const ENABLED=false;','const ENABLED=true;')
   .replace("const SITE_KEY='';","const SITE_KEY='0xFAKE';");
 const fetch=async()=>{networkCalls++;return {ok:opt.http!==409&&opt.http!==403,
   status:opt.http||200,json:async()=>({code:opt.http===409?'username_unavailable':
    opt.http===403?'denied':'bind_success'})}};
 new Function('window','document','location','MMH_A741_PROJECT','MMH_A741_PUBLISHABLE',
  'localStorage','fetch','AbortController','setTimeout','clearTimeout',code)(
  window,document,{protocol:'https:',hostname:'mmhvault.com'},
  'https://vrypucmyrztxgiqhjspd.supabase.co','sb_publishable_fake',
  localStorage,fetch,class{constructor(){this.signal={}}abort(){}},()=>1,()=>{}
 );
 if(opt.closed)return {authCalls,networkCalls,disabled:nodes.get('mmhA741BindSubmit').disabled};
 for(let i=0;i<5&&!challenge;i++)await Promise.resolve();
 assert.ok(challenge,'mock turnstile rendered');
 challenge.callback('FAKE_TOKEN');
 nodes.get('mmhA741Name').value='testuser';
 nodes.get('mmhA741Password').value='test-password';
 await nodes.get('mmhA741BindForm').fire('submit');
 return {authCalls,networkCalls,
  status:nodes.get('mmhA741BindStatus').textContent,
  disabled:nodes.get('mmhA741BindSubmit').disabled,
  passwordCleared:nodes.get('mmhA741Password').value===''};
}
(async()=>{
 const closed=await scenario({closed:true});
 assert.equal(closed.authCalls,0);assert.equal(closed.networkCalls,0);assert.equal(closed.disabled,true);
 const good=await scenario();
 assert.equal(good.authCalls,1);assert.equal(good.networkCalls,1);
 assert.match(good.status,/Username linked/);assert.equal(good.passwordCleared,true);
 assert.equal(good.disabled,true);
 for(const config of [{mismatch:true},{unverified:true}]){
  const failed=await scenario(config);
  assert.equal(failed.authCalls,1);assert.equal(failed.networkCalls,0);
  assert.match(failed.status,/Could not link username/);
 }
 const conflict=await scenario({http:409});
 assert.equal(conflict.networkCalls,1);assert.match(conflict.status,/Username unavailable/);
 const denied=await scenario({http:403});
 assert.equal(denied.networkCalls,1);assert.match(denied.status,/Could not link username/);
 console.log('PASS N10-A7.41: closed, linked, UID mismatch, unverified email, conflict, denied (6 mocked flows).');
})().catch(err=>{console.error(err);process.exitCode=1});
