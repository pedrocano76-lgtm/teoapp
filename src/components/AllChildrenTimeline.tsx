import { useState } from 'react';
import { Photo, Child } from '@/lib/types';
import { getAge } from '@/lib/age-utils';
import { PhotoCard } from './PhotoCard';
import { PhotoLightbox } from './PhotoLightbox';

interface AllChildrenTimelineProps {
  photos: Photo[];
  children: Child[];
  sortOrder?: 'asc' | 'desc';
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export function AllChildrenTimeline({ photos, children, sortOrder = 'asc', selectionMode, selectedIds, onToggleSelect }: AllChildrenTimelineProps) {
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const sortedPhotos = [...photos].sort((a, b) =>
    sortOrder === 'asc' ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime()
  );
  const groups = new Map<string, Photo[]>();

  for (const photo of sortedPhotos) {
    const label = photo.date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(photo);
  }

  const childMap = new Map(children.map(c => [c.id, c]));

  const flatPhotos: Photo[] = [];
  const indexMap = new Map<string, number>();
  for (const [, gp] of groups) {
    for (const p of gp) {
      indexMap.set(p.id, flatPhotos.length);
      flatPhotos.push(p);
    }
  }

  return (
    <>
      <div className="space-y-10">
        {Array.from(groups.entries()).map(([label, groupPhotos]) => {
          const groupDate = groupPhotos[0].date;
          const ageLabels = children.map(c => `${c.name}: ${getAge(c.birthDate, groupDate)}`);

          return (
            <section key={label} className="animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-border" />
                <div className="text-center">
                  <h3 className="text-lg font-heading font-semibold text-foreground whitespace-nowrap">
                    📅 {label}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ageLabels.join(' · ')}
                  </p>
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {groupPhotos.map((photo) => {
                  const child = childMap.get(photo.childId);
                  if (!child) return null;
                  return (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      child={child}
                      onClick={() => setLightboxIndex(indexMap.get(photo.id) ?? 0)}
                      selectionMode={selectionMode}
                      isSelected={selectedIds?.has(photo.id)}
                      onToggleSelect={onToggleSelect}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      {!selectionMode && (
        <PhotoLightbox
          photos={flatPhotos}
          children={children}
          initialIndex={lightboxIndex >= 0 ? lightboxIndex : 0}
          open={lightboxIndex >= 0}
          onOpenChange={(open) => { if (!open) setLightboxIndex(-1); }}
        />
      )}
    </>
  );
}
