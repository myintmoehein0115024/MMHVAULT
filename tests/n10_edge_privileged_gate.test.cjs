const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

const locate = relative => pathToFileURL(resolve(__dirname, '..', relative)).href;
const base = 'security/n10-edge-candidates/';

test('Push privileged access refuses AAL1, mismatched and expired JWTs', async t => {
  const {evaluatePushMfa} = await import(locate(base + 'mmh-push-test/mfa-push.mjs'));
  const uid = '11111111-1111-4111-8111-111111111111';
  const another = '22222222-2222-4222-8222-222222222222';
  const claims = (aal='aal1', extra={}) => ({
    sub: uid, iss:'https://stage.supabase.co/auth/v1',
    exp: Math.floor(Date.now()/1000) + 3600, aal, ...extra
  });
  const tests = [
    ['enrolled AAL1',true,uid,claims('aal1'),'required'],
    ['enrolled AAL2',true,uid,claims('aal2'),'allowed'],
    ['unenrolled AAL1',false,uid,claims('aal1'),'allowed'],
    ['unenrolled AAL2',false,uid,claims('aal2'),'allowed'],
    ['enrolled legacy AAL missing',true,uid,claims(undefined,{aal:undefined}),'required'],
    ['verified-factor query failed',null,uid,claims('aal2'),'unavailable'],
    ['verified-factor query omitted',undefined,uid,claims('aal2'),'unavailable'],
    ['wrong user AAL2',true,uid,claims('aal2',{sub:another}),'unavailable'],
    ['wrong user even unenrolled',false,uid,claims('aal1',{sub:another}),'unavailable'],
    ['unknown Auth identity',true,'',claims('aal2'),'unavailable'],
    ['missing JWT claims',true,uid,null,'unavailable'],
    ['missing JWT issuer',true,uid,claims('aal2',{iss:null}),'unavailable'],
    ['missing JWT expiry',true,uid,claims('aal2',{exp:undefined}),'unavailable'],
    ['malformed JWT expiry',true,uid,claims('aal2',{exp:'9999999999'}),'unavailable'],
    ['expired signed bearer',true,uid,claims('aal2',{exp:Math.floor(Date.now()/1000)-5}),'unavailable'],
    ['unknown factor status',0,uid,claims('aal2'),'unavailable'],
  ];
  for (const [label,factor,verifiedId,jwt,expected] of tests) {
    await t.test(label, () => assert.equal(
      evaluatePushMfa(factor,verifiedId,jwt), expected
    ));
  }
});

test('Financial and recovery-phrase MFA decisions remain identical', async t => {
  const ai = await import(locate(base + 'mmh-financial-assistant/mfa-assurance.mjs'));
  const phrase = await import(locate(base + 'mmh-n10a783-phrase-verify/mfa-assurance.mjs'));
  const cases = [
    {currentLevel:'aal1',nextLevel:'aal1'},
    {currentLevel:'aal1',nextLevel:'aal2'},
    {currentLevel:'aal2',nextLevel:'aal2'},
    {currentLevel:'aal2',nextLevel:'aal1'},
    {currentLevel:null,nextLevel:'aal2'},
    {currentLevel:null,nextLevel:'aal1'},
    {currentLevel:null,nextLevel:null},
    {currentLevel:'aal1'},
    null,{},false,
  ];
  for (const factors of [true,false]) for (const data of cases) {
    await t.test(JSON.stringify({factors,data}), () =>
      assert.equal(phrase.evaluateMfaAssurance(data,factors),
        ai.evaluateMfaAssurance(data,factors)));
  }
});
