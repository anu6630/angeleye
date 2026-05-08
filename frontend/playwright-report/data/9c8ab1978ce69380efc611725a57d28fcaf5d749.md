# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cookie-debug.spec.ts >> Debug: Cookie authentication flow
- Location: tests/e2e/cookie-debug.spec.ts:11:5

# Error details

```
Error: page.textContent: selector: expected string, got undefined
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - img [ref=e4]
  - heading "This page couldn’t load" [level=1] [ref=e6]
  - paragraph [ref=e7]: Reload to try again, or go back.
  - generic [ref=e8]:
    - button "Reload" [ref=e10] [cursor=pointer]
    - button "Back" [ref=e11] [cursor=pointer]
```

# Test source

```ts
  1   | /**
  2   |  * Debug test for cookie authentication
  3   |  */
  4   | import { test, expect } from '@playwright/test';
  5   | 
  6   | const TEST_USER = {
  7   |   email: 'test@example.com',
  8   |   password: 'testpassword123'
  9   | };
  10  | 
  11  | test('Debug: Cookie authentication flow', async ({ page, context }) => {
  12  |   console.log('Step 1: Navigate to home page');
  13  |   await page.goto('http://localhost:3000');
  14  | 
  15  |   console.log('Step 2: Login with email/password');
  16  |   await page.click('button:has-text("Continue with Email")');
  17  |   await page.fill('input[type="email"]', TEST_USER.email);
  18  |   await page.fill('input[type="password"]', TEST_USER.password);
  19  |   await page.click('button[type="submit"]');
  20  | 
  21  |   console.log('Step 3: Wait for redirect');
  22  |   await page.waitForTimeout(2000);
  23  |   const currentUrl = page.url();
  24  |   console.log(`  Current URL: ${currentUrl}`);
  25  | 
  26  |   console.log('Step 4: Check cookies');
  27  |   const cookies = await context.cookies();
  28  |   console.log('  All cookies:', cookies.map(c => ({
  29  |     name: c.name,
  30  |     domain: c.domain,
  31  |     path: c.path,
  32  |     httpOnly: c.httpOnly,
  33  |     value: c.value?.substring(0, 30) + '...'
  34  |   })));
  35  | 
  36  |   const accessToken = cookies.find(c => c.name === 'access_token');
  37  |   const refreshToken = cookies.find(c => c.name === 'refresh_token');
  38  | 
  39  |   if (accessToken) {
  40  |     console.log(`  ✓ access_token found: domain=${accessToken.domain}, path=${accessToken.path}`);
  41  |   } else {
  42  |     console.log('  ✗ access_token NOT found');
  43  |   }
  44  | 
  45  |   if (refreshToken) {
  46  |     console.log(`  ✓ refresh_token found: domain=${refreshToken.domain}, path=${refreshToken.path}`);
  47  |   } else {
  48  |     console.log('  ✗ refresh_token NOT found');
  49  |   }
  50  | 
  51  |   console.log('Step 5: Test API call with cookies');
  52  |   try {
  53  |     const apiResponse = await page.evaluate(async () => {
  54  |       const response = await fetch('http://localhost:8000/api/v1/notebooks', {
  55  |         method: 'GET',
  56  |         credentials: 'include',
  57  |         headers: {
  58  |           'Content-Type': 'application/json'
  59  |         }
  60  |       });
  61  |       return {
  62  |         status: response.status,
  63  |         statusText: response.statusText,
  64  |         ok: response.ok,
  65  |         data: await response.json().catch(() => null)
  66  |       };
  67  |     });
  68  | 
  69  |     console.log('  API Response:', JSON.stringify(apiResponse, null, 2));
  70  | 
  71  |     if (apiResponse.ok) {
  72  |       console.log(`  ✓ API call successful! Found ${apiResponse.data?.length || 0} notebooks`);
  73  |     } else {
  74  |       console.log(`  ✗ API call failed: ${apiResponse.status}`);
  75  |     }
  76  |   } catch (error) {
  77  |     console.log(`  ✗ API call error: ${error}`);
  78  |   }
  79  | 
  80  |   console.log('Step 6: Navigate to My Notebooks page');
  81  |   await page.goto('http://localhost:3000/my-notebooks');
  82  |   await page.waitForTimeout(2000);
  83  | 
  84  |   console.log('Step 7: Check page content');
> 85  |   const pageText = await page.textContent();
      |                               ^ Error: page.textContent: selector: expected string, got undefined
  86  |   console.log(`  Page text preview: ${pageText.substring(0, 200)}...`);
  87  | 
  88  |   const hasNotebooks = await page.locator('text=/Test Notebook/').isVisible().catch(() => false);
  89  |   const hasError = await page.locator('text=/Failed to load|Authentication required/').isVisible().catch(() => false);
  90  |   const hasEmptyState = await page.locator('text=/No notebooks yet/').isVisible().catch(() => false);
  91  | 
  92  |   console.log(`  Has "Test Notebook": ${hasNotebooks}`);
  93  |   console.log(`  Has error: ${hasError}`);
  94  |   console.log(`  Has empty state: ${hasEmptyState}`);
  95  | 
  96  |   if (hasNotebooks) {
  97  |     console.log('✅ SUCCESS: Notebook is displayed!');
  98  |   } else if (hasEmptyState) {
  99  |     console.log('⚠️  Empty state shown (no notebooks)');
  100 |   } else if (hasError) {
  101 |     console.log('❌ FAILED: Error is shown');
  102 |   } else {
  103 |     console.log('❓ UNKNOWN: Unexpected page state');
  104 |   }
  105 | 
  106 |   console.log('Step 8: Take screenshot for manual inspection');
  107 |   await page.screenshot({ path: 'test-results/cookie-debug-my-notebooks.png', fullPage: true });
  108 |   console.log('✓ Screenshot saved to test-results/cookie-debug-my-notebooks.png');
  109 | });
  110 | 
```