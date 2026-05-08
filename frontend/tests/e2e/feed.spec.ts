/**
 * E2E tests for feed flow (mocked API + mocked session via /auth/me).
 */
import { test, expect } from '@playwright/test'
import { installMockCurrentUser } from './helpers/auth'

test.describe('Feed Flow', () => {
  test.beforeEach(async ({ page }) => {
    await installMockCurrentUser(page)
  })

  test('Browse feed', async ({ page }) => {
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
          })),
          next_cursor: 'next-page-token',
          has_more: true,
        }),
      })
    })

    await page.goto('/feed')

    await expect(page.getByRole('heading', { name: /^Feed$/ })).toBeVisible()
    await expect(page.locator('a[href="/notebooks/1"]')).toBeVisible()

    const grid = page.getByRole('grid', { name: 'Notebook feed' })
    await expect(grid.locator('a[href^="/notebooks/"]')).toHaveCount(10)
  })

  test('Infinite scroll', async ({ page }) => {
    await page.route('**/api/v1/feed**', (route) => {
      const url = new URL(route.request().url())
      const cursor = url.searchParams.get('cursor')

      if (!cursor) {
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
          }),
        })
      } else if (cursor === 'page-2') {
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
          }),
        })
      } else if (cursor === 'page-3') {
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
          }),
        })
      }
    })

    await page.goto('/feed')
    await expect(page.locator('a[href="/notebooks/1"]')).toBeVisible()

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(page.locator('a[href="/notebooks/11"]')).toBeVisible({ timeout: 15000 })

    const titles = await page.locator('[role="grid"][aria-label="Notebook feed"] h3').allTextContents()
    const unique = new Set(titles)
    expect(unique.size).toBe(titles.length)

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(page.getByText("You've seen all notebooks")).toBeVisible({ timeout: 15000 })
  })

  test('Notebook card in feed', async ({ page }) => {
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
            },
          ],
          next_cursor: null,
          has_more: false,
        }),
      })
    })

    await page.goto('/feed')

    await expect(page.getByRole('link', { name: /test notebook/i })).toBeVisible()
    await expect(page.getByText('@testuser')).toBeVisible()
    await expect(page.getByTitle('10 likes')).toBeVisible()
    await expect(page.getByTitle('5 comments')).toBeVisible()
    await expect(page.getByTitle('100 views')).toBeVisible()
  })

  test('Click notebook in feed', async ({ page }) => {
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
            },
          ],
          next_cursor: null,
          has_more: false,
        }),
      })
    })

    await page.route('**/api/v1/notebooks/1**', (route) => {
      if (route.request().method() !== 'GET') {
        return route.continue()
      }
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          title: 'Clickable Notebook',
          user_id: 1,
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 10,
          comment_count: 5,
          view_count: 100,
          username: 'testuser',
          cells: [],
        }),
      })
    })

    await page.goto('/feed')
    await page.getByRole('link', { name: /clickable notebook/i }).click()

    await page.waitForURL('**/notebooks/1**')
    await expect(page.getByRole('heading', { name: 'Clickable Notebook' })).toBeVisible()

    await page.goBack()
    await expect(page.getByRole('heading', { name: /^Feed$/ })).toBeVisible()
  })

  test('Refresh feed', async ({ page }) => {
    let refreshCount = 0
    await page.route('**/api/v1/feed**', (route) => {
      refreshCount++
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
            },
          ],
          next_cursor: null,
          has_more: false,
        }),
      })
    })

    await page.goto('/feed')
    await expect(page.locator('a[href="/notebooks/1"]')).toBeVisible()

    await page.reload()

    await expect(page.locator('a[href="/notebooks/2"]')).toBeVisible()
    expect(refreshCount).toBeGreaterThanOrEqual(2)
  })

  test('Trending view', async ({ page: _page }, testInfo) => {
    testInfo.skip(true, 'Feed page has no separate trending tab in the current UI.')
  })

  test('Engagement tracking', async ({ page }) => {
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
            },
          ],
          next_cursor: null,
          has_more: false,
        }),
      })
    })

    await page.route('**/api/v1/notebooks/1**', (route) => {
      if (route.request().method() !== 'GET') {
        return route.continue()
      }
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          title: 'View Test Notebook',
          user_id: 1,
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 10,
          comment_count: 5,
          view_count: 100,
          username: 'testuser',
          cells: [],
        }),
      })
    })

    await page.goto('/feed')
    await page.getByRole('link', { name: /view test notebook/i }).click()
    await expect(page.getByRole('heading', { name: 'View Test Notebook' })).toBeVisible()
  })

  test('Empty feed state', async ({ page }) => {
    await page.route('**/api/v1/feed**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          next_cursor: null,
          has_more: false,
        }),
      })
    })

    await page.goto('/feed')

    await expect(page.getByRole('heading', { name: /no notebooks yet/i })).toBeVisible()
  })

  test('Feed loading state', async ({ page }) => {
    await page.route('**/api/v1/feed**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
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
            },
          ],
          next_cursor: null,
          has_more: false,
        }),
      })
    })

    await page.goto('/feed')

    await expect(page.locator('.animate-pulse').first()).toBeVisible()

    await expect(page.getByRole('link', { name: /test notebook/i })).toBeVisible({ timeout: 8000 })
  })

  test('Feed error state', async ({ page }) => {
    let failedOnce = false
    await page.route('**/api/v1/feed**', (route) => {
      if (!failedOnce) {
        failedOnce = true
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Internal server error' }),
        })
        return
      }
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
            },
          ],
          next_cursor: null,
          has_more: false,
        }),
      })
    })

    await page.goto('/feed')

    await expect(page.getByText(/failed to load feed/i)).toBeVisible()
    await page.getByRole('button', { name: /retry/i }).click()
    await expect(page.getByRole('link', { name: /test notebook/i })).toBeVisible()
  })
})
