import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Trash2, Crown, Eye, Copy, Check, Share2 } from 'lucide-react';

const PARENT_RELATIONSHIPS = ['Padre', 'Madre', 'Hermano/a', 'Otro'];

const GUEST_RELATIONSHIPS = [
  'Abuelo/a',
  'Tío/a',
  'Primo/a',
  'Bisabuelo/a',
  'Padrino/Madrina',
  'Otro',
];

export function FamilySection() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: shares } = useQuery({
    queryKey: ['family_shares'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_shares')
        .select('*')
        .eq('family_owner_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const parents = shares?.filter(s => s.role === 'parent') || [];
  const guests = shares?.filter(s => s.role === 'guest') || [];

  return (
    <div className="space-y-4 px-2">
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <Crown className="h-3 w-3" /> {t('family.parents')}
        </p>
        <p className="text-xs text-muted-foreground mb-1">{t('family.youCreator')}</p>
        {parents.length > 0 && (
          <div className="space-y-1 mb-2">
            {parents.map(p => (
              <ShareRow key={p.id} share={p} />
            ))}
          </div>
        )}
        <InviteDialog role="parent" label={t('family.inviteParent')} />
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <Eye className="h-3 w-3" /> {t('family.guests')}
        </p>
        {guests.length === 0 ? (
          <p className="text-xs text-muted-foreground mb-2">{t('family.noGuests')}</p>
        ) : (
          <div className="space-y-1 mb-2">
            {guests.map(g => (
              <ShareRow key={g.id} share={g} />
            ))}
          </div>
        )}
        <InviteDialog role="guest" label={t('family.inviteRelative')} />
      </div>
    </div>
  );
}

function ShareRow({ share }: { share: any }) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const removeShare = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('family_shares').delete().eq('id', share.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family_shares'] });
      toast.success(t('family.accessRemoved'));
    },
  });

  const handleShareCode = async () => {
    if (!share.invite_code) return;
    const inviteUrl = `${window.location.origin}/auth?invite=${share.invite_code}&email=${encodeURIComponent(share.shared_with_email)}`;
    const text = t('family.joinAlbumText', { url: inviteUrl });
    if (navigator.share) {
      try {
        await navigator.share({ title: t('family.familyInvitation'), text });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(share.invite_code);
    setCopied(true);
    toast.success(t('family.codeCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const isPending = !share.shared_with_user_id;

  return (
    <div className="flex items-center justify-between text-xs group gap-1">
      <div className="truncate flex-1">
        <span className="text-foreground">{share.shared_with_email}</span>
        {share.relationship && (
          <span className="text-muted-foreground ml-1">({share.relationship})</span>
        )}
        {isPending && (
          <span className="text-amber-500 ml-1">{t('family.pending')}</span>
        )}
      </div>
      <div className="flex items-center gap-0.5">
        {isPending && share.invite_code && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handleShareCode}
            title={share.invite_code}
          >
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
          onClick={() => removeShare.mutate()}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function InviteDialog({ role, label }: { role: string; label: string }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [customRelationship, setCustomRelationship] = useState('');
  const [lastInviteCode, setLastInviteCode] = useState('');
  const [lastEmail, setLastEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const addShare = useMutation({
    mutationFn: async () => {
      const rel = (relationship === 'Otro' ? customRelationship : relationship) || null;
      const { data, error } = await supabase.from('family_shares').insert({
        family_owner_id: user!.id,
        shared_by: user!.id,
        shared_with_email: email.trim().toLowerCase(),
        can_edit: role === 'parent',
        role,
        relationship: rel,
      }).select('invite_code').single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['family_shares'] });
      const normalizedEmail = email.trim().toLowerCase();
      setLastInviteCode(data.invite_code || '');
      setLastEmail(normalizedEmail);
      setEmail('');
      setRelationship('');
      setCustomRelationship('');

      try {
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: normalizedEmail,
            template: 'invite',
            inviteCode: data.invite_code,
          },
        });
        if (emailError) throw emailError;
        setEmailSent(true);
      } catch {
        setEmailSent(false);
        toast.warning(t('family.emailNotSent'));
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleShareCode = async () => {
    const inviteUrl = `${window.location.origin}/auth?invite=${lastInviteCode}&email=${encodeURIComponent(lastEmail)}`;
    const text = t('family.joinAlbumText', { url: inviteUrl });
    if (navigator.share) {
      try {
        await navigator.share({ title: t('family.familyInvitation'), text });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(lastInviteCode);
    setCodeCopied(true);
    toast.success(t('family.codeCopied'));
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setLastInviteCode('');
      setEmailSent(false);
      setCodeCopied(false);
    }
  };

  const options = role === 'parent' ? PARENT_RELATIONSHIPS : GUEST_RELATIONSHIPS;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-7">
          <UserPlus className="h-3 w-3" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            {role === 'parent' ? t('family.parentDesc') : t('family.guestDesc')}
          </DialogDescription>
        </DialogHeader>

        {lastInviteCode ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              {emailSent
                ? t('family.invitationSent', { email: lastEmail })
                : t('family.invitationCreated')}
            </p>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-2xl font-mono font-bold tracking-widest text-foreground">
                {lastInviteCode}
              </p>
            </div>
            <Button onClick={handleShareCode} variant="outline" className="w-full gap-2">
              {codeCopied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
              {codeCopied ? t('family.copied') : t('family.shareInvitation')}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t('family.autoLinkInfo')}
            </p>
            <Button variant="ghost" size="sm" onClick={() => handleClose(false)}>
              {t('common.close')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('family.emailLabel')}</Label>
              <Input
                placeholder={t('family.emailPlaceholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t('family.relationship')}</Label>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger>
                  <SelectValue placeholder={t('family.selectRelationship')} />
                </SelectTrigger>
                <SelectContent>
                  {options.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {relationship === 'Otro' && (
                <Input
                  placeholder={t('family.customRelationship')}
                  value={customRelationship}
                  onChange={e => setCustomRelationship(e.target.value)}
                  className="mt-1"
                />
              )}
            </div>

            <Button
              onClick={() => addShare.mutate()}
              disabled={!email.trim() || addShare.isPending}
              className="w-full"
            >
              {t('family.createInvitation')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
