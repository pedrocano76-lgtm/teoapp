import { useState } from 'react';
import { Photo, Child } from '@/lib/types';
import { getAgeMonths, getAge } from '@/lib/age-utils';
import { PhotoCard } from './PhotoCard';
import { PhotoLightbox } from './PhotoLightbox';

interface TimelineProps {
  photos: Photo[];
  child: Child;
  sortOrder?: 'asc' | 'desc';
}

export function Timeline({ photos, child, sortOrder = 'asc' }: TimelineProps) {
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const groups = new Map<string, { photos: Photo[]; date: Date }>();
  const sortedPhotos = [...photos].sort((a, b) =>
    sortOrder === 'asc' ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime()
  );

  for (const photo of sortedPhotos) {
    const months = getAgeMonths(child.birthDate, photo.date);
    let label: string;
    if (months < 1) label = '🍼 Recién nacido';
    else if (months < 3) label = '🌸 1–3 meses';
    else if (months < 6) label = '🌿 3–6 meses';
    else if (months < 9) label = '☀️ 6–9 meses';
    else if (months < 12) label = '🍂 9–12 meses';
    else {
      const years = Math.floor(months / 12);
      label = `🎂 ${years} año${years !== 1 ? 's' : ''}`;
    }
    if (!groups.has(label)) groups.set(label, { photos: [], date: photo.date });
    groups.get(label)!.photos.push(photo);
  }

  const flatPhotos: Photo[] = [];
  const indexMap = new Map<string, number>();
  for (const [, { photos: gp }] of groups) {
    for (const p of gp) {
      indexMap.set(p.id, flatPhotos.length);
      flatPhotos.push(p);
    }
  }

  return (
    <>
      <div className="space-y-10">
        {Array.from(groups.entries()).map(([label, { photos: groupPhotos, date }]) => {
          const dateLabel = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          const ageLabel = getAge(child.birthDate, date);

          return (
            <section key={label} className="animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-border" />
                <div className="text-center">
                  <h3 className="text-lg font-heading font-semibold text-foreground whitespace-nowrap">
                    {label}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {dateLabel} · {ageLabel}
                  </p>
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {groupPhotos.map((photo) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    child={child}
                    onClick={() => setLightboxIndex(indexMap.get(photo.id) ?? 0)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <PhotoLightbox
        photos={flatPhotos}
        children={[child]}
        initialIndex={lightboxIndex >= 0 ? lightboxIndex : 0}
        open={lightboxIndex >= 0}
        onOpenChange={(open) => { if (!open) setLightboxIndex(-1); }}
      />
    </>
  );
}
