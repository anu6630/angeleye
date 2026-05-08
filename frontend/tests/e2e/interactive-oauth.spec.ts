/**
 * Interactive OAuth test - opens browser for manual testing
 *
 * This script opens a browser and waits for manual OAuth completion.
 * Press Enter in the terminal to capture authentication state.
 */
import { test } from '@playwright/test';
import readline from 'readline';

test('Interactive OAuth test', async ({ page, context, browser }) => {
  // Enable console logging
  page.on('console', msg => console.log(`[Browser] ${msg.text()}`));

  // Navigate to home
  await page.goto('http://localhost:3000');
  console.log('\n✅ Browser opened at http://localhost:3000');
  console.log('📋 Please complete the following steps:');
  console.log('   1. Click "Sign in with Google" button');
  console.log('   2. Complete Google OAuth flow');
  console.log('   3. Observe the redirect (should go to /feed or /profile-wizard)');
  console.log('\n⏸️  Press Enter when you have completed the login flow...\n');

  // Wait for user to press Enter
  await new Promise<void>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('', () => {
      rl.close();
      resolve();
    });
  });

  console.log('\n🔍 Analyzing authentication state...\n');

  const url = page.url();
  console.log(`Current URL: ${url}`);

  // Check cookies
  const cookies = await context.cookies();
  console.log('\n🍪 Cookies:');
  cookies.forEach(cookie => {
    const valuePreview = cookie.value.length > 30 ? cookie.value.substring(0, 30) + '...' : cookie.value;
    console.log(`  - ${cookie.name}: ${valuePreview}`);
  });

  // Check localStorage
  const authStorage = await page.evaluate(() => {
    return localStorage.getItem('auth-storage');
  });
  console.log('\n💾 LocalStorage (auth-storage):');
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      console.log(`  - isAuthenticated: ${parsed.state?.isAuthenticated}`);
      console.log(`  - User ID: ${parsed.state?.user?.id}`);
      console.log(`  - Username: ${parsed.state?.user?.username}`);
      console.log(`  - Email: ${parsed.state?.user?.email}`);
    } catch (e) {
      console.log(`  (Could not parse: ${authStorage.substring(0, 100)}...)`);
    }
  } else {
    console.log('  (not set)');
  }

  // Check API auth status
  console.log('\n🔐 API Authentication Check:');
  try {
    const apiResponse = await page.evaluate(async () => {
      const response = await fetch('http://localhost:8000/api/v1/auth/me', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return {
        status: response.status,
        ok: response.ok,
        data: await response.json().catch(() => null)
      };
    });

    if (apiResponse.ok) {
      console.log(`  ✅ Authenticated!`);
      console.log(`  User: ${apiResponse.data?.username || apiResponse.data?.email}`);
    } else {
      console.log(`  ❌ Not authenticated (HTTP ${apiResponse.status})`);
      if (apiResponse.data) {
        console.log(`  Error: ${JSON.stringify(apiResponse.data)}`);
      }
    }
  } catch (error) {
    console.log(`  ❌ API request failed: ${error}`);
  }

  // Take screenshot
  await page.screenshot({ path: 'test-results/interactive-oauth-final.png', fullPage: true });
  console.log('\n📸 Screenshot saved: test-results/interactive-oauth-final.png');

  console.log('\n✅ Test complete. Browser will remain open for 10 seconds...');
  await page.waitForTimeout(10000);
});
