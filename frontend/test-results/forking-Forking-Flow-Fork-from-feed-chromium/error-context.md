# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: forking.spec.ts >> Forking Flow >> Fork from feed
- Location: tests/e2e/forking.spec.ts:40:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /fork/i }).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: /fork/i }).first()

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
    - generic [ref=e38]:
      - generic [ref=e39]:
        - heading "Feed" [level=1] [ref=e40]
        - paragraph [ref=e41]: Published notebooks from people you follow and what's trending. Open a card to read the full render, fork, or join the thread.
      - grid "Notebook feed" [ref=e42]:
        - generic [ref=e43]:
          - link "@user1 Apr 21, 2026 Original Notebook" [ref=e44] [cursor=pointer]:
            - /url: /notebooks/1
            - generic [ref=e48]:
              - paragraph [ref=e49]: "@user1"
              - paragraph [ref=e50]: Apr 21, 2026
            - heading "Original Notebook" [level=3] [ref=e52]
          - generic [ref=e53]:
            - generic [ref=e54]:
              - generic "10 likes" [ref=e55]:
                - img [ref=e56]
                - generic [ref=e58]: "10"
              - generic "5 comments" [ref=e59]:
                - img [ref=e60]
                - generic [ref=e62]: "5"
              - generic "100 views" [ref=e63]:
                - img [ref=e64]
                - generic [ref=e67]: "100"
            - generic [ref=e68]:
              - generic [ref=e69]:
                - button [ref=e70] [cursor=pointer]:
                  - img [ref=e71]
                - generic [ref=e73]:
                  - img [ref=e74]
                  - generic [ref=e76]: "5"
              - generic [ref=e77]:
                - button [ref=e78] [cursor=pointer]:
                  - img [ref=e79]
                - button [ref=e83] [cursor=pointer]:
                  - img [ref=e84]
      - paragraph [ref=e92]: You've seen all notebooks
  - alert [ref=e93]
```

# Test source

```ts
  1   | /**
  2   |  * E2E tests for forking flow
  3   |  *
  4   |  * Tests:
  5   |  * - Fork from feed
  6   |  * - Edit fork independently
  7   |  * - Fork lineage
  8   |  * - Forks in feed
  9   |  * - Cannot delete original with forks
  10  |  * - View fork attribution
  11  |  */
  12  | import { test, expect } from '@playwright/test';
  13  | 
  14  | test.describe('Forking Flow', () => {
  15  |   test.beforeEach(async ({ page }) => {
  16  |     // Login as user before each test
  17  |     await page.goto('/login');
  18  | 
  19  |     await page.evaluate(() => {
  20  |       localStorage.setItem('auth-storage', JSON.stringify({
  21  |         state: {
  22  |           isAuthenticated: true,
  23  |           user: {
  24  |             id: 2,
  25  |             email: 'user2@example.com',
  26  |             username: 'user2',
  27  |             is_active: true,
  28  |             is_verified: true,
  29  |             avatar_url: 'https://example.com/user2.jpg',
  30  |             created_at: new Date().toISOString(),
  31  |           }
  32  |         },
  33  |         version: 0
  34  |       }));
  35  |     });
  36  | 
  37  |     await page.reload();
  38  |   });
  39  | 
  40  |   test('Fork from feed', async ({ page }) => {
  41  |     // Mock feed API with user A's notebook
  42  |     await page.route('**/api/v1/feed**', (route) => {
  43  |       route.fulfill({
  44  |         status: 200,
  45  |         contentType: 'application/json',
  46  |         body: JSON.stringify({
  47  |           items: [
  48  |             {
  49  |               id: 1,
  50  |               title: 'Original Notebook',
  51  |               username: 'user1',
  52  |               avatar_url: 'https://example.com/user1.jpg',
  53  |               like_count: 10,
  54  |               comment_count: 5,
  55  |               view_count: 100,
  56  |               created_at: new Date().toISOString(),
  57  |               parent_id: null,
  58  |               root_id: null,
  59  |             }
  60  |           ],
  61  |           next_cursor: null,
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
> 76  |     await expect(forkButton).toBeVisible();
      |                              ^ Error: expect(locator).toBeVisible() failed
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
  162 |     await addCodeCellButton.click();
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
```