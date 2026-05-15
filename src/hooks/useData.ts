import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getExifDate, getExifLocation, reverseGeocode } from '@/lib/exif-utils';
import { processImageForUpload } from '@/lib/image-processing';
import { signPhotoPaths, signPhotoPath } from '@/lib/sign-photos';

export const PHOTOS_PAGE_SIZE = 20;

function removePhotoFromCache(old: any, photoId: string) {
  if (!old) return old;
  if (Array.isArray(old)) return old.filter((row: any) => row.id !== photoId);
  if (Array.isArray(old.pages)) {
    return {
      ...old,
      pages: old.pages.map((page: any) => ({
        ...page,
        rows: Array.isArray(page.rows)
          ? page.rows.filter((row: any) => row.id !== photoId)
          : page.rows,
      })),
    };
  }
  return old;
}

export function useChildren() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['children', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .order('birth_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useAddChild() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (child: { name: string; birth_date: string; color: string }) => {
      const { error } = await supabase
        .from('children')
        .insert({ ...child, owner_id: user!.id });
      if (error) throw error;
      return null;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] }),
  });
}

/**
 * Sign a list of storage paths, reusing localStorage cache where possible.
 * Returns a map path -> signed URL.
 */
async function signPathsWithCache(paths: string[]): Promise<Record<string, string>> {
  return signPhotoPaths(paths);
}

async function attachSignedUrls(rows: any[]): Promise<any[]> {
  if (!rows || rows.length === 0) return rows ?? [];
  const fullPaths = rows.map(p => p.storage_path).filter(Boolean);
  const thumbPaths = rows
    .map(p => p.thumbnail_path)
    .filter((p): p is string => !!p);
  const urlMap = await signPathsWithCache([...fullPaths, ...thumbPaths]);
  return rows.map(p => ({
    ...p,
    signed_url: urlMap[p.storage_path] || '',
    thumbnail_signed_url: p.thumbnail_path
      ? urlMap[p.thumbnail_path] || urlMap[p.storage_path] || ''
      : urlMap[p.storage_path] || '',
  }));
}

/**
 * Background prefetch of signed URLs for the next page. Fire-and-forget:
 * fetches just storage paths and pre-warms the localStorage cache so that
 * when the user scrolls, attachSignedUrls resolves instantly from cache.
 */
async function prefetchNextPageUrls(childId: string | undefined, nextPageIndex: number): Promise<void> {
  try {
    const from = nextPageIndex * PHOTOS_PAGE_SIZE;
    const to = from + PHOTOS_PAGE_SIZE - 1;
    let query = supabase
      .from('photos')
      .select('storage_path, thumbnail_path')
      .order('taken_at', { ascending: false })
      .range(from, to);
    if (childId) query = query.eq('child_id', childId);
    const { data, error } = await query;
    if (error || !data) return;
    const paths: string[] = [];
    for (const row of data) {
      if (row.storage_path) paths.push(row.storage_path);
      if (row.thumbnail_path) paths.push(row.thumbnail_path);
    }
    if (paths.length > 0) await signPathsWithCache(paths);
  } catch {
    // Silently ignore — this is a background optimization
  }
}

export interface PhotoFilters {
  eventIds?: string[];
  locationName?: string | null;
  tagIds?: string[];
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated photos with infinite scroll. Filters are applied server-side as
 * WHERE clauses, so the result reflects the entire library — not just what's
 * already loaded. Changing filters changes the queryKey, which resets pagination.
 */
export function usePhotosInfinite(childId?: string, filters?: PhotoFilters) {
  const { user } = useAuth();
  const eventIds = filters?.eventIds && filters.eventIds.length > 0 ? [...filters.eventIds].sort() : undefined;
  const tagIds = filters?.tagIds && filters.tagIds.length > 0 ? [...filters.tagIds].sort() : undefined;
  const locationName = filters?.locationName ?? undefined;
  const sortOrder: 'asc' | 'desc' = filters?.sortOrder ?? 'desc';
  return useInfiniteQuery({
    queryKey: ['photos', 'infinite', childId ?? 'all', user?.id, { eventIds, tagIds, locationName, sortOrder }],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = (pageParam as number) * PHOTOS_PAGE_SIZE;
      const to = from + PHOTOS_PAGE_SIZE - 1;
      const tagJoin = tagIds ? 'photo_tags!inner(tag_id, tags(id, name, icon, color, is_predefined))' : 'photo_tags(tag_id, tags(id, name, icon, color, is_predefined))';
      let query = supabase
        .from('photos')
        .select(`*, events(name, icon, color), ${tagJoin}`)
        .order('taken_at', { ascending: sortOrder === 'asc' })
        .range(from, to);
      if (childId) query = query.eq('child_id', childId);
      if (eventIds) query = query.in('event_id', eventIds);
      if (locationName) query = query.eq('location_name', locationName);
      if (tagIds) query = query.in('photo_tags.tag_id', tagIds);
      const { data, error } = await query;
      if (error) throw error;
      const withUrls = await attachSignedUrls(data ?? []);
      return { rows: withUrls, page: pageParam as number };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.rows.length < PHOTOS_PAGE_SIZE) return undefined;
      return (lastPage.page as number) + 1;
    },
    enabled: !!user,
  });
}

/**
 * Non-paginated fetch of all photos (no LIMIT). Used by the duplicate finder
 * which needs the entire library to compute perceptual hashes. Heavy — only
 * call on demand.
 */
export function useAllPhotos(enabled: boolean, childId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['photos', 'all', childId ?? 'all', user?.id],
    queryFn: async () => {
      const PAGE = 1000;
      let offset = 0;
      const all: any[] = [];
      // Loop past the 1000-row Supabase default to get the full library
      for (;;) {
        let query = supabase
          .from('photos')
          .select('*, events(name, icon, color), photo_tags(tag_id, tags(id, name, icon, color, is_predefined))')
          .order('taken_at', { ascending: false })
          .range(offset, offset + PAGE - 1);
        if (childId) query = query.eq('child_id', childId);
        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < PAGE) break;
        offset += PAGE;
      }
      return await attachSignedUrls(all);
    },
    enabled: !!user && enabled,
    staleTime: 60_000,
  });
}

export function usePhotos(childId?: string) {
  return useAllPhotos(true, childId);
}

/**
 * Distinct location names visible to the current user. Used to populate the
 * location filter dropdown independently of which photos are currently loaded.
 */
export function useDistinctLocations(childId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['photos', 'locations', childId ?? 'all', user?.id],
    queryFn: async () => {
      let query = supabase
        .from('photos')
        .select('location_name')
        .not('location_name', 'is', null)
        .limit(1000);
      if (childId) query = query.eq('child_id', childId);
      const { data, error } = await query;
      if (error) throw error;
      const set = new Set<string>();
      (data ?? []).forEach((r: any) => { if (r.location_name) set.add(r.location_name); });
      return Array.from(set).sort();
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useEvents(childId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['events', childId],
    queryFn: async () => {
      let query = supabase.from('events').select('*').order('date', { ascending: true });
      if (childId) query = query.eq('child_id', childId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useAddEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ childId, name, date, description }: { childId: string; name: string; date?: Date | null; description?: string | null }) => {
      const insert: any = { child_id: childId, name, date: date ? date.toISOString().slice(0, 10) : null };
      if (description !== undefined && description !== null && description !== '') insert.description = description;
      const { data, error } = await supabase
        .from('events')
        .insert(insert)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId, name, date, description,
    }: { eventId: string; name?: string; date?: Date | null; description?: string | null }) => {
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (date !== undefined) updates.date = date ? date.toISOString().slice(0, 10) : null;
      if (description !== undefined) updates.description = description;
      const { error } = await supabase.from('events').update(updates).eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event-photos'] });
    },
  });
}

export function useLinkPhotosToEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, photoIds }: { eventId: string; photoIds: string[] }) => {
      if (photoIds.length === 0) return;
      const { data, error } = await supabase
        .from('photos')
        .update({ event_id: eventId })
        .in('id', photoIds)
        .select('id');
      if (error) throw error;
      if (!data || data.length !== photoIds.length) {
        throw new Error(`Solo se vincularon ${data?.length ?? 0} de ${photoIds.length} fotos. Revisa permisos.`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      queryClient.invalidateQueries({ queryKey: ['event-photos'] });
    },
  });
}

export function useTags() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function usePhotoTags(photoId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['photo_tags', photoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photo_tags')
        .select('*, tags(*)')
        .eq('photo_id', photoId!);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!photoId,
  });
}

export function useAddTag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (tag: { name: string; icon?: string; color?: string }) => {
      const { data, error } = await supabase
        .from('tags')
        .insert({ ...tag, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useTagPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ photoId, tagIds }: { photoId: string; tagIds: string[] }) => {
      await supabase.from('photo_tags').delete().eq('photo_id', photoId);
      if (tagIds.length > 0) {
        const { error } = await supabase
          .from('photo_tags')
          .insert(tagIds.map(tagId => ({ photo_id: photoId, tag_id: tagId })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo_tags'] });
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });
}

export function useUpdatePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      photoId, caption, eventId, tagIds, isShared, takenAt,
    }: {
      photoId: string;
      caption?: string | null;
      eventId?: string | null;
      tagIds?: string[];
      isShared?: boolean;
      takenAt?: string;
    }) => {
      const updates: any = {};
      if (caption !== undefined) updates.caption = caption ?? null;
      if (eventId !== undefined) updates.event_id = eventId ?? null;
      if (isShared !== undefined) updates.is_shared = isShared;
      if (takenAt) updates.taken_at = takenAt;

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('photos')
          .update(updates)
          .eq('id', photoId);
        if (error) throw error;
      }

      if (tagIds !== undefined) {
        await supabase.from('photo_tags').delete().eq('photo_id', photoId);
        if (tagIds.length > 0) {
          const { error: tagError } = await supabase
            .from('photo_tags')
            .insert(tagIds.map(tagId => ({ photo_id: photoId, tag_id: tagId })));
          if (tagError) throw tagError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      queryClient.invalidateQueries({ queryKey: ['photo_tags'] });
    },
  });
}

/**
 * Bulk-add (additive) tag assignments to multiple photos.
 * Uses upsert against the unique (photo_id, tag_id) constraint to ignore duplicates.
 */
export function useBulkAddTagsToPhotos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ photoIds, tagIds }: { photoIds: string[]; tagIds: string[] }) => {
      if (photoIds.length === 0 || tagIds.length === 0) return;
      const rows: { photo_id: string; tag_id: string }[] = [];
      for (const pid of photoIds) {
        for (const tid of tagIds) rows.push({ photo_id: pid, tag_id: tid });
      }
      const { error } = await supabase
        .from('photo_tags')
        .upsert(rows, { onConflict: 'photo_id,tag_id', ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      queryClient.invalidateQueries({ queryKey: ['photo_tags'] });
    },
  });
}

/**
 * Resolve a tag by name (case-insensitive), creating it if it doesn't exist.
 * Tags in this project are global with a unique name constraint.
 */
export function useResolveOrCreateTag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('empty');
      const { data: existing, error: findErr } = await supabase
        .from('tags')
        .select('*')
        .ilike('name', trimmed)
        .limit(1)
        .maybeSingle();
      if (findErr) throw findErr;
      if (existing) return existing;
      const { data: created, error: insErr } = await supabase
        .from('tags')
        .insert({ name: trimmed, created_by: user!.id })
        .select()
        .single();
      if (insErr) throw insErr;
      return created;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      photoId,
      storagePath,
      thumbnailPath,
    }: {
      photoId: string;
      storagePath: string;
      thumbnailPath?: string | null;
    }) => {
      // Derive thumbnail path if missing — convention is `<user>/<child>/<file>` -> `<user>/<child>/thumbs/<file>`
      let effectiveThumb = thumbnailPath ?? null;
      if (!effectiveThumb && storagePath) {
        const idx = storagePath.lastIndexOf('/');
        if (idx > 0) {
          effectiveThumb = `${storagePath.slice(0, idx)}/thumbs/${storagePath.slice(idx + 1)}`;
        }
      }

      // IMPORTANT: storage DELETE RLS policy checks that a matching photos row exists
      // and is owned by the user. We MUST delete from storage BEFORE removing the DB row,
      // otherwise the policy filters the object out and storage.remove() silently returns [].
      const toRemove = [storagePath];
      if (effectiveThumb) toRemove.push(effectiveThumb);

      const storageRes = await supabase.storage.from('photos').remove(toRemove);
      if (storageRes.error) {
        throw storageRes.error;
      }

      const tagsRes = await supabase.from('photo_tags').delete().eq('photo_id', photoId);
      if (tagsRes.error) {
        throw tagsRes.error;
      }

      const dbRes = await supabase.from('photos').delete().eq('id', photoId);
      if (dbRes.error) {
        throw dbRes.error;
      }
    },
    onSuccess: async (_data, variables) => {
      queryClient.setQueriesData({ queryKey: ['photos'] }, (old) => removePhotoFromCache(old, variables.photoId));
      await queryClient.invalidateQueries({ queryKey: ['photos'] });
      await queryClient.refetchQueries({ queryKey: ['photos'], type: 'active' });
    },
  });
}

export function useUploadPhoto() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      file, childId, caption, takenAt, eventId, tagIds, isShared,
    }: {
      file: File;
      childId: string;
      caption?: string;
      takenAt?: Date;
      eventId?: string;
      tagIds?: string[];
      isShared?: boolean;
    }) => {
      // Extract EXIF data
      let photoDate = takenAt;
      if (!photoDate) {
        photoDate = await getExifDate(file) || undefined;
      }

      // Extract location
      let locationLat: number | null = null;
      let locationLng: number | null = null;
      const loc = await getExifLocation(file);
      if (loc) {
        locationLat = loc.lat;
        locationLng = loc.lng;
      }

      const ext = 'jpg'; // we always re-encode to JPEG
      const baseName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const fullPath = `${user!.id}/${childId}/${baseName}.${ext}`;
      const thumbPath = `${user!.id}/${childId}/thumbs/${baseName}.${ext}`;

      // Compress full + generate thumbnail in parallel
      const { full, thumbnail } = await processImageForUpload(file);

      // Upload both versions in parallel
      const [fullUpload, thumbUpload] = await Promise.all([
        supabase.storage.from('photos').upload(fullPath, full, {
          contentType: 'image/jpeg',
          cacheControl: '31536000',
        }),
        supabase.storage.from('photos').upload(thumbPath, thumbnail, {
          contentType: 'image/jpeg',
          cacheControl: '31536000',
        }),
      ]);
      if (fullUpload.error) throw fullUpload.error;
      if (thumbUpload.error) {
        // Thumb is best-effort: log but don't fail upload
        console.warn('Thumbnail upload failed, falling back to full image:', thumbUpload.error);
      }

      const { data, error } = await supabase
        .from('photos')
        .insert({
          child_id: childId,
          uploaded_by: user!.id,
          storage_path: fullPath,
          thumbnail_path: thumbUpload.error ? null : thumbPath,
          caption,
          taken_at: (photoDate || new Date()).toISOString(),
          event_id: eventId || null,
          location_lat: locationLat,
          location_lng: locationLng,
          is_shared: isShared ?? true,
        })
        .select()
        .single();
      if (error) {
        // Clean up orphaned files from Storage before throwing
        const toRemove = [fullPath];
        if (!thumbUpload.error) toRemove.push(thumbPath);
        await supabase.storage.from('photos').remove(toRemove).catch(() => {});
        throw error;
      }

      // Geocoding en segundo plano (después de insertar, no bloquea)
      if (loc && data?.id) {
        (async () => {
          const name = await reverseGeocode(loc.lat, loc.lng);
          if (name) {
            await supabase.from('photos')
              .update({ location_name: name })
              .eq('id', data.id);
          }
        })().catch(() => {});
      }

      if (tagIds && tagIds.length > 0 && data) {
        const { error: tagError } = await supabase
          .from('photo_tags')
          .insert(tagIds.map(tagId => ({ photo_id: data.id, tag_id: tagId })));
        if (tagError) console.error('Failed to tag photo:', tagError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });
}

// ---------- Child profile / avatar ----------

export function useUpdateChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      childId,
      name,
      fullName,
      birthDate,
      profilePhotoPath,
    }: {
      childId: string;
      name?: string;
      fullName?: string | null;
      birthDate?: string;
      profilePhotoPath?: string | null;
    }) => {
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (fullName !== undefined) updates.full_name = fullName;
      if (birthDate !== undefined) updates.birth_date = birthDate;
      if (profilePhotoPath !== undefined) updates.profile_photo_path = profilePhotoPath;
      const { error } = await supabase.from('children').update(updates).eq('id', childId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] }),
  });
}

export function useUploadChildProfilePhoto() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ file, childId }: { file: File; childId: string }) => {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `profiles/${user!.id}/${childId}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('photos')
        .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true, cacheControl: '31536000' });
      if (error) throw error;
      return path;
    },
  });
}

export function useSignedProfilePhotoUrl(path?: string | null) {
  return useQuery({
    queryKey: ['profile-photo-url', path],
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage.from('photos').createSignedUrl(path, 3600);
      if (error) return null;
      return data.signedUrl;
    },
    enabled: !!path,
  });
}

// ---------- Activities ----------

export function useActivities(childId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['activities', childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('child_id', childId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!childId,
  });
}

export function useAddActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      childId,
      name,
      type,
      icon,
    }: {
      childId: string;
      name: string;
      type: 'sport' | 'hobby' | 'other';
      icon?: string;
    }) => {
      const { data, error } = await supabase
        .from('activities')
        .insert({ child_id: childId, name, type, icon: icon ?? null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => queryClient.invalidateQueries({ queryKey: ['activities', vars.childId] }),
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ activityId }: { activityId: string; childId: string }) => {
      const { error } = await supabase.from('activities').delete().eq('id', activityId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => queryClient.invalidateQueries({ queryKey: ['activities', vars.childId] }),
  });
}

// ---------- Birthday notification settings ----------

export function useBirthdayNotificationSettings(childId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['birthday-notif', user?.id, childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('birthday_notification_settings')
        .select('*')
        .eq('user_id', user!.id)
        .eq('child_id', childId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!childId,
  });
}

export function useUpdateBirthdayNotificationSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      childId,
      notifySameDay,
      notifyDayBefore,
    }: {
      childId: string;
      notifySameDay: boolean;
      notifyDayBefore: boolean;
    }) => {
      const { error } = await supabase
        .from('birthday_notification_settings')
        .upsert(
          {
            user_id: user!.id,
            child_id: childId,
            notify_same_day: notifySameDay,
            notify_day_before: notifyDayBefore,
          },
          { onConflict: 'user_id,child_id' }
        );
      if (error) throw error;
    },
    onSuccess: (_d, vars) =>
      queryClient.invalidateQueries({ queryKey: ['birthday-notif', user?.id, vars.childId] }),
  });
}
