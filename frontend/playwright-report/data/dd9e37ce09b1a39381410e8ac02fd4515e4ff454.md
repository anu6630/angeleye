# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: social.spec.ts >> Social Interactions Flow >> Rate limiting (follow)
- Location: tests/e2e/social.spec.ts:580:7

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
> 611 |         await followButton.click();
      |                            ^ Error: locator.click: Test timeout of 30000ms exceeded.
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