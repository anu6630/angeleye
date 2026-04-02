# Phase 1: Foundation & Authentication - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

## Phase Boundary

This phase establishes the foundational infrastructure and user authentication system. It includes: (1) Project scaffolding with API-first architecture (separate frontend/backend folders), (2) Docker Compose setup for local development (frontend, backend, PostgreSQL, Redis), (3) OAuth authentication with Google and Facebook, (4) User profile management, (5) Session management with JWT, (6) Security foundations (rate limiting, input validation, OAuth token management), and (7) Database schema and performance optimizations.

**What this phase delivers:** Users can sign up via OAuth, create/edit profiles, access the platform without authentication for passive browsing, and the complete development environment is runnable via Docker Compose.

**What this phase does NOT deliver:** Notebook creation, social features, or any content-related functionality (those are in later phases).

## Implementation Decisions

### OAuth Flow
- **D-01:** After OAuth redirect, users complete a profile creation wizard before accessing the full platform
- **D-02:** Wizard collects username (required) and offers optional avatar/bio fields
- **D-03:** Google and Facebook OAuth both supported with equivalent flows
- **D-04:** OAuth tokens are securely stored and managed per requirement SEC-06

### Profile Management
- **D-05:** Username is a required field for user profiles (essential for attribution and mentions)
- **D-06:** Avatar and bio are optional fields that users can add later
- **D-07:** Users can edit their own profiles (username, avatar, bio) after creation
- **D-08:** Profile displays username, avatar, bio, and published notebook count

### Session Management
- **D-09:** JWT (JSON Web Tokens) for stateless session management
- **D-10:** JWT stored in httpOnly cookies to protect against XSS attacks
- **D-11:** Refresh tokens for long-lived sessions
- **D-12:** Sessions persist across browser refresh (requirement AUTH-03)

### Infrastructure & Docker
- **D-13:** Single docker-compose.yml file with all services for local development
- **D-14:** Services include: frontend (Next.js), backend (FastAPI), PostgreSQL, Redis
- **D-15:** Docker Compose can spin up the full development environment (success criterion)

### Project Structure
- **D-16:** Monorepo with /frontend and /backend root directories (API-first architecture)
- **D-17:** Clear separation between frontend and backend code
- **D-18:** Shared types/contracts can be added via shared package if needed

### Database & Migrations
- **D-19:** Alembic for database schema migrations
- **D-20:** Alembic provides versioning, rollback, and upgrade/downgrade paths
- **D-21:** Initial schema includes users and profiles tables
- **D-22:** Database queries are indexed for common operations (PERF-05)

### Error Handling
- **D-23:** Standard HTTP status codes for API responses (400, 401, 403, 404, 500)
- **D-24:** Structured JSON error responses for all API errors
- **D-25:** Consistent error format across all endpoints

### Security
- **D-26:** API endpoints have rate limiting (SEC-04)
- **D-27:** User inputs are validated and sanitized (SEC-05)
- **D-28:** OAuth tokens are securely stored (SEC-06)

### Claude's Discretion
None - all decisions were explicitly made via auto-selected recommendations.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Documentation
- `.planning/PROJECT.md` — Core project vision, constraints, and key decisions
- `.planning/REQUIREMENTS.md` — Complete v1 requirements with traceability
- `.planning/ROADMAP.md` — Phase 1 details, success criteria, and requirements mapping
- `.planning/research/STACK.md` — Recommended technology stack with specific versions
- `.planning/research/FEATURES.md` — Feature landscape including authentication patterns
- `.planning/research/ARCHITECTURE.md` — System architecture and component boundaries
- `.planning/research/PITFALLS.md` — Critical security and implementation pitfalls to avoid

### Technology Documentation
- Next.js Documentation — Authentication patterns, API routes, project structure
- FastAPI Documentation — OAuth integration, security, dependency injection
- PostgreSQL Documentation — User schema design, indexing, performance
- Redis Documentation — Caching patterns, session storage
- Alembic Documentation — Migration workflow and best practices
- Docker Documentation — Compose file structure, service orchestration
- OAuth 2.0 Specification — Authorization flows and token management

### Security References
- `.planning/research/PITFALLS.md` — Container security, rate limiting, input validation best practices
- OWASP Authentication Cheat Sheet — OAuth implementation security
- JWT Best Practices — Token storage, validation, and revocation

## Existing Code Insights

### Reusable Assets
None — this is a greenfield project with no existing code.

### Established Patterns
None — this is the first phase, establishing foundational patterns.

### Integration Points
None — no existing system to integrate with.

## Specific Ideas

No specific requirements — auto-selected recommended defaults for all decisions based on industry best practices and project requirements.

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 01-foundation-authentication*
*Context gathered: 2026-04-02*
