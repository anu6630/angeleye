# Performance Regression Checks

**Last Updated:** 2026-04-05

## Regression Scenarios

### Feed Endpoint Regressions

#### Symptom: Feed p95 > 500ms
**Impact:** Users experience slow feed loading
**Severity:** Critical

**Diagnostic Steps:**
1. Check database query performance:
   ```bash
   # Enable slow query log in PostgreSQL
   ALTER DATABASE notebook SET log_min_duration_statement = 100;
   ```

2. Analyze slow queries:
   ```sql
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   WHERE query LIKE '%feed%'
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

3. Check Redis cache hit rate:
   ```bash
   redis-cli INFO stats | grep keyspace_hits
   redis-cli INFO stats | grep keyspace_misses
   ```

4. Verify indexes exist:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM notebooks
   WHERE published = true
   ORDER BY created_at DESC
   LIMIT 10;
   ```

**Common Fixes:**
- Add database indexes on `notebooks.created_at`, `notebooks.published`
- Increase Redis cache TTL for feed data
- Implement cursor-based pagination (already done)
- Add N+1 query optimization (eager loading)

---

### Search Endpoint Regressions

#### Symptom: Search p95 > 300ms
**Impact:** Search results take too long to load
**Severity:** High

**Diagnostic Steps:**
1. Check Meilisearch performance:
   ```bash
   # Check Meilisearch stats
   curl http://localhost:7700/stats
   ```

2. Analyze search query complexity:
   ```bash
   # Check search logs for slow queries
   curl http://localhost:7700/searches
   ```

3. Verify indexing is complete:
   ```bash
   # Check index stats
   curl http://localhost:7700/indexes/notebooks/stats
   ```

4. Test search without filters:
   ```bash
   # Compare performance: with vs without filters
   time curl "http://localhost:8000/api/v1/search?q=data"
   time curl "http://localhost:8000/api/v1/search?q=data&tags=data-science"
   ```

**Common Fixes:**
- Optimize Meilisearch ranking rules
- Add searchable attributes limit (title, tags, description)
- Implement search result caching (Redis)
- Add pagination to search results
- Use filterable attributes for tags, fork_type

---

### Compilation Endpoint Regressions

#### Symptom: Compilation p95 > 5000ms or success rate < 95%
**Impact:** Users can't compile notebooks reliably
**Severity:** Critical

**Diagnostic Steps:**
1. Check Celery worker status:
   ```bash
   celery -A app.worker inspect active
   ```

2. Analyze compilation queue:
   ```bash
   celery -A app.worker inspect reserved
   ```

3. Check Docker container health:
   ```bash
   docker ps --filter "name=compilation"
   docker stats <container_id>
   ```

4. Monitor compilation logs:
   ```bash
   docker logs <compilation_container>
   ```

5. Check for resource limits:
   ```bash
   # CPU and memory usage
   top -p $(pgrep -f compilation_worker)
   ```

**Common Fixes:**
- Increase Celery worker count (scale horizontally)
- Add resource limits to Docker containers (CPU, memory)
- Implement compilation timeout (max 30s)
- Add rate limiting per user (10 compilations/hour)
- Optimize notebook compilation pipeline (nbconvert caching)

---

### Frontend LCP Regressions

#### Symptom: LCP > 2.5s (feed) or > 3s (notebook viewer)
**Impact:** Poor perceived performance, lower user engagement
**Severity:** High

**Diagnostic Steps:**
1. Run Lighthouse with detailed report:
   ```bash
   lighthouse http://localhost:3000/feed --view
   ```

2. Analyze bundle size:
   ```bash
   npm run build
   # Check .next/analyze for bundle breakdown
   ```

3. Check image optimization:
   ```bash
   # List largest images
   find .next/static/media -type f -exec du -h {} + | sort -rh | head -20
   ```

4. Monitor network requests in DevTools:
   - Open Chrome DevTools → Network tab
   - Load feed page
   - Sort by size (descending)
   - Identify large resources

**Common Fixes:**
- Implement code splitting (dynamic imports)
- Lazy load images (next/image)
- Optimize images (WebP format, compression)
- Reduce bundle size (tree shaking, remove unused dependencies)
- Use Next.js Image component for all images
- Implement skeleton loading states

---

### Frontend CLS Regressions

#### Symptom: CLS > 0.1
**Impact:** Layout shifts, poor user experience
**Severity:** Medium

**Diagnostic Steps:**
1. Run Lighthouse CLS audit:
   ```bash
   lighthouse http://localhost:3000/feed --only-categories=performance
   ```

2. Check for missing image dimensions:
   ```bash
   grep -r "src=" frontend/app/ frontend/components/
   ```

3. Analyze layout shifts in DevTools:
   - Open Chrome DevTools → Rendering → Layout Shift Regions
   - Load page and identify shifting elements

**Common Fixes:**
- Add explicit width/height to all images
- Reserve space for dynamic content (skeleton screens)
- Avoid inserting content above existing content
- Use CSS aspect-ratio for images
- Implement font-display: swap for web fonts

---

### Frontend TTI Regressions

#### Symptom: TTI > 3.5s
**Impact:** Page takes too long to become interactive
**Severity:** High

**Diagnostic Steps:**
1. Run Lighthouse TTI audit:
   ```bash
   lighthouse http://localhost:3000/feed --only-categories=performance
   ```

2. Analyze JavaScript execution time:
   - Chrome DevTools → Performance tab
   - Record page load
   - Check "Scripting" timeline

3. Check for long tasks:
   ```bash
   # Long tasks > 50ms block main thread
   # Look for in DevTools Performance tab
   ```

**Common Fixes:**
- Code splitting (reduce initial bundle size)
- Defer non-critical JavaScript
- Use React.lazy() for heavy components
- Implement service worker caching
- Optimize React rendering (React.memo, useMemo)
- Reduce third-party script usage

---

## Performance Monitoring Tools

### API Performance Monitoring

1. **k6 Cloud Insights**
   - Real-time load testing
   - Performance dashboards
   - Alerting on thresholds

2. **Application Performance Monitoring (APM)**
   - New Relic, Datadog, or Prometheus
   - Trace slow API calls
   - Database query performance

3. **Log Aggregation**
   - ELK Stack (Elasticsearch, Logstash, Kibana)
   - Grafana Loki
   - CloudWatch Logs

---

### Frontend Performance Monitoring

1. **Lighthouse CI**
   - Automated performance audits
   - Performance budget enforcement
   - Regression detection

2. **Web Vitals Monitoring**
   - Core Web Vitals (LCP, FID, CLS)
   - Real User Monitoring (RUM)
   - Chrome UX Report (CrUX)

3. **Bundle Analysis**
   - webpack-bundle-analyzer
   - Next.js built-in bundle analysis
   - Source map explorer

---

## Performance Testing Checklist

### Pre-Deployment
- [ ] Run k6 load tests (feed, search, compilation)
- [ ] Run Lighthouse CI on all key routes
- [ ] Check bundle size hasn't increased > 10%
- [ ] Verify all performance budgets pass
- [ ] Review performance regression report

### Post-Deployment
- [ ] Monitor API error rates (target < 1%)
- [ ] Monitor API p95 latencies (compare to baseline)
- [ ] Monitor frontend Core Web Vitals (CrUX data)
- [ ] Check for any performance-related user complaints
- [ ] Review performance dashboards for anomalies

---

## Performance Optimization Priorities

### High Priority (Critical User Impact)
1. Optimize feed endpoint queries (largest traffic)
2. Reduce bundle sizes (improves all pages)
3. Implement aggressive caching (Redis, CDN)
4. Optimize images (largest page weight contributor)

### Medium Priority (Noticeable Impact)
1. Code splitting for heavy routes (editor)
2. Service worker for offline support
3. Database query optimization
4. Meilisearch index optimization

### Low Priority (Nice to Have)
1. HTTP/2 or HTTP/3
2. Edge computing (CloudFront Functions)
3. Preload critical resources
4. Resource hints (preload, prefetch)

---

## Performance Regression Escalation

### Level 1: Performance Degradation (< 10% from baseline)
- **Action:** Monitor closely, investigate cause
- **Timeline:** 1 week
- **Owner:** Performance lead

### Level 2: Significant Regression (10-20% from baseline)
- **Action:** Create investigation ticket, assign to team
- **Timeline:** 3 days
- **Owner:** Tech lead

### Level 3: Critical Regression (> 20% from baseline)
- **Action:** Block deployments, emergency fix required
- **Timeline:** 24 hours
- **Owner:** Engineering manager

---

## Continuous Improvement

### Monthly Performance Reviews
- Review baseline metrics
- Identify top 3 performance bottlenecks
- Plan optimizations for next sprint
- Update BASELINE.md if needed

### Quarterly Performance Audits
- Comprehensive performance audit (all pages)
- Competitor benchmarking
- Update performance targets if needed
- Review and update regression thresholds

---

*This document should be updated whenever new performance issues are discovered or new optimization techniques are implemented.*
