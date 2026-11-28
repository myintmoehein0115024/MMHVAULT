(function reportPeriodModule(){
  'use strict';
  if(window.__MMH_REPORT_PERIOD_V201)return;
  window.__MMH_REPORT_PERIOD_V201=true;
  const rootId='reports',keyPrefix='mmhvault_report_period_v201_';
  const $=id=>document.getElementById(id);
  const text=v=>String(v??'');
  const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  const n=v=>{const v1=Number(v);return Number.isFinite(v1)?v1:0};
  const current=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`};
  const validMonth=v=>/^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(text(v));
  const validYear=v=>/^(19|20)\d{2}$/.test(text(v));
  const shift=(k,delta)=>{if(!validMonth(k))return current();const [y,m]=k.split('-').map(Number),d=new Date(y,m-1+delta,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`};
  const lang=()=>{try{return localStorage.getItem('mmhvault_language_v3363')||'en'}catch(_){return 'en'}};
  const tr=(en,zh,my)=>lang()==='zh'?zh:lang()==='my'?my:en;
  const owner=()=>{try{return typeof currentSessionUser!=='undefined'&&currentSessionUser?.id?String(currentSessionUser.id):''}catch(_){return ''}};
  const localKey=()=>keyPrefix+(owner()||'guest');
  const rows=()=>{try{return Array.isArray(window.transactions)?window.transactions:Array.isArray(transactions)?transactions:[]}catch(_){return []}};
  const currency=()=> $('reportCurrencyV115')?.value||'USD';
  const fx=c=>{if(c==='USD')return 1;const key={THB:'usd_thb',CNY:'usd_cny',MMK:'usd_mmk'}[c];try{const r=typeof rates!=='undefined'?rates:window.rates;return key&&n(r?.[key])>0?n(r[key]):0}catch(_){return 0}};
  // Use the same owner-checked display formatter as the legacy monthly Report; fx remains the budget source rate.
  const F=v=>{if(!owner()||typeof v!=='number'||!Number.isFinite(v))return '—';try{return window.mmhLegacyReportDisplayV265?.(v,currency())||'—'}catch(_){return '—'}};
  const amountUSD=(account,amount)=>{try{if(typeof mmhvaultAmountUSD==='function')return n(mmhvaultAmountUSD(account,amount));if(typeof window.mmhvaultAmountUSD==='function')return n(window.mmhvaultAmountUSD(account,amount));if(typeof toUSD==='function')return n(amount)*n(toUSD(account));}catch(_){return 0}return 0};
  const group=t=>{try{if(typeof inferTxGroup==='function')return inferTxGroup(t)}catch(_){}
    if(t?.category==='Data Adjustment')return'Data Adjustment';if(t?.type==='Transfer')return'Transfer';
    if(t?.type==='Income')return 'Income';if(t?.type==='Expense')return 'Expense';return text(t?.type);
  };
  const linked=t=>{try{return typeof isLinkedInvestmentTx==='function'&&isLinkedInvestmentTx(t)}catch(_){return false}};
  let state={mode:'month',month:current(),year:current().slice(0,4)};
  let viewReady=false,budgetCache={key:'',data:null,error:false,pending:false},lastOwner='';
  function loadPrefs(){state={mode:'month',month:current(),year:current().slice(0,4)};try{const raw=JSON.parse(localStorage.getItem(localKey())||'null');if(!raw||typeof raw!=='object')return;if(validMonth(raw.month))state.month=raw.month;if(validYear(raw.year))state.year=raw.year;if(raw.mode==='year')state.mode='year'}catch(_){}}
  function savePrefs(){try{localStorage.setItem(localKey(),JSON.stringify(state))}catch(_){}}
  function alignLegacyMonth(){
    if(state.mode!=='month')return;
    const input=$('reportMonthV115');if(input&&input.value!==state.month){
      input.value=state.month;input.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }
  function scanMonths(){const dates=rows().map(t=>text(t.tx_date).slice(0,7)).filter(validMonth);let earliest=shift(current(),-35);for(const x of dates)if(x<earliest)earliest=x; if(validMonth(state.month)&&state.month<earliest)earliest=state.month;return earliest}
  function monthChoices(){
    const select=$('reportMonthQuickV201');if(!select)return;
    const from=scanMonths(),to=state.month>current()?state.month:current();
    const options=[];let k=to;for(let count=0;count<360&&k>=from;count++,k=shift(k,-1)){
      const [year,month]=k.split('-').map(Number);
      const label=new Date(year,month-1,1,12).toLocaleDateString(lang()==='zh'?'zh-CN':'en-US',{year:'numeric',month:'long'});
      options.push(`<option value="${k}">${esc(label)}</option>`);
    }
    select.innerHTML=options.join('');
    select.value=state.month;
  }
  function yearChoices(){
    const select=$('reportYearPickV201');if(!select)return;
    const earliest=scanMonths().slice(0,4),latest=String(Math.max(Number(current().slice(0,4)),Number(state.year)));
    const choices=[];for(let y=Number(latest);y>=Math.max(1900,Math.min(Number(earliest),Number(state.year)));y--)choices.push(`<option value="${y}">${y}</option>`);
    select.innerHTML=choices.join('');select.value=state.year;
  }
  function build(){
    const page=$(rootId),shell=page?.querySelector('.report-shell-v115'),head=shell?.querySelector('.report-head-v115');
    if(!page||!head||!$('reportMonthV115'))return false;
    if(!$('reportPeriodToolbarV201')){
      const toolbar=document.createElement('div');toolbar.id='reportPeriodToolbarV201';toolbar.className='report-period-toolbar-v201';
      head.after(toolbar);
      toolbar.addEventListener('click',e=>{
        const b=e.target.closest('button');if(!b)return;
        if(b.dataset.reportModeV201){switchMode(b.dataset.reportModeV201);return}
        if(b.dataset.reportStepV201){step(Number(b.dataset.reportStepV201));return}
        if(b.dataset.reportNowV201){selectMonth(current());return}
      });
      toolbar.addEventListener('change',e=>{
        if(e.target.id==='reportMonthQuickV201')selectMonth(e.target.value);
        if(e.target.id==='reportYearPickV201')selectYear(e.target.value);
      });
    }
    viewReady=true;sync();return true;
  }
  function sync(){
    if(!viewReady)return;
    const page=$(rootId),toolbar=$('reportPeriodToolbarV201');if(!page||!toolbar)return;
    page.classList.toggle('report-year-v201',state.mode==='year');page.dataset.reportPeriod=state.mode;
    toolbar.innerHTML=`<div class="report-period-switch-v201" role="group" aria-label="${esc(tr('Report type','报告类型','အစီရင်ခံစာအမျိုးအစား'))}"><button type="button" data-report-mode-v201="month" aria-pressed="${state.mode==='month'}" class="${state.mode==='month'?'is-active':''}">${tr('Monthly','月报','လစဉ်')}</button><button type="button" data-report-mode-v201="year" aria-pressed="${state.mode==='year'}" class="${state.mode==='year'?'is-active':''}">${tr('Annual','年报','နှစ်စဉ်')}</button></div><div class="report-period-range-v201"><button type="button" data-report-step-v201="-1" aria-label="${tr('Previous period','上一期','ယခင်ကာလ')}">‹</button><label class="report-quick-month-v201">${tr('Choose month','选择月份','လရွေးရန်')}<select id="reportMonthQuickV201" aria-label="${tr('Choose report month','选择报告月份','အစီရင်ခံစာလကိုရွေးပါ')}"></select></label><label class="report-quick-year-v201">${tr('Choose year','选择年份','နှစ်ရွေးရန်')}<select id="reportYearPickV201" aria-label="${tr('Choose report year','选择报告年份','အစီရင်ခံစာနှစ်ကိုရွေးပါ')}"></select></label><button type="button" data-report-step-v201="1" aria-label="${tr('Next period','下一期','နောက်ကာလ')}">›</button><button class="report-today-v201" type="button" data-report-now-v201="1" ${state.mode==='year'?'hidden':''}>${tr('This month','本月','ယခုလ')}</button></div>`;
    monthChoices();yearChoices();
    const eyebrow=page.querySelector('.report-eyebrow-v115');
    if(eyebrow)eyebrow.textContent=state.mode==='year'?tr('ANNUAL FINANCIAL REPORT','年度财务报告','နှစ်စဉ်ဘဏ္ဍာရေးအစီရင်ခံစာ'):tr('MONTHLY FINANCIAL REPORT','月度财务报告','လစဉ်ဘဏ္ဍာရေးအစီရင်ခံစာ');
    const descr=page.querySelector('.report-head-v115 .mmh-context-desc-v199');if(descr)descr.textContent=state.mode==='year'?tr('Annual totals from recorded transactions · current wealth remains a live snapshot.','全年已记录交易汇总 · 资产仍为实时快照。','နှစ်စဉ်မှတ်တမ်းအကျဉ်း · ပိုင်ဆိုင်မှုသည် လက်ရှိတန်ဖိုးဖြစ်သည်။'):tr('Income, spending, budget, wealth, investments, goals and recurring commitments in one monthly view.','一个月度视图汇总财务信息。','လစဉ် ဘဏ္ဍာရေး အကျဉ်းချုပ်။');
    const annual=$('reportAnnualViewV201');if(annual)annual.hidden=state.mode!=='year';
  }
  function announce(){window.dispatchEvent(new CustomEvent('mmhvault:report-period-changed',{detail:{...state}}))}
  function switchMode(mode){
    if(mode!=='month'&&mode!=='year')return;state.mode=mode;savePrefs();sync();render();announce();
  }
  function selectMonth(month){
    if(!validMonth(month))return;
    state.month=month;state.year=month.slice(0,4);state.mode='month';
    const native=$('reportMonthV115');if(native){native.value=month;native.dispatchEvent(new Event('change',{bubbles:true}))}
    savePrefs();sync();render();announce();
  }
  function selectYear(year){
    if(!validYear(year))return;
    state.year=String(year);state.mode='year';
    savePrefs();sync();render();announce();
  }
  function step(delta){if(![-1,1].includes(delta))return;if(state.mode==='year')selectYear(String(Number(state.year)+delta));else selectMonth(shift(state.month,delta))}
  function collectYear(year){
    const months=Array.from({length:12},(_,i)=>({key:`${year}-${String(i+1).padStart(2,'0')}`,income:0,individual:0,personal:0,count:0,categories:new Map()}));
    for(const t of rows()){
      const key=text(t?.tx_date).slice(0,7);if(key.slice(0,4)!==year)continue;const idx=Number(key.slice(5,7))-1;if(idx<0||idx>11||!Number.isInteger(idx))continue;
      const m=months[idx],g=group(t);let value=0,kind='';
      if(g==='Income'){value=amountUSD(t.to_account,t.to_amount);kind='income'}
      else if(g==='Expense'&&t.category!=='Investment'&&!linked(t)){value=amountUSD(t.from_account,t.from_amount);kind='individual'}
      else if(g==='Personal'){value=amountUSD(t.from_account,t.from_amount);kind='personal'}
      if(kind){m[kind]+=value;m.count++}
      if(kind==='individual'||kind==='personal'){const category=`${kind==='individual'?'Expense':'Personal'}|${text(t.category||'Other')}`;m.categories.set(category,n(m.categories.get(category))+value)}
    }
    const aggregate={year,months,income:0,individual:0,personal:0,total:0,remaining:0,rate:0,count:0,categories:new Map()};
    for(const m of months){
      m.total=m.individual+m.personal;m.remaining=m.income-m.total;
      for(const k of ['income','individual','personal','count'])aggregate[k]+=m[k];
      for(const [cat,value] of m.categories)aggregate.categories.set(cat,n(aggregate.categories.get(cat))+value);
    }
    aggregate.total=aggregate.individual+aggregate.personal;aggregate.remaining=aggregate.income-aggregate.total;
    aggregate.rate=aggregate.income?aggregate.remaining/aggregate.income*100:0;return aggregate;
  }
  function wealthLive(){
    const s=window.MMHBalanceBridgeV202?.current?.();
    return s?.ready?{ready:true,total:s.total,assets:s.assets,liabilities:s.liabilities,gold:s.gold}:{ready:false};
  }
  function render(){
    if(!viewReady||state.mode!=='year'||!$(rootId)?.classList.contains('active'))return;
    const host=$('reportAnnualViewV201');if(!host)return;
    const cur=collectYear(state.year),prev=collectYear(String(Number(state.year)-1)),wealth=wealthLive(),movement=window.MMHBalanceBridgeV202?.movements?.(rows().filter(t=>text(t?.tx_date).slice(0,4)===state.year));
    const delta=(v,p)=>p>0?`${v-p>=0?'+':''}${((v-p)/p*100).toFixed(2)}%`:tr('No prior-year baseline','无上年度基准','ယခင်နှစ်အချက်အလက်မရှိ');
    const rateText=F(0)!=='—'?'':`<p class="report-annual-warning-v201">${tr('No exchange rate for the selected currency; values are hidden until a rate is available.','所选币种汇率缺失，暂不显示换算金额。','ရွေးချယ်ထားသော ငွေလဲနှုန်းမရှိပါ။')}</p>`;
    const max=Math.max(1,...cur.months.map(m=>Math.max(m.income,m.total)));
    const summary=[['Income',cur.income,'income'],['Individual Expense',cur.individual,'individual'],['Personal',cur.personal,'personal'],[tr('Current Total Balance','当前总余额','လက်ရှိ စုစုပေါင်းလက်ကျန်'),wealth.ready?wealth.total:NaN,'remaining']].map(([label,value,cls])=>`<article class="report-kpi-v115 ${cls}"><span>${esc(label)}</span><strong>${Number.isFinite(value)?F(value):'—'}</strong><small>${cls==='remaining'?tr('Live · matches Accounts net assets','实时 · 与 Accounts 净资产一致','Accounts လက်ရှိ အသားတင်ပိုင်ဆိုင်မှု'):`${esc(state.year)} · ${cur.count} records · ${cur.rate.toFixed(2)}% net rate`}</small></article>`).join('');
    const monthCells=cur.months.map(m=>{const mon=Number(m.key.slice(-2)),name=new Date(Number(state.year),mon-1,1,12).toLocaleDateString(lang()==='zh'?'zh-CN':'en-US',{month:'short'});const width1=(100*m.income/max).toFixed(2),width2=(100*m.total/max).toFixed(2);
      return `<button type="button" data-report-month-cell-v201="${m.key}" class="report-annual-cell-v201" aria-label="${m.key}"><strong>${esc(name)}</strong><div class="report-annual-bars-v201"><i class="income" style="width:${width1}%"></i><i class="expense" style="width:${width2}%"></i></div><span>${tr('Income','收入','ဝင်ငွေ')} ${F(m.income)}</span><span>${tr('Spending','支出','အသုံးစရိတ်')} ${F(m.total)}</span><em class="${m.remaining>=0?'plus':'minus'}">${tr('Net Savings','期间净结余','စုဆောင်းငွေ')} ${F(m.remaining)}</em></button>`;
    }).join('');
    const top=[...cur.categories.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8);
    const cats=top.length?top.map(([name,value],i)=>`<div class="report-annual-category-v201"><strong>${i+1}. ${esc(name.replace('|',' · '))}</strong><span>${F(value)} · ${(cur.total?value/cur.total*100:0).toFixed(1)}%</span></div>`).join(''):`<p class="report-annual-muted-v201">${tr('No spending categories recorded for this year.','本年度暂无支出分类记录。','ယခုနှစ်အတွက် အသုံးစရိတ်မှတ်တမ်းမရှိပါ။')}</p>`;
    const w=wealth.ready?`<div class="report-annual-live-grid-v201"><span>Account Net Assets <b>${F(wealth.total)}</b></span><span>Assets <b>${F(wealth.assets)}</b></span><span>Liabilities <b>${F(wealth.liabilities)}</b></span><span>Gold Portfolio <b>${F(wealth.gold)}</b></span></div>`:`<p>${tr('Current wealth data is not ready.','当前资产数据尚未准备好。','လက်ရှိ ပိုင်ဆိုင်မှုအချက်အလက် မရရှိသေးပါ။')}</p>`;
    const val=k=>{const v=movement?.[k];return v?.count?(v.valid?F(v.usd):'—')+' · '+v.count+' record(s)':tr('No records','无记录','မှတ်တမ်းမရှိ')};
    const balanceMovements=`<section class="report-panel-v115 report-annual-panel-v201"><h2>${tr('Other Balance Movements · Excluded from Savings Rate','其他余额变动 · 不计入储蓄率','လက်ကျန်ငွေပြောင်းလဲမှု')}</h2><p class="report-annual-muted-v201">${tr('Saved reference-FX transfer differences do not necessarily represent realized losses.','按参考汇率计算的转账差额不一定是真实损失。','ကိုးကားငွေလဲနှုန်း ကွာခြားချက်')}</p><div class="report-annual-live-grid-v201"><span>Data Adjustment <b>${val('adjustments')}</b></span><span>Transfer Difference <b>${val('transfers')}</b></span><span>Loan Cash Movement <b>${val('loans')}</b></span><span>Period Net Savings <b>${F(cur.remaining)}</b></span></div></section>`;
    host.innerHTML=`<div class="report-annual-title-v201"><div><span>MMHVAULT · ${state.year}</span><h2>${tr('Annual Financial Report','年度财务报告','နှစ်စဉ်ဘဏ္ဍာရေးအစီရင်ခံစာ')}</h2><p>${tr('Jan 1 – Dec 31 · recorded transactions only','1月1日—12月31日 · 仅汇总已记录交易','ဇန်နဝါရီ ၁ မှ ဒီဇင်ဘာ ၃၁')}</p></div><small>${currency()}</small></div>${rateText}<div class="report-annual-kpis-v201">${summary}</div><div class="report-annual-panels-v201"><section class="report-panel-v115 report-annual-panel-v201"><h2>${tr('Year vs Previous Year','本年与上年比较','ယခုနှစ်နှင့် ယခင်နှစ်')}</h2><div class="report-annual-compare-v201"><div><span>Income</span><b>${F(cur.income)}</b><small>${delta(cur.income,prev.income)} vs ${Number(state.year)-1}</small></div><div><span>Spending</span><b>${F(cur.total)}</b><small>${delta(cur.total,prev.total)} vs ${Number(state.year)-1}</small></div><div><span>Net Savings</span><b>${F(cur.remaining)}</b><small>${cur.rate.toFixed(2)}% savings rate</small></div></div></section><section class="report-panel-v115 report-annual-panel-v201"><h2>${tr('Accounts · Live Net Assets','Accounts · 实时净资产','Accounts · လက်ရှိ အသားတင်ပိုင်ဆိုင်မှု')}</h2><p class="report-annual-muted-v201">${tr('Not a historical year-end balance.','不是该年年末的历史余额。','နှစ်ကုန်လက်ကျန်မဟုတ်ပါ။')}</p>${w}</section></div>${balanceMovements}<section class="report-panel-v115 report-annual-panel-v201"><h2>${tr('12-month income & spending','12个月收支明细','၁၂ လ ဝင်ငွေနှင့် အသုံးစရိတ်')}</h2><p class="report-annual-muted-v201">${tr('Choose a month to open its monthly report. Bars show income (green) and spending (pink).','点击月份可进入该月月报。绿色为收入、粉色为支出。','လတစ်ခုကိုရွေးပြီး လစဉ်အစီရင်ခံစာကိုကြည့်ပါ။')}</p><div class="report-annual-months-v201">${monthCells}</div></section><div class="report-annual-panels-v201"><section class="report-panel-v115 report-annual-panel-v201"><h2>${tr('Top Spending Categories','年度主要支出分类','အသုံးစရိတ်အမျိုးအစား')}</h2>${cats}</section><section class="report-panel-v115 report-annual-panel-v201" id="reportAnnualBudgetPanelV201"><h2>${tr('Saved Monthly Budgets','已保存的月度预算','သိမ်းထားသော လစဉ်ဘတ်ဂျက်')}</h2><div id="reportAnnualBudgetBodyV201">${tr('Loading saved budgets…','正在读取预算…','ဘတ်ဂျက်ဖတ်နေသည်…')}</div></section></div><p class="report-annual-disclaimer-v201">${tr('Normal income and expenses determine net savings and its rate. Data Adjustment, transfers and loans are shown separately, excluded from the rate. Current balance matches Accounts net assets, not the historical year-end balance. Exchange rates are current saved reference rates. Annual budgets include only months where a budget was saved; no historical asset balance is reconstructed.','普通收支计算期间净结余与储蓄率。Data Adjustment、转账、借贷单独显示，不计入储蓄率。当前余额和 Accounts 净资产一致，不是历史年末余额。汇率使用当前保存的参考值。年度预算仅统计已保存的月份，不重建历史年末资产。','နှစ်စဉ် စာရင်းသည် မှတ်တမ်းတင်ထားသော ဝင်ငွေ၊ အသုံးစရိတ်ကို စုစည်းထားပြီး လက်ရှိငွေလဲနှုန်းကို အသုံးပြုထားသည်။')}</p>`;
    void renderBudget();
  }
  async function renderBudget(){
    if(state.mode!=='year')return;
    const key=owner()+'|'+state.year,body=$('reportAnnualBudgetBodyV201');
    if(!body)return;
    if(budgetCache.key!==key){budgetCache={key,data:null,error:false,pending:false};}
    if(!budgetCache.data&&!budgetCache.pending&&!budgetCache.error){
      if(!owner()||typeof db==='undefined'){body.textContent=tr('Sign in to load saved budgets.','登录后读取预算。','ဘတ်ဂျက်ကိုကြည့်ရန် ဝင်ရောက်ပါ။');return}
      budgetCache.pending=true;
      try{
        const result=await db.from('budgets').select('budget_month,currency,monthly_amount').eq('user_id',owner()).gte('budget_month',state.year+'-01-01').lt('budget_month',String(Number(state.year)+1)+'-01-01');
        if(result.error)throw result.error;
        if(key!==owner()+'|'+state.year||budgetCache.key!==key)return;
        budgetCache.data=Array.isArray(result.data)?result.data:[];
      }catch(e){if(key===owner()+'|'+state.year){budgetCache.error=true;console.warn('[MMHVAULT Report] Annual budgets unavailable',e)}}
      finally{if(budgetCache.key===key)budgetCache.pending=false}
    }
    if(key!==owner()+'|'+state.year||state.mode!=='year'||!$(rootId)?.classList.contains('active'))return;
    const mount=$('reportAnnualBudgetBodyV201');if(!mount)return;
    if(budgetCache.error){mount.textContent=tr('Saved budgets cannot be loaded right now. Transactions remain unchanged.','暂时无法读取预算，交易数据未改变。','ဘတ်ဂျက်ကို မဖတ်နိုင်ပါ။');return}
    if(!budgetCache.data){mount.textContent=tr('Loading budgets…','读取预算中…','ဘတ်ဂျက်ဖတ်နေသည်…');return}
    const budgets=budgetCache.data,year=collectYear(state.year);let saved=0,missing=[];
    for(const b of budgets){const c=text(b.currency||'USD').toUpperCase(),rate=fx(c);if(!(rate>0)){missing.push(c);continue}saved+=n(b.monthly_amount)/rate}
    if(missing.length){mount.textContent=tr('Missing budget exchange rate: ','缺少预算汇率：','ငွေလဲနှုန်းမရှိပါ: ')+[...new Set(missing)].join(', ');return}
    const usage=budgets.length===12&&saved>0?year.individual/saved*100:null;
    mount.innerHTML=`<div class="report-annual-budget-metrics-v201"><div><span>${tr('Budgeted months','已设预算月份','ဘတ်ဂျက်ရှိသောလ')} </span><b>${budgets.length} / 12</b></div><div><span>${tr('Saved budgets total','预算合计','ဘတ်ဂျက်စုစုပေါင်း')}</span><b>${budgets.length?F(saved):'—'}</b></div><div><span>${tr('Individual spending','日常支出','အသုံးစရိတ်')}</span><b>${F(year.individual)}</b></div><div><span>${tr('Against saved budgets','预算使用比','အသုံးစရိတ် / ဘတ်ဂျက်')}</span><b>${usage===null?'—':usage.toFixed(2)+'%'}</b></div></div><p class="report-annual-muted-v201">${tr('Partial coverage: months without a saved budget are not treated as a zero budget.','未设置预算的月份不会视为零预算；合计仅覆盖有保存记录的月份。','ဘတ်ဂျက်မသိမ်းထားသောလများကို သုညအဖြစ် မတွက်ပါ။')}</p>`;
  }
  function init(){
    loadPrefs();lastOwner=owner();alignLegacyMonth();
    if(!build())return;
    const host=document.createElement('section');host.id='reportAnnualViewV201';host.className='report-annual-view-v201';host.hidden=state.mode!=='year';
    const shell=$(rootId).querySelector('.report-shell-v115');const kpis=$('reportKpisV115');
    if(kpis)kpis.before(host);else shell.append(host);
    host.addEventListener('click',e=>{const c=e.target.closest('[data-report-month-cell-v201]');if(c)selectMonth(c.dataset.reportMonthCellV201)});
    sync();render();
    const rerender=()=>{if(owner()!==lastOwner){lastOwner=owner();loadPrefs();budgetCache={key:'',data:null,error:false,pending:false};alignLegacyMonth();}if(!$(rootId)?.classList.contains('active'))return;sync();render()};
    ['mmhvault:data-loaded','mmhvault:data-change','mmhvault:cache-restored','mmhvault:market-updated','mmhvault:page-visible','mmhvault-language-change','languagechange','mmhvault:personal-display-currency-changed','mmhvault:exchange-reference-updated'].forEach(ev=>window.addEventListener(ev,rerender,{passive:true}));
    $('reportCurrencyV115')?.addEventListener('change',rerender);
    ['mmhvault:budget-changed'].forEach(ev=>window.addEventListener(ev,()=>{budgetCache.key='';rerender()},{passive:true}));
    window.addEventListener('mmhvault:config-owner-changed',()=>{lastOwner=owner();loadPrefs();budgetCache={key:'',data:null,error:false,pending:false};alignLegacyMonth();sync();render()},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)rerender()},{passive:true});
  }
  window.MMHReportPeriodV201={get:()=>({...state}),collectYear,selectMonth,selectYear,switchMode,step};
  if(document.readyState==='complete')init();else document.addEventListener('DOMContentLoaded',init,{once:true});
})();
