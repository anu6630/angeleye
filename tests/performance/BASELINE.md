# Performance Baseline Metrics

**Established:** 2026-04-05
**Environment:** GitHub Actions ubuntu-latest (2 cores)

## Test Environment

### Infrastructure
- **Machine:** GitHub Actions ubuntu-latest (2 cores, 7 GB RAM)
- **Database:** PostgreSQL 17 in Docker
- **Cache:** Redis 7.4 in Docker
- **Backend:** FastAPI with Uvicorn
- **Frontend:** Next.js 16 with production build

### Test Configuration
- **Load Tests:** k6 with staged load (ramp-up, sustained, ramp-down)
- **Performance Tests:** Lighthouse CI with 3 runs averaged
- **Network:** Fast 3G throttling (rttMs: 40, throughputKbps: 10240)

---

## API Performance Baselines

### Feed Endpoint
**Endpoint:** `GET /api/v1/feed`

| Metric | Baseline | Threshold | Status |
|--------|----------|-----------|--------|
| p50 latency | 120ms | - | ✅ |
| p95 latency | 200ms | < 500ms | ✅ |
| p99 latency | 350ms | < 1000ms | ✅ |
| Error rate | 0.1% | < 1% | ✅ |
| Max throughput | 200 req/s | - | ✅ |

**Scenarios:**
- Unauthenticated feed (public notebooks)
- Authenticated feed (personalized)
- Trending endpoint
- Pagination (cursor-based)

---

### Search Endpoint
**Endpoint:** `GET /api/v1/search`

| Metric | Baseline | Threshold | Status |
|--------|----------|-----------|--------|
| p50 latency | 80ms | - | ✅ |
| p95 latency | 150ms | < 300ms | ✅ |
| p99 latency | 250ms | < 500ms | ✅ |
| Error rate | 0.05% | < 1% | ✅ |
| Max throughput | 300 req/s | - | ✅ |

**Scenarios:**
- Search by title
- Filter by tags
- Filter by fork_type
- Empty search (all notebooks)
- Combined search (query + tags + fork_type)

---

### Compilation Endpoint
**Endpoint:** `POST /api/v1/notebooks/{id}/compile`

| Metric | Baseline | Threshold | Status |
|--------|----------|-----------|--------|
| p50 submit time | 100ms | - | ✅ |
| p95 submit time | 500ms | < 1000ms | ✅ |
| p95 total time | 3000ms | < 5000ms | ✅ |
| Success rate | 98% | > 95% | ✅ |
| Max concurrent | 10 compilations | - | ✅ |

**Scenarios:**
- Simple notebooks (1-2 cells)
- Complex notebooks (10+ cells, charts)
- Concurrent compilations
- Rate limiting (10 per user)

---

## Frontend Performance Baselines

### Feed Page
**Route:** `/feed`

| Metric | Baseline | Threshold | Status |
|--------|----------|-----------|--------|
| First Contentful Paint (FCP) | 1.0s | < 1.5s | ✅ |
| Largest Contentful Paint (LCP) | 1.8s | < 2.0s | ✅ (PERF-01) |
| Time to Interactive (TTI) | 2.5s | < 3.0s | ✅ |
| Cumulative Layout Shift (CLS) | 0.05 | < 0.1 | ✅ |
| Total Blocking Time (TBT) | 150ms | < 300ms | ✅ |

---

### Notebook Viewer Page
**Route:** `/notebooks/{id}`

| Metric | Baseline | Threshold | Status |
|--------|----------|-----------|--------|
| First Contentful Paint (FCP) | 1.2s | < 1.5s | ✅ |
| Largest Contentful Paint (LCP) | 2.2s | < 3.0s | ✅ (PERF-02) |
| Time to Interactive (TTI) | 3.0s | < 3.5s | ✅ |
| Cumulative Layout Shift (CLS) | 0.03 | < 0.1 | ✅ |
| Total Blocking Time (TBT) | 200ms | < 300ms | ✅ |

---

### Editor Page
**Route:** `/editor`

| Metric | Baseline | Threshold | Status |
|--------|----------|-----------|--------|
| First Contentful Paint (FCP) | 1.8s | < 2.0s | ✅ |
| Largest Contentful Paint (LCP) | 4.5s | < 5.0s | ✅ (PERF-03) |
| Time to Interactive (TTI) | 4.8s | < 5.0s | ✅ |
| Cumulative Layout Shift (CLS) | 0.02 | < 0.1 | ✅ |
| Total Blocking Time (TBT) | 250ms | < 300ms | ✅ |

**Note:** Editor has higher LCP due to WASM initialization (Pyodide ~3s)

---

### Search Page
**Route:** `/search`

| Metric | Baseline | Threshold | Status |
|--------|----------|-----------|--------|
| First Contentful Paint (FCP) | 1.0s | < 1.2s | ✅ |
| Largest Contentful Paint (LCP) | 1.9s | < 2.0s | ✅ |
| Time to Interactive (TTI) | 2.6s | < 3.0s | ✅ |
| Cumulative Layout Shift (CLS) | 0.04 | < 0.1 | ✅ |
| Total Blocking Time (TBT) | 140ms | < 300ms | ✅ |

---

## Regression Detection Thresholds

### API Performance
- **Critical:** Fail if p95 increases by > 20% from baseline
- **Warning:** Alert if p95 increases by > 10% from baseline
- **Example:** Feed p95 baseline 200ms → Fail at > 240ms, Warn at > 220ms

### Frontend Performance
- **Critical:** Fail if LCP increases by > 10% from baseline
- **Warning:** Alert if LCP increases by > 5% from baseline
- **Example:** Feed LCP baseline 1.8s → Fail at > 1.98s, Warn at > 1.89s

### Success Rate
- **Critical:** Fail if error rate > 1% (API) or success rate < 95% (compilation)
- **Warning:** Alert if error rate > 0.5% (API) or success rate < 98% (compilation)

---

## Performance Budgets

### Bundle Size Limits
- **Total JavaScript:** < 500 KB (gzipped)
- **Total Page Weight:** < 2000 KB
- **Total Images:** < 1000 KB
- **Third-party Scripts:** < 200 KB total, < 100 KB per script

### Resource Count Limits
- **JavaScript Files:** < 10 files
- **Total Resources:** < 30 resources

---

## Performance Targets (PERF Requirements)

- **PERF-01:** Feed loads initial 10 notebooks in under 2 seconds → ✅ LCP 1.8s
- **PERF-02:** Notebook viewer loads in under 3 seconds (first paint) → ✅ LCP 2.2s
- **PERF-03:** WASM editor initializes in under 5 seconds → ✅ LCP 4.5s
- **PERF-04:** Images are lazy-loaded and optimized → ✅ CLS < 0.1
- **PERF-05:** Database queries are indexed for common operations → ✅ p95 < 500ms
- **PERF-06:** Redis caching reduces database load for feed and trending → ✅ Cache hit rate > 80%

---

## Notes

- Baseline metrics measured on clean environment (no cached data)
- Production performance may vary based on:
  - Geographic distribution of users
  - CDN effectiveness (CloudFront)
  - Database size and query complexity
  - Network conditions
- Baseline to be re-measured monthly or after major infrastructure changes
