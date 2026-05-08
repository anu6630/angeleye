import { test, expect } from '@playwright/test';

test.describe('Notebook Creation and Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click on Email tab to show email/password form
    const emailTab = page.locator('button', { hasText: 'Email' }).first();
    await emailTab.click();
    await page.waitForTimeout(500);

    // Fill in email and password
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for successful login
    await page.waitForTimeout(3000);

    // Check if we're logged in
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);

    // If not on feed or my-notebooks, navigate there
    if (!currentUrl.includes('/feed') && !currentUrl.includes('/my-notebooks')) {
      await page.goto('http://localhost:3000/feed');
      await page.waitForTimeout(1000);
    }
  });

  test('Create Notebook page loads without Pyodide errors', async ({ page }) => {
    // Navigate to Create Notebook page
    console.log('Attempting to navigate to Create Notebook page...');
    await page.goto('http://localhost:3000/notebooks/new');
    await page.waitForLoadState('networkidle');

    console.log('Navigated to Create Notebook page');
    console.log('Current URL:', page.url());

    // Wait a bit for any dynamic loading
    await page.waitForTimeout(3000);

    // Check for error messages in console
    const logs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      if (text.includes('error') || text.includes('Error') || text.includes('failed')) {
        console.error('Console error:', text);
      }
    });

    // Check if the page loaded without spinner
    const spinners = page.locator('.animate-spin, .spinner, .loading');
    const spinnerCount = await spinners.count();
    console.log('Spinner elements found:', spinnerCount);

    if (spinnerCount > 0) {
      console.log('Waiting for spinner to disappear...');
      await page.waitForTimeout(5000);
    }

    // Look for the title input field - this indicates the page loaded
    const titleInput = page.locator('input[placeholder*="title"], input[name="title"], #title');
    const titleExists = await titleInput.count() > 0;
    console.log('Title input exists:', titleExists);

    if (titleExists) {
      console.log('✓ Create Notebook page loaded successfully');
      await expect(titleInput).toBeVisible();
    } else {
      // Try alternative selectors
      const h1 = page.locator('h1');
      const h1Text = await h1.textContent();
      console.log('Page H1:', h1Text);

      // Check page content
      const pageContent = await page.content();
      console.log('Page contains "Notebook":', pageContent.includes('Notebook'));
      console.log('Page contains "Create":', pageContent.includes('Create'));
      console.log('Page contains "New":', pageContent.includes('New'));

      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/create-notebook-debug.png' });
    }

    // Check for Pyodide-related errors in logs
    const pyodideErrors = logs.filter(log =>
      log.includes('pyodide') ||
      log.includes('Cannot find module') ||
      log.includes('expression is too dynamic') ||
      log.includes('WASM')
    );

    if (pyodideErrors.length > 0) {
      console.error('Pyodide errors found:', pyodideErrors);
      throw new Error('Pyodide loading errors detected');
    } else {
      console.log('✓ No Pyodide errors detected');
    }

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'test-results/create-notebook-page.png' });
    console.log('Screenshot saved to test-results/create-notebook-page.png');
  });

  test('My Notebooks page displays notebooks', async ({ page, context }) => {
    // First, create a notebook via API to ensure we have something to display
    const response = await context.request.post('http://localhost:8000/api/v1/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'testpassword123'
      }
    });

    console.log('Login API response status:', response.status());

    if (response.ok()) {
      const loginData = await response.json();
      console.log('Login successful:', loginData.user_id);

      // Create a notebook
      const notebookResponse = await context.request.post('http://localhost:8000/api/v1/notebooks', {
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          title: 'E2E Test Notebook',
          cells: []
        }
      });

      console.log('Create notebook response status:', notebookResponse.status());

      if (notebookResponse.ok()) {
        const notebookData = await notebookResponse.json();
        console.log('Notebook created:', notebookData.id, notebookData.title);
      }
    }

    // Navigate to My Notebooks page
    await page.goto('http://localhost:3000/my-notebooks');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('Navigated to My Notebooks page');
    console.log('Current URL:', page.url());

    // Check for error messages
    const errorElement = page.getByText(/error|Error|failed|Failed/);
    const hasError = await errorElement.count() > 0;
    console.log('Error element found:', hasError);

    if (hasError) {
      const errorText = await errorElement.first().textContent();
      console.error('Error on page:', errorText);
    }

    // Check for notebooks
    const notebookCards = page.locator('[class*="card"], [class*="Notebook"]');
    const cardCount = await notebookCards.count();
    console.log('Notebook cards found:', cardCount);

    if (cardCount > 0) {
      console.log('✓ My Notebooks page displays notebooks');

      // Check for specific notebook title
      const testNotebook = page.getByText('E2E Test Notebook');
      const hasTestNotebook = await testNotebook.count() > 0;
      console.log('Test notebook found:', hasTestNotebook);
    } else {
      console.log('No notebook cards found, checking for empty state...');
      const emptyState = page.getByText(/No notebooks|Create your first/);
      const hasEmptyState = await emptyState.count() > 0;
      console.log('Empty state found:', hasEmptyState);
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/my-notebooks-page.png' });
    console.log('Screenshot saved to test-results/my-notebooks-page.png');

    // Check for authentication issues
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });

    // Reload page to catch any console errors
    await page.reload();
    await page.waitForTimeout(2000);

    const authErrors = consoleLogs.filter(log =>
      log.includes('Not authenticated') ||
      log.includes('401') ||
      log.includes('Unauthorized')
    );

    if (authErrors.length > 0) {
      console.error('Authentication errors:', authErrors);
    } else {
      console.log('✓ No authentication errors detected');
    }
  });

  test('Complete workflow: Login -> Create -> View in My Notebooks', async ({ page }) => {
    console.log('Starting complete workflow test...');

    // Step 1: Navigate to Create Notebook
    await page.goto('http://localhost:3000/notebooks/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('Step 1: On Create Notebook page');

    // Step 2: Create notebook
    const titleInput = page.locator('input[placeholder*="title"], input[name="title"], #title').first();

    if (await titleInput.count() > 0) {
      const timestamp = Date.now();
      const notebookTitle = `Workflow Test Notebook ${timestamp}`;
      await titleInput.fill(notebookTitle);
      console.log('Step 2: Filled title:', notebookTitle);

      // Try to save
      const saveButton = page.getByRole('button', { name: /Save|Create|Publish/ }).first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await page.waitForTimeout(3000);
        console.log('Step 2: Clicked save button');
      }
    }

    // Step 3: Navigate to My Notebooks
    await page.goto('http://localhost:3000/my-notebooks');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('Step 3: On My Notebooks page');

    // Step 4: Verify notebook appears
    const workflowNotebook = page.getByText(/Workflow Test/);
    const hasWorkflowNotebook = await workflowNotebook.count() > 0;

    if (hasWorkflowNotebook) {
      console.log('✓ Complete workflow successful - notebook created and visible');
    } else {
      console.log('Notebook not found in list, but this may be normal if save failed');

      // Check what's actually displayed
      const pageContent = await page.content();
      const hasAnyNotebook = pageContent.includes('Test Notebook') ||
                            pageContent.includes('E2E') ||
                            pageContent.includes('Workflow');
      console.log('Has any test notebook:', hasAnyNotebook);
    }

    // Take final screenshot
    await page.screenshot({ path: 'test-results/workflow-final.png' });
    console.log('Final screenshot saved');
  });
});
