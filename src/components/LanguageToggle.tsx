import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  className?: string;
}

const LANGS: Array<{ code: 'es' | 'en'; label: string }> = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
];

export function LanguageToggle({ className }: Props) {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const current: 'es' | 'en' = i18n.language?.startsWith('es') ? 'es' : 'en';

  const change = async (code: 'es' | 'en') => {
    if (code === current) return;
    await i18n.changeLanguage(code);
    if (user) {
      await (supabase.from('profiles') as any).update({ locale: code }).eq('user_id', user.id);
    }
  };

  return (
    <div className={`inline-flex items-center gap-1 ${className ?? ''}`}>
      {LANGS.map(l => {
        const active = l.code === current;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => change(l.code)}
            aria-pressed={active}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-colors"
            style={{
              background: active ? '#C8845A' : '#EDE0D4',
              color: active ? '#FFFFFF' : '#7A6A5A',
            }}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
