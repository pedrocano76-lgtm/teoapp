import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useChildren, usePhotosInfinite, useEvents, useTags, useActivities } from '@/hooks/useData';
import { useUserRole } from '@/hooks/useUserRole';
import { ChildSelector } from '@/components/ChildSelector';
import { Timeline } from '@/components/Timeline';
import { AllChildrenTimeline } from '@/components/AllChildrenTimeline';
import { ChildHeader } from '@/components/ChildHeader';
import { PhotoUpload } from '@/components/PhotoUpload';
import { AddChildDialog } from '@/components/AddChildDialog';
import { Button } from '@/components/ui/button';
import { LogOut, CheckSquare, Loader2 } from 'lucide-react';
import { FilterDropdown } from '@/components/FilterDropdown';
import { NotificationBell } from '@/components/NotificationBell';
import { AppSidebar } from '@/components/AppSidebar';
import { BulkActionsToolbar } from '@/components/BulkActionsToolbar';

import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { supabase } from '@/integrations/supabase/client';
import type { Child, Photo, Event, Tag } from '@/lib/types';

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

function mapPhoto(row: any): Photo {
  const tags: Tag[] = Array.isArray(row.photo_tags)
    ? row.photo_tags
        .map((pt: any) => pt.tags)
        .filter(Boolean)
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          icon: t.icon,
          color: t.color,
          isPredefined: t.is_predefined,
        }))
    : [];
  return {
    id: row.id,
    url: row.signed_url || '',
    thumbnailUrl: row.thumbnail_signed_url || row.signed_url || '',
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
    tags,
  };
}

function mapEvent(row: any): Event {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    childId: row.child_id,
    date: new Date(row.date),
    color: row.color,
  };
}

function mapTag(row: any): Tag {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    isPredefined: row.is_predefined,
  };
}

const Index = () => {
  const { signOut } = useAuth();
  const { t } = useTranslation();
  const { data: childrenData, isLoading: childrenLoading } = useChildren();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Paginated photo fetch — first page (50 newest) lands fast, more load on scroll.
  const {
    data: photosPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: photosLoading,
  } = usePhotosInfinite(selectedChildId ?? undefined);
  const { data: eventsData } = useEvents();
  const { data: tagsData } = useTags();
  const { isGuest, canEdit } = useUserRole();

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const toggleTag = useCallback((id: string | null) => {
    if (id === null) { setSelectedTagIds([]); return; }
    setSelectedTagIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }, []);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: activitiesData = [] } = useActivities(selectedChildId ?? undefined);
  const activities = activitiesData as Array<{ id: string; name: string; icon: string | null }>;
  const selectedActivity = selectedActivityId
    ? activities.find(a => a.id === selectedActivityId) ?? null
    : null;

  // Selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());

  // Show "Seleccionar" icon only when user is near the top of the page
  const [atTop, setAtTop] = useState(true);
  useEffect(() => {
    const onScroll = () => setAtTop(window.scrollY < 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const children = useMemo(() => (childrenData || []).map(mapChild), [childrenData]);
  const photos = useMemo(() => {
    const allRows = (photosPages?.pages || []).flatMap(p => p.rows);
    return allRows.map(mapPhoto);
  }, [photosPages]);
  const events = useMemo(() => (eventsData || []).map(mapEvent), [eventsData]);
  const tags = useMemo(() => (tagsData || []).map(mapTag), [tagsData]);

  const selectedChild = selectedChildId
    ? children.find(c => c.id === selectedChildId) ?? null
    : null;

  const filteredEvents = useMemo(() => {
    if (!selectedChildId) return events;
    return events.filter(e => e.childId === selectedChildId);
  }, [selectedChildId, events]);

  const filteredPhotos = useMemo(() => {
    let result = photos;
    if (selectedChildId) result = result.filter(p => p.childId === selectedChildId);
    if (selectedEventId) {
      const eventName = events.find(e => e.id === selectedEventId)?.name;
      if (eventName) {
        const matchingIds = events
          .filter(e => e.name === eventName && (!selectedChildId || e.childId === selectedChildId))
          .map(e => e.id);
        result = result.filter(p => p.eventId && matchingIds.includes(p.eventId));
      }
    }
    if (selectedLocation) {
      result = result.filter(p => p.locationName === selectedLocation);
    }
    if (selectedActivity) {
      const activityName = selectedActivity.name.trim().toLowerCase();
      result = result.filter(p =>
        (p.tags || []).some(t => t.name.trim().toLowerCase() === activityName)
      );
    }
    return result.sort((a, b) =>
      sortOrder === 'asc' ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime()
    );
  }, [selectedChildId, selectedEventId, selectedLocation, selectedActivity, sortOrder, photos, events]);

  const uniqueLocations = useMemo(() => {
    const locs = new Set<string>();
    photos.forEach(p => { if (p.locationName) locs.add(p.locationName); });
    return Array.from(locs).sort();
  }, [photos]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedPhotoIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedPhotoIds(new Set());
  }, []);

  const selectedPhotos = useMemo(() =>
    filteredPhotos.filter(p => selectedPhotoIds.has(p.id)),
    [filteredPhotos, selectedPhotoIds]
  );

  // Infinite scroll sentinel — load next page when it enters the viewport.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { rootMargin: '600px 0px' } // start loading well before user reaches the end
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);


  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {!isGuest && (
          <AppSidebar
            children={children}
            onSelectChild={(id) => {
              setSelectedChildId(id);
              setSelectedEventId(null);
              setSelectedTagId(null);
              setSelectedLocation(null);
              setSelectedActivityId(null);
              exitSelectionMode();
            }}
            selectedChildId={selectedChildId}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0">
          {/* Slim header */}
          <header className="sticky top-0 z-40 h-12 border-b border-border/60 glass">
            <div className="h-full container mx-auto px-3 flex items-center gap-2">
              <SidebarTrigger className="shrink-0 h-8 w-8" />
              <h1 className="flex-1 text-center text-[15px] tracking-tight truncate" style={{ fontFamily: 'Georgia, serif', fontWeight: 500 }}>
                <span style={{ color: '#4A3728' }}>memory</span><span style={{ color: '#C8845A' }}>drawer</span>
              </h1>
              <div className="flex items-center gap-1 shrink-0">
                <FilterDropdown
                  sortOrder={sortOrder}
                  onSortChange={setSortOrder}
                  tags={tags}
                  selectedTagId={selectedTagId}
                  onTagSelect={setSelectedTagId}
                  events={filteredEvents}
                  selectedEventId={selectedEventId}
                  onEventSelect={setSelectedEventId}
                  locations={uniqueLocations}
                  selectedLocation={selectedLocation}
                  onLocationSelect={setSelectedLocation}
                  selectedChildId={selectedChildId}
                  selectedActivityId={selectedActivityId}
                  onActivitySelect={setSelectedActivityId}
                />
                {!isGuest && <NotificationBell />}
                {isGuest && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={signOut} aria-label={t('nav.exit')}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </header>

          {/* Bulk actions toolbar */}
          {selectionMode && selectedPhotoIds.size > 0 && (
            <BulkActionsToolbar
              selectedPhotos={selectedPhotos}
              onClear={exitSelectionMode}
              onDone={exitSelectionMode}
            />
          )}

          {/* Compact child pill selector + select toggle */}
          {(children.length > 1 || (canEdit && filteredPhotos.length > 0)) && (
            <div className="container mx-auto px-3 pt-2 flex items-center gap-2">
              {children.length > 1 && (
                <div className="flex-1 min-w-0 overflow-x-auto">
                  <ChildSelector
                    children={children}
                    selectedId={selectedChildId}
                    onSelect={(id) => { setSelectedChildId(id); setSelectedEventId(null); setSelectedTagId(null); setSelectedLocation(null); setSelectedActivityId(null); }}
                  />
                </div>
              )}
              {canEdit && filteredPhotos.length > 0 && (atTop || selectionMode) && (
                <Button
                  variant={selectionMode ? 'default' : 'ghost'}
                  size="icon"
                  className="h-8 w-8 shrink-0 ml-auto"
                  onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
                  aria-label={selectionMode ? t('selection.cancel') : t('selection.select')}
                >
                  <CheckSquare className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Content */}
          <main className="container mx-auto px-3 pt-2 pb-24 flex-1">
            {childrenLoading ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">{t('common.loading')}</p>
              </div>
            ) : children.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-5xl mb-4">👶</p>
                <h2 className="text-2xl font-heading font-bold text-foreground mb-2">{t('empty.welcomeTitle')}</h2>
                {isGuest ? (
                  <p className="text-muted-foreground mb-6">{t('empty.guestNoPhotos')}</p>
                ) : (
                  <>
                    <p className="text-muted-foreground mb-6">{t('empty.ownerNoChildren')}</p>
                    <AddChildDialog />
                  </>
                )}
              </div>
            ) : photosLoading ? (
              <div className="text-center py-20 flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">{t('empty.loadingPhotos')}</p>
              </div>
            ) : filteredPhotos.length === 0 ? (
              <div className="text-center py-20">
                {selectedActivity ? (
                  <>
                    <p className="text-4xl mb-4">{selectedActivity.icon || '🏷️'}</p>
                    <p className="text-muted-foreground text-lg">
                      {t('empty.noPhotosForActivity', { activity: selectedActivity.name })}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setSelectedActivityId(null)}
                    >
                      {t('empty.removeFilter')}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="mx-auto mb-4 inline-flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 6, background: '#C8845A' }}>
                      <svg width="32" height="32" viewBox="0 0 22 22" fill="none">
                        <rect x="2" y="5" width="18" height="13" rx="2" stroke="white" strokeWidth="1.6" />
                        <line x1="2" y1="9" x2="20" y2="9" stroke="white" strokeWidth="1.6" />
                        <line x1="7" y1="5" x2="7" y2="9" stroke="white" strokeWidth="1.6" />
                        <circle cx="11" cy="14" r="2" fill="white" />
                      </svg>
                    </div>
                    <p className="text-muted-foreground text-lg">{t('empty.noPhotos')}</p>
                    {canEdit && (
                      <>
                        <p className="text-muted-foreground text-sm mt-1 mb-4">{t('empty.noPhotosHint')}</p>
                        <PhotoUpload
                          children={children.map(c => ({ id: c.id, name: c.name }))}
                          defaultChildId={selectedChildId ?? undefined}
                        />
                      </>
                    )}
                  </>
                )}
              </div>
            ) : (
              <>
                {selectedChild ? (
                  <>
                    <ChildHeader child={selectedChild} photoCount={filteredPhotos.length} />
                    <Timeline
                      photos={filteredPhotos}
                      child={selectedChild}
                      sortOrder={sortOrder}
                      selectionMode={selectionMode}
                      selectedIds={selectedPhotoIds}
                      onToggleSelect={toggleSelect}
                    />
                  </>
                ) : children.length === 1 ? (
                  <>
                    <ChildHeader child={children[0]} photoCount={filteredPhotos.length} />
                    <Timeline
                      photos={filteredPhotos}
                      child={children[0]}
                      sortOrder={sortOrder}
                      selectionMode={selectionMode}
                      selectedIds={selectedPhotoIds}
                      onToggleSelect={toggleSelect}
                    />
                  </>
                ) : (
                  <AllChildrenTimeline
                    photos={filteredPhotos}
                    children={children}
                    sortOrder={sortOrder}
                    selectionMode={selectionMode}
                    selectedIds={selectedPhotoIds}
                    onToggleSelect={toggleSelect}
                  />
                )}

                {/* Infinite scroll sentinel + loader */}
                {hasNextPage && (
                  <div ref={sentinelRef} className="flex justify-center py-10">
                    {isFetchingNextPage ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('empty.loadingMorePhotos')}
                      </div>
                    ) : (
                      <div className="h-4" />
                    )}
                  </div>
                )}
              </>
            )}
          </main>

          <footer className="border-t border-border py-4">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
              {t('footer.tagline')}
            </div>
          </footer>
        </div>

        {/* Floating action button — upload */}
        {canEdit && children.length > 0 && (
          <div className="fixed bottom-6 right-4 z-50">
            <PhotoUpload
              children={children.map(c => ({ id: c.id, name: c.name }))}
              defaultChildId={selectedChildId ?? undefined}
              asFab
            />
          </div>
        )}
      </div>
    </SidebarProvider>
  );
};

export default Index;
