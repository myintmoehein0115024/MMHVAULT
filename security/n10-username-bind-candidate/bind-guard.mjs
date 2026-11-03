// N10 binding review: pure, network-free fail-closed final authorization guard.
// The endpoint supplies functions that recheck the original bearer against Auth
// and re-evaluate MFA with the exact JWT after password/CAPTCHA awaits.
// This does not prove live session revocation and is not a substitute for an
// approved signed session-ID check where stricter revocation is required.
export async function recheckBindSecurity({expectedUser,verifyUser,verifyAssurance}){
  if(!expectedUser||typeof expectedUser.id!=='string'||
     typeof expectedUser.email!=='string'||
     typeof verifyUser!=='function'||typeof verifyAssurance!=='function')
    return 'verification_unavailable';
  try{
    const freshUser=await verifyUser();
    if(!freshUser||freshUser.id!==expectedUser.id||
       freshUser.email!==expectedUser.email||
       freshUser.is_anonymous===true||
       !freshUser.email_confirmed_at)
      return 'session_expired';
    return await verifyAssurance()===true
      ?'allowed':'additional_verification_required';
  }catch(_){
    return 'verification_unavailable';
  }
}

/**
 * Decode ONLY AFTER admin.auth.getUser(exactJWT) validates the bearer.
 * Factors must come from admin.mfa.listFactors, never client metadata.
 * Decoding is not independent signature verification.
 */
export function verifiedJwtMfaDecision(jwt,user,base){
 if(typeof jwt!=='string'||jwt.length>8192||
    typeof user?.id!=='string'||user.is_anonymous===true||
    !Array.isArray(user.factors)||typeof base!=='string')return 'unavailable';
 const parts=jwt.split('.');
 if(parts.length!==3||!parts[1]||parts[1].length>8192)return 'unavailable';
 try{
  const b64=parts[1].replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(b64+'='.repeat((4-b64.length%4)%4));
  const p=JSON.parse(new TextDecoder().decode(Uint8Array.from(raw,x=>x.charCodeAt(0))));
  if(!p||typeof p!=='object'||p.sub!==user.id||
     p.iss!==base.replace(/\/$/,'')+'/auth/v1'||
     !Number.isSafeInteger(p.exp)||p.exp<=Math.floor(Date.now()/1000))
   return 'unavailable';
  if(p.aal!=='aal1'&&p.aal!=='aal2')return 'unavailable';
  const mfa=user.factors.some(f=>f?.status==='verified');
  if(mfa)return p.aal==='aal2'?'allowed':'required';
  return p.aal==='aal1'?'allowed':'unavailable';
 }catch(_){return 'unavailable';}
}
