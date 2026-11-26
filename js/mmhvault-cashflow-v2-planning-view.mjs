/* Scoped Planning view; markup only, explicit owner-guarded fixture mutations in workspace. */
function planningView(){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dict={forecast:['Future Assets','未来资产','အနာဂတ်ပိုင်ဆိုင်မှု'],budget:['Budget','预算','ဘတ်ဂျက်'],goals:['Goals','目标','ရည်မှန်းချက်'],recurring:['Recurring','固定收支','ပုံမှန်ဝင်ငွေထွက်ငွေ'],current:['Current verified assets','当前已验证资产','လက်ရှိအတည်ပြုပိုင်ဆိုင်မှု'],income:['Expected income','预计收入','မျှော်မှန်းဝင်ငွေ'],expense:['Expected expense','预计支出','မျှော်မှန်းအသုံးစရိတ်'],net:['Expected savings / net','预计储蓄 / 净额','မျှော်မှန်းအသားတင်ငွေ'],estimated:['Estimated assets','预计资产','ခန့်မှန်းပိုင်ဆိုင်မှု'],forecastNote:['Forecast only · from next full month · no investment return','仅预测 · 从下个完整月起 · 不含投资回报','ခန့်မှန်းချက်သာ · နောက်လမှစ၍ · ရင်းနှီးမြှုပ်နှံမှုအမြတ်မပါ'],months:['Months','月数','လများ'],month:['Month','月','လ'],year:['Year','年','နှစ်'],total:['Total','总预算','စုစုပေါင်း'],used:['Used','已使用','သုံးပြီး'],remaining:['Remaining','剩余','ကျန်ငွေ'],over:['Over budget','超预算','ဘတ်ဂျက်ကျော်'],manage:['Manage','管理','စီမံရန်'],missing:['Unavailable / unverified data or FX','数据或汇率缺失、未验证','အချက်အလက် သို့ ငွေလဲနှုန်းမရပါ'],empty:['No saved records','无保存记录','မှတ်တမ်းမရှိ'],add:['Add','新增','ထည့်ရန်'],edit:['Edit','编辑','ပြင်ရန်'],remove:['Delete','删除','ဖျက်ရန်'],pause:['Pause','暂停','ခေတ္တရပ်'],resume:['Resume','恢复','ပြန်စ'],save:['Save','保存','သိမ်းရန်'],back:['Back','返回','နောက်သို့'],name:['Name','名称','အမည်'],kind:['Type','类型','အမျိုးအစား'],amount:['Amount','金额','ပမာဏ'],currency:['Currency','币种','ငွေကြေး'],frequency:['Frequency','频率','အကြိမ်ရေ'],start:['Start date','开始日期','စတင်ရက်'],end:['End date','结束日期','ပြီးဆုံးရက်'],due:['Target date','目标日期','ရည်မှန်းရက်'],mode:['Forecast source','预测来源','ခန့်မှန်းရင်းမြစ်'],manual:['Manual rows','自定义收支','ကိုယ်တိုင်သတ်မှတ်'],recurringMode:['Recurring only','仅固定收支','ပုံမှန်စာရင်းသာ'],monthly:['Monthly','每月','လစဉ်'],weekly:['Weekly','每周','အပတ်စဉ်'],biweekly:['Every two weeks','每两周','နှစ်ပတ်တစ်ကြိမ်'],quarterly:['Quarterly','每季度','သုံးလတစ်ကြိမ်'],yearly:['Yearly','每年','နှစ်စဉ်'],savingsRate:['Savings rate (%)','储蓄率 (%)','စုဆောင်းနှုန်း (%)'],monthlySavings:['Monthly savings','月度储蓄','လစဉ်စုဆောင်းမှု'],annualSavings:['Annual savings','年度储蓄','နှစ်စဉ်စုဆောင်းမှု'],emergency:['Emergency reserve','应急储备','အရေးပေါ်ရန်ပုံငွေ'],purchase:['Large purchase','大额消费','အကြီးစားဝယ်ယူမှု'],custom:['Custom goal','自定义目标','စိတ်ကြိုက်ရည်မှန်းချက်'],target:['Target','目标值','ရည်မှန်းတန်ဖိုး'],progress:['Manual progress','手动进度','ကိုယ်တိုင်တိုးတက်မှု'],categories:['Category budgets','分类预算','အမျိုးအစားဘတ်ဂျက်'],category:['Category','分类','အမျိုးအစား'],readonly:['Read-only · existing data migration pending','只读 · 原有数据迁移待验收','ဖတ်ရန်သာ'],invalid:['Invalid change or session changed','设置无效或会话已变化','ပြောင်းလဲမှုမမှန်ကန်ပါ'],deleteConfirm:['Delete this planning record?','确认删除此规划记录？','ဤမှတ်တမ်းဖျက်မလား'],confirm:['Confirm','确认','အတည်ပြု'],details:['Trend details','完整趋势','လမ်းကြောင်းအသေးစိတ်'],override:['Monthly override','逐月覆盖','လစဉ်ပြောင်းလဲမှု'],paused:['Paused','已暂停','ရပ်ထားသည်'],actual:['Actual savings','实际储蓄','အမှန်တကယ်စုဆောင်းမှု'],manualProgress:['Manual progress','手动进度','ကိုယ်တိုင်တိုးတက်မှု'],verified:['Verified reserve','已验证储备','အတည်ပြုရန်ပုံငွေ']};
 const t=(l,k)=>dict[k]?.[l]||k;
 const finite=v=>typeof v==='number'&&Number.isFinite(v);
 const button=(l,action,key,label)=>'<button type="button" data-action="'+esc(action)+'" data-key="'+esc(key)+'">'+esc(t(l,label))+'</button>';
 const metric=(l,k,v)=>'<div class="cfv2-metric"><span>'+esc(t(l,k))+'</span><strong>'+esc(v)+'</strong></div>';
 const field=(l,k,v,type='text',required=true)=>'<label>'+esc(t(l,k))+'<input name="'+esc(k)+'" type="'+type+'" value="'+esc(v)+'" '+(type==='number'?'step="any" ':'')+(required?'required':'')+'></label>';
 const select=(l,k,vals,v)=>'<label>'+esc(t(l,k))+'<select name="'+esc(k)+'">'+vals.map(([x,label])=>'<option value="'+esc(x)+'"'+(x===v?' selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label>';
 const options=(l,a)=>a.map(k=>[k,t(l,k)]);
 const form=(section,action,key,body,l)=>'<form class="cfv2-plan-form" data-cfv2-plan data-section="'+esc(section)+'" data-command="'+esc(action)+'" data-key="'+esc(key)+'">'+body+'<button type="submit">'+esc(t(l,'save'))+'</button></form>';
 const format=(ctx,n,c)=>ctx.fmt(n,c);
 const perc=(n)=>finite(n)?(n*100).toFixed(1)+'%':'—';
 const row=(a,b,c='')=>'<div><span>'+esc(a)+'</span><strong>'+esc(b)+'</strong>'+c+'</div>';
 const list=(l,rows)=>rows.length?'<div class="cfv2-list cfv2-plan-list">'+rows.join('')+'</div>':'<p class="cfv2-muted">'+esc(t(l,'empty'))+'</p>';
 const card=(ctx,k,body)=>ctx.card(k,body,'plan-'+k,'manage');
 function panel(ctx,m){
  const {l,fmt}=ctx,f=m.forecast,b=m.budget,rec=m.recurring,ps=f.points.filter(x=>finite(x.amount)),lo=Math.min(f.opening??0,...ps.map(x=>x.amount)),hi=Math.max(f.opening??0,...ps.map(x=>x.amount)),span=hi-lo||1;
  const points=finite(f.opening)?[{amount:f.opening},...f.points]:[];
  const graph=points.length&&points.every(x=>finite(x.amount))?'<svg class="cfv2-line" viewBox="0 0 600 140" role="img" aria-label="'+esc(t(l,'forecast'))+'"><polyline fill="none" stroke="currentColor" stroke-width="2" points="'+points.map((x,i)=>(10+i*580/(points.length-1))+','+(130-(x.amount-lo)*120/span)).join(' ')+'"/></svg>':'<p class="cfv2-muted">'+esc(t(l,'missing'))+'</p>';
  const fxNote=Object.entries(f.fxOverrides||{}).map(([c,v])=>'USD 1 = '+v+' '+c).join(' · ');
  const forecastBody='<p class="cfv2-muted">'+esc(t(l,'forecastNote'))+'</p>'+(fxNote?'<p class="cfv2-muted">'+esc(['Forecast-only FX','仅预测专属汇率','ခန့်မှန်းချက်အတွက်သာ ငွေလဲနှုန်း'][l]+' · '+fxNote)+'</p>':'')+'<div class="cfv2-metrics">'+metric(l,'current',fmt(f.opening))+metric(l,'income',fmt(f.monthlyIncome))+metric(l,'expense',fmt(f.monthlyExpense))+metric(l,'net',fmt(f.monthlyNet))+metric(l,'estimated',fmt(f.estimated))+'</div><div class="cfv2-plan-controls">'+ctx.horizonControl+ctx.grainControl+button(l,'plan-trend','','details')+'</div>'+graph;
  const budgetBody=ctx.budgetControl+(b?'<div class="cfv2-metrics">'+metric(l,'total',fmt(b.total,b.currency))+metric(l,'used',fmt(b.used,b.currency))+metric(l,'remaining',fmt(b.remaining,b.currency))+'</div><p>'+esc(perc(b.ratio))+(b.over?' · '+esc(t(l,'over')):'')+'</p>'+list(l,b.categories.map(c=>row(c.category,fmt(c.used,b.currency)+' / '+fmt(c.total,b.currency)))):'<p class="cfv2-muted">'+esc(t(l,'empty'))+'</p>');
  const goalsBody=list(l,m.goals.map(g=>row(g.name, (g.kind==='savingsRate'?perc(g.progress)+' / '+perc(g.target):fmt(g.progress,g.currency)+' / '+fmt(g.target,g.currency))+' · '+perc(g.ratio))));
  const recurringBody='<div class="cfv2-metrics">'+metric(l,'income',fmt(rec.income))+metric(l,'expense',fmt(rec.expense))+metric(l,'net',fmt(rec.net))+'</div>'+list(l,rec.rows.map(r=>row(r.name+' · '+t(l,r.frequency)+(r.paused?' · '+t(l,'paused'):''),fmt(r.amount,r.currency)+' · '+r.dates.length)));
  return card(ctx,'forecast',forecastBody)+'<div class="cfv2-pair">'+card(ctx,'budget',budgetBody)+card(ctx,'goals',goalsBody)+'</div>'+card(ctx,'recurring',recurringBody);
 }
 function dialog(ctx,m,p,section,edit,confirm,error){
  const {l,fmt,codes,writable}=ctx,kind=section==='budget'?'budgets':section,arr=section==='forecast'?p.forecast.rows:p[kind],editable=section!=='trend'&&writable;
  const actions=(r)=>editable?'<span class="cfv2-plan-actions">'+button(l,'plan-edit',r.id,'edit')+button(l,'plan-delete',r.id,'remove')+(section==='recurring'?button(l,'plan-toggle',r.id,r.paused?'resume':'pause'):'')+'</span>':'';
  const intro=(error?'<p role="alert" class="cfv2-warning">'+esc(t(l,'invalid'))+'</p>':'')+(!editable&&section!=='trend'?'<p class="cfv2-muted">'+esc(t(l,'readonly'))+'</p>':'');
  if(section==='trend'){
   let pts=m.forecast.points;if(ctx.grain==='year'){const map=new Map();for(const p of pts){const y=p.month.slice(0,4),q=map.get(y)||{month:y,income:0,expense:0,net:0};for(const k of ['income','expense','net'])q[k]=finite(q[k])&&finite(p[k])?q[k]+p[k]:null;q.amount=p.amount;map.set(y,q)}pts=[...map.values()]}
   return ctx.horizonControl+ctx.grainControl+list(l,pts.map(p=>row(p.month,fmt(p.income)+' / '+fmt(p.expense)+' / '+fmt(p.amount))));
  }
  if(!arr)return intro;
  if(confirm)return intro+'<p>'+esc(t(l,'deleteConfirm'))+'</p>'+button(l,'plan-confirm',confirm,'confirm')+button(l,'plan-back','','back');
  if(edit!==null&&editable){
   const r=arr.find(x=>x.id===edit)||{},cur=select(l,'currency',codes.map(c=>[c,c]),r.currency||ctx.currency),common=field(l,'name',r.name)+select(l,'kind',options(l,['income','expense']),r.kind||'income')+field(l,'amount',r.amount,'number')+cur;
   let body='';
   if(section==='forecast')body=common;
   if(section==='recurring')body=common+select(l,'frequency',options(l,['weekly','biweekly','monthly','quarterly','yearly']),r.frequency||'monthly')+field(l,'start',r.start||ctx.today,'date')+field(l,'end',r.end,'date',false);
   if(section==='goals')body=field(l,'name',r.name)+select(l,'kind',options(l,['savingsRate','monthlySavings','annualSavings','emergency','purchase','custom']),r.kind||'custom')+field(l,'target',r.kind==='savingsRate'?r.target*100:r.target,'number')+cur+field(l,'month',r.key||ctx.today.slice(0,7),'text',false)+field(l,'progress',r.progress,'number',false)+field(l,'due',r.due,'date',false);
   if(section==='budget')body=select(l,'kind',options(l,['month','year']),r.period||ctx.budgetPeriod)+field(l,'month',r.key||(ctx.budgetPeriod==='year'?ctx.today.slice(0,4):ctx.today.slice(0,7)))+field(l,'total',r.total,'number')+cur+'<div class="cfv2-plan-cats">'+(r.categories||[]).map((c,i)=>'<div>'+field(l,'category',c.category,'text',false)+field(l,'amount',c.amount,'number',false)+'</div>').join('')+Array.from({length:3},()=>'<div>'+field(l,'category','','text',false)+field(l,'amount','','number',false)+'</div>').join('')+'</div>';
   return intro+form(section,edit?'update':'add',edit,body,l)+button(l,'plan-back','','back');
  }
  let body=section==='forecast'?'<div>'+esc(t(l,'mode'))+': '+esc(t(l,p.forecast.mode==='manual'?'manual':'recurringMode'))+'</div>'+(editable?form(section,'mode','',select(l,'mode',options(l,['manual','recurringMode']),p.forecast.mode==='manual'?'manual':'recurringMode'),l):''):'';
  if(section==='forecast'&&p.forecast.rows.length){
   const rowChoices=p.forecast.rows.map(r=>[r.id,r.name]);
   body+='<h2>'+esc(t(l,'override'))+'</h2>'+list(l,p.forecast.overrides.map(r=>row(r.month+' · '+r.name,fmt(r.amount,r.currency))));
   if(editable)body+=form(section,'override','',select(l,'rowId',rowChoices,'')+field(l,'month',ctx.today.slice(0,7),'month')+field(l,'amount','','number')+select(l,'currency',codes.map(c=>[c,c]),ctx.currency),l)+form(section,'clearOverride','',select(l,'rowId',rowChoices,'')+field(l,'month',ctx.today.slice(0,7),'month')+'<small>'+esc(t(l,'remove'))+' · '+esc(t(l,'override'))+'</small>',l);
  }
  body+=list(l,arr.map(r=>row(r.name||r.key,r.kind==='savingsRate'?perc(r.target):fmt(r.amount??r.total??r.target,r.currency),actions(r))));
  return intro+body+(editable?button(l,'plan-edit','','add'):'');
 }
 return {panel,dialog};
}
export const {panel,dialog}=planningView();
