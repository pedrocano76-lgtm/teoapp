import { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sun, Moon, Monitor, Bell, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Frequency = 3 | 5 | 7;

export function SettingsPanel() {
  const { theme, setTheme } = useTheme();
  const [enabled, setEnabled] = useState(true);
  const [frequency, setFrequency] = useState<Frequency>(5);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const themeOptions = [
    { value: 'light' as const, label: 'Claro', icon: Sun },
    { value: 'dark' as const, label: 'Oscuro', icon: Moon },
    { value: 'system' as const, label: 'Sistema', icon: Monitor },
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
        .select('enabled, inactivity_days')
        .eq('user_id', auth.user.id)
        .maybeSingle();
      if (data) {
        setEnabled(data.enabled);
        setFrequency(data.inactivity_days as Frequency);
      } else {
        // Crear fila por defecto para que el cron y el envío manual encuentren al usuario
        await supabase.from('reminder_settings').insert({
          user_id: auth.user.id,
          enabled: true,
          inactivity_days: 5,
        });
      }
      setLoading(false);
    })();
  }, []);

  const persist = async (next: { enabled?: boolean; frequency?: Frequency }) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const payload = {
      user_id: auth.user.id,
      enabled: next.enabled ?? enabled,
      inactivity_days: next.frequency ?? frequency,
    };
    const { error } = await supabase
      .from('reminder_settings')
      .upsert(payload, { onConflict: 'user_id' });
    if (error) toast.error('No se pudo guardar');
  };

  const onToggle = (val: boolean) => {
    setEnabled(val);
    persist({ enabled: val });
  };

  const onFrequency = (val: Frequency) => {
    setFrequency(val);
    persist({ frequency: val });
  };

  const sendTest = async () => {
    setSending(true);
    const { error } = await supabase.functions.invoke('send-photo-reminders', { body: { force: true } });
    setSending(false);
    if (error) toast.error('Error al enviar recordatorios');
    else toast.success('Recordatorios procesados');
  };

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tema</Label>
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

      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Recordatorios por email
          </Label>
          <Switch checked={enabled} onCheckedChange={onToggle} disabled={loading} />
        </div>
        <p className="text-xs text-muted-foreground">
          Te avisamos cuando lleves varios días sin añadir fotos.
        </p>

        {enabled && (
          <>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Frecuencia (días sin actividad)</Label>
              <div className="flex gap-2">
                {freqOptions.map(d => (
                  <Button
                    key={d}
                    variant={frequency === d ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => onFrequency(d)}
                    disabled={loading}
                  >
                    {d} días
                  </Button>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={sendTest}
              disabled={sending}
            >
              <Mail className="h-3.5 w-3.5" />
              {sending ? 'Procesando…' : 'Probar ahora'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
