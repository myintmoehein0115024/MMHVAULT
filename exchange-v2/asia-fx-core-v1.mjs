/**
 * MMHVAULT Exchange V2 / isolated QA core (NOT wired to app.html).
 * Manual-only converter math; NO HTTP, Supabase, browser storage or financial writes.
 * Currency metadata is a curated UX catalogue for Asian countries/territories,
 * not proof that a market API supports that currency or an exhaustive ISO export.
 * Recheck ISO 4217 changes before release.
 */
const RAW_CURRENCIES=[["USD","US Dollar","美元","🇺🇸","global"],["MMK","Myanmar Kyat","缅甸元","🇲🇲","southeast"],["THB","Thai Baht","泰铢","🇹🇭","southeast"],["CNY","Chinese Yuan (RMB)","人民币","🇨🇳","east"],["JPY","Japanese Yen","日元","🇯🇵","east"],["KRW","South Korean Won","韩元","🇰🇷","east"],["KPW","North Korean Won","朝鲜元","🇰🇵","east"],["HKD","Hong Kong Dollar","港币","🇭🇰","east"],["MOP","Macanese Pataca","澳门元","🇲🇴","east"],["TWD","New Taiwan Dollar","新台币","🇹🇼","east"],["MNT","Mongolian Tögrög","蒙古图格里克","🇲🇳","east"],["SGD","Singapore Dollar","新加坡元","🇸🇬","southeast"],["MYR","Malaysian Ringgit","马来西亚林吉特","🇲🇾","southeast"],["IDR","Indonesian Rupiah","印尼盾","🇮🇩","southeast"],["VND","Vietnamese Đồng","越南盾","🇻🇳","southeast"],["PHP","Philippine Peso","菲律宾比索","🇵🇭","southeast"],["KHR","Cambodian Riel","柬埔寨瑞尔","🇰🇭","southeast"],["LAK","Lao Kip","老挝基普","🇱🇦","southeast"],["BND","Brunei Dollar","文莱元","🇧🇳","southeast"],["INR","Indian Rupee","印度卢比","🇮🇳","south"],["PKR","Pakistani Rupee","巴基斯坦卢比","🇵🇰","south"],["BDT","Bangladeshi Taka","孟加拉塔卡","🇧🇩","south"],["NPR","Nepalese Rupee","尼泊尔卢比","🇳🇵","south"],["LKR","Sri Lankan Rupee","斯里兰卡卢比","🇱🇰","south"],["BTN","Bhutanese Ngultrum","不丹努尔特鲁姆","🇧🇹","south"],["MVR","Maldivian Rufiyaa","马尔代夫拉菲亚","🇲🇻","south"],["AFN","Afghan Afghani","阿富汗尼","🇦🇫","south"],["AED","UAE Dirham","阿联酋迪拉姆","🇦🇪","west"],["SAR","Saudi Riyal","沙特里亚尔","🇸🇦","west"],["QAR","Qatari Riyal","卡塔尔里亚尔","🇶🇦","west"],["KWD","Kuwaiti Dinar","科威特第纳尔","🇰🇼","west"],["BHD","Bahraini Dinar","巴林第纳尔","🇧🇭","west"],["OMR","Omani Rial","阿曼里亚尔","🇴🇲","west"],["JOD","Jordanian Dinar","约旦第纳尔","🇯🇴","west"],["ILS","Israeli New Shekel","以色列新谢克尔","🇮🇱","west"],["IQD","Iraqi Dinar","伊拉克第纳尔","🇮🇶","west"],["IRR","Iranian Rial","伊朗里亚尔","🇮🇷","west"],["YER","Yemeni Rial","也门里亚尔","🇾🇪","west"],["LBP","Lebanese Pound","黎巴嫩镑","🇱🇧","west"],["SYP","Syrian Pound","叙利亚镑","🇸🇾","west"],["TRY","Turkish Lira","土耳其里拉","🇹🇷","west"],["AMD","Armenian Dram","亚美尼亚德拉姆","🇦🇲","west"],["GEL","Georgian Lari","格鲁吉亚拉里","🇬🇪","west"],["AZN","Azerbaijani Manat","阿塞拜疆马纳特","🇦🇿","west"],["KZT","Kazakhstani Tenge","哈萨克斯坦坚戈","🇰🇿","central"],["KGS","Kyrgyzstani Som","吉尔吉斯斯坦索姆","🇰🇬","central"],["UZS","Uzbekistani Som","乌兹别克斯坦苏姆","🇺🇿","central"],["TJS","Tajikistani Somoni","塔吉克斯坦索莫尼","🇹🇯","central"],["TMT","Turkmenistan Manat","土库曼斯坦马纳特","🇹🇲","central"],["RUB","Russian Ruble","俄罗斯卢布","🇷🇺","north"],["EUR","Euro (Cyprus)","欧元（塞浦路斯）","🇨🇾","west"],["EGP","Egyptian Pound (Sinai)","埃及镑（西奈）","🇪🇬","west"],["AUD","Australian Dollar (Cocos/Christmas Islands)","澳元（圣诞岛/科科斯群岛）","🇦🇺","southeast"]];
export const ASIA_CURRENCIES_V1=Object.freeze(RAW_CURRENCIES.map(([code,en,zh,flag,region])=>Object.freeze({code,en,zh,flag,region})));
const CODES=new Set(ASIA_CURRENCIES_V1.map(x=>x.code));
export const SUPPORTED_CODES_V1=Object.freeze(ASIA_CURRENCIES_V1.map(x=>x.code));
const upper=x=>String(x??'').trim().toUpperCase();
const numeric=x=>{
  if(typeof x==='string'&&!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(x.trim()))return null;
  const n=Number(x);return Number.isFinite(n)&&n>0&&n<=1e12?n:null;
};
function requireCode(c){const code=upper(c);if(!CODES.has(code))throw Error('Unsupported currency code: '+code);return code;}
export function listAsiaCurrenciesV1({locale='zh',query='',region=''}={}){
  const q=String(query).trim().toLocaleLowerCase();
  const selected=String(region).toLowerCase();
  return ASIA_CURRENCIES_V1.filter(x=>(!selected||x.region===selected)&&
     (!q||[x.code,x.en,x.zh].some(v=>v.toLocaleLowerCase().includes(q))))
    .map(x=>({...x,label:locale==='zh'?x.zh:locale==='my'?x.code+' · '+x.en:x.en}));
}
// Unique canonical storage key avoids saving both A→B and reciprocal B→A.
export function canonicalPairV1({user_id,base_code,quote_code,rate,updated_at}){
  if(typeof user_id!=='string'||!user_id.trim())throw Error('Owner UID required');
  const from=requireCode(base_code),to=requireCode(quote_code),n=numeric(rate);
  if(from===to)throw Error('Same-currency pairs are identity, not savable');
  if(n===null)throw Error('Manual rate must be positive and finite');
  const forward=from<to,converted=forward?n:1/n;
  // The saved quote must be safe in BOTH directions, not just in its canonical direction.
  if(!Number.isFinite(converted)||converted<1e-12||converted>1e12||
     !Number.isFinite(1/converted)||(1/converted)>1e12)throw Error('Pair rate out of supported bidirectional range');
  const when=updated_at==null?null:Date.parse(updated_at);
  if(updated_at!=null&&!Number.isFinite(when))throw Error('Invalid source timestamp');
  return Object.freeze({user_id,base_code:forward?from:to,quote_code:forward?to:from,rate:converted,
    source:'manual',updated_at:when==null?null:new Date(when).toISOString()});
}
const legacyKey={MMK:'usd_mmk',THB:'usd_thb',CNY:'usd_cny'};
export function resolveCurrencyRateV1({user_id,from,to,manualPairs=[],legacyRates={},marketRates={}}){
  const a=requireCode(from),b=requireCode(to);
  if(a===b)return {available:true,rate:1,method:'identity',base:a,quote:b};
  const uid=String(user_id??'').trim();
  if(!uid)return {available:false,reason:'missing-owner',base:a,quote:b};
  // Legacy reference rates may only be consumed from a verified row belonging to this UID.
  // Do not infer ownership from the caller's chosen account or accept unscoped snapshots.
  const ownedLegacy=legacyRates&&legacyRates.user_id===uid?legacyRates:{};
  const pairs=new Map();const conflicts=new Set();
  for(const row of manualPairs){
    if(!row||row.user_id!==uid)continue;
    let item;try{item=canonicalPairV1(row);}catch{continue;}
    const k=item.base_code+'/'+item.quote_code;
    if(pairs.has(k))conflicts.add(k);else pairs.set(k,item);
  }
  const manual=(x,y)=>{
    const key=[x,y].sort().join('/');
    if(conflicts.has(key))return {conflict:true};
    const item=pairs.get(key);
    if(!item)return null;
    const rate=item.base_code===x?item.rate:1/item.rate;
    return Number.isFinite(rate)&&rate>0?{rate,source:'manual',updatedAt:item.updated_at}:null;
  };
  const direct=manual(a,b);
  if(direct?.conflict)return {available:false,reason:'duplicate-manual-pair',base:a,quote:b};
  if(direct)return {available:true,rate:direct.rate,method:'manual',base:a,quote:b,updatedAt:direct.updatedAt};
  const usdPer=code=>{
    if(code==='USD')return {rate:1,source:'identity'};
    const m=manual('USD',code);
    if(m?.conflict)return {conflict:true};
    if(m)return m;
    const k=legacyKey[code],v=k?numeric(ownedLegacy[k]):null;
    if(v)return {rate:v,source:ownedLegacy.fxSources?.[code]||'legacy'};
    const market=numeric(marketRates[code]);return market?{rate:market,source:'market'}:null;
  };
  const first=usdPer(a),second=usdPer(b);
  if(first?.conflict||second?.conflict)return {available:false,reason:'duplicate-anchor-pair',base:a,quote:b};
  if(!first||!second)return {available:false,reason:'missing-saved-rate',base:a,quote:b};
  const rate=second.rate/first.rate;
  if(!Number.isFinite(rate)||rate<=0)return {available:false,reason:'invalid-derived-rate',base:a,quote:b};
  return {available:true,rate,method:[first.source,second.source].includes('market')?'market-reference':first.source==='identity'||second.source==='identity'?'usd-reference':'usd-derived',
    sources:[first.source,second.source],base:a,quote:b};
}
export function formatCurrencyRateV1(rate,locale='en-US'){
  const n=Number(rate);
  if(!Number.isFinite(n)||n<0)return '—';
  if(n===0)return '0';
  // When fixed decimals would hide a nonzero quote, retain meaning using notation.
  if(n<1e-12)return n.toExponential(6);
  const digits=n<0.000001?12:n<0.01?9:n<1?6:4;
  return new Intl.NumberFormat(locale,{minimumFractionDigits:0,maximumFractionDigits:digits}).format(n);
}
