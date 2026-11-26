function createAnalytics(){
 const finite=v=>typeof v==='number'&&Number.isFinite(v), ratio=(a,b)=>finite(a)&&finite(b)&&b>0&&finite(a/b)?a/b:null;
 const sum=(xs,f)=>xs.reduce((a,b)=>a+f(b),0);
 function analyze(data,{fixedOf,largeThreshold}={}){
  if(data?.complete!==true)return null;
  const rows=data.included,expenses=rows.filter(r=>r.kind==='expense'&&r.amount>0),income=rows.filter(r=>r.kind==='income'&&r.amount>0);
  function dimensions(key){const map=new Map();for(const row of rows){const k=String(row[key]??'');if(!k)continue;const v=map.get(k)||{name:k,income:0,expense:0,count:0};v[row.kind]+=row.amount;v.count++;map.set(k,v)}return [...map.values()].map(v=>({...v,net:v.income-v.expense})).sort((a,b)=>b.expense-a.expense||b.income-a.income||a.name.localeCompare(b.name))}
  const fixed={fixed:0,variable:0,unknown:0},groups=new Map();
  for(const r of expenses){const k=fixedOf?.(r);fixed[k==='fixed'||k==='variable'?k:'unknown']+=r.amount;if(['Expense','Personal'].includes(r.group)){const key=JSON.stringify([r.group,r.category]);const v=groups.get(key)||{group:r.group,name:r.category,amount:0};v.amount+=r.amount;groups.set(key,v)}}
  const categories=data.expenseCategories.filter(r=>r.amount>0).map(r=>({...r,share:ratio(r.amount,data.totals.expense)}));
  const ranked=[...expenses].sort((a,b)=>b.amount-a.amount||b.date.localeCompare(a.date));
  return {accounts:dimensions('account'),currencies:dimensions('currency'),categories,expenseGroups:[...groups.values()].sort((a,b)=>b.amount-a.amount).map(r=>({...r,share:ratio(r.amount,data.totals.expense)})),sources:data.incomeSources.filter(r=>r.amount>0),fixed,ranked,large:finite(largeThreshold)&&largeThreshold>0?ranked.filter(r=>r.amount>=largeThreshold):null,expenseRatio:ratio(data.totals.expense,data.totals.income),averageExpense:expenses.length?sum(expenses,r=>r.amount)/expenses.length:null,expenseCount:expenses.length,incomeCount:income.length};
 }
 function compare(current,previous){const out={};for(const k of ['income','expense','net','savingsRate']){const a=current?.[k],b=previous?.[k];out[k]={current:finite(a)?a:null,previous:finite(b)?b:null,delta:finite(a)&&finite(b)&&finite(a-b)?a-b:null,relative:k!=='savingsRate'&&finite(a)&&finite(b)&&b>0&&finite((a-b)/b)?(a-b)/b:null}}return out}
 function health({threeMonths,liquid,invested,essentialMonthly,savingsTarget,emergencyTarget=6}){
  const complete=Array.isArray(threeMonths)&&threeMonths.length===3&&threeMonths.every(r=>r?.complete===true&&finite(r.totals?.income)&&finite(r.totals?.expense)&&r.totals.income>=0&&r.totals.expense>=0);
  const inc=complete?sum(threeMonths,r=>r.totals.income):null,exp=complete?sum(threeMonths,r=>r.totals.expense):null;
  const sr=finite(inc)&&finite(exp)?ratio(inc-exp,inc):null,er=ratio(exp,inc);
  const base=finite(liquid)&&finite(invested)&&liquid>=0&&invested>=0?liquid+invested:null,cr=ratio(liquid,base),ir=ratio(invested,base),em=finite(liquid)&&liquid>=0?ratio(liquid,essentialMonthly):null;
  const target=finite(savingsTarget)&&savingsTarget>0&&savingsTarget<=1?savingsTarget:null;
  const clamp=(v,max)=>Math.max(0,Math.min(max,v));
  const zone=(v,l,h)=>v===null?null:clamp(15-(v<l?(l-v)*50:v>h?(v-h)*50:0),15);
  const points={savings:sr!==null&&target!==null?clamp(sr/target*30,30):null,expense:er!==null?clamp((.7-er)/.4*20,20):null,investment:zone(ir,.3,.6),cash:zone(cr,.3,.7),emergency:em!==null&&finite(emergencyTarget)&&emergencyTarget>0?clamp(em/emergencyTarget*20,20):null};
  const score=Object.values(points).every(finite)?Math.round(sum(Object.values(points),v=>v)):null;
  return {savingsRate:sr,expenseRatio:er,cashRatio:cr,investmentRatio:ir,emergencyMonths:em,averageMonthlyExpense:finite(exp)?exp/3:null,savingsTarget:target,score,points};
 }
 function history({rows,owner,currency,rate}){
  if(!Array.isArray(rows)||!owner||!finite(rate)||rate<=0)return [];
  const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
  const map=new Map(),ambiguous=new Set();
  for(const r of rows){if(r?.owner!==owner||r.verified!==true||r.basis!=='period-boundary-net-assets-usd'||!validDate(r.date)||!finite(r.usd)||!finite(r.usd*rate))continue;if(map.has(r.date)&&map.get(r.date)!==r.usd)ambiguous.add(r.date);map.set(r.date,r.usd)}
  return [...map].filter(([d])=>!ambiguous.has(d)).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,usd])=>({date,amount:usd*rate,currency}));
 }
 return {analyze,compare,health,history};
}
export const {analyze,compare,health,history}=createAnalytics();
