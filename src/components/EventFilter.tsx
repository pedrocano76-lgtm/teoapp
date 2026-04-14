import { Event } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EventFilterProps {
  events: Event[];
  selectedEventId: string | null;
  onSelect: (id: string | null) => void;
}

export function EventFilter({ events, selectedEventId, onSelect }: EventFilterProps) {
  const uniqueNames = Array.from(new Map(events.map(e => [e.name, e])).values());

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
          selectedEventId === null
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
      >
        Todos
      </button>
      {uniqueNames.map((event) => (
        <button
          key={event.id}
          onClick={() => onSelect(event.name === events.find(e => e.id === selectedEventId)?.name ? null : event.id)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1',
            selectedEventId && events.find(e => e.id === selectedEventId)?.name === event.name
              ? 'bg-accent text-accent-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          <span>{event.icon}</span>
          {event.name}
        </button>
      ))}
    </div>
  );
}
