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
  const url = new URL('/rest/v1/rpc/mmh_is_admin',env.SUPABASE_URL);
  const result = await fetch(url,{method:'POST',headers:{apikey:env.SUPABASE_ANON_KEY,authorization:'Bearer '+token,'content-type':'application/json'},body:'{}',redirect:'error'});
  if(result.status===401)return {status:401};
  if(!result.ok)return {status:403};
  return {status:(await result.json())===true?200:403};
}
async function queryAnalytics(range,env){
  // Cloudflare GraphQL dataset/fields MUST be validated with a real read-only token
  // before this function is enabled. Do not silently substitute HTTP request analytics.
  throw new Error('WEB_ANALYTICS_GRAPHQL_NOT_VERIFIED');
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
