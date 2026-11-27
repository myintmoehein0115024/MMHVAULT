/* MMHVAULT · Future Asset Forecast v1.7 · Compact extras and mobile month layout
 * Owner-scoped, locally stored what-if estimates. Never writes ledger, investments, FX or Supabase.
 */
(()=>{'use strict';
 if(window.__MMH_FORECAST_V1)return;window.__MMH_FORECAST_V1=true;
 const PAGE='forecast',ROOT='mmhForecastRootV1',STORAGE='mmhvault_forecast_plan_v1_';
 const CURRENCIES=['USD','MMK','THB','CNY','JPY','KRW','SGD','MYR','IDR','PHP','VND','KHR','LAK','BND','HKD','MOP','TWD','MNT','KPW','INR','BDT','PKR','LKR','NPR','BTN','MVR','AFN','KZT','KGS','TJS','TMT','UZS','AMD','AZN','GEL','AED','BHD','IQD','IRR','ILS','JOD','KWD','LBP','OMR','QAR','SAR','SYP','YER','TRY','RUB','EUR'];
 const CORE_RATES=['THB','CNY','MMK'],SCENARIO_CURRENCIES=CURRENCIES.filter(c=>c!=='USD');
 const CURRENCY_MARKS=Object.fromEntries(CURRENCIES.map(c=>[c,({USD:'$',CNY:'¥',THB:'฿',MMK:'K'})[c]||c]));
 let selectedMonth='',editOpen=false,fxOpen=false,extraRate='JPY',modal='',modalReturn='',modalOrigin='',monthScroll=0;
 const currencyName=c=>{try{const lang=localStorage.getItem('mmhvault_language_v3363');return new Intl.DisplayNames([lang==='zh'?'zh-CN':lang==='my'?'my':'en'],{type:'currency'}).of(c)||c}catch(_){return c}};
 const FIELDS=[
  {key:'salary',en:'Salary income',zh:'工资收入',def:2500,ccy:'USD',type:'income',base:true},
  {key:'allowance',en:'Living allowance income',zh:'生活费收入',def:15000,ccy:'THB',type:'income',base:true},
  {key:'personal',en:'Personal expenses',zh:'个人消费',def:22500,ccy:'THB',type:'personal',base:true},
  {key:'family',en:'Family + Special Transfer',zh:'家庭支援 + Special Transfer',def:450,ccy:'USD',type:'family',base:true},
  {key:'bonus',en:'Extra bonus',zh:'额外奖金',def:0,ccy:'USD',type:'income'},
  {key:'otherU',en:'Other income A',zh:'其他收入 A',def:0,ccy:'USD',type:'income'},
  {key:'otherTHB',en:'Other income B',zh:'其他收入 B',def:0,ccy:'THB',type:'income'},
  {key:'extraTHB',en:'Extra spending A',zh:'额外支出 A',def:0,ccy:'THB',type:'extra'},
  {key:'extraU',en:'Extra spending B',zh:'额外支出 B',def:0,ccy:'USD',type:'extra'}
 ];
 const FIELD=Object.fromEntries(FIELDS.map(x=>[x.key,x]));
 let activeOwner='',state=null,lastFirst='',midnightTimer=0,lastDailyCalendar='',dirty=false,customSequence=0;
 const el=id=>document.getElementById(id);
 const language=()=>{try{return localStorage.getItem('mmhvault_language_v3363')||'en'}catch(_){return 'en'}};
 const isZh=()=>language()==='zh';
 const myLabels=Object.freeze({
  "Actions":"လုပ်ဆောင်ချက်များ",
  "View month":"လအလိုက် ကြည့်ရန်",
  "Edit monthly plan":"လစဉ်အစီအစဉ် ပြင်ရန်",
  "All months":"လအားလုံး",
  "Back":"နောက်သို့",
  "Close":"ပိတ်ရန်",
  "Done":"ပြီးပါပြီ",
  "Forecast changes are saved using Save settings.":"ခန့်မှန်းချက် ပြောင်းလဲမှုများကို ဆက်တင်များသိမ်းရန် ခလုတ်ဖြင့် သိမ်းပါ။",
  "Search currencies":"ငွေကြေး ရှာရန်",
  "Currency code or name":"ငွေကြေးကုဒ် သို့မဟုတ် အမည်",
  "Unsaved changes · click Save settings to keep them after refresh": "မသိမ်းရသေးသော ပြောင်းလဲမှုများ · ပြန်ဖွင့်ပြီးနောက် ဆက်ထားရန် ဆက်တင်များသိမ်းပါ",
  "Settings saved on this device": "ဤစက်တွင် ဆက်တင်များ သိမ်းပြီးပါပြီ",
  "Could not save settings on this device. Check browser storage.": "ဤစက်တွင် ဆက်တင်များ မသိမ်းနိုင်ပါ။ ဘရောက်ဇာ၏ သိုလှောင်မှုကို စစ်ဆေးပါ။",
  "Daily salary progress": "နေ့စဉ် လစာတိုးတက်မှု",
  "Each completed day adds one day of estimated salary. This is not money actually received.": "ပြီးဆုံးသည့်နေ့တိုင်းအတွက် ခန့်မှန်းလစာတစ်ရက်စာ ထည့်တွက်သည်။ အမှန်တကယ်ရရှိသော ငွေမဟုတ်ပါ။",
  "View month": "ကြည့်ရန်လ",
  "Completed month progress": "လအတွင်း ပြီးဆုံးသည့်အချိုး",
  "completed": "ပြီးဆုံး",
  "Estimated salary earned for completed days": "ပြီးဆုံးသည့်ရက်များအတွက် ခန့်မှန်းလစာ",
  "Monthly salary": "လစဉ်လစာ",
  "Days in month": "တစ်လရှိရက်များ",
  "Completed days": "ပြီးဆုံးသည့်ရက်များ",
  "Earned per day": "တစ်ရက်စာ ခန့်မှန်းလစာ",
  "Salary for the selected month": "ရွေးထားသည့်လ၏ လစာ",
  "Edit just this month, or leave it matching your regular salary. Future forecast months are unchanged.": "ဤလအတွက်သာ ပြင်ပါ သို့မဟုတ် ပုံမှန်လစာအတိုင်းထားပါ။ အနာဂတ်ခန့်မှန်းလများ မပြောင်းလဲပါ။",
  "Use regular salary": "ပုံမှန်လစာကို သုံးပါ",
  "Progress uses the device’s local calendar and counts completed days only. Historic months without saved salary overrides use your current regular salary. Display equivalents use current scenario FX; this estimate never modifies Dashboard assets, transactions or Supabase.": "စက်၏ ဒေသစံတော်ချိန် ပြက္ခဒိန်အရ ပြီးဆုံးသည့်ရက်များကိုသာ တွက်သည်။ သီးခြားလစာ မသိမ်းထားသော ယခင်လများအတွက် လက်ရှိပုံမှန်လစာကို သုံးသည်။ ပြသသည့်ငွေပမာဏသည် ခန့်မှန်းငွေလဲနှုန်းကို သုံးပြီး Dashboard ပိုင်ဆိုင်မှု၊ ငွေစာရင်းများနှင့် Supabase ကို မပြောင်းလဲပါ။",
  "Approx. ": "ခန့်မှန်း ",
  "Exchange rate unavailable": "ငွေလဲနှုန်း မရရှိနိုင်ပါ",
  "days": "ရက်",
  " / day": " / ရက်",
  "Your journey begins today.": "ယနေ့မှ စတင်ပါသည်။",
  "🏆 Month complete!": "🏆 လတစ်လ ပြီးဆုံးပါပြီ။",
  "✨ Another day of progress.": "✨ နောက်ထပ် တစ်ရက် တိုးတက်လာပါပြီ။",
  "Day ": "ရက် ",
  "": "",
  "DAILY PROGRESS": "နေ့စဉ် တိုးတက်မှု",
  "Another day, another step": "တစ်ရက်ပြီးတစ်ရက် တိုးတက်မှု",
  "Estimated salary for completed days this month": "ယခုလ ပြီးဆုံးသည့်ရက်များအတွက် ခန့်မှန်းလစာ",
  "View in Future Planner →": "Future Planner တွင် ကြည့်ရန် →",
  "Earned by completed days": "ပြီးဆုံးရက်များအလိုက် ခန့်မှန်းလစာ",
  "Estimate only · not received cash": "ခန့်မှန်းချက်သာ · လက်ခံရရှိငွေမဟုတ်ပါ",
  "Daily ": "နေ့စဉ် ",
  "Change currency, currently ": "ငွေကြေးပြောင်းရန်၊ လက်ရှိ ",
  "Currency": "ငွေကြေး",
  "Income": "ဝင်ငွေ",
  "Expenses & transfers": "အသုံးစရိတ်နှင့် ငွေလွှဲ",
  "Month ": "လ ",
  " · tap to edit": " · ပြင်ရန် နှိပ်ပါ",
  "Total income": "စုစုပေါင်းဝင်ငွေ",
  "Personal spending": "ကိုယ်ပိုင်အသုံးစရိတ်",
  "Family transfers": "မိသားစုသို့ ငွေလွှဲ",
  "Monthly change": "လစဉ် အသားတင်ပြောင်းလဲမှု",
  "Month-end assets": "လကုန် ပိုင်ဆိုင်မှု",
  "Changes here apply to this month only. Leave a value blank to use the regular amount.": "ပြောင်းလဲမှုများသည် ဤလအတွက်သာ ဖြစ်သည်။ ပုံမှန်ပမာဏကို သုံးရန် ကွက်လပ်ထားပါ။",
  "Bonuses & extra spending": "အပိုဆုနှင့် အပိုအသုံးစရိတ်",
  "Optional": "ရွေးချယ်နိုင်သည်",
  "Clear forecast changes for this month only? Real transactions remain unchanged.":"ဤလအတွက် ခန့်မှန်းချက် ပြောင်းလဲမှုများကိုသာ ရှင်းမလား။ အမှန်တကယ် ငွေစာရင်းများ မပြောင်းလဲပါ။",
  "Clear month changes": "ဤလ၏ ပြောင်းလဲမှုများကို ရှင်းရန်",
  "items": "ခု",
  "Item name": "အမျိုးအစားအမည်",
  "Remove ": "ဖယ်ရှားရန် ",
  "Remove item": "အမျိုးအစား ဖယ်ရှားရန်",
  "No items yet. Add one below.": "မရှိသေးပါ။ အောက်တွင် ထည့်ပါ။",
  "Add income": "ဝင်ငွေထည့်ရန်",
  "Add expense": "အသုံးစရိတ်ထည့်ရန်",
  "FUTURE WEALTH PLANNER": "အနာဂတ် ပိုင်ဆိုင်မှုအစီအစဉ်",
  "Future Asset Forecast": "အနာဂတ် ပိုင်ဆိုင်မှုခန့်မှန်းချက်",
  "Forecast from next month, based on your current Dashboard assets.": "လက်ရှိ Dashboard ပိုင်ဆိုင်မှုကို အခြေခံ၍ နောက်လမှ စတင်ခန့်မှန်းသည်။",
  "Forecast display currency": "ခန့်မှန်းချက်ပြသရန် ငွေကြေး",
  "Refresh assets": "ပိုင်ဆိုင်မှု ပြန်လည်ဖတ်ရန်",
  "Current total assets": "လက်ရှိ စုစုပေါင်းပိုင်ဆိုင်မှု",
  "Dashboard value, including receivables": "ရရန်ရှိငွေများအပါအဝင် Dashboard တန်ဖိုး",
  "Regular monthly savings": "ပုံမှန် လစဉ်စုငွေ",
  "Before bonus and extra spending": "အပိုဆုနှင့် အပိုအသုံးစရိတ် မပါဝင်သေးပါ",
  "Forecast end assets": "ခန့်မှန်းကာလအဆုံး ပိုင်ဆိုင်မှု",
  "Projected gain": "ခန့်မှန်းတိုးလာမည့် ပမာဏ",
  "Regular monthly income & spending": "ပုံမှန် လစဉ်ဝင်ငွေနှင့် အသုံးစရိတ်",
  "Edit your recurring income and expenses. Only this forecast changes.": "ပုံမှန်ဝင်ငွေနှင့် အသုံးစရိတ်ကို ပြင်ပါ။ ဤခန့်မှန်းချက်သာ ပြောင်းလဲမည်။",
  "MONTHLY PLAN": "လစဉ်အစီအစဉ်",
  "Regular monthly cash-flow breakdown": "ပုံမှန် လစဉ်ငွေဝင်ငွေထွက် အသေးစိတ်",
  "Regular income": "ပုံမှန်ဝင်ငွေ",
  "Family + Special transfer": "မိသားစုနှင့် အထူးငွေလွှဲ",
  "Regular savings rate": "ပုံမှန်စုငွေနှုန်း",
  "Savings rate target (%)": "ရည်မှန်းစုငွေနှုန်း (%)",
  "Progress toward target": "ရည်မှန်းချက်တိုးတက်မှု",
  "Forecast exchange rates": "ခန့်မှန်းငွေလဲနှုန်းများ",
  "Local simulation only": "စက်တွင်းခန့်မှန်းမှုအတွက်သာ",
  "1 USD/U equals the currency shown. Empty uses the saved Exchange rate if available; otherwise enter a local scenario rate.": "1 USD/U အတွက် ဖော်ပြထားသော ငွေကြေးပမာဏ။ ကွက်လပ်ထားပါက သိမ်းထားသော Exchange နှုန်းကို ရှိလျှင် သုံးမည်။ မရှိပါက စက်တွင်းခန့်မှန်းနှုန်း ထည့်ပါ။",
  "Other currency": "အခြားငွေကြေး",
  "Forecast through (year / month)": "ခန့်မှန်းကာလအဆုံး (နှစ် / လ)",
  "Export CSV": "CSV ထုတ်ရန်",
  "Reset scenario": "မူလခန့်မှန်းအစီအစဉ် ပြန်ထားရန်",
  "Discard changes": "မသိမ်းရသေးသော ပြောင်းလဲမှုများ ပယ်ဖျက်ရန်",
  "Save settings": "ဆက်တင်များ သိမ်းရန်",
  "Projected asset growth": "ခန့်မှန်းပိုင်ဆိုင်မှု တိုးတက်မှု",
  "Monthly cash-flow estimates; no assumed investment gains.": "လစဉ်ငွေဝင်ငွေထွက် ခန့်မှန်းချက်ဖြစ်ပြီး ရင်းနှီးမြှုပ်နှံမှုအမြတ်ကို ထည့်မတွက်ပါ။",
  "Month-by-month forecast": "လစဉ်ခန့်မှန်းချက်",
  "Choose a month to adjust its individual plan.": "လတစ်လကို ရွေး၍ ထိုလ၏ အစီအစဉ်ကို သီးခြားပြင်ပါ။",
  "Edit month": "ပြင်ရန်လ",
  "Month": "လ",
  "Net change": "အသားတင်ပြောင်းလဲမှု",
  "End assets": "ကာလအဆုံး ပိုင်ဆိုင်မှု",
  "Forecast settings are stored locally for each user, not in Supabase or cloud backup. Changing a currency automatically converts the current number to preserve its estimated USD value; you can then edit it. Real income/expenses and exchange rates are never changed. Current Dashboard assets, saved exchange rates, and the current month are re-read whenever this forecast refreshes. Future crypto/gold prices are assumed unchanged.": "ခန့်မှန်းဆက်တင်များကို သုံးစွဲသူတစ်ဦးချင်းအလိုက် ဤဘရောက်ဇာတွင်သာ သိမ်းပြီး Supabase သို့မဟုတ် cloud backup တွင် မသိမ်းပါ။ ငွေကြေးပြောင်းလဲပါက ခန့်မှန်း USD တန်ဖိုးကို ထိန်းထားရန် ပမာဏကို အလိုအလျောက်တွက်ပြောင်းပြီး နောက်မှ ပြင်နိုင်သည်။ အမှန်တကယ်ဝင်ငွေ၊ အသုံးစရိတ်နှင့် ငွေလဲနှုန်းများကို မပြောင်းလဲပါ။ ပြန်လည်ဖတ်တိုင်း Dashboard ပိုင်ဆိုင်မှု၊ သိမ်းထားသည့် ငွေလဲနှုန်းနှင့် လက်ရှိလကို ပြန်ဖတ်သည်။ အနာဂတ် crypto နှင့် ရွှေဈေး မပြောင်းလဲဟု ယူဆထားသည်။",
  "The selected end month is in the past. Select a later month.": "ရွေးထားသော အဆုံးလသည် ကျော်လွန်သွားပါပြီ။ နောက်လတစ်လကို ရွေးပါ။",
  "Maximum forecast length: 240 months.": "အများဆုံး ခန့်မှန်းကာလ 240 လ။",
  "Sign in to see your assets.": "ပိုင်ဆိုင်မှုကြည့်ရန် အကောင့်ဝင်ပါ။",
  "Dashboard assets are not ready; refresh financial data.": "Dashboard ပိုင်ဆိုင်မှု မရရှိသေးပါ။ ဘဏ္ဍာရေးဒေတာ ပြန်လည်ဖတ်ပါ။",
  "Enter a positive saved or scenario rate for ": "သိမ်းထားသော သို့မဟုတ် ခန့်မှန်း အပေါင်းတန်ဖိုးရှိ ငွေလဲနှုန်း ထည့်ပါ — ",
  "Enter a valid display exchange rate for ": "ပြသရန် မှန်ကန်သော ငွေလဲနှုန်း ထည့်ပါ — ",
  "Set a local forecast exchange rate for ": "စက်တွင်းခန့်မှန်း ငွေလဲနှုန်း သတ်မှတ်ပါ — ",
  "Add income to calculate the rate": "နှုန်းတွက်ရန် ဝင်ငွေထည့်ပါ",
  "Above target by ": "ရည်မှန်းချက်ထက် ပို၍ ",
  " percentage points": " ရာခိုင်နှုန်းပွိုင့်",
  "Below target by ": "ရည်မှန်းချက်ထက် လျော့၍ ",
  "Forecast months: ": "ခန့်မှန်းလများ: ",
  "Savings rate: ": "စုငွေနှုန်း: ",
  "Extra spending: ": "အပိုအသုံးစရိတ်: ",
  "All spending: ": "စုစုပေါင်းအသုံးစရိတ်: ",
  "Waiting for valid assets, rates and date.": "မှန်ကန်သော ပိုင်ဆိုင်မှု၊ ငွေလဲနှုန်းနှင့် ရက်စွဲကို စောင့်ဆိုင်းနေသည်။",
  "Forecast through ": "ခန့်မှန်းကာလအဆုံး ",
  "Enter a valid nonnegative number.": "သုည သို့မဟုတ် အပေါင်းကိန်း ထည့်ပါ။",
  "Enter a rate from 0 to 100.": "0 မှ 100 အတွင်း နှုန်းတစ်ခု ထည့်ပါ။",
  "Use a positive valid exchange rate.": "မှန်ကန်သော အပေါင်းတန်ဖိုးရှိ ငွေလဲနှုန်းကို သုံးပါ။",
  "Choose a month within the next 240 months.": "လာမည့် 240 လအတွင်း လတစ်လ ရွေးပါ။",
  "Invalid month": "လ မမှန်ကန်ပါ",
  "Set valid currency rates before switching.": "မပြောင်းမီ မှန်ကန်သော ငွေလဲနှုန်းများ သတ်မှတ်ပါ။",
  "Currency rates": "ငွေလဲနှုန်းများ",
  "Other income ": "အခြားဝင်ငွေ ",
  "Other expense ": "အခြားအသုံးစရိတ် ",
  "Enter a name for every custom item.": "စိတ်ကြိုက်အမျိုးအစားတိုင်းအတွက် အမည်ထည့်ပါ။",
  "Name required": "အမည်လိုအပ်သည်",
  "Forecast settings saved on this device.": "ခန့်မှန်းဆက်တင်များကို ဤစက်တွင် သိမ်းပြီးပါပြီ။",
  "Saved": "သိမ်းပြီး",
  "Reset local forecast settings for this account? Real transactions remain unchanged.": "ဤအကောင့်၏ စက်တွင်းခန့်မှန်းဆက်တင်များကို မူလအတိုင်း ပြန်ထားမလား။ အမှန်တကယ်ငွေစာရင်းများ မပြောင်းလဲပါ။",
  "Reset forecast": "ခန့်မှန်းချက် ပြန်သတ်မှတ်ရန်",
  "Salary income": "လစာဝင်ငွေ",
  "Living allowance income": "နေထိုင်စရိတ် ထောက်ပံ့ငွေ",
  "Personal expenses": "ကိုယ်ပိုင်အသုံးစရိတ်",
  "Family + Special Transfer": "မိသားစုနှင့် အထူးငွေလွှဲ",
  "Extra bonus": "အပိုဆု",
  "Other income A": "အခြားဝင်ငွေ A",
  "Other income B": "အခြားဝင်ငွေ B",
  "Extra spending A": "အပိုအသုံးစရိတ် A",
  "Extra spending B": "အပိုအသုံးစရိတ် B"
});
 const tr=(en,zh)=>isZh()?zh:language()==='my'&&Object.hasOwn(myLabels,en)?myLabels[en]:en;
 const fieldLabel=f=>FIELD[f.key]?tr(f.en,f.zh):f.en;
 const planLabels={budget:['Budget','预算','ဘတ်ဂျက်'],goals:['Goals','目标','ရည်မှန်းချက်များ'],recurring:['Recurring','固定收支','ပုံမှန်ငွေဝင်ငွေထွက်']};
 const planIcons={budget:'<path d="M3 6h16a2 2 0 0 1 2 2v10H3z M3 6V4h14 M21 11h-5v4h5"/>',goals:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',recurring:'<path d="M4 9V6h14l-3-3m3 12v3H4l3 3M18 6l-3 3M4 18l3-3"/>'};
 const planningLinks=()=>Object.keys(planLabels).map(key=>{const code=localStorage.getItem('mmhvault_language_v3363'),label=planLabels[key][code==='zh'?1:code==='my'?2:0];return '<button type="button" class="fc-plan-entry" data-fc-plan-page="'+key+'" title="'+label+'" aria-label="'+label+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+planIcons[key]+'</svg></button>'}).join('');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pad=v=>String(v).padStart(2,'0');
 const monthKey=(d=new Date())=>`${d.getFullYear()}-${pad(d.getMonth()+1)}`;
 const shift=(key,step)=>{const m=/^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(key||''));if(!m)return '';return monthKey(new Date(+m[1],+m[2]-1+step,1,12))};
 const startKey=()=>shift(monthKey(),1);
 const validMonth=s=>/^(\d{4})-(0[1-9]|1[0-2])$/.test(String(s||''));
 const monthLabel=key=>{if(!validMonth(key))return '—';const [y,m]=key.split('-').map(Number);return isZh()?`${y}年${m}月`:new Date(y,m-1,1,12).toLocaleDateString(language()==='my'?'my-MM':'en-US',{month:'short',year:'numeric'})};
 const val=v=>{const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=1e12?n:null};
 const fmt=n=>Number(n).toLocaleString(isZh()?'zh-CN':'en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
 const usd=n=>`${fmt(n)} U`;
 const signed=n=>`${n>=0?'+':'−'}${usd(Math.abs(n))}`;
 const displayRate=fx=>{const c=state?.viewCurrency||'USD';return c==='USD'?1:Number(fx?.[c])};
 const validDisplayRate=fx=>{const n=displayRate(fx);return Number.isFinite(n)&&n>0};
 const displayMoney=(n,fx)=>{const c=state?.viewCurrency||'USD',rate=displayRate(fx);return Number.isFinite(n)&&validDisplayRate(fx)?`${fmt(n*rate)} ${c==='USD'?'U':c}`:'—'};
 const displaySigned=(n,fx)=>{const value=displayMoney(Math.abs(n),fx);return Number.isFinite(n)&&value!=='—'?`${n>=0?'+':'−'}${value}`:'—'};
 const unitName=c=>c+' · '+currencyName(c);
 const owner=()=>{try{return typeof currentSessionUser!=='undefined'?String(currentSessionUser?.id||''):''}catch(_){return ''}};
 const localKey=id=>STORAGE+id;
 const defaultState=()=>({base:Object.fromEntries(FIELDS.filter(f=>f.base).map(f=>[f.key,f.def])),baseCurrencies:Object.fromEntries(FIELDS.filter(f=>f.base).map(f=>[f.key,f.ccy])),disabledBase:[],customItems:[],targetSavingsRate:60,months:{},monthCurrencies:{},end:'',dailyMonth:'',rate:null,fxOverrides:{},viewCurrency:'USD',salaryConfigured:false});
 const validCcy=c=>CURRENCIES.includes(c);
  const customToField=item=>({key:item.key,en:item.label,zh:item.label,def:0,ccy:item.currency,type:item.type,base:true});
  const allFields=()=>FIELDS.filter(f=>!f.base||!state.disabledBase.includes(f.key)).concat(state.customItems.map(customToField));
  const regularFields=()=>allFields().filter(f=>f.base);
  const fieldByKey=k=>FIELD[k]||(state.customItems.find(x=>x.key===k)?customToField(state.customItems.find(x=>x.key===k)):null);
  const baseAmount=f=>FIELD[f.key]?state.base[f.key]:(state.customItems.find(x=>x.key===f.key)?.amount??0);
  const baseCurrency=f=>FIELD[f.key]?state.baseCurrencies[f.key]:(state.customItems.find(x=>x.key===f.key)?.currency||'USD');
  const savingRate=(income,net)=>Number.isFinite(income)&&income>0&&Number.isFinite(net)?net/income*100:null;
  const savingsRateText=r=>r===null?'—':r.toFixed(1)+'%';
 function getState(id){
  if(!id)return defaultState();
  try{
   const raw=JSON.parse(localStorage.getItem(localKey(id))||'null');
   if(!raw||typeof raw!=='object'||![1,2,3].includes(raw.version))return defaultState();
   const next=defaultState();
   next.viewCurrency=validCcy(raw.viewCurrency)?raw.viewCurrency:'USD';
    next.disabledBase=Array.isArray(raw.disabledBase)?[...new Set(raw.disabledBase.filter(k=>FIELD[k]?.base))]:[];
    if(Array.isArray(raw.customItems))for(const item of raw.customItems.slice(0,40)){
      if(!item||!/^custom_[a-z0-9_]{1,70}$/.test(String(item.key||''))||next.customItems.some(x=>x.key===item.key))continue;
      const amount=val(item.amount);
      next.customItems.push({key:item.key,label:String(item.label||'').trim().slice(0,48)||'Other',type:item.type==='income'?'income':'personal',amount:amount===null?0:amount,currency:validCcy(item.currency)?item.currency:'USD'});
    }
    if(Number.isFinite(+raw.targetSavingsRate)&&raw.targetSavingsRate!==null&&raw.targetSavingsRate!==''&&+raw.targetSavingsRate>=0&&+raw.targetSavingsRate<=100)next.targetSavingsRate=+raw.targetSavingsRate;
   // V1.3 and earlier stored a salary with every saved plan; migrate a saved plan as configured.
   // Fresh defaults and an explicit Reset scenario remain NOT configured.
   next.salaryConfigured=typeof raw.salaryConfigured==='boolean'?raw.salaryConfigured:
     (val(raw.base?.salary)!==null&&Number(raw.base.salary)>0||
       Object.values(raw.months||{}).some(m=>m&&val(m.salary)!==null&&Number(m.salary)>0));
   for(const f of FIELDS.filter(x=>x.base)){
    if(val(raw.base?.[f.key])!==null)next.base[f.key]=Number(raw.base[f.key]);
    if(validCcy(raw.baseCurrencies?.[f.key]))next.baseCurrencies[f.key]=raw.baseCurrencies[f.key];
   }
   next.end=validMonth(raw.end)?raw.end:'';
   // Always open the daily view on the present month after a page reload. Historic salary overrides remain saved.
   next.dailyMonth='';
   if(val(raw.rate)!==null&&Number(raw.rate)>0)next.rate=Number(raw.rate);
   for(const c of SCENARIO_CURRENCIES)if(Number(raw.fxOverrides?.[c])>0&&Number.isFinite(+raw.fxOverrides[c])&&Number(raw.fxOverrides[c])<=1e8)next.fxOverrides[c]=+raw.fxOverrides[c];
   if(raw.months&&typeof raw.months==='object'){
    for(const [date,fields] of Object.entries(raw.months)){
     if(!validMonth(date)||!fields||typeof fields!=='object')continue;
     const clean={};for(const f of [...FIELDS,...next.customItems.map(customToField)])if(fields[f.key]!==''&&fields[f.key]!=null&&val(fields[f.key])!==null)clean[f.key]=+fields[f.key];
     if(Object.keys(clean).length)next.months[date]=clean;
    }
   }
   if(raw.monthCurrencies&&typeof raw.monthCurrencies==='object')for(const [date,fields] of Object.entries(raw.monthCurrencies)){
    if(!validMonth(date)||!fields||typeof fields!=='object')continue;
    const clean={};for(const f of [...FIELDS,...next.customItems.map(customToField)])if(validCcy(fields[f.key]))clean[f.key]=fields[f.key];
    if(Object.keys(clean).length)next.monthCurrencies[date]=clean;
   }
   return next;
  }catch(_){return defaultState()}
 }
 function updateSaveStatus(){
    const status=el('fc-save-status'),button=el('fc-save-btn');
    if(status)status.textContent=dirty?tr('Unsaved changes · click Save settings to keep them after refresh','有尚未保存的修改 · 请点击保存设置'):tr('Settings saved on this device','设置已保存到当前设备');
    if(button)button.disabled=!dirty||!activeOwner;
  }
  function save(){dirty=true;updateSaveStatus()}
  function persist(){
    if(!activeOwner||!state)return false;
    try{localStorage.setItem(localKey(activeOwner),JSON.stringify({...state,version:3}));dirty=false;updateSaveStatus();return true}
    catch(e){console.warn('[MMHVAULT Forecast] Storage unavailable',e);showWarning(tr('Could not save settings on this device. Check browser storage.','保存失败，请检查浏览器存储是否可用。'));return false}
  }
 function syncOwner(){const id=owner();if(id!==activeOwner){activeOwner=id;state=getState(id);dirty=false;lastFirst='';selectedMonth='';editOpen=false;fxOpen=false;extraRate='JPY';modal='';modalReturn='';modalOrigin='';monthScroll=0;if(!id)el('mmhDailyDashboardV13')?.remove()}}
 function active(){return !!el(PAGE)?.classList.contains('active')}
 function ratesNow(){
  const obj=window.rates||(typeof rates!=='undefined'?rates:null);
  const result={USD:1};for(const c of SCENARIO_CURRENCIES){const n=Number(obj?.['usd_'+c.toLowerCase()]);result[c]=Number.isFinite(n)&&n>0?n:0}return result;
 }
 function exchangeRates(){
  const source=ratesNow(),result={...source};
  for(const c of SCENARIO_CURRENCIES)if(Number(state.fxOverrides[c])>0)result[c]=Number(state.fxOverrides[c]);
  if(!('THB' in state.fxOverrides)&&Number(state.rate)>0)result.THB=Number(state.rate);
  return result;
 }
 function toUSD(amount,ccy,fx){if(!Number.isFinite(amount)||!validCcy(ccy)||!(fx[ccy]>0))return NaN;return amount/fx[ccy]}
 function convert(amount,from,to,fx){const u=toUSD(amount,from,fx);return Number.isFinite(u)&&fx[to]>0?u*fx[to]:NaN}
 function assets(){
  if(!activeOwner)return {ready:false,total:0};
  const cashFn=window.mmhvaultCashUSD,investFn=window.mmhDashboardHeldInvestmentUSD||window.mmhvaultInvestmentValueUSD,receivableFn=window.mmhDashboardReceivableUSD;
  if(typeof cashFn!=='function'||typeof investFn!=='function')return {ready:false,total:0};
  try{
   const cash=Math.max(0,Number(cashFn())||0),investment=Math.max(0,Number(investFn())||0),receivable=typeof receivableFn==='function'?Math.max(0,Number(receivableFn())||0):0;
   return {ready:true,total:cash+investment+receivable,cash,investment,receivable};
  }catch(e){console.warn('[MMHVAULT Forecast] Assets not available',e);return {ready:false,total:0}}
 }
 const effectiveEnd=first=>state.end||shift(first,21);
 function range(first,end){if(!validMonth(first)||!validMonth(end)||end<first)return [];const out=[];let d=first;for(let i=0;i<240&&d<=end;i++){out.push(d);d=shift(d,1)}return out}
 function monthlyValues(date){
   const amounts=state.months[date]||{},currencies=state.monthCurrencies[date]||{},result={};
   for(const f of FIELDS){
    const enabled=!f.base||!state.disabledBase.includes(f.key);
    const amount=enabled?(Object.prototype.hasOwnProperty.call(amounts,f.key)?amounts[f.key]:(f.base?state.base[f.key]:0)):0;
    const currency=currencies[f.key]||(f.base?state.baseCurrencies[f.key]:f.ccy);
    result[f.key]={amount,currency};
   }
   for(const item of state.customItems)result[item.key]={
    amount:Object.prototype.hasOwnProperty.call(amounts,item.key)?amounts[item.key]:item.amount,
    currency:currencies[item.key]||item.currency
   };
   return result;
  }
  function calcBreakdown(values,fx){
   let invalidCcy='',incomeU=0,personalU=0,familyU=0,extraU=0;
   for(const f of allFields()){
    const v=values[f.key],amount=toUSD(Number(v?.amount),v?.currency,fx);
    if(!Number.isFinite(amount)){invalidCcy=v?.currency||f.ccy;continue}
    if(f.type==='income')incomeU+=amount;
    else if(f.type==='personal')personalU+=amount;
    else if(f.type==='family')familyU+=amount;
    else extraU+=amount;
   }
   const expenseU=personalU+familyU+extraU;
   return {incomeU,personalU,familyU,extraU,expenseU,net:incomeU-expenseU,invalidCcy};
  }
  function calculate(){
  const first=startKey(),end=effectiveEnd(first),marketRates=ratesNow(),fx=exchangeRates(),worth=assets(),dates=range(first,end);
  let total=worth.total,invalidCcy='';
  const rows=worth.ready?dates.map(date=>{
   const v=monthlyValues(date),parts=calcBreakdown(v,fx);
   if(parts.invalidCcy)invalidCcy=parts.invalidCcy;
   total+=Number.isFinite(parts.net)?parts.net:0;
   return {date,v,...parts,total};
  }):[];
  const defaultValues=monthlyValues('__none__'),normal=calcBreakdown(defaultValues,fx);
  if(normal.invalidCcy)invalidCcy=normal.invalidCcy;
  return {first,end,fx,marketRates,worth,rows,normal,valid:!!worth.ready&&!!rows.length&&!invalidCcy,invalidCcy,tooLong:!!(validMonth(end)&&end>=first&&shift(first,239)<end)};
 }
 // Daily salary is an earned-by-time estimate, NEVER an additional cash asset or ledger entry.
 function dailyInfo(chosen=''){
  const today=new Date(),current=monthKey(today);
  const selected=validMonth(chosen)&&chosen<=current?chosen:current;
  const [year,month]=selected.split('-').map(Number);
  const count=new Date(year,month,0).getDate();
  // As requested, credit a day only after it has finished in local time.
  const completed=selected<current?count:Math.max(0,Math.min(count,today.getDate()-1));
  const overrides=state?.months?.[selected]||{},ccyOverrides=state?.monthCurrencies?.[selected]||{};
  const hasOwn=Object.prototype.hasOwnProperty.call(overrides,'salary');
  const amount=state.disabledBase.includes('salary')?0:(hasOwn?Number(overrides.salary):Number(state?.base?.salary||0));
  const currency=ccyOverrides.salary||state?.baseCurrencies?.salary||'USD';
  const fx=exchangeRates(),salaryU=toUSD(amount,currency,fx);
  return {selected,current,count,completed,amount,currency,salaryU,
   earned:amount*completed/count,earnedU:salaryU*completed/count,daily:amount/count,
   pct:completed/count*100,hasOwn,valid:Number.isFinite(salaryU)};
 }
 function dailyMoney(n,c){const mark=CURRENCY_MARKS[c]||c;return `${mark}${mark===c?' ':''}${fmt(n)}`}
 function salaryIsConfigured(month=''){
  if(!activeOwner||!state?.salaryConfigured||state.disabledBase.includes('salary'))return false;
  const d=dailyInfo(month);return Number.isFinite(d.amount)&&d.amount>0;
 }
 function syncDailyPanelVisibility(){
  const root=el(ROOT),panel=el('fc-day-panel');if(!root)return;
  if(!salaryIsConfigured(state?.dailyMonth)) {panel?.remove();return}
  if(!panel)root.querySelector('.fc-stats')?.insertAdjacentHTML('afterend',dailyPanelHTML());
 }
 function dailyPanelHTML(){
  const d=dailyInfo(state.dailyMonth),min='2020-01';
  return `<section class="fc-panel fc-day-panel" id="fc-day-panel">
   <div class="fc-day-head"><div><div class="fc-day-title"><span class="fc-day-trophy" aria-hidden="true">🏆</span><h2>${tr('Daily salary progress','每日工资成就进度')}</h2></div><p class="fc-muted">${tr('Each completed day adds one day of estimated salary. This is not money actually received.','每完整度过一天，就累计一天的预计工资；不是实际已到账金额。')}</p></div>
   <label class="fc-field fc-day-picker"><span>${tr('View month','查看月份')}</span><input id="fc-day-month" type="month" min="${min}" max="${d.current}" value="${d.selected}"></label></div>
   <div class="fc-day-content"><div class="fc-day-gauge" id="fc-day-gauge" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="${esc(tr('Completed month progress','月度完成进度'))}"><div class="fc-day-gauge-core"><strong id="fc-day-pct">0%</strong><small>${tr('completed','已完成')}</small></div></div>
   <div class="fc-day-main"><small>${tr('Estimated salary earned for completed days','已完成天数的预计累计工资')}</small><strong id="fc-day-earned">—</strong><p id="fc-day-earned-u" class="fc-muted">—</p><div class="fc-day-motivation" id="fc-day-motivation">—</div></div>
   <div class="fc-day-info"><div><small>${tr('Monthly salary','本月工资')}</small><strong id="fc-day-monthly">—</strong></div><div><small>${tr('Days in month','本月天数')}</small><strong id="fc-day-length">—</strong></div><div><small>${tr('Completed days','已度过天数')}</small><strong id="fc-day-days">—</strong></div><div><small>${tr('Earned per day','每日累计')}</small><strong id="fc-day-daily">—</strong></div></div></div>
   <div class="fc-day-bar-row"><div class="fc-day-bar" role="presentation"><i id="fc-day-bar-fill"></i></div><strong id="fc-day-fraction">—</strong></div>
   <div class="fc-day-milestones" id="fc-day-milestones"></div>
   <div class="fc-day-edit"><div class="fc-day-edit-copy"><strong>${tr('Salary for the selected month','所选月份工资')}</strong><small>${tr('Edit just this month, or leave it matching your regular salary. Future forecast months are unchanged.','可单独修改本月工资；未设置时沿用常规工资，不改其他月份。')}</small></div>
   <div class="fc-day-edit-control">${pairField(tr('Monthly salary','本月工资'),'salary',d.amount,d.currency,'month',d.selected,d.amount)}<button class="fc-btn alt fc-day-reset" type="button" data-fc-action="reset-day-salary">${tr('Use regular salary','恢复常规工资')}</button></div></div>
   <p class="fc-day-disclaimer">${tr('Progress uses the device’s local calendar and counts completed days only. Historic months without saved salary overrides use your current regular salary. Display equivalents use current scenario FX; this estimate never modifies Dashboard assets, transactions or Supabase.','进度按设备当地日历计算，只计已经完整结束的日期。未单独保存工资的历史月份按当前常规工资估算；显示币种的换算使用当前模拟汇率。本卡片不会修改 Dashboard 总资产、Transactions 或 Supabase。')}</p>
  </section>`;
 }
 function setText(id,value){const e=el(id);if(e)e.textContent=value}
 function updateDailyPanel(){
  const root=el('fc-day-panel');if(!root||!state)return;
  const d=dailyInfo(state.dailyMonth),fx=exchangeRates(),p=Number.isFinite(d.pct)?d.pct:0;
  const gauge=el('fc-day-gauge');if(gauge){gauge.style.setProperty('--fc-day-progress',`${p}%`);gauge.setAttribute('aria-valuenow',String(Math.round(p)))}
  setText('fc-day-pct',`${p.toFixed(1)}%`);
  setText('fc-day-earned',dailyMoney(d.earned,d.currency));
  const dayEquivalent=d.valid?displayMoney(d.earnedU,fx):'—';
  setText('fc-day-earned-u',dayEquivalent!=='—'?tr('Approx. ','约 ')+dayEquivalent:tr('Exchange rate unavailable','汇率暂不可用'));
  setText('fc-day-monthly',dailyMoney(d.amount,d.currency));
  setText('fc-day-length',`${d.count} ${tr('days','天')}`);
  setText('fc-day-days',`${d.completed} / ${d.count}`);
  setText('fc-day-daily',dailyMoney(d.daily,d.currency)+tr(' / day',' / 天'));
  setText('fc-day-fraction',`${d.completed} / ${d.count} · ${p.toFixed(1)}%`);
  setText('fc-day-motivation',d.completed===0?tr('Your journey begins today.','今天开始新的积累！'):d.completed>=d.count?tr('🏆 Month complete!','🏆 本月已全部完成！'):tr('✨ Another day of progress.','✨ 又完成了一天的积累！'));
  const fill=el('fc-day-bar-fill');if(fill)fill.style.width=`${p}%`;
  const milestones=el('fc-day-milestones');if(milestones){
   const nums=[1,Math.ceil(d.count/3),Math.ceil(2*d.count/3),d.count].filter((n,i,a)=>a.indexOf(n)===i);
   milestones.innerHTML=nums.map(day=>`<div class="${day<=d.completed?'done':''}"><b>${tr('Day ','第')}${day}${tr('','天')}</b><small>${esc(dailyMoney(d.amount*day/d.count,d.currency))}</small></div>`).join('');
  }
  const salaryBox=root.querySelector(`input[data-fc-month="${d.selected}"][data-fc-field="salary"]`);
  if(salaryBox&&document.activeElement!==salaryBox)salaryBox.value=d.amount;
  // Monthly salary may change elsewhere. Update the inherited currency chip on the next full rerender.
 }
 function dashboardDailyHTML(){return `<section class="mmh-daily-mini-v13" id="mmhDailyDashboardV13" aria-label="${esc(tr('Daily salary progress','每日工资进度'))}">
  <div class="mmh-daily-mini-top"><div><span class="mmh-daily-mini-overline">✦ ${tr('DAILY PROGRESS','每日进度')}</span><h2>🏆 ${tr('Another day, another step','每天积累一点')}</h2><p>${tr('Estimated salary for completed days this month','本月已完整度过天数的预计累计工资')}</p></div><button type="button" data-mmh-open-daily="1">${tr('View in Future Planner →','查看详细进度 →')}</button></div>
  <div class="mmh-daily-mini-main"><div><small>${tr('Earned by completed days','已累计预计工资')}</small><strong id="mmhDailyDashEarnedV13">—</strong><em id="mmhDailyDashRateV13">—</em></div><div class="mmh-daily-mini-pct"><strong id="mmhDailyDashPctV13">—</strong><small id="mmhDailyDashDaysV13">—</small></div></div>
  <div class="mmh-daily-mini-bar" aria-hidden="true"><i id="mmhDailyDashBarV13"></i></div>
  <div class="mmh-daily-mini-bottom"><span id="mmhDailyDashMonthV13">—</span><span>${tr('Estimate only · not received cash','仅为预计进度 · 非实际到账')}</span></div>
 </section>`}
 function updateDashboardDaily(){
  if(!state||!activeOwner||!salaryIsConfigured())return;
  const d=dailyInfo(),percent=d.pct.toFixed(1);
  setText('mmhDailyDashEarnedV13',dailyMoney(d.earned,d.currency));
  setText('mmhDailyDashRateV13',tr('Daily ','每天 ')+dailyMoney(d.daily,d.currency)+(d.valid?' · ≈ '+usd(d.earnedU):''));
  setText('mmhDailyDashPctV13',percent+'%');
  setText('mmhDailyDashDaysV13',`${d.completed} / ${d.count} ${tr('days','天')}`);
  setText('mmhDailyDashMonthV13',monthLabel(d.current));
  const bar=el('mmhDailyDashBarV13');if(bar)bar.style.width=`${d.pct}%`;
 }
 function mountDashboardDaily(){
  // P9.6: The greeting MUST stay first. Keep the finance KPIs second and
  // mount Daily Progress third, even after Dashboard re-renders or restores.
  const card=el('mmhDailyDashboardV13');
  if(!salaryIsConfigured()){card?.remove();return}
  const host=el('mmhPremiumDashboardV500');if(!host)return;
  const hero=host.querySelector(':scope > .pf-hero-v500');
  const kpis=host.querySelector(':scope > .pf-kpis-v500');
  if(!hero||!kpis)return; // The Dashboard may be between render passes.
  if(host.firstElementChild!==hero)host.prepend(hero);
  if(hero.nextElementSibling!==kpis)hero.after(kpis);
  if(!card)kpis.insertAdjacentHTML('afterend',dashboardDailyHTML());
  else if(kpis.nextElementSibling!==card)kpis.after(card);
  updateDashboardDaily();
 }
 let dashboardObserver=null;
 function watchDashboard(){
  const host=el('mmhPremiumDashboardV500');if(!host)return;
  if(!dashboardObserver){dashboardObserver=new MutationObserver(()=>{if(el('dashboard')?.classList.contains('active'))mountDashboardDaily()});dashboardObserver.observe(host,{childList:true})}
  mountDashboardDaily();
 }
 // A single compact money input: only the symbol is visible until activated.
 function currencyPickerHTML(kind,code,codes,label){
  const flag=window.MMHCurrencyPickerV3?.flag?.(code)||'';
  return `<details class="fc-shared-picker ${kind==='view'?'fc-view-picker':''}" data-fc-picker-kind="${kind}" ${kind==='view'?'id="fc-view-picker"':''}><summary class="${kind==='field'?'fc-currency-trigger':''}" aria-label="${esc(label+' · '+code)}" title="${esc(label)}"><span>${esc(flag+code)}</span><span aria-hidden="true">⌄</span></summary><div class="fc-shared-menu mmh-shared-currency-v3"><label>${esc(tr('Search currencies','搜索币种'))}</label><input type="search" autocomplete="off" aria-label="${esc(tr('Search currencies','搜索币种'))}" placeholder="${esc(tr('Currency code or name','币种代码或名称'))}"><div class="ap-currency-list-v2"></div><select hidden aria-hidden="true" tabindex="-1">${codes.map(c=>`<option value="${c}"${c===code?' selected':''}>${c}</option>`).join('')}</select></div></details>`;
 }
 function setupCurrencyPicker(picker){
  const group=picker.querySelector('.fc-shared-menu'),select=group.querySelector('select'),search=group.querySelector('input'),list=group.querySelector('.ap-currency-list-v2'),label=picker.querySelector('summary').getAttribute('aria-label');
  search.value='';
  if(window.MMHCurrencyPickerV3?.render){window.MMHCurrencyPickerV3.render({select,search,list,group,label});return}
  const render=()=>{const q=search.value.trim().toLocaleLowerCase();list.replaceChildren();for(const o of select.options){if(![o.value,currencyName(o.value)].join(' ').toLocaleLowerCase().includes(q))continue;const b=document.createElement('button');b.type='button';b.dataset.apCurrency=o.value;b.setAttribute('aria-pressed',String(o.value===select.value));const a=document.createElement('span'),n=document.createElement('span');a.textContent=o.value;n.textContent=currencyName(o.value);b.append(a,n);list.append(b)}};
  search.oninput=render;render();
 }
 function positionForecastPicker(picker){const group=picker.querySelector('.fc-shared-menu,.fc-choice-menu');if(!group)return;const box=picker.querySelector('summary').getBoundingClientRect(),vw=document.documentElement.clientWidth,vh=window.innerHeight,w=Math.min(picker.matches('.fc-shared-picker')?310:220,vw-24),below=vh-box.bottom-14,above=box.top-14,up=below<200&&above>below,h=Math.max(80,Math.min(360,up?above:below));group.classList.add('fc-floating-menu');group.style.setProperty('--fc-menu-w',w+'px');group.style.setProperty('--fc-menu-x',Math.max(12,Math.min(vw-w-12,box.right-w))+'px');group.style.setProperty('--fc-menu-h',h+'px');group.style.setProperty('--fc-menu-y',(up?Math.max(12,box.top-h-5):box.bottom+5)+'px');}
 function closeForecastPickers(except=null){el(ROOT)?.querySelectorAll('.fc-shared-picker[open],.fc-choice-picker[open]').forEach(p=>{if(p!==except)p.open=false})}
 function pairField(label,fieldKey,value,currency,where,date='',placeholder=''){
  const isBase=where==='base',inputId=`fc-${isBase?'base':'month'}-${fieldKey}${date?'-'+date:''}`;
  const data=isBase?`data-fc-base="${fieldKey}"`:`data-fc-month="${date}" data-fc-field="${fieldKey}"`;
  const groupData=isBase?`data-fc-base-ccy="${fieldKey}"`:`data-fc-month-ccy="${date}" data-fc-ccy-field="${fieldKey}"`;
  return `<div class="fc-field"><label for="${inputId}">${esc(label)}</label><div class="fc-money-pair" ${groupData} data-fc-currency="${currency}">${currencyPickerHTML('field',currency,CURRENCIES,tr('Currency','币种'))}<input id="${inputId}" type="number" min="0" max="1000000000000" step="any" inputmode="decimal" ${data} value="${esc(value)}" placeholder="${esc(placeholder)}" aria-label="${esc(label+' · '+unitName(currency))}"></div></div>`;
 }
 function rowField(date,f,over,ccyOver){
  const own=Object.prototype.hasOwnProperty.call(over,f.key);
  const ccy=ccyOver[f.key]||(f.base?baseCurrency(f):f.ccy);
  let ph=f.base?baseAmount(f):0;
  const orig=f.base?baseCurrency(f):f.ccy;
  if(ccy!==orig){const converted=convert(ph,orig,ccy,exchangeRates());if(Number.isFinite(converted))ph=Number(converted.toFixed(2))}
  return pairField(fieldLabel(f),f.key,own?over[f.key]:'',ccy,'month',date,ph);
 }
 function monthHtml(date,i,editable=true){
  const overrides=state.months[date]||{},ccys=state.monthCurrencies[date]||{};
  const active=regularFields();
  const monthGroup=(type)=>{const income=type==='income',set=active.filter(f=>income?f.type==='income':f.type!=='income');
   return `<div class="fc-month-category"><div class="fc-month-category-head"><span class="fc-month-category-dot ${income?'is-income':'is-expense'}"></span><strong>${income?tr('Income','收入'):tr('Expenses & transfers','支出与转账')}</strong></div><div class="fc-month-category-fields">${set.map(f=>rowField(date,f,overrides,ccys)).join('')||'<span class="fc-month-empty">—</span>'}</div></div>`;
  };
  const regularInputs=monthGroup('income')+monthGroup('expense');
  const extraInputs=FIELDS.filter(f=>!f.base).map(f=>rowField(date,f,overrides,ccys)).join('');
  const hasExtraChanges=FIELDS.some(f=>!f.base&&(Object.prototype.hasOwnProperty.call(overrides,f.key)||Object.prototype.hasOwnProperty.call(ccys,f.key)));
  return `<div class="fc-month" data-fc-card="${date}"><div class="fc-month-detail-summary"><div class="fc-month-name">${esc(monthLabel(date))}<small>${tr('Month ','第')}${i+1}${tr('','个月')}</small></div><div class="fc-month-data"><small>${tr('Total income','总收入')}</small><strong data-fc-income="${date}">—</strong></div><div class="fc-month-data"><small>${tr('Personal spending','个人支出')}</small><strong class="fc-cost" data-fc-personal="${date}">—</strong><em class="fc-native" data-fc-personal-native="${date}">—</em></div><div class="fc-month-data"><small>${tr('Family transfers','家庭支出')}</small><strong class="fc-cost" data-fc-family="${date}">—</strong><em class="fc-native" data-fc-family-native="${date}">—</em></div><div class="fc-month-net"><small>${tr('Monthly change','当月净变化')}</small><strong data-fc-net="${date}">—</strong><em class="fc-native" data-fc-month-rate="${date}">—</em></div><div class="fc-month-total"><small>${tr('Month-end assets','月末总资产')}</small><strong data-fc-total="${date}">—</strong></div></div>${editable?`<div class="fc-month-fields"><div class="fc-month-hint">${tr('Changes here apply to this month only. Leave a value blank to use the regular amount.','这里的调整仅用于本月，留空将沿用常规金额。')}</div>
     <div class="fc-month-category-grid">${regularInputs}</div>
     <details class="fc-month-additional"${hasExtraChanges?' open':''}><summary><span class="fc-additional-icon" aria-hidden="true">＋</span><span class="fc-additional-title">${tr('Bonuses & extra spending','奖金与额外支出')}</span><span class="fc-additional-hint">${tr('Optional','可选')}</span><span class="fc-additional-chevron" aria-hidden="true">⌄</span></summary><div class="fc-month-additional-fields">${extraInputs}</div></details>
     <div class="fc-month-extra" data-fc-extra-note="${date}">—</div><div class="fc-month-actions"><button type="button" class="fc-btn alt" data-fc-clear-month="${date}">${tr('Clear month changes','清除本月调整')}</button></div></div>`:`<p class="fc-month-extra" data-fc-extra-note="${date}">—</p>`}</div>`;
 }
 function regularEditorHTML(group){
   const income=group==='income',items=regularFields().filter(f=>income?f.type==='income':f.type!=='income');
   const title=income?tr('Income','收入'):tr('Expenses & transfers','支出与转账');
   return `<div class="fc-regular-group ${income?'fc-group-income':'fc-group-expense'}"><div class="fc-regular-heading"><span class="fc-group-symbol" aria-hidden="true">${income?'↙':'↗'}</span><strong>${title}</strong><small>${items.length} ${tr('items','项')}</small></div>
    <div class="fc-regular-list">${items.length?items.map(f=>{
     const custom=!FIELD[f.key],label=fieldLabel(f);
     const heading=custom?`<input type="text" maxlength="48" class="fc-regular-name" data-fc-label="${esc(f.key)}" aria-label="${esc(tr('Item name','项目名称'))}" value="${esc(label)}">`:`<span class="fc-regular-title">${esc(label)}</span>`;
     return `<div class="fc-regular-item" data-fc-regular-item="${esc(f.key)}"><div class="fc-regular-label">${heading}</div><div class="fc-regular-entry">${pairField(label,f.key,baseAmount(f),baseCurrency(f),'base')}</div><button type="button" class="fc-remove-item" data-fc-remove="${esc(f.key)}" aria-label="${esc(tr('Remove ','删除')+label)}" title="${esc(tr('Remove item','删除项目'))}">×</button></div>`;
    }).join(''):`<p class="fc-regular-empty">${tr('No items yet. Add one below.','暂无项目，可点击下方添加。')}</p>`}</div>
    <button type="button" class="fc-add-item" data-fc-add="${group}">＋ ${income?tr('Add income','添加收入'):tr('Add expense','添加支出')}</button></div>`;
  }
  function rateField(c){return `<label class="fc-field"><span>1 U = ${c}</span><input type="number" data-fc-rate="${c}" min="0.000000000001" max="100000000" step="any" inputmode="decimal" placeholder="${esc(ratesNow()[c]||'—')}" value="${esc(state.fxOverrides[c]??(c==='THB'?state.rate:null)??'')}"></label>`}
 const fcIcons={edit:'<path d="M13 6l5 5M4 20l4-1 12-12-4-4L4 15z"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',list:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 9v11M3 14h18"/>',fx:'<path d="M3 7h17l-4-4m4 14H3l4 4M20 7l-4 4M3 17l4-4"/>',goal:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',back:'<path d="m14 5-7 7 7 7"/>'};
 function iconButton(icon,label,attrs){return `<button type="button" class="fc-icon-btn" title="${esc(label)}" aria-label="${esc(label)}" ${attrs}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${fcIcons[icon]}</svg></button>`}
 function monthChoice(dates){return `<details class="fc-choice-picker"><summary aria-label="${esc(tr('Edit month','调整月份'))}">${esc(monthLabel(selectedMonth))} <span aria-hidden="true">⌄</span></summary><div class="fc-choice-menu">${dates.map(date=>`<button type="button" data-fc-choose-month="${date}" aria-pressed="${date===selectedMonth}">${esc(monthLabel(date))}${date===selectedMonth?' ✓':''}</button>`).join('')}</div></details>`}
 function monthTable(dates){return `<div class="fc-month-overview" tabindex="0"><table><thead><tr><th scope="col">${tr('Month','月份')}</th><th scope="col">${tr('Net change','净变化')}</th><th scope="col">${tr('End assets','期末资产')}</th><th scope="col">${tr('Actions','操作')}</th></tr></thead><tbody>${dates.map(date=>`<tr data-fc-overview="${date}"><th scope="row">${esc(monthLabel(date))}</th><td data-fc-overview-net>—</td><td data-fc-overview-total>—</td><td><div class="fc-row-actions">${iconButton('eye',tr('View month','查看月份'),'data-fc-month-view="'+date+'"')}${iconButton('edit',tr('Edit month','调整月份'),'data-fc-month-edit="'+date+'"')}</div></td></tr>`).join('')}</tbody></table></div>`}
 function validDraft(){const bad=el(ROOT)?.querySelector('.fc-dialog input:invalid');if(bad){bad.reportValidity?.();bad.focus?.({preventScroll:true});return false}return true}
 function showModal(kind,date='',from=''){if(!validDraft())return;closeForecastPickers();if(date&&range(startKey(),effectiveEnd(startKey())).includes(date))selectedMonth=date;if(!modal){modalOrigin=from;modalReturn=''}else if(modal==='months')modalReturn='months';modal=kind;layout();el(ROOT)?.querySelector('.fc-dialog [data-fc-close-modal]')?.focus({preventScroll:true})}
 function closeModal(back=false){if(!validDraft())return;const next=back?modalReturn:'',origin=modalOrigin;modal=next;modalReturn='';if(!modal)modalOrigin='';layout();if(next)el(ROOT)?.querySelector('.fc-dialog [data-fc-close-modal]')?.focus({preventScroll:true});else el(ROOT)?.querySelector(origin||'.fc-head-actions summary')?.focus({preventScroll:true})}
 function modalHTML(dates,regular,fx,target){
  if(!modal)return '';
  const title=modal==='plan'?tr('Edit monthly plan','编辑月度计划'):modal==='fx'?tr('Forecast exchange rates','预测换算汇率'):modal==='target'?tr('Savings rate target (%)','目标储蓄率 (%)'):modal==='months'?tr('Month-by-month forecast','逐月资产预测'):monthLabel(selectedMonth);
  const content=modal==='plan'?regular:modal==='fx'?fx:modal==='target'?target:modal==='months'?monthTable(dates):`<div id="fc-month-list" class="fc-months">${selectedMonth?monthHtml(selectedMonth,dates.indexOf(selectedMonth),modal==='edit'):''}</div>`;
  return `<div class="fc-dialog-overlay"><section class="fc-dialog" role="dialog" aria-modal="true" aria-labelledby="fc-dialog-title"><header class="fc-dialog-header"><div class="fc-row-actions">${modalReturn?iconButton('back',tr('Back','返回'),'data-fc-back-modal="1"'):''}<h2 id="fc-dialog-title">${esc(title)}</h2></div>${iconButton('close',tr('Close','关闭'),'data-fc-close-modal="1"')}</header><div class="fc-dialog-body">${content}</div><footer class="fc-dialog-footer">${['plan','fx','target','edit'].includes(modal)?`<small>${tr('Forecast changes are saved using Save settings.','预测调整通过保存设置生效。')}</small><button type="button" class="fc-btn fc-save-primary" data-fc-action="save">${tr('Save settings','保存设置')}</button>`:''}<button type="button" class="fc-btn" data-fc-close-modal="1">${tr('Done','完成')}</button></footer></section></div>`
 }
 function layout(){
  const root=el(ROOT);if(!root)return;
  const first=startKey(),end=effectiveEnd(first),max=shift(first,239),dates=range(first,end);
  const oldOverview=root.querySelector('.fc-dialog .fc-month-overview');if(oldOverview)monthScroll=oldOverview.scrollTop;const dialogScroll=root.querySelector('.fc-dialog-body')?.scrollTop||0;
  if(!dates.includes(selectedMonth)){selectedMonth=dates[0]||'';if(['view','edit'].includes(modal))modal=''}
  const regular=`<div class="fc-regular-grid">${regularEditorHTML('income')}${regularEditorHTML('expense')}</div>`;
  const target=`<div class="fc-rate-target"><label for="fc-savings-target">${tr('Savings rate target (%)','目标储蓄率 (%)')}</label><input id="fc-savings-target" type="number" min="0" max="100" step="0.1" inputmode="decimal" value="${state.targetSavingsRate}"></div>`;
  const fx=`<p class="fc-muted">${tr('1 USD/U equals the currency shown. Empty uses the saved Exchange rate if available; otherwise enter a local scenario rate.','每个汇率表示 1 U 兑换多少该币种；留空时使用可用的 Exchange 已保存汇率，否则请填写本地预测汇率。')}</p><div class="fc-fx-grid">${CORE_RATES.map(rateField).join('')}</div><div class="fc-extra-rate"><div class="fc-field"><span>${tr('Other currency','其他币种')}</span>${currencyPickerHTML('rate',extraRate,SCENARIO_CURRENCIES.filter(c=>!CORE_RATES.includes(c)),tr('Other currency','其他币种'))}</div>${rateField(extraRate)}</div>`;
  root.innerHTML=`<div class="fc-wrap"${modal?' inert':''}>
    <header class="fc-head"><div><div class="fc-eyebrow">MMHVAULT · ${tr('FUTURE WEALTH PLANNER','未来资产预测')}</div><h1>${tr('Future Asset Forecast','未来资产预测')}</h1><p class="fc-muted">${tr('Forecast from next month, based on your current Dashboard assets.','从下个月起，使用 Dashboard 实时总资产逐月预测。')}</p></div><div class="fc-head-actions">${currencyPickerHTML('view',state.viewCurrency,CURRENCIES,tr('Forecast display currency','预测显示币种'))}${planningLinks()}<button type="button" class="fc-btn alt" data-fc-action="refresh">↻ ${tr('Refresh assets','刷新资产')}</button></div></header>

    <p id="fc-display-warning" class="fc-warning" role="status" hidden></p>
    <div class="fc-stats"><div class="fc-stat"><span>${tr('Current total assets','当前总资产')}</span><strong id="fc-start">—</strong><small>${tr('Dashboard value, including receivables','Dashboard 实时资产，含应收款')}</small></div><div class="fc-stat good"><span>${tr('Regular monthly savings','每月常规净储蓄')}</span><strong id="fc-saving">—</strong><small>${tr('Before bonus and extra spending','未计奖金与额外消费')}</small></div><div class="fc-stat"><span>${tr('Forecast end assets','预测期末总资产')}</span><strong id="fc-result">—</strong><small id="fc-result-date">—</small></div><div class="fc-stat"><span>${tr('Projected gain','预计增长')}</span><strong id="fc-gain">—</strong><small id="fc-count">—</small></div></div>
    ${salaryIsConfigured(state.dailyMonth)?dailyPanelHTML():''}
    <section class="fc-panel fc-regular-panel"><div class="fc-regular-intro"><div><h2>${tr('Regular monthly income & spending','设置每月常规收支')}</h2><p class="fc-muted">${tr('Edit your recurring income and expenses. Only this forecast changes.','规划固定收入与支出；不会更改真实账户数据。')}</p></div><div class="fc-row-actions">${iconButton('edit',tr('Edit monthly plan','编辑月度计划'),'data-fc-open-modal="plan"')}${iconButton('fx',tr('Forecast exchange rates','预测换算汇率'),'data-fc-open-modal="fx"')}${iconButton('goal',tr('Savings rate target (%)','目标储蓄率 (%)'),'data-fc-open-modal="target"')}</div></div>
      <div class="fc-breakdown" aria-label="${esc(tr('Regular monthly cash-flow breakdown','每月常规现金流明细'))}">
       <div><small>${tr('Regular income','每月收入合计')}</small><strong id="fc-base-income">—</strong><em id="fc-base-income-detail">—</em></div>
       <div><small>${tr('Personal spending','个人支出')}</small><strong id="fc-summary-personal">—</strong><em id="fc-base-personal-detail">—</em></div>
       <div><small>${tr('Family + Special transfer','家庭 + Special Transfer')}</small><strong id="fc-summary-family">—</strong><em id="fc-base-family-detail">—</em></div>
      </div>
      <div class="fc-savings-goal"><div class="fc-rate-heading"><span>${tr('Regular savings rate','常规储蓄率')}</span><strong id="fc-savings-rate">—</strong><small id="fc-rate-difference">—</small></div><div class="fc-rate-target"><span>${tr('Savings rate target (%)','目标储蓄率 (%)')}</span><strong id="fc-target-summary">${state.targetSavingsRate}%</strong></div><div class="fc-rate-track" role="progressbar" aria-label="${esc(tr('Progress toward target','储蓄率目标进度'))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="fc-savings-progress"><i id="fc-savings-progress-fill"></i></div></div>
      <div class="fc-end-row"><label class="fc-field fc-end-control"><span>${tr('Forecast through (year / month)','预测结束年月（自定义）')}</span><input id="fc-end" type="month" min="${first}" max="${max}" value="${end}"></label><div class="fc-bar"><span class="fc-range-note" id="fc-range-label">—</span><div class="fc-btns"><button class="fc-btn" type="button" data-fc-action="export">↓ ${tr('Export CSV','导出 CSV')}</button><button class="fc-btn alt" type="button" data-fc-action="reset">${tr('Reset scenario','恢复默认方案')}</button></div></div></div>
      <p class="fc-warning" id="fc-warning" hidden></p>
      <div class="fc-save-bar"><span id="fc-save-status" role="status"></span><div class="fc-save-actions"><button type="button" class="fc-btn alt" data-fc-action="discard">${tr('Discard changes','撤销未保存修改')}</button><button id="fc-save-btn" type="button" class="fc-btn fc-save-primary" data-fc-action="save">✓ ${tr('Save settings','保存设置')}</button></div></div>
    </section>
    <section class="fc-panel"><h2>${tr('Projected asset growth','预计资产增长曲线')}</h2><p class="fc-muted">${tr('Monthly cash-flow estimates; no assumed investment gains.','按每月现金流计算；不预设投资收益。')}</p><div class="fc-chart" id="fc-chart" style="margin-top:8px"></div></section>
    <section class="fc-panel fc-month-panel"><div class="fc-monthhead"><div><h2>${tr('Month-by-month forecast','逐月资产预测')}</h2><p>${tr('Choose a month to adjust its individual plan.','选择月份，单独调整该月计划。')}</p></div><div class="fc-row-actions">${dates.length?monthChoice(dates):''}${iconButton('list',tr('All months','全部月份'),'data-fc-open-modal="months"')}</div></div>${selectedMonth?monthTable([selectedMonth]):''}</section>
    <p class="fc-footer">${tr('Forecast settings are stored locally for each user, not in Supabase or cloud backup. Changing a currency automatically converts the current number to preserve its estimated USD value; you can then edit it. Real income/expenses and exchange rates are never changed. Current Dashboard assets, saved exchange rates, and the current month are re-read whenever this forecast refreshes. Future crypto/gold prices are assumed unchanged.','所有预测设置仅存于当前浏览器，按用户分别保存，不写入 Supabase 或云端备份。切换币种时会自动换算原金额以维持其美元估值，随后可修改数字；不影响任何真实收支或正式汇率。刷新时重新读取 Dashboard 资产、已保存汇率和当前月份。未来加密货币及黄金价格暂视为不变。')}</p>
  </div>${modalHTML(dates,regular,fx,target)}`;
  const overview=root.querySelector('.fc-dialog .fc-month-overview');if(overview)overview.scrollTop=monthScroll;
  const body=root.querySelector('.fc-dialog-body');if(body)body.scrollTop=dialogScroll;
  lastFirst=first;updateOutputs();updateSaveStatus();
 }
 function showWarning(message){const node=el('fc-warning');if(node){node.hidden=!message;node.textContent=message||''}}
 function updateOutputs(){
  if(!active()||!state)return;
  const out=calculate();
  const set=(id,s)=>{const x=el(id);if(x)x.textContent=s};
  const note=out.end<out.first?tr('The selected end month is in the past. Select a later month.','结束月份已经早于预测开始月，请重新选择。'):out.tooLong?tr('Maximum forecast length: 240 months.','最长只能预测240个月。'):!activeOwner?tr('Sign in to see your assets.','请先登录后查看资产。'):!out.worth.ready?tr('Dashboard assets are not ready; refresh financial data.','Dashboard 资产尚未准备好，请刷新财务数据。'):out.invalidCcy?tr('Enter a positive saved or scenario rate for ','请设置有效的已保存或模拟汇率：')+out.invalidCcy:!validDisplayRate(out.fx)?tr('Enter a valid display exchange rate for ','请设置有效的显示汇率：')+state.viewCurrency:'';
  showWarning(note);
  const displayWarning=el('fc-display-warning');if(displayWarning){displayWarning.hidden=validDisplayRate(out.fx);displayWarning.textContent=validDisplayRate(out.fx)?'':tr('Set a local forecast exchange rate for ','请填写本地预测汇率：')+state.viewCurrency;}
  set('fc-start',out.worth.ready?displayMoney(out.worth.total,out.fx):'—');
  set('fc-saving',!out.invalidCcy?displaySigned(out.normal.net,out.fx):'—');
  const rate=out.invalidCcy?null:savingRate(out.normal.incomeU,out.normal.net);
  set('fc-savings-rate',savingsRateText(rate));set('fc-target-summary',state.targetSavingsRate+'%');
  const diff=rate===null?null:rate-state.targetSavingsRate;
  set('fc-rate-difference',diff===null?tr('Add income to calculate the rate','添加收入后可计算储蓄率'):diff>=0?tr('Above target by ','高于目标 ')+diff.toFixed(1)+tr(' percentage points',' 个百分点'):tr('Below target by ','低于目标 ')+Math.abs(diff).toFixed(1)+tr(' percentage points',' 个百分点'));
  const bar=el('fc-savings-progress-fill');if(bar)bar.style.width=rate===null?'0%':Math.max(0,Math.min(100,rate)).toFixed(1)+'%';
  const progress=el('fc-savings-progress');if(progress)progress.setAttribute('aria-valuenow',String(rate===null?0:Math.max(0,Math.min(100,rate))));
  const targetInput=el('fc-savings-target');if(targetInput&&document.activeElement!==targetInput)targetInput.value=state.targetSavingsRate;
  set('fc-result',out.valid?displayMoney(out.rows.at(-1).total,out.fx):'—');
  set('fc-result-date',out.rows.length?monthLabel(out.end):'—');
  set('fc-gain',out.valid?displaySigned(out.rows.at(-1).total-out.worth.total,out.fx):'—');
  set('fc-count',tr('Forecast months: ','预测月数：')+out.rows.length);
  set('fc-range-label',monthLabel(out.first)+' → '+monthLabel(out.end)+' · '+['THB','CNY','MMK'].map(c=>`1 U = ${out.fx[c]>0?fmt(out.fx[c]):'—'} ${c}`).join(' · '));
  set('fc-base-income',!out.invalidCcy?displayMoney(out.normal.incomeU,out.fx):'—');
  set('fc-summary-personal',!out.invalidCcy?displayMoney(out.normal.personalU,out.fx):'—');
  set('fc-summary-family',!out.invalidCcy?displayMoney(out.normal.familyU,out.fx):'—');
  for(const f of regularFields()){
   const node=el('fc-base-'+f.key);if(node&&document.activeElement!==node)node.value=baseAmount(f);
  }
  const groupAmounts=type=>regularFields().filter(f=>f.type===type).map(f=>fmt(baseAmount(f))+' '+baseCurrency(f)).join(' + ')||'—';
  set('fc-base-income-detail',groupAmounts('income'));
  set('fc-base-personal-detail',groupAmounts('personal'));
  set('fc-base-family-detail',groupAmounts('family'));
  const byDate=new Map(out.rows.map(r=>[r.date,r]));
  el(ROOT)?.querySelectorAll('[data-fc-overview]').forEach(tr=>{const r=byDate.get(tr.dataset.fcOverview),net=tr.querySelector('[data-fc-overview-net]'),total=tr.querySelector('[data-fc-overview-total]');net.textContent=out.valid&&r?displaySigned(r.net,out.fx):'—';net.className=out.valid&&r?(r.net>=0?'fc-positive':'fc-negative'):'';total.textContent=out.valid&&r?displayMoney(r.total,out.fx):'—'});
  el('fc-month-list')?.querySelectorAll('[data-fc-card]').forEach(card=>{
   const date=card.dataset.fcCard,row=byDate.get(date);
   if(!row)return;
   const fill=(key,str,cls)=>{const node=card.querySelector(`[data-fc-${key}]`);if(node){node.textContent=out.valid?str:'—';if(cls)node.className=cls}};
   fill('income',displayMoney(row.incomeU,out.fx));
   fill('personal',displayMoney(row.personalU,out.fx));
   fill('family',displayMoney(row.familyU,out.fx));
   fill('personal-native',fmt(row.v.personal.amount)+' '+row.v.personal.currency);
   fill('family-native',fmt(row.v.family.amount)+' '+row.v.family.currency);
   fill('net',displaySigned(row.net,out.fx),row.net>=0?'fc-positive':'fc-negative');
   fill('month-rate',tr('Savings rate: ','储蓄率：')+savingsRateText(savingRate(row.incomeU,row.net)));
   fill('total',displayMoney(row.total,out.fx));
   const ext=card.querySelector('[data-fc-extra-note]');
   if(ext)ext.textContent=out.valid?tr('Extra spending: ','额外支出：')+displayMoney(row.extraU,out.fx)+' · '+tr('All spending: ','支出合计：')+displayMoney(row.expenseU,out.fx):'—';
   card.querySelectorAll('input[data-fc-field]').forEach(input=>{
    const f=fieldByKey(input.dataset.fcField);if(!f)return;let placeholder=f.base?baseAmount(f):0;
    const currency=card.querySelector(`[data-fc-ccy-field="${f.key}"]`)?.dataset.fcCurrency || card.querySelector(`[data-fc-ccy-field="${f.key}"]`)?.querySelector('.fc-currency-trigger')?.title;
    const orig=f.base?baseCurrency(f):f.ccy;
    if(orig!==currency){const v=convert(placeholder,orig,currency,out.fx);if(Number.isFinite(v))placeholder=Number(v.toFixed(2))}
    input.placeholder=String(placeholder);
   });
  });
  drawChart(out);
  syncDailyPanelVisibility();
  updateDailyPanel();
  mountDashboardDaily();
 }
 function drawChart(out){
  const host=el('fc-chart');if(!host)return;
  if(!out.valid||!validDisplayRate(out.fx)){host.textContent=tr('Waiting for valid assets, rates and date.','请确认资产、汇率和结束年月有效。');return}
  const data=[{date:monthKey(),total:out.worth.total},...out.rows],W=Math.max(300,Math.min(1100,host.clientWidth||900)),H=W<520?175:205,R=28,T=18,B=33;
  let L=72;
  let lo=Math.min(...data.map(x=>x.total)),hi=Math.max(...data.map(x=>x.total));
  if(hi===lo){hi+=1;lo-=1}const gap=(hi-lo)*.07;lo-=gap;hi+=gap;
  const factor=displayRate(out.fx),axisFmt=new Intl.NumberFormat('en-US',W<520?{notation:'compact',maximumFractionDigits:1}:{maximumFractionDigits:0}),ticks=Array.from({length:4},(_,i)=>axisFmt.format((hi-(hi-lo)*i/3)*factor));
  L=Math.min(Math.floor(W*.36),Math.max(45,Math.ceil(Math.max(...ticks.map(t=>t.length))*7+15)));
  const x=i=>L+(W-L-R)*i/Math.max(1,data.length-1),y=v=>T+(H-T-B)*(hi-v)/(hi-lo);
  const points=data.map((v,i)=>`${x(i).toFixed(2)},${y(v.total).toFixed(2)}`),poly=points.join(' '),area=`${L},${H-B} ${poly} ${x(data.length-1).toFixed(2)},${H-B}`;
  const intervals=Math.max(1,Math.min(data.length-1,W<520?3:6));
  const indices=new Set(Array.from({length:intervals+1},(_,i)=>Math.round(i*(data.length-1)/intervals)));
  const labels=data.map((d,i)=>indices.has(i)?`<text x="${x(i)}" y="${H-8}" text-anchor="middle">${esc(d.date.slice(2))}</text>`:'').join('');
  const grid=Array.from({length:4},(_,i)=>{const yy=T+(H-T-B)*i/3,amount=hi-(hi-lo)*i/3;return `<line class="fc-gridline" x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}"/><text x="${L-7}" y="${yy+3}" text-anchor="end">${esc(axisFmt.format(amount*factor))}</text>`}).join('');
  host.innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(tr('Forecast through ','资产预测截至 ')+monthLabel(out.end)+': '+displayMoney(out.rows.at(-1).total,out.fx))}">${grid}<polygon class="fc-fill" points="${area}"/><polyline class="fc-plot" points="${poly}"/><circle cx="${x(data.length-1)}" cy="${y(data.at(-1).total)}" r="4" fill="var(--uv-accent,#9bb7fb)"/>${labels}</svg>`;
 }
 function exportCSV(){
  const out=calculate();if(!out.valid)return;
  const head=['Month',...allFields().flatMap(f=>[f.key+' amount',f.key+' currency']), 'Total Income U','Personal Expenses U','Family Transfers U','Extra Spending U','Total Expenses U','Monthly Net U','Savings Rate %','Month-end Assets U'];
  const rows=out.rows.map(r=>[r.date,...allFields().flatMap(f=>[r.v[f.key].amount,r.v[f.key].currency]),r.incomeU,r.personalU,r.familyU,r.extraU,r.expenseU,r.net,savingRate(r.incomeU,r.net)??'',r.total]);
  const line=arr=>arr.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',');
  const blob=new Blob(['\ufeff',line(head)+'\r\n',...rows.map(x=>line(x)+'\r\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`MMHVAULT-Forecast-${out.first}-to-${out.end}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function numericInput(input){
   if(input.validity.badInput)return;
   const raw=input.value.trim(),num=val(raw);
   if(raw!==''&&num===null){input.setCustomValidity(tr('Enter a valid nonnegative number.','请输入有效的非负数字。'));return}
   input.setCustomValidity('');
   if(input.dataset.fcBase){
    const k=input.dataset.fcBase,f=fieldByKey(k);if(!f?.base)return;
    if(FIELD[k]){state.base[k]=raw===''?0:num;if(k==='salary')state.salaryConfigured=num>0}
    else {const item=state.customItems.find(x=>x.key===k);if(item)item.amount=raw===''?0:num}
   }else if(input.dataset.fcMonth){
    const d=input.dataset.fcMonth,k=input.dataset.fcField;
    if(!validMonth(d)||!fieldByKey(k))return;
    const m=state.months[d]||(state.months[d]={});
    if(raw==='')delete m[k];else m[k]=num;
    if(!Object.keys(m).length)delete state.months[d];
    if(k==='salary'&&raw!==''&&num>0)state.salaryConfigured=true;
   }
   save();syncDailyPanelVisibility();updateOutputs();mountDashboardDaily();
  }
  function onInput(e){
  const input=e.target;if(!(input instanceof HTMLInputElement))return;
  if(input.dataset.fcLabel){
    const item=state.customItems.find(x=>x.key===input.dataset.fcLabel);
    if(item){item.label=input.value.slice(0,48);save()}
    return;
   }
   if(input.id==='fc-savings-target'){
    if(input.validity.badInput)return;
    const n=Number(input.value);if(input.value!==''&&Number.isFinite(n)&&n>=0&&n<=100){state.targetSavingsRate=n;input.setCustomValidity('');save();updateOutputs()}
    else input.setCustomValidity(tr('Enter a rate from 0 to 100.','请输入 0 至 100 之间的百分比。'));
    return;
   }
   if(input.dataset.fcBase||input.dataset.fcMonth){numericInput(input);return}
  if(input.dataset.fcRate){const c=input.dataset.fcRate,raw=input.value.trim(),n=val(raw);if(!SCENARIO_CURRENCIES.includes(c))return;
   if(raw!==''&&(!(n>0)||n>1e8)){input.setCustomValidity(tr('Use a positive valid exchange rate.','请输入有效的正数汇率。'));return}
   input.setCustomValidity('');if(raw==='')delete state.fxOverrides[c];else state.fxOverrides[c]=n;
   if(c==='THB')state.rate=null;
   save();updateOutputs();
  }
 }
 function onChange(e){
  const node=e.target;
  if(node instanceof HTMLSelectElement&&node.id==='fc-extra-rate-currency'){
   if(!SCENARIO_CURRENCIES.includes(node.value)||CORE_RATES.includes(node.value))return;extraRate=node.value;layout();el('fc-extra-rate-currency')?.focus({preventScroll:true});return;
  }
  if(node instanceof HTMLSelectElement&&node.id==='fc-edit-month'){
   if(!range(startKey(),effectiveEnd(startKey())).includes(node.value)){node.value=selectedMonth;return}selectForecastMonth(node.value);el('fc-edit-month')?.focus({preventScroll:true});return;
  }
  if(node instanceof HTMLInputElement&&node.id==='fc-day-month'){
   if(!validMonth(node.value)||node.value>monthKey()||node.value<'2020-01'){node.value=state.dailyMonth||monthKey();return}
   state.dailyMonth=node.value;save();layout();return;
  }
  if(node instanceof HTMLInputElement&&node.id==='fc-end'){
   if(!validMonth(node.value))return;const first=startKey(),max=shift(first,239);
   if(node.value<first||node.value>max){node.setCustomValidity(tr('Choose a month within the next 240 months.','请选择未来240个月内的年月。'));node.focus({preventScroll:true});window.mmhVaultMessageV740?.(tr('Choose a month within the next 240 months.','请选择未来240个月内的年月。'),tr('Invalid month','月份有误'));return}
   node.setCustomValidity('');state.end=node.value;save();layout();return;
  }
 }
 function closeCurrencyMenus(except=null){closeForecastPickers(except)}
 function openScenarioRate(c){if(!SCENARIO_CURRENCIES.includes(c))return;if(!CORE_RATES.includes(c))extraRate=c;showModal('fx','','[data-fc-open-modal="fx"]');}
 function chooseCurrency(group,to){
  const baseKey=group.dataset.fcBaseCcy,monthDate=group.dataset.fcMonthCcy,monthKeyField=group.dataset.fcCcyField;
  const key=baseKey||monthKeyField,f=fieldByKey(key);
  if(!f||!validCcy(to))return;
  const before=exchangeRates();
  if(baseKey){
   const from=baseCurrency(f),old=baseAmount(f);
   if(from===to){closeCurrencyMenus();return}
   const next=convert(old,from,to,before);
   if(!Number.isFinite(next)){closeCurrencyMenus();openScenarioRate(before[from]>0?to:from);window.mmhVaultMessageV740?.(tr('Set valid currency rates before switching.','切换币种之前，请先填写有效汇率。'),tr('Currency rates','汇率提示'));return}
   if(FIELD[key]){state.base[key]=Number(next.toFixed(2));state.baseCurrencies[key]=to}else{const item=state.customItems.find(x=>x.key===key);item.amount=Number(next.toFixed(2));item.currency=to}
  }else{
   if(!validMonth(monthDate))return;
   const ccys=state.monthCurrencies[monthDate]||{};
   const oldCcy=ccys[key]||(f.base?baseCurrency(f):f.ccy);
   if(oldCcy===to){closeCurrencyMenus();return}
   const own=state.months[monthDate]||{};
   const old=Object.prototype.hasOwnProperty.call(own,key)?own[key]:(f.base?baseAmount(f):0);
   const next=convert(old,oldCcy,to,before);
   if(!Number.isFinite(next)){closeCurrencyMenus();openScenarioRate(before[oldCcy]>0?to:oldCcy);window.mmhVaultMessageV740?.(tr('Set valid currency rates before switching.','切换币种之前，请先填写有效汇率。'),tr('Currency rates','汇率提示'));return}
   const m=state.months[monthDate]||(state.months[monthDate]={});m[key]=Number(next.toFixed(2));
   ccys[key]=to;state.monthCurrencies[monthDate]=ccys;
  }
  if(key==='salary')state.salaryConfigured=(baseKey?Number(state.base.salary)>0:Number(monthlyValues(monthDate).salary.amount)>0);
  closeCurrencyMenus();save();layout();mountDashboardDaily();
  const selector=baseKey?`[data-fc-base-ccy="${key}"] .fc-currency-trigger`:`[data-fc-month-ccy="${monthDate}"][data-fc-ccy-field="${key}"] .fc-currency-trigger`;
  el(ROOT)?.querySelector(selector)?.focus({preventScroll:true});
 }
 function selectForecastMonth(date){if(!range(startKey(),effectiveEnd(startKey())).includes(date))return;selectedMonth=date;editOpen=true;layout();const editor=el(ROOT)?.querySelector('details.fc-month');if(editor)editor.open=true;editOpen=true;}
 async function onClick(e){
  const root=el(ROOT),btn=e.target.closest('button');
  if(!btn||!root?.contains(btn))return;
  if(btn.dataset.apCurrency){const picker=btn.closest('.fc-shared-picker');if(!picker)return;const code=btn.dataset.apCurrency,kind=picker.dataset.fcPickerKind;if(!validCcy(code)||!Array.from(picker.querySelector('select').options).some(o=>o.value===code))return;
  if(kind==='view'){const c=code;state.viewCurrency=c;save();if(!validDisplayRate(exchangeRates()))openScenarioRate(c);else{layout();el('fc-view-picker')?.querySelector('summary')?.focus({preventScroll:true})}return}
   if(kind==='rate'){extraRate=code;layout();el(ROOT)?.querySelector('[data-fc-picker-kind="rate"] summary')?.focus({preventScroll:true});return}
   if(kind==='field'){const group=picker.closest('.fc-money-pair');if(group)chooseCurrency(group,code);return}
  }
  if(btn.dataset.fcSelectMonth){const date=btn.dataset.fcSelectMonth;selectForecastMonth(date);root.querySelector('[data-fc-select-month="'+date+'"]')?.focus({preventScroll:true});return}
  if(Object.hasOwn(planLabels,btn.dataset.fcPlanPage)){window.setPage?.(btn.dataset.fcPlanPage);return}
  if(btn.dataset.fcOpenModal){const kind=btn.dataset.fcOpenModal;if(['plan','fx','target','months'].includes(kind))showModal(kind,'','[data-fc-open-modal="'+kind+'"]');return}
  if(btn.dataset.fcChooseMonth){const date=btn.dataset.fcChooseMonth;if(range(startKey(),effectiveEnd(startKey())).includes(date)){selectedMonth=date;layout();el(ROOT)?.querySelector('.fc-choice-picker summary')?.focus({preventScroll:true})}return}
  if(btn.dataset.fcMonthView||btn.dataset.fcMonthEdit){const date=btn.dataset.fcMonthView||btn.dataset.fcMonthEdit;if(range(startKey(),effectiveEnd(startKey())).includes(date))showModal(btn.dataset.fcMonthView?'view':'edit',date,btn.dataset.fcMonthView?'[data-fc-month-view="'+date+'"]':'[data-fc-month-edit="'+date+'"]');return}
  if(btn.dataset.fcBackModal){closeModal(true);return}
  if(btn.dataset.fcCloseModal){closeModal();return}
  if(btn.dataset.fcAdd){
   const type=btn.dataset.fcAdd;if(!['income','expense'].includes(type)||state.customItems.length>=40)return;
   let key;do{key='custom_'+Date.now().toString(36)+'_'+(++customSequence).toString(36)}while(state.customItems.some(x=>x.key===key));
   const count=state.customItems.filter(x=>x.type===(type==='income'?'income':'personal')).length+1;
   state.customItems.push({key,label:(type==='income'?tr('Other income ','其他收入 '):tr('Other expense ','其他支出 '))+count,type:type==='income'?'income':'personal',amount:0,currency:'USD'});
   save();layout();
   el(ROOT)?.querySelector('[data-fc-label="'+key+'"]')?.focus({preventScroll:true});
   return;
  }
  if(btn.dataset.fcRemove){
   const key=btn.dataset.fcRemove;
   if(FIELD[key]?.base){if(!state.disabledBase.includes(key))state.disabledBase.push(key)}
   else{
    state.customItems=state.customItems.filter(x=>x.key!==key);
    for(const store of [state.months,state.monthCurrencies])for(const d of Object.keys(store)){delete store[d][key];if(!Object.keys(store[d]).length)delete store[d]}
   }
   if(key==='salary')state.salaryConfigured=false;
   save();layout();return;
  }
  if(btn.dataset.fcClearMonth){const date=btn.dataset.fcClearMonth;if(!range(startKey(),effectiveEnd(startKey())).includes(date))return;if(!state.months[date]&&!state.monthCurrencies[date])return;const id=activeOwner,prior=state;if(typeof window.mmhVaultConfirmV740!=='function'||!(await window.mmhVaultConfirmV740(tr('Clear forecast changes for this month only? Real transactions remain unchanged.','仅清除本月预测调整？真实交易不会改变。'),tr('Clear month changes','清除本月调整'))))return;if(activeOwner!==id||state!==prior)return;delete state.months[date];delete state.monthCurrencies[date];save();layout();el(ROOT)?.querySelector('[data-fc-clear-month="'+date+'"]')?.focus({preventScroll:true});return}
  const action=btn.dataset.fcAction;
  if(action==='reset-day-salary'){
   const d=dailyInfo(state.dailyMonth).selected;const m=state.months[d],cc=state.monthCurrencies[d];
   if(m){delete m.salary;if(!Object.keys(m).length)delete state.months[d]}
   if(cc){delete cc.salary;if(!Object.keys(cc).length)delete state.monthCurrencies[d]}
   save();layout();return;
  }
  if(action==='save'){
   const bad=el(ROOT)?.querySelector('input:invalid');if(bad){bad.reportValidity?.();bad.focus?.({preventScroll:true});return}
   for(const item of state.customItems)if(!item.label.trim()){const input=el(ROOT)?.querySelector('[data-fc-label="'+item.key+'"]');input?.focus();window.mmhVaultMessageV740?.(tr('Enter a name for every custom item.','请为每个自定义项目填写名称。'),tr('Name required','请填写名称'));return}
   if(persist()){if(modal)closeModal();window.mmhVaultMessageV740?.(tr('Forecast settings saved on this device.','预测设置已保存到当前设备。'),tr('Saved','保存成功'));}
   return;
  }
  if(action==='discard'){
   state=getState(activeOwner);dirty=false;layout();return;
  }
  if(action==='refresh'){updateOutputs();return}
  if(action==='export'){exportCSV();return}
  if(action==='reset'){
   if(typeof window.mmhVaultConfirmV740!=='function'||!(await window.mmhVaultConfirmV740(tr('Reset local forecast settings for this account? Real transactions remain unchanged.','确定重置当前账户在本浏览器的预测设置吗？不会改变真实交易。'),tr('Reset forecast','重置资产预测'))))return;
   const previousCurrency=state.viewCurrency;state=defaultState();state.viewCurrency=previousCurrency;persist();layout();
  }
 }
 function resetDailyMonthOnCalendarChange(){const today=monthKey();if(lastDailyCalendar&&today!==lastDailyCalendar&&state)state.dailyMonth='';lastDailyCalendar=today}
 function dateChanged(){syncOwner();resetDailyMonthOnCalendarChange();if(active()){if(lastFirst!==startKey()){layout();return}updateOutputs()}else if(el('dashboard')?.classList.contains('active'))mountDashboardDaily()}
 function stopMidnight(){if(midnightTimer){clearTimeout(midnightTimer);midnightTimer=0}}
 function scheduleMidnight(){stopMidnight();if(!(active()||el('dashboard')?.classList.contains('active'))||document.hidden)return;const now=new Date(),tomorrow=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,0,0,2);midnightTimer=setTimeout(()=>{midnightTimer=0;dateChanged();scheduleMidnight()},Math.max(1000,tomorrow-now))}
 function onVisible(){syncOwner();resetDailyMonthOnCalendarChange();if(active()){layout();scheduleMidnight()}else{modal='';modalReturn='';modalOrigin='';stopMidnight();if(el('dashboard')?.classList.contains('active'))mountDashboardDaily()}}
 function init(){
  const root=el(ROOT);if(!root)return;
  watchDashboard();
  root.addEventListener('scroll',e=>{if(!e.target.closest?.('.fc-shared-menu,.fc-choice-menu'))closeForecastPickers()},true);
  root.addEventListener('input',onInput);root.addEventListener('change',onChange);root.addEventListener('click',onClick);
  root.addEventListener('toggle',e=>{const picker=e.target;if(!picker.matches?.('.fc-shared-picker,.fc-choice-picker'))return;if(picker.open){closeForecastPickers(picker);if(picker.matches('.fc-shared-picker'))setupCurrencyPicker(picker);positionForecastPicker(picker)}},true);
  document.addEventListener('pointerdown',e=>{const p=e.target.closest?.('#'+ROOT+' .fc-shared-picker,#'+ROOT+' .fc-choice-picker');closeForecastPickers(p||null)},{passive:true});
  document.addEventListener('keydown',e=>{if(!active()||el('mmhVaultDialogV449')?.classList.contains('show'))return;if(e.key==='Tab'&&modal){const dialog=root.querySelector('.fc-dialog');const controls=[...dialog?.querySelectorAll('button:not(:disabled),input:not(:disabled),summary,[tabindex="0"]')||[]].filter(x=>x.getClientRects().length&&getComputedStyle(x).visibility!=='hidden');if(controls.length){const first=controls[0],last=controls.at(-1);if(e.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){e.preventDefault();last.focus()}else if(!e.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){e.preventDefault();first.focus()}}}if(e.key==='Escape'){const picker=root.querySelector('.fc-shared-picker[open],.fc-choice-picker[open]');if(picker){e.preventDefault();closeForecastPickers();picker.querySelector('summary')?.focus({preventScroll:true})}else if(modal&&active()&&!el('mmhVaultDialogV449')?.classList.contains('show')){e.preventDefault();closeModal()}}});
  for(const name of ['mmhvault:page-visible','mmhvault:config-owner-changed','mmhvault:data-loaded','mmhvault:data-change','mmhvault:cache-restored','mmhvault:market-updated','mmhvault-language-change','languagechange']){
   window.addEventListener(name,()=>{if(active()){if(['mmhvault-language-change','languagechange','mmhvault:config-owner-changed'].includes(name))onVisible();else dateChanged()}else{if(name==='mmhvault:config-owner-changed')syncOwner();if(name==='mmhvault:page-visible'){modal='';modalReturn='';modalOrigin=''}if(el('dashboard')?.classList.contains('active')){if(['mmhvault-language-change','languagechange'].includes(name)){el('mmhDailyDashboardV13')?.remove()}watchDashboard();scheduleMidnight()}}},{passive:true});
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMidnight();else onVisible()},{passive:true});
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
  let chartResizeFrame=0;
  window.addEventListener('resize',()=>{if(!active()||!state)return;closeForecastPickers();cancelAnimationFrame(chartResizeFrame);chartResizeFrame=requestAnimationFrame(()=>{if(active()&&state)drawChart(calculate())})},{passive:true});
  window.addEventListener('pageshow',onVisible,{passive:true});window.addEventListener('focus',()=>{dateChanged();scheduleMidnight()},{passive:true});
  document.addEventListener('click',e=>{if(e.target.closest('#mmhDailyDashboardV13 [data-mmh-open-daily]')){e.preventDefault();window.setPage?.('forecast')}});
  syncOwner();onVisible();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
