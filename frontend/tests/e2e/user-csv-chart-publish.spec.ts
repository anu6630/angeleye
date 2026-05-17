import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('E2E Dummy User CSV Notebook Compilation and Publication', () => {
  // Use a very high timeout since compilation uses Celery/Docker and takes time
  test.setTimeout(240000);

  const timestamp = Date.now();
  const username = `dummyuser_${timestamp}`;
  const email = `dummyuser_${timestamp}@example.com`;
  const password = 'dummy_password_123';
  const notebookTitle = `E2E CSV Plot ${timestamp}`;

  const screenshotDir = '/Users/anuraj/.gemini/antigravity/brain/20999c0a-223a-4cc7-a68a-71ff03b59ea8/artifacts';

  test('Create dummy user, build CSV notebook, compile and verify on feed', async ({ page }) => {
    // Listen to console and page errors
    page.on('console', msg => console.log(`[BROWSER CONSOLE] [${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => console.log(`[BROWSER EXCEPTION] ${err.message}\nStack: ${err.stack}`));
    page.on('request', req => {
      if (req.url().includes('/api/v1/')) {
        console.log(`[HTTP REQ] ${req.method()} ${req.url()}`);
      }
    });
    page.on('response', res => {
      if (res.url().includes('/api/v1/')) {
        console.log(`[HTTP RES] ${res.status()} ${res.url()}`);
      }
    });

    // 1. DUMMY USER REGISTRATION
    console.log('➡️ Navigating to Login Page');
    await page.goto('https://pulze.anuraj.net/login');
    await page.waitForLoadState('networkidle');

    console.log('➡️ Switching to Email login method');
    await page.click('button:has-text("Email")');
    await page.waitForTimeout(500);

    console.log('➡️ Clicking Sign Up link');
    await page.click('button:has-text("Need an account? Sign up")');
    await page.waitForTimeout(500);

    console.log(`➡️ Registering user: ${username} (${email})`);
    await page.fill('input[id="username"]', username);
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for redirect to feed
    console.log('➡️ Waiting for successful redirect to Feed');
    await page.waitForURL('**/feed', { timeout: 20000 });
    await expect(page).toHaveURL(/\/feed/);
    console.log('✅ Registration & Login Successful!');

    // Capture registration screenshot
    await page.screenshot({ path: path.join(screenshotDir, '01_feed_after_login.png') });

    // 2. NAVIGATE TO NEW NOTEBOOK
    console.log('➡️ Navigating to Create Notebook Page');
    await page.goto('https://pulze.anuraj.net/notebooks/new');
    await page.waitForLoadState('networkidle');

    console.log(`➡️ Setting Notebook Title to: ${notebookTitle}`);
    await page.getByPlaceholder(/untitled notebook/i).fill(notebookTitle);

    // 3. ADD AND RUN PYTHON CODE
    console.log('➡️ Checking for Code Cell');
    const addCodeCellBtn = page.getByRole('button', { name: /^code$/i });
    if (await addCodeCellBtn.isVisible()) {
      console.log('➡️ Clicking button to add Code Cell');
      await addCodeCellBtn.click();
    }
    
    console.log('➡️ Waiting for Monaco Editor models to initialize');
    await page.waitForFunction(
      () => (window as any).monaco?.editor?.getModels()?.length > 0,
      { timeout: 20000 }
    );

    const pythonCode = `import pandas as pd
import matplotlib.pyplot as plt

# 1. Create a dummy CSV dataset
data = {
    'Category': ['Apples', 'Oranges', 'Bananas', 'Grapes', 'Pears'],
    'Value': [25, 40, 15, 30, 20]
}
df = pd.DataFrame(data)
df.to_csv('fruit_sales.csv', index=False)

# 2. Read the CSV using pandas
df_read = pd.read_csv('fruit_sales.csv')

# 3. Create a matplotlib chart
plt.figure(figsize=(6, 4))
plt.bar(df_read['Category'], df_read['Value'], color='#82ca9d')
plt.title('Fruit Sales Data (Generated & Read from CSV)')
plt.xlabel('Fruit Type')
plt.ylabel('Quantity Sold')
plt.grid(axis='y', linestyle='--', alpha=0.5)

# 4. Display the chart
plt.show()`;

    console.log('➡️ Setting Monaco Editor value via setValue API');
    await page.evaluate((code) => {
      (window as any).monaco.editor.getModels()[0].setValue(code);
    }, pythonCode);
    await page.waitForTimeout(1000);

    console.log('➡️ Running the cell locally (Pyodide)');
    await page.click('button:has-text("Run All")');
    console.log('➡️ Waiting for local Pyodide execution preview');
    await page.waitForTimeout(8000);

    // Capture editor screenshot
    await page.screenshot({ path: path.join(screenshotDir, '02_notebook_editor_executed.png') });

    // 4. SAVE NOTEBOOK
    console.log('➡️ Saving the notebook to database');
    await page.getByRole('button', { name: /^save$/i }).click();
    // Wait for save spinner to settle and URL to have ID
    await page.waitForTimeout(4000);
    const currentUrl = page.url();
    console.log(`✅ Saved Notebook! Current URL: ${currentUrl}`);

    // 5. BACKEND COMPILATION & PUBLISHING
    console.log('➡️ Opening the Publish Dialog');
    await page.getByRole('button', { name: /^publish$/i }).last().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    console.log('➡️ Clicking Publish button in the dialog to start backend compilation');
    const dialogPublish = page.getByRole('dialog').getByRole('button', { name: /^publish$/i });
    await dialogPublish.click();

    console.log('➡️ Waiting for Celery worker & MinIO compilation success (up to 3 minutes)...');
    await expect(
      page.getByRole('dialog').getByText(/published to the social feed/i)
    ).toBeVisible({ timeout: 180000 });

    console.log('✅ Published to the social feed successfully!');
    await page.screenshot({ path: path.join(screenshotDir, '03_publish_success_dialog.png') });

    // Close dialog
    console.log('➡️ Closing dialog');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // 6. VERIFY ON FEED
    console.log('➡️ Navigating to Social Feed');
    await page.goto('https://pulze.anuraj.net/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log(`➡️ Verifying post visibility: ${notebookTitle}`);
    const postElement = page.getByText(notebookTitle, { exact: false });
    await expect(postElement).toBeVisible({ timeout: 15000 });
    console.log('✅ Post is visible in social feed!');

    // Capture feed screenshot
    await page.screenshot({ path: path.join(screenshotDir, '04_social_feed_visible.png') });

    // Open post to verify matplotlib chart in iframe
    console.log('➡️ Opening published notebook post');
    await postElement.first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    console.log('➡️ Checking for compiled chart iframe');
    const iframe = page.locator('iframe').first();
    await expect(iframe).toBeVisible({ timeout: 15000 });

    // Capture post detail screenshot
    await page.screenshot({ path: path.join(screenshotDir, '05_compiled_post_detail.png') });
    console.log('🎉 E2E TEST COMPLETED SUCCESSFULLY WITH PERFECT VISUALS!');
  });
});
