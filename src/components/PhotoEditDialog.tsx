import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TagSelector } from '@/components/TagSelector';
import { useUpdatePhoto, useDeletePhoto, usePhotoTags, useEvents } from '@/hooks/useData';
import { MapPin, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
  };
  onDeleted?: () => void;
}

export function PhotoEditDialog({ open, onOpenChange, photo, onDeleted }: PhotoEditDialogProps) {
  const [caption, setCaption] = useState(photo.caption || '');
  const [eventId, setEventId] = useState(photo.eventId || '');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updatePhoto = useUpdatePhoto();
  const deletePhoto = useDeletePhoto();
  const { data: photoTags } = usePhotoTags(photo.id);
  const { data: eventsData } = useEvents(photo.childId);

  useEffect(() => {
    if (open) {
      setCaption(photo.caption || '');
      setEventId(photo.eventId || '');
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

          {eventsData && eventsData.length > 0 && (
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
