import { useState } from 'react';
import { useCloudConnections, useAddCloudConnection, useDeleteCloudConnection, useSyncOneDrive } from '@/hooks/useCloudSync';
import { useChildren } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Cloud, FolderOpen, RefreshCw, Trash2, Loader2, CheckCircle2, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type ScanPhase = 'idle' | 'fetching' | 'analyzing' | 'done';

interface ScanProgress {
  phase: ScanPhase;
  message: string;
  result?: { imported: number; total_scanned: number };
}

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
  const [scanProgress, setScanProgress] = useState<Record<string, ScanProgress>>({});

  const children = childrenData || [];

  const handleBrowseFolders = async () => {
    setBrowsing(true);
    try {
      const result = await syncOneDrive.mutateAsync({ action: 'list-folders' });
      setFolders(result.folders || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setBrowsing(false);
    }
  };

  const handleScan = async (connectionId: string, folderPath: string) => {
    if (!selectedChildId) {
      toast({ title: 'Selecciona un hijo/a', description: 'Necesitas seleccionar para quién buscar fotos.', variant: 'destructive' });
      return;
    }

    setScanProgress(prev => ({
      ...prev,
      [connectionId]: { phase: 'fetching', message: 'Buscando fotos en OneDrive...' },
    }));

    try {
      // Get reference photos
      const { data: existingPhotos } = await supabase
        .from('photos')
        .select('storage_path')
        .eq('child_id', selectedChildId)
        .limit(3);

      let referenceUrls: string[] = [];
      if (existingPhotos && existingPhotos.length > 0) {
        setScanProgress(prev => ({
          ...prev,
          [connectionId]: { phase: 'analyzing', message: 'Analizando fotos con IA...' },
        }));
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

      setScanProgress(prev => ({
        ...prev,
        [connectionId]: {
          phase: 'done',
          message: result.imported > 0
            ? `¡${result.imported} foto${result.imported > 1 ? 's' : ''} encontrada${result.imported > 1 ? 's' : ''}!`
            : 'No se encontraron fotos nuevas',
          result,
        },
      }));

      if (result.imported > 0) {
        toast({
          title: '¡Fotos encontradas!',
          description: `${result.imported} foto${result.imported > 1 ? 's' : ''} lista${result.imported > 1 ? 's' : ''} para revisar.`,
        });
      }

      // Clear progress after 5 seconds
      setTimeout(() => {
        setScanProgress(prev => {
          const next = { ...prev };
          delete next[connectionId];
          return next;
        });
      }, 5000);
    } catch (e: any) {
      setScanProgress(prev => ({
        ...prev,
        [connectionId]: { phase: 'idle', message: '' },
      }));
      toast({ title: 'Error al escanear', description: e.message, variant: 'destructive' });
    }
  };

  const handleAddFolder = async () => {
    if (!selectedFolder) return;
    try {
      const conn = await addConnection.mutateAsync({
        provider: 'onedrive',
        folder_path: `/me/drive/items/${selectedFolder.id}`,
        folder_name: selectedFolder.name,
      });
      toast({ title: '¡Carpeta vinculada!', description: `"${selectedFolder.name}" conectada.` });
      setSelectedFolder(null);
      setFolders([]);

      // Auto-scan if child selected
      if (selectedChildId && conn?.id) {
        setTimeout(() => handleScan(conn.id, `/me/drive/items/${selectedFolder.id}`), 500);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
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
              <SelectValue placeholder="Seleccionar hijo/a para escanear" />
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
            {(connections || []).map((conn: any) => {
              const progress = scanProgress[conn.id];
              const isScanning = progress && progress.phase !== 'idle' && progress.phase !== 'done';

              return (
                <Card key={conn.id} className="bg-muted/50">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium flex items-center gap-1.5 truncate">
                          <FolderOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                          {conn.folder_name || 'Carpeta'}
                        </p>
                        {conn.last_synced_at && !progress && (
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
                          disabled={!!isScanning || !selectedChildId}
                          onClick={() => handleScan(conn.id, conn.folder_path)}
                          title={!selectedChildId ? 'Selecciona un hijo/a primero' : 'Escanear carpeta'}
                        >
                          {isScanning ? (
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
                    </div>

                    {/* Progress indicator */}
                    {progress && progress.phase !== 'idle' && (
                      <div className="space-y-1.5">
                        {progress.phase === 'done' ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            {progress.result && progress.result.imported > 0 ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                <span className="text-green-600 dark:text-green-400 font-medium">{progress.message}</span>
                              </>
                            ) : (
                              <>
                                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">{progress.message}</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <>
                            <Progress value={progress.phase === 'fetching' ? 30 : 70} className="h-1.5" />
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              {progress.message}
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
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
