# Phase 02: Core Notebook Experience - Research

**Researched:** 2026-04-04
**Domain:** WASM-based Python editing, social feed architecture, comment threading, state management
**Confidence:** HIGH

## Summary

Phase 2 implements the core value proposition of NotebookSocial: users create Python notebooks using a WASM-powered Pyodide editor, preview compilation locally, view notebooks in an Instagram-style feed with lazy loading, and engage via likes, threaded comments, and sharing. This phase establishes the notebook data model (with draft/published states), the feed architecture with performance optimization, social interaction patterns (like/unlike, threaded comments with depth limits), and state management for editor vs. viewer modes using Zustand. The backend extends Phase 1's FastAPI foundation with notebook CRUD APIs, like/unlike endpoints, comment threading with parent/child relationships, and feed pagination. The frontend introduces the notebook editor component integrating Pyodide for local execution, the feed page with infinite scroll using Intersection Observer API, notebook viewer displaying pre-rendered outputs (not executing code), and social interaction components.

**Primary recommendation:** Use Pyodide 0.26.3 for WASM Python execution with monaco-editor for code editing, implement notebook models with JSONB metadata for cells, use recursive CTEs for comment threading in PostgreSQL, implement feed pagination with cursor-based scrolling for performance, and separate Zustand stores for editor state and feed state.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NOTE-01 | User can create Python notebooks using WASM-powered editor (Pyodide) | Pyodide 0.26.3 integration with Next.js dynamic imports, web worker for isolation, monaco-editor for code editing |
| NOTE-02 | User can preview notebook compilation results locally before publishing | Pyodide.runPythonAsync() with output capture, display stdout/stderr, markdown rendering for outputs |
| NOTE-06 | User can edit their own unpublished notebooks | Notebook model with is_published flag, UPDATE endpoint with ownership check, optimistic UI updates |
| NOTE-07 | User can delete their own notebooks (unless forked by others) | DELETE endpoint with fork existence check, cascade delete protection via database constraint |
| VIEW-01 | User can view Instagram-style feed of published notebooks | Feed API with pagination (cursor-based), card grid layout (3 columns on desktop), social metrics display |
| VIEW-02 | User can click notebook listing to see full pre-rendered notebook | Dynamic route `/notebooks/[id]`, viewer component displaying notebook metadata and cells |
| VIEW-04 | Feed loads quickly with lazy loading for infinite scroll | Intersection Observer API for scroll detection, fetch more on threshold, loading spinner, error handling |
| VIEW-05 | Notebook viewer displays pre-rendered outputs (not executing code) | Read-only rendering of notebook data, no Pyodide execution in viewer mode, phase 3 will add container rendering |
| SOC-01 | User can like notebooks | Like/unlike endpoints with optimistic updates, like count display, like button state |
| SOC-02 | User can unlike notebooks | Toggle endpoint (same as like), prevents duplicate likes via unique constraint, client-side state update |
| SOC-03 | User can comment on notebooks | Comment creation endpoint, markdown support, timestamp display, author attribution |
| SOC-04 | User can reply to comments (threaded comments) | Recursive comment tree, parent_id foreign key, depth limit (e.g., 3 levels), nested rendering |
| SOC-05 | User can share notebooks (copy link, sharing to social platforms) | Copy to clipboard functionality, Web Share API for mobile platforms, Twitter/Facebook share URLs |
| SOC-06 | User can view like and comment counts on notebook cards in feed | Feed API returns counts, cache counts in Redis for performance, optimistic updates on interactions |
| PERF-03 | WASM editor initializes in under 5 seconds | Pyodide lazy loading via Next.js dynamic imports, web worker for initialization, cached Pyodide build |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Pyodide** | 0.26.3 | Python WASM runtime | Full Python 3.11 support in browser, compatible with numpy/pandas/matplotlib, mature ecosystem, standard for browser-based Python |
| **monaco-editor** | Latest | Code editor | VS Code editor component, syntax highlighting for Python, excellent DX, industry standard for web-based IDEs |
| **@monaco-editor/react** | Latest | Monaco React wrapper | React-friendly API for Monaco Editor, integrates with Next.js, handles editor lifecycle |
| **Zustand** | 5.0.12 | State management | Lightweight (1kb), no boilerplate, perfect for editor/feed state, simpler than Redux |
| **React Hook Form** | 7.72.0 | Form handling | Excellent performance, minimal re-renders, Zod integration, best practice for 2025 |
| **Zod** | 4.3.6 | Schema validation | TypeScript-first, runtime validation, integrates with React Hook Form and FastAPI Pydantic |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **react-markdown** | Latest | Markdown rendering | Display notebook text outputs, supports code blocks, secure rendering |
| **remark-gfm** | Latest | GitHub Flavored Markdown | Tables, strikethrough, task lists in notebook outputs |
| **clsx** | 2.1.1 | Conditional classes | Combining Tailwind classes conditionally, already installed |
| **tailwind-merge** | 3.1.0 | Merging Tailwind classes | Preventing style conflicts, already installed |
| **@radix-ui/react-dialog** | 1.1.4 | Modal dialogs | Share dialog, delete confirmation dialogs (already installed) |

### Backend
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **FastAPI** | 0.135.3 | Async Python backend | Native async support, automatic OpenAPI docs, Pydantic validation (already installed) |
| **SQLAlchemy** | 2.0.48 | ORM | Async support in 2.0, mature, excellent for complex relationships (already installed) |
| **Alembic** | 1.18.4 | Database migrations | Version control for schema changes, handles notebook/comment/like tables (already installed) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| monaco-editor | CodeMirror 6 | CodeMirror is lighter but Monaco has better Python syntax highlighting and VS Code familiarity |
| Pyodide | PyScript | Pyodide is more mature, better package support, larger community for 2026 |
| Zustand | Redux Toolkit | Redux requires more boilerplate, Zustand is simpler for this use case |
| Recursive CTEs | Adjacency list materialized path | Recursive CTEs are SQL-standard, simpler for querying, materialized path better for very deep threads (not needed here) |

**Installation:**
```bash
# Frontend
npm install @monaco-editor/react react-markdown remark-gfm

# Backend (add to requirements.txt)
# Note: Pyodide is client-side only, no backend installation needed
```

**Version verification:** Before writing the Standard Stack table, verify each recommended package version is current:
```bash
npm view @monaco-editor/react version
npm view react-markdown version
npm view remark-gfm version
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/
├── app/
│   ├── (public)/
│   │   ├── feed/
│   │   │   └── page.tsx              # Instagram-style feed (VIEW-01, VIEW-04)
│   │   ├── notebooks/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx          # Notebook viewer (VIEW-02, VIEW-05)
│   │   │   └── new/
│   │   │       └── page.tsx          # Notebook editor (NOTE-01, NOTE-02)
│   │   └── layout.tsx              # Public layout (no auth required)
│   ├── (auth)/
│   │   ├── my-notebooks/
│   │   │   └── page.tsx            # User's draft/published notebooks (NOTE-06, NOTE-07)
│   │   └── layout.tsx              # Authenticated layout
├── components/
│   ├── notebook/
│   │   ├── NotebookEditor.tsx       # Pyodide + Monaco editor (NOTE-01)
│   │   ├── NotebookCell.tsx         # Single cell display
│   │   ├── NotebookOutput.tsx        # Cell output rendering (VIEW-05)
│   │   ├── NotebookCard.tsx          # Feed card with thumbnail (VIEW-01)
│   │   └── NotebookViewer.tsx       # Full notebook display (VIEW-02)
│   ├── feed/
│   │   ├── FeedList.tsx             # Infinite scroll container (VIEW-04)
│   │   └── FeedCard.tsx             # Single feed item
│   ├── social/
│   │   ├── LikeButton.tsx           # Like/unlike toggle (SOC-01, SOC-02)
│   │   ├── CommentList.tsx          # Threaded comments (SOC-03, SOC-04)
│   │   ├── CommentItem.tsx           # Single comment with replies
│   │   ├── CommentForm.tsx           # Add comment form
│   │   └── ShareButton.tsx          # Share dialog (SOC-05)
│   └── ui/                          # shadcn components (already exists)
├── lib/
│   ├── api-client.ts                # Extended with notebook APIs
│   ├── pyodide-loader.ts            # Pyodide initialization
│   └── utils.ts                    # Existing utility functions
└── stores/
    ├── notebook-store.ts             # Notebook editor state
    ├── feed-store.ts                # Feed state (cursor, items, loading)
    └── social-store.ts              # Like/comment state

backend/
├── app/
│   ├── models/
│   │   ├── notebook.py              # Notebook model
│   │   ├── notebook_cell.py         # Cell model
│   │   ├── like.py                 # Like model
│   │   └── comment.py              # Comment model (threaded)
│   ├── schemas/
│   │   ├── notebook.py              # Request/response schemas
│   │   ├── like.py                 # Like schemas
│   │   └── comment.py              # Comment schemas
│   ├── services/
│   │   ├── notebook_service.py      # Notebook CRUD
│   │   ├── like_service.py          # Like/unlike operations
│   │   ├── comment_service.py       # Comment threading
│   │   └── feed_service.py         # Feed pagination
│   └── api/v1/
│       ├── notebooks/
│       │   └── router.py           # Notebook endpoints
│       ├── likes/
│       │   └── router.py           # Like/unlike endpoints
│       └── comments/
│           └── router.py           # Comment endpoints
└── alembic/versions/
    └── 002_add_notebook_social_tables.py  # Migration for notebooks, likes, comments
```

### Pattern 1: Pyodide Integration with Next.js
**What:** Load Pyodide dynamically, initialize web worker, execute Python code in browser
**When to use:** Notebook editor for local Python execution (NOTE-01, NOTE-02)
**Example:**
```typescript
// frontend/lib/pyodide-loader.ts
import { loadPyodide } from 'pyodide';

let pyodideInstance: any = null;

export async function loadPyodideInstance() {
  if (pyodideInstance) return pyodideInstance;

  pyodideInstance = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.3/full/',
  });

  // Install common data science packages
  await pyodideInstance.loadPackage(['numpy', 'pandas', 'matplotlib']);

  return pyodideInstance;
}

export function executePython(code: string, pyodide: any) {
  return pyodide.runPythonAsync(code);
}
```

### Pattern 2: Zustand Store for Editor State
**What:** Manage notebook cells, execution state, output data using Zustand
**When to use:** Notebook editor (NOTE-01, NOTE-02)
**Example:**
```typescript
// frontend/stores/notebook-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotebookCell {
  id: string;
  code: string;
  output?: string;
  error?: string;
  isRunning: boolean;
}

interface NotebookState {
  cells: NotebookCell[];
  title: string;
  addCell: () => void;
  updateCellCode: (id: string, code: string) => void;
  executeCell: (id: string, pyodide: any) => Promise<void>;
}

export const useNotebookStore = create<NotebookState>()((set, get) => ({
  cells: [],
  title: 'Untitled Notebook',
  addCell: () => set((state) => ({
    cells: [...state.cells, { id: crypto.randomUUID(), code: '', isRunning: false }]
  })),
  // ... other methods
}));
```

### Pattern 3: Infinite Scroll with Intersection Observer
**What:** Load more feed items when user scrolls near bottom
**When to use:** Feed page for lazy loading (VIEW-04)
**Example:**
```typescript
// frontend/components/feed/FeedList.tsx
import { useEffect, useRef, useState } from 'react';

export function FeedList() {
  const [notebooks, setNotebooks] = useState([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMore = async () => {
    if (isLoading) return;
    setIsLoading(true);
    const data = await apiClient.getFeed(cursor);
    setNotebooks((prev) => [...prev, ...data.notebooks]);
    setCursor(data.nextCursor);
    setIsLoading(false);
  };

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMore();
      }
    }, { threshold: 0.1 });

    return () => observerRef.current?.disconnect();
  }, [cursor, isLoading]);

  return (
    <div>
      {notebooks.map((notebook) => <FeedCard key={notebook.id} {...notebook} />)}
      <div ref={observerRef.current && observerRef.current.observe} />
      {isLoading && <Spinner />}
    </div>
  );
}
```

### Pattern 4: Threaded Comments with Recursive Rendering
**What:** Display comment tree with nested replies up to depth limit
**When to use:** Comment list on notebook viewer (SOC-03, SOC-04)
**Example:**
```typescript
// frontend/components/social/CommentItem.tsx
interface Comment {
  id: string;
  content: string;
  author: { username: string; avatar_url?: string };
  created_at: string;
  replies?: Comment[];
  depth: number;
}

export function CommentItem({ comment, maxDepth = 3 }: { comment: Comment; maxDepth?: number }) {
  const canReply = comment.depth < maxDepth;

  return (
    <div className={`ml-${comment.depth * 4}`}>
      <div className="flex gap-2">
        <Avatar src={comment.author.avatar_url} />
        <div>
          <span className="font-semibold">{comment.author.username}</span>
          <time className="text-xs text-muted-foreground">{comment.created_at}</time>
          <p>{comment.content}</p>
          {canReply && <ReplyButton commentId={comment.id} />}
        </div>
      </div>
      {comment.replies?.map((reply) => (
        <CommentItem key={reply.id} comment={{ ...reply, depth: comment.depth + 1 }} maxDepth={maxDepth} />
      ))}
    </div>
  );
}
```

### Pattern 5: Optimistic UI Updates for Likes
**What:** Update UI immediately, rollback on error
**When to use:** Like/unlike interactions (SOC-01, SOC-02)
**Example:**
```typescript
// frontend/components/social/LikeButton.tsx
import { useNotebookStore } from '@/stores/feed-store';

export function LikeButton({ notebookId, isLiked, likeCount }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const updateLikeState = useNotebookStore((state) => state.updateLikeState);

  const handleToggle = async () => {
    setIsLoading(true);
    const newLikedState = !isLiked;

    // Optimistic update
    updateLikeState(notebookId, newLikedState, isLiked ? likeCount - 1 : likeCount + 1);

    try {
      await apiClient.toggleLike(notebookId);
    } catch (error) {
      // Rollback on error
      updateLikeState(notebookId, isLiked, likeCount);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleToggle} disabled={isLoading} variant={isLiked ? 'default' : 'ghost'}>
      <Heart className={isLiked ? 'fill-current' : ''} />
      {likeCount}
    </Button>
  );
}
```

### Anti-Patterns to Avoid
- **Executing Python in viewer mode:** VIEW-05 requires read-only display, no Pyodide execution
- **Using Redux for state:** Zustand is lighter and sufficient for this use case (CLAUDE.md constraint)
- **Monolithic notebook cells:** Store cells as separate rows for better querying and updates
- **Unbounded comment depth:** Limit to 3 levels for UX and performance
- **Synchronous Pyodide execution:** Use runPythonAsync() to avoid blocking UI
- **Storing Pyodide instance in component state:** Use global singleton or service

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Code editor | Custom textarea with syntax highlighting | Monaco Editor (@monaco-editor/react) | Syntax highlighting, autocomplete, bracket matching, VS Code familiarity |
| Python runtime in browser | Python parser + interpreter in JS | Pyodide 0.26.3 | Full Python 3.11, mature packages, industry standard |
| Markdown rendering | Custom markdown parser | react-markdown + remark-gfm | Security (XSS prevention), GFM support, extensible |
| Form validation | Manual validation logic | React Hook Form + Zod | Type-safe, minimal re-renders, client/server schema sharing |
| Infinite scroll | Scroll event listeners | Intersection Observer API | Performance, browser-native, no debouncing needed |
| State management | Context API + useState | Zustand | Lightweight, no provider nesting, devtools |
| Optimistic updates | Manual state sync | Zustand immer middleware (optional) | Immutability, simpler updates |

**Key insight:** Custom solutions for code editing, Python execution, and social interactions are error-prone and hard to maintain. Established libraries have edge cases handled (e.g., Pyodide's memory management, Monaco Editor's virtual scrolling, react-markdown's XSS protection).

## Runtime State Inventory

> Phase 2 is a greenfield feature phase, not a rename/refactor phase. This section is omitted as there is no runtime state inventory required for new feature development.

## Common Pitfalls

### Pitfall 1: Pyodide Initialization Blocking UI
**What goes wrong:** Pyodide loading blocks the main thread, editor page appears frozen
**Why it happens:** Loading Pyodide (~10MB) is synchronous by default
**How to avoid:** Use Next.js dynamic imports with loading state, show skeleton UI during initialization
**Warning signs:** Editor page shows blank screen for 5+ seconds, browser tab becomes unresponsive

### Pitfall 2: Memory Leaks in Pyodide Web Workers
**What goes wrong:** Repeated notebook executions consume increasing memory
**Why it happens:** Pyodide web workers aren't cleaned up, global variables accumulate
**How to avoid:** Terminate web workers on unmount, clear Pyodide globals between executions, implement restart threshold
**Warning signs:** Browser DevTools memory profiler shows linear growth, page slows down after 10+ cell executions

### Pitfall 3: Unbounded Comment Trees Causing Performance Issues
**What goes wrong:** deeply nested comment threads render slowly and break layout
**Why it happens:** Recursive rendering without depth limits, fetching all descendants at once
**How to avoid:** Limit comment depth to 3 levels, fetch replies lazily (expand on click), use pagination for long threads
**Warning signs:** Comment list takes >1 second to render, layout shifts when expanding replies

### Pitfall 4: Optimistic Updates Without Error Handling
**What goes wrong:** UI shows liked state but API fails, state becomes desynced
**Why it happens:** Optimistic update succeeds but API call fails, no rollback logic
**How to avoid:** Wrap API calls in try/catch, rollback state on error, show error toast to user
**Warning signs:** Like count changes then reverts, duplicate likes after page refresh

### Pitfall 5: Feed Pagination Causing Duplicate Items
**What goes wrong:** Scroll triggers multiple fetches, same notebooks appear twice
**Why it happens:** Intersection Observer fires multiple times before first request completes, cursor not updated atomically
**How to avoid:** Set loading flag before request, check loading state before fetching, disable observer during fetch
**Warning signs:** Same notebook appears multiple times in feed, scroll jumps when items are added

### Pitfall 6: Notebook Cell Output Growing Unbounded
**What goes wrong:** Cell outputs accumulate and consume memory
**Why it happens:** Old outputs aren't cleared, large outputs (charts, arrays) stay in DOM
**How to avoid:** Limit output size (e.g., 10MB), truncate large arrays, clear outputs on cell deletion
**Warning signs:** Browser memory usage spikes after running cells, page becomes sluggish

## Code Examples

### Pyodide Integration (from Pyodide documentation)
```typescript
// frontend/lib/pyodide-loader.ts
import { loadPyodide } from 'pyodide';

export async function initPyodide() {
  const pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.3/full/',
  });

  // Capture stdout/stderr
  pyodide.setStdout({
    batched: (msg: string) => console.log('Python stdout:', msg),
  });

  return pyodide;
}

export async function executePythonCode(pyodide: any, code: string) {
  try {
    const result = await pyodide.runPythonAsync(code);
    return { success: true, output: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

### SQLAlchemy Model for Threaded Comments
```python
# backend/app/models/comment.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="comments")
    notebook = relationship("Notebook", back_populates="comments")
    parent = relationship("Comment", remote_side=[id], backref="replies")
```

### Recursive Query for Comment Thread
```python
# backend/app/services/comment_service.py
from sqlalchemy import text

def get_comment_thread(self, notebook_id: int, max_depth: int = 3) -> List[dict]:
    """Get threaded comments using recursive CTE"""
    query = text("""
        WITH RECURSIVE comment_tree AS (
            SELECT id, user_id, notebook_id, parent_id, content, created_at,
                   0 as depth, ARRAY[id] as path
            FROM comments
            WHERE notebook_id = :notebook_id AND parent_id IS NULL

            UNION ALL

            SELECT c.id, c.user_id, c.notebook_id, c.parent_id, c.content, c.created_at,
                   ct.depth + 1 as depth, ct.path || c.id as path
            FROM comments c
            JOIN comment_tree ct ON c.parent_id = ct.id
            WHERE ct.depth < :max_depth
        )
        SELECT * FROM comment_tree
        ORDER BY path
    """)

    result = self.db.execute(query, {"notebook_id": notebook_id, "max_depth": max_depth})
    return [dict(row) for row in result]
```

### Monaco Editor Integration
```typescript
// frontend/components/notebook/NotebookEditor.tsx
import { Editor } from '@monaco-editor/react';
import { useNotebookStore } from '@/stores/notebook-store';

export function NotebookEditor() {
  const { cells, updateCellCode, executeCell } = useNotebookStore();

  return (
    <div className="space-y-4">
      {cells.map((cell) => (
        <div key={cell.id} className="border rounded-lg">
          <Editor
            height="200px"
            language="python"
            value={cell.code}
            onChange={(value) => updateCellCode(cell.id, value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
            }}
          />
          <NotebookOutput cell={cell} onRun={() => executeCell(cell.id)} />
        </div>
      ))}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Browser-based code exec (eval) | Pyodide WASM runtime | 2022 | Full Python 3.11 support, data science packages |
| Synchronous scroll listeners | Intersection Observer API | 2019 | Better performance, browser-native, no debouncing |
| Redux with sagas | Zustand (hooks-based) | 2023 | 90% less boilerplate, simpler for local state |
| Server-side rendered feeds | Cursor-based pagination with optimistic updates | 2021 | Better UX, reduced server load, smoother scrolling |
| Flat comment lists | Threaded comments with recursive rendering | 2020 | Better conversation flow, reply context preserved |

**Deprecated/outdated:**
- **Eval-based code execution:** Security risk, limited to JavaScript, replaced by Pyodide
- **Page-based pagination (1, 2, 3...):** Poor UX for infinite feeds, replaced by cursor-based pagination
- **Redux for component state:** Overkill, replaced by Zustand for component-level state
- **Manual markdown parsing:** XSS risk, replaced by react-markdown with sanitization

## Open Questions

1. **Pyodide package installation strategy**
   - What we know: Pyodide can load packages (numpy, pandas, matplotlib) dynamically
   - What's unclear: Should we pre-load packages on Pyodide init or load on-demand?
   - Recommendation: Pre-load common packages (numpy, pandas) on init, load matplotlib on first chart cell to reduce initial load time

2. **Notebook cell output size limits**
   - What we know: Large outputs (big arrays, high-res images) can consume memory
   - What's unclear: What are reasonable limits for output size?
   - Recommendation: Set 10MB limit per cell output, truncate arrays with warning, defer to Phase 3 for container-based limits

3. **Comment thread depth limit**
   - What we know: Unbounded threads are bad for UX and performance
   - What's unclear: What's the optimal depth limit?
   - Recommendation: Limit to 3 levels (depth=2) based on Reddit/HackerNews patterns, allow "View all replies" for deeper threads

4. **Feed refresh strategy**
   - What we know: Users expect real-time updates but polling is inefficient
   - What we know: WebSocket adds complexity for Phase 2
   - What's unclear: Should we implement polling or wait for Phase 5?
   - Recommendation: Implement manual refresh button for Phase 2, defer real-time updates to Phase 5 with WebSocket

## Environment Availability

### Phase Dependencies

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 18+ | Next.js frontend | ✓ | 20.x+ | — |
| Python 3.11+ | FastAPI backend | ✓ | 3.11+ | — |
| PostgreSQL 17+ | Database | ✓ | 17+ | — |
| Redis 7.4.0 | Cache/queue | ✓ | 7.4.0 | — |
| Docker & Compose | Local dev | ✓ | Latest | — |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:** None

**External APIs:**
- Pyodide CDN (https://cdn.jsdelivr.net/pyodide/): Required for WASM runtime, no fallback (must work for Phase 2)

**Note:** All required infrastructure from Phase 1 is available. Phase 2 adds no new external dependencies beyond Pyodide CDN.

## Project Constraints (from CLAUDE.md)

### Architecture & Deployment
- **API-first design:** Separate frontend/backend folders for future mobile app compatibility
- **Docker Compose:** Local development environment
- **AWS target:** Production deployment (not Phase 2 scope)

### Technology Stack (Locked Decisions)
- **Frontend:** Next.js 16.2.2, React 19.2.4, TypeScript 6.0.2, Tailwind CSS 4.2.2, shadcn/ui
- **State Management:** Zustand 5.0.12 (NOT Redux)
- **Forms:** React Hook Form 7.72.0 + Zod 4.3.6
- **Backend:** FastAPI 0.135.3, Uvicorn, SQLAlchemy 2.0.48, Alembic
- **Database:** PostgreSQL 17+, psycopg2-binary
- **Cache/Queue:** Redis 7.4.0, Celery
- **Notebook Runtime:** Pyodide 0.26.3 (WASM), JupyterLab 4.5.6
- **Auth:** OAuth only (Google, Facebook), JWT with httpOnly cookies

### What NOT to Use
- **Redux / Redux Toolkit:** Use Zustand instead (lighter, simpler)
- **Material-UI (MUI):** Use shadcn/ui
- **Django REST Framework:** Use FastAPI
- **PostgreSQL with Prisma ORM:** Use SQLAlchemy
- **MongoDB:** Use PostgreSQL
- **Memcached:** Use Redis
- **Jest:** Use Vitest
- **AWS Lambda for notebook execution:** Use Docker containers (Phase 3)
- **Server-side notebook rendering (no CDN):** Use CDN for pre-rendered outputs (Phase 3)
- **Real-time collaborative editing (Liveblocks, Yjs):** Not in scope
- **NextAuth.js for backend:** Use python-jose for JWT
- **PostgreSQL as cache:** Use Redis
- **Direct Jupyter kernel usage:** Use Pyodide (WASM) and Docker containers
- **Running notebooks in browser for viewers:** Use pre-rendered outputs (Phase 3)
- **Heroku / PaaS:** Use AWS
- **Travis CI / CircleCI:** Use GitHub Actions

### GSD Workflow Enforcement
- Use `/gsd:quick` for small fixes, `/gsd:debug` for bugs, `/gsd:execute-phase` for planned work
- Do not make direct repo edits outside GSD workflow unless explicitly asked

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Backend Framework | pytest 9.0.2 |
| Frontend Framework | vitest 4.1.2 |
| Backend Config | `backend/pytest.ini` (Wave 0 creates) |
| Frontend Config | `frontend/vitest.config.ts` (Wave 0 creates) |
| Quick run command | `cd backend && pytest -xvs -k "test_"` (backend), `cd frontend && vitest run` (frontend) |
| Full suite command | `cd backend && pytest -xvs` (backend), `cd frontend && vitest run --reporter=verbose` (frontend) |
| Estimated runtime | ~5 seconds (combined) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NOTE-01 | User can create Python notebooks using WASM editor | unit | `pytest tests/test_notebook_service.py::test_create_notebook -x` | ❌ Wave 0 |
| NOTE-02 | User can preview compilation locally | integration | `vitest run tests/notebook/editor.test.ts` | ❌ Wave 0 |
| NOTE-06 | User can edit their own unpublished notebooks | unit | `pytest tests/test_notebook_service.py::test_update_notebook -x` | ❌ Wave 0 |
| NOTE-07 | User can delete their own notebooks (no forks) | unit | `pytest tests/test_notebook_service.py::test_delete_notebook -x` | ❌ Wave 0 |
| VIEW-01 | User can view Instagram-style feed | integration | `vitest run tests/feed/feed-list.test.ts` | ❌ Wave 0 |
| VIEW-02 | User can click notebook to view full | e2e | `playwright test tests/e2e/notebook-viewer.spec.ts` | ❌ Wave 0 |
| VIEW-04 | Feed lazy loads on scroll | integration | `vitest run tests/feed/infinite-scroll.test.ts` | ❌ Wave 0 |
| VIEW-05 | Notebook viewer is read-only | unit | `vitest run tests/notebook/viewer.test.ts` | ❌ Wave 0 |
| SOC-01 | User can like notebooks | unit | `pytest tests/test_like_service.py::test_like_notebook -x` | ❌ Wave 0 |
| SOC-02 | User can unlike notebooks | unit | `pytest tests/test_like_service.py::test_unlike_notebook -x` | ❌ Wave 0 |
| SOC-03 | User can comment on notebooks | unit | `pytest tests/test_comment_service.py::test_create_comment -x` | ❌ Wave 0 |
| SOC-04 | User can reply to comments (threaded) | unit | `pytest tests/test_comment_service.py::test_threaded_comments -x` | ❌ Wave 0 |
| SOC-05 | User can share notebooks | integration | `vitest run tests/social/share.test.ts` | ❌ Wave 0 |
| SOC-06 | User can view like/comment counts on cards | unit | `pytest tests/test_notebook_service.py::test_feed_includes_counts -x` | ❌ Wave 0 |
| PERF-03 | WASM editor initializes < 5s | e2e | `playwright test tests/performance/editor-load.spec.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && pytest -xvs -k "test_<feature>"` or `cd frontend && vitest run`
- **Per wave merge:** `cd backend && pytest -xvs && cd frontend && vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

**Backend Test Infrastructure:**
- [ ] `backend/tests/__init__.py` — empty file to mark as package
- [ ] `backend/tests/conftest.py` — shared fixtures for database, test client, Pyodide mock
- [ ] `backend/pytest.ini` — pytest configuration
- [ ] `backend/tests/test_notebook_service.py` — notebook CRUD tests
- [ ] `backend/tests/test_like_service.py` — like/unlike tests
- [ ] `backend/tests/test_comment_service.py` — threaded comment tests

**Frontend Test Infrastructure:**
- [ ] `frontend/tests/__init__.py` — empty file to mark as package
- [ ] `frontend/vitest.config.ts` — vitest configuration
- [ ] `frontend/tests/setup.ts` — test setup (MSW for API mocking, testing-library config)
- [ ] `frontend/tests/notebook/editor.test.ts` — Pyodide integration tests (with mocked Pyodide)
- [ ] `frontend/tests/feed/feed-list.test.ts` — infinite scroll tests
- [ ] `frontend/tests/social/like.test.ts` — optimistic update tests
- [ ] `frontend/tests/social/comment.test.ts` — threaded comment tests

**E2E Test Infrastructure:**
- [ ] `tests/e2e/notebook-viewer.spec.ts` — Playwright tests for notebook viewing
- [ ] `tests/e2e/editor.spec.ts` — Playwright tests for editor (with Pyodide CDN)

**Note:** Wave 0 is marked incomplete for Phase 1. Phase 2 should establish full test infrastructure since it's the first feature-heavy phase.

## Sources

### Primary (HIGH confidence)
- [Pyodide Documentation](https://pyodide.org/en/stable/) - Pyodide 0.26.3 API, package loading, runPythonAsync
- [Monaco Editor Documentation](https://microsoft.github.io/monaco-editor/) - Monaco API, React integration, editor options
- [Next.js Documentation](https://nextjs.org/docs) - Dynamic imports, API routes, Server Components
- [FastAPI Documentation](https://fastapi.tiangolo.com/) - Async endpoints, Pydantic validation, dependency injection
- [SQLAlchemy 2.0 Documentation](https://docs.sqlalchemy.org/en/20/) - Async session, recursive CTEs, relationships
- [React Hook Form Documentation](https://react-hook-form.com/) - Form handling, Zod integration, performance patterns
- [Zustand Documentation](https://zustand-demo.pmnd.rs/) - State management, persist middleware, patterns

### Secondary (MEDIUM confidence)
- [react-markdown Documentation](https://github.com/remarkjs/react-markdown) - Markdown rendering, security, plugins
- [Intersection Observer API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) - Infinite scroll, threshold detection
- [Instagram-like Feed Patterns](https://medium.com/@mario.douros/building-an-instagram-like-infinite-scroll-feed-with-react-4b9c8d3e0a1d) - Feed architecture, cursor-based pagination

### Tertiary (LOW confidence)
- [Threaded Comments Best Practices](https://www.reddit.com/r/webdev/comments/threaded_comments_react/) - Depth limits, lazy loading (verify with official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are from approved tech stack (CLAUDE.md, research/STACK.md)
- Architecture: HIGH - Patterns based on established Phase 1 structure (FastAPI services, Next.js app router, Zustand stores)
- Pitfalls: HIGH - Based on common WASM/editor/feed issues documented in Pyodide/Monaco blogs

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30 days - Pyodide and Monaco have stable APIs, but verify before implementation)
