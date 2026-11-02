import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../js/mmhvault-account-photo-cloud-v11.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../app.html',import.meta.url),'utf8');
const sql=fs.readFileSync(new URL('../docs/sql/app-v11-account-images-PRIVATE-REVIEW-ONLY.sql',import.meta.url),'utf8');
const user1='11111111-1111-4111-8111-111111111111',user2='22222222-2222-4222-8222-222222222222';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';
const png2='data:image/png;base64,'+'a'.repeat(200);
function harness({owner=user1,cloud=[],accountId='acc_amd',offline=false,storage=new Map()}={}){
  const dbRows=cloud.map(v=>({...v}));
  let unavailable=offline, writes=0, reads=0,refreshes=0;
  const account={id:accountId,name:'Armenia Cash',currency:'AMD'};
  const config={accounts:[account]};
  const db={
    auth:{getUser:async()=>({data:{user:{id:owner}}})},
    from(name){
      assert.equal(name,'mmh_account_images_v11');
      return {
        upsert:async(row,opts)=>{
          writes++;
          if(unavailable)return{error:{code:'PGRST205'}};
          const index=dbRows.findIndex(x=>x.user_id===row.user_id&&x.account_id===row.account_id);
          if(index>=0&&!opts?.ignoreDuplicates)dbRows[index]={...row};
          else if(index<0)dbRows.push({...row});
          return{error:null};
        },
        select(){
          return {
            eq(column,value){
              assert.equal(column,'user_id');
              return {
                async limit(size){
                  assert.equal(size,500);reads++;
                  if(unavailable)return{error:{code:'PGRST205'}};
                  return{data:dbRows.filter(r=>r.user_id===value),error:null};
                }
              }
            }
          }
        }
      }
    }
  };
  const doc={hidden:false,readyState:'loading',addEventListener(){},getElementById:()=>null};
  const window={
    mmhAccountsRefreshV1:()=>{refreshes++},
    addEventListener(){},
    dispatchEvent(){},
  };
  const localStorage={
    getItem:key=>storage.get(key)||null,
    setItem:(key,value)=>storage.set(key,value)
  };
  const events=[];
  vm.runInNewContext(source,{window,document:doc,db,localStorage,
    MMHVAULT_CONFIG:config,currentSessionUser:{id:owner},Date,Number,String,JSON,Promise,
    console:{warn:()=>{}},CustomEvent:class{constructor(type,opts){events.push(type);this.type=type;this.detail=opts?.detail}},setTimeout:()=>0,clearTimeout:()=>{}});
  return {
    api:window.MMHAccountImageCloudV11,storage,dbRows,account,
    writes:()=>writes,reads:()=>reads,refreshes:()=>refreshes,events,
    network:on=>{unavailable=!on},
    setLocal:(id,image,old={})=>storage.set('mmhvault_account_visuals_v1_'+owner,JSON.stringify({[id]:{...old,image}})),
    local:()=>JSON.parse(storage.get('mmhvault_account_visuals_v1_'+owner)||'{}')
  };
}
test('account photo is saved under immutable owner + account ID',async()=>{
  const h=harness();h.setLocal('acc_amd',png,{color:'#aabbcc'});
  assert.equal(await h.api.save(user1,'acc_amd',png),true);
  assert.equal(h.dbRows.length,1);
  assert.equal(h.dbRows[0].user_id,user1);
  assert.equal(h.dbRows[0].account_id,'acc_amd');
  assert.equal(h.dbRows[0].image_data,png);
  assert.equal(h.local().acc_amd.color,'#aabbcc');
});
test('a new browser restores photo from the cloud without losing per-device metadata',async()=>{
  const existing=[{user_id:user1,account_id:'acc_amd',image_data:png}];
  const h=harness({cloud:existing});
  h.setLocal('acc_amd','',{note:'Only on this device',hidden:true});
  assert.equal(await h.api.hydrate(user1),true);
  assert.equal(h.local().acc_amd.image,png);
  assert.equal(h.local().acc_amd.note,'Only on this device');
  assert.equal(h.local().acc_amd.hidden,true);
  assert.equal(h.refreshes(),1);
});
test('account image removal creates a cloud tombstone and cannot reappear after refresh',async()=>{
  const h=harness({cloud:[{user_id:user1,account_id:'acc_amd',image_data:png}]});
  h.setLocal('acc_amd','');
  assert.equal(await h.api.save(user1,'acc_amd',''),true);
  assert.equal(h.dbRows[0].image_data,'');
  h.setLocal('acc_amd',png); // stale local image on second device
  await h.api.hydrate(user1);
  assert.equal(h.local().acc_amd.image,'');
});
test('unsynced photos remain local during outage and retry on next successful load',async()=>{
  const h=harness({offline:true});h.setLocal('acc_amd',png);
  assert.equal(await h.api.save(user1,'acc_amd',png),false);
  assert.equal(h.local().acc_amd.image,png);
  assert.ok(h.storage.get('mmhvault_account_photo_pending_v11_'+user1)?.includes('acc_amd'));
  h.network(true);assert.equal(await h.api.hydrate(user1),true);
  assert.equal(h.dbRows[0].image_data,png);
  assert.equal(h.storage.get('mmhvault_account_photo_pending_v11_'+user1),'{}');
});
test('old local-only photos migrate only into missing remote rows',async()=>{
  const h=harness();h.setLocal('acc_amd',png);
  await h.api.hydrate(user1);
  assert.equal(h.dbRows[0].image_data,png);
  assert.equal(h.writes(),1);
});
test('remote updated photo wins over stale non-pending local image',async()=>{
  const h=harness({cloud:[{user_id:user1,account_id:'acc_amd',image_data:png2}]});
  h.setLocal('acc_amd',png);
  await h.api.hydrate(user1);
  assert.equal(h.local().acc_amd.image,png2);
  assert.equal(h.writes(),0);
});
test('attempted wrong-owner and unknown-account writes are stopped before RPC',async()=>{
  const h=harness();
  assert.equal(await h.api.save(user2,'acc_amd',png),false);
  assert.equal(await h.api.save(user1,'not-owned',png),false);
  assert.equal(await h.api.hydrate(user2),false);
  assert.equal(h.writes(),0);
  assert.equal(h.reads(),0);
});
test('rejects SVG, remote URLs, oversized photos and injected account ids',async()=>{
  const h=harness();
  for(const image of ['https://example.com/photo.png','data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,'+'a'.repeat(160001)]){
    assert.equal(h.api.validImage(image),false);
    assert.equal(await h.api.save(user1,'acc_amd',image),false);
  }
  assert.equal(await h.api.save(user1,'a<script>',png),false);
  assert.equal(h.writes(),0);
});
test('RLS proposal isolates user and protects both insert/update',()=>{
  const code=sql.replace(/--[^\n]*/g,'');
  assert.match(code,/CREATE TABLE IF NOT EXISTS public\.mmh_account_images_v11/);
  assert.match(code,/REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
  assert.match(code,/ALTER TABLE public\.mmh_account_images_v11 ENABLE ROW LEVEL SECURITY/);
  assert.match(code,/REVOKE ALL ON TABLE public\.mmh_account_images_v11 FROM anon/);
  assert.match(code,/REVOKE ALL ON TABLE public\.mmh_account_images_v11 FROM authenticated/);
  assert.match(code,/GRANT SELECT, INSERT, UPDATE ON TABLE public\.mmh_account_images_v11 TO authenticated/);
  assert.match(code,/FOR SELECT TO authenticated\s+USING \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(code,/FOR INSERT TO authenticated\s+WITH CHECK \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(code,/FOR UPDATE TO authenticated\s+USING \(\(select auth\.uid\(\)\) = user_id\)\s+WITH CHECK \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(code,/image_data = '' OR/);
  assert.match(code,/octet_length\(image_data\) <= 160000/);
  assert.doesNotMatch(code,/\b(?:ALTER TABLE public\.transactions|UPDATE public\.personal_configuration|DELETE FROM public\.transactions)\b/i);
});
test('all Accounts save paths call the private cloud image service',()=>{
  assert.match(html,/src="js\/mmhvault-account-photo-cloud-v11\.js\?v=1\.0\.0"/);
  assert.match(html,/MMHAccountImageCloudV11\?\.save\?\.\(sessionOwner,String\(a\.id\)/);
  assert.match(html,/MMHAccountImageCloudV11\?\.save\?\.\(sessionOwner,String\(created\.id\)/);
  assert.match(html,/previousImage!==String\(v\.image\|\|''\)/);
  assert.doesNotMatch(source,/\.from\(['"]transactions['"]\)/);
  assert.doesNotMatch(source,/\bmmhVaultPersistConfig\(/);
});
