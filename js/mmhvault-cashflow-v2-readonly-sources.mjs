/* Personal read-only Cash Flow sources. No writes, SQL, storage or market requests. */
import {validPlan} from './mmhvault-cashflow-v2-planning.mjs';
const positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
const nonnegative=v=>{if(typeof v!=='number'&&(typeof v!=='string'||!/^\d+(?:\.\d+)?$/.test(v.trim())))return null;const n=Number(v);return Number.isFinite(n)&&n>=0?n:null};
export function currentMonth(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
export function budgetPlan(row,owner,month){
 if(!owner||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return null;
 const plan={version:1,forecast:{mode:'manual',rows:[],overrides:[]},budgets:[],goals:[],recurring:[]};
 if(row==null)return plan;
 if(row.user_id!==owner||row.budget_month!==month+'-01'||typeof row.currency!=='string')return null;
 const total=nonnegative(row.monthly_amount),raw=row.category_budgets??{};
 if(total===null||typeof raw!=='object'||Array.isArray(raw))return null;
 const categories=[];
 for(const [category,v] of Object.entries(raw)){const amount=nonnegative(v);if(amount===null||!category.trim()||category.length>120)return null;if(amount>0)categories.push({category,amount})}
 if(total>0||categories.length)plan.budgets.push({id:'legacy-budget-'+month,period:'month',key:month,currency:row.currency,total,categories});
 return validPlan(plan)?plan:null;
}
export function createBudgetBridge({owner,isCurrent,readBudget,onChange,month=currentMonth}){
 let revision=0,key='',value=null,disposed=false;
 const current=()=>!disposed&&isCurrent()&&key===month()&&value?.owner===owner?value:null;
 async function refresh(){
  if(disposed||!isCurrent())return;
  const ticket=++revision,m=month(),previous=value;key=m;value=null;
  if(previous)onChange?.();
  try{
   const row=await readBudget(owner,m);
   if(disposed||ticket!==revision||!isCurrent()||m!==month())return;
   const plan=budgetPlan(row,owner,m);value=plan?{owner,plan}:null;
  }catch{if(disposed||ticket!==revision||!isCurrent()||m!==month())return;value=null}
  onChange?.();
 }
 return {current,refresh,ensure(){if(!disposed&&key!==month())void refresh()},destroy(){disposed=true;revision++;value=null;key=''}};
}
export function readInvestmentSource(host,owner,live,goldPrice){
 const rows=host.investments,moves=host.mmhWalletMovementsV174;
 if(!owner||host.mmhWalletDataOwnerV191!==owner||!['ready','dirty'].includes(host.mmhvaultDataStateV334?.status)||!(Number(host.__mmhLastCloudLoadAtV1235)>0)||!Array.isArray(rows)||!Array.isArray(moves)||!rows.every(r=>r?.user_id===owner)||!moves.every(r=>r?.user_id===owner))return null;
 const quotes=Object.create(null);
 for(const row of rows){if(row.asset!=='Crypto')continue;const symbol=String(row.symbol||'').trim().toUpperCase();const price=live?.[symbol]?.price;if(symbol&&positive(price))quotes[symbol]={currency:'USD',price}}
 if(positive(goldPrice))quotes.GOLD={currency:'MMK',price:goldPrice};
 return {owner,ready:true,rows:rows.map(r=>({...r})),moves:moves.map(r=>({...r})),quotes};
}

/* Current configured items only; do not treat saved goals or schedules as ledger cash flows. */
const dateKey=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const nameOk=v=>typeof v==='string'&&v.trim().length>0&&v.length<=240;
export function configuredRows(kind,rows,owner){
 if(!owner||!['goals','recurring'].includes(kind)||!Array.isArray(rows)||!rows.every(r=>r?.user_id===owner))return null;
 const out=[],ids=new Set();
 for(const r of rows){
  if(r.id==null||ids.has(String(r.id))||!nameOk(r.name))return null;ids.add(String(r.id));
  if(kind==='goals'){
   if(r.status==='archived')continue;
   const target=nonnegative(r.target_amount),progress=nonnegative(r.current_amount);
   if(!['active','completed'].includes(r.status)||!positive(target)||progress===null||!/^[A-Z]{3}$/.test(r.currency)||r.target_date!=null&&!dateKey(r.target_date))return null;
   out.push({name:r.name,currency:r.currency,target,progress,due:r.target_date??null,status:progress>=target?'completed':'active'});
  }else{
   if(!['active','paused'].includes(r.status)||!['Income','Expense','Transfer'].includes(r.tx_type)||!['weekly','monthly','yearly'].includes(r.frequency)||!dateKey(r.next_due_date))return null;
   const from=nonnegative(r.from_amount),to=nonnegative(r.to_amount);
   if(r.tx_type!=='Income'&&(!nameOk(r.from_account)||!positive(from))||r.tx_type!=='Expense'&&(!nameOk(r.to_account)||!positive(to)))return null;
   out.push({name:r.name,type:r.tx_type,frequency:r.frequency,due:r.next_due_date,status:r.status,fromAccount:r.tx_type==='Income'?null:r.from_account,toAccount:r.tx_type==='Expense'?null:r.to_account,from,to});
  }
 }
 return out;
}
export function createConfiguredBridge({owner,isCurrent,readRows,onChange}){
 let disposed=false;const values={goals:null,recurring:null},revision={goals:0,recurring:0};
 const current=()=>!disposed&&isCurrent()?{owner,goals:values.goals,recurring:values.recurring}:null;
 async function refresh(kind){
  if(disposed||!isCurrent()||!Object.hasOwn(values,kind))return;
  const ticket=++revision[kind],previous=values[kind];values[kind]=null;
  if(previous)onChange?.();
  try{const rows=await readRows(kind,owner);if(disposed||!isCurrent()||ticket!==revision[kind])return;values[kind]=configuredRows(kind,rows,owner)}
  catch{if(disposed||!isCurrent()||ticket!==revision[kind])return;values[kind]=null}
  onChange?.();
 }
 return {current,refresh,destroy(){disposed=true;for(const kind of Object.keys(values)){revision[kind]++;values[kind]=null}}};
}
