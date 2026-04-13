import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, MapPin, Pencil } from 'lucide-react';
import { Photo, Child } from '@/lib/types';
import { getAgeLabel } from '@/lib/age-utils';
import { PhotoEditDialog } from '@/components/PhotoEditDialog';

interface PhotoLightboxProps {
  photos: Photo[];
  children: Child[];
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PhotoLightbox({ photos, children, initialIndex, open, onOpenChange }: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [editOpen, setEditOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (open) setCurrentIndex(initialIndex);
  }, [open, initialIndex]);

  const goNext = useCallback(() => {
    setCurrentIndex(i => (i + 1) % photos.length);
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(i => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, goNext, goPrev, onOpenChange]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) > 50) {
      if (delta < 0) goNext();
      else goPrev();
    }
  }, [goNext, goPrev]);

  if (!photos.length) return null;
  const photo = photos[currentIndex];
  if (!photo) return null;
  const child = children.find(c => c.id === photo.childId);

  const fullDate = photo.date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <Dialog open={open && !editOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-foreground/95 backdrop-blur-xl overflow-hidden [&>button]:hidden">
          <div
            className="relative flex flex-col items-center justify-center h-[95vh]"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Close & Edit */}
            <div className="absolute top-3 right-3 z-50 flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-foreground/20"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-foreground/20"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation */}
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-50 text-primary-foreground/80 hover:text-primary-foreground hover:bg-foreground/20 h-12 w-12"
                  onClick={goPrev}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-50 text-primary-foreground/80 hover:text-primary-foreground hover:bg-foreground/20 h-12 w-12"
                  onClick={goNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Image */}
            <img
              src={photo.url}
              alt={photo.caption || 'Photo'}
              className="max-w-full max-h-[80vh] object-contain select-none"
              draggable={false}
            />

            {/* Info bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/80 to-transparent p-4 pt-12 text-primary-foreground">
              <div className="flex items-center justify-between">
                <div>
                  {child && <p className="text-sm font-semibold">{child.name} · {getAgeLabel(child.birthDate, photo.date)}</p>}
                  {photo.caption && <p className="text-xs opacity-80 mt-0.5">{photo.caption}</p>}
                  <p className="text-xs opacity-60 mt-0.5">{fullDate}</p>
                  {photo.locationName && (
                    <p className="text-xs opacity-60 mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {photo.locationName}
                    </p>
                  )}
                </div>
                <p className="text-xs opacity-60">{currentIndex + 1} / {photos.length}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PhotoEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        photo={{
          id: photo.id,
          childId: photo.childId,
          caption: photo.caption,
          eventId: photo.eventId,
          locationName: photo.locationName,
          storagePath: photo.storagePath,
        }}
        onDeleted={() => {
          setEditOpen(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}