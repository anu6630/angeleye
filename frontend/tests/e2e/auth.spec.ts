/**
 * E2E tests for authentication flow
 *
 * Tests:
 * - Google OAuth login (happy path)
 * - Session persistence
 * - Logout
 * - Protected route redirects to login
 * - Login and navigate to profile
 */
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('Google OAuth login (happy path)', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Click "Sign in with Google" button
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    await expect(googleButton).toBeVisible();
    await googleButton.click();

    // Mock OAuth callback (since we can't do real OAuth in E2E)
    // In real scenario, this would redirect to Google and back
    // For E2E testing, we'll simulate successful login by setting auth state
    await page.waitForURL('**/login');

    // Simulate successful OAuth callback
    // In a real test environment, you'd use MSW or similar to mock the OAuth endpoint
    await page.route('**/api/v1/auth/google/callback**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          user: {
            id: 1,
            email: 'test@example.com',
            username: 'testuser',
            is_active: true,
            is_verified: true,
            avatar_url: 'https://example.com/avatar.jpg',
            created_at: new Date().toISOString(),
          }
        })
      });
    });

    // Simulate the OAuth redirect
    await page.goto('/?token=mock-token&user_id=1');

    // Verify redirect to dashboard/home
    await page.waitForURL('/');

    // Verify user avatar shown
    const avatar = page.getByRole('img', { name: /testuser/i });
    await expect(avatar).toBeVisible();

    // Verify username displayed
    await expect(page.getByText('testuser')).toBeVisible();
  });

  test('Session persistence', async ({ page }) => {
    // Complete OAuth login
    await page.goto('/login');

    // Mock the auth state
    await page.evaluate(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          isAuthenticated: true,
          user: {
            id: 1,
            email: 'test@example.com',
            username: 'testuser',
            is_active: true,
            is_verified: true,
            avatar_url: 'https://example.com/avatar.jpg',
            created_at: new Date().toISOString(),
          }
        },
        version: 0
      }));
    });

    // Refresh page (browser reload)
    await page.reload();

    // Verify user still logged in
    const avatar = page.getByRole('img', { name: /testuser/i });
    await expect(avatar).toBeVisible();

    // Verify username still shown
    await expect(page.getByText('testuser')).toBeVisible();
  });

  test('Logout', async ({ page }) => {
    // Login first
    await page.goto('/login');

    await page.evaluate(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          isAuthenticated: true,
          user: {
            id: 1,
            email: 'test@example.com',
            username: 'testuser',
            is_active: true,
            is_verified: true,
            avatar_url: 'https://example.com/avatar.jpg',
            created_at: new Date().toISOString(),
          }
        },
        version: 0
      }));
    });

    await page.reload();

    // Click user menu/avatar
    const avatar = page.getByRole('img', { name: /testuser/i });
    await expect(avatar).toBeVisible();
    await avatar.click();

    // Click "Logout" button
    const logoutButton = page.getByRole('button', { name: /logout/i });
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // Verify redirect to home page
    await page.waitForURL('/');

    // Verify "Sign in" buttons shown
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    await expect(googleButton).toBeVisible();

    // Verify avatar not shown
    const avatarAfterLogout = page.getByRole('img', { name: /testuser/i });
    await expect(avatarAfterLogout).not.toBeVisible();
  });

  test('Protected route redirects to login', async ({ page }) => {
    // Navigate to /notebooks (protected route)
    await page.goto('/notebooks/new');

    // Verify redirect to /login
    await page.waitForURL('**/login');

    // Verify "Sign in to continue" message or similar
    await expect(page.getByText(/sign in/i)).toBeVisible();
  });

  test('Login and navigate to profile', async ({ page }) => {
    // Complete OAuth login
    await page.goto('/login');

    await page.evaluate(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          isAuthenticated: true,
          user: {
            id: 1,
            email: 'test@example.com',
            username: 'testuser',
            is_active: true,
            is_verified: true,
            avatar_url: 'https://example.com/avatar.jpg',
            bio: 'Test bio',
            created_at: new Date().toISOString(),
          }
        },
        version: 0
      }));
    });

    // Navigate to /profile
    await page.goto('/profile/me');

    // Verify profile page displayed
    await expect(page.getByText(/testuser/i)).toBeVisible();

    // Verify username and bio shown
    await expect(page.getByText('Test bio')).toBeVisible();
  });
});
