import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../js/mmhvault-account-reference-fx-v1.js',import.meta.url),'utf8');
const dataFixture=(now,amd=390)=>({
  result:'success',base_code:'USD',
  time_last_update_unix:Math.floor(now/1000)-120,
  time_next_update_unix:Math.floor(now/1000)+86400,
  rates:{USD:1,AMD:amd,JPY:151}
});
function setup({manualFx=null,initialFails=0,currency='AMD'}={}) {
  let clock=Date.now(),calls=0,scheduled=new Map(),timerId=0;
  const listeners=new Map(),store=new Map(),fetches=[],events=[];
  const DateTest=class extends Date {static now(){return clock}};
  const window={
    addEventListener:(name,fn)=>listeners.set(name,fn),
    dispatchEvent:evt=>events.push(evt.type),
    render:()=>{},
    mmhAccountsRefreshV1:()=>{}
  };
  const account={name:'Armenia Cash',currency,active:true,fxPerUSD:manualFx};
  const context={
    window,MMHVAULT_CONFIG:{accounts:[account]},
    mmhVaultAccountFxRateV140:value=>{
      if(value===null||value===undefined||value==='')return null;
      const n=Number(value);return Number.isFinite(n)&&n>0?n:null;
    },
    document:{readyState:'loading',hidden:false,addEventListener(){}},
    navigator:{onLine:true},
    localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)},
    fetch:async url=>{
      assert.equal(url,'https://open.er-api.com/v6/latest/USD');
      calls++;fetches.push(url);
      if(calls<=initialFails)throw Error('transient network issue');
      return {ok:true,json:async()=>dataFixture(clock)};
    },
    setTimeout:fn=>{const id=++timerId;scheduled.set(id,fn);return id},
    clearTimeout:id=>scheduled.delete(id),AbortController,
    CustomEvent:class{constructor(type){this.type=type}},
    Date:DateTest,Number,Math,JSON,Promise,console:{warn(){}}
  };
  vm.runInNewContext(source,context);
  const runTimers=async()=>{
    const callbacks=[...scheduled.values()];
    scheduled.clear();
    for(const fn of callbacks)fn();
    await new Promise(setImmediate);
  };
  return {
    service:window.MMHAccountReferenceFXV1,account,listeners,
    calls:()=>calls,events,advance:ms=>clock+=ms,runTimers,
    trigger:async name=>{assert.ok(listeners.has(name),name);listeners.get(name)();await runTimers()}
  };
}

test('after a new AMD transaction, the account FX service loads an actual USD/AMD quote',async()=>{
  const h=setup();
  assert.equal(h.service.getRate('AMD'),null);
  await h.trigger('mmhvault:data-change');
  assert.equal(h.calls(),1);
  assert.equal(h.service.getRate('AMD'),390);
  assert.ok(h.events.includes('mmhvault:account-reference-fx-updated'));
});

test('cloud sync completion also revisits the account currency rate',async()=>{
  const h=setup();
  await h.trigger('mmhvault:sync-complete');
  assert.equal(h.calls(),1);
  assert.equal(h.service.getRate('AMD'),390);
});

test('transient failures retry after 60 seconds but never hammer the FX provider',async()=>{
  const h=setup({initialFails:1});
  await h.trigger('mmhvault:data-change');
  assert.equal(h.calls(),1);
  assert.equal(h.service.getRate('AMD'),null);
  h.advance(30000);
  await h.trigger('mmhvault:data-change');
  assert.equal(h.calls(),1);
  h.advance(32000);
  await h.trigger('mmhvault:data-change');
  assert.equal(h.calls(),2);
  assert.equal(h.service.getRate('AMD'),390);
});

test('a successful quote does not cause repeated fetch on every transaction change',async()=>{
  const h=setup();
  await h.trigger('mmhvault:data-change');
  h.advance(30000);
  await h.trigger('mmhvault:data-change');
  assert.equal(h.calls(),1);
});

test('manual rates override the public quote without extra network traffic',async()=>{
  const h=setup({manualFx:400});
  await h.trigger('mmhvault:data-change');
  assert.equal(h.calls(),0);
});

test('built-in THB account never triggers unneeded public custom-currency fetch',async()=>{
  const h=setup({currency:'THB'});
  await h.trigger('mmhvault:sync-complete');
  assert.equal(h.calls(),0);
});

test('the service never edits balance, transaction or accounting tables',()=>{
  assert.doesNotMatch(source,/\.from\(['"]transactions['"]\)/);
  assert.doesNotMatch(source,/\b(?:DELETE\s+FROM|UPDATE\s+public\.transactions)\b/i);
  assert.match(source,/Saved financial\/accounting rates and explicit account overrides take priority/);
  assert.match(source,/window\.addEventListener\('mmhvault:data-change', schedule\)/);
});
