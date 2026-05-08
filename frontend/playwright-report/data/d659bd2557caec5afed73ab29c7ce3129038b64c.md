# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: search.spec.ts >> Search Flow >> Filter by fork type
- Location: tests/e2e/search.spec.ts:146:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
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
  199 |           contentType: 'application/json',
  200 |           body: JSON.stringify({
  201 |             results: [
  202 |               {
  203 |                 id: 1,
  204 |                 title: 'Original Notebook',
  205 |                 username: 'user1',
  206 |                 avatar_url: 'https://example.com/user1.jpg',
  207 |                 like_count: 10,
  208 |                 comment_count: 5,
  209 |                 view_count: 100,
  210 |                 created_at: new Date().toISOString(),
  211 |                 parent_id: null,
  212 |                 root_id: null,
  213 |               },
  214 |               {
  215 |                 id: 2,
  216 |                 title: 'Forked Notebook',
  217 |                 username: 'user2',
  218 |                 avatar_url: 'https://example.com/user2.jpg',
  219 |                 like_count: 5,
  220 |                 comment_count: 2,
  221 |                 view_count: 50,
  222 |                 created_at: new Date().toISOString(),
  223 |                 parent_id: 1,
  224 |                 root_id: 1,
  225 |               }
  226 |             ],
  227 |             total: 2,
  228 |           })
  229 |         });
  230 |       }
  231 |     });
  232 | 
  233 |     // Navigate to search page
  234 |     await page.goto('/search');
  235 | 
  236 |     // Search for notebooks
  237 |     const searchInput = page.getByPlaceholder(/search notebooks/i);
> 238 |     await searchInput.fill('test');
      |                       ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  239 |     await searchInput.press('Enter');
  240 | 
  241 |     // Click "Original" filter tab
  242 |     const originalTab = page.getByRole('tab', { name: /original/i });
  243 |     await originalTab.click();
  244 | 
  245 |     // Verify only original notebooks shown
  246 |     await expect(page.getByText('Original Notebook')).toBeVisible();
  247 |     await expect(page.getByText('Forked Notebook')).not.toBeVisible();
  248 | 
  249 |     // Click "Forks" filter tab
  250 |     const forksTab = page.getByRole('tab', { name: /forks/i });
  251 |     await forksTab.click();
  252 | 
  253 |     // Verify only forks shown
  254 |     await expect(page.getByText('Forked Notebook')).toBeVisible();
  255 |     await expect(page.getByText('Original Notebook')).not.toBeVisible();
  256 | 
  257 |     // Click "All" filter tab
  258 |     const allTab = page.getByRole('tab', { name: /all/i });
  259 |     await allTab.click();
  260 | 
  261 |     // Verify all notebooks shown
  262 |     await expect(page.getByText('Original Notebook')).toBeVisible();
  263 |     await expect(page.getByText('Forked Notebook')).toBeVisible();
  264 |   });
  265 | 
  266 |   test('Filter by tags', async ({ page }) => {
  267 |     // Mock search API with tags
  268 |     await page.route('**/api/v1/search**', (route) => {
  269 |       const url = new URL(route.request().url());
  270 |       const tags = url.searchParams.get('tags');
  271 | 
  272 |       if (tags === 'python') {
  273 |         route.fulfill({
  274 |           status: 200,
  275 |           contentType: 'application/json',
  276 |           body: JSON.stringify({
  277 |             results: [
  278 |               {
  279 |                 id: 1,
  280 |                 title: 'Python Notebook',
  281 |                 username: 'user1',
  282 |                 avatar_url: 'https://example.com/user1.jpg',
  283 |                 like_count: 10,
  284 |                 comment_count: 5,
  285 |                 view_count: 100,
  286 |                 created_at: new Date().toISOString(),
  287 |                 tags: ['python', 'tutorial'],
  288 |               }
  289 |             ],
  290 |             total: 1,
  291 |           })
  292 |         });
  293 |       } else {
  294 |         route.fulfill({
  295 |           status: 200,
  296 |           contentType: 'application/json',
  297 |           body: JSON.stringify({
  298 |             results: [],
  299 |             total: 0,
  300 |           })
  301 |         });
  302 |       }
  303 |     });
  304 | 
  305 |     // Navigate to search page
  306 |     await page.goto('/search');
  307 | 
  308 |     // Search with query
  309 |     const searchInput = page.getByPlaceholder(/search notebooks/i);
  310 |     await searchInput.fill('test');
  311 |     await searchInput.press('Enter');
  312 | 
  313 |     // Select tag filter (e.g., "python")
  314 |     const tagFilter = page.getByRole('button', { name: /python/i });
  315 |     await tagFilter.click();
  316 | 
  317 |     // Verify results filtered by tag
  318 |     await expect(page.getByText('Python Notebook')).toBeVisible();
  319 | 
  320 |     // Verify tag badge shown on results
  321 |     await expect(page.getByText(/python/i)).toBeVisible();
  322 |   });
  323 | 
  324 |   test('Search by author', async ({ page }) => {
  325 |     // Mock search API with author filter
  326 |     await page.route('**/api/v1/search**', (route) => {
  327 |       const url = new URL(route.request().url());
  328 |       const author = url.searchParams.get('author');
  329 | 
  330 |       if (author === 'user1') {
  331 |         route.fulfill({
  332 |           status: 200,
  333 |           contentType: 'application/json',
  334 |           body: JSON.stringify({
  335 |             results: [
  336 |               {
  337 |                 id: 1,
  338 |                 title: 'User1 Notebook',
```