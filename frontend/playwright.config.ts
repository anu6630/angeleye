import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for E2E testing
 *
 * Per D-13: Chromium-only for E2E (Chrome and Edge, both Chromium)
 * Per D-15: Full parallel test execution
 * Per D-16: Strict failure policy (no retries)
 */
export default defineConfig({
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0, // Strict failure policy per D-16
  workers: process.platform === 'darwin' ? 4 : 2, // Parallel execution per D-15
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure', // Only trace on failure for faster CI
    screenshot: 'only-on-failure', // Only screenshot on failure
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start dev server before running tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    timeout: 120000, // 2 minutes for server startup
    reuseExistingServer: !process.env.CI,
  },
})
