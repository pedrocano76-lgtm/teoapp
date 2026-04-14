import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useChildren, usePhotos, useEvents, useTags } from '@/hooks/useData';
import { useUserRole } from '@/hooks/useUserRole';
import { ChildSelector } from '@/components/ChildSelector';
import { Timeline } from '@/components/Timeline';
import { AllChildrenTimeline } from '@/components/AllChildrenTimeline';
import { ChildHeader } from '@/components/ChildHeader';
import { PhotoUpload } from '@/components/PhotoUpload';
import { AddChildDialog } from '@/components/AddChildDialog';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { FilterDropdown } from '@/components/FilterDropdown';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { supabase } from '@/integrations/supabase/client';
import heroPattern from '@/assets/hero-pattern.jpg';
import type { Child, Photo, Event, Tag } from '@/lib/types';

function mapChild(row: any): Child {
  return {
    id: row.id,
    name: row.name,
    birthDate: new Date(row.birth_date),
    avatarUrl: row.avatar_url ?? undefined,
    color: row.color as Child['color'],
  };
}

function mapPhoto(row: any): Photo {
  return {
    id: row.id,
    url: row.signed_url || '',
    childId: row.child_id,
    date: new Date(row.taken_at),
    caption: row.caption ?? undefined,
    eventId: row.event_id ?? undefined,
    locationName: row.location_name ?? undefined,
    locationLat: row.location_lat ?? undefined,
    locationLng: row.location_lng ?? undefined,
    storagePath: row.storage_path,
    isShared: row.is_shared ?? true,
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
  const { data: childrenData, isLoading: childrenLoading } = useChildren();
  const { data: photosData } = usePhotos();
  const { data: eventsData } = useEvents();
  const { data: tagsData } = useTags();
  const { isGuest, canEdit } = useUserRole();

  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const children = useMemo(() => (childrenData || []).map(mapChild), [childrenData]);
  const photos = useMemo(() => (photosData || []).map(mapPhoto), [photosData]);
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
    return result.sort((a, b) =>
      sortOrder === 'asc' ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime()
    );
  }, [selectedChildId, selectedEventId, selectedLocation, sortOrder, photos, events]);

  const uniqueLocations = useMemo(() => {
    const locs = new Set<string>();
    photos.forEach(p => { if (p.locationName) locs.add(p.locationName); });
    return Array.from(locs).sort();
  }, [photos]);

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
            }}
            selectedChildId={selectedChildId}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="relative overflow-hidden">
            <div className="absolute inset-0">
              <img src={heroPattern} alt="" className="w-full h-full object-cover opacity-30" width={1920} height={1080} />
              <div className="absolute inset-0 bg-gradient-to-b from-background/30 to-background" />
            </div>
            <div className="relative container mx-auto px-4 pt-6 pb-4">
              <div className="flex items-center gap-3">
                {!isGuest && <SidebarTrigger className="shrink-0" />}
                <div className="min-w-0 flex-1">
                  <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground truncate">Little Moments</h1>
                  <p className="text-muted-foreground mt-0.5 text-sm md:text-base">Cada sonrisa, cada paso — atesorados para siempre ✨</p>
                </div>
                {isGuest && (
                  <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5" onClick={signOut}>
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Salir</span>
                  </Button>
                )}
              </div>
            </div>
          </header>

          {/* Controls */}
          <div className="container mx-auto px-4 py-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                {children.length > 1 && (
                  <ChildSelector
                    children={children}
                    selectedId={selectedChildId}
                    onSelect={(id) => { setSelectedChildId(id); setSelectedEventId(null); setSelectedTagId(null); setSelectedLocation(null); }}
                  />
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {canEdit && children.length > 0 && (
                  <PhotoUpload
                    children={children.map(c => ({ id: c.id, name: c.name }))}
                    defaultChildId={selectedChildId ?? undefined}
                  />
                )}
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
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <main className="container mx-auto px-4 pb-16 flex-1">
            {childrenLoading ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">Cargando...</p>
              </div>
            ) : children.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-5xl mb-4">👶</p>
                <h2 className="text-2xl font-heading font-bold text-foreground mb-2">¡Bienvenido a Little Moments!</h2>
                {isGuest ? (
                  <p className="text-muted-foreground mb-6">Aún no hay fotos compartidas contigo.</p>
                ) : (
                  <>
                    <p className="text-muted-foreground mb-6">Empieza añadiendo a tu primer hijo para crear su álbum de fotos.</p>
                    <AddChildDialog />
                  </>
                )}
              </div>
            ) : filteredPhotos.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-4">📷</p>
                <p className="text-muted-foreground text-lg">Aún no hay fotos</p>
                {canEdit && (
                  <>
                    <p className="text-muted-foreground text-sm mt-1 mb-4">Sube tus primeras fotos para iniciar la línea de tiempo</p>
                    <PhotoUpload
                      children={children.map(c => ({ id: c.id, name: c.name }))}
                      defaultChildId={selectedChildId ?? undefined}
                    />
                  </>
                )}
              </div>
            ) : (
              <>
                {selectedChild ? (
                  <>
                    <ChildHeader child={selectedChild} photoCount={filteredPhotos.length} />
                    <Timeline photos={filteredPhotos} child={selectedChild} sortOrder={sortOrder} />
                  </>
                ) : children.length === 1 ? (
                  <>
                    <ChildHeader child={children[0]} photoCount={filteredPhotos.length} />
                    <Timeline photos={filteredPhotos} child={children[0]} sortOrder={sortOrder} />
                  </>
                ) : (
                  <AllChildrenTimeline photos={filteredPhotos} children={children} sortOrder={sortOrder} />
                )}
              </>
            )}
          </main>

          <footer className="border-t border-border py-4">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
              Hecho con 💕 para familias que crecen
            </div>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
