import { apiClient, NotebookResponse } from '@/lib/api-client';

const STORAGE_KEY = 'pending-auth-action';
const VERSION = 1;
const TTL_MS = 15 * 60 * 1000;

export type PendingActionType = 'like' | 'fork' | 'follow';

export interface PendingAction {
  version: number;
  type: PendingActionType;
  notebookId?: number;
  targetUserId?: number;
  returnPath: string;
  createdAt: number;
  nonce: string;
}

function sanitizeReturnPath(path: string): string {
  // Only allow same-origin relative paths to avoid open redirects.
  if (!path || !path.startsWith('/') || path.startsWith('//')) {
    return '/feed';
  }
  return path;
}

function isValidId(id: unknown): id is number {
  return typeof id === 'number' && Number.isInteger(id) && id > 0;
}

function validate(action: unknown): PendingAction | null {
  if (!action || typeof action !== 'object') return null;
  const a = action as PendingAction;
  if (a.version !== VERSION) return null;
  if (!['like', 'fork', 'follow'].includes(a.type)) return null;
  if (typeof a.createdAt !== 'number') return null;
  if (Date.now() - a.createdAt > TTL_MS) return null;
  if (typeof a.nonce !== 'string' || a.nonce.length < 8) return null;
  if (typeof a.returnPath !== 'string') return null;

  if ((a.type === 'like' || a.type === 'fork') && !isValidId(a.notebookId)) return null;
  if (a.type === 'follow' && !isValidId(a.targetUserId)) return null;

  return {
    ...a,
    returnPath: sanitizeReturnPath(a.returnPath),
  };
}

export function savePendingAction(input: {
  type: PendingActionType;
  notebookId?: number;
  targetUserId?: number;
  returnPath: string;
}): void {
  if (typeof window === 'undefined') return;

  const payload: PendingAction = {
    version: VERSION,
    type: input.type,
    notebookId: input.notebookId,
    targetUserId: input.targetUserId,
    returnPath: sanitizeReturnPath(input.returnPath),
    createdAt: Date.now(),
    nonce: crypto.randomUUID(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function getPendingAction(): PendingAction | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const valid = validate(parsed);
    if (!valid) {
      clearPendingAction();
      return null;
    }
    return valid;
  } catch {
    clearPendingAction();
    return null;
  }
}

export function clearPendingAction(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export async function executePendingAction(action: PendingAction): Promise<NotebookResponse | null> {
  if (action.type === 'like' && action.notebookId) {
    await apiClient.toggleLike(action.notebookId);
    return null;
  }
  if (action.type === 'fork' && action.notebookId) {
    const notebook = await apiClient.forkNotebook(action.notebookId);
    return notebook;
  }
  if (action.type === 'follow' && action.targetUserId) {
    await apiClient.followUser(action.targetUserId);
    return null;
  }
  throw new Error('Invalid pending action payload');
}
