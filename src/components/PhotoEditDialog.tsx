import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TagSelector } from '@/components/TagSelector';
import { useUpdatePhoto, useDeletePhoto, usePhotoTags, useEvents, useAddEvent } from '@/hooks/useData';
import { useLocale } from '@/hooks/useLocale';
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
    thumbnailPath?: string | null;
    isShared?: boolean;
    takenAt?: string;
  };
  onDeleted?: () => void;
}

export function PhotoEditDialog({ open, onOpenChange, photo, onDeleted }: PhotoEditDialogProps) {
  const { t } = useTranslation();
  const { dateFnsLocale } = useLocale();
  const [caption, setCaption] = useState(photo.caption || '');
  const [isEvent, setIsEvent] = useState(!!photo.eventId);
  const [eventMode, setEventMode] = useState<'new' | 'existing'>('existing');
  const [eventId, setEventId] = useState(photo.eventId || '');
  const [newEventName, setNewEventName] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isShared, setIsShared] = useState(photo.isShared ?? true);
  const [takenAt, setTakenAt] = useState<Date | undefined>(photo.takenAt ? new Date(photo.takenAt) : undefined);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updatePhoto = useUpdatePhoto();
  const deletePhoto = useDeletePhoto();
  const addEvent = useAddEvent();
  const { data: photoTags } = usePhotoTags(photo.id);
  const { data: eventsData } = useEvents(photo.childId);

  useEffect(() => {
    if (open) {
      setCaption(photo.caption || '');
      setIsEvent(!!photo.eventId);
      setEventMode(photo.eventId ? 'existing' : 'new');
      setEventId(photo.eventId || '');
      setNewEventName('');
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
      let resolvedEventId: string | null = null;
      if (isEvent) {
        if (eventMode === 'new' && newEventName.trim()) {
          const created = await addEvent.mutateAsync({
            childId: photo.childId,
            name: newEventName.trim(),
            date: takenAt ?? null,
          });
          resolvedEventId = created.id;
        } else if (eventMode === 'existing' && eventId) {
          resolvedEventId = eventId;
        }
      }
      await updatePhoto.mutateAsync({
        photoId: photo.id,
        caption: caption || undefined,
        eventId: resolvedEventId,
        tagIds: selectedTagIds,
        isShared,
        takenAt: takenAt ? takenAt.toISOString() : undefined,
      });
      toast.success(t('photoEdit.updated'));
      onOpenChange(false);
    } catch {
      toast.error(t('photoEdit.updateError'));
    }
  };

  const handleDelete = async () => {
    try {
      await deletePhoto.mutateAsync({ photoId: photo.id, storagePath: photo.storagePath, thumbnailPath: photo.thumbnailPath });
      toast.success(t('photoEdit.deleted'));
      onOpenChange(false);
      onDeleted?.();
    } catch {
      toast.error(t('photoEdit.deleteError'));
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
          <DialogTitle>{t('photoEdit.title')}</DialogTitle>
          <DialogDescription>{t('photoEdit.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="caption">{t('photoEdit.captionLabel')}</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t('photoEdit.captionPlaceholder')}
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('photoEdit.dateLabel')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !takenAt && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {takenAt ? format(takenAt, "PPP", { locale: dateFnsLocale }) : t('photoEdit.selectDate')}
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
          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Checkbox id="edit-is-event" checked={isEvent} onCheckedChange={(v) => setIsEvent(!!v)} />
              <Label htmlFor="edit-is-event" className="text-sm cursor-pointer">
                {t('events.isPartOfEvent')}
              </Label>
            </div>
            {isEvent && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={eventMode === 'existing' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    disabled={(eventsData || []).length === 0}
                    onClick={() => setEventMode('existing')}
                  >
                    {t('events.existingEvent')}
                  </Button>
                  <Button
                    type="button"
                    variant={eventMode === 'new' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setEventMode('new')}
                  >
                    {t('events.newEvent')}
                  </Button>
                </div>
                {eventMode === 'new' ? (
                  <Input
                    placeholder={t('events.eventNamePlaceholder')}
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                  />
                ) : (
                  <Select value={eventId} onValueChange={setEventId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('events.selectEvent')} />
                    </SelectTrigger>
                    <SelectContent>
                      {[...(eventsData || [])]
                        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((event: any) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.icon} {event.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>

          <TagSelector selectedTagIds={selectedTagIds} onToggle={toggleTag} />

          <div className="flex items-center gap-2">
            <Switch id="edit-shared" checked={isShared} onCheckedChange={setIsShared} />
            <Label htmlFor="edit-shared" className="text-sm">
              {isShared ? t('photoUpload.visibleGuests') : t('photoUpload.parentsOnly')}
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
              <p className="text-sm text-destructive flex-1">{t('photoEdit.confirmDelete')}</p>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>{t('common.cancel')}</Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deletePhoto.isPending}>
                {t('common.confirm')}
              </Button>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> {t('common.delete')}
              </Button>
              <Button onClick={handleSave} disabled={updatePhoto.isPending}>
                {t('common.save')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
