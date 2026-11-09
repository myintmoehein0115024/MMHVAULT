/* APP V11.7: exercise the actual app.html sync IIFE against two synthetic
 * device contexts. This never contacts real Supabase or changes ledger data.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const OWNER='synthetic-account-owner';
const html=fs.readFileSync(new URL('../app.html',import.meta.url),'utf8');
const script=html.match(/<script id="mmhvault-config-cloud-sync-v122">([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Production-style cloud sync script must be discoverable');
const copy=x=>JSON.parse(JSON.stringify(x));
const rowLink=(id='row-A')=>({choiceIds:{type:'type-A',transaction:'txn-A',category:'category-A'},
  canonical:{type:'Income',group:'Income',category:'Salary'}});
const hierarchy=(links={})=>({version:1,ownerId:OWNER,
  types:[{id:'type-A',label:'Income',ledgerType:'Income',archived:false}],
  transactions:[{id:'txn-A',label:'Salary payment',parentId:'type-A',kindId:'Income|Income',archived:false}],
  categories:[{id:'category-A',label:'Salary',parentId:'txn-A',ledgerGroup:'Income',archived:false}],
  links:copy(links)});
const baseConfig=()=>({accounts:[{id:'acc-usd',name:'USD cash',currency:'USD',fxPerUSD:1,type:'cash',active:true}],
  categories:{Income:['Salary'],Expense:[],Personal:[],LoanIncome:[],LoanExpense:[],Transfer:['Transfer']},
  archivedCategories:{},txFieldsV12:{version:1,type:[],transaction:[],category:[]},
  txHierarchyV11:hierarchy()});
const configWith=links=>({...baseConfig(),txHierarchyV11:hierarchy(links)});
const mkRow=(config,date)=>({user_id:OWNER,config:copy(config),updated_at:date,
  language:'en',timezone:'UTC'});
function device(shared,localConfig,localDate){
  const local=new Map([['config_'+OWNER,JSON.stringify({...copy(localConfig),ownerId:OWNER,updatedAt:localDate})]]);
  const storage={getItem:key=>local.get(key)||null,setItem:(key,v)=>local.set(key,String(v))};
  let reads=0,writes=0,owner=OWNER,configOwner=OWNER,downloaded=false,transactionReads=0;
  const events=[];
  const wnd={
    addEventListener:()=>{},dispatchEvent:e=>events.push(e.type),
  };
  function chain(table){
    const q={table,op:'read',filters:{}};
    const builder={
      select(){return builder},
      eq(key,value){q.filters[key]=value;return builder},
      in(key,values){
        if(table!=='transactions'||key!=='id'||q.filters.user_id!==OWNER)
          throw Error('Unexpected ledger lookup');
        transactionReads++;
        const found=(shared.rows||[]).filter(row=>values.includes(String(row.id)));
        return Promise.resolve({data:copy(found),error:null});
      },
      update(row){q.op='update';q.row=row;return builder},
      insert(row){q.op='insert';q.row=row;return Promise.resolve({error:new Error('Unexpected insert')})},
      async maybeSingle(){
        if(table!=='personal_configuration')throw new Error('Unexpected table: '+table);
        if(q.filters.user_id!==OWNER)throw new Error('Nonowner read/write blocked');
        if(q.op==='read'){reads++;return {data:copy(shared.row),error:null}}
        writes++;
        if(shared.casFail===true)return {data:null,error:null};
        if(q.filters.updated_at!==shared.row.updated_at)
          return {data:null,error:null};
        shared.row=copy(q.row);return {data:{updated_at:shared.row.updated_at},error:null};
      }
    };
    return builder;
  }
  const sandbox={
    window:wnd,localStorage:storage,
    document:{readyState:'loading',addEventListener:()=>{}},
    currentSessionUser:{id:OWNER},MMHVAULT_CONFIG_OWNER:OWNER,
    MMHVAULT_CONFIG:copy(localConfig),
    MMHVAULT_DEFAULT_CATEGORIES:{Income:['Salary'],Expense:[],Personal:[],LoanIncome:[],LoanExpense:[],Transfer:['Transfer']},
    mmhVaultConfigKey:person=>'config_'+person,
    mmhVaultNormalizeAccountCurrencyV140:x=>x,
    mmhVaultAccountFxRateV140:x=>x,
    mmhVaultNormalizeCategoryConfigV1231:x=>x,
    mmhVaultNormalizeTxFieldsV12:x=>x,
    mmhVaultNormalizeTxHierarchyV11:x=>x,
    mmhVaultRebuildConfigArrays:()=>{},
    mmhVaultReadConfig:person=>{
      downloaded=true;
      const raw=JSON.parse(local.get('config_'+person)||'{}');
      return {...raw};
    },
    mmhVaultRestoreReferencedBuiltinAccountsV1:()=>{},
    mmhVaultCloseDialogV449:()=>{},
    mmhVaultRenderManager:()=>{},
    mmhVaultRefreshAccountSelectors:()=>{},
    mmhVaultRefreshTransactionConfigV445:()=>{},
    mmhVaultRefreshDashboardAccountOverviewV449:()=>{},
    db:{from:chain},setTimeout:()=>7,clearTimeout:()=>{},
    queueMicrotask:()=>{},console:{warn:()=>{}},
    CustomEvent:class {constructor(type,options){this.type=type;this.detail=options?.detail}},
  };
  vm.runInNewContext(script,sandbox,{timeout:2000,filename:'app.html-cloud-sync'});
  return {
    sync:()=>wnd.MMHConfigCloudSyncV122.syncNow(false),
    force:()=>wnd.MMHConfigCloudSyncV122.syncNow(true),
    cloud:()=>shared.row,local:()=>JSON.parse(local.get('config_'+OWNER)),
    get reads(){return reads},get writes(){return writes},
    get downloaded(){return downloaded},get transactionReads(){return transactionReads},
    get events(){return events},get diagnostic(){return wnd.MMHConfigCloudSyncV122.lastReconcileStatus},
    ownerChange(person){sandbox.currentSessionUser={id:person}},
    configOwnerChange(person){sandbox.MMHVAULT_CONFIG_OWNER=person},
    editLive(edit){edit(sandbox.MMHVAULT_CONFIG)}
  };
}
const old='2026-11-03T13:00:00.000Z',newer='2026-11-03T13:01:00.000Z';
test('newer local clock cannot erase remote links: readonly superset fast-forward',async()=>{
  const remote=configWith({'row-A':rowLink()}),stale=configWith({});
  const cloud={row:mkRow(remote,old)};
  const b=device(cloud,stale,newer);
  assert.equal(await b.sync(),true);
  assert.equal(b.writes,0);assert.equal(b.downloaded,true);
  assert.equal(b.diagnostic,'remote-only-fast-forward');
  assert.deepEqual(Object.keys(cloud.row.config.txHierarchyV11.links),['row-A']);
  assert.deepEqual(Object.keys(b.local().txHierarchyV11.links),['row-A']);
});
test('device A cannot silently download a newer cloud config that drops its own confirmed link',async()=>{
  const local=configWith({'row-A':rowLink()}),remote=configWith({});
  const cloud={row:mkRow(remote,newer)};
  const a=device(cloud,local,old);
  assert.equal(await a.sync(),false);
  assert.equal(a.writes,0);assert.equal(a.downloaded,false);
  assert.deepEqual(Object.keys(a.local().txHierarchyV11.links),['row-A']);
});
test('two devices adding different links cannot erase each other in either time order',async()=>{
  for(const reverse of [false,true]){
    const a=configWith({'row-A':rowLink()});
    const b=configWith({'row-B':rowLink('row-B')});
    const cloud={row:mkRow(b,reverse?old:newer)};
    const deviceA=device(cloud,a,reverse?newer:old);
    assert.equal(await deviceA.sync(),false);
    assert.equal(await deviceA.force(),false);
    assert.equal(deviceA.writes,0);assert.equal(deviceA.downloaded,false);
    assert.deepEqual(Object.keys(cloud.row.config.txHierarchyV11.links),['row-B']);
  }
});
test('different link identities for the SAME saved ledger ID always block overwrite',async()=>{
  const local=configWith({'row-A':rowLink()});
  const tampered=rowLink();tampered.choiceIds.transaction='different';
  const remote=configWith({'row-A':tampered});
  const cloud={row:mkRow(remote,old)},a=device(cloud,local,newer);
  assert.equal(await a.sync(),false);assert.equal(a.writes,0);
});
test('a strict superset with newer cloud timestamp may be downloaded safely',async()=>{
  const remote=configWith({'row-A':rowLink(),'row-B':rowLink('row-B')});
  const local=configWith({'row-A':rowLink()});
  const cloud={row:mkRow(remote,newer)},a=device(cloud,local,old);
  assert.equal(await a.sync(),true);
  assert.equal(a.writes,0);assert.equal(a.downloaded,true);
  assert.equal(Object.keys(a.local().txHierarchyV11.links).length,2);
});
test('a strict superset with newer local timestamp may be uploaded without dropping old cloud links',async()=>{
  const remote=configWith({'row-A':rowLink()});
  const local=configWith({'row-A':rowLink(),'row-B':rowLink('row-B')});
  const cloud={row:mkRow(remote,old)},a=device(cloud,local,newer);
  assert.equal(await a.sync(),true);
  assert.equal(a.writes,1);
  assert.equal(Object.keys(cloud.row.config.txHierarchyV11.links).length,2);
});
test('equal timestamps with remote-only links safely fast-forward the real cloud snapshot',async()=>{
  const local=configWith({}),remote=configWith({'row-A':rowLink()});
  const cloud={row:mkRow(remote,old)},a=device(cloud,local,old);
  assert.equal(await a.sync(),true);
  assert.equal(a.writes,0);assert.equal(a.downloaded,true);
  assert.deepEqual(Object.keys(a.local().txHierarchyV11.links),['row-A']);
});
test('malformed or foreign-owner hierarchy cannot enter cloud config sync',async()=>{
  for(const broken of [
    {...hierarchy({'row-A':rowLink()}),ownerId:'foreign-owner'},
    {...hierarchy({'row-A':rowLink()}),links:[]},
    {...hierarchy({'row-A':rowLink()}),version:999}
  ]){
    const local={...baseConfig(),txHierarchyV11:broken};
    const cloud={row:mkRow(configWith({}),old)},a=device(cloud,local,newer);
    assert.equal(await a.sync(),false);assert.equal(a.writes,0);
  }
});
test('a signed-out owner cannot read or write an existing synthetic cloud config',async()=>{
  const config=configWith({'row-A':rowLink()});
  const cloud={row:mkRow(config,old)},a=device(cloud,config,newer);
  a.ownerChange('different-user');
  assert.equal(await a.sync(),false);assert.equal(a.reads,0);assert.equal(a.writes,0);
  a.ownerChange(OWNER);a.configOwnerChange('different-user');
  assert.equal(await a.sync(),false);assert.equal(a.reads,0);assert.equal(a.writes,0);
});

const ledgerRow=(id,type='Income',category='Salary',owner=OWNER)=>({id,user_id:owner,type,category});
test('Chrome incognito and Safari may safely reconcile independent CONFIRMED ledger links',async()=>{
  const cloud={row:mkRow(configWith({'row-B':rowLink('row-B')}),newer),
    rows:[ledgerRow('row-A'),ledgerRow('row-B')]};
  const incognito=device(cloud,configWith({'row-A':rowLink()}),old);
  assert.equal(await incognito.sync(),true);
  assert.equal(incognito.writes,1);
  assert.equal(incognito.transactionReads,1);
  assert.equal(incognito.downloaded,true);
  assert.deepEqual(Object.keys(cloud.row.config.txHierarchyV11.links).sort(),['row-A','row-B']);
  assert.deepEqual(Object.keys(incognito.local().txHierarchyV11.links).sort(),['row-A','row-B']);
  assert.ok(incognito.events.includes('mmhvault:config-cloud-synced'));
});
test('reverse timestamp and equal timestamp still safely reconcile verified disjoint links',async()=>{
  for(const [localDate,cloudDate] of [[newer,old],[old,old]]){
    const cloud={row:mkRow(configWith({'row-B':rowLink('row-B')}),cloudDate),
      rows:[ledgerRow('row-A'),ledgerRow('row-B')]};
    const browser=device(cloud,configWith({'row-A':rowLink()}),localDate);
    assert.equal(await browser.sync(),true);
    assert.equal(browser.writes,1);
    assert.deepEqual(Object.keys(cloud.row.config.txHierarchyV11.links).sort(),['row-A','row-B']);
  }
});
test('unconfirmed, foreign, or mismatching ledger rows cannot authorize link merge',async()=>{
  for(const rows of [
    [ledgerRow('row-B')], // novel local row-A missing: must never be invented
    [ledgerRow('row-A'),ledgerRow('row-B','Expense','Salary')],
    [ledgerRow('row-A'),ledgerRow('row-B','Income','Other')],
    [ledgerRow('row-A'),ledgerRow('row-B','Income','Salary','another-owner')],
    [ledgerRow('row-A'),ledgerRow('row-A')]
  ]){
    const cloud={row:mkRow(configWith({'row-B':rowLink('row-B')}),newer),rows};
    const browser=device(cloud,configWith({'row-A':rowLink()}),old);
    assert.equal(await browser.sync(),false);
    assert.equal(browser.writes,0);
    assert.deepEqual(Object.keys(cloud.row.config.txHierarchyV11.links),['row-B']);
  }
});
test('same ledger ID bound to a different path remains blocked even with valid ledger rows',async()=>{
  const diverged=rowLink();diverged.choiceIds.category='another-choice';
  const cloud={row:mkRow(configWith({'row-A':diverged,'row-B':rowLink()}),newer),
    rows:[ledgerRow('row-A'),ledgerRow('row-B')]};
  const browser=device(cloud,configWith({'row-A':rowLink()}),old);
  assert.equal(await browser.sync(),false);
  assert.equal(browser.writes,0);
});
test('different account or Manage schema is never overwritten by sidecar reconciliation',async()=>{
  const remote=configWith({'row-B':rowLink()});
  remote.accounts.push({id:'another',name:'Other Wallet',currency:'USD',fxPerUSD:1,type:'cash',active:true});
  const cloud={row:mkRow(remote,newer),rows:[ledgerRow('row-A'),ledgerRow('row-B')]};
  const browser=device(cloud,configWith({'row-A':rowLink()}),old);
  assert.equal(await browser.sync(),false);
  assert.equal(browser.writes,0);
});
test('CAS failure from a third browser never returns false cloud success',async()=>{
  const cloud={row:mkRow(configWith({'row-B':rowLink()}),newer),
    rows:[ledgerRow('row-A'),ledgerRow('row-B')],casFail:true};
  const browser=device(cloud,configWith({'row-A':rowLink()}),old);
  assert.equal(await browser.sync(),false);
  assert.equal(browser.writes,1);
  assert.equal(browser.downloaded,false);
  assert.deepEqual(Object.keys(cloud.row.config.txHierarchyV11.links),['row-B']);
});

test('stale timestamps with one-sided missing confirmed links no longer disable Incognito saving',async()=>{
  for(const [localLinks,remoteLinks,localDate,remoteDate,expectedCloudWrites] of [
    [{},{'row-A':rowLink()},newer,old,0],
    [{'row-A':rowLink()},{},old,newer,1],
    [{},{'row-A':rowLink()},old,old,0]
  ]){
    const cloud={row:mkRow(configWith(remoteLinks),remoteDate),rows:[ledgerRow('row-A')]};
    const browser=device(cloud,configWith(localLinks),localDate);
    assert.equal(await browser.sync(),true);
    assert.equal(browser.writes,expectedCloudWrites);
    assert.deepEqual(Object.keys(cloud.row.config.txHierarchyV11.links),['row-A']);
    assert.deepEqual(Object.keys(browser.local().txHierarchyV11.links),['row-A']);
    assert.ok(browser.events.includes('mmhvault:config-cloud-synced'));
  }
});
test('remote-only legacy tombstone link fast-forwards without ledger write',async()=>{
  const cloud={row:mkRow(configWith({'row-A':rowLink()}),old),rows:[]};
  const browser=device(cloud,configWith({}),newer);
  assert.equal(await browser.sync(),true);
  assert.equal(browser.writes,0);
  assert.equal(browser.transactionReads,0);
  assert.deepEqual(Object.keys(browser.local().txHierarchyV11.links),['row-A']);
});
test('new local-only link without a ledger row remains blocked',async()=>{
  const cloud={row:mkRow(configWith({'row-B':rowLink()}),newer),rows:[ledgerRow('row-B')]};
  const browser=device(cloud,configWith({'row-A':rowLink()}),old);
  assert.equal(await browser.sync(),false);
  assert.equal(browser.writes,0);
  assert.equal(browser.diagnostic,'new-link-missing-or-ledger-mismatch');
});
test('3 legacy remote tombstones survive union, no ghost record is created',async()=>{
  // Mirrors historical owner config shape: 3 older missing ledger IDs, plus
  // a newly saved local ID. Never include real account IDs or financial data.
  const ghosts={'1001':rowLink(),'1002':rowLink(),'1003':rowLink()};
  const remote=configWith({...ghosts,'2001':rowLink()});
  remote.txHierarchyV11.categories.push(
    {id:'archived-C1',label:'Old A',parentId:'txn-A',ledgerGroup:'Income',archived:true},
    {id:'archived-C2',label:'Old B',parentId:'txn-A',ledgerGroup:'Income',archived:true});
  const local=configWith({'3001':rowLink()});
  local.txHierarchyV11.categories=copy(remote.txHierarchyV11.categories);
  const cloud={row:mkRow(remote,newer),rows:[ledgerRow('2001'),ledgerRow('3001')]};
  const browser=device(cloud,local,old);
  assert.equal(await browser.sync(),true);
  assert.equal(browser.writes,1);
  assert.equal(browser.transactionReads,1);
  assert.equal(browser.diagnostic,'verified-union-merged');
  assert.deepEqual(Object.keys(cloud.row.config.txHierarchyV11.links).sort(),
    ['1001','1002','1003','2001','3001']);
  assert.deepEqual(Object.keys(browser.local().txHierarchyV11.links).sort(),
    ['1001','1002','1003','2001','3001']);
});
test('remote tombstones never excuse a broken existing ledger row or foreign owner',async()=>{
  const remote=configWith({'1001':rowLink(),'2001':rowLink()});
  const local=configWith({'3001':rowLink()});
  for(const rows of [
    [ledgerRow('2001','Expense'),ledgerRow('3001')],
    [ledgerRow('2001'),ledgerRow('3001','Income','Salary','other-owner')]
  ]){
    const cloud={row:mkRow(remote,newer),rows};
    const browser=device(cloud,local,old);
    assert.equal(await browser.sync(),false);
    assert.equal(browser.writes,0);
  }
});

test('unpersisted live configuration edits are never silently overwritten by auto-merge',async()=>{
  const cloud={row:mkRow(configWith({'row-B':rowLink('row-B')}),newer),
    rows:[ledgerRow('row-A'),ledgerRow('row-B')]};
  const browser=device(cloud,configWith({'row-A':rowLink()}),old);
  browser.editLive(cfg=>{cfg.accounts.push({
    id:'unsaved-wallet',name:'Unsaved local wallet',currency:'USD',fxPerUSD:1,type:'other',active:true
  })});
  assert.equal(await browser.sync(),false);
  assert.equal(browser.writes,0);
  assert.deepEqual(Object.keys(cloud.row.config.txHierarchyV11.links),['row-B']);
});

test('Supabase jsonb field-key reordering does not falsely block verified Incognito sync',async()=>{
  // jsonb may return object properties in a different order than browser JSON.
  // Arrays retain their order, so we reorder objects only.
  const jsonbOrder=value=>Array.isArray(value)?value.map(jsonbOrder):
    value&&typeof value==='object'?Object.fromEntries(Object.keys(value)
      .reverse().map(key=>[key,jsonbOrder(value[key])])):value;
  const cloudConfig=jsonbOrder(configWith({'row-B':rowLink('row-B')}));
  const cloud={row:mkRow(cloudConfig,newer),rows:[ledgerRow('row-A'),ledgerRow('row-B')]};
  const browser=device(cloud,configWith({'row-A':rowLink()}),old);
  assert.equal(await browser.sync(),true);
  assert.equal(browser.writes,1);
  assert.deepEqual(Object.keys(cloud.row.config.txHierarchyV11.links).sort(),['row-A','row-B']);
});
