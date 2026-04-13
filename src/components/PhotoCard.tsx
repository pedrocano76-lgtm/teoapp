import { Photo, Child } from '@/lib/types';
import { getAgeLabel } from '@/lib/age-utils';
import { cn } from '@/lib/utils';
import { MapPin } from 'lucide-react';

interface PhotoCardProps {
  photo: Photo;
  child: Child;
  onClick?: () => void;
}

export function PhotoCard({ photo, child, onClick }: PhotoCardProps) {
  const ageLabel = getAgeLabel(child.birthDate, photo.date);
  const fullDate = photo.date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl bg-card shadow-sm hover:shadow-lg transition-all duration-300 animate-fade-in cursor-pointer border-0 p-0 text-left w-full"
    >
      <div className="aspect-square overflow-hidden">
        <img
          src={photo.url}
          alt={photo.caption || `Photo of ${child.name}`}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
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
      {photo.eventId && (
        <div className="absolute top-2 right-2">
          <span className={cn(
            'inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-accent/90 text-accent-foreground backdrop-blur-sm'
          )}>
            ✨
          </span>
        </div>
      )}
    </button>
  );
}
