import { useState, useMemo } from 'react';
import { Photo, Child } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useDeletePhoto } from '@/hooks/useData';
import { toast } from 'sonner';
import { Trash2, Search, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DuplicateFinderProps {
  photos: Photo[];
  children: Child[];
}

interface DuplicateGroup {
  key: string;
  photos: Photo[];
}

function findDuplicates(photos: Photo[]): DuplicateGroup[] {
  const groups = new Map<string, Photo[]>();

  for (const photo of photos) {
    // Group by filename (last part of storage path) + taken_at date
    const filename = photo.storagePath.split('/').pop()?.replace(/^\d+\./, '') || '';
    const dateKey = photo.date.toISOString().split('T')[0];
    // Also group by very similar timestamps (within 2 seconds) + same child
    const timeKey = Math.floor(photo.date.getTime() / 2000);
    const key = `${photo.childId}_${dateKey}_${timeKey}`;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(photo);
  }

  return Array.from(groups.entries())
    .filter(([, photos]) => photos.length > 1)
    .map(([key, photos]) => ({ key, photos }));
}

export function DuplicateFinder({ photos, children }: DuplicateFinderProps) {
  const [open, setOpen] = useState(false);
  const [markedForDeletion, setMarkedForDeletion] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const deletePhoto = useDeletePhoto();
  const childMap = new Map(children.map(c => [c.id, c]));

  const duplicates = useMemo(() => findDuplicates(photos), [photos]);

  const toggleMark = (photoId: string) => {
    setMarkedForDeletion(prev => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const autoSelect = () => {
    const toDelete = new Set<string>();
    for (const group of duplicates) {
      // Keep the first, mark the rest
      for (let i = 1; i < group.photos.length; i++) {
        toDelete.add(group.photos[i].id);
      }
    }
    setMarkedForDeletion(toDelete);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const toDelete = photos.filter(p => markedForDeletion.has(p.id));
      for (const photo of toDelete) {
        await deletePhoto.mutateAsync({ photoId: photo.id, storagePath: photo.storagePath });
      }
      toast.success(`${toDelete.length} duplicados eliminados`);
      setMarkedForDeletion(new Set());
      setOpen(false);
    } catch {
      toast.error('Error al eliminar duplicados');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setOpen(true); setMarkedForDeletion(new Set()); }}>
        <Search className="h-3.5 w-3.5" />
        Duplicados
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buscar duplicados</DialogTitle>
            <DialogDescription>
              Se buscan fotos del mismo niño tomadas en el mismo momento. Selecciona las que deseas eliminar.
            </DialogDescription>
          </DialogHeader>

          {duplicates.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-primary/50 mb-3" />
              <p className="text-muted-foreground">¡No se encontraron duplicados!</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {duplicates.length} grupo{duplicates.length !== 1 ? 's' : ''} de duplicados encontrado{duplicates.length !== 1 ? 's' : ''}
                </p>
                <Button variant="outline" size="sm" onClick={autoSelect}>
                  Seleccionar automáticamente
                </Button>
              </div>

              {duplicates.map((group) => {
                const child = childMap.get(group.photos[0].childId);
                return (
                  <div key={group.key} className="border rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {child?.name} · {group.photos[0].date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {group.photos.map((photo, idx) => (
                        <button
                          key={photo.id}
                          onClick={() => toggleMark(photo.id)}
                          className={cn(
                            "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                            markedForDeletion.has(photo.id)
                              ? "border-destructive opacity-50"
                              : "border-transparent hover:border-primary"
                          )}
                        >
                          <img src={photo.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                          {markedForDeletion.has(photo.id) && (
                            <div className="absolute inset-0 bg-destructive/30 flex items-center justify-center">
                              <Trash2 className="h-6 w-6 text-destructive" />
                            </div>
                          )}
                          {idx === 0 && !markedForDeletion.has(photo.id) && (
                            <div className="absolute top-1 left-1 bg-primary/80 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                              Original
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            {markedForDeletion.size > 0 && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar {markedForDeletion.size} foto{markedForDeletion.size !== 1 ? 's' : ''}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
