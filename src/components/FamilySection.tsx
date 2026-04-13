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
import { UserPlus, Trash2, Crown, Eye } from 'lucide-react';

const RELATIONSHIP_OPTIONS = [
  'Abuelo/a',
  'Tío/a',
  'Primo/a',
  'Bisabuelo/a',
  'Padrino/Madrina',
  'Hermano/a',
  'Otro',
];

interface FamilySectionProps {
  childId: string;
  childName: string;
}

export function FamilySection({ childId, childName }: FamilySectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: shares } = useQuery({
    queryKey: ['family_shares', childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_shares')
        .select('*')
        .eq('child_id', childId);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const parents = shares?.filter(s => s.role === 'parent') || [];
  const guests = shares?.filter(s => s.role === 'guest') || [];

  return (
    <div className="space-y-4 px-2">
      {/* Parents */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <Crown className="h-3 w-3" /> Padres
        </p>
        {parents.length === 0 ? (
          <p className="text-xs text-muted-foreground mb-2">Solo tú por ahora</p>
        ) : (
          <div className="space-y-1 mb-2">
            {parents.map(p => (
              <ShareRow key={p.id} share={p} childId={childId} />
            ))}
          </div>
        )}
        <InviteDialog childId={childId} role="parent" label="Invitar padre/madre" />
      </div>

      {/* Guests */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <Eye className="h-3 w-3" /> Invitados
        </p>
        {guests.length === 0 ? (
          <p className="text-xs text-muted-foreground mb-2">Sin invitados</p>
        ) : (
          <div className="space-y-1 mb-2">
            {guests.map(g => (
              <ShareRow key={g.id} share={g} childId={childId} />
            ))}
          </div>
        )}
        <InviteDialog childId={childId} role="guest" label="Invitar familiar" />
      </div>
    </div>
  );
}

function ShareRow({ share, childId }: { share: any; childId: string }) {
  const queryClient = useQueryClient();
  const removeShare = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('family_shares').delete().eq('id', share.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family_shares', childId] });
      toast.success('Acceso eliminado');
    },
  });

  return (
    <div className="flex items-center justify-between text-xs group">
      <div className="truncate flex-1">
        <span className="text-foreground">{share.shared_with_email}</span>
        {share.relationship && (
          <span className="text-muted-foreground ml-1">({share.relationship})</span>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
        onClick={() => removeShare.mutate()}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

function InviteDialog({ childId, role, label }: { childId: string; role: string; label: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [customRelationship, setCustomRelationship] = useState('');

  const addShare = useMutation({
    mutationFn: async () => {
      const rel = role === 'guest'
        ? (relationship === 'Otro' ? customRelationship : relationship) || null
        : null;
      const { error } = await supabase.from('family_shares').insert({
        child_id: childId,
        shared_by: user!.id,
        shared_with_email: email.trim().toLowerCase(),
        can_edit: role === 'parent',
        role,
        relationship: rel,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family_shares', childId] });
      setEmail('');
      setRelationship('');
      setCustomRelationship('');
      setOpen(false);
      toast.success('Invitación enviada');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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

          {role === 'guest' && (
            <div className="space-y-1">
              <Label className="text-xs">Parentesco</Label>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar parentesco" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_OPTIONS.map(r => (
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
          )}

          <Button
            onClick={() => addShare.mutate()}
            disabled={!email.trim() || addShare.isPending}
            className="w-full"
          >
            Enviar invitación
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
