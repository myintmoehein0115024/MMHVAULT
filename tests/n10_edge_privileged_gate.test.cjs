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

test('Push parses real-shaped Bearer headers only AFTER separate Auth verification', async t => {
  const {parseVerifiedBearerClaims,evaluatePushMfa} =
    await import(locate(base + 'mmh-push-test/mfa-push.mjs'));
  const id='11111111-1111-4111-8111-111111111111';
  const encode = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const payload={sub:id,iss:'https://stage.supabase.co/auth/v1',
    exp:Math.floor(Date.now()/1000)+3600,aal:'aal2'};
  const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode(payload)+'.fake-signature';
  // The isolated parser does not verify a signature; the production caller
  // MUST complete Supabase Auth getUser() verification before invoking it.
  const valid=parseVerifiedBearerClaims('Bearer '+token);
  await t.test('valid signed-token shape parses',()=>assert.deepEqual(valid,payload));
  await t.test('parsed AAL2 enrolled passes decision',()=>assert.equal(
    evaluatePushMfa(true,id,valid),'allowed'));
  const rejects=[
    '',
    'Bearer',
    'Bearer no-dots',
    'Bearer '+token+' trailing',
    'Basic '+token,
    'Bearer '+encode({})+'.%%%.x',
    'Bearer '+token+'.extra',
    'Bearer '+('X'.repeat(9000)),
  ];
  for(const value of rejects){
    await t.test('reject invalid header '+value.slice(0,25),()=>{
      assert.equal(parseVerifiedBearerClaims(value),null);
    });
  }
  await t.test('spacing allowed for a conventional bearer',()=>{
    assert.deepEqual(parseVerifiedBearerClaims('Bearer\t'+token),payload);
  });
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
