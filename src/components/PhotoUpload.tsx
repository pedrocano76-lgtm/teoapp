import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useUploadPhoto, useEvents, useAddEvent } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/hooks/useLocale';
import { resolvePhotoDate, type PhotoDateSource } from '@/lib/exif-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { TagSelector } from './TagSelector';
import { AlertTriangle, Loader2, Check, X, Camera, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

async function supabaseUpdateEventDate(eventId: string, dateIso: string) {
  await supabase.from('events').update({ date: dateIso }).eq('id', eventId);
}

interface PhotoUploadProps {
  children: { id: string; name: string }[];
  defaultChildId?: string;
  asFab?: boolean;
}

interface UploadItem {
  id: string;
  file: File;
  previewUrl: string;
  exifDate: Date | null;
  inferredDate: Date | null;
  dateSource: PhotoDateSource;
  manualDate: Date | null;
}

function toDateInputValue(d: Date | null): string {
  if (!d) return '';
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function fromDateInputValue(v: string): Date | null {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function PhotoUpload({ children, defaultChildId, asFab }: PhotoUploadProps) {
  const { t } = useTranslation();
  const { dateFnsLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState(defaultChildId || '');
  const [caption, setCaption] = useState('');
  const [isEvent, setIsEvent] = useState(false);
  const [eventMode, setEventMode] = useState<'new' | 'existing' | null>(null);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState<string>('');
  const [newEventDateTouched, setNewEventDateTouched] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [bulkDateValue, setBulkDateValue] = useState<string>('');
  const [isShared, setIsShared] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, 'pending' | 'uploading' | 'done' | 'error'>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadPhoto = useUploadPhoto();
  const addEvent = useAddEvent();
  const { toast } = useToast();
  const { data: eventsData } = useEvents(selectedChild || undefined);

  useEffect(() => {
    if (children.length === 1 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  // Cleanup preview URLs on unmount/clear
  useEffect(() => {
    return () => {
      items.forEach(it => URL.revokeObjectURL(it.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleFilesSelected = async (selectedFiles: File[]) => {
    const MAX_FILE_SIZE_MB = 50;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];

    const validFiles: File[] = [];
    const rejected: { name: string; reason: string }[] = [];

    for (const file of selectedFiles) {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        rejected.push({ name: file.name, reason: t('photoUpload.reasonSize') });
      } else if (!ALLOWED_TYPES.includes(file.type)) {
        rejected.push({ name: file.name, reason: t('photoUpload.reasonType') });
      } else {
        validFiles.push(file);
      }
    }

    if (rejected.length > 0) {
      const list = rejected.map(r => `'${r.name}' (${r.reason})`).join(', ');
      toast({
        title: t('photoUpload.ignoredTitle'),
        description: t('photoUpload.ignoredDesc', { count: rejected.length, list }),
      });
    }

    if (validFiles.length === 0) return;

    // Revoke previous URLs
    items.forEach(it => URL.revokeObjectURL(it.previewUrl));

    const newItems: UploadItem[] = await Promise.all(
      validFiles.map(async (file) => {
        const resolved = await resolvePhotoDate(file);
        const isExif = resolved.source === 'exif';
        return {
          id: `${file.name}_${file.size}_${Math.random().toString(36).slice(2, 8)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          exifDate: isExif ? resolved.date : null,
          inferredDate: isExif ? null : resolved.date,
          dateSource: resolved.source,
          manualDate: null,
        };
      })
    );

    setItems(newItems);
    setBulkDateValue('');
    setUploadProgress(Object.fromEntries(newItems.map(it => [it.id, 'pending'])));
  };

  const setManualDateFor = (id: string, date: Date | null) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, manualDate: date } : it)));
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const target = prev.find(it => it.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(it => it.id !== id);
    });
    setUploadProgress(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const removeAllUnknown = () => {
    setItems(prev => {
      const remove = prev.filter(it => !it.exifDate);
      remove.forEach(it => URL.revokeObjectURL(it.previewUrl));
      return prev.filter(it => it.exifDate);
    });
  };

  const applyBulkDate = (v: string) => {
    setBulkDateValue(v);
    const d = fromDateInputValue(v);
    if (!d) return;
    setItems(prev => prev.map(it => (it.exifDate ? it : { ...it, manualDate: d })));
  };

  const effectiveDate = (it: UploadItem): Date | null =>
    it.exifDate || it.manualDate || it.inferredDate;

  const readyItems = items.filter(it => it.exifDate);
  const uncertainItems = items.filter(it => !it.exifDate);
  const uploadableItems = items.filter(it => effectiveDate(it) !== null);

  const oldestSelectedDate = useMemo(() => {
    let earliest: Date | null = null;
    for (const it of uploadableItems) {
      const d = effectiveDate(it);
      if (d && (!earliest || d.getTime() < earliest.getTime())) earliest = d;
    }
    return earliest;
  }, [uploadableItems]);

  useEffect(() => {
    if (isEvent && eventMode === 'new' && !newEventDateTouched && oldestSelectedDate) {
      setNewEventDate(toDateInputValue(oldestSelectedDate));
    }
  }, [isEvent, eventMode, oldestSelectedDate, newEventDateTouched]);

  const handleUpload = async () => {
    if (!selectedChild || uploadableItems.length === 0) return;
    setUploading(true);

    try {
      let eventIdToUse: string | undefined = undefined;
      const newEventDateObj = newEventDate ? fromDateInputValue(newEventDate) : null;
      const fallbackEventDate = newEventDateObj || oldestSelectedDate;
      if (isEvent) {
        if (eventMode === 'new' && newEventName.trim()) {
          const created = await addEvent.mutateAsync({
            childId: selectedChild,
            name: newEventName.trim(),
            date: fallbackEventDate,
          });
          eventIdToUse = created.id;
        } else if (eventMode === 'existing' && selectedEventId) {
          eventIdToUse = selectedEventId;
        }
      }

      const CONCURRENCY = 3;
      let completed = 0;
      let failed = 0;
      let earliestDate: Date | null = null;
      const uploadedPhotoIds: string[] = [];
      for (let i = 0; i < uploadableItems.length; i += CONCURRENCY) {
        const batch = uploadableItems.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map(async (it) => {
            setUploadProgress(prev => ({ ...prev, [it.id]: 'uploading' }));
            try {
              const dateToUse = effectiveDate(it)!;
              const created = await uploadPhoto.mutateAsync({
                file: it.file,
                childId: selectedChild,
                caption: caption || undefined,
                takenAt: dateToUse,
                eventId: eventIdToUse,
                tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
                isShared,
              });
              if (created?.id) uploadedPhotoIds.push(created.id);
              setUploadProgress(prev => ({ ...prev, [it.id]: 'done' }));
              if (!earliestDate || dateToUse.getTime() < earliestDate.getTime()) {
                earliestDate = dateToUse;
              }
            } catch (error) {
              setUploadProgress(prev => ({ ...prev, [it.id]: 'error' }));
              throw error;
            }
          })
        );
        completed += results.filter(r => r.status === 'fulfilled').length;
        failed += results.filter(r => r.status === 'rejected').length;
      }

      if (isEvent && eventMode === 'new' && eventIdToUse && !newEventDateObj && earliestDate) {
        const iso = (earliestDate as Date).toISOString().slice(0, 10);
        await supabaseUpdateEventDate(eventIdToUse, iso);
      }

      // Fire-and-forget: notify other family members
      if (uploadedPhotoIds.length > 0) {
        supabase.functions
          .invoke('notify-photo-upload', {
            body: { childId: selectedChild, photoIds: uploadedPhotoIds },
          })
          .catch((e) => console.warn('notify-photo-upload failed', e));
      }

      if (failed === 0) {
        toast({ title: t('photoUpload.uploadedTitle'), description: t('photoUpload.uploadedDesc', { count: completed }) });
      } else {
        toast({
          title: t('photoUpload.partialTitle'),
          description: t('photoUpload.partialDesc', { done: completed, failed }),
          variant: failed === uploadableItems.length ? 'destructive' : 'default',
        });
      }
      setOpen(false);
      items.forEach(it => URL.revokeObjectURL(it.previewUrl));
      setItems([]);
      setCaption('');
      setIsEvent(false);
      setEventMode('new');
      setNewEventName('');
      setNewEventDate('');
      setNewEventDateTouched(false);
      setSelectedEventId('');
      setSelectedTagIds([]);
      setIsShared(true);
      setBulkDateValue('');
      setUploadProgress({});
    } catch (error: any) {
      toast({ title: t('photoUpload.errorTitle'), description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const completedCount = Object.values(uploadProgress).filter(status => status === 'done' || status === 'error').length;

  const renderThumb = (it: UploadItem, opts: { showWarning?: boolean; className?: string } = {}) => {
    const status = uploadProgress[it.id];
    return (
      <div key={it.id} className={cn("relative rounded-lg overflow-hidden bg-muted", opts.className || "h-20 w-20 shrink-0")}>
        <img src={it.previewUrl} alt="" className="w-full h-full object-cover" />
        {!uploading && (
          <button
            type="button"
            onClick={() => removeItem(it.id)}
            aria-label={t('common.remove', 'Remove')}
            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/90 text-foreground shadow flex items-center justify-center hover:bg-background"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {opts.showWarning && (
          <div className="absolute top-1 left-1 rounded-full bg-yellow-500 text-white p-0.5 shadow">
            <AlertTriangle className="h-3 w-3" />
          </div>
        )}
        {status === 'uploading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
        {status === 'done' && (
          <div className="absolute bottom-1 right-1 rounded-full bg-success p-0.5 text-success-foreground shadow-sm">
            <Check className="h-3 w-3" />
          </div>
        )}
        {status === 'error' && (
          <div className="absolute bottom-1 right-1 rounded-full bg-destructive p-0.5 text-destructive-foreground shadow-sm">
            <X className="h-3 w-3" />
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {asFab ? (
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg [&_svg]:size-6"
            aria-label={t('photoUpload.ariaAdd')}
          >
            <Camera />
          </Button>
        ) : (
          <Button className="gap-2">
            <Camera className="h-4 w-4" /> {t('photoUpload.trigger')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{t('photoUpload.title')}</DialogTitle>
          <DialogDescription>{t('photoUpload.description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {children.length > 1 && (
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger>
                <SelectValue placeholder={t('photoUpload.selectChild')} />
              </SelectTrigger>
              <SelectContent>
                {children.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelected(Array.from(e.target.files || []))}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFilesSelected(Array.from(e.target.files || []))}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="w-full border-2 border-[#D4793A] text-[#D4793A] bg-transparent hover:bg-[#D4793A] hover:text-white"
                onClick={() => fileInputRef.current?.click()}
              >
                {items.length > 0 ? t('photoUpload.filesSelected', { count: items.length }) : t('photoUpload.chooseFiles')}
              </Button>
              {items.length === 0 && (
                <Button
                  variant="outline"
                  className="w-full sm:hidden gap-2 border-2 border-[#D4793A] text-[#D4793A] bg-transparent hover:bg-[#D4793A] hover:text-white"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" /> {t('photoUpload.camera')}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('photoUpload.fileTypes')}</p>
          </div>

          {readyItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-foreground">
                  {t('photoUpload.groupReady')} <span className="text-muted-foreground font-normal">({readyItems.length})</span>
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-[40vh] overflow-y-auto">
                {readyItems.map(it => (
                  <div key={it.id} className="flex flex-col items-center gap-1">
                    {renderThumb(it, { className: 'aspect-square w-full' })}
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      {format(it.exifDate!, 'd MMM yyyy', { locale: dateFnsLocale })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uncertainItems.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Fechas a confirmar <span className="font-normal opacity-80">({uncertainItems.length})</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                No encontramos la fecha original de estas fotos. ¿Es correcta?
              </p>

              {/* Bulk actions */}
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 p-2">
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <label className="text-xs text-muted-foreground shrink-0">
                  {t('photoUpload.setSameDateForAll')}
                </label>
                <input
                  type="date"
                  value={bulkDateValue}
                  max={toDateInputValue(new Date())}
                  onChange={(e) => applyBulkDate(e.target.value)}
                  className="h-8 flex-1 min-w-[140px] rounded-md border border-input bg-background px-2 text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:text-destructive"
                  onClick={removeAllUnknown}
                >
                  {t('photoUpload.removeAllWithoutDate')}
                </Button>
              </div>

              {/* Per-photo */}
              <div className="space-y-2">
                {uncertainItems.map(it => {
                  const shown = it.manualDate || it.inferredDate;
                  const sourceLabel =
                    it.dateSource === 'filename'
                      ? 'Fecha del nombre del archivo (WhatsApp)'
                      : 'Fecha de modificación del archivo';
                  return (
                    <div key={it.id} className="flex items-start gap-2">
                      {renderThumb(it, { showWarning: true })}
                      <div className="flex-1 min-w-0 space-y-1">
                        <input
                          type="date"
                          value={toDateInputValue(shown)}
                          max={toDateInputValue(new Date())}
                          onChange={(e) => setManualDateFor(it.id, fromDateInputValue(e.target.value))}
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                          placeholder={t('photoUpload.selectDate')}
                        />
                        <p className="text-[10px] text-muted-foreground">{sourceLabel}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {items.length > 0 && (
            <Input
              placeholder={t('photoUpload.captionPlaceholder')}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          )}

          {items.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Checkbox id="is-event" checked={isEvent} onCheckedChange={(v) => setIsEvent(!!v)} />
                <Label htmlFor="is-event" className="text-sm cursor-pointer">
                  {t('events.isPartOfEvent')}
                </Label>
              </div>
              {isEvent && (
                <div className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1 border-2",
                        eventMode === 'new'
                          ? "bg-[#D4793A] text-white border-[#D4793A]"
                          : "text-[#D4793A] border-[#D4793A]"
                      )}
                      onClick={() => setEventMode('new')}
                    >
                      {t('events.newEvent')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1 border-2",
                        eventMode === 'existing'
                          ? "bg-[#D4793A] text-white border-[#D4793A]"
                          : "text-[#D4793A] border-[#D4793A]"
                      )}
                      disabled={(eventsData || []).length === 0}
                      onClick={() => setEventMode('existing')}
                    >
                      {t('events.existingEvent')}
                    </Button>
                  </div>
                  {eventMode === 'new' && (
                    <div className="space-y-2">
                      <Input
                        placeholder={t('events.eventNamePlaceholder')}
                        value={newEventName}
                        onChange={(e) => setNewEventName(e.target.value)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="new-event-date" className="text-xs text-muted-foreground">
                          {t('events.eventDateLabel', 'Fecha del evento')}
                        </Label>
                        <input
                          id="new-event-date"
                          type="date"
                          value={newEventDate}
                          max={toDateInputValue(new Date())}
                          onChange={(e) => { setNewEventDate(e.target.value); setNewEventDateTouched(true); }}
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                        />
                      </div>
                    </div>
                  )}
                  {eventMode === 'existing' && (
                    <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('events.selectEvent')} />
                      </SelectTrigger>
                      <SelectContent>
                        {[...(eventsData || [])]
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.icon} {e.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          )}

          {items.length > 0 && (
            <TagSelector selectedTagIds={selectedTagIds} onToggle={handleToggleTag} />
          )}

          {items.length > 0 && (
            <div className="flex items-center gap-2">
              <Switch id="is-shared" checked={isShared} onCheckedChange={setIsShared} />
              <Label htmlFor="is-shared" className="text-sm">
                {isShared ? t('photoUpload.visibleGuests') : t('photoUpload.parentsOnly')}
              </Label>
            </div>
          )}


          <Button
            onClick={handleUpload}
            disabled={!selectedChild || uploadableItems.length === 0 || uploading}
            className="w-full"
          >
            {uploading
              ? t('photoUpload.uploading', { done: completedCount, total: uploadableItems.length })
              : t('photoUpload.uploadButton', { count: uploadableItems.length })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
