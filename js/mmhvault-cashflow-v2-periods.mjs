function createPeriods(){
 const key=d=>`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
 const parse=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))throw new RangeError('Invalid date');const d=new Date(s+'T00:00:00Z');if(!Number.isFinite(+d)||key(d)!==s)throw new RangeError('Invalid date');return d};
 const shift=(d,n)=>new Date(+d+n*86400000), month=(d,n=0)=>new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+n,1)),year=(d,n=0)=>new Date(Date.UTC(d.getUTCFullYear()+n,0,1));
 const keys=(a,b)=>({start:key(a),end:key(b)});
 function actualRange(range,today){const a=parse(range?.start),b=parse(range?.end),d=parse(today);if(a>b||a>d)throw new RangeError('Invalid actual range');return keys(a,b>d?d:b)}
 function dateRange(p,today,earliest,custom){
  const d=parse(today);
  switch(p){
   case 'today':return keys(d,d);
   case 'week':{const a=shift(d,-(d.getUTCDay()+6)%7);return keys(a,d)}
   case 'month':return keys(month(d),d);
   case 'lastMonth':return keys(month(d,-1),shift(month(d),-1));
   case 'quarter':return keys(month(d,-(d.getUTCMonth()%3)),d);
   case 'year':return keys(year(d),d);
   case 'lastYear':return keys(year(d,-1),shift(year(d),-1));
   case 'all':{const a=parse(earliest||today);return keys(a>d?d:a,d)}
   case 'custom':return actualRange(custom,today)
   default:throw new RangeError('Unknown period');
  }
 }
 function previousRange(range){const a=parse(range.start),b=parse(range.end);if(b<a)throw new RangeError('Reversed dates');const n=Math.round((b-a)/86400000)+1;return keys(shift(a,-n),shift(a,-1))}
 function trend(rows,range,grain){
  const start=parse(range.start),end=parse(range.end);
  if(end<start||!['day','month','quarter','year'].includes(grain))throw new RangeError('Invalid trend');
  const bucket=d=>grain==='day'?key(d):grain==='month'?key(d).slice(0,7):grain==='year'?key(d).slice(0,4):`${d.getUTCFullYear()} Q${Math.floor(d.getUTCMonth()/3)+1}`;
  const map=new Map(); let d=start;
  while(d<=end){if(map.size>=4000)throw new RangeError('Too many points; choose a wider interval');const k=bucket(d);map.set(k,{key:k,income:0,expense:0});d=grain==='day'?shift(d,1):grain==='month'?month(d,1):grain==='quarter'?month(d,3-d.getUTCMonth()%3):year(d,1)}
  for(const r of rows){const day=parse(r.date);if(day<start||day>end)continue;const b=map.get(bucket(day));if(b&&['income','expense'].includes(r.kind)&&Number.isFinite(r.amount))b[r.kind]+=r.amount}
  return [...map.values()].map(b=>({...b,net:b.income-b.expense,savingsRate:b.income>0?(b.income-b.expense)/b.income:null}));
 }
 return {dateRange,previousRange,trend,actualRange};
}
export const {dateRange,previousRange,trend,actualRange}=createPeriods();
