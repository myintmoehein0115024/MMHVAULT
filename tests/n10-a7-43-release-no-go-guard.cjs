/* N10-A7.43 — non-release guard for a deliberately CLOSED candidate.
 * Passing these invariants means NO PRODUCTION RELEASE IS ENABLED.
 * It is not a substitute for real Auth, Turnstile and RLS verification.
 */
'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const front=read('js/mmhvault-n10-a7-40-username.js');
const binding=read('js/mmhvault-n10-a7-41-bind.js');
const login=read('login.html');
const edge=read('review/N10-A7.40-PRODUCTION-EDGE-CANDIDATE-NEVER-DEPLOY.ts');
const migration=read('review/N10-A7.40-PRODUCTION-DB-CANDIDATE-NEVER-RUN.sql');
const readonly=read('review/N10-A7.43-PRODUCTION-PREFLIGHT-READONLY.sql');
const app=fs.readFileSync('app.html');
const blobSha=(b)=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const checks={
  app_byte_identical_to_production:()=>assert.equal(blobSha(app),'4abf71a70ad3c1f3388de2418e219ab13ba2d330'),
  username_client_gate_closed:()=>assert.match(front,/const ENABLED=false;/),
  binding_client_gate_closed:()=>assert.match(binding,/const ENABLED=false;/),
  username_no_turnstile_site_key:()=>assert.match(front,/const TURNSTILE_SITE_KEY='';/),
  binding_no_turnstile_site_key:()=>assert.match(binding,/const SITE_KEY='';/),
  edge_gate_closed:()=>assert.match(edge,/const CODE_GATE_OPEN = false;/),
  edge_utc_window_expired:()=>{
    assert.match(edge,/const WINDOW_START_UTC = '1970-01-01T00:00:00\.000Z';/);
    assert.match(edge,/const WINDOW_END_UTC = '1970-01-01T00:00:00\.000Z';/);
  },
  edge_production_feature_flag_extra_gate:()=>assert.match(edge,/N10A740_PRODUCTION_ENABLED/),
  backend_migration_never_deployed_from_review:()=>{
    assert.match(migration,/NEVER RUN WITHOUT SEPARATE APPROVAL/);
    assert.match(edge,/SOURCE REVIEW ONLY, NEVER DEPLOY/);
    assert.match(migration,/LANGUAGE plpgsql SECURITY INVOKER/);
  },
  isolated_file_paths:()=>{
    assert.equal(fs.existsSync('supabase/functions/mmh-n10-a740-username/index.ts'),false);
    assert.equal(fs.existsSync('functions/mmh-n10-a740-username/index.ts'),false);
  },
  protected_existing_login_flows:()=>{
    assert.match(login,/db\.auth\.signInWithPassword\(\{email,password\}\)/);
    assert.match(login,/db\.auth\.signInWithOAuth\(\{/);
    assert.match(login,/PASSWORD_RECOVERY/);
    assert.match(login,/db\.auth\.signUp\(\{/);
  },
  no_staging_project_in_frontends:()=>{
    for(const s of [front,binding,login])assert.doesNotMatch(s,/ldivswlhtgmznzwhzsoi/);
  },
  catalog_sql_only_reads:()=>{
    const commands=readonly
      .split('\n').filter(line=>!line.trimStart().startsWith('--')).join('\n')
      .split(';').map(s=>s.trim()).filter(Boolean);
    assert.equal(commands.length,4);
    for(const sql of commands){
      assert.match(sql,/^SELECT\b/i);
      // Ignore SQL string literals (e.g. policy metadata p.cmd='UPDATE').
      const withoutLiterals=sql.replace(/'(?:''|[^'])*'/g,"''");
      assert.doesNotMatch(withoutLiterals,/\b(?:CREATE|ALTER|DROP|TRUNCATE|DELETE|UPDATE|INSERT|GRANT|REVOKE|DO|CALL|EXECUTE|COPY)\b/i);
    }
  }
};
for(const [name,fn] of Object.entries(checks)){fn();console.log('PASS '+name);}
console.log('NO-GO: '+Object.keys(checks).length+' release safeguards intact. Automated PASS means production username feature remains CLOSED.');
