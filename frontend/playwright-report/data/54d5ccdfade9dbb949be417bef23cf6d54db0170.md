# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: compilation-workflow.spec.ts >> Compilation Workflow E2E Tests >> should publish notebook to feed after compilation
- Location: tests/e2e/compilation-workflow.spec.ts:133:7

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('[data-testid="notebook-editor"]') to be visible

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
  - alert [ref=e36]
  - generic [ref=e37]:
    - generic [ref=e39]:
      - link "Back to My Notebooks" [ref=e40] [cursor=pointer]:
        - /url: /my-notebooks
        - button "Back to My Notebooks" [ref=e41]:
          - img [ref=e42]
          - text: Back to My Notebooks
      - button "Show Debug" [ref=e44] [cursor=pointer]
    - generic [ref=e45]:
      - generic [ref=e46]:
        - paragraph [ref=e47]: Workflow
        - list [ref=e48]:
          - listitem [ref=e49]: 1. Edit & run — cells execute in the browser (Pyodide) for quick iteration.
          - listitem [ref=e50]: 2. Save & compile — server build in Docker produces the shareable output.
          - listitem [ref=e51]: 3. Publish — push the compiled notebook to the feed.
      - generic [ref=e52]:
        - img [ref=e53]
        - textbox "Untitled notebook" [ref=e56]: Untitled Notebook
      - generic [ref=e57]:
        - button "Save" [ref=e58] [cursor=pointer]:
          - img [ref=e59]
          - text: Save
        - button "Compile" [ref=e63] [cursor=pointer]:
          - img [ref=e64]
          - text: Compile
        - button "Publish" [disabled]:
          - img
          - text: Publish
      - generic [ref=e68]:
        - generic [ref=e69]:
          - generic [ref=e70]: code
          - generic [ref=e71]:
            - button "Run" [ref=e72] [cursor=pointer]:
              - img [ref=e73]
              - text: Run
            - button "Add Cell" [ref=e75] [cursor=pointer]:
              - img [ref=e76]
              - text: Add Cell
            - button [ref=e77] [cursor=pointer]:
              - img [ref=e78]
        - code [ref=e84]:
          - generic [ref=e85]:
            - textbox "Editor content"
            - textbox [ref=e86]
            - generic [ref=e91]: "1"
      - generic [ref=e98]:
        - button "+ Code Cell" [ref=e99] [cursor=pointer]
        - button "+ Markdown Cell" [ref=e100] [cursor=pointer]
  - generic [ref=e101]:
    - alert
    - alert
```

# Test source

```ts
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
  55  |     await expect(page.locator('h1')).toBeVisible();
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
> 138 |     await page.waitForSelector('[data-testid="notebook-editor"]', { timeout: 10000 });
      |                ^ TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
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
  156 | 
  157 |     // Wait for publish dialog to appear
  158 |     await expect(page.locator('[role="dialog"]')).toBeVisible();
  159 | 
  160 |     // Click "Publish to Feed" button
  161 |     const publishFeedButton = page.locator('button').filter({ hasText: /Publish to Feed/i });
  162 |     await publishFeedButton.click();
  163 | 
  164 |     // Wait for success message
  165 |     await expect(async () => {
  166 |       const dialogText = await page.locator('[role="dialog"]').textContent();
  167 |       expect(dialogText).toContain('published') || expect(dialogText).toContain('Success');
  168 |     }).toPass({ timeout: 10000 });
  169 | 
  170 |     // Close dialog
  171 |     await page.keyboard.press('Escape');
  172 | 
  173 |     // Navigate to feed to verify notebook appears
  174 |     await page.goto('http://localhost:3000/');
  175 | 
  176 |     // Wait for feed to load
  177 |     await page.waitForSelector('[data-testid="feed-card"]', { timeout: 5000 });
  178 | 
  179 |     // Verify notebook appears in feed
  180 |     const feedCards = page.locator('[data-testid="feed-card"]');
  181 |     const count = await feedCards.count();
  182 |     expect(count).toBeGreaterThan(0);
  183 |   });
  184 | 
  185 |   test('should show print statements output in browser', async ({ page }) => {
  186 |     // Navigate to notebook edit page
  187 |     await page.goto('http://localhost:3000/notebooks/1/edit');
  188 | 
  189 |     // Wait for editor to load
  190 |     await page.waitForSelector('[data-testid="notebook-editor"]', { timeout: 10000 });
  191 | 
  192 |     // Add a Python cell with print statement
  193 |     const addButton = page.locator('button').filter({ hasText: /Add Cell/i });
  194 |     await addButton.click();
  195 | 
  196 |     // Wait for new cell to appear
  197 |     await page.waitForSelector('textarea[placeholder*="Python"]');
  198 | 
  199 |     // Find the textarea and type Python code with print
  200 |     const textarea = page.locator('textarea[placeholder*="Python"]').last();
  201 |     await textarea.fill('print("Test output 1")\nprint("Test output 2")\nresult = 42');
  202 | 
  203 |     // Run the cell (click run button or use keyboard shortcut)
  204 |     const runButton = page.locator('button').filter({ hasText: /Run/i }).first();
  205 |     await runButton.click();
  206 | 
  207 |     // Wait a bit for execution
  208 |     await page.waitForTimeout(2000);
  209 | 
  210 |     // Check for output display (verify it's NOT "undefined")
  211 |     const cellOutput = page.locator('[data-testid="cell-output"]').last();
  212 |     const outputText = await cellOutput.textContent();
  213 | 
  214 |     // Verify output is present and not undefined
  215 |     expect(outputText).not.toBe('');
  216 |     expect(outputText).not.toBe('undefined');
  217 |     expect(outputText).toContain('Test output 1');
  218 |     expect(outputText).toContain('Test output 2');
  219 |   });
  220 | });
  221 | 
```