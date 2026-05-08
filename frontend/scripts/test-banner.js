const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 500 } });
  const page = await context.newPage();
  const report = { steps: [] };
  const log = (step, data) => report.steps.push({ step, ...data });

  try {
    // 1. Listing card displays banner thumbnail (notebook 8 from smoke test)
    await page.goto('http://localhost:3000/feed', { waitUntil: 'networkidle' });
    const card8 = page.locator('a[href="/notebooks/8"]').first();
    await card8.waitFor({ timeout: 10000 });
    const cardImg = card8.locator('img[loading="lazy"]').first();
    const cardImgVisible = await cardImg.isVisible().catch(() => false);
    log('feed_card_thumbnail_present', { visible: cardImgVisible });
    if (cardImgVisible) {
      const src = await cardImg.getAttribute('src');
      log('feed_card_thumbnail_src', { src });
    }
    await page.screenshot({ path: '/tmp/banner-feed.png', fullPage: false });

    // 2. Open the post page; banner should render at top.
    await page.goto('http://localhost:3000/notebooks/8', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const fullBanner = page.locator('section img').first();
    const fullSrc = await fullBanner.getAttribute('src').catch(() => null);
    log('post_full_banner_src', { src: fullSrc });
    await page.screenshot({ path: '/tmp/banner-post-top.png', fullPage: false });

    // 3. Sticky thin strip should NOT be visible at top.
    const stripBefore = await page.evaluate(() => {
      const sticky = Array.from(document.querySelectorAll('div.sticky')).find(
        (el) => /h-12/.test(el.className) && /banner/.test((el.querySelector('img')?.src) || '')
      ) || Array.from(document.querySelectorAll('div.sticky'))
        .filter((el) => el.querySelector('img'))
        .find((el) => /banner/.test(el.querySelector('img').src));
      if (!sticky) return null;
      const rect = sticky.getBoundingClientRect();
      const style = getComputedStyle(sticky);
      return { height: rect.height, opacity: style.opacity };
    });
    log('strip_state_before_scroll', stripBefore || { note: 'not found' });

    // 4. Scroll down past the banner (~600px) and re-check.
    await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'instant' }));
    await page.waitForTimeout(800);
    const stripAfter = await page.evaluate(() => {
      const sticky = Array.from(document.querySelectorAll('div.sticky'))
        .filter((el) => el.querySelector('img'))
        .find((el) => /banner/.test(el.querySelector('img').src));
      if (!sticky) return null;
      const rect = sticky.getBoundingClientRect();
      const style = getComputedStyle(sticky);
      return { height: rect.height, opacity: style.opacity, top: rect.top };
    });
    log('strip_state_after_scroll', stripAfter || { note: 'not found' });
    await page.screenshot({ path: '/tmp/banner-post-scrolled.png', fullPage: false });

    // 5. Scroll back to top; strip should hide.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(800);
    const stripBack = await page.evaluate(() => {
      const sticky = Array.from(document.querySelectorAll('div.sticky'))
        .filter((el) => el.querySelector('img'))
        .find((el) => /banner/.test(el.querySelector('img').src));
      if (!sticky) return null;
      const rect = sticky.getBoundingClientRect();
      const style = getComputedStyle(sticky);
      return { height: rect.height, opacity: style.opacity };
    });
    log('strip_state_back_at_top', stripBack || { note: 'not found' });

    console.log(JSON.stringify(report, null, 2));
  } catch (e) {
    console.error('FAILED', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
