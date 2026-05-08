# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: social.spec.ts >> Social Interactions Flow >> Comment on notebook
- Location: tests/e2e/social.spec.ts:303:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.scrollIntoViewIfNeeded: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-testid="comments-section"], .comments-section')

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
              - generic [ref=e73]: "50"
              - generic [ref=e74]: views
          - generic [ref=e75]:
            - button "Like" [ref=e76] [cursor=pointer]:
              - img [ref=e77]
              - text: Like
            - button "Comments (0)" [disabled]:
              - img
              - text: Comments (0)
            - button "Fork" [ref=e79] [cursor=pointer]:
              - img [ref=e80]
              - generic [ref=e84]: Fork
            - button [ref=e85] [cursor=pointer]:
              - img [ref=e86]
      - generic [ref=e92]:
        - generic [ref=e93]:
          - img [ref=e94]
          - heading "Comments (0)" [level=2] [ref=e96]
        - generic [ref=e97]:
          - img [ref=e98]
          - paragraph [ref=e100]: No comments yet. Be the first to share your thoughts!
        - generic [ref=e101]:
          - textbox "Add a comment..." [ref=e102]
          - generic [ref=e103]:
            - button [disabled]:
              - img
  - alert [ref=e104]
```

# Test source

```ts
  234 |           user: {
  235 |             id: 2,
  236 |             username: 'user2',
  237 |             avatar_url: 'https://example.com/user2.jpg',
  238 |           }
  239 |         })
  240 |       });
  241 |     });
  242 | 
  243 |     // Verify like state persisted
  244 |     await expect(likeButton).toHaveAttribute('data-liked', 'true');
  245 |   });
  246 | 
  247 |   test('Unlike notebook', async ({ page }) => {
  248 |     // Mock notebook API (already liked)
  249 |     await page.route('**/api/v1/notebooks/1**', (route) => {
  250 |       route.fulfill({
  251 |         status: 200,
  252 |         contentType: 'application/json',
  253 |         body: JSON.stringify({
  254 |           id: 1,
  255 |           title: 'Test Notebook',
  256 |           user_id: 2,
  257 |           is_published: true,
  258 |           created_at: new Date().toISOString(),
  259 |           updated_at: new Date().toISOString(),
  260 |           like_count: 6,
  261 |           comment_count: 2,
  262 |           view_count: 50,
  263 |           is_liked: true,
  264 |           user: {
  265 |             id: 2,
  266 |             username: 'user2',
  267 |             avatar_url: 'https://example.com/user2.jpg',
  268 |           }
  269 |         })
  270 |       });
  271 |     });
  272 | 
  273 |     // Navigate to notebook
  274 |     await page.goto('/notebooks/1');
  275 | 
  276 |     // Find like button (filled heart)
  277 |     const likeButton = page.getByRole('button', { name: /like/i }).first();
  278 |     await expect(likeButton).toHaveAttribute('data-liked', 'true');
  279 | 
  280 |     // Click like button (unlike)
  281 |     await likeButton.click();
  282 | 
  283 |     // Mock unlike API
  284 |     await page.route('**/api/v1/notebooks/1/like**', (route) => {
  285 |       route.fulfill({
  286 |         status: 200,
  287 |         contentType: 'application/json',
  288 |         body: JSON.stringify({
  289 |           success: true,
  290 |           is_liked: false,
  291 |           like_count: 5,
  292 |         })
  293 |       });
  294 |     });
  295 | 
  296 |     // Verify button changes to outline heart
  297 |     await expect(likeButton).not.toHaveAttribute('data-liked', 'true');
  298 | 
  299 |     // Verify like count decremented
  300 |     await expect(page.getByText(/5 likes/i)).toBeVisible();
  301 |   });
  302 | 
  303 |   test('Comment on notebook', async ({ page }) => {
  304 |     // Mock notebook API
  305 |     await page.route('**/api/v1/notebooks/1**', (route) => {
  306 |       route.fulfill({
  307 |         status: 200,
  308 |         contentType: 'application/json',
  309 |         body: JSON.stringify({
  310 |           id: 1,
  311 |           title: 'Test Notebook',
  312 |           user_id: 2,
  313 |           is_published: true,
  314 |           created_at: new Date().toISOString(),
  315 |           updated_at: new Date().toISOString(),
  316 |           like_count: 5,
  317 |           comment_count: 0,
  318 |           view_count: 50,
  319 |           user: {
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
> 334 |     await commentsSection.scrollIntoViewIfNeeded();
      |                           ^ Error: locator.scrollIntoViewIfNeeded: Test timeout of 30000ms exceeded.
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
```