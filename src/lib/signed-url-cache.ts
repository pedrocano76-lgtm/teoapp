/**
 * LocalStorage cache for Supabase signed URLs.
 *
 * Storage key:   surl_<storage_path>
 * Storage value: { url: string, expires_at: number (ms epoch) }
 *
 * Signed URLs are issued with a 1h TTL by Supabase. We refresh 5 min before
 * the actual expiry to avoid handing out URLs that are about to die.
 */

const KEY_PREFIX = 'surl_';
const SAFETY_MARGIN_MS = 5 * 60 * 1000;

interface CachedEntry {
  url: string;
  expires_at: number;
}

function keyFor(path: string) {
  return KEY_PREFIX + path;
}

function read(path: string): CachedEntry | null {
  try {
    const raw = localStorage.getItem(keyFor(path));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry;
    if (!parsed?.url || !parsed?.expires_at) return null;
    if (Date.now() + SAFETY_MARGIN_MS >= parsed.expires_at) return null;
    return parsed;
  } catch {
    return null;
  }
}

function write(path: string, url: string, ttlSeconds: number) {
  try {
    const entry: CachedEntry = {
      url,
      expires_at: Date.now() + ttlSeconds * 1000,
    };
    localStorage.setItem(keyFor(path), JSON.stringify(entry));
  } catch {
    // quota exceeded / storage disabled — ignore
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

/** Drop expired entries. Best-effort. Call once on app load. */
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
        if (!parsed?.expires_at || parsed.expires_at < now) toRemove.push(key);
      } catch {
        toRemove.push(key);
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/** Wipe every cached signed URL. Call on logout. */
export function clearAllSignedUrls() {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(KEY_PREFIX)) toRemove.push(key);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

const SIGNED_URL_TTL_SECONDS = 3600; // 1h, matches Supabase default

/**
 * Sign a list of storage paths, reusing cached URLs where possible.
 * Returns a map of path -> signed URL.
 *
 * `signer` is injected so this module stays free of Supabase imports.
 * Use `signPathsWithCache` (in useData) for the wired-up version.
 */
export async function signPathsCached(
  paths: string[],
  signer: (missing: string[], ttl: number) => Promise<{ path: string; url: string }[]>
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const unique = Array.from(new Set(paths.filter(Boolean)));
  const { cached, missing } = getCachedSignedUrls(unique);
  if (missing.length === 0) return cached;

  const fresh = await signer(missing, SIGNED_URL_TTL_SECONDS);
  const newEntries: { path: string; url: string }[] = [];
  for (const f of fresh) {
    if (f.url && f.path) {
      cached[f.path] = f.url;
      newEntries.push(f);
    }
  }
  if (newEntries.length > 0) setCachedSignedUrls(newEntries, SIGNED_URL_TTL_SECONDS);
  return cached;
}

export { SIGNED_URL_TTL_SECONDS };
