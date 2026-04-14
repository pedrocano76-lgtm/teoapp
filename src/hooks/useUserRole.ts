import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useUserRole() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['user_role', user?.id],
    queryFn: async () => {
      // Check if user owns any children
      const { data: ownChildren } = await supabase
        .from('children')
        .select('id')
        .eq('owner_id', user!.id)
        .limit(1);

      if (ownChildren && ownChildren.length > 0) return 'owner' as const;

      // Check family_shares for this user
      const { data: shares } = await supabase
        .from('family_shares')
        .select('role')
        .eq('shared_with_user_id', user!.id);

      if (shares?.some(s => s.role === 'parent')) return 'parent' as const;
      if (shares?.some(s => s.role === 'guest')) return 'guest' as const;

      return 'owner' as const; // default for new users
    },
    enabled: !!user,
  });

  return {
    role: data ?? 'owner',
    isGuest: data === 'guest',
    canEdit: data !== 'guest',
    isLoading,
  };
}
