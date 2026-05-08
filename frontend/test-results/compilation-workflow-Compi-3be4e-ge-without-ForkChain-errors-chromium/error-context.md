# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: compilation-workflow.spec.ts >> Compilation Workflow E2E Tests >> should display notebook page without ForkChain errors
- Location: tests/e2e/compilation-workflow.spec.ts:32:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h1')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('h1')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "NotebookSocial" [ref=e4] [cursor=pointer]:
        - /url: /feed
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
      - button "TE testuser" [ref=e32] [cursor=pointer]:
        - generic [ref=e34]: TE
        - generic [ref=e35]: testuser
  - paragraph [ref=e39]: Notebook not found
  - alert [ref=e40]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Compilation Workflow E2E Tests', () => {
  4   |   // Login credentials from test setup
  5   |   const email = 'test@example.com';
  6   |   const password = 'testpassword123';
  7   | 
  8   |   test.beforeEach(async ({ page }) => {
  9   |     // Navigate to login page
  10  |     await page.goto('http://localhost:3000/login');
  11  | 
  12  |     // Wait for login page to load
  13  |     await expect(page.locator('h1')).toContainText(/welcome back/i);
  14  | 
  15  |     // Click Email tab to switch to email/password form
  16  |     await page.click('button:has-text("Email")');
  17  | 
  18  |     // Wait for email form to appear
  19  |     await page.waitForSelector('input[type="email"]');
  20  | 
  21  |     // Fill in credentials
  22  |     await page.fill('input[type="email"]', email);
  23  |     await page.fill('input[type="password"]', password);
  24  | 
  25  |     // Click login button
  26  |     await page.click('button[type="submit"]');
  27  | 
  28  |     // Wait for redirect to feed page (after successful login)
  29  |     await page.waitForURL('**/feed');
  30  |   });
  31  | 
  32  |   test('should display notebook page without ForkChain errors', async ({ page }) => {
  33  |     // Navigate to notebook page
  34  |     await page.goto('http://localhost:3000/notebooks/24');
  35  | 
  36  |     // Wait for page to load
  37  |     await expect(page).toHaveTitle(/Notebook/);
  38  | 
  39  |     // Check for no console errors
  40  |     const errors: string[] = [];
  41  |     page.on('console', msg => {
  42  |       if (msg.type() === 'error') {
  43  |         errors.push(msg.text());
  44  |       }
  45  |     });
  46  | 
  47  |     // Wait a bit for any JavaScript to execute
  48  |     await page.waitForTimeout(2000);
  49  | 
  50  |     // Verify no "map is not a function" error
  51  |     const mapErrors = errors.filter(e => e.includes('map is not a function'));
  52  |     expect(mapErrors.length).toBe(0);
  53  | 
  54  |     // Verify page content is visible
> 55  |     await expect(page.locator('h1')).toBeVisible();
      |                                      ^ Error: expect(locator).toBeVisible() failed
  56  |   });
  57  | 
  58  |   test('should compile notebook successfully', async ({ page }) => {
  59  |     // Navigate to notebook edit page
  60  |     await page.goto('http://localhost:3000/notebooks/1/edit');
  61  | 
  62  |     // Wait for editor to load
  63  |     await page.waitForSelector('[data-testid="notebook-editor"]', { timeout: 10000 });
  64  | 
  65  |     // Add a simple Python cell with print statement
  66  |     const addButton = page.locator('button').filter({ hasText: /Add Cell/i });
  67  |     await addButton.click();
  68  | 
  69  |     // Wait for new cell to appear
  70  |     await page.waitForSelector('textarea[placeholder*="Python"]');
  71  | 
  72  |     // Find the textarea and type Python code
  73  |     const textarea = page.locator('textarea[placeholder*="Python"]').last();
  74  |     await textarea.fill('print("Hello from E2E test!")');
  75  | 
  76  |     // Click Compile button
  77  |     const compileButton = page.locator('button').filter({ hasText: /Compile/i });
  78  |     await compileButton.click();
  79  | 
  80  |     // Wait for compilation dialog to appear
  81  |     await expect(page.locator('[role="dialog"]')).toBeVisible();
  82  | 
  83  |     // Wait for compilation to complete (up to 60 seconds)
  84  |     await expect(async () => {
  85  |       const dialogText = await page.locator('[role="dialog"]').textContent();
  86  |       expect(dialogText).toContain('successfully') || expect(dialogText).toContain('failed');
  87  |     }).toPass({ timeout: 60000 });
  88  | 
  89  |     // Verify success message
  90  |     const dialogText = await page.locator('[role="dialog"]').textContent();
  91  |     expect(dialogText).toContain('successfully');
  92  | 
  93  |     // Close dialog
  94  |     await page.keyboard.press('Escape');
  95  |   });
  96  | 
  97  |   test('should persist compilation state across dialog opens', async ({ page }) => {
  98  |     // Navigate to notebook edit page
  99  |     await page.goto('http://localhost:3000/notebooks/1/edit');
  100 | 
  101 |     // Wait for editor to load
  102 |     await page.waitForSelector('[data-testid="notebook-editor"]', { timeout: 10000 });
  103 | 
  104 |     // Click Compile button
  105 |     const compileButton = page.locator('button').filter({ hasText: /Compile/i });
  106 |     await compileButton.click();
  107 | 
  108 |     // Wait for compilation to complete
  109 |     await expect(async () => {
  110 |       const dialogText = await page.locator('[role="dialog"]').textContent();
  111 |       expect(dialogText).toContain('successfully');
  112 |     }).toPass({ timeout: 60000 });
  113 | 
  114 |     // Close compilation dialog
  115 |     await page.keyboard.press('Escape');
  116 | 
  117 |     // Click Publish button
  118 |     const publishButton = page.locator('button').filter({ hasText: /Publish/i });
  119 |     await publishButton.click();
  120 | 
  121 |     // Wait for publish dialog to appear
  122 |     await expect(page.locator('[role="dialog"]')).toBeVisible();
  123 | 
  124 |     // Verify it recognizes compilation success (should NOT show "must be compiled" error)
  125 |     const dialogText = await page.locator('[role="dialog"]').textContent();
  126 |     expect(dialogText).not.toContain('must be compiled successfully');
  127 |     expect(dialogText).toContain('Publish to Feed');
  128 | 
  129 |     // Close publish dialog
  130 |     await page.keyboard.press('Escape');
  131 |   });
  132 | 
  133 |   test('should publish notebook to feed after compilation', async ({ page }) => {
  134 |     // Navigate to notebook edit page
  135 |     await page.goto('http://localhost:3000/notebooks/1/edit');
  136 | 
  137 |     // Wait for editor to load
  138 |     await page.waitForSelector('[data-testid="notebook-editor"]', { timeout: 10000 });
  139 | 
  140 |     // Click Compile button
  141 |     const compileButton = page.locator('button').filter({ hasText: /Compile/i });
  142 |     await compileButton.click();
  143 | 
  144 |     // Wait for compilation to complete
  145 |     await expect(async () => {
  146 |       const dialogText = await page.locator('[role="dialog"]').textContent();
  147 |       expect(dialogText).toContain('successfully');
  148 |     }).toPass({ timeout: 60000 });
  149 | 
  150 |     // Close compilation dialog
  151 |     await page.keyboard.press('Escape');
  152 | 
  153 |     // Click Publish button
  154 |     const publishButton = page.locator('button').filter({ hasText: /Publish/i });
  155 |     await publishButton.click();
```