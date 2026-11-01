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

const names=['landing.css','business.css','cinematic.css','landing.js','premium-l131.css','motion-l132.css','motion-l132.js','luxury-horizon.svg','premium-architecture.svg','cinematic-lake.webp','personal-business-concept.webp'];
check('All required live assets exist',names.every(f=>fs.existsSync('landing-assets/'+f)));
check('Landing style and script links correct',['landing.css','business.css','cinematic.css','landing.js'].every(f=>current.includes('./landing-assets/'+f)));
check('L1.31 premium layer linked and scoped', current.includes('class="l131"') && current.includes('href="./landing-assets/premium-l131.css?v=1"') && read('landing-assets/premium-l131.css').includes('body.l131 .showcase-v2'));
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
  !/fetch\s*\(|localStorage|supabase|touchstart|gesturestart/.test(motionSource));

check('L1.31 desktop Hero photograph restores actual device composition', read('landing-assets/premium-l131.css').includes('L1.31.1 — restore the photograph') && read('landing-assets/premium-l131.css').includes('url("./personal-business-concept.webp")') && read('landing-assets/cinematic.css').includes('hero-art.is-photo-ready .hero-device-cinematic {display:none;}'));
check('L1.31 never globally disables touch zoom', !/user-scalable\s*=\s*no/i.test(current) && !/touch-action\s*:\s*none/i.test(read('landing-assets/premium-l131.css')));
check('No preview QA material in production root',!current.includes('pwa-qa')&&!current.includes('mmh_layout_probe'));
check('Public robots.txt present',fs.existsSync('robots.txt')&&read('robots.txt').includes('User-agent: *')&&read('robots.txt').includes('Sitemap: https://mmhvault.com/sitemap.xml'));
check('Existing sitemap canonical root',read('sitemap.xml').includes('<loc>https://mmhvault.com/</loc>'));
check('Sitemap has no private app or login',!/<loc>[^<]*\/(?:app|login|n10-qa)\.html/i.test(read('sitemap.xml')));
check('PWA launcher points to secure Login',manifest.start_url==='./login.html?source=pwa&install=v2');
check('Manifest differs only in start_url',JSON.stringify({...manifest,start_url:oldManifest.start_url})===JSON.stringify(oldManifest));
check('Preserved old iPhone touch icon',current.includes('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=pwa24-20261029">'));
const allowed=new Set(['index.html','robots.txt','mmh-manifest-v2.webmanifest','business.html','sitemap.xml','register/index.html','features/index.html','about/index.html','privacy.html','terms.html','security.html','landing-assets/public-pages.css','landing-assets/public-pages.js','landing-assets/landing-release-check.cjs','landing-assets/landing-browser-check.cjs','landing-assets/landing-perf-check.cjs','.github/workflows/landing-release-check.yml',...names.map(f=>'landing-assets/'+f)]);
const diff=cp.spawnSync('git',['diff','--name-only',main+'...HEAD'],{encoding:'utf8'});
assert.equal(diff.status,0,'git diff unsuccessful');
const actual=diff.stdout.trim().split(/\n/).filter(Boolean);
check('All proposed file changes confined to allowlist',actual.length>0&&actual.every(f=>allowed.has(f))&&!actual.includes('app.html')&&!actual.includes('login.html'));

/* L1.30 public brand sitelinks: distinct indexable informational destinations. */
const sitelinkPages = [
  {name:'Create Your Account',path:'register/index.html',url:'https://mmhvault.com/register/'},
  {name:'Personal Finance Features',path:'features/index.html',url:'https://mmhvault.com/features/'}
];
const publicSitemap=read('sitemap.xml');
const translationScript=read('landing-assets/landing.js');
for(const page of sitelinkPages){
  const html=read(page.path);
  const head=html.split('</head>')[0];
  check(page.name+' public page exists with distinct title',html.includes('<h1')&&head.includes('<title>'+page.name+' | MMHVAULT</title>'));
  check(page.name+' has canonical and no noindex',head.includes('<link rel="canonical" href="'+page.url+'">')&&!/name="robots"[^>]*noindex/i.test(head));
  check(page.name+' available in canonical sitemap',publicSitemap.includes('<loc>'+page.url+'</loc>'));
  check(page.name+' linked from homepage and public footer',current.includes('href="./'+page.path.split('/')[0]+'/"')&&html.includes('href="/register/"')&&html.includes('href="/features/"'));
  check(page.name+' contains valid breadcrumb JSON-LD',(()=>{
    const json=(head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)||[])[1];
    if(!json)return false;
    const data=JSON.parse(json);
    return data['@type']==='BreadcrumbList'&&data.itemListElement?.[1]?.item===page.url;
  })());
}
check('Public registration is not a copy of secure Login',!read('register/index.html').includes('id="signupEmail"')&&read('register/index.html').includes('href="/login.html"'));
check('Secure Login stays noindex and untouched',!actual.includes('login.html')&&/name="robots" content="noindex,nofollow,noarchive"/.test(read('login.html')));
check('Life Planner and Business are labelled future concepts',read('features/index.html').includes('Coming Soon')&&read('features/index.html').includes('future release'));
check('Public page CSS & JS are present',fs.existsSync('landing-assets/public-pages.css')&&fs.existsSync('landing-assets/public-pages.js'));
check('Homepage public navigation has correct EN/ZH/MY labels',['en','zh','my'].every(lang=>translationScript.includes('Object.assign(strings.'+lang+',{"sitelinkFeatures"')));

/* L1.7 — factual brand entity and About page sitelink, no AI Overview promises. */
const about=read('about/index.html');
const aboutHead=about.split('</head>')[0];
check('About is unique, indexable, with consistent title and canonical',
 aboutHead.includes('<title>About MMHVAULT | Personal Finance &amp; Wealth</title>') &&
 aboutHead.includes('<link rel="canonical" href="https://mmhvault.com/about/">') &&
 (aboutHead.match(/rel="canonical"/g)||[]).length===1 &&
 !/name=["']robots["'][^>]*noindex/.test(aboutHead));
check('About explicitly states official domain, product purpose and future Business',
 about.includes('Its official website is mmhvault.com') &&
 ['accounts, transactions, investments, budgets and financial planning','Personal Finance Clarity','All-in-One Workspace','Long-Term Perspective']
  .every(term=>about.includes(term)) &&
 about.includes('not a live business accounting service'));
check('About has valid linked AboutPage and BreadcrumbList schema',(()=>{
 const block=(aboutHead.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)||[])[1];
 if(!block)return false;
 const graph=JSON.parse(block)['@graph'];
 return Array.isArray(graph) && graph.some(n=>n['@type']==='AboutPage'&&n.url==='https://mmhvault.com/about/') &&
 graph.some(n=>n['@type']==='BreadcrumbList'&&n.itemListElement?.[1]?.item==='https://mmhvault.com/about/');
})());
check('Public About is linked from homepage, Features, Register and sitemap',
 current.includes('href="./about/"') &&
 read('features/index.html').includes('href="/about/"') &&
 read('register/index.html').includes('href="/about/"') &&
 publicSitemap.includes('<loc>https://mmhvault.com/about/</loc>'));
check('All brand pages retain canonical host and avoid fake external profiles',
 !/tiktok\.com|michigan/i.test(current+about) &&
 [current,read('features/index.html'),read('register/index.html'),about].every(html=>html.includes('https://mmhvault.com/')));
check('Fixed homepage Hero remains visually protected and authentic brand visible',
 current.includes('data-hero-fixed') && current.includes('PERSONAL FINANCE &amp; WEALTH') &&
 about.includes('MMHVAULT · PERSONAL FINANCE &amp; WEALTH'));
check('Features mentions budgets/planning and labels future Business',
 read('features/index.html').includes('Budget reviews and financial planning tools') &&
 read('features/index.html').includes('Business and Life Planner experiences are separate future concepts'));
check('Secure routes not rewritten in this PR',
 !actual.some(p=>/^((login|app|business)\.html|mmh-manifest|sw\.js|mmh-push-sw\.js|CNAME)$/.test(p)));

/* L1.9 — Landing is the design and content source of its informational branches.
   Only the marketing pages may change; all real account flows remain untouched. */
const branchCSS=read('landing-assets/public-pages.css');
const branchJS=read('landing-assets/public-pages.js');
const pageSlices=[
 {route:'About',path:'about/index.html',bodyClass:'about-page',section:'THE MMHVAULT APPROACH'},
 {route:'Features',path:'features/index.html',bodyClass:'features-page',section:'THE FINANCIAL WORKSPACE'},
 {route:'Register',path:'register/index.html',bodyClass:'register-page',section:'PRIVATE ACCOUNT ACCESS'}
];
check('Shared public shell is scoped and all three independent pages inherit it',
 branchCSS.includes('.public-landing-page .brand-wordmark') &&
 branchCSS.includes('.public-landing-page .feature-hero') &&
 branchCSS.includes('.public-landing-page .public-locale-trigger') &&
 !branchCSS.includes('body.l131') &&
 pageSlices.every(page=>{
   const html=read(page.path);
   return html.includes('<body class="public-landing-page '+page.bodyClass+'">') &&
     html.includes('<section class="hero feature-hero"') &&
     html.includes('class="brand-wordmark"') &&
     html.includes('class="feature-hero-copy"') &&
     html.includes('class="visual feature-visual"') &&
     html.includes('id="public-locale-trigger"') &&
     html.includes('id="public-locale-menu"') &&
     html.includes('href="/login.html" class="feature-nav-cta"') &&
     html.includes('href="/"') &&
     html.includes(page.section);
 }));
check('All independent SEO entries preserve canonical and unique H1',
 pageSlices.every(page=>{
   const html=read(page.path);
   return (html.match(/<h1(?:\s|>)/g)||[]).length===1 &&
     (html.match(/<link rel="canonical"/g)||[]).length===1 &&
     html.includes('https://mmhvault.com/'+page.route.toLowerCase()+'/') &&
     !/<meta[^>]+name=["']robots["'][^>]+noindex/.test(html);
 }));
check('Landing About philosophy is intentionally derived into public About',
 ['Personal Finance Clarity','All-in-One Workspace','Private Financial Management',
  'Long-Term Perspective','Multi-Device Experience','English, Chinese & Burmese']
  .every(label=>current.includes(label.replace(/&/g,'&amp;')) && about.includes(label.replace(/&/g,'&amp;'))));
/* L1.9: catch future English/Chinese/Burmese About-copy drift from the
   homepage's source language dictionary before public SEO release. */
const landingDictionary=read('landing-assets/landing.js');
const htmlEscape=value=>value.replace(/&/g,'&amp;').replace(/"/g,'&quot;')
  .replace(/</g,'&lt;').replace(/>/g,'&gt;');
function landingTranslations(key){
 const rx=new RegExp("(?:\\b"+key+"\\s*:\\s*'([^']*)'|\""+key+"\"\\s*:\\s*\"([^\"]*)\")",'g');
 return [...landingDictionary.matchAll(rx)].map(m=>m[1]??m[2]);
}
for(const key of ['whyLead', ...Array.from({length:6},(_,i)=>'benefit'+(i+1)+'Title'),
                           ...Array.from({length:6},(_,i)=>'benefit'+(i+1)+'Desc')]){
 const values=landingTranslations(key);
 check('Landing -> About 3-language text parity: '+key,
   values.length===3 &&
   about.includes('data-en="'+htmlEscape(values[0])+'" data-zh="'+
     htmlEscape(values[1])+'" data-my="'+htmlEscape(values[2])+'"'));
}

check('Public pages have a functional Landing-style language control and no form',
 ['en','zh','my'].every(l=>branchJS.includes("['en','zh','my']")) &&
 branchJS.includes("trigger.setAttribute('aria-expanded'") &&
 branchJS.includes('window.localStorage') &&
 !/fetch\s*\(|supabase|createClient|location\.replace|passwordInput/.test(branchJS) &&
 pageSlices.every(page=>!/<form[\s>]/i.test(read(page.path))));
check('Dedicated visual branches preserve their distinct purpose',
 read('features/index.html').includes('<h3') &&
 read('register/index.html').includes('Continue to Sign Up') &&
 read('register/index.html').includes('href="/login.html"') &&
 about.includes('not a bank, broker, payment service or financial adviser') &&
 read('features/index.html').includes('Business and Life Planner experiences are separate future concepts'));

/* L1.33 — public legal pages and consistent brand icon; no auth code changes. */
for(const page of [
 {path:'privacy.html',url:'https://mmhvault.com/privacy.html',title:'Privacy | MMHVAULT'},
 {path:'terms.html',url:'https://mmhvault.com/terms.html',title:'Terms of Use | MMHVAULT'},
 {path:'security.html',url:'https://mmhvault.com/security.html',title:'Security | MMHVAULT'}
]){
 const content=read(page.path);
 const head=content.split('</head>')[0];
 check(page.path+' has branded title, description and one canonical',
   head.includes('<title>'+page.title+'</title>') &&
   head.includes('<meta name="description" content="') &&
   (head.match(/rel="canonical"/g)||[]).length===1 &&
   head.includes('<link rel="canonical" href="'+page.url+'">'));
 check(page.path+' uses correct public sharing metadata',
   head.includes('og:site_name" content="MMHVAULT"') &&
   head.includes('og:url" content="'+page.url+'"') &&
   head.includes('https://mmhvault.com/images/mmhvault-logo-transparent.png'));
 check(page.path+' avoids favicon 404 and reserves logo space',
   head.includes('rel="icon" type="image/png" href="/images/mmhvault-logo-transparent.png"') &&
   content.includes('alt="MMHVAULT logo" width="38" height="38"'));
}
for(const path of ['register/index.html','features/index.html']){
 const head=read(path).split('</head>')[0];
 check(path+' uses existing brand logo for favicon, not missing .ico',
   head.includes('<link rel="icon" type="image/png" href="/images/mmhvault-logo-transparent.png">') &&
   !head.includes('/favicon.ico'));
}

/* L1.11 — public-only hero image fetch prioritization.
   Background image URLs are otherwise discovered after the CSS is parsed. */
for(const info of [
 {path:'about/index.html',asset:'cinematic-lake.webp'},
 {path:'features/index.html',asset:'personal-business-concept.webp'},
 {path:'register/index.html',asset:'personal-business-concept.webp'}
]){
 const html=read(info.path);
 const head=html.split('</head>')[0];
 check(info.path+' preloads its real above-the-fold image just once',
   (head.match(/rel="preload" as="image"/g)||[]).length===1 &&
   head.includes('<link rel="preload" as="image" type="image/webp" fetchpriority="high" href="/landing-assets/'+info.asset+'">') &&
   fs.existsSync('landing-assets/'+info.asset));
 check(info.path+' stays independently indexable and preserves its canonical',
   (head.match(/rel="canonical"/g)||[]).length===1 &&
   head.includes('https://mmhvault.com/'+info.path.split('/')[0]+'/') &&
   !/name="robots"[^>]*noindex/i.test(head));
}
check('Lab performance probe is read-only and restricted to public static routes',
 fs.existsSync('landing-assets/landing-perf-check.cjs') &&
 ['/', '/about/', '/features/', '/register/'].every(r=>
   read('landing-assets/landing-perf-check.cjs').includes(r)) &&
 !/fetch\s*\(|supabase\.createClient|SERVICE_ROLE|page\.request\.|writeFileSync\(.+app\.html/.test(read('landing-assets/landing-perf-check.cjs')));

/* L1.33 — conservative uncompressed resource budgets (not a lab speed score). */
const publicRuntimeBudgets={
  'index.html':100000,
  'landing-assets/landing.css':225000,
  'landing-assets/business.css':55000,
  'landing-assets/cinematic.css':40000,
  'landing-assets/premium-l131.css':20000,
  'landing-assets/motion-l132.css':12000,
  'landing-assets/landing.js':110000,
  'landing-assets/motion-l132.js':15000,
  'landing-assets/cinematic-lake.webp':150000,
  'landing-assets/personal-business-concept.webp':150000,
  'images/mmhvault-logo-transparent.png':120000
};
for(const [file,maxBytes] of Object.entries(publicRuntimeBudgets)){
  check(file+' stays under uncompressed asset budget',fs.statSync(file).size<=maxBytes);
}
check('Homepage background is early-discovered and prioritized without altering auth',
 current.includes('<link rel="preload" as="image" type="image/webp" fetchpriority="high" href="./landing-assets/cinematic-lake.webp">') &&
 (current.match(/rel="preload" as="image"/g)||[]).length===1 &&
 current.includes('class="hero-device-cinematic"') &&
 current.includes('fetchpriority="high"') &&
 dom('mmh-n10-recovery-error-route',current)===dom('mmh-n10-recovery-error-route',prev));

check('Landing priority image and below-fold concept use efficient loading',
  current.includes('width="1600" height="900"') &&
  current.includes('decoding="async" fetchpriority="high"') &&
  current.includes('loading="lazy" decoding="async"') &&
  current.includes('<link rel="preload" as="image" type="image/webp"') &&
  current.includes('<script defer src="./landing-assets/landing.js"></script>'));
check('Landing ships no third-party blocking scripts or styles',
  !/<script[^>]+src=["']https?:\/\//i.test(current) &&
  !/<link[^>]+rel=["']stylesheet["'][^>]+href=["']https?:\/\//i.test(current));
for(const page of ['privacy.html','terms.html','security.html']){
 const html=read(page);
 check(page+' points branding and Home link to canonical root',
   html.includes('<a class="brand" href="/">') &&
   html.includes('<footer><a href="/">Home</a>') &&
   !html.includes('href="index.html"'));
}

console.log('Landing launch preflight: '+passed+'/'+passed+' PASS — no live authentication or PWA device claim.');
