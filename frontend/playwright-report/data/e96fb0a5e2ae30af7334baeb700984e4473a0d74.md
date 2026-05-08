# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: social.spec.ts >> Social Interactions Flow >> Unlike notebook
- Location: tests/e2e/social.spec.ts:247:7

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
              - generic [ref=e67]: "6"
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
            - button "Like" [ref=e81] [cursor=pointer]:
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
  178 |             id: 2,
  179 |             username: 'user2',
  180 |             avatar_url: 'https://example.com/user2.jpg',
  181 |           }
  182 |         })
  183 |       });
  184 |     });
  185 | 
  186 |     // Navigate to notebook
  187 |     await page.goto('/notebooks/1');
  188 | 
  189 |     // Find like button (outline heart)
  190 |     const likeButton = page.getByRole('button', { name: /like/i }).first();
  191 |     await expect(likeButton).toBeVisible();
  192 | 
  193 |     // Click like button
  194 |     await likeButton.click();
  195 | 
  196 |     // Mock like API
  197 |     await page.route('**/api/v1/notebooks/1/like**', (route) => {
  198 |       route.fulfill({
  199 |         status: 200,
  200 |         contentType: 'application/json',
  201 |         body: JSON.stringify({
  202 |           success: true,
  203 |           is_liked: true,
  204 |           like_count: 6,
  205 |         })
  206 |       });
  207 |     });
  208 | 
  209 |     // Verify button changes to filled heart
  210 |     await expect(likeButton).toHaveAttribute('data-liked', 'true');
  211 | 
  212 |     // Verify like count incremented
  213 |     await expect(page.getByText(/6 likes/i)).toBeVisible();
  214 | 
  215 |     // Refresh page
  216 |     await page.reload();
  217 | 
  218 |     // Mock updated notebook API
  219 |     await page.route('**/api/v1/notebooks/1**', (route) => {
  220 |       route.fulfill({
  221 |         status: 200,
  222 |         contentType: 'application/json',
  223 |         body: JSON.stringify({
  224 |           id: 1,
  225 |           title: 'Test Notebook',
  226 |           user_id: 2,
  227 |           is_published: true,
  228 |           created_at: new Date().toISOString(),
  229 |           updated_at: new Date().toISOString(),
  230 |           like_count: 6,
  231 |           comment_count: 2,
  232 |           view_count: 50,
  233 |           is_liked: true,
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
> 278 |     await expect(likeButton).toHaveAttribute('data-liked', 'true');
      |                              ^ Error: expect(locator).toHaveAttribute(expected) failed
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
```