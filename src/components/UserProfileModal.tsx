import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LanguageToggle } from './LanguageToggle';
import { Camera, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const RELATIONSHIPS = [
  { value: 'father', es: 'Padre', en: 'Father' },
  { value: 'mother', es: 'Madre', en: 'Mother' },
  { value: 'grandfather', es: 'Abuelo', en: 'Grandfather' },
  { value: 'grandmother', es: 'Abuela', en: 'Grandmother' },
  { value: 'uncle', es: 'Tío', en: 'Uncle' },
  { value: 'aunt', es: 'Tía', en: 'Aunt' },
  { value: 'other', es: 'Otro', en: 'Other' },
];

export function UserProfileModal({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'es';

  const [displayName, setDisplayName] = useState('');
  const [relationship, setRelationship] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    supabase
      .from('profiles')
      .select('display_name, relationship, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name || '');
        setRelationship(data?.relationship || '');
        setAvatarUrl(data?.avatar_url || null);
        setLoading(false);
      });
  }, [open, user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(lang === 'en' ? 'Image too large (max 5MB)' : 'Imagen demasiado grande (máx 5MB)');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch (err: any) {
      toast.error(err.message || (lang === 'en' ? 'Upload failed' : 'Error al subir'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const trimmed = displayName.trim().slice(0, 100);
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: trimmed || null,
        relationship: relationship || null,
        avatar_url: avatarUrl,
      })
      .eq('user_id', user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lang === 'en' ? 'Profile updated' : 'Perfil actualizado');
    onOpenChange(false);
  };

  const initial = (displayName || user?.email || '?').charAt(0).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('profile.title', { defaultValue: lang === 'en' ? 'Your account' : 'Tu cuenta' })}</DialogTitle>
          <DialogDescription>
            {lang === 'en' ? 'Edit your profile information.' : 'Edita la información de tu perfil.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group"
              disabled={uploading}
              aria-label={lang === 'en' ? 'Change photo' : 'Cambiar foto'}
            >
              <Avatar className="h-20 w-20">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
                <AvatarFallback className="text-lg">{initial}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <p className="text-xs text-muted-foreground break-all">{user?.email}</p>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {lang === 'en' ? 'Name' : 'Nombre'}
            </Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
              disabled={loading}
              placeholder={lang === 'en' ? 'Your name' : 'Tu nombre'}
            />
          </div>

          {/* Relationship */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {lang === 'en' ? 'Relationship' : 'Parentesco'}
            </Label>
            <Select value={relationship} onValueChange={setRelationship} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder={lang === 'en' ? 'Select…' : 'Selecciona…'} />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r[lang]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t('settings.language')}</Label>
            <LanguageToggle />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="w-full text-white hover:opacity-90"
            style={{ backgroundColor: '#C8845A' }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (lang === 'en' ? 'Save changes' : 'Guardar cambios')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
