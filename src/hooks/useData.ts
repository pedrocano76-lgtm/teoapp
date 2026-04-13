import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getExifDate } from '@/lib/exif-utils';

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
      
      if (childId) {
        query = query.eq('child_id', childId);
      }

      const { data, error } = await query;
      if (error) throw error;
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
      // Remove existing tags
      await supabase.from('photo_tags').delete().eq('photo_id', photoId);
      // Add new ones
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

export function useUploadPhoto() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      file,
      childId,
      caption,
      takenAt,
      eventId,
      tagIds,
    }: {
      file: File;
      childId: string;
      caption?: string;
      takenAt?: Date;
      eventId?: string;
      tagIds?: string[];
    }) => {
      // Try to extract EXIF date if no date provided
      let photoDate = takenAt;
      if (!photoDate) {
        photoDate = await getExifDate(file) || undefined;
      }

      const ext = file.name.split('.').pop();
      const path = `${user!.id}/${childId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from('photos')
        .insert({
          child_id: childId,
          uploaded_by: user!.id,
          storage_path: path,
          caption,
          taken_at: (photoDate || new Date()).toISOString(),
          event_id: eventId || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Tag the photo if tags selected
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
