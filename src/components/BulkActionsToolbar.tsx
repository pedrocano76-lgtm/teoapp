import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TagSelector } from '@/components/TagSelector';
import { BulkAddToEventDialog } from '@/components/BulkAddToEventDialog';
import { useUpdatePhoto, useDeletePhoto, useBulkAddTagsToPhotos } from '@/hooks/useData';
import { useLocale } from '@/hooks/useLocale';
import { CalendarIcon, Trash2, Tag, X, CheckSquare, FolderPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Photo } from '@/lib/types';

interface BulkActionsToolbarProps {
  selectedPhotos: Photo[];
  onClear: () => void;
  onDone: () => void;
}

export function BulkActionsToolbar({ selectedPhotos, onClear, onDone }: BulkActionsToolbarProps) {
  const { t } = useTranslation();
  const { dateFnsLocale } = useLocale();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [bulkDate, setBulkDate] = useState<Date | undefined>();
  const [bulkTagIds, setBulkTagIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updatePhoto = useUpdatePhoto();
  const deletePhoto = useDeletePhoto();
  const bulkAddTags = useBulkAddTagsToPhotos();

  const handleBulkDate = async () => {
    if (!bulkDate) return;
    try {
      for (const photo of selectedPhotos) {
        await updatePhoto.mutateAsync({ photoId: photo.id, takenAt: bulkDate.toISOString() });
      }
      toast.success(t('bulk.dateUpdated', { count: selectedPhotos.length }));
      setShowDatePicker(false);
      setBulkDate(undefined);
      onDone();
    } catch {
      toast.error(t('bulk.dateError'));
    }
  };

  const handleBulkTags = async () => {
    if (bulkTagIds.length === 0) {
      toast.error(t('bulk.tagsEmpty', { defaultValue: 'Selecciona al menos un tag' }));
      return;
    }
    try {
      await bulkAddTags.mutateAsync({
        photoIds: selectedPhotos.map(p => p.id),
        tagIds: bulkTagIds,
      });
      toast.success(
        t('bulk.tagAdded', { count: selectedPhotos.length, defaultValue: 'Tag añadido a {{count}} fotos' })
      );
      setShowTagPicker(false);
      setBulkTagIds([]);
      onDone();
    } catch (err: any) {
      toast.error(`${t('bulk.tagsError', { defaultValue: 'No se pudieron añadir los tags' })}: ${err?.message ?? ''}`);
    }
  };

  const handleBulkDelete = async () => {
    const failures: { id: string; error: any }[] = [];
    for (const photo of selectedPhotos) {
      try {
        await deletePhoto.mutateAsync({
          photoId: photo.id,
          storagePath: photo.storagePath,
          thumbnailPath: photo.thumbnailPath,
        });
      } catch (err: any) {
        failures.push({ id: photo.id, error: err });
      }
    }
    if (failures.length === 0) {
      toast.success(t('bulk.photosDeleted', { count: selectedPhotos.length }));
      setConfirmDelete(false);
      onDone();
    } else {
      const firstMsg = failures[0].error?.message || String(failures[0].error);
      toast.error(`${t('bulk.deleteError')}: ${failures.length}/${selectedPhotos.length} — ${firstMsg}`);
      setConfirmDelete(false);
      if (failures.length < selectedPhotos.length) onDone();
    }
  };

  return (
    <>
      <div
        className="fixed left-1/2 -translate-x-1/2 bottom-4 z-[60] animate-fade-in pointer-events-auto max-w-[calc(100vw-1rem)]"
        role="toolbar"
        aria-label={t('bulk.selected')}
      >
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/95 backdrop-blur-md shadow-lg shadow-black/10 px-2 py-1.5 pl-4 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground shrink-0">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span>{selectedPhotos.length}</span>
            <span className="hidden sm:inline text-muted-foreground">{t('bulk.selected')}</span>
          </div>

          <div className="h-5 w-px bg-border/60 shrink-0" />

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-full h-8"
              onClick={() => setShowEventDialog(true)}
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('bulk.addToEvent', { defaultValue: 'Añadir a evento' })}</span>
            </Button>

            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 rounded-full h-8">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('bulk.changeDate')}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center" side="top">
                <div className="p-3 space-y-3">
                  <Calendar
                    mode="single"
                    selected={bulkDate}
                    onSelect={setBulkDate}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                  {bulkDate && (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-sm text-muted-foreground">
                        {format(bulkDate, "PPP", { locale: dateFnsLocale })}
                      </span>
                      <Button size="sm" onClick={handleBulkDate} disabled={updatePhoto.isPending}>
                        {t('common.apply')}
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={showTagPicker} onOpenChange={setShowTagPicker}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 rounded-full h-8">
                  <Tag className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('bulk.changeTags')}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="center" side="top">
                <div className="space-y-3">
                  <TagSelector
                    selectedTagIds={bulkTagIds}
                    onToggle={(id) => setBulkTagIds(prev =>
                      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
                    )}
                  />
                  <Button size="sm" className="w-full" onClick={handleBulkTags} disabled={bulkAddTags.isPending || bulkTagIds.length === 0}>
                    {t('bulk.applyTo', { count: selectedPhotos.length })}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {confirmDelete ? (
              <div className="flex items-center gap-1 pl-1">
                <span className="text-xs text-destructive hidden md:inline">
                  {t('bulk.deleteConfirm', { count: selectedPhotos.length })}
                </span>
                <Button variant="ghost" size="sm" className="rounded-full h-8" onClick={() => setConfirmDelete(false)}>
                  {t('common.cancel')}
                </Button>
                <Button variant="destructive" size="sm" className="rounded-full h-8" onClick={handleBulkDelete} disabled={deletePhoto.isPending}>
                  {t('common.confirm')}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-full h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('bulk.delete')}</span>
              </Button>
            )}
          </div>

          <div className="h-5 w-px bg-border/60 shrink-0" />

          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            className="rounded-full h-8 w-8 shrink-0"
            aria-label={t('common.cancel')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <BulkAddToEventDialog
        open={showEventDialog}
        onOpenChange={setShowEventDialog}
        selectedPhotos={selectedPhotos}
        onDone={onDone}
      />
    </>
  );
}
