# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: manual-oauth.spec.ts >> Manual OAuth Verification >> Complete Google OAuth flow manually
- Location: tests/e2e/manual-oauth.spec.ts:11:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "Share & Remix"
Received string:    "Notebooks as social posts.Edit fast with WASM. Ship with Docker."
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h1')
    9 × locator resolved to <h1 class="font-display text-4xl font-semibold tracking-tight text-foreground md:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">…</h1>
      - unexpected value "Notebooks as social posts.Edit fast with WASM. Ship with Docker."

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "NotebookSocial" [ref=e4] [cursor=pointer]:
        - /url: /
        - img [ref=e6]
        - generic [ref=e9]: NotebookSocial
      - navigation "Main" [ref=e10]:
        - link "Feed" [ref=e11] [cursor=pointer]:
          - /url: /feed
          - button "Feed" [ref=e12]:
            - img [ref=e13]
            - text: Feed
        - link "Search" [ref=e16] [cursor=pointer]:
          - /url: /search
          - button "Search" [ref=e17]:
            - img [ref=e18]
            - text: Search
        - link "My notebooks" [ref=e21] [cursor=pointer]:
          - /url: /my-notebooks
          - button "My notebooks" [ref=e22]:
            - img [ref=e23]
            - text: My notebooks
        - link "New" [ref=e26] [cursor=pointer]:
          - /url: /notebooks/new
          - button "New" [ref=e27]:
            - img [ref=e28]
            - text: New
      - generic [ref=e31]:
        - link "Sign in" [ref=e32] [cursor=pointer]:
          - /url: /login
          - img [ref=e33]
          - text: Sign in
        - link "Join" [ref=e36] [cursor=pointer]:
          - /url: /
  - main [ref=e37]:
    - generic [ref=e39]:
      - generic [ref=e40]:
        - paragraph [ref=e41]:
          - img [ref=e42]
          - text: Draft in the browser · Publish from the cloud
        - generic [ref=e44]:
          - heading "Notebooks as social posts. Edit fast with WASM. Ship with Docker." [level=1] [ref=e45]:
            - text: Notebooks as social posts.
            - generic [ref=e46]: Edit fast with WASM. Ship with Docker.
          - paragraph [ref=e47]: "NotebookSocial is a feed for computational work: write Python notebooks in the editor, run cells locally for speed, then compile in an isolated container when you are ready to publish for everyone."
        - generic [ref=e48]:
          - generic [ref=e49]:
            - img [ref=e50]
            - heading "WASM editing" [level=3] [ref=e54]
            - paragraph [ref=e55]: Try ideas in the browser without waiting on the server.
          - generic [ref=e56]:
            - img [ref=e57]
            - heading "Container compile" [level=3] [ref=e61]
            - paragraph [ref=e62]: One click sends your notebook to a reproducible build.
          - generic [ref=e63]:
            - img [ref=e64]
            - heading "Fork & remix" [level=3] [ref=e69]
            - paragraph [ref=e70]: Every fork is a first-class post in the feed.
        - generic [ref=e71]:
          - link "Browse feed" [ref=e72] [cursor=pointer]:
            - /url: /feed
          - link "Sign in" [ref=e73] [cursor=pointer]:
            - /url: /login
      - generic [ref=e75]:
        - generic [ref=e76]:
          - heading "Join or sign in" [level=3] [ref=e77]
          - paragraph [ref=e78]: OAuth for speed, or email if you prefer a password.
        - generic [ref=e79]:
          - generic [ref=e80]:
            - button "Sign in with Google" [ref=e81] [cursor=pointer]:
              - img [ref=e83]
              - generic [ref=e88]: Sign in with Google
            - button "Sign in with Facebook" [ref=e89] [cursor=pointer]:
              - img [ref=e91]
              - generic [ref=e93]: Sign in with Facebook
          - generic [ref=e94]: or
          - button "Continue with email" [ref=e96] [cursor=pointer]
          - paragraph [ref=e97]: By continuing you agree to the terms and privacy policy for this demo environment.
  - alert [ref=e98]
```

# Test source

```ts
  1   | /**
  2   |  * Manual OAuth test for interactive verification
  3   |  *
  4   |  * This test opens a headed browser for manual OAuth testing.
  5   |  * User clicks the Google login button and completes OAuth manually.
  6   |  * Then we verify the authentication state and navigation.
  7   |  */
  8   | import { test, expect } from '@playwright/test';
  9   | 
  10  | test.describe('Manual OAuth Verification', () => {
  11  |   test('Complete Google OAuth flow manually', async ({ page, context }) => {
  12  |     // Enable detailed logging
  13  |     page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
  14  | 
  15  |     // Navigate to home page
  16  |     await page.goto('http://localhost:3000');
  17  |     console.log('✓ Navigated to home page');
  18  | 
  19  |     // Verify page loaded
> 20  |     await expect(page.locator('h1')).toContainText('Share & Remix');
      |                                      ^ Error: expect(locator).toContainText(expected) failed
  21  |     console.log('✓ Home page loaded successfully');
  22  | 
  23  |     // Wait for Google OAuth button
  24  |     const googleButton = page.getByRole('button', { name: /sign in with google/i });
  25  |     await expect(googleButton).toBeVisible({ timeout: 10000 });
  26  |     console.log('✓ Google OAuth button is visible');
  27  | 
  28  |     // Click Google login button
  29  |     console.log('🔵 Clicking Google OAuth button...');
  30  |     await googleButton.click();
  31  | 
  32  |     // Wait for OAuth redirect (this will go to Google)
  33  |     // We'll wait for either the OAuth callback or the profile wizard
  34  |     console.log('⏳ Waiting for OAuth redirect...');
  35  | 
  36  |     // Wait up to 2 minutes for user to complete OAuth
  37  |     try {
  38  |       await page.waitForURL(/(profile-wizard|feed|\/\?code=)/, { timeout: 120000 });
  39  |       console.log('✓ OAuth redirect detected');
  40  |     } catch (error) {
  41  |       console.log('⚠️ Timeout waiting for OAuth redirect. Current URL:', page.url());
  42  |       throw new Error('OAuth redirect timeout - user may need more time');
  43  |     }
  44  | 
  45  |     const currentUrl = page.url();
  46  |     console.log('Current URL:', currentUrl);
  47  | 
  48  |     // Check if redirected to profile wizard (new user)
  49  |     if (currentUrl.includes('profile-wizard')) {
  50  |       console.log('📍 Redirected to profile wizard (new user)');
  51  | 
  52  |       // Verify profile wizard form exists
  53  |       await expect(page.getByPlaceholder(/username/i)).toBeVisible({ timeout: 10000 });
  54  |       console.log('✓ Profile wizard form is visible');
  55  | 
  56  |       // For testing, we can't complete the form without user input
  57  |       console.log('⚠️ Manual intervention needed: Complete profile wizard');
  58  | 
  59  |     } else if (currentUrl.includes('feed') || currentUrl === 'http://localhost:3000/') {
  60  |       console.log('📍 Redirected to feed (existing user)');
  61  | 
  62  |       // Wait a moment for page to fully load
  63  |       await page.waitForTimeout(2000);
  64  | 
  65  |       // Check if auth cookies are set
  66  |       const cookies = await context.cookies();
  67  |       const accessToken = cookies.find(c => c.name === 'access_token');
  68  |       const refreshToken = cookies.find(c => c.name === 'refresh_token');
  69  | 
  70  |       if (accessToken && refreshToken) {
  71  |         console.log('✓ Auth cookies are set');
  72  |         console.log('  - access_token:', accessToken.value.substring(0, 20) + '...');
  73  |         console.log('  - refresh_token:', refreshToken.value.substring(0, 20) + '...');
  74  |       } else {
  75  |         console.log('❌ Auth cookies NOT set');
  76  |         console.log('Available cookies:', cookies.map(c => c.name));
  77  |       }
  78  | 
  79  |       // Try to fetch user info via API
  80  |       const apiResponse = await page.evaluate(async () => {
  81  |         try {
  82  |           const response = await fetch('http://localhost:8000/api/v1/auth/me', {
  83  |             credentials: 'include'
  84  |           });
  85  |           const data = await response.json();
  86  |           return { status: response.status, data };
  87  |         } catch (error) {
  88  |           return { error: error.message };
  89  |         }
  90  |       });
  91  | 
  92  |       if (apiResponse.status === 200) {
  93  |         console.log('✓ Auth API call successful');
  94  |         console.log('  User data:', JSON.stringify(apiResponse.data, null, 2));
  95  |       } else {
  96  |         console.log('❌ Auth API call failed');
  97  |         console.log('  Response:', JSON.stringify(apiResponse, null, 2));
  98  |       }
  99  | 
  100 |       // Check for feed content
  101 |       const feedContainer = page.locator('[class*="feed"], [class*="notebook"]');
  102 |       const feedVisible = await feedContainer.first().isVisible().catch(() => false);
  103 | 
  104 |       if (feedVisible) {
  105 |         console.log('✓ Feed content is visible');
  106 |       } else {
  107 |         console.log('⚠️ Feed content may not be loaded');
  108 |       }
  109 | 
  110 |     } else {
  111 |       console.log('⚠️ Unexpected redirect URL:', currentUrl);
  112 |     }
  113 | 
  114 |     // Take a screenshot for verification
  115 |     await page.screenshot({ path: 'test-results/manual-oauth-final.png', fullPage: true });
  116 |     console.log('📸 Screenshot saved to test-results/manual-oauth-final.png');
  117 | 
  118 |     console.log('\n✅ Manual OAuth test completed. Review the screenshot above.');
  119 |   });
  120 | });
```