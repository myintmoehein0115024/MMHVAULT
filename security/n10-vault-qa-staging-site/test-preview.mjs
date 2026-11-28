// Offline UI preview acceptance for the dedicated N10 QA Pages project.
// This is synthetic presentation-only code; does not call Auth, Edge or Vault.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext, Script} from 'node:vm';
const html=readFileSync('security/n10-vault-qa-staging-site/preview/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'inline preview JavaScript missing');
new Script(script,{filename:'preview-inline.js'});
const i=script.indexOf('const langData='),j=script.indexOf('const $=id=>',i);
assert.ok(i>=0&&j>i,'missing i18n dictionary');
const ctx={};runInNewContext(script.slice(i,j)+'this.dict=langData;',ctx);
const dict=ctx.dict;
const localeKeys=['en','zh','my'];
const visibleKeys=[...new Set([...html.matchAll(/data-t="([A-Za-z0-9]+)"/g)].map(m=>m[1]))];
const sample=['alpha','bravo','charlie','delta','echo','foxtrot','golf','hotel','india','juliet'];
test('isolated preview is not indexed and cannot contact auth or network',()=>{
 assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
 assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(html,/<script[^>]+src=/);
 assert.doesNotMatch(html,/<form\b|<input\b/i);
 assert.doesNotMatch(script,/\bfetch\s*\(|XMLHttpRequest|WebSocket|indexedDB|localStorage|sessionStorage/);
 assert.doesNotMatch(html,/SUPABASE_SERVICE_ROLE_KEY|access_token|refresh_token|password\s*type\s*=/i);
});
test('every displayed string is localized in all three languages',()=>{
 for(const lang of localeKeys){
  for(const key of visibleKeys)assert.equal(typeof dict[lang][key],'string',lang+': '+key);
  assert.ok(dict[lang].noticeTitle);
  assert.ok(dict[lang].noPassword);
 }
 assert.ok(visibleKeys.length>=25);
});
test('modal and sample key remain explicitly marked as demonstration',()=>{
 for(const lang of localeKeys){
  assert.ok(dict[lang].fakeData.length>0);
  assert.ok(dict[lang].demoStatus.length>0);
 }
 assert.ok(script.includes(sample.map(w=>"'"+w+"'").join(',')),'public fake words only');
 assert.match(script,/closeTime=Date\.now\(\)\+45000/);
 assert.match(script,/document\.addEventListener\('visibilitychange'/);
 assert.match(script,/window\.addEventListener\('pagehide'/);
});
function fakeEl(id=''){
 const el={id,textContent:'',hidden:false,style:{},events:{},dataset:{},attrs:{},children:[],classList:{toggle(){}},
   addEventListener(name,fn){this.events[name]=fn},
   setAttribute(name,value){this.attrs[name]=value},
   focus(){documentRef.activeElement=this},
   getClientRects(){return [{}]},
   append(...args){this.children.push(...args)},
   replaceChildren(){this.children=[]}
 };
 return el;
}
let documentRef;
function harness(){
 const ids={};for(const id of ['modal','words','countdown','close','openDialog','reveal','hide','revealed','preReveal']) ids[id]=fakeEl(id);
 ids.modal.hidden=true;ids.revealed.hidden=true;
 const languageButtons=localeKeys.map(lang=>{const el=fakeEl('button-'+lang);el.dataset.lang=lang;return el});
 const textNodes=visibleKeys.map(key=>{const el=fakeEl('text-'+key);el.dataset.t=key;return el});
 let dateMs=1_000_000;const intervals={};let next=0;
 documentRef={
  documentElement:{lang:''},body:{style:{}},activeElement:fakeEl('initial'),
  events:{},hidden:false,
  getElementById:id=>ids[id],
  querySelectorAll(selector){
   if(selector==='[data-t]')return textNodes;
   if(selector==='[data-lang]')return languageButtons;
   throw Error('Unexpected CSS query '+selector);
  },
  addEventListener(name,fn){this.events[name]=fn},
  createElement:tag=>fakeEl(tag),
  createTextNode:content=>({textContent:content}),
 };
 const win={events:{},addEventListener(name,fn){this.events[name]=fn}};
 const context={document:documentRef,window:win,Date:{now:()=>dateMs},setInterval:fn=>{intervals[++next]=fn;return next},clearInterval:id=>{delete intervals[id]}};
 runInNewContext(script,context);
 return {ids,languageButtons,textNodes,win,documentRef,click:id=>ids[id].events.click(),language:code=>languageButtons.find(x=>x.dataset.lang===code).events.click(),
  el:key=>textNodes.find(x=>x.dataset.t===key),advance:ms=>{dateMs+=ms;Object.values(intervals).forEach(fn=>fn())}};
}
test('language switch updates the actual DOM without reloading',()=>{
 const h=harness();
 assert.equal(h.documentRef.documentElement.lang,'zh-CN');
 assert.equal(h.el('pageTitle').textContent,dict.zh.pageTitle);
 h.language('my');
 assert.equal(h.documentRef.documentElement.lang,'my');
 assert.equal(h.el('pageTitle').textContent,dict.my.pageTitle);
 h.language('en');
 assert.equal(h.el('pageTitle').textContent,dict.en.pageTitle);
});
test('reveal and 45-second countdown hide sample words and focus safely',()=>{
 const h=harness();
 h.click('openDialog');
 assert.equal(h.ids.modal.hidden,false);
 h.click('reveal');
 assert.equal(h.ids.words.children.length,10);
 assert.equal(h.ids.revealed.hidden,false);
 assert.equal(h.ids.preReveal.hidden,true);
 h.advance(45001);
 assert.equal(h.ids.words.children.length,0);
 assert.equal(h.ids.revealed.hidden,true);
 h.click('close');
 assert.equal(h.ids.modal.hidden,true);
});
test('tab visibility and navigation clear the example words',()=>{
 const h=harness();h.click('openDialog');h.click('reveal');
 h.documentRef.hidden=true;h.documentRef.events.visibilitychange();
 assert.equal(h.ids.words.children.length,0);
 h.documentRef.hidden=false;h.click('reveal');
 h.win.events.pagehide();
 assert.equal(h.ids.words.children.length,0);
});
console.log('N10 isolated visual preview smoke suite PASS; no backend or real credentials.');
