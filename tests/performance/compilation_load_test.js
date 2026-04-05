import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom metrics for compilation testing
const compilationSubmitTime = new Trend('compilation_submit_time', true);
const compilationPollingTime = new Trend('compilation_polling_time', true);
const compilationTotalTime = new Trend('compilation_total_time', true);
const compilationSuccessRate = new Rate('compilation_success_rate');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 5 },    // Ramp up to 5 VUs (compilation is resource-intensive)
    { duration: '2m', target: 10 },    // Ramp up to 10 VUs
    { duration: '3m', target: 10 },    // Sustained load at 10 VUs
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // Compilation p95 < 5000ms (5s)
    http_req_failed: ['rate<0.05'],    // Error rate < 5% (compilation can fail)
    compilationTotalTime: ['p(95)<5000'],
    compilationSuccessRate: ['rate>0.95'], // 95% success rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

// Setup function: Create test user and notebook
export function setup() {
  console.log(`Setting up compilation tests against ${BASE_URL}`);

  // Create test user
  const createUserRes = http.post(
    `${BASE_URL}/api/v1/auth/test-login`,
    JSON.stringify({
      email: `compilation-test-${Date.now()}@example.com`,
      name: 'Compilation Test User',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (createUserRes.status !== 200) {
    console.error('Failed to create test user:', createUserRes.body);
    return null;
  }

  const userData = JSON.parse(createUserRes.body);
  const token = userData.access_token;

  // Create test notebook
  const createNotebookRes = http.post(
    `${BASE_URL}/api/v1/notebooks`,
    JSON.stringify({
      title: 'Performance Test Notebook',
      description: 'Notebook for compilation performance testing',
      cells: [
        {
          id: 'cell1',
          cell_type: 'code',
          source: 'print("Hello, World!")\nimport numpy as np\nx = np.array([1, 2, 3])\nprint(x * 2)',
        },
        {
          id: 'cell2',
          cell_type: 'code',
          source: 'import matplotlib.pyplot as plt\nplt.plot([1, 2, 3], [1, 4, 9])\nprint("Plot created")',
        },
      ],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (createNotebookRes.status !== 201) {
    console.error('Failed to create test notebook:', createNotebookRes.body);
    return null;
  }

  const notebookData = JSON.parse(createNotebookRes.body);
  console.log('Created test notebook:', notebookData.id);

  return {
    token: token,
    userId: userData.id,
    notebookId: notebookData.id,
  };
}

// Main VU logic
export default function(data) {
  if (!data || !data.token || !data.notebookId) {
    console.error('Missing test data');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // Test 1: Submit compilation request
  const submitStart = Date.now();
  const submitRes = http.post(
    `${BASE_URL}/api/v1/notebooks/${data.notebookId}/compile`,
    null,
    { headers }
  );
  const submitDuration = Date.now() - submitStart;
  compilationSubmitTime.add(submitDuration);

  check(submitRes, {
    'compilation submit status is 202': (r) => r.status === 202,
    'compilation submit has job_id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.job_id !== undefined;
      } catch {
        return false;
      }
    },
    'compilation submit time < 1000ms': (r) => r.timings.duration < 1000,
  });

  if (submitRes.status !== 202) {
    console.error('Failed to submit compilation:', submitRes.body);
    sleep(5);
    return;
  }

  let jobData;
  try {
    jobData = JSON.parse(submitRes.body);
  } catch (e) {
    console.error('Failed to parse submit response:', e);
    sleep(5);
    return;
  }

  // Test 2: Poll compilation status until complete
  const pollStart = Date.now();
  let maxPolls = 30; // Maximum 30 polls (30 seconds)
  let polls = 0;
  let finalStatus = null;

  while (polls < maxPolls) {
    const pollRes = http.get(
      `${BASE_URL}/api/v1/notebooks/${data.notebookId}/compilation-status?job_id=${jobData.job_id}`,
      { headers }
    );

    if (pollRes.status === 200) {
      try {
        const statusData = JSON.parse(pollRes.body);
        finalStatus = statusData.status;

        if (statusData.status === 'success' || statusData.status === 'failed') {
          break;
        }
      } catch (e) {
        console.error('Failed to parse status response:', e);
      }
    }

    polls++;
    sleep(1); // Wait 1 second between polls
  }

  const pollDuration = Date.now() - pollStart;
  compilationPollingTime.add(pollDuration);

  const totalDuration = submitDuration + pollDuration;
  compilationTotalTime.add(totalDuration);

  // Test 3: Verify compilation completed successfully
  const success = finalStatus === 'success';
  compilationSuccessRate.add(success);

  check(finalStatus, {
    'compilation completed': (s) => s === 'success' || s === 'failed',
    'compilation succeeded': (s) => s === 'success',
    'compilation total time < 5000ms': () => totalDuration < 5000,
  });

  // Test 4: Check compilation outputs exist
  if (success) {
    const outputsRes = http.get(
      `${BASE_URL}/api/v1/notebooks/${data.notebookId}`,
      { headers }
    );

    check(outputsRes, {
      'notebook has outputs': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.compilation_outputs !== undefined;
        } catch {
          return false;
        }
      },
    });
  }

  // Test 5: Test concurrent compilations (same notebook)
  // This should be handled by rate limiting
  sleep(2);

  const concurrentSubmit = http.post(
    `${BASE_URL}/api/v1/notebooks/${data.notebookId}/compile`,
    null,
    { headers }
  );

  check(concurrentSubmit, {
    'concurrent compilation handled': (r) =>
      r.status === 202 || r.status === 429, // 202 = accepted, 429 = rate limited
  });

  // Think time between compilations
  sleep(Math.random() * 3 + 2); // Random sleep between 2-5 seconds
}

// Teardown function: Clean up test user and notebook
export function teardown(data) {
  if (data && data.userId && data.token) {
    console.log(`Cleaning up test user: ${data.userId}`);

    const deleteRes = http.request(
      'DELETE',
      `${BASE_URL}/api/v1/users/${data.userId}`,
      null,
      { headers: { 'Authorization': `Bearer ${data.token}` } }
    );

    if (deleteRes.status !== 204) {
      console.warn('Failed to delete test user:', deleteRes.status);
    }
  }
}

// Test edge cases
export function handleTestFailure(data, error) {
  console.error('Test failed:', error);

  // Try to clean up even on failure
  if (data && data.userId && data.token) {
    http.request(
      'DELETE',
      `${BASE_URL}/api/v1/users/${data.userId}`,
      null,
      { headers: { 'Authorization': `Bearer ${data.token}` } }
    );
  }
}
