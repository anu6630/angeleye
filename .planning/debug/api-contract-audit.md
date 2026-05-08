# Frontend-Backend API Contract Audit

This audit compares `frontend/lib/api-client.ts` against backend routes under `backend/app/api/v1/*/router.py`.

## Contract Table

| Frontend method | FE expected endpoint + shape | Backend endpoint + actual shape | Status | Impact | Recommended fix |
|---|---|---|---|---|---|
| `loginWithGoogle` | `GET /auth/google` redirect | `GET /api/v1/auth/google` redirect OAuth flow | Aligned | None | None |
| `loginWithFacebook` | `GET /auth/facebook` redirect | `GET /api/v1/auth/facebook` redirect OAuth flow | Aligned | None | None |
| `completeProfile` | `POST /auth/complete-profile` -> `AuthResponse` | `POST /api/v1/auth/complete-profile` -> `ProfileCompletionResponse` with matching keys | Aligned | None | None |
| `getCurrentUser` | `GET /auth/me` -> `User` | `GET /api/v1/auth/me` -> `MeResponse` matching fields | Aligned | None | None |
| `logout` | `POST /auth/logout` | `POST /api/v1/auth/logout` -> `{success,message}` | Aligned | None | None |
| `getProfile` | `GET /profiles/me` -> `User` | `GET /api/v1/profiles/me` -> `ProfileResponse` superset including `email` | Aligned | None | None |
| `updateProfile` | `PUT /profiles/me` -> `User` | `PUT /api/v1/profiles/me` -> `ProfileResponse` superset | Aligned | None | None |
| `getProfileStats` | `GET /profiles/stats` -> `{published_notebook_count,likes_received_count}` | `GET /api/v1/profiles/stats` -> `ProfileStatsResponse` (contains requested keys) | Aligned | None | None |
| `getPublicProfile` | `GET /profiles/{username}` -> `User`-like shape | `GET /api/v1/profiles/{username}` -> `PublicProfileResponse` (no `id/email/is_active/is_verified`) | Partial mismatch | Type-level mismatch can hide runtime errors | Add dedicated FE type `PublicProfile` and update method return type |
| `createNotebook` | `POST /notebooks` -> `NotebookResponse` | `POST /api/v1/notebooks` -> `NotebookResponse` | Aligned | None | None |
| `getNotebook` | `GET /notebooks/{id}` -> `NotebookResponse` | `GET /api/v1/notebooks/{id}` -> `NotebookResponse` + metrics enrichment | Aligned | None | None |
| `updateNotebook` | `PUT /notebooks/{id}` -> `NotebookResponse` | `PUT /api/v1/notebooks/{id}` -> `NotebookResponse` | Aligned | None | None |
| `deleteNotebook` | `DELETE /notebooks/{id}` -> `204` | `DELETE /api/v1/notebooks/{id}` -> `204` | Aligned | None | None |
| `getUserNotebooks` | `GET /notebooks` -> `NotebookResponse[]` | `GET /api/v1/notebooks` is defined **twice**: one returns list, another returns wrapper `{notebooks,total,skip,limit}` | **Mismatch (critical)** | Unstable behavior depending on route registration; FE may crash if wrapper returned | Keep one route only. Prefer wrapper response + update FE method to parse wrapper and return explicit typed envelope |
| `getFeed` | `GET /feed?cursor=` -> `{items,next_cursor,has_more}` | `GET /api/v1/feed` returns personalized/trending feed with same keys | Aligned | None | None |
| `toggleLike` | `POST /likes/toggle` -> `{liked,like_count}` | `POST /api/v1/likes/toggle` -> `LikeResponse` | Aligned | None | None |
| `createComment` | `POST /comments` -> `CommentResponse` | `POST /api/v1/comments` -> `CommentResponse` | Aligned | None | None |
| `getComments` | `GET /comments/{notebookId}` -> `CommentResponse[]` | `GET /api/v1/comments/{notebook_id}` -> `list[CommentResponse]` | Aligned | None | None |
| `getCommentCount` | `GET /comments/{id}/count` -> `{count}` | `GET /api/v1/comments/{id}/count` -> `{notebook_id,count}` | Aligned (extra backend field) | None | Optional: align FE type to include `notebook_id` |
| `uploadDataset` | `POST /datasets` multipart -> `Dataset` | `POST /api/v1/datasets` -> `DatasetResponse` | Aligned | None | None |
| `getDatasets` | `GET /datasets` -> `{datasets,total}` | `GET /api/v1/datasets` -> `DatasetListResponse` | Aligned | None | None |
| `getDataset` | `GET /datasets/{id}` -> `Dataset` | `GET /api/v1/datasets/{id}` -> `DatasetResponse` | Aligned | None | None |
| `deleteDataset` | `DELETE /datasets/{id}` -> `204` | `DELETE /api/v1/datasets/{id}` -> `204` | Aligned | None | None |
| `compileNotebookAsync` | `POST /compilation/compile/async` -> async task response | `POST /api/v1/compilation/compile/async` -> `AsyncCompilationResponse` | Aligned | None | None |
| `getCompilationStatus` | `GET /compilation/status/{taskId}` -> `CompilationStatusResponse` | `GET /api/v1/compilation/status/{task_id}` -> `dict` from Celery status helper | Partial mismatch | FE strong type may not match backend if fields vary (`state/result/error`) | Add backend response model for status and enforce stable keys |
| `publishNotebook` | `POST /compilation/publish` -> `PublishResponse` | `POST /api/v1/compilation/publish` -> `PublishResponse` | Aligned | None | None |
| `forkNotebook` | `POST /notebooks/{id}/fork` -> `NotebookResponse` | `POST /api/v1/notebooks/{id}/fork` -> `NotebookResponse` | Aligned | None | None |
| `getNotebookForks` | `GET /notebooks/{id}/forks` -> `NotebookResponse[]` | `GET /api/v1/notebooks/{id}/forks` -> `{forks: NotebookResponse[], total: number}` | **Mismatch** | FE may treat object as array and fail rendering/mapping | Update FE return type to wrapper or backend to return raw list; prefer wrapper for pagination extensibility |
| `getForkChain` | `GET /notebooks/{id}/chain` -> `NotebookResponse[]` | `GET /api/v1/notebooks/{id}/chain` -> `{chain: NotebookResponse[], total: number}` | **Mismatch** | FE may treat object as array and fail rendering/mapping | Update FE return type to wrapper or backend to return raw list |
| `followUser` | `POST /follows` -> `{message,following_id}` | `POST /api/v1/follows` -> same body, status `201` | Aligned | None | None |
| `unfollowUser` | `DELETE /follows/{id}` -> `{message}` | `DELETE /api/v1/follows/{id}` -> same body | Aligned | None | None |
| `getUserFollowers` | `GET /follows/followers/{id}` -> `User[]` | `GET /api/v1/follows/followers/{id}` -> `{followers_count:number}` | **Mismatch** | FE type is wrong; any UI expecting list will break | Change FE signature to count response or add a new backend list endpoint |
| `getUserFollowing` | `GET /follows/following/{id}` -> `User[]` | `GET /api/v1/follows/following/{id}` -> `{following_count:number}` | **Mismatch** | FE type is wrong; any UI expecting list will break | Change FE signature to count response or add a new backend list endpoint |
| `checkFollowing` | `GET /follows/check/{id}` -> `{is_following}` | `GET /api/v1/follows/check/{id}` -> `FollowCheckResponse` | Aligned | None | None |
| `searchNotebooks` | `GET /search?q&tab&limit` -> `{notebooks,total,empty_state,message?}` | `GET /api/v1/search` -> same keys plus extras (`facet_distribution`,`from_meilisearch`) | Aligned (extra backend fields) | None | Optional: extend FE type to include optional extra keys |

## Priority Fixes

1. Remove duplicate `GET /notebooks` route in `backend/app/api/v1/notebooks/router.py` and settle one response contract.
2. Align forks/chain contracts (`getNotebookForks`, `getForkChain`) to wrapper-vs-array consistently.
3. Align followers/following contracts (count vs list) in FE API client and any consuming UI.
4. Define a strict backend response model for `GET /compilation/status/{task_id}`.
