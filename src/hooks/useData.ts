import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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
      const { data, error } = await supabase
        .from('children')
        .insert({ ...child, owner_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
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

export function useUploadPhoto() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      file,
      childId,
      caption,
      takenAt,
    }: {
      file: File;
      childId: string;
      caption?: string;
      takenAt?: Date;
    }) => {
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
          taken_at: (takenAt || new Date()).toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['photos'] }),
  });
}
