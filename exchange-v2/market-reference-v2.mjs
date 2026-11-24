// Read-only effective FX: explicit personal USD anchors > verified market > previous owner accounting reference.
import {canonicalPairV1} from './asia-fx-core-v1.mjs';
const KEYS={MMK:'usd_mmk',THB:'usd_thb',CNY:'usd_cny'};
const positive=x=>{const n=Number(x);return Number.isFinite(n)&&n>0&&n<1e15?n:null};
export function effectiveCoreRates({uid,legacy,pairs=[],market={}}){
 if(!uid)return null;
 const raw=legacy?.user_id===uid?legacy:{};
 const out={...raw,user_id:uid},sources={USD:'identity'},usdRates={USD:1};
 const codes=new Set([...Object.keys(KEYS),...Object.keys(market),...pairs.filter(r=>r?.user_id===uid&&(r.base_code==='USD'||r.quote_code==='USD')).map(r=>r.base_code==='USD'?r.quote_code:r.base_code)]);
 codes.delete('USD');
 for(const code of codes){
   const key=KEYS[code];
   let manual=null;
   for(const row of pairs){if(row?.user_id!==uid)continue;try{
     const p=canonicalPairV1(row);
     if(p.base_code==='USD'&&p.quote_code===code)manual=p.rate;
     else if(p.quote_code==='USD'&&p.base_code===code)manual=1/p.rate;
   }catch(_){}}
   const m=positive(manual),live=positive(market[code]),old=key?positive(raw[key]):null;
   const value=m??live??old??0;usdRates[code]=value;if(key)out[key]=value;sources[code]=m?'manual':live?'market':old?'legacy':'unavailable';
 }
 return {...out,fxSources:sources,fxUsdRates:usdRates};
}
export function publicMarketRates(data,now=Date.now()){
 const updated=Number(data?.time_last_update_unix)*1000,next=Number(data?.time_next_update_unix)*1000;
 if(data?.result!=='success'||data.base_code!=='USD'||data.rates?.USD!==1||!Number.isFinite(updated)||!Number.isFinite(next)||updated<=0||updated>now+60000||next<=now||next<updated||now-updated>48*3600000)return {};
 const rates={};for(const [code,value] of Object.entries(data.rates)){if(code!=='MMK'&&positive(value))rates[code]=Number(value)}return rates;
}
export function validatedCashRate(q,now=Date.now()){
 if(q?.available!==true||q.source!=='setlive-mm-cash-market'||q.pair!=='USD/MMK'||q.market!=='USD/MMK cash'||q.side!=='cash-usd-buy'||q.valuation!=='cash-market-reference-not-usdt'||q.sourceValidated!==true||q.stale!==false)return null;
 const at=Date.parse(q.updatedAt),reviewed=Date.parse(q.reviewedAt),expiry=Date.parse(q.expiresAt);
 if(![at,reviewed,expiry].every(Number.isFinite)||at<=0||reviewed<=0||at>reviewed+60000||reviewed>now||expiry!==Math.min(reviewed+86400000,at+36*3600000)||expiry<=now)return null;
 const valid=p=>typeof p==='number'&&Number.isFinite(p)&&p>=1000&&p<=20000;
 return valid(q.rate)&&valid(q.buy)&&valid(q.sell)&&q.rate===q.buy&&q.buy<=q.sell?q.rate:null;
}
const MEMBER_CASH_ENDPOINT='https://mmhvault-mmk-quota-isolated-qa.myintmoehein0115024.workers.dev/api/mmk-usd-quote';
export function createMarketReader({allowPublic=false,allowCash=false,fixtureRates=null,getSession=async()=>null,onChange=()=>{}}={}){
 let cash=null,lastAttempt=0,busy=false;
 const getRates=()=>{if(fixtureRates&&!allowPublic&&!allowCash)return {...fixtureRates};let rates={};if(allowPublic)try{rates=publicMarketRates(JSON.parse(localStorage.getItem('mmhvault-public-asia-fx-v10')||'null'))}catch(_){}const rate=validatedCashRate(cash);if(rate)rates.MMK=rate;return rates};
 async function refresh(){
   if(!allowCash||busy||document.hidden||navigator.onLine===false||Date.now()-lastAttempt<3600000)return;
   if(validatedCashRate(cash))return;
   busy=true;
   let timeout;
   try{
     if(location.origin!=='https://mmhvault.com')return;
     const session=await getSession();
     const token=session?.access_token;
     if(typeof token!=='string'||!token||session?.user?.is_anonymous===true||Number(session?.expires_at)*1000<=Date.now())return;
     lastAttempt=Date.now();
     const ctrl=new AbortController();timeout=setTimeout(()=>ctrl.abort(),10000);
     const response=await fetch(MEMBER_CASH_ENDPOINT,{method:'GET',headers:{Authorization:'Bearer '+token},credentials:'omit',redirect:'error',cache:'no-store',signal:ctrl.signal});
     if(!response.ok)return;const next=await response.json();if(validatedCashRate(next))cash=next;
   }catch(_){}finally{if(timeout!==undefined)clearTimeout(timeout);busy=false;onChange()}
 }
 return {allowPublic,getRates,getRate:code=>getRates()[code]||null,refresh};
}
