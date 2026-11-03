// MMHVAULT N10 — pure session-claim parser for a PREVIOUSLY AUTH-VERIFIED JWT.
// Never use this to authenticate a JWT. The caller MUST first await
// supabase.auth.getUser(exactToken) and reject errors/mismatched users.
// Signature validation happens in Supabase Auth, not in this helper.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sessionIdFromVerifiedJwt(token,userId,base){
 if(typeof token!=='string'||token.length>8192||
    typeof userId!=='string'||typeof base!=='string')return null;
 const segments=token.split('.');
 if(segments.length!==3||!segments[1]||segments[1].length>8192)return null;
 try{
  const b64=segments[1].replace(/-/g,'+').replace(/_/g,'/');
  const bin=atob(b64+'='.repeat((4-b64.length%4)%4));
  const payload=JSON.parse(new TextDecoder().decode(
   Uint8Array.from(bin,ch=>ch.charCodeAt(0))));
  const sessionId=payload?.session_id;
  if(payload?.sub!==userId||
     payload?.iss!==base.replace(/\/$/,'')+'/auth/v1'||
     !Number.isSafeInteger(payload?.exp)||
     payload.exp<=Math.floor(Date.now()/1000)||
     typeof sessionId!=='string'||!UUID.test(sessionId))return null;
  return sessionId.toLowerCase();
 }catch(_){return null}
}
