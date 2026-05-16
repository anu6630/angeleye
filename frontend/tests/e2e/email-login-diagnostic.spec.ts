/**
 * Diagnostic test for email/password login
 */
import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123'
};

test('Diagnostic: Check login flow step by step', async ({ page }) => {
  console.log('Step 1: Navigate to home page');
  await page.goto('http://localhost:3000');
  console.log('Current URL:', page.url());
  await expect(page).toHaveTitle(/Pulze/);
  console.log('✓ Home page loaded');

  console.log('\nStep 2: Click "Continue with Email" button');
  const emailButton = page.locator('button:has-text("Continue with Email")');
  await expect(emailButton).toBeVisible({ timeout: 10000 });
  await emailButton.click();
  console.log('✓ Email button clicked');
  console.log('Current URL:', page.url());

  console.log('\nStep 3: Wait for email form to appear');
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
  console.log('✓ Email form is visible');

  console.log('\nStep 4: Fill in credentials');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  console.log('✓ Credentials filled');

  console.log('\nStep 5: Click submit button');
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();
  console.log('✓ Submit button clicked');

  console.log('\nStep 6: Wait for navigation (up to 15 seconds)');
  try {
    await page.waitForURL('**/feed', { timeout: 15000 });
    console.log('✓ Successfully redirected to /feed');
    console.log('Final URL:', page.url());
  } catch (error) {
    console.log('✗ Navigation timeout');
    console.log('Current URL:', page.url());
    console.log('Page title:', await page.title());

    // Take screenshot
    await page.screenshot({ path: 'test-results/diagnostic-failed.png', fullPage: true });
    console.log('Screenshot saved to test-results/diagnostic-failed.png');

    // Check console errors
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    console.log('Console logs:', logs);

    throw error;
  }

  console.log('\nStep 7: Check for auth cookies');
  const cookies = await page.context().cookies();
  const accessToken = cookies.find(c => c.name === 'access_token');
  const refreshToken = cookies.find(c => c.name === 'refresh_token');

  console.log('Cookies found:', cookies.map(c => c.name).join(', '));
  if (accessToken) {
    console.log('✓ access_token cookie exists');
    console.log('  Domain:', accessToken.domain);
    console.log('  HttpOnly:', accessToken.httpOnly);
  } else {
    console.log('✗ access_token cookie NOT found');
  }

  if (refreshToken) {
    console.log('✓ refresh_token cookie exists');
  } else {
    console.log('✗ refresh_token cookie NOT found');
  }

  console.log('\n✅ Diagnostic test completed');
});
