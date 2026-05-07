import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { LanguageToggle } from './LanguageToggle';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function UserProfileModal({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('profile.title', { defaultValue: 'Tu cuenta' })}</DialogTitle>
          <DialogDescription>{t('profile.desc', { defaultValue: 'Idioma e información de cuenta.' })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('profile.email', { defaultValue: 'Email' })}</Label>
            <p className="text-sm text-foreground break-all">{user?.email}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t('settings.language')}</Label>
            <LanguageToggle />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
