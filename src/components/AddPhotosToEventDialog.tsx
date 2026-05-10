import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLinkPhotosToEvent } from '@/hooks/useData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AddPhotosToEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  childId: string;
}

export function AddPhotosToEventDialog({ open, onOpenChange, eventId, childId }: AddPhotosToEventDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const link = useLinkPhotosToEvent();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: photos, isLoading } = useQuery({
    queryKey: ['event-add-photos', childId, eventId, user?.id],
    enabled: open && !!user && !!childId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photos')
        .select('id, storage_path, thumbnail_path, taken_at, event_id')
        .eq('child_id', childId)
        .or(`event_id.is.null,event_id.neq.${eventId}`)
        .order('taken_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const paths: string[] = [];
      for (const p of data ?? []) {
        if (p.thumbnail_path) paths.push(p.thumbnail_path);
        else if (p.storage_path) paths.push(p.storage_path);
      }
      const urlMap: Record<string, string> = {};
      if (paths.length > 0) {
        const { data: signed } = await supabase.storage.from('photos').createSignedUrls(paths, 3600);
        for (const s of signed ?? []) {
          if (s.signedUrl && s.path) urlMap[s.path] = s.signedUrl;
        }
      }
      return (data ?? []).map((p: any) => ({
        id: p.id,
        url: urlMap[p.thumbnail_path] || urlMap[p.storage_path] || '',
      }));
    },
  });

  const list = photos ?? [];
  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (selected.size === 0) {
      onOpenChange(false);
      return;
    }
    try {
      await link.mutateAsync({ eventId, photoIds: Array.from(selected) });
      toast.success(t('eventEdit.photosAdded', { count: selected.size, defaultValue: '{{count}} foto(s) añadidas' }));
      setSelected(new Set());
      onOpenChange(false);
    } catch {
      toast.error(t('eventEdit.photosAddError', 'No se pudieron añadir las fotos'));
    }
  };

  const count = useMemo(() => selected.size, [selected]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setSelected(new Set()); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('eventEdit.addPhotos', 'Añadir fotos al evento')}</DialogTitle>
          <DialogDescription>
            {t('eventEdit.addPhotosDesc', 'Selecciona fotos de la biblioteca para vincularlas a este evento.')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-10">{t('common.loading')}</p>
          ) : list.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">{t('empty.noPhotos')}</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {list.map((p) => {
                const isSel = selected.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={cn(
                      'relative aspect-square overflow-hidden rounded-lg bg-muted border-2 transition-all',
                      isSel ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-border'
                    )}
                  >
                    {p.url && <img src={p.url} alt="" loading="lazy" className="w-full h-full object-cover" />}
                    <div className={cn(
                      'absolute top-1.5 right-1.5 h-6 w-6 rounded-full flex items-center justify-center transition-all',
                      isSel ? 'bg-primary text-primary-foreground' : 'bg-background/70 backdrop-blur-sm border border-muted-foreground/40'
                    )}>
                      {isSel && <Check className="h-3.5 w-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={count === 0 || link.isPending}>
            {t('eventEdit.linkSelected', { count, defaultValue: 'Añadir ({{count}})' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
