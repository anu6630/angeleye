/**
 * Full path: save notebook → server compile (Docker/Celery) → publish → visible on feed.
 * Requires backend + Redis + Celery worker + MinIO (typical docker compose).
 */
import { test, expect } from '@playwright/test'

const API = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8000/api/v1'

const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
}

test.describe('Notebook publish lifecycle', () => {
  test.describe.configure({ timeout: 240_000 })

  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
  })

  test('save, build & publish from one dialog, then listing shows on feed', async ({ page, context }) => {
    const loginRes = await context.request.post(`${API}/auth/login`, {
      data: { email: TEST_USER.email, password: TEST_USER.password },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(loginRes.ok(), `login failed: ${loginRes.status()}`).toBeTruthy()

    await page.goto('/notebooks/new')
    await page.waitForLoadState('domcontentloaded')

    const title = `E2E Publish ${Date.now()}`
    await page.getByPlaceholder(/untitled notebook/i).fill(title)

    await page.getByRole('button', { name: /^save$/i }).click()
    await page.waitForTimeout(3000)

    await page.getByRole('button', { name: /^publish$/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const dialogPublish = page.getByRole('dialog').getByRole('button', { name: /^publish$/i })
    await expect(dialogPublish).toBeVisible({ timeout: 5000 })
    await dialogPublish.click()

    await expect(
      page.getByRole('dialog').getByText(/published to the social feed/i)
    ).toBeVisible({ timeout: 180_000 })

    await page.getByRole('dialog').getByRole('button', { name: /^close$/i }).click()

    await page.goto('/feed')
    await expect(page.getByText(title, { exact: false })).toBeVisible({ timeout: 30000 })
  })
})
