# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: search.spec.ts >> Search Flow >> Recent searches
- Location: tests/e2e/search.spec.ts:554:7

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
> 585 |     await searchInput.fill('python');
      |                       ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  586 |     await searchInput.press('Enter');
  587 |     await page.waitForTimeout(500);
  588 | 
  589 |     await searchInput.fill('data science');
  590 |     await searchInput.press('Enter');
  591 |     await page.waitForTimeout(500);
  592 | 
  593 |     await searchInput.fill('machine learning');
  594 |     await searchInput.press('Enter');
  595 |     await page.waitForTimeout(500);
  596 | 
  597 |     // Click search bar
  598 |     await searchInput.click();
  599 | 
  600 |     // Verify recent searches shown
  601 |     await expect(page.getByText(/recent searches/i)).toBeVisible();
  602 | 
  603 |     // Verify search history displayed
  604 |     await expect(page.getByText('python')).toBeVisible();
  605 |     await expect(page.getByText('data science')).toBeVisible();
  606 |     await expect(page.getByText('machine learning')).toBeVisible();
  607 | 
  608 |     // Click recent search
  609 |     const recentSearch = page.getByRole('button', { name: /python/i }).first();
  610 |     await recentSearch.click();
  611 | 
  612 |     // Verify search executed
  613 |     await expect(searchInput).toHaveValue('python');
  614 |     await expect(page.getByText('python Notebook')).toBeVisible();
  615 |   });
  616 | });
  617 | 
```