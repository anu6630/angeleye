const { chromium } = require('playwright');

const EMAIL = `editor_${Date.now()}@example.com`;
const USERNAME = `editor${Date.now()}`;
const PASSWORD = 'TestPass123!';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('PAGE_ERR>', m.text());
  });
  const out = [];

  try {
    // Register a fresh user through the embedded form so auth-store stays in sync.
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Email' }).click();
    await page.getByText(/Need an account\? Sign up/).click();
    await page.getByLabel('Username').fill(USERNAME);
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await page.waitForTimeout(3000);
    out.push({ step: 'after_register_click', url: page.url() });
    if (/\/login/.test(page.url())) {
      // Try logging in instead — maybe user already existed.
      const errorText = await page.locator('[role="alert"]').first().textContent().catch(() => null);
      out.push({ step: 'register_failed', error: errorText });
    }
    if (!/\/login/.test(page.url())) out.push({ step: 'registered', url: page.url() });

    // Open a fresh notebook editor.
    await page.goto('http://localhost:3000/notebooks/new', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const initialDisabled = await page
      .locator('text=Save the notebook to enable banner')
      .first()
      .isVisible()
      .catch(() => false);
    out.push({ step: 'editor_new_disabled_label', visible: initialDisabled });

    // Save (creates the notebook).
    await page.getByPlaceholder('Untitled notebook').fill('Banner Editor Test');
    await page.getByRole('button', { name: /^Save$/ }).click();
    // Wait until the editor knows it has a notebook id (banner panel becomes enabled).
    await page.waitForFunction(
      () => !!document.querySelector('button')?.parentElement?.innerHTML?.includes('Add a banner'),
      null,
      { timeout: 12000 },
    ).catch(() => null);
    await page.waitForTimeout(1500);

    const enabledLabel = await page
      .locator('text=Add a banner')
      .first()
      .isVisible()
      .catch(() => false);
    out.push({ step: 'editor_loaded_add_banner_visible', visible: enabledLabel });
    await page.screenshot({ path: '/tmp/banner-editor-empty.png' });

    // Upload via the hidden input.
    const fileInput = page.locator('input[type="file"][accept*="webp"]');
    await fileInput.setInputFiles('/tmp/valid.jpg');
    await page.waitForSelector('button:has-text("Replace")', { timeout: 10000 });
    out.push({ step: 'banner_uploaded_replace_visible', visible: true });
    await page.screenshot({ path: '/tmp/banner-editor-uploaded.png' });

    // Remove the banner.
    await page.getByRole('button', { name: /Remove/ }).click();
    await page.waitForSelector('text=Add a banner', { timeout: 5000 });
    out.push({ step: 'banner_removed', visible: true });

    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    console.error('FAIL', e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
