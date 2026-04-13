import { useState, useRef } from 'react';
import { useUploadPhoto } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PhotoUploadProps {
  children: { id: string; name: string }[];
  defaultChildId?: string;
}

export function PhotoUpload({ children, defaultChildId }: PhotoUploadProps) {
  const [open, setOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState(defaultChildId || '');
  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadPhoto = useUploadPhoto();
  const { toast } = useToast();

  const handleUpload = async () => {
    if (!selectedChild || files.length === 0) return;
    setUploading(true);

    try {
      for (const file of files) {
        await uploadPhoto.mutateAsync({
          file,
          childId: selectedChild,
          caption: caption || undefined,
        });
      }
      toast({ title: 'Uploaded!', description: `${files.length} photo${files.length > 1 ? 's' : ''} added.` });
      setOpen(false);
      setFiles([]);
      setCaption('');
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          📷 Add Photos
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Upload Photos</DialogTitle>
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
