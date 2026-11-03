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
  let reads=0,writes=0,owner=OWNER,configOwner=OWNER,downloaded=false;
  const wnd={
    addEventListener:()=>{},dispatchEvent:()=>{},
  };
  function chain(table){
    const q={table,op:'read',filters:{}};
    const builder={
      select(){return builder},
      eq(key,value){q.filters[key]=value;return builder},
      update(row){q.op='update';q.row=row;return builder},
      insert(row){q.op='insert';q.row=row;return Promise.resolve({error:new Error('Unexpected insert')})},
      async maybeSingle(){
        if(table!=='personal_configuration')throw new Error('Unexpected table: '+table);
        if(q.filters.user_id!==OWNER)throw new Error('Nonowner read/write blocked');
        if(q.op==='read'){reads++;return {data:copy(shared.row),error:null}}
        writes++;
        if(q.filters.updated_at!==shared.row.updated_at)
          return {data:null,error:null};
        shared.row=copy(q.row);return {data:{updated_at:shared.row.updated_at},error:null};
      }
    };
    return builder;
  }
  const sandbox={
    window:wnd,localStorage:storage,
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
    get downloaded(){return downloaded},
    ownerChange(person){sandbox.currentSessionUser={id:person}},
    configOwnerChange(person){sandbox.MMHVAULT_CONFIG_OWNER=person}
  };
}
const old='2026-11-03T13:00:00.000Z',newer='2026-11-03T13:01:00.000Z';
test('device B cannot overwrite device A link just because its local clock is newer',async()=>{
  const remote=configWith({'row-A':rowLink()}),stale=configWith({});
  const cloud={row:mkRow(remote,old)};
  const b=device(cloud,stale,newer);
  assert.equal(await b.sync(),false);
  assert.equal(b.writes,0);assert.equal(b.downloaded,false);
  assert.deepEqual(Object.keys(cloud.row.config.txHierarchyV11.links),['row-A']);
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
test('equal timestamps with unequal links fail closed rather than returning fake success',async()=>{
  const local=configWith({}),remote=configWith({'row-A':rowLink()});
  const cloud={row:mkRow(remote,old)},a=device(cloud,local,old);
  assert.equal(await a.sync(),false);
  assert.equal(a.writes,0);assert.equal(a.downloaded,false);
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
