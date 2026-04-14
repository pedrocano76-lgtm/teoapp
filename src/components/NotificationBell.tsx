import { useState } from 'react';
import { useNotifications, useUnreadCount, useMarkNotificationsRead } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, Cloud, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function NotificationBell() {
  const { data: notifications } = useNotifications();
  const unreadCount = useUnreadCount();
  const markRead = useMarkNotificationsRead();
  const [open, setOpen] = useState(false);

  const items = notifications || [];

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && unreadCount > 0) {
      const unreadIds = items.filter((n: any) => !n.read).map((n: any) => n.id);
      if (unreadIds.length > 0) markRead.mutate(unreadIds);
    }
  };

  if (items.length === 0 && unreadCount === 0) return null;

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="p-3 border-b">
          <p className="text-sm font-semibold">Notificaciones</p>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center">Sin notificaciones</p>
          ) : (
            items.map((n: any) => (
              <div key={n.id} className={`px-3 py-2.5 border-b last:border-0 ${!n.read ? 'bg-primary/5' : ''}`}>
                <div className="flex items-start gap-2">
                  {n.type === 'cloud_import' ? (
                    <Cloud className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  ) : (
                    <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(n.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
