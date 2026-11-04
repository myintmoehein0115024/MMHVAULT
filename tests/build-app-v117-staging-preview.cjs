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
const out=process.env.MMH_V117_STAGING_OUTPUT_DIR?
  path.resolve(process.env.MMH_V117_STAGING_OUTPUT_DIR):
  path.join(root,'dist','app-v117-staging');
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
"style-src 'self' 'unsafe-inline'",
// Only login/session lookup and the FIVE approved empty Staging finance tables are callable.
// The three new investment/wallet boot tables are AUTHENTICATED SELECT-ONLY.
// N10 Edge Functions, MFA/recovery, storage changes, other business APIs and
// production origins are out of scope and must be network-blocked.
"connect-src https://"+STAGING_HOST+"/auth/v1/token"+
  " https://"+STAGING_HOST+"/auth/v1/user"+
  " https://"+STAGING_HOST+"/auth/v1/logout"+
  " https://"+STAGING_HOST+"/rest/v1/transactions"+
  " https://"+STAGING_HOST+"/rest/v1/personal_configuration"+
  " https://"+STAGING_HOST+"/rest/v1/investments"+
  " https://"+STAGING_HOST+"/rest/v1/custom_investments"+
  " https://"+STAGING_HOST+"/rest/v1/crypto_wallet_movements",
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
// Bundled APP extensions may themselves contain absolute production API
// constants (N10 utilities, older login helpers, etc.). Rewrite those in
// the COPY ONLY, never in Git-tracked source or Production. The CSP is a
// second independent guard against requests to any unapproved host.
let sanitizedAssets=0;
function sanitizeCopiedAssets(dir){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory()){sanitizeCopiedAssets(file);continue;}
  if(!/\.(?:js|mjs|html|css|json|txt|webmanifest)$/i.test(entry.name))continue;
  const input=fs.readFileSync(file,'utf8');
  const clean=input.replaceAll(PROD_HOST,STAGING_HOST).replaceAll(PROD_KEY,key);
  if(clean!==input){fs.writeFileSync(file,clean);sanitizedAssets++;}
  assert.ok(!clean.includes(PROD_HOST)&&!clean.includes(PROD_KEY),
    'QA package contains a Production endpoint: '+file);
 }
}
sanitizeCopiedAssets(out);
const modules=html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["']([^"']+)["'][^>]*>/gi);
for(const match of modules){
 const url=match[1];
 if(/^(https?:|data:|\/\/|#|\/)/.test(url))continue;
 const relative=url.split('?')[0],resolved=path.join(out,relative);
 assert.ok(resolved.startsWith(out+path.sep),'Asset path escapes package: '+url);
 assert.ok(fs.existsSync(resolved),'Referenced resource missing from QA package: '+url);
}
fs.writeFileSync(path.join(out,'app.html'),html);
// app.html sends signed-out users to login.html. Omitting that file from
// Pages led to a Pages fallback -> app.html -> signed-out redirect loop,
// observed as an empty navy screen flashing on desktop browser.
// Ship an isolated QA-only login which shares Supabase SDK's native session
// storage key with app.html; never copy Production's N10 login page.
const qaLoginTemplate=fs.readFileSync(path.join(root,'tests','app-v117-staging-login.html'),'utf8');
const qaKeyTag='__AUTH_STAGING_PUBLISHABLE_KEY__';
assert.equal(count(qaLoginTemplate,qaKeyTag),1,'Staging login must contain one public-key placeholder');
assert.ok(qaLoginTemplate.includes(STAGING_HOST),'Login must be tied to the verified Auth-Staging project');
assert.ok(!qaLoginTemplate.includes(PROD_HOST)&&!qaLoginTemplate.includes(PROD_KEY),
  'Never allow Production host/key into Staging login');
assert.ok(!/\/functions\/v1\/|signUp\s*\(|resetPasswordForEmail\s*\(/i.test(qaLoginTemplate),
  'Staging login cannot activate N10, signup, password reset or unrelated API');
const qaLogin=qaLoginTemplate.replace(qaKeyTag,key);
fs.writeFileSync(path.join(out,'login.html'),qaLogin);
// Independent Pages QA origin opens directly without requiring the user to
// manually type /app.html. No Git-tracked index.html is ever modified.
fs.writeFileSync(path.join(out,'index.html'),[
  '<!doctype html><html lang="en"><head><meta charset="utf-8">',
  '<meta name="robots" content="noindex,nofollow,noarchive">',
  '<meta http-equiv="refresh" content="0;url=./app.html">',
  '<title>MMHVAULT APP V11.7 — STAGING ONLY</title></head>',
  '<body><p>APP V11.7 Staging: <a href="./app.html">Open the test app</a></p></body></html>'
].join(''));
fs.writeFileSync(path.join(out,'README-STAGING-QA.txt'),[
'MMHVAULT APP V11.7 — LOCAL, AUTH-STAGING-ONLY QA',
'This zip is NEVER deployed to production and includes NO production URLs or keys.',
'Use ONLY dedicated v117qa A/B synthetic Staging accounts; no N10 or real finance data.',
'Unauthenticated APP visits redirect to this package login.html (Staging Auth only).',
'Open /login.html to sign in, then use the APP /app.html. Do not use Production accounts.',
'On macOS: in Terminal cd to this extracted directory and run:',
'    python3 -m http.server 8769 --bind 127.0.0.1',
'Then open http://127.0.0.1:8769/app.html',
'The Content Security Policy permits only Staging Auth session requests',
'and REST calls to transactions / personal_configuration / investments /',
'custom_investments / crypto_wallet_movements (last three SELECT only).',
'All other API paths, including N10 MFA/recovery and Production, are blocked.',
'Local service workers, embedded frames and other origins are blocked.',
'If login/incomplete features fail due to these restrictions, report it;',
'DO NOT loosen the Staging-only connection policy or enter real account data.',
'The full APP Staging browser tests and physical device checks remain separate',
'from the already passing standalone A/B JWT REST verification.',
'',
].join('\n'));
fs.writeFileSync(path.join(out,'START-STAGING-ON-MAC.sh'),[
'#!/bin/sh',
'set -eu',
'cd "$(dirname "$0")"',
'launch_browser() {',
'  (sleep 1; open http://127.0.0.1:8769/app.html) >/dev/null 2>&1 &',
'}',
'# macOS python3 may be a nonfunctional Xcode Command Line Tools stub.',
'# Prefer macOS Ruby/WEBrick if available, without installing developer tools.',
'if command -v ruby >/dev/null 2>&1 && ruby -e \'require "webrick"\' >/dev/null 2>&1; then',
'  echo "MMHVAULT APP V11.7 STAGING: starting Ruby local server"',
'  launch_browser',
'  exec ruby -run -e httpd . -p 8769 -b 127.0.0.1',
'elif command -v python3 >/dev/null 2>&1 && python3 -c \'import http.server\' >/dev/null 2>&1; then',
'  echo "MMHVAULT APP V11.7 STAGING: starting Python local server"',
'  launch_browser',
'  exec python3 -m http.server 8769 --bind 127.0.0.1',
'else',
'  echo "Neither working macOS Ruby/WEBrick nor Python 3 was found."',
'  echo "Do not install Xcode just to use this Staging QA package."',
'  exit 1',
'fi',
].join('\n')+'\n');
console.log(JSON.stringify({destination:out,stagingEndpoint:'https://'+STAGING_HOST,
  bytes:html.length,originReplacements:3,sanitizedAssets,assetsChecked:true,productionRefCount:count(html,PROD_HOST)}));
