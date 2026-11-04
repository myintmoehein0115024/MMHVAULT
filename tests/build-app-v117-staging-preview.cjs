/* Build a LOCAL, no-deploy APP V11.7 Staging QA artifact from the exact
 * current branch's app.html. This does NOT change app.html or any source.
 * Never upload the built artifact to Production or GitHub Pages.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

const root=path.resolve(__dirname,'..');
const source=path.join(root,'app.html');
const out=path.join(root,'dist','app-v117-staging');
const PROD_HOST='vrypucmyrztxgiqhjspd.supabase.co';
const STAGING_HOST='ldivswlhtgmznzwhzsoi.supabase.co';
const PROD_KEY='sb_publishable_H38v4XbO0ARnSJToD42wGg_27-SZ3Ao';
const key=process.env.MMH_V117_STAGING_PUBLISHABLE_KEY;
if(!key||!/^sb_publishable_[A-Za-z0-9_-]{12,}$/.test(key)||key===PROD_KEY)
  throw new Error('Dedicated Auth-Staging publishable key required; never use Production key.');
const original=fs.readFileSync(source,'utf8');
const count=(x,v)=>x.split(v).length-1;
assert.equal(count(original,PROD_HOST),3,'Production origin must appear exactly three times; inspect new sources if changed.');
assert.equal(count(original,PROD_KEY),1,'Unexpected Production key references.');
assert.equal(count(original,'<script type="module" src="js/mmhvault-v11-manage-hierarchy-live.mjs?v=0.7.0"></script>'),1,
  'V11.7 hierarchy runtime absent or changed.');
assert.equal(count(original,'js/mmhvault-transaction-field-layout-v11.js'),0,
  'Old V11/PR #85 manager must not compete with V11.7 hierarchy.');
if(fs.existsSync(out))fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});

let html=original.replaceAll(PROD_HOST,STAGING_HOST).replace(PROD_KEY,key);
// Enforce staging ONLY, even if incidental old code tries another endpoint.
const csp=[
"default-src 'self'","base-uri 'self'","form-action 'self'",
"script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
"style-src 'self' 'unsafe-inline'","connect-src https://"+STAGING_HOST,
"img-src 'self' data: blob: https://"+STAGING_HOST,
"font-src 'self' data:","object-src 'none'","frame-src 'none'",
"worker-src 'none'","manifest-src 'none'"
].join('; ');
const safety='<meta http-equiv="Content-Security-Policy" content="'+csp+'">'+
'<meta name="robots" content="noindex,nofollow,noarchive">'+
'<meta name="mmhvault-staging-qa" content="ldivswlhtgmznzwhzsoi">';
assert.equal(count(html,'</head>'),1,'Cannot safely insert QA CSP');
html=html.replace('</head>',safety+'</head>');
html=html.replace(/<link\b[^>]*rel=["']manifest["'][^>]*>\s*/gi,'');
html=html.replace(/<link\b[^>]*rel=["']apple-touch-icon["'][^>]*>\s*/gi,'');
const banner='<div id="mmh-v117-staging-banner" role="status" '+
'style="position:fixed;z-index:2147483646;right:12px;top:9px;'+
'padding:6px 11px;background:#12253f;color:#ffdfaa;border:1px solid #9b7b43;'+
'font:600 11px system-ui;border-radius:999px;pointer-events:none">'+
'APP V11.7 · STAGING ONLY · NO PRODUCTION</div>';
if(!html.includes('<body'))throw new Error('Body unavailable');
html=html.replace(/(<body[^>]*>)/i,'$1'+banner);
html=html.replace('<title>MMHVAULT · Personal Finance &amp; Wealth Management</title>',
'<title>MMHVAULT APP V11.7 — STAGING ONLY</title>');
assert.ok(html.includes('connect-src https://'+STAGING_HOST));
assert.ok(!html.includes(PROD_HOST)&&!html.includes(PROD_KEY));

// The app uses many external JS/CSS modules. Keep branch asset copies local,
// never combine another PR's different modules or source revisions.
for(const dir of ['js','css','images','fonts']){
 const from=path.join(root,dir);
 if(fs.existsSync(from)&&fs.statSync(from).isDirectory())fs.cpSync(from,path.join(out,dir),{recursive:true});
}
const modules=html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["']([^"']+)["'][^>]*>/gi);
for(const match of modules){
 const url=match[1];
 if(/^(https?:|data:|\/\/|#|\/)/.test(url))continue;
 const relative=url.split('?')[0],resolved=path.join(out,relative);
 assert.ok(resolved.startsWith(out+path.sep),'Asset path escapes package: '+url);
 assert.ok(fs.existsSync(resolved),'Referenced resource missing from QA package: '+url);
}
fs.writeFileSync(path.join(out,'app.html'),html);
fs.writeFileSync(path.join(out,'README-STAGING-QA.txt'),[
'MMHVAULT APP V11.7 — LOCAL, AUTH-STAGING-ONLY QA',
'This zip is NEVER deployed to production and includes NO production URLs or keys.',
'Use ONLY your dedicated v117qa A/B Staging accounts; no N10 or real finance data.',
'On macOS: in Terminal cd to this extracted directory and run:',
'    python3 -m http.server 8769 --bind 127.0.0.1',
'Then open http://127.0.0.1:8769/app.html',
'The built-in Content Security Policy permits outbound connections ONLY',
'to https://'+STAGING_HOST+'. A production or other API request is blocked.',
'Local service workers, embedded frames and other origins are blocked.',
'If login/incomplete features fail due to these restrictions, report it;',
'DO NOT loosen the Staging-only connection policy or enter real account data.',
'The full APP Staging browser tests and physical device checks remain separate',
'from the already passing standalone A/B JWT REST verification.',
'',
].join('\n'));
console.log(JSON.stringify({destination:out,stagingEndpoint:'https://'+STAGING_HOST,
  bytes:html.length,originReplacements:3,assetsChecked:true,productionRefCount:count(html,PROD_HOST)}));
