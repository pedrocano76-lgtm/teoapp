import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Camera, Plus, Trash2, Loader2 } from 'lucide-react';
import { Child, ActivityType } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import {
  useUpdateChild,
  useUploadChildProfilePhoto,
  useSignedProfilePhotoUrl,
  useActivities,
  useAddActivity,
  useDeleteActivity,
  useBirthdayNotificationSettings,
  useUpdateBirthdayNotificationSettings,
} from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface ChildProfileProps {
  child: Child | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const colorBgMap: Record<Child['color'], string> = {
  primary: 'bg-primary/15 text-primary',
  sage: 'bg-sage/30 text-sage-foreground',
  lavender: 'bg-lavender/30 text-lavender-foreground',
  peach: 'bg-peach/40 text-peach-foreground',
  sky: 'bg-sky/30 text-sky-foreground',
};

const activityTypeLabels: Record<ActivityType, string> = {
  sport: 'Deporte',
  hobby: 'Afición',
  other: 'Otro',
};

const emojiSuggestions = ['⚽', '🏀', '🎾', '🏊', '🚴', '🎨', '🎵', '🎹', '📚', '🧩', '🩰', '🥋', '🏃', '🎮', '🌳'];

export function ChildProfile({ child, open, onOpenChange }: ChildProfileProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = !!child && !!user && child.ownerId === user.id;
  const canEdit = isOwner;

  const [name, setName] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
  const [profilePhotoPath, setProfilePhotoPath] = useState<string | undefined>(undefined);

  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityType, setNewActivityType] = useState<ActivityType>('sport');
  const [newActivityIcon, setNewActivityIcon] = useState('');

  const [notifSameDay, setNotifSameDay] = useState(true);
  const [notifDayBefore, setNotifDayBefore] = useState(false);

  const updateChild = useUpdateChild();
  const uploadPhoto = useUploadChildProfilePhoto();
  const { data: signedPhotoUrl } = useSignedProfilePhotoUrl(profilePhotoPath);

  const { data: activities = [] } = useActivities(child?.id);
  const addActivity = useAddActivity();
  const deleteActivity = useDeleteActivity();

  const { data: notifSettings } = useBirthdayNotificationSettings(child?.id);
  const updateNotif = useUpdateBirthdayNotificationSettings();

  // Sync local state when child changes
  useEffect(() => {
    if (child) {
      setName(child.name);
      setFullName(child.fullName ?? '');
      setBirthDate(child.birthDate);
      setProfilePhotoPath(child.profilePhotoPath);
    }
  }, [child]);

  useEffect(() => {
    if (notifSettings) {
      setNotifSameDay(!!notifSettings.notify_same_day);
      setNotifDayBefore(!!notifSettings.notify_day_before);
    } else {
      setNotifSameDay(true);
      setNotifDayBefore(false);
    }
  }, [notifSettings]);

  if (!child) return null;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !child) return;
    try {
      const path = await uploadPhoto.mutateAsync({ file, childId: child.id });
      setProfilePhotoPath(path);
      await updateChild.mutateAsync({ childId: child.id, profilePhotoPath: path });
      toast({ title: 'Foto actualizada' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (!child) return;
    try {
      await updateChild.mutateAsync({
        childId: child.id,
        name,
        fullName: fullName || null,
        birthDate: birthDate ? format(birthDate, 'yyyy-MM-dd') : undefined,
      });
      toast({ title: '✨ Perfil guardado' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleAddActivity = async () => {
    if (!newActivityName.trim() || !child) return;
    try {
      await addActivity.mutateAsync({
        childId: child.id,
        name: newActivityName.trim(),
        type: newActivityType,
        icon: newActivityIcon || undefined,
      });
      setNewActivityName('');
      setNewActivityIcon('');
      setNewActivityType('sport');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    try {
      await deleteActivity.mutateAsync({ activityId, childId: child.id });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleNotifChange = async (sameDay: boolean, dayBefore: boolean) => {
    setNotifSameDay(sameDay);
    setNotifDayBefore(dayBefore);
    try {
      await updateNotif.mutateAsync({
        childId: child.id,
        notifySameDay: sameDay,
        notifyDayBefore: dayBefore,
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-heading">Perfil de {child.name}</SheetTitle>
          <SheetDescription>
            {canEdit ? 'Edita los detalles, actividades y notificaciones.' : 'Información del perfil y notificaciones.'}
          </SheetDescription>
        </SheetHeader>

        {/* Profile photo */}
        <div className="flex flex-col items-center py-6">
          <button
            type="button"
            onClick={() => canEdit && fileInputRef.current?.click()}
            disabled={!canEdit || uploadPhoto.isPending}
            className={cn(
              'relative w-28 h-28 rounded-full overflow-hidden flex items-center justify-center text-3xl font-semibold shadow-sm',
              colorBgMap[child.color],
              canEdit && 'cursor-pointer hover:opacity-90 transition-opacity'
            )}
          >
            {signedPhotoUrl ? (
              <img src={signedPhotoUrl} alt={child.name} className="w-full h-full object-cover" />
            ) : (
              <span>{child.name[0]}</span>
            )}
            {canEdit && (
              <span className="absolute bottom-0 right-0 bg-background border border-border rounded-full p-1.5 shadow-sm">
                {uploadPhoto.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        {/* Editable fields */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="display-name">Nombre</Label>
            <Input
              id="display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="full-name">Nombre completo</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={!canEdit}
              placeholder="Opcional"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha de nacimiento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={!canEdit}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !birthDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {birthDate ? format(birthDate, 'PPP') : <span>Selecciona una fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={birthDate}
                  onSelect={setBirthDate}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Activities */}
        <div className="space-y-3">
          <h3 className="font-heading text-base">Actividades</h3>
          <div className="space-y-1.5">
            {activities.length === 0 && (
              <p className="text-sm text-muted-foreground">Aún no hay actividades.</p>
            )}
            {activities.map((a: any) => (
              <div
                key={a.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-card"
              >
                <span className="text-lg w-6 text-center">{a.icon || '•'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {activityTypeLabels[a.type as ActivityType]}
                  </p>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteActivity(a.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {canEdit && (
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre de la actividad"
                  value={newActivityName}
                  onChange={(e) => setNewActivityName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="🎨"
                  value={newActivityIcon}
                  onChange={(e) => setNewActivityIcon(e.target.value)}
                  className="w-16 text-center"
                  maxLength={2}
                />
              </div>
              <div className="flex gap-2">
                <Select value={newActivityType} onValueChange={(v) => setNewActivityType(v as ActivityType)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sport">⚽ Deporte</SelectItem>
                    <SelectItem value="hobby">🎨 Afición</SelectItem>
                    <SelectItem value="other">✨ Otro</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddActivity}
                  disabled={!newActivityName.trim() || addActivity.isPending}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" /> Añadir
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {emojiSuggestions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewActivityIcon(emoji)}
                    className="w-7 h-7 rounded-md hover:bg-accent text-base"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator className="my-6" />

        {/* Birthday notifications */}
        <div className="space-y-3">
          <h3 className="font-heading text-base">Notificaciones de cumpleaños</h3>
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
            <Label htmlFor="notif-same-day" className="font-normal text-sm">El mismo día</Label>
            <Switch
              id="notif-same-day"
              checked={notifSameDay}
              onCheckedChange={(v) => handleNotifChange(v, notifDayBefore)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
            <Label htmlFor="notif-day-before" className="font-normal text-sm">El día anterior</Label>
            <Switch
              id="notif-day-before"
              checked={notifDayBefore}
              onCheckedChange={(v) => handleNotifChange(notifSameDay, v)}
            />
          </div>
        </div>

        {/* Save */}
        {canEdit && (
          <div className="sticky bottom-0 -mx-6 px-6 py-4 mt-6 bg-background/90 backdrop-blur border-t border-border">
            <Button
              onClick={handleSave}
              disabled={updateChild.isPending}
              className="w-full"
            >
              {updateChild.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
