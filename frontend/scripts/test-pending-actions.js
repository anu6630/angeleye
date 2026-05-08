const { chromium } = require('playwright');

const EMAIL = 'follow_a_1778233423@example.com';
const PASSWORD = 'Passw0rd123!';

async function loginWithEmail(page) {
  await page.waitForURL(/\/login/, { timeout: 10000 });
  await page.getByRole('button', { name: 'Email' }).click();
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

async function getPending(page) {
  return await page.evaluate(() => localStorage.getItem('pending-auth-action'));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = {};

  // LIKE flow
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('http://localhost:3000/notebooks/4', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^Like$/ }).click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    const pendingBefore = await getPending(page);
    await loginWithEmail(page);
    await page.waitForURL(/\/notebooks\/4/, { timeout: 15000 });
    await page.waitForTimeout(1000);
    const pendingAfter = await getPending(page);
    report.like = {
      redirectedToLogin: true,
      pendingStored: !!pendingBefore,
      pendingType: pendingBefore ? JSON.parse(pendingBefore).type : null,
      returnedToOrigin: page.url().includes('/notebooks/4'),
      pendingCleared: pendingAfter === null,
    };
    await context.close();
  }

  // FOLLOW flow
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('http://localhost:3000/notebooks/4', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Follow/i }).click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    const pendingBefore = await getPending(page);
    await loginWithEmail(page);
    await page.waitForURL(/\/notebooks\/4/, { timeout: 15000 });
    await page.waitForTimeout(1000);
    const pendingAfter = await getPending(page);
    report.follow = {
      redirectedToLogin: true,
      pendingStored: !!pendingBefore,
      pendingType: pendingBefore ? JSON.parse(pendingBefore).type : null,
      returnedToOrigin: page.url().includes('/notebooks/4'),
      pendingCleared: pendingAfter === null,
    };
    await context.close();
  }

  // FORK flow
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('http://localhost:3000/notebooks/4', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^Fork$/ }).click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    const pendingBefore = await getPending(page);
    await loginWithEmail(page);
    await page.waitForURL(/\/notebooks\/\d+\/edit/, { timeout: 20000 });
    const finalUrl = page.url();
    const pendingAfter = await getPending(page);
    report.fork = {
      redirectedToLogin: true,
      pendingStored: !!pendingBefore,
      pendingType: pendingBefore ? JSON.parse(pendingBefore).type : null,
      redirectedToForkEdit: /\/notebooks\/\d+\/edit/.test(finalUrl),
      finalUrl,
      pendingCleared: pendingAfter === null,
    };
    await context.close();
  }

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})();
