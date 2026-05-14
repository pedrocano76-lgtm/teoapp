import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import i18n from '@/i18n';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  displayName: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (event === 'SIGNED_IN' && session?.user) {
          // Disparar notificación de primer acceso (idempotente en backend)
          setTimeout(() => {
            supabase.functions.invoke('notify-share-access', { body: {} }).catch(() => {});
          }, 0);
          // Cargar locale del perfil y aplicarlo
          setTimeout(async () => {
            const { data } = await supabase
              .from('profiles')
              .select('locale')
              .eq('user_id', session.user.id)
              .maybeSingle();
            const loc = (data as any)?.locale;
            if (loc === 'es' || loc === 'en') {
              if (!i18n.language?.startsWith(loc)) await i18n.changeLanguage(loc);
            }
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('locale')
          .eq('user_id', session.user.id)
          .maybeSingle();
        const loc = (data as any)?.locale;
        if ((loc === 'es' || loc === 'en') && !i18n.language?.startsWith(loc)) {
          await i18n.changeLanguage(loc);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
