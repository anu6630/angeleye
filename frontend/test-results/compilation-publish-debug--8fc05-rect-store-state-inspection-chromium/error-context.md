# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: compilation-publish-debug.spec.ts >> Compilation to Publish Debug Test >> Direct store state inspection
- Location: tests/e2e/compilation-publish-debug.spec.ts:172:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "Welcome to NotebookSocial"
Received string:    "Welcome back"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h1')
    9 × locator resolved to <h1 class="font-display text-3xl font-semibold tracking-tight">Welcome back</h1>
      - unexpected value "Welcome back"

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
  - generic [ref=e38]:
    - generic [ref=e39]:
      - img [ref=e41]
      - heading "Welcome back" [level=1] [ref=e44]
      - paragraph [ref=e45]: Sign in to create notebooks, compile, and publish to the feed.
      - paragraph [ref=e46]:
        - text: New here?
        - link "Start on the home page" [ref=e47] [cursor=pointer]:
          - /url: /
    - generic [ref=e48]:
      - generic [ref=e49]:
        - heading "Sign in" [level=3] [ref=e50]
        - paragraph [ref=e51]: Choose OAuth or email — same account either way.
      - generic [ref=e52]:
        - generic [ref=e53]:
          - button "OAuth" [ref=e54] [cursor=pointer]
          - button "Email" [ref=e55] [cursor=pointer]
        - generic [ref=e56]:
          - button "Sign in with Google" [ref=e57] [cursor=pointer]:
            - img [ref=e59]
            - generic [ref=e64]: Sign in with Google
          - button "Sign in with Facebook" [ref=e65] [cursor=pointer]:
            - img [ref=e67]
            - generic [ref=e69]: Sign in with Facebook
  - alert [ref=e70]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Compilation to Publish Debug Test', () => {
  4   |   const email = 'test@example.com';
  5   |   const password = 'TestPassword123!';
  6   | 
  7   |   test.beforeEach(async ({ page, context }) => {
  8   |     // Enable detailed console logging
  9   |     context.on('console', msg => {
  10  |       if (msg.type() === 'error' || msg.type() === 'warn') {
  11  |         console.log(`[Browser ${msg.type()}]:`, msg.text());
  12  |       }
  13  |     });
  14  | 
  15  |     // Navigate to login page
  16  |     await page.goto('http://localhost:3000/login');
  17  | 
  18  |     // Wait for login page to load
> 19  |     await expect(page.locator('h1')).toContainText('Welcome to NotebookSocial');
      |                                      ^ Error: expect(locator).toContainText(expected) failed
  20  | 
  21  |     // Click Email tab to switch to email/password form
  22  |     await page.click('button:has-text("Email")');
  23  | 
  24  |     // Wait for email form to appear
  25  |     await page.waitForSelector('input[type="email"]');
  26  | 
  27  |     // Fill in credentials
  28  |     await page.fill('input[type="email"]', email);
  29  |     await page.fill('input[type="password"]', password);
  30  | 
  31  |     // Click login button
  32  |     await page.click('button[type="submit"]');
  33  | 
  34  |     // Wait for redirect to feed page (after successful login)
  35  |     await page.waitForURL('**/feed');
  36  |   });
  37  | 
  38  |   test('Debug compilation and publish workflow', async ({ page }) => {
  39  |     // Navigate to notebook edit page
  40  |     await page.goto('http://localhost:3000/notebooks/25/edit');
  41  | 
  42  |     // Wait for editor to load
  43  |     await page.waitForSelector('[data-testid="notebook-editor"]', { timeout: 10000 });
  44  |     console.log('✅ Notebook editor loaded');
  45  | 
  46  |     // Check initial compilation store state
  47  |     const initialState = await page.evaluate(() => {
  48  |       if (typeof window !== 'undefined') {
  49  |         // @ts-ignore - accessing store from window for debugging
  50  |         const store = window.useCompilationStore?.getState?.();
  51  |         return store ? {
  52  |           compilationStatus: store.compilationStatus,
  53  |           currentNotebookId: store.currentNotebookId,
  54  |           outputUrl: store.outputUrl,
  55  |           outputKey: store.outputKey,
  56  |         } : null;
  57  |       }
  58  |       return null;
  59  |     });
  60  |     console.log('📊 Initial compilation state:', initialState);
  61  | 
  62  |     // Click Compile button
  63  |     const compileButton = page.locator('button').filter({ hasText: /Compile/i });
  64  |     await compileButton.click();
  65  |     console.log('✅ Compile button clicked');
  66  | 
  67  |     // Wait for compilation dialog to appear
  68  |     await expect(page.locator('[role="dialog"]')).toBeVisible();
  69  |     console.log('✅ Compilation dialog appeared');
  70  | 
  71  |     // Wait for compilation to complete (up to 120 seconds)
  72  |     console.log('⏳ Waiting for compilation to complete...');
  73  |     await expect(async () => {
  74  |       const dialogText = await page.locator('[role="dialog"]').textContent();
  75  |       console.log('📝 Dialog text:', dialogText?.substring(0, 200));
  76  |       expect(dialogText).toContain('successfully') || expect(dialogText).toContain('failed');
  77  |     }).toPass({ timeout: 120000 });
  78  | 
  79  |     // Verify success message
  80  |     const dialogText = await page.locator('[role="dialog"]').textContent();
  81  |     expect(dialogText).toContain('successfully');
  82  |     console.log('✅ Compilation succeeded');
  83  | 
  84  |     // Check compilation store state after successful compilation
  85  |     const afterCompileState = await page.evaluate(() => {
  86  |       if (typeof window !== 'undefined') {
  87  |         // @ts-ignore - accessing store from window for debugging
  88  |         const store = window.useCompilationStore?.getState?.();
  89  |         return store ? {
  90  |           compilationStatus: store.compilationStatus,
  91  |           currentNotebookId: store.currentNotebookId,
  92  |           outputUrl: store.outputUrl,
  93  |           outputKey: store.outputKey,
  94  |         } : null;
  95  |       }
  96  |       return null;
  97  |     });
  98  |     console.log('📊 After compilation state:', afterCompileState);
  99  | 
  100 |     // Close compilation dialog
  101 |     await page.keyboard.press('Escape');
  102 |     await page.waitForTimeout(1000);
  103 |     console.log('✅ Compilation dialog closed');
  104 | 
  105 |     // Check compilation store state after closing dialog
  106 |     const afterCloseState = await page.evaluate(() => {
  107 |       if (typeof window !== 'undefined') {
  108 |         // @ts-ignore - accessing store from window for debugging
  109 |         const store = window.useCompilationStore?.getState?.();
  110 |         return store ? {
  111 |           compilationStatus: store.compilationStatus,
  112 |           currentNotebookId: store.currentNotebookId,
  113 |           outputUrl: store.outputUrl,
  114 |           outputKey: store.outputKey,
  115 |         } : null;
  116 |       }
  117 |       return null;
  118 |     });
  119 |     console.log('📊 After close dialog state:', afterCloseState);
```