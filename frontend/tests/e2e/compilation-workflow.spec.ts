import { test, expect } from '@playwright/test';

test.describe('Compilation Workflow E2E Tests', () => {
  // Login credentials from test setup
  const email = 'test@example.com';
  const password = 'testpassword123';

  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');

    // Wait for login page to load
    await expect(page.locator('h1')).toContainText(/welcome back/i);

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

  test('should display notebook page without ForkChain errors', async ({ page }) => {
    // Navigate to notebook page
    await page.goto('http://localhost:3000/notebooks/24');

    // Wait for page to load
    await expect(page).toHaveTitle(/Notebook/);

    // Check for no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for any JavaScript to execute
    await page.waitForTimeout(2000);

    // Verify no "map is not a function" error
    const mapErrors = errors.filter(e => e.includes('map is not a function'));
    expect(mapErrors.length).toBe(0);

    // Verify page content is visible
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should reach published state via single Publish dialog', async ({ page }) => {
    await page.goto('http://localhost:3000/notebooks/1/edit');
    await page.getByPlaceholder(/untitled notebook/i).waitFor({ timeout: 15000 });

    await page.getByRole('button', { name: /^publish$/i }).click();
    await expect(page.getByRole('heading', { name: /publish to feed/i })).toBeVisible();

    await page.getByRole('dialog').getByRole('button', { name: /^publish$/i }).click();

    await expect(page.getByRole('dialog')).toContainText(/published to the social feed/i, {
      timeout: 180_000,
    });

    await page.keyboard.press('Escape');
  });

  test('should show print statements output in browser', async ({ page }) => {
    await page.goto('http://localhost:3000/notebooks/1/edit');
    await page.getByPlaceholder(/untitled notebook/i).waitFor({ timeout: 15000 });

    // Add a Python cell with print statement
    const addButton = page.locator('button').filter({ hasText: /Add Cell/i });
    await addButton.click();

    // Wait for new cell to appear
    await page.waitForSelector('textarea[placeholder*="Python"]');

    // Find the textarea and type Python code with print
    const textarea = page.locator('textarea[placeholder*="Python"]').last();
    await textarea.fill('print("Test output 1")\nprint("Test output 2")\nresult = 42');

    // Run the cell (click run button or use keyboard shortcut)
    const runButton = page.locator('button').filter({ hasText: /Run/i }).first();
    await runButton.click();

    // Wait a bit for execution
    await page.waitForTimeout(2000);

    // Check for output display (verify it's NOT "undefined")
    const cellOutput = page.locator('[data-testid="cell-output"]').last();
    const outputText = await cellOutput.textContent();

    // Verify output is present and not undefined
    expect(outputText).not.toBe('');
    expect(outputText).not.toBe('undefined');
    expect(outputText).toContain('Test output 1');
    expect(outputText).toContain('Test output 2');
  });
});
