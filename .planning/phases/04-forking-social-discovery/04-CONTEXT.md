# Phase 4: Forking & Social Discovery - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

## Phase Boundary

This phase enables users to fork notebooks with full attribution, discover content through ML-driven feeds and search, and ensures forks have equal weightage in social feeds. It includes: (1) Forking system with database lineage tracking, (2) Soft delete with archive functionality, (3) Dataset forking when notebooks are forked, (4) Follow system for personalized feeds, (5) Time-decayed trending algorithm, (6) Redis caching for performance, (7) Meilisearch integration for search, and (8) Engagement metrics tracking.

**What this phase delivers:** Users can fork any notebook (published or draft), forks are independent copies they can edit and publish, attribution chains show lineage from original to current, users can follow creators to get personalized feeds, search finds notebooks by title/content/author, and engagement metrics are tracked and displayed.

**What this phase does NOT deliver:** Topic/tag following (deferred), ML-based content recommendations (deferred), paid search/analytics services (using free/self-hosted only), or advanced A/B testing dashboards (custom logging only).

---

## Implementation Decisions

### 1. Forking System (FORK-01 to FORK-05, Dataset Forking)

**D-1:** Fork database model uses hybrid approach with both `parent_id` (immediate parent) and `root_id` (ultimate original) foreign keys on Notebook model

**D-2:** Dataset forking matches notebook model with same `parent_id` + `root_id` structure, automatic dataset copying on notebook fork, full independence (fork owner can modify data without affecting original)

**D-3:** Fork attribution display uses responsive approach:
- Desktop: Full breadcrumb with truncation (`@alice → @bob → @charlie ... (2 more) → @you`)
- Mobile: Compact badge + expandable (`🔄 Forked from @bob` with `[▼ Show chain]`)
- Location: Notebook detail page only (not feed cards)
- Truncation logic: 1-3 forks show full chain, 4+ forks show first 2 + "..." + last

**D-4:** Delete protection uses soft delete (archive) approach with `is_archived` boolean flag on Notebook model:
- Hidden from all feeds (main, trending, user profile)
- Hidden from search results
- Direct URLs still work (fork chain integrity preserved)
- "This notebook has been archived" banner shown on访问
- Restorable by owner via "Archive" action (no hard deletion)

**D-5:** Fork chains are treated equally in all algorithms — no penalty for being "far from original," no boost for being "close to original." True meritocracy based on engagement score.

---

### 2. Social Graph & Follow System (DISC-01, DISC-02)

**D-6:** Follow system is one-way (Twitter/Instagram style) — I follow @alice does not require @alice to follow me back

**D-7:** Follow discovery happens through:
- Follow button on user profile pages
- Follow button on notebook attribution (when viewing forks)
- Username search (autocomplete dropdown)

**D-8:** Cold start problem handled via onboarding flow: "Follow 5+ people to get your personalized feed" — users with 0 follows see trending feed as fallback until they follow others

**D-9:** Follow rate limiting: 100 follows per day per user (enforced at API level via `FollowService.follow_user()`)

**D-10:** Follow features NOT in scope for v1:
- Suggested users/recommendations
- Follow notifications
- Follower lists (show count only)
- Two-way "friends"
- Topic/tag following

---

### 3. ML Feed Algorithm (DISC-01, DISC-02, PERF-06)

**D-11:** Trending score formula (v1): Time-decayed with manual weights
```python
engagement = (likes * 2) + (comments * 3) + (views * 0.05)
trending_score = engagement / pow((age_hours + 2), 1.5)
ORDER BY trending_score DESC
```
- Comments weighted higher (3×) than likes (2×) — conversations matter for notebooks
- Views lightly weighted (0.05×) — passive signal
- Decay exponent 1.5 — notebooks have longer shelf-life than social posts

**D-12:** Personalized feed algorithm:
```python
followed_notebooks = get_notebooks_from_followed_users(user_id, limit=50)
trending_notebooks = get_trending_notebooks(limit=50)
feed = followed_notebooks + trending_notebooks
return feed[:50]
```
- Prioritize content from followed users
- Fill remaining slots with trending content
- Users with 0 follows see 100% trending (cold start fallback)

**D-13:** Fork equal weightage (DISC-02, FORK-03): No distinction in trending algorithm between originals and forks. Same formula applied to all notebooks regardless of `parent_id` status.

**D-14:** Feed filter UI uses tab-based approach:
- Tabs: `[ All ] [ Originals ] [ Forks ]`
- Default: "All" tab (no filter)
- Show result counts in parentheses
- Mobile: Bottom tabs for thumb access
- Desktop: Top tabs with full labels
- Backend: Meilisearch faceted search with `filter` parameter

**D-15:** Data collection for future ML (v1 foundation):
- Raw event logging only via `FeedEvent` model (no tags, no inferences, no ML yet)
- Events: `impression`, `click`, `like`, `comment`, `time_spent`
- Bucket field reserved for future A/B testing
- No content metadata tagging in v1
- No user perspective inference in v1
- All deferred to Phase 5 or v2 when training data is available

**D-16:** Tech stack for ML (free foundation):
- Vector DB: Qdrant (self-hosted Docker) → migrate to Pinecone (paid) later
- Embeddings: sentence-transformers (self-hosted) → migrate to OpenAI/Cohere (paid) later
- A/B testing: Custom Postgres + Redis logging → migrate to Optimizely/Statsig (paid) later
- Analytics: Custom queries → migrate to Mixpanel/Amplitude (paid) later

**D-17:** Perspective evolution tracking (schema ready, not implemented v1):
```python
class UserProfile:
    current_perspective = Column(JSON)  # Updated nightly
    perspective_history = Column(JSON)  # List of past versions
```
- Sliding window: Track last N perspectives to detect drift
- Nightly recalculation: `update_user_perspectives()` cron job
- Versioning: Archive old perspectives when significant change detected

---

### 4. Search & Discovery (DISC-03, DISC-04)

**D-18:** Search engine: Meilisearch (self-hosted in Docker Compose)
- Fast, typo-tolerant search (<50ms)
- Faceted search built-in (supports fork filter)
- Docker-native, ~100MB RAM footprint
- Free/open-source (MIT license)
- Migration path to Meilisearch Cloud available

**D-19:** Search indexing scope (real-time sync):
- Fields: `title`, `content` (all cell text), `author` (username), `tags` (optional, future)
- Sync trigger: Real-time on every Notebook save via Django `post_save` signal
- Update strategy: `meilisearch.index('notebooks').update_documents([...])`
- Error handling: Log sync failures, don't fail the save operation

**D-20:** Search fallback behavior:
- Try Meilisearch first
- On connection failure: Fall back to PostgreSQL `LIKE %query%` search (slow but works)
- Never show "search down" error to users
- Log warnings for ops monitoring

**D-21:** Empty state handling:
- No search results: Show trending notebooks instead with message: "No results for 'query'. Showing trending notebooks instead."
- Suggestion: "Try different keywords or [clear filters]"
- Graceful degradation ensures users always see content

---

### 5. Caching & Performance (PERF-06, DISC-05)

**D-22:** Redis data structures:
```python
# Individual notebook scores (hash)
HSET notebook:123:score {"engagement": 45, "decayed_score": 12.3, "updated_at": "..."}

# Trending sorted set (ranked by decayed_score)
ZADD trending:all 12.3 "notebook:123"

# User feed (list)
LPUSH feed:user:5 "notebook:123" "notebook:456"
EXPIRE feed:user:5 60
```

**D-23:** Cache TTLs and refresh strategies:
- `trending:all` (ZSET): Persistent, refreshed by Celery task every 2 minutes
- `notebook:{id}:score` (hash): Persistent, updated real-time on like/comment
- `feed:user:{id}` (list): 1 minute TTL, lazy (invalidate on notebook update)

**D-24:** Real-time score updates:
```python
# On like created
redis.hincrby(f"notebook:{notebook_id}:score", "engagement", 2)
engagement = redis.hget(f"notebook:{notebook_id}:score", "engagement")
decayed_score = int(engagement) / pow((age_hours + 2), 1.5)
redis.zadd("trending:all", decayed_score, f"notebook:{notebook_id}")
```
- Immediate increment on engagement events (likes, comments)
- Recalculate decayed score inline (fast operation)
- Update ZSET immediately (new ranking visible in next feed load)

**D-25:** Background recalculation (Celery beat task):
- Runs every 2 minutes
- Recalculates time decay for all notebooks in `trending:all` ZSET
- Warms cache before old values expire
- Prevents cache stampede

**D-26:** Hybrid cache strategy:
- **Proactive:** Trending feed (background task, always warm)
- **Lazy:** User feeds (invalidate on update, 1 min TTL)
- **Real-time:** Engagement increments (no caching, immediate write)

**D-27:** Cache invalidation:
- Notebook published/updated: Delete `feed:user:{id}` for all followers
- Like/comment created: Update `notebook:{id}:score` hash + `trending:all` ZSET
- No invalidation for trending (background task handles it)

**D-28:** Bootstrap strategy:
- On deploy/run `bootstrap_redis_cache()` function
- Populates Redis from database (all published notebooks)
- Calculates engagement scores and decayed scores
- Loads into ZSET and hashes
- Runs once at startup

**D-29:** Redis failure handling:
- Try Redis operations first
- On `RedisError`: Fall back to database calculation
- Log warnings for ops monitoring
- Graceful degradation (slower but functional)

**D-30:** Engagement metrics display:
- **Feed cards:** Likes + Comments counts (icons + numbers)
- **Notebook detail page:** Likes + Comments + Views (icons + numbers + labels)
- **Mobile feed:** Icons only (👍💬) to save space, no labels
- **Desktop:** Icons + numbers + labels

**D-31:** View tracking:
- Increment on every page load (no deduplication in v1)
- Stored in Redis hash: `HINCRBY notebook:123:views count 1`
- Batch sync to database every 5 minutes via Celery task
- Acceptable gaming risk for v1 (refresh boosting)

**D-32:** Zero state logic (Facebook/Instagram style):
- 0 likes + 0 comments: Show icons only, no counts (`👍  💬  `)
- Don't show "0" (feels dead)
- Detail page: "Be the first to like this notebook" (call-to-action)
- Hide metrics until first engagement (cleaner UX)

---

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Documentation
- `.planning/PROJECT.md` — Core project vision, constraints, and key decisions
- `.planning/REQUIREMENTS.md` — Complete v1 requirements with traceability
- `.planning/ROADMAP.md` — Phase 4 details, success criteria, and requirements mapping
- `.planning/phases/01-foundation-authentication/01-CONTEXT.md` — Authentication and OAuth decisions
- `.planning/phases/02-core-notebook-experience/` — Social features patterns (likes, comments)
- `.planning/phases/03-execution-publishing/03-CONTEXT.md` — Publishing workflow decisions

### Technology Documentation
- Redis Documentation — Data structures, ZSET operations, pub/sub patterns
- Meilisearch Documentation — Faceted search, typo tolerance, relevancy ranking
- Celery Documentation — Periodic tasks, beat scheduler, task routing
- scikit-learn Documentation — Future ML integration, feature engineering

### Patterns Established in Prior Phases
- FastAPI service layer pattern (from Phase 1)
- SQLAlchemy models with relationships (from Phase 1)
- Next.js page structure and routing (from Phase 2)
- shadcn/ui component patterns (from Phase 2)
- Pydantic schemas for API validation (from Phase 1)
- Docker Compose service definitions (from Phase 1)

---

## New Models/Schemas to Create

### Database Models

```python
# Follow relationship
class Follow(Base):
    follower_id = Column(Integer, ForeignKey('users.id'))
    following_id = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (
        UniqueConstraint('follower_id', 'following_id'),
        Index('follow_follower_idx', 'follower_id'),
        Index('follow_following_idx', 'following_id'),
    )

# Notebook fork lineage (fields added to existing Notebook model)
# parent_id = Column(Integer, ForeignKey('notebooks.id'), nullable=True)
# root_id = Column(Integer, ForeignKey('notebooks.id'), nullable=True)
# is_archived = Column(Boolean, default=False)

# Dataset fork lineage (new model)
class Dataset(Base):
    parent_id = Column(Integer, ForeignKey('datasets.id'), nullable=True)
    root_id = Column(Integer, ForeignKey('datasets.id'), nullable=True)
    # ... other fields

# Event tracking (future ML foundation)
class FeedEvent(Base):
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    notebook_id = Column(Integer, ForeignKey('notebooks.id'))
    event_type = Column(String(50))  # 'impression', 'click', 'like', 'comment', 'time_spent'
    bucket_id = Column(String(100), nullable=True)  # Future A/B tests
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    metadata = Column(JSON, nullable=True)  # Future: device, location, referrer
    __table_args__ = (
        Index('feed_event_user_idx', 'user_id', 'timestamp'),
        Index('feed_event_notebook_idx', 'notebook_id', 'event_type'),
        Index('feed_event_bucket_idx', 'bucket_id', 'timestamp'),
    )
```

### API Schemas

```python
# Follow operations
class FollowCreate(BaseModel):
    following_id: int

class FollowResponse(BaseModel):
    follower_id: int
    following_id: int
    created_at: datetime

# Search (faceted)
class SearchQuery(BaseModel):
    q: str = Field(..., min_length=1, max_length=100)
    tab: Literal['all', 'originals', 'forks'] = 'all'

class SearchResult(BaseModel):
    notebooks: List[NotebookResponse]
    empty_state: bool = False
    message: Optional[str] = None
    facet_distribution: Optional[dict] = None
```

---

## Claude's Discretion

**Frontend state management:**
- Use Zustand for follow state (already using for auth, notebooks)
- Store `following_ids: Set<number>` in `userStore`
- Optimistic UI updates (follow button changes immediately)

**Search UX:**
- Debounce search input (300ms delay)
- Show skeleton loaders while fetching
- Infinite scroll or "Load more" button (choose based on desktop/mobile)

**Feed rendering:**
- Use `React.Virtual` or similar for feed virtualization (mobile performance)
- Lazy load notebook preview images (already implemented in Phase 3)

**Rate limiting:**
- Enforce 100/day follow limit via `FollowService.check_rate_limit(user_id)`
- Return 429 error with `Retry-After` header if exceeded

---

## Next Steps

1. **Research phase** (via `/gsd:research-phase 04`) should investigate:
   - Meilisearch Docker integration patterns
   - Redis ZSET performance for 10K+ notebooks
   - Social graph query optimization (followed users' notebooks)
   - Fork chain depth patterns (how deep do chains get?)

2. **Planning phase** (via `/gsd:plan-phase 04`) will break into plans based on:
   - Database migrations (fork fields, Follow table, FeedEvent table)
   - Backend services (FollowService, SearchService, TrendingService)
   - API endpoints (follow/unfollow, search, feed with personalization)
   - Frontend components (FollowButton, SearchBar, FilterTabs, EngagementMetrics)
   - Background tasks (Celery beat for trending recalculation)
   - Infrastructure (Meilisearch Docker service, Redis caching)

3. **Execution phase** will implement all plans in wave-based parallelization

---

**Phase 4 is ready for research and planning.**
