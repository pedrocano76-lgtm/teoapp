import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useUploadPhoto, useEvents, useAddEvent } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/hooks/useLocale';
import { getExifDate } from '@/lib/exif-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TagSelector } from './TagSelector';
import { CalendarIcon, AlertTriangle, Loader2, Check, X, Camera } from 'lucide-react';
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

export function PhotoUpload({ children, defaultChildId, asFab }: PhotoUploadProps) {
  const { t } = useTranslation();
  const { dateFnsLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState(defaultChildId || '');
  const [caption, setCaption] = useState('');
  const [isEvent, setIsEvent] = useState(false);
  const [eventMode, setEventMode] = useState<'new' | 'existing'>('new');
  const [newEventName, setNewEventName] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isShared, setIsShared] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [noExifFiles, setNoExifFiles] = useState<string[]>([]);
  const [manualDate, setManualDate] = useState<Date | undefined>(undefined);
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

    setFiles(validFiles);
    setNoExifFiles([]);
    setManualDate(undefined);
    setUploadProgress(Object.fromEntries(validFiles.map(f => [f.name, 'pending'])));

    const missing: string[] = [];
    for (const file of validFiles) {
      const exifDate = await getExifDate(file);
      if (!exifDate) missing.push(file.name);
    }
    if (missing.length > 0) setNoExifFiles(missing);
  };

  const handleUpload = async () => {
    if (!selectedChild || files.length === 0) return;
    setUploading(true);

    try {
      let eventIdToUse: string | undefined = undefined;
      if (isEvent) {
        if (eventMode === 'new' && newEventName.trim()) {
          const created = await addEvent.mutateAsync({
            childId: selectedChild,
            name: newEventName.trim(),
            date: null,
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
      for (let i = 0; i < files.length; i += CONCURRENCY) {
        const batch = files.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map(async (file) => {
            setUploadProgress(prev => ({ ...prev, [file.name]: 'uploading' }));
            try {
              await uploadPhoto.mutateAsync({
                file,
                childId: selectedChild,
                caption: caption || undefined,
                takenAt: noExifFiles.includes(file.name) && manualDate ? manualDate : undefined,
                eventId: eventIdToUse,
                tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
                isShared,
              });
              setUploadProgress(prev => ({ ...prev, [file.name]: 'done' }));
              const exif = await getExifDate(file);
              const d = exif || manualDate || null;
              if (d && (!earliestDate || d.getTime() < earliestDate.getTime())) {
                earliestDate = d;
              }
            } catch (error) {
              setUploadProgress(prev => ({ ...prev, [file.name]: 'error' }));
              throw error;
            }
          })
        );
        completed += results.filter(r => r.status === 'fulfilled').length;
        failed += results.filter(r => r.status === 'rejected').length;
      }

      if (isEvent && eventMode === 'new' && eventIdToUse && earliestDate) {
        const iso = (earliestDate as Date).toISOString().slice(0, 10);
        await supabaseUpdateEventDate(eventIdToUse, iso);
      }

      if (failed === 0) {
        toast({ title: t('photoUpload.uploadedTitle'), description: t('photoUpload.uploadedDesc', { count: completed }) });
      } else {
        toast({
          title: t('photoUpload.partialTitle'),
          description: t('photoUpload.partialDesc', { done: completed, failed }),
          variant: failed === files.length ? 'destructive' : 'default',
        });
      }
      setOpen(false);
      setFiles([]);
      setCaption('');
      setIsEvent(false);
      setEventMode('new');
      setNewEventName('');
      setSelectedEventId('');
      setSelectedTagIds([]);
      setIsShared(true);
      setNoExifFiles([]);
      setManualDate(undefined);
      setUploadProgress({});
    } catch (error: any) {
      toast({ title: t('photoUpload.errorTitle'), description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const completedCount = Object.values(uploadProgress).filter(status => status === 'done' || status === 'error').length;

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
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                {files.length > 0 ? t('photoUpload.filesSelected', { count: files.length }) : t('photoUpload.chooseFiles')}
              </Button>
              {files.length === 0 && (
                <Button
                  variant="default"
                  className="w-full sm:hidden gap-2"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" /> {t('photoUpload.camera')}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t('photoUpload.fileTypes')}</p>
          </div>

          {files.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {files.slice(0, 8).map((f, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                  {uploadProgress[f.name] === 'uploading' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}
                  {uploadProgress[f.name] === 'done' && (
                    <div className="absolute bottom-1.5 right-1.5 rounded-full bg-success p-1 text-success-foreground shadow-sm">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                  {uploadProgress[f.name] === 'error' && (
                    <div className="absolute bottom-1.5 right-1.5 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm">
                      <X className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              ))}
              {files.length > 8 && (
                <div className="aspect-square rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">
                  +{files.length - 8}
                </div>
              )}
            </div>
          )}

          {noExifFiles.length > 0 && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-2">
              <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {noExifFiles.length === files.length
                  ? t('photoUpload.noExifAll')
                  : t('photoUpload.noExifSome', { count: noExifFiles.length })}
              </p>
              <p className="text-xs text-muted-foreground">{t('photoUpload.noExifHint')}</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-left text-xs h-8 font-normal",
                      !manualDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                    {manualDate
                      ? format(manualDate, "d MMM yyyy", { locale: dateFnsLocale })
                      : t('photoUpload.selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={manualDate}
                    onSelect={setManualDate}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="p-3"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <Input
            placeholder={t('photoUpload.captionPlaceholder')}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />

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
                    variant={eventMode === 'new' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setEventMode('new')}
                  >
                    {t('events.newEvent')}
                  </Button>
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
                </div>
                {eventMode === 'new' ? (
                  <Input
                    placeholder={t('events.eventNamePlaceholder')}
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                  />
                ) : (
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

          <TagSelector selectedTagIds={selectedTagIds} onToggle={handleToggleTag} />

          <div className="flex items-center gap-2">
            <Switch id="is-shared" checked={isShared} onCheckedChange={setIsShared} />
            <Label htmlFor="is-shared" className="text-sm">
              {isShared ? t('photoUpload.visibleGuests') : t('photoUpload.parentsOnly')}
            </Label>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!selectedChild || files.length === 0 || uploading}
            className="w-full"
          >
            {uploading
              ? t('photoUpload.uploading', { done: completedCount, total: files.length })
              : t('photoUpload.uploadButton', { count: files.length })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
