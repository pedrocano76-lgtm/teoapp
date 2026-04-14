import { useState } from 'react';
import { usePendingImports, useImportPhoto } from '@/hooks/useCloudSync';
import { useChildren } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Check, X, Loader2, Cloud, CheckCheck, ImageIcon } from 'lucide-react';

export function PendingImportsReview() {
  const { data: childrenData } = useChildren();
  const { data: imports, isLoading } = usePendingImports();
  const importPhoto = useImportPhoto();
  const { toast } = useToast();
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);

  const children = childrenData || [];
  const pendingImports = imports || [];

  const getChildName = (childId: string) => {
    return children.find((c: any) => c.id === childId)?.name || 'Desconocido';
  };

  const handleAccept = async (ids: string[]) => {
    setProcessing(prev => new Set([...prev, ...ids]));
    try {
      const result = await importPhoto.mutateAsync({ action: 'accept', importIds: ids });
      const succeeded = result.results?.filter((r: any) => r.success).length || 0;
      const failed = result.results?.filter((r: any) => !r.success).length || 0;

      if (succeeded > 0) {
        toast({ title: '¡Importadas!', description: `${succeeded} foto${succeeded > 1 ? 's' : ''} añadida${succeeded > 1 ? 's' : ''} a Little Moments.` });
      }
      if (failed > 0) {
        toast({ title: 'Algunas fallaron', description: `${failed} foto${failed > 1 ? 's' : ''} no se pudieron importar.`, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  const handleReject = async (ids: string[]) => {
    setProcessing(prev => new Set([...prev, ...ids]));
    try {
      await importPhoto.mutateAsync({ action: 'reject', importIds: ids });
      toast({ title: 'Descartadas', description: `${ids.length} foto${ids.length > 1 ? 's' : ''} descartada${ids.length > 1 ? 's' : ''}.` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  if (isLoading || pendingImports.length === 0) return null;

  const confidenceColor = (score: number | null) => {
    if (score === null) return 'secondary';
    if (score > 0.7) return 'default';
    return 'secondary';
  };

  const confidenceLabel = (score: number | null) => {
    if (score === null) return '—';
    if (score > 0.8) return 'Alta';
    if (score > 0.5) return 'Media';
    return 'Baja';
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">
                {pendingImports.length} foto{pendingImports.length > 1 ? 's' : ''} de OneDrive
              </p>
              <p className="text-xs text-muted-foreground">Listas para revisar</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                Revisar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Fotos sugeridas ({pendingImports.length})</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleReject(pendingImports.map((i: any) => i.id))}
                      disabled={processing.size > 0}
                    >
                      <X className="h-3.5 w-3.5" />
                      Descartar todo
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleAccept(pendingImports.map((i: any) => i.id))}
                      disabled={processing.size > 0}
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Aceptar todo
                    </Button>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                {pendingImports.map((imp: any) => {
                  const isProcessing = processing.has(imp.id);
                  return (
                    <Card key={imp.id} className="overflow-hidden group relative">
                      <CardContent className="p-0">
                        <div className="aspect-square bg-muted relative">
                          {imp.thumbnail_url ? (
                            <img
                              src={imp.thumbnail_url}
                              alt={imp.file_name || 'Foto'}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Cloud className="h-8 w-8" />
                            </div>
                          )}

                          {/* Confidence badge */}
                          {imp.confidence_score !== null && (
                            <Badge
                              variant={confidenceColor(imp.confidence_score)}
                              className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0"
                            >
                              {confidenceLabel(imp.confidence_score)} {Math.round(imp.confidence_score * 100)}%
                            </Badge>
                          )}

                          {/* Child name */}
                          <Badge variant="outline" className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0 bg-background/80">
                            {getChildName(imp.child_id)}
                          </Badge>

                          {/* Actions overlay */}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 bg-destructive/60 hover:bg-destructive/80 text-primary-foreground"
                              disabled={isProcessing}
                              onClick={() => handleReject([imp.id])}
                            >
                              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 bg-primary/60 hover:bg-primary/80 text-primary-foreground"
                              disabled={isProcessing}
                              onClick={() => handleAccept([imp.id])}
                            >
                              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* File info */}
                        <div className="p-2">
                          <p className="text-xs truncate text-muted-foreground">{imp.file_name || 'Sin nombre'}</p>
                          {imp.taken_at && (
                            <p className="text-[10px] text-muted-foreground/60">
                              {new Date(imp.taken_at).toLocaleDateString('es-ES')}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
