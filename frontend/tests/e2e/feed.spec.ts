/**
 * E2E tests for feed flow
 *
 * Tests:
 * - Browse feed
 * - Infinite scroll
 * - Notebook card in feed
 * - Click notebook in feed
 * - Refresh feed
 * - Trending view
 * - Engagement tracking
 * - Empty feed state
 * - Feed loading state
 * - Feed error state
 */
import { test, expect } from '@playwright/test';

test.describe('Feed Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
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
  });

  test('Browse feed', async ({ page }) => {
    // Mock feed API
    await page.route('**/api/v1/feed**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            title: `Notebook ${i + 1}`,
            username: `user${(i % 3) + 1}`,
            avatar_url: `https://example.com/user${(i % 3) + 1}.jpg`,
            like_count: (i + 1) * 2,
            comment_count: i + 1,
            view_count: (i + 1) * 10,
            created_at: new Date(Date.now() - i * 3600000).toISOString(),
            is_published: true,
          })),
          next_cursor: 'next-page-token',
          has_more: true,
        })
      });
    });

    // Navigate to home page (feed)
    await page.goto('/feed');

    // Verify feed loaded
    await expect(page.getByText(/notebook 1/i)).toBeVisible();

    // Verify notebook cards shown
    const feedCards = page.locator('[data-testid="feed-card"], .feed-card');
    await expect(feedCards).toHaveCount(10);

    // Verify 10 notebooks loaded (initial page)
    await expect(page.getByText(/notebook/i)).toHaveCount(10);

    // Verify infinite scroll indicator shown
    await expect(page.getByText(/load more/i)).toBeVisible();
  });

  test('Infinite scroll', async ({ page }) => {
    let pageCounter = 0;

    // Mock feed API with pagination
    await page.route('**/api/v1/feed**', (route) => {
      const url = new URL(route.request().url());
      const cursor = url.searchParams.get('cursor');

      pageCounter++;

      if (!cursor) {
        // First page
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: Array.from({ length: 10 }, (_, i) => ({
              id: i + 1,
              title: `Notebook ${i + 1}`,
              username: 'user1',
              avatar_url: 'https://example.com/user1.jpg',
              like_count: (i + 1) * 2,
              comment_count: i + 1,
              view_count: (i + 1) * 10,
              created_at: new Date().toISOString(),
            })),
            next_cursor: 'page-2',
            has_more: true,
          })
        });
      } else if (cursor === 'page-2') {
        // Second page
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: Array.from({ length: 10 }, (_, i) => ({
              id: i + 11,
              title: `Notebook ${i + 11}`,
              username: 'user2',
              avatar_url: 'https://example.com/user2.jpg',
              like_count: (i + 1) * 2,
              comment_count: i + 1,
              view_count: (i + 1) * 10,
              created_at: new Date().toISOString(),
            })),
            next_cursor: 'page-3',
            has_more: true,
          })
        });
      } else if (cursor === 'page-3') {
        // Third page (last page)
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: Array.from({ length: 5 }, (_, i) => ({
              id: i + 21,
              title: `Notebook ${i + 21}`,
              username: 'user3',
              avatar_url: 'https://example.com/user3.jpg',
              like_count: (i + 1) * 2,
              comment_count: i + 1,
              view_count: (i + 1) * 10,
              created_at: new Date().toISOString(),
            })),
            next_cursor: null,
            has_more: false,
          })
        });
      }
    });

    // Navigate to feed
    await page.goto('/feed');

    // Scroll to bottom of feed
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Verify loading spinner shown
    await expect(page.getByRole('status', { name: /loading/i })).toBeVisible();

    // Verify more notebooks loaded
    await expect(page.getByText(/notebook 11/i)).toBeVisible();

    // Verify no duplicates in feed
    const notebookTitles = await page.locator('[data-testid="notebook-title"], .notebook-title').allTextContents();
    const uniqueTitles = new Set(notebookTitles);
    expect(uniqueTitles.size).toBe(notebookTitles.length);

    // Repeat scroll until end
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Verify "You're all caught up" message
    await expect(page.getByText(/all caught up|no more notebooks/i)).toBeVisible();
  });

  test('Notebook card in feed', async ({ page }) => {
    // Mock feed API
    await page.route('**/api/v1/feed**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 1,
              title: 'Test Notebook',
              username: 'testuser',
              avatar_url: 'https://example.com/avatar.jpg',
              like_count: 10,
              comment_count: 5,
              view_count: 100,
              created_at: new Date().toISOString(),
              is_published: true,
            }
          ],
          next_cursor: null,
          has_more: false,
        })
      });
    });

    // Navigate to feed
    await page.goto('/feed');

    // Verify notebook title shown
    await expect(page.getByText('Test Notebook')).toBeVisible();

    // Verify author username shown
    await expect(page.getByText(/testuser/i)).toBeVisible();

    // Verify like count shown
    await expect(page.getByText(/10 likes/i)).toBeVisible();

    // Verify comment count shown
    await expect(page.getByText(/5 comments/i)).toBeVisible();

    // Verify view count shown
    await expect(page.getByText(/100 views/i)).toBeVisible();

    // Verify published badge shown
    await expect(page.getByText(/published/i)).toBeVisible();
  });

  test('Click notebook in feed', async ({ page }) => {
    // Mock feed API
    await page.route('**/api/v1/feed**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 1,
              title: 'Clickable Notebook',
              username: 'testuser',
              avatar_url: 'https://example.com/avatar.jpg',
              like_count: 10,
              comment_count: 5,
              view_count: 100,
              created_at: new Date().toISOString(),
            }
          ],
          next_cursor: null,
          has_more: false,
        })
      });
    });

    // Navigate to feed and scroll
    await page.goto('/feed');
    await page.evaluate(() => window.scrollTo(0, 300));

    // Click notebook card
    const notebookLink = page.getByRole('link', { name: /clickable notebook/i });
    await notebookLink.click();

    // Verify navigate to notebook viewer
    await page.waitForURL('**/notebooks/**');
    await expect(page.getByText(/notebook viewer/i)).toBeVisible();

    // Use browser back button
    await page.goBack();

    // Verify feed position preserved (infinite scroll state)
    const scrollPosition = await page.evaluate(() => window.scrollY);
    expect(scrollPosition).toBeGreaterThan(0);
  });

  test('Refresh feed', async ({ page }) => {
    // Mock feed API
    let refreshCount = 0;
    await page.route('**/api/v1/feed**', (route) => {
      refreshCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: refreshCount,
              title: `Notebook ${refreshCount}`,
              username: 'testuser',
              avatar_url: 'https://example.com/avatar.jpg',
              like_count: 10,
              comment_count: 5,
              view_count: 100,
              created_at: new Date().toISOString(),
            }
          ],
          next_cursor: null,
          has_more: false,
        })
      });
    });

    // Navigate to feed
    await page.goto('/feed');

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 300));

    // Click refresh button
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    await refreshButton.click();

    // Verify feed reloads
    await expect(page.getByText('Notebook 2')).toBeVisible();

    // Verify new notebooks shown
    await expect(page.getByText(/notebook 2/i)).toBeVisible();

    // Verify scroll position reset to top
    const scrollPosition = await page.evaluate(() => window.scrollY);
    expect(scrollPosition).toBe(0);
  });

  test('Trending view', async ({ page }) => {
    // Mock trending API
    await page.route('**/api/v1/feed/trending**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            title: `Trending Notebook ${i + 1}`,
            username: `user${(i % 3) + 1}`,
            avatar_url: `https://example.com/user${(i % 3) + 1}.jpg`,
            like_count: (10 - i) * 10,
            comment_count: (10 - i) * 5,
            view_count: (10 - i) * 100,
            created_at: new Date(Date.now() - i * 3600000).toISOString(),
            trending_score: (10 - i) * 100,
          })),
          next_cursor: null,
          has_more: false,
        })
      });
    });

    // Navigate to feed
    await page.goto('/feed');

    // Click "Trending" tab
    const trendingTab = page.getByRole('tab', { name: /trending/i });
    await trendingTab.click();

    // Verify trending notebooks shown
    await expect(page.getByText(/trending notebook/i)).toBeVisible();

    // Verify rank badges shown (#1, #2, #3)
    await expect(page.getByText('#1')).toBeVisible();
    await expect(page.getByText('#2')).toBeVisible();
    await expect(page.getByText('#3')).toBeVisible();

    // Verify sorting by engagement score
    const firstNotebook = page.locator('[data-testid="feed-card"]').first();
    await expect(firstNotebook).toContainText('Trending Notebook 1');

    const lastNotebook = page.locator('[data-testid="feed-card"]').last();
    await expect(lastNotebook).toContainText('Trending Notebook 10');
  });

  test('Engagement tracking', async ({ page }) => {
    let viewTracked = false;

    // Mock feed API
    await page.route('**/api/v1/feed**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 1,
              title: 'View Test Notebook',
              username: 'testuser',
              avatar_url: 'https://example.com/avatar.jpg',
              like_count: 10,
              comment_count: 5,
              view_count: 100,
              created_at: new Date().toISOString(),
            }
          ],
          next_cursor: null,
          has_more: false,
        })
      });
    });

    // Mock view tracking API
    await page.route('**/api/v1/notebooks/*/view**', (route) => {
      if (route.request().method() === 'POST') {
        viewTracked = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            view_count: 101,
          })
        });
      }
    });

    // Navigate to feed
    await page.goto('/feed');

    // View notebook in feed
    const notebookLink = page.getByRole('link', { name: /view test notebook/i });
    await notebookLink.click();

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Verify view count incremented (via API mock verification)
    expect(viewTracked).toBe(true);
  });

  test('Empty feed state', async ({ page }) => {
    // Mock empty feed API
    await page.route('**/api/v1/feed**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          next_cursor: null,
          has_more: false,
        })
      });
    });

    // Navigate to feed
    await page.goto('/feed');

    // Verify "No notebooks yet" message
    await expect(page.getByText(/no notebooks yet|feed is empty/i)).toBeVisible();

    // Verify "Create your first notebook" CTA shown
    await expect(page.getByRole('link', { name: /create your first notebook|new notebook/i })).toBeVisible();
  });

  test('Feed loading state', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/v1/feed**', async (route) => {
      // Delay response by 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 1,
              title: 'Test Notebook',
              username: 'testuser',
              avatar_url: 'https://example.com/avatar.jpg',
              like_count: 10,
              comment_count: 5,
              view_count: 100,
              created_at: new Date().toISOString(),
            }
          ],
          next_cursor: null,
          has_more: false,
        })
      });
    });

    // Navigate to feed
    await page.goto('/feed');

    // Verify skeleton loaders shown
    await expect(page.locator('.skeleton, [data-testid="skeleton"]').first()).toBeVisible();

    // Verify placeholders for notebook cards
    const skeletons = page.locator('.skeleton, [data-testid="skeleton"]');
    await expect(skeletons).toHaveCountGreaterThan(0);

    // Wait for loading to complete
    await expect(page.getByText('Test Notebook')).toBeVisible({ timeout: 5000 });
  });

  test('Feed error state', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/feed**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Internal server error',
        })
      });
    });

    // Navigate to feed
    await page.goto('/feed');

    // Verify error message shown
    await expect(page.getByText(/error|failed to load/i)).toBeVisible();

    // Verify retry button shown
    const retryButton = page.getByRole('button', { name: /retry|try again/i });
    await expect(retryButton).toBeVisible();

    // Mock successful API response after retry
    await page.route('**/api/v1/feed**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 1,
              title: 'Test Notebook',
              username: 'testuser',
              avatar_url: 'https://example.com/avatar.jpg',
              like_count: 10,
              comment_count: 5,
              view_count: 100,
              created_at: new Date().toISOString(),
            }
          ],
          next_cursor: null,
          has_more: false,
        })
      });
    });

    // Click retry
    await retryButton.click();

    // Verify feed reloads
    await expect(page.getByText('Test Notebook')).toBeVisible();
  });
});
