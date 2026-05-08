# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notebook-management.spec.ts >> Notebook Management with Email/Password Auth >> Navigate between pages using authentication
- Location: tests/e2e/notebook-management.spec.ts:294:7

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
  231 |     await expect(page.getByRole('heading', { name: /my notebooks/i })).toBeVisible({ timeout: 5000 });
  232 | 
  233 |     const newNotebookButton = page.locator('a[href="/notebooks/new"], a:has-text("New notebook"), button:has-text("New notebook")');
  234 |     await expect(newNotebookButton.first()).toBeVisible({ timeout: 5000 });
  235 |     console.log('✓ New Notebook button visible');
  236 | 
  237 |     console.log('Step 4: Check notebooks list');
  238 |     const notebookCards = page.locator('.card');
  239 |     const cardCount = await notebookCards.count();
  240 |     console.log(`  Found ${cardCount} notebook card(s)`);
  241 | 
  242 |     if (cardCount > 0) {
  243 |       console.log('Step 5: Examine first notebook card');
  244 |       const firstCard = notebookCards.first();
  245 |       await expect(firstCard).toBeVisible();
  246 | 
  247 |       // Check for notebook title
  248 |       const title = firstCard.locator('h3, .font-semibold').first();
  249 |       const titleText = await title.textContent().catch(() => 'N/A');
  250 |       console.log(`  Notebook title: "${titleText}"`);
  251 | 
  252 |       // Check for status (Published/Draft)
  253 |       const status = firstCard.locator('text=/Published|Draft/').first();
  254 |       const statusText = await status.textContent().catch(() => 'N/A');
  255 |       console.log(`  Status: "${statusText}"`);
  256 | 
  257 |       // Check for action buttons
  258 |       const editButton = firstCard.locator('a[href*="/edit"], button:has(.edit-icon), button:has-text("Edit")').first();
  259 |       const deleteButton = firstCard.locator('button:has(.trash-icon), button:has-text("Delete"), button:has(.Trash2)').first();
  260 | 
  261 |       const hasEdit = await editButton.isVisible().catch(() => false);
  262 |       const hasDelete = await deleteButton.isVisible().catch(() => false);
  263 | 
  264 |       console.log(`  Edit button: ${hasEdit ? '✓' : '✗'}`);
  265 |       console.log(`  Delete button: ${hasDelete ? '✓' : '✗'}`);
  266 | 
  267 |       // Try to click edit button
  268 |       if (hasEdit) {
  269 |         console.log('Step 6: Click Edit button');
  270 |         await editButton.click();
  271 |         await page.waitForLoadState('networkidle');
  272 |         const currentUrl = page.url();
  273 |         console.log(`  Navigated to: ${currentUrl}`);
  274 | 
  275 |         if (currentUrl.includes('/edit')) {
  276 |           console.log('✓ Successfully navigated to edit page');
  277 |         }
  278 |       }
  279 |     } else {
  280 |       console.log('Step 5: Empty state');
  281 |       const emptyState = page.locator('text=/No notebooks yet/').first();
  282 |       await expect(emptyState).toBeVisible({ timeout: 5000 });
  283 |       console.log('✓ Empty state correctly displayed');
  284 | 
  285 |       // Check for Create Notebook button in empty state
  286 |       const createButton = page.locator('a[href="/notebooks/new"]').first();
  287 |       await expect(createButton).toBeVisible();
  288 |       console.log('✓ Create Notebook button visible in empty state');
  289 |     }
  290 | 
  291 |     console.log('✅ My Notebooks list tested successfully');
  292 |   });
  293 | 
  294 |   test('Navigate between pages using authentication', async ({ page, context }) => {
  295 |     console.log('Step 1: Login via API');
  296 |     const apiResponse = await context.request.post('http://localhost:8000/api/v1/auth/login', {
  297 |       data: {
  298 |         email: TEST_USER.email,
  299 |         password: TEST_USER.password
  300 |       },
  301 |       headers: {
  302 |         'Content-Type': 'application/json',
  303 |       },
  304 |       maxRedirects: 0
  305 |     });
  306 |     // Login now returns 200 with JSON instead of 302 redirect
  307 |     expect([200, 302]).toContain(apiResponse.status());
  308 |     console.log('✓ Login successful');
  309 | 
  310 |     console.log('Step 2: Test navigation to Feed');
  311 |     await page.goto('http://localhost:3000/feed');
  312 |     await page.waitForLoadState('networkidle');
  313 |     const currentUrl = page.url();
  314 |     console.log(`  Current URL: ${currentUrl}`);
  315 |     // Check if we're on feed or were redirected
  316 |     expect(currentUrl).toMatch(/\/feed|\/$/);
  317 |     console.log('✓ Feed page accessible');
  318 | 
  319 |     console.log('Step 3: Test navigation to Create Notebook');
  320 |     await page.goto('http://localhost:3000/notebooks/new');
  321 |     await page.waitForLoadState('networkidle');
  322 |     await page.waitForTimeout(3000); // Wait for Pyodide
  323 |     const editorUrl = page.url();
  324 |     console.log(`  Current URL: ${editorUrl}`);
  325 |     expect(editorUrl).toMatch(/\/notebooks\/new/);
  326 |     console.log('✓ Create Notebook page accessible');
  327 | 
  328 |     console.log('Step 4: Test navigation to My Notebooks');
  329 |     await page.goto('http://localhost:3000/my-notebooks');
  330 |     await page.waitForLoadState('networkidle');
> 331 |     await expect(page.getByRole('heading', { name: /my notebooks/i })).toBeVisible({ timeout: 5000 });
      |                                                                        ^ Error: expect(locator).toBeVisible() failed
  332 |     console.log('✓ My Notebooks page accessible');
  333 | 
  334 |     console.log('✅ All pages accessible with authentication');
  335 |   });
  336 | });
  337 | 
```