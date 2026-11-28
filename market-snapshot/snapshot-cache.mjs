// Provider-neutral market cache. No network endpoint or deployed resources.
// store.transaction(fn) MUST atomically serialize across all instances.
import {normalizeCurrencySnapshot,SNAPSHOT_INTERVAL_MS} from './currency-snapshot.mjs';
export async function refreshMarketSnapshot({store,fetchMarket,now=Date.now()}){
 if(!Number.isSafeInteger(now)||now<0)throw new TypeError('invalid clock');
 const slot=Math.floor(now/SNAPSHOT_INTERVAL_MS);
 const claimed=await store.transaction(async tx=>{
  const last=await tx.get('lastAttempt');
  if(Number.isSafeInteger(last)&&last>=slot)return false;
  await tx.put('lastAttempt',slot);return true;
 });
 if(!claimed)return {status:'already-attempted'};
 let snapshot;
 try{snapshot=normalizeCurrencySnapshot(await fetchMarket(),now)}catch{return {status:'upstream-unavailable'}}
 if(!snapshot)return {status:'invalid-snapshot'};
 return store.transaction(async tx=>{
  if(await tx.get('lastAttempt')!==slot)return {status:'superseded'};
  const old=await tx.get('snapshot');
  if(old&&Date.parse(old.asOf)>Date.parse(snapshot.asOf))return {status:'older-snapshot'};
  await tx.put('snapshot',snapshot);return {status:'updated'};
 });
}
export async function readMarketSnapshot({store,now=Date.now()}){
 const s=await store.transaction(tx=>tx.get('snapshot'));
 if(!s||s.version!==1||s.base!=='MMK'||!Number.isFinite(Date.parse(s.fetchedAt))||Date.parse(s.fetchedAt)>now+300000)return null;
 return {version:s.version,base:s.base,asOf:s.asOf,fetchedAt:s.fetchedAt,stale:now-Date.parse(s.fetchedAt)>=SNAPSHOT_INTERVAL_MS,quotes:s.quotes};
}
