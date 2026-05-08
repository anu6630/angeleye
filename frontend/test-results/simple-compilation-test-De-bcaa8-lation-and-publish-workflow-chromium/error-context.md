# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: simple-compilation-test.spec.ts >> Debug compilation and publish workflow
- Location: tests/e2e/simple-compilation-test.spec.ts:3:5

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
  3   | test('Debug compilation and publish workflow', async ({ page }) => {
  4   |   const email = 'test@example.com';
  5   |   const password = 'testpassword123';
  6   | 
  7   |   // Navigate to login page
  8   |   await page.goto('http://localhost:3000/login');
  9   | 
  10  |   // Wait for login page to load
> 11  |   await expect(page.locator('h1')).toContainText('Welcome to NotebookSocial');
      |                                    ^ Error: expect(locator).toContainText(expected) failed
  12  | 
  13  |   // Click Email tab to switch to email/password form
  14  |   await page.click('button:has-text("Email")');
  15  | 
  16  |   // Wait for email form to appear
  17  |   await page.waitForSelector('input[type="email"]');
  18  | 
  19  |   // Fill in credentials
  20  |   await page.fill('input[type="email"]', email);
  21  |   await page.fill('input[type="password"]', password);
  22  | 
  23  |   // Click login button
  24  |   await page.click('button[type="submit"]');
  25  | 
  26  |   // Wait for redirect to feed page
  27  |   await page.waitForURL('**/feed');
  28  | 
  29  |   // Navigate to notebook edit page
  30  |   await page.goto('http://localhost:3000/notebooks/25/edit');
  31  | 
  32  |   // Wait for page to load and check if we're redirected
  33  |   await page.waitForTimeout(3000);
  34  | 
  35  |   // Check current URL
  36  |   const currentUrl = page.url();
  37  |   console.log('📍 Current URL:', currentUrl);
  38  | 
  39  |   // Check if we're on the edit page or were redirected
  40  |   if (currentUrl.includes('/login')) {
  41  |     console.log('❌ Redirected to login - authentication failed');
  42  |     throw new Error('Authentication failed, redirected to login');
  43  |   }
  44  | 
  45  |   // Try to find the editor - be more lenient
  46  |   try {
  47  |     await page.waitForSelector('textarea, [contenteditable="true"]', { timeout: 10000 });
  48  |     console.log('✅ Notebook editor loaded');
  49  |   } catch (e) {
  50  |     console.log('⚠️  Editor not found, checking page content...');
  51  |     const pageContent = await page.content();
  52  |     console.log('Page contains:', pageContent.substring(0, 500));
  53  |     throw e;
  54  |   }
  55  | 
  56  |   // Check initial compilation store state
  57  |   const initialState = await page.evaluate(() => {
  58  |     if (typeof window !== 'undefined') {
  59  |       // @ts-ignore - accessing store from window for debugging
  60  |       const store = (window as any).useCompilationStore?.getState?.();
  61  |       return store ? {
  62  |         compilationStatus: store.compilationStatus,
  63  |         currentNotebookId: store.currentNotebookId,
  64  |         outputUrl: store.outputUrl,
  65  |         outputKey: store.outputKey,
  66  |       } : null;
  67  |     }
  68  |     return null;
  69  |   });
  70  |   console.log('📊 Initial compilation state:', initialState);
  71  | 
  72  |   // Click Compile button - be more specific
  73  |   const compileButton = page.locator('button').filter({ hasText: /^Compile$/i });
  74  |   await compileButton.click();
  75  |   console.log('✅ Compile button clicked');
  76  | 
  77  |   // Wait a moment for the click to register
  78  |   await page.waitForTimeout(1000);
  79  | 
  80  |   // Wait for compilation dialog to appear
  81  |   await expect(page.locator('[role="dialog"]')).toBeVisible();
  82  |   console.log('✅ Compilation dialog appeared');
  83  | 
  84  |   // Wait for compilation to complete (up to 120 seconds)
  85  |   console.log('⏳ Waiting for compilation to complete...');
  86  |   await expect(async () => {
  87  |     const dialogText = await page.locator('[role="dialog"]').textContent();
  88  |     console.log('📝 Dialog text:', dialogText?.substring(0, 200));
  89  |     expect(dialogText).toContain('successfully') || expect(dialogText).toContain('failed');
  90  |   }).toPass({ timeout: 120000 });
  91  | 
  92  |   // Verify success message
  93  |   const dialogText = await page.locator('[role="dialog"]').textContent();
  94  |   expect(dialogText).toContain('successfully');
  95  |   console.log('✅ Compilation succeeded');
  96  | 
  97  |   // Check compilation store state after successful compilation
  98  |   const afterCompileState = await page.evaluate(() => {
  99  |     if (typeof window !== 'undefined') {
  100 |       // @ts-ignore - accessing store from window for debugging
  101 |       const store = (window as any).useCompilationStore?.getState?.();
  102 |       return store ? {
  103 |         compilationStatus: store.compilationStatus,
  104 |         currentNotebookId: store.currentNotebookId,
  105 |         outputUrl: store.outputUrl,
  106 |         outputKey: store.outputKey,
  107 |       } : null;
  108 |     }
  109 |     return null;
  110 |   });
  111 |   console.log('📊 After compilation state:', afterCompileState);
```