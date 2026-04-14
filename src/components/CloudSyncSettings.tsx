import { useState } from 'react';
import { useCloudConnections, useAddCloudConnection, useDeleteCloudConnection, useSyncOneDrive } from '@/hooks/useCloudSync';
import { useChildren } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Cloud, FolderOpen, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function CloudSyncSettings() {
  const { data: connections, isLoading } = useCloudConnections();
  const { data: childrenData } = useChildren();
  const addConnection = useAddCloudConnection();
  const deleteConnection = useDeleteCloudConnection();
  const syncOneDrive = useSyncOneDrive();
  const { toast } = useToast();

  const [browsing, setBrowsing] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<any>(null);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [scanning, setScanning] = useState<string | null>(null);

  const children = childrenData || [];

  const handleBrowseFolders = async () => {
    setBrowsing(true);
    try {
      const result = await syncOneDrive.mutateAsync({
        action: 'list-folders',
      });
      setFolders(result.folders || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setBrowsing(false);
    }
  };

  const handleAddFolder = async () => {
    if (!selectedFolder) return;
    try {
      await addConnection.mutateAsync({
        provider: 'onedrive',
        folder_path: `/me/drive/items/${selectedFolder.id}`,
        folder_name: selectedFolder.name,
      });
      toast({ title: '¡Carpeta vinculada!', description: `Se ha vinculado "${selectedFolder.name}" de OneDrive.` });
      setSelectedFolder(null);
      setFolders([]);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleScan = async (connectionId: string, folderPath: string) => {
    if (!selectedChildId) {
      toast({ title: 'Selecciona un hijo/a', description: 'Necesitas seleccionar para quién buscar fotos.', variant: 'destructive' });
      return;
    }

    setScanning(connectionId);
    try {
      const { data: existingPhotos } = await supabase
        .from('photos')
        .select('storage_path')
        .eq('child_id', selectedChildId)
        .limit(3);

      let referenceUrls: string[] = [];
      if (existingPhotos && existingPhotos.length > 0) {
        const paths = existingPhotos.map(p => p.storage_path);
        const { data: signed } = await supabase.storage
          .from('photos')
          .createSignedUrls(paths, 3600);
        if (signed) {
          referenceUrls = signed.filter(s => s.signedUrl).map(s => s.signedUrl);
        }
      }

      const result = await syncOneDrive.mutateAsync({
        action: 'scan',
        connectionId,
        childId: selectedChildId,
        folderPath,
        referencePhotoUrls: referenceUrls,
      });

      if (result.imported > 0) {
        toast({
          title: '¡Fotos encontradas!',
          description: `Se encontraron ${result.imported} fotos candidatas. Revísalas en la sección de importaciones.`,
        });
      } else {
        toast({ title: 'Sin novedades', description: result.message || 'No se encontraron fotos nuevas.' });
      }
    } catch (e: any) {
      toast({ title: 'Error al escanear', description: e.message, variant: 'destructive' });
    } finally {
      setScanning(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteConnection.mutateAsync(id);
      toast({ title: 'Carpeta desvinculada' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Cloud className="h-3.5 w-3.5" /> OneDrive
        </h3>

        {children.length > 0 && (
          <Select value={selectedChildId} onValueChange={setSelectedChildId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Seleccionar hijo/a" />
            </SelectTrigger>
            <SelectContent>
              {children.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Cargando...</p>
        ) : (connections || []).length > 0 ? (
          <div className="space-y-2">
            {(connections || []).map((conn: any) => (
              <Card key={conn.id} className="bg-muted/50">
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium flex items-center gap-1.5 truncate">
                      <FolderOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                      {conn.folder_name || 'Carpeta'}
                    </p>
                    {conn.last_synced_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Último escaneo: {new Date(conn.last_synced_at).toLocaleDateString('es-ES')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={scanning === conn.id || !selectedChildId}
                      onClick={() => handleScan(conn.id, conn.folder_path)}
                    >
                      {scanning === conn.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(conn.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {folders.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Selecciona una carpeta de OneDrive:</p>
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-md border p-2">
              {folders.map((f: any) => (
                <button
                  key={f.id}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${
                    selectedFolder?.id === f.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedFolder(f)}
                >
                  <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { setFolders([]); setSelectedFolder(null); }}>
                Cancelar
              </Button>
              <Button size="sm" className="flex-1" disabled={!selectedFolder} onClick={handleAddFolder}>
                Vincular
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            disabled={browsing}
            onClick={handleBrowseFolders}
          >
            {browsing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FolderOpen className="h-3.5 w-3.5" />
            )}
            Vincular carpeta
          </Button>
        )}
      </div>
    </div>
  );
}
