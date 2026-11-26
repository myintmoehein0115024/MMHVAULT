/* Cashflow V2.0.12 candidate, derived from main Invest nativeOverview (V214).
 * Native USD/MMK only; do not aggregate currencies or claim full portfolio P/L.
 * Current valuation uses explicit cached quotes, never a historical price or API call. */
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
function nativeOverview(rows,ready,quote,moves=[],scope){
 const eps=1e-9, finite=x=>x!==null&&x!==undefined&&x!==''&&typeof x!=='boolean'&&Number.isFinite(Number(x)), sym=x=>String(x??'').trim().toUpperCase(), missing=()=>({cost:null,value:null,unreal:null,realized:null,total:null,periodRealized:null});
 const result={Crypto:missing(),Gold:missing()};if(!ready||!Array.isArray(rows)||!Array.isArray(moves))return result;
 const order=(a,b)=>String(a.inv_date??'').localeCompare(String(b.inv_date??''))||(finite(a.id)&&finite(b.id)?Number(a.id)-Number(b.id):String(a.created_at??'').localeCompare(String(b.created_at??''))||String(a.id??'').localeCompare(String(b.id??'')));
 const linked=new Map();let invalidWallet=false;
 for(const m of moves){
  if(!m||!finite(m.fee_quantity)||Number(m.fee_quantity)<0){invalidWallet=true;continue;}
  if(Number(m.fee_quantity)===0)continue;
  const s=sym(m.fee_asset_symbol||m.asset_symbol);
  if(s==='USDT')continue; // USDT wallet fees debit the cash account, not an investment disposal.
  const id=String(m.fee_investment_id??'');
  if(!s||!id||linked.has(id)){invalidWallet=true;continue;}
  linked.set(id,{symbol:s,quantity:Number(m.fee_quantity)});
 }
 for(const asset of ['Crypto','Gold']){
  const rr=rows.filter(x=>x?.asset===asset).slice().sort(order), groups=new Map(),seen=new Set(),matched=new Set();let periodRealized=0,bad=asset==='Crypto'&&invalidWallet;
  for(const x of rr){
   const symbol=asset==='Gold'?'GOLD':sym(x.symbol),id=String(x.id??''),currency=sym(x.currency);
   const weight=asset==='Gold'&&finite(x.weight_kyattha)&&Number(x.weight_kyattha)!==0?x.weight_kyattha:x.quantity;
   if(!symbol||!finite(weight)||Number(weight)===0||!finite(x.amount)||!finite(x.fee)||!finite(x.other_cost)||!validDate(x.inv_date)||(id&&seen.has(id))||(currency&&currency!==(asset==='Gold'?'MMK':'USD'))){bad=true;break;}
   if(id)seen.add(id);
   const side=sym(x.side||x.trade_type),raw=Number(weight),amt=Number(x.amount),sell=side==='SELL'||(!side&&raw<0),q=sell?-Math.abs(raw):raw,fees=Math.abs(Number(x.fee))+Math.abs(Number(x.other_cost));
   if((side&&side!=='SELL'&&side!=='BUY')||(!sell&&(raw<=0||amt<0))||(sell&&side==='BUY')){bad=true;break;}
   const p=groups.get(symbol)||{qty:0,cost:0,realized:0};
   const link=asset==='Crypto'?linked.get(id):null,feeNote=asset==='Crypto'&&/^Wallet (?:Gas|Network) Fee:/i.test(String(x.note??''));
   if(feeNote&&!link){bad=true;break;}
   if(link){if(q>=0||link.symbol!==symbol||Math.abs(-q-link.quantity)>eps||fees!==0){bad=true;break;}matched.add(id);}
   if(q>0){p.qty+=q;p.cost+=Math.abs(amt)+fees;}
   else{
    const sold=-q;
    if(p.qty<=0||sold>p.qty+eps){bad=true;break;}
    const allocated=p.cost*Math.min(sold,p.qty)/p.qty;
    // Network-fee disposal yields no cash; count its cost basis once, not the linked movement again.
    const proceeds=link?0:Math.abs(amt);
    const gain=proceeds-fees-allocated;p.realized+=gain;if(x.inv_date>=scope.start&&x.inv_date<=scope.end)periodRealized+=gain;p.qty-=sold;p.cost-=allocated;
    if(Math.abs(p.qty)<=eps){p.qty=0;p.cost=0;}
   }
   if(![p.qty,p.cost,p.realized].every(Number.isFinite)){bad=true;break;}
   groups.set(symbol,p);
  }
  if(asset==='Crypto'&&matched.size!==linked.size)bad=true;
  if(bad)continue;
  let cost=0,value=0,realized=0,priceMissing=false;
  for(const [symbol,p] of groups){cost+=p.cost;realized+=p.realized;if(p.qty>0){const price=quote(asset,symbol);if(!finite(price)||Number(price)<=0)priceMissing=true;else value+=p.qty*Number(price);}}
  if(!Number.isFinite(cost)||!Number.isFinite(realized)||!Number.isFinite(periodRealized))continue;
  const known=!priceMissing&&Number.isFinite(value),unreal=known?value-cost:null,total=known?realized+unreal:null;
  result[asset]={cost,value:known?value:null,unreal:known&&Number.isFinite(unreal)?unreal:null,realized,periodRealized,total:known&&Number.isFinite(total)?total:null};
 }
 return result;
}
export function investmentReport({owner,source,scope,today}){
 if(!owner||!scope||!validDate(scope.start)||!validDate(scope.end)||!validDate(today)||scope.start>scope.end||scope.end>today||['accounts','categories','originalCurrencies'].some(k=>scope[k]?.length))return null;
 if(source?.owner!==owner||source.ready!==true||!Array.isArray(source.rows)||!Array.isArray(source.moves)||!source.rows.every(r=>r?.user_id===owner)||!source.moves.every(r=>r?.user_id===owner))return null;
 // Future entries cannot be included in current holdings. Invalid dates are retained to fail closed.
 if(source.rows.some(r=>validDate(r.inv_date)&&r.inv_date>today))return null;
 const quote=(asset,symbol)=>{const q=source.quotes?.[asset==='Gold'?'GOLD':symbol];return q?.currency===(asset==='Gold'?'MMK':'USD')&&typeof q.price==='number'&&Number.isFinite(q.price)&&q.price>0?q.price:null};
 const data=nativeOverview(source.rows,true,quote,source.moves,scope);
 return {asOf:today,start:scope.start,end:scope.end,coverage:'native-only',rows:[{asset:'Crypto',currency:'USD',...data.Crypto},{asset:'Gold',currency:'MMK',...data.Gold}]};
}
