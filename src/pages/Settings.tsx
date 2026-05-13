import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useChildren, usePhotosInfinite } from '@/hooks/useData';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sun, Moon, Monitor, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LanguageToggle } from '@/components/LanguageToggle';
import { FamilySection } from '@/components/FamilySection';
import { DuplicateFinder } from '@/components/DuplicateFinder';
import { Navigate } from 'react-router-dom';

type Frequency = 3 | 5 | 7;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {title}
      </h2>
      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        {children}
      </div>
    </section>
  );
}

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { canEdit } = useUserRole();

  const [enabled, setEnabled] = useState(true);
  const [birthdaysEnabled, setBirthdaysEnabled] = useState(true);
  const [uploadsEmailEnabled, setUploadsEmailEnabled] = useState(true);
  const [frequency, setFrequency] = useState<Frequency>(5);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const { data: childrenData } = useChildren();
  const { data: photosPages } = usePhotosInfinite(undefined);
  const children = (childrenData || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    birthDate: new Date(row.birth_date),
    color: row.color,
    ownerId: row.owner_id,
  })) as any[];
  const photos = (photosPages?.pages || []).flatMap((p: any) =>
    p.rows.map((row: any) => ({
      id: row.id,
      url: row.signed_url || '',
      thumbnailUrl: row.thumbnail_signed_url || row.signed_url || '',
      childId: row.child_id,
      storagePath: row.storage_path,
      thumbnailPath: row.thumbnail_path ?? null,
    })),
  ) as any[];

  const themeOptions = [
    { value: 'light' as const, label: t('settings.themeLight'), icon: Sun },
    { value: 'dark' as const, label: t('settings.themeDark'), icon: Moon },
    { value: 'system' as const, label: t('settings.themeSystem'), icon: Monitor },
  ];
  const freqOptions: Frequency[] = [3, 5, 7];

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('reminder_settings')
        .select('enabled, inactivity_days, birthdays_enabled, notify_uploads_email')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setEnabled(data.enabled);
        setFrequency(data.inactivity_days as Frequency);
        setBirthdaysEnabled((data as any).birthdays_enabled ?? true);
        setUploadsEmailEnabled((data as any).notify_uploads_email ?? true);
      } else {
        await supabase.from('reminder_settings').insert({
          user_id: user.id,
          enabled: true,
          inactivity_days: 5,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const persist = async (next: { enabled?: boolean; frequency?: Frequency; birthdays?: boolean; uploadsEmail?: boolean }) => {
    if (!user) return;
    const payload: any = {
      user_id: user.id,
      enabled: next.enabled ?? enabled,
      inactivity_days: next.frequency ?? frequency,
      birthdays_enabled: next.birthdays ?? birthdaysEnabled,
      notify_uploads_email: next.uploadsEmail ?? uploadsEmailEnabled,
    };
    const { error } = await supabase
      .from('reminder_settings')
      .upsert(payload, { onConflict: 'user_id' });
    if (error) toast.error(t('settings.saveError'));
  };

  const sendTest = async () => {
    setSending(true);
    const { error } = await supabase.functions.invoke('send-photo-reminders', { body: { force: true } });
    setSending(false);
    if (error) toast.error(t('settings.remindersError'));
    else toast.success(t('settings.remindersOk'));
  };

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 h-12 border-b border-border/60 glass">
        <div className="h-full container mx-auto px-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/app')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="flex-1 text-[15px] font-medium tracking-tight">
            {t('nav.settings')}
          </h1>
        </div>
      </header>

      <main className="container mx-auto max-w-xl px-4 py-6 space-y-8">
        {/* Appearance */}
        <Section title={t('settings.appearance')}>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t('settings.theme')}</Label>
            <div className="flex gap-2">
              {themeOptions.map(opt => (
                <Button
                  key={opt.value}
                  variant={theme === opt.value ? 'default' : 'outline'}
                  size="sm"
                  className={cn('flex-1 gap-1.5')}
                  onClick={() => setTheme(opt.value)}
                >
                  <opt.icon className="h-3.5 w-3.5" />
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t('settings.language')}</Label>
            <LanguageToggle />
          </div>
        </Section>

        {/* Notifications */}
        <Section title={t('settings.notifications')}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Label className="text-sm">{t('settings.birthdayReminders')}</Label>
              <p className="text-xs text-muted-foreground">{t('settings.birthdayRemindersDesc')}</p>
            </div>
            <Switch
              checked={birthdaysEnabled}
              onCheckedChange={(v) => { setBirthdaysEnabled(v); persist({ birthdays: v }); }}
              disabled={loading}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Label className="text-sm">{t('settings.emailReminders')}</Label>
                <p className="text-xs text-muted-foreground">{t('settings.emailRemindersDesc')}</p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(v) => { setEnabled(v); persist({ enabled: v }); }}
                disabled={loading}
              />
            </div>
            {enabled && (
              <div className="space-y-2 pl-1">
                <Label className="text-xs text-muted-foreground">{t('settings.frequency')}</Label>
                <div className="flex gap-2">
                  {freqOptions.map(d => (
                    <Button
                      key={d}
                      variant={frequency === d ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => { setFrequency(d); persist({ frequency: d }); }}
                      disabled={loading}
                    >
                      {t('settings.days', { count: d })}
                    </Button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={sendTest}
                  disabled={sending}
                  className="text-xs underline-offset-2 hover:underline disabled:opacity-50"
                  style={{ color: '#C8845A' }}
                >
                  {sending ? t('settings.processing') : t('settings.testNow')}
                </button>
              </div>
            )}
          </div>
        </Section>

        {/* Family */}
        {canEdit && (
          <Section title={t('nav.family')}>
            <FamilySection />
          </Section>
        )}

        {/* Tools */}
        {canEdit && photos.length > 0 && (
          <Section title={t('settings.tools')}>
            <div className="space-y-1.5">
              <DuplicateFinder photos={photos} children={children} />
              <p className="text-xs text-muted-foreground">{t('settings.findDuplicatesDesc')}</p>
            </div>
          </Section>
        )}
      </main>
    </div>
  );
}
