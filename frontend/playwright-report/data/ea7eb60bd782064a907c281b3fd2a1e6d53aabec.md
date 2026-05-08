# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: social.spec.ts >> Social Interactions Flow >> Followed content in feed
- Location: tests/e2e/social.spec.ts:463:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /follow/i })

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
  - alert [ref=e38]:
    - img [ref=e39]
    - generic [ref=e41]: User not found
  - alert [ref=e42]
```

# Test source

```ts
  378 |     await page.route('**/api/v1/notebooks/1**', (route) => {
  379 |       route.fulfill({
  380 |         status: 200,
  381 |         contentType: 'application/json',
  382 |         body: JSON.stringify({
  383 |           id: 1,
  384 |           title: 'Test Notebook',
  385 |           user_id: 2,
  386 |           is_published: true,
  387 |           created_at: new Date().toISOString(),
  388 |           updated_at: new Date().toISOString(),
  389 |           like_count: 5,
  390 |           comment_count: 1,
  391 |           view_count: 50,
  392 |           user: {
  393 |             id: 2,
  394 |             username: 'user2',
  395 |             avatar_url: 'https://example.com/user2.jpg',
  396 |           },
  397 |           comments: [
  398 |             {
  399 |               id: 1,
  400 |               notebook_id: 1,
  401 |               user_id: 3,
  402 |               parent_id: null,
  403 |               content: 'Original comment',
  404 |               created_at: new Date(Date.now() - 3600000).toISOString(),
  405 |               updated_at: new Date(Date.now() - 3600000).toISOString(),
  406 |               username: 'user3',
  407 |               avatar_url: 'https://example.com/user3.jpg',
  408 |               replies: []
  409 |             }
  410 |           ]
  411 |         })
  412 |       });
  413 |     });
  414 | 
  415 |     // Navigate to notebook with comments
  416 |     await page.goto('/notebooks/1');
  417 | 
  418 |     // Click "Reply" on a comment
  419 |     const replyButton = page.getByRole('button', { name: /reply/i }).first();
  420 |     await expect(replyButton).toBeVisible();
  421 |     await replyButton.click();
  422 | 
  423 |     // Verify reply form shown
  424 |     const replyTextarea = page.locator('.reply-form textarea').first();
  425 |     await expect(replyTextarea).toBeVisible();
  426 | 
  427 |     // Type reply
  428 |     await replyTextarea.fill('Thanks for sharing!');
  429 | 
  430 |     // Click "Post" button
  431 |     const postButton = page.locator('.reply-form button').first();
  432 |     await postButton.click();
  433 | 
  434 |     // Mock reply API
  435 |     await page.route('**/api/v1/notebooks/1/comments**', (route) => {
  436 |       route.fulfill({
  437 |         status: 200,
  438 |         contentType: 'application/json',
  439 |         body: JSON.stringify({
  440 |           id: 2,
  441 |           notebook_id: 1,
  442 |           user_id: 1,
  443 |           parent_id: 1,
  444 |           content: 'Thanks for sharing!',
  445 |           created_at: new Date().toISOString(),
  446 |           updated_at: new Date().toISOString(),
  447 |           username: 'user1',
  448 |           avatar_url: 'https://example.com/user1.jpg',
  449 |         })
  450 |       });
  451 |     });
  452 | 
  453 |     // Verify reply shown nested under parent
  454 |     const replyContainer = page.locator('.comment-replies, .replies').first();
  455 |     await expect(replyContainer).toContainText('Thanks for sharing!');
  456 | 
  457 |     // Verify indentation correct (threaded)
  458 |     const replyElement = page.locator('.comment-item[data-parent-id="1"]').first();
  459 |     await expect(replyElement).toBeVisible();
  460 |     await expect(replyElement).toHaveCSS('margin-left', /\d+px/);
  461 |   });
  462 | 
  463 |   test('Followed content in feed', async ({ page }) => {
  464 |     // Mock follow API
  465 |     await page.route('**/api/v1/users/2/follow**', (route) => {
  466 |       route.fulfill({
  467 |         status: 200,
  468 |         contentType: 'application/json',
  469 |         body: JSON.stringify({
  470 |           success: true,
  471 |           is_following: true,
  472 |         })
  473 |       });
  474 |     });
  475 | 
  476 |     // Follow user B
  477 |     await page.goto('/profile/user2');
> 478 |     await page.getByRole('button', { name: /follow/i }).click();
      |                                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  479 | 
  480 |     // Mock feed API with user B's notebook
  481 |     await page.route('**/api/v1/feed**', (route) => {
  482 |       route.fulfill({
  483 |         status: 200,
  484 |         contentType: 'application/json',
  485 |         body: JSON.stringify({
  486 |           items: [
  487 |             {
  488 |               id: 1,
  489 |               title: 'User B Notebook',
  490 |               username: 'user2',
  491 |               avatar_url: 'https://example.com/user2.jpg',
  492 |               like_count: 5,
  493 |               comment_count: 2,
  494 |               view_count: 50,
  495 |               created_at: new Date().toISOString(),
  496 |             }
  497 |           ],
  498 |           next_cursor: null,
  499 |           has_more: false,
  500 |         })
  501 |       });
  502 |     });
  503 | 
  504 |     // Navigate to feed
  505 |     await page.goto('/feed');
  506 | 
  507 |     // Verify user B's notebook in feed
  508 |     await expect(page.getByText('User B Notebook')).toBeVisible();
  509 | 
  510 |     // Verify "Following" indicator shown
  511 |     await expect(page.getByText(/following/i)).toBeVisible();
  512 | 
  513 |     // Verify notebook prioritized in feed (shown first)
  514 |     const firstNotebook = page.locator('[data-testid="feed-card"]').first();
  515 |     await expect(firstNotebook).toContainText('User B Notebook');
  516 |   });
  517 | 
  518 |   test('Optimistic updates', async ({ page }) => {
  519 |     // Mock notebook API
  520 |     await page.route('**/api/v1/notebooks/1**', (route) => {
  521 |       route.fulfill({
  522 |         status: 200,
  523 |         contentType: 'application/json',
  524 |         body: JSON.stringify({
  525 |           id: 1,
  526 |           title: 'Test Notebook',
  527 |           user_id: 2,
  528 |           is_published: true,
  529 |           created_at: new Date().toISOString(),
  530 |           updated_at: new Date().toISOString(),
  531 |           like_count: 5,
  532 |           comment_count: 2,
  533 |           view_count: 50,
  534 |           is_liked: false,
  535 |           user: {
  536 |             id: 2,
  537 |             username: 'user2',
  538 |             avatar_url: 'https://example.com/user2.jpg',
  539 |           }
  540 |         })
  541 |       });
  542 |     });
  543 | 
  544 |     // Navigate to notebook
  545 |     await page.goto('/notebooks/1');
  546 | 
  547 |     // Find like button
  548 |     const likeButton = page.getByRole('button', { name: /like/i }).first();
  549 | 
  550 |     // Click like button
  551 |     await likeButton.click();
  552 | 
  553 |     // Verify icon changes immediately (before API response)
  554 |     // This tests optimistic updates
  555 |     await expect(likeButton).toHaveAttribute('data-liked', 'true');
  556 | 
  557 |     // Delay API response
  558 |     await page.waitForTimeout(100);
  559 | 
  560 |     // Mock like API
  561 |     await page.route('**/api/v1/notebooks/1/like**', (route) => {
  562 |       route.fulfill({
  563 |         status: 200,
  564 |         contentType: 'application/json',
  565 |         body: JSON.stringify({
  566 |           success: true,
  567 |           is_liked: true,
  568 |           like_count: 6,
  569 |         })
  570 |       });
  571 |     });
  572 | 
  573 |     // Click unlike
  574 |     await likeButton.click();
  575 | 
  576 |     // Verify icon changes immediately
  577 |     await expect(likeButton).not.toHaveAttribute('data-liked', 'true');
  578 |   });
```