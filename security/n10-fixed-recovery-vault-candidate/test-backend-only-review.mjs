// Offline-only Vault backend review contracts. Deliberately not a live
// authorization, secret, Auth, Vault, SQL migration or production test.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {createHmac} from 'node:crypto';
const backend=readFileSync('security/n10-fixed-recovery-vault-candidate/index.ts','utf8');
const sql=readFileSync('docs/sql/n10_fixed_recovery_vault_STAGING_CANDIDATE.sql','utf8');
const preflight=readFileSync('docs/sql/n10_fixed_recovery_READ_ONLY_PREFLIGHT.sql','utf8');
const installedAudit=readFileSync('docs/sql/n10_installed_staging_vault_READ_ONLY_AUDIT_20261101.sql','utf8');
const assurance=readFileSync('security/n10-fixed-recovery-vault-candidate/mfa-assurance.mjs','utf8');
const qaRlsAudit=readFileSync('docs/sql/n10_staging_qa_rls_READ_ONLY_ASSERTIONS_20261101.sql','utf8');
const qaDmlRevoke=readFileSync('docs/sql/n10_staging_qa_excess_dml_REVOKE_REVIEW_ONLY.sql','utf8');
const v2Upgrade=readFileSync('docs/sql/n10_staging_session_guard_V2_UPGRADE_REVIEW_ONLY.sql','utf8');
const tests=[
 ['Vault release is hard OFF and pinned to the existing project',()=>{
  assert.match(backend,/const RECOVERY_RELEASE_ENABLED=false;/);
  assert.match(backend,/const EXPECTED_BASE='https:\/\/vrypucmyrztxgiqhjspd\.supabase\.co';/);
  assert.match(backend,/if\(!RECOVERY_RELEASE_ENABLED\)return out\(origin,'recovery_service_not_released',503\)/);
  assert.match(backend,/BASE!==EXPECTED_BASE/);
 }],
 ['runtime hard-off rejects requests without touching Auth or Vault',async()=>{
  // Execute the REAL disabled Edge source in a local VM with all imports
  // replaced by deny-on-use mocks. This does NOT connect or deploy anything.
  let handler=null,clients=0,blockedCalls=0;
  const deny=()=>{blockedCalls++;throw Error('Unexpected Auth, SQL, Vault or network access')};
  const source=backend.replace(/^import[^\n]*\n/gm,'');
  assert.doesNotMatch(source,/^\s*import\s/m,'unresolved Edge import');
  const javascript=stripTypeScriptTypes(source,{mode:'strip'});
  const mocked={
   Deno:{env:{get:()=>''},serve:fn=>{assert.equal(handler,null);handler=fn;}},
   createClient:(url)=>{
    clients++;
    assert.equal(url,'https://invalid.supabase.co');
    return new Proxy({}, {get:deny});
   },
   evaluateVerifiedAuthUserMfa:deny,
   sessionIdFromVerifiedJwt:deny,
   normalizePhrase:deny,equal64:deny,readBoundedJson:deny,
   fetch:deny,Response,TextEncoder,Uint8Array,crypto:globalThis.crypto
  };
  runInNewContext(javascript,mocked,{timeout:3000});
  assert.equal(typeof handler,'function','disabled server handler not registered');
  assert.equal(clients,1,'only inert initial client construction expected');
  const check=async(origin,method,status,code)=>{
   const headers=new Headers(origin===null?{}:{Origin:origin});
   const response=await handler({method,headers});
   assert.equal(response.status,status);
   assert.match(response.headers.get('Cache-Control')||'',/no-store/);
   assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
   if(status===204)assert.equal(await response.text(),'');
   else assert.equal((await response.json()).code,code);
  };
  await check('https://mmhvault.com','POST',503,'recovery_service_not_released');
  await check('https://mmhvault.com','GET',405,'method_denied');
  await check('https://mmhvault.com','OPTIONS',204,null);
  await check('http://mmhvault.com','POST',403,'origin_denied');
  await check('https://mmhvault.com.evil.example','POST',403,'origin_denied');
  await check(null,'POST',403,'origin_denied');
  assert.equal(blockedCalls,0,'disabled Edge must never use secrets, Auth or network');
 }],
 ['no unauthenticated backup, original word access or passwordless reveal',()=>{
  const steps=["const authenticated=await verifiedUser(req);","const firstSessionCheck=await liveSession(user.id,sessionId,sessionAal);",
   "const quotaStatus=await quota(user.id);","if(!await provePassword(user,body.password))",
   "const secondSessionCheck=await liveSession(user.id,sessionId,sessionAal);",
   "const refreshedAssurance=await verifiedUser(req);",
   "const stored=await admin.rpc('mmh_n10_recovery_backup_get'"];
  let index=-1;
  for(const step of steps){const next=backend.indexOf(step,index+1);assert.ok(next>index,'missing or reordered: '+step);index=next}
  assert.match(backend,/const finalAssurance=await verifiedUser\(req\)/);
  assert.match(backend,/const finalSessionCheck=await liveSession\(user\.id,sessionId,sessionAal\)/);
 }],
 ['existing phrase verifier is required and revalidated before escrow',()=>{
  const blocks=["const records=await admin.from('mmh_n10a769_recovery_phrases')",
   "if(!equal64(records.data[0].verifier,mac))",
   "const backupAssurance=await verifiedUser(req);",
   "const backupSessionCheck=await liveSession(user.id,sessionId,sessionAal);",
   "const saved=await admin.rpc('mmh_n10_recovery_backup_put'"];
  let index=-1;
  for(const step of blocks){const next=backend.indexOf(step,index+1);assert.ok(next>index,step);index=next}
 }],
 ['SQL migration is non-running and keeps Vault owner and RLS restrictions',()=>{
  assert.match(sql,/STAGING CANDIDATE, NOT PRODUCTION AUTHORIZED/);
  assert.match(sql,/NOT AUTHORIZED TO RUN/);
  assert.match(sql,/REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/cleanup_recovery_vault_secret/);
  assert.match(sql,/DELETE FROM vault\.secrets WHERE id=OLD\.secret_id/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.mmh_n10_recovery_backup_get\(uuid\) TO service_role/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.mmh_n10_recovery_backup_get\(uuid\) FROM PUBLIC,anon,authenticated/);
  assert.doesNotMatch(sql,/DROP SCHEMA.*CASCADE/i);
 }],
 ['live synthetic owner separation, logout and MFA mid-reveal (offline VM only)',async()=>{
  // No live QA, SQL, accounts, endpoints, tokens or actual secrets.
  // The TEST-ONLY string substitution enables the copied handler in a VM;
  // the actual candidate file remains hard-OFF and is never deployed.
  assert.match(backend,/const RECOVERY_RELEASE_ENABLED=false;/);
  const testSource=backend.replace(
    'const RECOVERY_RELEASE_ENABLED=false;',
    'const RECOVERY_RELEASE_ENABLED=true; // VM-ONLY; NEVER DEPLOY'
  ).replace(/^import[^\n]*\n/gm,'');
  const js=stripTypeScriptTypes(testSource,{mode:'strip'});
  const base='https://vrypucmyrztxgiqhjspd.supabase.co';
  const key='SYNTHETIC-ONLY-KEY-123456789012345678901';
  const phrase='alpha bravo charlie delta echo foxtrot golf hotel india juliet';
  const originals=new Map([['A',phrase],['B','another example phrase only for fixture']]);
  const stored=new Map(),revoked=new Set(),verifiedMfa=new Set();
  let onReveal=null,handler=null,saveCalls=0;
  const identity=id=>({id,email:'u-'+id+'@invalid.test',
    is_anonymous:false,app_metadata:{mmhvault_auth_kind:'username_only'}});
  const admin={
   auth:{
    getUser:async token=>({data:{user:/^mock-[AB]$/.test(token)
      ?identity(token.slice(-1)):null},error:null}),
    admin:{mfa:{listFactors:async({userId})=>({data:{factors:
      verifiedMfa.has(userId)?[{id:'factor',status:'verified'}]:[]},error:null})}}
   },
   rpc:async(name,args)=>{
    if(name==='mmh_n10_recovery_session_active')
      return {data:!revoked.has(args.p_user_id)&&
        args.p_session_id==='session-'+args.p_user_id,error:null};
    if(name==='mmh_n10_recovery_take_attempt')return {data:true,error:null};
    if(name==='mmh_n10_recovery_backup_exists')
      return {data:stored.has(args.p_user_id),error:null};
    if(name==='mmh_n10_recovery_backup_put'){
      saveCalls++;
      const before=stored.get(args.p_user_id);
      if(before&&before!==args.p_phrase)return {error:{message:'immutable'}};
      stored.set(args.p_user_id,args.p_phrase);return {data:true,error:null};
    }
    if(name==='mmh_n10_recovery_backup_get'){
      if(onReveal)await onReveal();
      return {data:stored.get(args.p_user_id)||null,error:null};
    }
    throw Error('unknown synthetic rpc '+name);
   },
   from:table=>{
    assert.equal(table,'mmh_n10a769_recovery_phrases');
    return {select:()=>({eq:(_field,id)=>({limit:async()=>{
      const raw=originals.get(id);
      const verifier=createHmac('sha256',key)
        .update('mmh-a769-prod:phrase:'+id+':'+raw).digest('hex');
      return {data:[{verifier,version:1}],error:null};
    }})})};
   }
  };
  const passwordClient={auth:{
    signInWithPassword:async({email,password})=>{
      const id=/^u-([AB])@invalid\.test$/.exec(email)?.[1];
      if(!id||password!=='correct-password')return {data:{},error:{message:'bad'}};
      return {data:{user:identity(id),session:{access_token:'pwd-'+id}},error:null};
    },
    getUser:async token=>({data:{user:/^pwd-[AB]$/.test(token)
      ?identity(token.slice(-1)):null},error:null}),
    signOut:async()=>({error:null})
  }};
  const createClient=(url,credential)=>{
    assert.equal(url,base);
    if(credential==='S'.repeat(24))return admin;
    if(credential==='A'.repeat(24))return passwordClient;
    throw Error('Unexpected client credentials in synthetic test');
  };
  const ctx={
   Deno:{env:{get:name=>({
     SUPABASE_URL:base,SUPABASE_SERVICE_ROLE_KEY:'S'.repeat(24),
     SUPABASE_ANON_KEY:'A'.repeat(24),N10A740_RATE_HMAC_KEY:key
   }[name]||'')},serve:fn=>{handler=fn}},
   createClient,Response,TextEncoder,Uint8Array,crypto:globalThis.crypto,
   evaluateVerifiedAuthUserMfa:(_token,user)=>user.factors.some(f=>f.status==='verified')
     ?'required':'allowed',
   sessionIdFromVerifiedJwt:(token,id)=>token==='mock-'+id?'session-'+id:null,
   normalizePhrase:raw=>typeof raw==='string'&&raw.split(' ').length===10?raw:null,
   equal64:(a,b)=>a===b,
   readBoundedJson:async req=>req.json(),
   fetch:()=>{throw Error('External fetch forbidden in synthetic test')}
  };
  runInNewContext(js,ctx,{timeout:3000});
  assert.equal(typeof handler,'function');
  const send=async(id,action,other={})=>{
   const req=new Request('https://local.invalid/',{
    method:'POST',headers:{Origin:'https://mmhvault.com',
      Authorization:'Bearer mock-'+id,'Content-Type':'application/json'},
    body:JSON.stringify({action,...other})
   });
   const response=await handler(req);
   return {status:response.status,body:await response.json()};
  };
  assert.deepEqual((await send('A','status')).body,{code:'backup_status',backed_up:false});
  assert.deepEqual((await send('B','status')).body,{code:'backup_status',backed_up:false});
  const invalid=await send('A','backup_existing',{password:'wrong-password',phrase});
  assert.equal(invalid.status,401);assert.equal(stored.size,0);
  const good=await send('A','backup_existing',{password:'correct-password',phrase});
  assert.equal(good.status,200);assert.equal(good.body.code,'backup_ready');
  assert.equal(stored.get('A'),phrase);
  const repeated=await send('A','backup_existing',{password:'correct-password',phrase});
  assert.equal(repeated.status,200);assert.equal(stored.size,1);
  assert.equal(saveCalls,2);
  assert.equal((await send('B','status',{user_id:'A'})).body.backed_up,false);
  const blocked=await send('B','reveal',{password:'correct-password',user_id:'A'});
  assert.equal(blocked.status,409);assert.equal(blocked.body.code,'backup_not_ready');
  assert.equal(JSON.stringify(blocked.body).includes('alpha bravo'),false);
  const shown=await send('A','reveal',{password:'correct-password'});
  assert.equal(shown.status,200);
  assert.deepEqual(shown.body.words,phrase.split(' '));
  assert.equal(shown.body.expires_in_seconds,45);
  onReveal=async()=>revoked.add('A');
  const afterLogout=await send('A','reveal',{password:'correct-password'});
  assert.equal(afterLogout.status,401);
  assert.equal(JSON.stringify(afterLogout.body).includes('words'),false);
  revoked.clear();
  onReveal=async()=>verifiedMfa.add('A');
  const afterMfa=await send('A','reveal',{password:'correct-password'});
  assert.equal(afterMfa.status,403);
  assert.equal(JSON.stringify(afterMfa.body).includes('words'),false);
 }],\n ['original phrase is immutable even with repeated backup requests',()=>{
  // These are source-level SQL assertions. They DO NOT execute a migration.
  const body=sql.split('CREATE FUNCTION public.mmh_n10_recovery_backup_put(')[1]?.split('CREATE FUNCTION public.mmh_n10_recovery_backup_exists(')[0];
  assert.ok(body,'missing owner-only backup RPC');
  const ordered=(terms)=>{
   let previous=-1;
   for(const term of terms){
    const pos=body.indexOf(term,previous+1);
    assert.ok(pos>previous,'out-of-order immutable owner guard: '+term);
    previous=pos;
   }
  };
  ordered([
   'IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=p_user_id)',
   'pg_catalog.pg_advisory_xact_lock',
   'WHERE user_id=p_user_id FOR UPDATE',
   'IF v_secret_id IS NOT NULL THEN',
   'FROM vault.decrypted_secrets WHERE id=v_secret_id',
   'IF v_existing IS DISTINCT FROM p_phrase THEN',
   "RAISE EXCEPTION 'Original key is immutable'",
   'RETURN true;',
   'v_secret_id := vault.create_secret(p_phrase',
   'INSERT INTO mmh_n10_privacy.recovery_backup_index(user_id,secret_id)',
   'VALUES (p_user_id,v_secret_id)'
  ]);
  assert.doesNotMatch(body,/ON CONFLICT\s+DO\s+UPDATE/i);
  assert.doesNotMatch(body,/UPDATE\s+vault\.secrets/i);
  assert.doesNotMatch(body,/vault\.create_secret\s*\(\s*NULL/i);
  assert.match(sql,/user_id uuid PRIMARY KEY REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
  assert.match(sql,/secret_id uuid NOT NULL UNIQUE/);
 }],
 ['account deletion targets only the linked Vault secret',()=>{
  const trigger=sql.split('CREATE FUNCTION mmh_n10_privacy.cleanup_recovery_vault_secret()')[1]?.split('CREATE FUNCTION public.mmh_n10_recovery_backup_put(')[0];
  assert.ok(trigger,'missing private deletion trigger');
  assert.match(trigger,/DELETE FROM vault\.secrets WHERE id=OLD\.secret_id;/);
  assert.match(trigger,/RETURN OLD;/);
  assert.match(trigger,/CREATE TRIGGER mmh_n10_recovery_secret_gc AFTER DELETE ON mmh_n10_privacy\.recovery_backup_index/);
  assert.match(trigger,/FOR EACH ROW EXECUTE FUNCTION mmh_n10_privacy\.cleanup_recovery_vault_secret/);
  assert.doesNotMatch(trigger,/DELETE FROM vault\.secrets\s*;/);
  assert.doesNotMatch(trigger,/TRUNCATE|DROP TABLE|DROP SCHEMA/i);
  const metadataTable=sql.split('CREATE TABLE mmh_n10_privacy.recovery_backup_index(')[1]?.split('CREATE TABLE mmh_n10_privacy.recovery_rate_bucket(')[0];
  assert.match(metadataTable,/ENABLE ROW LEVEL SECURITY/);
  assert.match(metadataTable,/REVOKE ALL ON mmh_n10_privacy\.recovery_backup_index FROM PUBLIC,anon,authenticated,service_role/);
 }],
 ['every owner-targeted Vault operation derives its owner from a signed user',()=>{
  assert.match(backend,/const authenticated=await verifiedUser\(req\);/);
  assert.match(backend,/if\(authenticated.state!=='ok'\)return out\(origin,'mfa_unavailable',503\)/);
  for(const endpoint of ['mmh_n10_recovery_backup_exists','mmh_n10_recovery_backup_put','mmh_n10_recovery_backup_get']){
   assert.match(backend,new RegExp("admin\\.rpc\\('"+endpoint+"'\\s*,\\s*\\{p_user_id:user\\.id(?:,|\\})"));
  }
  assert.match(backend,/\.eq\('user_id',user\.id\)\.limit\(2\)/);
  assert.match(backend,/hmac\('phrase:'\+user\.id\+':'\+phrase\)/);
  assert.doesNotMatch(backend,/p_user_id:\s*(?:body\.|req\.|payload\.|headers\.)/);
  assert.doesNotMatch(backend,/p_user_id:\s*(?:body\[|req\[|payload\[)/);
  const backups=backend.split("if(action==='backup_existing'){")[1]?.split('// Nothing is revealed without')[0];
  assert.ok(backups);
  assert.match(backups,/const backupAssurance=await verifiedUser\(req\)/);
  assert.match(backups,/const backupSessionCheck=await liveSession\(user\.id,sessionId,sessionAal\)/);
  assert.match(backups,/if\(backupSessionCheck!=='active'\)return out\(origin,'session_expired',401\)/);
 }],
 ['SQL function bodies use valid balanced dollar quoting, session V2 matches upgrade contract',()=>{
  const firstInstallFunctions=(sql.match(/^CREATE FUNCTION /gm)||[]).length;
  const bodyOpeners=(sql.match(/\bAS\s+\$\$/g)||[]).length;
  const bodyClosers=(sql.match(/\$\$;/g)||[]).length;
  assert.ok(firstInstallFunctions>=6,'missing SQL function definitions');
  assert.equal(bodyOpeners,firstInstallFunctions,'missing dollar-quoted CREATE FUNCTION body');
  assert.equal(bodyClosers,firstInstallFunctions,'unbalanced SQL function body quotes');
  assert.doesNotMatch(sql,/\bAS\s+\$(?!\$)/,'broken single-dollar function opener');
  assert.doesNotMatch(sql,/^\$;$/m,'broken single-dollar function closer');
  assert.match(sql,/p_user_id uuid,p_session_id uuid,p_expected_aal text\)\s+RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS \$\$/);
  assert.match(v2Upgrade,/p_user_id uuid,p_session_id uuid,p_expected_aal text\)\s+RETURNS boolean\s+LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS \$\$/);
  for(const stmt of ["s.id=p_session_id","s.user_id=p_user_id","s.aal::text='aal1'","s.aal::text='aal2'","f.id=s.factor_id","f.user_id=p_user_id","f.status::text='verified'"]){
    assert.ok(sql.includes(stmt),'first install missing '+stmt);
    assert.ok(v2Upgrade.includes(stmt),'V2 upgrade missing '+stmt);
  }
  assert.match(sql,/vault\.create_secret\(p_phrase,[\s\S]*?NULL::uuid\)/);
 }],
 ['preflight is read-only, not an authorization to apply SQL',()=>{
  assert.match(preflight,/READ-ONLY PREFLIGHT/);
  assert.match(preflight,/WITH flags AS \(/);
  assert.doesNotMatch(preflight,/^\s*(?:CREATE|ALTER|INSERT|UPDATE|DELETE|DROP|GRANT|REVOKE)\s/mi);
 }],
 ['JWT assurance must be explicitly present; no implicit AAL1 fallback',()=>{
  assert.match(assurance,/const current = payload\.aal;/);
  assert.doesNotMatch(assurance,/payload\.aal\s*==\s*null\s*\?\s*['"]aal1['"]/);
  assert.match(assurance,/currentLevel !== "aal1" && currentLevel !== "aal2"/);
 }],
 ['installed Staging Vault audit checks orphan metadata, trigger and retention without writes',()=>{
  assert.match(installedAudit,/INSTALLED Auth-Staging privacy\/Vault metadata audit/);
  assert.match(installedAudit,/currently_unlinked_n10_secret_rows/);
  assert.match(installedAudit,/vault_delete_trigger_enabled/);
  assert.match(installedAudit,/owner_delete_cascades/);
  assert.match(installedAudit,/daily_rate_cleanup_job_enabled/);
  assert.match(installedAudit,/no_authenticated_secret_rpc_access/);
  assert.match(installedAudit,/no_authenticated_decrypted_view_select/);
  assert.match(installedAudit,/no_anon_decrypted_view_select/);
  assert.match(installedAudit,/no_authenticated_vault_schema_access/);
  assert.match(installedAudit,/no_anon_vault_schema_access/);
  // Metadata-only privilege checks must never read plaintext from the view.
  assert.doesNotMatch(installedAudit,/\b(?:FROM|JOIN)\s+vault\.decrypted_secrets\b/i);
  const executableSql=installedAudit.replace(/^\s*--[^\n]*$/gm,'');
  assert.doesNotMatch(executableSql,/^\s*(?:CREATE|ALTER|INSERT|UPDATE|DELETE|DROP|GRANT|REVOKE|TRUNCATE|CALL|DO)\b/gmi);
 }],
 ['SQL + Edge require current factor bound to exact session and AAL',()=>{
  assert.match(sql,/p_user_id uuid,p_session_id uuid,p_expected_aal text/);
  assert.match(sql,/s\.aal::text='aal2'/);
  assert.match(sql,/s\.factor_id IS NOT NULL/);
  assert.match(sql,/f\.id=s\.factor_id/);
  assert.match(sql,/f\.user_id=p_user_id/);
  assert.match(sql,/f\.status::text='verified'/);
  assert.match(sql,/p_expected_aal='aal1'/);
  assert.match(sql,/NOT EXISTS \(/);
  assert.match(sql,/s\.factor_id IS NULL/);
  assert.match(backend,/p_expected_aal:expectedAal/);
  assert.match(backend,/const sessionAal=authenticated\.sessionAal/);
  assert.equal((backend.match(/await liveSession\(user\.id,sessionId,sessionAal\)/g)||[]).length,4);
  assert.doesNotMatch(backend,/await liveSession\(user\.id,sessionId\)/);
  assert.match(preflight,/legacy_session_guard_present/);
  assert.match(preflight,/mmh_n10_recovery_session_active\(uuid,uuid,text\)/);
  assert.match(preflight,/mmh_n10_recovery_session_active\(uuid,uuid\)/);
 }],
 ['rate-bucket counter saturates without integer overflow (candidate only)',()=>{
  assert.match(sql,/attempts=CASE WHEN bucket\.reset_at<=now\(\) THEN 1\s+ELSE LEAST\(bucket\.attempts,p_limit\)\+1 END/);
  assert.doesNotMatch(sql,/ELSE bucket\.attempts\+1 END/);
  for(const limit of [1,5,10]){
   for(const attempts of [0,1,limit,limit+1,2_147_483_647]){
    const next=Math.min(attempts,limit)+1;
    assert.ok(next>=1 && next<=limit+1 && Number.isSafeInteger(next));
    if(attempts>=limit) assert.equal(next,limit+1);
   }
  }
 }],
 ['production-only username marker is not automatically expanded to staging test identities',()=>{
  assert.match(backend,/user\.app_metadata\?\.mmhvault_auth_kind!=='username_only'/);
  assert.doesNotMatch(backend,/user\.app_metadata\?\.mmhvault_auth_kind\s*\?\?/);
  assert.doesNotMatch(backend,/username_only_staging/);
  assert.match(backend,/BASE!==EXPECTED_BASE/);
  assert.match(backend,/const RECOVERY_RELEASE_ENABLED=false;/);
 }],
 ['Staging QA policies must compose owner permissive AND MFA restrictive',()=>{
  assert.match(qaRlsAudit,/polname='mmh_n10_qa_owner_select'/);
  assert.match(qaRlsAudit,/polname='mmh_n10_qa_mfa_select'/);
  assert.match(qaRlsAudit,/AND polpermissive/);
  assert.match(qaRlsAudit,/AND NOT polpermissive/);
  assert.match(qaRlsAudit,/exactly_two_select_policies/);
  assert.match(qaRlsAudit,/mfa_guard_validates_uid_and_factors/);
  assert.match(qaRlsAudit,/no_authenticated_qa_privileged_rpc/);
  assert.match(qaRlsAudit,/all_checks_pass/);
  const executableSql=qaRlsAudit.replace(/^\s*--[^\n]*$/gm,'');
  assert.doesNotMatch(executableSql,/^\s*(?:CREATE|ALTER|INSERT|UPDATE|DELETE|DROP|GRANT|REVOKE|TRUNCATE|CALL|DO)\b/gmi);
  assert.doesNotMatch(executableSql,/vault\.decrypted_secrets|FROM\s+auth\.users\b/i);
 }],
 ['optional Staging DML hardening proposal only revokes excess authenticated writes',()=>{
  assert.match(qaDmlRevoke,/REVIEW ONLY \/ DO NOT RUN/);
  assert.match(qaDmlRevoke,/ldivswlhtgmznzwhzsoi/);
  assert.match(qaDmlRevoke,/REVOKE INSERT, UPDATE, DELETE ON TABLE public\.mmh_n10_signed_qa_entries\s+FROM authenticated;/);
  assert.match(qaDmlRevoke,/NOT p\.polpermissive/);
  assert.match(qaDmlRevoke,/p\.polpermissive/);
  const executableSql=qaDmlRevoke.replace(/^\s*--[^\n]*$/gm,'');
  assert.doesNotMatch(executableSql,/^\s*(?:DROP|ALTER|INSERT|UPDATE|DELETE|TRUNCATE|GRANT)\b/gmi);
  assert.doesNotMatch(executableSql,/FROM\s+(?:service_role|anon)\s*;/i);
  assert.doesNotMatch(executableSql,/vault\.secrets|auth\.users|RECOVERY_RELEASE_ENABLED/i);
 }],
 ['candidate excludes previously denied QA activation and production UI changes',()=>{
  assert.doesNotMatch(backend,/QA_RELEASED|QA_WINDOW_END_UTC|QA_IDENTITIES/);
  assert.doesNotMatch(backend,/N10_FIXED_VAULT_UI_RELEASED/);
 }]
];
let fail=0;
for(const [name,run] of tests){try{await run();console.log('PASS',name)}catch(err){fail++;console.error('FAIL',name,err.message)}}
console.log((tests.length-fail)+'/'+tests.length+' backend-only offline review contracts');
if(fail)process.exitCode=1;
