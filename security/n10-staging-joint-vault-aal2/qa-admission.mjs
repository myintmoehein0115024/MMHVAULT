/**
 * N10 Staging signed A/B QA admission gate — REVIEW ONLY, NOT DEPLOYED.
 * This module neither provisions Auth users nor unlocks the QA Edge.
 * The caller MUST obtain every input from trusted Auth/admin/server records,
 * NOT client metadata or user-supplied request bodies.
 */
const PROJECT='ldivswlhtgmznzwhzsoi';
const EDGE='mmh-n10-qa-joint-mfa-vault-20261101';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCKED='HOLD_STAGING_QA_OFF';
function allowedFixture(f,ownerTag){
 return f !== null && typeof f === 'object' &&
   f.provisionedForRun === ownerTag &&
   f.newlyCreated === true && UUID.test(f.userId||'') &&
   f.authEmailConfirmed === true &&
   f.signedAccessTokenValidatedByAuth === true &&
   f.validLiveSession === true &&
   f.verifiedTotpFactor === true &&
   f.currentSessionAal === 'aal2' &&
   f.passwordProofCompleted === true &&
   f.isUsernameOnly !== true;
}
export function evaluateStagingQAAdmission({
 projectId, edgeSlug, verifyJwt, deployedHardOff,
 releaseDeadlineExpired, allowlistEmpty, runTag, fixtureA, fixtureB,
 vaultOwnerIsolationPass, baselineGuardPass, nowMs, windowEndMs
}={}){
 const bad=()=>Object.freeze({
   verdict:LOCKED,canOpen:false,canReveal:false,canModifyProduction:false
 });
 if(projectId!==PROJECT || edgeSlug!==EDGE || verifyJwt!==true ||
    deployedHardOff!==true || releaseDeadlineExpired!==true ||
    allowlistEmpty!==true || typeof runTag!=='string' ||
    !/^n10-staging-qa-[a-z0-9-]{10,48}$/.test(runTag) ||
    !Number.isSafeInteger(nowMs)||!Number.isSafeInteger(windowEndMs) ||
    windowEndMs<=nowMs || windowEndMs-nowMs>10*60*1000 ||
    baselineGuardPass!==true || vaultOwnerIsolationPass!==true ||
    !allowedFixture(fixtureA,runTag)||!allowedFixture(fixtureB,runTag) ||
    fixtureA.userId===fixtureB.userId ||
    fixtureA.authEmail===fixtureB.authEmail ||
    typeof fixtureA.authEmail!=='string' ||
    typeof fixtureB.authEmail!=='string' ||
    !fixtureA.authEmail.endsWith('@example.invalid') ||
    !fixtureB.authEmail.endsWith('@example.invalid'))
  return bad();
 return Object.freeze({
  verdict:'ADMISSION_PREFLIGHT_OK__STAGING_ONLY',
  canOpen:false, // admission checks alone NEVER toggle the live QA Edge.
  canReveal:false,
  canModifyProduction:false
 });
}
/**
 * No callback is allowed to delete "similar" users. Exact creation IDs and
 * an independent administrator-confirmed creation receipt are required.
 * A failed cleanup must be reported and the QA service stays hard-off.
 */
export async function closeStagingQAAndCleanup({
 disableQA, verifyClosed, revokeFixture, deleteFixture,
 fixtures = [], runTag
}={}){
 if([disableQA,verifyClosed,revokeFixture,deleteFixture].some(f=>typeof f!=='function')||
    !Array.isArray(fixtures) || fixtures.length>2 ||
    typeof runTag!=='string')throw Error('invalid_qa_cleanup_dependencies');
 const result={closed:false,cleaned:0,needsManualReconciliation:false};
 try{
  const disabled=await disableQA();
  result.closed=disabled===true && await verifyClosed()===true;
 }catch{result.closed=false}
 if(!result.closed){
  result.needsManualReconciliation=true;
  return Object.freeze(result);
 }
 for(const f of fixtures){
  // Never delete an ambiguous, historic or user-controlled account.
  if(!f || f.newlyCreated!==true || f.provisionedForRun!==runTag ||
     !UUID.test(f.userId||'') || f.creationConfirmedByAuth!==true){
   result.needsManualReconciliation=true;
   continue;
  }
  try{
   if(await revokeFixture(f.userId)!==true){
    result.needsManualReconciliation=true;continue;
   }
   if(await deleteFixture(f.userId)!==true){
    result.needsManualReconciliation=true;continue;
   }
   result.cleaned++;
  }catch{result.needsManualReconciliation=true}
 }
 return Object.freeze(result);
}
