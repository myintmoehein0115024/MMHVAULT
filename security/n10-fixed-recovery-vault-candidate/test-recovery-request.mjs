// Synthetic offline-only request validation. No real recovery key or token.
import assert from 'node:assert/strict';
import {normalizePhrase,equal64,readBoundedJson} from './recovery-request.mjs';

const URL = 'https://example.invalid/no-network';
const make=(body,headers={})=>new Request(URL,{
  method:'POST', headers, body
});
const good='alpha bravo charlie delta echo foxtrot golf hotel india juliet';
const one='a'.repeat(64);
const tests=[
 ['accept 10 normalized words',()=>{
   assert.equal(normalizePhrase('  ALPHA  BRAVO \nCHARLIE DELTA ECHO FOXTROT GOLF HOTEL INDIA JULIET  '),good);
 }],
 ['reject missing, short, long and nonlatin phrases',()=>{
   for(const v of [null,42,{},'alpha','a '.repeat(10),'alpha '.repeat(9)+'123','a'.repeat(241),good+' extra','', '第一 二 三 四 五 六 七 八 九 十']){
     assert.equal(normalizePhrase(v),null);
   }
 }],
 ['compare same 64 character checksum and reject mismatch',()=>{
   assert.equal(equal64(one,one),true);
   assert.equal(equal64(one,one.slice(0,63)+'b'),false);
   for(const v of [null,[],{},'','f'.repeat(63),'f'.repeat(65)])assert.equal(equal64(v,one),false);
 }],
 ['accept JSON object under bound without logging',async()=>{
   const d=await readBoundedJson(make(JSON.stringify({action:'status',x:'safe'})));
   assert.deepEqual(d,{action:'status',x:'safe'});
 }],
 ['accept exactly 1200 bytes',async()=>{
   const payload=JSON.stringify({x:'a'.repeat(1192)});
   assert.equal(Buffer.byteLength(payload),1200);
   assert.equal((await readBoundedJson(make(payload))).x.length,1192);
 }],
 ['reject >1200 bytes even without content-length',async()=>{
   await assert.rejects(()=>readBoundedJson(make(JSON.stringify({x:'a'.repeat(1193)}))),/oversize/);
 }],
 ['reject fraudulent and malformed content-length',async()=>{
   await assert.rejects(()=>readBoundedJson(make('{}',{'Content-Length':'1201'})),/oversize/);
   await assert.rejects(()=>readBoundedJson(make('{}',{'Content-Length':'non-numeric'})),/oversize/);
 }],
 ['reject null, array and scalar JSON bodies',async()=>{
   for(const v of ['null','[]','true','22','"abc"']){
     await assert.rejects(()=>readBoundedJson(make(v)),/invalid_json/);
   }
 }],
 ['reject malformed JSON and invalid UTF-8',async()=>{
   await assert.rejects(()=>readBoundedJson(make('{"action":')),SyntaxError);
   const invalid=Uint8Array.of(0xc3,0x28);
   await assert.rejects(()=>readBoundedJson(make(invalid)),TypeError);
 }],
 ['reject missing body and streaming over-limit chunks',async()=>{
   await assert.rejects(()=>readBoundedJson(new Request(URL,{method:'POST'})),/missing_body/);
   const stream=new ReadableStream({
     start(controller){controller.enqueue(new Uint8Array(900));controller.enqueue(new Uint8Array(302));controller.close();}
   });
   await assert.rejects(()=>readBoundedJson(new Request(URL,{method:'POST',body:stream,duplex:'half'})),/oversize/);
 }],
];
let failures=0;for(const [name,run] of tests){
 try{await run();console.log('PASS',name)}
 catch(e){failures++;console.error('FAIL',name,e?.message)}
}
console.log((tests.length-failures)+'/'+tests.length+' offline input validation tests');
if(failures)process.exitCode=1;
