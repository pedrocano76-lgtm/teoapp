import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TagSelector } from '@/components/TagSelector';
import { useUpdatePhoto, useDeletePhoto } from '@/hooks/useData';
import { useLocale } from '@/hooks/useLocale';
import { CalendarIcon, Trash2, Tag, X, CheckSquare } from 'lucide-react';
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
  const [bulkDate, setBulkDate] = useState<Date | undefined>();
  const [bulkTagIds, setBulkTagIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updatePhoto = useUpdatePhoto();
  const deletePhoto = useDeletePhoto();

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
    try {
      for (const photo of selectedPhotos) {
        await updatePhoto.mutateAsync({ photoId: photo.id, tagIds: bulkTagIds });
      }
      toast.success(t('bulk.tagsUpdated', { count: selectedPhotos.length }));
      setShowTagPicker(false);
      setBulkTagIds([]);
      onDone();
    } catch {
      toast.error(t('bulk.tagsError'));
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const photo of selectedPhotos) {
        await deletePhoto.mutateAsync({
          photoId: photo.id,
          storagePath: photo.storagePath,
          thumbnailPath: photo.thumbnailPath,
        });
      }
      toast.success(t('bulk.photosDeleted', { count: selectedPhotos.length }));
      setConfirmDelete(false);
      onDone();
    } catch {
      toast.error(t('bulk.deleteError'));
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border py-3 px-4 flex items-center gap-3 flex-wrap animate-fade-in">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <CheckSquare className="h-4 w-4 text-primary" />
        {selectedPhotos.length} {t('bulk.selected')}
      </div>

      <div className="flex items-center gap-2 flex-wrap flex-1">
        <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" />
              {t('bulk.changeDate')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
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
            <Button variant="outline" size="sm" className="gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              {t('bulk.changeTags')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-3">
              <TagSelector
                selectedTagIds={bulkTagIds}
                onToggle={(id) => setBulkTagIds(prev =>
                  prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
                )}
              />
              <Button size="sm" className="w-full" onClick={handleBulkTags} disabled={updatePhoto.isPending}>
                {t('bulk.applyTo', { count: selectedPhotos.length })}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-destructive">{t('bulk.deleteConfirm', { count: selectedPhotos.length })}</span>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>{t('common.cancel')}</Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={deletePhoto.isPending}>
              {t('common.confirm')}
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-3.5 w-3.5" />
            {t('bulk.delete')}
          </Button>
        )}
      </div>

      <Button variant="ghost" size="sm" onClick={onClear} className="gap-1">
        <X className="h-3.5 w-3.5" />
        {t('common.cancel')}
      </Button>
    </div>
  );
}
