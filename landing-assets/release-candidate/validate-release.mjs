// MMHVAULT L1.25 — Safe static release-candidate assertions.
// Run: node landing-assets/release-candidate/validate-release.mjs
// No external calls, secrets, network requests or production writes.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const staged = read('landing-assets/release-candidate/index.html');
const preview = read('landing-preview.html');
const mainRoot = read('index.html');
const login = read('login.html');
const sitemap = read('sitemap.xml');
const robots = read('landing-assets/release-candidate/robots.txt');
const oldManifest = JSON.parse(read('mmh-manifest-v2.webmanifest'));
const newManifest = JSON.parse(read('landing-assets/release-candidate/mmh-manifest-v2.webmanifest'));

let count = 0;
const check = (label, test) => {
  assert.ok(test, label);
  count++;
  process.stdout.write('PASS: ' + label + '\n');
};
const n10Recovery = html => {
  const from = html.indexOf('<script id="mmh-n10-recovery-error-route">');
  assert.ok(from >= 0, 'N10 recovery handler missing');
  const to = html.indexOf('</script>', from);
  assert.ok(to > from, 'N10 recovery handler unterminated');
  return html.slice(from, to + '</script>'.length);
};

check('Preview stays noindex', /name="robots" content="noindex, nofollow, noarchive"/.test(preview));
check('Production candidate has no noindex', !/<meta[^>]+name="robots"[^>]+noindex/i.test(staged));
check('Correct official brand title', staged.includes('<title>MMHVAULT | Personal Finance & Life Planning</title>'));
check('Correct English description', staged.includes('MMHVAULT is a private personal finance and life planning workspace.'));
check('Upcoming Life Planner accurately qualified', staged.includes('upcoming schedules') && staged.includes('in development.'));
check('Exactly one canonical URL', (staged.match(/<link rel="canonical"/g) || []).length === 1 && staged.includes('href="https://mmhvault.com/"'));
check('OpenGraph brand identity and URL', staged.includes('property="og:site_name" content="MMHVAULT"') && staged.includes('property="og:url" content="https://mmhvault.com/"'));
const ldText = (staged.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1];
check('Valid JSON-LD source present', Boolean(ldText));
const schema = JSON.parse(ldText);
const graph = schema['@graph'] || [];
check('WebSite structured data matches domain', graph.some(x => x['@type'] === 'WebSite' && x.name === 'MMHVAULT' && x.url === 'https://mmhvault.com/'));
check('Organization data matches official brand', graph.some(x => x['@type'] === 'Organization' && x.name === 'MMHVAULT'));
check('Brand logo exists in repo', existsSync('images/mmhvault-logo-transparent.png') && staged.includes('mmhvault-logo-transparent.png'));
check('N10 recovery handler is unchanged', n10Recovery(mainRoot) === n10Recovery(staged));
check('Recovery redirects only known expired code', n10Recovery(staged).includes("'otp_expired'") && n10Recovery(staged).includes("'recovery_error'"));
check('Secure login target is retained', staged.includes('href="./login.html"') && staged.includes('href="./mmh-manifest-v2.webmanifest"'));
check('Login itself stays noindex', /name="robots" content="noindex,nofollow,noarchive"/.test(login));
check('Login auth flow still verifies user before redirect', login.includes('verifiedRedirectInFlightV946') && login.includes('getSession()') && login.includes('getAuthenticatorAssuranceLevel()'));
check('Login routing is allowlisted', login.includes("next==='business.html'||next==='username-setup.html'?next:'app.html'"));
check('Only PWA manifest start_url changes', (() => { const clone = { ...newManifest, start_url: oldManifest.start_url }; return JSON.stringify(clone) === JSON.stringify(oldManifest); })());
check('New standalone start_url targets Login', newManifest.start_url === './login.html?source=pwa&install=v2');
check('Current production manifest is not changed here', oldManifest.start_url === './app.html?source=pwa&install=v2');
check('Public sitemap includes the homepage', sitemap.includes('<loc>https://mmhvault.com/</loc>'));
check('Sitemap has no private login/app links', !/<loc>[^<]*\/(?:app|login|n10-qa)\.html/.test(sitemap));
check('Robots draft allows public homepage', robots.includes('User-agent: *') && robots.includes('Allow: /'));
check('Robots draft references canonical sitemap', robots.includes('Sitemap: https://mmhvault.com/sitemap.xml'));
check('Mobile registration and login links both exist', staged.includes('mobile-nav-auth-signin') && staged.includes('mobile-nav-auth-signup'));
check('No account authorization embedded in public Landing', !staged.includes('supabase.createClient') && !staged.includes('SUPABASE_SERVICE_ROLE_KEY'));
check('Fixed EN/ZH/MY Hero copy preserved', ['YOUR MONEY. YOUR DIRECTION.', '让财务更清晰，让未来更有方向。', 'ငွေကြေးကို ပိုမိုရှင်းလင်းစွာ သိမြင်ပြီး အနာဂတ်ကို ရည်ရွယ်ချက်ရှိရှိ စီမံပါ။'].every(x => staged.includes(x)));
check('Existing Landing stylesheet available', existsSync('landing-assets/landing.css') && staged.includes('./landing-assets/landing.css'));
console.log('MMHVAULT L1.25 PRE-RELEASE: ' + count + '/' + count + ' static checks PASS (not a substitute for device/production QA).');
