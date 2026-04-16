import { useState } from 'react';
import { Photo, Child } from '@/lib/types';
import { getAgeLabel } from '@/lib/age-utils';
import { cn } from '@/lib/utils';
import { MapPin, Pencil, Check } from 'lucide-react';
import { PhotoEditDialog } from '@/components/PhotoEditDialog';
import { useUserRole } from '@/hooks/useUserRole';

interface PhotoCardProps {
  photo: Photo;
  child: Child;
  onClick?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function PhotoCard({ photo, child, onClick, selectionMode, isSelected, onToggleSelect }: PhotoCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const { canEdit } = useUserRole();
  const ageLabel = getAgeLabel(child.birthDate, photo.date);
  const fullDate = photo.date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleClick = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(photo.id);
    } else {
      onClick?.();
    }
  };

  return (
    <>
      <div className={cn(
        "group relative overflow-hidden rounded-xl bg-card shadow-sm hover:shadow-lg transition-all duration-300 animate-fade-in",
        selectionMode && isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}>
        {/* Selection checkbox */}
        {selectionMode && (
          <div className={cn(
            "absolute top-2 left-2 z-10 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
            isSelected
              ? "bg-primary border-primary text-primary-foreground"
              : "bg-background/70 border-muted-foreground/50 backdrop-blur-sm"
          )}>
            {isSelected && <Check className="h-3.5 w-3.5" />}
          </div>
        )}

        {/* Edit button - only in non-selection mode */}
        {!selectionMode && canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
            className="absolute top-2 left-2 z-10 p-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          onClick={handleClick}
          className="w-full border-0 p-0 text-left cursor-pointer bg-transparent"
        >
          <div className="aspect-square overflow-hidden">
            <img
              src={photo.thumbnailUrl || photo.url}
              alt={photo.caption || `Foto de ${child.name}`}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          {!selectionMode && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                <p className="text-sm font-semibold text-primary-foreground">{ageLabel}</p>
                {photo.caption && (
                  <p className="text-xs text-primary-foreground/80 mt-0.5">{photo.caption}</p>
                )}
                <p className="text-xs text-primary-foreground/60 mt-0.5">{fullDate}</p>
                {photo.locationName && (
                  <p className="text-xs text-primary-foreground/60 mt-0.5 flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" /> {photo.locationName}
                  </p>
                )}
                {photo.tags && photo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {photo.tags.map(tag => (
                      <span key={tag.id} className="text-[10px] bg-background/20 backdrop-blur-sm text-primary-foreground/90 px-1.5 py-0.5 rounded-full">
                        {tag.icon} {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </button>
        {!selectionMode && photo.eventId && (
          <div className="absolute top-2 right-2 pointer-events-none">
            <span className={cn(
              'inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-accent/90 text-accent-foreground backdrop-blur-sm'
            )}>
              ✨
            </span>
          </div>
        )}
      </div>

      {!selectionMode && canEdit && (
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
            isShared: photo.isShared,
            takenAt: photo.date instanceof Date ? photo.date.toISOString() : String(photo.date),
          }}
        />
      )}
    </>
  );
}
