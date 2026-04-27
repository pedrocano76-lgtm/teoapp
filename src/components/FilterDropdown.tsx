import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SlidersHorizontal, ArrowUpDown, MapPin } from 'lucide-react';
import { Tag, Event } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useActivities } from '@/hooks/useData';

interface FilterDropdownProps {
  sortOrder: 'asc' | 'desc';
  onSortChange: (order: 'asc' | 'desc') => void;
  tags: Tag[];
  selectedTagId: string | null;
  onTagSelect: (id: string | null) => void;
  events: Event[];
  selectedEventId: string | null;
  onEventSelect: (id: string | null) => void;
  locations: string[];
  selectedLocation: string | null;
  onLocationSelect: (loc: string | null) => void;
  selectedChildId?: string | null;
  selectedActivityId?: string | null;
  onActivitySelect?: (id: string | null) => void;
}

export function FilterDropdown({
  sortOrder, onSortChange,
  tags, selectedTagId, onTagSelect,
  events, selectedEventId, onEventSelect,
  locations, selectedLocation, onLocationSelect,
  selectedChildId, selectedActivityId, onActivitySelect,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const uniqueEvents = Array.from(new Map(events.map(e => [e.name, e])).values());
  const { data: activitiesData = [] } = useActivities(selectedChildId ?? undefined);
  const activities = activitiesData as Array<{ id: string; name: string; type: string; icon: string | null }>;
  const hasFilters = selectedTagId || selectedEventId || selectedLocation || selectedActivityId || sortOrder === 'asc';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 relative">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {hasFilters && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 space-y-4" align="end">
        {/* Sort order */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Orden</Label>
          <div className="flex gap-2">
            <Button
              variant={sortOrder === 'asc' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-1"
              onClick={() => onSortChange('asc')}
            >
              <ArrowUpDown className="h-3 w-3" />
              Más antiguas
            </Button>
            <Button
              variant={sortOrder === 'desc' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-1"
              onClick={() => onSortChange('desc')}
            >
              <ArrowUpDown className="h-3 w-3 rotate-180" />
              Más recientes
            </Button>
          </div>
        </div>

        {/* Events */}
        {uniqueEvents.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Eventos</Label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onEventSelect(null)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                  !selectedEventId ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Todos
              </button>
              {uniqueEvents.map(event => (
                <button
                  key={event.id}
                  onClick={() => onEventSelect(selectedEventId === event.id ? null : event.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium transition-all inline-flex items-center gap-1',
                    selectedEventId === event.id
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  <span>{event.icon}</span>
                  {event.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Etiquetas</Label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              <button
                onClick={() => onTagSelect(null)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                  !selectedTagId ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Todos
              </button>
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => onTagSelect(selectedTagId === tag.id ? null : tag.id)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                    selectedTagId === tag.id
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  <span>{tag.icon}</span>
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Locations */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lugar</Label>
          {locations.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              <button
                onClick={() => onLocationSelect(null)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                  !selectedLocation ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Todos
              </button>
              {locations.map(loc => (
                <button
                  key={loc}
                  onClick={() => onLocationSelect(selectedLocation === loc ? null : loc)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                    selectedLocation === loc
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  <MapPin className="h-3 w-3" />
                  {loc}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No hay fotos con ubicación</p>
          )}
        </div>

        {/* Clear all */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => {
              onSortChange('desc');
              onTagSelect(null);
              onEventSelect(null);
              onLocationSelect(null);
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
