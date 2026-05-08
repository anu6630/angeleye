const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Enable console logging
  page.on('console', msg => {
    console.log('BROWSER:', msg.text());
  });

  page.on('pageerror', error => {
    console.error('BROWSER ERROR:', error.message);
  });

  try {
    // Login first using the login page
    console.log('🔐 Logging in...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click Email tab
    const emailTab = await page.$('button:has-text("Email")');
    if (emailTab) {
      await emailTab.click();
      await page.waitForTimeout(1000);
    }

    // Fill in credentials
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');

    // Submit login
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    console.log('✅ Logged in, current URL:', page.url());

    // Navigate to notebook edit page
    console.log('📝 Navigating to notebook edit page...');
    await page.goto('http://localhost:3000/notebooks/12/edit');

    // Wait and observe
    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(10000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/manual-edit-page.png' });
    console.log('📸 Screenshot saved to test-results/manual-edit-page.png');

    // Check page state
    const pageState = await page.evaluate(() => {
      return {
        url: window.location.href,
        hasLoading: document.body.innerText.includes('Loading'),
        hasBackButton: document.body.innerText.includes('Back to My Notebooks'),
        hasCompileButton: document.body.innerText.includes('Compile'),
        bodyText: document.body.innerText.substring(0, 500)
      };
    });

    console.log('📊 Page State:', JSON.stringify(pageState, null, 2));

    await page.waitForTimeout(5000);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
})();
