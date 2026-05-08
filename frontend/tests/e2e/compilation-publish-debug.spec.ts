import { test, expect } from '@playwright/test';

test.describe('Compilation to Publish Debug Test', () => {
  const email = 'test@example.com';
  const password = 'TestPassword123!';

  test.beforeEach(async ({ page, context }) => {
    // Enable detailed console logging
    context.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warn') {
        console.log(`[Browser ${msg.type()}]:`, msg.text());
      }
    });

    // Navigate to login page
    await page.goto('http://localhost:3000/login');

    // Wait for login page to load
    await expect(page.locator('h1')).toContainText('Welcome to NotebookSocial');

    // Click Email tab to switch to email/password form
    await page.click('button:has-text("Email")');

    // Wait for email form to appear
    await page.waitForSelector('input[type="email"]');

    // Fill in credentials
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for redirect to feed page (after successful login)
    await page.waitForURL('**/feed');
  });

  test('Debug merged publish workflow', async ({ page }) => {
    await page.goto('http://localhost:3000/notebooks/25/edit');
    await page.getByPlaceholder(/untitled notebook/i).waitFor({ timeout: 15000 });
    console.log('✅ Notebook editor loaded');

    await page.getByRole('button', { name: /^publish$/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('dialog').getByRole('button', { name: /^publish$/i }).click();

    await expect(page.getByRole('dialog')).toContainText(/published to the social feed/i, {
      timeout: 120_000,
    });

    await page.screenshot({ path: 'test-results/publish-dialog-screenshot.png' });
  });

  test('Direct store state inspection', async ({ page }) => {
    // Navigate to notebook edit page
    await page.goto('http://localhost:3000/notebooks/25/edit');

    // Wait for editor to load
    await page.getByPlaceholder(/untitled notebook/i).waitFor({ timeout: 15000 });

    await page.addInitScript(() => {
      (window as unknown as { inspectCompilationStore?: () => unknown }).inspectCompilationStore =
        () => (window as unknown as { useCompilationStore?: { getState?: () => unknown } })
          .useCompilationStore?.getState?.();
    });

    await page.reload();
    await page.getByPlaceholder(/untitled notebook/i).waitFor({ timeout: 15000 });

    // Now we can inspect the store
    const storeState = await page.evaluate(() => {
      // @ts-ignore
      return window.inspectCompilationStore?.();
    });

    console.log('📊 Store state:', storeState);
    expect(storeState).toBeDefined();
  });
});
