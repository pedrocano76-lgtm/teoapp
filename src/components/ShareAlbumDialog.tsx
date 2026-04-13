import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { UserPlus, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ShareAlbumDialogProps {
  childId: string;
  childName: string;
}

export function ShareAlbumDialog({ childId, childName }: ShareAlbumDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [canEdit, setCanEdit] = useState(true);
  const [open, setOpen] = useState(false);

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
    enabled: !!user && open,
  });

  const addShare = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('family_shares').insert({
        child_id: childId,
        shared_by: user!.id,
        shared_with_email: email.trim().toLowerCase(),
        can_edit: canEdit,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family_shares', childId] });
      setEmail('');
      toast.success('Invitación enviada');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeShare = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase.from('family_shares').delete().eq('id', shareId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family_shares', childId] });
      toast.success('Acceso eliminado');
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Compartir</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartir álbum de {childName}</DialogTitle>
          <DialogDescription>Invita al otro padre/madre o familiares para que puedan ver o editar el álbum.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="flex gap-2">
            <Input
              placeholder="Email del familiar"
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
            />
            <Button
              onClick={() => addShare.mutate()}
              disabled={!email.trim() || addShare.isPending}
              size="sm"
            >
              Invitar
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="can-edit" checked={canEdit} onCheckedChange={setCanEdit} />
            <Label htmlFor="can-edit" className="text-sm">
              {canEdit ? 'Puede editar y subir fotos' : 'Solo puede ver'}
            </Label>
          </div>

          {shares && shares.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground">Personas con acceso:</p>
              {shares.map(share => (
                <div key={share.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span>{share.shared_with_email}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {share.can_edit ? '(editar)' : '(solo ver)'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeShare.mutate(share.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
