import { useState, useRef } from 'react';
import { useUploadPhoto, useEvents } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TagSelector } from './TagSelector';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadPhoto = useUploadPhoto();
  const { toast } = useToast();
  const { data: eventsData } = useEvents(selectedChild || undefined);

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleUpload = async () => {
    if (!selectedChild || files.length === 0) return;
    setUploading(true);

    try {
      for (const file of files) {
        await uploadPhoto.mutateAsync({
          file,
          childId: selectedChild,
          caption: caption || undefined,
          eventId: selectedEventId || undefined,
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
          isShared,
        });
      }
      toast({ title: 'Uploaded!', description: `${files.length} photo${files.length > 1 ? 's' : ''} added.` });
      setOpen(false);
      setFiles([]);
      setCaption('');
      setSelectedEventId('');
      setSelectedTagIds([]);
      setIsShared(true);
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const childEvents = eventsData || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          📷 Add Photos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Upload Photos</DialogTitle>
          <DialogDescription>Upload photos from your device. The date will be extracted automatically from the photo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger>
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              {children.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              {files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : 'Choose photos'}
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

          <Input
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />

          {/* Event selector */}
          {childEvents.length > 0 && (
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Link to event (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No event</SelectItem>
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
            {uploading ? 'Uploading...' : `Upload ${files.length} photo${files.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
