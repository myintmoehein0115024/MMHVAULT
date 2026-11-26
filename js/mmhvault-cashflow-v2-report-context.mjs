/* V2.0.9: pure verified boundary and report context; no network or writes. */
import {bounds,budgetStatus,goalStatus,validPlan} from './mmhvault-cashflow-v2-planning.mjs';
import {previousRange} from './mmhvault-cashflow-v2-periods.mjs';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const filtered=s=>['accounts','categories','originalCurrencies'].some(k=>s[k]?.length);
export function verifiedBoundaries({rows,owner,scope,today,rate}){
 if(!Array.isArray(rows)||!owner||!scope||filtered(scope)||!date(scope.start)||!date(scope.end)||!date(today)||scope.start>scope.end||scope.end>today||!finite(rate)||rate<=0)return {};
 const prev=new Date(Date.parse(scope.start+'T00:00:00Z')-86400000).toISOString().slice(0,10);
 const lookup=d=>{if(d>=today)return null;const matches=rows.filter(r=>r?.owner===owner&&r.verified===true&&r.basis==='period-boundary-net-assets-usd'&&r.boundary==='end-of-day'&&r.date===d);if(!matches.length||matches.some(r=>!finite(r.usd)||r.usd!==matches[0].usd)||!finite(matches[0].usd*rate))return null;return matches[0].usd*rate};
 return {opening:lookup(prev),closing:lookup(scope.end)};
}
export function reportContext({scope,today,plan,actual,prior,currentAssets,healthInputs}){
 if(!scope||!date(today)||!date(scope.start)||!date(scope.end)||scope.start>scope.end||scope.end>today)return null;
 const global=!filtered(scope), context={asOf:today,global,priorRange:previousRange(scope),prior:prior?.complete===true?prior.totals:null,budgets:null,goals:null,recurring:null,liveAssets:global&&finite(currentAssets)?currentAssets:null,wealth:null};
 if(!global)return context;
 if(healthInputs&&finite(healthInputs.liquid)&&healthInputs.liquid>=0&&finite(healthInputs.invested)&&healthInputs.invested>=0)context.wealth={liquid:healthInputs.liquid,invested:healthInputs.invested};
 if(!validPlan(plan)||typeof actual!=='function')return context;
 context.budgets=plan.budgets.filter(b=>{const r=bounds(b.period,b.key);return r.start>=scope.start&&r.start<=scope.end&&(r.end<=scope.end||scope.end===today&&r.end>=today)}).map(b=>({...b,...budgetStatus(b,actual(b.period,b.key,b.currency))}));
 context.goals=plan.goals.map(g=>{const savings=['savingsRate','monthlySavings','annualSavings'].includes(g.kind);const period=g.kind==='annualSavings'?'year':'month',key=g.kind==='savingsRate'?today.slice(0,7):g.key;return {...g,...goalStatus(g,savings?actual(period,key,g.kind==='savingsRate'?scope.currency:g.currency):null)}});
 context.recurring=plan.recurring.map(r=>({id:r.id,name:r.name,amount:r.amount,currency:r.currency,paused:r.paused,nextDue:r.legacyDue&&date(r.legacyDue)?r.legacyDue:null,frequency:r.frequency}));
 return context;
}
