import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCloudConnections, useAddCloudConnection, useDeleteCloudConnection, useSyncOneDrive } from '@/hooks/useCloudSync';
import { useChildren } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Cloud, FolderOpen, RefreshCw, Trash2, Loader2, CheckCircle2, ImageIcon, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ScanPhase = 'idle' | 'indexing' | 'analyzing' | 'done';

interface ScanProgress {
  phase: ScanPhase;
  message: string;
  progressPercent?: number;
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
  const [sinceDate, setSinceDate] = useState<Date | undefined>(undefined);
  const [scanProgress, setScanProgress] = useState<Record<string, ScanProgress>>({});

  const children = childrenData || [];

  // Set default sinceDate to selected child's birth date
  useEffect(() => {
    if (selectedChildId) {
      const child = children.find((c: any) => c.id === selectedChildId);
      if (child?.birth_date) {
        setSinceDate(new Date(child.birth_date));
      }
    }
  }, [selectedChildId, children]);

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
      [connectionId]: { phase: 'indexing', message: 'Buscando fotos en OneDrive...', progressPercent: 15 },
    }));

    try {
      const scanResult = await syncOneDrive.mutateAsync({
        action: 'scan',
        connectionId,
        childId: selectedChildId,
        folderPath,
        sinceDate: sinceDate ? sinceDate.toISOString() : undefined,
      });

      if (scanResult.imported === 0) {
        setScanProgress(prev => ({
          ...prev,
          [connectionId]: {
            phase: 'done',
            message: `Se escanearon ${scanResult.total_scanned} fotos, no hay nuevas`,
            result: scanResult,
          },
        }));
        clearProgressAfterDelay(connectionId);
        return;
      }

      setScanProgress(prev => ({
        ...prev,
        [connectionId]: {
          phase: 'analyzing',
          message: `Analizando ${scanResult.imported} fotos con IA...`,
          progressPercent: 40,
        },
      }));

      let totalAnalyzed = 0;
      const totalToAnalyze = scanResult.imported;
      let remaining = totalToAnalyze;

      while (remaining > 0) {
        try {
          const batchResult = await syncOneDrive.mutateAsync({
            action: 'analyze-batch',
            childId: selectedChildId,
          });

          totalAnalyzed += batchResult.analyzed;
          remaining = batchResult.remaining;

          const percent = 40 + Math.round((totalAnalyzed / totalToAnalyze) * 55);
          setScanProgress(prev => ({
            ...prev,
            [connectionId]: {
              phase: 'analyzing',
              message: `Analizando fotos... ${totalAnalyzed}/${totalToAnalyze}`,
              progressPercent: Math.min(percent, 95),
            },
          }));

          if (batchResult.analyzed === 0) break;
          if (batchResult.no_references) {
            toast({
              title: 'Sin fotos de referencia',
              description: 'Sube algunas fotos del niño/a primero para mejorar la detección.',
            });
            break;
          }
        } catch (batchErr: any) {
          console.error('Batch analysis error:', batchErr);
          break;
        }
      }

      setScanProgress(prev => ({
        ...prev,
        [connectionId]: {
          phase: 'done',
          message: `¡${scanResult.imported} foto${scanResult.imported > 1 ? 's' : ''} encontrada${scanResult.imported > 1 ? 's' : ''}! Revísalas en la pestaña de importación.`,
          result: scanResult,
        },
      }));

      toast({
        title: '¡Fotos encontradas!',
        description: `${scanResult.imported} foto${scanResult.imported > 1 ? 's' : ''} lista${scanResult.imported > 1 ? 's' : ''} para revisar.`,
      });

      clearProgressAfterDelay(connectionId, 8000);
    } catch (e: any) {
      setScanProgress(prev => ({
        ...prev,
        [connectionId]: { phase: 'idle', message: '' },
      }));
      toast({ title: 'Error al escanear', description: e.message, variant: 'destructive' });
    }
  };

  const clearProgressAfterDelay = (connectionId: string, delay = 5000) => {
    setTimeout(() => {
      setScanProgress(prev => {
        const next = { ...prev };
        delete next[connectionId];
        return next;
      });
    }, delay);
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

        {/* Date filter */}
        {selectedChildId && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full justify-start text-left text-xs h-8 font-normal",
                  !sinceDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                {sinceDate
                  ? `Desde: ${format(sinceDate, "d MMM yyyy", { locale: es })}`
                  : "Buscar desde fecha..."}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={sinceDate}
                onSelect={setSinceDate}
                disabled={(date) => date > new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
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
                            <Progress value={progress.progressPercent || 30} className="h-1.5" />
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
