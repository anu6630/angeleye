import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom metrics for search testing
const searchResponseTime = new Trend('search_response_time', true);
const searchByTitleTime = new Trend('search_by_title_time', true);
const searchByTagsTime = new Trend('search_by_tags_time', true);
const searchByForkTypeTime = new Trend('search_by_fork_type_time', true);
const searchEmptyResultsRate = new Rate('search_empty_results_rate');

// Test configuration
export const options = {
  stages: [
    { duration: '20s', target: 10 },   // Ramp up to 10 VUs
    { duration: '1m', target: 50 },     // Ramp up to 50 VUs
    { duration: '2m', target: 50 },     // Sustained load at 50 VUs
    { duration: '20s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<500'], // Search p95 < 300ms
    http_req_failed: ['rate<0.01'],                // Error rate < 1%
    searchResponseTime: ['p(95)<300'],
    searchByTitleTime: ['p(95)<300'],
    searchByTagsTime: ['p(95)<300'],
    searchByForkTypeTime: ['p(95)<300'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

// Sample search queries for testing
const searchQueries = [
  { q: 'data', type: 'title' },
  { q: 'python', type: 'title' },
  { q: 'machine learning', type: 'title' },
  { q: 'analysis', type: 'title' },
  { q: 'visualization', type: 'title' },
];

const tagQueries = [
  { tags: ['data-science'] },
  { tags: ['machine-learning'] },
  { tags: ['visualization'] },
  { tags: ['python'] },
  { tags: ['tutorial'] },
];

const forkTypes = ['original', 'fork', 'remix'];

// Setup function: Create test user and notebooks
export function setup() {
  console.log(`Setting up search tests against ${BASE_URL}`);

  // Create test user
  const createUserRes = http.post(
    `${BASE_URL}/api/v1/auth/test-login`,
    JSON.stringify({
      email: `search-test-${Date.now()}@example.com`,
      name: 'Search Test User',
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

  // Create test notebooks with searchable content
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const testNotebooks = [
    {
      title: 'Data Analysis with Python',
      description: 'Learn data analysis using Python pandas',
      tags: ['data-science', 'python', 'tutorial'],
    },
    {
      title: 'Machine Learning Basics',
      description: 'Introduction to machine learning algorithms',
      tags: ['machine-learning', 'python', 'tutorial'],
    },
    {
      title: 'Data Visualization Guide',
      description: 'Create beautiful visualizations with matplotlib',
      tags: ['visualization', 'data-science', 'python'],
    },
    {
      title: 'Python for Data Science',
      description: 'Complete Python data science workflow',
      tags: ['data-science', 'python', 'tutorial'],
    },
    {
      title: 'Advanced Machine Learning',
      description: 'Deep learning and neural networks',
      tags: ['machine-learning', 'advanced', 'python'],
    },
  ];

  const notebookIds = [];

  for (const notebook of testNotebooks) {
    const createRes = http.post(
      `${BASE_URL}/api/v1/notebooks`,
      JSON.stringify({
        title: notebook.title,
        description: notebook.description,
        tags: notebook.tags,
        cells: [
          {
            id: 'cell1',
            cell_type: 'code',
            source: 'print("Test notebook")',
          },
        ],
      }),
      { headers }
    );

    if (createRes.status === 201) {
      const notebookData = JSON.parse(createRes.body);
      notebookIds.push(notebookData.id);
      console.log('Created notebook:', notebookData.id);
    }

    sleep(0.5); // Small delay between creations
  }

  // Wait for notebooks to be indexed
  console.log('Waiting for notebooks to be indexed...');
  sleep(5);

  return {
    token: token,
    userId: userData.id,
    notebookIds: notebookIds,
  };
}

// Main VU logic
export default function(data) {
  if (!data || !data.token) {
    console.error('Missing test data');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // Test 1: Search by title
  const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  const titleSearchStart = Date.now();
  const titleSearchRes = http.get(
    `${BASE_URL}/api/v1/search?q=${encodeURIComponent(randomQuery.q)}`,
    { headers }
  );
  const titleSearchDuration = Date.now() - titleSearchStart;
  searchByTitleTime.add(titleSearchDuration);
  searchResponseTime.add(titleSearchDuration);

  const hasResults = check(titleSearchRes, {
    'search by title status is 200': (r) => r.status === 200,
    'search by title has results array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.results) || Array.isArray(body);
      } catch {
        return false;
      }
    },
    'search by title response time < 300ms': (r) => r.timings.duration < 300,
  });

  searchEmptyResultsRate.add(!hasResults || titleSearchRes.status !== 200);
  sleep(1);

  // Test 2: Search by tags
  const randomTags = tagQueries[Math.floor(Math.random() * tagQueries.length)];
  const tagsSearchStart = Date.now();
  const tagsSearchRes = http.get(
    `${BASE_URL}/api/v1/search?tags=${encodeURIComponent(randomTags.tags.join(','))}`,
    { headers }
  );
  const tagsSearchDuration = Date.now() - tagsSearchStart;
  searchByTagsTime.add(tagsSearchDuration);
  searchResponseTime.add(tagsSearchDuration);

  check(tagsSearchRes, {
    'search by tags status is 200': (r) => r.status === 200,
    'search by tags has results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.results) || Array.isArray(body);
      } catch {
        return false;
      }
    },
    'search by tags response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);

  // Test 3: Search by fork_type
  const randomForkType = forkTypes[Math.floor(Math.random() * forkTypes.length)];
  const forkTypeSearchStart = Date.now();
  const forkTypeSearchRes = http.get(
    `${BASE_URL}/api/v1/search?fork_type=${randomForkType}`,
    { headers }
  );
  const forkTypeSearchDuration = Date.now() - forkTypeSearchStart;
  searchByForkTypeTime.add(forkTypeSearchDuration);
  searchResponseTime.add(forkTypeSearchDuration);

  check(forkTypeSearchRes, {
    'search by fork_type status is 200': (r) => r.status === 200,
    'search by fork_type has results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.results) || Array.isArray(body);
      } catch {
        return false;
      }
    },
    'search by fork_type response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);

  // Test 4: Combined search (query + tags + fork_type)
  const combinedSearchStart = Date.now();
  const combinedSearchRes = http.get(
    `${BASE_URL}/api/v1/search?q=${encodeURIComponent(randomQuery.q)}&tags=${encodeURIComponent(randomTags.tags.join(','))}&fork_type=${randomForkType}`,
    { headers }
  );
  searchResponseTime.add(Date.now() - combinedSearchStart);

  check(combinedSearchRes, {
    'combined search status is 200': (r) => r.status === 200,
    'combined search response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);

  // Test 5: Empty search (all notebooks)
  const emptySearchStart = Date.now();
  const emptySearchRes = http.get(
    `${BASE_URL}/api/v1/search`,
    { headers }
  );
  searchResponseTime.add(Date.now() - emptySearchStart);

  check(emptySearchRes, {
    'empty search status is 200': (r) => r.status === 200,
    'empty search has results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.results) || Array.isArray(body);
      } catch {
        return false;
      }
    },
    'empty search response time < 300ms': (r) => r.timings.duration < 300,
  });

  // Test 6: Search with pagination
  if (titleSearchRes.status === 200) {
    try {
      const firstPage = JSON.parse(titleSearchRes.body);
      const results = Array.isArray(firstPage.results) ? firstPage.results : firstPage;

      if (results.length > 0) {
        const paginatedSearchStart = Date.now();
        const paginatedSearchRes = http.get(
          `${BASE_URL}/api/v1/search?q=${encodeURIComponent(randomQuery.q)}&page=2&limit=10`,
          { headers }
        );
        searchResponseTime.add(Date.now() - paginatedSearchStart);

        check(paginatedSearchRes, {
          'paginated search status is 200': (r) => r.status === 200,
          'paginated search response time < 300ms': (r) => r.timings.duration < 300,
        });
      }
    } catch (e) {
      console.error('Error parsing search response:', e);
    }
  }

  // Test 7: Search with special characters
  const specialCharSearchStart = Date.now();
  const specialCharSearchRes = http.get(
    `${BASE_URL}/api/v1/search?q=%23python%20%40data`, // URL-encoded #python @data
    { headers }
  );
  searchResponseTime.add(Date.now() - specialCharSearchStart);

  check(specialCharSearchRes, {
    'special char search status is 200': (r) => r.status === 200,
    'special char search response time < 300ms': (r) => r.timings.duration < 300,
  });

  // Think time between searches (simulates real user behavior)
  sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}

// Teardown function: Clean up test user and notebooks
export function teardown(data) {
  if (data && data.userId && data.token) {
    console.log(`Cleaning up test user: ${data.userId}`);

    // Delete test notebooks
    for (const notebookId of data.notebookIds) {
      const deleteRes = http.request(
        'DELETE',
        `${BASE_URL}/api/v1/notebooks/${notebookId}`,
        null,
        { headers: { 'Authorization': `Bearer ${data.token}` } }
      );

      if (deleteRes.status !== 204) {
        console.warn('Failed to delete notebook:', notebookId);
      }
    }

    // Delete test user
    const deleteUserRes = http.request(
      'DELETE',
      `${BASE_URL}/api/v1/users/${data.userId}`,
      null,
      { headers: { 'Authorization': `Bearer ${data.token}` } }
    );

    if (deleteUserRes.status !== 204) {
      console.warn('Failed to delete test user:', deleteUserRes.status);
    }
  }
}
