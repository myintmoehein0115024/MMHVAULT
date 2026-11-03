import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyHierarchy,addType,addTransaction,addCategory,recordLink} from '../js/mmhvault-v11-manage-hierarchy-model.mjs';
import {verifyStoredCloudLink} from '../js/mmhvault-v11-manage-hierarchy-sync.mjs';

const A='synthetic-owner-A', B='synthetic-owner-B';
function fixture(){
  const graph=emptyHierarchy(A);
  let serial=0;const next=()=>('id-'+ ++serial);
  const t=addType(graph,A,'Income','Income',next);
  const x=addTransaction(graph,A,'Income2',t.id,'Income|Income',next);
  const c=addCategory(graph,A,'Salary',x.id,next);
  const link=recordLink(graph,A,'ledger-124',t.id,x.id,c.id);
  const target={owner:A,recordId:'ledger-124',ids:{...link.choiceIds},canonical:{...link.canonical}};
  const cloud={txHierarchyV11:graph};
  let user=A,configOwner=A,uploads=0,reads=0;
  const host={
    target,currentOwner:()=>user,configOwner:()=>configOwner,
    syncNow:async()=>{uploads++;return true},
    readConfig:async owner=>{assert.equal(owner,A);reads++;return cloud}
  };
  return {graph,link,target,cloud,host,get uploads(){return uploads},get reads(){return reads},
    switchUser:v=>{user=v},switchConfig:v=>{configOwner=v}};
}
test('confirmed server readback verifies exact immutable path without mutating finance data',async()=>{
  const f=fixture(),before=JSON.stringify(f.graph);
  assert.equal(await verifyStoredCloudLink(f.host),true);
  assert.equal(f.uploads,1);assert.equal(f.reads,1);
  assert.equal(JSON.stringify(f.graph),before);
});
test('never reads cloud when owner is absent or mismatched',async()=>{
  const f=fixture();f.switchUser(B);
  assert.equal(await verifyStoredCloudLink(f.host),false);
  assert.equal(f.uploads,0);assert.equal(f.reads,0);
  f.switchUser(A);f.switchConfig(B);
  assert.equal(await verifyStoredCloudLink(f.host),false);
  assert.equal(f.reads,0);
});
test('failed or busy config sync cannot be mistaken for cloud success',async()=>{
  const f=fixture();f.host.syncNow=async()=>false;
  assert.equal(await verifyStoredCloudLink(f.host),false);assert.equal(f.reads,0);
  f.host.syncNow=async()=>{throw new Error('offline')};
  assert.equal(await verifyStoredCloudLink(f.host),false);assert.equal(f.reads,0);
});
test('a signout during queued sync aborts before cloud read',async()=>{
  const f=fixture();
  f.host.syncNow=async()=>{f.switchUser(B);return true};
  assert.equal(await verifyStoredCloudLink(f.host),false);
  assert.equal(f.reads,0);
});
test('owner change after cloud request starts also rejects late response',async()=>{
  const f=fixture();
  f.host.readConfig=async()=>{f.switchConfig(B);return f.cloud};
  assert.equal(await verifyStoredCloudLink(f.host),false);
});
test('missing, incorrect or stale cloud sidecar always remains unverified',async()=>{
  const f=fixture(),original=f.cloud.txHierarchyV11;
  f.cloud.txHierarchyV11=null;
  assert.equal(await verifyStoredCloudLink(f.host),false);
  f.cloud.txHierarchyV11={...original,links:{}};
  assert.equal(await verifyStoredCloudLink(f.host),false);
  f.cloud.txHierarchyV11={...original,ownerId:B};
  assert.equal(await verifyStoredCloudLink(f.host),false);
  f.cloud.txHierarchyV11=original;
  f.host.target={...f.target,recordId:'other-transaction'};
  assert.equal(await verifyStoredCloudLink(f.host),false);
  f.host.target={...f.target,canonical:{...f.target.canonical,category:'Fake Salary'}};
  assert.equal(await verifyStoredCloudLink(f.host),false);
});
test('remote path must exist and keep correct Type → Transaction → Category parent references',async()=>{
  const f=fixture();
  const clone=()=>JSON.parse(JSON.stringify(f.graph));
  const orphan=clone();orphan.categories[0].parentId='wrong';
  f.cloud.txHierarchyV11=orphan;
  assert.equal(await verifyStoredCloudLink(f.host),false);
  const wrongType=clone();wrongType.transactions[0].kindId='Expense|Expense';
  f.cloud.txHierarchyV11=wrongType;
  assert.equal(await verifyStoredCloudLink(f.host),false);
  const noType=clone();noType.types=[];
  f.cloud.txHierarchyV11=noType;
  assert.equal(await verifyStoredCloudLink(f.host),false);
});
test('failed readback, malformed response or a missing adapter fails closed',async()=>{
  const f=fixture();f.host.readConfig=async()=>{throw new Error('network rejected')};
  assert.equal(await verifyStoredCloudLink(f.host),false);
  f.host.readConfig=async()=>({txHierarchyV11:{version:1,ownerId:A,links:null}});
  assert.equal(await verifyStoredCloudLink(f.host),false);
  assert.equal(await verifyStoredCloudLink({target:f.target,currentOwner:f.host.currentOwner,
    configOwner:f.host.configOwner}),false);
});
