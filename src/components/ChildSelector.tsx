import { Child } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ChildSelectorProps {
  children: Child[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const colorMap: Record<Child['color'], string> = {
  primary: 'bg-primary',
  sage: 'bg-sage',
  lavender: 'bg-lavender',
  peach: 'bg-peach',
  sky: 'bg-sky',
};

const colorRingMap: Record<Child['color'], string> = {
  primary: 'ring-primary',
  sage: 'ring-sage',
  lavender: 'ring-lavender',
  peach: 'ring-peach',
  sky: 'ring-sky',
};

export function ChildSelector({ children, selectedId, onSelect }: ChildSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200',
          selectedId === null
            ? 'bg-foreground text-background shadow-md'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
      >
        All
      </button>
      {children.map((child) => (
        <button
          key={child.id}
          onClick={() => onSelect(child.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200',
            selectedId === child.id
              ? `ring-2 ${colorRingMap[child.color]} bg-card shadow-md`
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          <span
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground',
              colorMap[child.color]
            )}
          >
            {child.name[0]}
          </span>
          {child.name}
        </button>
      ))}
    </div>
  );
}
