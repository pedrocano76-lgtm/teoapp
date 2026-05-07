import { useState, useMemo } from 'react';
import { Photo, Child, Event } from '@/lib/types';
import { getAge, getTimelineGroupLabel, getTimelineGroupKey } from '@/lib/age-utils';
import { useLocale } from '@/hooks/useLocale';
import { PhotoCard } from './PhotoCard';
import { PhotoLightbox } from './PhotoLightbox';
import { EventCard } from './EventCard';

interface TimelineProps {
  photos: Photo[];
  child: Child;
  sortOrder?: 'asc' | 'desc';
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  events?: Event[];
}

export function Timeline({ photos, child, sortOrder = 'asc', selectionMode, selectedIds, onToggleSelect, events = [] }: TimelineProps) {
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const { intlLocale } = useLocale();

  const sortedPhotos = useMemo(() => [...photos].sort((a, b) =>
    sortOrder === 'asc' ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime()
  ), [photos, sortOrder]);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; photos: Photo[]; date: Date }>();
    for (const photo of sortedPhotos) {
      const key = getTimelineGroupKey(child.birthDate, photo.date);
      const label = getTimelineGroupLabel(child.birthDate, photo.date);
      if (!map.has(key)) map.set(key, { label, photos: [], date: photo.date });
      map.get(key)!.photos.push(photo);
    }
    return map;
  }, [sortedPhotos, child.birthDate]);

  const flatPhotos: Photo[] = [];
  const indexMap = new Map<string, number>();
  for (const [, { photos: gp }] of groups) {
    for (const p of gp) {
      indexMap.set(p.id, flatPhotos.length);
      flatPhotos.push(p);
    }
  }

  // Build interleaved render items: groups + events sorted by date
  const eventsForChild = useMemo(() => {
    const photosByEvent = new Map<string, Photo[]>();
    for (const p of photos) {
      if (p.eventId) {
        if (!photosByEvent.has(p.eventId)) photosByEvent.set(p.eventId, []);
        photosByEvent.get(p.eventId)!.push(p);
      }
    }
    return events
      .filter(e => e.childId === child.id)
      .map(e => {
        const ePhotos = photosByEvent.get(e.id) || [];
        const date = e.date || (ePhotos[0]?.date ?? null);
        return { event: e, photos: ePhotos, date };
      })
      .filter(x => x.date && x.photos.length > 0);
  }, [events, photos, child.id]);

  type RenderItem =
    | { type: 'group'; key: string; date: Date; label: string; photos: Photo[] }
    | { type: 'event'; key: string; date: Date; event: Event; photos: Photo[] };

  const items: RenderItem[] = useMemo(() => {
    const list: RenderItem[] = [];
    for (const [key, g] of groups) {
      list.push({ type: 'group', key, date: g.date, label: g.label, photos: g.photos });
    }
    for (const e of eventsForChild) {
      list.push({ type: 'event', key: `event-${e.event.id}`, date: e.date as Date, event: e.event, photos: e.photos });
    }
    list.sort((a, b) =>
      sortOrder === 'asc' ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime()
    );
    return list;
  }, [groups, eventsForChild, sortOrder]);

  return (
    <>
      <div className="space-y-10">
        {Array.from(groups.entries()).map(([key, { label, photos: groupPhotos, date }]) => {
          const dateLabel = date.toLocaleDateString(intlLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          const ageLabel = getAge(child.birthDate, date);

          return (
            <section key={key} className="animate-fade-in">
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
                    selectionMode={selectionMode}
                    isSelected={selectedIds?.has(photo.id)}
                    onToggleSelect={onToggleSelect}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {!selectionMode && (
        <PhotoLightbox
          photos={flatPhotos}
          children={[child]}
          initialIndex={lightboxIndex >= 0 ? lightboxIndex : 0}
          open={lightboxIndex >= 0}
          onOpenChange={(open) => { if (!open) setLightboxIndex(-1); }}
        />
      )}
    </>
  );
}
