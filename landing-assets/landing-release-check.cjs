// Read-only MMHVAULT Landing production-release gate.
// No credentials, network calls, database writes, or external dependencies.
const fs = require('node:fs');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const read = path => fs.readFileSync(path,'utf8');
const main = 'origin/main';
const source = path => {
 const r=cp.spawnSync('git',['show',main+':'+path],{encoding:'utf8',maxBuffer:1024*1024*2});
 assert.equal(r.status,0,'Cannot read original main:'+path);
 return r.stdout;
};
const current = read('index.html');
const prev=source('index.html');
const manifest=JSON.parse(read('mmh-manifest-v2.webmanifest'));
const oldManifest=JSON.parse(source('mmh-manifest-v2.webmanifest'));
const dom=(key,content)=>((content.match(new RegExp('<script id="'+key+'">([\\s\\S]*?)<\\/script>'))||[])[1]||null);
let passed=0;
function check(title,predicate){assert.ok(predicate,title);++passed;console.log('PASS '+title)}
check('Main page indexable',!/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(current));
check('Official finance and wealth search title',current.includes('<title>MMHVAULT | Personal Finance & Wealth</title>'));
check('Consistent official Open Graph and Twitter titles',(current.match(/content="MMHVAULT \| Personal Finance &amp; Wealth"/g)||[]).length===2);
check('Official description names real finance tools and future Business', current.includes('name="description"')&&current.includes('official personal finance and wealth management website')&&current.includes('Business is a future concept.'));
check('Canonical is unique and official',(current.match(/<link rel="canonical"/g)||[]).length===1&&current.includes('href="https://mmhvault.com/"'));
check('OG site and homepage URL',current.includes('property="og:site_name" content="MMHVAULT"')&&current.includes('property="og:url" content="https://mmhvault.com/"'));
check('Real brand PNG present',fs.existsSync('images/mmhvault-logo-transparent.png')&&current.includes('https://mmhvault.com/images/mmhvault-logo-transparent.png'));
const jsonText=(current.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)||[])[1];
check('One valid JSON-LD block',!!jsonText&&(current.match(/<script type="application\/ld\+json">/g)||[]).length===1);
const graph=JSON.parse(jsonText)['@graph'];
check('Website name in structured data',graph.some(x=>x['@type']==='WebSite'&&x.name==='MMHVAULT'&&x.url==='https://mmhvault.com/'));
check('Brand Organization in structured data',graph.some(x=>x['@type']==='Organization'&&x.name==='MMHVAULT'));
const site=graph.find(x=>x['@type']==='WebSite');
const brand=graph.find(x=>x['@type']==='Organization');
const appSchema=graph.find(x=>x['@type']==='SoftwareApplication');
check('One official WebSite / Organization / SoftwareApplication graph',
 graph.length===3 && site?.name==='MMHVAULT' &&
 brand?.name==='MMHVAULT' && appSchema?.name==='MMHVAULT' &&
 site?.publisher?.['@id']===brand?.['@id'] &&
 appSchema?.publisher?.['@id']===brand?.['@id']);
check('SoftwareApplication truthfully describes web finance and excludes future Business',
 appSchema?.url==='https://mmhvault.com/' &&
 appSchema?.applicationCategory==='FinanceApplication' &&
 appSchema?.operatingSystem==='Web browser' &&
 ['Accounts','Transactions','Investments','Budgets','Financial Analysis','Financial Planning']
  .every(x=>appSchema.featureList?.includes(x)) &&
 !appSchema?.featureList?.includes('Business') &&
 !appSchema?.offers && !appSchema?.aggregateRating && !appSchema?.review);
check('Organization references the real brand logo and correct platform identity',
 brand?.description?.includes('Personal Finance & Wealth') &&
 brand?.logo?.url==='https://mmhvault.com/images/mmhvault-logo-transparent.png');
check('Exact N10 recovery route preserved',dom('mmh-n10-recovery-error-route',current)===dom('mmh-n10-recovery-error-route',prev)&&!!dom('mmh-n10-recovery-error-route',prev));
check('Installed standalone fallback present',!!dom('mmh-pwa-standalone-root-bridge',current));
check('Standalone guard does not affect normal browser',dom('mmh-pwa-standalone-root-bridge',current).includes('if (!isStandalone) return'));
check('Fallback leaves OAuth/recovery params alone',dom('mmh-pwa-standalone-root-bridge',current).includes("'access_token'")&&dom('mmh-pwa-standalone-root-bridge',current).includes("'code'"));
check('Unsuccessful pinch guard excluded',!current.includes('standalone-pinch-guard.js')&&!fs.existsSync('landing-assets/standalone-pinch-guard.js'));
check('Normal secure Login route',current.includes('href="./login.html"')&&current.includes('href="./mmh-manifest-v2.webmanifest"'));
check('Both mobile auth entry links',current.includes('mobile-nav-auth-signin')&&current.includes('mobile-nav-auth-signup'));
check('All fixed Hero languages',["YOUR MONEY. YOUR DIRECTION.","让财务更清晰，让未来更有方向。","ငွေကြေးကို ပိုမိုရှင်းလင်းစွာ သိမြင်"].every(t=>current.includes(t)));
check('Business + Life Planner not presented as live',current.includes('COMING SOON')&&current.includes('in development.'));
check('No Supabase backend code in Landing',!current.includes('supabase.createClient')&&!current.includes('SUPABASE_SERVICE_ROLE_KEY'));
check('Current production Login remains noindex',/name="robots" content="noindex,nofollow,noarchive"/.test(read('login.html')));
check('Actual App remains noindex',/<meta[^>]*name=["']robots["'][^>]*noindex/i.test(read('app.html').slice(0,350000)));
check('Protected Business page remains noindex',/<meta[^>]*name=["']robots["'][^>]*noindex/i.test(read('business.html').slice(0,2000)));

const names=['landing.css','business.css','cinematic.css','landing.js','premium-l131.css','explore-l114.css','motion-l132.css','motion-l132.js','luxury-horizon.svg','premium-architecture.svg','cinematic-lake.webp','personal-business-concept.webp'];
check('All required live assets exist',names.every(f=>fs.existsSync('landing-assets/'+f)));
check('Landing style and script links correct',['landing.css','business.css','cinematic.css','landing.js'].every(f=>current.includes('./landing-assets/'+f)));
check('L1.31 premium layer linked and scoped', current.includes('class="l131 mmh-nav-unified"') && current.includes('href="./landing-assets/premium-l131.css?v=1"') && read('landing-assets/premium-l131.css').includes('body.l131 .showcase-v2'));
check('Explore styles load after existing premium/motion layers and remain scoped',
 current.includes('href="./landing-assets/explore-l114.css?v=1"') &&
 read('landing-assets/explore-l114.css').includes('body.l131 .site-header #primary-nav') &&
 !read('landing-assets/explore-l114.css').includes('body.app'));
check('L1.32 motion assets linked from homepage',
  current.includes('href="./landing-assets/motion-l132.css?v=1"') &&
  current.includes('src="./landing-assets/motion-l132.js?v=1"'));
const motionSource=read('landing-assets/motion-l132.js');
const motionStyles=read('landing-assets/motion-l132.css');
check('L1.32 reveal uses IntersectionObserver and no forced hidden fallback',
  motionSource.includes('IntersectionObserver') && motionSource.includes('mm-shown') &&
  motionStyles.includes('.mm-reveal:not(.mm-shown)') &&
  motionSource.includes("if(!permitted() || !('IntersectionObserver' in window))return;"));
check('L1.32 respects reduced motion and native links',
  motionSource.includes('prefers-reduced-motion: reduce') &&
  motionStyles.includes('@media (prefers-reduced-motion: reduce)') &&
  !motionSource.includes('preventDefault(') && !motionSource.includes('location.replace'));
check('L1.32 product/business state switch animations stay presentational',
  motionSource.includes('data-product-current') &&
  motionSource.includes('data-current-view') &&
  motionSource.includes("typeof node.animate!=='function'") &&
  !['fetch(', 'supabase', 'SERVICE_ROLE_KEY', 'location.replace'].some(
    term=>read('landing-assets/public-pages.js').includes(term)));
check('L1.18 exactly five public presentation and QA files, no HTML or auth changes',
  actual.length===5 &&
  actual.every(path=>[
    'landing-assets/premium-l131.css',
    'landing-assets/public-pages.css',
    'landing-assets/public-pages.js',
    'landing-assets/landing-release-check.cjs',
    'landing-assets/landing-browser-check.cjs'
  ].includes(path)) &&
  current===prev &&
  publicHeaders.every(path=>source(path)===read(path)) &&
  source('landing-assets/landing.js')===read('landing-assets/landing.js') &&
  source('landing-assets/motion-l132.js')===read('landing-assets/motion-l132.js') &&
  source('landing-assets/shared-header-l116.css')===sharedCss);
check('Protected auth/PWA/SEO/config sources unchanged in PR diff',
 ['business.html','app.html','login.html','sitemap.xml','robots.txt',
  'mmh-manifest-v2.webmanifest','landing-assets/landing.js'].every(file=>{
    const test=cp.spawnSync('git',['diff','--quiet',main+'...HEAD','--',file],
      {encoding:'utf8',maxBuffer:4096});
    return test.status===0;
  }));
check('Homepage N10 recovery and standalone guards are unchanged from main',
 ['mmh-n10-recovery-error-route','mmh-pwa-standalone-root-bridge']
   .every(id=>dom(id,current)===dom(id,prev)));

console.log('Landing launch preflight: '+passed+'/'+passed+' PASS — no live authentication or PWA device claim.');
