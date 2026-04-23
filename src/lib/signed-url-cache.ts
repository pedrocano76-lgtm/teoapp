/**
 * LocalStorage cache for Supabase signed URLs.
 * Signed URLs expire in 1h; we cache with a 5min safety margin so we don't
 * hand out URLs that are about to expire.
 *
 * Storage key: lm:url:<storage_path> -> { url, expiresAt }
 */

const KEY_PREFIX = 'lm:url:';
const SAFETY_MARGIN_MS = 5 * 60 * 1000; // refresh 5 min before real expiry

interface CachedEntry {
  url: string;
  expiresAt: number; // ms epoch
}

function read(path: string): CachedEntry | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + path);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry;
    if (!parsed?.url || !parsed?.expiresAt) return null;
    if (Date.now() + SAFETY_MARGIN_MS >= parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function write(path: string, url: string, ttlSeconds: number) {
  try {
    const entry: CachedEntry = {
      url,
      expiresAt: Date.now() + ttlSeconds * 1000,
    };
    localStorage.setItem(KEY_PREFIX + path, JSON.stringify(entry));
  } catch {
    // Quota exceeded or storage disabled — ignore, just means no cache.
  }
}

export function getCachedSignedUrl(path: string): string | null {
  return read(path)?.url ?? null;
}

export function getCachedSignedUrls(paths: string[]): {
  cached: Record<string, string>;
  missing: string[];
} {
  const cached: Record<string, string> = {};
  const missing: string[] = [];
  for (const p of paths) {
    const hit = read(p);
    if (hit) cached[p] = hit.url;
    else missing.push(p);
  }
  return { cached, missing };
}

export function setCachedSignedUrl(path: string, url: string, ttlSeconds: number) {
  write(path, url, ttlSeconds);
}

export function setCachedSignedUrls(
  entries: { path: string; url: string }[],
  ttlSeconds: number
) {
  for (const e of entries) write(e.path, e.url, ttlSeconds);
}

/**
 * Cleanup: drop expired entries. Best-effort. Call occasionally
 * (e.g. once on app load) to keep localStorage tidy.
 */
export function pruneExpiredSignedUrls() {
  try {
    const now = Date.now();
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(KEY_PREFIX)) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as CachedEntry;
        if (!parsed?.expiresAt || parsed.expiresAt < now) {
          toRemove.push(key);
        }
      } catch {
        toRemove.push(key);
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
