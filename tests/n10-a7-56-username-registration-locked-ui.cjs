/* N10-A7.56: username signup layout / switch / production fail-closed. NO network. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const html=fs.readFileSync('login.html','utf8'),js=fs.readFileSync('js/mmhvault-n10-a7-56-username-signup.js','utf8');
assert.match(html,/id="signup"[\s\S]*?data-mmh-a756-signup-method="email"/);
assert.match(html,/id="usernameSignUp"[\s\S]*?data-mmh-a756-signup-method="username"/);
assert.match(html,/id="mmhA756Name"[^>]*maxlength="20"[^>]*pattern="\[a-z\]\[a-z0-9_\]\{3,19\}"/);
assert.match(html,/id="mmhA756Password"[^>]*minlength="6" maxlength="20"/);
assert.match(html,/id="mmhA756Confirm"[^>]*minlength="6" maxlength="20"/);
assert.match(html,/id="mmhA756Recovery" type="email"/);
assert.match(html,/id="mmhA756Submit" disabled/);
assert.match(html,/id="mmhA756Terms"/);
assert.match(html,/Username-only registration is not available yet/);
assert.match(html,/const activeForm=formId==='recovery'\?'recovery':formId==='signup'\?'signup':formId==='usernameSignUp'/);
assert.match(html,/const currentForm=id==='usernameSignUp'\?'usernameSignUp'/);
assert.match(html,/'Create Username Account':'创建用户名账户'/);
assert.match(html,/'Username':'用户名'/);
assert.match(html,/mmhvault-n10-a7-56-username-signup\.js/);
assert.match(html,/db\.auth\.signInWithPassword/);
assert.match(html,/db\.auth\.signInWithOAuth/);
assert.match(html,/db\.auth\.signUp\(\{/);
assert.match(html,/db\.auth\.resetPasswordForEmail/);
assert.match(html,/PASSWORD_RECOVERY/);
assert.match(html,/MMHVAULT_N10_A741_USERNAME_HANDOFF/);
assert.match(js,/const REGISTER_ENABLED=false;/);
assert.doesNotMatch(js,/\bfetch\s*\(|\bsignUp\s*\(|\bcreateUser\s*\(|\blocalStorage\s*\./);
assert.doesNotMatch(js,/sb_secret_|service_role|supabase\.co/);
assert.equal((html.match(/<form\b/g)||[]).length,(html.match(/<\/form>/g)||[]).length);
assert.equal((html.match(/id="usernameSignUp"/g)||[]).length,1);
for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){
  if(!/\bsrc\s*=/.test(match[1]))new vm.Script(match[2],{filename:'login.html inline'});
}
new vm.Script(js);

function elem(id,active=false){
 const listeners={};const state=new Set(active?['active']:[]);
 return{id,disabled:false,value:'',textContent:'',dataset:{},children:[],listeners,
  classList:{contains:k=>state.has(k),toggle:(k,on)=>{(on===undefined?!state.has(k):on)?state.add(k):state.delete(k)}},
  addEventListener:(name,fn)=>{(listeners[name]??=[]).push(fn)},
  setAttribute(k,v){this[k]=v},fire(type){for(const f of listeners[type]||[])f({preventDefault(){}})}};
}
const ids=['signup','usernameSignUp','mmhA756Status','mmhA756Submit','mmhA756Name','mmhA756Password','mmhA756Confirm','recovery'];
const nodes=new Map(ids.map(id=>[id,elem(id,id==='signup')]));
const tabs=[elem('tab1'),elem('tab2')];tabs[0].dataset.target='signin';tabs[1].dataset.target='signup';
const methods=['email','username','email','username'].map((m,i)=>{const n=elem('switch'+i);n.dataset.mmhA756SignupMethod=m;return n});
const language=[elem('language')],others=[];
const document={
  getElementById:id=>nodes.get(id),
  querySelectorAll:selector=>selector==='[data-mmh-a756-signup-method]'?methods:
   selector==='#authTabs .tab'?tabs:
   selector==='.mmh-lang-switcher [data-lang]'?language:
   selector==='[data-switch],[data-target]'?others:[]
};
let zh=false,network=0,applied=0;const window={
  getMMHVAULTLanguage:()=>zh?'zh':'en',
  applyMMHVAULTLanguage:()=>{applied++},
  addEventListener:()=>{}
};
vm.runInNewContext(js,{document,window,Error});
assert.equal(nodes.get('mmhA756Submit').disabled,true);
methods[1].fire('click');assert.equal(nodes.get('usernameSignUp').classList.contains('active'),true);
assert.equal(nodes.get('signup').classList.contains('active'),false);
assert.equal(methods[1]['aria-pressed'],'true');assert.equal(methods[0]['aria-pressed'],'false');
zh=true;language[0].fire('click');assert.match(nodes.get('mmhA756Status').textContent,/用户名独立注册/);
nodes.get('mmhA756Password').value='fake-no-network';nodes.get('mmhA756Confirm').value='fake-no-network';
nodes.get('usernameSignUp').fire('submit');assert.equal(nodes.get('mmhA756Password').value,'');
assert.equal(nodes.get('mmhA756Confirm').value,'');
assert.equal(nodes.get('mmhA756Submit').disabled,true);
methods[0].fire('click');assert.equal(nodes.get('signup').classList.contains('active'),true);
assert.equal(nodes.get('usernameSignUp').classList.contains('active'),false);
assert.equal(network,0);assert.ok(applied>=2);
console.log('PASS N10-A7.56: bilingual email/username registration tabs, current email/google/signup/recovery unchanged, username registration fail-closed, no fake email/credentials/network.');
