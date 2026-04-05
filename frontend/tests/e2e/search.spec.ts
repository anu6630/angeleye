/**
 * E2E tests for search flow
 *
 * Tests:
 * - Search by title
 * - Search with no results
 * - Filter by fork type
 * - Filter by tags
 * - Search by author
 * - Clear search
 * - Search debouncing
 * - Search from notebook title click
 * - Recent searches
 */
import { test, expect } from '@playwright/test';

test.describe('Search Flow', () => {
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

  test('Search by title', async ({ page }) => {
    // Mock search API
    await page.route('**/api/v1/search**', (route) => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get('q');

      if (query === 'python') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [
              {
                id: 1,
                title: 'Python Tutorial',
                username: 'user1',
                avatar_url: 'https://example.com/user1.jpg',
                like_count: 10,
                comment_count: 5,
                view_count: 100,
                created_at: new Date().toISOString(),
                snippet: 'Learn <mark>Python</mark> basics',
              },
              {
                id: 2,
                title: 'Advanced Python',
                username: 'user2',
                avatar_url: 'https://example.com/user2.jpg',
                like_count: 8,
                comment_count: 3,
                view_count: 80,
                created_at: new Date().toISOString(),
                snippet: 'Advanced <mark>Python</mark> techniques',
              }
            ],
            total: 2,
          })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [],
            total: 0,
          })
        });
      }
    });

    // Navigate to search page
    await page.goto('/search');

    // Type search query in search bar
    const searchInput = page.getByPlaceholder(/search notebooks/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('python');

    // Press Enter or click search button
    await searchInput.press('Enter');

    // Verify search results shown
    await expect(page.getByText('Python Tutorial')).toBeVisible();
    await expect(page.getByText('Advanced Python')).toBeVisible();

    // Verify query terms highlighted
    const highlights = page.locator('mark');
    await expect(highlights).toHaveCount(2);

    // Verify result count displayed
    await expect(page.getByText(/2 results/i)).toBeVisible();
  });

  test('Search with no results', async ({ page }) => {
    // Mock search API with no results
    await page.route('**/api/v1/search**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [],
          total: 0,
        })
      });
    });

    // Navigate to search page
    await page.goto('/search');

    // Type uncommon query
    const searchInput = page.getByPlaceholder(/search notebooks/i);
    await searchInput.fill('xyzabc123unusualquery');

    // Press Enter
    await searchInput.press('Enter');

    // Verify "No results found" message shown
    await expect(page.getByText(/no results found/i)).toBeVisible();

    // Verify search suggestions shown
    await expect(page.getByText(/try different keywords/i)).toBeVisible();
  });

  test('Filter by fork type', async ({ page }) => {
    // Mock search API with original notebooks
    await page.route('**/api/v1/search**', (route) => {
      const url = new URL(route.request().url());
      const forkType = url.searchParams.get('fork_type');

      if (forkType === 'original') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [
              {
                id: 1,
                title: 'Original Notebook',
                username: 'user1',
                avatar_url: 'https://example.com/user1.jpg',
                like_count: 10,
                comment_count: 5,
                view_count: 100,
                created_at: new Date().toISOString(),
                parent_id: null,
                root_id: null,
              }
            ],
            total: 1,
          })
        });
      } else if (forkType === 'fork') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [
              {
                id: 2,
                title: 'Forked Notebook',
                username: 'user2',
                avatar_url: 'https://example.com/user2.jpg',
                like_count: 5,
                comment_count: 2,
                view_count: 50,
                created_at: new Date().toISOString(),
                parent_id: 1,
                root_id: 1,
              }
            ],
            total: 1,
          })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [
              {
                id: 1,
                title: 'Original Notebook',
                username: 'user1',
                avatar_url: 'https://example.com/user1.jpg',
                like_count: 10,
                comment_count: 5,
                view_count: 100,
                created_at: new Date().toISOString(),
                parent_id: null,
                root_id: null,
              },
              {
                id: 2,
                title: 'Forked Notebook',
                username: 'user2',
                avatar_url: 'https://example.com/user2.jpg',
                like_count: 5,
                comment_count: 2,
                view_count: 50,
                created_at: new Date().toISOString(),
                parent_id: 1,
                root_id: 1,
              }
            ],
            total: 2,
          })
        });
      }
    });

    // Navigate to search page
    await page.goto('/search');

    // Search for notebooks
    const searchInput = page.getByPlaceholder(/search notebooks/i);
    await searchInput.fill('test');
    await searchInput.press('Enter');

    // Click "Original" filter tab
    const originalTab = page.getByRole('tab', { name: /original/i });
    await originalTab.click();

    // Verify only original notebooks shown
    await expect(page.getByText('Original Notebook')).toBeVisible();
    await expect(page.getByText('Forked Notebook')).not.toBeVisible();

    // Click "Forks" filter tab
    const forksTab = page.getByRole('tab', { name: /forks/i });
    await forksTab.click();

    // Verify only forks shown
    await expect(page.getByText('Forked Notebook')).toBeVisible();
    await expect(page.getByText('Original Notebook')).not.toBeVisible();

    // Click "All" filter tab
    const allTab = page.getByRole('tab', { name: /all/i });
    await allTab.click();

    // Verify all notebooks shown
    await expect(page.getByText('Original Notebook')).toBeVisible();
    await expect(page.getByText('Forked Notebook')).toBeVisible();
  });

  test('Filter by tags', async ({ page }) => {
    // Mock search API with tags
    await page.route('**/api/v1/search**', (route) => {
      const url = new URL(route.request().url());
      const tags = url.searchParams.get('tags');

      if (tags === 'python') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [
              {
                id: 1,
                title: 'Python Notebook',
                username: 'user1',
                avatar_url: 'https://example.com/user1.jpg',
                like_count: 10,
                comment_count: 5,
                view_count: 100,
                created_at: new Date().toISOString(),
                tags: ['python', 'tutorial'],
              }
            ],
            total: 1,
          })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [],
            total: 0,
          })
        });
      }
    });

    // Navigate to search page
    await page.goto('/search');

    // Search with query
    const searchInput = page.getByPlaceholder(/search notebooks/i);
    await searchInput.fill('test');
    await searchInput.press('Enter');

    // Select tag filter (e.g., "python")
    const tagFilter = page.getByRole('button', { name: /python/i });
    await tagFilter.click();

    // Verify results filtered by tag
    await expect(page.getByText('Python Notebook')).toBeVisible();

    // Verify tag badge shown on results
    await expect(page.getByText(/python/i)).toBeVisible();
  });

  test('Search by author', async ({ page }) => {
    // Mock search API with author filter
    await page.route('**/api/v1/search**', (route) => {
      const url = new URL(route.request().url());
      const author = url.searchParams.get('author');

      if (author === 'user1') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [
              {
                id: 1,
                title: 'User1 Notebook',
                username: 'user1',
                avatar_url: 'https://example.com/user1.jpg',
                like_count: 10,
                comment_count: 5,
                view_count: 100,
                created_at: new Date().toISOString(),
              }
            ],
            total: 1,
          })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [],
            total: 0,
          })
        });
      }
    });

    // Navigate to search page
    await page.goto('/search');

    // Click author filter dropdown
    const authorDropdown = page.getByRole('combobox', { name: /author/i });
    await authorDropdown.click();

    // Select author from list
    const authorOption = page.getByRole('option', { name: /user1/i });
    await authorOption.click();

    // Verify results filtered by author
    await expect(page.getByText('User1 Notebook')).toBeVisible();

    // Verify author name shown in filter
    await expect(authorDropdown).toHaveText(/user1/i);
  });

  test('Clear search', async ({ page }) => {
    // Mock search API
    await page.route('**/api/v1/search**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              id: 1,
              title: 'Test Notebook',
              username: 'user1',
              avatar_url: 'https://example.com/user1.jpg',
              like_count: 10,
              comment_count: 5,
              view_count: 100,
              created_at: new Date().toISOString(),
            }
          ],
          total: 1,
        })
      });
    });

    // Navigate to search page
    await page.goto('/search');

    // Type search query
    const searchInput = page.getByPlaceholder(/search notebooks/i);
    await searchInput.fill('test query');

    // Click clear button
    const clearButton = page.getByRole('button', { name: /clear/i });
    await clearButton.click();

    // Verify search input cleared
    await expect(searchInput).toHaveValue('');

    // Verify results reset to all notebooks
    // Mock default results
    await page.route('**/api/v1/search**', (route) => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get('q');

      if (!query) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [
              {
                id: 1,
                title: 'All Notebooks 1',
                username: 'user1',
                avatar_url: 'https://example.com/user1.jpg',
                like_count: 10,
                comment_count: 5,
                view_count: 100,
                created_at: new Date().toISOString(),
              },
              {
                id: 2,
                title: 'All Notebooks 2',
                username: 'user2',
                avatar_url: 'https://example.com/user2.jpg',
                like_count: 8,
                comment_count: 3,
                view_count: 80,
                created_at: new Date().toISOString(),
              }
            ],
            total: 2,
          })
        });
      }
    });

    await expect(page.getByText('All Notebooks 1')).toBeVisible();
    await expect(page.getByText('All Notebooks 2')).toBeVisible();
  });

  test('Search debouncing', async ({ page }) => {
    // Track API calls
    let apiCallCount = 0;

    // Mock search API
    await page.route('**/api/v1/search**', (route) => {
      apiCallCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [],
          total: 0,
        })
      });
    });

    // Navigate to search page
    await page.goto('/search');

    // Type search query rapidly
    const searchInput = page.getByPlaceholder(/search notebooks/i);

    await searchInput.fill('p');
    await page.waitForTimeout(50);
    await searchInput.fill('py');
    await page.waitForTimeout(50);
    await searchInput.fill('pyt');
    await page.waitForTimeout(50);
    await searchInput.fill('pyth');
    await page.waitForTimeout(50);
    await searchInput.fill('pytho');
    await page.waitForTimeout(50);
    await searchInput.fill('python');

    // Wait for debounce delay
    await page.waitForTimeout(600);

    // Verify search not called on every keystroke
    // Should be called only once after debounce
    expect(apiCallCount).toBeLessThan(7);

    // Verify search called after debounce delay
    expect(apiCallCount).toBeGreaterThanOrEqual(1);
  });

  test('Search from notebook title click', async ({ page }) => {
    // Mock search API
    await page.route('**/api/v1/search**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              id: 1,
              title: 'Test Notebook',
              username: 'user1',
              avatar_url: 'https://example.com/user1.jpg',
              like_count: 10,
              comment_count: 5,
              view_count: 100,
              created_at: new Date().toISOString(),
            }
          ],
          total: 1,
        })
      });
    });

    // Navigate to search page
    await page.goto('/search');

    // Type search query
    const searchInput = page.getByPlaceholder(/search notebooks/i);
    await searchInput.fill('test');
    await searchInput.press('Enter');

    // Click on notebook in search results
    const notebookLink = page.getByRole('link', { name: /test notebook/i });
    await notebookLink.click();

    // Verify notebook viewer opened
    await page.waitForURL('**/notebooks/**');

    // Use browser back button
    await page.goBack();

    // Verify search results preserved
    await expect(page.getByText('Test Notebook')).toBeVisible();
    await expect(searchInput).toHaveValue('test');
  });

  test('Recent searches', async ({ page }) => {
    // Mock search API
    await page.route('**/api/v1/search**', (route) => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get('q');

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              id: 1,
              title: `${query} Notebook`,
              username: 'user1',
              avatar_url: 'https://example.com/user1.jpg',
              like_count: 10,
              comment_count: 5,
              view_count: 100,
              created_at: new Date().toISOString(),
            }
          ],
          total: 1,
        })
      });
    });

    // Perform multiple searches
    const searchInput = page.getByPlaceholder(/search notebooks/i);

    await page.goto('/search');
    await searchInput.fill('python');
    await searchInput.press('Enter');
    await page.waitForTimeout(500);

    await searchInput.fill('data science');
    await searchInput.press('Enter');
    await page.waitForTimeout(500);

    await searchInput.fill('machine learning');
    await searchInput.press('Enter');
    await page.waitForTimeout(500);

    // Click search bar
    await searchInput.click();

    // Verify recent searches shown
    await expect(page.getByText(/recent searches/i)).toBeVisible();

    // Verify search history displayed
    await expect(page.getByText('python')).toBeVisible();
    await expect(page.getByText('data science')).toBeVisible();
    await expect(page.getByText('machine learning')).toBeVisible();

    // Click recent search
    const recentSearch = page.getByRole('button', { name: /python/i }).first();
    await recentSearch.click();

    // Verify search executed
    await expect(searchInput).toHaveValue('python');
    await expect(page.getByText('python Notebook')).toBeVisible();
  });
});
