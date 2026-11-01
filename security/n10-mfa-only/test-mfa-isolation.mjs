// MFA-only isolated source contracts: no network, production auth or Vault calls.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const src=readFileSync('js/mmhvault-n10-a7-83-security-center.js','utf8');
const between=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'Missing section '+a);return src.slice(i,j)};
const ordered=(s,parts)=>{let old=-1;for(const p of parts){let i=s.indexOf(p,old+1);assert.ok(i>old,'Missing/out of order: '+p);old=i}};
const tests=[
 ['no unreleased Vault integration',()=>{
  assert.doesNotMatch(src,/N10_FIXED_VAULT_UI_RELEASED|VAULT_API|vaultApi\(|mmhN10VaultRecoveryControls|mmhN10VaultPassword|loadVaultMode\(/);
  assert.match(src,/const N10A790_TOTP_ENROLLMENT_RELEASED=true;/);
 }],
 ['original recovery remains unchanged',()=>{
  assert.match(src,/clearTimer=setTimeout\(hideKey,60000\)/);
  assert.doesNotMatch(src,/clearTimer=setTimeout\(hideKey,45000\)/);
  assert.match(src,/function hideKey\(\)\{verifiedPhrase='';/);
 }],
 ['totp inventory detects unverified, verified and unknown in all',()=>{
  const code=src.match(/function inspectTotpFactors\(data\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(code,'missing helper');
  const inspect=runInNewContext('('+code+')');
  const factors=[{id:'a',factor_type:'totp',status:'unverified'},
                 {id:'b',factor_type:'totp',status:'verified'},
                 {id:'c',factor_type:'totp',status:'other'},
                 {id:'d',factor_type:'phone',status:'verified'}];
  const result=inspect({all:factors,totp:[factors[1]]});
  assert.equal(result.pending[0].id,'a');assert.equal(result.verified[0].id,'b');
  assert.equal(result.unknown[0].id,'c');assert.equal(result.allTotp.length,3);
  assert.throws(()=>inspect({totp:[]}),/factor_inventory_unavailable/);
 }],
 ['pending owner and epoch cleared synchronously',()=>{
  assert.match(src,/pendingFactorOwner='',pendingSecret=''/);
  assert.match(src,/function clearMfa\(\)\{mfaEpoch\+=1;pendingSecret='';pendingFactor='';pendingFactorOwner='';/);
  assert.match(src,/pendingFactor=data\.id;pendingFactorOwner=user\.id;/);
 }],
 ['stale epochs, owners or hidden modals are refused',()=>{
  const code=src.match(/function mfaFlowActive\(epoch,userId\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(code);
  const env={owner:'A',mfaEpoch:2,document:{hidden:false},$:()=>({closest:()=>({hidden:false})})};
  const fn=runInNewContext('('+code+')',env);
  assert.equal(fn(2,'A'),true);assert.equal(fn(1,'A'),false);
  assert.equal(fn(2,'B'),false);env.document.hidden=true;assert.equal(fn(2,'A'),false);
  env.document.hidden=false;env.$=()=>({closest:()=>({hidden:true})});
  assert.equal(fn(2,'A'),false);
 }],
 ['enrollment rechecks cleaned factors and same owner',()=>{
  const s=between("$('mmhA783TotpStart').addEventListener('click',async()=>{","$('mmhA783TotpConfirm').addEventListener('click',async()=>{");
  ordered(s,['const epoch=mfaEpoch;','const {user}=await verifiedUser();',
   'const existing=await client().auth.mfa.listFactors();','const before=inspectTotpFactors(existing.data);',
   'for(const factor of before.pending){','client().auth.mfa.unenroll({factorId:factor.id})',
   'const checked=await client().auth.mfa.listFactors();','const afterOwner=await verifiedUser();',
   'crypto.randomUUID().slice(0,8)','client().auth.mfa.enroll({factorType:']);
  assert.match(s,/if\(before\.verified\.length\|\|before\.unknown\.length\)/);
 }],
 ['late QR response refuses account switch, only same owner orphan cleanup',()=>{
  const s=between("$('mmhA783TotpStart').addEventListener('click',async()=>{","$('mmhA783TotpConfirm').addEventListener('click',async()=>{");
  ordered(s,['if(!mfaFlowActive(epoch,user.id)){','const now=await verifiedUser();',
   'if(now.user.id===user.id)','client().auth.mfa.unenroll({factorId:data.id});',
   'return;','pendingFactor=data.id;']);
 }],
 ['success requires server AAL2 and exact verified factor',()=>{
  const s=between("$('mmhA783TotpConfirm').addEventListener('click',async()=>{","$('mmhA783KeyReveal').addEventListener('click',()=>{");
  ordered(s,['const epoch=mfaEpoch,userId=owner;','const id=pendingFactor;',
   'client().auth.mfa.challenge({factorId:id})','client().auth.mfa.verify({factorId:id',
   'getAuthenticatorAssuranceLevel()',"assurance.data?.currentLevel!=='aal2'",
   'client().auth.mfa.listFactors()','inspectTotpFactors(checked.data).verified.some(x=>x.id===id)',
   "status('Authenticator enabled. Verified by Auth (AAL2)."]);
  assert.match(s,/if\(!mfaFlowActive\(epoch,userId\)\)return;/);
 }],
 ['cancel only removes same owner unverified factor',()=>{
  const s=between('async function cancelPendingMfa(){','function displayTotpQr(');
  ordered(s,['const targetFactor=pendingFactor,targetOwner=pendingFactorOwner;','clearMfa();',
   'const before=await verifiedUser();','const found=await client().auth.mfa.listFactors();',
   'inspectTotpFactors(found.data).pending.some(f=>f.id===targetFactor)',
   'const current=await verifiedUser();','client().auth.mfa.unenroll({factorId:targetFactor})']);
 }],
 ['verified factor removal is owner/target/AAL2 scoped',()=>{
  const s=between("$('mmhA783TotpRemoveNow').addEventListener('click',async()=>{","document.addEventListener('visibilitychange'");
  ordered(s,['const epoch=mfaEpoch,userId=owner,targetFactor=factorId;',
   'const before=await verifiedUser();','getAuthenticatorAssuranceLevel()',
   "aal.data?.currentLevel!=='aal2'",'const factors=await client().auth.mfa.listFactors();',
   'inspectTotpFactors(factors.data).verified.some(f=>f.id===targetFactor)',
   'const current=await verifiedUser();','client().auth.mfa.unenroll({factorId:targetFactor})',
   "status('Authenticator removed.')"]);
 }],
 ['background and modal close invalidate pending enrollment without ID',()=>{
  assert.match(src,/document\.addEventListener\('visibilitychange',\(\)=>\{if\(document\.hidden\)\{hideKey\(\);if\(pendingFactor\)void cancelPendingMfa\(\);else clearMfa\(\);/);
  const s=between('function collapse(section){','sections.forEach(section=>{');
  assert.match(s,/if\(info\?\.overlay\.querySelector\('#mmhA783TotpSetup'\)\)\{/);
  assert.match(s,/if\(pendingFactor\)void cancelPendingMfa\(\);else clearMfa\(\);/);
 }],
 ['logout and owner change clean sensitive data synchronously',()=>{
  const s=between('client().auth.onAuthStateChange((event,session)=>{','setTimeout(refresh,400)');
  ordered(s,["if(event==='SIGNED_OUT'||(event==='SIGNED_IN'&&owner&&session?.user?.id!==owner))",
   'hideKey();clearMfa();resetSensitiveState();sections.forEach(collapse);',
   "owner='';",'setTimeout(()=>{']);
 }]
];
let failed=0;for(const [name,test] of tests){try{test();console.log('PASS',name)}catch(err){failed++;console.error('FAIL',name,err.message)}}
console.log((tests.length-failed)+'/'+tests.length+' MFA-only static and synthetic checks');
if(failed)process.exitCode=1;
