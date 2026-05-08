# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: forking.spec.ts >> Forking Flow >> Edit fork independently
- Location: tests/e2e/forking.spec.ts:128:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /add code cell/i })

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
  - alert [ref=e37]
  - generic [ref=e39]:
    - generic [ref=e40]:
      - img [ref=e42]
      - heading "Welcome back" [level=1] [ref=e45]
      - paragraph [ref=e46]: Sign in to create notebooks, compile, and publish to the feed.
      - paragraph [ref=e47]:
        - text: New here?
        - link "Start on the home page" [ref=e48] [cursor=pointer]:
          - /url: /
    - generic [ref=e49]:
      - generic [ref=e50]:
        - heading "Sign in" [level=3] [ref=e51]
        - paragraph [ref=e52]: Choose OAuth or email — same account either way.
      - generic [ref=e53]:
        - generic [ref=e54]:
          - button "OAuth" [ref=e55] [cursor=pointer]
          - button "Email" [ref=e56] [cursor=pointer]
        - generic [ref=e57]:
          - button "Sign in with Google" [ref=e58] [cursor=pointer]:
            - img [ref=e60]
            - generic [ref=e65]: Sign in with Google
          - button "Sign in with Facebook" [ref=e66] [cursor=pointer]:
            - img [ref=e68]
            - generic [ref=e70]: Sign in with Facebook
```

# Test source

```ts
  62  |           has_more: false,
  63  |         })
  64  |       });
  65  |     });
  66  | 
  67  |     // Navigate to feed
  68  |     await page.goto('/feed');
  69  | 
  70  |     // Find user A's notebook
  71  |     await expect(page.getByText('Original Notebook')).toBeVisible();
  72  |     await expect(page.getByText(/user1/i)).toBeVisible();
  73  | 
  74  |     // Click "Fork" button on notebook card
  75  |     const forkButton = page.getByRole('button', { name: /fork/i }).first();
  76  |     await expect(forkButton).toBeVisible();
  77  |     await forkButton.click();
  78  | 
  79  |     // Mock fork API
  80  |     await page.route('**/api/v1/notebooks/1/fork**', (route) => {
  81  |       route.fulfill({
  82  |         status: 200,
  83  |         contentType: 'application/json',
  84  |         body: JSON.stringify({
  85  |           id: 2,
  86  |           title: 'Original Notebook',
  87  |           user_id: 2,
  88  |           is_published: false,
  89  |           created_at: new Date().toISOString(),
  90  |           updated_at: new Date().toISOString(),
  91  |           like_count: 0,
  92  |           comment_count: 0,
  93  |           parent_id: 1,
  94  |           root_id: 1,
  95  |           cells: [
  96  |             {
  97  |               id: 1,
  98  |               cell_type: 'code',
  99  |               content: 'print("Original code")',
  100 |               order_index: 0,
  101 |             },
  102 |             {
  103 |               id: 2,
  104 |               cell_type: 'markdown',
  105 |               content: '# Original notebook',
  106 |               order_index: 1,
  107 |             }
  108 |           ],
  109 |         })
  110 |       });
  111 |     });
  112 | 
  113 |     // Verify redirect to editor
  114 |     await page.waitForURL('**/notebooks/*/edit');
  115 | 
  116 |     // Verify notebook loaded (copy of original)
  117 |     await expect(page.getByRole('textbox', { name: /title/i })).toHaveValue('Original Notebook');
  118 | 
  119 |     // Verify cells copied from original
  120 |     await expect(page.getByText('print("Original code")')).toBeVisible();
  121 |     await expect(page.getByText('# Original notebook')).toBeVisible();
  122 | 
  123 |     // Verify "Forked from" indicator shown
  124 |     await expect(page.getByText(/forked from/i)).toBeVisible();
  125 |     await expect(page.getByText(/user1/i)).toBeVisible();
  126 |   });
  127 | 
  128 |   test('Edit fork independently', async ({ page }) => {
  129 |     // Setup: Fork a notebook
  130 |     await page.goto('/notebooks/2/edit');
  131 | 
  132 |     // Mock forked notebook API
  133 |     await page.route('**/api/v1/notebooks/2**', (route) => {
  134 |       route.fulfill({
  135 |         status: 200,
  136 |         contentType: 'application/json',
  137 |         body: JSON.stringify({
  138 |           id: 2,
  139 |           title: 'Original Notebook',
  140 |           user_id: 2,
  141 |           is_published: false,
  142 |           created_at: new Date().toISOString(),
  143 |           updated_at: new Date().toISOString(),
  144 |           like_count: 0,
  145 |           comment_count: 0,
  146 |           parent_id: 1,
  147 |           root_id: 1,
  148 |           cells: [
  149 |             {
  150 |               id: 1,
  151 |               cell_type: 'code',
  152 |               content: 'print("Original code")',
  153 |               order_index: 0,
  154 |             }
  155 |           ],
  156 |         })
  157 |       });
  158 |     });
  159 | 
  160 |     // Add new cell to fork
  161 |     const addCodeCellButton = page.getByRole('button', { name: /add code cell/i });
> 162 |     await addCodeCellButton.click();
      |                             ^ Error: locator.click: Test timeout of 30000ms exceeded.
  163 | 
  164 |     const codeTextarea = page.locator('.monaco-editor textarea, .code-cell textarea').last();
  165 |     await codeTextarea.fill('print("Forked code")');
  166 | 
  167 |     // Change fork title
  168 |     const titleInput = page.getByRole('textbox', { name: /title/i });
  169 |     await titleInput.fill('Forked Notebook');
  170 | 
  171 |     // Save fork
  172 |     const saveButton = page.getByRole('button', { name: /save/i });
  173 |     await saveButton.click();
  174 | 
  175 |     // Mock save API
  176 |     await page.route('**/api/v1/notebooks/2**', (route) => {
  177 |       if (route.request().method() === 'PATCH') {
  178 |         route.fulfill({
  179 |           status: 200,
  180 |           contentType: 'application/json',
  181 |           body: JSON.stringify({
  182 |             id: 2,
  183 |             title: 'Forked Notebook',
  184 |             user_id: 2,
  185 |             is_published: false,
  186 |             created_at: new Date().toISOString(),
  187 |             updated_at: new Date().toISOString(),
  188 |             like_count: 0,
  189 |             comment_count: 0,
  190 |             parent_id: 1,
  191 |             root_id: 1,
  192 |           })
  193 |         });
  194 |       } else {
  195 |         route.continue();
  196 |       }
  197 |     });
  198 | 
  199 |     // Verify changes saved
  200 |     await expect(page.getByText(/saved/i)).toBeVisible();
  201 | 
  202 |     // Navigate to original notebook
  203 |     await page.goto('/notebooks/1');
  204 | 
  205 |     // Mock original notebook API
  206 |     await page.route('**/api/v1/notebooks/1**', (route) => {
  207 |       route.fulfill({
  208 |         status: 200,
  209 |         contentType: 'application/json',
  210 |         body: JSON.stringify({
  211 |           id: 1,
  212 |           title: 'Original Notebook',
  213 |           user_id: 1,
  214 |           is_published: true,
  215 |           created_at: new Date().toISOString(),
  216 |           updated_at: new Date().toISOString(),
  217 |           like_count: 10,
  218 |           comment_count: 5,
  219 |           view_count: 100,
  220 |           cells: [
  221 |             {
  222 |               id: 1,
  223 |               cell_type: 'code',
  224 |               content: 'print("Original code")',
  225 |               order_index: 0,
  226 |             }
  227 |           ],
  228 |           user: {
  229 |             id: 1,
  230 |             username: 'user1',
  231 |             avatar_url: 'https://example.com/user1.jpg',
  232 |           }
  233 |         })
  234 |       });
  235 |     });
  236 | 
  237 |     // Verify original unchanged
  238 |     await expect(page.getByText('Original Notebook')).toBeVisible();
  239 |     await expect(page.getByText('print("Original code")')).toBeVisible();
  240 |     await expect(page.getByText('Forked Notebook')).not.toBeVisible();
  241 |     await expect(page.getByText('print("Forked code")')).not.toBeVisible();
  242 | 
  243 |     // Navigate back to fork
  244 |     await page.goto('/notebooks/2/edit');
  245 | 
  246 |     // Verify fork has edits
  247 |     await expect(page.getByRole('textbox', { name: /title/i })).toHaveValue('Forked Notebook');
  248 |     await expect(page.getByText('print("Forked code")')).toBeVisible();
  249 |   });
  250 | 
  251 |   test('Fork lineage', async ({ page }) => {
  252 |     // Create original notebook
  253 |     // Mock original notebook
  254 |     await page.route('**/api/v1/notebooks/1**', (route) => {
  255 |       route.fulfill({
  256 |         status: 200,
  257 |         contentType: 'application/json',
  258 |         body: JSON.stringify({
  259 |           id: 1,
  260 |           title: 'Original Notebook',
  261 |           user_id: 1,
  262 |           is_published: true,
```