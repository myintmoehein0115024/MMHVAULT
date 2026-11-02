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
