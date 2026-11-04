/* APP V11.7: read-only cloud confirmation of post-insert Manage linkage.
 * Pure adapter: no auth, database or ledger mutations. Both the signed-in
 * owner and the config owner must remain unchanged before/after each await.
 */
import {storedLinkMatches} from './mmhvault-v11-manage-hierarchy-model.mjs';
export async function verifyStoredCloudLink({target,currentOwner,configOwner,syncNow,readConfig}={}){
  if(!target||typeof target.owner!=='string'||!target.owner||
    typeof currentOwner!=='function'||typeof configOwner!=='function'||
    typeof syncNow!=='function'||typeof readConfig!=='function')return false;
  const sameOwner=()=>currentOwner()===target.owner&&configOwner()===target.owner;
  if(!sameOwner())return false;
  try{
    // Successful local persistence/queue acceptance is NOT cloud proof.
    if(await syncNow()!==true||!sameOwner())return false;
    const remoteConfig=await readConfig(target.owner);
    if(!sameOwner())return false;
    return storedLinkMatches(remoteConfig?.txHierarchyV11,target.owner,
      target.recordId,target.ids,target.canonical);
  }catch(_){
    // Network error, an unsafe payload, cancelled session, etc. fail closed.
    return false;
  }
}
