# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: search.spec.ts >> Search Flow >> Search by title
- Location: tests/e2e/search.spec.ts:43:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByPlaceholder(/search notebooks/i)
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByPlaceholder(/search notebooks/i)

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
  2   |  * E2E tests for search flow
  3   |  *
  4   |  * Tests:
  5   |  * - Search by title
  6   |  * - Search with no results
  7   |  * - Filter by fork type
  8   |  * - Filter by tags
  9   |  * - Search by author
  10  |  * - Clear search
  11  |  * - Search debouncing
  12  |  * - Search from notebook title click
  13  |  * - Recent searches
  14  |  */
  15  | import { test, expect } from '@playwright/test';
  16  | 
  17  | test.describe('Search Flow', () => {
  18  |   test.beforeEach(async ({ page }) => {
  19  |     // Login before each test
  20  |     await page.goto('/login');
  21  | 
  22  |     await page.evaluate(() => {
  23  |       localStorage.setItem('auth-storage', JSON.stringify({
  24  |         state: {
  25  |           isAuthenticated: true,
  26  |           user: {
  27  |             id: 1,
  28  |             email: 'test@example.com',
  29  |             username: 'testuser',
  30  |             is_active: true,
  31  |             is_verified: true,
  32  |             avatar_url: 'https://example.com/avatar.jpg',
  33  |             created_at: new Date().toISOString(),
  34  |           }
  35  |         },
  36  |         version: 0
  37  |       }));
  38  |     });
  39  | 
  40  |     await page.reload();
  41  |   });
  42  | 
  43  |   test('Search by title', async ({ page }) => {
  44  |     // Mock search API
  45  |     await page.route('**/api/v1/search**', (route) => {
  46  |       const url = new URL(route.request().url());
  47  |       const query = url.searchParams.get('q');
  48  | 
  49  |       if (query === 'python') {
  50  |         route.fulfill({
  51  |           status: 200,
  52  |           contentType: 'application/json',
  53  |           body: JSON.stringify({
  54  |             results: [
  55  |               {
  56  |                 id: 1,
  57  |                 title: 'Python Tutorial',
  58  |                 username: 'user1',
  59  |                 avatar_url: 'https://example.com/user1.jpg',
  60  |                 like_count: 10,
  61  |                 comment_count: 5,
  62  |                 view_count: 100,
  63  |                 created_at: new Date().toISOString(),
  64  |                 snippet: 'Learn <mark>Python</mark> basics',
  65  |               },
  66  |               {
  67  |                 id: 2,
  68  |                 title: 'Advanced Python',
  69  |                 username: 'user2',
  70  |                 avatar_url: 'https://example.com/user2.jpg',
  71  |                 like_count: 8,
  72  |                 comment_count: 3,
  73  |                 view_count: 80,
  74  |                 created_at: new Date().toISOString(),
  75  |                 snippet: 'Advanced <mark>Python</mark> techniques',
  76  |               }
  77  |             ],
  78  |             total: 2,
  79  |           })
  80  |         });
  81  |       } else {
  82  |         route.fulfill({
  83  |           status: 200,
  84  |           contentType: 'application/json',
  85  |           body: JSON.stringify({
  86  |             results: [],
  87  |             total: 0,
  88  |           })
  89  |         });
  90  |       }
  91  |     });
  92  | 
  93  |     // Navigate to search page
  94  |     await page.goto('/search');
  95  | 
  96  |     // Type search query in search bar
  97  |     const searchInput = page.getByPlaceholder(/search notebooks/i);
> 98  |     await expect(searchInput).toBeVisible();
      |                               ^ Error: expect(locator).toBeVisible() failed
  99  |     await searchInput.fill('python');
  100 | 
  101 |     // Press Enter or click search button
  102 |     await searchInput.press('Enter');
  103 | 
  104 |     // Verify search results shown
  105 |     await expect(page.getByText('Python Tutorial')).toBeVisible();
  106 |     await expect(page.getByText('Advanced Python')).toBeVisible();
  107 | 
  108 |     // Verify query terms highlighted
  109 |     const highlights = page.locator('mark');
  110 |     await expect(highlights).toHaveCount(2);
  111 | 
  112 |     // Verify result count displayed
  113 |     await expect(page.getByText(/2 results/i)).toBeVisible();
  114 |   });
  115 | 
  116 |   test('Search with no results', async ({ page }) => {
  117 |     // Mock search API with no results
  118 |     await page.route('**/api/v1/search**', (route) => {
  119 |       route.fulfill({
  120 |         status: 200,
  121 |         contentType: 'application/json',
  122 |         body: JSON.stringify({
  123 |           results: [],
  124 |           total: 0,
  125 |         })
  126 |       });
  127 |     });
  128 | 
  129 |     // Navigate to search page
  130 |     await page.goto('/search');
  131 | 
  132 |     // Type uncommon query
  133 |     const searchInput = page.getByPlaceholder(/search notebooks/i);
  134 |     await searchInput.fill('xyzabc123unusualquery');
  135 | 
  136 |     // Press Enter
  137 |     await searchInput.press('Enter');
  138 | 
  139 |     // Verify "No results found" message shown
  140 |     await expect(page.getByText(/no results found/i)).toBeVisible();
  141 | 
  142 |     // Verify search suggestions shown
  143 |     await expect(page.getByText(/try different keywords/i)).toBeVisible();
  144 |   });
  145 | 
  146 |   test('Filter by fork type', async ({ page }) => {
  147 |     // Mock search API with original notebooks
  148 |     await page.route('**/api/v1/search**', (route) => {
  149 |       const url = new URL(route.request().url());
  150 |       const forkType = url.searchParams.get('fork_type');
  151 | 
  152 |       if (forkType === 'original') {
  153 |         route.fulfill({
  154 |           status: 200,
  155 |           contentType: 'application/json',
  156 |           body: JSON.stringify({
  157 |             results: [
  158 |               {
  159 |                 id: 1,
  160 |                 title: 'Original Notebook',
  161 |                 username: 'user1',
  162 |                 avatar_url: 'https://example.com/user1.jpg',
  163 |                 like_count: 10,
  164 |                 comment_count: 5,
  165 |                 view_count: 100,
  166 |                 created_at: new Date().toISOString(),
  167 |                 parent_id: null,
  168 |                 root_id: null,
  169 |               }
  170 |             ],
  171 |             total: 1,
  172 |           })
  173 |         });
  174 |       } else if (forkType === 'fork') {
  175 |         route.fulfill({
  176 |           status: 200,
  177 |           contentType: 'application/json',
  178 |           body: JSON.stringify({
  179 |             results: [
  180 |               {
  181 |                 id: 2,
  182 |                 title: 'Forked Notebook',
  183 |                 username: 'user2',
  184 |                 avatar_url: 'https://example.com/user2.jpg',
  185 |                 like_count: 5,
  186 |                 comment_count: 2,
  187 |                 view_count: 50,
  188 |                 created_at: new Date().toISOString(),
  189 |                 parent_id: 1,
  190 |                 root_id: 1,
  191 |               }
  192 |             ],
  193 |             total: 1,
  194 |           })
  195 |         });
  196 |       } else {
  197 |         route.fulfill({
  198 |           status: 200,
```