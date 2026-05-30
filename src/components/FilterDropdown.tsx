import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SlidersHorizontal, ArrowUpDown, MapPin } from 'lucide-react';
import { Tag, Event } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useActivities } from '@/hooks/useData';
import { useTranslation } from 'react-i18next';

interface FilterDropdownProps {
  sortOrder: 'asc' | 'desc';
  onSortChange: (order: 'asc' | 'desc') => void;
  tags: Tag[];
  selectedTagIds: string[];
  onTagToggle: (id: string | null) => void;
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
  tags, selectedTagIds, onTagToggle,
  events, selectedEventId, onEventSelect,
  locations, selectedLocation, onLocationSelect,
  selectedChildId, selectedActivityId, onActivitySelect,
}: FilterDropdownProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const uniqueEvents = Array.from(new Map(events.map(e => [e.name, e])).values());
  const { data: activitiesData = [] } = useActivities(selectedChildId ?? undefined);
  const activities = activitiesData as Array<{ id: string; name: string; type: string; icon: string | null }>;
  const hasFilters = selectedTagIds.length > 0 || selectedEventId || selectedLocation || selectedActivityId || sortOrder === 'asc';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 relative">
          <SlidersHorizontal className="h-4 w-4" />
          {t('filters.button')}
          {hasFilters && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 space-y-4" align="end">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('filters.sortLabel')}</Label>
          <div className="flex gap-2">
            <Button
              variant={sortOrder === 'asc' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-1"
              onClick={() => onSortChange('asc')}
            >
              <ArrowUpDown className="h-3 w-3" />
              {t('filters.oldestFirst')}
            </Button>
            <Button
              variant={sortOrder === 'desc' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-1"
              onClick={() => onSortChange('desc')}
            >
              <ArrowUpDown className="h-3 w-3 rotate-180" />
              {t('filters.newestFirst')}
            </Button>
          </div>
        </div>

        {uniqueEvents.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('filters.eventsLabel')}</Label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onEventSelect(null)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                  !selectedEventId ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {t('common.all')}
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

        {selectedChildId && activities.length > 0 && onActivitySelect && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('filters.activitiesLabel')}</Label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              <button
                onClick={() => onActivitySelect(null)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                  !selectedActivityId ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {t('common.all')}
              </button>
              {activities.map(activity => (
                <button
                  key={activity.id}
                  onClick={() => onActivitySelect(selectedActivityId === activity.id ? null : activity.id)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                    selectedActivityId === activity.id
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {activity.icon && <span>{activity.icon}</span>}
                  {activity.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('filters.tagsLabel')}</Label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              <button
                onClick={() => onTagToggle(null)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                  selectedTagIds.length === 0 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {t('common.all')}
              </button>
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => onTagToggle(tag.id)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                    selectedTagIds.includes(tag.id)
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('filters.locationLabel')}</Label>
          {locations.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              <button
                onClick={() => onLocationSelect(null)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                  !selectedLocation ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {t('common.all')}
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
            <p className="text-xs text-muted-foreground italic">{t('filters.noLocations')}</p>
          )}
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => {
              onSortChange('desc');
              onTagToggle(null);
              onEventSelect(null);
              onLocationSelect(null);
              onActivitySelect?.(null);
            }}
          >
            {t('filters.clear')}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
