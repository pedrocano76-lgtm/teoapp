import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Photo, Child } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useDeletePhoto, useAllPhotos } from '@/hooks/useData';
import { toast } from 'sonner';
import { Trash2, Search, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeDHash, hammingDistance } from '@/lib/image-hash';
import { Progress } from '@/components/ui/progress';

interface DuplicateFinderProps {
  children: Child[];
}

interface DuplicateGroup {
  key: string;
  photos: Photo[];
}

const DUPLICATE_THRESHOLD = 10;

export function DuplicateFinder({ photos, children }: DuplicateFinderProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [markedForDeletion, setMarkedForDeletion] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);

  const deletePhoto = useDeletePhoto();
  const childMap = new Map(children.map(c => [c.id, c]));

  const scanForDuplicates = useCallback(async () => {
    setIsScanning(true);
    setScanProgress(0);
    setDuplicates([]);

    try {
      const hashes: { photo: Photo; hash: string }[] = [];
      for (let i = 0; i < photos.length; i++) {
        try {
          const hash = await computeDHash(photos[i].url);
          hashes.push({ photo: photos[i], hash });
        } catch { /* skip */ }
        setScanProgress(Math.round(((i + 1) / photos.length) * 100));
      }

      const parent = new Map<number, number>();
      const find = (i: number): number => {
        if (!parent.has(i)) parent.set(i, i);
        if (parent.get(i) !== i) parent.set(i, find(parent.get(i)!));
        return parent.get(i)!;
      };
      const union = (a: number, b: number) => { parent.set(find(a), find(b)); };

      for (let i = 0; i < hashes.length; i++) {
        for (let j = i + 1; j < hashes.length; j++) {
          if (hashes[i].photo.childId !== hashes[j].photo.childId) continue;
          const dist = hammingDistance(hashes[i].hash, hashes[j].hash);
          if (dist <= DUPLICATE_THRESHOLD) union(i, j);
        }
      }

      const groups = new Map<number, Photo[]>();
      for (let i = 0; i < hashes.length; i++) {
        const root = find(i);
        if (!groups.has(root)) groups.set(root, []);
        groups.get(root)!.push(hashes[i].photo);
      }

      const result = Array.from(groups.values())
        .filter(g => g.length > 1)
        .map((photos, idx) => ({ key: `group-${idx}`, photos }));

      setDuplicates(result);
    } catch {
      toast.error(t('duplicates.scanError'));
    } finally {
      setIsScanning(false);
    }
  }, [photos, t]);

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
      for (let i = 1; i < group.photos.length; i++) toDelete.add(group.photos[i].id);
    }
    setMarkedForDeletion(toDelete);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const toDelete = photos.filter(p => markedForDeletion.has(p.id));
      for (const photo of toDelete) {
        await deletePhoto.mutateAsync({ photoId: photo.id, storagePath: photo.storagePath, thumbnailPath: photo.thumbnailPath });
      }
      toast.success(t('duplicates.deletedN', { count: toDelete.length }));
      setMarkedForDeletion(new Set());
      setDuplicates([]);
      setOpen(false);
    } catch {
      toast.error(t('duplicates.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setMarkedForDeletion(new Set());
    setDuplicates([]);
    setScanProgress(0);
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={handleOpen}>
        <Search className="h-3.5 w-3.5" />
        {t('duplicates.button')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('duplicates.title')}</DialogTitle>
            <DialogDescription>{t('duplicates.description')}</DialogDescription>
          </DialogHeader>

          {!isScanning && duplicates.length === 0 && scanProgress === 0 && (
            <div className="text-center py-8">
              <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">
                {t('duplicates.willScan', { count: photos.length })}
              </p>
              <Button onClick={scanForDuplicates} className="gap-1.5">
                <Search className="h-4 w-4" />
                {t('duplicates.startScan')}
              </Button>
            </div>
          )}

          {isScanning && (
            <div className="text-center py-8 space-y-4">
              <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
              <p className="text-muted-foreground">{t('duplicates.scanning', { progress: scanProgress })}</p>
              <Progress value={scanProgress} className="max-w-xs mx-auto" />
            </div>
          )}

          {!isScanning && scanProgress === 100 && duplicates.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-primary/50 mb-3" />
              <p className="text-muted-foreground">{t('duplicates.noneFound')}</p>
            </div>
          )}

          {!isScanning && duplicates.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('duplicates.groupsFound', { count: duplicates.length })}
                </p>
                <Button variant="outline" size="sm" onClick={autoSelect}>
                  {t('duplicates.autoSelect')}
                </Button>
              </div>

              {duplicates.map((group) => {
                const child = childMap.get(group.photos[0].childId);
                return (
                  <div key={group.key} className="border rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {child?.name} · {t('duplicates.similarPhotos', { count: group.photos.length })}
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
                          <img src={photo.thumbnailUrl || photo.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                          {markedForDeletion.has(photo.id) && (
                            <div className="absolute inset-0 bg-destructive/30 flex items-center justify-center">
                              <Trash2 className="h-6 w-6 text-destructive" />
                            </div>
                          )}
                          {idx === 0 && !markedForDeletion.has(photo.id) && (
                            <div className="absolute top-1 left-1 bg-primary/80 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                              {t('duplicates.original')}
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
                {t('duplicates.deleteN', { count: markedForDeletion.size })}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
