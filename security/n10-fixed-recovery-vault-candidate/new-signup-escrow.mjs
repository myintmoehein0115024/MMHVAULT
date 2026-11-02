/** N10 signup escrow contract — REVIEW ONLY / NOT DEPLOYED.
 * Actual signup handler must call before issuing a session. The caller MUST
 * delete a newly-created Auth user on any failure and test Vault GC.
 * These callbacks are privileged server-side operations, never browser inputs.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TEN_WORDS=/^([a-z]{2,13} ){9}[a-z]{2,13}$/;
export function recoveryEscrowState({hasVerifier,hasEncryptedBackup}){
 if(typeof hasVerifier!=='boolean'||typeof hasEncryptedBackup!=='boolean')return 'unavailable';
 if(!hasVerifier)return 'not_issued';
 return hasEncryptedBackup?'view_after_password_and_mfa':'original_not_recoverable';
}
export async function escrowNewSignup({userId,username,phrase,writeVerifier,putEncryptedBackup,linkUsername}){
 if(!UUID.test(userId||'')||typeof username!=='string'||!/^[a-z][a-z0-9_]{3,19}$/.test(username)||
   typeof phrase!=='string'||!TEN_WORDS.test(phrase)||
   ![writeVerifier,putEncryptedBackup,linkUsername].every(fn=>typeof fn==='function'))
   throw Error('invalid_signup_contract');
 if(await writeVerifier(userId,phrase)!==true)throw Error('verifier_unavailable');
 if(await putEncryptedBackup(userId,phrase)!==true)throw Error('backup_unavailable');
 if(await linkUsername(username,userId)!==true)throw Error('link_unavailable');
 return Object.freeze({ready:true}); // Never echo phrase or password.
}
// Proof booleans MUST be attested by the backend, never trusted from JSON.
export function canRevealFixedWords({isUsernameOnly,sameOwner,liveSession,mfaSatisfied,passwordProved,hasEncryptedBackup}){
 if([isUsernameOnly,sameOwner,liveSession,mfaSatisfied,passwordProved,hasEncryptedBackup].some(v=>typeof v!=='boolean'))return 'unavailable';
 if(!sameOwner||!liveSession)return 'sign_in_required';
 if(!isUsernameOnly)return 'username_account_required';
 if(!mfaSatisfied)return 'mfa_required';
 if(!passwordProved)return 'password_required';
 if(!hasEncryptedBackup)return 'original_not_recoverable';
 return 'allowed';
}
