/* Independent account movement statistics. Never part of ordinary income/expense or investment return. */
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const code=v=>String(v??'').trim().toUpperCase().replace(/^RMB$/,'CNY');
export const movementKinds=Object.freeze(['transfers','loans','adjustments']);
export function movementKind(row,groupOf,isLinkedInvestment){
 if(!row||isLinkedInvestment(row)||row.category==='Investment')return null;
 if(row.category==='Data Adjustment')return 'adjustments';
 if(row.type==='Transfer')return 'transfers';
 if(groupOf(row)==='Loans'&&['Income','Expense'].includes(row.type))return 'loans';
 return null;
}
export function summarizeMovements({rows,scope,accountRate,displayRate,groupOf,isLinkedInvestment}){
 if(!Array.isArray(rows)||!scope||!date(scope.start)||!date(scope.end)||scope.start>scope.end)throw TypeError('Invalid movement scope');
 const currency=code(scope.currency),factor=currency==='USD'?1:displayRate(currency),factorOK=finite(factor)&&factor>0;
 const categories=scope.categories||[],accounts=scope.accounts||[],original=(scope.originalCurrencies||[]).map(code);
 const result=Object.fromEntries(movementKinds.map(k=>[k,{count:0,inflow:0,outflow:0,net:0,complete:true}]));
 const issue=(item)=>{item.complete=false};
 for(const row of rows){
  const k=movementKind(row,groupOf,isLinkedInvestment);if(!k)continue;
  if(categories.length&&!categories.includes(row.category))continue;
  const d=String(row.tx_date??'').slice(0,10),item=result[k];
  if(date(d)&&(d<scope.start||d>scope.end))continue;
  const legs=[['outflow',row.from_account,row.from_amount],['inflow',row.to_account,row.to_amount]];
  let included=false;
  // Empty unused legs on one-sided income/expense are legitimate; a transfer requires both sides.
  for(const [direction,account,raw] of legs){
   if(accounts.length&&!accounts.includes(account))continue;
   const unused=direction==='outflow'?row.type==='Income':row.type==='Expense';
   const absent=raw===null||raw===undefined||raw==='';
   const amount=typeof raw==='number'?raw:typeof raw==='string'&&raw.trim()!==''?Number(raw):NaN;
   if(!account&&unused&&(absent||amount===0))continue;
   const rate=account?accountRate(account,row):null,c=code(rate?.currency);
   if(original.length&&c&&!original.includes(c))continue;
   included=true;
   if(!date(d)||!account||!c||!finite(amount)||amount<0){issue(item);continue}
   if(amount===0)continue;
   if(!finite(rate.perUsd)||rate.perUsd<=0||!factorOK){issue(item);continue}
   const converted=amount/rate.perUsd*factor;
   if(!finite(converted)||!finite(item[direction]+converted)){issue(item);continue}
   item[direction]+=converted;
  }
  if(included)item.count++;
 }
 for(const item of Object.values(result)){
  if(!factorOK||!item.complete||!finite(item.inflow-item.outflow)){item.complete=false;item.inflow=item.outflow=item.net=null}
  else item.net=item.inflow-item.outflow;
 }
 return {currency,groups:result};
}
