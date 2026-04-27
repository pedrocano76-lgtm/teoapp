import { useState } from 'react';
import { Child } from '@/lib/types';
import { getAge } from '@/lib/age-utils';
import { cn } from '@/lib/utils';
import { ChildProfile } from './ChildProfile';
import { useSignedProfilePhotoUrl } from '@/hooks/useData';

interface ChildrenManagerProps {
  children: Child[];
  onSelectChild: (id: string | null) => void;
}

const colorMap: Record<Child['color'], string> = {
  primary: 'bg-primary',
  sage: 'bg-sage',
  lavender: 'bg-lavender',
  peach: 'bg-peach',
  sky: 'bg-sky',
};

function ChildRow({ child, onSelectChild }: { child: Child; onSelectChild: (id: string | null) => void }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const { data: photoUrl } = useSignedProfilePhotoUrl(child.profilePhotoPath);

  return (
    <>
      <button
        onClick={() => {
          onSelectChild(child.id);
          setProfileOpen(true);
        }}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left"
      >
        <span className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground overflow-hidden',
          colorMap[child.color]
        )}>
          {photoUrl ? (
            <img src={photoUrl} alt={child.name} className="w-full h-full object-cover" />
          ) : (
            child.name[0]
          )}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-sidebar-foreground truncate">{child.name}</p>
          <p className="text-xs text-muted-foreground">{getAge(child.birthDate)}</p>
        </div>
      </button>
      <ChildProfile child={child} open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}

export function ChildrenManager({ children, onSelectChild }: ChildrenManagerProps) {
  if (children.length === 0) return <p className="text-sm text-muted-foreground px-4">No hay hijos añadidos.</p>;

  return (
    <div className="space-y-1 px-2">
      {children.map(child => (
        <ChildRow key={child.id} child={child} onSelectChild={onSelectChild} />
      ))}
    </div>
  );
}
