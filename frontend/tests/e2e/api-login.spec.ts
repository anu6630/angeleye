/**
 * Direct API test for email/password login
 */
import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123'
};

test('API: Direct login call and cookie verification', async ({ page, context }) => {
  console.log('Step 1: Navigate to any page to establish context');
  await page.goto('http://localhost:3000');

  console.log('Step 2: Make direct API call to login via Playwright context');
  const apiResponse = await context.request.post('http://localhost:8000/api/v1/auth/login', {
    data: {
      email: TEST_USER.email,
      password: TEST_USER.password
    },
    headers: {
      'Content-Type': 'application/json',
    },
  });

  console.log('API Response:', {
    status: apiResponse.status(),
    statusText: apiResponse.statusText()
  });

  expect(apiResponse.status()).toBe(200);

  console.log('Step 3: Check cookies in browser context');
  const cookies = await context.cookies();
  console.log('Cookies in context:', cookies.map(c => ({
    name: c.name,
    domain: c.domain,
    httpOnly: c.httpOnly,
    value: c.value?.substring(0, 20) + '...'
  })));

  const accessToken = cookies.find(c => c.name === 'access_token');
  const refreshToken = cookies.find(c => c.name === 'refresh_token');

  expect(accessToken).toBeTruthy();
  expect(refreshToken).toBeTruthy();
  expect(accessToken?.domain).toBe('localhost');
  expect(accessToken?.httpOnly).toBe(true);

  console.log('✅ Direct API login successful, cookies set');

  console.log('Step 4: Navigate to feed and verify access');
  await page.goto('http://localhost:3000/feed');
  console.log('Feed page URL:', page.url());

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  console.log('✅ Successfully navigated to feed');
});
