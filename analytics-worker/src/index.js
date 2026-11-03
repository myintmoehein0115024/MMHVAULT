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
function isConfigured(env){return Boolean(env.CF_ANALYTICS_TOKEN&&env.SUPABASE_ANON_KEY&&env.CF_ACCOUNT_ID&&env.CF_SITE_TAG&&env.SUPABASE_URL&&env.ALLOWED_ORIGIN)}
async function verifyAdmin(token,env){
  const headers={apikey:env.SUPABASE_ANON_KEY,authorization:'Bearer '+token};
  // Verify the JWT against the Auth service before invoking the admin RPC.
  // This prevents anonymous or expired tokens from reaching the analytics query.
  const identity=await fetch(new URL('/auth/v1/user',env.SUPABASE_URL),{
    method:'GET',headers,redirect:'error'
  });
  if(!identity.ok)return {status:401};
  const user=await identity.json();
  if(!user||typeof user.id!=='string'||!user.id)return {status:401};
  const result=await fetch(new URL('/rest/v1/rpc/mmh_is_admin',env.SUPABASE_URL),{
    method:'POST',headers:{...headers,'content-type':'application/json'},body:'{}',redirect:'error'
  });
  if(result.status===401)return {status:401};
  if(!result.ok)return {status:403};
  return {status:(await result.json())===true?200:403};
}
async function queryAnalytics(range,env){
  const now = new Date();
  const start = new Date(now.getTime() - RANGE_DAYS[range] * 86400000);
  const query = `query WebsiteAnalytics($accountTag: string!, $siteTag: string!, $start: Time!, $end: Time!) {
    viewer {
      accounts(filter: {accountTag: $accountTag}) {
        rumPageloadEventsAdaptiveGroups(
          limit: 100
          orderBy: [date_ASC]
          filter: {siteTag: $siteTag, datetime_geq: $start, datetime_leq: $end}
        ) {
          count
          dimensions { date }
          sum { visits }
        }
      }
    }
  }`;
  const result = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method:'POST',
    headers:{Authorization:'Bearer '+env.CF_ANALYTICS_TOKEN,'content-type':'application/json'},
    body:JSON.stringify({query,variables:{
      accountTag:env.CF_ACCOUNT_ID,siteTag:env.CF_SITE_TAG,
      start:start.toISOString(),end:now.toISOString()
    }}),
    redirect:'error'
  });
  if(!result.ok)throw new Error('CF_HTTP_ERROR');
  const body=await result.json();
  if(body.errors?.length)throw new Error('CF_GRAPHQL_ERROR');
  const accounts=body.data?.viewer?.accounts;
  if(!Array.isArray(accounts)||accounts.length!==1)throw new Error('CF_ACCOUNT_MISMATCH');
  const groups=accounts[0].rumPageloadEventsAdaptiveGroups;
  if(!Array.isArray(groups)||groups.length>RANGE_DAYS[range]+1)throw new Error('CF_GROUPS_INVALID');
  const trend=[];
  let pageViews=0,visits=0;
  for(const group of groups){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(group.dimensions?.date||'')||
       !Number.isSafeInteger(group.count)||group.count<0||
       !Number.isSafeInteger(group.sum?.visits)||group.sum.visits<0)throw new Error('CF_METRICS_INVALID');
    pageViews+=group.count;visits+=group.sum.visits;
    trend.push({date:group.dimensions.date,visits:group.sum.visits});
  }
  if(!Number.isSafeInteger(pageViews)||!Number.isSafeInteger(visits))throw new Error('CF_METRICS_OVERFLOW');
  return {pageViews,visits,uniqueVisitors:null,trend,updatedAt:now.toISOString()};
}
export default {async fetch(request,env){
  const origin=request.headers.get('Origin');
  const allowed=env.ALLOWED_ORIGIN||'';
  const cors=origin===allowed?origin:null;
  if(origin&&origin!==allowed)return response(403,{error:'origin_not_allowed'});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':cors||'null','access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'Authorization, Accept','access-control-max-age':'600','vary':'Origin'}});
  const url=new URL(request.url);
  if(request.method!=='GET'||url.pathname!=='/api/admin/website-analytics')return response(404,{error:'not_found'},cors);
  const range=url.searchParams.get('range')||'7d';
  if(!Object.hasOwn(RANGE_DAYS,range))return response(400,{error:'invalid_range'},cors);
  if(!isConfigured(env))return response(503,{error:'analytics_not_configured'},cors);
  const header=request.headers.get('Authorization')||'';
  if(!/^Bearer [A-Za-z0-9._~-]+$/.test(header))return response(401,{error:'authentication_required'},cors);
  try{
    const verified=await verifyAdmin(header.slice(7),env);
    if(verified.status!==200)return response(verified.status,{error:verified.status===401?'authentication_required':'forbidden'},cors);
    const data=await queryAnalytics(range,env);
    return response(200,{source:'cloudflare-web-analytics',verified:true,...data},cors);
  }catch{return response(503,{error:'analytics_unavailable'},cors)}
}};
