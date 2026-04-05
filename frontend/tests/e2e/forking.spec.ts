/**
 * E2E tests for forking flow
 *
 * Tests:
 * - Fork from feed
 * - Edit fork independently
 * - Fork lineage
 * - Forks in feed
 * - Cannot delete original with forks
 * - View fork attribution
 */
import { test, expect } from '@playwright/test';

test.describe('Forking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as user before each test
    await page.goto('/login');

    await page.evaluate(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          isAuthenticated: true,
          user: {
            id: 2,
            email: 'user2@example.com',
            username: 'user2',
            is_active: true,
            is_verified: true,
            avatar_url: 'https://example.com/user2.jpg',
            created_at: new Date().toISOString(),
          }
        },
        version: 0
      }));
    });

    await page.reload();
  });

  test('Fork from feed', async ({ page }) => {
    // Mock feed API with user A's notebook
    await page.route('**/api/v1/feed**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 1,
              title: 'Original Notebook',
              username: 'user1',
              avatar_url: 'https://example.com/user1.jpg',
              like_count: 10,
              comment_count: 5,
              view_count: 100,
              created_at: new Date().toISOString(),
              parent_id: null,
              root_id: null,
            }
          ],
          next_cursor: null,
          has_more: false,
        })
      });
    });

    // Navigate to feed
    await page.goto('/feed');

    // Find user A's notebook
    await expect(page.getByText('Original Notebook')).toBeVisible();
    await expect(page.getByText(/user1/i)).toBeVisible();

    // Click "Fork" button on notebook card
    const forkButton = page.getByRole('button', { name: /fork/i }).first();
    await expect(forkButton).toBeVisible();
    await forkButton.click();

    // Mock fork API
    await page.route('**/api/v1/notebooks/1/fork**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 2,
          title: 'Original Notebook',
          user_id: 2,
          is_published: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 0,
          comment_count: 0,
          parent_id: 1,
          root_id: 1,
          cells: [
            {
              id: 1,
              cell_type: 'code',
              content: 'print("Original code")',
              order_index: 0,
            },
            {
              id: 2,
              cell_type: 'markdown',
              content: '# Original notebook',
              order_index: 1,
            }
          ],
        })
      });
    });

    // Verify redirect to editor
    await page.waitForURL('**/notebooks/*/edit');

    // Verify notebook loaded (copy of original)
    await expect(page.getByRole('textbox', { name: /title/i })).toHaveValue('Original Notebook');

    // Verify cells copied from original
    await expect(page.getByText('print("Original code")')).toBeVisible();
    await expect(page.getByText('# Original notebook')).toBeVisible();

    // Verify "Forked from" indicator shown
    await expect(page.getByText(/forked from/i)).toBeVisible();
    await expect(page.getByText(/user1/i)).toBeVisible();
  });

  test('Edit fork independently', async ({ page }) => {
    // Setup: Fork a notebook
    await page.goto('/notebooks/2/edit');

    // Mock forked notebook API
    await page.route('**/api/v1/notebooks/2**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 2,
          title: 'Original Notebook',
          user_id: 2,
          is_published: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 0,
          comment_count: 0,
          parent_id: 1,
          root_id: 1,
          cells: [
            {
              id: 1,
              cell_type: 'code',
              content: 'print("Original code")',
              order_index: 0,
            }
          ],
        })
      });
    });

    // Add new cell to fork
    const addCodeCellButton = page.getByRole('button', { name: /add code cell/i });
    await addCodeCellButton.click();

    const codeTextarea = page.locator('.monaco-editor textarea, .code-cell textarea').last();
    await codeTextarea.fill('print("Forked code")');

    // Change fork title
    const titleInput = page.getByRole('textbox', { name: /title/i });
    await titleInput.fill('Forked Notebook');

    // Save fork
    const saveButton = page.getByRole('button', { name: /save/i });
    await saveButton.click();

    // Mock save API
    await page.route('**/api/v1/notebooks/2**', (route) => {
      if (route.request().method() === 'PATCH') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 2,
            title: 'Forked Notebook',
            user_id: 2,
            is_published: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            like_count: 0,
            comment_count: 0,
            parent_id: 1,
            root_id: 1,
          })
        });
      } else {
        route.continue();
      }
    });

    // Verify changes saved
    await expect(page.getByText(/saved/i)).toBeVisible();

    // Navigate to original notebook
    await page.goto('/notebooks/1');

    // Mock original notebook API
    await page.route('**/api/v1/notebooks/1**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          title: 'Original Notebook',
          user_id: 1,
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 10,
          comment_count: 5,
          view_count: 100,
          cells: [
            {
              id: 1,
              cell_type: 'code',
              content: 'print("Original code")',
              order_index: 0,
            }
          ],
          user: {
            id: 1,
            username: 'user1',
            avatar_url: 'https://example.com/user1.jpg',
          }
        })
      });
    });

    // Verify original unchanged
    await expect(page.getByText('Original Notebook')).toBeVisible();
    await expect(page.getByText('print("Original code")')).toBeVisible();
    await expect(page.getByText('Forked Notebook')).not.toBeVisible();
    await expect(page.getByText('print("Forked code")')).not.toBeVisible();

    // Navigate back to fork
    await page.goto('/notebooks/2/edit');

    // Verify fork has edits
    await expect(page.getByRole('textbox', { name: /title/i })).toHaveValue('Forked Notebook');
    await expect(page.getByText('print("Forked code")')).toBeVisible();
  });

  test('Fork lineage', async ({ page }) => {
    // Create original notebook
    // Mock original notebook
    await page.route('**/api/v1/notebooks/1**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          title: 'Original Notebook',
          user_id: 1,
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 10,
          comment_count: 5,
          view_count: 100,
          parent_id: null,
          root_id: null,
          user: {
            id: 1,
            username: 'user1',
            avatar_url: 'https://example.com/user1.jpg',
          }
        })
      });
    });

    // Fork notebook (fork A)
    await page.route('**/api/v1/notebooks/1/fork**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 2,
          title: 'Original Notebook',
          user_id: 2,
          is_published: false,
          parent_id: 1,
          root_id: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 0,
          comment_count: 0,
        })
      });
    });

    // Navigate to fork A
    await page.goto('/notebooks/2');

    // Mock fork A API with lineage
    await page.route('**/api/v1/notebooks/2**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 2,
          title: 'Fork A',
          user_id: 2,
          is_published: true,
          parent_id: 1,
          root_id: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 5,
          comment_count: 2,
          view_count: 50,
          user: {
            id: 2,
            username: 'user2',
            avatar_url: 'https://example.com/user2.jpg',
          },
          lineage: [
            { id: 1, title: 'Original Notebook', username: 'user1' },
            { id: 2, title: 'Fork A', username: 'user2' },
          ]
        })
      });
    });

    // Verify lineage shows: original → fork A
    await expect(page.getByText(/forked from/i)).toBeVisible();
    await expect(page.getByText(/user1/i)).toBeVisible();
    await expect(page.getByText('Original Notebook')).toBeVisible();

    // Fork fork A (fork B)
    await page.route('**/api/v1/notebooks/2/fork**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 3,
          title: 'Fork A',
          user_id: 2,
          is_published: false,
          parent_id: 2,
          root_id: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 0,
          comment_count: 0,
        })
      });
    });

    // Navigate to fork B
    await page.goto('/notebooks/3');

    // Mock fork B API with lineage
    await page.route('**/api/v1/notebooks/3**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 3,
          title: 'Fork B',
          user_id: 2,
          is_published: true,
          parent_id: 2,
          root_id: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 3,
          comment_count: 1,
          view_count: 25,
          user: {
            id: 2,
            username: 'user2',
            avatar_url: 'https://example.com/user2.jpg',
          },
          lineage: [
            { id: 1, title: 'Original Notebook', username: 'user1' },
            { id: 2, title: 'Fork A', username: 'user2' },
            { id: 3, title: 'Fork B', username: 'user2' },
          ]
        })
      });
    });

    // Verify lineage shows: original → fork A → fork B
    await expect(page.getByText(/forked from/i)).toBeVisible();
    await expect(page.getByText('Original Notebook')).toBeVisible();
    await expect(page.getByText('Fork A')).toBeVisible();
    await expect(page.getByText('Fork B')).toBeVisible();
  });

  test('Forks in feed', async ({ page }) => {
    // Mock feed API with both original and fork
    await page.route('**/api/v1/feed**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 1,
              title: 'Original Notebook',
              username: 'user1',
              avatar_url: 'https://example.com/user1.jpg',
              like_count: 10,
              comment_count: 5,
              view_count: 100,
              created_at: new Date().toISOString(),
              parent_id: null,
              root_id: null,
            },
            {
              id: 2,
              title: 'Forked Notebook',
              username: 'user2',
              avatar_url: 'https://example.com/user2.jpg',
              like_count: 5,
              comment_count: 2,
              view_count: 50,
              created_at: new Date().toISOString(),
              parent_id: 1,
              root_id: 1,
            }
          ],
          next_cursor: null,
          has_more: false,
        })
      });
    });

    // Navigate to feed
    await page.goto('/feed');

    // Verify both original and fork in feed
    await expect(page.getByText('Original Notebook')).toBeVisible();
    await expect(page.getByText('Forked Notebook')).toBeVisible();

    // Verify both have equal visibility (no prioritization)
    const originalCard = page.getByText('Original Notebook').locator('..');
    const forkCard = page.getByText('Forked Notebook').locator('..');

    // Both cards should be visible
    await expect(originalCard).toBeVisible();
    await expect(forkCard).toBeVisible();

    // No special "original" or "fork" badges that indicate priority
    await expect(page.getByText(/featured|pinned/i)).not.toBeVisible();
  });

  test('Cannot delete original with forks', async ({ page }) => {
    // Mock notebook with forks
    await page.route('**/api/v1/notebooks/1**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          title: 'Notebook with Forks',
          user_id: 2,
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 10,
          comment_count: 5,
          view_count: 100,
          fork_count: 2,
          cells: [],
        })
      });
    });

    // Navigate to original notebook
    await page.goto('/notebooks/1/edit');

    // Look for delete button
    const deleteButton = page.getByRole('button', { name: /delete/i });

    // Verify delete button disabled or not shown
    // Either the button is disabled
    await expect(deleteButton).toHaveAttribute('disabled', '');

    // Or a message is shown
    await expect(page.getByText(/cannot delete notebooks with forks/i)).toBeVisible();
  });

  test('View fork attribution', async ({ page }) => {
    // Mock forked notebook
    await page.route('**/api/v1/notebooks/2**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 2,
          title: 'Forked Notebook',
          user_id: 2,
          is_published: true,
          parent_id: 1,
          root_id: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 5,
          comment_count: 2,
          view_count: 50,
          user: {
            id: 2,
            username: 'user2',
            avatar_url: 'https://example.com/user2.jpg',
          },
          parent_notebook: {
            id: 1,
            title: 'Original Notebook',
            username: 'user1',
          }
        })
      });
    });

    // Navigate to forked notebook
    await page.goto('/notebooks/2');

    // Verify "Forked from @username" link shown
    await expect(page.getByText(/forked from/i)).toBeVisible();
    await expect(page.getByText(/@user1/i)).toBeVisible();

    // Click attribution link
    const attributionLink = page.getByRole('link', { name: /original notebook|@user1/i });
    await attributionLink.click();

    // Verify navigate to original notebook
    await page.waitForURL('**/notebooks/1');
    await expect(page.getByText('Original Notebook')).toBeVisible();
  });
});
