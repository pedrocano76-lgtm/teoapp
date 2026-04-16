import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TagSelector } from '@/components/TagSelector';
import { useUpdatePhoto, useDeletePhoto, usePhotoTags, useEvents } from '@/hooks/useData';
import { MapPin, Trash2, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PhotoEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photo: {
    id: string;
    childId: string;
    caption?: string;
    eventId?: string;
    locationName?: string;
    storagePath: string;
    isShared?: boolean;
    takenAt?: string;
  };
  onDeleted?: () => void;
}

export function PhotoEditDialog({ open, onOpenChange, photo, onDeleted }: PhotoEditDialogProps) {
  const [caption, setCaption] = useState(photo.caption || '');
  const [eventId, setEventId] = useState(photo.eventId || '');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isShared, setIsShared] = useState(photo.isShared ?? true);
  const [takenAt, setTakenAt] = useState<Date | undefined>(photo.takenAt ? new Date(photo.takenAt) : undefined);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updatePhoto = useUpdatePhoto();
  const deletePhoto = useDeletePhoto();
  const { data: photoTags } = usePhotoTags(photo.id);
  const { data: eventsData } = useEvents(photo.childId);

  useEffect(() => {
    if (open) {
      setCaption(photo.caption || '');
      setEventId(photo.eventId || '');
      setIsShared(photo.isShared ?? true);
      setTakenAt(photo.takenAt ? new Date(photo.takenAt) : undefined);
      setConfirmDelete(false);
    }
  }, [open, photo]);

  useEffect(() => {
    if (photoTags) {
      setSelectedTagIds(photoTags.map((pt: any) => pt.tag_id));
    }
  }, [photoTags]);

  const handleSave = async () => {
    try {
      await updatePhoto.mutateAsync({
        photoId: photo.id,
        caption: caption || undefined,
        eventId: eventId || null,
        tagIds: selectedTagIds,
        isShared,
        takenAt: takenAt ? takenAt.toISOString() : undefined,
      });
      toast.success('Foto actualizada');
      onOpenChange(false);
    } catch {
      toast.error('Error al actualizar la foto');
    }
  };

  const handleDelete = async () => {
    try {
      await deletePhoto.mutateAsync({ photoId: photo.id, storagePath: photo.storagePath });
      toast.success('Foto eliminada');
      onOpenChange(false);
      onDeleted?.();
    } catch {
      toast.error('Error al eliminar la foto');
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar foto</DialogTitle>
          <DialogDescription>Modifica los detalles de la foto</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="caption">Comentario</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Añade un comentario..."
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !takenAt && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {takenAt ? format(takenAt, "PPP", { locale: es }) : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={takenAt}
                  onSelect={setTakenAt}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
            <div className="space-y-2">
              <Label>Evento</Label>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin evento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin evento</SelectItem>
                  {eventsData.map((event: any) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.icon} {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <TagSelector selectedTagIds={selectedTagIds} onToggle={toggleTag} />

          <div className="flex items-center gap-2">
            <Switch id="edit-shared" checked={isShared} onCheckedChange={setIsShared} />
            <Label htmlFor="edit-shared" className="text-sm">
              {isShared ? 'Visible para invitados' : 'Solo padres'}
            </Label>
          </div>

          {photo.locationName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {photo.locationName}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          {confirmDelete ? (
            <div className="flex items-center gap-2 w-full">
              <p className="text-sm text-destructive flex-1">¿Eliminar esta foto?</p>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deletePhoto.isPending}>
                Confirmar
              </Button>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Eliminar
              </Button>
              <Button onClick={handleSave} disabled={updatePhoto.isPending}>
                Guardar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
