/* N10-A7.40 offline locked-UI behavior smoke: no browser/network/account needed. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/mmhvault-n10-a7-40-username.js','utf8');
const nodes=new Map(),buttons=[];
function make(id,active=false){
  const listeners=new Map(),classes=new Set(active?['active']:[]);
  const node={id,value:'',textContent:'',placeholder:'',disabled:false,hidden:false,
    classList:{contains:c=>classes.has(c),toggle(c,set){if(set===undefined)set=!classes.has(c);if(set)classes.add(c);else classes.delete(c)}},
    addEventListener:(type,fn)=>listeners.set(type,fn),
    dispatch:(type)=>listeners.get(type)?.({preventDefault(){}}),
    setAttribute(n,v){this[n]=v},
    querySelectorAll:q=>q==='label'?[{htmlFor:'mmhA740Username',textContent:''},{htmlFor:'mmhA740Password',textContent:''}]:[],
    querySelector:q=>q==='.mmh-a740-help'?{firstChild:{textContent:''}}:null
  };nodes.set(id,node);return node;
}
for(const id of ['usernameSignIn','signin','mmhA740Username','mmhA740Password',
  'mmhA740Submit','mmhA740Status','mmhA740Captcha','mmhA740Forgot','signinEmail'])
  make(id,id==='signin');
for(let i=0;i<4;i++){const b=make('switch'+i);b.dataset={mmhA740Method:i%2?'username':'email'};buttons.push(b);}
const langButton=make('lang');
let language='en',networkRequests=0;
const document={getElementById:id=>nodes.get(id)||null,querySelectorAll:q=>
  q==='[data-mmh-a740-method]'?buttons:q==='[data-lang]'?[langButton]:[]};
const window={getMMHVAULTLanguage:()=>language,addEventListener(){}};
const location={protocol:'https:',hostname:'mmhvault.com'};
const fetch=()=>{networkRequests++;throw Error('Network was unexpectedly invoked');};
new Function('window','document','location','fetch',source)(window,document,location,fetch);
const n=id=>nodes.get(id);
assert.equal(n('mmhA740Submit').disabled,true);
assert.equal(n('mmhA740Username').disabled,true);
assert.equal(n('mmhA740Password').disabled,true);
assert.match(n('mmhA740Status').textContent,/secure integration/);
buttons[1].dispatch('click');
assert.equal(n('usernameSignIn').classList.contains('active'),true);
assert.equal(n('signin').classList.contains('active'),false);
assert.equal(n('mmhA740Password').disabled,true);
n('usernameSignIn').dispatch('submit');
assert.equal(networkRequests,0);
language='zh';langButton.dispatch('click');
assert.equal(buttons[1].textContent,'用户名');
assert.match(n('mmhA740Status').textContent,/安全集成/);
buttons[0].dispatch('click');
assert.equal(n('signin').classList.contains('active'),true);
assert.equal(n('usernameSignIn').classList.contains('active'),false);
assert.equal(networkRequests,0);
console.log('PASS: 13 locked-UI smoke assertions; no network, no credentials, no backend.');
