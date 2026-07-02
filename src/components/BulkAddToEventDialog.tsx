import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useEvents, useAddEvent, useLinkPhotosToEvent } from '@/hooks/useData';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Photo } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPhotos: Photo[];
  onDone: () => void;
}

export function BulkAddToEventDialog({ open, onOpenChange, selectedPhotos, onDone }: Props) {
  const { t } = useTranslation();
  const { dateFnsLocale } = useLocale();
  const { data: eventsData } = useEvents();
  const addEvent = useAddEvent();
  const link = useLinkPhotosToEvent();

  // Determine the child(ren) of the selection. Only allow when all photos belong to the same child.
  const childIds = useMemo(() => Array.from(new Set(selectedPhotos.map(p => p.childId))), [selectedPhotos]);
  const singleChildId = childIds.length === 1 ? childIds[0] : null;

  const oldestDate = useMemo(() => {
    if (selectedPhotos.length === 0) return new Date();
    return selectedPhotos.reduce((min, p) => (p.date < min ? p.date : min), selectedPhotos[0].date);
  }, [selectedPhotos]);

  const childEvents = useMemo(() => {
    if (!singleChildId || !eventsData) return [];
    return (eventsData as any[])
      .filter(e => e.child_id === singleChildId)
      .sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));
  }, [eventsData, singleChildId]);

  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState<Date>(oldestDate);
  const [newDesc, setNewDesc] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Reset new-event form whenever the dialog opens with a fresh selection
  const handleOpenChange = (o: boolean) => {
    if (o) {
      setNewName('');
      setNewDate(oldestDate);
      setNewDesc('');
    }
    onOpenChange(o);
  };

  const assignTo = async (eventId: string, eventName: string) => {
    try {
      await link.mutateAsync({ eventId, photoIds: selectedPhotos.map(p => p.id) });
      toast.success(
        t('bulk.addedToEvent', {
          count: selectedPhotos.length,
          name: eventName,
          defaultValue: '{{count}} fotos añadidas a {{name}}',
        })
      );
      onOpenChange(false);
      onDone();
    } catch (err: any) {
      toast.error(err?.message ?? t('bulk.addToEventError', { defaultValue: 'No se pudieron añadir las fotos' }));
    }
  };

  const handleCreate = async () => {
    if (!singleChildId || !newName.trim()) return;
    try {
      const created = await addEvent.mutateAsync({
        childId: singleChildId,
        name: newName.trim(),
        date: newDate,
        description: newDesc.trim() || null,
      });
      await assignTo(created.id, created.name);
    } catch (err: any) {
      toast.error(err?.message ?? t('bulk.createEventError', { defaultValue: 'No se pudo crear el evento' }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('bulk.addToEvent', { defaultValue: 'Añadir a evento' })}</DialogTitle>
          <DialogDescription>
            {selectedPhotos.length} {t('bulk.selected')}
          </DialogDescription>
        </DialogHeader>

        {!singleChildId ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {t('bulk.singleChildOnly', {
              defaultValue: 'Solo puedes asignar a un evento fotos del mismo niño.',
            })}
          </p>
        ) : (
          <Tabs defaultValue="existing" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="existing">
                {t('bulk.existingEvent', { defaultValue: 'Evento existente' })}
              </TabsTrigger>
              <TabsTrigger value="new">
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t('bulk.newEvent', { defaultValue: 'Evento nuevo' })}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="flex-1 overflow-y-auto mt-3">
              {childEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t('bulk.noEvents', { defaultValue: 'Aún no hay eventos. Crea uno nuevo.' })}
                </p>
              ) : (
                <ul className="space-y-1">
                  {childEvents.map((e: any) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        disabled={link.isPending}
                        onClick={() => assignTo(e.id, e.name)}
                        className={cn(
                          'w-full text-left px-3 py-2.5 rounded-lg border border-border/60 hover:bg-accent transition-colors',
                          'flex items-center gap-2'
                        )}
                      >
                        <span className="text-base">{e.icon || '⭐'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{e.name}</div>
                          {e.date && (
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(e.date), 'PPP', { locale: dateFnsLocale })}
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="new" className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="event-name">{t('event.name', { defaultValue: 'Nombre' })} *</Label>
                <Input
                  id="event-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t('event.namePlaceholder', { defaultValue: 'Ej: Cumpleaños' })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('event.date', { defaultValue: 'Fecha' })}</Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {format(newDate, 'PPP', { locale: dateFnsLocale })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newDate}
                      onSelect={(d) => { if (d) { setNewDate(d); setDatePickerOpen(false); } }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {t('bulk.datePrefilledFromOldest', {
                    defaultValue: 'Pre-rellenado con la foto más antigua seleccionada',
                  })}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event-desc">
                  {t('event.description', { defaultValue: 'Comentario' })}{' '}
                  <span className="text-muted-foreground text-xs">({t('common.optional', { defaultValue: 'opcional' })})</span>
                </Label>
                <Textarea
                  id="event-desc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={!newName.trim() || addEvent.isPending || link.isPending}
              >
                {t('bulk.createAndAssign', {
                  count: selectedPhotos.length,
                  defaultValue: 'Crear y añadir {{count}} fotos',
                })}
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
