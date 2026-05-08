/**
 * E2E: Publish control (opens dialog with server build + feed publish).
 */
import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
};

test.describe('Publish button (editor)', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('Publish is disabled when notebook is not saved', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.getByRole('button', { name: 'Email' }).first().click();
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    await page.goto('http://localhost:3000/notebooks/new');
    await page.waitForTimeout(2000);

    const publishButton = page.getByRole('button', { name: /^publish$/i });
    await expect(publishButton).toBeDisabled();
  });

  test('Publish opens dialog for saved notebook', async ({ page, context }) => {
    await context.request.post('http://localhost:8000/api/v1/auth/login', {
      data: { email: TEST_USER.email, password: TEST_USER.password },
    });

    const notebookResponse = await context.request.post('http://localhost:8000/api/v1/notebooks', {
      headers: { 'Content-Type': 'application/json' },
      data: { title: 'Publish Dialog Test', cells: [] },
    });
    const notebookData = await notebookResponse.json();

    await page.goto(`http://localhost:3000/notebooks/${notebookData.id}/edit`);
    await page.waitForTimeout(3000);

    await page.getByRole('button', { name: /^publish$/i }).click();
    await expect(page.getByRole('heading', { name: /publish to feed/i })).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('button', { name: /^publish$/i })).toBeVisible();
  });
});
