const STORAGE_KEY = 'nb-viewer-anon-id';

function randomUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Stable anonymous viewer id for notebook presence (one per browser profile). */
export function getOrCreateAnonymousViewerId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : randomUuidV4();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
