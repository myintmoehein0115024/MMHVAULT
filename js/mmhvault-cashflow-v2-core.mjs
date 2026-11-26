/* MMHVAULT Cashflow V2 foundation. Pure calculation only; no storage, network, DOM or data writes. */
function createCashflowCore(){
  const code=v=>String(v??'').trim().toUpperCase().replace(/^RMB$/,'CNY');
  const finite=v=>typeof v==='number'&&Number.isFinite(v);
  const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
  const nativeAmount=v=>typeof v==='number'?v:typeof v==='string'&&v.trim()!==''?Number(v):NaN;
  function summarize({rows,scope,accountRate,displayRate,groupOf,isLinkedInvestment}){
    if(!Array.isArray(rows)||!scope||!validDate(scope.start)||!validDate(scope.end)||scope.start>scope.end||typeof accountRate!=='function'||typeof groupOf!=='function'||typeof isLinkedInvestment!=='function')throw new TypeError('Invalid Cashflow inputs');
    const display=code(scope.currency),factor=display==='USD'?1:displayRate?.(display);
    const issues=[],included=[],byCurrency=new Map(),byCategory=new Map(),bySource=new Map();
    const sums={income:0,expense:0,individual:0,personal:0};
    for(const t of rows){
      if(!t||t.category==='Data Adjustment'||t.category==='Investment'||isLinkedInvestment(t))continue;
      const g=groupOf(t),income=t.type==='Income'&&g==='Income',expense=t.type==='Expense'&&(g==='Expense'||g==='Personal');
      if(!income&&!expense)continue;
      const date=String(t.tx_date??'').slice(0,10),account=income?t.to_account:t.from_account,amount=nativeAmount(income?t.to_amount:t.from_amount);
      if(!validDate(date)){issues.push({id:t.id??null,reason:'invalid-date'});continue}
      if(date<scope.start||date>scope.end)continue;
      if(scope.accounts?.length&&!scope.accounts.includes(account))continue;
      if(scope.categories?.length&&!scope.categories.includes(t.category))continue;
      const rate=accountRate(account,t),currency=code(rate?.currency);
      if(scope.originalCurrencies?.length&&currency&&!scope.originalCurrencies.map(code).includes(currency))continue;
      if(!currency||!finite(amount)||amount<0){issues.push({id:t.id??null,reason:'invalid-native-value',account});continue}
      const native=byCurrency.get(currency)||{income:0,expense:0};native[income?'income':'expense']+=amount;byCurrency.set(currency,native);
      if(amount===0)continue;
      if(!finite(rate?.perUsd)||rate.perUsd<=0){issues.push({id:t.id??null,reason:'missing-account-rate',account,currency});continue}
      const usd=amount/rate.perUsd;
      if(!finite(usd)){issues.push({id:t.id??null,reason:'invalid-conversion',account,currency});continue}
      sums[income?'income':'expense']+=usd;
      if(expense)sums[g==='Personal'?'personal':'individual']+=usd;
      const category=String(t.category||'Other'),map=income?bySource:byCategory;
      if(!map.has(category))map.set(category,0);map.set(category,map.get(category)+usd);
      included.push({id:t.id??null,date,kind:income?'income':'expense',group:g,category,account,currency,nativeAmount:amount,usd});
    }
    if(!display||!finite(factor)||factor<=0)issues.push({reason:'missing-display-rate',currency:display});
    if(!Object.values(sums).every(finite)||finite(factor)&&factor>0&&(!Object.values(sums).every(v=>finite(v*factor))||!finite((sums.income-sums.expense)*factor)))issues.push({reason:'numeric-overflow'});
    if(![...byCurrency.values()].every(v=>finite(v.income)&&finite(v.expense)))issues.push({reason:'native-overflow'});
    const complete=issues.length===0;
    const net=sums.income-sums.expense;
    const convert=v=>complete&&finite(v*factor)?v*factor:null;
    const totals={income:convert(sums.income),expense:convert(sums.expense),individual:convert(sums.individual),personal:convert(sums.personal),net:convert(net),savingsRate:complete&&sums.income>0?net/sums.income:null};
    const breakdown=map=>complete?[...map].map(([name,usd])=>({name,amount:convert(usd)})).sort((a,b)=>b.amount-a.amount):[];
    return {complete,issues,currency:display,totals,original:[...byCurrency].map(([currency,values])=>({currency,...values})),incomeSources:breakdown(bySource),expenseCategories:breakdown(byCategory),included:complete?included.map(({usd,...row})=>({...row,amount:convert(usd)})):[]};
  }
  function project({opening,months,monthlyIncome,monthlyExpense}){
    if(![opening,monthlyIncome,monthlyExpense].every(finite)||monthlyIncome<0||monthlyExpense<0||!Number.isInteger(months)||months<1||months>240)throw new TypeError('Invalid projection');
    const net=monthlyIncome-monthlyExpense;
    const points=Array.from({length:months+1},(_,month)=>({month,amount:opening+net*month}));
    if(!points.every(p=>finite(p.amount)))throw new RangeError('Projection overflow');
    return {kind:'forecast',monthlyNet:net,points};
  }
  function reconcile({opening,closing,net}){
    if(![opening,closing,net].every(finite))return {opening:finite(opening)?opening:null,closing:finite(closing)?closing:null,change:null,nonCashflowChange:null};
    const change=closing-opening,other=change-net;return {opening,closing,change:finite(change)?change:null,nonCashflowChange:finite(other)?other:null};
  }
  return {summarize,project,reconcile};
}
export const {summarize,project,reconcile}=createCashflowCore();
