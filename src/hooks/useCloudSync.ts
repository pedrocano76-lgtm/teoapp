import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useCloudConnections() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['cloud_connections', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cloud_connections')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useAddCloudConnection() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (conn: { provider: string; folder_path: string; folder_name: string }) => {
      const { data, error } = await supabase
        .from('cloud_connections')
        .insert({ ...conn, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cloud_connections'] }),
  });
}

export function useDeleteCloudConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cloud_connections')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloud_connections'] });
      queryClient.invalidateQueries({ queryKey: ['pending_imports'] });
    },
  });
}

export function usePendingImports(childId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pending_imports', childId],
    queryFn: async () => {
      let query = supabase
        .from('pending_imports')
        .select('*')
        .eq('status', 'pending')
        .order('confidence_score', { ascending: false, nullsFirst: false });
      if (childId) query = query.eq('child_id', childId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useSyncOneDrive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      action: string;
      connectionId?: string;
      childId?: string;
      folderPath?: string;
      referencePhotoUrls?: string[];
    }) => {
      const { data, error } = await supabase.functions.invoke('sync-onedrive', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_imports'] });
      queryClient.invalidateQueries({ queryKey: ['cloud_connections'] });
    },
  });
}

export function useImportPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { action: string; importIds: string[] }) => {
      const { data, error } = await supabase.functions.invoke('import-photo', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_imports'] });
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });
}
