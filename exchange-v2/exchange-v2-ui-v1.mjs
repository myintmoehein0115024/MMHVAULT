/**
 * MMHVAULT Exchange V2 — independently mountable Premium Glass UI.
 * Draft PR #27 only. NOT loaded from app.html until Staging/Auth/RLS and release QA.
 * Custom searchable pickers; never inserts demo prices or uses localStorage for rates.
 */
import {ASIA_CURRENCIES_V1,canonicalPairV1} from './asia-fx-core-v1.mjs';
import {createExchangeV2SessionV1} from './exchange-v2-session-v1.mjs?v=2.0.6-release1';


const TEXT={
 zh:{convert:'货币换算',saved:'已保存汇率',cloud:'个人云端汇率',amount:'金额',from:'从',to:'到',
 base:'基准币种',quote:'目标币种',price:'手动汇率',rate:'汇率',save:'保存汇率',cancel:'取消修改',
 add:'新增',edit:'编辑',remove:'删除',confirm:'确认删除',swap:'互换币种',
 search:'搜索货币名称或代码',missing:'缺少有效的已保存汇率，请先在 Saved Rates 添加。',
 loading:'正在读取个人云端汇率…',unavailable:'云端汇率不可用；未使用任何模拟报价。',
 success:'汇率已保存到个人云端',removed:'汇率已删除',invalid:'请输入有效的正数汇率。',
 noEditPair:'编辑期间不可更换币种组合，请先取消修改。',
 source:'来源：手动保存',derived:'通过已保存 USD 基准推算',legacy:'现有 USD 参考汇率',
 identity:'相同币种 1:1',invalidAmount:'请输入有效且非负的金额',empty:'暂无自定义汇率。',
 notReady:'等待真实云端汇率载入',refresh:'刷新',error:'操作失败；已保存数据未被本地覆盖。'},
 en:{convert:'Currency Converter',saved:'Saved Rates',cloud:'Your cloud-saved currency pairs',
 amount:'Amount',from:'From',to:'To',base:'Base currency',quote:'Quote currency',
 price:'Manual rate',rate:'Exchange rate',save:'Save rate',cancel:'Cancel edit',add:'Add',
 edit:'Edit',remove:'Delete',confirm:'Confirm delete',swap:'Swap currencies',
 search:'Search currency name or code',missing:'No trusted saved rate. Add the pair in Saved Rates.',
 loading:'Loading your personal cloud rates…',unavailable:'Cloud rates unavailable; no demo prices are used.',
 success:'Rate saved to your cloud account',removed:'Saved rate deleted',invalid:'Enter a positive valid rate.',
 noEditPair:'Cancel editing before changing this currency pair.',
 source:'Source: manually saved',derived:'Derived from saved USD anchors',legacy:'Existing USD reference rate',
 identity:'Same currency 1:1',invalidAmount:'Enter a valid non-negative amount',
 empty:'No saved custom rates yet.',notReady:'Waiting for real cloud rates',refresh:'Refresh',
 error:'Operation failed; locally edited values were not uploaded.'},
 my:{convert:'ငွေကြေး ပြောင်းလဲတွက်ချက်မှု',saved:'သိမ်းထားသော ငွေလဲနှုန်း',cloud:'သင့်အကောင့်၏ Cloud ငွေလဲနှုန်း',
 amount:'ပမာဏ',from:'မှ',to:'သို့',base:'အခြေခံငွေကြေး',quote:'လဲလှယ်မည့် ငွေကြေး',
 price:'ကိုယ်တိုင်သတ်မှတ်နှုန်း',rate:'ငွေလဲနှုန်း',save:'နှုန်းထား သိမ်းဆည်းရန်',
 cancel:'ပြင်ဆင်မှု ပယ်ဖျက်',add:'အသစ်ထည့်ရန်',edit:'ပြင်ရန်',remove:'ဖျက်ရန်',
 confirm:'ဖျက်ရန် အတည်ပြု',swap:'ငွေကြေး နှစ်မျိုး လဲရန်',
 search:'ငွေကြေးအမည် သို့မဟုတ် ကုဒ် ရှာရန်',
 missing:'သိမ်းဆည်းထားသော နှုန်း မရှိသေးပါ။ Saved Rates တွင် ထည့်ပါ။',
 loading:'Cloud ငွေလဲနှုန်းများ ရယူနေပါသည်…',
 unavailable:'Cloud နှုန်းထားများ မရပါ။ စမ်းသပ်နှုန်းထား မသုံးပါ။',
 success:'Cloud တွင် သိမ်းဆည်းပြီးပါပြီ',removed:'နှုန်းထား ဖျက်ပြီးပါပြီ',
 invalid:'သုညထက်ကြီးသော မှန်ကန်သည့် နှုန်းကို ထည့်ပါ။',
 noEditPair:'ငွေကြေးတွဲ ပြောင်းရန် ပြင်ဆင်မှုကို အရင်ပယ်ဖျက်ပါ။',
 source:'ရင်းမြစ် - ကိုယ်တိုင်သိမ်းထားသည်',derived:'သိမ်းထားသော USD နှုန်းမှ တွက်ချက်ထားသည်',
 legacy:'မူလ USD ကိုးကားနှုန်း',identity:'တူညီသော ငွေကြေး 1:1',
 invalidAmount:'မှန်ကန်သည့် ပမာဏကို ထည့်ပါ။',empty:'သိမ်းထားသော နှုန်း မရှိသေးပါ။',
 notReady:'Cloud နှုန်းထားကို စောင့်နေပါသည်',refresh:'ပြန်လည်စစ်ဆေးရန်',
 error:'လုပ်ဆောင်မှု မအောင်မြင်ပါ။'}
};
const currencies=new Map(ASIA_CURRENCIES_V1.map(c=>[c.code,c]));
const currencyName=(c,lang)=>marketCurrencyNameV203(c,lang);
const keyOf=(a,b)=>[a,b].sort().join('/');
const locale=()=>{
 let lang='en';try{lang=String(localStorage.getItem('mmhvault_language_v3363')||'en').toLowerCase()}catch{}
 return lang.startsWith('zh')?'zh':lang==='my'||lang==='mm'||lang.startsWith('my-')?'my':'en';
};

const COMMON=['USD','MMK','THB','CNY','JPY','SGD','MYR','KRW','HKD','INR','VND','IDR','PHP','AED','AMD'];
export function marketCurrencyNameV203(c,lang){
 if(lang==='zh')return c.zh;
 if(lang==='my')try{return new Intl.DisplayNames(['my'],{type:'currency',fallback:'none'}).of(c.code)||c.en}catch(_){}
 return c.en;
}
export function marketCurrencyOptionsV203(query='',lang='en'){
 const q=String(query).trim().toLocaleLowerCase();
 const order=c=>{const i=COMMON.indexOf(c.code);return i<0?COMMON.length:i};
 return ASIA_CURRENCIES_V1.filter(c=>!q||[c.code,c.en,c.zh,c.flag,marketCurrencyNameV203(c,lang)].some(v=>v.toLocaleLowerCase().includes(q)))
 .sort((a,b)=>order(a)-order(b));
}
export function marketFormatV203(value,lang='en'){
 if(typeof value!=='number'||!Number.isFinite(value)||value<0)return '—';
 if(value===0)return '0';
 if(value<1e-8)return value.toExponential(6);
 return new Intl.NumberFormat(lang==='zh'?'zh-CN':lang,{maximumSignificantDigits:12}).format(value);
}
export function marketRateSourcesV203(answer){
 if(!answer.available)return [];
 if(answer.method==='identity')return ['identity'];
 if(answer.method==='manual')return ['personal'];
 const sources=new Set((answer.sources||[]).map(s=>({manual:'personal',market:'market',legacy:'legacy'})[s]).filter(Boolean));
 return ['personal','market','legacy'].filter(s=>sources.has(s));
}
export function marketDuplicateV203(pairs,a,b){
 return pairs.some(row=>keyOf(row.base_code,row.quote_code)===keyOf(a,b));
}
export function marketSavedMatchesV206(row,query='',lang='en'){
 const q=String(query).trim().toLocaleLowerCase();if(!q)return true;
 const a=currencies.get(row.base_code),b=currencies.get(row.quote_code);
 return [row.base_code,row.quote_code,row.base_code+'/'+row.quote_code,row.quote_code+'/'+row.base_code,...[a,b].filter(Boolean).flatMap(c=>[c.en,c.zh,c.flag,marketCurrencyNameV203(c,lang)])].some(v=>String(v||'').toLocaleLowerCase().includes(q));
}
const COPY206={en:{searchSaved:'Search saved rates',noSavedMatches:'No matching saved rates'},zh:{searchSaved:'搜索已保存汇率',noSavedMatches:'没有匹配的已保存汇率'},my:{searchSaved:'သိမ်းထားသော နှုန်း ရှာရန်',noSavedMatches:'ကိုက်ညီသော သိမ်းထားသည့် နှုန်း မရှိပါ'}};
const COPY203={
 en:{personal:'Personal rate',market:'Market reference',legacy:'Last accounting reference',unknown:'Source unavailable',result:'Result',close:'Close',cancel:'Cancel',noResults:'No matching currencies',addTitle:'Add saved rate',editTitle:'Edit saved rate',deleteTitle:'Delete saved rate?',deleteNote:'The converter will use an available market reference or the previous accounting reference.',duplicate:'This currency pair is already saved. Edit the existing rate.',pairInvalid:'Choose two different currencies and a valid positive rate.',ready:'Saved rates are temporarily unavailable. Refresh before editing.',note:'Only your saved rates appear here. Market rates are not imported automatically.',previous:'Previous accounting reference',previousNote:'Original references are not automatically saved.',anchor:'USD anchor',custom:'Converter only',busy:'Saving…',sourceLabel:'Rate source'},
 zh:{personal:'个人汇率',market:'市场参考汇率',legacy:'上次记账参考汇率',unknown:'来源不可用',result:'换算结果',close:'关闭',cancel:'取消',noResults:'没有匹配的币种',addTitle:'新增个人汇率',editTitle:'编辑个人汇率',deleteTitle:'删除个人汇率？',deleteNote:'换算器将优先使用有效市场汇率，否则使用原记账参考汇率。',duplicate:'该币种对已保存，请编辑已有汇率。',pairInvalid:'请选择不同币种，并输入有效正数汇率。',ready:'个人汇率暂不可用，请刷新后再编辑。',note:'仅显示主动保存的汇率，不会自动导入市场行情。',previous:'原记账参考',previousNote:'原参考不会自动保存。',anchor:'USD 基准汇率',custom:'仅用于换算',busy:'正在保存…',sourceLabel:'汇率来源'},
 my:{personal:'ကိုယ်ပိုင်နှုန်း',market:'ဈေးကွက် ကိုးကားနှုန်း',legacy:'ယခင်စာရင်းနှုန်း',unknown:'ရင်းမြစ် မရပါ',result:'တွက်ချက်ရလဒ်',close:'ပိတ်ရန်',cancel:'ပယ်ဖျက်ရန်',noResults:'ကိုက်ညီသော ငွေကြေး မရှိပါ',addTitle:'ငွေလဲနှုန်း အသစ်ထည့်ရန်',editTitle:'ငွေလဲနှုန်း ပြင်ရန်',deleteTitle:'သိမ်းထားသော နှုန်းကို ဖျက်မလား။',deleteNote:'ဈေးကွက်နှုန်း ရရှိပါက သုံးမည်။ မရပါက ယခင်စာရင်းနှုန်းကို သုံးမည်။',duplicate:'ဤငွေကြေးအတွဲ သိမ်းထားပြီးပါပြီ။ ရှိပြီးသားနှုန်းကို ပြင်ပါ။',pairInvalid:'မတူညီသော ငွေကြေးနှစ်မျိုးနှင့် သုညထက်ကြီးသော နှုန်းကို ထည့်ပါ။',ready:'နှုန်းထားများ မရသေးပါ။ ပြန်လည်စစ်ဆေးပါ။',note:'သင်သိမ်းထားသော နှုန်းများသာ ပြသည်။ ဈေးကွက်နှုန်းကို အလိုအလျောက် မသိမ်းပါ။',previous:'ယခင်စာရင်းနှုန်း',previousNote:'ယခင်နှုန်းများကို အလိုအလျောက် မသိမ်းပါ။',anchor:'USD အခြေခံနှုန်း',custom:'တွက်ချက်စက်အတွက်သာ',busy:'သိမ်းဆည်းနေပါသည်…',sourceLabel:'နှုန်းထား ရင်းမြစ်'}
};
const CSS=`
.fxv2{--fx-bg:var(--uv-card,Canvas);--fx-raised:var(--uv-raised,Canvas);--fx-text:var(--uv-text,CanvasText);--fx-muted:var(--uv-muted,GrayText);--fx-line:var(--uv-line,GrayText);--fx-accent:var(--uv-accent,Highlight);color:var(--fx-text);font:inherit;min-width:0;width:100%;container-type:inline-size}
html body #exchange.page.active > #mmhExchangeV2StagingRoot[data-exchange-v2-mounted="yes"]:not([hidden]){display:block!important;grid-column:1/-1!important;grid-row:3!important;width:100%!important;min-width:0!important;max-width:none!important;margin:0!important;align-self:start!important;justify-self:stretch!important}
html body #exchange.page.active:has(> #mmhExchangeV2StagingRoot[data-unified-accounting="yes"]:not([hidden])) > .ex-rate-editor{display:none!important}
.fxv2 *{box-sizing:border-box}
.fxv2 [hidden]{display:none!important}
.fxv2-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;width:100%}
.fxv2 .fxv2-panel{min-width:0;width:100%;padding:16px;border:1px solid var(--fx-line);border-radius:12px;background:var(--fx-bg);background-image:none;box-shadow:none;align-self:start}
.fxv2 .fxv2-heading{position:static!important;display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 14px;padding:0!important;min-height:0!important;height:auto!important;width:auto!important;background:none!important;border:0!important;box-shadow:none!important}
.fxv2 .fxv2-heading h2,.fxv2 .fxv2-dialog h2{font-weight:650;line-height:1.4;font-size:15px;margin:0;color:var(--fx-text)}
.fxv2 .fxv2-fields{display:grid;grid-template-columns:minmax(0,1fr) 40px minmax(0,1fr);gap:8px;align-items:end}
.fxv2 .fxv2-fields.saved{grid-template-columns:repeat(2,minmax(0,1fr))}
.fxv2 label{min-width:0;display:block}
.fxv2 .fxv2-label{display:block;font-size:12px;font-weight:600;color:var(--fx-muted);margin:0 0 6px}
.fxv2 :is(.fxv2-picker,.fxv2-input,.fxv2-small,.fxv2-swap,.fxv2-primary){border:1px solid var(--fx-line);border-radius:8px;background:var(--fx-raised);background-image:none;box-shadow:none;color:var(--fx-text);font:inherit;min-height:42px;padding:8px 10px}
.fxv2 :is(.fxv2-picker,.fxv2-input){width:100%;min-width:0}
.fxv2 .fxv2-picker{text-align:start;white-space:normal;overflow-wrap:anywhere;line-height:1.35}
.fxv2 .fxv2-swap{width:40px;padding:0;font-size:20px}
.fxv2 .fxv2-primary{border-color:var(--fx-accent);font-weight:650}
.fxv2 button:disabled{opacity:.5;cursor:default}
.fxv2 button:focus-visible,.fxv2 input:focus-visible{outline:2px solid var(--fx-accent);outline-offset:2px}
.fxv2 .fxv2-amount{margin-top:14px}
.fxv2 .fxv2-result{margin-top:14px;padding:14px;border:1px solid var(--fx-line);border-radius:10px;background:var(--fx-raised)}
.fxv2 .fxv2-value{font-size:clamp(21px,3vw,30px);font-weight:650;line-height:1.3;overflow-wrap:anywhere;font-variant-numeric:tabular-nums;color:var(--fx-text)}
.fxv2 :is(.fxv2-note,.fxv2-muted,.fxv2-accounting-note){font-size:12px;color:var(--fx-muted);overflow-wrap:anywhere}
.fxv2 .fxv2-note{margin-top:6px;font-variant-numeric:tabular-nums}
.fxv2 .fxv2-saved-search{margin:6px 0}.fxv2 .fxv2-list{max-height:380px;overflow:auto;overscroll-behavior:contain;min-width:0;margin-top:6px}
.fxv2 .fxv2-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid var(--fx-line);min-width:0}
.fxv2 .fxv2-item:last-child{border-bottom:0}
.fxv2 .fxv2-item-main{min-width:0;overflow-wrap:anywhere}
.fxv2 .fxv2-item-main strong{font-size:13px}
.fxv2 .fxv2-rate{font-size:14px;font-weight:650;font-variant-numeric:tabular-nums;margin-top:4px}
.fxv2 .fxv2-item-actions{display:flex;gap:4px}
.fxv2 .fxv2-item-actions button{width:44px;min-height:44px;padding:4px}
.fxv2 .fxv2-status:not(:empty){margin:8px 0;padding:8px 10px;border:1px solid var(--fx-line);border-radius:8px;color:var(--fx-text);font-size:12px;overflow-wrap:anywhere}
.fxv2 .fxv2-accounting-note{margin:10px 0 0}
.fxv2 .fxv2-auto-slot:empty{display:none}
.fxv2 .fxv2-dialog{position:fixed;inset:0;margin:auto;width:min(440px,calc(100% - 24px));max-width:100%;max-height:min(80vh,680px);max-height:min(80dvh,680px);padding:0;border:1px solid var(--fx-line);border-radius:14px;background:var(--fx-bg);background-image:none;color:var(--fx-text);overflow:hidden;box-shadow:none}
.fxv2 .fxv2-dialog[open]{display:flex;flex-direction:column}
.fxv2 .fxv2-dialog:not([open]){display:none!important}
.fxv2 .fxv2-dialog::backdrop{background:rgba(0,0,0,.54)}
.fxv2 .fxv2-dialog-head,.fxv2 .fxv2-dialog-foot{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;background:var(--fx-bg)}
.fxv2 .fxv2-dialog-head{border-bottom:1px solid var(--fx-line)}
.fxv2 .fxv2-dialog-foot{border-top:1px solid var(--fx-line);justify-content:flex-end;flex-wrap:wrap}
.fxv2 .fxv2-dialog-body{min-height:0;overflow:auto;overscroll-behavior:contain;padding:14px;display:grid;gap:12px}
.fxv2 .fxv2-options{display:grid;gap:3px}
.fxv2 .fxv2-options button{text-align:start;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--fx-text);min-height:42px;padding:8px;font:inherit;overflow-wrap:anywhere}
.fxv2 .fxv2-options button[aria-selected=true]{background:var(--fx-raised);border-color:var(--fx-line)}
@container (max-width:740px){.fxv2-grid{grid-template-columns:minmax(0,1fr)}}
@media(max-width:760px){.fxv2-grid{grid-template-columns:minmax(0,1fr)}}
@media(max-width:480px){.fxv2 .fxv2-panel{padding:12px}.fxv2 .fxv2-dialog{width:calc(100% - 24px);max-height:min(80vh,680px);max-height:min(80dvh,680px)}}
@container (max-width:280px){.fxv2 .fxv2-fields,.fxv2 .fxv2-fields.saved{grid-template-columns:minmax(0,1fr)}.fxv2 .fxv2-swap{justify-self:center}}

html body #exchange#exchange[data-market-v2-mounted] .fxv2 {--fx-bg:var(--mv74-card);--fx-raised:var(--mv74-raised);--fx-text:var(--mv74-text);--fx-muted:var(--mv74-muted);--fx-line:var(--mv74-line);--fx-accent:var(--mv74-gold)}
html body #exchange#exchange[data-market-v2-mounted] .fxv2 :is(.fxv2-panel,.fxv2-dialog,.fxv2-result){background:var(--fx-bg)!important;background-image:none!important;border:1px solid var(--fx-line)!important;border-radius:12px!important;color:var(--fx-text)!important;box-shadow:none!important}
html body #exchange#exchange[data-market-v2-mounted] .fxv2 .fxv2-panel{padding:12px!important}
html body #exchange#exchange[data-market-v2-mounted] .fxv2 .fxv2-result{background:var(--fx-raised)!important}
html body #exchange#exchange[data-market-v2-mounted] .fxv2 :is(.fxv2-picker,.fxv2-input,.fxv2-small,.fxv2-swap,.fxv2-primary){background:var(--fx-raised)!important;background-image:none!important;color:var(--fx-text)!important;border:1px solid var(--fx-line)!important;box-shadow:none!important;border-radius:8px!important;font-size:12px!important;min-height:38px!important;padding:7px 9px!important;line-height:1.35!important}
html body #exchange#exchange[data-market-v2-mounted] .fxv2 .fxv2-picker{display:block!important;text-align:start!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
html body #exchange#exchange[data-market-v2-mounted] .fxv2 :is(.fxv2-swap,.fxv2-primary){color:var(--fx-accent)!important}
html body #exchange#exchange[data-market-v2-mounted] .fxv2 :is(.fxv2-dialog-head,.fxv2-dialog-foot){position:static!important;background:var(--fx-bg)!important;background-image:none!important;box-shadow:none!important;padding:10px 12px!important}
html body #exchange#exchange[data-market-v2-mounted] .fxv2 .fxv2-dialog-head button{width:34px!important;min-width:34px!important;height:34px!important;min-height:34px!important;padding:0!important;display:grid!important;place-items:center!important;color:var(--fx-accent)!important;font-size:18px!important}
html body #exchange#exchange[data-market-v2-mounted] .fxv2 .fxv2-inline-picker{position:fixed!important;inset:auto!important;left:var(--fx278-x,12px)!important;top:var(--fx278-y,120px)!important;width:var(--fx278-w,290px)!important;max-height:var(--fx278-h,330px)!important;z-index:1100!important;margin:0!important;background:var(--fx-bg)!important;color:var(--fx-text)!important;border:1px solid var(--fx-line)!important;border-radius:12px!important;padding:8px!important;box-shadow:0 8px 28px #0003!important;overflow:hidden}
html body #exchange#exchange[data-market-v2-mounted] .fxv2 .fxv2-inline-picker:not([hidden]){display:grid!important;grid-template-rows:auto minmax(0,1fr);gap:6px}
html body #exchange#exchange[data-market-v2-mounted] .fxv2 .fxv2-inline-picker.fx278-up{transform:translateY(-100%)}
html body #exchange#exchange[data-market-v2-mounted] .fxv2 .fxv2-inline-picker[hidden]{display:none!important}
html body #exchange#exchange[data-market-v2-mounted] .fxv2 .fxv2-inline-picker select[hidden]{display:none!important}
html body #exchange#exchange[data-market-v2-mounted] .fxv2 .fxv2-options{overflow:auto;min-height:0;max-height:250px}
html body #exchange#exchange[data-market-v2-mounted] .fxv2 .fxv2-options button{display:flex!important;width:100%!important;justify-content:space-between!important;align-items:center!important;background:transparent!important;color:var(--fx-text)!important;border:0!important;box-shadow:none!important;min-height:36px!important;height:auto!important;padding:6px 8px!important;text-align:start!important;font-size:12px!important}
html body #exchange#exchange[data-market-v2-mounted] .fxv2 .fxv2-options button:is([aria-pressed=true],[aria-selected=true]){background:var(--fx-raised)!important;color:var(--fx-accent)!important}
`;
export function mountExchangeV2V1({root,db,getLegacyRates=()=>null,getPreviousRates=()=>null,getMarketRates=()=>({}),onPairsChanged=()=>{},integrated=false}={}){
 if(!root||typeof root.querySelector!=='function')throw Error('A dedicated Exchange V2 root is required');
 if(root.dataset.exchangeV2Mounted==='yes')throw Error('Exchange V2 already mounted');
 const session=createExchangeV2SessionV1({db,getLegacyRates,getMarketRates,onPairsChanged});
 const state={from:'USD',to:'MMK',base:'USD',quote:'JPY',edit:null,confirm:null,editorOwner:'',selected:null,loading:false,generation:0,pendingReload:false,destroyed:false};
 root.dataset.exchangeV2Mounted='yes';if(integrated)root.dataset.unifiedAccounting='yes';root.classList.add('fxv2');
 const style=document.createElement('style');style.textContent=CSS;root.append(style);
 const shell=document.createElement('div');shell.className='fxv2-grid';
 shell.innerHTML=`
 <section class="fxv2-panel"><div class="fxv2-heading"><h2 data-v2-t="convert"></h2><button type="button" class="fxv2-small" data-v2-action="refresh"></button></div>
 <div class="fxv2-fields"><label><span class="fxv2-label" data-v2-t="from"></span><button type="button" class="fxv2-picker" data-v2-pick="from"></button></label><button type="button" class="fxv2-swap" data-v2-action="swap">⇄</button><label><span class="fxv2-label" data-v2-t="to"></span><button type="button" class="fxv2-picker" data-v2-pick="to"></button></label></div>
 <label class="fxv2-amount"><span class="fxv2-label" data-v2-t="amount"></span><input type="number" inputmode="decimal" min="0" step="any" value="1" class="fxv2-input" data-v2-amount></label>
 <div class="fxv2-result" role="status" aria-live="polite"><div class="fxv2-label" data-v2-t="result"></div><div class="fxv2-value" data-v2-value>—</div><div class="fxv2-note" data-v2-note></div></div><div class="fxv2-auto-slot" data-v2-auto-slot></div></section>
 <section class="fxv2-panel"><div class="fxv2-heading"><h2 data-v2-t="saved"></h2><button type="button" class="fxv2-primary" data-v2-action="add" data-v2-t="add"></button></div>
 <div class="fxv2-status" data-v2-status role="status" aria-live="polite"></div><input type="search" class="fxv2-input fxv2-saved-search" data-v2-saved-search autocomplete="off" hidden><div class="fxv2-list" data-v2-list></div><p class="fxv2-accounting-note" data-v2-accounting-note></p><details class="fxv2-accounting-note" data-v2-previous hidden><summary data-v2-t="previous"></summary><p data-v2-previous-text></p></details></section>`;
 root.append(shell);
 const editor=document.createElement('dialog');editor.className='fxv2-dialog';editor.setAttribute('aria-labelledby','fxv203-editor-title');
 editor.innerHTML=`<div class="fxv2-dialog-head"><h2 id="fxv203-editor-title" data-v2-editor-title></h2><button type="button" class="fxv2-small" data-v2-action="cancel">×</button></div><div class="fxv2-dialog-body"><div data-v2-edit-fields><div class="fxv2-fields saved"><label><span class="fxv2-label" data-v2-t="base"></span><button type="button" class="fxv2-picker" data-v2-pick="base"></button></label><label><span class="fxv2-label" data-v2-t="quote"></span><button type="button" class="fxv2-picker" data-v2-pick="quote"></button></label></div><label class="fxv2-amount"><span class="fxv2-label" data-v2-t="price"></span><input type="number" inputmode="decimal" min="0" step="any" class="fxv2-input" data-v2-rate></label></div><div data-v2-delete-fields hidden><strong data-v2-delete-pair></strong><p class="fxv2-note" data-v2-t="deleteNote"></p></div><div class="fxv2-status" data-v2-editor-status role="status" aria-live="polite"></div></div><div class="fxv2-dialog-foot"><button type="button" class="fxv2-small" data-v2-action="cancel" data-v2-t="cancel"></button><button type="button" class="fxv2-primary" data-v2-action="save"></button></div>`;
 const picker=document.createElement('div');picker.className='fxv2-inline-picker mmh-shared-currency-v3';picker.hidden=true;picker.setAttribute('role','group');
 picker.innerHTML='<label></label><input type="search" class="fxv2-input" data-v2-search autocomplete="off"><div class="fxv2-options ap-currency-list-v2" data-v2-options></div><select hidden aria-hidden="true" tabindex="-1"></select>';
 root.append(editor,picker);
 const find=s=>root.querySelector(s), tr=k=>COPY206[locale()]?.[k]||COPY203[locale()]?.[k]||TEXT[locale()]?.[k]||k;
 const btnText=code=>{const c=currencies.get(code);return c?c.flag+' '+code+' · '+currencyName(c,locale()):code};
 const pairText=(a,b)=>(currencies.get(a)?.flag||'')+' '+a+' → '+(currencies.get(b)?.flag||'')+' '+b;
 const status=(m,local=false)=>find(local?'[data-v2-editor-status]':'[data-v2-status]').textContent=m;
 function updateConversion(){
   const result=find('[data-v2-value]'),note=find('[data-v2-note]');
   const answer=session.quote({from:state.from,to:state.to,amount:find('[data-v2-amount]').value});
   if(!answer.available){result.textContent='—';note.textContent=tr(answer.reason==='invalid-amount'?'invalidAmount':answer.reason==='not-ready'?'notReady':'missing');return}
   result.textContent=marketFormatV203(answer.result,locale())+' '+state.to;
   const sources=marketRateSourcesV203(answer).map(tr).join(' + ')||tr('unknown');
   note.textContent='1 '+state.from+' = '+marketFormatV203(answer.rate,locale())+' '+state.to+' · '+tr('sourceLabel')+': '+sources;
 }
 function updateLabels(){
   for(const e of root.querySelectorAll('[data-v2-t]'))e.textContent=tr(e.dataset.v2T);
   for(const e of root.querySelectorAll('[data-v2-pick]')){e.textContent=btnText(state[e.dataset.v2Pick])+' ⌄';e.setAttribute('aria-expanded',String(!picker.hidden&&state.selected===e.dataset.v2Pick));e.disabled=state.loading||(!!state.edit&&['base','quote'].includes(e.dataset.v2Pick))}
   find('[data-v2-action="refresh"]').textContent=tr('refresh');
   find('[data-v2-action="swap"]').setAttribute('aria-label',tr('swap'));
   picker.setAttribute('aria-label',tr('search'));
   for(const b of editor.querySelectorAll('[data-v2-action="cancel"]'))b.setAttribute('aria-label',tr('cancel'));
   find('[data-v2-saved-search]').placeholder=tr('searchSaved');find('[data-v2-saved-search]').setAttribute('aria-label',tr('searchSaved'));
   find('[data-v2-search]').placeholder=tr('search');find('[data-v2-search]').setAttribute('aria-label',tr('search'));
   find('[data-v2-editor-title]').textContent=tr(state.confirm?'deleteTitle':state.edit?'editTitle':'addTitle');
   find('[data-v2-action="save"]').textContent=tr(state.loading?'busy':state.confirm?'confirm':'save');
   find('[data-v2-edit-fields]').hidden=!!state.confirm;find('[data-v2-delete-fields]').hidden=!state.confirm;
   if(state.confirm)find('[data-v2-delete-pair]').textContent=pairText(state.confirm.base_code,state.confirm.quote_code);
   if(!picker.hidden)drawOptions();updateConversion();
 }
 function updatePrevious(){
   const el=find('[data-v2-previous]'),current=session.state(),raw=getPreviousRates();
   const valid=integrated&&current.status==='ready'&&current.user_id&&raw?.user_id===current.user_id;
   const values=valid?['MMK','THB','CNY'].map(c=>[c,Number(raw['usd_'+c.toLowerCase()])]).filter(([,v])=>Number.isFinite(v)&&v>0):[];
   el.hidden=!values.length;if(el.hidden)el.open=false;
   find('[data-v2-previous-text]').textContent=values.length?tr('previousNote')+' '+values.map(([c,v])=>'1 USD = '+marketFormatV203(v,locale())+' '+c).join(' · '):'';
 }
 function actionButton(label,icon,fn){
   const b=document.createElement('button');b.type='button';b.className='fxv2-small';b.textContent=icon;b.title=label;b.setAttribute('aria-label',label);b.disabled=state.loading;b.addEventListener('click',fn);return b;
 }
 function updateSaved(){
   updatePrevious();const list=find('[data-v2-list]'),search=find('[data-v2-saved-search]'),scroll=list.scrollTop;list.replaceChildren();search.hidden=true;
   const current=session.state();find('[data-v2-action="add"]').disabled=state.loading||current.status!=='ready';
   find('[data-v2-accounting-note]').textContent=tr('note');
   if(current.status!=='ready'){const p=document.createElement('p');p.className='fxv2-muted';p.textContent=tr('ready');list.append(p);return}
   const pairs=current.pairs.filter(row=>row.user_id===current.user_id&&row.source==='manual');search.hidden=pairs.length<5&&!search.value;
   if(!pairs.length){const p=document.createElement('p');p.className='fxv2-muted';p.textContent=tr('empty');list.append(p);return}
   const visible=pairs.filter(row=>marketSavedMatchesV206(row,search.value,locale()));
   if(!visible.length){const p=document.createElement('p');p.className='fxv2-muted';p.textContent=tr('noSavedMatches');list.append(p);return}
   for(const row of visible){
     const item=document.createElement('div');item.className='fxv2-item';
     const detail=document.createElement('div');detail.className='fxv2-item-main';
     const heading=document.createElement('strong');heading.textContent=pairText(row.base_code,row.quote_code);
     const value=document.createElement('div');value.className='fxv2-rate';value.textContent='1 '+row.base_code+' = '+marketFormatV203(row.rate,locale())+' '+row.quote_code;
     const meta=document.createElement('div');meta.className='fxv2-muted';meta.textContent=tr([row.base_code,row.quote_code].includes('USD')?'anchor':'custom');
     detail.append(heading,value,meta);const actions=document.createElement('div');actions.className='fxv2-item-actions';
     actions.append(actionButton(tr('edit'),'✎',()=>openEditor('edit',row)),actionButton(tr('remove'),'×',()=>openEditor('delete',row)));
     item.append(detail,actions);list.append(item);
   }list.scrollTop=scroll;
 }
 function closePicker(restore=false){const trigger=state.selected?find('[data-v2-pick="'+state.selected+'"]'):null;if(picker.hasAttribute('popover')){try{picker.hidePopover()}catch(_){}picker.removeAttribute('popover')}picker.hidden=true;state.selected=null;trigger?.setAttribute('aria-expanded','false');if(picker.parentNode!==root)root.append(picker);if(restore===true&&!trigger?.disabled)trigger?.focus({preventScroll:true})}
 function closeEditor(force=false){
   if(state.loading&&!force)return;closePicker();if(editor.open)editor.close();
   state.edit=null;state.confirm=null;state.editorOwner='';find('[data-v2-rate]').value='';status('',true);
 }
 function openEditor(mode,row){
   const current=session.state();
   if(state.loading||current.status!=='ready'||!current.user_id||(row&&row.user_id!==current.user_id))return;
   state.editorOwner=current.user_id;
   state.edit=mode==='edit'?{key:keyOf(row.base_code,row.quote_code),version:row.version}:null;
   state.confirm=mode==='delete'?row:null;
   state.base=row?.base_code||state.from;state.quote=row?.quote_code||(state.from===state.to?'JPY':state.to);
   if(state.base===state.quote)state.quote=state.base==='USD'?'MMK':'USD';
   find('[data-v2-rate]').value=mode==='edit'?String(row.rate):'';status('',true);updateLabels();
   if(!editor.open)editor.showModal();
   if(mode!=='delete')find('[data-v2-rate]').focus();
 }
 function drawOptions(){
 const box=find('[data-v2-options]'),search=find('[data-v2-search]'),select=picker.querySelector('select');box.replaceChildren();select.replaceChildren();
 for(const c of marketCurrencyOptionsV203('',locale())){const o=document.createElement('option');o.value=c.code;o.textContent=c.code;select.append(o)}select.value=state[state.selected];
 function fallback(){box.replaceChildren();for(const c of marketCurrencyOptionsV203(search.value,locale())){const b=document.createElement('button');b.type='button';const left=document.createElement('span'),right=document.createElement('span');left.textContent=btnText(c.code).split(' · ')[0];right.textContent=btnText(c.code).split(' · ').slice(1).join(' · ');b.append(left,right);b.dataset.apCurrency=c.code;b.setAttribute('aria-pressed',String(state[state.selected]===c.code));box.append(b)}if(!box.children.length){const p=document.createElement('p');p.textContent=tr('noResults');box.append(p)}}
 if(window.MMHCurrencyPickerV3?.render){try{window.MMHCurrencyPickerV3.render({select,search,list:box,group:picker,label:tr('search')});return}catch(_){}}
 search.oninput=fallback;fallback();
 }
 function positionPicker(){if(picker.hidden||!state.selected)return;const b=find('[data-v2-pick="'+state.selected+'"]').getBoundingClientRect(),vv=window.visualViewport,x=vv?.offsetLeft||0,y=vv?.offsetTop||0,w=vv?.width||innerWidth,h=vv?.height||innerHeight,width=Math.min(310,w-24),below=y+h-b.bottom-17,above=b.top-y-17,up=below<180&&above>below;picker.style.setProperty('--fx278-w',width+'px');picker.style.setProperty('--fx278-x',Math.max(x+12,Math.min(x+w-width-12,b.right-width))+'px');picker.style.setProperty('--fx278-y',Math.max(y+12,up?b.top-5:b.bottom+5)+'px');picker.style.setProperty('--fx278-h',Math.max(90,Math.min(330,up?above:below))+'px');picker.classList.toggle('fx278-up',up)}
 function openPicker(field){if(state.loading||(state.edit&&['base','quote'].includes(field)))return;if(state.selected===field&&!picker.hidden){closePicker(true);return}closePicker();state.selected=field;const trigger=find('[data-v2-pick="'+field+'"]');(trigger.closest('dialog')||root).append(picker);find('[data-v2-search]').value='';drawOptions();picker.hidden=false;trigger.setAttribute('aria-expanded','true');positionPicker();if(typeof picker.showPopover==='function'){picker.setAttribute('popover','manual');try{picker.showPopover()}catch(_){picker.removeAttribute('popover')}}if(!matchMedia('(pointer:coarse)').matches)find('[data-v2-search]').focus({preventScroll:true})}
 picker.addEventListener('click',e=>{const code=e.target.closest('[data-ap-currency]')?.dataset.apCurrency;if(!code||!currencies.has(code)||!state.selected||state.loading)return;if(state.edit&&['base','quote'].includes(state.selected))return;if(['base','quote'].includes(state.selected)&&state.editorOwner!==session.state().user_id){closeEditor(true);return}state[state.selected]=code;closePicker(true);updateLabels()});
 const outsidePicker=e=>{if(!picker.hidden&&!picker.contains(e.target)&&!e.target.closest?.('[data-v2-pick]'))closePicker()};
 const pickerEscape=e=>{if(e.key==='Escape'&&!picker.hidden){e.preventDefault();e.stopPropagation();closePicker(true)}};
 document.addEventListener('pointerdown',outsidePicker,{passive:true});document.addEventListener('keydown',pickerEscape,true);window.addEventListener('resize',positionPicker);window.visualViewport?.addEventListener('resize',positionPicker);
 async function withBusy(task){
   if(state.loading||state.destroyed)return false;
   state.loading=true;const stamp=state.generation;setBusy();
   try{await task();return stamp===state.generation&&!state.destroyed}
   finally{state.loading=false;if(!state.destroyed){setBusy();if(state.pendingReload){state.pendingReload=false;void reload()}}}
 }
 function setBusy(){
   find('[data-v2-action="save"]').disabled=state.loading;
   find('[data-v2-action="refresh"]').disabled=state.loading;
   for(const b of editor.querySelectorAll('[data-v2-action="cancel"]'))b.disabled=state.loading;
   find('[data-v2-rate]').disabled=state.loading;updateLabels();updateSaved();
 }
 async function reload(){
   if(state.loading||state.destroyed)return;
   const stamp=state.generation;
   try{if(await withBusy(()=>session.refresh()))status('')}
   catch(_){if(stamp===state.generation&&!state.destroyed)status(tr('unavailable'))}
   if(!state.destroyed){updateSaved();updateConversion()}
 }
 async function save(){
   if(state.loading||!editor.open)return;
   const current=session.state(),stamp=state.generation;
   if(current.status!=='ready'||!state.editorOwner||state.editorOwner!==current.user_id){closeEditor(true);status(tr('notReady'));return}
   try{
     let task,done;
     if(state.confirm){const row=state.confirm;if(row.user_id!==current.user_id)throw Error('Owner changed');task=()=>session.remove({base_code:row.base_code,quote_code:row.quote_code,version:row.version});done='removed'}
     else{
       const raw=find('[data-v2-rate]').value.trim(),rate=Number(raw);
       if(!raw||!Number.isFinite(rate)||rate<=0){status(tr('invalid'),true);return}
       let p;try{p=canonicalPairV1({user_id:current.user_id,base_code:state.base,quote_code:state.quote,rate})}catch(_){status(tr('pairInvalid'),true);return}
       if(state.edit&&state.edit.key!==keyOf(p.base_code,p.quote_code)){status(tr('noEditPair'),true);return}
       if(!state.edit&&marketDuplicateV203(current.pairs,state.base,state.quote)){status(tr('duplicate'),true);return}
       const args={base_code:state.base,quote_code:state.quote,rate};
       task=state.edit?()=>session.update({...args,version:state.edit.version}):()=>session.add(args);done='success';
     }
     if(await withBusy(task)){closeEditor(true);const message=tr(done);let notified=false;try{if(typeof window.MMHUI?.toast==='function'){window.MMHUI.toast(message,{title:'MMHVAULT',type:'success'});notified=true}}catch(_){}status(notified?'':message)}
   }catch(_){if(stamp===state.generation&&!state.destroyed)status(tr('error'),editor.open)}
   if(!state.destroyed){updateSaved();updateConversion()}
 }
 for(const b of root.querySelectorAll('[data-v2-pick]'))b.addEventListener('click',()=>openPicker(b.dataset.v2Pick));
 for(const b of root.querySelectorAll('[data-v2-action]'))b.addEventListener('click',()=>{
   switch(b.dataset.v2Action){case 'refresh':void reload();break;case 'swap':[state.from,state.to]=[state.to,state.from];updateLabels();break;case 'add':openEditor('add');break;case 'save':void save();break;case 'close':closePicker();break;case 'cancel':closeEditor();break}
 });
 
 find('[data-v2-saved-search]').addEventListener('input',()=>{find('[data-v2-list]').scrollTop=0;updateSaved()});
 find('[data-v2-amount]').addEventListener('input',updateConversion);
 for(const [dialog,close] of [[editor,()=>closeEditor()]]){
   dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
   dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)close()});
 }
 const ownerChanged=()=>{state.generation++;find('[data-v2-saved-search]').value='';session.clear();closeEditor(true);status(tr('notReady'));updateSaved();updateConversion();if(state.loading)state.pendingReload=true;else void reload()};
 const dataLoaded=()=>{if(state.loading||editor.open){updateSaved();updateConversion();return}void reload()};
 const langChanged=()=>{updateLabels();updateSaved()};
 const marketChanged=()=>{updateConversion();updatePrevious()};
 const pageChanged=()=>{if(root.closest('#exchange')&&!root.closest('#exchange').classList.contains('active'))closeEditor(true)};
 const viewChanged=e=>{if(e.detail?.view!=='convert')closeEditor(true)};
 const listeners=[['mmhvault:config-owner-changed',ownerChanged],['mmhvault-language-change',langChanged],['mmhvault:data-loaded',dataLoaded],['mmhvault:exchange-reference-updated',marketChanged],['mmhvault:page-visible',pageChanged],['mmhvault:market-view-changed',viewChanged]];
 for(const [event,fn] of listeners)window.addEventListener(event,fn);
 updateLabels();void reload();
 return Object.freeze({refresh:reload,destroy(){state.destroyed=true;state.generation++;closeEditor(true);document.removeEventListener('pointerdown',outsidePicker);document.removeEventListener('keydown',pickerEscape,true);window.removeEventListener('resize',positionPicker);window.visualViewport?.removeEventListener('resize',positionPicker);for(const [event,fn] of listeners)window.removeEventListener(event,fn);session.clear();root.replaceChildren();root.classList.remove('fxv2');delete root.dataset.exchangeV2Mounted;delete root.dataset.unifiedAccounting;delete root.dataset.accountingReady}});
}
