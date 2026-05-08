const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on('console', (msg) => console.log('PAGE>', msg.type(), msg.text()));

  await page.goto('http://localhost:3000/notebooks/8', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const layout = await page.evaluate(() => {
    const sticky = Array.from(document.querySelectorAll('div.sticky'))
      .filter((el) => el.querySelector('img'))
      .find((el) => /\/banner/.test(el.querySelector('img').src));
    const fullSection = document.querySelector('section img');
    const sentinel = document.querySelector('div[aria-hidden="true"][class*="-mt-2"]');
    const scrollMax = document.documentElement.scrollHeight;
    return {
      foundSticky: !!sticky,
      stickyClasses: sticky?.className,
      fullSectionTop: fullSection?.getBoundingClientRect().top,
      fullSectionBottom: fullSection?.getBoundingClientRect().bottom,
      sentinelTop: sentinel?.getBoundingClientRect().top,
      scrollMax,
    };
  });
  console.log('LAYOUT_INITIAL', JSON.stringify(layout, null, 2));

  await page.evaluate(() => window.scrollTo({ top: 1000, behavior: 'instant' }));
  await page.waitForTimeout(500);

  const layoutScrolled = await page.evaluate(() => {
    const sticky = Array.from(document.querySelectorAll('div.sticky'))
      .filter((el) => el.querySelector('img'))
      .find((el) => /\/banner/.test(el.querySelector('img').src));
    const sentinel = document.querySelector('div[aria-hidden="true"][class*="-mt-2"]');
    const rect = sticky?.getBoundingClientRect();
    const computed = sticky ? getComputedStyle(sticky) : null;
    return {
      sentinelTopAfterScroll: sentinel?.getBoundingClientRect().top,
      stickyClasses: sticky?.className,
      stickyHeightAttr: rect?.height,
      stickyComputedHeight: computed?.height,
      stickyOpacity: computed?.opacity,
    };
  });
  console.log('LAYOUT_SCROLLED', JSON.stringify(layoutScrolled, null, 2));

  await browser.close();
})();
