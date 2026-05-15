import { supabase } from '@/integrations/supabase/client';
import { signPathsCached } from './signed-url-cache';

/**
 * Sign storage paths in the `photos` bucket, reusing the localStorage cache.
 * Returns a map of path -> signed URL. Missing/failed paths are simply absent.
 */
export async function signPhotoPaths(paths: string[]): Promise<Record<string, string>> {
  return signPathsCached(paths, async (missing, ttl) => {
    const { data, error } = await supabase.storage
      .from('photos')
      .createSignedUrls(missing, ttl);
    if (error || !data) return [];
    return data
      .filter(d => d.signedUrl && d.path)
      .map(d => ({ path: d.path as string, url: d.signedUrl as string }));
  });
}

export async function signPhotoPath(path: string): Promise<string | null> {
  const map = await signPhotoPaths([path]);
  return map[path] ?? null;
}
