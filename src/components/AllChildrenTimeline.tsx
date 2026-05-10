import { useState, useMemo } from 'react';
import { Photo, Child, Event } from '@/lib/types';
import { getAge } from '@/lib/age-utils';
import { useLocale } from '@/hooks/useLocale';
import { PhotoCard } from './PhotoCard';
import { PhotoLightbox } from './PhotoLightbox';
import { EventCard } from './EventCard';

interface AllChildrenTimelineProps {
  photos: Photo[];
  children: Child[];
  sortOrder?: 'asc' | 'desc';
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  events?: Event[];
  onLongPress?: (id: string) => void;
}

export function AllChildrenTimeline({ photos, children, sortOrder = 'asc', selectionMode, selectedIds, onToggleSelect, events = [], onLongPress }: AllChildrenTimelineProps) {
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const { intlLocale } = useLocale();
  const sortedPhotos = useMemo(() => [...photos].sort((a, b) =>
    sortOrder === 'asc' ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime()
  ), [photos, sortOrder]);

  const groups = useMemo(() => {
    const m = new Map<string, { photos: Photo[]; date: Date }>();
    for (const photo of sortedPhotos) {
      const label = photo.date.toLocaleDateString(intlLocale, { month: 'long', year: 'numeric' });
      if (!m.has(label)) m.set(label, { photos: [], date: photo.date });
      m.get(label)!.photos.push(photo);
    }
    return m;
  }, [sortedPhotos, intlLocale]);

  const childMap = new Map(children.map(c => [c.id, c]));

  const flatPhotos: Photo[] = [];
  const indexMap = new Map<string, number>();
  for (const [, gp] of groups) {
    for (const p of gp.photos) {
      indexMap.set(p.id, flatPhotos.length);
      flatPhotos.push(p);
    }
  }

  const eventItems = useMemo(() => {
    const photosByEvent = new Map<string, Photo[]>();
    for (const p of photos) {
      if (p.eventId) {
        if (!photosByEvent.has(p.eventId)) photosByEvent.set(p.eventId, []);
        photosByEvent.get(p.eventId)!.push(p);
      }
    }
    return events
      .map(e => {
        const ePhotos = photosByEvent.get(e.id) || [];
        const date = e.date || (ePhotos[0]?.date ?? null);
        return { event: e, photos: ePhotos, date };
      })
      .filter(x => x.date && x.photos.length > 0);
  }, [events, photos]);

  type RenderItem =
    | { type: 'group'; key: string; date: Date; label: string; photos: Photo[] }
    | { type: 'event'; key: string; date: Date; event: Event; photos: Photo[] };

  const items: RenderItem[] = useMemo(() => {
    const list: RenderItem[] = [];
    for (const [label, g] of groups) {
      list.push({ type: 'group', key: label, date: g.date, label, photos: g.photos });
    }
    for (const e of eventItems) {
      list.push({ type: 'event', key: `event-${e.event.id}`, date: e.date as Date, event: e.event, photos: e.photos });
    }
    list.sort((a, b) =>
      sortOrder === 'asc' ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime()
    );
    return list;
  }, [groups, eventItems, sortOrder]);

  return (
    <>
      <div className="space-y-10">
        {items.map((item) => {
          if (item.type === 'event') {
            return (
              <section key={item.key} className="animate-fade-in">
                <EventCard event={item.event} photos={item.photos} />
              </section>
            );
          }
          const groupDate = item.date;
          const ageLabels = children.map(c => `${c.name}: ${getAge(c.birthDate, groupDate)}`);
          return (
            <section key={item.key} className="animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-border" />
                <div className="text-center">
                  <h3 className="text-lg font-heading font-semibold text-foreground whitespace-nowrap">
                    📅 {item.label}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ageLabels.join(' · ')}
                  </p>
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {item.photos.map((photo) => {
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
                      onLongPress={onLongPress}
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
