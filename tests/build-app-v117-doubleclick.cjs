/* Convert a reviewed, locally built full APP Auth-Staging package to a
 * double-click HTML entrypoint. No web server / Python / Ruby needed.
 * Classic JS/CSS assets stay as local file:// references; ONLY the V11.7
 * imported ES-module tree is bundled into an inline classic script.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const esbuild=require('esbuild');
const root=path.resolve(__dirname,'..');
const out=process.env.MMH_V117_STAGING_OUTPUT_DIR?
  path.resolve(process.env.MMH_V117_STAGING_OUTPUT_DIR):
  path.join(root,'dist','app-v117-staging');
const source=path.join(out,'app.html');
const destination=path.join(out,'OPEN-ME-STAGING.html');
const PROD_HOST='vrypucmyrztxgiqhjspd.supabase.co';
const PROD_KEY='sb_publishable_H38v4XbO0ARnSJToD42wGg_27-SZ3Ao';
const STAGE='ldivswlhtgmznzwhzsoi.supabase.co';
const sourceTag='<script type="module" src="js/mmhvault-v11-manage-hierarchy-live.mjs?v=0.7.0"></script>';
let html=fs.readFileSync(source,'utf8');
assert.equal(html.split(sourceTag).length-1,1,'Expected one ESM script, abort on code drift');
assert.ok(html.includes('connect-src https://'+STAGE+'/auth/v1/token')&&
  html.includes('https://'+STAGE+'/rest/v1/transactions'),
  'Staging-only auth and finance CSP is required');
assert.ok(!html.includes(PROD_HOST)&&!html.includes(PROD_KEY),'Production API reference found');
const entry=path.join(out,'js','mmhvault-v11-manage-hierarchy-live.mjs');
assert.ok(fs.existsSync(entry),'Hierarchy entry not copied to the isolated package');
const result=esbuild.buildSync({entryPoints:[entry],write:false,bundle:true,
  format:'iife',platform:'browser',target:['chrome109','safari16'],minify:false,
  logLevel:'silent'});
assert.equal(result.outputFiles.length,1);
const code=Buffer.from(result.outputFiles[0].contents).toString('utf8');
assert.ok(code.includes('MMHV11HierarchyLive'),'Bundled controller missing');
assert.ok(!/\bimport\s*(?:\{|\*|['"])/.test(code),'Local ESM imports survived bundling');
assert.ok(!code.includes(PROD_HOST)&&!code.includes(PROD_KEY),'Production API survived in import tree');
const safeInline=code.replace(/<\/script/gi,'<\\/script');
html=html.replace(sourceTag,'<script id="mmh-v117-inline-hierarchy">'+safeInline+'</script>');
assert.ok(!html.includes(sourceTag));
const mark='<meta name="mmhvault-local-doubleclick" content="file-mode-no-server">';
assert.ok(html.includes('</head>'));
html=html.replace('</head>',mark+'</head>');
html=html.replace('APP V11.7 · STAGING ONLY · NO PRODUCTION',
  'APP V11.7 · STAGING ONLY · DOUBLE-CLICK MODE');
html=html.replaceAll('MMHVAULT APP V11.7 — STAGING ONLY','MMHVAULT APP V11.7 — STAGING FILE MODE');
const localResources=[...html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)]
  .map(x=>x[1]).filter(x=>!/^https?:/.test(x));
for(const url of localResources)assert.ok(fs.existsSync(path.join(out,url.split('?')[0])),
  'Local classic script missing: '+url);
fs.writeFileSync(destination,html);
const readme=path.join(out,'READ-ME-FIRST.txt');
fs.writeFileSync(readme,[
'MMHVAULT APP V11.7 — AUTH-STAGING-ONLY DIRECT-OPEN TEST',
'',
'NO TERMINAL, PYTHON, RUBY, XCODE OR LOCAL SERVER NEEDED.',
'On Mac, double-click OPEN-ME-STAGING.html (not app.html).',
'Use Google Chrome with ordinary browser mode (no special flags).',
'Keep this extracted folder intact; local css/js/images are beside HTML.',
'',
'Confirm the STAGING ONLY banner before logging in with either of the two',
'dedicated v117qa test accounts. Never enter a Production or N10 account.',
'The browser CSP allows ONLY Staging session Auth and the two approved',
'finance REST tables. It blocks Production, N10 Edge/MFA/recovery, and',
'all other network APIs. Unrelated full APP features may not work.',
'The two finance tables are for synthetic QA ONLY.',
'',
'If the page is blank, or errors occur, send the browser screenshot.',
'Do not install developer tools or disable browser security.',
'No production deployment has occurred.',
'',
].join('\n'));
console.log(JSON.stringify({ready:true,entry:'OPEN-ME-STAGING.html',
  bytes:html.length,inlineBundleBytes:code.length,classicLocalScripts:localResources.length,
  productionHostFound:html.includes(PROD_HOST)}));
