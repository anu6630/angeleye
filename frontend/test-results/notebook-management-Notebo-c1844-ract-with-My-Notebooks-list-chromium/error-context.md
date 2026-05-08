# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notebook-management.spec.ts >> Notebook Management with Email/Password Auth >> View and interact with My Notebooks list
- Location: tests/e2e/notebook-management.spec.ts:210:7

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
  145 | 
  146 |     console.log('Step 2: Navigate to Create Notebook');
  147 |     await page.goto('http://localhost:3000/notebooks/new');
  148 | 
  149 |     console.log('Step 3: Wait for page load');
  150 |     await page.waitForLoadState('networkidle');
  151 |     await page.waitForTimeout(2000); // Additional wait for Pyodide
  152 | 
  153 |     console.log('Step 4: Fill in notebook title');
  154 |     const titleInput = page.locator('input[placeholder="Untitled notebook"], input[placeholder*="notebook" i]').first();
  155 |     await page.waitForTimeout(5000); // Wait longer for Pyodide and editor
  156 |     await expect(titleInput).toBeVisible({ timeout: 15000 });
  157 |     const testTitle = `E2E Test Notebook ${Date.now()}`;
  158 |     await titleInput.fill(testTitle);
  159 |     console.log(`✓ Title filled: "${testTitle}"`);
  160 | 
  161 |     console.log('Step 5: Add code content');
  162 |     const codeEditor = page.locator('textarea').first();
  163 |     await expect(codeEditor).toBeVisible({ timeout: 5000 });
  164 |     const testCode = 'print("Hello from E2E test!")\nprint(2 + 2)';
  165 |     await codeEditor.fill(testCode);
  166 |     console.log('✓ Code content added');
  167 | 
  168 |     console.log('Step 6: Try to save/publish notebook');
  169 |     const saveButton = page.locator('button:has-text("Save"), button:has-text("Publish"), button:has-text("Create")').first();
  170 |     await expect(saveButton).toBeVisible({ timeout: 5000 });
  171 |     await saveButton.click();
  172 |     console.log('✓ Save/Publish button clicked');
  173 | 
  174 |     console.log('Step 7: Wait for save to complete');
  175 |     await page.waitForTimeout(2000);
  176 | 
  177 |     console.log('Step 8: Check if we were redirected');
  178 |     const currentUrl = page.url();
  179 |     console.log(`  Current URL: ${currentUrl}`);
  180 | 
  181 |     if (currentUrl.includes('/notebooks/') && !currentUrl.includes('/new')) {
  182 |       console.log('✓ Redirected to notebook view/edit page');
  183 |     } else if (currentUrl.includes('/my-notebooks')) {
  184 |       console.log('✓ Redirected to My Notebooks');
  185 |     } else {
  186 |       console.log('⚠️  Still on create page or unexpected redirect');
  187 |     }
  188 | 
  189 |     console.log('Step 9: Navigate to My Notebooks to verify');
  190 |     await page.goto('http://localhost:3000/my-notebooks');
  191 |     await page.waitForLoadState('networkidle');
  192 | 
  193 |     console.log('Step 10: Verify notebook was created');
  194 |     await expect(page.getByRole('heading', { name: /my notebooks/i })).toBeVisible();
  195 | 
  196 |     // Check if our notebook appears in the list
  197 |     const notebookTitle = page.locator(`text=/${testTitle}/`).or(page.locator(`text=${testTitle}`));
  198 |     const isNotebookVisible = await notebookTitle.isVisible().catch(() => false);
  199 | 
  200 |     if (isNotebookVisible) {
  201 |       console.log(`✓ Found created notebook: "${testTitle}"`);
  202 |     } else {
  203 |       console.log('⚠️  Notebook not immediately visible in list (may need time to save)');
  204 |       await page.screenshot({ path: 'test-results/my-notebooks-after-create.png', fullPage: true });
  205 |     }
  206 | 
  207 |     console.log('✅ Complete notebook creation flow tested');
  208 |   });
  209 | 
  210 |   test('View and interact with My Notebooks list', async ({ page, context }) => {
  211 |     console.log('Step 1: Login via API');
  212 |     const apiResponse = await context.request.post('http://localhost:8000/api/v1/auth/login', {
  213 |       data: {
  214 |         email: TEST_USER.email,
  215 |         password: TEST_USER.password
  216 |       },
  217 |       headers: {
  218 |         'Content-Type': 'application/json',
  219 |       },
  220 |       maxRedirects: 0
  221 |     });
  222 |     // Login now returns 200 with JSON instead of 302 redirect
  223 |     expect([200, 302]).toContain(apiResponse.status());
  224 |     console.log('✓ Login successful');
  225 | 
  226 |     console.log('Step 2: Navigate to My Notebooks');
  227 |     await page.goto('http://localhost:3000/my-notebooks');
  228 |     await page.waitForLoadState('networkidle');
  229 | 
  230 |     console.log('Step 3: Verify page structure');
> 231 |     await expect(page.getByRole('heading', { name: /my notebooks/i })).toBeVisible({ timeout: 5000 });
      |                                                                        ^ Error: expect(locator).toBeVisible() failed
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
  331 |     await expect(page.getByRole('heading', { name: /my notebooks/i })).toBeVisible({ timeout: 5000 });
```