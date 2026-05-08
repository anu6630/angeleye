/* eslint-disable */
const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2] || 'http://localhost:3000/notebooks/5';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleMessages = [];
  page.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);

  const data = await page.evaluate(() => {
    const iframe = document.querySelector('iframe[title*="output"], iframe[title*="source"]');
    if (!iframe || !iframe.contentDocument) {
      return { iframe: false };
    }
    const doc = iframe.contentDocument;
    const cspMeta = doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const imgs = Array.from(doc.querySelectorAll('img'));
    const summary = imgs.map((el) => ({
      src: (el.getAttribute('src') || '').slice(0, 120),
      width: el.getAttribute('width') || null,
      naturalWidth: el.naturalWidth,
      naturalHeight: el.naturalHeight,
      complete: el.complete,
      isData: (el.getAttribute('src') || '').startsWith('data:'),
      isLocal: !((el.getAttribute('src') || '').startsWith('http')),
    }));
    return {
      iframe: true,
      iframeHeight: iframe.style.height || null,
      cspContent: cspMeta ? cspMeta.getAttribute('content') : null,
      imgCount: imgs.length,
      images: summary,
    };
  });

  await page.screenshot({ path: '/tmp/image-asset-test.png', fullPage: true });

  // Surface only CSP-related console messages for clarity
  const cspMsgs = consoleMessages.filter((m) =>
    /Content Security Policy|Refused to load the image|csp/i.test(m.text)
  );

  console.log(JSON.stringify({ data, cspConsole: cspMsgs.slice(0, 8) }, null, 2));

  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
