import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChildren, useEvents } from '@/hooks/useData';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { PhotoCard } from '@/components/PhotoCard';
import { PhotoLightbox } from '@/components/PhotoLightbox';
import { EventEditDialog } from '@/components/EventEditDialog';
import { AddPhotosToEventDialog } from '@/components/AddPhotosToEventDialog';
import { useLocale } from '@/hooks/useLocale';
import { formatEventDateRange, isMultiDayEvent } from '@/lib/date-range';
import type { Photo, Child } from '@/lib/types';

function mapChild(row: any): Child {
  return {
    id: row.id,
    name: row.name,
    birthDate: new Date(row.birth_date),
    avatarUrl: row.avatar_url ?? undefined,
    color: row.color as Child['color'],
    ownerId: row.owner_id ?? undefined,
    fullName: row.full_name ?? undefined,
    profilePhotoPath: row.profile_photo_path ?? undefined,
  };
}

export default function EventView() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { intlLocale } = useLocale();
  const { data: childrenData } = useChildren();
  const { data: eventsData } = useEvents();
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [editOpen, setEditOpen] = useState(false);
  const [addPhotosOpen, setAddPhotosOpen] = useState(false);
  const { canEdit } = useUserRole();

  const { data: photosData, isLoading } = useQuery({
    queryKey: ['event-photos', eventId, user?.id],
    enabled: !!user && !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photos')
        .select('*, photo_tags(tag_id, tags(id, name, icon, color, is_predefined))')
        .eq('event_id', eventId!)
        .order('taken_at', { ascending: true });
      if (error) throw error;
      const paths: string[] = [];
      for (const p of data ?? []) {
        if (p.storage_path) paths.push(p.storage_path);
        if (p.thumbnail_path) paths.push(p.thumbnail_path);
      }
      const { signPhotoPaths } = await import('@/lib/sign-photos');
      const urlMap = await signPhotoPaths(paths);
      return (data ?? []).map((row: any): Photo => ({
        id: row.id,
        url: urlMap[row.storage_path] || '',
        thumbnailUrl: row.thumbnail_path ? urlMap[row.thumbnail_path] || urlMap[row.storage_path] || '' : urlMap[row.storage_path] || '',
        childId: row.child_id,
        date: new Date(row.taken_at),
        caption: row.caption ?? undefined,
        eventId: row.event_id ?? undefined,
        locationName: row.location_name ?? undefined,
        locationLat: row.location_lat ?? undefined,
        locationLng: row.location_lng ?? undefined,
        storagePath: row.storage_path,
        thumbnailPath: row.thumbnail_path ?? null,
        isShared: row.is_shared ?? true,
        mediaType: (row.media_type === 'video' ? 'video' : 'photo'),
        durationSeconds: row.duration_seconds ?? undefined,
        tags: Array.isArray(row.photo_tags)
          ? row.photo_tags.map((pt: any) => pt.tags).filter(Boolean).map((tg: any) => ({
              id: tg.id, name: tg.name, icon: tg.icon, color: tg.color, isPredefined: tg.is_predefined,
            }))
          : [],
      }));
    },
  });

  const children = useMemo(() => (childrenData || []).map(mapChild), [childrenData]);
  const childMap = useMemo(() => new Map(children.map(c => [c.id, c])), [children]);
  const event = useMemo(() => (eventsData || []).find((e: any) => e.id === eventId), [eventsData, eventId]);
  const photos = photosData ?? [];

  const startDate = event ? new Date((event as any).start_date) : null;
  const endDate = event && (event as any).end_date ? new Date((event as any).end_date) : null;
  const dateLabel = startDate ? formatEventDateRange(startDate, endDate, intlLocale) : '';
  const multiDay = isMultiDayEvent(startDate, endDate);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 h-12 border-b border-border/60 glass">
        <div className="h-full container mx-auto px-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)} aria-label={t('common.close')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="flex-1 text-center text-[15px] truncate" style={{ fontFamily: 'Georgia, serif', color: '#4A3728' }}>
            <span style={{ color: '#C8845A' }}>✦</span> {event?.name ?? ''}
          </h1>
          {canEdit && event ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setEditOpen(true)}
              aria-label={t('eventEdit.title', 'Editar evento')}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : (
            <div className="w-8" />
          )}
        </div>
      </header>
      <main className="container mx-auto px-3 pt-4 pb-20">
        {dateLabel && (
          <p className="text-center text-sm text-muted-foreground mb-1">
            {multiDay && <span style={{ color: '#D4793A' }} className="mr-1">◆◆</span>}
            {dateLabel} · {t('photos.count', { count: photos.length })}
          </p>
        )}
        {event?.description && (
          <p className="text-center text-sm text-foreground/80 mb-4 max-w-xl mx-auto">
            {event.description}
          </p>
        )}
        {canEdit && event && (
          <div className="flex justify-center mb-4">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAddPhotosOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('eventEdit.addPhotos', 'Añadir fotos al evento')}
            </Button>
          </div>
        )}
        {isLoading ? (
          <p className="text-center text-muted-foreground py-10">{t('common.loading')}</p>
        ) : photos.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">{t('empty.noPhotos')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {photos.map((photo, i) => {
              const child = childMap.get(photo.childId);
              if (!child) return null;
              return (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  child={child}
                  onClick={() => setLightboxIndex(i)}
                />
              );
            })}
          </div>
        )}
        <PhotoLightbox
          photos={photos}
          children={children}
          initialIndex={lightboxIndex >= 0 ? lightboxIndex : 0}
          open={lightboxIndex >= 0}
          onOpenChange={(open) => { if (!open) setLightboxIndex(-1); }}
        />
      </main>
      {event && (
        <>
          <EventEditDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            event={{ id: event.id, name: event.name, date: (event as any).start_date, endDate: (event as any).end_date, description: (event as any).description }}
          />
          <AddPhotosToEventDialog
            open={addPhotosOpen}
            onOpenChange={setAddPhotosOpen}
            eventId={event.id}
            childId={event.child_id}
          />
        </>
      )}
    </div>
  );
}
