import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getExifDate, getExifLocation, reverseGeocode } from '@/lib/exif-utils';
import { processImageForUpload } from '@/lib/image-processing';

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

export function usePhotos(childId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['photos', childId],
    queryFn: async () => {
      let query = supabase
        .from('photos')
        .select('*, events(name, icon, color)')
        .order('taken_at', { ascending: true });
      if (childId) query = query.eq('child_id', childId);
      const { data, error } = await query;
      if (error) throw error;

      // Generate signed URLs for the private bucket (full + thumbnail)
      if (data && data.length > 0) {
        const fullPaths = data.map(p => p.storage_path);
        const thumbPaths = data
          .map(p => (p as any).thumbnail_path)
          .filter((p): p is string => !!p);
        const allPaths = Array.from(new Set([...fullPaths, ...thumbPaths]));

        const { data: signedData, error: signError } = await supabase.storage
          .from('photos')
          .createSignedUrls(allPaths, 3600);
        if (!signError && signedData) {
          const urlMap: Record<string, string> = {};
          signedData.forEach(s => {
            if (s.signedUrl) urlMap[s.path] = s.signedUrl;
          });
          return data.map(p => ({
            ...p,
            signed_url: urlMap[p.storage_path] || '',
            thumbnail_signed_url: (p as any).thumbnail_path
              ? urlMap[(p as any).thumbnail_path] || urlMap[p.storage_path] || ''
              : urlMap[p.storage_path] || '',
          }));
        }
      }

      return data;
    },
    enabled: !!user,
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
      caption?: string;
      eventId?: string | null;
      tagIds?: string[];
      isShared?: boolean;
      takenAt?: string;
    }) => {
      const updates: any = { caption: caption ?? null, event_id: eventId ?? null };
      if (isShared !== undefined) updates.is_shared = isShared;
      if (takenAt) updates.taken_at = takenAt;
      const { error } = await supabase
        .from('photos')
        .update(updates)
        .eq('id', photoId);
      if (error) throw error;

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
      await supabase.from('photo_tags').delete().eq('photo_id', photoId);
      const { error } = await supabase.from('photos').delete().eq('id', photoId);
      if (error) throw error;
      const toRemove = [storagePath];
      if (thumbnailPath) toRemove.push(thumbnailPath);
      await supabase.storage.from('photos').remove(toRemove);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
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
      let locationName: string | null = null;
      const loc = await getExifLocation(file);
      if (loc) {
        locationLat = loc.lat;
        locationLng = loc.lng;
        locationName = await reverseGeocode(loc.lat, loc.lng);
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
          location_name: locationName,
          is_shared: isShared ?? true,
        })
        .select()
        .single();
      if (error) throw error;

      if (tagIds && tagIds.length > 0 && data) {
        const { error: tagError } = await supabase
          .from('photo_tags')
          .insert(tagIds.map(tagId => ({ photo_id: data.id, tag_id: tagId })));
        if (tagError) console.error('Failed to tag photo:', tagError);
      }

      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['photos'] }),
  });
}
