import { useEffect, useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LanguageToggle } from './LanguageToggle';

type Frequency = 3 | 5 | 7;

interface SettingsPanelProps {
  toolsSlot?: ReactNode;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function SettingsPanel({ toolsSlot }: SettingsPanelProps) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [enabled, setEnabled] = useState(true);
  const [birthdaysEnabled, setBirthdaysEnabled] = useState(true);
  const [frequency, setFrequency] = useState<Frequency>(5);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const themeOptions = [
    { value: 'light' as const, label: t('settings.themeLight'), icon: Sun },
    { value: 'dark' as const, label: t('settings.themeDark'), icon: Moon },
    { value: 'system' as const, label: t('settings.themeSystem'), icon: Monitor },
  ];

  const freqOptions: Frequency[] = [3, 5, 7];

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('reminder_settings')
        .select('enabled, inactivity_days, birthdays_enabled')
        .eq('user_id', auth.user.id)
        .maybeSingle();
      if (data) {
        setEnabled(data.enabled);
        setFrequency(data.inactivity_days as Frequency);
        setBirthdaysEnabled((data as any).birthdays_enabled ?? true);
      } else {
        await supabase.from('reminder_settings').insert({
          user_id: auth.user.id,
          enabled: true,
          inactivity_days: 5,
        });
      }
      setLoading(false);
    })();
  }, []);

  const persist = async (next: { enabled?: boolean; frequency?: Frequency; birthdays?: boolean }) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const payload: any = {
      user_id: auth.user.id,
      enabled: next.enabled ?? enabled,
      inactivity_days: next.frequency ?? frequency,
      birthdays_enabled: next.birthdays ?? birthdaysEnabled,
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

  return (
    <div className="space-y-6 p-4">
      {/* 1. Appearance */}
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

      {/* 2. Notifications */}
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

      {/* 3. Tools */}
      {toolsSlot && (
        <Section title={t('settings.tools')}>
          <div className="space-y-1.5">
            {toolsSlot}
            <p className="text-xs text-muted-foreground">{t('settings.findDuplicatesDesc')}</p>
          </div>
        </Section>
      )}
    </div>
  );
}
