/**
 * E2E tests for notebook creation flow
 *
 * Tests:
 * - Create new notebook
 * - Compile notebook
 * - Publish notebook
 * - View published notebook
 * - Edit existing notebook
 * - Delete draft notebook
 */
import { test, expect } from '@playwright/test';

test.describe('Notebook Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');

    await page.evaluate(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          isAuthenticated: true,
          user: {
            id: 1,
            email: 'test@example.com',
            username: 'testuser',
            is_active: true,
            is_verified: true,
            avatar_url: 'https://example.com/avatar.jpg',
            created_at: new Date().toISOString(),
          }
        },
        version: 0
      }));
    });

    await page.reload();
  });

  test('Create new notebook', async ({ page }) => {
    // Click "New Notebook" button
    const newNotebookButton = page.getByRole('link', { name: /new notebook/i });
    await expect(newNotebookButton).toBeVisible();
    await newNotebookButton.click();

    // Verify editor page loaded
    await page.waitForURL('**/notebooks/new');
    await expect(page.getByText(/notebook editor/i)).toBeVisible();

    // Verify Monaco editor visible (or editor container)
    const editorContainer = page.locator('.monaco-editor, [data-testid="notebook-editor"], .editor-container');
    await expect(editorContainer).toBeVisible();

    // Type title in title input
    const titleInput = page.getByRole('textbox', { name: /title/i });
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Test Notebook');

    // Click "Add Code Cell" button
    const addCodeCellButton = page.getByRole('button', { name: /add code cell/i });
    await expect(addCodeCellButton).toBeVisible();
    await addCodeCellButton.click();

    // Verify code cell added
    const codeCell = page.locator('[data-cell-type="code"], .code-cell').first();
    await expect(codeCell).toBeVisible();

    // Type Python code in the cell
    const codeTextarea = page.locator('.monaco-editor textarea, .code-cell textarea').first();
    await codeTextarea.fill('print("Hello, World!")');

    // Click "Add Markdown Cell" button
    const addMarkdownCellButton = page.getByRole('button', { name: /add markdown cell/i });
    await addMarkdownCellButton.click();

    // Verify markdown cell added
    const markdownCell = page.locator('[data-cell-type="markdown"], .markdown-cell').nth(1);
    await expect(markdownCell).toBeVisible();

    // Type markdown content
    const markdownTextarea = page.locator('.markdown-cell textarea').nth(1);
    await markdownTextarea.fill('# Test Notebook');

    // Click "Save" button
    const saveButton = page.getByRole('button', { name: /save/i });
    await saveButton.click();

    // Verify "Saved" toast shown
    await expect(page.getByText(/saved/i)).toBeVisible();
  });

  test('Compile notebook', async ({ page }) => {
    // Create notebook with code cell
    await page.goto('/notebooks/new');

    const titleInput = page.getByRole('textbox', { name: /title/i });
    await titleInput.fill('Compilation Test');

    const addCodeCellButton = page.getByRole('button', { name: /add code cell/i });
    await addCodeCellButton.click();

    const codeTextarea = page.locator('.monaco-editor textarea, .code-cell textarea').first();
    await codeTextarea.fill('print("Hello, World!")');

    // Click "Compile" button
    const compileButton = page.getByRole('button', { name: /compile/i });
    await compileButton.click();

    // Verify compilation dialog opens
    await expect(page.getByText(/compiling/i)).toBeVisible();

    // Mock successful compilation response
    await page.route('**/api/v1/notebooks/*/compile**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          task_id: 'mock-task-id',
          status: 'processing',
        })
      });
    });

    // After some time, status changes to "Success"
    // Mock the status check
    await page.route('**/api/v1/notebooks/*/compile/status**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          output_url: 'https://example.com/output.html',
        })
      });
    });

    // Verify status changes to "Success"
    await expect(page.getByText(/success|completed/i)).toBeVisible({ timeout: 10000 });

    // Verify output preview shown
    await expect(page.getByText(/output/i)).toBeVisible();
  });

  test('Publish notebook', async ({ page }) => {
    // Create and compile notebook (setup from previous tests)
    await page.goto('/notebooks/new');

    const titleInput = page.getByRole('textbox', { name: /title/i });
    await titleInput.fill('Publish Test');

    const addCodeCellButton = page.getByRole('button', { name: /add code cell/i });
    await addCodeCellButton.click();

    // Mock compilation and publish APIs
    await page.route('**/api/v1/notebooks/*/compile**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          task_id: 'mock-task-id',
          status: 'processing',
        })
      });
    });

    await page.route('**/api/v1/notebooks/*/compile/status**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          output_url: 'https://example.com/output.html',
        })
      });
    });

    // Click "Publish" button
    const publishButton = page.getByRole('button', { name: /publish/i });
    await publishButton.click();

    // Verify publish dialog opens
    await expect(page.getByText(/publish notebook/i)).toBeVisible();

    // Verify output URL shown
    await expect(page.getByText(/https:\/\/example\.com\/output\.html/i)).toBeVisible();

    // Mock publish API
    await page.route('**/api/v1/notebooks/*/publish**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          title: 'Publish Test',
          is_published: true,
          output_url: 'https://example.com/output.html',
        })
      });
    });

    // Click "Confirm Publish" button
    const confirmButton = page.getByRole('button', { name: /confirm|publish/i });
    await confirmButton.click();

    // Verify "Notebook published" toast shown
    await expect(page.getByText(/published/i)).toBeVisible();

    // Navigate to feed
    await page.goto('/feed');

    // Verify notebook in feed
    await expect(page.getByText('Publish Test')).toBeVisible();

    // Verify "Published" badge shown
    await expect(page.getByText(/published/i)).toBeVisible();
  });

  test('View published notebook', async ({ page }) => {
    // Mock feed API with published notebook
    await page.route('**/api/v1/feed**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 1,
              title: 'Published Notebook',
              username: 'testuser',
              avatar_url: 'https://example.com/avatar.jpg',
              like_count: 5,
              comment_count: 3,
              view_count: 100,
              created_at: new Date().toISOString(),
            }
          ],
          next_cursor: null,
          has_more: false,
        })
      });
    });

    // Click notebook card in feed
    await page.goto('/feed');
    const notebookCard = page.getByText('Published Notebook');
    await notebookCard.click();

    // Verify notebook viewer page loaded
    await page.waitForURL('**/notebooks/**');
    await expect(page.getByText(/notebook viewer/i)).toBeVisible();

    // Verify title displayed
    await expect(page.getByText('Published Notebook')).toBeVisible();

    // Mock notebook detail API
    await page.route('**/api/v1/notebooks/1**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          title: 'Published Notebook',
          user_id: 1,
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 5,
          comment_count: 3,
          view_count: 100,
          cells: [
            {
              id: 1,
              cell_type: 'code',
              content: 'print("Hello, World!")',
              order_index: 0,
            },
            {
              id: 2,
              cell_type: 'markdown',
              content: '# Test Notebook',
              order_index: 1,
            }
          ],
          user: {
            id: 1,
            username: 'testuser',
            avatar_url: 'https://example.com/avatar.jpg',
          }
        })
      });
    });

    // Verify cells rendered
    await expect(page.getByText('print("Hello, World!")')).toBeVisible();
    await expect(page.getByText('# Test Notebook')).toBeVisible();

    // Verify outputs displayed
    await expect(page.locator('.cell-output, .output-container')).toBeVisible();

    // Verify code cells are read-only (no edit controls)
    const editButton = page.getByRole('button', { name: /edit cell/i });
    await expect(editButton).not.toBeVisible();
  });

  test('Edit existing notebook', async ({ page }) => {
    // Mock "My Notebooks" API
    await page.route('**/api/v1/notebooks?**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            title: 'Draft Notebook',
            user_id: 1,
            is_published: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            like_count: 0,
            comment_count: 0,
          }
        ])
      });
    });

    // Navigate to "My Notebooks"
    await page.goto('/my-notebooks');

    // Click on draft notebook
    const notebookLink = page.getByRole('link', { name: /draft notebook/i });
    await notebookLink.click();

    // Verify editor loaded with existing cells
    await page.waitForURL('**/notebooks/*/edit');
    await expect(page.getByRole('textbox', { name: /title/i })).toHaveValue('Draft Notebook');

    // Mock notebook load API
    await page.route('**/api/v1/notebooks/1**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          title: 'Draft Notebook',
          user_id: 1,
          is_published: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 0,
          comment_count: 0,
          cells: [
            {
              id: 1,
              cell_type: 'code',
              content: 'print("Existing code")',
              order_index: 0,
            }
          ],
        })
      });
    });

    // Verify existing cells loaded
    await expect(page.getByText('print("Existing code")')).toBeVisible();

    // Add new cell
    const addCodeCellButton = page.getByRole('button', { name: /add code cell/i });
    await addCodeCellButton.click();

    const codeTextarea = page.locator('.monaco-editor textarea, .code-cell textarea').last();
    await codeTextarea.fill('print("New cell")');

    // Click "Save"
    const saveButton = page.getByRole('button', { name: /save/i });
    await saveButton.click();

    // Verify changes saved
    await expect(page.getByText(/saved/i)).toBeVisible();
  });

  test('Delete draft notebook', async ({ page }) => {
    // Mock "My Notebooks" API with draft
    await page.route('**/api/v1/notebooks?**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            title: 'Draft to Delete',
            user_id: 1,
            is_published: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            like_count: 0,
            comment_count: 0,
          }
        ])
      });
    });

    // Create draft notebook (setup)
    await page.goto('/my-notebooks');

    // Click delete button on notebook card
    const deleteButton = page.getByRole('button', { name: /delete/i }).first();
    await deleteButton.click();

    // Confirm delete in dialog
    const confirmButton = page.getByRole('button', { name: /confirm|delete/i });
    await confirmButton.click();

    // Mock delete API
    await page.route('**/api/v1/notebooks/1**', (route) => {
      route.fulfill({
        status: 204,
        contentType: 'application/json',
        body: '',
      });
    });

    // Verify notebook removed from list
    await expect(page.getByText('Draft to Delete')).not.toBeVisible();
  });
});
