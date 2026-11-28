import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('security/n10-vault-qa-staging-site/app.js','utf8');
function extractFunction(name){
 const start=source.indexOf('function '+name+'(');
 assert(start>=0,'missing '+name);
 const brace=source.indexOf('{',start);
 let depth=0,end=-1;
 for(let i=brace;i<source.length;i++){
  if(source[i]==='{')depth++;
  if(source[i]==='}'&&--depth===0){end=i+1;break;}
 }
 assert(end>brace,'unbalanced '+name);
 return source.slice(start,end);
}
let monotonic=1000, rendered=0, discarded=[];
const ctx={
 windowConfirmed:false,windowDeadlineMonotonic:0,windowExpired:false,
 performance:{now:()=>monotonic},
 renderWindowClock:()=>{rendered++},
 discardWindow:(expired)=>{discarded.push(expired);ctx.windowConfirmed=false;ctx.windowDeadlineMonotonic=0;ctx.windowExpired=expired},
 Date,Number,Error,Math
};
vm.createContext(ctx);
for(const name of ['armWindow','windowRemainingMs','requireWindow']){
 vm.runInContext(extractFunction(name),ctx);
}
const now='2026-11-03T09:05:00.000Z';
const plus=m=>new Date(Date.parse(now)+m).toISOString();
ctx.armWindow(plus(9*60000),now);
assert.equal(ctx.windowConfirmed,true);
assert.equal(ctx.windowExpired,false);
assert.equal(ctx.windowRemainingMs(),9*60000-5000);
assert(rendered>0);
ctx.requireWindow(120);
monotonic+=7*60000;
assert(ctx.windowRemainingMs()<120000);
assert.throws(()=>ctx.requireWindow(120),/qa_window_insufficient/);
assert.doesNotThrow(()=>ctx.requireWindow(30));
monotonic=1000;
assert.throws(()=>ctx.armWindow(plus(11*60000),now),/qa_window_invalid_metadata/);
assert.equal(ctx.windowConfirmed,false);
assert.equal(discarded.at(-1),false);
assert.throws(()=>ctx.requireWindow(1),/qa_window_insufficient/);
assert.throws(()=>ctx.armWindow(plus(3000),now),/qa_window_invalid_metadata/);
assert.equal(discarded.at(-1),true);
assert.throws(()=>ctx.armWindow('invalid',now),/qa_window_invalid_metadata/);
assert.equal(discarded.at(-1),false);
assert.equal(ctx.windowConfirmed,false);
assert.equal(ctx.windowRemainingMs(),0);
ctx.armWindow(plus(3*60000),now);
monotonic+=3*60000;
assert.equal(ctx.windowRemainingMs(),0);
assert.throws(()=>ctx.requireWindow(0),/qa_window_insufficient/);
assert.equal(source.includes("setInterval(renderWindowClock,750)"),true);
assert(source.includes("discardWindow(false);\n const value=await callVault('status');"));
assert(source.includes("armWindow(value.window_expires_at,value.server_utc_now)"));
assert(source.includes("if(action==='qa_initialize')requireWindow(120);"));
assert(source.includes("else if(action==='backup_existing')requireWindow(45);"));
assert(source.includes("else if(action==='reveal')requireWindow(30);"));
assert(source.includes("if(windowConfirmed&&remaining<=0)"));
assert(source.includes("hidePhrase();clearInputs();"));
assert(source.includes("windowDeadlineMonotonic=performance.now()+delta-5000;"));
console.log('PASS: 14 staged clock/invalid expiry/early stop/secret-clearing invariants');
