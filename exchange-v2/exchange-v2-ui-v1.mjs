/**
 * MMHVAULT Exchange V2 — independently mountable Premium Glass UI.
 * Draft PR #27 only. NOT loaded from app.html until Staging/Auth/RLS and release QA.
 * Custom searchable pickers; never inserts demo prices or uses localStorage for rates.
 */
import {ASIA_CURRENCIES_V1,canonicalPairV1} from './asia-fx-core-v1.mjs';
import {createExchangeV2SessionV1} from './exchange-v2-session-v1.mjs';


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
const currencyName=(c,lang)=>lang==='zh'?c.zh:c.en;
const keyOf=(a,b)=>[a,b].sort().join('/');
const locale=()=>{
 let lang='en';try{lang=String(localStorage.getItem('mmhvault_language_v3363')||'en').toLowerCase()}catch{}
 return lang.startsWith('zh')?'zh':lang==='my'||lang==='mm'||lang.startsWith('my-')?'my':'en';
};
const CSS=`
.fxv2{--v2border:rgba(158,199,226,.23);--v2gold:#f1c978;--v2text:#edf6fb;--v2muted:#9ab7ca;color:var(--v2text);margin:16px 0;font-family:inherit}
/* Integrated APP uses a 12-column desktop grid and explicit legacy rows.
 * Give the V2 root its own complete row; retain reference-rate editor below it. */
html body #exchange.page.active > #mmhExchangeV2StagingRoot[data-exchange-v2-mounted="yes"]:not([hidden]){
 display:block!important;grid-column:1/-1!important;grid-row:3!important;
 width:100%!important;min-width:0!important;max-width:none!important;align-self:start!important;justify-self:stretch!important;margin:0!important;box-sizing:border-box!important;
}
html body #exchange.page.active:has(> #mmhExchangeV2StagingRoot[data-exchange-v2-mounted="yes"]:not([hidden])) > .ex-rate-editor{
 grid-column:1/-1!important;grid-row:4!important;
}
html body #exchange.page.active:has(> #mmhExchangeV2StagingRoot[data-exchange-v2-mounted="yes"]:not([hidden])) > :is(#exAsiaV10,#exAsiaSummaryV130){
 grid-column:1/-1!important;grid-row:4!important;
}
html body #exchange.page.active:has(> #mmhExchangeV2StagingRoot[data-unified-accounting="yes"]:not([hidden])) > .ex-rate-editor{
 display:none!important;
}
.fxv2 .fxv2-accounting-note{font-size:11px;color:var(--v2muted);margin:8px 0}
.fxv2 .fxv2-item-main{overflow-wrap:anywhere}
 .fxv2 .fxv2-auto-slot:empty{display:none}
.fxv2 .fxv2-grid > .fxv2-panel{align-self:start}
.fxv2 .fxv2-item-actions button{min-width:0;white-space:nowrap}
.fxv2{min-width:0;width:100%;container-type:inline-size}
.fxv2 *{box-sizing:border-box}.fxv2-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;width:100%;min-width:0}
.fxv2 .fxv2-heading{position:static!important;inset:auto!important;z-index:auto!important;height:auto!important;min-height:0!important;width:100%!important;max-width:none!important;padding:0!important;border:0!important;background:none!important;box-shadow:none!important;backdrop-filter:none!important;flex-wrap:wrap}
.fxv2 .fxv2-heading > div{min-width:0;flex:1 1 140px}
.fxv2 .fxv2-fields > label,.fxv2 .fxv2-save > label{min-width:0;width:100%;display:block;white-space:normal}
.fxv2 .fxv2-grid > .fxv2-panel{min-width:0;width:100%;margin:0;align-self:stretch}
.fxv2 [hidden]{display:none!important}
@container (max-width:740px){.fxv2-grid{grid-template-columns:minmax(0,1fr)}}
@container (max-width:320px){.fxv2-save{grid-template-columns:minmax(0,1fr)}.fxv2-fields{grid-template-columns:minmax(0,1fr)}.fxv2-fields.saved{grid-template-columns:minmax(0,1fr)}.fxv2-swap{justify-self:center}}
.fxv2-panel{background:linear-gradient(135deg,rgba(23,51,77,.89),rgba(7,21,42,.93));border:1px solid var(--v2border);border-radius:20px;padding:19px;box-shadow:0 16px 42px #0003;min-width:0}
.fxv2-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:15px}
.fxv2-heading h2{margin:0;color:#f7d797;font-size:19px}.fxv2-muted,.fxv2-info{color:var(--v2muted);font-size:12px}
.fxv2-fields{display:grid;grid-template-columns:minmax(0,1fr) 42px minmax(0,1fr);gap:8px;align-items:end}
.fxv2-fields.saved{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.fxv2-label{display:block;color:#b8d4e5;font-size:12px;font-weight:650;margin-bottom:6px}
.fxv2-picker,.fxv2-input,.fxv2-action{min-height:43px;width:100%;border:1px solid rgba(136,185,222,.33);background:#0b2943;border-radius:12px;padding:10px;color:#edf6fb;font:inherit}
.fxv2-picker{text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fxv2-picker:hover,.fxv2-action:hover{border-color:#f1c97888}
.fxv2-swap{height:43px;width:42px;border:1px solid #5884a0;border-radius:12px;background:#14405a;color:#e5f5fe;font-size:21px}
.fxv2-result{margin:14px 0 4px;padding:15px;border-radius:14px;border:1px solid #61869c55;background:rgba(5,25,44,.65)}
.fxv2-value{font-size:clamp(21px,2.3vw,31px);color:var(--v2gold);font-weight:760;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.fxv2-note{font-size:11px;color:var(--v2muted);margin-top:6px}
.fxv2-save{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:end;margin-top:12px}
.fxv2-save button{padding:9px 13px;border-radius:12px;background:linear-gradient(110deg,#f7dca1,#dba952);border:0;color:#152838;font-weight:760;min-height:43px}
.fxv2-save button:disabled{opacity:.55}.fxv2-list{display:grid;gap:8px;max-height:320px;overflow:auto;margin-top:12px}
.fxv2-item{display:flex;align-items:center;justify-content:space-between;gap:9px;padding:11px;border-radius:12px;border:1px solid #6b95af46;background:#0b2943}
.fxv2-item-main{min-width:0}.fxv2-item strong{font-size:12px}.fxv2-item .fxv2-rate{color:var(--v2gold);font-size:13px}
.fxv2-item-actions{display:flex;gap:5px;flex-shrink:0}.fxv2-item-actions button,.fxv2-small{background:#193b55;border:1px solid #7191a750;color:#ebf6fb;border-radius:9px;padding:7px 9px;cursor:pointer}
.fxv2-status{font-size:12px;min-height:18px;margin-top:8px;color:#9dd8d1;overflow-wrap:anywhere}
.fxv2-shade[hidden]{display:none}.fxv2-shade{position:fixed;inset:0;z-index:99995;background:#03121dcf;display:grid;place-items:center;padding:14px}
.fxv2-dialog{width:min(324px,100%);max-height:70dvh;display:flex;flex-direction:column;border:1px solid #799bb19c;border-radius:17px;background:linear-gradient(145deg,#123c58,#09243d);box-shadow:0 25px 70px #000b;padding:13px}
.fxv2-dialog-head{display:flex;gap:8px;align-items:center}.fxv2-dialog-head input{min-width:0;flex:1}
.fxv2-options{overflow:auto;overscroll-behavior:contain;margin-top:8px;display:grid;gap:3px}
.fxv2-options button{text-align:left;background:transparent;border:0;border-radius:9px;color:#e6f1fa;padding:10px;font:inherit;cursor:pointer}
.fxv2-options button:hover,.fxv2-options button[aria-selected=true]{background:#2a5773}
@media(max-width:880px){.fxv2-grid{grid-template-columns:1fr}}
@media(max-width:480px){.fxv2-panel{padding:14px;border-radius:16px}.fxv2-dialog{width:100%;max-height:68dvh;border-radius:18px 18px 0 0}.fxv2-shade{place-items:end center;padding:0}.fxv2-save{grid-template-columns:1fr auto}.fxv2-item{align-items:flex-start}.fxv2-item-actions{flex-direction:column}}
`;

export function mountExchangeV2V1({root,db,getLegacyRates=()=>null,getPreviousRates=()=>null,getMarketRates=()=>({}),onPairsChanged=()=>{},integrated=false}={}){
 if(!root||typeof root.querySelector!=='function')throw Error('A dedicated Exchange V2 root is required');
 if(root.dataset.exchangeV2Mounted==='yes')throw Error('Exchange V2 already mounted');
 const unified=integrated;
 const session=createExchangeV2SessionV1({db,getLegacyRates,getMarketRates,onPairsChanged});
 const copy={en:{note:'Only explicitly saved pairs appear here. Unsaved rates use market references, or the preserved accounting reference when unavailable. Old references are not imported automatically. Non-USD pairs apply only to the converter. SetLive USD/MMK is a market reference only, not the official Central Bank rate.',market:'Market reference',legacy:'Last accounting reference',anchor:'Shared APP rate',custom:'Custom converter rate'},zh:{note:'仅显示主动保存的汇率。未设置时使用市场行情；行情不可用时保留原记账参考。旧参考不会自动导入。非 USD 币种对仅用于换算器。SetLive USD/MMK 仅为市场参考汇率，并非缅甸中央银行官方汇率。',market:'市场参考汇率',legacy:'上次记账参考汇率',anchor:'全站统一汇率',custom:'自定义换算汇率'},my:{note:'သင်သိမ်းထားသည့် နှုန်းများသာ ပြသည်။ မသိမ်းထားပါက ဈေးကွက်နှုန်းကို သုံးသည်။ မရပါက ယခင်စာရင်းနှုန်းကို သုံးသည်။ ယခင်နှုန်းများကို အလိုအလျောက် မထည့်ပါ။ USD မပါသော အတွဲများသည် တွက်ချက်စက်အတွက်သာ ဖြစ်သည်။ SetLive USD/MMK သည် ဈေးကွက် ကိုးကားနှုန်းသာဖြစ်ပြီး ဗဟိုဘဏ်၏ တရားဝင်နှုန်း မဟုတ်ပါ။',market:'ဈေးကွက် ကိုးကားနှုန်း',legacy:'ယခင်စာရင်းနှုန်း',anchor:'APP တစ်ခုလုံးသုံးနှုန်း',custom:'ကိုယ်ပိုင်တွက်ချက်နှုန်း'}};
 const message=k=>(copy[locale()]||copy.en)[k];
 const state={from:'USD',to:'MMK',base:'USD',quote:'JPY',edit:null,confirm:null,selected:null,loading:false};
 root.dataset.exchangeV2Mounted='yes';
 if(unified)root.dataset.unifiedAccounting='yes';
 root.classList.add('fxv2');
 const style=document.createElement('style');style.textContent=CSS;root.append(style);
 const shell=document.createElement('div');shell.className='fxv2-grid';
 shell.innerHTML=`
 <section class="fxv2-panel"><div class="fxv2-heading"><div><h2 data-v2-t="convert"></h2><small class="fxv2-muted" data-v2-t="cloud"></small></div><button type="button" class="fxv2-small" data-v2-action="refresh"></button></div>
 <div class="fxv2-fields"><label><span class="fxv2-label" data-v2-t="from"></span><button type="button" class="fxv2-picker" data-v2-pick="from"></button></label><button type="button" class="fxv2-swap" data-v2-action="swap" aria-label="Swap currencies">⇄</button><label><span class="fxv2-label" data-v2-t="to"></span><button type="button" class="fxv2-picker" data-v2-pick="to"></button></label></div>
 <label><span class="fxv2-label" data-v2-t="amount"></span><input type="number" min="0" step="any" value="1" class="fxv2-input" data-v2-amount></label>
 <div class="fxv2-result" role="status" aria-live="polite"><div class="fxv2-value" data-v2-value>—</div><div class="fxv2-note" data-v2-note></div></div></section>
 <section class="fxv2-panel"><div class="fxv2-heading"><div><h2 data-v2-t="saved"></h2><small class="fxv2-muted" data-v2-t="cloud"></small></div></div>
 <div class="fxv2-fields saved"><label><span class="fxv2-label" data-v2-t="base"></span><button type="button" class="fxv2-picker" data-v2-pick="base"></button></label><label><span class="fxv2-label" data-v2-t="quote"></span><button type="button" class="fxv2-picker" data-v2-pick="quote"></button></label></div>
 <div class="fxv2-save"><label><span class="fxv2-label" data-v2-t="price"></span><input type="number" min="0" step="any" class="fxv2-input" data-v2-rate placeholder="1 base = ... quote"></label><button type="button" data-v2-action="save" data-v2-t="save"></button></div>
 <div class="fxv2-status" data-v2-status role="status" aria-live="polite"></div><button type="button" class="fxv2-small" data-v2-action="cancel" hidden></button>
 <div class="fxv2-auto-slot" data-v2-auto-slot></div><p class="fxv2-accounting-note" data-v2-accounting-note hidden></p><details class="fxv2-accounting-note" data-v2-previous hidden><summary></summary><p data-v2-previous-text></p></details><div class="fxv2-list" data-v2-list></div></section>`;
 root.append(shell);
 const shade=document.createElement('div');shade.className='fxv2-shade';shade.hidden=true;
 shade.innerHTML=`<div class="fxv2-dialog" role="dialog" aria-modal="true" aria-label="Currency picker"><div class="fxv2-dialog-head"><input type="search" class="fxv2-input" data-v2-search autocomplete="off"><button type="button" class="fxv2-small" data-v2-action="close" aria-label="Close">×</button></div><div class="fxv2-options" data-v2-options role="listbox"></div></div>`;
 root.append(shade);
 const find=sel=>root.querySelector(sel);
 const tr=key=>(TEXT[locale()]||TEXT.en)[key]||key;
 const status=(message)=>{find('[data-v2-status]').textContent=message};
 const btnText=code=>{const c=currencies.get(code);return c?`${c.flag} ${code} · ${currencyName(c,locale())}`:code};
 function updateLabels(){
   for(const e of root.querySelectorAll('[data-v2-t]'))e.textContent=tr(e.dataset.v2T);
   for(const e of root.querySelectorAll('[data-v2-pick]'))e.textContent=btnText(state[e.dataset.v2Pick]);
   find('[data-v2-action="refresh"]').textContent=tr('refresh');
   find('[data-v2-action="cancel"]').textContent=tr('cancel');
   find('[data-v2-search]').placeholder=tr('search');
   find('[data-v2-action="swap"]').setAttribute('aria-label',tr('swap'));
   if(!shade.hidden)drawOptions();
   updateConversion();
 }
 function updateConversion(){
   const result=find('[data-v2-value]'),note=find('[data-v2-note]');
   const answer=session.quote({from:state.from,to:state.to,amount:find('[data-v2-amount]').value});
   if(!answer.available){
     result.textContent='—';
     note.textContent=answer.reason==='invalid-amount'?tr('invalidAmount'):
       answer.reason==='not-ready'?tr('notReady'):tr('missing');
     return;
   }
   result.textContent=`${answer.formattedResult} ${state.to}`;
   const type=answer.method==='manual'?tr('source'):
     answer.method==='identity'?tr('identity'):
       answer.sources?.includes('legacy')?message('legacy'):
       answer.method==='market-reference'?message('market'):
     answer.method==='usd-derived'?(answer.sources?.includes('legacy')?message('legacy'):tr('derived')):message('legacy');
   note.textContent=`1 ${state.from} = ${answer.formattedRate} ${state.to} · ${type}`;
 }
 function makeButton(txt,fn,confirm=false){
   const b=document.createElement('button');b.type='button';b.textContent=txt;
   if(confirm)b.style.borderColor='#e7ad8288';
   b.addEventListener('click',fn);return b;
 }
 function updatePrevious(){
   const el=find('[data-v2-previous]'),current=session.state(),raw=getPreviousRates();
   const valid=unified&&current.status==='ready'&&current.user_id&&raw?.user_id===current.user_id;
   const values=valid?['MMK','THB','CNY'].map(c=>[c,Number(raw['usd_'+c.toLowerCase()])]).filter(([,v])=>Number.isFinite(v)&&v>0):[];
   el.hidden=!values.length;if(el.hidden)el.open=false;
   const copy=({zh:['查看原记账参考','以下为原始记录，不会自动保存。如需继续使用，请在上方选择相应币种并主动保存。'],my:['ယခင်စာရင်းနှုန်း ကြည့်ရန်','ယခင်နှုန်းကို ဆက်သုံးလိုပါက အပေါ်တွင် ငွေကြေးအတွဲရွေးပြီး သိမ်းပါ။'],en:['View previous accounting reference','These original records are not automatically saved as custom rates. To keep one, select its currencies above and save it explicitly.']})[locale()]||['View previous accounting reference','Select currencies above and save explicitly to keep an old rate.'];
   el.querySelector('summary').textContent=copy[0];find('[data-v2-previous-text]').textContent=values.length?copy[1]+' '+values.map(([c,v])=>'1 USD = '+v+' '+c).join(' · '):'';
 }
 function updateSaved(){
   updatePrevious();
   const list=find('[data-v2-list]');list.replaceChildren();
   const pairs=session.state().pairs;
   const note=find('[data-v2-accounting-note]');note.hidden=!unified;
   if(unified)note.textContent=message('note');
   if(!pairs.length){const p=document.createElement('p');p.className='fxv2-muted';p.textContent=tr('empty');list.append(p);return}
   for(const row of pairs){
     const item=document.createElement('div');item.className='fxv2-item';
     const detail=document.createElement('div');detail.className='fxv2-item-main';
     const heading=document.createElement('strong');
     heading.textContent=`${row.base_code} → ${row.quote_code}`;
     const value=document.createElement('div');value.className='fxv2-rate';value.textContent=String(row.rate);
     const meta=document.createElement('div');meta.className='fxv2-muted';meta.textContent=unified?message([row.base_code,row.quote_code].includes('USD')?'anchor':'custom'):`${tr('source')} · v${row.version}`;
     detail.append(heading,value,meta);
     const actions=document.createElement('div');actions.className='fxv2-item-actions';
     const k=keyOf(row.base_code,row.quote_code);
     actions.append(makeButton(tr('edit'),()=>{
       state.base=row.base_code;state.quote=row.quote_code;
       state.edit={key:k,version:row.version};state.confirm=null;
       find('[data-v2-rate]').value=String(row.rate);
       find('[data-v2-action="cancel"]').hidden=false;status('');updateLabels();
     }));
     actions.append(makeButton(state.confirm===k?tr('confirm'):tr('remove'),async()=>{
       if(state.confirm!==k){state.confirm=k;updateSaved();return}
       state.confirm=null;
       try{await withBusy(()=>session.remove({base_code:row.base_code,quote_code:row.quote_code,version:row.version}));
         if(state.edit?.key===k)cancelEdit();status(tr('removed'))}
       catch(e){status(String(e?.message||tr('error')))}
       updateSaved();updateConversion();
     },state.confirm===k));
     item.append(detail,actions);list.append(item);
   }
 }
 function cancelEdit(){
   state.edit=null;find('[data-v2-action="cancel"]').hidden=true;
   find('[data-v2-rate]').value='';status('');
 }
 async function withBusy(task){
   if(state.loading)throw Error('Another operation is in progress');
   state.loading=true;
   find('[data-v2-action="save"]').disabled=true;
   try{return await task()}
   finally{state.loading=false;find('[data-v2-action="save"]').disabled=false}
 }
 async function reload(){
   try{
     await withBusy(()=>session.refresh());
     status('');updateSaved();updateConversion();
   }catch(e){
     status(tr('unavailable'));updateSaved();updateConversion();
   }
 }
 function drawOptions(){
   const box=find('[data-v2-options]');box.replaceChildren();
   const input=find('[data-v2-search]').value.trim().toLocaleLowerCase();
   const filtered=ASIA_CURRENCIES_V1.filter(c=>!input||[c.code,c.en,c.zh].some(s=>s.toLocaleLowerCase().includes(input)));
   for(const c of filtered){
     const option=document.createElement('button');option.type='button';
     option.textContent=btnText(c.code);option.setAttribute('role','option');
     option.setAttribute('aria-selected',String(state[state.selected]===c.code));
     option.addEventListener('click',()=>{
       state[state.selected]=c.code;closePicker();updateLabels();
     });box.append(option);
   }
   if(!filtered.length){const empty=document.createElement('p');empty.className='fxv2-muted';empty.textContent=tr('missing');box.append(empty)}
 }
 function openPicker(field){
   if(state.edit&&(field==='base'||field==='quote')){status(tr('noEditPair'));return}
   state.selected=field;shade.hidden=false;find('[data-v2-search]').value='';
   drawOptions();find('[data-v2-search]').focus();
 }
 function closePicker(){shade.hidden=true;state.selected=null}
 async function save(){
   const raw=find('[data-v2-rate]').value.trim(),rate=Number(raw);
   if(raw===''||!Number.isFinite(rate)||rate<=0){status(tr('invalid'));return}
   try{
     const pair=canonicalPairV1({user_id:'ui-validation-only',base_code:state.base,quote_code:state.quote,rate});
     if(state.edit&&state.edit.key!==keyOf(pair.base_code,pair.quote_code)){
       status(tr('noEditPair'));return;
     }
     const args={base_code:state.base,quote_code:state.quote,rate};
     await withBusy(()=>state.edit?session.update({...args,version:state.edit.version}):session.add(args));
     cancelEdit();status(tr('success'));updateSaved();updateConversion();
   }catch(e){status(String(e?.message||tr('error')))}
 }
 for(const button of root.querySelectorAll('[data-v2-pick]')){
   button.addEventListener('click',()=>openPicker(button.dataset.v2Pick));
 }
 for(const button of root.querySelectorAll('[data-v2-action]')){
   button.addEventListener('click',()=>{
     const action=button.dataset.v2Action;
     if(action==='refresh')void reload();
     if(action==='swap'){const c=state.from;state.from=state.to;state.to=c;updateLabels()}
     if(action==='save')void save();
     if(action==='close')closePicker();
     if(action==='cancel')cancelEdit();
   });
 }
 find('[data-v2-search]').addEventListener('input',drawOptions);
 find('[data-v2-amount]').addEventListener('input',updateConversion);
 shade.addEventListener('click',e=>{if(e.target===shade)closePicker()});
 const keyHandler=e=>{if(e.key==='Escape'&&!shade.hidden)closePicker()};
 document.addEventListener('keydown',keyHandler);
 const ownerChanged=()=>{session.clear();cancelEdit();status(tr('notReady'));updateSaved();updateConversion();void reload()};
 // Ordinary background cloud refresh must never discard a user's unsaved rate input.
 const dataLoaded=()=>{
   const input=find('[data-v2-rate]').value.trim();
   if(state.loading||state.edit||input){updateSaved();updateConversion();return}
   void reload();
 };
 const langChanged=()=>{updateLabels();updateSaved()};
 window.addEventListener('mmhvault:config-owner-changed',ownerChanged);
 window.addEventListener('mmhvault-language-change',langChanged);
 window.addEventListener('mmhvault:data-loaded',dataLoaded);
 const marketChanged=()=>{updateConversion();updatePrevious()};window.addEventListener('mmhvault:exchange-reference-updated',marketChanged);
 updateLabels();
 void reload();
 return Object.freeze({
   refresh:reload,
   destroy(){
     document.removeEventListener('keydown',keyHandler);
     window.removeEventListener('mmhvault:config-owner-changed',ownerChanged);
     window.removeEventListener('mmhvault-language-change',langChanged);
     window.removeEventListener('mmhvault:data-loaded',dataLoaded);window.removeEventListener('mmhvault:exchange-reference-updated',marketChanged);
     session.clear();root.replaceChildren();root.classList.remove('fxv2');delete root.dataset.exchangeV2Mounted;delete root.dataset.unifiedAccounting;delete root.dataset.accountingReady;
   }
 });
}
