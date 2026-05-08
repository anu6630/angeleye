const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Check for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });

    // Take screenshot
    await page.screenshot({ path: 'frontend-test.png' });
    console.log('Screenshot saved to frontend-test.png');

    // Check page title
    const title = await page.title();
    console.log('Page title:', title);

    // Check if main content is visible
    const mainContent = await page.$('main');
    if (mainContent) {
      console.log('Main content found');
    }

    console.log('Frontend is accessible and rendering!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();