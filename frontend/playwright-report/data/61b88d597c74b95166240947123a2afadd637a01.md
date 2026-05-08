# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: social.spec.ts >> Social Interactions Flow >> Optimistic updates
- Location: tests/e2e/social.spec.ts:518:7

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByRole('button', { name: /like/i }).first()
Expected: "true"
Received: ""
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for getByRole('button', { name: /like/i }).first()
    9 × locator resolved to <button class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 rounded-full">…</button>
      - unexpected value "null"

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
              - generic [ref=e72]: "2"
              - generic [ref=e73]: comments
            - generic [ref=e74]:
              - img [ref=e75]
              - generic [ref=e78]: "50"
              - generic [ref=e79]: views
          - generic [ref=e80]:
            - button "Like" [active] [ref=e81] [cursor=pointer]:
              - img [ref=e82]
              - text: Like
            - button "Comments (2)" [disabled]:
              - img
              - text: Comments (2)
            - button "Fork" [ref=e84] [cursor=pointer]:
              - img [ref=e85]
              - generic [ref=e89]: Fork
            - button [ref=e90] [cursor=pointer]:
              - img [ref=e91]
      - generic [ref=e97]:
        - generic [ref=e98]:
          - img [ref=e99]
          - heading "Comments (2)" [level=2] [ref=e101]
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
> 555 |     await expect(likeButton).toHaveAttribute('data-liked', 'true');
      |                              ^ Error: expect(locator).toHaveAttribute(expected) failed
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
  579 | 
  580 |   test('Rate limiting (follow)', async ({ page }) => {
  581 |     // Mock follow API with rate limit
  582 |     let followCount = 0;
  583 |     await page.route('**/api/v1/users/*/follow**', (route) => {
  584 |       followCount++;
  585 |       if (followCount > 100) {
  586 |         route.fulfill({
  587 |           status: 429,
  588 |           contentType: 'application/json',
  589 |           body: JSON.stringify({
  590 |             detail: 'Rate limit exceeded',
  591 |           })
  592 |         });
  593 |       } else {
  594 |         route.fulfill({
  595 |           status: 200,
  596 |           contentType: 'application/json',
  597 |           body: JSON.stringify({
  598 |             success: true,
  599 |             is_following: true,
  600 |           })
  601 |         });
  602 |       }
  603 |     });
  604 | 
  605 |     // Navigate to different profiles and follow
  606 |     for (let i = 1; i <= 101; i++) {
  607 |       await page.goto(`/profile/user${i}`);
  608 |       const followButton = page.getByRole('button', { name: /follow/i });
  609 | 
  610 |       if (i <= 100) {
  611 |         await followButton.click();
  612 |         // Should succeed
  613 |         await expect(page.getByRole('button', { name: /following/i })).toBeVisible();
  614 |       } else {
  615 |         // 101st follow should hit rate limit
  616 |         await followButton.click();
  617 |         // Verify rate limit error
  618 |         await expect(page.getByText(/rate limit|too many follows/i)).toBeVisible();
  619 |         break;
  620 |       }
  621 |     }
  622 |   });
  623 | });
  624 | 
```