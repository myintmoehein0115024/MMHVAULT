/* N10-A7.41: mock-only end-to-end username handoff regression.
 * This test temporarily enables the gate IN MEMORY. The repo source stays closed.
 * No real credential, real Supabase call, live deployment or database changes.
 */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const original=fs.readFileSync('js/mmhvault-n10-a7-40-username.js','utf8');
assert.match(original,/const ENABLED=false;/);
assert.match(original,/const TURNSTILE_SITE_KEY='';/);
assert.match(original,/window\.MMHVAULT_N10_A741_USERNAME_HANDOFF=true/);
function node(id,active=false){
 const handlers={},states=new Set(active?['active']:[]);
 return {id,value:'',textContent:'',disabled:false,hidden:false,
   classList:{contains:x=>states.has(x),toggle(x,on){(on??!states.has(x))?states.add(x):states.delete(x)}},
   addEventListener:(name,cb)=>{handlers[name]=cb},
   fire:(name)=>handlers[name]?.({preventDefault(){}}),setAttribute(){},
   querySelectorAll:q=>q==='label'?[{htmlFor:'mmhA740Username'},{htmlFor:'mmhA740Password'}]:[],
   querySelector:q=>q==='.mmh-a740-help'?{firstChild:{textContent:''}}:null};
}
async function scenario({redirect=true,uidMatches=true,sessionError=false,httpOk=true}={}){
 const nodes=new Map(),switches=[];
 for(const id of ['usernameSignIn','signin','mmhA740Username','mmhA740Password',
   'mmhA740Submit','mmhA740Status','mmhA740Captcha','mmhA740Forgot','signinEmail'])
   nodes.set(id,node(id,id==='signin'));
 for(let i=0;i<4;i++){const b=node('switch'+i);b.dataset={mmhA740Method:i%2?'username':'email'};switches.push(b)}
 let challenge,fetches=0,signouts=0,navigations=0,sets=0,flagDuringSet=false;
 const window={getMMHVAULTLanguage:()=> 'en',addEventListener(){},
   turnstile:{render:(_,opts)=>(challenge=opts,7),reset(){}}};
 const document={getElementById:id=>nodes.get(id)||null,
   querySelectorAll:q=>q==='[data-mmh-a740-method]'?switches:[]};
 const db={auth:{
   setSession:async()=>{sets++;flagDuringSet=window.MMHVAULT_N10_A741_USERNAME_HANDOFF===true;
     return sessionError?{error:Error('rejected')}:{data:{user:{id:'fake-uid-1'}}}},
   getUser:async()=>({data:{user:{id:uidMatches?'fake-uid-1':'fake-uid-2'}}}),
   getSession:async()=>({data:{session:{user:{id:'fake-uid-1'}}}}),
   signOut:async({scope})=>{assert.equal(scope,'local');signouts++;return {}}
 }};
 const fakeFetch=async()=>{fetches++;return {ok:httpOk,json:async()=>httpOk?{
   code:'login_success',access_token:'fake-access',refresh_token:'fake-refresh'
 }:{code:'invalid_credentials'}}};
 // Test-only replacement: never rewrite or persist the source file.
 const enabled=original.replace('const ENABLED=false;','const ENABLED=true;')
   .replace("const TURNSTILE_SITE_KEY='';","const TURNSTILE_SITE_KEY='0xFAKE';");
 new Function('window','document','location','db','SUPABASE_URL','SUPABASE_KEY',
   'verifiedRedirectV946','fetch','AbortController','setTimeout','clearTimeout',enabled)(
   window,document,{protocol:'https:',hostname:'mmhvault.com'},db,
   'https://vrypucmyrztxgiqhjspd.supabase.co','sb_publishable_fake',
   async()=>{navigations++;return redirect},fakeFetch,
   class {constructor(){this.signal={}}abort(){}},()=>1,()=>{}
 );
 switches[1].fire('click');await Promise.resolve();await Promise.resolve();
 assert.ok(challenge,'in-memory Cloudflare challenge fixture created');
 challenge.callback('FAKE_CAPTCHA_SINGLE_USE_TOKEN');
 nodes.get('mmhA740Username').value='test_user';
 nodes.get('mmhA740Password').value='fake-password';
 await nodes.get('usernameSignIn').fire('submit');
 return {fetches,signouts,navigations,sets,flagDuringSet,
   handoff:window.MMHVAULT_N10_A741_USERNAME_HANDOFF,
   status:nodes.get('mmhA740Status').textContent};
}
(async()=>{
 const ok=await scenario();
 assert.equal(ok.fetches,1);assert.equal(ok.sets,1);assert.equal(ok.signouts,0);
 assert.equal(ok.navigations,1);assert.equal(ok.flagDuringSet,true);assert.equal(ok.handoff,false);
 const noRedirect=await scenario({redirect:false});
 assert.equal(noRedirect.signouts,1);assert.equal(noRedirect.handoff,false);
 const mismatch=await scenario({uidMatches:false});
 assert.equal(mismatch.navigations,0);assert.equal(mismatch.signouts,1);
 const rejectedSession=await scenario({sessionError:true});
 assert.equal(rejectedSession.navigations,0);assert.equal(rejectedSession.signouts,1);
 const denied=await scenario({httpOk:false});
 assert.equal(denied.sets,0);assert.equal(denied.signouts,0);
 assert.match(denied.status,/Could not sign in/);
 console.log('PASS N10-A7.41: 5 mocked flows, session handoff, UID mismatch, redirect failure and denial.');
})().catch(e=>{console.error(e);process.exitCode=1});
