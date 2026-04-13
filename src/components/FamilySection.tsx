import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Trash2, Crown, Eye, Copy, Check } from 'lucide-react';

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
          <Crown className="h-3 w-3" /> Padres
        </p>
        <p className="text-xs text-muted-foreground mb-1">Tú (creador de la cuenta)</p>
        {parents.length > 0 && (
          <div className="space-y-1 mb-2">
            {parents.map(p => (
              <ShareRow key={p.id} share={p} />
            ))}
          </div>
        )}
        <InviteDialog role="parent" label="Invitar padre/madre" />
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <Eye className="h-3 w-3" /> Invitados
        </p>
        {guests.length === 0 ? (
          <p className="text-xs text-muted-foreground mb-2">Sin invitados</p>
        ) : (
          <div className="space-y-1 mb-2">
            {guests.map(g => (
              <ShareRow key={g.id} share={g} />
            ))}
          </div>
        )}
        <InviteDialog role="guest" label="Invitar familiar" />
      </div>
    </div>
  );
}

function ShareRow({ share }: { share: any }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const removeShare = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('family_shares').delete().eq('id', share.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family_shares'] });
      toast.success('Acceso eliminado');
    },
  });

  const handleCopyCode = async () => {
    if (!share.invite_code) return;
    await navigator.clipboard.writeText(share.invite_code);
    setCopied(true);
    toast.success('Código copiado');
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
          <span className="text-amber-500 ml-1">(pendiente)</span>
        )}
      </div>
      <div className="flex items-center gap-0.5">
        {isPending && share.invite_code && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handleCopyCode}
            title={`Código: ${share.invite_code}`}
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
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [customRelationship, setCustomRelationship] = useState('');
  const [lastInviteCode, setLastInviteCode] = useState('');
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['family_shares'] });
      setLastInviteCode(data.invite_code || '');
      setEmail('');
      setRelationship('');
      setCustomRelationship('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(lastInviteCode);
    setCodeCopied(true);
    toast.success('Código copiado');
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setLastInviteCode('');
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
            {role === 'parent'
              ? 'El otro padre/madre tendrá todos los derechos sobre el álbum.'
              : 'Los invitados solo podrán ver las fotos marcadas como compartidas.'}
          </DialogDescription>
        </DialogHeader>

        {lastInviteCode ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              ¡Invitación creada! Comparte este código:
            </p>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-2xl font-mono font-bold tracking-widest text-foreground">
                {lastInviteCode}
              </p>
            </div>
            <Button onClick={handleCopyCode} variant="outline" className="w-full gap-2">
              {codeCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {codeCopied ? 'Copiado' : 'Copiar código'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Cuando se registre con el email indicado, se enlazará automáticamente a tu familia.
            </p>
            <Button variant="ghost" size="sm" onClick={() => handleClose(false)}>
              Cerrar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                placeholder="email@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Parentesco</Label>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar parentesco" />
                </SelectTrigger>
                <SelectContent>
                  {options.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {relationship === 'Otro' && (
                <Input
                  placeholder="Parentesco personalizado"
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
              Crear invitación
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
