import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useChildren, usePhotos, useEvents } from '@/hooks/useData';
import { ChildSelector } from '@/components/ChildSelector';
import { EventFilter } from '@/components/EventFilter';
import { Timeline } from '@/components/Timeline';
import { AllChildrenTimeline } from '@/components/AllChildrenTimeline';
import { ChildHeader } from '@/components/ChildHeader';
import { PhotoUpload } from '@/components/PhotoUpload';
import { AddChildDialog } from '@/components/AddChildDialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import heroPattern from '@/assets/hero-pattern.jpg';
import type { Child, Photo, Event } from '@/lib/types';

function mapChild(row: any): Child {
  return {
    id: row.id,
    name: row.name,
    birthDate: new Date(row.birth_date),
    avatarUrl: row.avatar_url ?? undefined,
    color: row.color as Child['color'],
  };
}

function getPhotoUrl(storagePath: string): string {
  const { data } = supabase.storage.from('photos').getPublicUrl(storagePath);
  return data.publicUrl;
}

function mapPhoto(row: any): Photo {
  return {
    id: row.id,
    url: getPhotoUrl(row.storage_path),
    childId: row.child_id,
    date: new Date(row.taken_at),
    caption: row.caption ?? undefined,
    eventId: row.event_id ?? undefined,
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

const Index = () => {
  const { user, signOut } = useAuth();
  const { data: childrenData, isLoading: childrenLoading } = useChildren();
  const { data: photosData } = usePhotos();
  const { data: eventsData } = useEvents();

  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const children = useMemo(() => (childrenData || []).map(mapChild), [childrenData]);
  const photos = useMemo(() => (photosData || []).map(mapPhoto), [photosData]);
  const events = useMemo(() => (eventsData || []).map(mapEvent), [eventsData]);

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
    return result.sort((a, b) =>
      sortOrder === 'asc' ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime()
    );
  }, [selectedChildId, selectedEventId, sortOrder, photos, events]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroPattern} alt="" className="w-full h-full object-cover opacity-30" width={1920} height={1080} />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 to-background" />
        </div>
        <div className="relative container mx-auto px-4 pt-8 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground">Little Moments</h1>
              <p className="text-muted-foreground mt-1 text-lg">Every smile, every step — treasured forever ✨</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={signOut}>Sign Out</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="container mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {children.length > 0 && (
              <ChildSelector
                children={children}
                selectedId={selectedChildId}
                onSelect={(id) => { setSelectedChildId(id); setSelectedEventId(null); }}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <AddChildDialog />
            {children.length > 0 && (
              <PhotoUpload
                children={children.map(c => ({ id: c.id, name: c.name }))}
                defaultChildId={selectedChildId ?? undefined}
              />
            )}
            <button
              onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              {sortOrder === 'asc' ? '⬆️ Oldest' : '⬇️ Newest'}
            </button>
          </div>
        </div>

        {filteredEvents.length > 0 && (
          <EventFilter events={filteredEvents} selectedEventId={selectedEventId} onSelect={setSelectedEventId} />
        )}
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 pb-16">
        {childrenLoading ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : children.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">👶</p>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-2">Welcome to Little Moments!</h2>
            <p className="text-muted-foreground mb-6">Start by adding your first child to begin your photo album.</p>
            <AddChildDialog />
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📷</p>
            <p className="text-muted-foreground text-lg">No photos yet</p>
            <p className="text-muted-foreground text-sm mt-1 mb-4">Upload your first photos to start the timeline</p>
            <PhotoUpload
              children={children.map(c => ({ id: c.id, name: c.name }))}
              defaultChildId={selectedChildId ?? undefined}
            />
          </div>
        ) : (
          <>
            {selectedChild && (
              <ChildHeader child={selectedChild} photoCount={filteredPhotos.length} />
            )}
            {selectedChild ? (
              <Timeline photos={filteredPhotos} child={selectedChild} />
            ) : (
              <AllChildrenTimeline photos={filteredPhotos} children={children} />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Made with 💕 for growing families
        </div>
      </footer>
    </div>
  );
};

export default Index;
