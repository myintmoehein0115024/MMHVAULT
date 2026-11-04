/**
 * MMHVAULT Website Analytics V2 — isolated Cloudflare Worker.
 * Deploy ONLY after independent security review and configured Worker secrets.
 *
 * Required secrets: CF_ANALYTICS_TOKEN, SUPABASE_ANON_KEY
 * Required vars: CF_ACCOUNT_ID, CF_SITE_TAG, SUPABASE_URL, ALLOWED_ORIGIN
 * No secrets are committed. Default is fail-closed.
 */
const JSON_HEADERS = {'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const response = (status, data, origin) => new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...(origin?{'access-control-allow-origin':origin,'vary':'Origin'}:{})}});
const RANGE_DAYS = {'24h':1,'7d':7,'30d':30};
// All five field names are verified against the connected Cloudflare GraphQL
// AccountRumPageloadEventsAdaptiveGroupsDimensions schema (2026-11-04).
const BREAKDOWN_FIELDS = Object.freeze({
  countries:'countryName',pages:'requestPath',referrers:'refererHost',
  browsers:'userAgentBrowser',devices:'deviceType'
});
const BREAKDOWN_LIMIT=50, BREAKDOWN_TOP=10;
// Only deterministic diagnostic codes are emitted. Never log GraphQL messages, request bodies, tokens or user data.
function classifyGraphQLError(errors){
  for(const item of errors){
    const message=typeof item?.message==='string'?item.message:'';
    const extension=typeof item?.extensions?.code==='string'?item.extensions.code:'';
    const info=(message+' '+extension).toLowerCase();
    if(/(?:unauthenticated|authentication|invalid.{0,25}token|token.{0,25}(?:invalid|expired)|expired.{0,25}token)/.test(info))return 'CF_GRAPHQL_AUTH_ERROR';
    if(/(?:not authorized|unauthorized|permission|forbidden|access denied|not permitted|insufficient scope|insufficient privileges)/.test(info))return 'CF_GRAPHQL_ACCESS_DENIED';
    if(/(?:cannot query field|unknown argument|unknown type|unknown field|validation error|variable .{0,60} got invalid)/.test(info))return 'CF_GRAPHQL_SCHEMA_ERROR';
    if(/(?:rate.?limit|too many requests|query limit|maximum query|quota exceeded)/.test(info))return 'CF_GRAPHQL_LIMIT_ERROR';
  }
  return 'CF_GRAPHQL_UNCLASSIFIED';
}
function isConfigured(env){return Boolean(env.CF_ANALYTICS_TOKEN&&env.SUPABASE_ANON_KEY&&env.CF_ACCOUNT_ID&&env.CF_SITE_TAG&&env.SUPABASE_URL&&env.ALLOWED_ORIGIN)}
async function verifyAdmin(token,env,diagnostic){
  const headers={apikey:env.SUPABASE_ANON_KEY,authorization:'Bearer '+token};
  // Verify the JWT against the Auth service before invoking the admin RPC.
  // This prevents anonymous or expired tokens from reaching the analytics query.
  // Workers supports redirect:'manual', not 'error'; 3xx is rejected by !identity.ok.
  diagnostic.phase='AUTH_USER_FETCH';
  const identity=await fetch(new URL('/auth/v1/user',env.SUPABASE_URL),{
    method:'GET',headers,redirect:'manual'
  });
  if(!identity.ok)return {status:401};
  diagnostic.phase='AUTH_USER_JSON';
  const user=await identity.json();
  if(!user||typeof user.id!=='string'||!user.id)return {status:401};
  diagnostic.phase='AUTH_RPC_FETCH';
  const result=await fetch(new URL('/rest/v1/rpc/mmh_is_admin',env.SUPABASE_URL),{
    method:'POST',headers:{...headers,'content-type':'application/json'},body:'{}',redirect:'manual'
  });
  if(result.status===401)return {status:401};
  if(!result.ok)return {status:403};
  diagnostic.phase='AUTH_RPC_JSON';
  return {status:(await result.json())===true?200:403};
}
async function queryAnalytics(range,env,diagnostic){
  diagnostic.phase='CF_START';
  const now = new Date();
  const start = new Date(now.getTime() - RANGE_DAYS[range] * 86400000);
  // A rolling 24h interval must be hourly; daily buckets cannot show hour-by-hour activity.
  const hourly = range === '24h';
  const dimension = hourly ? 'datetimeHour' : 'date';
  const query = `query WebsiteAnalytics($accountTag: string!, $siteTag: string!, $start: Time!, $end: Time!) {
    viewer {
      accounts(filter: {accountTag: $accountTag}) {
        rumPageloadEventsAdaptiveGroups(
          limit: 100
          orderBy: [${hourly ? 'datetimeHour_ASC' : 'date_ASC'}]
          filter: {siteTag: $siteTag, requestHost: "mmhvault.com", bot: 0, datetime_geq: $start, datetime_leq: $end}
        ) {
          count
          dimensions { ${dimension} }
          sum { visits }
        }
      }
    }
  }`;
  diagnostic.phase='CF_FETCH';
  const result = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method:'POST',
    headers:{Authorization:'Bearer '+env.CF_ANALYTICS_TOKEN,'content-type':'application/json'},
    body:JSON.stringify({query,variables:{
      accountTag:env.CF_ACCOUNT_ID,siteTag:env.CF_SITE_TAG,
      start:start.toISOString(),end:now.toISOString()
    }}),
    redirect:'manual'
  });
  diagnostic.phase='CF_RESPONSE_STATUS';
  if(!result.ok)throw new Error('CF_HTTP_ERROR');
  diagnostic.phase='CF_RESPONSE_JSON';
  const body=await result.json();
  diagnostic.phase='CF_VALIDATION';
  if(Array.isArray(body.errors)&&body.errors.length)throw new Error(classifyGraphQLError(body.errors));
  const accounts=body.data?.viewer?.accounts;
  if(!Array.isArray(accounts)||accounts.length!==1)throw new Error('CF_ACCOUNT_MISMATCH');
  const groups=accounts[0].rumPageloadEventsAdaptiveGroups;
  if(!Array.isArray(groups)||groups.length>(hourly?25:RANGE_DAYS[range]+1))throw new Error('CF_GROUPS_INVALID');
  const seenDates=new Set();
  const trend=[];
  let pageViews=0,visits=0;
  for(const group of groups){
    if(!Number.isSafeInteger(group.count)||group.count<0||
       !Number.isSafeInteger(group.sum?.visits)||group.sum.visits<0)throw new Error('CF_METRICS_INVALID');
    const bucket=group.dimensions?.[dimension];
    if(typeof bucket!=='string'||seenDates.has(bucket))throw new Error('CF_DATE_INVALID');
    if(hourly){
      if(!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):00:00Z$/.test(bucket))throw new Error('CF_DATE_INVALID');
      const ms=Date.parse(bucket);
      const firstHour=Math.floor(start.getTime()/3600000)*3600000;
      if(!Number.isFinite(ms)||new Date(ms).toISOString().replace('.000Z','Z')!==bucket||
         ms<firstHour||ms>now.getTime())throw new Error('CF_DATE_INVALID');
    }else{
      if(!/^\d{4}-\d{2}-\d{2}$/.test(bucket))throw new Error('CF_DATE_INVALID');
      const day=Date.parse(bucket+'T00:00:00Z');
      if(!Number.isFinite(day)||new Date(day).toISOString().slice(0,10)!==bucket||
         day<Date.UTC(start.getUTCFullYear(),start.getUTCMonth(),start.getUTCDate())||
         day>Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()))throw new Error('CF_DATE_INVALID');
    }
    seenDates.add(bucket);
    pageViews+=group.count;visits+=group.sum.visits;
    trend.push({date:bucket,visits:group.sum.visits,pageViews:group.count});
  }
  if(!Number.isSafeInteger(pageViews)||!Number.isSafeInteger(visits))throw new Error('CF_METRICS_OVERFLOW');
  trend.sort((a,b)=>a.date.localeCompare(b.date));
  // RUM adaptive groups exposes pageviews and visit entries, but no validated
  // exact cross-period deduplicated visitor metric. Never derive one from visits.
  return {pageViews,visits,uniqueVisitors:null,granularity:hourly?'hour':'day',trend,updatedAt:now.toISOString()};
}

function displayCategory(category,value){
  if(value===null||value===undefined||value==='')return category==='referrers'?'Direct / unknown':'Unknown';
  if(typeof value!=='string')throw new Error('CF_BREAKDOWN_INVALID');
  const clean=value.trim();
  if(!clean||clean.length>256||/[\x00-\x1f\x7f]/.test(clean))
    return category==='pages'?'Other / hidden paths':'Unknown';
  if(category==='pages'){
    // User-specific token paths and query strings must never reach the UI.
    if(!clean.startsWith('/')||clean.length>120||/[?#]/.test(clean)||
       /(?:auth|reset|recovery|callback|invite|token|secret|session|password)/i.test(clean)||
       /\/[a-f0-9]{20,}(?:\/|$)/i.test(clean)||/\/\d{12,}(?:\/|$)/.test(clean))
      return 'Other / hidden paths';
    return clean;
  }
  if(category==='referrers')return /^[a-z0-9.-]{1,150}$/i.test(clean)?clean:'Unknown';
  if(category==='countries')return /^[A-Z]{2}$/.test(clean)?clean:'Unknown';
  return /^[\p{L}\p{N} _+.-]{1,80}$/u.test(clean)?clean:'Unknown';
}
async function queryBreakdowns(range,env,diagnostic){
  diagnostic.phase='CF_START';
  const now=new Date(),start=new Date(now.getTime()-RANGE_DAYS[range]*86400000);
  // Same strict site, hostname, bot, and rolling-window filter as V2.
  const groupSelection=Object.entries(BREAKDOWN_FIELDS).map(([alias,dimension])=>
    alias+':rumPageloadEventsAdaptiveGroups('+
    'limit:'+BREAKDOWN_LIMIT+',orderBy:[count_DESC],'+
    'filter:{siteTag:$siteTag,requestHost:"mmhvault.com",bot:0,datetime_geq:$start,datetime_leq:$end})'+
    '{count dimensions{'+dimension+'} sum{visits}}'
  ).join(' ');
  const query='query AnalyticsBreakdowns($accountTag:string!,$siteTag:string!,$start:Time!,$end:Time!)'+
    '{viewer{accounts(filter:{accountTag:$accountTag}){'+groupSelection+'}}}';
  diagnostic.phase='CF_FETCH';
  const upstream=await fetch('https://api.cloudflare.com/client/v4/graphql',{
    method:'POST',headers:{Authorization:'Bearer '+env.CF_ANALYTICS_TOKEN,'content-type':'application/json'},
    body:JSON.stringify({query,variables:{accountTag:env.CF_ACCOUNT_ID,siteTag:env.CF_SITE_TAG,
      start:start.toISOString(),end:now.toISOString()}}),redirect:'manual'
  });
  diagnostic.phase='CF_RESPONSE_STATUS';
  if(!upstream.ok)throw new Error('CF_HTTP_ERROR');
  diagnostic.phase='CF_RESPONSE_JSON';
  const body=await upstream.json();
  diagnostic.phase='CF_VALIDATION';
  if(Array.isArray(body.errors)&&body.errors.length)throw new Error(classifyGraphQLError(body.errors));
  const accounts=body.data?.viewer?.accounts;
  if(!Array.isArray(accounts)||accounts.length!==1)throw new Error('CF_ACCOUNT_MISMATCH');
  const categories={};
  for(const [alias,dimension] of Object.entries(BREAKDOWN_FIELDS)){
    const raw=accounts[0][alias];
    if(!Array.isArray(raw)||raw.length>BREAKDOWN_LIMIT)throw new Error('CF_BREAKDOWN_INVALID');
    const names=new Set(),merged=new Map();
    for(const group of raw){
      if(!Number.isSafeInteger(group?.count)||group.count<0||
         !Number.isSafeInteger(group?.sum?.visits)||group.sum.visits<0)
        throw new Error('CF_BREAKDOWN_INVALID');
      const original=group?.dimensions?.[dimension];
      if(original!==null&&original!==undefined&&typeof original!=='string')
        throw new Error('CF_BREAKDOWN_INVALID');
      const key=String(original??'');
      if(names.has(key))throw new Error('CF_BREAKDOWN_INVALID');
      names.add(key);
      const label=displayCategory(alias,original);
      const prior=merged.get(label)||{label,pageViews:0,visits:0};
      prior.pageViews+=group.count;prior.visits+=group.sum.visits;
      if(!Number.isSafeInteger(prior.pageViews)||!Number.isSafeInteger(prior.visits))
        throw new Error('CF_METRICS_OVERFLOW');
      merged.set(label,prior);
    }
    const rows=[...merged.values()].sort((a,b)=>
      b.pageViews-a.pageViews||a.label.localeCompare(b.label)).slice(0,BREAKDOWN_TOP);
    categories[alias]={rows,moreMayExist:raw.length>=BREAKDOWN_LIMIT};
  }
  return {source:'cloudflare-web-analytics',verified:true,range,
    groupMetric:'pageViews',limit:BREAKDOWN_TOP,uniqueVisitors:null,
    updatedAt:now.toISOString(),categories};
}

export default {async fetch(request,env){
  const origin=request.headers.get('Origin');
  const allowed=env.ALLOWED_ORIGIN||'';
  const cors=origin===allowed?origin:null;
  if(origin&&origin!==allowed)return response(403,{error:'origin_not_allowed'});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':cors||'null','access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'Authorization, Accept','access-control-max-age':'600','vary':'Origin'}});
  const url=new URL(request.url);
  const isBreakdown=url.pathname==='/api/admin/website-analytics-breakdowns';
  if(request.method!=='GET'||(!isBreakdown&&url.pathname!=='/api/admin/website-analytics'))
    return response(404,{error:'not_found'},cors);
  const range=url.searchParams.get('range')||'7d';
  if(!Object.hasOwn(RANGE_DAYS,range))return response(400,{error:'invalid_range'},cors);
  if(!isConfigured(env))return response(503,{error:'analytics_not_configured'},cors);
  const header=request.headers.get('Authorization')||'';
  if(!/^Bearer [A-Za-z0-9._~-]+$/.test(header))return response(401,{error:'authentication_required'},cors);
  const diagnostic={phase:'AUTH_START'};
  try{
    const verified=await verifyAdmin(header.slice(7),env,diagnostic);
    if(verified.status!==200)return response(verified.status,{error:verified.status===401?'authentication_required':'forbidden'},cors);
    const data=isBreakdown?await queryBreakdowns(range,env,diagnostic):
      await queryAnalytics(range,env,diagnostic);
    diagnostic.phase='RESPONSE_BUILD';
    return response(200,isBreakdown?data:
      {source:'cloudflare-web-analytics',verified:true,...data},cors);
  }catch(error){
    // Diagnostic allowlist: never log credentials, request headers, user IDs or upstream bodies.
    const safeCodes=new Set(['CF_HTTP_ERROR','CF_GRAPHQL_AUTH_ERROR','CF_GRAPHQL_ACCESS_DENIED','CF_GRAPHQL_SCHEMA_ERROR','CF_GRAPHQL_LIMIT_ERROR','CF_GRAPHQL_UNCLASSIFIED','CF_ACCOUNT_MISMATCH','CF_GROUPS_INVALID','CF_METRICS_INVALID','CF_DATE_INVALID','CF_METRICS_OVERFLOW','CF_BREAKDOWN_INVALID']);
    const code=safeCodes.has(error?.message)?error.message:'ANALYTICS_UNEXPECTED_ERROR';
    const phases=new Set(['AUTH_START','AUTH_USER_FETCH','AUTH_USER_JSON','AUTH_RPC_FETCH','AUTH_RPC_JSON','CF_START','CF_FETCH','CF_RESPONSE_STATUS','CF_RESPONSE_JSON','CF_VALIDATION','RESPONSE_BUILD']);
    const phase=phases.has(diagnostic.phase)?diagnostic.phase:'UNKNOWN';
    console.error('MMH_ANALYTICS_V2_FAILURE', {code,phase});
    return response(503,{error:'analytics_unavailable'},cors);
  }
}};
