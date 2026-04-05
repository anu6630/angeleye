/**
 * E2E tests for social interactions flow
 *
 * Tests:
 * - Follow user
 * - Unfollow user
 * - Like notebook
 * - Unlike notebook
 * - Comment on notebook
 * - Reply to comment
 * - Followed content in feed
 * - Optimistic updates
 * - Rate limiting (follow)
 */
import { test, expect } from '@playwright/test';

test.describe('Social Interactions Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as user A before each test
    await page.goto('/login');

    await page.evaluate(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          isAuthenticated: true,
          user: {
            id: 1,
            email: 'user1@example.com',
            username: 'user1',
            is_active: true,
            is_verified: true,
            avatar_url: 'https://example.com/user1.jpg',
            created_at: new Date().toISOString(),
          }
        },
        version: 0
      }));
    });

    await page.reload();
  });

  test('Follow user', async ({ page }) => {
    // Mock user B's profile API
    await page.route('**/api/v1/users/user2**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 2,
          username: 'user2',
          avatar_url: 'https://example.com/user2.jpg',
          bio: 'User B bio',
          follower_count: 10,
          following_count: 5,
          is_following: false,
        })
      });
    });

    // Navigate to user B's profile
    await page.goto('/profile/user2');

    // Click "Follow" button
    const followButton = page.getByRole('button', { name: /follow/i });
    await expect(followButton).toBeVisible();
    await followButton.click();

    // Mock follow API
    await page.route('**/api/v1/users/2/follow**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          is_following: true,
          follower_count: 11,
        })
      });
    });

    // Verify button changes to "Following"
    await expect(page.getByRole('button', { name: /following/i })).toBeVisible();

    // Verify follower count incremented
    await expect(page.getByText(/11 followers/i)).toBeVisible();

    // Refresh page
    await page.reload();

    // Mock updated profile API
    await page.route('**/api/v1/users/user2**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 2,
          username: 'user2',
          avatar_url: 'https://example.com/user2.jpg',
          bio: 'User B bio',
          follower_count: 11,
          following_count: 5,
          is_following: true,
        })
      });
    });

    // Verify "Following" state persisted
    await expect(page.getByRole('button', { name: /following/i })).toBeVisible();
  });

  test('Unfollow user', async ({ page }) => {
    // Mock user B's profile API (already following)
    await page.route('**/api/v1/users/user2**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 2,
          username: 'user2',
          avatar_url: 'https://example.com/user2.jpg',
          bio: 'User B bio',
          follower_count: 11,
          following_count: 5,
          is_following: true,
        })
      });
    });

    // Navigate to user B's profile
    await page.goto('/profile/user2');

    // Click "Following" button
    const followingButton = page.getByRole('button', { name: /following/i });
    await expect(followingButton).toBeVisible();
    await followingButton.click();

    // Mock unfollow API
    await page.route('**/api/v1/users/2/follow**', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            is_following: false,
            follower_count: 10,
          })
        });
      }
    });

    // Verify button changes back to "Follow"
    await expect(page.getByRole('button', { name: /follow/i })).toBeVisible();

    // Verify follower count decremented
    await expect(page.getByText(/10 followers/i)).toBeVisible();
  });

  test('Like notebook', async ({ page }) => {
    // Mock notebook API
    await page.route('**/api/v1/notebooks/1**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          title: 'Test Notebook',
          user_id: 2,
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 5,
          comment_count: 2,
          view_count: 50,
          is_liked: false,
          user: {
            id: 2,
            username: 'user2',
            avatar_url: 'https://example.com/user2.jpg',
          }
        })
      });
    });

    // Navigate to notebook
    await page.goto('/notebooks/1');

    // Find like button (outline heart)
    const likeButton = page.getByRole('button', { name: /like/i }).first();
    await expect(likeButton).toBeVisible();

    // Click like button
    await likeButton.click();

    // Mock like API
    await page.route('**/api/v1/notebooks/1/like**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          is_liked: true,
          like_count: 6,
        })
      });
    });

    // Verify button changes to filled heart
    await expect(likeButton).toHaveAttribute('data-liked', 'true');

    // Verify like count incremented
    await expect(page.getByText(/6 likes/i)).toBeVisible();

    // Refresh page
    await page.reload();

    // Mock updated notebook API
    await page.route('**/api/v1/notebooks/1**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          title: 'Test Notebook',
          user_id: 2,
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 6,
          comment_count: 2,
          view_count: 50,
          is_liked: true,
          user: {
            id: 2,
            username: 'user2',
            avatar_url: 'https://example.com/user2.jpg',
          }
        })
      });
    });

    // Verify like state persisted
    await expect(likeButton).toHaveAttribute('data-liked', 'true');
  });

  test('Unlike notebook', async ({ page }) => {
    // Mock notebook API (already liked)
    await page.route('**/api/v1/notebooks/1**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          title: 'Test Notebook',
          user_id: 2,
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 6,
          comment_count: 2,
          view_count: 50,
          is_liked: true,
          user: {
            id: 2,
            username: 'user2',
            avatar_url: 'https://example.com/user2.jpg',
          }
        })
      });
    });

    // Navigate to notebook
    await page.goto('/notebooks/1');

    // Find like button (filled heart)
    const likeButton = page.getByRole('button', { name: /like/i }).first();
    await expect(likeButton).toHaveAttribute('data-liked', 'true');

    // Click like button (unlike)
    await likeButton.click();

    // Mock unlike API
    await page.route('**/api/v1/notebooks/1/like**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          is_liked: false,
          like_count: 5,
        })
      });
    });

    // Verify button changes to outline heart
    await expect(likeButton).not.toHaveAttribute('data-liked', 'true');

    // Verify like count decremented
    await expect(page.getByText(/5 likes/i)).toBeVisible();
  });

  test('Comment on notebook', async ({ page }) => {
    // Mock notebook API
    await page.route('**/api/v1/notebooks/1**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          title: 'Test Notebook',
          user_id: 2,
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 5,
          comment_count: 0,
          view_count: 50,
          user: {
            id: 2,
            username: 'user2',
            avatar_url: 'https://example.com/user2.jpg',
          },
          comments: []
        })
      });
    });

    // Navigate to notebook
    await page.goto('/notebooks/1');

    // Scroll to comments section
    const commentsSection = page.locator('[data-testid="comments-section"], .comments-section');
    await commentsSection.scrollIntoViewIfNeeded();

    // Type comment in textarea
    const commentTextarea = page.getByRole('textbox', { name: /add a comment|write a comment/i });
    await expect(commentTextarea).toBeVisible();
    await commentTextarea.fill('Great notebook!');

    // Click "Post" button
    const postButton = page.getByRole('button', { name: /post|send/i });
    await postButton.click();

    // Mock comment API
    await page.route('**/api/v1/notebooks/1/comments**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          notebook_id: 1,
          user_id: 1,
          content: 'Great notebook!',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          username: 'user1',
          avatar_url: 'https://example.com/user1.jpg',
        })
      });
    });

    // Verify comment displayed
    await expect(page.getByText('Great notebook!')).toBeVisible();

    // Verify comment count incremented
    await expect(page.getByText(/1 comment/i)).toBeVisible();

    // Verify username shown on comment
    await expect(page.getByText(/user1/i)).toBeVisible();

    // Verify timestamp shown (relative time like "just now")
    await expect(page.getByText(/just now/i)).toBeVisible();
  });

  test('Reply to comment', async ({ page }) => {
    // Mock notebook API with existing comments
    await page.route('**/api/v1/notebooks/1**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          title: 'Test Notebook',
          user_id: 2,
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 5,
          comment_count: 1,
          view_count: 50,
          user: {
            id: 2,
            username: 'user2',
            avatar_url: 'https://example.com/user2.jpg',
          },
          comments: [
            {
              id: 1,
              notebook_id: 1,
              user_id: 3,
              parent_id: null,
              content: 'Original comment',
              created_at: new Date(Date.now() - 3600000).toISOString(),
              updated_at: new Date(Date.now() - 3600000).toISOString(),
              username: 'user3',
              avatar_url: 'https://example.com/user3.jpg',
              replies: []
            }
          ]
        })
      });
    });

    // Navigate to notebook with comments
    await page.goto('/notebooks/1');

    // Click "Reply" on a comment
    const replyButton = page.getByRole('button', { name: /reply/i }).first();
    await expect(replyButton).toBeVisible();
    await replyButton.click();

    // Verify reply form shown
    const replyTextarea = page.locator('.reply-form textarea').first();
    await expect(replyTextarea).toBeVisible();

    // Type reply
    await replyTextarea.fill('Thanks for sharing!');

    // Click "Post" button
    const postButton = page.locator('.reply-form button').first();
    await postButton.click();

    // Mock reply API
    await page.route('**/api/v1/notebooks/1/comments**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 2,
          notebook_id: 1,
          user_id: 1,
          parent_id: 1,
          content: 'Thanks for sharing!',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          username: 'user1',
          avatar_url: 'https://example.com/user1.jpg',
        })
      });
    });

    // Verify reply shown nested under parent
    const replyContainer = page.locator('.comment-replies, .replies').first();
    await expect(replyContainer).toContainText('Thanks for sharing!');

    // Verify indentation correct (threaded)
    const replyElement = page.locator('.comment-item[data-parent-id="1"]').first();
    await expect(replyElement).toBeVisible();
    await expect(replyElement).toHaveCSS('margin-left', /\d+px/);
  });

  test('Followed content in feed', async ({ page }) => {
    // Mock follow API
    await page.route('**/api/v1/users/2/follow**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          is_following: true,
        })
      });
    });

    // Follow user B
    await page.goto('/profile/user2');
    await page.getByRole('button', { name: /follow/i }).click();

    // Mock feed API with user B's notebook
    await page.route('**/api/v1/feed**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 1,
              title: 'User B Notebook',
              username: 'user2',
              avatar_url: 'https://example.com/user2.jpg',
              like_count: 5,
              comment_count: 2,
              view_count: 50,
              created_at: new Date().toISOString(),
            }
          ],
          next_cursor: null,
          has_more: false,
        })
      });
    });

    // Navigate to feed
    await page.goto('/feed');

    // Verify user B's notebook in feed
    await expect(page.getByText('User B Notebook')).toBeVisible();

    // Verify "Following" indicator shown
    await expect(page.getByText(/following/i)).toBeVisible();

    // Verify notebook prioritized in feed (shown first)
    const firstNotebook = page.locator('[data-testid="feed-card"]').first();
    await expect(firstNotebook).toContainText('User B Notebook');
  });

  test('Optimistic updates', async ({ page }) => {
    // Mock notebook API
    await page.route('**/api/v1/notebooks/1**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          title: 'Test Notebook',
          user_id: 2,
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 5,
          comment_count: 2,
          view_count: 50,
          is_liked: false,
          user: {
            id: 2,
            username: 'user2',
            avatar_url: 'https://example.com/user2.jpg',
          }
        })
      });
    });

    // Navigate to notebook
    await page.goto('/notebooks/1');

    // Find like button
    const likeButton = page.getByRole('button', { name: /like/i }).first();

    // Click like button
    await likeButton.click();

    // Verify icon changes immediately (before API response)
    // This tests optimistic updates
    await expect(likeButton).toHaveAttribute('data-liked', 'true');

    // Delay API response
    await page.waitForTimeout(100);

    // Mock like API
    await page.route('**/api/v1/notebooks/1/like**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          is_liked: true,
          like_count: 6,
        })
      });
    });

    // Click unlike
    await likeButton.click();

    // Verify icon changes immediately
    await expect(likeButton).not.toHaveAttribute('data-liked', 'true');
  });

  test('Rate limiting (follow)', async ({ page }) => {
    // Mock follow API with rate limit
    let followCount = 0;
    await page.route('**/api/v1/users/*/follow**', (route) => {
      followCount++;
      if (followCount > 100) {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Rate limit exceeded',
          })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            is_following: true,
          })
        });
      }
    });

    // Navigate to different profiles and follow
    for (let i = 1; i <= 101; i++) {
      await page.goto(`/profile/user${i}`);
      const followButton = page.getByRole('button', { name: /follow/i });

      if (i <= 100) {
        await followButton.click();
        // Should succeed
        await expect(page.getByRole('button', { name: /following/i })).toBeVisible();
      } else {
        // 101st follow should hit rate limit
        await followButton.click();
        // Verify rate limit error
        await expect(page.getByText(/rate limit|too many follows/i)).toBeVisible();
        break;
      }
    }
  });
});
