import test from 'node:test';
import assert from 'node:assert/strict';
import {STEPS,cleanOwner,keyFor,initialState,normalizeState,next,advanceTo,pause,stop,finish,
  markSaved,isAutoEligible,isStepSatisfied,canShowAccountCoach,atStep} from '../js/mmhvault-transaction-onboarding-state-v1.mjs';
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
test('eight steps exactly, no hidden finance-writing step',()=>{
  assert.deepEqual(STEPS,['welcome','manage','type','transaction','category','fields','first','complete']);
});
test('owners have different local progress keys, invalid owners fail closed',()=>{
  assert.notEqual(keyFor(A),keyFor(B));
  assert.equal(cleanOwner(''), '');
  assert.equal(cleanOwner('a/b'), '');
  assert.throws(()=>keyFor(''));
});
test('state resumes after pause without wiping progress',()=>{
  const p=pause(advanceTo(initialState(),4));
  assert.equal(p.step,4);assert.equal(p.status,'paused');
  assert.deepEqual(normalizeState(JSON.parse(JSON.stringify(p))),p);
  assert.equal(atStep(p),'category');
  assert.equal(next(p).step,5);
});
test('invalid progress and status are rejected rather than trusted',()=>{
  assert.equal(normalizeState({version:1,step:99,status:'completed'}),null);
  assert.equal(normalizeState({version:1,step:0,status:'unsafe'}),null);
  assert.equal(normalizeState({version:2,step:0,status:'active'}),null);
  assert.equal(normalizeState([]),null);
});
test('new empty owner eligible; existing owner with history/accounts/settings excluded',()=>{
  const fresh={historyLoaded:true,hasHistory:false,hasAccounts:false,hasConfigured:false,hasLegacy:false};
  assert.equal(isAutoEligible(fresh),true);
  assert.equal(isAutoEligible({...fresh,historyLoaded:false}),false);
  for(const key of ['hasHistory','hasAccounts','hasConfigured','hasLegacy'])
    assert.equal(isAutoEligible({...fresh,[key]:true}),false,key);
  assert.equal(isAutoEligible({...fresh,saved:stop(initialState())}),false);
  assert.equal(isAutoEligible({...fresh,saved:finish(initialState())}),false);
  assert.equal(isAutoEligible({...fresh,hasAccounts:true,saved:pause(advanceTo(initialState(),3))}),true);
});
test('skipping or completing never claims a real saved transaction',()=>{
  assert.equal(finish(initialState()).hasSavedTransaction,false);
  assert.equal(stop(initialState()).hasSavedTransaction,false);
  assert.equal(markSaved(initialState()).hasSavedTransaction,true);
});
test('required finance hierarchy cannot be treated as optional by tutorial state',()=>{
  assert.equal(isStepSatisfied('type',{hasType:true}),true);
  assert.equal(isStepSatisfied('transaction',{hasTransaction:false}),false);
  assert.equal(isStepSatisfied('category',{hasCategory:true}),true);
  assert.equal(isStepSatisfied('first',{hasAccount:true,hasType:true,hasTransaction:true,hasCategory:false,hasRealSave:true}),false);
  assert.equal(isStepSatisfied('first',{hasAccount:true,hasType:true,hasTransaction:true,hasCategory:true,hasRealSave:false}),false);
});
test('account coaching follows actual prerequisites',()=>{
  assert.equal(canShowAccountCoach({hasAccount:false,hasPath:true}),'account');
  assert.equal(canShowAccountCoach({hasAccount:true,hasPath:false}),'manage');
  assert.equal(canShowAccountCoach({hasAccount:true,hasPath:true}),'transaction');
});
