// Personal public-market display adapter. No network, credentials, account or ledger access.
export const SNAPSHOT_INTERVAL_MS=7200000;
const decimal=(value,positive=false)=>{
  if(typeof value!=='number'&&!(typeof value==='string'&&/^-?\d+(?:\.\d+)?$/.test(value)))return null;
  const n=Number(value);
  return Number.isFinite(n)&&(!positive||n>0)?n:null;
};
const instant=(value,now)=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value))&&Date.parse(value)<=now+300000?new Date(value).toISOString():null;
export function normalizeCurrencySnapshot(payload,now=Date.now()){
  const data=payload?.data;
  const asOf=instant(data?.as_of,now);
  if(payload?.result!==1||!asOf||!Array.isArray(data.currencies)||data.currencies.length>300)return null;
  const quotes=Object.create(null),duplicates=new Set();
  for(const item of data.currencies){
    const s=item?.series,q=item?.quote;
    const code=typeof s?.code==='string'?s.code.toUpperCase():'';
    if(!/^[A-Z]{3}$/.test(code)||code==='MMK'||s.kind!=='currency'||s.unit!=='unit'||s.quote_type!=='two_way'||s.quote_currency!=='MMK'||typeof item.stale!=='boolean')continue;
    if(Object.hasOwn(quotes,code)||duplicates.has(code)){delete quotes[code];duplicates.add(code);continue}
    const buy=decimal(q?.buy,true),sell=decimal(q?.sell,true),recordedAt=instant(q?.recorded_at,now);
    if(buy===null||sell===null||sell<buy||!recordedAt||Date.parse(recordedAt)>Date.parse(asOf))continue;
    quotes[code]={buy,sell,buyChange:decimal(q.buy_change),sellChange:decimal(q.sell_change),recordedAt,stale:item.stale};
  }
  if(!Object.keys(quotes).length)return null;
  return {version:1,base:'MMK',asOf,fetchedAt:new Date(now).toISOString(),quotes};
}
// Only direct source quotes. Other bases must not present inferred rates as direct prices.
export function directCurrencyQuote(snapshot,base,code,now=Date.now()){
  if(snapshot?.version!==1||snapshot.base!=='MMK'||base!=='MMK'||!/^[A-Z]{3}$/.test(code)||!Object.hasOwn(snapshot.quotes||{},code))return null;
  const q=snapshot.quotes[code];
  const fetched=Date.parse(snapshot.fetchedAt);
  if(!Number.isFinite(fetched)||fetched>now+300000)return null;
  return {...q,stale:q.stale||now-fetched>=SNAPSHOT_INTERVAL_MS};
}
