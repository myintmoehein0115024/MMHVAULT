const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

const moduleURL = pathToFileURL(resolve(__dirname, '../security/n10-edge-candidates/mmh-financial-assistant/mfa-assurance.mjs')).href;

test('conditional MFA gate uses fail-closed decisions', async (t) => {
  const { evaluateMfaAssurance } = await import(moduleURL);
  const scenarios = [
    ['enrolled MFA with AAL1', {currentLevel:'aal1',nextLevel:'aal2'}, 'required'],
    ['verified MFA with AAL2', {currentLevel:'aal2',nextLevel:'aal2'}, 'allowed'],
    ['no MFA enrolled AAL1', {currentLevel:'aal1',nextLevel:'aal1'}, 'allowed'],
    ['legacy null current AAL, verified MFA', {currentLevel:null,nextLevel:'aal2'}, 'required'],
    ['legacy null current AAL, no MFA', {currentLevel:null,nextLevel:'aal1'}, 'allowed'],
    ['factor removed, old AAL2 session', {currentLevel:'aal2',nextLevel:'aal1'}, 'allowed'],
    ['missing nextLevel', {currentLevel:'aal1'}, 'unavailable'],
    ['inconsistent null nextLevel', {currentLevel:'aal1',nextLevel:null}, 'unavailable'],
    ['legacy null current and null next is ambiguous', {currentLevel:null,nextLevel:null}, 'unavailable'],
    ['missing currentLevel', {nextLevel:'aal1'}, 'unavailable'],
    ['unknown currentLevel', {currentLevel:'aal3',nextLevel:'aal2'}, 'unavailable'],
    ['unknown nextLevel', {currentLevel:'aal1',nextLevel:'aal3'}, 'unavailable'],
    ['invalid assurance object', null, 'unavailable'],
    ['empty assurance object', {}, 'unavailable'],
    ['false assurance object', false, 'unavailable'],
    ['factor reported, AAL1/next AAL2', {currentLevel:'aal1',nextLevel:'aal2'}, 'required',true],
    ['factor reported, AAL2/next AAL2', {currentLevel:'aal2',nextLevel:'aal2'}, 'allowed',true],
    ['factor reported, SDK incorrectly reports AAL1/AAL1', {currentLevel:'aal1',nextLevel:'aal1'}, 'unavailable',true],
    ['factor reported, legacy null/null', {currentLevel:null,nextLevel:null}, 'unavailable',true],
    ['factor reported, legacy null/AAL2', {currentLevel:null,nextLevel:'aal2'}, 'required',true],
    ['factor reported, incomplete nextLevel', {currentLevel:'aal2'}, 'unavailable',true],
  ];
  for (const [name, input, expected, hasVerifiedFactor = false] of scenarios) {
    await t.test(name, () => {
      assert.equal(evaluateMfaAssurance(input, hasVerifiedFactor), expected);
    });
  }
});

test('Auth-verified token + verified factors drive stateless Edge MFA, not SDK nextLevel', async t => {
  const { evaluateVerifiedAuthUserMfa } = await import(moduleURL);
  const uid='11111111-1111-4111-8111-111111111111';
  const other='22222222-2222-4222-8222-222222222222';
  const base='https://stage.supabase.co';
  const jwt=(aal,extra={})=>{
    const b=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
    return b({typ:'JWT',alg:'HS256'})+'.'+b({
      sub:uid,iss:base+'/auth/v1',exp:Math.floor(Date.now()/1000)+3600,
      aal,...extra
    })+'.unverified-unit-test-signature';
  };
  const user=(verified=true,extra={})=>({
    id:uid,is_anonymous:false,
    factors:verified?[{status:'verified',factor_type:'totp'}]:[],
    ...extra
  });
  const cases=[
    ['enrolled AAL1 rejected','aal1',user(),base,'required'],
    ['enrolled AAL2 allowed','aal2',user(),base,'allowed'],
    ['unenrolled AAL1 allowed','aal1',user(false),base,'allowed'],
    ['unenrolled AAL2 legacy allowed','aal2',user(false),base,'allowed'],
    ['enrolled legacy AAL absent challenged',null,user(),base,'required'],
    ['unknown AAL rejected','aal3',user(),base,'unavailable'],
    ['factor array missing rejected','aal2',user(true,{factors:undefined}),base,'unavailable'],
    ['factor array null rejected','aal2',user(true,{factors:null}),base,'unavailable'],
    ['mismatched Auth UID rejected','aal2',user(true,{id:other}),base,'unavailable'],
    ['anonymous Auth user rejected','aal2',user(true,{is_anonymous:true}),base,'unavailable'],
    ['issuer mismatch rejected','aal2',user(),base+'-other','unavailable'],
    ['expired JWT rejected','aal2',user(),base,'unavailable', {exp:Math.floor(Date.now()/1000)-1}],
    ['JWT missing subject rejected','aal2',user(),base,'unavailable',{sub:null}],
    ['JWT text invalid',null,user(),base,'unavailable',null,'broken'],
    ['JWT claims invalid JSON',null,user(),base,'unavailable',null,'a.not-json.sig'],
  ];
  for(const [label,aal,u,url,expected,extra={},forced] of cases){
    await t.test(label,()=>assert.equal(
      evaluateVerifiedAuthUserMfa(forced??jwt(aal,extra??{}),u,url),expected
    ));
  }
  // This helper is only valid after the calling Edge route verifies the exact
  // bearer with /auth/v1/user or admin.auth.getUser(jwt).
});
