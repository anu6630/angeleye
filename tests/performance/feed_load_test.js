import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for feed endpoint testing
const feedResponseTime = new Trend('feed_response_time', true);
const trendingResponseTime = new Trend('trending_response_time', true);
const personalizedFeedResponseTime = new Trend('personalized_feed_response_time', true);
const cacheHitRate = new Rate('cache_hit_rate');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 VUs
    { duration: '1m', target: 100 },    // Ramp up to 100 VUs
    { duration: '2m', target: 100 },    // Sustained load at 100 VUs
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // API p95 < 500ms
    http_req_failed: ['rate<0.01'],                   // Error rate < 1%
    feed_response_time: ['p(95)<500'],
    trendingResponseTime: ['p(95)<500'],
    personalized_feed_response_time: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
let authToken = null;
let testUserId = null;

// Setup function: Create test user and get auth token
export function setup() {
  console.log(`Setting up tests against ${BASE_URL}`);

  // Create test user
  const createUserResponse = http.post(
    `${BASE_URL}/api/v1/auth/test-login`,
    JSON.stringify({
      email: `test-user-${Date.now()}@example.com`,
      name: 'Performance Test User',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (createUserResponse.status !== 200) {
    console.error('Failed to create test user:', createUserResponse.body);
    return null;
  }

  const userData = JSON.parse(createUserResponse.body);
  console.log('Created test user:', userData.id);

  return {
    token: userData.access_token,
    userId: userData.id,
  };
}

// Main VU logic
export default function(data) {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Add auth token if available
  if (data && data.token) {
    headers['Authorization'] = `Bearer ${data.token}`;
  }

  // Test 1: Public feed (unauthenticated)
  const publicFeedStart = Date.now();
  const publicFeedRes = http.get(`${BASE_URL}/api/v1/feed`, { headers: { 'Content-Type': 'application/json' } });
  feedResponseTime.add(Date.now() - publicFeedStart);

  check(publicFeedRes, {
    'public feed status is 200': (r) => r.status === 200,
    'public feed has notebooks': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.notebooks) || Array.isArray(body);
      } catch {
        return false;
      }
    },
    'public feed response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test 2: Trending endpoint
  if (data && data.token) {
    const trendingStart = Date.now();
    const trendingRes = http.get(`${BASE_URL}/api/v1/feed/trending`, {
      headers,
    });
    trendingResponseTime.add(Date.now() - trendingStart);

    check(trendingRes, {
      'trending status is 200': (r) => r.status === 200,
      'trending has results': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.notebooks) || Array.isArray(body);
        } catch {
          return false;
        }
      },
      'trending response time < 500ms': (r) => r.timings.duration < 500,
    });

    // Check cache headers
    if (trendingRes.headers['X-Cache']) {
      cacheHitRate.add(trendingRes.headers['X-Cache'] === 'HIT');
    }
  }

  sleep(1);

  // Test 3: Personalized feed (authenticated only)
  if (data && data.token) {
    const personalizedStart = Date.now();
    const personalizedRes = http.get(`${BASE_URL}/api/v1/feed?personalized=true`, {
      headers,
    });
    personalizedFeedResponseTime.add(Date.now() - personalizedStart);

    check(personalizedRes, {
      'personalized feed status is 200': (r) => r.status === 200,
      'personalized feed has notebooks': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.notebooks) || Array.isArray(body);
        } catch {
          return false;
        }
      },
      'personalized feed response time < 500ms': (r) => r.timings.duration < 500,
    });
  }

  // Test 4: Feed pagination (cursor-based)
  if (data && data.token) {
    const firstPageRes = http.get(`${BASE_URL}/api/v1/feed?limit=10`, { headers });

    if (firstPageRes.status === 200) {
      try {
        const firstPage = JSON.parse(firstPageRes.body);
        const notebooks = Array.isArray(firstPage.notebooks) ? firstPage.notebooks : firstPage;

        if (notebooks.length > 0 && firstPage.next_cursor) {
          const secondPageStart = Date.now();
          const secondPageRes = http.get(
            `${BASE_URL}/api/v1/feed?cursor=${firstPage.next_cursor}&limit=10`,
            { headers }
          );

          check(secondPageRes, {
            'paginated feed status is 200': (r) => r.status === 200,
            'paginated feed response time < 500ms': (r) => r.timings.duration < 500,
          });

          feedResponseTime.add(Date.now() - secondPageStart);
        }
      } catch (e) {
        console.error('Error parsing pagination response:', e);
      }
    }
  }

  // Think time between requests (simulates real user behavior)
  sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}

// Teardown function: Clean up test user
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
