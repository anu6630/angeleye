# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: forking.spec.ts >> Forking Flow >> Cannot delete original with forks
- Location: tests/e2e/forking.spec.ts:456:7

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByRole('button', { name: /delete/i })
Expected: ""
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for getByRole('button', { name: /delete/i })

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
  434 |       });
  435 |     });
  436 | 
  437 |     // Navigate to feed
  438 |     await page.goto('/feed');
  439 | 
  440 |     // Verify both original and fork in feed
  441 |     await expect(page.getByText('Original Notebook')).toBeVisible();
  442 |     await expect(page.getByText('Forked Notebook')).toBeVisible();
  443 | 
  444 |     // Verify both have equal visibility (no prioritization)
  445 |     const originalCard = page.getByText('Original Notebook').locator('..');
  446 |     const forkCard = page.getByText('Forked Notebook').locator('..');
  447 | 
  448 |     // Both cards should be visible
  449 |     await expect(originalCard).toBeVisible();
  450 |     await expect(forkCard).toBeVisible();
  451 | 
  452 |     // No special "original" or "fork" badges that indicate priority
  453 |     await expect(page.getByText(/featured|pinned/i)).not.toBeVisible();
  454 |   });
  455 | 
  456 |   test('Cannot delete original with forks', async ({ page }) => {
  457 |     // Mock notebook with forks
  458 |     await page.route('**/api/v1/notebooks/1**', (route) => {
  459 |       route.fulfill({
  460 |         status: 200,
  461 |         contentType: 'application/json',
  462 |         body: JSON.stringify({
  463 |           id: 1,
  464 |           title: 'Notebook with Forks',
  465 |           user_id: 2,
  466 |           is_published: true,
  467 |           created_at: new Date().toISOString(),
  468 |           updated_at: new Date().toISOString(),
  469 |           like_count: 10,
  470 |           comment_count: 5,
  471 |           view_count: 100,
  472 |           fork_count: 2,
  473 |           cells: [],
  474 |         })
  475 |       });
  476 |     });
  477 | 
  478 |     // Navigate to original notebook
  479 |     await page.goto('/notebooks/1/edit');
  480 | 
  481 |     // Look for delete button
  482 |     const deleteButton = page.getByRole('button', { name: /delete/i });
  483 | 
  484 |     // Verify delete button disabled or not shown
  485 |     // Either the button is disabled
> 486 |     await expect(deleteButton).toHaveAttribute('disabled', '');
      |                                ^ Error: expect(locator).toHaveAttribute(expected) failed
  487 | 
  488 |     // Or a message is shown
  489 |     await expect(page.getByText(/cannot delete notebooks with forks/i)).toBeVisible();
  490 |   });
  491 | 
  492 |   test('View fork attribution', async ({ page }) => {
  493 |     // Mock forked notebook
  494 |     await page.route('**/api/v1/notebooks/2**', (route) => {
  495 |       route.fulfill({
  496 |         status: 200,
  497 |         contentType: 'application/json',
  498 |         body: JSON.stringify({
  499 |           id: 2,
  500 |           title: 'Forked Notebook',
  501 |           user_id: 2,
  502 |           is_published: true,
  503 |           parent_id: 1,
  504 |           root_id: 1,
  505 |           created_at: new Date().toISOString(),
  506 |           updated_at: new Date().toISOString(),
  507 |           like_count: 5,
  508 |           comment_count: 2,
  509 |           view_count: 50,
  510 |           user: {
  511 |             id: 2,
  512 |             username: 'user2',
  513 |             avatar_url: 'https://example.com/user2.jpg',
  514 |           },
  515 |           parent_notebook: {
  516 |             id: 1,
  517 |             title: 'Original Notebook',
  518 |             username: 'user1',
  519 |           }
  520 |         })
  521 |       });
  522 |     });
  523 | 
  524 |     // Navigate to forked notebook
  525 |     await page.goto('/notebooks/2');
  526 | 
  527 |     // Verify "Forked from @username" link shown
  528 |     await expect(page.getByText(/forked from/i)).toBeVisible();
  529 |     await expect(page.getByText(/@user1/i)).toBeVisible();
  530 | 
  531 |     // Click attribution link
  532 |     const attributionLink = page.getByRole('link', { name: /original notebook|@user1/i });
  533 |     await attributionLink.click();
  534 | 
  535 |     // Verify navigate to original notebook
  536 |     await page.waitForURL('**/notebooks/1');
  537 |     await expect(page.getByText('Original Notebook')).toBeVisible();
  538 |   });
  539 | });
  540 | 
```