<!-- GSD:project-start source:PROJECT.md -->
## Project

**NotebookSocial**

A social media platform where Python notebooks are the content. Users create notebooks using a WASM-powered editor (Pyodide), compile them in isolated containers, and publish pre-rendered outputs to an Instagram-style social feed. Viewers can browse notebook listings, click to see full rendered notebooks with charts and videos, and fork notebooks to create their own versions. Forks have equal weightage in the feed, making remixing a core social action.

**Core Value:** Interactive + social — make computational knowledge shareable and remixable, with forking as a first-class social action.

### Constraints

- **Timeline**: 3+ months thorough development to launch-ready
- **Architecture**: API-first design (separate frontend/backend folders) for future mobile app compatibility
- **Deployment**: Local Docker Compose for development, target AWS for production
- **Testing**: Comprehensive test coverage required (unit, integration, E2E)
- **Auth**: OAuth only for interactive actions (Google, Facebook), viewing is open
- **Execution modes**: Both WASM (offline editing) AND online container compilation must be implemented
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Next.js** | 16.2.2 | Full-stack React framework | Server Components for fast feed loading, API routes for backend-frontend communication, excellent TypeScript support, built-in image optimization for notebook outputs, SEO-friendly for discoverability | HIGH |
| **React** | 19.2.4 | UI library | Latest version with concurrent features, improved performance, largest ecosystem, required by Next.js | HIGH |
| **TypeScript** | 6.0.2 | Type safety | Catches errors at compile time, better DX, industry standard for 2025 | HIGH |
| **FastAPI** | 0.135.3 | Async Python backend | Native async support for concurrent notebook compilation, automatic OpenAPI docs, Pydantic validation, perfect for API-first architecture | HIGH |
| **Uvicorn** | 0.42.0 | ASGI server | Lightning-fast ASGI implementation, standard for FastAPI production deployments | HIGH |
### Frontend UI
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Tailwind CSS** | 4.2.2 | Utility-first CSS | Rapid development, consistent design system, excellent responsive design support, small bundle size with JIT mode | HIGH |
| **shadcn/ui** | Latest | Component library | Built on Radix UI (accessible), copy-paste components (full ownership), Tailwind-styled, actively maintained, 2025 standard for React apps | HIGH |
| **Radix UI** | Latest | Accessible primitives | Keyboard navigation, screen reader support, WCAG compliant, foundation for shadcn/ui | HIGH |
| **Lucide React** | 0.468.0 | Icon library | Tree-shakeable, consistent design, modern icons, actively maintained | HIGH |
| **Zustand** | 5.0.12 | State management | Lightweight (1kb), no boilerplate, perfect for client-side state (editor, auth), simpler than Redux | HIGH |
| **React Hook Form** | 7.72.0 | Form handling | Excellent performance, minimal re-renders, Zod integration, best practice for 2025 | HIGH |
| **Zod** | 4.3.6 | Schema validation | TypeScript-first, runtime validation, integrates with React Hook Form and FastAPI Pydantic | HIGH |
### Notebook Execution
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Pyodide** | 0.26.3 | Python WASM runtime | Offline editing in browser, full Python 3.11 support, compatible with popular data science packages (numpy, pandas, matplotlib), standard for browser-based Python | HIGH |
| **JupyterLab** | 4.5.6 | Notebook format | Industry standard for notebooks, nbconvert for rendering outputs, mature ecosystem, ipywidgets for interactive elements | HIGH |
| **nbconvert** | 7.17.0 | Notebook to HTML/PDF | Converts .ipynb to static HTML for CDN delivery, supports embedded charts and images, required for pre-rendered outputs | HIGH |
| **Docker** | Latest | Container isolation | Standard for containerizing Python environments, ensures reproducible notebook execution, security through isolation | HIGH |
### Database
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **PostgreSQL** | 17+ | Primary database | ACID compliance for social features (likes, comments, forks), JSONB for flexible notebook metadata, full-text search, excellent performance at scale, row-level security | HIGH |
| **SQLAlchemy** | 2.0.48 | ORM | Async support in 2.0, mature and battle-tested, excellent for complex relationships (users, notebooks, forks, likes), schema migrations via Alembic | HIGH |
| **Alembic** | 1.18.4 | Database migrations | Industry standard for PostgreSQL migrations, integrates with SQLAlchemy, version control for schema changes | HIGH |
| **psycopg2-binary** | 2.9.11 | PostgreSQL adapter | Fast and reliable, async support via psycopg, most popular PostgreSQL driver for Python | HIGH |
### Storage & CDN
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **MinIO** | Latest | S3-compatible storage (local) | Self-hosted S3 alternative, runs in Docker Compose for local development, seamless migration to AWS S3, supports datasets (CSV files) | HIGH |
| **AWS S3** | Latest | Production storage | Unlimited scalability, 99.999999999% durability, CloudFront integration, industry standard for object storage | HIGH |
| **CloudFront** | Latest | CDN for outputs | Global edge network, fast delivery of pre-rendered notebook outputs (charts, images, videos), integrates with S3, AWS-managed | HIGH |
| **boto3** | 1.42.82 | AWS SDK | Official AWS Python SDK, mature and well-documented, handles S3/CloudFront operations | HIGH |
| **minio** | 7.2.20 | MinIO Python SDK | S3-compatible API for local development, drop-in replacement for boto3 in dev | HIGH |
### Cache & Queue
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Redis** | 7.4.0 | Cache & message broker | In-memory data store for feed caching, Celery message broker, pub/sub for real-time updates, session storage, extremely fast | HIGH |
| **Celery** | 5.6.3 | Task queue | Async notebook compilation, distributed worker scaling, task retries, monitoring tools, Python standard for background jobs | HIGH |
| **httpx** | 0.28.1 | Async HTTP client | For external API calls (OAuth providers), async/await support, HTTP/2, better than requests for FastAPI | HIGH |
### Authentication
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **python-jose** | 3.6.0 | JWT handling | Create and verify JWT tokens, standard for stateless auth, supports RSA signing | HIGH |
| **passlib** | 1.7.4 | Password hashing | Secure password hashing (bcrypt), password strength validation, proven security | HIGH |
| **authlib** | 1.6.9 | OAuth integration | Google and Facebook OAuth 2.0 support, battle-tested, async-compatible | HIGH |
| **python-multipart** | 0.0.22 | Form data | Required for FastAPI OAuth flows, handles form-encoded data | HIGH |
### Machine Learning
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **scikit-learn** | 1.8.0 | Trending algorithm | Feature engineering, content-based filtering, time-series decay for trending, industry standard for ML in Python | HIGH |
| **pandas** | 3.0.2 | Data manipulation | Feed data processing, user engagement metrics, notebook statistics | HIGH |
| **numpy** | 2.4.4 | Numerical computing | Foundation for pandas and scikit-learn, efficient array operations | HIGH |
| **matplotlib** | 3.10.8 | Chart generation | Chart rendering in notebooks, supported by Pyodide, standard plotting library | HIGH |
| **Pillow** | 12.2.0 | Image processing | Thumbnail generation, image optimization for CDN, chart format conversion | HIGH |
### Testing
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **pytest** | 8.5.2 | Python test framework | Industry standard, fixtures, plugins, async support via pytest-asyncio | HIGH |
| **pytest-asyncio** | 1.3.0 | Async tests | Test FastAPI endpoints and async functions, integrates seamlessly with pytest | HIGH |
| **Vitest** | 4.1.2 | Frontend test runner | Vite-native, fast, Jest-compatible, supports TypeScript, modern alternative to Jest | HIGH |
| **@testing-library/react** | 16.3.2 | React testing | User-centric testing, accessibility-focused, community standard for 2025 | HIGH |
| **Playwright** | 1.59.1 | E2E testing | Cross-browser testing, fast execution, auto-waiting, visual regression testing, GitHub Actions integration | HIGH |
### Infrastructure
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Docker** | Latest | Containerization | Consistent environments, local development with Docker Compose, production deployment, security through isolation | HIGH |
| **Docker Compose** | Latest | Local orchestration | Multi-container setup (FastAPI, PostgreSQL, Redis, MinIO), easy local development, production-ready with docker-compose.yml | HIGH |
| **AWS ECS** | Latest | Container orchestration | Managed Docker containers, auto-scaling, integrates with ECR, AWS-native solution | HIGH |
| **AWS ECR** | Latest | Container registry | Private Docker registry, integrates with ECS, secure image storage | HIGH |
| **GitHub Actions** | Latest | CI/CD | Free for public repos, integrates with GitHub, container build and deploy workflows | HIGH |
## Installation
### Frontend Dependencies
# Core
# UI
# Forms & State
# Testing
### Backend Dependencies
# Core
# Database
# Auth
# Storage & Queue
# ML & Data
# Notebooks
# HTTP Client
# Testing
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| **Frontend Framework** | Next.js 16 | Remix | Next.js has larger ecosystem, better TypeScript support, more mature Server Components |
| **Python Backend** | FastAPI | Django REST Framework | FastAPI is async-native, faster for concurrent notebook compilation, lighter weight |
| **UI Library** | shadcn/ui | MUI | MUI is heavier, less customizable, shadcn/ui gives full ownership of components |
| **State Management** | Zustand | Redux Toolkit | Redux requires more boilerplate, Zustand is simpler for this use case |
| **Task Queue** | Celery | Dramatiq | Celery has larger ecosystem, better monitoring tools, more battle-tested |
| **Notebook Runtime** | Pyodide | PyScript | Pyodide is more mature, better package support, larger community |
| **Testing Framework** | Vitest | Jest | Vitest is Vite-native, faster, better TypeScript support |
| **Container Runtime** | Docker | Podman | Docker has better tooling, larger community, AWS ECS integration |
| **CDN** | CloudFront | Cloudflare Workers | CloudFront integrates better with S3 and other AWS services |
## What NOT to Use and Why
### Avoid: Redux / Redux Toolkit
### Avoid: Material-UI (MUI)
### Avoid: Django REST Framework
### Avoid: PostgreSQL with Prisma ORM
### Avoid: MongoDB
### Avoid: Memcached
### Avoid: Jest
### Avoid: AWS Lambda for notebook execution
### Avoid: Server-side notebook rendering (no CDN)
### Avoid: Real-time collaborative editing (Liveblocks, Yjs)
### Avoid: NextAuth.js for backend
### Avoid: PostgreSQL as cache
### Avoid: Direct Jupyter kernel usage
### Avoid: Running notebooks in browser for viewers
### Avoid: Heroku / PaaS for production
### Avoid: Travis CI / CircleCI
## Architecture Notes
### Container Security
- **Non-root user:** All Python containers run as non-privileged user
- **Multi-stage builds:** Minimal final images with only runtime dependencies
- **Read-only filesystems:** Container filesystems are read-only where possible
- **Resource limits:** CPU and memory limits on notebook execution containers
### CDN Strategy
- **Static assets:** CloudFront distribution for all pre-rendered notebook outputs
- **Cache headers:** Long cache times (1 year) for immutable outputs, versioned URLs
- **Invalidation:** CloudFront invalidation on notebook update, version-based cache busting
- **Origin:** S3 as origin, CloudFront edges cache globally
### Feed Caching
- **Redis sorted sets:** Feed rankings stored in ZSET with engagement scores
- **TTL:** Cached for 5 minutes, recalculated on cache miss
- **Pre-computation:** Feed pre-computed every minute via Celery beat
- **Personalization:** Per-user feed variations cached with user ID prefix
### Notebook Execution Pipeline
## Sources
- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Pyodide Documentation](https://pyodide.org/en/stable/)
- [JupyterLab Documentation](https://docs.jupyter.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/docs/)
- [Celery Documentation](https://docs.celeryq.dev/)
- [scikit-learn Documentation](https://scikit-learn.org/stable/)
- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

### UX and cognitive load

When designing or changing UI flows (including agent-assisted work), optimize for clarity and low effort:

- Prefer **fewer steps** and **clear primary actions** on the main path.
- Use **progressive disclosure**: advanced or rare options stay secondary (e.g. settings, menus).
- Stay **consistent** with existing product surfaces (feed, profile, saved, groups) so users reuse mental models.
- Agents should treat this as a default bar for new screens and workflows.

Other engineering conventions can accumulate here or in a dedicated `CONVENTIONS.md` as patterns stabilize.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
