import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { useUpdateEvent } from '@/hooks/useData';
import { useLocale } from '@/hooks/useLocale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EventEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: { id: string; name: string; date?: string | Date | null; description?: string | null };
}

const MAX_DESC = 300;

export function EventEditDialog({ open, onOpenChange, event }: EventEditDialogProps) {
  const { t } = useTranslation();
  const { dateFnsLocale } = useLocale();
  const update = useUpdateEvent();

  const [name, setName] = useState(event.name);
  const [date, setDate] = useState<Date | undefined>(event.date ? new Date(event.date) : undefined);
  const [description, setDescription] = useState(event.description ?? '');

  useEffect(() => {
    if (open) {
      setName(event.name);
      setDate(event.date ? new Date(event.date) : undefined);
      setDescription(event.description ?? '');
    }
  }, [open, event]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('eventEdit.nameRequired', 'El nombre es obligatorio'));
      return;
    }
    try {
      await update.mutateAsync({
        eventId: event.id,
        name: name.trim(),
        date: date ?? null,
        description: description.trim() || null,
      });
      toast.success(t('eventEdit.saved', 'Evento actualizado'));
      onOpenChange(false);
    } catch {
      toast.error(t('eventEdit.error', 'No se pudo guardar el evento'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('eventEdit.title', 'Editar evento')}</DialogTitle>
          <DialogDescription>{t('eventEdit.description', 'Actualiza los detalles del evento.')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-name">{t('eventEdit.name', 'Nombre')}</Label>
            <Input id="event-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('eventEdit.date', 'Fecha')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP', { locale: dateFnsLocale }) : t('eventEdit.selectDate', 'Selecciona una fecha')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d > new Date()}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-desc">{t('eventEdit.descriptionLabel', 'Comentario')}</Label>
            <Textarea
              id="event-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
              placeholder={t('eventEdit.descriptionPlaceholder', 'Añade un comentario opcional')}
              className="min-h-[80px]"
              maxLength={MAX_DESC}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/{MAX_DESC}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={update.isPending}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
