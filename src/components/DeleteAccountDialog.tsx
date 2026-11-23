import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { clearAllSignedUrls } from '@/lib/signed-url-cache';
import { isDemoMode, demoBlockedToast } from '@/lib/demo-data';
import { canConfirmDeletion } from '../../supabase/functions/delete-account/cleanup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';

export function DeleteAccountDialog({ trigger }: { trigger?: ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const deleteAccount = async () => {
    if (!canConfirmDeletion(confirmation) || busy) return;
    if (isDemoMode()) { demoBlockedToast(); return; }
    setBusy(true);
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('delete-account', {
        body: { confirmation },
      });
      if (invokeError || !data?.success) {
        let detail = data?.error;
        if (invokeError && 'context' in invokeError && invokeError.context instanceof Response) {
          const response = await invokeError.context.json().catch(() => null);
          detail = response?.error;
        }
        throw new Error(detail || invokeError?.message || t('deleteAccount.error'));
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      setError(t('deleteAccount.error') + (detail ? ` ${detail}` : ''));
      setBusy(false);
      return; // Do not sign out or clear caches on a failed deletion.
    }

    // Auth no longer exists: use local sign-out even if its server session was revoked.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    await queryClient.cancelQueries();
    queryClient.clear();
    clearAllSignedUrls();
    localStorage.clear(); // Includes surl_*, legacy lm:url:*, and the auth session.
    sessionStorage.clear();
    setOpen(false);
    navigate('/auth', { replace: true });
    toast.success(t('deleteAccount.success'));
    setBusy(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={value => {
      if (busy) return;
      setOpen(value); setConfirmation(''); setError('');
    }}>
      <AlertDialogTrigger asChild>
        {trigger ?? <Button variant="ghost" className="min-h-11 text-destructive hover:text-destructive">
          <Trash2 />{t('deleteAccount.title')}
        </Button>}
      </AlertDialogTrigger>
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg max-h-[90dvh] overflow-y-auto" onEscapeKeyDown={e => { if (busy) e.preventDefault(); }}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteAccount.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('deleteAccount.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="delete-account-confirmation">{t('deleteAccount.typeConfirmation')}</Label>
          <Input id="delete-account-confirmation" value={confirmation} disabled={busy}
            autoComplete="off" autoCapitalize="characters" spellCheck={false}
            onChange={e => setConfirmation(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-destructive break-words">{error}</p>}
        <AlertDialogFooter className="gap-2 sm:space-x-0">
          <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="destructive" className="min-h-11" disabled={busy || !canConfirmDeletion(confirmation)} onClick={deleteAccount}>
            {busy && <Loader2 className="animate-spin motion-reduce:animate-none" />}
            {busy ? t('deleteAccount.deleting') : t('deleteAccount.confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}