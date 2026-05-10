/**
 * Group page shows live browsing count from GET /groups/{slug}/presence.
 */
import { test, expect, type Page } from '@playwright/test';

const API_PREFIX = '/api/v1';
const SLUG = 'presence-e2e-group';

/** CORS for credentialed fetches from http://localhost:3000 → API origin. */
const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': 'http://localhost:3000',
  'Access-Control-Allow-Credentials': 'true',
};

function apiPath(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    return pathname.startsWith(API_PREFIX) ? pathname : null;
  } catch {
    return null;
  }
}

const authMeJson = {
  id: 2,
  email: 'user2@example.com',
  username: 'user2',
  is_active: true,
  is_verified: true,
  avatar_url: null,
  created_at: new Date().toISOString(),
};

const groupJson = {
  id: 501,
  name: 'Presence E2E Group',
  slug: SLUG,
  description: null,
  visibility: 'public',
  join_policy: 'open',
  icon_url: null,
  banner_url: null,
  member_count: 12,
  created_at: new Date().toISOString(),
  is_member: true,
  is_admin: false,
  can_join: false,
};

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
            avatar_url: null,
            created_at: new Date().toISOString(),
          },
        },
        version: 0,
      })
    );
  });
}

async function routeGroupPresenceApi(page: Page, onlineCount: number) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const path = apiPath(url);

    if (path && path.startsWith(API_PREFIX) && method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...CORS,
          'Access-Control-Allow-Methods': 'GET,POST,DELETE,PUT,PATCH,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
      });
      return;
    }

    if (!path) {
      await route.continue();
      return;
    }

    if (path.startsWith(`${API_PREFIX}/auth/me`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { ...CORS },
        body: JSON.stringify(authMeJson),
      });
      return;
    }

    if (path === `${API_PREFIX}/groups/${SLUG}/presence/heartbeat` && method === 'POST') {
      await route.fulfill({ status: 204, headers: { ...CORS } });
      return;
    }

    if (path === `${API_PREFIX}/groups/${SLUG}/presence` && method === 'DELETE') {
      await route.fulfill({ status: 204, headers: { ...CORS } });
      return;
    }

    if (path === `${API_PREFIX}/groups/${SLUG}/presence` && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { ...CORS },
        body: JSON.stringify({ online_user_count: onlineCount }),
      });
      return;
    }

    if (path === `${API_PREFIX}/groups/${SLUG}/posts` || path.startsWith(`${API_PREFIX}/groups/${SLUG}/posts?`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { ...CORS },
        body: JSON.stringify({ items: [], next_cursor: null, has_more: false }),
      });
      return;
    }

    if (path === `${API_PREFIX}/groups/${SLUG}`) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { ...CORS },
        body: JSON.stringify(groupJson),
      });
      return;
    }

    await route.continue();
  });
}

test.describe('Group presence counter', () => {
  test.describe.configure({ mode: 'serial' });

  test('shows browsing count from presence API', async ({ page }) => {
    await routeGroupPresenceApi(page, 7);

    await page.goto('/login');
    await setAuthUser2(page);
    await page.reload();

    await page.goto(`/groups/${SLUG}`);
    await expect(page.getByRole('heading', { name: groupJson.name })).toBeVisible({ timeout: 30_000 });

    const badge = page.getByTestId('group-online-count');
    await expect(badge).toBeVisible({ timeout: 15_000 });
    await expect(badge).toContainText('7');
    await expect(badge).toContainText('people browsing');
  });

  test('singular copy for one browser', async ({ page }) => {
    await routeGroupPresenceApi(page, 1);

    await page.goto('/login');
    await setAuthUser2(page);
    await page.reload();

    await page.goto(`/groups/${SLUG}`);
    await expect(page.getByTestId('group-online-count')).toContainText('1 person browsing', {
      timeout: 15_000,
    });
  });
});
