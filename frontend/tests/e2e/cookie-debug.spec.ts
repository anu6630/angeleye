/**
 * Debug test for cookie authentication
 */
import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123'
};

test('Debug: Cookie authentication flow', async ({ page, context }) => {
  console.log('Step 1: Navigate to home page');
  await page.goto('http://localhost:3000');

  console.log('Step 2: Login with email/password');
  await page.click('button:has-text("Continue with Email")');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  console.log('Step 3: Wait for redirect');
  await page.waitForTimeout(2000);
  const currentUrl = page.url();
  console.log(`  Current URL: ${currentUrl}`);

  console.log('Step 4: Check cookies');
  const cookies = await context.cookies();
  console.log('  All cookies:', cookies.map(c => ({
    name: c.name,
    domain: c.domain,
    path: c.path,
    httpOnly: c.httpOnly,
    value: c.value?.substring(0, 30) + '...'
  })));

  const accessToken = cookies.find(c => c.name === 'access_token');
  const refreshToken = cookies.find(c => c.name === 'refresh_token');

  if (accessToken) {
    console.log(`  ✓ access_token found: domain=${accessToken.domain}, path=${accessToken.path}`);
  } else {
    console.log('  ✗ access_token NOT found');
  }

  if (refreshToken) {
    console.log(`  ✓ refresh_token found: domain=${refreshToken.domain}, path=${refreshToken.path}`);
  } else {
    console.log('  ✗ refresh_token NOT found');
  }

  console.log('Step 5: Test API call with cookies');
  try {
    const apiResponse = await page.evaluate(async () => {
      const response = await fetch('http://localhost:8000/api/v1/notebooks', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        data: await response.json().catch(() => null)
      };
    });

    console.log('  API Response:', JSON.stringify(apiResponse, null, 2));

    if (apiResponse.ok) {
      console.log(`  ✓ API call successful! Found ${apiResponse.data?.length || 0} notebooks`);
    } else {
      console.log(`  ✗ API call failed: ${apiResponse.status}`);
    }
  } catch (error) {
    console.log(`  ✗ API call error: ${error}`);
  }

  console.log('Step 6: Navigate to My Notebooks page');
  await page.goto('http://localhost:3000/my-notebooks');
  await page.waitForTimeout(2000);

  console.log('Step 7: Check page content');
  const pageText = await page.textContent();
  console.log(`  Page text preview: ${pageText.substring(0, 200)}...`);

  const hasNotebooks = await page.locator('text=/Test Notebook/').isVisible().catch(() => false);
  const hasError = await page.locator('text=/Failed to load|Authentication required/').isVisible().catch(() => false);
  const hasEmptyState = await page.locator('text=/No notebooks yet/').isVisible().catch(() => false);

  console.log(`  Has "Test Notebook": ${hasNotebooks}`);
  console.log(`  Has error: ${hasError}`);
  console.log(`  Has empty state: ${hasEmptyState}`);

  if (hasNotebooks) {
    console.log('✅ SUCCESS: Notebook is displayed!');
  } else if (hasEmptyState) {
    console.log('⚠️  Empty state shown (no notebooks)');
  } else if (hasError) {
    console.log('❌ FAILED: Error is shown');
  } else {
    console.log('❓ UNKNOWN: Unexpected page state');
  }

  console.log('Step 8: Take screenshot for manual inspection');
  await page.screenshot({ path: 'test-results/cookie-debug-my-notebooks.png', fullPage: true });
  console.log('✓ Screenshot saved to test-results/cookie-debug-my-notebooks.png');
});
