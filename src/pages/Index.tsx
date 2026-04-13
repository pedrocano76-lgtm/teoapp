import { useState, useMemo } from 'react';
import { mockChildren, mockPhotos, mockEvents } from '@/lib/mock-data';
import { ChildSelector } from '@/components/ChildSelector';
import { EventFilter } from '@/components/EventFilter';
import { Timeline } from '@/components/Timeline';
import { AllChildrenTimeline } from '@/components/AllChildrenTimeline';
import { ChildHeader } from '@/components/ChildHeader';
import heroPattern from '@/assets/hero-pattern.jpg';

const Index = () => {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const selectedChild = selectedChildId
    ? mockChildren.find(c => c.id === selectedChildId) ?? null
    : null;

  const filteredEvents = useMemo(() => {
    if (!selectedChildId) return mockEvents;
    return mockEvents.filter(e => e.childId === selectedChildId);
  }, [selectedChildId]);

  const filteredPhotos = useMemo(() => {
    let photos = mockPhotos;

    if (selectedChildId) {
      photos = photos.filter(p => p.childId === selectedChildId);
    }

    if (selectedEventId) {
      const eventName = mockEvents.find(e => e.id === selectedEventId)?.name;
      if (eventName) {
        const matchingEventIds = mockEvents
          .filter(e => e.name === eventName && (!selectedChildId || e.childId === selectedChildId))
          .map(e => e.id);
        photos = photos.filter(p => p.eventId && matchingEventIds.includes(p.eventId));
      }
    }

    return photos.sort((a, b) =>
      sortOrder === 'asc'
        ? a.date.getTime() - b.date.getTime()
        : b.date.getTime() - a.date.getTime()
    );
  }, [selectedChildId, selectedEventId, sortOrder]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroPattern}
            alt=""
            className="w-full h-full object-cover opacity-30"
            width={1920}
            height={1080}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 to-background" />
        </div>
        <div className="relative container mx-auto px-4 pt-12 pb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground">
            Little Moments
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Every smile, every step — treasured forever ✨
          </p>
        </div>
      </header>

      {/* Controls */}
      <div className="container mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <ChildSelector
            children={mockChildren}
            selectedId={selectedChildId}
            onSelect={(id) => {
              setSelectedChildId(id);
              setSelectedEventId(null);
            }}
          />
          <button
            onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors self-start"
          >
            {sortOrder === 'asc' ? '⬆️ Oldest first' : '⬇️ Newest first'}
          </button>
        </div>

        <EventFilter
          events={filteredEvents}
          selectedEventId={selectedEventId}
          onSelect={setSelectedEventId}
        />
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 pb-16">
        {selectedChild && (
          <ChildHeader
            child={selectedChild}
            photoCount={filteredPhotos.length}
          />
        )}

        {filteredPhotos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📷</p>
            <p className="text-muted-foreground text-lg">No photos found</p>
            <p className="text-muted-foreground text-sm mt-1">
              Try adjusting your filters
            </p>
          </div>
        ) : selectedChild ? (
          <Timeline photos={filteredPhotos} child={selectedChild} />
        ) : (
          <AllChildrenTimeline photos={filteredPhotos} children={mockChildren} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Made with 💕 for growing families
        </div>
      </footer>
    </div>
  );
};

export default Index;
