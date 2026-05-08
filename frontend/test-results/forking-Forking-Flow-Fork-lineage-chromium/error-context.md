# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: forking.spec.ts >> Forking Flow >> Fork lineage
- Location: tests/e2e/forking.spec.ts:251:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/forked from/i)
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/forked from/i)

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
  - generic [ref=e37]:
    - link "Feed" [ref=e40] [cursor=pointer]:
      - /url: /feed
      - button "Feed" [ref=e41]:
        - img [ref=e42]
        - text: Feed
    - generic [ref=e44]:
      - generic [ref=e45]:
        - generic [ref=e46]:
          - heading "Untitled Notebook" [level=1] [ref=e47]
          - generic [ref=e48]:
            - generic [ref=e49]:
              - generic [ref=e50]:
                - generic [ref=e52]: U
                - generic [ref=e53]: Unknown
              - generic [ref=e54]:
                - img [ref=e55]
                - generic [ref=e57]: 4/14/2026
            - button "Follow" [ref=e58] [cursor=pointer]:
              - img [ref=e59]
              - generic [ref=e62]: Follow
        - generic [ref=e63]:
          - generic [ref=e64]: Be the first to like this notebook
          - generic [ref=e65]:
            - button "Like" [ref=e66] [cursor=pointer]:
              - img [ref=e67]
              - text: Like
            - button "Comments (0)" [disabled]:
              - img
              - text: Comments (0)
            - button "Fork" [ref=e69] [cursor=pointer]:
              - img [ref=e70]
              - generic [ref=e74]: Fork
            - button [ref=e75] [cursor=pointer]:
              - img [ref=e76]
      - generic [ref=e83]:
        - generic [ref=e84]: code
        - generic [ref=e86]:
          - code
      - generic [ref=e87]:
        - generic [ref=e88]:
          - img [ref=e89]
          - heading "Comments (0)" [level=2] [ref=e91]
        - generic [ref=e92]:
          - img [ref=e93]
          - paragraph [ref=e95]: No comments yet. Be the first to share your thoughts!
        - generic [ref=e96]:
          - textbox "Add a comment..." [ref=e97]
          - generic [ref=e98]:
            - button [disabled]:
              - img
  - alert [ref=e99]
```

# Test source

```ts
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
  263 |           created_at: new Date().toISOString(),
  264 |           updated_at: new Date().toISOString(),
  265 |           like_count: 10,
  266 |           comment_count: 5,
  267 |           view_count: 100,
  268 |           parent_id: null,
  269 |           root_id: null,
  270 |           user: {
  271 |             id: 1,
  272 |             username: 'user1',
  273 |             avatar_url: 'https://example.com/user1.jpg',
  274 |           }
  275 |         })
  276 |       });
  277 |     });
  278 | 
  279 |     // Fork notebook (fork A)
  280 |     await page.route('**/api/v1/notebooks/1/fork**', (route) => {
  281 |       route.fulfill({
  282 |         status: 200,
  283 |         contentType: 'application/json',
  284 |         body: JSON.stringify({
  285 |           id: 2,
  286 |           title: 'Original Notebook',
  287 |           user_id: 2,
  288 |           is_published: false,
  289 |           parent_id: 1,
  290 |           root_id: 1,
  291 |           created_at: new Date().toISOString(),
  292 |           updated_at: new Date().toISOString(),
  293 |           like_count: 0,
  294 |           comment_count: 0,
  295 |         })
  296 |       });
  297 |     });
  298 | 
  299 |     // Navigate to fork A
  300 |     await page.goto('/notebooks/2');
  301 | 
  302 |     // Mock fork A API with lineage
  303 |     await page.route('**/api/v1/notebooks/2**', (route) => {
  304 |       route.fulfill({
  305 |         status: 200,
  306 |         contentType: 'application/json',
  307 |         body: JSON.stringify({
  308 |           id: 2,
  309 |           title: 'Fork A',
  310 |           user_id: 2,
  311 |           is_published: true,
  312 |           parent_id: 1,
  313 |           root_id: 1,
  314 |           created_at: new Date().toISOString(),
  315 |           updated_at: new Date().toISOString(),
  316 |           like_count: 5,
  317 |           comment_count: 2,
  318 |           view_count: 50,
  319 |           user: {
  320 |             id: 2,
  321 |             username: 'user2',
  322 |             avatar_url: 'https://example.com/user2.jpg',
  323 |           },
  324 |           lineage: [
  325 |             { id: 1, title: 'Original Notebook', username: 'user1' },
  326 |             { id: 2, title: 'Fork A', username: 'user2' },
  327 |           ]
  328 |         })
  329 |       });
  330 |     });
  331 | 
  332 |     // Verify lineage shows: original → fork A
> 333 |     await expect(page.getByText(/forked from/i)).toBeVisible();
      |                                                  ^ Error: expect(locator).toBeVisible() failed
  334 |     await expect(page.getByText(/user1/i)).toBeVisible();
  335 |     await expect(page.getByText('Original Notebook')).toBeVisible();
  336 | 
  337 |     // Fork fork A (fork B)
  338 |     await page.route('**/api/v1/notebooks/2/fork**', (route) => {
  339 |       route.fulfill({
  340 |         status: 200,
  341 |         contentType: 'application/json',
  342 |         body: JSON.stringify({
  343 |           id: 3,
  344 |           title: 'Fork A',
  345 |           user_id: 2,
  346 |           is_published: false,
  347 |           parent_id: 2,
  348 |           root_id: 1,
  349 |           created_at: new Date().toISOString(),
  350 |           updated_at: new Date().toISOString(),
  351 |           like_count: 0,
  352 |           comment_count: 0,
  353 |         })
  354 |       });
  355 |     });
  356 | 
  357 |     // Navigate to fork B
  358 |     await page.goto('/notebooks/3');
  359 | 
  360 |     // Mock fork B API with lineage
  361 |     await page.route('**/api/v1/notebooks/3**', (route) => {
  362 |       route.fulfill({
  363 |         status: 200,
  364 |         contentType: 'application/json',
  365 |         body: JSON.stringify({
  366 |           id: 3,
  367 |           title: 'Fork B',
  368 |           user_id: 2,
  369 |           is_published: true,
  370 |           parent_id: 2,
  371 |           root_id: 1,
  372 |           created_at: new Date().toISOString(),
  373 |           updated_at: new Date().toISOString(),
  374 |           like_count: 3,
  375 |           comment_count: 1,
  376 |           view_count: 25,
  377 |           user: {
  378 |             id: 2,
  379 |             username: 'user2',
  380 |             avatar_url: 'https://example.com/user2.jpg',
  381 |           },
  382 |           lineage: [
  383 |             { id: 1, title: 'Original Notebook', username: 'user1' },
  384 |             { id: 2, title: 'Fork A', username: 'user2' },
  385 |             { id: 3, title: 'Fork B', username: 'user2' },
  386 |           ]
  387 |         })
  388 |       });
  389 |     });
  390 | 
  391 |     // Verify lineage shows: original → fork A → fork B
  392 |     await expect(page.getByText(/forked from/i)).toBeVisible();
  393 |     await expect(page.getByText('Original Notebook')).toBeVisible();
  394 |     await expect(page.getByText('Fork A')).toBeVisible();
  395 |     await expect(page.getByText('Fork B')).toBeVisible();
  396 |   });
  397 | 
  398 |   test('Forks in feed', async ({ page }) => {
  399 |     // Mock feed API with both original and fork
  400 |     await page.route('**/api/v1/feed**', (route) => {
  401 |       route.fulfill({
  402 |         status: 200,
  403 |         contentType: 'application/json',
  404 |         body: JSON.stringify({
  405 |           items: [
  406 |             {
  407 |               id: 1,
  408 |               title: 'Original Notebook',
  409 |               username: 'user1',
  410 |               avatar_url: 'https://example.com/user1.jpg',
  411 |               like_count: 10,
  412 |               comment_count: 5,
  413 |               view_count: 100,
  414 |               created_at: new Date().toISOString(),
  415 |               parent_id: null,
  416 |               root_id: null,
  417 |             },
  418 |             {
  419 |               id: 2,
  420 |               title: 'Forked Notebook',
  421 |               username: 'user2',
  422 |               avatar_url: 'https://example.com/user2.jpg',
  423 |               like_count: 5,
  424 |               comment_count: 2,
  425 |               view_count: 50,
  426 |               created_at: new Date().toISOString(),
  427 |               parent_id: 1,
  428 |               root_id: 1,
  429 |             }
  430 |           ],
  431 |           next_cursor: null,
  432 |           has_more: false,
  433 |         })
```