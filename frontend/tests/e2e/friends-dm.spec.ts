import { test, expect } from '@playwright/test';

const API = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8000/api/v1';
const FE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

let servicesUp = false;

test.beforeAll(async () => {
  try {
    const h = await fetch('http://localhost:8000/health');
    servicesUp = h.ok;
  } catch {
    servicesUp = false;
  }
});

test.describe('Friends and direct messages', () => {
  test('register pair, accept request, exchange DM', async ({ browser }) => {
    test.skip(!servicesUp, 'Backend (localhost:8000) not reachable');

    const suffix = Date.now().toString(36);
    const email1 = `e2e_u1_${suffix}@example.com`;
    const email2 = `e2e_u2_${suffix}@example.com`;
    const user1 = `e2e1_${suffix}`;
    const user2 = `e2e2_${suffix}`;

    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();

    const reg1 = await ctx1.request.post(`${API}/auth/register`, {
      data: { email: email1, username: user1, password: 'TestPassword123!' },
    });
    const reg2 = await ctx2.request.post(`${API}/auth/register`, {
      data: { email: email2, username: user2, password: 'TestPassword123!' },
    });
    expect(reg1.ok()).toBeTruthy();
    expect(reg2.ok()).toBeTruthy();
    const body1 = (await reg1.json()) as { user_id: number };
    const body2 = (await reg2.json()) as { user_id: number };
    const id1 = body1.user_id;
    const id2 = body2.user_id;

    const fr = await ctx1.request.post(`${API}/friends/requests`, {
      data: { addressee_id: id2 },
    });
    expect(fr.ok()).toBeTruthy();

    const page2 = await ctx2.newPage();
    await page2.goto(`${FE}/friends`);
    await page2.getByRole('button', { name: 'Accept' }).click();
    await expect(page2.getByText(`@${user1}`)).toBeVisible({ timeout: 15000 });

    const openConv = await ctx1.request.post(`${API}/conversations/direct`, {
      data: { other_user_id: id2 },
    });
    expect(openConv.ok()).toBeTruthy();
    const convBody = (await openConv.json()) as { conversation_id: number };
    const convId = convBody.conversation_id;

    const page1 = await ctx1.newPage();
    await page1.goto(`${FE}/messages/${convId}`);
    await expect(page1.getByPlaceholder('Message…')).toBeVisible({ timeout: 15000 });
    await page1.getByPlaceholder('Message…').fill('hello from e2e');
    await page1.getByRole('button', { name: 'Send message' }).click();

    await page2.goto(`${FE}/messages`);
    await page2.getByRole('link', { name: new RegExp(user1) }).click();
    await expect(page2.getByText('hello from e2e')).toBeVisible({ timeout: 15000 });

    await ctx1.close();
    await ctx2.close();
  });
});
