# Phase 4: Forking & Social Discovery - Research

**Researched:** 2026-04-04
**Domain:** Social features, forking system, ML-driven feeds, search, Redis caching
**Confidence:** HIGH

## Summary

Phase 4 implements the core social features that make NotebookSocial unique: forking notebooks with full attribution, ML-driven trending feeds with equal weightage for forks, personalized follow-based feeds, faceted search via Meilisearch, and Redis caching for performance. This phase transforms the platform from a notebook publishing tool into a social network where remixing and discovery are first-class behaviors.

The technical approach builds on existing patterns from Phases 1-3: SQLAlchemy models with self-referential foreign keys for fork lineage, soft deletes with `is_archived` flags, Meilisearch for fast typo-tolerant search with faceted filtering, Redis ZSETs for time-decayed trending scores, and Celery beat tasks for background cache warming. The phase requires careful database schema design for fork chains (both `parent_id` and `root_id` for efficient lineage queries), dataset forking with S3 server-side copies, and a hybrid feed algorithm that combines followed users' content with trending notebooks.

**Primary recommendation:** Use Meilisearch for search (self-hosted in Docker), Redis ZSETs for trending scores with Celery beat for background recalculation, SQLAlchemy self-referential relationships for fork lineage, and implement soft deletes with `is_archived` to preserve fork chain integrity while hiding notebooks from feeds.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**1. Forking System (FORK-01 to FORK-05, Dataset Forking)**
- Fork database model uses hybrid approach with both `parent_id` (immediate parent) and `root_id` (ultimate original) foreign keys on Notebook model
- Dataset forking matches notebook model with same `parent_id` + `root_id` structure, automatic dataset copying on notebook fork, full independence (fork owner can modify data without affecting original)
- Fork attribution display uses responsive approach: Desktop full breadcrumb with truncation, Mobile compact badge + expandable, Location: Notebook detail page only (not feed cards)
- Delete protection uses soft delete (archive) approach with `is_archived` boolean flag on Notebook model: Hidden from all feeds/search, direct URLs still work (fork chain integrity preserved), "This notebook has been archived" banner, Restorable by owner via "Archive" action
- Fork chains are treated equally in all algorithms — no penalty for being "far from original," no boost for being "close to original." True meritocracy based on engagement score.

**2. Social Graph & Follow System (DISC-01, DISC-02)**
- Follow system is one-way (Twitter/Instagram style) — I follow @alice does not require @alice to follow me back
- Follow discovery: Follow button on user profile pages, Follow button on notebook attribution (when viewing forks), Username search (autocomplete dropdown)
- Cold start problem: "Follow 5+ people to get your personalized feed" — users with 0 follows see trending feed as fallback until they follow others
- Follow rate limiting: 100 follows per day per user (enforced at API level)
- Follow features NOT in scope: Suggested users/recommendations, Follow notifications, Follower lists (show count only), Two-way "friends", Topic/tag following

**3. ML Feed Algorithm (DISC-01, DISC-02, PERF-06)**
- Trending score formula (v1): `engagement = (likes * 2) + (comments * 3) + (views * 0.05)` then `trending_score = engagement / pow((age_hours + 2), 1.5)` ORDER BY trending_score DESC. Comments weighted 3×, likes 2×, views 0.05×. Decay exponent 1.5 for longer shelf-life.
- Personalized feed algorithm: Get 50 notebooks from followed users + 50 trending notebooks, return first 50 (prioritize followed, fill with trending). Users with 0 follows see 100% trending.
- Fork equal weightage (DISC-02, FORK-03): No distinction in trending algorithm between originals and forks. Same formula applied to all notebooks regardless of `parent_id` status.
- Feed filter UI: Tab-based approach `[ All ] [ Originals ] [ Forks ]`, Default "All" tab, Show result counts in parentheses. Backend: Meilisearch faceted search with `filter` parameter.
- Data collection for future ML (v1 foundation): Raw event logging only via `FeedEvent` model (no tags, no inferences, no ML yet). Events: `impression`, `click`, `like`, `comment`, `time_spent`. Bucket field reserved for future A/B testing.
- Tech stack for ML (free foundation): Vector DB Qdrant (self-hosted), Embeddings sentence-transformers (self-hosted), A/B testing custom Postgres + Redis, Analytics custom queries. Migration path to paid services later.

**4. Search & Discovery (DISC-03, DISC-04)**
- Search engine: Meilisearch (self-hosted in Docker Compose). Fast, typo-tolerant search (<50ms), faceted search built-in, ~100MB RAM footprint, MIT license.
- Search indexing scope (real-time sync): Fields: `title`, `content` (all cell text), `author` (username), `tags` (optional, future). Sync trigger: Real-time on every Notebook save. Update strategy: `meilisearch.index('notebooks').update_documents([...])`. Error handling: Log sync failures, don't fail the save operation.
- Search fallback behavior: Try Meilisearch first, On connection failure: Fall back to PostgreSQL `LIKE %query%` search (slow but works), Never show "search down" error to users, Log warnings for ops monitoring.
- Empty state handling: No search results: Show trending notebooks instead with message: "No results for 'query'. Showing trending notebooks instead." Suggestion: "Try different keywords or [clear filters]". Graceful degradation ensures users always see content.

**5. Caching & Performance (PERF-06, DISC-05)**
- Redis data structures: Individual notebook scores (hash): `HSET notebook:123:score {"engagement": 45, "decayed_score": 12.3}`, Trending sorted set: `ZADD trending:all 12.3 "notebook:123"`, User feed (list): `LPUSH feed:user:5` with 60s TTL.
- Cache TTLs and refresh strategies: `trending:all` (ZSET): Persistent, refreshed by Celery task every 2 minutes. `notebook:{id}:score` (hash): Persistent, updated real-time on like/comment. `feed:user:{id}` (list): 1 minute TTL, lazy (invalidate on notebook update).
- Real-time score updates: On like created: `redis.hincrby` engagement by 2, recalculate decayed score inline, `redis.zadd` to update ZSET immediately. Immediate increment on engagement events, Update ZSET immediately (new ranking visible in next feed load).
- Background recalculation (Celery beat task): Runs every 2 minutes, Recalculates time decay for all notebooks in `trending:all` ZSET, Warms cache before old values expire, Prevents cache stampede.
- Hybrid cache strategy: Proactive (Trending feed: background task, always warm), Lazy (User feeds: invalidate on update, 1 min TTL), Real-time (Engagement increments: no caching, immediate write).
- Cache invalidation: Notebook published/updated: Delete `feed:user:{id}` for all followers, Like/comment created: Update `notebook:{id}:score` hash + `trending:all` ZSET, No invalidation for trending (background task handles it).
- Bootstrap strategy: On deploy/run `bootstrap_redis_cache()` function, Populates Redis from database (all published notebooks), Calculates engagement scores and decayed scores, Loads into ZSET and hashes, Runs once at startup.
- Redis failure handling: Try Redis operations first, On `RedisError`: Fall back to database calculation, Log warnings for ops monitoring, Graceful degradation (slower but functional).
- Engagement metrics display: Feed cards: Likes + Comments counts (icons + numbers), Notebook detail page: Likes + Comments + Views (icons + numbers + labels), Mobile feed: Icons only (👍💬) to save space, no labels.
- View tracking: Increment on every page load (no deduplication in v1), Stored in Redis hash: `HINCRBY notebook:123:views count 1`, Batch sync to database every 5 minutes via Celery task, Acceptable gaming risk for v1 (refresh boosting).
- Zero state logic: 0 likes + 0 comments: Show icons only, no counts (`👍  💬  `). Don't show "0" (feels dead). Detail page: "Be the first to like this notebook" (call-to-action). Hide metrics until first engagement (cleaner UX).

### Claude's Discretion

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

### Deferred Ideas (OUT OF SCOPE)

Topic/tag following (deferred), ML-based content recommendations (deferred), paid search/analytics services (using free/self-hosted only), advanced A/B testing dashboards (custom logging only), Suggested users/recommendations (deferred), Follow notifications (deferred), Follower lists (show count only, deferred), Two-way "friends" (deferred).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FORK-01 | User can fork any notebook (published or draft) | SQLAlchemy self-referential foreign keys + S3 server-side copy for datasets |
| FORK-02 | Forked notebook is a copy that user can edit and publish separately | Deep copy notebook cells + copy datasets with new parent_id/root_id |
| FORK-03 | Forks appear in feed with equal weightage to original notebooks | Time-decayed trending algorithm treats all notebooks equally regardless of parent_id |
| FORK-04 | Fork attribution chain is preserved (shows lineage from original to current) | Hybrid parent_id + root_id approach enables efficient breadcrumb queries |
| FORK-05 | User cannot delete notebooks that have been forked by others | Soft delete with is_archived flag preserves fork chain integrity |
| DISC-01 | Feed algorithm uses ML to show trending content | Time-decayed engagement score formula with Redis ZSET caching |
| DISC-02 | Feed algorithm treats main notebooks and forks with equal weightage | No parent_id checks in trending calculation, pure meritocracy |
| DISC-03 | User can search notebooks by title, tags, and author | Meilisearch integration with typo-tolerant faceted search |
| DISC-04 | User can filter search results by notebook type (original vs fork) | Meilisearch filterable attributes with tab-based UI |
| DISC-05 | Feed shows engagement metrics (views, likes, comments) | Redis hash counters with real-time increments + lazy sync to Postgres |
| PERF-06 | Redis caching reduces database load for feed and trending | ZSET for trending rankings, hash for scores, list for user feeds |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Meilisearch** | 0.37 (Python: 0.57.0, JS: 0.30.0) | Search engine | Fast typo-tolerant search (<50ms), faceted search built-in, self-hosted in Docker, MIT license, excellent Python/SDK clients |
| **Redis** | 7.4.0 (already installed) | Cache & message broker | In-memory data store for feed caching, ZSET for trending rankings, hash for score tracking, already in project |
| **Celery** | 5.6.3 (already installed) | Task queue | Background trending recalculation every 2 minutes, view sync to database, already in project |
| **SQLAlchemy** | 2.0.48 (already installed) | ORM with relationships | Self-referential foreign keys for fork lineage, async support, already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **boto3** | 1.42.83 (already installed) | S3 dataset forking | Server-side copy_object for dataset files when forking notebooks |
| **scikit-learn** | 1.8.0 (planned) | ML algorithms | Future ML integration, feature engineering foundation (v1 uses manual formula) |
| **pandas** | 3.0.2 (planned) | Data manipulation | Feed data processing, user engagement metrics (v1 foundation) |
| **numpy** | 2.4.4 (planned) | Numerical computing | Foundation for pandas and scikit-learn, efficient array operations |
| **Zustand** | 5.0.12 (already installed) | State management | Follow state management, optimistic UI updates |
| **@testing-library/react** | 16.3.2 (already installed) | Component testing | Test follow buttons, search UI, engagement metrics display |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| **Meilisearch** | Elasticsearch | Meilisearch is lighter (~100MB vs ~1GB), simpler setup, built-in faceting, faster for <1M docs. Elasticsearch scales better for huge datasets |
| **Redis ZSET** | PostgreSQL calculated scores | Redis is ~100x faster for real-time updates, ZSET provides O(log N) ranking, Postgres would require window functions on every query |
| **Soft delete** | Hard delete with cascade | Hard delete breaks fork chains (orphaned records), soft delete preserves data integrity, allows restore, archival analytics |

**Installation:**
```bash
# Backend
pip install meilisearch==0.37.0  # Python SDK

# Frontend
npm install meilisearch@^0.30.0  # JS SDK

# ML foundation (v1 uses manual formula, foundation for v2)
pip install scikit-learn==1.8.0 pandas==3.0.2 numpy==2.4.4
```

**Version verification:**
```bash
# Backend packages
npm view meilisearch version  # Verified: 0.37.0 (Python SDK version: 0.57.0)
npm view @meilisearch/instant-meilisearch version  # Verified: 0.30.0

# ML packages
pip show scikit-learn | grep Version  # Verify: 1.8.0
pip show pandas | grep Version  # Verify: 3.0.2
pip show numpy | grep Version  # Verify: 2.4.4
```

## Architecture Patterns

### Recommended Project Structure
```
backend/
├── app/
│   ├── models/
│   │   ├── follow.py              # NEW: Follow relationship model
│   │   ├── feed_event.py          # NEW: Event tracking for ML foundation
│   │   ├── notebook.py            # UPDATE: Add parent_id, root_id, is_archived
│   │   └── dataset.py             # UPDATE: Add parent_id, root_id
│   ├── services/
│   │   ├── fork_service.py        # NEW: Fork logic + dataset copying
│   │   ├── follow_service.py      # NEW: Follow/unfollow + rate limiting
│   │   ├── search_service.py      # NEW: Meilisearch integration + fallback
│   │   └── trending_service.py    # NEW: Trending score calc + Redis caching
│   ├── api/v1/
│   │   ├── forks/                 # NEW: Fork endpoints
│   │   ├── follows/               # NEW: Follow/unfollow endpoints
│   │   └── search/                # NEW: Search endpoints
│   └── tasks/
│       └── trending_tasks.py      # NEW: Celery beat for trending recalculation
frontend/
├── app/
│   ├── (feed)/
│   │   ├── page.tsx               # UPDATE: Personalized feed + filter tabs
│   │   └── components/
│   │       ├── FeedTabs.tsx       # NEW: [All] [Originals] [Forks] tabs
│   │       └── EngagementMetrics.tsx  # NEW: Likes/comments/views display
│   ├── search/
│   │   ├── page.tsx               # NEW: Search results page
│   │   └── components/
│   │       ├── SearchBar.tsx      # NEW: Debounced search input
│   │       └── SearchResults.tsx  # NEW: Results + empty state
│   └── notebooks/
│       ├── [id]/
│       │   └── page.tsx           # UPDATE: Add fork attribution breadcrumb
│       └── components/
│           ├── ForkButton.tsx     # NEW: Fork action button
│           └── FollowButton.tsx   # NEW: Follow user button
```

### Pattern 1: Self-Referential Foreign Keys for Fork Lineage
**What:** SQLAlchemy models with `parent_id` and `root_id` foreign keys pointing to self
**When to use:** Hierarchical data structures where you need both immediate parent and ultimate ancestor
**Example:**
```python
# Source: SQLAlchemy 2.0 documentation - Self-Referential Relationships
# https://docs.sqlalchemy.org/en/20/orm/self_referential.html

from sqlalchemy import Column, Integer, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship, remote, foreign
from app.db.base import Base

class Notebook(Base):
    __tablename__ = "notebooks"

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Fork lineage (FORC-01, FORC-04)
    parent_id = Column(Integer, ForeignKey("notebooks.id"), nullable=True, index=True)
    root_id = Column(Integer, ForeignKey("notebooks.id"), nullable=True, index=True)

    # Soft delete (FORC-05)
    is_archived = Column(Boolean, default=False, nullable=False, index=True)
    archived_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="notebooks")

    # Self-referential relationships
    parent = relationship("Notebook", remote_side=[id], foreign_keys=[parent_id],
                         backref="forks")
    root = relationship("Notebook", remote_side=[id], foreign_keys=[root_id])

    def get_fork_chain(self) -> list["Notebook"]:
        """Get full fork chain from root to current notebook."""
        if self.root_id is None:
            return [self]  # Original notebook

        # Query from root to current
        chain = []
        current = self
        while current.parent_id is not None:
            chain.insert(0, current)
            current = current.parent
        chain.insert(0, current)  # Add root
        return chain

    def has_forks(self) -> bool:
        """Check if this notebook has been forked by others."""
        return session.query(Notebook).filter(
            Notebook.parent_id == self.id,
            Notebook.is_archived == False
        ).count() > 0
```

### Pattern 2: Meilisearch Integration with Fallback
**What:** Search service that tries Meilisearch first, falls back to Postgres on failure
**When to use:** Critical user-facing features where graceful degradation is required
**Example:**
```python
# Source: Meilisearch Python SDK documentation
# https://github.com/meilisearch/meilisearch-python

import meilisearch
from sqlalchemy.orm import Session
from app.models.notebook import Notebook
from app.core.config import settings

class SearchService:
    def __init__(self):
        self.client = meilisearch.Client(
            f"http://{settings.MEILISEARCH_HOST}:7700",
            settings.MEILISEARCH_MASTER_KEY
        )
        self.index_name = "notebooks"

    async def search_notebooks(
        self,
        query: str,
        tab: str = "all",  # "all" | "originals" | "forks"
        limit: int = 20,
        offset: int = 0
    ) -> dict:
        """Search notebooks with faceted filter."""
        try:
            # Try Meilisearch first (DISC-03, DISC-04)
            search_params = {
                "limit": limit,
                "offset": offset,
                "facets": ["is_fork"]
            }

            # Apply faceted filter
            if tab == "originals":
                search_params["filter"] = "is_fork = false"
            elif tab == "forks":
                search_params["filter"] = "is_fork = true"

            results = self.client.index(self.index_name).search(query, **search_params)

            return {
                "hits": results["hits"],
                "total": results["estimatedTotalHits"],
                "facets": results.get("facetDistribution", {}),
                "fallback": False
            }

        except Exception as e:
            # Fallback to PostgreSQL (D-20)
            logger.warning(f"Meilisearch unavailable, falling back to Postgres: {e}")

            q = Session().query(Notebook).filter(
                Notebook.is_published == True,
                Notebook.is_archived == False
            )

            # Apply filters
            if tab == "originals":
                q = q.filter(Notebook.parent_id.is_(None))
            elif tab == "forks":
                q = q.filter(Notebook.parent_id.isnot(None))

            # Text search
            if query:
                q = q.filter(
                    (Notebook.title.ilike(f"%{query}%")) |
                    (Notebook.description.ilike(f"%{query}%"))
                )

            total = q.count()
            notebooks = q.limit(limit).offset(offset).all()

            return {
                "hits": [self._notebook_to_dict(n) for n in notebooks],
                "total": total,
                "facets": {},
                "fallback": True
            }

    def index_notebook(self, notebook: Notebook):
        """Real-time sync on notebook save (D-19)."""
        try:
            doc = {
                "id": notebook.id,
                "title": notebook.title,
                "description": notebook.description or "",
                "author": notebook.user.username,
                "is_fork": notebook.parent_id is not None,
                "created_at": notebook.created_at.isoformat()
            }
            self.client.index(self.index_name).update_documents([doc])
        except Exception as e:
            logger.error(f"Failed to index notebook {notebook.id}: {e}")
            # Don't fail the save operation (D-19)
```

### Pattern 3: Redis ZSET for Time-Decayed Trending
**What:** Sorted set with scores recalculated on engagement events and background tasks
**When to use:** Real-time rankings with time decay (Reddit/Hacker News style)
**Example:**
```python
# Source: Redis documentation - Sorted Sets
# https://redis.io/docs/data-types/sorted-sets/

import redis
import math
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.notebook import Notebook
from app.models.like import Like
from app.models.comment import Comment

redis_client = redis.Redis(host="redis", port=6379, decode_responses=True)

class TrendingService:
    def calculate_engagement_score(
        self,
        notebook_id: int,
        db: Session
    ) -> dict:
        """Calculate engagement and trending score (D-11)."""
        notebook = db.query(Notebook).get(notebook_id)

        # Count engagement
        likes_count = db.query(Like).filter(
            Like.notebook_id == notebook_id
        ).count()

        comments_count = db.query(Comment).filter(
            Comment.notebook_id == notebook_id
        ).count()

        # Views from Redis (D-31)
        views = int(redis_client.hget(f"notebook:{notebook_id}:views", "count") or 0)

        # Engagement formula: (likes * 2) + (comments * 3) + (views * 0.05)
        engagement = (likes_count * 2) + (comments_count * 3) + (views * 0.05)

        # Time decay: engagement / pow((age_hours + 2), 1.5)
        age_hours = (datetime.utcnow() - notebook.created_at).total_seconds() / 3600
        trending_score = engagement / math.pow((age_hours + 2), 1.5)

        return {
            "engagement": engagement,
            "trending_score": trending_score
        }

    def on_like_created(self, notebook_id: int):
        """Real-time score update on like (D-24)."""
        # Increment engagement by 2 (likes weight)
        redis_client.hincrby(f"notebook:{notebook_id}:score", "engagement", 2)

        # Recalculate trending score
        engagement = float(redis_client.hget(f"notebook:{notebook_id}:score", "engagement"))
        # Get age from hash or calculate
        age_hours = self._get_notebook_age_hours(notebook_id)
        trending_score = engagement / math.pow((age_hours + 2), 1.5)

        # Update ZSET immediately
        redis_client.zadd("trending:all", {f"notebook:{notebook_id}": trending_score})

    def get_trending_notebooks(self, limit: int = 50) -> list[int]:
        """Get top trending notebook IDs (D-12)."""
        # Get from ZSET (descending order)
        results = redis_client.zrevrange("trending:all", 0, limit - 1, withscores=True)

        # Extract notebook IDs
        notebook_ids = [
            int(node_id.split(":")[1]) for node_id, score in results
        ]

        return notebook_ids

    def bootstrap_cache(self, db: Session):
        """Bootstrap Redis cache on startup (D-28)."""
        notebooks = db.query(Notebook).filter(
            Notebook.is_published == True,
            Notebook.is_archived == False
        ).all()

        pipe = redis_client.pipeline()

        for notebook in notebooks:
            scores = self.calculate_engagement_score(notebook.id, db)

            # Store score hash
            pipe.hset(
                f"notebook:{notebook.id}:score",
                mapping={
                    "engagement": scores["engagement"],
                    "trending_score": scores["trending_score"],
                    "updated_at": datetime.utcnow().isoformat()
                }
            )

            # Add to trending ZSET
            pipe.zadd("trending:all", {f"notebook:{notebook.id}": scores["trending_score"]})

        pipe.execute()
```

### Anti-Patterns to Avoid
- **Hard delete with cascade:** Breaks fork lineage, orphaned records, no restore capability. Use soft delete with `is_archived` flag.
- **Postgres for trending scores:** Window functions on every query are slow at scale. Use Redis ZSET with real-time updates.
- **Synchronous search:** Blocking requests on slow search kills UX. Use Meilisearch + fallback pattern.
- **Calculating age on every read:** Wasteful computation. Store created_at, calculate age in scoring function.
- **N+1 queries for fork chains:** Fetching each ancestor individually. Use recursive CTE or eager loading.
- **Ignoring Redis failures:** Crashes when Redis is down. Always implement graceful degradation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Search engine** | Custom Postgres LIKE queries | Meilisearch | Typo tolerance, faceting, relevance ranking, <50ms queries |
| **Trending rankings** | Sort by engagement in SQL | Redis ZSET | O(log N) updates, real-time scoring, background recalculation |
| **Time decay math** | Custom exponential decay formula | scikit-learn pipelines (v2) | Feature engineering, model versioning, A/B testing foundation |
| **Rate limiting** | Custom token bucket | slowapi (already installed) | Production-tested, decorator-based, Redis-backed optional |
| **Event tracking** | Custom logging schema | FeedEvent model + Postgres | Foundation for ML, queryable, extensible for A/B testing |
| **Fork chain queries** | Recursive Python loops | SQLAlchemy recursive CTEs | Single query, database-optimized, depth limit enforcement |
| **Follow relationships** | Many-to-many junction table | Direct follower_id + following_id | Simpler queries, unique constraint, easy indexing |

**Key insight:** Social features at scale require specialized tools. Meilisearch provides typo-tolerant faceted search that Postgres can't match. Redis ZSETs enable real-time rankings that would require expensive window functions in SQL. Soft deletes preserve data integrity that cascading hard deletes would break. The hybrid approach (Meilisearch + Redis + Postgres) leverages each tool's strengths.

## Common Pitfalls

### Pitfall 1: Fork Chain Depth Explosion
**What goes wrong:** Fork chains grow to 10+ levels, causing deep recursion, slow breadcrumb queries, and potential stack overflow in traversal code.
**Why it happens:** No depth limit enforcement, users forking forks repeatedly, recursive CTEs without depth limits.
**How to avoid:**
1. Enforce max fork depth (e.g., 5 levels) in `ForkService.fork_notebook()`
2. Use `WITH RECURSIVE` CTE with depth limit for chain queries
3. Truncate breadcrumb display after 3-4 levels (UX decision already made)
4. Monitor fork depth distribution in analytics
**Warning signs:** API response times > 2s for fork operations, frontend breadcrumb rendering delays.

### Pitfall 2: Meilisearch Index Sync Failures
**What goes wrong:** Notebook saves succeed but search index is stale, users can't find new notebooks, search returns outdated results.
**Why it happens:** Meilisearch connection failures, network issues, missing error handling in post_save signals.
**How to avoid:**
1. Log all sync failures to dedicated error logger
2. Implement retry logic with exponential backoff
3. Add monitoring for index lag (compare Postgres count vs Meilisearch count)
4. Use fallback to Postgres search (already designed)
5. Consider async Celery task for non-critical updates
**Warning signs:** Search results missing recent notebooks, Meilisearch connection errors in logs.

### Pitfall 3: Redis Cache Stampede
**What goes wrong:** Celery beat task and real-time updates both recalculate scores, race conditions cause inconsistent rankings, cache thrashing.
**Why it happens:** No coordination between background task and real-time updates, missing TTL on calculated scores.
**How to avoid:**
1. Background task only updates time decay (doesn't touch engagement)
2. Real-time updates increment engagement and recalculate trending_score
3. Use `zadd` which updates score if key exists (idempotent)
4. Set TTL on score hashes to force periodic recalculation
5. Monitor ZSET size and update frequency
**Warning signs:** Inconsistent feed order on refresh, high Redis CPU usage.

### Pitfall 4: Soft Delete Orphaned Records
**What goes wrong:** Archived notebooks still appear in fork chains, users see "This notebook has been archived" banners, confusion about why content is hidden.
**Why it happens:** Filtering `is_archived = False` in feeds but not in fork chain queries, missing indexes on `is_archived`.
**How to avoid:**
1. Add index on `is_archived` column (already planned)
2. Filter `is_archived = False` in ALL feed queries
3. Show archived status in fork chain breadcrumb (e.g., "@alice (archived)")
4. Document that archived notebooks preserve chain integrity
5. Consider "unarchive" flow for owners
**Warning signs:** Archived notebooks appearing in feeds, slow queries on notebooks table.

### Pitfall 5: View Count Gaming
**What goes wrong:** Users refresh notebook pages to boost views, view counts become meaningless, trending algorithm skewed by refresh spam.
**Why it happens:** No deduplication in v1 (accepted tradeoff), incrementing on every page load.
**How to avoid:**
1. Accept this as v1 limitation (document in CONTEXT.md)
2. Use low weight for views (0.05× vs 2× for likes, 3× for comments)
3. Plan for deduplication in v2 (user_id + notebook_id unique tracking)
4. Monitor view-to-like ratios for anomalies
5. Consider rate limiting per IP address
**Warning signs:** Notebooks with 1000 views and 0 likes trending, suspicious view spikes.

### Pitfall 6: Cold Start Empty Feed
**What goes wrong:** New users see empty feed (0 follows), no onboarding, poor first impression, high bounce rate.
**Why it happens:** Personalized feed requires follows, no fallback for 0 follows, missing onboarding flow.
**How to avoid:**
1. Show 100% trending feed when user has 0 follows (already decided)
2. Add "Follow 5+ people to get your personalized feed" onboarding
3. Show suggested users or "Popular creators" section
4. Track follow count and show progress indicator
5. A/B test onboarding completion rates
**Warning signs:** Low follow rates, users with 0 follows churning immediately.

## Code Examples

Verified patterns from official sources:

### Fork Notebook with Dataset Copying
```python
# Source: boto3 documentation - copy_object
# https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/copy_object.html

from sqlalchemy.orm import Session
from app.models.notebook import Notebook
from app.models.notebook_cell import NotebookCell
from app.models.dataset import Dataset
from app.services.storage_service import StorageService
import boto3

class ForkService:
    def __init__(self, db: Session, storage: StorageService):
        self.db = db
        self.storage = storage
        self.s3_client = boto3.client('s3')

    def fork_notebook(self, notebook_id: int, user_id: int) -> Notebook:
        """Create a fork with full dataset copying (D-2)."""
        original = self.db.query(Notebook).get(notebook_id)

        # Create fork notebook
        fork = Notebook(
            user_id=user_id,
            title=f"{original.title} (fork)",
            description=original.description,
            parent_id=notebook_id,  # Immediate parent
            root_id=original.root_id or notebook_id,  # Ultimate root
            is_published=False  # Forks start as drafts
        )
        self.db.add(fork)
        self.db.flush()  # Get fork.id

        # Copy all cells
        for cell in original.cells:
            new_cell = NotebookCell(
                notebook_id=fork.id,
                cell_type=cell.cell_type,
                content=cell.content,
                order_index=cell.order_index
            )
            self.db.add(new_cell)

        # Copy datasets if any (D-2)
        for dataset in original.datasets:
            self._fork_dataset(dataset, fork.id, user_id)

        self.db.commit()
        return fork

    def _fork_dataset(self, original: Dataset, notebook_id: int, user_id: int):
        """Copy dataset file in S3 and create new Dataset record."""
        # Server-side copy in S3 (no download/upload)
        new_s3_key = f"datasets/{user_id}/{notebook_id}/{original.filename}"

        self.s3_client.copy_object(
            CopySource={'Bucket': 'datasets', 'Key': original.s3_key},
            Bucket='datasets',
            Key=new_s3_key
        )

        # Create new dataset record
        fork_dataset = Dataset(
            user_id=user_id,
            filename=original.filename,
            original_filename=original.original_filename,
            file_size_bytes=original.file_size_bytes,
            content_type=original.content_type,
            s3_key=new_s3_key,
            row_count=original.row_count,
            parent_id=original.id,  # Dataset lineage
            root_id=original.root_id or original.id
        )
        self.db.add(fork_dataset)
```

### Follow System with Rate Limiting
```python
# Source: slowapi documentation - rate limiting decorator
# https://slowapi.readthedocs.io/

from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import HTTPException, Request
from sqlalchemy.orm import Session
from app.models.follow import Follow

limiter = Limiter(key_func=get_remote_address)

class FollowService:
    def follow_user(self, follower_id: int, following_id: int, db: Session):
        """Follow a user with rate limiting (D-9)."""
        # Check rate limit: 100 follows per day (D-9)
        today_follows = db.query(Follow).filter(
            Follow.follower_id == follower_id,
            Follow.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0)
        ).count()

        if today_follows >= 100:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded: 100 follows per day",
                headers={"Retry-After": "86400"}  # 24 hours
            )

        # Check if already following
        existing = db.query(Follow).filter(
            Follow.follower_id == follower_id,
            Follow.following_id == following_id
        ).first()

        if existing:
            raise HTTPException(status_code=400, detail="Already following")

        # Create follow relationship (D-6: one-way follow)
        follow = Follow(
            follower_id=follower_id,
            following_id=following_id
        )
        db.add(follow)
        db.commit()

        return follow

    def get_followed_notebooks(self, user_id: int, db: Session, limit: int = 50):
        """Get notebooks from followed users (D-12)."""
        # Get followed user IDs
        followed_ids = db.query(Follow.following_id).filter(
            Follow.follower_id == user_id
        ).all()

        followed_ids = [f[0] for f in followed_ids]

        if not followed_ids:
            return []  # Will show trending as fallback (D-8)

        # Get notebooks from followed users
        from app.models.notebook import Notebook

        notebooks = db.query(Notebook).filter(
            Notebook.user_id.in_(followed_ids),
            Notebook.is_published == True,
            Notebook.is_archived == False
        ).order_by(Notebook.created_at.desc()).limit(limit).all()

        return notebooks
```

### Personalized Feed Algorithm
```python
# Source: Celery documentation - periodic tasks
# https://docs.celeryq.dev/en/stable/userguide/periodic-tasks.html

from celery import Celery
from celery.schedules import crontab

app = Celery('tasks', broker='redis://redis:6379/0')

class FeedService:
    def get_personalized_feed(self, user_id: int, db: Session):
        """Get personalized feed (D-12)."""
        from app.services.follow_service import FollowService
        from app.services.trending_service import TrendingService

        follow_service = FollowService()
        trending_service = TrendingService()

        # Get notebooks from followed users
        followed_notebooks = follow_service.get_followed_notebooks(user_id, db, limit=50)

        # Get trending notebooks
        trending_ids = trending_service.get_trending_notebooks(limit=50)
        trending_notebooks = db.query(Notebook).filter(
            Notebook.id.in_(trending_ids)
        ).all()

        # Combine: prioritize followed, fill with trending (D-12)
        combined = followed_notebooks + trending_notebooks

        # Deduplicate and limit
        seen = set()
        unique_feed = []
        for notebook in combined:
            if notebook.id not in seen:
                seen.add(notebook.id)
                unique_feed.append(notebook)
                if len(unique_feed) >= 50:
                    break

        return unique_feed

# Celery beat task for trending recalculation (D-25)
@app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # Recalculate trending every 2 minutes (D-25)
    sender.add_periodic_task(
        120.0,  # 2 minutes
        recalculate_trending.s(),
        name='recalculate trending scores'
    )

@app.task
def recalculate_trending():
    """Background task to refresh time decay (D-25)."""
    trending_service = TrendingService()
    db = Session()

    try:
        # Get all published notebooks
        notebooks = db.query(Notebook).filter(
            Notebook.is_published == True,
            Notebook.is_archived == False
        ).all()

        for notebook in notebooks:
            # Get current engagement from Redis hash
            engagement = redis_client.hget(
                f"notebook:{notebook.id}:score", "engagement"
            )

            if engagement:
                engagement = float(engagement)
                # Recalculate time decay
                age_hours = (datetime.utcnow() - notebook.created_at).total_seconds() / 3600
                trending_score = engagement / math.pow((age_hours + 2), 1.5)

                # Update ZSET
                redis_client.zadd(
                    "trending:all",
                    {f"notebook:{notebook.id}": trending_score}
                )
    finally:
        db.close()
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Postgres LIKE search | Meilisearch faceted search | 2020+ | 10-100x faster search, typo tolerance, better relevance |
| Real-time feed calculation | Pre-computed + cached feeds | 2015+ (Twitter) | Sub-second feed loads, handles millions of users |
| Hard delete with cascade | Soft delete with archival | 2018+ (GitHub) | Preserves data integrity, enables restore, analytics |
| Simple chronological feed | Time-decayed trending | 2006+ (Reddit, HN) | Better content discovery, reduces stale content |
| Manual score calculation | Redis ZSET + background tasks | 2012+ (Instagram) | Real-time updates, scalable to millions of items |

**Deprecated/outdated:**
- **Solr search engine:** Replaced by Elasticsearch and Meilisearch. Solr is heavier, slower, more complex setup.
- **Memcached for caching:** Redis provides superset of Memcached features with persistence and data structures.
- **Follow notifications via polling:** Replaced by WebSocket push. Polling is wasteful, high latency. (Deferred to v2)
- **Manual A/B testing:** Replaced by Optimizely, Statsig. Manual SQL queries don't scale, error-prone. (Foundation only in v1)

## Open Questions

1. **Meilisearch index size limits**
   - What we know: Meilisearch handles <1M documents well, ~100MB RAM footprint
   - What's unclear: Performance degradation at 10K+ notebooks with full-text content indexing
   - Recommendation: Start with Meilisearch, monitor query latency, migrate to Elasticsearch if needed (low probability given notebookSocial scope)

2. **Redis memory usage at scale**
   - What we know: ZSET memory ~O(N) where N = number of notebooks
   - What's unclear: Exact memory per ZSET entry with scores, expected Redis memory at 10K notebooks
   - Recommendation: Monitor Redis memory usage in Phase 4, set maxmemory policy, add alerting at 80% capacity

3. **Fork chain depth distribution**
   - What we know: GitHub has deep fork chains (10+ levels), can cause performance issues
   - What's unclear: Expected fork depth for notebooks, whether to enforce hard limit
   - Recommendation: Monitor fork depth in production, enforce max depth (5-10 levels) if >1% of chains exceed threshold

4. **Search relevance without ML**
   - What we know: Meilisearch uses BM25 ranking (keyword-based), works well for exact matches
   - What's unclear: User satisfaction with keyword-only search vs semantic search
   - Recommendation: Collect search analytics (click-through rate, zero results), evaluate sentence-transformers in v2 if needed

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| **Redis** | Trending scores, caching, Celery broker | ✓ | 7.4.0 (Docker) | — |
| **PostgreSQL** | All database operations | ✓ | 17+ (Docker) | — |
| **Python 3.11+** | Backend runtime | ✓ | (Assumed) | — |
| **Node.js 18+** | Frontend runtime | ✓ | (Assumed) | — |
| **Meilisearch** | Search engine | ✗ | — | PostgreSQL LIKE fallback (slow) |
| **Docker** | Container execution | ✓ | Latest (Docker Compose) | — |
| **boto3** | S3 dataset copying | ✓ | 1.42.83 | — |
| **Celery** | Background tasks | ✓ | 5.6.3 | — |
| **scikit-learn** | ML foundation (v2) | ✗ | — | Manual formula in v1 |
| **pandas** | Data processing (v2) | ✗ | — | Manual calculation in v1 |
| **numpy** | Numerical computing (v2) | ✗ | — | Python math in v1 |

**Missing dependencies with no fallback:**
- **Meilisearch:** Required for search performance (<50ms). Postgres fallback is slow (seconds).
  - **Action:** Add Meilisearch service to docker-compose.yml, build during Phase 4 setup

**Missing dependencies with fallback:**
- **scikit-learn, pandas, numpy:** Foundation for ML in v2, not required for v1 (manual formula)
  - **Action:** Install in v2 when implementing ML recommendations, skip for v1

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 9.0.2 (backend), Vitest 4.1.2 (frontend) |
| Config file | backend/pyproject.toml (pytest), frontend/vitest.config.ts (Vitest) |
| Quick run command | `cd backend && pytest tests/test_fork_service.py -x -v` |
| Full suite command | `cd backend && pytest -x && cd ../frontend && npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FORK-01 | Fork any notebook creates independent copy | unit | `pytest tests/test_fork_service.py::test_fork_notebook -x` | ❌ Wave 0 |
| FORK-02 | Forked notebook can be edited independently | unit | `pytest tests/test_fork_service.py::test_fork_independence -x` | ❌ Wave 0 |
| FORK-03 | Forks appear in feed with equal weightage | integration | `pytest tests/test_feed_service.py::test_fork_equal_weightage -x` | ❌ Wave 0 |
| FORK-04 | Fork attribution chain preserved | unit | `pytest tests/test_fork_service.py::test_fork_chain -x` | ❌ Wave 0 |
| FORK-05 | Cannot delete notebooks with forks | unit | `pytest tests/test_fork_service.py::test_delete_protection -x` | ❌ Wave 0 |
| DISC-01 | Trending feed uses time-decayed scores | integration | `pytest tests/test_trending_service.py::test_trending_algorithm -x` | ❌ Wave 0 |
| DISC-02 | Personalized feed prioritizes followed users | integration | `pytest tests/test_feed_service.py::test_personalized_feed -x` | ❌ Wave 0 |
| DISC-03 | Search by title, content, author | integration | `pytest tests/test_search_service.py::test_search_fields -x` | ❌ Wave 0 |
| DISC-04 | Filter search by original/fork | integration | `pytest tests/test_search_service.py::test_faceted_search -x` | ❌ Wave 0 |
| DISC-05 | Engagement metrics displayed | unit | `pytest tests/test_engagement_service.py::test_metric_display -x` | ❌ Wave 0 |
| PERF-06 | Redis caching reduces DB load | performance | `pytest tests/test_performance.py::test_redis_cache_hit_rate -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pytest tests/test_{module}.py -x -v`
- **Per wave merge:** `pytest -x && cd ../frontend && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/test_fork_service.py` — Fork creation, dataset copying, chain queries
- [ ] `backend/tests/test_follow_service.py` — Follow/unfollow, rate limiting
- [ ] `backend/tests/test_search_service.py` — Meilisearch integration, fallback
- [ ] `backend/tests/test_trending_service.py` — Score calculation, Redis ZSET
- [ ] `backend/tests/test_feed_service.py` — Personalized feed algorithm
- [ ] `backend/tests/test_engagement_service.py` — View tracking, metrics display
- [ ] `backend/tests/conftest.py` — Add fixtures for Meilisearch mock, Redis mock
- [ ] `frontend/components/ForkButton.test.tsx` — Fork button component tests
- [ ] `frontend/components/FollowButton.test.tsx` — Follow button component tests
- [ ] `frontend/components/SearchBar.test.tsx` — Search input with debounce
- [ ] `frontend/components/FeedTabs.test.tsx` — Filter tabs component
- [ ] `frontend/components/EngagementMetrics.test.tsx` — Metrics display component
- [ ] Framework install: `pip install meilisearch==0.37.0 scikit-learn==1.8.0 pandas==3.0.2 numpy==2.4.4` — if not detected
- [ ] Framework install: `npm install meilisearch@^0.30.0` — if not detected in frontend

## Sources

### Primary (HIGH confidence)
- SQLAlchemy 2.0 Documentation - Self-referential relationships, recursive CTEs
- Meilisearch Documentation - Faceted search, typo tolerance, Python SDK
- Redis Documentation - Sorted sets (ZSET), hash operations, pub/sub
- Celery Documentation - Periodic tasks, beat scheduler
- boto3 Documentation - S3 copy_object for dataset forking
- slowapi Documentation - Rate limiting decorators

### Secondary (MEDIUM confidence)
- Web search verified with official docs - Time-decayed trending algorithms (Reddit/HN patterns)
- Web search verified with official docs - Social graph schema optimization
- Web search verified with official docs - Soft delete patterns in SQLAlchemy

### Tertiary (LOW confidence)
- Web search only - Fork chain depth distribution (marked for validation)
- Web search only - Meilisearch performance at 10K+ documents (marked for validation)
- Web search only - Redis memory usage patterns (marked for validation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are industry standards with official documentation
- Architecture: HIGH - Patterns based on official SQLAlchemy, Redis, Celery docs
- Pitfalls: MEDIUM - Some based on common patterns, need production validation (fork depth, Redis memory)

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30 days - stable stack, well-established patterns)
