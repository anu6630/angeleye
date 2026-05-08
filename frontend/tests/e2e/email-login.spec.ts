/**
 * E2E tests for email/password authentication flow
 */
import { test, expect } from '@playwright/test'
import { loginViaHomeEmailForm, openEmailForm, E2E_TEST_USER } from './helpers/auth'

test.describe('Email/Password Authentication Flow', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
  })

  test('Login with email and password from home', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/NotebookSocial/)

    await loginViaHomeEmailForm(page)

    await page.waitForURL('**/feed', { timeout: 15000 })
    await expect(page).toHaveURL(/\/feed/)

    const cookies = await page.context().cookies()
    expect(cookies.find((c) => c.name === 'access_token')).toBeTruthy()
    expect(cookies.find((c) => c.name === 'refresh_token')).toBeTruthy()
  })

  test('Login from /login with Email tab', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Email' }).click()
    await page.getByLabel('Email').fill(E2E_TEST_USER.email)
    await page.getByLabel('Password').fill(E2E_TEST_USER.password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('**/feed', { timeout: 15000 })
  })

  test('Session persistence across page reloads', async ({ page }) => {
    await loginViaHomeEmailForm(page)
    await page.waitForURL('**/feed', { timeout: 15000 })

    await page.reload()
    await page.waitForURL('**/feed', { timeout: 10000 })

    const cookies = await page.context().cookies()
    expect(cookies.find((c) => c.name === 'access_token')).toBeTruthy()
  })

  test('Feed is reachable without login (public)', async ({ page }) => {
    await page.goto('/feed')
    await expect(page.getByRole('heading', { name: /^Feed$/ })).toBeVisible({ timeout: 15000 })
  })

  test('Logout clears session via UI', async ({ page }) => {
    await loginViaHomeEmailForm(page)
    await page.waitForURL('**/feed', { timeout: 15000 })

    const userMenu = page
      .getByRole('button', { name: /testuser/i })
      .or(page.locator('header').getByRole('button').filter({ hasText: /testuser|^TE$/i }))
    await userMenu.click()
    await page.getByRole('menuitem', { name: /sign out/i }).click()

    await expect.poll(
      async () => (await page.context().cookies()).filter((c) => c.name === 'access_token').length,
      { timeout: 10000 }
    ).toBe(0)
  })

  test('Invalid credentials show error message', async ({ page }) => {
    await openEmailForm(page)
    await page.getByLabel('Email').fill('wrong@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(
      page.locator('[role="alert"]:not(#__next-route-announcer__)')
    ).toBeVisible({ timeout: 8000 })
  })

  test('Feed loads successfully after login', async ({ page }) => {
    await loginViaHomeEmailForm(page)
    await page.waitForURL('**/feed', { timeout: 15000 })
    await expect(page.getByRole('heading', { name: /^Feed$/ })).toBeVisible({ timeout: 15000 })
  })
})
