/* Cashflow V2.0.6: isolated pure planning; no network, storage, ledger writes. */
function planningKit(){
 const finite=v=>typeof v==='number'&&Number.isFinite(v), money=v=>finite(v)&&v>=0, ccy=v=>typeof v==='string'&&/^[A-Z]{3}$/.test(v), date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 const month=v=>typeof v==='string'&&/^(19|20|21|22)\d{2}-(0[1-9]|1[0-2])$/.test(v);
 const year=v=>typeof v==='string'&&/^(19|20|21|22)\d{2}$/.test(v);
 const id=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\u0000-\u001f]/.test(v);
 const name=v=>typeof v==='string'&&v.trim().length>0&&v.length<=120;
 const iso=d=>d.toISOString().slice(0,10);
 const monthAt=(m,n)=>{const [y,k]=m.split('-').map(Number);return iso(new Date(Date.UTC(y,k-1+n,1))).slice(0,7)};
 const bounds=(p,k)=>p==='month'&&month(k)?{start:k+'-01',end:iso(new Date(Date.UTC(+k.slice(0,4),+k.slice(5),0)))}:p==='year'&&year(k)?{start:k+'-01-01',end:k+'-12-31'}:null;
 const frequencies=['weekly','biweekly','monthly','quarterly','yearly'];
 const goalKinds=['savingsRate','monthlySavings','annualSavings','emergency','purchase','custom'];
 const rowValid=r=>r&&id(r.id)&&name(r.name)&&['income','expense'].includes(r.kind)&&money(r.amount)&&ccy(r.currency);
 const recurringValid=r=>rowValid(r)&&frequencies.includes(r.frequency)&&date(r.start)&&(r.end==null||date(r.end)&&r.end>=r.start)&&typeof r.paused==='boolean'&&(r.datePolicy==null||r.datePolicy==='legacy-clamp');
 const budgetValid=r=>r&&id(r.id)&&bounds(r.period,r.key)&&ccy(r.currency)&&money(r.total)&&Array.isArray(r.categories)&&r.categories.every(c=>name(c.category)&&money(c.amount))&&new Set(r.categories.map(c=>c.category)).size===r.categories.length;
 const goalValid=r=>r&&id(r.id)&&name(r.name)&&goalKinds.includes(r.kind)&&(r.kind==='savingsRate'?finite(r.target)&&r.target>0&&r.target<=1:money(r.target)&&r.target>0&&ccy(r.currency))&&(['monthlySavings','annualSavings'].includes(r.kind)?!!bounds(r.kind==='monthlySavings'?'month':'year',r.key):true)&&(r.progress==null||money(r.progress))&&(r.due==null||date(r.due));
 const forecastValid=f=>f&&['manual','recurring'].includes(f.mode)&&Array.isArray(f.rows)&&f.rows.every(rowValid)&&new Set(f.rows.map(r=>r.id)).size===f.rows.length&&(f.fxOverrides==null||typeof f.fxOverrides==='object'&&!Array.isArray(f.fxOverrides)&&Object.entries(f.fxOverrides).every(([c,v])=>ccy(c)&&c!=='USD'&&finite(v)&&v>0))&&Array.isArray(f.overrides)&&f.overrides.every(r=>rowValid(r)&&month(r.month)&&f.rows.some(b=>b.id===r.id&&b.kind===r.kind))&&new Set(f.overrides.map(r=>r.month+'\0'+r.id)).size===f.overrides.length;
 function validPlan(p){return !!(p&&p.version===1&&forecastValid(p.forecast)&&['budgets','goals','recurring'].every(k=>Array.isArray(p[k])&&new Set(p[k].map(r=>r?.id)).size===p[k].length)&&p.budgets.every(budgetValid)&&new Set(p.budgets.map(b=>b.period+'\0'+b.key)).size===p.budgets.length&&p.goals.every(goalValid)&&p.goals.filter(g=>g.kind==='savingsRate').length<=1&&p.recurring.every(recurringValid))}
 function convert(amount,from,to,rate){
  if(!money(amount)||!ccy(from)||!ccy(to))return null;
  if(from===to||amount===0)return amount;
  const a=from==='USD'?1:rate(from),b=to==='USD'?1:rate(to);
  if(!finite(a)||a<=0||!finite(b)||b<=0)return null;
  const v=amount/a*b;return finite(v)?v:null;
 }
 function occurrences(r,range){
  if(!recurringValid(r)||!date(range?.start)||!date(range?.end)||range.start>range.end)throw new TypeError('Invalid schedule');
  if(r.paused)return [];
  const end=r.end&&r.end<range.end?r.end:range.end,start=r.start>range.start?r.start:range.start;
  if(start>end)return [];
  const out=[],push=d=>{if(d>=start&&d<=end){if(out.length>=20000)throw new RangeError('Schedule too large');out.push(d)}};
  if(r.datePolicy==='legacy-clamp'&&['monthly','yearly'].includes(r.frequency)){
   const step=r.frequency==='monthly'?1:12;let d=r.start;
   for(let i=0;d<=end;i++){if(i>=120000)throw new RangeError('Schedule too large');push(d);const m=monthAt(d.slice(0,7),step),last=bounds('month',m);if(!last)throw new RangeError('Schedule date outside supported range');d=m+'-'+String(Math.min(+d.slice(8),+last.end.slice(8))).padStart(2,'0')}
  }else if(r.frequency==='weekly'||r.frequency==='biweekly'){
   const ms=86400000*(r.frequency==='weekly'?7:14),base=Date.parse(r.start+'T00:00:00Z'),first=Date.parse(start+'T00:00:00Z'),last=Date.parse(end+'T00:00:00Z');
   for(let t=base+Math.ceil((first-base)/ms)*ms;t<=last;t+=ms)push(iso(new Date(t)));
  }else{
   const step={monthly:1,quarterly:3,yearly:12}[r.frequency],base=r.start.slice(0,7),day=+r.start.slice(8),delta=(+start.slice(0,4)-+base.slice(0,4))*12+(+start.slice(5,7)-+base.slice(5,7));
   for(let i=Math.max(0,Math.floor(delta/step)*step);;i+=step){const m=monthAt(base,i);if(m>end.slice(0,7))break;const d=Math.min(day,+bounds('month',m).end.slice(8));push(m+'-'+String(d).padStart(2,'0'))}
  }
  return out;
 }
 function forecastRate(f,rate){return c=>c==='USD'?1:Object.prototype.hasOwnProperty.call(f.fxOverrides||{},c)?f.fxOverrides[c]:rate(c)}
 function recurringConvert(r,currency,rate,accountRate){
  if(!r.legacyAccount)return convert(r.amount,r.currency,currency,rate);
  const a=accountRate?.(r.legacyAccount),b=currency==='USD'?1:rate(currency);
  if(!a||a.currency!==r.currency||!finite(a.perUsd)||a.perUsd<=0||!finite(b)||b<=0)return r.amount===0?0:null;
  const n=r.amount/a.perUsd*b;return finite(n)?n:null;
 }
 const aggregate=(rows,currency,rate,accountRate)=>{let income=0,expense=0;const issues=[];for(const r of rows){const n=recurringConvert(r,currency,rate,accountRate);if(n===null){issues.push(r.id);continue}if(r.kind==='income')income+=n;else expense+=n}if(!finite(income)||!finite(expense)||!finite(income-expense))issues.push('overflow');return issues.length?{income:null,expense:null,net:null,issues}:{income,expense,net:income-expense,issues}};
 function recurringMonth(rows,m,currency,rate,accountRate){
  if(!Array.isArray(rows)||!rows.every(recurringValid)||!month(m))throw new TypeError('Invalid recurring rows');
  const range=bounds('month',m),items=rows.map(r=>({...r,dates:occurrences(r,range)}));
  return {...aggregate(items.flatMap(r=>r.dates.map(()=>r)),currency,rate,accountRate),rows:items};
 }
 function forecast(p,{opening,today,months,currency,rate,accountRate}){
  if(!validPlan(p)||!date(today)||!Number.isInteger(months)||months<1||months>240)throw new TypeError('Invalid forecast');
  const first=monthAt(today.slice(0,7),1),points=[],issues=[];
  const scopedRate=forecastRate(p.forecast,rate);
  let balance=finite(opening)?opening:null;
  for(let i=0;i<months;i++){const m=monthAt(first,i),v=p.forecast.mode==='recurring'?recurringMonth(p.recurring,m,currency,scopedRate,accountRate):aggregate(p.forecast.rows.map(r=>p.forecast.overrides.find(o=>o.id===r.id&&o.month===m)||r),currency,scopedRate);
   issues.push(...v.issues);balance=balance!==null&&v.net!==null&&finite(balance+v.net)?balance+v.net:null;points.push({month:m,income:v.income,expense:v.expense,net:v.net,amount:balance})}
  return {kind:'forecast',fxOverrides:{...(p.forecast.fxOverrides||{})},opening:finite(opening)?opening:null,points,issues:[...new Set(issues)],monthlyIncome:points[0].income,monthlyExpense:points[0].expense,monthlyNet:points[0].net,estimated:points.at(-1).amount};
 }
 function budgetStatus(b,actual){
  if(!budgetValid(b))throw new TypeError('Invalid budget');
  const ok=actual?.complete===true&&actual.currency===b.currency&&finite(actual.totals?.individual)&&Array.isArray(actual.included);
  const used=ok?actual.totals.individual:null;
  const calc=(total,used)=>({total,used,remaining:finite(used)?total-used:null,ratio:finite(used)&&total>0?used/total:null,over:finite(used)?used>total:null});
  return {...calc(b.total,used),categories:b.categories.map(c=>({...c,...calc(c.amount,ok?actual.included.filter(r=>r.kind==='expense'&&r.group==='Expense'&&r.category===c.category).reduce((s,r)=>s+r.amount,0):null)}))};
 }
 function goalStatus(g,actual,verifiedProgress){
  if(!goalValid(g))throw new TypeError('Invalid goal');
  const isRate=g.kind==='savingsRate',isSaving=['monthlySavings','annualSavings'].includes(g.kind),isActual=isRate||isSaving;
  const progress=isActual?(actual?.complete===true&&(isRate||actual.currency===g.currency)?actual.totals?.[isRate?'savingsRate':'net']:null):g.kind==='emergency'?(money(verifiedProgress)?verifiedProgress:null):g.progress??null;
  return {progress:finite(progress)?progress:null,ratio:finite(progress)?Math.max(0,progress/g.target):null,target:g.target,due:g.due??null,basis:isActual?'actual':g.kind==='emergency'?'verified':'manual'};
 }
 function editPlan(p,command){
  if(!validPlan(p)||!command||!['forecast','budgets','goals','recurring'].includes(command.section))throw new TypeError('Invalid plan edit');
  const next=JSON.parse(JSON.stringify(p)),{section,action,value,id:key}=command;
  if(section==='forecast'){if(action!=='replace')throw new TypeError('Invalid forecast action');next.forecast=value}
  else {const arr=next[section],i=arr.findIndex(r=>r.id===key);
   if(action==='add'){if(!value||arr.some(r=>r.id===value.id))throw new Error('Duplicate id');arr.push(value)}
   else if(action==='update'){if(i<0||value?.id!==key)throw new Error('Unknown id');arr[i]=value}
   else if(action==='delete'){if(i<0)throw new Error('Unknown id');arr.splice(i,1)}
   else if(action==='toggle'&&section==='recurring'){if(i<0)throw new Error('Unknown id');arr[i].paused=!arr[i].paused}
   else throw new TypeError('Unknown action');
  }
  if(!validPlan(next))throw new TypeError('Invalid updated plan');return JSON.parse(JSON.stringify(next));
 }
 return {validPlan,convert,bounds,occurrences,recurringMonth,forecast,budgetStatus,goalStatus,editPlan,frequencies,goalKinds};
}
export const {validPlan,convert,bounds,occurrences,recurringMonth,forecast,budgetStatus,goalStatus,editPlan,frequencies,goalKinds}=planningKit();
