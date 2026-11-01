// MMHVAULT L1.26 — read-only LIVE production HTTP observability.
// This audit is informational before go-live: a missing /robots.txt is expected
// until the coordinated Landing+SEO release. Never access private account APIs.
// Run from repo root: node landing-assets/release-candidate/audit-public-http.mjs
const origin = 'https://mmhvault.com';
const targets = [
  {path:'/',kind:'home'},
  {path:'/robots.txt',kind:'robots'},
  {path:'/sitemap.xml',kind:'sitemap'},
  {path:'/images/mmhvault-logo-transparent.png',kind:'logo'},
  {path:'/login.html',kind:'login'},
  {path:'/mmh-manifest-v2.webmanifest',kind:'manifest'}
];
const audit = async ({path,kind}) => {
  try {
    const response = await fetch(origin + path, {
      method:'GET', redirect:'follow',
      signal:AbortSignal.timeout(9000),
      headers:{'Accept':'text/html,application/xml,text/plain,application/manifest+json,image/png,*/*'}
    });
    const type = response.headers.get('content-type') || '';
    const robotsHeader = response.headers.get('x-robots-tag') || '';
    const finalPath = new URL(response.url).pathname;
    let payload = '';
    if (kind === 'logo') {
      // Do not download image bytes in QA.
      await response.body?.cancel();
    } else {
      payload = (await response.text()).slice(0,210000);
    }
    const result = {
      path,
      status:response.status,
      contentType:type.split(';')[0],
      finalPath,
      xRobotsTag:robotsHeader || undefined
    };
    if (kind === 'home') {
      result.oldHomeTitle = payload.includes('MMHVAULT · Personal Finance Workspace');
      result.landingTitle = payload.includes('MMHVAULT | Personal Finance & Life Planning');
      result.unexpectedNoindex = /<meta[^>]*name=["']robots["'][^>]*noindex/i.test(payload);
    }
    if (kind === 'robots') {
      result.hasUserAgent = /(^|\n)User-agent:/i.test(payload);
      result.hasSitemapLink = payload.includes('https://mmhvault.com/sitemap.xml');
      result.github404 = payload.includes('Page not found · GitHub Pages');
    }
    if (kind === 'sitemap') {
      result.hasUrlset = /<urlset[\s>]/i.test(payload);
      result.canonicalHome = /<loc>\s*https:\/\/mmhvault\.com\/\s*<\/loc>/i.test(payload);
      result.privateUrlDetected = /<loc>[^<]*\/(?:app|login|n10-qa)\.html/i.test(payload);
    }
    if (kind === 'logo') result.isPng = /^image\/png/i.test(type);
    if (kind === 'login') result.noindex = /<meta[^>]*name=["']robots["'][^>]*noindex/i.test(payload)||/noindex/i.test(robotsHeader);
    if (kind === 'manifest') {
      try {
        const data = JSON.parse(payload);
        result.startUrl = data.start_url;
        result.scope = data.scope;
        result.standalone = data.display === 'standalone';
      } catch (_) { result.validJson = false; }
    }
    return result;
  } catch (e) {
    return {path,unavailable:String(e?.message||e).slice(0,150)};
  }
};
const results = await Promise.all(targets.map(audit));
for (const result of results) console.log('[PUBLIC-HTTP] ' + JSON.stringify(result));
const inaccessible = results.filter(r=>r.unavailable).length;
console.log('[PUBLIC-HTTP] INFO: audited ' + results.length + ' public endpoints; ' + inaccessible +
  ' unavailable; never a substitute for production release smoke tests.');
// Never fail the staging preview on an external HTTP error or expected robots 404.
