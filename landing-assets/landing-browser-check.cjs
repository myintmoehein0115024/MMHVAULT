/* MMHVAULT Landing L1.34 — isolated public-page browser QA.
 * Runs on a local static server in GitHub Actions.
 * No authentication, backend, financial data or production writes.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright-core');
const origin='http://127.0.0.1:8765';
const widths=[320,393,440,768,1024,1051,1100,1200,1290,1440,1920];
const publicRoutes=['/','/about/','/register/','/features/','/business/','/privacy.html','/terms.html','/security.html'];
const screenshots=path.join(process.cwd(),'landing-qa-screenshots');
fs.mkdirSync(screenshots,{recursive:true});
function ensure(condition,message){assert.ok(condition,message);console.log('PASS '+message)}
async function load(page,route,failures){
  const response=await page.goto(origin+route,{waitUntil:'load',timeout:25000});
  ensure(response && response.status()===200,route+' HTTP 200');
  await page.waitForTimeout(100);
  const widths=await page.evaluate(()=>({
    window:window.innerWidth,
    document:document.documentElement.scrollWidth,
    body:document.body.scrollWidth
  }));
  if(widths.document > widths.window+2){
    const outside=await page.evaluate(()=>[...document.querySelectorAll('body *')]
      .map(el=>{
        const r=el.getBoundingClientRect();
        const st=getComputedStyle(el);
        return {tag:el.tagName,className:typeof el.className==='string'?el.className.slice(0,100):'',
          left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),
          position:st.position,overflow:st.overflowX};
      })
      .filter(r=>r.width>10 && (r.right>innerWidth+5 || r.left< -5))
      .sort((a,b)=>b.right-a.right).slice(0,24));
    console.error('RESPONSIVE OFFENDERS '+route+' '+widths.window+'px '+JSON.stringify(outside));
  }
  // Decorative blurred ambience may extend outside the viewport in layout
  // metrics while overflow-x:clip prevents all *actual* horizontal scrolling.
  const horizontalTravel=await page.evaluate(()=>{
    const beforeX=scrollX, beforeY=scrollY;
    window.scrollTo({left:1000,top:beforeY,behavior:'instant'});
    const traveled=scrollX;
    window.scrollTo({left:beforeX,top:beforeY,behavior:'instant'});
    return traveled;
  });
  ensure(horizontalTravel<=2,
    route+' no user-scrollable sideways overflow '+JSON.stringify({...widths,horizontalTravel}));
  ensure(failures.length===0,route+' no JS exceptions or missing local assets: '+failures.join('; '));
  return widths;
}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
   // L1.16 — actual layout parity, not only matching class names. The same
   // header and both expanded menus must occupy the SAME positions when
   // switching between the Landing and each public introduction route.
   for(const [width,lang,routes] of [
     [393,'en',publicRoutes.slice(1)],
     [1440,'en',publicRoutes.slice(1)],
     [1100,'zh',['/about/','/features/','/business/']],
     [393,'my',['/about/','/features/','/business/']]
   ]){
     const ctx=await browser.newContext({viewport:{width,height:852},
       deviceScaleFactor:1,reducedMotion:'reduce'});
     const page=await ctx.newPage();
     await page.addInitScript(language=>{
       try{localStorage.setItem('mmhvault.landing.language',language)}catch(_){}
     },lang);
     async function geometry(){
       return page.evaluate(()=>{
         const selectors={
           outer:'.site-header',row:'.site-header .header-inner',
           brand:'.site-header .brand',symbol:'.site-header .brand-symbol',
           wordmark:'.site-header .brand-copy strong',
           brandCaption:'.site-header .brand-copy small',
           links:'.site-header #primary-nav',
           actions:'.site-header .header-actions',
           locale:'.site-header .locale-trigger',
           signin:'.site-header .signin-link',
           started:'.site-header .header-cta',
           toggle:'.site-header .menu-toggle',
           explore:'.site-header .nav-explore>summary',
           dropdown:'.site-header .nav-explore-menu'
         };
         const output={};
         for(const [name,selector] of Object.entries(selectors)){
           const el=document.querySelector(selector);
           if(!el){output[name]={missing:true};continue;}
           const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
           output[name]={
             rect:[rect.x,rect.y,rect.width,rect.height]
               .map(n=>Math.round(n*2)/2),
             display:style.display,position:style.position,
             font:style.fontSize,color:style.color,
             background:style.backgroundColor,
             padding:style.padding,gap:style.gap
           };
         }
         output.menuLabel=document.querySelector('.site-header .nav-explore>summary')?.textContent.trim();
         return output;
       });
     }
     await page.goto(origin+'/',{waitUntil:'load'});
     const baseline=await geometry();
     for(const route of routes){
       await page.goto(origin+route,{waitUntil:'load'});
       const actual=await geometry();
       const diffs=[];
       for(const key of Object.keys(baseline)){
         if(key==='menuLabel'){
           if(baseline[key]!==actual[key])diffs.push(key+': '+baseline[key]+' != '+actual[key]);
           continue;
         }
         if(!actual[key]||actual[key].missing){diffs.push(key+' missing');continue;}
         for(const prop of ['display','position','font','color','background','padding','gap']){
           if(baseline[key][prop]!==actual[key][prop])
             diffs.push(key+'.'+prop+': '+baseline[key][prop]+' / '+actual[key][prop]);
         }
         for(let n=0;n<4;n++){
           if(Math.abs(baseline[key].rect[n]-actual[key].rect[n])>1.5)
             diffs.push(key+'.rect['+n+']: '+baseline[key].rect[n]+' / '+actual[key].rect[n]);
         }
       }
       ensure(diffs.length===0,
         'L1.16 '+width+'px '+lang+' '+route+' header identical to Landing '+JSON.stringify(diffs.slice(0,15)));
     }
     const compact=width<=1360;
     async function menuGeometry(){
       if(compact)await page.locator('.site-header .menu-toggle').click();
       await page.locator('#landing-explore > summary').click();
       const shot=await geometry();
       shot.linksText=await page.locator('#landing-explore .nav-explore-menu a').allTextContents();
       return shot;
     }
     await page.goto(origin+'/',{waitUntil:'load'});
     const openLanding=await menuGeometry();
     await page.goto(origin+'/about/',{waitUntil:'load'});
     const openAbout=await menuGeometry();
     const openDiffs=[];
     for(const key of ['links','dropdown','toggle','outer','row','explore']){
       for(let n=0;n<4;n++){
         if(Math.abs(openLanding[key].rect[n]-openAbout[key].rect[n])>1.5)
           openDiffs.push(key+': '+JSON.stringify(openLanding[key].rect)+' vs '+JSON.stringify(openAbout[key].rect));
       }
     }
     ensure(openDiffs.length===0&&
       JSON.stringify(openLanding.linksText)===JSON.stringify(openAbout.linksText),
       'L1.16 '+width+'px '+lang+' both expanded menus match geometry and text '+JSON.stringify(openDiffs));
     if(lang==='en'){
       await page.screenshot({path:path.join(screenshots,
         'l116-shared-about-open-'+width+'.png'),fullPage:false,animations:'disabled'});
     }
     await ctx.close();
   }

   for(const width of widths){
     const ctx=await browser.newContext({
       viewport:{width,height:852},deviceScaleFactor:1,
       reducedMotion:'reduce',isMobile:width<=440,hasTouch:width<=440
     });
     const page=await ctx.newPage();
     const failures=[];
     page.on('pageerror',e=>failures.push('exception '+e.message));
     page.on('response',r=>{
       if(r.url().startsWith(origin) && r.status()>=400)failures.push(r.status()+' '+r.url());
     });
     await load(page,'/',failures);
     // L1.19 — tiny phone CTAs remain touchable without text clipping.
     if(width<=620){
       const ctas=await page.locator('.hero .hero-buttons .button').evaluateAll(els=>
         els.map(el=>{const r=el.getBoundingClientRect();return {
           height:r.height,width:r.width,left:r.left,right:r.right,
           scrollWidth:el.scrollWidth,clientWidth:el.clientWidth
         }}));
       ensure(ctas.length===2&&ctas.every(x=>
         x.height>=47&&x.width>95&&x.left>=-2&&x.right<=width+2&&
         x.scrollWidth<=x.clientWidth+3),
         width+'px Landing CTAs fit and retain 48px touch targets '+JSON.stringify(ctas));
     }
     ensure(await page.locator('h1#hero-title').count()===1,width+'px single homepage H1');
     ensure(await page.locator('.hero-device-cinematic').evaluate(img=>img.complete&&img.naturalWidth>0),
       width+'px concept Hero photograph loaded');
     if(width>=1361){
       const header=await page.evaluate(()=>{
         const brand=document.querySelector('.site-header .brand').getBoundingClientRect();
         const nav=document.querySelector('#primary-nav').getBoundingClientRect();
         const actions=document.querySelector('.site-header .header-actions').getBoundingClientRect();
         return {brandRight:Math.round(brand.right),navLeft:Math.round(nav.left),
           navRight:Math.round(nav.right),actionsLeft:Math.round(actions.left),
           navHeight:Math.round(nav.height),navTop:Math.round(nav.top),
           actionsTop:Math.round(actions.top)};
       });
       ensure(header.brandRight<=header.navLeft+3 &&
         header.navRight<=header.actionsLeft+3 &&
         Math.abs(header.navTop-header.actionsTop)<32 &&
         header.navHeight<=70,
         width+'px six-item desktop navigation remains one line '+JSON.stringify(header));
       ensure(await page.locator('#landing-explore > summary').isVisible(),
         width+'px Explore disclosure visible on desktop');
     }else{
       ensure(await page.locator('.site-header .menu-toggle').isVisible(),
         width+'px responsive compact menu replaces overflowing six-item nav');
     }
     if([320,393,768,1024].includes(width)){
       await page.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}));
       await page.screenshot({
         path:path.join(screenshots,'landing-firstscreen-'+width+'.png'),
         fullPage:false,animations:'disabled'
       });
     }
     if(width<=1024){
       const clipped=await page.evaluate(()=>{
         const selectors=[
           '.site-header .brand','.site-header .locale-trigger','.site-header .menu-toggle',
           '.hero .hero-name','.hero .hero-statement',
           '.hero .hero-script-zh','.hero .hero-script-my','.hero .hero-script-en',
           '.hero .hero-buttons'
         ];
         return selectors.flatMap(selector=>{
           const el=document.querySelector(selector);
           if(!el || getComputedStyle(el).display==='none')return [];
           const box=el.getBoundingClientRect();
           const range=document.createRange();
           range.selectNodeContents(el);
           const text=range.getBoundingClientRect();
           const extendsPast=box.left< -4||box.right>innerWidth+4||
             (text.width>0&&(text.left< -4||text.right>innerWidth+4));
           const hiddenText=el.scrollWidth>el.clientWidth+5;
           return extendsPast||hiddenText?[{
             selector,left:Math.round(box.left),right:Math.round(box.right),
             contentRight:Math.round(text.right),scrollWidth:el.scrollWidth,
             clientWidth:el.clientWidth
           }]:[];
         });
       });
       ensure(clipped.length===0,
         width+'px home branding, controls and three-language Hero stay onscreen '+JSON.stringify(clipped));
     }

     // User-requested fixed multilingual Hero must not change with language.
     const immutable=await page.locator('[data-hero-fixed]').allTextContents();
     for(const language of ['zh','my','en']){
       await page.locator('#locale-trigger').click();
       await page.locator('#locale-menu button[data-lang="'+language+'"]').click();
       const after=await page.locator('[data-hero-fixed]').allTextContents();
       ensure(JSON.stringify(after)===JSON.stringify(immutable),
         width+'px fixed three-language Hero remains unchanged in '+language);
       const exploreLabels={en:'Explore',zh:'了解更多',my:'ပိုမိုလေ့လာရန်'};
       ensure((await page.locator('#landing-explore > summary [data-i18n="navExplore"]').textContent()).trim()===exploreLabels[language],
         width+'px Explore translated correctly in '+language);
     }
     await page.locator('[data-product-tab="accounts"]').click();
     ensure(await page.locator('[data-product-tab="accounts"]').getAttribute('aria-selected')==='true',
       width+'px Accounts feature tab responds');
     ensure(await page.locator('[data-product-panel="accounts"]').isVisible(),
       width+'px Accounts concept panel displayed');
     await page.locator('[data-business-view="business"]').click();
     ensure(await page.locator('[data-business-view="business"]').getAttribute('aria-pressed')==='true',
       width+'px Business concept switch responds');
     ensure(await page.locator('body').evaluate(b=>!b.innerHTML.includes('user-scalable=no')),
       width+'px browser zoom not disabled');
     if(width===393||width===1440)await page.screenshot({
       path:path.join(screenshots,'landing-'+width+'.png'),fullPage:true,animations:'disabled'
     });
     ensure(failures.length===0,width+'px interactive Landing has no missing assets / exceptions');
     await ctx.close();
     console.log('PASS viewport '+width+' complete');
   }

   for(const route of publicRoutes.slice(1)){
     for(const width of [320,393,600,768,960,1100,1200,1290,1291,1366,1440]){
       const ctx=await browser.newContext({viewport:{width,height:852},reducedMotion:'reduce'});
       const page=await ctx.newPage();
       const failures=[];
       page.on('pageerror',e=>failures.push('exception '+e.message));
       page.on('response',r=>{
         if(r.url().startsWith(origin)&&r.status()>=400)failures.push(r.status()+' '+r.url());
       });
       await load(page,route,failures);
       // L1.19 — public detail CTA layout adapts to narrow phones and tablets.
       if(['/about/','/features/','/register/'].includes(route)&&width<=600){
         const actions=await page.locator('.feature-hero .actions').evaluate(el=>{
           const links=[...el.querySelectorAll('.action')].map(a=>{
             const r=a.getBoundingClientRect();
             return {left:r.left,right:r.right,top:r.top,height:r.height,width:r.width,
               scrollWidth:a.scrollWidth,clientWidth:a.clientWidth};
           });
           return {display:getComputedStyle(el).display,links};
         });
         ensure(actions.display==='grid'&&actions.links.length>=1&&
           actions.links.every(x=>x.height>=49&&x.left>=-2&&
             x.right<=width+2&&x.scrollWidth<=x.clientWidth+3),
           route+' '+width+'px responsive public CTA touch targets '+JSON.stringify(actions));
         if(actions.links.length>=2&&[320,393].includes(width)){
           const [one,two]=actions.links;
           ensure(width===320
             ? Math.abs(one.left-two.left)<=2&&two.top>=one.top+one.height-2
             : Math.abs(one.top-two.top)<=2&&Math.abs(one.width-two.width)<=2,
             route+' '+width+'px action columns adapt without clipping');
         }
       }
       if(['/privacy.html','/security.html','/terms.html'].includes(route)&&width<=600){
         const related=await page.locator('.policy-related a').evaluateAll(els=>
           els.map(el=>el.getBoundingClientRect().height));
         ensure(related.every(height=>height>=47),
           route+' '+width+'px related-policy touch targets remain accessible');
       }
       ensure(!await page.locator('body').evaluate(b=>b.classList.contains('mm-public-motion')),
         route+' '+width+'px reduced-motion page never activates reveal');
       ensure(await page.locator('h1').count()===1,route+' '+width+'px has one H1');
       // L1.20 — public search metadata is parseable and tied to the official
       // parent website, without changing any existing UI or account paths.
       if([393,1440].includes(width)&&[
         '/features/','/register/','/security.html','/privacy.html','/terms.html'
       ].includes(route)){
         const semantic=await page.evaluate(()=>{
           const nodes=[...document.querySelectorAll('script[data-mmh-l120="webpage"]')];
           if(nodes.length!==1)return {count:nodes.length};
           const data=JSON.parse(nodes[0].textContent);
           const entity=data['@graph']?.find(x=>x['@type']==='WebPage');
           return {
             count:nodes.length,
             type:entity?.['@type'],
             id:entity?.['@id'],
             url:entity?.url,
             parent:entity?.isPartOf?.['@id'],
             about:entity?.about?.['@id'],
             canonical:document.querySelector('link[rel="canonical"]')?.href,
             breadcrumbs:data['@graph']?.filter(x=>x['@type']==='BreadcrumbList').length
           };
         });
         const expectedUrl='https://mmhvault.com'+route;
         ensure(semantic.count===1 && semantic.type==='WebPage' &&
           semantic.id===expectedUrl+'#page' &&
           semantic.url===expectedUrl && semantic.canonical===expectedUrl &&
           semantic.parent==='https://mmhvault.com/#website' &&
           semantic.about==='https://mmhvault.com/#'+(
             ['/features/','/register/'].includes(route)?'software':'brand') &&
           (['/features/','/register/'].includes(route)||semantic.breadcrumbs===1),
           route+' '+width+'px official site semantic graph '+JSON.stringify(semantic));
       }

       ensure(await page.locator('link[rel="canonical"]').count()===1,
         route+' '+width+'px canonical unique');
       // L1.17 — neither Chinese nor Burmese should be simultaneously
       // rendered in the highlighted bottom summary of an English page.
       // One live paragraph must track the user-selected locale.
       const localized=['/features/','/register/'].includes(route);
       const localizedBlock=page.locator('.lang-summary-localized');
       if(localized){
         ensure(await localizedBlock.count()===1 &&
           await localizedBlock.locator('p').count()===1 &&
           await localizedBlock.locator('p[lang]').count()===0,
           route+' '+width+'px only one language paragraph exists');
         const p=localizedBlock.locator('p');
         ensure((await p.textContent()).trim()===(await p.getAttribute('data-en')) &&
           await p.isVisible(),
           route+' '+width+'px default summary is English only');
       }else{
         ensure(await page.locator('.lang-summary').count()===0,
           route+' has no static bilingual summary');
       }
       if(route==='/business/'){
         ensure(await page.locator('body.business-page').count()===1,
           route+' dedicated concept page, not private business.html');
         ensure(await page.locator('.business-availability').count()===1,
           route+' preview-only status visible');
         ensure(await page.locator('link[rel="canonical"]').getAttribute('href')==='https://mmhvault.com/business/',
           route+' canonical targets own route');
         ensure(await page.locator('header #landing-explore a[href="/business/"]').count()===1,
           route+' Business appears in identical Explore listing');
       }
       if(['/security.html','/privacy.html','/terms.html'].includes(route)){
         ensure(await page.locator('body.public-landing-page.policy-page').count()===1,
           route+' inherits Landing finance brand presentation');
         ensure(await page.locator('article.policy-card').count()===1,
           route+' keeps legal/policy copy in a readable card');
         ensure(await page.locator('.public-footer').count()===1,
           route+' has the shared public footer');
         if([393,1440].includes(width)){
           await page.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}));
           await page.screenshot({path:path.join(screenshots,
             'policy-'+route.slice(1,-5)+'-'+width+'.png'),
             fullPage:false,animations:'disabled'});
         }
       }
       if(['/register/','/features/','/about/','/business/','/security.html','/privacy.html','/terms.html'].includes(route)){
         const header=await page.evaluate(()=>{
           const bar=document.querySelector('header .header-inner').getBoundingClientRect();
           const brand=document.querySelector('header .brand').getBoundingClientRect();
           const nav=document.querySelector('header #primary-nav').getBoundingClientRect();
           const actions=document.querySelector('header .header-actions').getBoundingClientRect();
           return {barHeight:Math.round(bar.height),brandRight:Math.round(brand.right),
             brandTop:Math.round(brand.top),brandBottom:Math.round(brand.bottom),
             navLeft:Math.round(nav.left),navRight:Math.round(nav.right),
             navTop:Math.round(nav.top),navHeight:Math.round(nav.height),
             actionsLeft:Math.round(actions.left),actionsTop:Math.round(actions.top),
             actionsBottom:Math.round(actions.bottom)};
         });
         ensure(header.barHeight<=112&&header.brandRight<=header.actionsLeft+4 &&
           header.brandTop<=header.actionsBottom+8&&header.actionsTop<=header.brandBottom+8,
           route+' '+width+'px header on one row '+JSON.stringify(header));
         const explore=page.locator('header #landing-explore');
         if(width<=1360){
           ensure(await page.locator('header .menu-toggle').isVisible(),
             route+' '+width+'px hamburger visible');
           ensure(!await page.locator('header #primary-nav').isVisible(),
             route+' '+width+'px compact menu starts closed');
           await page.locator('header .menu-toggle').click();
           ensure(await page.locator('header .menu-toggle').getAttribute('aria-expanded')==='true'&&
             await page.locator('header #primary-nav').isVisible(),
             route+' '+width+'px compact navigation opens');
           ensure(await page.locator('header #primary-nav>a[href="/#business"]').isVisible()&&
             await page.locator('header #primary-nav>a[href="/#security"]').isVisible(),
             route+' '+width+'px Business/Security follow Landing sections');
           await explore.locator('summary').click();
           ensure(await explore.evaluate(d=>d.open)&&
             await explore.locator('a[href="/business/"]').isVisible()&&
             await explore.locator('a[href="/features/"]').isVisible(),
             route+' '+width+'px Explore contains public introduction routes');
           await page.keyboard.press('Escape');
           ensure(!await explore.evaluate(d=>d.open),
             route+' '+width+'px Escape closes Explore');
           await page.keyboard.press('Escape');
           ensure(!await page.locator('header #primary-nav').isVisible(),
             route+' '+width+'px Escape closes hamburger');
         }else{
           ensure(await page.locator('header #primary-nav').isVisible()&&
             await page.locator('header #primary-nav>a[href="/#business"]').isVisible(),
             route+' '+width+'px desktop six-item navigation visible');
           ensure(header.brandRight<=header.navLeft+4&&
             header.navRight<=header.actionsLeft+4&&
             header.navHeight<=70&&Math.abs(header.navTop-header.actionsTop)<32,
             route+' '+width+'px no desktop navigation wrap '+JSON.stringify(header));
           await explore.locator('summary').click();
           ensure(await explore.locator('a[href="/about/"]').isVisible(),
             route+' '+width+'px desktop Explore opens');
           await page.keyboard.press('Escape');
           ensure(!await explore.evaluate(d=>d.open),
             route+' '+width+'px desktop Explore Escape');
         }
         if([393,1100,1366,1440].includes(width)){
           await page.screenshot({path:path.join(screenshots,
             'unified-header-'+route.replace(/\W/g,'-')+'-'+width+'.png'),
             fullPage:false,animations:'disabled'});
         }
       }
       if(['/register/','/features/','/about/','/business/'].includes(route)){
         ensure(await page.locator('body.public-landing-page .feature-hero').count()===1,
           route+' inherited premium Landing shell');
         ensure(await page.locator('header .brand-copy').isVisible(),
           route+' shared Landing wordmark is visible');
         ensure(await page.locator('header .header-cta').getAttribute('href')==='/login.html',
           route+' Get Started goes only to existing secure access');
         ensure(await page.locator('.page-breadcrumb a').getAttribute('href')==='/',
           route+' clearly linked as a Landing subpage');
       }
       if(['/register/','/features/','/about/','/business/'].includes(route)&&[320,393,768,1100,1290,1291,1440].includes(width)){
         const trigger=page.locator('#locale-trigger');
         const localeName=page.locator('.locale-active-name');
         if([393,1100,1290,1291,1440].includes(width)){
           await page.screenshot({path:path.join(screenshots,
             route.replaceAll('/','')+'-'+width+'-en.png'),fullPage:true,animations:'disabled'});
         }
         await trigger.click();
         ensure(await trigger.getAttribute('aria-expanded')==='true',route+' language menu opens at '+width);
         await page.locator('#locale-menu button[data-lang="zh"]').click();
         ensure(await localeName.textContent()==='中文' && await page.locator('h1').isVisible(),
           route+' Chinese language updates menu and title');
         if(localized){
           const p=localizedBlock.locator('p');
           ensure((await p.textContent()).trim()===(await p.getAttribute('data-zh')) &&
             await localizedBlock.locator('p').count()===1,
             route+' '+width+'px Chinese selection displays Chinese statement only');
         }
         ensure(await trigger.getAttribute('aria-expanded')==='false',route+' language menu closes on selection');
         await trigger.click();
         await page.locator('#locale-menu button[data-lang="my"]').click();
         ensure(await localeName.textContent()==='မြန်မာ' && await page.locator('h1').isVisible(),
           route+' Burmese language updates menu and title');
         if(localized){
           const p=localizedBlock.locator('p');
           ensure((await p.textContent()).trim()===(await p.getAttribute('data-my')) &&
             await localizedBlock.locator('p').count()===1,
             route+' '+width+'px Burmese selection displays Burmese statement only');
         }
         const localeOverflow=await page.evaluate(()=>{
           const previousY=scrollY;
           scrollTo({left:900,top:previousY,behavior:'instant'});
           const extra=scrollX;
           scrollTo({left:0,top:previousY,behavior:'instant'});
           return {extra,width:innerWidth,document:document.documentElement.scrollWidth};
         });
         if(localeOverflow.extra>2){
           const candidates=await page.evaluate(()=>{
             scrollTo({left:0,top:scrollY,behavior:'instant'});
             return [...document.querySelectorAll('body *')]
             .map(el=>{const r=el.getBoundingClientRect();return {
               tag:el.tagName,cls:typeof el.className==='string'?el.className.slice(0,75):'',
               text:(el.textContent||'').slice(0,55),x:Math.round(r.left),right:Math.round(r.right),
               width:Math.round(r.width),overflow:getComputedStyle(el).overflowX};
             })
             .filter(x=>x.right>innerWidth+3 && x.width>8)
             .sort((a,b)=>b.right-a.right).slice(0,22);
           });
           console.error('PUBLIC LOCALE OVERFLOW '+route+' '+JSON.stringify(candidates));
         }
         ensure(localeOverflow.extra<=2,route+' Burmese locale has no sideways scroll '+JSON.stringify(localeOverflow));
         if(width===393){
           await page.screenshot({path:path.join(screenshots,
             route.replaceAll('/','')+'-'+width+'-my.png'),fullPage:true,animations:'disabled'});
         }
         await page.reload({waitUntil:'load'});
         ensure(await page.locator('.locale-active-name').textContent()==='မြန်မာ',
           route+' language preference persists across reload at '+width);
         if(localized){
           const p=page.locator('.lang-summary-localized>p');
           ensure((await p.textContent()).trim()===(await p.getAttribute('data-my')),
             route+' '+width+'px selected Burmese summary remains after reload');
           await page.locator('#locale-trigger').click();
           await page.locator('#locale-menu button[data-lang="en"]').click();
           ensure((await p.textContent()).trim()===(await p.getAttribute('data-en')) &&
             await page.locator('.lang-summary-localized>p').count()===1,
             route+' '+width+'px switched back to one English statement');
         }
       }
       await ctx.close();
     }
   }

   // L1.18 — animated public pages remain visible, language-neutral and
   // keep reduced-motion as the default fallback in the main viewport loop.
   for(const [route,target] of [
     ['/features/','.grid>.item'],
     ['/security.html','.policy-card']
   ]){
     const ctx=await browser.newContext({
       viewport:{width:393,height:852},reducedMotion:'no-preference'
     });
     const page=await ctx.newPage();
     const errors=[];
     page.on('pageerror',e=>errors.push(e.message));
     await load(page,route,errors);
     ensure(await page.locator('body').evaluate(b=>b.classList.contains('mm-public-motion')),
       route+' unobtrusive public reveal enhancement activates');
     const item=page.locator(target).first();
     ensure(await item.evaluate(e=>e.classList.contains('mm-public-reveal')),
       route+' reveal target registered');
     await item.scrollIntoViewIfNeeded();
     await page.waitForTimeout(850);
     ensure(await item.evaluate(e=>e.classList.contains('mm-public-shown')),
       route+' scrolled card becomes visible');
     ensure((await item.evaluate(e=>Number(getComputedStyle(e).opacity)))>.98,
       route+' full opacity after reveal');
     ensure(errors.length===0,route+' scroll enhancement has no JS exception');
     await ctx.close();
   }

   // L1.12 — end-to-end route consistency: public Security is a first-class
   // branded page, Business is the Landing section, and Home does not leave #top.
   {
     const ctx=await browser.newContext({viewport:{width:1440,height:900},
       reducedMotion:'reduce'});
     const page=await ctx.newPage();
     await page.goto(origin+'/',{waitUntil:'load'});
     await page.locator('#primary-nav > a[href="#business"]').click();
     await page.waitForFunction(()=>location.hash==='#business');
     ensure(new URL(page.url()).pathname==='/' &&
       new URL(page.url()).hash==='#business',
       'Landing Business top navigation stays in the Business showcase');
     await page.locator('#primary-nav > a[href="#security"]').click();
     await page.waitForFunction(()=>location.hash==='#security');
     ensure(new URL(page.url()).pathname==='/' &&
       new URL(page.url()).hash==='#security',
       'Landing Security top navigation stays in the security showcase');
     const explore=page.locator('#landing-explore');
     await explore.locator('summary').click();
     ensure(await explore.evaluate(x=>x.open) &&
       await explore.locator('a[href="./business/"]').isVisible() &&
       await explore.locator('a[href="./security.html"]').isVisible(),
       'Explore independently exposes Business and Security details');
     await page.keyboard.press('Escape');
     ensure(!await explore.evaluate(x=>x.open),
       'Escape closes Explore disclosure');
     await explore.locator('summary').click();
     await explore.locator('a[href="./security.html"]').click();
     await page.waitForURL('**/security.html');
     ensure(await page.locator('body.public-landing-page.policy-page').count()===1,
       'Explore Security Details opens existing public policy');
     await page.locator('header .brand').click();
     await page.waitForURL(url=>url.pathname==='/');
     ensure(new URL(page.url()).pathname==='/' &&
       !new URL(page.url()).hash,'Independent Security Home returns to canonical Landing');
     await page.goto(origin+'/about/',{waitUntil:'load'});
     await page.locator('header #primary-nav>a[href="/#business"]').click();
     await page.waitForURL(url=>url.pathname==='/'&&url.hash==='#business');
     ensure(new URL(page.url()).pathname==='/'&&new URL(page.url()).hash==='#business',
       'About top-level Business opens Landing Business showcase');
     await page.goto(origin+'/about/',{waitUntil:'load'});
     await page.locator('header #landing-explore > summary').click();
     await page.locator('header #landing-explore a[href="/business/"]').click();
     await page.waitForURL('**/business/');
     ensure(new URL(page.url()).pathname==='/business/'&&!new URL(page.url()).hash,
       'About Explore opens independent Business concept');
     ensure(await page.locator('body.public-landing-page.business-page').count()===1,
       'Business route remains its independent introduction page');
     ensure(await page.locator('header #landing-explore a[href="/business/"]').count()===1,
       'Business has matching Explore item on the standalone page');
     await page.locator('.business-hero .action.gold').click();
     await page.waitForFunction(()=>location.hash==='#business-focus');
     ensure(new URL(page.url()).pathname==='/business/',
       'Business concept CTA stays inside Business, not Landing');
     await page.locator('header .brand').click();
     await page.waitForURL(url=>url.pathname==='/');
     ensure(new URL(page.url()).pathname==='/'&&!new URL(page.url()).hash,
       'Business Home returns to clean canonical Landing');
     await page.locator('#landing-explore > summary').click();
     await page.locator('#landing-explore .nav-explore-menu a[href="./business/"]').click();
     await page.waitForURL('**/business/');
     ensure(new URL(page.url()).pathname==='/business/',
       'Landing Explore opens independent Business concept information');
     await page.goto(origin+'/security.html',{waitUntil:'load'});
     await page.setViewportSize({width:393,height:852});
     await page.locator('header .menu-toggle').click();
     await page.locator('header #landing-explore > summary').click();
     await page.locator('header #landing-explore a[href="/business/"]').click();
     await page.waitForURL('**/business/');
     ensure(new URL(page.url()).pathname==='/business/',
       'Security compact Business menu also opens dedicated Business URL');

     // The same information dropdown must work from the mobile hamburger.
     await page.goto(origin+'/',{waitUntil:'load'});
     await page.setViewportSize({width:393,height:852});
     await page.locator('.site-header .menu-toggle').click();
     ensure(await page.locator('#primary-nav > a[href="#business"]').isVisible() &&
       await page.locator('#primary-nav > a[href="#security"]').isVisible(),
       'Mobile Landing Business and Security links are local');
     await page.locator('#landing-explore > summary').click();
     ensure(await page.locator('#landing-explore .nav-explore-menu a[href="./about/"]').isVisible() &&
       await page.locator('#landing-explore .nav-explore-menu a[href="./register/"]').isVisible(),
       'Mobile Explore menu exposes standalone descriptions');
     await page.screenshot({path:path.join(screenshots,'landing-explore-393.png'),fullPage:false,animations:'disabled'});
     await page.locator('#landing-explore .nav-explore-menu a[href="./features/"]').click();
     await page.waitForURL('**/features/');
     ensure(new URL(page.url()).pathname==='/features/',
       'Mobile Explore opens the independent Features page');
     await ctx.close();
   }

      const ctx=await browser.newContext({viewport:{width:393,height:852},reducedMotion:'no-preference'});
   const page=await ctx.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await load(page,'/',errors);
   ensure(await page.evaluate(()=>document.documentElement.classList.contains('mm-motion-active')),
      'Progressive reveal enabled when browser permits motion');
   await page.locator('#features').scrollIntoViewIfNeeded();
   await page.waitForTimeout(850);
   ensure(await page.locator('.mm-shown').count()>0,'Scroll reveal completes after entering viewport');
   ensure(errors.length===0,'Liquid motion produces no JS exceptions');
   await ctx.close();
   console.log('PUBLIC LANDING BROWSER QA PASS: '+widths.length+' Landing viewports, '+
      (publicRoutes.length-1)*4+' public-page viewports, language and state interactions');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
