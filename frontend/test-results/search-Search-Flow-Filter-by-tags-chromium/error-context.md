# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: search.spec.ts >> Search Flow >> Filter by tags
- Location: tests/e2e/search.spec.ts:266:7

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
  238 |     await searchInput.fill('test');
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
> 310 |     await searchInput.fill('test');
      |                       ^ Error: locator.fill: Test timeout of 30000ms exceeded.
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
  339 |                 username: 'user1',
  340 |                 avatar_url: 'https://example.com/user1.jpg',
  341 |                 like_count: 10,
  342 |                 comment_count: 5,
  343 |                 view_count: 100,
  344 |                 created_at: new Date().toISOString(),
  345 |               }
  346 |             ],
  347 |             total: 1,
  348 |           })
  349 |         });
  350 |       } else {
  351 |         route.fulfill({
  352 |           status: 200,
  353 |           contentType: 'application/json',
  354 |           body: JSON.stringify({
  355 |             results: [],
  356 |             total: 0,
  357 |           })
  358 |         });
  359 |       }
  360 |     });
  361 | 
  362 |     // Navigate to search page
  363 |     await page.goto('/search');
  364 | 
  365 |     // Click author filter dropdown
  366 |     const authorDropdown = page.getByRole('combobox', { name: /author/i });
  367 |     await authorDropdown.click();
  368 | 
  369 |     // Select author from list
  370 |     const authorOption = page.getByRole('option', { name: /user1/i });
  371 |     await authorOption.click();
  372 | 
  373 |     // Verify results filtered by author
  374 |     await expect(page.getByText('User1 Notebook')).toBeVisible();
  375 | 
  376 |     // Verify author name shown in filter
  377 |     await expect(authorDropdown).toHaveText(/user1/i);
  378 |   });
  379 | 
  380 |   test('Clear search', async ({ page }) => {
  381 |     // Mock search API
  382 |     await page.route('**/api/v1/search**', (route) => {
  383 |       route.fulfill({
  384 |         status: 200,
  385 |         contentType: 'application/json',
  386 |         body: JSON.stringify({
  387 |           results: [
  388 |             {
  389 |               id: 1,
  390 |               title: 'Test Notebook',
  391 |               username: 'user1',
  392 |               avatar_url: 'https://example.com/user1.jpg',
  393 |               like_count: 10,
  394 |               comment_count: 5,
  395 |               view_count: 100,
  396 |               created_at: new Date().toISOString(),
  397 |             }
  398 |           ],
  399 |           total: 1,
  400 |         })
  401 |       });
  402 |     });
  403 | 
  404 |     // Navigate to search page
  405 |     await page.goto('/search');
  406 | 
  407 |     // Type search query
  408 |     const searchInput = page.getByPlaceholder(/search notebooks/i);
  409 |     await searchInput.fill('test query');
  410 | 
```