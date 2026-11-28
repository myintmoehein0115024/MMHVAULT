/* MMHVAULT Market V2 — presentation only; existing Exchange remains the data owner. */
(function(){
'use strict';
const COPY={
en:{market:'Market',convert:'Convert',overview:'Market overview',currency:'Currency',gold:'Gold',crypto:'Crypto',oil:'Fuel & Oil',reference:'Market reference',unavailable:'No verified quote available',note:'Market reference only. Personal rates are managed in Convert.',pending:'Data source not connected in this release',pairs:'Currency reference rates',heading:'Markets and currency conversion'},
zh:{market:'市场',convert:'换算',overview:'市场概览',currency:'货币',gold:'黄金',crypto:'加密货币',oil:'燃油与石油',reference:'市场参考价',unavailable:'暂无已验证行情',note:'仅展示市场参考价，个人汇率请在换算中管理。',pending:'本版本尚未接入数据来源',pairs:'货币参考汇率',heading:'市场行情与货币换算'},
my:{market:'ဈေးကွက်',convert:'ငွေလဲရန်',overview:'ဈေးကွက် အနှစ်ချုပ်',currency:'ငွေကြေး',gold:'ရွှေ',crypto:'ခရစ်ပတို',oil:'စက်သုံးဆီနှင့်ရေနံ',reference:'ဈေးကွက် ရည်ညွှန်းနှုန်း',unavailable:'အတည်ပြုထားသော ဈေးနှုန်း မရှိပါ',note:'ဈေးကွက် ရည်ညွှန်းနှုန်းသာ ဖြစ်သည်။ ကိုယ်ပိုင်နှုန်းကို ငွေလဲရန်တွင် စီမံပါ။',pending:'ဤဗားရှင်းတွင် ဒေတာရင်းမြစ် မချိတ်ဆက်ရသေးပါ',pairs:'ငွေလဲ ရည်ညွှန်းနှုန်းများ',heading:'ဈေးကွက်နှင့် ငွေလဲခြင်း'}
};
function safeRate(rates,code){const raw=rates&&rates[code];return typeof raw==='number'&&Number.isFinite(raw)&&raw>0?raw:null}
const EXTRA={
en:{back:'All markets',details:'Market details',source:'Source',updated:'Updated',stale:'Last available · stale',fresh:'Recent quote',usd:'USD per troy ounce',usdt:'USDT',unknown:'Unknown time',unavailable:'No verified quote available',noHistory:'Historical series not available',search:'Search currency or symbol',noResults:'No matching instruments'},
zh:{back:'全部市场',details:'行情详情',source:'来源',updated:'更新时间',stale:'上次报价 · 已过期',fresh:'近期报价',usd:'美元 / 金衡盎司',usdt:'USDT',unknown:'时间未知',unavailable:'暂无已验证行情',noHistory:'暂无历史行情',search:'搜索币种或代码',noResults:'没有匹配的行情'},
my:{back:'ဈေးကွက်အားလုံး',details:'ဈေးကွက် အသေးစိတ်',source:'ရင်းမြစ်',updated:'အပ်ဒိတ်အချိန်',stale:'နောက်ဆုံးဈေးနှုန်း · သက်တမ်းလွန်',fresh:'မကြာသေးမီ ဈေးနှုန်း',usd:'USD / troy ounce',usdt:'USDT',unknown:'အချိန် မသိရပါ',unavailable:'အတည်ပြုထားသော ဈေးနှုန်း မရှိပါ',noHistory:'ဈေးနှုန်းမှတ်တမ်း မရှိပါ',search:'ငွေကြေး သို့မဟုတ် သင်္ကေတ ရှာရန်',noResults:'ကိုက်ညီသော ဈေးနှုန်း မရှိပါ'}
};
const SYMBOLS=['BTC','ETH','SOL','BNB','XRP','DOGE','ADA','TRX'];
// V2.0.4: owner-scoped device preferences, no quote storage or additional requests.
// Currency codes mirror the existing Asia catalogue; review together when it changes.
const WATCH_FX=["MMK","THB","CNY","JPY","KRW","KPW","HKD","MOP","TWD","MNT","SGD","MYR","IDR","VND","PHP","KHR","LAK","BND","INR","PKR","BDT","NPR","LKR","BTN","MVR","AFN","AED","SAR","QAR","KWD","BHD","OMR","JOD","ILS","IQD","IRR","YER","LBP","SYP","TRY","AMD","GEL","AZN","KZT","KGS","UZS","TJS","TMT","RUB","EUR","EGP","AUD"];
const WATCH_IDS=Object.freeze([...WATCH_FX.map(c=>'fx:'+c),'gold:XAU',...SYMBOLS.map(c=>'crypto:'+c)]);
const WATCH_SET=new Set(WATCH_IDS),WATCH_PREFIX='mmhvault-market-watchlist-v204:';
const WATCH_COPY={
en:{watch:'Watchlist',add:'Add',title:'Add to watchlist',search:'Search currencies, gold or crypto',empty:'No favourites yet.',signin:'Sign in to save favourites.',local:'Saved on this device',remove:'Remove',up:'Move up',down:'Move down',close:'Close',error:'Unable to save or read favourites on this device.',saved:'Watchlist updated',already:'Saved',unknown:'Update time unavailable',back:'Back to watchlist'},
zh:{watch:'自选行情',add:'添加',title:'添加自选行情',search:'搜索货币、黄金或加密货币',empty:'暂无自选行情。',signin:'登录后可保存自选行情。',local:'仅保存在此设备',remove:'取消收藏',up:'上移',down:'下移',close:'关闭',error:'无法在此设备读取或保存自选行情。',saved:'自选行情已更新',already:'已收藏',unknown:'更新时间不可用',back:'返回自选行情'},
my:{watch:'စောင့်ကြည့်စာရင်း',add:'ထည့်ရန်',title:'စောင့်ကြည့်စာရင်းသို့ ထည့်ရန်',search:'ငွေကြေး၊ ရွှေ သို့မဟုတ် ခရစ်ပတို ရှာရန်',empty:'စာရင်း မရှိသေးပါ။',signin:'သိမ်းရန် အကောင့်ဝင်ပါ။',local:'ဤစက်တွင်သာ သိမ်းထားသည်',remove:'ဖယ်ရန်',up:'အပေါ်သို့ ရွှေ့ရန်',down:'အောက်သို့ ရွှေ့ရန်',close:'ပိတ်ရန်',error:'ဤစက်တွင် ဖတ်၍ သို့မဟုတ် သိမ်း၍ မရပါ။',saved:'စာရင်း ပြင်ဆင်ပြီးပါပြီ',already:'သိမ်းပြီး',unknown:'အပ်ဒိတ်အချိန် မရှိပါ',back:'စာရင်းသို့ ပြန်ရန်'}
};
function watchNormalize(rows){return Array.isArray(rows)?[...new Set(rows.filter(x=>typeof x==='string'&&WATCH_SET.has(x)))]:[]}
function watchKey(uid){return typeof uid==='string'&&uid.trim()&&uid.length<=128?WATCH_PREFIX+encodeURIComponent(uid):null}
function watchStore(storage,getOwner){
 function read(uid){const k=watchKey(uid);if(!k||uid!==getOwner())return {ok:false,rows:[]};try{const raw=storage.getItem(k);if(raw===null)return {ok:true,rows:[]};const data=JSON.parse(raw);if(data?.version!==1||data.owner!==uid||!Array.isArray(data.rows))return {ok:false,rows:[]};return {ok:true,rows:watchNormalize(data.rows)}}catch(_){return {ok:false,rows:[]}}}
 function change(uid,id,action){const current=read(uid);if(!current.ok||!WATCH_SET.has(id))return {ok:false,rows:[]};const rows=current.rows.slice(),i=rows.indexOf(id);if(action==='add'){if(i<0)rows.push(id)}else if(action==='remove'){if(i>=0)rows.splice(i,1)}else if(action==='up'||action==='down'){const j=i+(action==='up'?-1:1);if(i>=0&&j>=0&&j<rows.length)[rows[i],rows[j]]=[rows[j],rows[i]]}else return {ok:false,rows:current.rows};if(uid!==getOwner())return {ok:false,rows:[]};try{storage.setItem(watchKey(uid),JSON.stringify({version:1,owner:uid,rows}));return {ok:true,rows}}catch(_){return {ok:false,rows:current.rows}}}
 return {read,change}
}
// Serialize same-origin tab writes where Web Locks is available. Keep the existing
// synchronous device-local behavior on older browsers; it cannot guarantee cross-tab atomicity.
async function watchChangeLocked(store,locks,uid,id,action,isCurrent){
 const key=watchKey(uid),denied=()=>({ok:false,rows:[]});
 if(!key||!isCurrent())return denied();
 const run=()=>isCurrent()?store.change(uid,id,action):denied();
 try{
  if(typeof locks?.request==='function')return await locks.request(key,{mode:'exclusive'},run);
  return run();
 }catch(_){return denied()}
}
function watchOwner(){try{return typeof currentSessionUser!=='undefined'?String(currentSessionUser?.id||''):''}catch(_){return ''}}
function watchFmt(v,lang){return typeof v!=='number'||!Number.isFinite(v)||v<=0?'—':v<1e-8?v.toExponential(6):new Intl.NumberFormat(lang==='zh'?'zh-CN':lang,{maximumSignificantDigits:10}).format(v)}
function watchName(id,lang){const [kind,code]=id.split(':');if(kind==='fx'){let label=code;try{label=new Intl.DisplayNames([lang==='zh'?'zh-CN':lang],{type:'currency'}).of(code)||code}catch(_){}return 'USD / '+code+' · '+label}return kind==='gold'?'XAU / USD · '+COPY[lang].gold:code}
function watchItems(snap,lang){return WATCH_IDS.map(id=>{const [kind,code]=id.split(':');const q=kind==='gold'?snap.gold:kind==='crypto'?snap.coins[code]:null;return {id,category:kind==='fx'?'currency':kind,name:watchName(id,lang),q,value:kind==='fx'?safeRate(snap.fx,code):q?.price??null,unit:kind==='fx'?code:kind==='gold'?EXTRA[lang].usd:q?.unit||''}})}
// V2.0.5 history contract — no network, persistence or enabled permissions.
const HISTORY_APPROVALS=Object.freeze([]);
const HISTORY_RANGES=Object.freeze({'24H':86400000,'7D':604800000,'30D':2592000000,'90D':7776000000,'1Y':31536000000,ALL:Infinity});
const HISTORY_TEXT={
 en:{history:'Price history',category:'Back to category',status:'Quote status',unknownStatus:'Freshness unverified',unknownSource:'Source unavailable',quote:'Quote unit',observations:'Recorded observations',noHistory:'No verified historical prices available',range:'History range',detail:'Open details',public:'Public FX cache'},
 zh:{history:'历史走势',category:'返回分类',status:'行情状态',unknownStatus:'时效未核实',unknownSource:'来源不可用',quote:'报价单位',observations:'实际记录点',noHistory:'暂无已验证历史行情',range:'历史时间范围',detail:'查看详情',public:'公共外汇缓存'},
 my:{history:'ဈေးနှုန်းမှတ်တမ်း',category:'အမျိုးအစားသို့ ပြန်ရန်',status:'ဈေးနှုန်း အခြေအနေ',unknownStatus:'သက်တမ်း မစစ်ဆေးရသေးပါ',unknownSource:'ရင်းမြစ် မရှိပါ',quote:'ဈေးနှုန်း ယူနစ်',observations:'မှတ်တမ်းတင်ထားသော အချက်များ',noHistory:'အတည်ပြုထားသော ဈေးနှုန်းမှတ်တမ်း မရှိပါ',range:'မှတ်တမ်း ကာလ',detail:'အသေးစိတ် ကြည့်ရန်',public:'အများသုံး ငွေလဲနှုန်း ကက်ရှ်'}
};
function historyKey(s){
 if(!s||!['fx','gold','crypto'].includes(s.kind)||!['code','source','currency','unit','region','side'].every(k=>typeof s[k]==='string'&&s[k].trim()&&s[k].length<=100)||!/^[A-Z0-9]{2,12}$/.test(s.code)||!/^[A-Z]{3,5}$/.test(s.currency))return null;
 return JSON.stringify([s.kind,s.code,s.source,s.currency,s.unit,s.region,s.side]);
}
function verifiedHistory(rows,series,approved=HISTORY_APPROVALS,now=Date.now()){
 const key=historyKey(series);
 if(!key||!Array.isArray(approved)||!approved.includes(key)||!Number.isFinite(now)||!Array.isArray(rows)||rows.length>50000)return [];
 const points=new Map(),conflict=new Set();
 for(const row of rows){
  if(historyKey(row)!==key||row.origin!=='market-observation'||row.verified!==true||typeof row.price!=='number'||!Number.isFinite(row.price)||row.price<=0||row.price>=1e15||!Number.isSafeInteger(row.time)||row.time<=0||row.time>now)continue;
  if(points.has(row.time)&&points.get(row.time)!==row.price)conflict.add(row.time);else points.set(row.time,row.price);
 }
 return [...points].filter(([t])=>!conflict.has(t)).sort((a,b)=>a[0]-b[0]).map(([time,price])=>({time,price}));
}
function historyWindow(points,range,now){
 if(!Object.hasOwn(HISTORY_RANGES,range)||!Number.isFinite(now))return [];
 const span=HISTORY_RANGES[range],start=now-span,inside=points.filter(p=>p.time>=start&&p.time<=now);
 if(inside.length<2)return [];
 if(range!=='ALL'&&(inside[0].time>start+span*.25||inside[inside.length-1].time<now-span*.25))return [];
 return inside;
}
function publicFxQuote(cache,code,value,now=Date.now()){
 if(code==='MMK'||typeof value!=='number'||!Number.isFinite(value)||value<=0||value>=1e15||cache?.result!=='success'||cache.base_code!=='USD'||cache.rates?.USD!==1||Number(cache.rates?.[code])!==value)return null;
 const time=Number(cache.time_last_update_unix)*1000,next=Number(cache.time_next_update_unix)*1000;
 if(!Number.isFinite(time)||!Number.isFinite(next)||time<=0||time>now+60000||next<=now||next<time||now-time>48*3600000)return null;
 return {price:value,time,stale:false,source:'public-fx-cache'};
}
function instrumentIcon(id){
 const [kind,code]=id.split(':');
 if(kind==='gold')return '◈';
 if(kind==='crypto')return ({BTC:'₿',ETH:'Ξ',SOL:'◎',BNB:'◆',XRP:'✕',DOGE:'Ð',ADA:'◉',TRX:'▲'})[code]||'◈';
 if(kind==='fx'&&WATCH_FX.includes(code))return code==='EUR'?'🇪🇺':String.fromCodePoint(...[...code.slice(0,2)].map(c=>127397+c.charCodeAt(0)));
 return '⇄';
}
function instrumentItems(snap,lang){
 const items=watchItems(snap,lang);
 for(const code of Object.keys(snap.fx).filter(k=>/^[A-Z]{3}$/.test(k)&&k!=='USD'&&!WATCH_FX.includes(k)))items.push({id:'fx:'+code,category:'currency',name:watchName('fx:'+code,lang),value:safeRate(snap.fx,code),unit:code,q:null});
 return items.map(item=>item.category==='currency'?{...item,q:publicFxQuote(snap.publicCache,item.id.split(':')[1],item.value)}:item);
}
// End V2.0.5 pure helpers.
const UX_COPY={en:{edit:'Edit',done:'Done',all:'All'},zh:{edit:'编辑',done:'完成',all:'全部'},my:{edit:'ပြင်ရန်',done:'ပြီးပါပြီ',all:'အားလုံး'}};
function instrumentMatches(item,query,lang,kind='all'){
 if(kind!=='all'&&item.category!==kind)return false;
 const q=String(query||'').trim().toLocaleLowerCase();
 return !q||[item.id,item.name,item.category,COPY[lang][item.category],instrumentIcon(item.id),...['en','zh','my'].map(l=>watchName(item.id,l))].some(x=>String(x||'').toLocaleLowerCase().includes(q));
}
function watchModeAllowed(owner,ready,ids,editing){return !!(owner&&ready&&ids.length&&editing)}
function rowActionKey(id,action){return id+'|'+action}
function instrumentPrice(item,lang){const v=item.q?.price??item.value??null;return v===null?'—':watchFmt(v,lang)+(item.unit?' '+item.unit:'')}
// End V2.0.6 helpers.
// Integration QA: existing public cache only; never use it for cash MMK.
function publicCacheRates(cache,now=Date.now()){
 const rates=Object.create(null);
 for(const [code,raw] of Object.entries(cache?.rates||{})){
  if(!/^[A-Z]{3}$/.test(code)||code==='USD'||code==='MMK')continue;
  const value=Number(raw);
  if(publicFxQuote(cache,code,value,now))rates[code]=value;
 }
 return rates;
}
function marketCryptoMetadata(status,raw){
 const source=status?.source;
 const known=source==='Live · Binance public feed'||source==='Fallback feed';
 // Legacy producer coerces absent change to zero. Until it exposes raw validity,
 // zero cannot be distinguished from missing data and is deliberately not shown.
 return {unit:source==='Live · Binance public feed'?'USDT':source==='Fallback feed'?'USD':'',
  source:source==='Fallback feed'?'CoinGecko':source||'',
  change:known&&typeof raw==='number'&&Number.isFinite(raw)&&raw!==0?raw:null};
}
function marketNotice(host,message,type){
 try{if(typeof host?.MMHUI?.toast!=='function')return false;host.MMHUI.toast(message,{title:'MMHVAULT',type});return true}catch(_){return false}
}
// End integration QA helpers.
function quote(price,time,maxAge,source,available,now=Date.now()){
 if(typeof price!=='number'||!Number.isFinite(price)||price<=0)return null;
 const t=typeof time==='number'?time:Date.parse(time||'');
 if(!Number.isFinite(t)||t<=0||t>now+60000)return null;
 return {price,time:t,source:String(source||''),stale:!available||now-t>=maxAge};
}
function marketSnapshot(){
 let fx={},gold=null,coins={},publicCache=null;
 try{publicCache=JSON.parse(localStorage.getItem('mmhvault-public-asia-fx-v10')||'null')}catch(_){}
 try{const reader=window.MMHExchangeMarketReferenceV2;fx=reader?reader.getRates?.()||{}:publicCacheRates(publicCache)}catch(_){}
 try{if(typeof goldMarketState!=='undefined'){const g=goldMarketState;gold=quote(g.spotUSD,g.updatedAt,900000,g.source,!g.stale)}}catch(_){}
 try{if(typeof livePrices!=='undefined'&&typeof cryptoQuoteStatusV1!=='undefined'){
 const q=cryptoQuoteStatusV1;for(const symbol of SYMBOLS){const p=livePrices[symbol];const v=quote(p?.price,q.updatedAt,120000,q.source,q.available);if(v){const meta=marketCryptoMetadata(q,p.change);if(meta.unit)coins[symbol]={...v,...meta}}}
 }}catch(_){}
 return {fx,gold,coins,publicCache};
}
function locale(){let l=document.documentElement.lang||'en';try{l=localStorage.getItem('mmhvault_language_v3363')||l}catch(_){}l=l.toLowerCase();return l.startsWith('zh')?'zh':l.startsWith('my')||l==='mm'?'my':'en'}
const V274_COPY={en:{all:'Overview',currency:'Exchange',gold:'Gold',crypto:'Crypto',oil:'Energy',snapshot:'Today’s Market Snapshot',localgold:'Myanmar Gold',fuel:'Fuel Prices',edible:'Edible Oil',converter:'Currency Converter',sections:'Market sections'},zh:{all:'概览',currency:'汇率',gold:'黄金',crypto:'加密货币',oil:'能源',snapshot:'今日市场概览',localgold:'缅甸黄金',fuel:'燃油价格',edible:'食用油',converter:'货币换算',sections:'市场栏目'},my:{all:'ခြုံငုံ',currency:'ငွေလဲ',gold:'ရွှေ',crypto:'ခရစ်ပတို',oil:'စွမ်းအင်',snapshot:'ယနေ့ ဈေးကွက်အနှစ်ချုပ်',localgold:'မြန်မာ့ရွှေ',fuel:'စက်သုံးဆီဈေး',edible:'စားသုံးဆီ',converter:'ငွေကြေးတွက်ချက်မှု',sections:'ဈေးကွက်ကဏ္ဍများ'}};
function mount(){
const page=document.getElementById('exchange');if(!page||page.dataset.marketV2Mounted)return;
const head=page.querySelector('.ex-template-head');if(!head)return;
const nav=document.createElement('div');nav.className='mv2-nav';nav.setAttribute('role','tablist');
const surface=document.createElement('section');surface.className='mv2-surface';surface.id='mv2-market-panel';surface.setAttribute('role','tabpanel');surface.setAttribute('aria-labelledby','mv2-tab-market');
const heading=document.createElement('h2');heading.dataset.mv2Text='overview';heading.hidden=true;surface.append(heading);
const grid=document.createElement('div');grid.className='mv2-grid';
let category='all',selectedInstrument=null,fromWatch=false,historyRange='ALL',watchEditing=false,optionKind='all';
const icons={currency:'⇄',gold:'◈',crypto:'₿',oil:'◉'};
for(const key of ['currency','gold','crypto','oil']){
 const card=document.createElement('button');card.type='button';card.className='mv2-card';card.dataset.mv2Category=key;card.addEventListener('click',()=>{category=key;selectedInstrument=null;fromWatch=false;search.value='';paint();detail.querySelector('h2').focus()});
 const icon=document.createElement('span');icon.className='mv2-icon';icon.setAttribute('aria-hidden','true');icon.textContent=icons[key];
 const label=document.createElement('h3');label.dataset.mv2Text=key;
 const value=document.createElement('div');value.className='mv2-value';value.dataset.mv2Value=key;
 const status=document.createElement('small');status.dataset.mv2Status=key;
 card.append(icon,label,value,status);grid.append(card);
}
surface.append(grid);
const snapshot=document.createElement('section');snapshot.className='mv274-snapshot mv2-pairs';const snapshotTitle=document.createElement('h2');snapshot.append(snapshotTitle);
const snapshotRows=document.createElement('div');snapshotRows.className='mv274-snapshot-rows';snapshot.append(snapshotRows);surface.append(snapshot);
const converter=document.createElement('button');converter.type='button';converter.className='mv2-watch-btn mv274-convert';converter.addEventListener('click',()=>select(active==='convert'?'market':'convert'));
function jump(kind){category=kind;selectedInstrument=null;fromWatch=false;search.value='';select('market')}
function renderSnapshot(snap,lang){const c=V274_COPY[lang],all=instrumentItems(snap,lang);snapshotTitle.textContent=c.snapshot;snapshotRows.replaceChildren();
 for(const [key,label,ids] of [['currency',c.currency,['fx:MMK','fx:CNY','fx:THB']],['gold',c.localgold,['gold:XAU']],['crypto',c.crypto,['crypto:BTC','crypto:ETH','crypto:BNB']],['oil',c.fuel,[]],['oil',c.edible,[]]]){const b=document.createElement('button');b.type='button';b.className='mv274-snapshot-row';b.dataset.kind=key;const name=document.createElement('strong');name.textContent=icons[key]+' '+label;const values=document.createElement('span');values.className='mv274-snapshot-values';
 for(const id of ids){const item=all.find(x=>x.id===id),line=document.createElement('span');line.textContent=(id==='gold:XAU'?'XAU/USD':id.startsWith('fx:')?'USD/'+id.split(':')[1]:id.split(':')[1])+' · '+(item?instrumentPrice(item,lang):'—');values.append(line)}
 if(!ids.length||key==='gold'){const line=document.createElement('span');line.textContent=(key==='gold'?c.localgold+' · ':'')+COPY[lang].pending;values.append(line)}const arrow=document.createElement('span');arrow.textContent='›';arrow.setAttribute('aria-hidden','true');b.append(name,values,arrow);b.addEventListener('click',()=>{jump(key);detailTitle.focus()});snapshotRows.append(b)}
}
const note=document.createElement('p');note.className='mv2-note';note.dataset.mv2Text='note';surface.append(note);
const pairs=document.createElement('div');pairs.className='mv2-pairs';const title=document.createElement('h2');title.dataset.mv2Text='pairs';pairs.append(title);
for(const code of ['MMK','THB','CNY','JPY','SGD','INR','KRW','MYR','VND','AED','AMD']){
 const row=document.createElement('button');row.type='button';row.className='mv2-row mv2-instrument-link';row.addEventListener('click',()=>openInstrument('fx:'+code,'currency',false));
 const label=document.createElement('span');label.textContent='USD / '+code;
 const value=document.createElement('span');value.dataset.mv2Rate=code;row.append(label,value);pairs.append(row);
}
surface.append(pairs);
const watch=document.createElement('section');watch.className='mv2-pairs mv2-watch';
const watchHead=document.createElement('div');watchHead.className='mv2-watch-head';
const watchTitle=document.createElement('h2');watchTitle.tabIndex=-1;
const add=document.createElement('button');add.type='button';add.className='mv2-watch-btn';
const editWatch=document.createElement('button');editWatch.type='button';editWatch.className='mv2-watch-btn';
const tools=document.createElement('div');tools.className='mv2-watch-actions';tools.append(editWatch,add);watchHead.append(watchTitle,tools);
const hint=document.createElement('p');hint.className='mv2-note';
const watchStatus=document.createElement('p');watchStatus.className='mv2-note';watchStatus.setAttribute('role','status');watchStatus.setAttribute('aria-live','polite');
const watchRows=document.createElement('div');watchRows.className='mv2-watch-rows';
watch.append(watchHead,hint,watchStatus,watchRows);surface.insertBefore(watch,pairs);
const dialog=document.createElement('dialog');dialog.className='mv2-watch-dialog';dialog.setAttribute('aria-labelledby','mv2-watch-title');
const dh=document.createElement('div');dh.className='mv2-watch-head';const dt=document.createElement('h2');dt.id='mv2-watch-title';
const dc=document.createElement('button');dc.type='button';dc.className='mv2-watch-btn';dc.textContent='×';dh.append(dt,dc);
const body=document.createElement('div');body.className='mv2-watch-body';
const input=document.createElement('input');input.type='search';input.className='mv2-search';input.autocomplete='off';
const filters=document.createElement('div');filters.className='mv2-history-ranges';filters.setAttribute('role','group');
const options=document.createElement('div');options.className='mv2-watch-options';
const dialogStatus=document.createElement('p');dialogStatus.className='mv2-note';dialogStatus.setAttribute('role','status');dialogStatus.hidden=true;body.append(input,filters,dialogStatus,options);dialog.append(dh,body);surface.append(dialog);
const store=watchStore({getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)},watchOwner);
let uid='',ids=[],ready=false,msg='',watchGeneration=0;
const wc=()=>WATCH_COPY[locale()];
function closeWatch(){if(dialog.open)dialog.close();input.value='';optionKind='all'}
function syncWatch(){const next=watchOwner();if(next!==uid){watchGeneration++;closeWatch();uid=next;ids=[];msg='';watchEditing=false;watchRows.replaceChildren();options.replaceChildren();if(fromWatch){category='all';selectedInstrument=null;fromWatch=false}}const x=store.read(uid);ready=x.ok;ids=x.rows;watchEditing=watchModeAllowed(uid,ready,ids,watchEditing)}
function button(txt,label,fn,disabled=false){const b=document.createElement('button');b.type='button';b.className='mv2-watch-btn';b.textContent=txt;b.title=label;b.setAttribute('aria-label',label);b.disabled=disabled;b.addEventListener('click',fn);return b}
async function mutateWatch(id,action,expected){
 if(!expected||expected!==uid||expected!==watchOwner()){paint();return}
 const stamp=watchGeneration,current=()=>stamp===watchGeneration&&expected===uid&&expected===watchOwner();
 let locks;try{locks=navigator.locks}catch(_){}
 const result=await watchChangeLocked(store,locks,expected,id,action,current);
 if(!current()){paint();return}
 msg=result.ok?'saved':'error';paint();if(!dialog.open&&marketNotice(window,wc()[msg],result.ok?'success':'error')){msg='';for(const n of [watchStatus,detailStatus]){n.textContent='';n.hidden=true}}if(dialog.open){input.focus({preventScroll:true});return}if(category==='all'){
 const row=watchRows.querySelector('[data-watch-id="'+id+'"]'),control=row&&[...row.querySelectorAll('button')].find(b=>b.dataset.mv2Focus===rowActionKey(id,action)&&!b.disabled);(control||row?.querySelector('button')||(watchEditing?editWatch:add)).focus({preventScroll:true})
 }else detailRows.querySelector('[data-watch-star="'+id+'"]')?.focus({preventScroll:true})}
function openWatchDetail(id,expected){if(expected!==uid||expected!==watchOwner()||!ids.includes(id)){paint();return}const item=watchItems(marketSnapshot(),locale()).find(x=>x.id===id);if(!item)return;search.value='';openInstrument(id,item.category,true)}
function drawOptions(){
 const c=wc(),lang=locale(),q=input.value,expected=uid,scroll=body.scrollTop;options.replaceChildren();filters.replaceChildren();filters.setAttribute('aria-label',EXTRA[lang].search);if(!ready)return;
 for(const kind of ['all','currency','gold','crypto']){const name=kind==='all'?UX_COPY[lang].all:COPY[lang][kind];const b=button(name,name,()=>{optionKind=kind;body.scrollTop=0;drawOptions();filters.querySelector('[aria-pressed=true]')?.focus({preventScroll:true})});b.dataset.mv2Focus='filter:'+kind;b.setAttribute('aria-pressed',String(optionKind===kind));filters.append(b)}
 for(const item of instrumentItems(marketSnapshot(),lang).filter(x=>WATCH_SET.has(x.id)&&instrumentMatches(x,q,lang,optionKind))){const saved=ids.includes(item.id);const b=button(instrumentIcon(item.id)+' '+item.name+(saved?' · '+c.already:''),item.name,()=>mutateWatch(item.id,'add',expected),saved);b.dataset.mv2Focus='option:'+item.id;options.append(b)}
 if(!options.children.length){const p=document.createElement('p');p.textContent=EXTRA[lang].noResults;options.append(p)}body.scrollTop=scroll
}
function renderWatch(){
 const c=wc(),lang=locale(),expected=uid,items=instrumentItems(marketSnapshot(),lang),ux=UX_COPY[lang],scroll=watchRows.scrollTop;
 watchTitle.textContent=c.watch+(ids.length?' · '+ids.length:'');add.textContent='+ '+c.add;add.disabled=!ready;editWatch.textContent=watchEditing?ux.done:ux.edit;editWatch.hidden=!ready||!ids.length;editWatch.setAttribute('aria-pressed',String(watchEditing));hint.textContent=c.local;watchRows.dataset.editing=String(watchEditing);dt.textContent=c.title;dc.setAttribute('aria-label',c.close);input.placeholder=c.search;input.setAttribute('aria-label',c.search);
 for(const n of [watchStatus,dialogStatus,detailStatus]){n.textContent=msg?c[msg]:'';n.hidden=!msg}watchRows.replaceChildren();
 if(!uid||!ready||!ids.length){const p=document.createElement('p');p.className='mv2-note';p.textContent=!uid?c.signin:!ready?c.error:c.empty;watchRows.append(p)}
 for(const [i,id] of ids.entries()){const item=items.find(x=>x.id===id);if(!item)continue;const row=document.createElement('div');row.className='mv2-watch-row';row.dataset.watchId=id;
 const open=button('',item.name,()=>openWatchDetail(id,expected));open.className='mv2-watch-open';open.dataset.mv2Focus=rowActionKey(id,'open');const name=document.createElement('strong');name.textContent=instrumentIcon(id)+' '+item.name;const meta=document.createElement('small');meta.textContent=item.value===null?EXTRA[lang].unavailable:item.q?[item.q.stale?EXTRA[lang].stale:EXTRA[lang].fresh,item.q.source==='public-fx-cache'?HISTORY_TEXT[lang].public:item.q.source,new Date(item.q.time).toLocaleString(lang)].filter(Boolean).join(' · '):COPY[lang].reference+' · '+c.unknown;open.append(name,meta);
 const value=document.createElement('span');value.className='mv2-watch-price';value.textContent=instrumentPrice(item,lang);
 const actions=document.createElement('div');actions.className='mv2-watch-actions';for(const [action,icon,label,disabled] of [['up','↑',c.up,i===0],['down','↓',c.down,i===ids.length-1],['remove','×',c.remove,false]]){const b=button(icon,label,()=>mutateWatch(id,action,expected),disabled);b.dataset.mv2Focus=rowActionKey(id,action);actions.append(b)}actions.hidden=!watchEditing;row.append(open,value,actions);watchRows.append(row)}watchRows.scrollTop=scroll;
 if(dialog.open)drawOptions()
}
editWatch.addEventListener('click',()=>{syncWatch();watchEditing=watchModeAllowed(uid,ready,ids,!watchEditing);msg='';paint();editWatch.focus({preventScroll:true})});
add.addEventListener('click',()=>{syncWatch();if(!ready)return;input.value='';optionKind='all';if(!dialog.open)dialog.showModal();drawOptions();input.focus()});
dc.addEventListener('click',closeWatch);input.addEventListener('input',drawOptions);
dialog.addEventListener('cancel',e=>{e.preventDefault();closeWatch()});
dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)closeWatch()});
const detail=document.createElement('section');detail.className='mv2-detail';detail.hidden=true;
function openInstrument(id,kind,watchOrigin){category=kind;selectedInstrument=id;fromWatch=watchOrigin;watchEditing=false;historyRange='ALL';paint();detailTitle.focus()}
const back=document.createElement('button');back.type='button';back.className='mv2-back';back.dataset.mv2Text='back';back.addEventListener('click',()=>{const old=category,wasWatch=fromWatch,wasInstrument=!!selectedInstrument;category=wasInstrument&&!wasWatch?old:'all';selectedInstrument=null;fromWatch=false;paint();if(wasWatch)watchTitle.focus();else if(wasInstrument)detailTitle.focus();else grid.querySelector('[data-mv2-category="'+old+'"]')?.focus()});
const detailTitle=document.createElement('h2');detailTitle.tabIndex=-1;
const search=document.createElement('input');search.type='search';search.className='mv2-search';search.autocomplete='off';search.addEventListener('input',()=>{detailRows.scrollTop=0;renderDetails()});
const categoryCards=document.createElement('div');categoryCards.className='mv2-grid mv274-category-cards';
const detailRows=document.createElement('div');detailRows.className='mv2-detail-rows';
const categoryExtra=document.createElement('section');categoryExtra.className='mv2-pairs mv274-category-extra';
const FX_ORDER_V275=Object.freeze(['USD','THB','CNY','EUR','SGD','MYR','JPY','GBP','KRW','AED','TWD','AUD','NZD','CAD','HKD','INR','MOP','PHP','KHR','VND','LAK','IDR','BND','BDT','NPR','PKR','LKR','BHD','QAR','SAR','OMR','KWD','MNT','KZT','UZS','TJS','KGS','TMT','AFN','BTN','MVR','ILS','JOD','LBP','IQD','IRR','SYP','YER','AMD','AZN','GEL','TRY','KPW','RUB','XCD']);
const FX_COPY_V275={en:{ticker:'USD reference rates · not MMK buy/sell',board:'Exchange rates',unit:'MMK / currency',currency:'Currency',buy:'Buy',sell:'Sell',change:'Change',trend:'Price history',days:'Last 30 days',date:'Date / time',empty:'No verified MMK history available',pending:'MMK market quotes not connected',pause:'Pause',resume:'Resume',close:'Close',reference:'USD reference'},zh:{ticker:'美元参考汇率 · 非缅币买卖价',board:'汇率行情',unit:'缅币 / 外币',currency:'币种',buy:'买入',sell:'卖出',change:'涨跌',trend:'历史行情',days:'最近30天',date:'日期 / 时间',empty:'暂无已验证缅币历史行情',pending:'缅币市场行情暂未接入',pause:'暂停',resume:'继续',close:'关闭',reference:'美元参考汇率'},my:{ticker:'USD ရည်ညွှန်းနှုန်း · MMK ဝယ်/ရောင်း မဟုတ်ပါ',board:'ငွေလဲနှုန်းများ',unit:'MMK / ငွေကြေး',currency:'ငွေကြေး',buy:'ဝယ်',sell:'ရောင်း',change:'ပြောင်းလဲမှု',trend:'ဈေးနှုန်းမှတ်တမ်း',days:'နောက်ဆုံး ၃၀ ရက်',date:'ရက်စွဲ / အချိန်',empty:'အတည်ပြု MMK မှတ်တမ်း မရှိသေးပါ',pending:'MMK ဈေးနှုန်း မချိတ်ဆက်ရသေးပါ',pause:'ခေတ္တရပ်',resume:'ဆက်ရန်',close:'ပိတ်ရန်',reference:'USD ရည်ညွှန်းနှုန်း'}};
const fxTicker=document.createElement('section');fxTicker.className='mv275-ticker';fxTicker.hidden=true;
const fxTickerHead=document.createElement('div');fxTickerHead.className='mv275-ticker-head';const fxTickerLabel=document.createElement('span'),fxPause=document.createElement('button');fxPause.type='button';let fxPaused=false;fxPause.addEventListener('click',()=>{fxPaused=!fxPaused;fxTicker.dataset.paused=String(fxPaused);fxPause.textContent=FX_COPY_V275[locale()][fxPaused?'resume':'pause'];fxPause.setAttribute('aria-pressed',String(fxPaused))});fxTickerHead.append(fxTickerLabel,fxPause);
const fxScroll=document.createElement('div');fxScroll.className='mv275-scroll';fxScroll.tabIndex=0;const fxTrack=document.createElement('div');fxTrack.className='mv275-track';fxScroll.append(fxTrack);fxTicker.append(fxTickerHead,fxScroll);
const fxDialog=document.createElement('dialog');fxDialog.className='mv275-history-dialog';fxDialog.setAttribute('aria-labelledby','mv275-history-title');surface.append(fxDialog);
let fxDialogCode=null,fxOrigin=null,fxTickerKey='';
function fxName(code,lang){try{return new Intl.DisplayNames([lang==='zh'?'zh-CN':lang],{type:'currency'}).of(code)||code}catch(_){return code}}
function fxFlag(code){return code==='EUR'?'🇪🇺':String.fromCodePoint(...[...code.slice(0,2)].map(c=>127397+c.charCodeAt(0)))}
function closeFx(){if(fxDialog.open)fxDialog.close()}
fxDialog.addEventListener('close',()=>{const code=fxDialogCode;fxDialogCode=null;const target=fxOrigin?.isConnected?fxOrigin:detailRows.querySelector('[data-fx-trend="'+code+'"]');target?.focus({preventScroll:true});fxOrigin=null});
function openFx(code,trigger){fxDialogCode=code;fxOrigin=trigger;const lang=locale(),c=FX_COPY_V275[lang];fxDialog.replaceChildren();const head=document.createElement('header'),title=document.createElement('h2');title.id='mv275-history-title';title.textContent=fxFlag(code)+' '+code+' · '+fxName(code,lang);const close=button('×',c.close,closeFx);head.append(title,close);const caption=document.createElement('p');caption.textContent=c.days+' · '+c.unit;const chart=document.createElement('div');chart.className='mv275-empty-chart';chart.textContent=c.empty;const table=document.createElement('table'),thead=document.createElement('thead'),tr=document.createElement('tr');for(const label of [c.date,c.buy,c.sell,c.change]){const th=document.createElement('th');th.scope='col';th.textContent=label;tr.append(th)}thead.append(tr);const tbody=document.createElement('tbody'),empty=document.createElement('tr'),td=document.createElement('td');td.colSpan=4;td.textContent=c.empty;empty.append(td);tbody.append(empty);table.append(thead,tbody);fxDialog.append(head,caption,chart,table);if(!fxDialog.open)fxDialog.showModal();close.focus()}
function renderFxBoard(all,lang,query){const c=FX_COPY_V275[lang],ref=all.filter(x=>x.category==='currency'&&x.value!=null&&x.id!=='fx:MMK');fxTickerLabel.textContent=c.ticker;fxScroll.setAttribute('aria-label',c.ticker);fxPause.textContent=c[fxPaused?'resume':'pause'];fxPause.setAttribute('aria-pressed',String(fxPaused));const featured=['THB','CNY','JPY','SGD','MYR','EUR','GBP','KRW'].map(code=>ref.find(x=>x.id==='fx:'+code)).filter(Boolean);const key=lang+JSON.stringify(featured.map(x=>[x.id,x.value]));if(key!==fxTickerKey){fxTickerKey=key;fxTrack.replaceChildren();for(let i=0;i<2;i++){const group=document.createElement('div');group.className='mv275-ticker-group';if(i)group.setAttribute('aria-hidden','true');for(const item of featured){const chip=document.createElement('span');chip.textContent=fxFlag(item.unit)+' USD / '+item.unit+' · '+instrumentPrice(item,lang);group.append(chip)}if(!featured.length){const chip=document.createElement('span');chip.textContent=c.pending;group.append(chip)}fxTrack.append(group)}}
 const table=document.createElement('table');table.className='mv275-board';const caption=document.createElement('caption');caption.textContent=c.board+' · '+c.unit;table.append(caption);const head=document.createElement('thead'),hr=document.createElement('tr');for(const label of [c.currency,c.buy,c.sell,c.change]){const th=document.createElement('th');th.scope='col';th.textContent=label;hr.append(th)}head.append(hr);table.append(head);const rows=document.createElement('tbody');
 const codes=[...new Set([...FX_ORDER_V275,...all.filter(x=>x.category==='currency').map(x=>x.id.slice(3))])].filter(x=>x!=='MMK');for(const code of codes){const name=fxName(code,lang);if(query&&!([name,code,fxFlag(code)].some(v=>v.toLocaleLowerCase().includes(query))))continue;const row=document.createElement('tr');row.dataset.fxCode=code;const cell=document.createElement('th');cell.scope='row';const identity=document.createElement('div');identity.className='mv275-fx-name';const flag=document.createElement('span');flag.className='mv275-flag';flag.textContent=fxFlag(code);flag.setAttribute('aria-hidden','true');const words=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=name;small.textContent=code;words.append(strong,small);const trend=button('↗',c.trend+' '+code,()=>openFx(code,trend));trend.className='mv275-trend';trend.dataset.fxTrend=code;trend.dataset.mv2Focus='fx-trend:'+code;identity.append(flag,words,trend);cell.append(identity);row.append(cell);for(let i=0;i<3;i++){const td=document.createElement('td');td.textContent='—';row.append(td)}rows.append(row)}
 table.append(rows);const note=document.createElement('p');note.className='mv2-note';note.textContent=c.pending;detailRows.append(table,note)}

const DETAIL_COPY_V274={en:{rates:'Exchange Rates List',international:'International Gold',local:'Myanmar Gold',purity:'Myanmar Gold Prices by Purity',compare:'International vs. Local',coins:'Crypto Prices',fuel:'Fuel Prices',edible:'Edible Oil Prices',trend:'Price trend',compareEnergy:'Price Trend Comparison',buy:'Buy',sell:'Sell',missing:'Data not connected',region:'Myanmar · Regional prices may vary',diesel:'Diesel',palm:'Palm oil',soy:'Soybean oil',sun:'Sunflower oil',kyattha:'1 Kyattha',volume:'Trading volume',sentiment:'Market sentiment'},zh:{rates:'汇率明细',international:'国际黄金',local:'缅甸黄金',purity:'缅甸黄金纯度价格',compare:'国际与本地金价对比',coins:'加密货币行情',fuel:'燃油价格',edible:'食用油价格',trend:'价格走势',compareEnergy:'价格趋势对比',buy:'买入',sell:'卖出',missing:'数据暂未接入',region:'缅甸 · 各地区价格可能不同',diesel:'柴油',palm:'棕榈油',soy:'大豆油',sun:'葵花籽油',kyattha:'1 缅甸甲塔',volume:'成交量',sentiment:'市场情绪'},my:{rates:'ငွေလဲနှုန်းစာရင်း',international:'နိုင်ငံတကာရွှေ',local:'မြန်မာ့ရွှေ',purity:'ရွှေရည်အလိုက် ဈေးနှုန်း',compare:'နိုင်ငံတကာနှင့် ပြည်တွင်းရွှေ',coins:'ခရစ်ပတိုဈေးနှုန်း',fuel:'စက်သုံးဆီဈေး',edible:'စားသုံးဆီဈေး',trend:'ဈေးနှုန်းလမ်းကြောင်း',compareEnergy:'ဈေးနှုန်း နှိုင်းယှဉ်မှု',buy:'ဝယ်',sell:'ရောင်း',missing:'ဒေတာ မချိတ်ဆက်ရသေးပါ',region:'မြန်မာ · ဒေသအလိုက် ဈေးနှုန်းကွာနိုင်ပါသည်',diesel:'ဒီဇယ်',palm:'စားအုန်းဆီ',soy:'ပဲပုပ်ဆီ',sun:'နေကြာဆီ',kyattha:'၁ ကျပ်သား',volume:'အရောင်းအဝယ်ပမာဏ',sentiment:'ဈေးကွက် စိတ်ခံစားမှု'}};
function renderCategoryCards(all,lang){
 const c=DETAIL_COPY_V274[lang],h=HISTORY_TEXT[lang];categoryCards.replaceChildren();categoryExtra.replaceChildren();categoryCards.hidden=!!selectedInstrument||category==='all';categoryExtra.hidden=categoryCards.hidden;
 if(categoryCards.hidden)return;
 const entries=category==='currency'?['MMK','THB','CNY','SGD'].map(code=>['USD / '+code,'fx:'+code]):category==='gold'?[[c.international,'gold:XAU'],[c.local+' 24K'],[c.local+' 23K'],[c.kyattha]]:category==='crypto'?['BTC','ETH','BNB','SOL'].map(code=>[code,'crypto:'+code]):[['RON 92'],['RON 95'],[c.diesel],[c.palm],[c.soy],[c.sun]];
 for(const [label,id] of entries){const item=id?all.find(x=>x.id===id):null,card=document.createElement(item?'button':'div');card.className='mv2-card';card.dataset.mv2Category=category;if(item){card.type='button';card.addEventListener('click',()=>openInstrument(item.id,item.category,false))}const title=document.createElement('h3'),v=document.createElement('div'),status=document.createElement('small');title.textContent=label;v.className='mv2-value';v.textContent=item?instrumentPrice(item,lang):'—';status.textContent=item?.q?(item.q.stale?EXTRA[lang].stale:EXTRA[lang].fresh):item?.value!=null?COPY[lang].reference:c.missing;card.append(title,v,status);categoryCards.append(card)}
 function block(title,rows){const section=document.createElement('section');section.className='mv274-extra-block';const head=document.createElement('h3');head.textContent=title;section.append(head);for(const [label,value] of rows){const row=document.createElement('div');row.className='mv2-detail-row';const a=document.createElement('span'),b=document.createElement('span');a.textContent=label;b.textContent=value;row.append(a,b);section.append(row)}categoryExtra.append(section)}
 if(category==='gold'){block(c.purity,['24K','23K','22K','21K'].map(k=>[k,c.buy+' — · '+c.sell+' —']));block(c.compare,[[c.international,all.find(x=>x.id==='gold:XAU')?instrumentPrice(all.find(x=>x.id==='gold:XAU'),lang):'—'],[c.local,'—']])}
 if(category==='crypto'){block(c.sentiment,[[c.missing,'—']]);block(c.volume,[[c.missing,'—']])}
 if(category==='oil'){block(c.compareEnergy,[[h.noHistory,'—']]);block(c.region,[[c.missing,'—']])}
 if(category!=='oil')block(c.trend,[[h.noHistory,'—']]);
}
const history=document.createElement('section');history.className='mv2-history';history.hidden=true;
function drawHistory(item,lang,series=null,observations=[]){
 const h=HISTORY_TEXT[lang],now=Date.now();history.replaceChildren();
 const title=document.createElement('h2');title.textContent=h.history;history.append(title);
 // No runtime history provider; authorization defaults to empty.
 const rows=verifiedHistory(observations,series,HISTORY_APPROVALS,now);
 const available=Object.keys(HISTORY_RANGES).filter(k=>historyWindow(rows,k,now).length>=2);
 const ranges=document.createElement('div');ranges.className='mv2-history-ranges';ranges.setAttribute('role','group');ranges.setAttribute('aria-label',h.range);
 if(!available.includes(historyRange))historyRange=available[available.length-1]||'ALL';
 for(const k of Object.keys(HISTORY_RANGES)){const b=button(k,k,()=>{historyRange=k;drawHistory(item,lang,series,observations);history.querySelector('[aria-pressed="true"]')?.focus()},!available.includes(k));b.setAttribute('aria-pressed',String(available.includes(k)&&historyRange===k));ranges.append(b)}
 history.append(ranges);
 const points=historyWindow(rows,historyRange,now);
 if(points.length<2){const p=document.createElement('p');p.className='mv2-note';p.textContent=h.noHistory;history.append(p);return}
 // Point-only plot: never interpolate missing observations.
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 640 220');svg.setAttribute('role','img');svg.setAttribute('aria-label',h.observations);
 let low=Infinity,high=-Infinity;for(const p of points){low=Math.min(low,p.price);high=Math.max(high,p.price)}
 const first=points[0].time,last=points[points.length-1].time;
 for(const p of points){const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',String(16+608*(p.time-first)/(last-first)));dot.setAttribute('cy',String(high===low?110:204-188*(p.price-low)/(high-low)));dot.setAttribute('r','3');dot.setAttribute('fill','currentColor');const tip=document.createElementNS(ns,'title');tip.textContent=new Date(p.time).toLocaleString(lang)+' · '+watchFmt(p.price,lang)+' '+series.currency+' / '+series.unit;dot.append(tip);svg.append(dot)}
 const legend=document.createElement('p');legend.className='mv2-note';legend.textContent=new Date(first).toLocaleDateString(lang)+' — '+new Date(last).toLocaleDateString(lang)+' · '+watchFmt(low,lang)+' – '+watchFmt(high,lang)+' '+series.currency+' / '+series.unit+' · '+points.length+' '+h.observations;history.append(svg,legend)
}
const detailStatus=document.createElement('p');detailStatus.className='mv2-note';detailStatus.setAttribute('role','status');detailStatus.hidden=true;detail.append(back,detailTitle,fxTicker,categoryCards,search,detailStatus,detailRows,history,categoryExtra);surface.append(detail);
let active='market';
const convertTarget=document.getElementById('mmhExchangeV2StagingRoot');
const legacy=page.querySelector('.exchange-converter-panel');
const sections=['all','currency','gold','crypto','oil'];
for(const key of sections){
 const b=document.createElement('button');b.type='button';b.id='mv2-tab-'+(key==='all'?'market':key);b.dataset.mv2Section=key;b.setAttribute('role','tab');b.setAttribute('aria-controls',surface.id);
 b.addEventListener('click',()=>jump(key));b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=sections.indexOf(key),next=sections[e.key==='Home'?0:e.key==='End'?4:(i+(e.key==='ArrowLeft'?4:1))%5];jump(next);nav.querySelector('[data-mv2-section="'+next+'"]').focus()});nav.append(b);
}
function select(key){if(key!=='market'){closeFx();closeWatch();watchEditing=false;category='currency';selectedInstrument=null;fromWatch=false}active=key;page.dataset.marketView=key;paint();window.dispatchEvent(new CustomEvent('mmhvault:market-view-changed',{detail:{view:key}}))}
function renderDetails(){
 const lang=locale(),c={...COPY[lang],...EXTRA[lang]},h=HISTORY_TEXT[lang],snap=marketSnapshot();
 detailRows.replaceChildren();history.hidden=true;const all=instrumentItems(snap,lang);renderCategoryCards(all,lang);if(category==='all')return;
 const item=selectedInstrument?all.find(x=>x.id===selectedInstrument&&x.category===category):null;
 detailTitle.textContent=item?instrumentIcon(item.id)+' '+item.name:category==='currency'?DETAIL_COPY_V274[lang].rates:V274_COPY[lang][category];
 back.textContent=fromWatch?wc().back:selectedInstrument?h.category:c.back;
 search.placeholder=c.search;search.setAttribute('aria-label',c.search);search.hidden=!!selectedInstrument||category==='gold'||category==='oil';
 const query=search.hidden?'':search.value.trim().toLocaleLowerCase();
 const fxBoard=category==='currency'&&!selectedInstrument;back.hidden=fxBoard;detailTitle.hidden=fxBoard;fxTicker.hidden=!fxBoard;detailRows.classList.toggle('mv275-board-host',fxBoard);if(!fxBoard)closeFx();if(fxBoard){categoryCards.hidden=true;categoryExtra.hidden=true;renderFxBoard(all,lang,query);return}
 const quoteSource=q=>q?.source==='public-fx-cache'?h.public:q?.source||h.unknownSource;
 function star(row,item){if(!WATCH_SET.has(item.id)||!uid||!ready)return;const expected=uid,saved=ids.includes(item.id),b=button(saved?'★':'☆',saved?wc().remove:wc().add,()=>mutateWatch(item.id,saved?'remove':'add',expected));b.dataset.watchStar=item.id;b.dataset.mv2Focus=rowActionKey(item.id,'star');b.setAttribute('aria-pressed',String(saved));row.classList.add('mv2-detail-watchable');row.append(b)}
 function price(item){return instrumentPrice(item,lang)}
 function change(item,right){if(item.q&&Number.isFinite(item.q.change)){const ch=document.createElement('small');ch.textContent=(item.q.change>=0?'+':'')+item.q.change.toFixed(2)+'% · 24h';ch.className=item.q.change>=0?'mv2-up':'mv2-down';right.append(ch)}}
 if(selectedInstrument){
  if(!item){const p=document.createElement('p');p.textContent=c.unavailable;detailRows.append(p);return}
  const row=document.createElement('div');row.className='mv2-detail-row mv2-quote-hero';
  const left=document.createElement('div'),name=document.createElement('strong');name.textContent=item.name;left.append(name);
  const right=document.createElement('div');right.className='mv2-quote-price';right.textContent=price(item);change(item,right);row.append(left,right);star(row,item);detailRows.append(row);
  const unit=item.category==='currency'?item.unit+' / USD':item.category==='gold'?'USD / troy ounce':item.unit?item.unit+' / '+item.id.split(':')[1]:'—';
  for(const [label,value] of [[h.quote,unit],[c.source,quoteSource(item.q)],[c.updated,item.q?new Date(item.q.time).toLocaleString(lang):wc().unknown],[h.status,item.q?(item.q.stale?c.stale:c.fresh):item.value===null?c.unavailable:h.unknownStatus]]){
   const r=document.createElement('div');r.className='mv2-detail-row';const a=document.createElement('span'),v=document.createElement('span');a.textContent=label;v.textContent=value;r.append(a,v);detailRows.append(r)
  }
  history.hidden=false;drawHistory(item,lang);return
 }
 if(category==='oil'){for(const [label,products] of [[V274_COPY[lang].fuel,['RON 92','RON 95','Diesel']],[V274_COPY[lang].edible,['Palm oil','Soybean oil','Sunflower oil']]]){const group=document.createElement('section');group.className='mv274-energy-group';const title=document.createElement('h3');title.textContent=label;group.append(title);const p=document.createElement('p');p.className='mv2-note';p.textContent=c.pending;group.append(p);const names={zh:['92号汽油','95号汽油','柴油','棕榈油','大豆油','葵花籽油'],my:['RON 92','RON 95','ဒီဇယ်','စားအုန်းဆီ','ပဲပုပ်ဆီ','နေကြာဆီ']};const base=label===V274_COPY[lang].fuel?0:3;for(const [i,name] of products.entries()){const row=document.createElement('div');row.className='mv2-detail-row';const n=document.createElement('span'),v=document.createElement('span');n.textContent=names[lang]?.[base+i]||name;v.textContent='—';row.append(n,v);group.append(row)}detailRows.append(group)}return}
 for(const x of all.filter(x=>instrumentMatches(x,query,lang,category))){
  const row=document.createElement('div');row.className='mv2-detail-row';
  const open=button('',h.detail+' '+x.name,()=>openInstrument(x.id,x.category,false));open.className='mv2-watch-open';open.dataset.instrumentId=x.id;open.dataset.mv2Focus=rowActionKey(x.id,'detail');
  const name=document.createElement('strong'),meta=document.createElement('small');name.textContent=instrumentIcon(x.id)+' '+x.name;meta.textContent=x.q?[x.q.stale?c.stale:c.fresh,quoteSource(x.q),new Date(x.q.time).toLocaleString(lang)].join(' · '):x.value===null?c.unavailable:c.reference+' · '+wc().unknown;open.append(name,meta);
  const right=document.createElement('div');right.textContent=price(x);change(x,right);row.append(open,right);star(row,x);detailRows.append(row)
 }
 if(!detailRows.children.length){const p=document.createElement('p');p.textContent=c.noResults;detailRows.append(p)}
}
function paint(){
 const focused=document.activeElement?.dataset?.mv2Focus,priorOwner=uid,detailScroll=detailRows.scrollTop;syncWatch();if(!page.classList.contains('active')){closeFx();closeWatch();watchEditing=false}const lang=locale(),c={...COPY[lang],...EXTRA[lang]};for(const n of page.querySelectorAll('[data-mv2-text]'))n.textContent=c[n.dataset.mv2Text];
 const snap=marketSnapshot(),rates=snap.fx;delete page.dataset.mv273;const vc=V274_COPY[lang];nav.setAttribute('aria-label',vc.sections);for(const b of nav.children){const k=b.dataset.mv2Section,on=k===category;b.textContent=vc[k];b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1}converter.textContent=active==='convert'?vc.currency:vc.converter;converter.hidden=category!=='currency';surface.setAttribute('aria-labelledby','mv2-tab-'+(category==='all'?'market':category));renderSnapshot(snap,lang);
 const fmt=new Intl.NumberFormat(lang==='my'?'my':lang==='zh'?'zh-CN':'en',{maximumFractionDigits:6});
 for(const n of surface.querySelectorAll('[data-mv2-rate]')){const v=safeRate(rates,n.dataset.mv2Rate);n.textContent=v===null?'—':watchFmt(v,lang);n.title=v===null?c.unavailable:c.reference}
 for(const n of surface.querySelectorAll('[data-mv2-value]')){
 const k=n.dataset.mv2Value,q=k==='gold'?snap.gold:k==='crypto'?snap.coins.BTC:null,rate=k==='currency'?safeRate(rates,'MMK'):q?.price??null;
 n.textContent=rate===null?c.unavailable:(k==='currency'?'USD/MMK · ':k==='gold'?'XAU/USD · ':'BTC/'+q.unit+' · ')+watchFmt(rate,lang);
 const status=surface.querySelector('[data-mv2-status="'+k+'"]');status.textContent=k==='currency'?c.reference:q?(q.stale?c.stale:c.fresh):k==='oil'?c.pending:c.unavailable;
 }
 page.dataset.marketDetail=selectedInstrument?'instrument':category==='all'?'overview':'category';const overview=category==='all';heading.hidden=true;grid.hidden=!overview;snapshot.hidden=!overview;note.hidden=!overview;pairs.hidden=!overview;watch.hidden=!overview;detail.hidden=overview;
 renderWatch();renderDetails();if(!selectedInstrument)detailRows.scrollTop=detailScroll;
 if(focused&&uid===priorOwner&&active==='market'&&page.classList.contains('active')){const scope=dialog.open?dialog:surface;const target=[...scope.querySelectorAll('[data-mv2-focus]')].find(n=>n.dataset.mv2Focus===focused&&!n.disabled&&!n.closest('[hidden]'));target?.focus({preventScroll:true})}
}
const style=document.createElement('style');style.textContent=`
#exchange[data-market-v2-mounted] .mv2-nav{display:flex;gap:6px;padding:4px;border:1px solid var(--uv-line,GrayText);border-radius:10px;background:var(--uv-card,Canvas);grid-column:1/-1;grid-row:auto!important;min-width:0}
#exchange[data-market-v2-mounted] .mv2-nav button{flex:1;min-width:0;min-height:42px;border:0;border-radius:7px;background:transparent;color:var(--uv-muted,GrayText);font-weight:650}
#exchange[data-market-v2-mounted] .mv2-nav button[aria-selected=true]{background:var(--uv-raised,Canvas);color:var(--uv-text,CanvasText)}
#exchange[data-market-v2-mounted] .mv2-surface{grid-column:1/-1;grid-row:auto!important;min-width:0;display:grid;gap:12px;color:var(--uv-text,CanvasText)}
#exchange[data-market-v2-mounted] .mv2-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
#exchange[data-market-v2-mounted] :is(.mv2-card,.mv2-pairs){min-width:0;background:var(--uv-card,Canvas);border:1px solid var(--uv-line,GrayText);border-radius:12px;padding:14px}
#exchange[data-market-v2-mounted] .mv2-icon{font-size:20px;color:var(--uv-accent,Highlight)}
#exchange[data-market-v2-mounted] .mv2-card h3{font-size:14px;margin:8px 0}
#exchange[data-market-v2-mounted] .mv2-value{font-size:14px;font-weight:650;overflow-wrap:anywhere;margin:8px 0}
#exchange[data-market-v2-mounted] :is(.mv2-note,.mv2-card small){font-size:12px;color:var(--uv-muted,GrayText)}
#exchange[data-market-v2-mounted] .mv2-surface h2{font-size:16px;margin:0}
#exchange[data-market-v2-mounted] .mv2-row{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid var(--uv-line,GrayText);font-variant-numeric:tabular-nums}
#exchange[data-market-v2-mounted] .mv2-row:last-child{border:0}
html body #exchange#exchange[data-market-view=market] > :is(#mmhExchangeV2StagingRoot,.exchange-converter-panel,.ex-rate-editor,.ex-currency-cards){display:none!important}
html body #exchange#exchange[data-market-view=convert] > :is(.mv2-surface,#exAsiaSummaryV130){display:none!important}
@media(max-width:850px){#exchange[data-market-v2-mounted] .mv2-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:360px){#exchange[data-market-v2-mounted] .mv2-grid{grid-template-columns:1fr}}
html body #exchange#exchange[data-market-v2-mounted].page.active{grid-template-columns:minmax(0,1fr)!important;align-content:start!important}
html body #exchange#exchange[data-market-v2-mounted]>.ex-template-head{grid-row:1!important;grid-column:1/-1!important}
html body #exchange#exchange[data-market-v2-mounted]>.mv2-nav{grid-row:2!important;grid-column:1/-1!important}
html body #exchange#exchange[data-market-v2-mounted]>.mv2-surface{grid-row:3!important;grid-column:1/-1!important}
html body #exchange#exchange[data-market-view=market]>#exAsiaSummaryV130{grid-row:4!important;grid-column:1/-1!important}
html body #exchange#exchange[data-market-view=convert]>#mmhExchangeV2StagingRoot{grid-row:3!important;grid-column:1/-1!important;min-width:0}
html body #exchange#exchange[data-market-view=convert]>.ex-currency-cards{grid-row:3!important;grid-column:1/-1!important}
html body #exchange#exchange[data-market-view=convert]>.exchange-converter-panel{grid-row:4!important}
html body #exchange#exchange[data-market-view=convert]>.ex-rate-editor{grid-row:5!important}
html body #exchange#exchange[data-market-view=convert]:has(>#mmhExchangeV2StagingRoot[data-exchange-v2-mounted=yes]:not([hidden]))>:is(.ex-currency-cards,.exchange-converter-panel,.ex-rate-editor,#exAsiaV10){display:none!important}
html body #exchange#exchange[data-market-v2-mounted]>.ex-template-head :is(.ex-source,.mmh-context-desc-v199){display:none!important}
#exchange[data-market-v2-mounted] .mv2-card{text-align:start;color:var(--uv-text,CanvasText);cursor:pointer;width:100%;display:block}
#exchange[data-market-v2-mounted] .mv2-card:focus-visible,#exchange[data-market-v2-mounted] .mv2-back:focus-visible{outline:2px solid var(--uv-accent,Highlight);outline-offset:2px}
#exchange[data-market-v2-mounted] .mv2-card:hover{background:var(--uv-raised,Canvas)}
#exchange[data-market-v2-mounted] .mv2-detail{display:grid;gap:12px;min-width:0}
#exchange[data-market-v2-mounted] .mv2-detail-rows{border:1px solid var(--uv-line,GrayText);background:var(--uv-card,Canvas);border-radius:12px;padding:0 12px;min-width:0}
#exchange[data-market-v2-mounted] .mv2-detail-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.8fr);gap:10px;padding:12px 0;border-bottom:1px solid var(--uv-line,GrayText);overflow-wrap:anywhere;align-items:center}
#exchange[data-market-v2-mounted] .mv2-detail-row:last-child{border-bottom:0}
#exchange[data-market-v2-mounted] .mv2-detail-row>div:last-child{text-align:end;font-variant-numeric:tabular-nums}
#exchange[data-market-v2-mounted] .mv2-detail-row small{display:block;margin-top:4px;color:var(--uv-muted,GrayText);font-size:11px}
#exchange[data-market-v2-mounted] .mv2-detail-row .mv2-up{color:#29966c}
#exchange[data-market-v2-mounted] .mv2-detail-row .mv2-down{color:#c75e65}
#exchange[data-market-v2-mounted] :is(.mv2-back,.mv2-search){min-height:44px;min-width:0;max-width:100%;box-sizing:border-box;border-radius:9px;border:1px solid var(--uv-line,GrayText);background:var(--uv-card,Canvas);color:var(--uv-text,CanvasText);padding:8px 12px}
#exchange[data-market-v2-mounted] .mv2-back{justify-self:start}
#exchange[data-market-v2-mounted] .mv2-surface [hidden]{display:none!important}
#exchange[data-market-v2-mounted] .mv2-watch-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
#exchange[data-market-v2-mounted] .mv2-watch-rows{max-height:380px;overflow:auto;overscroll-behavior:contain}
#exchange[data-market-v2-mounted] .mv2-watch-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.7fr);align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--uv-line,GrayText);min-width:0}
#exchange[data-market-v2-mounted] .mv2-watch-rows[data-editing=true] .mv2-watch-row{grid-template-columns:minmax(0,1fr) minmax(0,.7fr) auto}
#exchange[data-market-v2-mounted] .mv2-watch-row:last-child{border-bottom:0}
#exchange[data-market-v2-mounted] .mv2-watch-open{min-width:0;min-height:42px;text-align:start;background:transparent;border:0;color:var(--uv-text,CanvasText);padding:0;overflow-wrap:anywhere}
#exchange[data-market-v2-mounted] .mv2-watch-open small{display:block;color:var(--uv-muted,GrayText);font-size:11px;margin-top:4px}
#exchange[data-market-v2-mounted] .mv2-watch-price{text-align:end;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
#exchange[data-market-v2-mounted] .mv2-watch-actions{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
#exchange[data-market-v2-mounted] .mv2-watch-btn{min-height:44px;min-width:44px;padding:6px 9px;border-radius:8px;border:1px solid var(--uv-line,GrayText);background:var(--uv-raised,Canvas);color:var(--uv-text,CanvasText);font:inherit}
#exchange[data-market-v2-mounted] .mv2-watch-btn:disabled{opacity:.45}
#exchange[data-market-v2-mounted] .mv2-watch-btn[aria-pressed=true]{color:var(--uv-accent,Highlight)}
#exchange[data-market-v2-mounted] .mv2-detail-watchable{grid-template-columns:minmax(0,1fr) minmax(0,.8fr) auto}
#exchange[data-market-v2-mounted] .mv2-detail-watchable>div:nth-child(2){text-align:end}
#exchange[data-market-v2-mounted] .mv2-watch-dialog{position:fixed;inset:0;margin:auto;width:min(440px,calc(100% - 24px));max-height:min(80vh,680px);max-height:min(80dvh,680px);padding:0;overflow:hidden;border:1px solid var(--uv-line,GrayText);border-radius:12px;background:var(--uv-card,Canvas);color:var(--uv-text,CanvasText)}
#exchange[data-market-v2-mounted] .mv2-watch-dialog[open]{display:flex;flex-direction:column}
#exchange[data-market-v2-mounted] .mv2-watch-dialog:not([open]){display:none!important}
#exchange[data-market-v2-mounted] .mv2-watch-dialog::backdrop{background:#0008}
#exchange[data-market-v2-mounted] .mv2-watch-dialog .mv2-watch-head{padding:12px;border-bottom:1px solid var(--uv-line,GrayText);flex:none}
#exchange[data-market-v2-mounted] .mv2-watch-body{padding:12px;min-height:0;overflow:auto;overscroll-behavior:contain}
#exchange[data-market-v2-mounted] .mv2-watch-body input{width:100%;min-width:0}
#exchange[data-market-v2-mounted] .mv2-watch-options{display:grid;gap:6px;margin-top:10px}
#exchange[data-market-v2-mounted] .mv2-watch-options button{text-align:start;white-space:normal;overflow-wrap:anywhere}
@media(max-width:480px){#exchange[data-market-v2-mounted] .mv2-watch-rows[data-editing=true] .mv2-watch-row,#exchange[data-market-v2-mounted] .mv2-watch-row{grid-template-columns:minmax(0,1fr) minmax(0,.65fr)}#exchange[data-market-v2-mounted] .mv2-watch-actions{grid-column:1/-1;justify-content:flex-end}}
#exchange[data-market-v2-mounted] .mv2-surface *{box-sizing:border-box;min-width:0}
#exchange[data-market-v2-mounted] .mv2-surface :is(button,input){font-family:inherit;line-height:1.4;background-image:none;box-shadow:none}
#exchange[data-market-v2-mounted] .mv2-surface :is(.mv2-note,.mv2-card small){overflow-wrap:anywhere;margin:4px 0}
#exchange[data-market-v2-mounted] .mv2-watch-btn[aria-pressed=true]{border-color:var(--uv-accent,Highlight)}
#exchange[data-market-v2-mounted] .mv2-history-ranges .mv2-watch-btn{flex:1 1 48px}
#exchange[data-market-v2-mounted] .mv2-watch-body .mv2-history-ranges{margin-top:10px}
#exchange[data-market-v2-mounted][data-market-detail=category] .mv2-detail-rows{max-height:min(55dvh,520px);overflow:auto;overscroll-behavior:contain}
#exchange[data-market-v2-mounted] .mv2-detail-row>div:nth-child(2){text-align:end;font-variant-numeric:tabular-nums}
#exchange[data-market-v2-mounted] .mv2-history .mv2-note{min-height:64px;display:grid;place-items:center;text-align:center}
html body #exchange#exchange[data-market-detail=instrument] > #exAsiaSummaryV130,html body #exchange#exchange[data-market-view=market]:has(>#mmhExchangeV2StagingRoot[data-exchange-v2-mounted=yes]:not([hidden]))>#exAsiaSummaryV130{display:none!important}
#exchange[data-market-v2-mounted] .mv2-instrument-link{width:100%;min-height:44px;background:transparent;color:var(--uv-text,CanvasText);border:0;border-bottom:1px solid var(--uv-line,GrayText);text-align:start;font:inherit;cursor:pointer}
#exchange[data-market-v2-mounted] .mv2-quote-price{font-size:clamp(16px,3vw,24px);font-weight:650;overflow-wrap:anywhere}
#exchange[data-market-v2-mounted] .mv2-detail-row>span:last-child{text-align:end;overflow-wrap:anywhere}
#exchange[data-market-v2-mounted] .mv2-history{min-width:0;border:1px solid var(--uv-line,GrayText);border-radius:12px;padding:14px;background:var(--uv-card,Canvas);display:grid;gap:12px}
#exchange[data-market-v2-mounted] .mv2-history-ranges{display:flex;flex-wrap:wrap;gap:6px}
#exchange[data-market-v2-mounted] .mv2-history svg{width:100%;height:auto;color:var(--uv-accent,Highlight);display:block}
#exchange[data-market-v2-mounted] :is(.mv2-watch-open,.mv2-instrument-link,.mv2-watch-btn):focus-visible{outline:2px solid var(--uv-accent,Highlight);outline-offset:2px}
/* V2.0.74: actual mounted Personal Market, not the dormant template shell. */
html body #exchange#exchange[data-market-v2-mounted] > :is(.ex-template-head,#mmhMarketShellV273){display:none!important}
html body #exchange#exchange[data-market-v2-mounted].page.active{--mv74-card:#191b20;--mv74-raised:#24272e;--mv74-line:#353940;--mv74-text:#eff0f3;--mv74-muted:#a9acb5;--mv74-gold:#d9b56f;gap:12px!important;padding-inline:clamp(12px,2vw,24px)!important;box-sizing:border-box!important}
html body.light #exchange#exchange[data-market-v2-mounted].page.active{--mv74-card:#fff;--mv74-raised:#f6f3ed;--mv74-line:#e3ded5;--mv74-text:#252525;--mv74-muted:#62656d;--mv74-gold:#a57628}
html body #exchange#exchange[data-market-v2-mounted]>.mv2-nav{grid-row:1!important;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:3px;background:var(--mv74-card);border:1px solid var(--mv74-line);padding:4px;border-radius:13px}
html body #exchange#exchange[data-market-v2-mounted]>.mv2-nav button{min-height:44px;padding:5px 2px;font-size:clamp(10px,2.5vw,14px);white-space:normal;overflow-wrap:anywhere;background:transparent!important;color:var(--mv74-text)!important}
html body #exchange#exchange[data-market-v2-mounted]>.mv2-nav button[aria-selected=true]{background:linear-gradient(135deg,#d8b36b,#a97730)!important;color:#17130b!important}
html body #exchange#exchange[data-market-v2-mounted]>.mv274-convert{grid-row:2!important;grid-column:1/-1;justify-self:end;background:var(--mv74-card)!important;color:var(--mv74-text)!important;border-color:var(--mv74-line)!important}
html body #exchange#exchange[data-market-v2-mounted]>.mv274-convert[hidden]{display:none!important}
html body #exchange#exchange[data-market-v2-mounted][data-market-view=market][data-market-detail=category]>#exAsiaSummaryV130{display:none!important}
html body #exchange#exchange[data-market-v2-mounted] .mv274-energy-group{padding:12px 0;border-bottom:1px solid var(--mv74-line)}
html body #exchange#exchange[data-market-v2-mounted] .mv274-energy-group:last-child{border-bottom:0}
html body #exchange#exchange[data-market-v2-mounted] .mv274-energy-group h3{margin:0;font-size:15px}
html body #exchange#exchange[data-market-v2-mounted] .mv274-category-extra{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
html body #exchange#exchange[data-market-v2-mounted] .mv274-extra-block{min-width:0;border:1px solid var(--mv74-line);border-radius:10px;padding:12px}
html body #exchange#exchange[data-market-v2-mounted] .mv274-extra-block h3{margin:0 0 8px;font-size:14px;overflow-wrap:anywhere}
html body #exchange#exchange[data-market-v2-mounted] .mv274-category-cards .mv2-card{min-height:100px}
@media(max-width:600px){html body #exchange#exchange[data-market-v2-mounted] .mv274-category-extra{grid-template-columns:minmax(0,1fr)}}
html body #exchange#exchange[data-market-v2-mounted] .mv2-surface{color:var(--mv74-text);gap:12px}
html body #exchange#exchange[data-market-v2-mounted] .mv2-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
html body #exchange#exchange[data-market-v2-mounted] .mv2-surface :is(.mv2-card,.mv2-pairs,.mv2-detail-rows,.mv2-history,.mv2-watch-dialog){background:var(--mv74-card)!important;border:1px solid var(--mv74-line)!important;color:var(--mv74-text)!important;box-shadow:none!important;border-radius:14px}
html body #exchange#exchange[data-market-v2-mounted] .mv2-surface :is(.mv2-card,.mv274-snapshot-row){position:relative;overflow:hidden}
html body #exchange#exchange[data-market-v2-mounted] .mv2-surface :is(.mv2-card,.mv274-snapshot-row)::after{content:"";position:absolute;bottom:0;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,var(--mv74-accent,#d9b56f),#ad94e8,transparent);pointer-events:none}
html body #exchange#exchange[data-market-v2-mounted] :is([data-mv2-category=currency],[data-kind=currency]){--mv74-accent:#58bd90}
html body #exchange#exchange[data-market-v2-mounted] :is([data-mv2-category=gold],[data-kind=gold]){--mv74-accent:#d8ae50}
html body #exchange#exchange[data-market-v2-mounted] :is([data-mv2-category=crypto],[data-kind=crypto]){--mv74-accent:#a98ce2}
html body #exchange#exchange[data-market-v2-mounted] :is([data-mv2-category=oil],[data-kind=oil]){--mv74-accent:#da8290}
html body #exchange#exchange[data-market-v2-mounted] .mv2-icon{color:var(--mv74-accent)}
html body #exchange#exchange[data-market-v2-mounted] .mv2-surface :is(.mv2-note,small){color:var(--mv74-muted)}
html body #exchange#exchange[data-market-v2-mounted] .mv2-surface :is(.mv2-row,.mv2-watch-open,.mv2-instrument-link,.mv2-back,.mv2-search,.mv2-watch-btn){background:transparent!important;color:var(--mv74-text)!important;border-color:var(--mv74-line)!important}
html body #exchange#exchange[data-market-v2-mounted] .mv274-snapshot-rows{display:grid;gap:9px;margin-top:12px}
html body #exchange#exchange[data-market-v2-mounted] .mv274-snapshot-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr) auto;align-items:center;gap:8px;text-align:start;padding:12px;border:1px solid var(--mv74-line);border-radius:12px;background:var(--mv74-card)!important;color:var(--mv74-text)!important;min-height:56px;width:100%;overflow-wrap:anywhere}
html body #exchange#exchange[data-market-v2-mounted] .mv274-snapshot-values{display:grid;gap:4px;text-align:end;color:var(--mv74-muted);font-size:12px;font-variant-numeric:tabular-nums}
@media(max-width:850px){html body #exchange#exchange[data-market-v2-mounted] .mv2-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:480px){html body #exchange#exchange[data-market-v2-mounted] .mv2-card{padding:10px;min-height:100px}html body #exchange#exchange[data-market-v2-mounted] .mv2-value{font-size:13px}html body #exchange#exchange[data-market-v2-mounted] .mv274-snapshot-row{padding:9px;gap:5px}html body #exchange#exchange[data-market-v2-mounted] .mv274-snapshot-row strong{font-size:13px}}
`;
style.textContent+=`
#exchange[data-market-v2-mounted] .mv275-ticker{min-width:0;overflow:hidden;border:1px solid var(--mv74-line);border-radius:12px;background:var(--mv74-card);padding:10px}
#exchange[data-market-v2-mounted] .mv275-ticker-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:var(--mv74-muted)}
#exchange[data-market-v2-mounted] .mv275-ticker-head button{font-size:11px;padding:4px 8px;border:1px solid var(--mv74-line);border-radius:6px;background:transparent;color:var(--mv74-text)}
#exchange[data-market-v2-mounted] .mv275-scroll{overflow:auto;scrollbar-width:thin;padding-top:8px}
#exchange[data-market-v2-mounted] .mv275-track{display:flex;width:max-content;animation:mv275-flow 45s linear infinite}
#exchange[data-market-v2-mounted] .mv275-ticker-group{display:flex;gap:12px;padding-right:12px}
#exchange[data-market-v2-mounted] .mv275-ticker-group span{white-space:nowrap;font-size:12px;font-variant-numeric:tabular-nums;border:1px solid var(--mv74-line);padding:8px;border-radius:8px}
#exchange[data-market-v2-mounted] .mv275-ticker:is([data-paused=true],:hover,:focus-within) .mv275-track{animation-play-state:paused}
@keyframes mv275-flow{to{transform:translateX(-50%)}}
@media(prefers-reduced-motion:reduce){#exchange[data-market-v2-mounted] .mv275-track{animation:none}}
html body #exchange#exchange[data-market-v2-mounted] .mv275-board-host{max-height:none;overflow:visible;padding:0;min-width:0}
#exchange[data-market-v2-mounted] .mv275-board{border-collapse:collapse;width:100%;table-layout:fixed;font-variant-numeric:tabular-nums}
#exchange[data-market-v2-mounted] .mv275-board caption{text-align:start;padding:12px;font-weight:700;font-size:16px}
#exchange[data-market-v2-mounted] .mv275-board :is(th,td){border-bottom:1px solid var(--mv74-line);padding:9px 5px;text-align:center;font-size:12px;overflow-wrap:anywhere}
#exchange[data-market-v2-mounted] .mv275-board thead th{color:var(--mv74-muted);font-size:11px}
#exchange[data-market-v2-mounted] .mv275-board th:first-child{width:49%;text-align:start}
#exchange[data-market-v2-mounted] .mv275-fx-name{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:5px;text-align:start}
#exchange[data-market-v2-mounted] .mv275-fx-name small{display:block;font-weight:400;font-size:10px}
#exchange[data-market-v2-mounted] .mv275-flag{font-size:18px}
#exchange[data-market-v2-mounted] .mv275-trend{padding:0;width:28px;height:28px;border-radius:7px;border:1px solid var(--mv74-line);background:transparent;color:var(--mv74-text)}
#exchange[data-market-v2-mounted] .mv275-board-host>.mv2-note{padding:8px 12px;margin:0}
#exchange[data-market-v2-mounted] .mv275-history-dialog{width:min(680px,calc(100vw - 24px));max-height:85dvh;overflow:auto;box-sizing:border-box;border:1px solid var(--mv74-line);border-radius:16px;padding:16px;background:var(--mv74-card);color:var(--mv74-text)}
#exchange[data-market-v2-mounted] .mv275-history-dialog::backdrop{background:rgba(0,0,0,.48)}
#exchange[data-market-v2-mounted] .mv275-history-dialog header{display:flex;justify-content:space-between;gap:10px;align-items:center}
#exchange[data-market-v2-mounted] .mv275-history-dialog h2{font-size:16px;margin:0}
#exchange[data-market-v2-mounted] .mv275-history-dialog header button{min-width:36px;min-height:36px;border:1px solid var(--mv74-line);border-radius:50%;background:transparent;color:inherit}
#exchange[data-market-v2-mounted] .mv275-empty-chart{min-height:132px;border:1px solid var(--mv74-line);border-radius:12px;display:grid;place-items:center;text-align:center;color:var(--mv74-muted);padding:10px}
#exchange[data-market-v2-mounted] .mv275-history-dialog table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}
#exchange[data-market-v2-mounted] .mv275-history-dialog :is(th,td){padding:9px 4px;border-bottom:1px solid var(--mv74-line);text-align:center}
`;
document.head.append(style);head.after(nav,converter,surface);page.dataset.marketV2Mounted='yes';
for(const event of ['mmhvault:market-updated','mmhvault:exchange-reference-updated','mmhvault:asia-rates-updated','mmhvault:page-visible','mmhvault:config-owner-changed','mmhvault:data-loaded','languagechange'])window.addEventListener(event,paint);
window.addEventListener('mmhvault-language-change',paint);window.addEventListener('mmhvault:config-owner-changed',closeFx);
window.addEventListener('storage',e=>{if(e.key===null||e.key===watchKey(watchOwner()))paint()});
new MutationObserver(paint).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
select(active);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();