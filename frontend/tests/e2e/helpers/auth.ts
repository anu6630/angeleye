import type { Page } from '@playwright/test'

export const E2E_TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
  username: 'testuser',
} as const

/** Matches `MeResponse` from the API — keeps `fetchUser()` from clearing session in E2E. */
export const MOCK_ME_USER = {
  id: 1,
  email: E2E_TEST_USER.email,
  username: E2E_TEST_USER.username,
  is_active: true,
  is_verified: true,
  bio: 'Test bio',
  avatar_url: 'https://example.com/avatar.jpg',
  created_at: new Date().toISOString(),
}

export async function installMockCurrentUser(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/me**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ME_USER),
    })
  })
}

export async function openEmailForm(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: /continue with email/i }).click()
}

export async function loginViaHomeEmailForm(page: Page): Promise<void> {
  await openEmailForm(page)
  await page.getByLabel('Email').fill(E2E_TEST_USER.email)
  await page.getByLabel('Password').fill(E2E_TEST_USER.password)
  await page.getByRole('button', { name: /sign in/i }).click()
}
