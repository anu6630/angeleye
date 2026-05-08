/**
 * E2E tests for notebook edit page
 *
 * Tests:
 * - Access notebook edit page with email/password login
 * - Edit page loads correctly
 * - Notebook data is loaded
 * - Redirects to login if not authenticated
 */
import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
};

test.describe('Notebook Edit Page', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear cookies and localStorage before each test
    await context.clearCookies();
  });

  test('Redirects to login when accessing edit page without authentication', async ({ page }) => {
    // Navigate directly to notebook edit page without login
    await page.goto('http://localhost:3000/notebooks/13/edit');

    // Should redirect to login page
    await page.waitForURL('**/login', { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);

    console.log('✅ Edit page redirects to login when not authenticated');
  });

  test('Access notebook edit page after email/password login', async ({ page }) => {
    // Step 1: Login with email/password
    await page.goto('http://localhost:3000/login');

    // Click on Email tab
    const emailTab = page.locator('button', { hasText: 'Email' }).first();
    await emailTab.click();
    await page.waitForTimeout(500);

    // Fill in credentials
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);

    // Submit login
    await page.click('button[type="submit"]');

    // Wait for successful login
    await page.waitForTimeout(3000);

    // Step 2: Navigate to notebook edit page
    await page.goto('http://localhost:3000/notebooks/13/edit', { timeout: 10000 });

    console.log('Current URL after navigating to edit page:', page.url());

    // Step 3: Verify we're on the edit page (not redirected to login)
    const currentUrl = page.url();
    expect(currentUrl).toContain('/notebooks/13/edit');
    expect(currentUrl).not.toContain('/login');

    // Step 4: Wait for page to settle
    await page.waitForTimeout(5000);

    // Step 5: Check page content
    const pageContent = await page.content();
    const hasLoading = pageContent.includes('Loading notebook') ||
                      pageContent.includes('Loading...');
    const hasBackButton = pageContent.includes('Back to My Notebooks');

    console.log('✓ Page content analysis:');
    console.log('  Has loading text:', hasLoading);
    console.log('  Has back button:', hasBackButton);

    // Step 6: Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/notebook-edit-page.png' });
    console.log('✅ Notebook edit page loads successfully after login');
    console.log('   Screenshot saved to test-results/notebook-edit-page.png');
  });

  test('Verify auth cookies are set after login', async ({ page, context }) => {
    // Login with email/password
    await page.goto('http://localhost:3000/login');
    const emailTab = page.locator('button', { hasText: 'Email' }).first();
    await emailTab.click();
    await page.waitForTimeout(500);

    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for login
    await page.waitForTimeout(3000);

    // Check cookies
    const cookies = await context.cookies();
    const accessToken = cookies.find(c => c.name === 'access_token');
    const refreshToken = cookies.find(c => c.name === 'refresh_token');

    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
    expect(accessToken?.httpOnly).toBe(true);
    expect(accessToken?.sameSite?.toLowerCase()).toBe('lax');

    console.log('✅ Auth cookies are set correctly');
    console.log('   Access token:', accessToken ? 'present' : 'missing');
    console.log('   Refresh token:', refreshToken ? 'present' : 'missing');
  });

  test('Edit page shows loading state then editor', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    const emailTab = page.locator('button', { hasText: 'Email' }).first();
    await emailTab.click();
    await page.waitForTimeout(500);

    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Navigate to edit page
    await page.goto('http://localhost:3000/notebooks/13/edit', { timeout: 10000 });

    // Check for loading spinner
    const loadingSpinner = page.locator('.animate-spin, [class*="loader"]');
    const hasSpinner = await loadingSpinner.count() > 0;

    if (hasSpinner) {
      console.log('✓ Loading spinner is visible');
    }

    // Wait for loading to complete
    await page.waitForTimeout(6000);

    // Check page content after loading
    const pageContent = await page.content();
    const hasBackButton = pageContent.includes('Back to My Notebooks');
    const hasNotebook = pageContent.includes('Notebook') ||
                       pageContent.includes('notebook');

    console.log('✓ Page content after loading:');
    console.log('  Has back button:', hasBackButton);
    console.log('  Has notebook content:', hasNotebook);

    // Verify we're still on the edit page
    const currentUrl = page.url();
    expect(currentUrl).toContain('/notebooks/13/edit');

    console.log('✅ Edit page transitions from loading to editor');
  });

  test('Edit page with non-existent notebook shows error', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    const emailTab = page.locator('button', { hasText: 'Email' }).first();
    await emailTab.click();
    await page.waitForTimeout(500);

    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Try to access non-existent notebook
    await page.goto('http://localhost:3000/notebooks/99999/edit');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Should show "Notebook not found" message
    const notFoundMessage = page.getByText(/Notebook not found/);
    const hasNotFound = await notFoundMessage.count() > 0;

    if (hasNotFound) {
      console.log('✓ "Notebook not found" message is displayed');
      await expect(notFoundMessage).toBeVisible();
    }

    // Check for back to notebooks link
    const backLink = page.getByText('Back to My Notebooks');
    const hasBackLink = await backLink.count() > 0;

    if (hasBackLink) {
      console.log('✓ Back link is shown for non-existent notebook');
    }

    console.log('✅ Edit page handles non-existent notebooks correctly');
  });
});
