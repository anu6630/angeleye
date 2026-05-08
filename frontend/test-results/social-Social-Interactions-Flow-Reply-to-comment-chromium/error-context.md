# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: social.spec.ts >> Social Interactions Flow >> Reply to comment
- Location: tests/e2e/social.spec.ts:376:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /reply/i }).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: /reply/i }).first()

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
          - heading "Test Notebook" [level=1] [ref=e47]
          - generic [ref=e48]:
            - generic [ref=e49]:
              - generic [ref=e52]: user2
              - generic [ref=e53]:
                - img [ref=e54]
                - generic [ref=e56]: 4/21/2026
            - button "Follow" [ref=e57] [cursor=pointer]:
              - img [ref=e58]
              - generic [ref=e61]: Follow
        - generic [ref=e62]:
          - generic [ref=e63]:
            - generic [ref=e64]:
              - img [ref=e65]
              - generic [ref=e67]: "5"
              - generic [ref=e68]: likes
            - generic [ref=e69]:
              - img [ref=e70]
              - generic [ref=e72]: "1"
              - generic [ref=e73]: comments
            - generic [ref=e74]:
              - img [ref=e75]
              - generic [ref=e78]: "50"
              - generic [ref=e79]: views
          - generic [ref=e80]:
            - button "Like" [ref=e81] [cursor=pointer]:
              - img [ref=e82]
              - text: Like
            - button "Comments (1)" [disabled]:
              - img
              - text: Comments (1)
            - button "Fork" [ref=e84] [cursor=pointer]:
              - img [ref=e85]
              - generic [ref=e89]: Fork
            - button [ref=e90] [cursor=pointer]:
              - img [ref=e91]
      - generic [ref=e97]:
        - generic [ref=e98]:
          - img [ref=e99]
          - heading "Comments (1)" [level=2] [ref=e101]
        - generic [ref=e102]:
          - img [ref=e103]
          - paragraph [ref=e105]: No comments yet. Be the first to share your thoughts!
        - generic [ref=e106]:
          - textbox "Add a comment..." [ref=e107]
          - generic [ref=e108]:
            - button [disabled]:
              - img
  - alert [ref=e109]
```

# Test source

```ts
  320 |             id: 2,
  321 |             username: 'user2',
  322 |             avatar_url: 'https://example.com/user2.jpg',
  323 |           },
  324 |           comments: []
  325 |         })
  326 |       });
  327 |     });
  328 | 
  329 |     // Navigate to notebook
  330 |     await page.goto('/notebooks/1');
  331 | 
  332 |     // Scroll to comments section
  333 |     const commentsSection = page.locator('[data-testid="comments-section"], .comments-section');
  334 |     await commentsSection.scrollIntoViewIfNeeded();
  335 | 
  336 |     // Type comment in textarea
  337 |     const commentTextarea = page.getByRole('textbox', { name: /add a comment|write a comment/i });
  338 |     await expect(commentTextarea).toBeVisible();
  339 |     await commentTextarea.fill('Great notebook!');
  340 | 
  341 |     // Click "Post" button
  342 |     const postButton = page.getByRole('button', { name: /post|send/i });
  343 |     await postButton.click();
  344 | 
  345 |     // Mock comment API
  346 |     await page.route('**/api/v1/notebooks/1/comments**', (route) => {
  347 |       route.fulfill({
  348 |         status: 200,
  349 |         contentType: 'application/json',
  350 |         body: JSON.stringify({
  351 |           id: 1,
  352 |           notebook_id: 1,
  353 |           user_id: 1,
  354 |           content: 'Great notebook!',
  355 |           created_at: new Date().toISOString(),
  356 |           updated_at: new Date().toISOString(),
  357 |           username: 'user1',
  358 |           avatar_url: 'https://example.com/user1.jpg',
  359 |         })
  360 |       });
  361 |     });
  362 | 
  363 |     // Verify comment displayed
  364 |     await expect(page.getByText('Great notebook!')).toBeVisible();
  365 | 
  366 |     // Verify comment count incremented
  367 |     await expect(page.getByText(/1 comment/i)).toBeVisible();
  368 | 
  369 |     // Verify username shown on comment
  370 |     await expect(page.getByText(/user1/i)).toBeVisible();
  371 | 
  372 |     // Verify timestamp shown (relative time like "just now")
  373 |     await expect(page.getByText(/just now/i)).toBeVisible();
  374 |   });
  375 | 
  376 |   test('Reply to comment', async ({ page }) => {
  377 |     // Mock notebook API with existing comments
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
> 420 |     await expect(replyButton).toBeVisible();
      |                               ^ Error: expect(locator).toBeVisible() failed
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
  478 |     await page.getByRole('button', { name: /follow/i }).click();
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
```