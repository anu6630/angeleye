# Architecture Patterns

**Domain:** Social Python Notebook Platform
**Researched:** 2026-04-02

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USERS                                          │
│                    (Browsers & Mobile Apps)                                  │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CDN (CloudFront/Edge)                                │
│  - Static assets (JS, CSS)                                                    │
│  - Pre-rendered notebook outputs (charts, images, videos)                    │
│  - Cached feed responses (stale-while-revalidate)                            │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
┌─────────────────────────────┐  ┌─────────────────────────────┐
│      NEXT.JS FRONTEND       │  │    API GATEWAY/LOAD BALANCE │
│  (pages/, components/,      │  │       (AWS ALB / Nginx)     │
│   public/, app/)           │  └──────────────┬──────────────┘
│                             │                 │
│  - Instagram-style feed     │                 │
│  - Notebook viewer          │                 ▼
│  - Notebook editor (Pyodide)│  ┌──────────────────────────────────────┐
│  - Auth pages               │  │         FASTAPI BACKEND              │
│  - User profile             │  │  (app/, api/, models/, services/)    │
│  - OAuth callbacks          │  │                                      │
│                             │  │  ┌────────────┐  ┌────────────┐     │
│  State Management:          │  │  │ Auth API   │  │ Feed API   │     │
│  - React Context/Redux      │  │  └─────┬──────┘  └─────┬──────┘     │
│  - SWR/React Query          │  │        │                │            │
└─────────────────────────────┘  │        ▼                ▼            │
                                 │  ┌────────────┐  ┌────────────┐     │
                                 │  │ Notebook   │  │ User API   │     │
                                 │  │ API        │  │            │     │
                                 │  └─────┬──────┘  └─────┬──────┘     │
                                 │        │                │            │
                                 │        ▼                ▼            │
                                 │  ┌────────────────────────────┐      │
                                 │  │     SERVICE LAYER           │      │
                                 │  │  ┌──────────┐  ┌─────────┐  │      │
                                 │  │  │ Execution│  │  Social  │  │      │
                                 │  │  │ Service  │  │  Service │  │      │
                                 │  │  └────┬─────┘  └────┬────┘  │      │
                                 │  │       │             │        │      │
                                 │  │       ▼             ▼        │      │
                                 │  │  ┌─────────────────────────┐  │      │
                                 │  │  │     ML/Recommendation    │  │      │
                                 │  │  │        Service           │  │      │
                                 │  │  └─────────────────────────┘  │      │
                                 │  └──────────────┬───────────────┘      │
                                 └─────────────────┼──────────────────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    │                              │                              │
                    ▼                              ▼                              ▼
        ┌───────────────────┐          ┌───────────────────┐          ┌───────────────────┐
        │     REDIS         │          │   POSTGRESQL      │          │      MINIO        │
        │  (Cache & Queue)  │          │  (Relational DB)  │          │  (Object Storage) │
        │                   │          │                   │          │                   │
        │  - Feed cache     │          │  - Users          │          │  - Datasets       │
        │  - Session store  │          │  - Notebooks      │          │  - Notebook files │
        │  - Job queue      │          │  - Forks          │          │  - Output assets   │
        │  - Rate limiting  │          │  - Likes/comments  │          │  - Static files    │
        └───────────────────┘          └───────────────────┘          └───────────────────┘
                    │
                    ▼
        ┌──────────────────────────────────────────────────────────────────────────┐
        │                  NOTEBOOK EXECUTION CLUSTER                             │
        │              (Docker Compose / AWS ECS / Kubernetes)                    │
        │                                                                          │
        │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
        │   │   Worker 1  │  │   Worker 2  │  │   Worker 3  │  │   Worker N  │   │
        │   │  (Container) │  │  (Container) │  │  (Container) │  │  (Container) │   │
        │   │             │  │             │  │             │  │             │   │
        │   │ - Jupyter   │  │ - Jupyter   │  │ - Jupyter   │  │ - Jupyter   │   │
        │   │ - Python    │  │ - Python    │  │ - Python    │  │ - Python    │   │
        │   │ - Pandas    │  │ - Pandas    │  │ - Pandas    │  │ - Pandas    │   │
        │   │ - Matplotlib│  │ - Matplotlib│  │ - Matplotlib│  │ - Matplotlib│   │
        │   │ - Isolated  │  │ - Isolated  │  │ - Isolated  │  │ - Isolated  │   │
        │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
        │          │                │                │                │          │
        └──────────┼────────────────┼────────────────┼────────────────┼──────────┘
                   │                │                │                │
                   └────────────────┴────────────────┴────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────────┐
                        │   OUTPUT PROCESSING       │
                        │                           │
                        │  - Extract plots          │
                        │  - Capture images         │
                        │  - Generate videos        │
                        │  - Create HTML render     │
                        └───────────┬───────────────┘
                                    │
                                    ▼
                        ┌───────────────────────────┐
                        │   CDN UPLOAD              │
                        │   (Upload to CloudFront)  │
                        └───────────────────────────┘

External Services:
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Google OAuth   │  │ Facebook OAuth  │  │   ML Service    │
│                 │  │                 │  │ (AWS SageMaker  │
│  - User auth    │  │  - User auth    │  │  or external)   │
│  - Token mgmt   │  │  - Token mgmt   │  │  - Feed ranking │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Component Boundaries

### Frontend (Next.js Application)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Pages Layer** (`app/`, `pages/`) | Route handlers, page composition | API routes, services |
| **Components Layer** (`components/`) | Reusable UI components | Pages, state management |
| **State Management** | Global app state (auth, feed, notebooks) | Components, API |
| **API Client** | HTTP client with auth, error handling | Backend API, CDN |
| **WASM Editor** | Pyodide-based notebook editor | Browser APIs, storage |

**Tech Stack:**
- Next.js 14+ (App Router preferred)
- React 18+
- TypeScript
- Tailwind CSS / shadcn/ui
- Pyodide (WASM Python runtime)
- SWR or React Query (data fetching)
- Zustand or Redux Toolkit (state management)
- Auth0 or NextAuth.js (OAuth integration)

**Key Responsibilities:**
1. **Feed Rendering**: Infinite scroll, lazy loading, cached feed items
2. **Notebook Viewer**: Display pre-rendered outputs from CDN
3. **Notebook Editor**: WASM-based offline editing with Pyodide
4. **Authentication**: OAuth flow (Google, Facebook)
5. **User Interactions**: Like, comment, fork, share
6. **Responsive Design**: Mobile-first Instagram-like UI

**API Contracts (Frontend → Backend):**
```typescript
// Authentication
POST /api/v1/auth/google/callback
POST /api/v1/auth/facebook/callback
GET /api/v1/auth/me
POST /api/v1/auth/logout

// Feed
GET /api/v1/feed?page=1&limit=20
GET /api/v1/feed/trending?page=1&limit=20

// Notebooks
GET /api/v1/notebooks
GET /api/v1/notebooks/:id
POST /api/v1/notebooks
PUT /api/v1/notebooks/:id
DELETE /api/v1/notebooks/:id
POST /api/v1/notebooks/:id/compile
POST /api/v1/notebooks/:id/publish

// Forks
POST /api/v1/notebooks/:id/fork
GET /api/v1/notebooks/:id/forks

// Interactions
POST /api/v1/notebooks/:id/like
DELETE /api/v1/notebooks/:id/like
GET /api/v1/notebooks/:id/comments
POST /api/v1/notebooks/:id/comments

// Datasets
POST /api/v1/datasets/upload
GET /api/v1/datasets/:id/download
```

### Backend API (FastAPI Services)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Auth Service** | OAuth, JWT tokens, session management | Google/Facebook APIs, Redis, PostgreSQL |
| **Feed Service** | Feed generation, pagination, filtering | ML Service, Redis, PostgreSQL |
| **Notebook Service** | CRUD operations, version control | PostgreSQL, MinIO, Execution Service |
| **Social Service** | Likes, comments, follows, analytics | PostgreSQL, Redis |
| **Execution Service** | Job queue, worker management | Redis, Execution Cluster |
| **ML Service** | Feed ranking, trending, recommendations | PostgreSQL, Redis, ML models |
| **Storage Service** | File upload/download, CDN sync | MinIO, CDN |

**Tech Stack:**
- FastAPI (Python 3.11+)
- Pydantic (data validation)
- SQLAlchemy (ORM) / asyncpg
- Redis (caching, queue)
- Celery / BackgroundTasks (async jobs)
- PyJWT (JWT tokens)
- python-multipart (file uploads)
- httpx (HTTP client for external APIs)

**Project Structure:**
```
backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py
│   │   │   │   ├── feed.py
│   │   │   │   ├── notebooks.py
│   │   │   │   ├── forks.py
│   │   │   │   ├── interactions.py
│   │   │   │   └── datasets.py
│   │   │   └── router.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   ├── dependencies.py
│   │   └── exceptions.py
│   ├── models/
│   │   ├── user.py
│   │   ├── notebook.py
│   │   ├── fork.py
│   │   ├── like.py
│   │   ├── comment.py
│   │   └── dataset.py
│   ├── schemas/
│   │   ├── user.py
│   │   ├── notebook.py
│   │   ├── fork.py
│   │   ├── like.py
│   │   └── comment.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── feed_service.py
│   │   ├── notebook_service.py
│   │   ├── social_service.py
│   │   ├── execution_service.py
│   │   ├── ml_service.py
│   │   └── storage_service.py
│   ├── workers/
│   │   ├── compilation_worker.py
│   │   ├── feed_refresh_worker.py
│   │   └── ml_training_worker.py
│   ├── db/
│   │   ├── session.py
│   │   ├── base.py
│   │   └── init_db.py
│   └── main.py
├── tests/
│   ├── api/
│   ├── services/
│   └── conftest.py
├── alembic/
├── Dockerfile
├── requirements.txt
└── docker-compose.yml
```

**Service Communication Patterns:**

1. **Synchronous (HTTP):**
   - Frontend → Backend API
   - Internal microservices (auth, notebook, social)
   - External APIs (OAuth, ML service)

2. **Asynchronous (Redis Queue):**
   - Notebook compilation jobs
   - Feed refresh tasks
   - ML model training
   - CDN cache invalidation

### Notebook Execution Service

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Job Queue** | Accept compilation requests, manage priorities | Backend API, Workers |
| **Worker Pool** | Execute notebooks in isolated containers | Docker API, K8s API |
| **Resource Manager** | Allocate CPU/GPU/memory, enforce limits | Container orchestration |
| **Output Processor** | Extract plots, images, videos from output | MinIO, CDN |
| **Security Manager** | Sandbox isolation, timeout enforcement | Container runtime |

**Execution Flow:**

1. **Job Submission:**
   ```
   Frontend → Backend API → Redis Queue (compilation_queue)
   ```

2. **Worker Processing:**
   ```
   Redis Queue → Celery Worker → Docker Container → Jupyter Kernel
   ```

3. **Output Processing:**
   ```
   Container Output → Output Processor → MinIO → CDN Upload
   ```

4. **Result Callback:**
   ```
   Worker → Backend API (update status) → Frontend (WebSocket/Webhook)
   ```

**Worker Container Image:**
```dockerfile
FROM python:3.11-slim

# Install Jupyter and common data science packages
RUN pip install --no-cache-dir \
    jupyter \
    notebook \
    ipywidgets \
    numpy \
    pandas \
    matplotlib \
    seaborn \
    plotly \
    scikit-learn \
    tensorflow \
    torch

# Install notebook-specific packages
RUN pip install --no-cache-dir \
    nbconvert \
    nbformat \
    ipykernel

# Security: Run as non-root user
RUN useradd -m -u 1000 notebookuser
USER notebookuser
WORKDIR /home/notebookuser

EXPOSE 8888
CMD ["jupyter", "notebook", "--ip=0.0.0.0", "--port=8888", "--no-browser", "--allow-root"]
```

**Isolation Strategies:**
1. **Container Sandboxing**: Each execution in separate container
2. **Resource Limits**: CPU, memory, timeout constraints
3. **Network Isolation**: No outbound internet (except whitelisted)
4. **Filesystem Isolation**: Ephemeral storage, no persistence
5. **Security Scanning**: Vulnerability scans on base images

### Storage Layer

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **MinIO Server** | S3-compatible object storage | Backend API, Workers |
| **CDN (CloudFront)** | Global edge delivery of static content | Frontend, Users |
| **Database Backups** | Automated backups, point-in-time recovery | PostgreSQL |

**Storage Organization:**

```
MinIO Buckets:
├── notebooks/          # Raw .ipynb files
│   ├── {notebook_id}/
│   │   ├── original.ipynb
│   │   └── versions/
│   │       ├── v1.ipynb
│   │       └── v2.ipynb
├── datasets/          # User-uploaded CSV files
│   ├── {dataset_id}.csv
│   └── {dataset_id}_preview.csv
├── outputs/           # Compiled notebook outputs
│   ├── {notebook_id}/
│   │   ├── render.html
│   │   ├── plots/
│   │   │   ├── plot_1.png
│   │   │   └── plot_2.png
│   │   ├── images/
│   │   └── videos/
└── assets/            # Static assets (logos, default images)

CDN Distribution:
├── /outputs/*         # Pre-rendered notebook outputs
├── /assets/*          # Static assets
└── /datasets/*        # Public datasets (optional)
```

**CDN Cache Strategy:**
- **TTL**: 1 hour for feed, 24 hours for outputs
- **Cache Invalidation**: On publish, update, delete
- **Stale-While-Revalidate**: Serve stale while refreshing
- **Edge Computing**: Generate feed at edge when possible

### Database Layer (PostgreSQL)

| Schema Area | Tables | Purpose |
|-------------|--------|---------|
| **Users** | users, oauth_providers | Authentication, profiles |
| **Notebooks** | notebooks, notebook_versions | Notebook storage, versioning |
| **Social** | likes, comments, follows | User interactions |
| **Forks** | forks, fork_chains | Fork relationships |
| **Analytics** | views, engagement_metrics | Usage tracking |
| **System** | jobs, audit_logs | Background jobs, audit trail |

**Schema Overview:**

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- OAuth Providers
CREATE TABLE oauth_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'facebook'
    provider_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    UNIQUE(provider, provider_id)
);

-- Notebooks
CREATE TABLE notebooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    file_path TEXT, -- MinIO path
    output_path TEXT, -- CDN path
    compilation_status VARCHAR(50) DEFAULT 'pending', -- pending, compiling, success, failed
    compilation_error TEXT,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    fork_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    published_at TIMESTAMP
);

CREATE INDEX idx_notebooks_user ON notebooks(user_id);
CREATE INDEX idx_notebooks_published ON notebooks(is_published, published_at DESC);
CREATE INDEX idx_notebooks_public ON notebooks(is_public, published_at DESC);

-- Forks
CREATE TABLE forks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
    child_notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
    forked_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(parent_notebook_id, child_notebook_id)
);

-- Likes
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, notebook_id)
);

CREATE INDEX idx_likes_notebook ON likes(notebook_id);

-- Comments
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_comments_notebook ON comments(notebook_id);

-- Datasets
CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_path TEXT, -- MinIO path
    file_size BIGINT,
    row_count INTEGER,
    column_count INTEGER,
    preview_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Background Jobs
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL, -- 'compile', 'feed_refresh', 'ml_train'
    notebook_id UUID REFERENCES notebooks(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
    result JSONB,
    error TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_notebook ON jobs(notebook_id);

-- Views (Analytics)
CREATE TABLE views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_views_notebook ON views(notebook_id, viewed_at DESC);
```

### Cache/Queue Layer (Redis)

| Use Case | Data Structure | TTL | Purpose |
|----------|---------------|-----|---------|
| **Feed Cache** | Sorted Set | 5-15 min | Cached feed pages for fast load |
| **Session Store** | Hash | 24 hours | User session data |
| **Rate Limiting** | String with TTL | 1 min-1 hour | API rate limiting |
| **Job Queue** | List | - | Compilation, ML tasks |
| **Trending Cache** | Sorted Set | 1 hour | Trending notebooks |
| **View Counters** | Counter | - | Real-time view tracking |
| **Like Counters** | Counter | - | Real-time like counting |

**Redis Key Patterns:**
```
# Feed
feed:user:{user_id}:page:{page} -> Hash
feed:global:page:{page} -> Hash
feed:trending:page:{page} -> Hash

# Sessions
session:{session_id} -> Hash

# Rate Limiting
ratelimit:user:{user_id}:{endpoint} -> String (counter)
ratelimit:ip:{ip}:{endpoint} -> String (counter)

# Job Queues
queue:compilation -> List
queue:feed_refresh -> List
queue:ml_train -> List

# Caching
notebook:{notebook_id} -> Hash (notebook metadata)
user:{user_id}:stats -> Hash (user statistics)

# Counters
counter:notebook:{notebook_id}:views -> String
counter:notebook:{notebook_id}:likes -> String
counter:user:{user_id}:followers -> String
```

### ML Service (Feed Algorithm)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Feature Extractor** | Extract features from notebooks, users, interactions | PostgreSQL |
| **Ranking Engine** | Score notebooks for feed ordering | Feature Extractor, ML Model |
| **Model Trainer** | Train/update ML models periodically | PostgreSQL, S3 (model storage) |
| **A/B Testing** | Test algorithm variations | Backend API |

**ML Features:**

**Notebook Features:**
- Engagement rate (likes / views)
- Freshness score (time since publish)
- Fork count (remixing activity)
- Comment count (discussion activity)
- View velocity (views per hour)
- Author authority (follower count, notebook quality)

**User Features:**
- Past engagement (liked, commented, forked)
- Following network
- Content preferences (topics, tags)
- Time of day patterns
- Device type

**Interaction Features:**
- Recency of interaction
- Type of interaction (like > view)
- Similarity to other users (collaborative filtering)

**Algorithm Options:**

1. **Hybrid Approach (Recommended for MVP):**
   - 60% engagement-based (likes, views, forks)
   - 30% freshness (recent content)
   - 10% personalization (user preferences)

2. **Machine Learning (Phase 2+):**
   - Gradient Boosting (XGBoost, LightGBM)
   - Neural Networks (for complex patterns)
   - Real-time inference with Redis

3. **Fork Equality:**
   - Forks get same weightage as originals
   - Track "remix chains" (who forked what)
   - Surface derivative work in feed

## Data Flow

### 1. User Creates Notebook → Preview → Compile → Publish

```
┌─────────────┐
│   User      │
│  (Browser)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  1. OPEN EDITOR (WASM-based, offline)                      │
│  ├─ Load Pyodide runtime                                   │
│  ├─ Initialize Python environment                           │
│  ├─ Load notebook templates                                 │
│  └─ User writes code in browser                             │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  2. LOCAL PREVIEW (Optional)                                │
│  ├─ Execute cells in Pyodide                                │
│  ├─ Show plots inline (limited to browser-compatible libs)  │
│  └─ User can test basic functionality                       │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  3. SAVE DRAFT                                               │
│  ├─ POST /api/v1/notebooks (draft=true)                     │
│  ├─ Backend saves .ipynb to MinIO                           │
│  └─ Store metadata in PostgreSQL                            │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  4. UPLOAD DATASETS (Optional)                              │
│  ├─ Upload CSV via frontend                                 │
│  ├─ POST /api/v1/datasets/upload                            │
│  ├─ Store in MinIO (datasets/)                              │
│  └─ Link to notebook                                        │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  5. REQUEST COMPILATION                                     │
│  ├─ POST /api/v1/notebooks/:id/compile                      │
│  ├─ Backend creates job in Redis queue                      │
│  └─ Returns job_id to frontend                              │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  6. ASYNC EXECUTION (Background)                           │
│  ├─ Celery worker picks up job                              │
│  ├─ Spin up Docker container with Jupyter                   │
│  ├─ Execute notebook in container                           │
│  ├─ Capture all outputs (plots, images, videos)             │
│  └─ Generate HTML render                                    │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  7. OUTPUT PROCESSING                                       │
│  ├─ Extract plots from output                               │
│  ├─ Convert to PNG/WEBP                                     │
│  ├─ Generate video from animations                          │
│  ├─ Create self-contained HTML render                       │
│  └─ Upload all to MinIO (outputs/)                         │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  8. CDN UPLOAD                                              │
│  ├─ Sync outputs to CDN (CloudFront)                        │
│  ├─ Generate CDN URLs                                        │
│  └─ Cache at edge locations                                  │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  9. UPDATE DATABASE                                          │
│  ├─ Update notebook status → 'success'                      │
│  ├─ Store output_path (CDN URL)                             │
│  ├─ Update compilation metrics                              │
│  └─ Invalidate relevant Redis caches                        │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  10. NOTIFY FRONTEND                                        │
│   ├─ WebSocket推送 or webhook                               │
│   ├─ Frontend shows "Compilation Complete"                  │
│   └─ Display preview of outputs                             │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  11. USER REVIEWS & PUBLISHES                              │
│   ├─ User views pre-rendered outputs                        │
│   ├─ Approves results                                       │
│   ├─ POST /api/v1/notebooks/:id/publish                    │
│   ├─ Backend sets is_published=true                         │
│   ├─ Trigger feed refresh job                               │
│   └─ Notebook appears in feed                              │
└─────────────────────────────────────────────────────────────┘
```

### 2. User Views Feed → Clicks Notebook → Loads from CDN

```
┌─────────────┐
│   User      │
│  (Browser)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  1. REQUEST FEED                                            │
│  ├─ GET /api/v1/feed?page=1&limit=20                       │
│  ├─ CDN edge checks cache                                   │
│  │   ├─ Cache HIT? → Return cached JSON (stale-while-reval)│
│  │   └─ Cache MISS? → Forward to backend                    │
└─────────────────────────────────────────────────────────────┘
       │
       ▼ (if cache miss)
┌─────────────────────────────────────────────────────────────┐
│  2. BACKEND PROCESSING                                      │
│  ├─ Check Redis for cached feed                            │
│  │   ├─ HIT? → Return cached                               │
│  │   └─ MISS? → Query ML Service + PostgreSQL              │
│  ├─ Generate feed with:                                     │
│  │   - Notebook metadata (title, author, stats)             │
│  │   - Thumbnail URL (from CDN)                             │
│  │   - Engagement metrics                                  │
│  └─ Cache in Redis (TTL: 5-15 min)                         │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  3. RENDER FEED                                             │
│  ├─ Frontend receives feed JSON                             │
│  ├─ Render Instagram-style grid/list                        │
│  ├─ Lazy load images from CDN                               │
│  └─ Infinite scroll for pagination                          │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  4. USER CLICKS NOTEBOOK                                    │
│  ├─ Navigate to /notebooks/{id}                             │
│  ├─ GET /api/v1/notebooks/:id                               │
│  ├─ Backend returns metadata + CDN URLs                     │
│  └─ Increment view counter (async)                          │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  5. LOAD PRE-RENDERED OUTPUT                                │
│  ├─ Request HTML render from CDN                            │
│  ├─ CDN edge serves from closest location                   │
│  ├─ Load assets (plots, images, videos) in parallel         │
│  └─ Display fully rendered notebook                         │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  6. USER INTERACTIONS (Async)                              │
│  ├─ Like → POST /api/v1/notebooks/:id/like                  │
│  ├─ Comment → POST /api/v1/notebooks/:id/comments           │
│  ├─ Fork → POST /api/v1/notebooks/:id/fork                  │
│  ├─ Share → Copy link / social share                        │
│  └─ All updates trigger cache invalidation                  │
└─────────────────────────────────────────────────────────────┘
```

### 3. User Forks Notebook → Creates Own Version → Publishes

```
┌─────────────┐
│   User      │
│  (Browser)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  1. REQUEST FORK                                            │
│  ├─ User viewing notebook X                                 │
│  ├─ Click "Fork" button                                     │
│  ├─ POST /api/v1/notebooks/:id/fork                        │
│  └─ Requires authentication (if not logged in → OAuth)     │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  2. CREATE FORK RECORD                                      │
│  ├─ Backend creates new notebook Y                          │
│  ├─ Copy .ipynb file from X to Y in MinIO                  │
│  ├─ Create fork record in PostgreSQL:                       │
│  │   parent_notebook_id = X                                 │
│  │   child_notebook_id = Y                                  │
│  ├─ Set Y.user_id = current user                           │
│  ├─ Increment X.fork_count                                 │
│  └─ Return new notebook Y to frontend                       │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  3. REDIRECT TO EDITOR                                      │
│  ├─ Frontend navigates to /notebooks/{Y_id}/edit           │
│  ├─ Load forked notebook in WASM editor                     │
│  ├─ Show "Forked from X" indicator                         │
│  └─ User can modify code, cells, metadata                  │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  4. EDIT & COMPILE (Same flow as new notebook)             │
│  ├─ User makes changes                                      │
│  ├─ Request compilation (full container execution)          │
│  ├─ Preview outputs                                         │
│  └─ Approve results                                         │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  5. PUBLISH FORK                                            │
│  ├─ POST /api/v1/notebooks/Y/publish                       │
│  ├─ Backend sets is_published=true                          │
│  ├─ Trigger feed refresh job                                │
│  └─ Fork appears in feed with EQUAL WEIGHTAGE               │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  6. FEED INTEGRATION                                        │
│  ├─ ML Service treats fork as independent notebook           │
│  ├─ Feed algorithm doesn't prioritize originals over forks  │
│  ├─ Track fork chain for analytics                          │
│  └─ Display "Forked from X" in feed card (optional)         │
└─────────────────────────────────────────────────────────────┘
```

### 4. ML Feed Generation Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. TRIGGER FEED REFRESH                                    │
│  ├─ Cron job (every 5-15 min)                              │
│  ├─ Or event-driven (on publish, fork, like)               │
│  ├─ Create job in Redis queue: feed_refresh                 │
│  └─ Worker picks up job                                     │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  2. FEATURE EXTRACTION                                      │
│  ├─ Query PostgreSQL for:                                   │
│  │   - All published notebooks                              │
│  │   - Engagement metrics (likes, views, forks)            │
│  │   - Temporal data (publish time)                         │
│  ├─ Calculate features:                                     │
│  │   - Engagement rate                                      │
│  │   - Freshness score                                      │
│  │   - Velocity score                                       │
│  │   - Authority score                                      │
│  └─ Store feature vectors                                   │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  3. RANKING                                                 │
│  ├─ Apply ranking algorithm:                                │
│  │   score = 0.6 * engagement + 0.3 * freshness + 0.1 * authority│
│  ├─ Sort notebooks by score                                 │
│  ├─ Apply diversification (avoid same author multiple times)│
│  └─ Generate ranked list                                    │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  4. PERSONALIZATION (Optional, Phase 2+)                    │
│  ├─ For authenticated users:                                │
│  │   - Get user's interaction history                        │
│  │   - Find similar users (collaborative filtering)         │
│  │   - Boost content from similar users                     │
│  │   - Boost content matching user's interests              │
│  ├─ Apply personalized re-ranking                           │
│  └─ Generate user-specific feed                            │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  5. CACHE FEED                                              │
│  ├─ Store feed in Redis:                                    │
│  │   - feed:global:page:{page} → Hash                      │
│  │   - feed:user:{user_id}:page:{page} → Hash              │
│  ├─ Set TTL: 5-15 minutes                                   │
│  └─ Include cache version for invalidation                  │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  6. SERVE REQUESTS                                          │
│  ├─ GET /api/v1/feed → Return cached feed                  │
│  ├─ GET /api/v1/feed/trending → Return top-ranked          │
│  └─ Cache miss triggers on-demand generation                │
└─────────────────────────────────────────────────────────────┘
```

## Component Boundaries and Communication

### API Contracts

**RESTful API Design:**
- Versioned: `/api/v1/`
- Resource-oriented: `/notebooks`, `/users`, `/feeds`
- HTTP methods: GET, POST, PUT, PATCH, DELETE
- Status codes: 200, 201, 400, 401, 403, 404, 500
- Pagination: `?page=1&limit=20`
- Sorting: `?sort=-published_at`
- Filtering: `?is_published=true&author=xxx`

**Authentication:**
- JWT tokens for API access
- OAuth 2.0 for social login
- Token refresh mechanism
- Optional auth for read-only access

**Error Handling:**
```python
# Standard error response
{
  "error": {
    "code": "NOTEBOOK_NOT_FOUND",
    "message": "Notebook with id xxx not found",
    "details": {...}
  }
}
```

### Internal Service Communication

**Synchronous (HTTP):**
```python
# Service A calls Service B
async def get_notebook_with_author(notebook_id: str):
    # Call Notebook Service
    notebook = await notebook_service.get(notebook_id)
    # Call User Service
    author = await user_service.get(notebook.user_id)
    return {**notebook.dict(), "author": author}
```

**Asynchronous (Redis Queue):**
```python
# Service A queues a job
await queue.enqueue("compile_notebook", notebook_id=xxx)

# Service B (Worker) processes job
@worker.task
async def compile_notebook(notebook_id: str):
    # Long-running task
    result = await execute_in_container(notebook_id)
    # Callback to Service A
    await notebook_service.update_status(notebook_id, "success")
```

**Event-Driven (Redis Pub/Sub):**
```python
# Service A publishes event
await pubsub.publish("notebook:published", {"notebook_id": xxx})

# Service B subscribes to events
async def on_notebook_published(event):
    await feed_service.refresh()
```

## Build Order Recommendations

### Phase 1: Foundation (Weeks 1-4)
**Dependencies:** None

**Components to Build:**
1. **Project Setup**
   - Initialize monorepo (frontend/, backend/)
   - Docker Compose configuration
   - Development environment setup
   - CI/CD pipeline

2. **Backend Foundation**
   - FastAPI project structure
   - PostgreSQL database setup
   - SQLAlchemy models & migrations
   - Redis connection & utilities
   - Basic API router & middleware

3. **Frontend Foundation**
   - Next.js project setup
   - Basic routing & layout
   - Auth pages (OAuth placeholders)
   - API client setup

4. **Infrastructure**
   - MinIO setup (local Docker)
   - Database seeding scripts
   - Basic error handling
   - Logging configuration

**Deliverables:**
- Working development environment
- Database schema defined
- Basic API structure
- Frontend shell

### Phase 2: Core User & Notebook Management (Weeks 5-8)
**Dependencies:** Phase 1

**Components to Build:**
1. **Authentication**
   - OAuth integration (Google, Facebook)
   - JWT token generation/verification
   - User registration/login flows
   - Session management (Redis)
   - Protected routes middleware

2. **Notebook CRUD**
   - Notebook API endpoints
   - MinIO integration for file storage
   - Version tracking (basic)
   - Draft vs published state

3. **Dataset Management**
   - Dataset upload API
   - CSV parsing & validation
   - MinIO storage
   - Preview generation (first N rows)

4. **Frontend Auth UI**
   - Login/signup pages
   - OAuth buttons
   - Protected route guards
   - User profile page

**Deliverables:**
- Users can sign up/login
- Users can create notebook drafts
- Users can upload datasets
- Notebooks stored in MinIO

### Phase 3: Notebook Execution (Weeks 9-12)
**Dependencies:** Phase 2

**Components to Build:**
1. **Execution Infrastructure**
   - Docker worker image (Jupyter + data science stack)
   - Celery worker setup
   - Redis job queue
   - Container orchestration (Docker Compose)

2. **Compilation Service**
   - Job submission API
   - Worker process implementation
   - Output extraction (plots, images, videos)
   - HTML render generation
   - Error handling & logging

3. **Output Storage**
   - MinIO output organization
   - CDN upload workflow
   - Asset versioning
   - Cache invalidation

4. **Frontend Editor**
   - Pyodide integration
   - Notebook cell editor
   - Local preview (WASM)
   - Compilation trigger UI
   - Status polling/display

**Deliverables:**
- Notebooks compile in containers
- Outputs captured and stored
- Users can preview compilation results
- CDN delivery configured

### Phase 4: Social Feed (Weeks 13-16)
**Dependencies:** Phase 3

**Components to Build:**
1. **Feed API**
   - Basic feed endpoint (chronological)
   - Pagination implementation
   - Feed caching (Redis)
   - Filtering (published, public)

2. **Interactions**
   - Like/unlike endpoints
   - Comment CRUD
   - Share functionality
   - View tracking

3. **Frontend Feed**
   - Instagram-style feed UI
   - Infinite scroll
   - Notebook cards (thumbnails, stats)
   - Like/comment UI
   - Notebook viewer (CDN-served)

4. **ML Feed (Basic)**
   - Feature extraction
   - Simple ranking algorithm
   - Trending feed endpoint
   - Feed refresh job

**Deliverables:**
- Published notebooks appear in feed
- Users can like/comment
- Feed loads fast (cached)
- Basic trending algorithm

### Phase 5: Forking & Advanced Features (Weeks 17-20)
**Dependencies:** Phase 4

**Components to Build:**
1. **Forking System**
   - Fork API endpoint
   - Fork tracking (database)
   - Fork chain visualization
   - Fork notifications

2. **User Profiles**
   - User profile page
   - User's notebooks
   - User's forks
   - Follow/unfollow (optional)

3. **Search & Discovery**
   - Basic search (title, author)
   - Tag system (optional)
   - Category browsing (optional)

4. **ML Feed Enhancement**
   - Collaborative filtering
   - Personalization
   - A/B testing framework
   - Model retraining pipeline

**Deliverables:**
- Users can fork notebooks
- Forks appear in feed
- User profiles functional
- Search/discovery works
- Personalized feeds (optional)

### Phase 6: Production Readiness (Weeks 21-24)
**Dependencies:** All previous phases

**Components to Build:**
1. **AWS Deployment**
   - RDS PostgreSQL setup
   - ElastiCache Redis
   - S3 + CloudFront
   - ECS/EKS for workers
   - Load balancer configuration

2. **Monitoring & Observability**
   - Application logging
   - Metrics collection (Prometheus)
   - Dashboard (Grafana)
   - Error tracking (Sentry)
   - Performance monitoring

3. **Security Hardening**
   - Rate limiting
   - Input validation
   - SQL injection prevention
   - XSS protection
   - CORS configuration
   - Secrets management

4. **Testing & QA**
   - Unit tests (backend)
   - Component tests (frontend)
   - Integration tests
   - E2E tests (Playwright)
   - Load testing

5. **Documentation**
   - API documentation (OpenAPI)
   - Deployment guides
   - User documentation
   - Architecture docs

**Deliverables:**
- Production-ready deployment
- Monitoring & alerting
- Comprehensive test coverage
- Security audit complete
- Documentation complete

## Security Considerations

### Isolation & Sandboxing

**Container Isolation:**
- Each notebook execution in separate container
- Resource limits (CPU, memory, disk)
- Network isolation (no outbound by default)
- Filesystem isolation (ephemeral storage)
- Non-root user execution
- Read-only base image

**WASM Isolation:**
- Pyodide runs in browser sandbox
- No file system access
- No network access (unless explicitly allowed)
- Memory-limited execution
- Separate from backend infrastructure

### Authentication & Authorization

**Authentication:**
- OAuth 2.0 (Google, Facebook)
- JWT tokens with short expiry
- Refresh token rotation
- Secure token storage (httpOnly cookies)

**Authorization:**
- Role-based access control (RBAC)
- Resource ownership checks
- API rate limiting
- IP-based blocking (optional)

**Public vs Private:**
- Read-only access: No auth required
- Write operations: Auth required
- Admin operations: Admin role required
- Private notebooks: Owner-only access

### Data Security

**Encryption:**
- TLS 1.3 for all communication
- Database encryption at rest
- S3/MinIO encryption
- Secret management (AWS Secrets Manager / env vars)

**Input Validation:**
- Pydantic models for all inputs
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)
- File upload validation (type, size)

**API Security:**
- CORS configuration
- CSRF protection
- Rate limiting (per endpoint, per user)
- API key authentication (for admin/internal)

### Audit & Compliance

**Logging:**
- Audit log for all write operations
- User action tracking
- Security event logging
- Log retention policy

**Privacy:**
- GDPR compliance (data deletion)
- User consent management
- Data anonymization (analytics)
- Privacy policy & terms of service

## Scalability Considerations

| Concern | At 100 Users | At 10K Users | At 1M Users |
|---------|--------------|--------------|-------------|
| **Frontend** | Single Next.js instance | CDN + 2-3 instances | CDN + multiple regions |
| **Backend API** | Single FastAPI instance | Load balancer + 2-3 instances | Auto-scaling + multiple AZs |
| **Database** | Single PostgreSQL | Read replica + connection pooling | Read replicas + sharding |
| **Cache** | Single Redis | Redis Cluster | Redis Cluster + multiple regions |
| **Storage** | MinIO (local) | MinIO cluster or AWS S3 | S3 + CloudFront |
| **Execution** | 2-3 worker containers | 10-20 workers (auto-scale) | 100+ workers (Kubernetes) |
| **ML Service** | Simple algorithm (in-memory) | Dedicated ML instance | Separate ML cluster |

**Scaling Strategies:**
- **Horizontal Scaling:** Add more instances
- **Vertical Scaling:** Increase instance size
- **Caching:** Aggressive caching at all layers
- **CDN:** Distribute static content globally
- **Database Optimization:** Indexing, query optimization, read replicas
- **Queue Backpressure:** Limit concurrent executions
- **Circuit Breakers:** Fail fast on downstream failures

## Sources

**Confidence Levels:**
- HIGH: Well-established patterns from JupyterHub, DeepNote, Kaggle architectures
- MEDIUM: Best practices for FastAPI, Next.js, PostgreSQL, Redis
- LOW: Specific implementation details for this platform (unvalidated)

**References:**
- [JupyterHub Documentation](https://jupyterhub.readthedocs.io/) - Architecture patterns for notebook platforms
- [FastAPI Documentation](https://fastapi.tiangolo.com/) - Modern Python web framework
- [Next.js Documentation](https://nextjs.org/docs) - React framework for production
- [PostgreSQL Documentation](https://www.postgresql.org/docs/) - Relational database
- [Redis Documentation](https://redis.io/docs/) - In-memory data store
- [Docker Documentation](https://docs.docker.com/) - Container orchestration
- [AWS Architecture Patterns](https://aws.amazon.com/architecture/) - Cloud best practices
