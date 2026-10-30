const { test, expect } = require('@playwright/test');

// Browser-only, synthetic UI testing. Never contact production Auth or databases.
const BASE = 'http://127.0.0.1:8765/login.html';
const WORDS = ['amber','birch','canyon','dawn','ember','forest','glacier','harbor','island','jasmine'];
const SUPABASE_MOCK = `
window.supabase = { createClient: () => ({
  auth: {
    onAuthStateChange: () => ({data:{subscription:{unsubscribe(){}}}}),
    getSession: async () => ({data:{session:null},error:null}),
    getUser: async () => ({data:{user:null},error:null}),
    signOut: async () => ({error:null}),
    mfa: {
      getAuthenticatorAssuranceLevel: async () => ({data:{currentLevel:'aal1',nextLevel:'aal1'},error:null}),
      listFactors: async () => ({data:{totp:[]},error:null})
    }
  }
}) };
`;
const CAPTCHA_MOCK = `
window.turnstile = {
  render: (_el,opts) => {
    Promise.resolve().then(() => opts.callback?.('synthetic-captcha-token-ui-only'));
    return 1;
  },
  remove: () => {}
};
`;

async function openLocalPage(page) {
  await page.route('**/cdn.jsdelivr.net/**', route =>
    route.fulfill({status:200,contentType:'application/javascript',body:SUPABASE_MOCK}));
  await page.route('**/challenges.cloudflare.com/**', route =>
    route.fulfill({status:200,contentType:'application/javascript',body:CAPTCHA_MOCK}));
  await page.route('**/*.supabase.co/**', route => {
    const u = new URL(route.request().url());
    if (u.pathname.endsWith('/functions/v1/mmh-n10a769-username')) {
      const request = route.request().postDataJSON() || {};
      let response = {code:'preflight_ok',production:true,enabled:true,qa_only:false};
      if (request.action === 'prepare_signup') {
        response = {
          code:'phrase_prepared',
          recovery_words:WORDS,
          ticket:'11111111-1111-4111-8111-111111111111'
        };
      } else if (request.action && request.action !== 'preflight') {
        response = {code:'synthetic_ui_only'};
      }
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});
    }
    return route.abort('blockedbyclient');
  });
  await page.goto(BASE, {waitUntil:'domcontentloaded'});
  await expect(page.locator('#smartRecovery')).toBeVisible();
}

async function assertWithinViewport(page, selector, viewportWidth) {
  const position = await page.locator(selector).evaluate(el => {
    const box = el.getBoundingClientRect();
    return {left:box.left,right:box.right,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};
  });
  expect(position.left, selector + ' left overflow').toBeGreaterThanOrEqual(-2);
  expect(position.right, selector + ' right overflow').toBeLessThanOrEqual(viewportWidth+2);
  expect(position.scrollWidth, selector + ' horizontal content overflow')
    .toBeLessThanOrEqual(position.clientWidth+3);
}

for (const viewport of [{width:390,height:844},{width:1440,height:900}]) {
  test('recovery login dialog is responsive: ' + viewport.width, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openLocalPage(page);
    await page.locator('#smartRecovery').click();
    const overlay = page.locator('#mmhN10RecoveryLoginOverlay');
    await expect(overlay).toBeVisible();
    await expect(page.locator('#mmhN10RecoveryLoginPanel [data-a769-word]')).toHaveCount(10);
    await assertWithinViewport(page,'#mmhN10RecoveryLoginPanel',viewport.width);
    await assertWithinViewport(page,'#mmhN10RecoveryLoginPanel .mmh-a769-word-inputs',viewport.width);
    await page.locator('#mmhN10RecoveryClose').click();
    await expect(overlay).not.toBeVisible();
  });

  test('MFA challenge remains isolated and accessible: ' + viewport.width, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openLocalPage(page);
    await page.evaluate(() => mmhShowMfaChallengeV783('11111111-1111-4111-8111-111111111111'));
    const dialog = page.locator('#mmhMfaDialogV783');
    await expect(dialog).toBeVisible();
    await assertWithinViewport(page,'#mmhMfaDialogV783 .n10-mfa-sheet',viewport.width);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await page.locator('#mmhMfaCodeV783').fill('123');
    await page.locator('#mmhMfaDialogV783 [data-mfa-submit]').click();
    await expect(dialog.locator('[data-mfa-status]')).toContainText(/six digits|六位/);
  });

  test('ten-word signup backup dialog stays usable: ' + viewport.width, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openLocalPage(page);
    await page.locator('#authTabs [data-target="signup"]').click();
    await page.locator('#signup [data-mmh-a756-signup-method="username"]').click();
    await page.locator('#mmhA756Name').fill('qa_visualtest');
    await page.locator('#mmhA756Password').fill('visualpass123');
    await page.locator('#mmhA756Confirm').fill('visualpass123');
    await page.locator('#mmhA756Terms').check();
    await expect(page.locator('#mmhA756Submit')).toBeEnabled();
    await page.locator('#mmhA756Submit').click();
    const dialog = page.locator('#mmhN10RecoveryDialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.mmh-a769-word')).toHaveCount(10);
    await assertWithinViewport(page,'#mmhN10RecoveryPanel',viewport.width);
    await assertWithinViewport(page,'#mmhN10RecoveryPanel .mmh-a769-words',viewport.width);
    const confirm = dialog.locator('#mmhA769ModalConfirm');
    await expect(confirm).toBeDisabled();
    await dialog.locator('#mmhA769BackupAgree').check();
    await expect(confirm).toBeEnabled();
    // Do not submit the registration; this is only an offline modal test.
  });
}
