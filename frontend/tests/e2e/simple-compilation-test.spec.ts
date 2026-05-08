import { test, expect } from '@playwright/test';

/** Debug: merged Publish (server build + feed) from the editor. */
test('Debug publish workflow (build + feed)', async ({ page }) => {
  const email = 'test@example.com';
  const password = 'testpassword123';

  await page.goto('http://localhost:3000/login');
  await expect(page.locator('h1')).toContainText('Welcome to NotebookSocial');
  await page.click('button:has-text("Email")');
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/feed');

  await page.goto('http://localhost:3000/notebooks/25/edit');
  await page.waitForTimeout(3000);

  if (page.url().includes('/login')) {
    throw new Error('Authentication failed, redirected to login');
  }

  await page.waitForSelector('textarea, [contenteditable="true"]', { timeout: 10000 });

  await page.getByRole('button', { name: /^publish$/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.getByRole('dialog').getByRole('button', { name: /^publish$/i }).click();

  await expect(page.getByRole('dialog')).toContainText(/published to the social feed/i, {
    timeout: 120_000,
  });

  const finalState = await page.evaluate(() => {
    const store = (window as unknown as { useCompilationStore?: { getState?: () => unknown } })
      .useCompilationStore?.getState?.();
    return store ?? null;
  });
  console.log('📊 Final compilation state:', finalState);

  await page.screenshot({ path: 'test-results/publish-dialog-screenshot.png' });
});
