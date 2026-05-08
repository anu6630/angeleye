# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: social.spec.ts >> Social Interactions Flow >> Unfollow user
- Location: tests/e2e/social.spec.ts:112:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /following/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: /following/i })

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
  35  |         },
  36  |         version: 0
  37  |       }));
  38  |     });
  39  | 
  40  |     await page.reload();
  41  |   });
  42  | 
  43  |   test('Follow user', async ({ page }) => {
  44  |     // Mock user B's profile API
  45  |     await page.route('**/api/v1/users/user2**', (route) => {
  46  |       route.fulfill({
  47  |         status: 200,
  48  |         contentType: 'application/json',
  49  |         body: JSON.stringify({
  50  |           id: 2,
  51  |           username: 'user2',
  52  |           avatar_url: 'https://example.com/user2.jpg',
  53  |           bio: 'User B bio',
  54  |           follower_count: 10,
  55  |           following_count: 5,
  56  |           is_following: false,
  57  |         })
  58  |       });
  59  |     });
  60  | 
  61  |     // Navigate to user B's profile
  62  |     await page.goto('/profile/user2');
  63  | 
  64  |     // Click "Follow" button
  65  |     const followButton = page.getByRole('button', { name: /follow/i });
  66  |     await expect(followButton).toBeVisible();
  67  |     await followButton.click();
  68  | 
  69  |     // Mock follow API
  70  |     await page.route('**/api/v1/users/2/follow**', (route) => {
  71  |       route.fulfill({
  72  |         status: 200,
  73  |         contentType: 'application/json',
  74  |         body: JSON.stringify({
  75  |           success: true,
  76  |           is_following: true,
  77  |           follower_count: 11,
  78  |         })
  79  |       });
  80  |     });
  81  | 
  82  |     // Verify button changes to "Following"
  83  |     await expect(page.getByRole('button', { name: /following/i })).toBeVisible();
  84  | 
  85  |     // Verify follower count incremented
  86  |     await expect(page.getByText(/11 followers/i)).toBeVisible();
  87  | 
  88  |     // Refresh page
  89  |     await page.reload();
  90  | 
  91  |     // Mock updated profile API
  92  |     await page.route('**/api/v1/users/user2**', (route) => {
  93  |       route.fulfill({
  94  |         status: 200,
  95  |         contentType: 'application/json',
  96  |         body: JSON.stringify({
  97  |           id: 2,
  98  |           username: 'user2',
  99  |           avatar_url: 'https://example.com/user2.jpg',
  100 |           bio: 'User B bio',
  101 |           follower_count: 11,
  102 |           following_count: 5,
  103 |           is_following: true,
  104 |         })
  105 |       });
  106 |     });
  107 | 
  108 |     // Verify "Following" state persisted
  109 |     await expect(page.getByRole('button', { name: /following/i })).toBeVisible();
  110 |   });
  111 | 
  112 |   test('Unfollow user', async ({ page }) => {
  113 |     // Mock user B's profile API (already following)
  114 |     await page.route('**/api/v1/users/user2**', (route) => {
  115 |       route.fulfill({
  116 |         status: 200,
  117 |         contentType: 'application/json',
  118 |         body: JSON.stringify({
  119 |           id: 2,
  120 |           username: 'user2',
  121 |           avatar_url: 'https://example.com/user2.jpg',
  122 |           bio: 'User B bio',
  123 |           follower_count: 11,
  124 |           following_count: 5,
  125 |           is_following: true,
  126 |         })
  127 |       });
  128 |     });
  129 | 
  130 |     // Navigate to user B's profile
  131 |     await page.goto('/profile/user2');
  132 | 
  133 |     // Click "Following" button
  134 |     const followingButton = page.getByRole('button', { name: /following/i });
> 135 |     await expect(followingButton).toBeVisible();
      |                                   ^ Error: expect(locator).toBeVisible() failed
  136 |     await followingButton.click();
  137 | 
  138 |     // Mock unfollow API
  139 |     await page.route('**/api/v1/users/2/follow**', (route) => {
  140 |       if (route.request().method() === 'DELETE') {
  141 |         route.fulfill({
  142 |           status: 200,
  143 |           contentType: 'application/json',
  144 |           body: JSON.stringify({
  145 |             success: true,
  146 |             is_following: false,
  147 |             follower_count: 10,
  148 |           })
  149 |         });
  150 |       }
  151 |     });
  152 | 
  153 |     // Verify button changes back to "Follow"
  154 |     await expect(page.getByRole('button', { name: /follow/i })).toBeVisible();
  155 | 
  156 |     // Verify follower count decremented
  157 |     await expect(page.getByText(/10 followers/i)).toBeVisible();
  158 |   });
  159 | 
  160 |   test('Like notebook', async ({ page }) => {
  161 |     // Mock notebook API
  162 |     await page.route('**/api/v1/notebooks/1**', (route) => {
  163 |       route.fulfill({
  164 |         status: 200,
  165 |         contentType: 'application/json',
  166 |         body: JSON.stringify({
  167 |           id: 1,
  168 |           title: 'Test Notebook',
  169 |           user_id: 2,
  170 |           is_published: true,
  171 |           created_at: new Date().toISOString(),
  172 |           updated_at: new Date().toISOString(),
  173 |           like_count: 5,
  174 |           comment_count: 2,
  175 |           view_count: 50,
  176 |           is_liked: false,
  177 |           user: {
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
```