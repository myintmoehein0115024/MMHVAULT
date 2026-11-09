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
  'js/mmhvault-n10-a7-53-qa.js',
  'landing-assets/landing-browser-check.cjs',
  'landing-assets/landing-release-check.cjs',
  'landing-assets/landing-webkit-check.cjs'
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
// Retired QA and email template assets must stay absent from the Public repository.
const retiredPublicArtifacts = new Set([
  'email-templates',
  'pwa-icon-diagnostic-20261030',
  'n10-a7-53-qa.html',
  'n10-qa.html',
  'username-preview.html',
  'username-staging.html',
  'js/mmhvault-n10-a7-53-qa.js'
]);
for (const path of forbidden) {
  assert(excludes.has(path), 'Missing internal publish exclusion: ' + path);
  if (retiredPublicArtifacts.has(path)) {
    assert(!fs.existsSync(path), 'Retired public internal artifact was reintroduced: ' + path);
  } else {
    assert(fs.existsSync(path), 'Missing source path, review exclusion: ' + path);
  }
}
// Audit-only Markdown was migrated to the Private source repository.
// Keep docs/sql files that are still named in APP financial CI path filters.
const retiredPublicDocs = [
  'docs/APP_V11_FINANCE_LINK_AUDIT_20261102.md',
  'docs/N10-A7.90-MFA-SERVER-READINESS.md',
  'docs/N10_ACCOUNT_SECURITY_STATUS_HOTFIX_20261031.md',
  'docs/N10_PRODUCTION_RELEASE_20261031.md',
  'docs/website-analytics-v2.md'
];
for (const path of retiredPublicDocs) {
  assert(!fs.existsSync(path), 'Retired public internal document was reintroduced: ' + path);
}
for (const path of [
  'docs/sql/app-v11-account-images-PRIVATE-REVIEW-ONLY.sql',
  'docs/sql/app-v11-account-link-audit-readonly.sql',
  'docs/sql/app-v11-admin-member-transaction-activity-REVIEW-ONLY.sql'
]) {
  assert(fs.existsSync(path), 'Required financial review SQL path missing: ' + path);
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
