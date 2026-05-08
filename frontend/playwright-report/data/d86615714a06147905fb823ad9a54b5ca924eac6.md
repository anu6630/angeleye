# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notebook-management.spec.ts >> Notebook Management with Email/Password Auth >> Login and navigate to My Notebooks
- Location: tests/e2e/notebook-management.spec.ts:25:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /my notebooks/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: /my notebooks/i })

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
  2   |  * E2E tests for notebook management using email/password authentication
  3   |  *
  4   |  * Tests:
  5   |  * - Login with email/password
  6   |  * - Navigate to My Notebooks page
  7   |  * - Create a new notebook
  8   |  * - View the created notebook in My Notebooks
  9   |  * - Edit the notebook
  10  |  * - Delete the notebook
  11  |  */
  12  | import { test, expect } from '@playwright/test';
  13  | 
  14  | const TEST_USER = {
  15  |   email: 'test@example.com',
  16  |   password: 'testpassword123'
  17  | };
  18  | 
  19  | test.describe('Notebook Management with Email/Password Auth', () => {
  20  |   test.beforeEach(async ({ context }) => {
  21  |     // Clear cookies before each test
  22  |     await context.clearCookies();
  23  |   });
  24  | 
  25  |   test('Login and navigate to My Notebooks', async ({ page }) => {
  26  |     console.log('Step 1: Navigate to home page');
  27  |     await page.goto('http://localhost:3000');
  28  | 
  29  |     console.log('Step 2: Login with email/password');
  30  |     await page.getByRole('button', { name: /continue with email/i }).click();
  31  |     await page.fill('input[type="email"]', TEST_USER.email);
  32  |     await page.fill('input[type="password"]', TEST_USER.password);
  33  |     await page.click('button[type="submit"]');
  34  | 
  35  |     console.log('Step 3: Wait for redirect to feed');
  36  |     await page.waitForURL('**/feed', { timeout: 10000 });
  37  |     console.log('✓ Successfully logged in and redirected to feed');
  38  | 
  39  |     console.log('Step 4: Navigate to My Notebooks');
  40  |     await page.goto('http://localhost:3000/my-notebooks');
  41  |     await page.waitForLoadState('networkidle');
  42  | 
  43  |     console.log('Step 5: Verify My Notebooks page loaded');
> 44  |     await expect(page.getByRole('heading', { name: /my notebooks/i })).toBeVisible({ timeout: 5000 });
      |                                                                        ^ Error: expect(locator).toBeVisible() failed
  45  |     console.log('✓ My Notebooks page loaded successfully');
  46  | 
  47  |     console.log('Step 6: Check for notebooks or empty state');
  48  |     const hasNotebooks = await page.locator('[data-testid="notebook-card"], .card').count() > 0;
  49  |     const isEmpty = await page.locator('text=/No notebooks yet/').isVisible().catch(() => false);
  50  | 
  51  |     if (isEmpty) {
  52  |       console.log('✓ Empty state shown (no notebooks)');
  53  |     } else if (hasNotebooks) {
  54  |       console.log('✓ Notebooks displayed');
  55  |       const notebookCount = await page.locator('[data-testid="notebook-card"], .card').count();
  56  |       console.log(`  Found ${notebookCount} notebook(s)`);
  57  |     } else {
  58  |       console.log('⚠️  Unexpected state - neither notebooks nor empty state visible');
  59  |     }
  60  |   });
  61  | 
  62  |   test('Create a new notebook', async ({ page, context }) => {
  63  |     console.log('Step 1: Login via API');
  64  |     const apiResponse = await context.request.post('http://localhost:8000/api/v1/auth/login', {
  65  |       data: {
  66  |         email: TEST_USER.email,
  67  |         password: TEST_USER.password
  68  |       },
  69  |       headers: {
  70  |         'Content-Type': 'application/json',
  71  |       },
  72  |       maxRedirects: 0
  73  |     });
  74  |     // Login now returns 200 with JSON instead of 302 redirect
  75  |     expect([200, 302]).toContain(apiResponse.status());
  76  |     console.log('✓ Login successful');
  77  | 
  78  |     console.log('Step 2: Navigate to Create Notebook page');
  79  |     await page.goto('http://localhost:3000/notebooks/new');
  80  |     await page.waitForLoadState('networkidle');
  81  | 
  82  |     console.log('Step 3: Wait for editor to load');
  83  |     // Wait for Pyodide and editor to load
  84  |     await page.waitForTimeout(3000);
  85  | 
  86  |     console.log('Step 4: Verify editor is visible');
  87  |     const editor = page.locator('textarea, [contenteditable="true"], .editor, [role="textbox"]');
  88  |     const isEditorVisible = await editor.first().isVisible().catch(() => false);
  89  | 
  90  |     if (isEditorVisible) {
  91  |       console.log('✓ Notebook editor is visible');
  92  |     } else {
  93  |       console.log('⚠️  Editor not immediately visible, checking page title');
  94  |       await expect(page).toHaveTitle(/Notebook|Editor/i, { timeout: 10000 });
  95  |       console.log('✓ Notebook page loaded');
  96  |     }
  97  | 
  98  |     console.log('Step 5: Check for editor controls');
  99  |     const hasRunButton = await page.locator('button:has-text("Run"), button:has-text("▶")').count() > 0;
  100 |     const hasPublishButton = await page.locator('button:has-text("Publish"), button:has-text("Save")').count() > 0;
  101 | 
  102 |     console.log(`  Run button: ${hasRunButton ? '✓' : '✗'}`);
  103 |     console.log(`  Publish/Save button: ${hasPublishButton ? '✓' : '✗'}`);
  104 | 
  105 |     console.log('Step 6: Try to add content to notebook');
  106 |     const titleInput = page.locator('input[placeholder*="title"], input[type="text"]').first();
  107 |     const isTitleVisible = await titleInput.isVisible().catch(() => false);
  108 | 
  109 |     if (isTitleVisible) {
  110 |       await titleInput.fill('Test E2E Notebook');
  111 |       console.log('✓ Title field found and filled');
  112 | 
  113 |       // Try to add code content
  114 |       const codeEditor = page.locator('textarea').first();
  115 |       const isCodeEditorVisible = await codeEditor.isVisible().catch(() => false);
  116 | 
  117 |       if (isCodeEditorVisible) {
  118 |         await codeEditor.fill('print("Hello, World!")');
  119 |         console.log('✓ Code editor found and filled with test content');
  120 |       }
  121 |     } else {
  122 |       console.log('⚠️  Title field not found, may need to look for editor structure');
  123 |     }
  124 | 
  125 |     console.log('Step 7: Take screenshot for verification');
  126 |     await page.screenshot({ path: 'test-results/create-notebook-page.png', fullPage: true });
  127 |     console.log('✓ Screenshot saved to test-results/create-notebook-page.png');
  128 |   });
  129 | 
  130 |   test('Complete notebook creation flow', async ({ page, context }) => {
  131 |     console.log('Step 1: Login via API');
  132 |     const apiResponse = await context.request.post('http://localhost:8000/api/v1/auth/login', {
  133 |       data: {
  134 |         email: TEST_USER.email,
  135 |         password: TEST_USER.password
  136 |       },
  137 |       headers: {
  138 |         'Content-Type': 'application/json',
  139 |       },
  140 |       maxRedirects: 0
  141 |     });
  142 |     // Login now returns 200 with JSON instead of 302 redirect
  143 |     expect([200, 302]).toContain(apiResponse.status());
  144 |     console.log('✓ Login successful');
```