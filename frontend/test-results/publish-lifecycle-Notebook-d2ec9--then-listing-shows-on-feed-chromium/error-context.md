# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: publish-lifecycle.spec.ts >> Notebook publish lifecycle >> save, compile, publish, then listing shows on feed
- Location: tests/e2e/publish-lifecycle.spec.ts:21:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog').getByText(/Compilation completed successfully/i)
Expected: visible
Timeout: 180000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 180000ms
  - waiting for getByRole('dialog').getByText(/Compilation completed successfully/i)

```

# Page snapshot

```yaml
- generic:
  - banner:
    - generic:
      - link:
        - /url: /feed
        - generic:
          - img
        - generic: NotebookSocial
      - navigation:
        - link:
          - /url: /feed
          - button:
            - img
            - text: Feed
        - link:
          - /url: /search
          - button:
            - img
            - text: Search
        - link:
          - /url: /my-notebooks
          - button:
            - img
            - text: My notebooks
        - link:
          - /url: /notebooks/new
          - button:
            - img
            - text: New
      - generic:
        - button:
          - generic:
            - generic: TE
          - generic: testuser
  - alert
  - generic:
    - generic:
      - generic:
        - paragraph: Workflow
        - list:
          - listitem: 1. Edit & run — cells execute in the browser (Pyodide) for quick iteration.
          - listitem: 2. Save & compile — server build in Docker produces the shareable output.
          - listitem: 3. Publish — push the compiled notebook to the feed.
      - generic:
        - img
        - textbox:
          - /placeholder: Untitled notebook
          - text: E2E Publish 1776789761303
      - generic:
        - button:
          - img
          - text: Save
        - button:
          - img
          - text: Compile
        - button [disabled]:
          - img
          - text: Publish
      - generic:
        - generic:
          - paragraph: No cells yet
          - button: Add Code Cell
  - dialog "Step 2 — Server compile" [active] [ref=e2]:
    - generic [ref=e3]:
      - heading "Step 2 — Server compile" [level=2] [ref=e4]
      - paragraph [ref=e5]: Browser runs (Pyodide) are for drafting. This step runs your notebook in an isolated Docker build so the output you publish matches production.
    - generic [ref=e7]:
      - img [ref=e8]
      - generic [ref=e12]:
        - paragraph [ref=e13]: Status
        - paragraph [ref=e14]: "Compilation failed: Unknown execution error"
      - button "Reset" [ref=e15] [cursor=pointer]
    - button "Cancel" [ref=e17] [cursor=pointer]
    - button "Close" [ref=e18] [cursor=pointer]:
      - img [ref=e19]
      - generic [ref=e22]: Close
```

# Test source

```ts
  1  | /**
  2  |  * Full path: save notebook → server compile (Docker/Celery) → publish → visible on feed.
  3  |  * Requires backend + Redis + Celery worker + MinIO (typical docker compose).
  4  |  */
  5  | import { test, expect } from '@playwright/test'
  6  | 
  7  | const API = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8000/api/v1'
  8  | 
  9  | const TEST_USER = {
  10 |   email: 'test@example.com',
  11 |   password: 'testpassword123',
  12 | }
  13 | 
  14 | test.describe('Notebook publish lifecycle', () => {
  15 |   test.describe.configure({ timeout: 240_000 })
  16 | 
  17 |   test.beforeEach(async ({ context }) => {
  18 |     await context.clearCookies()
  19 |   })
  20 | 
  21 |   test('save, compile, publish, then listing shows on feed', async ({ page, context }) => {
  22 |     const loginRes = await context.request.post(`${API}/auth/login`, {
  23 |       data: { email: TEST_USER.email, password: TEST_USER.password },
  24 |       headers: { 'Content-Type': 'application/json' },
  25 |     })
  26 |     expect(loginRes.ok(), `login failed: ${loginRes.status()}`).toBeTruthy()
  27 | 
  28 |     await page.goto('/notebooks/new')
  29 |     await page.waitForLoadState('domcontentloaded')
  30 | 
  31 |     const title = `E2E Publish ${Date.now()}`
  32 |     await page.getByPlaceholder(/untitled notebook/i).fill(title)
  33 | 
  34 |     await page.getByRole('button', { name: /^save$/i }).click()
  35 |     await page.waitForTimeout(3000)
  36 | 
  37 |     await page.getByRole('button', { name: /compile/i }).click()
  38 |     await expect(page.getByRole('dialog')).toBeVisible()
  39 | 
  40 |     const dialogCompile = page.getByRole('dialog').getByRole('button', { name: /^compile$/i })
  41 |     await expect(dialogCompile).toBeVisible({ timeout: 5000 })
  42 |     await dialogCompile.click()
  43 | 
  44 |     await expect(
  45 |       page.getByRole('dialog').getByText(/Compilation completed successfully/i)
> 46 |     ).toBeVisible({ timeout: 180_000 })
     |       ^ Error: expect(locator).toBeVisible() failed
  47 | 
  48 |     await page.getByRole('dialog').getByRole('button', { name: /^close$/i }).click()
  49 | 
  50 |     await page.getByRole('button', { name: /publish/i }).first().click()
  51 |     await expect(page.getByRole('dialog')).toBeVisible()
  52 |     await page.getByRole('button', { name: /publish to feed/i }).click()
  53 | 
  54 |     await expect(page.getByText(/published to the social feed/i)).toBeVisible({ timeout: 60000 })
  55 | 
  56 |     await page.goto('/feed')
  57 |     await expect(page.getByText(title, { exact: false })).toBeVisible({ timeout: 30000 })
  58 |   })
  59 | })
  60 | 
```