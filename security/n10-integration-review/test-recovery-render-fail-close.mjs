// N10 REVIEW-ONLY synthetic DOM fault injection. No real keys or networking.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync('js/mmhvault-n10-a7-83-security-center.js','utf8');
const start=source.indexOf('function showVaultWords(words){');
const end=source.indexOf('async function refresh(){',start);
assert.ok(start>0&&end>start,'missing display renderer');
const renderer=source.slice(start,end);
const words='alpha bravo charlie delta echo foxtrot golf hotel india juliet'.split(' ');

function fixture({qrError=false,timerError=false,appendError=false,withQRCode=true}={}){
 const list={children:[],replaceChildren(){this.children=[]},append(el){
   if(appendError&&this.children.length===3)throw Error('synthetic DOM append failed');
   this.children.push(el);
 }};
 const qr={children:[],replaceChildren(){this.children=[]}};
 const note={textContent:''};
 const display={hidden:true,querySelector:()=>note};
 const controls={
  mmhA783KeyWords:list,mmhA783KeyQr:qr,
  mmhA783KeyDisplay:display,mmhA783UsernameStatus:{textContent:'@synthetic'}
 };
 const state={timers:[],hides:0};
 const ctx={
  verifiedPhrase:'',clearTimer:null,
  $:id=>controls[id],
  document:{createElement:()=>({className:'',textContent:''})},
  a783Text:x=>x,
  setTimeout:(cb,ms)=>{
   if(timerError)throw Error('synthetic missing timer');
   state.timers.push({cb,ms});return state.timers.length;
  },
 };
 ctx.hideKey=()=>{
  state.hides++;
  ctx.verifiedPhrase='';list.replaceChildren();qr.replaceChildren();display.hidden=true;
 };
 if(withQRCode){
  const QRCode=function(_node,options){
   if(qrError)throw Error('synthetic QR failure');
   state.qrText=options.text;
  };
  QRCode.CorrectLevel={L:1};ctx.QRCode=QRCode;
 }
 const render=runInNewContext('('+renderer+')',ctx);
 return {render,ctx,list,qr,display,note,state};
}
test('success registers 45-second hiding timer before revealing any words',()=>{
 const h=fixture();h.render(words);
 assert.equal(h.display.hidden,false);
 assert.equal(h.list.children.length,10);
 assert.equal(h.state.timers.length,1);
 assert.equal(h.state.timers[0].ms,45000);
 assert.equal(h.state.qrText.split('\n').length,3);
 assert.ok(h.state.qrText.startsWith('MMHVAULT-RECOVERY-V1\nUSERNAME:'));
 h.state.timers[0].cb();
 assert.equal(h.display.hidden,true);
 assert.equal(h.list.children.length,0);
 assert.equal(h.ctx.verifiedPhrase,'');
});
test('QR library failure clears all partially created sensitive fields',()=>{
 const h=fixture({qrError:true});
 assert.throws(()=>h.render(words),/recovery_render_failed/);
 assert.equal(h.display.hidden,true);
 assert.equal(h.list.children.length,0);
 assert.equal(h.qr.children.length,0);
 assert.equal(h.ctx.verifiedPhrase,'');
 assert.equal(h.state.timers.length,0);
 assert.ok(h.state.hides>=2);
});
test('a rejected timer registration must never display a phrase',()=>{
 const h=fixture({timerError:true});
 assert.throws(()=>h.render(words),/recovery_render_failed/);
 assert.equal(h.display.hidden,true);
 assert.equal(h.list.children.length,0);
 assert.equal(h.ctx.verifiedPhrase,'');
});
test('DOM write failure cleans partially inserted words',()=>{
 const h=fixture({appendError:true});
 assert.throws(()=>h.render(words),/recovery_render_failed/);
 assert.equal(h.display.hidden,true);
 assert.equal(h.list.children.length,0);
 assert.equal(h.ctx.verifiedPhrase,'');
});
test('absent QR constructor still uses timed secure disclosure',()=>{
 const h=fixture({withQRCode:false});
 h.render(words);assert.equal(h.display.hidden,false);
 assert.equal(h.state.timers.length,1);
 h.state.timers[0].cb();
 assert.equal(h.display.hidden,true);
 assert.equal(h.ctx.verifiedPhrase,'');
});
test('wrong word count never starts creating a QR or timer',()=>{
 const h=fixture();
 assert.throws(()=>h.render(words.slice(0,9)),/bad_words/);
 assert.equal(h.display.hidden,true);
 assert.equal(h.state.timers.length,0);
});
