// Runtime regression of the actual review-only Edge handlers, without deployment,
// network access, credentials, Supabase Auth calls, or changing any QA gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const ORIGIN='https://mmhvault-n10-vault-staging.pages.dev';
const candidates=[
  {name:'E/F signup/login',file:'staging_real_ef_signup_REVIEW_ONLY.ts'},
  {name:'E/F recovery viewer',file:'staging_real_ef_viewer_REVIEW_ONLY.ts'},
];

function offlineHandler(file){
  const source=readFileSync(new URL('./'+file,import.meta.url),'utf8');
  assert.match(source,/const RELEASE_ENABLED=false;/);
  assert.match(source,/const QA_WINDOW_END_UTC='1970-01-01T00:00:00.000Z';/);
  let handler, ioCount=0;
  const forbidden=()=>{ioCount++;throw new Error('Blocked: external I/O while QA is closed');};
  const stubClient=()=>({auth:{admin:{createUser:forbidden,listFactors:forbidden},getUser:forbidden,
    signInWithPassword:forbidden},rpc:forbidden});
  const script=source.replace(/^import\s+[^\r\n]*\r?\n/gm,'');
  if(script.includes("import {"))throw new Error('Unexpected multiline import, do not eval');
  const sandbox={
    Deno:{env:{get:()=>''},serve:fn=>{handler=fn;}},
    createClient:stubClient,wordlist:['sample'],
    TextEncoder,TextDecoder,Response,Request,Headers,URLSearchParams,
    AbortSignal,Uint8Array,Uint16Array,Set,Date,crypto:webcrypto,
    fetch:forbidden
  };
  vm.runInNewContext(script,sandbox,{timeout:3000,filename:file});
  assert.equal(typeof handler,'function');
  return {handler,getIOCount:()=>ioCount};
}

for(const {name,file} of candidates){
  test(name+' — hard-OFF rejects POST before Supabase RPC/Auth and CAPTCHA network',async()=>{
    const {handler,getIOCount}=offlineHandler(file);
    const req=new Request('https://staging.invalid/functions/v1/isolated',{
      method:'POST',
      headers:{origin:ORIGIN,'content-type':'application/json'},
      body:JSON.stringify({action:'signup',username:'n10real_e_20261104',
        password:'NOT_A_REAL_PASSWORD',captcha_token:'fake-not-real'})
    });
    const response=await handler(req);
    assert.equal(response.status,503);
    assert.deepEqual(await response.json(),{code:'qa_not_released'});
    assert.equal(response.headers.get('cache-control'),'no-store, private');
    assert.equal(getIOCount(),0);
  });

  test(name+' — wrong Origin and non-POST blocked without Auth side effects',async()=>{
    const {handler,getIOCount}=offlineHandler(file);
    const remote=await handler(new Request('https://staging.invalid/',{
      method:'POST',headers:{origin:'https://mmhvault.com','content-type':'application/json'},
      body:JSON.stringify({action:'signup'})
    }));
    assert.equal(remote.status,403);
    assert.equal((await remote.json()).code,'origin_denied');
    const get=await handler(new Request('https://staging.invalid/',{
      method:'GET',headers:{origin:ORIGIN}
    }));
    assert.equal(get.status,405);
    assert.equal((await get.json()).code,'method_denied');
    assert.equal(getIOCount(),0);
  });
}
