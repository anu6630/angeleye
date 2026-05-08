# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: search.spec.ts >> Search Flow >> Search debouncing
- Location: tests/e2e/search.spec.ts:461:7

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
  411 |     // Click clear button
  412 |     const clearButton = page.getByRole('button', { name: /clear/i });
  413 |     await clearButton.click();
  414 | 
  415 |     // Verify search input cleared
  416 |     await expect(searchInput).toHaveValue('');
  417 | 
  418 |     // Verify results reset to all notebooks
  419 |     // Mock default results
  420 |     await page.route('**/api/v1/search**', (route) => {
  421 |       const url = new URL(route.request().url());
  422 |       const query = url.searchParams.get('q');
  423 | 
  424 |       if (!query) {
  425 |         route.fulfill({
  426 |           status: 200,
  427 |           contentType: 'application/json',
  428 |           body: JSON.stringify({
  429 |             results: [
  430 |               {
  431 |                 id: 1,
  432 |                 title: 'All Notebooks 1',
  433 |                 username: 'user1',
  434 |                 avatar_url: 'https://example.com/user1.jpg',
  435 |                 like_count: 10,
  436 |                 comment_count: 5,
  437 |                 view_count: 100,
  438 |                 created_at: new Date().toISOString(),
  439 |               },
  440 |               {
  441 |                 id: 2,
  442 |                 title: 'All Notebooks 2',
  443 |                 username: 'user2',
  444 |                 avatar_url: 'https://example.com/user2.jpg',
  445 |                 like_count: 8,
  446 |                 comment_count: 3,
  447 |                 view_count: 80,
  448 |                 created_at: new Date().toISOString(),
  449 |               }
  450 |             ],
  451 |             total: 2,
  452 |           })
  453 |         });
  454 |       }
  455 |     });
  456 | 
  457 |     await expect(page.getByText('All Notebooks 1')).toBeVisible();
  458 |     await expect(page.getByText('All Notebooks 2')).toBeVisible();
  459 |   });
  460 | 
  461 |   test('Search debouncing', async ({ page }) => {
  462 |     // Track API calls
  463 |     let apiCallCount = 0;
  464 | 
  465 |     // Mock search API
  466 |     await page.route('**/api/v1/search**', (route) => {
  467 |       apiCallCount++;
  468 |       route.fulfill({
  469 |         status: 200,
  470 |         contentType: 'application/json',
  471 |         body: JSON.stringify({
  472 |           results: [],
  473 |           total: 0,
  474 |         })
  475 |       });
  476 |     });
  477 | 
  478 |     // Navigate to search page
  479 |     await page.goto('/search');
  480 | 
  481 |     // Type search query rapidly
  482 |     const searchInput = page.getByPlaceholder(/search notebooks/i);
  483 | 
> 484 |     await searchInput.fill('p');
      |                       ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  485 |     await page.waitForTimeout(50);
  486 |     await searchInput.fill('py');
  487 |     await page.waitForTimeout(50);
  488 |     await searchInput.fill('pyt');
  489 |     await page.waitForTimeout(50);
  490 |     await searchInput.fill('pyth');
  491 |     await page.waitForTimeout(50);
  492 |     await searchInput.fill('pytho');
  493 |     await page.waitForTimeout(50);
  494 |     await searchInput.fill('python');
  495 | 
  496 |     // Wait for debounce delay
  497 |     await page.waitForTimeout(600);
  498 | 
  499 |     // Verify search not called on every keystroke
  500 |     // Should be called only once after debounce
  501 |     expect(apiCallCount).toBeLessThan(7);
  502 | 
  503 |     // Verify search called after debounce delay
  504 |     expect(apiCallCount).toBeGreaterThanOrEqual(1);
  505 |   });
  506 | 
  507 |   test('Search from notebook title click', async ({ page }) => {
  508 |     // Mock search API
  509 |     await page.route('**/api/v1/search**', (route) => {
  510 |       route.fulfill({
  511 |         status: 200,
  512 |         contentType: 'application/json',
  513 |         body: JSON.stringify({
  514 |           results: [
  515 |             {
  516 |               id: 1,
  517 |               title: 'Test Notebook',
  518 |               username: 'user1',
  519 |               avatar_url: 'https://example.com/user1.jpg',
  520 |               like_count: 10,
  521 |               comment_count: 5,
  522 |               view_count: 100,
  523 |               created_at: new Date().toISOString(),
  524 |             }
  525 |           ],
  526 |           total: 1,
  527 |         })
  528 |       });
  529 |     });
  530 | 
  531 |     // Navigate to search page
  532 |     await page.goto('/search');
  533 | 
  534 |     // Type search query
  535 |     const searchInput = page.getByPlaceholder(/search notebooks/i);
  536 |     await searchInput.fill('test');
  537 |     await searchInput.press('Enter');
  538 | 
  539 |     // Click on notebook in search results
  540 |     const notebookLink = page.getByRole('link', { name: /test notebook/i });
  541 |     await notebookLink.click();
  542 | 
  543 |     // Verify notebook viewer opened
  544 |     await page.waitForURL('**/notebooks/**');
  545 | 
  546 |     // Use browser back button
  547 |     await page.goBack();
  548 | 
  549 |     // Verify search results preserved
  550 |     await expect(page.getByText('Test Notebook')).toBeVisible();
  551 |     await expect(searchInput).toHaveValue('test');
  552 |   });
  553 | 
  554 |   test('Recent searches', async ({ page }) => {
  555 |     // Mock search API
  556 |     await page.route('**/api/v1/search**', (route) => {
  557 |       const url = new URL(route.request().url());
  558 |       const query = url.searchParams.get('q');
  559 | 
  560 |       route.fulfill({
  561 |         status: 200,
  562 |         contentType: 'application/json',
  563 |         body: JSON.stringify({
  564 |           results: [
  565 |             {
  566 |               id: 1,
  567 |               title: `${query} Notebook`,
  568 |               username: 'user1',
  569 |               avatar_url: 'https://example.com/user1.jpg',
  570 |               like_count: 10,
  571 |               comment_count: 5,
  572 |               view_count: 100,
  573 |               created_at: new Date().toISOString(),
  574 |             }
  575 |           ],
  576 |           total: 1,
  577 |         })
  578 |       });
  579 |     });
  580 | 
  581 |     // Perform multiple searches
  582 |     const searchInput = page.getByPlaceholder(/search notebooks/i);
  583 | 
  584 |     await page.goto('/search');
```