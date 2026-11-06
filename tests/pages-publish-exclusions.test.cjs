// Read-only Pages exclusion contract. Does not delete or deploy files.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const config = fs.readFileSync('_config.yml', 'utf8');
const excludes = new Set([...config.matchAll(/^  - ([^#\n]+)$/gm)].map(m => m[1].trim()));
const forbidden = [
  'analytics-worker/src', 'analytics-worker/test',
  'analytics-worker/README.md', 'analytics-worker/wrangler.toml',
  'docs', 'email-templates', 'security', 'tests', 'tools',
  'pwa-icon-diagnostic-20261030', 'n10-a7-53-qa.html',
  'n10-qa.html', 'username-preview.html', 'username-staging.html',
  'js/mmhvault-n10-a7-53-qa.js'
];
const essential = [
  'index.html', 'login.html', 'app.html', 'admin.html', 'admin-analytics.html',
  'analytics-worker/ui/trend-chart.js', 'analytics-worker/ui/breakdowns.js',
  'robots.txt', 'sitemap.xml', 'CNAME', 'mmh-manifest-v2.webmanifest',
  'mmh-manifest.webmanifest', 'sw.js', 'mmh-push-sw.js',
  'css', 'js', 'images', 'landing-assets', 'features', 'about', 'business',
  'register', 'security.html', 'privacy.html', 'terms.html', 'username-setup.html'
];
assert.match(config, /^exclude:\s*$/m);
for (const path of forbidden) {
  assert(excludes.has(path), 'Missing internal publish exclusion: ' + path);
  assert(fs.existsSync(path), 'Missing source path, review exclusion: ' + path);
}
for (const path of essential) {
  assert(fs.existsSync(path), 'Essential production path missing: ' + path);
  assert(!excludes.has(path), 'Essential production path is excluded: ' + path);
}
assert(!excludes.has('analytics-worker'), 'Entire analytics-worker directory must NOT be excluded');
const adminAnalytics = fs.readFileSync('admin-analytics.html','utf8');
for (const path of essential.filter(p => p.startsWith('analytics-worker/ui/'))) {
  assert(adminAnalytics.includes('/' + path), 'Production Analytics reference missing: ' + path);
}
console.log('Pages exclusions and Admin Analytics JS dependency contract PASS');
