/**
 * Group-scoped posts: publish audience control and group timeline UI.
 */
import { test, expect, type Page, type Route } from '@playwright/test';

const API_BASE = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8000/api/v1';

test.describe.configure({ mode: 'serial' });

function setAuthUser2(page: Page) {
  return page.evaluate(() => {
    localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: {
          isAuthenticated: true,
          user: {
            id: 2,
            email: 'user2@example.com',
            username: 'user2',
            is_active: true,
            is_verified: true,
            avatar_url: 'https://example.com/user2.jpg',
            created_at: new Date().toISOString(),
          },
        },
        version: 0,
      })
    );
  });
}

const notebookJson = {
  id: 1,
  title: 'Test NB',
  user_id: 2,
  is_published: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  like_count: 0,
  comment_count: 0,
  cells: [{ cell_type: 'code', content: 'print(1)', order_index: 0 }],
};

const authMeJson = {
  id: 2,
  email: 'user2@example.com',
  username: 'user2',
  is_active: true,
  is_verified: true,
  avatar_url: 'https://example.com/user2.jpg',
  created_at: new Date().toISOString(),
};

/** Single catch-all for API origin (avoids stacking multiple Playwright route handlers). */
async function routeApi(page: Page, handler: (url: string, route: Route) => Promise<void>) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (!url.startsWith(API_BASE)) {
      await route.continue();
      return;
    }
    if (url.includes('/auth/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(authMeJson),
      });
      return;
    }
    await handler(url, route);
  });
}

test.describe('Group posts', () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await setAuthUser2(page);
    await page.reload();
  });

  test('publish dialog includes audience selector', async ({ page }) => {
    await routeApi(page, async (url, route) => {
      if (url.includes('/groups/me')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            groups: [
              {
                id: 99,
                name: 'My Group',
                slug: 'my-g',
                member_count: 2,
                visibility: 'public',
                join_policy: 'open',
                is_member: true,
                is_admin: true,
                can_join: false,
              },
            ],
            pending_invites: [],
            pending_admin_promotions: [],
          }),
        });
        return;
      }
      if (url.includes('/datasets')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ datasets: [], total: 0 }),
        });
        return;
      }
      const nb1 = /\/notebooks\/1(?![0-9])(?:\/|$|\?)/.test(url) && !url.includes('/cells');
      if (nb1 && route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(notebookJson),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/notebooks/1/edit');
    await expect(page.getByRole('button', { name: /^publish$/i })).toBeEnabled({ timeout: 60_000 });
    await page.getByRole('button', { name: /^publish$/i }).click();
    await expect(page.getByRole('heading', { name: /publish/i })).toBeVisible();
    const audience = page.locator('#publish-audience');
    await expect(audience).toBeVisible();
    await expect(audience.locator('option').filter({ hasText: /Anyone/ })).toBeAttached();
    await expect(audience.locator('option').filter({ hasText: /My Group/ })).toBeAttached();
  });

  test('publish request includes group_id when group audience selected', async ({ page }) => {
    let publishBody: string | null = null;

    await routeApi(page, async (url, route) => {
      const method = route.request().method();

      if (url.includes('/compilation/publish')) {
        publishBody = route.request().postData() ?? null;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            notebook_id: 1,
            is_published: true,
            output_url: 'https://example.com/out',
          }),
        });
        return;
      }
      if (url.includes('/compilation/compile/async')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ task_id: 'task-one', notebook_id: 1, status: 'pending' }),
        });
        return;
      }
      if (url.includes('/compilation/status/task-one')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            state: 'SUCCESS',
            result: {
              status: 'success',
              notebook_id: 1,
              output_key: 'nb/1/out.html',
              output_url: 'https://example.com/out',
            },
          }),
        });
        return;
      }
      if (url.includes('/groups/me')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            groups: [
              {
                id: 99,
                name: 'My Group',
                slug: 'my-g',
                member_count: 2,
                visibility: 'public',
                join_policy: 'open',
                is_member: true,
                is_admin: true,
                can_join: false,
              },
            ],
            pending_invites: [],
            pending_admin_promotions: [],
          }),
        });
        return;
      }
      if (url.includes('/datasets')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ datasets: [], total: 0 }),
        });
        return;
      }
      if (url.includes('/notebooks/1/cells')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ notebook_id: 1, cells_saved: 1 }),
        });
        return;
      }
      const nb1 = /\/notebooks\/1(?![0-9])(?:\/|$|\?)/.test(url) && !url.includes('/cells');
      if (nb1 && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(notebookJson),
        });
        return;
      }
      if (nb1 && method === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ...notebookJson }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/notebooks/1/edit');
    await expect(page.getByRole('button', { name: /^publish$/i })).toBeEnabled({ timeout: 60_000 });
    await page.getByRole('button', { name: /^publish$/i }).click();
    await page.locator('#publish-audience').selectOption('99');
    await page.getByRole('dialog').getByRole('button', { name: /^publish$/i }).click();

    await expect.poll(() => publishBody, { timeout: 60_000 }).toBeTruthy();
    const body = JSON.parse(publishBody!) as { group_id?: number };
    expect(body.group_id).toBe(99);
  });

  test('group detail page lists posts from API', async ({ page }) => {
    await routeApi(page, async (url, route) => {
      if (url.includes('/groups/test-slug/posts')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 42,
                title: 'Notebook In Group',
                username: 'user1',
                user_id: 1,
                like_count: 0,
                comment_count: 0,
                view_count: 0,
                created_at: new Date().toISOString(),
              },
            ],
            next_cursor: null,
            has_more: false,
          }),
        });
        return;
      }
      if (url.includes('/groups/test-slug') && !url.includes('/posts')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            name: 'Test Group',
            slug: 'test-slug',
            visibility: 'public',
            join_policy: 'open',
            member_count: 3,
            is_member: false,
            is_admin: false,
            can_join: true,
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/groups/test-slug');
    await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Notebook In Group')).toBeVisible();
    await expect(page.getByRole('link', { name: /Notebook In Group/i })).toHaveAttribute(
      'href',
      '/notebooks/42'
    );
  });
});
