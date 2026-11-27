/* Cashflow V2.0.10: opt-in workspace. No auto-mount, fetch, storage, or database writes. */
import {summarize,project,reconcile} from './mmhvault-cashflow-v2-core.mjs';
import {dateRange,previousRange,trend,actualRange} from './mmhvault-cashflow-v2-periods.mjs?v=2.0.37';
import {analyze,compare,health,history} from './mmhvault-cashflow-v2-analytics.mjs';
import {types as reportTypes,range as reportRange,report as makeReport} from './mmhvault-cashflow-v2-report.mjs?v=2.0.42';
import * as planKit from './mmhvault-cashflow-v2-planning.mjs';
import * as planView from './mmhvault-cashflow-v2-planning-view.mjs';
import {reportContext} from './mmhvault-cashflow-v2-report-context.mjs';
import {exportLocal} from './mmhvault-cashflow-v2-report-browser.mjs?v=2.0.44';
import {reportLogo,reportCell,reportTone,reportChoices,selectedReport} from './mmhvault-cashflow-v2-report-format.mjs?v=2.0.44';
import {enhanceCurrencies,actionIdentity,restoreAction} from './mmhvault-cashflow-v2-presentation.mjs?v=2.0.41';
import {summarizeMovements,movementKinds} from './mmhvault-cashflow-v2-movements.mjs';
import {investmentReport} from './mmhvault-cashflow-v2-investment.mjs';
const D={
 calendarMonthly:['Monthly','按月','လစဉ်'],calendarYearly:['Yearly','按年','နှစ်စဉ်'],calendarPrev:['Previous period','上一期','ယခင်ကာလ'],calendarNext:['Next period','下一期','နောက်ကာလ'],calendarPick:['Select period','选择周期','ကာလရွေးရန်'],
 cashflow:['Cash Flow','现金流','ငွေစီးဆင်းမှု'],analysis:['Analyze','分析','ခွဲခြမ်းစိတ်ဖြာမှု'],overviewNote:['Understand where your money comes from and goes.','了解资金的来源与去向。','ငွေဝင်ငွေထွက်ကို နားလည်ရန်'],filters:['Filters','筛选','စစ်ထုတ်ရန်'],resetFilters:['Reset filters','重置筛选','စစ်ထုတ်မှု ပြန်သတ်မှတ်ရန်'],comparison:['Period comparison','周期对比','ကာလနှိုင်းယှဉ်မှု'],weekly:['Week','周','ပတ်'],selectedPeriod:['Selected period','所选周期','ရွေးထားသောကာလ'],periodDetail:['Period details','周期明细','ကာလအသေးစိတ်'],noPrior:['No records in the prior period','上一周期暂无记录','ယခင်ကာလ မှတ်တမ်းမရှိပါ'],percentagePoints:['pp','个百分点','ရာခိုင်နှုန်းအမှတ်'],incomeLegend:['Income','收入','ဝင်ငွေ'],expenseLegend:['Spending','支出','အသုံးစရိတ်'],
 investmentReport:['Investment P/L','投资盈亏','ရင်းနှီးမြှုပ်နှံမှု အမြတ်/အရှုံး'],investmentNote:['Crypto and gold only · native currencies · current valuation, not historical assets','仅加密资产及黄金 · 原币 · 当前估值，非历史资产','Crypto နှင့် ရွှေသာ · မူရင်းငွေကြေး · လက်ရှိတန်ဖိုး'],holdingCost:['Current holding cost','当前持仓成本','လက်ရှိ ကုန်ကျစရိတ်'],holdingValue:['Current holding value (estimate)','当前持仓估值','လက်ရှိ ခန့်မှန်းတန်ဖိုး'],realized:['Lifetime realized P/L','累计已实现盈亏','စုစုပေါင်း ရရှိပြီး အမြတ်/အရှုံး'],periodRealized:['Period realized P/L','期间已实现盈亏','ကာလအတွင်း ရရှိပြီး အမြတ်/အရှုံး'],unrealized:['Current unrealized P/L','当前未实现盈亏','လက်ရှိ မရရှိသေး အမြတ်/အရှုံး'],lifetimePL:['Lifetime total P/L','累计综合盈亏','စုစုပေါင်း အမြတ်/အရှုံး'],cryptoAsset:['Crypto','加密资产','Crypto'],goldAsset:['Gold','黄金','ရွှေ'],
 movements:['Other account movements','其他账户资金变动','အခြားအကောင့်ငွေရွှေ့ပြောင်းမှု'],transfers:['Internal transfers','内部转账','အတွင်းငွေလွှဲ'],loans:['Loan movements','贷款资金变动','ချေးငွေရွှေ့ပြောင်းမှု'],adjustments:['Data Adjustment','数据调整','ဒေတာညှိနှိုင်းမှု'],inflow:['Account inflow','账户流入','အကောင့်ဝင်ငွေ'],outflow:['Account outflow','账户流出','အကောင့်ထွက်ငွေ'],movementNote:['Separate from income, expenses and investment return','独立于普通收支及投资收益','ပုံမှန်ဝင်ငွေထွက်ငွေနှင့် ရင်းနှီးမြှုပ်နှံမှုအမြတ်မှ သီးခြား'],
 monthGroup:['Month','月','လ'],quarterGroup:['Quarter','季度','သုံးလပတ်'],yearGroup:['Year','年','နှစ်'],
 expenseSplit:['Expense breakdown','支出结构','အသုံးစရိတ်ခွဲခြမ်း'],individual:['Individual expense','个人日常支出','တစ်ဦးချင်းအသုံးစရိတ်'],personal:['Personal / family','个人及家庭支出','ကိုယ်ရေးနှင့် မိသားစုအသုံးစရိတ်'],liveContext:['Current context (not historical)','当前信息（非历史）','လက်ရှိအချက်အလက် (သမိုင်းမဟုတ်)'],goalsCurrent:['Current goals','当前目标','လက်ရှိရည်မှန်းချက်'],recurringCurrent:['Current schedules','当前固定收支','လက်ရှိပုံမှန်စာရင်း'],asOf:['As of','截至','အထိ'],liquid:['Liquid assets','流动资产','ငွေသားပိုင်ဆိုင်မှု'],invested:['Invested assets','投资资产','ရင်းနှီးမြှုပ်နှံပိုင်ဆိုင်မှု'],total:['Total','总额','စုစုပေါင်း'],name:['Name','名称','အမည်'],target:['Target','目标','ရည်မှန်းချက်'],progress:['Progress','进度','တိုးတက်မှု'],frequency:['Frequency','频率','အကြိမ်ရေ'],due:['Next due','下次到期','နောက်သတ်မှတ်ရက်'],paused:['Paused','已暂停','ရပ်ထားသည်'],active:['Active','启用','အသုံးပြုနေသည်'],
 monthly:['Monthly report','月度报表','လစဉ်အစီရင်ခံစာ'],annual:['Annual report','年度报表','နှစ်စဉ်အစီရင်ခံစာ'],incomeExpense:['Income & expense report','收支报表','ဝင်ငွေထွက်ငွေအစီရင်ခံစာ'],accountBalance:['Account balance report','账户余额报表','အကောင့်လက်ကျန်အစီရင်ခံစာ'],categoryReport:['Category report','分类报表','အမျိုးအစားအစီရင်ခံစာ'],reportScope:['Report scope','报表范围','အစီရင်ခံစာအတိုင်းအတာ'],reportSummary:['Report summary','报表摘要','အစီရင်ခံစာအနှစ်ချုပ်'],metric:['Metric','指标','အညွှန်း'],value:['Value','数值','တန်ဖိုး'],unit:['Unit','单位','ယူနစ်'],start:['Start','开始','အစ'],end:['End','结束','အဆုံး'],type:['Type','类型','အမျိုးအစား'],amount:['Amount','金额','ပမာဏ'],share:['Share','占比','အချိုး'],date:['Date','日期','ရက်စွဲ'],records:['Records','记录','မှတ်တမ်းများ'],originalAmount:['Original amount','原始金额','မူလပမာဏ'],assetChange:['Asset change','资产变化','ပိုင်ဆိုင်မှုပြောင်းလဲမှု'],nonCashflowChange:['Non-cashflow change','非现金流变化','အခြားပြောင်းလဲမှု'],missingBalance:['Verified balance snapshots unavailable','缺少已验证余额快照','လက်ကျန်မှတ်တမ်းမရရှိပါ'],exportError:['Export failed or session changed','导出失败或会话已变更','ထုတ်ယူမှု မအောင်မြင်ပါ'],reportType:['Report type','报表类型','အစီရင်ခံစာအမျိုးအစား'],customReport:['Custom report','自定义报表','စိတ်ကြိုက်အစီရင်ခံစာ'],
 accounts:['Account analysis','账户分析','အကောင့်ခွဲခြမ်းစိတ်ဖြာမှု'],currencies:['Currency analysis','币种分析','ငွေကြေးခွဲခြမ်းစိတ်ဖြာမှု'],ranking:['Expense ranking','支出排行','အသုံးစရိတ်အဆင့်'],fixed:['Fixed','固定支出','ပုံသေအသုံးစရိတ်'],variable:['Variable','非固定支出','ပြောင်းလဲအသုံးစရိတ်'],unknown:['Unclassified','未分类','မခွဲခြားရသေး'],spending:['Spending structure','支出结构','အသုံးစရိတ်ဖွဲ့စည်းပုံ'],health:['Financial health','财务健康','ဘဏ္ဍာရေးကျန်းမာရေး'],expenseRatio:['Expense ratio','支出率','အသုံးစရိတ်နှုန်း'],cashRatio:['Cash ratio','现金占比','ငွေသားအချိုး'],investmentRatio:['Investment ratio','投资占比','ရင်းနှီးမြှုပ်နှံမှုအချိုး'],emergencyMonths:['Emergency reserve (months)','应急储备（月）','အရေးပေါ်ရန်ပုံငွေ (လ)'],score:['Health score','健康评分','ကျန်းမာရေးရမှတ်'],delta:['Change','变化','ပြောင်းလဲမှု'],large:['Large expenses','大额消费','အကြီးစားအသုံးစရိတ်'],threshold:['Minimum amount','最低金额','အနည်းဆုံးပမာဏ'],avgExpense:['Average expense','单笔平均支出','ပျမ်းမျှအသုံးစရိတ်'],historyNote:['Verified historical snapshots only','仅显示已验证历史快照','အတည်ပြုပြီး မှတ်တမ်းများသာ'],priorNote:['Prior equal-length period','前一等长周期','ယခင်အလားတူကာလ'],
 summary:['Summary','概览','အနှစ်ချုပ်'],planning:['Planning','规划','အစီအစဉ်'],report:['Report','报表','အစီရင်ခံစာ'],close:['Close','关闭','ပိတ်ရန်'],currency:['Display currency','显示币种','ပြသငွေကြေး'],period:['Period','统计周期','ကာလ'],income:['Total income','总收入','စုစုပေါင်းဝင်ငွေ'],expense:['Total expenses','总支出','စုစုပေါင်းအသုံးစရိတ်'],net:['Net cashflow','净现金流','အသားတင်ငွေစီးဆင်းမှု'],savings:['Savings rate','储蓄率','စုဆောင်းနှုန်း'],trend:['Cashflow trend','现金流趋势','ငွေစီးဆင်းမှုလမ်းကြောင်း'],sources:['Income sources','收入来源','ဝင်ငွေရင်းမြစ်များ'],categories:['Expense categories','支出类别','အသုံးစရိတ်အမျိုးအစား'],balance:['Balance summary','余额汇总','လက်ကျန်အနှစ်ချုပ်'],opening:['Opening balance','期初余额','အစလက်ကျန်'],closing:['Closing balance','期末余额','အဆုံးလက်ကျန်'],change:['Asset change','资产变化','ပိုင်ဆိုင်မှုပြောင်းလဲမှု'],other:['Non-cashflow change','非现金流变化','အခြားပြောင်းလဲမှု'],forecast:['Future assets','未来资产','အနာဂတ်ပိုင်ဆိုင်မှု'],budget:['Budget','预算','အသုံးစရိတ်အစီအစဉ်'],goals:['Goals','目标','ရည်မှန်းချက်များ'],recurring:['Recurring','固定收支','ပုံမှန်ဝင်ငွေထွက်ငွေ'],current:['Current actual assets','当前实际资产','လက်ရှိပိုင်ဆိုင်မှု'],monthlyIncome:['Monthly income','每月收入','လစဉ်ဝင်ငွေ'],monthlyExpense:['Monthly expenses','每月支出','လစဉ်အသုံးစရိတ်'],estimated:['Projected assets','预计资产','ခန့်မှန်းပိုင်ဆိုင်မှု'],monthlyNet:['Monthly net','每月净储蓄','လစဉ်အသားတင်'],used:['Used','已使用','အသုံးပြုပြီး'],remaining:['Remaining','剩余','ကျန်ရှိ'],manage:['Manage','管理','စီမံရန်'],history:['History','历史','မှတ်တမ်း'],details:['Details','详情','အသေးစိတ်'],unavailable:['Data not ready or unavailable','数据未就绪或不可用','ဒေတာမရရှိသေးပါ'],noData:['No records','暂无记录','မှတ်တမ်းမရှိပါ'],missing:['Missing valid rates or invalid data; totals withheld.','缺少有效汇率或数据异常，暂不汇总。','ငွေလဲနှုန်း သို့မဟုတ် ဒေတာမပြည့်စုံပါ။'],projectionNote:['Estimate only · not included in actual balances','仅为预测，不计入实际余额','ခန့်မှန်းချက်သာဖြစ်ပြီး လက်ကျန်တွင်မပါဝင်ပါ'],account:['Account','账户','အကောင့်'],category:['Category','类别','အမျိုးအစား'],all:['All','全部','အားလုံး'],original:['Original currency','原始币种','မူလငွေကြေး'],today:['Today','今天','ယနေ့'],week:['This week','本周','ယခုအပတ်'],month:['This month','本月','ယခုလ'],lastMonth:['Last month','上月','ပြီးခဲ့သောလ'],quarter:['This quarter','本季度','ယခုသုံးလပတ်'],year:['This year','今年','ယခုနှစ်'],lastYear:['Last year','去年','ပြီးခဲ့သောနှစ်'],allTime:['All time','全部时间','အချိန်အားလုံး'],custom:['Custom range','自定义','စိတ်ကြိုက်ကာလ'],day:['Day','日','ရက်'],months:['Months','月数','လများ'],apply:['Apply','应用','အသုံးပြုရန်'],previous:['Previous period','上一周期','ယခင်ကာလ'],print:['Print','打印','ပုံနှိပ်ရန်'],export:['Export CSV','导出 CSV','CSV ထုတ်ရန်'],invalid:['Invalid selection','筛选无效','ရွေးချယ်မှု မမှန်ကန်ပါ']
};
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeNum=v=>typeof v==='number'&&Number.isFinite(v);
const symbols={report:'M7 3h7l4 4v14H7z M14 3v5h5 M10 12h5 M10 16h5',history:'M3 12a9 9 0 1 0 3-7 M3 3v6h6 M12 7v5l3 2',manage:'M4 7h16M4 17h16M8 4v6M16 14v6',details:'M5 5h14v14H5z M9 9h6M9 13h6',close:'M6 6l12 12M18 6L6 18'};
const icon=k=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="'+symbols[k]+'"/></svg>';
const presets=['today','week','month','lastMonth','quarter','year','lastYear','all','custom'];
export function mountCashflowV2(root,adapter){
 if(!root||typeof adapter?.owner!=='function'||typeof adapter?.read!=='function'||typeof adapter?.today!=='function')throw new TypeError('Explicit workspace adapter required');
 const doc=root.ownerDocument,win=doc.defaultView;let owner=null,tab='summary',preset='month',currency='USD',grain='week',custom={},account='',category='',original='',horizon=12,selected='',dialog='',largeThreshold='',reportType='monthly',reportSelection={},reportSections={},reportCurrency='',exportError='',last=null,disposed=false;
 let filtersOpen=false,calendarKey='',planGrain='month',budgetPeriod='month',budgetKey='',planEdit=null,planConfirm='',planError=false,opener=null,paintedDialog='';
 const lang=()=>adapter.language?.()==='zh'?1:adapter.language?.()==='my'?2:0;
 const tr=k=>D[k]?.[lang()]||k;
 const locale=()=>['en','zh-CN','my-MM'][lang()];
 const fmt=(v,c=currency)=>safeNum(v)?new Intl.NumberFormat(locale(),{maximumFractionDigits:2,minimumFractionDigits:2}).format(v)+' '+c:'—';
 const pct=v=>safeNum(v)?new Intl.NumberFormat(locale(),{style:'percent',maximumFractionDigits:1}).format(v):'—';
 const btn=(action,k)=>'<button type="button" class="cfv2-icon" data-action="'+e(action)+'" aria-label="'+e(tr(k))+'" title="'+e(tr(k))+'">'+icon(k)+'</button>';
 const sharedFilterIds={"preset":"mmhCfV238Preset","account":"mmhCfV238Account","category":"mmhCfV238Category","original":"mmhCfV238Original"};
 const select=(name,values,value,label)=>'<label><span>'+e(tr(label))+'</span><select'+(adapter.releaseReadOnly&&Object.hasOwn(sharedFilterIds,name)?' id="'+sharedFilterIds[name]+'"':'')+(name==='reportCurrency'?' name="currency"':'')+' data-field="'+name+'">'+values.map(([v,l])=>'<option value="'+e(v)+'"'+(v===value?' selected':'')+'>'+e(l)+'</option>').join('')+'</select></label>';
 const filterSelect=(name,values,value,label)=>{
  if(!adapter.releaseReadOnly)return select(name,values,value,label);
  const selectedLabel=values.find(([v])=>v===value)?.[1]||tr('all');
  return '<div class="cfv2-inline-field"><span>'+e(tr(label))+'</span><details name="'+(name==='reportType'?'cfv2-report-pickers':'cfv2-inline-filters')+'" class="cfv2-inline-picker" data-filter-field="'+e(name)+'"><summary aria-label="'+e(tr(label)+': '+selectedLabel)+'">'+e(selectedLabel)+'</summary><div class="cfv2-inline-options" role="group" aria-label="'+e(tr(label))+'">'+values.map(([v,l])=>'<button type="button" data-filter-option="'+e(v)+'" aria-pressed="'+(v===value)+'"><span>'+e(l)+'</span><span aria-hidden="true">'+(v===value?'✓':'')+'</span></button>').join('')+'</div></details><select hidden tabindex="-1" aria-hidden="true" data-field="'+e(name)+'">'+values.map(([v,l])=>'<option value="'+e(v)+'"'+(v===value?' selected':'')+'>'+e(l)+'</option>').join('')+'</select></div>';
 };
 const card=(title,body,action='',kind='details')=>'<section class="cfv2-card"><header><h2>'+e(tr(title))+'</h2>'+(action?btn(action,kind):'')+'</header>'+body+'</section>';
 const metric=(k,v,kind='')=>'<div class="cfv2-metric '+kind+'"><span>'+e(tr(k))+'</span><strong>'+e(v)+'</strong></div>';
 const empty=k=>'<p class="cfv2-muted">'+e(tr(k))+'</p>';
 const items=(arr)=>arr?.length?'<div class="cfv2-list">'+arr.map(x=>'<div><span>'+e(x.name)+'</span><strong>'+e(fmt(x.amount))+'</strong></div>').join('')+'</div>':empty('noData');
 function reset(next){owner=next;tab='summary';preset='month';currency='USD';grain='week';filtersOpen=false;calendarKey='';custom={};account=category=original=selected=dialog='';horizon=12;largeThreshold='';reportType='monthly';reportSelection={};reportSections={};reportCurrency='';exportError='';last=null;planGrain='month';budgetPeriod='month';budgetKey='';planEdit=null;planConfirm='';planError=false;opener=null;paintedDialog=''}
 function currentKey(mode,today){return mode==='month'?today.slice(0,7):today.slice(0,4)}
 function calendarBounds(mode,key,today){
  if(!['month','year'].includes(mode)||!key||key>currentKey(mode,today))return null;
  if(!(mode==='month'?/^\d{4}-(0[1-9]|1[0-2])$/:/^\d{4}$/).test(key)||Number(key.slice(0,4))<1900)return null;
  const y=Number(key.slice(0,4)),m=mode==='month'?Number(key.slice(5,7)):12;
  const start=mode==='month'?key+'-01':key+'-01-01',end=new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
  return dateRange('custom',today,null,{start,end});
 }
 function stepCalendar(mode,key,n,today){
  const y=Number(key.slice(0,4)),m=mode==='month'?Number(key.slice(5,7))-1:0;
  const d=new Date(Date.UTC(y+(mode==='year'?n:0),m+(mode==='month'?n:0),1));
  const next=mode==='month'?d.toISOString().slice(0,7):d.toISOString().slice(0,4);
  return calendarBounds(mode,next,today)?next:null;
 }
 function calendarControls(){
  const today=adapter.today(),mode=['month','year'].includes(preset)?preset:'',key=calendarKey||currentKey(mode,today);
  const toggle='<div class="cfv2-calendar-toggle" role="group" aria-label="'+e(tr('period'))+'">'+['month','year'].map(k=>'<button type="button" data-action="calendar-mode" data-key="'+k+'" aria-pressed="'+(mode===k)+'">'+e(tr(k==='month'?'calendarMonthly':'calendarYearly'))+'</button>').join('')+'</div>';
  if(!mode)return toggle;
  const prev=stepCalendar(mode,key,-1,today),next=stepCalendar(mode,key,1,today);
  const arrow=(n,label,enabled,glyph)=>'<button type="button" data-action="calendar-step" data-key="'+n+'" aria-label="'+e(tr(label))+'" title="'+e(tr(label))+'"'+(enabled?'':' disabled')+'>'+glyph+'</button>';
  const input='<input type="'+(mode==='month'?'month':'number')+'" data-field="calendarKey" aria-label="'+e(tr('calendarPick'))+'" value="'+e(key)+'" min="'+(mode==='month'?'1900-01':'1900')+'" max="'+e(currentKey(mode,today))+'"'+(mode==='year'?' step="1"':'')+'>';
  return toggle+'<div class="cfv2-calendar-nav">'+arrow(-1,'calendarPrev',prev,'‹')+input+arrow(1,'calendarNext',next,'›')+'</div>';
 }
 function snapshot(){
  const uid=adapter.owner();if(uid!==owner)reset(uid);
  if(!uid)return null;
  const source=adapter.read();if(adapter.owner()!==uid||source?.owner!==uid||source.ready!==true||!Array.isArray(source.rows)||source.rows.some(r=>r?.user_id!==uid))return null;
  const codes=[...new Set(['USD',...(source.currencies||[])])].filter(c=>/^[A-Z]{3}$/.test(c));
  if(!codes.includes(currency))currency='USD';
  const today=adapter.today(),range=(calendarKey&&['month','year'].includes(preset)?calendarBounds(preset,calendarKey,today):null)||dateRange(preset,today,source.earliest,custom),scope={...range,currency,accounts:account?[account]:[],categories:category?[category]:[],originalCurrencies:original?[original]:[]};
  const args={rows:source.rows,scope,accountRate:source.accountRate,displayRate:source.displayRate,groupOf:source.groupOf,isLinkedInvestment:source.isLinkedInvestment};
  const movements=summarizeMovements(args),investmentSource=source.investmentSource?.(),investment=investmentReport({owner:uid,source:investmentSource,scope,today});
  const data=summarize(args),prev=summarize({...args,scope:{...scope,...previousRange(range)}}),series=data.complete?trend(data.included,range,grain):[];
  const analytics=analyze(data,{fixedOf:source.fixedOf,largeThreshold:largeThreshold.trim()!==''?Number(largeThreshold):null});
  const comparison=compare(data.totals,prev.totals);
  const plan=source.planning?.(currency)||null;
  const normalized=planKit.validPlan(plan);
  const target=normalized?plan.goals.find(g=>g.kind==='savingsRate')?.target:null;
  const hs={...(source.healthInputs?.(currency)||{}),...(target!=null?{savingsTarget:target}:{})};
  const months=[];let anchor=today;
  for(let i=0;i<3;i++){const p=dateRange('lastMonth',anchor);months.unshift(summarize({...args,scope:{...p,currency,accounts:[],categories:[],originalCurrencies:[]}}));anchor=p.start;}
  const healthData=health({...hs,threeMonths:months});
  const historyData=history({rows:source.verifiedHistory?.(),owner:uid,currency,rate:source.displayRate(currency)});
  const balances=source.balances?.(scope)||{};
  const currentAssets=source.currentAssets?.(currency)??null;
  const bal=reconcile({opening:balances.opening,closing:balances.closing,net:data.totals.net});
  let planModel=null;
  if(normalized){
   const actual=(period,key,c)=>{const r=planKit.bounds(period,key);if(!r||r.start>today)return null;return summarize({...args,scope:{...actualRange(r,today),currency:c,accounts:[],categories:[],originalCurrencies:[]}})};
   const bk=budgetKey||(budgetPeriod==='year'?today.slice(0,4):today.slice(0,7)),b=plan.budgets.find(x=>x.period===budgetPeriod&&x.key===bk);
   const goals=plan.goals.map(g=>{const period=g.kind==='annualSavings'?'year':'month',key=g.kind==='savingsRate'?today.slice(0,7):g.key,c=g.kind==='savingsRate'?currency:g.currency;return {...g,...planKit.goalStatus(g,actual(period,key,c))}});
   planModel={forecast:planKit.forecast(plan,{opening:currentAssets,today,months:horizon,currency,rate:source.displayRate,accountRate:source.accountRate}),budget:b?{...b,...planKit.budgetStatus(b,actual(b.period,b.key,b.currency))}:null,goals,recurring:planKit.recurringMonth(plan.recurring,today.slice(0,7),currency,source.displayRate,source.accountRate)};
  }
  let reportModel=null;
  if(dialog==='report'){const sel={month:today.slice(0,7),year:today.slice(0,4),start:range.start,end:range.end,...reportSelection};try{const rc=codes.includes(reportCurrency)?reportCurrency:currency,rr=actualRange(reportRange(reportType,sel,range,today),today),rs={...scope,...rr,currency:rc},rd=summarize({...args,scope:rs}),ra=analyze(rd,{fixedOf:source.fixedOf}),rb=source.balances?.(rs)||{};const reportActual=(period,key,c)=>{const r=planKit.bounds(period,key);if(!r||r.start>today)return null;return summarize({...args,scope:{...actualRange(r,today),currency:c,accounts:[],categories:[],originalCurrencies:[]}})};const context=reportContext({scope:rs,today,plan:source.planning?.(rc)||null,actual:reportActual,prior:summarize({...args,scope:{...rs,...previousRange(rs)}}),currentAssets:source.currentAssets?.(rc)??null,healthInputs:source.healthInputs?.(rc)});reportModel=makeReport({context,investment:investmentReport({owner:uid,source:investmentSource,scope:rs,today}),movements:summarizeMovements({...args,scope:rs}),type:reportType,scope:rs,data:rd,analytics:ra,balances:reconcile({...rb,net:rd.totals.net}),history:history({rows:source.verifiedHistory?.(),owner:uid,currency:rc,rate:source.displayRate(rc)}),label:tr});}catch{reportModel=null}}
  if(adapter.owner()!==uid||source.isCurrent?.()===false)return null;
  return {source,codes,range,scope,data,movements,investment,prev,series,bal,plan,planModel,currentAssets,analytics,comparison,healthData,historyData,reportModel};
 }
 function chart(series){
  if(!series.length)return empty('noData');
  const max=Math.max(1,...series.map(x=>Math.max(x.income,x.expense)));
  return '<div class="cfv2-chart-scroll"><div class="cfv2-chart">'+series.map(b=>'<button type="button" data-action="point" data-key="'+e(b.key)+'" title="'+e(b.key+' · '+tr('income')+' '+fmt(b.income)+' · '+tr('expense')+' '+fmt(b.expense))+'" aria-label="'+e(b.key+' '+fmt(b.net))+'"><span class="cfv2-bars"><i style="height:'+Math.max(0,b.income/max*100)+'%"></i><i style="height:'+Math.max(0,b.expense/max*100)+'%"></i></span><small>'+e(b.key)+'</small></button>').join('')+'</div></div>';
 }
 function dimension(rows){return rows?.length?'<div class="cfv2-list">'+rows.map(r=>'<div><span>'+e(r.name)+'</span><strong>'+e(fmt(r.income)+' / '+fmt(r.expense))+'</strong></div>').join('')+'</div>':empty('noData')}
 function rank(rows){return rows?.length?'<div class="cfv2-list">'+rows.map(r=>'<div><span>'+e(r.category)+' · '+e(r.date)+' · '+e(r.account)+'</span><strong>'+e(fmt(r.amount))+'</strong></div>').join('')+'</div>':empty('noData')}
 function historyList(rows){return rows?.length?'<div class="cfv2-list">'+rows.map(r=>'<div><span>'+e(r.date)+'</span><strong>'+e(fmt(r.amount))+'</strong></div>').join('')+'</div>':empty('unavailable')}
 function healthPanel(h){return '<div class="cfv2-metrics">'+metric('score',h.score===null?'—':h.score+' / 100')+metric('savings',pct(h.savingsRate))+metric('expenseRatio',pct(h.expenseRatio))+metric('cashRatio',pct(h.cashRatio))+metric('investmentRatio',pct(h.investmentRatio))+metric('emergencyMonths',safeNum(h.emergencyMonths)?h.emergencyMonths.toFixed(1):'—')+'</div>'}
 function categoryBars(rows){return rows?.length?'<div class="cfv2-list">'+rows.map(r=>'<div><span>'+e(r.name)+'<progress max="100" value="'+Math.max(0,Math.min(100,(r.share??0)*100))+'"></progress></span><strong>'+e(fmt(r.amount)+' · '+pct(r.share))+'</strong></div>').join('')+'</div>':empty('noData')}
 function analysisPanel(s){const a=s.analytics;if(!a)return empty('missing');return '<div class="cfv2-pair">'+card('accounts',dimension(a.accounts.slice(0,5)),'accounts')+card('currencies',dimension(a.currencies.slice(0,5)),'currencies')+'</div>'+ '<div class="cfv2-pair">'+card('spending','<div class="cfv2-metrics">'+metric('fixed',fmt(a.fixed.fixed))+metric('variable',fmt(a.fixed.variable))+metric('unknown',fmt(a.fixed.unknown))+metric('avgExpense',fmt(a.averageExpense))+metric('individual',fmt(s.data.totals.individual))+metric('personal',fmt(s.data.totals.personal))+'</div>')+card('ranking',rank(a.ranked.slice(0,5)),'ranking')+'</div>'+card('health',healthPanel(s.healthData),'health')}
 function movementPanel(m,detail=false){return '<p class="cfv2-muted">'+e(tr('movementNote'))+'</p><div class="cfv2-list">'+movementKinds.map(k=>{const v=m.groups[k];return '<div><span>'+e(tr(k)+' · '+v.count)+'</span><strong>'+e(detail?tr('inflow')+' '+fmt(v.inflow)+' / '+tr('outflow')+' '+fmt(v.outflow)+' / '+tr('net')+' '+fmt(v.net):fmt(v.net))+'</strong></div>'}).join('')+'</div>'}
 function investmentPanel(m,detail=false){if(!m)return empty('unavailable');return '<p class="cfv2-muted">'+e(tr('investmentNote')+' · '+m.asOf)+'</p>'+m.rows.map(r=>'<section><h2>'+e(tr(r.asset==='Gold'?'goldAsset':'cryptoAsset')+' · '+r.currency)+'</h2><div class="cfv2-metrics">'+metric('periodRealized',fmt(r.periodRealized,r.currency))+(detail?metric('holdingCost',fmt(r.cost,r.currency))+metric('holdingValue',fmt(r.value,r.currency))+metric('realized',fmt(r.realized,r.currency))+metric('unrealized',fmt(r.unreal,r.currency))+metric('lifetimePL',fmt(r.total,r.currency)):'')+'</div></section>').join('')}
 function kpis(s){
  const t=s.data.totals;
  return '<div class="cfv2-metrics cfv2-kpis">'+metric('income',fmt(t.income),'positive')+metric('expense',fmt(t.expense),'negative')+metric('net',fmt(t.net),safeNum(t.net)&&t.net>=0?'positive':'negative')+metric('savings',pct(t.savingsRate),safeNum(t.savingsRate)&&t.savingsRate>=0?'positive':'')+'</div>';
 }
 function comparePanel(s){
  if(!s.data.complete||!s.prev.complete)return empty('missing');
  const rows=[['income','income'],['expense','expense'],['net','net'],['savings','savingsRate']];
  return '<p class="cfv2-muted">'+e(tr('priorNote')+' · '+previousRange(s.range).start+' – '+previousRange(s.range).end+(!s.prev.included.length?' · '+tr('noPrior'):''))+'</p><div class="cfv2-report-table"><table><thead><tr>'+['metric','selectedPeriod','previous','delta'].map(k=>'<th>'+e(tr(k))+'</th>').join('')+'</tr></thead><tbody>'+rows.map(([label,key])=>{const f=key==='savingsRate'?pct:fmt,hasPrior=s.prev.included.length>0,delta=s.comparison[key].delta;return '<tr><td>'+e(tr(label))+'</td><td>'+e(f(s.data.totals[key]))+'</td><td>'+e(hasPrior?f(s.prev.totals[key]):'—')+'</td><td>'+e(!hasPrior||!safeNum(delta)?'—':key==='savingsRate'?(delta*100).toFixed(1)+' '+tr('percentagePoints'):fmt(delta))+'</td></tr>'}).join('')+'</tbody></table></div>';
 }
 function summary(s){
  const {data,series}=s,point=series.find(x=>x.key===selected);
  const notice=data.complete?'':'<p role="status" class="cfv2-warning">'+e(tr('missing'))+' ('+data.issues.length+')</p>'+card('original','<div class="cfv2-list">'+data.original.map(x=>'<div><span>'+e(x.currency)+'</span><strong>'+e(fmt(x.income,x.currency)+' / '+fmt(x.expense,x.currency))+'</strong></div>').join('')+'</div>');
  const legend='<div class="cfv2-legend"><span>'+e(tr('incomeLegend'))+'</span><span>'+e(tr('expenseLegend'))+'</span></div>';
  const trendBody='<div class="cfv2-chart-head">'+select('grain',['day','week','month','quarter','year'].map(k=>[k,tr(k==='week'?'weekly':k==='day'?k:k+'Group')]),grain,'period')+legend+'</div>'+chart(series)+(point?'<p class="cfv2-muted">'+e(point.key+' · '+tr('income')+' '+fmt(point.income)+' · '+tr('expense')+' '+fmt(point.expense)+' · '+tr('net')+' '+fmt(point.net))+'</p>':'');
  return notice+'<div class="cfv2-overview-grid">'+card('trend',trendBody,'trend','details')+card('categories',categoryBars(s.analytics?.categories),'categories')+'</div>'+card('periodDetail',series.length?'<div class="cfv2-report-table"><table><thead><tr>'+['period','incomeLegend','expenseLegend','net'].map(k=>'<th>'+e(tr(k))+'</th>').join('')+'</tr></thead><tbody>'+series.map(r=>'<tr><td>'+e(r.key)+'</td><td>'+e(fmt(r.income))+'</td><td>'+e(fmt(r.expense))+'</td><td>'+e(fmt(r.net))+'</td></tr>').join('')+'</tbody></table></div>':empty(data.complete?'noData':'missing'));
 }
 function analysisPage(s){
  const bal=s.bal;
  return (s.data.complete?'':'<p role="status" class="cfv2-warning">'+e(tr('missing'))+'</p>')+'<div class="cfv2-overview-grid">'+card('comparison',comparePanel(s))+card('sources',items(s.data.incomeSources),'sources')+'</div>'+analysisPanel(s)+
   '<div class="cfv2-pair">'+card('movements',movementPanel(s.movements),'movements')+card('investmentReport',investmentPanel(s.investment),'investmentReport')+'</div>'+
   card('balance','<div class="cfv2-metrics">'+metric('opening',fmt(bal.opening))+metric('closing',fmt(bal.closing))+metric('change',fmt(bal.change))+metric('other',fmt(bal.nonCashflowChange))+'</div>'+metric('current',fmt(s.currentAssets)),'balance','history');
 }
 function planContext(s){
  const today=adapter.today(),bk=budgetKey||(budgetPeriod==='year'?today.slice(0,4):today.slice(0,7));
  const text=(en,zh,my)=>[en,zh,my][lang()];
  return {l:lang(),fmt,card,codes:s.codes,currency,today,budgetPeriod,grain:planGrain,writable:adapter.planningMode==='synthetic'&&typeof adapter.writePlanning==='function',
   horizonControl:'<label>'+e(tr('months'))+'<input data-field="planHorizon" type="number" min="1" max="240" step="1" value="'+horizon+'"></label>'+select('planPreset',[...new Set([1,3,6,12,36,60,horizon])].sort((a,b)=>a-b).map(n=>[String(n),String(n)]),String(horizon),'months'),
   grainControl:select('planGrain',['month','year'].map(k=>[k,tr(k+'Group')]),planGrain,'period'),
   budgetControl:select('budgetPeriod',['month','year'].map(k=>[k,tr(k+'Group')]),budgetPeriod,'period')+'<label>'+e(text('Budget period','预算周期','ဘတ်ဂျက်ကာလ'))+'<input data-field="budgetKey" type="'+(budgetPeriod==='year'?'number':'month')+'" '+(budgetPeriod==='year'?'min="1900" max="2299" step="1"':'')+' value="'+e(bk)+'"></label>'};
 }
 function planning(s){
  if(s.planModel)return planView.panel(planContext(s),s.planModel);
  const p=s.plan||{},f=p.forecast||{},b=p.budget||{},g=p.goals,r=p.recurring;
  let forecast=null;try{forecast=project({opening:f.opening,months:horizon,monthlyIncome:f.monthlyIncome,monthlyExpense:f.monthlyExpense})}catch{}
  const values=forecast?.points||[],low=Math.min(0,...values.map(x=>x.amount)),high=Math.max(1,...values.map(x=>x.amount)),span=high-low;
  const graph=values.length?'<svg class="cfv2-line" viewBox="0 0 600 140" role="img" aria-label="'+e(tr('forecast'))+'"><polyline fill="none" stroke="currentColor" stroke-width="2" points="'+values.map((x,i)=>(10+i*580/(values.length-1))+','+(130-(x.amount-low)*120/span)).join(' ')+'"/></svg>':'';
  const forecastBody='<p class="cfv2-muted">'+e(tr('projectionNote'))+'</p><div class="cfv2-metrics">'+metric('current',fmt(f.opening))+metric('monthlyIncome',fmt(f.monthlyIncome))+metric('monthlyExpense',fmt(f.monthlyExpense))+metric('estimated',fmt(values.at(-1)?.amount))+'</div>'+select('horizon',[1,3,6,12,36,60].map(n=>[String(n),String(n)]),String(horizon),'months')+graph;
  const budgetBody='<div class="cfv2-metrics">'+metric('budget',fmt(b.total))+metric('used',fmt(b.used))+metric('remaining',fmt(safeNum(b.total)&&safeNum(b.used)?b.total-b.used:null))+'</div>'+(safeNum(b.total)&&b.total>0&&safeNum(b.used)?'<progress max="100" value="'+Math.max(0,Math.min(100,b.used/b.total*100))+'"></progress><small>'+e(pct(b.used/b.total))+'</small>':'');
  const list=(arr)=>Array.isArray(arr)?items(arr):empty('unavailable');
  return card('forecast',forecastBody,'forecast','manage')+'<div class="cfv2-pair">'+card('budget',budgetBody,'budget','manage')+card('goals',list(g),'goals','manage')+'</div>'+card('recurring','<div class="cfv2-metrics">'+metric('monthlyIncome',fmt(r?.income))+metric('monthlyExpense',fmt(r?.expense))+metric('monthlyNet',fmt(safeNum(r?.income)&&safeNum(r?.expense)?r.income-r.expense:null))+'</div>'+list(r?.rows),'recurring','manage');
 }
 function modal(s){
  if(!dialog)return '';
  let body='',title=dialog;
  if(dialog.startsWith('plan-')&&s.planModel){const section=dialog.slice(5);title=section==='trend'?'forecast':section;body=planView.dialog(planContext(s),s.planModel,s.plan,section,planEdit,planConfirm,planError)}
  else if(dialog==='report'){
   const choices=reportChoices(s.reportModel,locale()),m=selectedReport(s.reportModel,reportSections,locale()),sel={month:adapter.today().slice(0,7),year:adapter.today().slice(0,4),start:s.range.start,end:s.range.end,...reportSelection};
   const field=(k,type)=>'<label class="cfv2-rp-date"><span>'+e(tr(k==='month'?'calendarMonthly':k==='year'?'calendarYearly':k))+'</span><input type="'+type+'" data-field="report-'+k+'"'+(k==='year'?' min="1900" max="2099" step="1"':'')+' value="'+e(sel[k])+'"></label>';
   const controls=filterSelect('reportType',reportTypes.map(k=>[k,tr(k==='category'?'categoryReport':k==='custom'?'customReport':k)]),reportType,'reportType')+(reportType==='monthly'?field('month','month'):reportType==='annual'?field('year','number'):reportType==='custom'?field('start','date')+field('end','date'):'')+ '<div class="cfv2-rp-currency"><span>'+e(tr('currency'))+'</span>'+select('reportCurrency',s.codes.map(c=>[c,c]),s.codes.includes(reportCurrency)?reportCurrency:currency,'currency')+'</div>';
   const selectionTitle=['Report content','报表内容','အစီရင်ခံစာ အကြောင်းအရာ'][lang()],selectionHint=['Choose the sections for preview and all exports','勾选需要预览及导出的内容','ကြည့်ရှုရန်နှင့် ထုတ်ယူရန် အပိုင်းများကို ရွေးပါ'][lang()];
   const selector=choices.length?'<details class="cfv2-rp-content"'+(m.sections.length===1?' open':'')+'><summary><strong>'+e(selectionTitle)+'</strong><small>'+String(m.sections.length-1)+' / '+choices.length+'</small></summary><p>'+e(selectionHint)+'</p><div class="cfv2-rp-checks">'+choices.map(x=>'<label><input type="checkbox" data-field="report-section" value="'+e(x.key)+'"'+((Object.hasOwn(reportSections,x.key)?reportSections[x.key]:x.defaultSelected)?' checked':'')+'><span>'+e(x.name)+'</span></label>').join('')+'</div></details>':'';
   const buttons=m?.exportable?'<div class="cfv2-export">'+['PDF','XLSX','CSV','PNG','Print'].map((v,i)=>'<button type="button" data-action="export-report" data-key="'+['pdf','xlsx','csv','image','print'][i]+'">'+'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="'+(v==='Print'?'M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z':'M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4')+'"/></svg><span>'+e(v==='Print'?tr('print'):v)+'</span>'+'</button>').join('')+'</div>':'';
   const preview=section=>{
    const cell=(r,i)=>e(reportCell(section,r,i,locale())),heading='<h2>'+e(section.key==='expenseSplit'&&section.keys.includes('category')?(lang()===1?'支出分类明细':lang()===2?'အသုံးစရိတ် အမျိုးအစား အသေးစိတ်':'Expense category details'):section.name)+'</h2>';
    if(section.key==='reportScope')return '<section class="cfv2-rp-scope">'+heading+'<div>'+section.rows.slice(1).filter((r,i)=>i<3||r[1]!==tr('all')).map(r=>'<span><small>'+e(r[0])+'</small> '+e(r[1]??'—')+'</span>').join('')+'</div></section>';
    if(section.key==='reportSummary')return '<section class="cfv2-rp-summary">'+heading+'<div class="cfv2-rp-kpis">'+section.rows.map(r=>'<div class="cfv2-rp-kpi cfv2-rp-'+reportTone(section,r,1)+(typeof r[1]==='number'&&r[1]<0?' cfv2-rp-negative':'')+'"><small>'+e(r[0])+'</small><strong>'+cell(r,1)+'</strong>'+(r[2]==='ratio'?'':'<small>'+e(r[2])+'</small>')+'</div>').join('')+'</div></section>';
    const unit=section.keys.indexOf('unit'),uniformUnit=unit>=0&&section.rows.length>0&&section.rows.every(r=>r[unit]===m.scope.currency),indices=section.keys.map((_,i)=>i).filter(i=>!uniformUnit||i!==unit);
    const table='<div class="cfv2-report-table"><table><thead><tr>'+indices.map(i=>'<th scope="col"'+(['amount','share','income','expense','net'].includes(section.keys[i])?' class="cfv2-rp-number"':'')+'>'+e(section.headers[i])+'</th>').join('')+'</tr></thead><tbody>'+section.rows.map(r=>'<tr>'+indices.map(i=>{const v=r[i],share=section.keys[i]==='share'&&typeof v==='number'&&Number.isFinite(v),tone=reportTone(section,r,i);return '<td class="'+(typeof v==='number'?'cfv2-rp-number ':'')+'cfv2-rp-'+tone+'">'+(share?'<div class="cfv2-rp-share"><meter min="0" max="1" value="'+Math.max(0,Math.min(1,v))+'" aria-label="'+cell(r,i)+'"></meter><span>'+cell(r,i)+'</span></div>':cell(r,i))+'</td>'}).join('')+'</tr>').join('')+'</tbody></table></div>';
    if(section.key==='records'||['history','movements','investmentReport','investmentNote','priorNote','liveContext','budget','goalsCurrent','recurringCurrent'].includes(section.key))return '<details class="cfv2-rp-section cfv2-rp-detail"><summary>'+heading+'<small>'+section.rows.length+'</small></summary>'+(section.rows.length?table:empty('noData'))+'</details>';
    if(section.keys.join(',')==='metric,value,unit')return '<section class="cfv2-rp-section">'+heading+'<div class="cfv2-rp-list">'+section.rows.map(r=>'<div><span>'+e(r[0])+'</span><strong>'+cell(r,1)+(r[1]!=null&&r[2]&&r[2]!=='ratio'?' <small>'+e(r[2])+'</small>':'')+'</strong></div>').join('')+'</div></section>';
    return '<section class="cfv2-rp-section cfv2-rp-'+e(section.key)+'">'+heading+(section.rows.length?table:empty('noData'))+'</section>';
   };
   const sections=m?.sections||[];
   body='<div class="cfv2-rp-controls" data-report-type="'+e(reportType)+'">'+controls+'</div>'+selector+buttons+(exportError?'<p role="alert">'+e(tr('exportError'))+'</p>':'')+(m?sections.filter(x=>['reportSummary','reportScope'].includes(x.key)).map(preview).join('')+'<div class="cfv2-rp-sections">'+sections.filter(x=>!['reportSummary','reportScope'].includes(x.key)).map(preview).join('')+'</div>'+(!s.reportModel.exportable?empty(m.warning||'missing'):!m.exportable?'<p class="cfv2-muted">'+e(['Choose at least one section','请至少勾选一个内容模块','အနည်းဆုံး တစ်ပိုင်း ရွေးပါ'][lang()])+'</p>':''):empty('invalid'));
  }
  else if(dialog==='trend')body=chart(s.series)+'<div class="cfv2-list">'+s.series.map(r=>'<div><span>'+e(r.key)+'</span><strong>'+e(fmt(r.income)+' / '+fmt(r.expense)+' / '+fmt(r.net)+' · '+pct(r.savingsRate))+'</strong></div>').join('')+'</div>';
  else if(dialog==='sources')body=items(s.data.incomeSources);
  else if(dialog==='categories')body=categoryBars(s.analytics?.categories);
  else if(dialog==='accounts')body=dimension(s.analytics?.accounts);
  else if(dialog==='currencies')body=dimension(s.analytics?.currencies);
  else if(dialog==='ranking')body='<label>'+e(tr('threshold'))+' ('+e(currency)+')<input type="number" min="0.01" step="any" data-field="largeThreshold" value="'+e(largeThreshold)+'"></label>'+(s.analytics?.large?'<h2>'+e(tr('large'))+'</h2>'+rank(s.analytics.large):'')+rank(s.analytics?.ranked);
  else if(dialog==='health')body=healthPanel(s.healthData);
  else if(dialog==='movements')body=movementPanel(s.movements,true);
  else if(dialog==='investmentReport')body=investmentPanel(s.investment,true);
  else if(dialog==='balance')body='<div class="cfv2-metrics">'+metric('opening',fmt(s.bal.opening))+metric('closing',fmt(s.bal.closing))+metric('change',fmt(s.bal.change))+metric('other',fmt(s.bal.nonCashflowChange))+'</div><p class="cfv2-muted">'+e(tr('historyNote'))+'</p>'+historyList(s.historyData);
  else body=empty('unavailable');
  return '<dialog class="cfv2-dialog" data-cfv2-dialog data-cfv2-kind="'+e(dialog)+'" aria-label="'+e(tr(title))+'"><header>'+(dialog==='report'?'<div class="cfv2-rp-brand"><img src="'+reportLogo+'" alt="" width="32" height="32"><div><strong>MMHVAULT</strong><h2>'+e(tr(title))+'</h2></div></div>':'<h2>'+e(tr(title))+'</h2>')+btn('close','close')+'</header><div class="cfv2-dialog-body">'+body+'</div></dialog>';
 }
 function paint(){
  if(disposed)return;const prior=root.querySelector('dialog[open]'),priorOwner=owner,priorDialog=paintedDialog,priorScroll=prior?.querySelector('.cfv2-dialog-body')?.scrollTop||0;
  const priorField=priorDialog==='report'&&prior?.contains(doc.activeElement)?doc.activeElement.dataset.field:'';
  if(prior)prior.close();
  last=null;let s;try{s=snapshot()}catch{s=null}
  if(!s){opener=null;paintedDialog='';root.innerHTML='<div class="cfv2"><p role="status">'+e(tr('unavailable'))+'</p></div>';return}
  last=s;const opts=(a)=>[['',tr('all')],...(a||[]).map(v=>[String(v),String(v)])];
  const isFlow=tab!=='planning';
  const filters=filterSelect('preset',presets.map(k=>[k,tr(k==='all'?'allTime':k)]),preset,'period')+filterSelect('account',opts(s.source.accounts),account,'account')+filterSelect('category',opts(s.source.categories),category,'category')+filterSelect('original',opts(s.codes),original,'original')+(adapter.releaseReadOnly?'<button type="button" data-action="reset-filters">'+e(tr('resetFilters'))+'</button>':'');
  const filterButton='<button type="button" data-action="filters" aria-expanded="'+filtersOpen+'" aria-controls="cfv2-advanced-filters">'+e(tr('filters'))+([account,category,original].filter(Boolean).length?' ('+[account,category,original].filter(Boolean).length+')':'')+'</button>';
  const controls='<div class="cfv2-filters">'+select('currency',s.codes.map(c=>[c,c]),currency,'currency')+(isFlow?calendarControls()+filterButton:'')+'</div>';
  const toolbarCurrency='<div class="cfv2-currency-anchor"><label><select class="cfv2-toolbar-currency" data-field="currency" aria-label="'+e(tr('currency'))+'" title="'+e(tr('currency'))+'">'+s.codes.map(c=>'<option value="'+e(c)+'"'+(c===currency?' selected':'')+'>'+e(c)+'</option>').join('')+'</select></label></div>';
  const toolbar='<div class="cfv2-toolbar-controls">'+(isFlow?calendarControls()+'<div class="cfv2-filter-anchor">'+filterButton+'<div id="cfv2-advanced-filters" class="cfv2-filters" '+(filtersOpen?'':'hidden')+'>'+filters+'</div></div>':'')+toolbarCurrency+(isFlow?btn('report','report'):'')+'</div>';
  const heading='<div class="cfv2-title"><div><h1>'+e(tr('cashflow'))+'</h1><p class="cfv2-muted">'+e(tr('overviewNote'))+'</p></div>'+controls+'</div>';
  const nav='<header class="cfv2-top'+(adapter.releaseReadOnly?' cfv2-toolbar':'')+'"><div role="group" class="cfv2-tabs">'+(adapter.releaseReadOnly?['summary','analysis']:['summary','analysis','planning']).map(k=>'<button type="button" data-action="tab" data-key="'+k+'" aria-pressed="'+(tab===k)+'">'+e(tr(k==='summary'?'cashflow':k))+'</button>').join('')+'</div>'+(adapter.releaseReadOnly?toolbar:(isFlow?btn('report','report'):''))+'</header>';
  const customFields=isFlow&&preset==='custom'?'<form data-cfv2-range><input type="date" name="start" aria-label="'+e(tr('start'))+'" value="'+e(custom.start)+'" required><input type="date" name="end" aria-label="'+e(tr('end'))+'" value="'+e(custom.end)+'" required><button>'+e(tr('apply'))+'</button></form>':'';
  root.innerHTML='<div class="cfv2">'+(adapter.releaseReadOnly?'':heading)+nav+(isFlow?(adapter.releaseReadOnly?'':'<div id="cfv2-advanced-filters" class="cfv2-filters" '+(filtersOpen?'':'hidden')+'>'+filters+'</div>')+customFields+'<p class="cfv2-muted cfv2-range">'+e(s.range.start+' – '+s.range.end)+'</p>'+kpis(s)+(tab==='summary'?summary(s):analysisPage(s)):planning(s))+modal(s)+'</div>';
  enhanceCurrencies(adapter.releaseReadOnly?root.querySelector('.cfv2-currency-anchor'):root,win.MMHCurrencyPickerV3,{labelFor:select=>tr(select.dataset.field==='original'?'original':'currency'),canChange:()=>adapter.owner()===owner&&last?.source.isCurrent?.()!==false});
  const d=root.querySelector('[data-cfv2-dialog]');if(d){if(adapter.releaseReadOnly&&dialog==='report')enhanceCurrencies(d,win.MMHCurrencyPickerV3,{labelFor:()=>tr('currency'),canChange:()=>adapter.owner()===owner&&last?.source.isCurrent?.()!==false});d.addEventListener('cancel',ev=>{ev.preventDefault();dialog='';paint()},{once:true});d.showModal();if(dialog==='report'){const pickers=Array.from(d.querySelectorAll('.cfv2-rp-controls details'));for(const picker of pickers){picker.addEventListener('toggle',()=>{if(picker.open)for(const other of pickers)if(other!==picker)other.open=false});picker.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&picker.open){ev.preventDefault();ev.stopPropagation();picker.open=false;picker.querySelector('summary')?.focus({preventScroll:true})}})}d.addEventListener('click',ev=>{for(const picker of pickers)if(picker.open&&!picker.contains(ev.target))picker.open=false})}if(priorOwner===owner&&priorDialog===dialog){if(dialog==='report'&&priorField&&/^report(?:Type|-(?:month|year|start|end)|Currency)$/.test(priorField)){const field=Array.from(d.querySelectorAll('[data-field]')).find(x=>x.dataset.field===priorField);if(field&&!field.disabled)field.focus({preventScroll:true})}d.querySelector('.cfv2-dialog-body').scrollTop=priorScroll}}else if(priorDialog&&priorOwner===owner){restoreAction(root,opener);opener=null}paintedDialog=dialog;
 }
 async function download(format){
  const uid=owner;
  try{const fresh=snapshot();if(!fresh?.reportModel?.exportable||fresh.source.owner!==uid||adapter.owner()!==uid)throw Error('Report unavailable');if(dialog!=='report')throw Error('Report closed');const selected=selectedReport(fresh.reportModel,reportSections,locale());await exportLocal(win,selected,format,()=>adapter.owner()===uid&&fresh.source.isCurrent?.()!==false&&adapter.read()?.owner===uid);exportError=''}catch{exportError='failed';paint()}
 }
 function click(ev){
  const option=ev.target.closest('[data-filter-option]');
  if(adapter.releaseReadOnly&&option&&root.contains(option)){
   if(adapter.owner()!==owner||last?.source.isCurrent?.()===false){paint();return}
   const picker=option.closest('[data-filter-field]'),field=picker?.dataset.filterField;
   const source=picker?.parentElement?.querySelector('select[data-field]');
   if(!source||source.dataset.field!==field||!(Object.hasOwn(sharedFilterIds,field)||(field==='reportType'&&dialog==='report'&&picker.closest('[data-cfv2-kind=report]')))||!Array.from(source.options).some(o=>o.value===option.dataset.filterOption))return;
   source.value=option.dataset.filterOption;change({target:source});
   root.querySelector('[data-filter-field="'+field+'"] summary')?.focus({preventScroll:true});return;
  }
  const b=ev.target.closest('[data-action]');if(!b||!root.contains(b)||adapter.owner()!==owner){if(adapter.owner()!==owner)paint();return}
  const a=b.dataset.action,k=b.dataset.key;if(!dialog&&!['tab','point','filters','reset-filters','calendar-mode','calendar-step'].includes(a))opener=actionIdentity(b);
  if(a.startsWith('plan-')&&last?.planModel){
   planError=false;
   if(['plan-forecast','plan-budget','plan-goals','plan-recurring','plan-trend'].includes(a)){dialog=a;planEdit=null;planConfirm=''}
   else if(a==='plan-edit'){planEdit=k;planConfirm=''}
   else if(a==='plan-back'){planEdit=null;planConfirm=''}
   else if(a==='plan-delete'){planConfirm=k}
   else if(a==='plan-confirm'||a==='plan-toggle'){
    try{const s=snapshot(),section=dialog.slice(5),key=k;if(!s?.planModel||!planContext(s).writable)throw Error('Read only');
     let next;if(section==='forecast'){const f=s.plan.forecast;next=planKit.editPlan(s.plan,{section:'forecast',action:'replace',value:{...f,rows:f.rows.filter(r=>r.id!==key),overrides:f.overrides.filter(r=>r.id!==key)}})}
     else next=planKit.editPlan(s.plan,{section:section==='budget'?'budgets':section,action:a==='plan-toggle'?'toggle':'delete',id:key});
     savePlan(s,next);planConfirm='';planEdit=null;
    }catch{planError=true}
   }
   paint();return;
  }
  if(a==='calendar-mode'&&['month','year'].includes(k)){preset=k;calendarKey='';grain=k==='month'?'week':'month';selected=''}else if(a==='calendar-step'&&['month','year'].includes(preset)&&['-1','1'].includes(k)){const today=adapter.today(),next=stepCalendar(preset,calendarKey||currentKey(preset,today),Number(k),today);if(next)calendarKey=next;selected=''}else if(a==='reset-filters'&&adapter.releaseReadOnly){if(last?.source.isCurrent?.()===false){paint();return}preset='month';calendarKey='';custom={};account=category=original=selected='';grain='week';filtersOpen=true;paint();root.querySelector('[data-action=reset-filters]')?.focus({preventScroll:true});return}else if(a==='filters'){filtersOpen=!filtersOpen}else if(a==='tab'){tab=k;dialog='';filtersOpen=false}else if(a==='point'){selected=k}else if(a==='close'){dialog=''}else if(a==='export-report'){download(k);return}else if(['forecast','budget','goals','recurring'].includes(a)&&adapter.openModule){adapter.openModule(a);return}else {if(a==='report'){reportCurrency=currency;reportSections={};exportError=''}dialog=a}
  paint();
 }
 function change(ev){
  if(adapter.owner()!==owner||last?.source.isCurrent?.()===false){paint();return}const f=ev.target.dataset.field,v=ev.target.value;if(!f)return;
  if(f==='report-section'){if(dialog!=='report'||!ev.target.closest('[data-cfv2-kind=report]')||!reportChoices(last?.reportModel,locale()).some(x=>x.key===v))return;reportSections={...reportSections,[v]:ev.target.checked===true};exportError='';paint();const d=root.querySelector('.cfv2-rp-content');if(d){d.open=true;Array.from(d.querySelectorAll('input')).find(x=>x.value===v)?.focus({preventScroll:true})}return}
  const source=ev.target,previousOwner=owner,restoreSharedFocus=adapter.releaseReadOnly&&source.id===(f==='currency'?'mmhCfV238Currency':sharedFilterIds[f])&&doc.activeElement===source.nextElementSibling&&source.nextElementSibling?.classList.contains('mmh-shared-trigger-v217');
  if(f==='currency')currency=v;else if(f==='calendarKey'){if(calendarBounds(preset,v,adapter.today()))calendarKey=v}else if(f==='preset'){calendarKey='';preset=v;grain=['today','week'].includes(v)?'day':['month','lastMonth'].includes(v)?'week':'month';if(v==='custom')custom=last?.range||dateRange('month',adapter.today())}
  else if(f==='planHorizon'||f==='planPreset'){const n=Number(v);if(Number.isInteger(n)&&n>=1&&n<=240)horizon=n}else if(f==='planGrain')planGrain=v;else if(f==='budgetPeriod'){budgetPeriod=v;budgetKey=''}else if(f==='budgetKey'){if(planKit.bounds(budgetPeriod,v))budgetKey=v}else if(f==='grain')grain=v;else if(f==='account')account=v;else if(f==='category')category=v;else if(f==='original')original=v;else if(f==='horizon')horizon=Number(v);else if(f==='largeThreshold')largeThreshold=v;else if(f==='reportCurrency'){if(last?.codes.includes(v))reportCurrency=v;exportError=''}else if(f==='reportType'){reportType=v;reportSections={};exportError=''}else if(f.startsWith('report-')){reportSelection={...reportSelection,[f.slice(7)]:v};exportError=''}selected='';paint();
  if(f==='reportCurrency'&&previousOwner===owner){const d=root.querySelector('[data-cfv2-kind=report]');(d?.querySelector('.cfv2-currency summary')||d?.querySelector('[data-field=reportCurrency]'))?.focus({preventScroll:true})}
  if(adapter.releaseReadOnly&&f==='currency'&&previousOwner===owner){(root.querySelector('.cfv2-currency-anchor summary')||root.querySelector('.cfv2-currency-anchor select'))?.focus({preventScroll:true})}
  if(restoreSharedFocus&&win.requestAnimationFrame){
   const next=doc.getElementById(source.id);
   if(next&&root.contains(next))win.requestAnimationFrame(()=>win.requestAnimationFrame(()=>{
    if(disposed||owner!==previousOwner||adapter.owner()!==previousOwner||last?.source.isCurrent?.()===false||dialog||doc.activeElement!==doc.body||!next.isConnected||!root.contains(next))return;
    const trigger=next.nextElementSibling;
    if(trigger?.classList.contains('mmh-shared-trigger-v217')&&!trigger.disabled&&trigger.getClientRects().length)trigger.focus({preventScroll:true});
   }));
  }
 }
 function savePlan(s,next){
  if(adapter.planningMode!=='synthetic'||typeof adapter.writePlanning!=='function'||adapter.owner()!==owner||s.source.owner!==owner||adapter.read()?.owner!==owner||!planKit.validPlan(next))throw Error('Planning unavailable');
  if(adapter.writePlanning(next,owner)!==true||adapter.owner()!==owner)throw Error('Planning not saved');
 }
 function submitPlan(ev){
  ev.preventDefault();
  try{
   const s=snapshot(),form=ev.target,{section,command,key}=form.dataset;if(!s?.planModel||!planContext(s).writable||dialog!=='plan-'+section)throw Error('Read only');
   const f=new win.FormData(form),str=k=>String(f.get(k)??'').trim(),num=k=>str(k)===''?NaN:Number(str(k)),optional=k=>str(k)===''?null:num(k),id=key||win.crypto.randomUUID(),kind=str('kind'),currencyCode=str('currency');
   if(!['mode','clearOverride'].includes(command)&&!s.codes.includes(currencyCode))throw Error('Invalid currency');
   let next;
   if(section==='forecast'){
    const old=s.plan.forecast;
    if(command==='mode')next=planKit.editPlan(s.plan,{section,action:'replace',value:{...old,mode:str('mode')==='manual'?'manual':'recurring'}});
    else if(command==='override'||command==='clearOverride'){
     const row=old.rows.find(r=>r.id===str('rowId')),month=str('month');if(!row||!planKit.bounds('month',month))throw Error('Invalid override');
     const overrides=old.overrides.filter(r=>r.id!==row.id||r.month!==month);
     if(command==='override')overrides.push({...row,month,amount:num('amount'),currency:currencyCode});
     next=planKit.editPlan(s.plan,{section,action:'replace',value:{...old,overrides}});
    }
    else {const row={id,name:str('name'),kind,amount:num('amount'),currency:currencyCode};const rows=command==='update'?old.rows.map(r=>r.id===id?row:r):[...old.rows,row];next=planKit.editPlan(s.plan,{section,action:'replace',value:{...old,rows,overrides:old.overrides.map(r=>r.id===id?{...r,kind}:r)}})}
   }else{
    const target=section==='budget'?'budgets':section,prior=s.plan[target].find(r=>r.id===key);
    let value;
    if(section==='budget'){const cats=f.getAll('category'),amounts=f.getAll('amount');value={id,period:kind,key:str('month'),currency:currencyCode,total:num('total'),categories:cats.map((c,i)=>({category:String(c).trim(),raw:String(amounts[i]).trim()})).filter(x=>x.category||x.raw).map(x=>({category:x.category,amount:x.raw===''?NaN:Number(x.raw)}))}}
    else if(section==='goals')value={id,name:str('name'),kind,target:num('target')/(kind==='savingsRate'?100:1),currency:currencyCode,key:str('month'),progress:optional('progress'),due:str('due')||null};
    else if(section==='recurring')value={...prior,id,name:str('name'),kind,amount:num('amount'),currency:currencyCode,frequency:str('frequency'),start:str('start'),end:str('end')||null,paused:prior?.paused??false};
    else throw Error('Unknown section');
    next=planKit.editPlan(s.plan,{section:target,action:command,id:key,value});
   }
   savePlan(s,next);planEdit=null;planConfirm='';planError=false;
  }catch{planError=true}
  paint();
 }
 function submit(ev){if(ev.target.matches('[data-cfv2-plan]')){submitPlan(ev);return}if(!ev.target.matches('[data-cfv2-range]'))return;ev.preventDefault();const f=new win.FormData(ev.target),next={start:f.get('start'),end:f.get('end')};try{dateRange('custom',adapter.today(),null,next);custom=next;paint()}catch{ev.target.querySelector('[name=end]').setCustomValidity(tr('invalid'));ev.target.querySelector('[name=end]').reportValidity();ev.target.querySelector('[name=end]').addEventListener('input',x=>x.target.setCustomValidity(''),{once:true})}}
 const events=['mmhvault-language-change','mmhvault:config-owner-changed','mmhvault:data-state','mmhvault:data-loading','mmhvault:data-error','mmhvault:data-loaded','mmhvault:data-change','mmhvault:exchange-reference-updated','mmhvault:theme-mode-changed','mmhvault:budget-changed'];
 function closeToolbarFilters(){
  filtersOpen=false;
  const panel=root.querySelector('#cfv2-advanced-filters'),button=root.querySelector('[data-action="filters"]');
  if(panel)panel.hidden=true;
  if(button)button.setAttribute('aria-expanded','false');
 }
 function reconcileToolbar(ev){
  if(!adapter.releaseReadOnly||disposed)return;
  const currencyAnchor=root.querySelector('.cfv2-currency-anchor');
  if(!currencyAnchor)return;
  const insideCurrency=currencyAnchor.contains(ev.target);
  const insideFilter=!!ev.target.closest?.('.cfv2-filter-anchor')&&root.contains(ev.target);
  if(insideCurrency&&filtersOpen)closeToolbarFilters();
  if(!insideCurrency){const picker=currencyAnchor.querySelector('details[open]');if(picker)picker.open=false}
  if(!insideCurrency&&!insideFilter&&filtersOpen)closeToolbarFilters();
 }
 function dismissToolbar(ev){
  if(!adapter.releaseReadOnly||disposed||!root.contains(ev.target))return;
  if(ev.type==='keydown'&&ev.key==='Escape'&&filtersOpen&&!ev.defaultPrevented){
   const picker=ev.target.closest('.cfv2-inline-picker[open]');if(picker){ev.preventDefault();picker.open=false;picker.querySelector('summary')?.focus({preventScroll:true});return}
   ev.preventDefault();filtersOpen=false;paint();root.querySelector('[data-action="filters"]')?.focus({preventScroll:true});
  }
 }
 root.addEventListener('click',click);root.addEventListener('change',change);root.addEventListener('submit',submit);root.addEventListener('keydown',dismissToolbar);doc.addEventListener('click',reconcileToolbar,true);events.forEach(k=>win.addEventListener(k,paint));paint();
 return {refresh:paint,destroy(){disposed=true;last=null;root.removeEventListener('click',click);root.removeEventListener('change',change);root.removeEventListener('submit',submit);root.removeEventListener('keydown',dismissToolbar);doc.removeEventListener('click',reconcileToolbar,true);events.forEach(k=>win.removeEventListener(k,paint));root.replaceChildren()}};
}
