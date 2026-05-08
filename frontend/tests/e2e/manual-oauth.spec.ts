/**
 * Manual OAuth test for interactive verification
 *
 * This test opens a headed browser for manual OAuth testing.
 * User clicks the Google login button and completes OAuth manually.
 * Then we verify the authentication state and navigation.
 */
import { test, expect } from '@playwright/test';

test.describe('Manual OAuth Verification', () => {
  test('Complete Google OAuth flow manually', async ({ page, context }) => {
    // Enable detailed logging
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));

    // Navigate to home page
    await page.goto('http://localhost:3000');
    console.log('✓ Navigated to home page');

    // Verify page loaded
    await expect(page.locator('h1')).toContainText('Share & Remix');
    console.log('✓ Home page loaded successfully');

    // Wait for Google OAuth button
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    await expect(googleButton).toBeVisible({ timeout: 10000 });
    console.log('✓ Google OAuth button is visible');

    // Click Google login button
    console.log('🔵 Clicking Google OAuth button...');
    await googleButton.click();

    // Wait for OAuth redirect (this will go to Google)
    // We'll wait for either the OAuth callback or the profile wizard
    console.log('⏳ Waiting for OAuth redirect...');

    // Wait up to 2 minutes for user to complete OAuth
    try {
      await page.waitForURL(/(profile-wizard|feed|\/\?code=)/, { timeout: 120000 });
      console.log('✓ OAuth redirect detected');
    } catch (error) {
      console.log('⚠️ Timeout waiting for OAuth redirect. Current URL:', page.url());
      throw new Error('OAuth redirect timeout - user may need more time');
    }

    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // Check if redirected to profile wizard (new user)
    if (currentUrl.includes('profile-wizard')) {
      console.log('📍 Redirected to profile wizard (new user)');

      // Verify profile wizard form exists
      await expect(page.getByPlaceholder(/username/i)).toBeVisible({ timeout: 10000 });
      console.log('✓ Profile wizard form is visible');

      // For testing, we can't complete the form without user input
      console.log('⚠️ Manual intervention needed: Complete profile wizard');

    } else if (currentUrl.includes('feed') || currentUrl === 'http://localhost:3000/') {
      console.log('📍 Redirected to feed (existing user)');

      // Wait a moment for page to fully load
      await page.waitForTimeout(2000);

      // Check if auth cookies are set
      const cookies = await context.cookies();
      const accessToken = cookies.find(c => c.name === 'access_token');
      const refreshToken = cookies.find(c => c.name === 'refresh_token');

      if (accessToken && refreshToken) {
        console.log('✓ Auth cookies are set');
        console.log('  - access_token:', accessToken.value.substring(0, 20) + '...');
        console.log('  - refresh_token:', refreshToken.value.substring(0, 20) + '...');
      } else {
        console.log('❌ Auth cookies NOT set');
        console.log('Available cookies:', cookies.map(c => c.name));
      }

      // Try to fetch user info via API
      const apiResponse = await page.evaluate(async () => {
        try {
          const response = await fetch('http://localhost:8000/api/v1/auth/me', {
            credentials: 'include'
          });
          const data = await response.json();
          return { status: response.status, data };
        } catch (error) {
          return { error: error.message };
        }
      });

      if (apiResponse.status === 200) {
        console.log('✓ Auth API call successful');
        console.log('  User data:', JSON.stringify(apiResponse.data, null, 2));
      } else {
        console.log('❌ Auth API call failed');
        console.log('  Response:', JSON.stringify(apiResponse, null, 2));
      }

      // Check for feed content
      const feedContainer = page.locator('[class*="feed"], [class*="notebook"]');
      const feedVisible = await feedContainer.first().isVisible().catch(() => false);

      if (feedVisible) {
        console.log('✓ Feed content is visible');
      } else {
        console.log('⚠️ Feed content may not be loaded');
      }

    } else {
      console.log('⚠️ Unexpected redirect URL:', currentUrl);
    }

    // Take a screenshot for verification
    await page.screenshot({ path: 'test-results/manual-oauth-final.png', fullPage: true });
    console.log('📸 Screenshot saved to test-results/manual-oauth-final.png');

    console.log('\n✅ Manual OAuth test completed. Review the screenshot above.');
  });
});
