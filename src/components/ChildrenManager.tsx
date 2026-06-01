import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Child } from '@/lib/types';
import { getAge } from '@/lib/age-utils';
import { cn } from '@/lib/utils';
import { ChildProfile } from './ChildProfile';
import { useSignedProfilePhotoUrl, useEvents } from '@/hooks/useData';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ChildrenManagerProps {
  children: Child[];
  onSelectChild: (id: string | null) => void;
  selectedChildId?: string | null;
}

const colorMap: Record<Child['color'], string> = {
  primary: 'bg-primary',
  sage: 'bg-sage',
  lavender: 'bg-lavender',
  peach: 'bg-peach',
  sky: 'bg-sky',
};

function ChildEventsList({ childId, onSelectChild }: { childId: string; onSelectChild: (id: string | null) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: eventsData = [] } = useEvents(childId);

  const events = (eventsData as any[])
    .filter(e => e.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (events.length === 0) return null;

  const preview = events.slice(0, 4);

  return (
    <div className="pl-4 pr-2 pb-1 space-y-0.5 group-data-[collapsible=icon]:hidden">
      {preview.map(ev => (
        <button
          key={ev.id}
          type="button"
          onClick={(e) => { e.stopPropagation(); navigate(`/events/${ev.id}`); }}
          className="w-full flex items-center gap-1.5 px-2 py-2 rounded-md hover:bg-sidebar-accent transition-colors text-left"
        >
          <span style={{ color: '#D4793A', fontSize: 10, lineHeight: 1 }}>◆</span>
          <span className="text-sm text-muted-foreground truncate flex-1">{ev.name}</span>
        </button>
      ))}
      {events.length > 4 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectChild(childId);
            navigate(`/app?child=${childId}&view=events`);
          }}
          className="w-full text-left px-2 py-2 text-xs hover:underline"
          style={{ color: '#7A6A5A' }}
        >
          {t('events.viewAll', { defaultValue: 'ver todos' })} ({events.length})
        </button>
      )}
    </div>
  );
}

function ChildRow({
  child,
  onSelectChild,
  isActive,
}: {
  child: Child;
  onSelectChild: (id: string | null) => void;
  isActive: boolean;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const { data: photoUrl } = useSignedProfilePhotoUrl(child.profilePhotoPath);

  return (
    <>
      <div className="relative">
        <button
          onClick={() => onSelectChild(child.id)}
          onDoubleClick={() => setProfileOpen(true)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent transition-colors text-left',
          )}
          style={
            isActive
              ? { borderLeft: '3px solid #C8845A', paddingLeft: 9, background: 'hsl(var(--sidebar-accent) / 0.5)' }
              : { borderLeft: '3px solid transparent', paddingLeft: 9 }
          }
        >
          <span className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground overflow-hidden shrink-0',
            colorMap[child.color]
          )}>
            {photoUrl ? (
              <img src={photoUrl} alt={child.name} className="w-full h-full object-cover" />
            ) : (
              child.name[0]
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-medium text-sidebar-foreground truncate">{child.name}</p>
            <p className="text-sm text-muted-foreground truncate">{getAge(child.birthDate)}</p>
          </div>
        </button>
        <button
          type="button"
          aria-label={expanded ? 'Colapsar eventos' : 'Expandir eventos'}
          onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
          className="absolute top-1/2 -translate-y-1/2 right-2 p-1 rounded hover:bg-sidebar-accent text-muted-foreground group-data-[collapsible=icon]:hidden"
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
      </div>
      {expanded && <ChildEventsList childId={child.id} onSelectChild={onSelectChild} />}
      <ChildProfile child={child} open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}

export function ChildrenManager({ children, onSelectChild, selectedChildId }: ChildrenManagerProps) {
  const { t } = useTranslation();
  if (children.length === 0) return <p className="text-sm text-muted-foreground px-4">{t('child.noChildren', { defaultValue: 'No hay hijos añadidos.' })}</p>;

  return (
    <div className="space-y-0.5 px-2">
      {children.map(child => (
        <ChildRow
          key={child.id}
          child={child}
          onSelectChild={onSelectChild}
          isActive={selectedChildId === child.id}
        />
      ))}
    </div>
  );
}
