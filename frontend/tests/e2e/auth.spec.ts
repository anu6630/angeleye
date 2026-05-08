/**
 * E2E tests for authentication flow
 */
import { test, expect } from '@playwright/test'
import { loginViaHomeEmailForm, E2E_TEST_USER } from './helpers/auth'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('Google OAuth login (happy path)', async ({ page: _page }, testInfo) => {
    testInfo.skip(true, 'Real OAuth redirect is not automated; use email-login.spec.ts for auth E2E.')
  })

  test('Session persistence', async ({ page }) => {
    await loginViaHomeEmailForm(page)
    await page.waitForURL('**/feed', { timeout: 15000 })

    await page.reload()
    await page.waitForURL('**/feed', { timeout: 10000 })

    await expect(page.getByRole('button', { name: /testuser/i })).toBeVisible()
  })

  test('Logout', async ({ page }) => {
    await loginViaHomeEmailForm(page)
    await page.waitForURL('**/feed', { timeout: 15000 })

    await page.getByRole('button', { name: /testuser/i }).click()
    await page.getByRole('menuitem', { name: /sign out/i }).click()

    await expect.poll(
      async () => (await page.context().cookies()).filter((c) => c.name === 'access_token').length,
      { timeout: 10000 }
    ).toBe(0)

    await expect(page.getByRole('banner').getByRole('link', { name: /^Sign in$/ })).toBeVisible()
  })

  test('Protected route redirects to login', async ({ page }) => {
    await page.goto('/notebooks/new')
    await page.waitForURL('**/login')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  test('Login and navigate to profile', async ({ page }) => {
    await loginViaHomeEmailForm(page)
    await page.waitForURL('**/feed', { timeout: 15000 })

    await page.getByRole('button', { name: /testuser/i }).click()
    await page.getByRole('menuitem', { name: /^Profile$/i }).click()
    await page.waitForURL(`**/profile/${E2E_TEST_USER.username}**`, { timeout: 15000 })

    await expect(page.getByText(new RegExp(`@${E2E_TEST_USER.username}`, 'i'))).toBeVisible()
  })
})
