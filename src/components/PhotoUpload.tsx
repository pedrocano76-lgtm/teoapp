import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useUploadPhoto, useEvents } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import { getExifDate } from '@/lib/exif-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TagSelector } from './TagSelector';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoUploadProps {
  children: { id: string; name: string }[];
  defaultChildId?: string;
}

export function PhotoUpload({ children, defaultChildId }: PhotoUploadProps) {
  const [open, setOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState(defaultChildId || '');
  const [caption, setCaption] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isShared, setIsShared] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [noExifFiles, setNoExifFiles] = useState<string[]>([]);
  const [manualDate, setManualDate] = useState<Date | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadPhoto = useUploadPhoto();
  const { toast } = useToast();
  const { data: eventsData } = useEvents(selectedChild || undefined);

  // Auto-select if only one child
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
    setFiles(selectedFiles);
    setNoExifFiles([]);
    setManualDate(undefined);

    // Check EXIF dates
    const missing: string[] = [];
    for (const file of selectedFiles) {
      const exifDate = await getExifDate(file);
      if (!exifDate) {
        missing.push(file.name);
      }
    }
    if (missing.length > 0) {
      setNoExifFiles(missing);
    }
  };

  const handleUpload = async () => {
    if (!selectedChild || files.length === 0) return;
    setUploading(true);

    try {
      // Upload in parallel batches of 3 to balance speed and bandwidth
      const CONCURRENCY = 3;
      let completed = 0;
      let failed = 0;
      for (let i = 0; i < files.length; i += CONCURRENCY) {
        const batch = files.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map(file =>
            uploadPhoto.mutateAsync({
              file,
              childId: selectedChild,
              caption: caption || undefined,
              takenAt: noExifFiles.includes(file.name) && manualDate ? manualDate : undefined,
              eventId: selectedEventId || undefined,
              tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
              isShared,
            })
          )
        );
        completed += results.filter(r => r.status === 'fulfilled').length;
        failed += results.filter(r => r.status === 'rejected').length;
      }

      if (failed === 0) {
        toast({ title: '¡Subidas!', description: `${completed} foto${completed > 1 ? 's' : ''} añadida${completed > 1 ? 's' : ''}.` });
      } else {
        toast({
          title: 'Subida parcial',
          description: `${completed} subidas, ${failed} fallidas.`,
          variant: failed === files.length ? 'destructive' : 'default',
        });
      }
      setOpen(false);
      setFiles([]);
      setCaption('');
      setSelectedEventId('');
      setSelectedTagIds([]);
      setIsShared(true);
      setNoExifFiles([]);
      setManualDate(undefined);
    } catch (error: any) {
      toast({ title: 'Error al subir', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const childEvents = eventsData || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          📷 Añadir fotos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Subir fotos</DialogTitle>
          <DialogDescription>Sube fotos desde tu dispositivo. La fecha se extraerá automáticamente de la foto.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {children.length > 1 && (
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar hijo/a" />
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
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              {files.length > 0 ? `${files.length} archivo${files.length > 1 ? 's' : ''} seleccionado${files.length > 1 ? 's' : ''}` : 'Elegir fotos'}
            </Button>
          </div>

          {files.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {files.slice(0, 8).map((f, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={URL.createObjectURL(f)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {files.length > 8 && (
                <div className="aspect-square rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">
                  +{files.length - 8}
                </div>
              )}
            </div>
          )}

          {/* Warning when EXIF date not found */}
          {noExifFiles.length > 0 && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-2">
              <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {noExifFiles.length === files.length
                  ? 'No se pudo extraer la fecha de ninguna foto.'
                  : `${noExifFiles.length} foto${noExifFiles.length > 1 ? 's' : ''} sin fecha detectada.`}
              </p>
              <p className="text-xs text-muted-foreground">Indica cuándo fueron tomadas:</p>
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
                      ? format(manualDate, "d MMM yyyy", { locale: es })
                      : "Seleccionar fecha..."}
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
            placeholder="Comentario (opcional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />

          {/* Event selector */}
          {childEvents.length > 0 && (
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Vincular a evento (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin evento</SelectItem>
                {childEvents.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.icon} {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Tag selector */}
          <TagSelector selectedTagIds={selectedTagIds} onToggle={handleToggleTag} />

          <div className="flex items-center gap-2">
            <Switch id="is-shared" checked={isShared} onCheckedChange={setIsShared} />
            <Label htmlFor="is-shared" className="text-sm">
              {isShared ? 'Visible para invitados' : 'Solo padres'}
            </Label>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!selectedChild || files.length === 0 || uploading}
            className="w-full"
          >
            {uploading ? 'Subiendo...' : `Subir ${files.length} foto${files.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
