import { Child } from '@/lib/types';
import { getAge } from '@/lib/age-utils';
import { cn } from '@/lib/utils';

interface ChildHeaderProps {
  child: Child;
  photoCount: number;
}

const avatarMap: Record<Child['color'], string> = {
  primary: 'bg-primary/15 text-primary',
  sage: 'bg-sage/30 text-sage-foreground',
  lavender: 'bg-lavender/30 text-lavender-foreground',
  peach: 'bg-peach/40 text-peach-foreground',
  sky: 'bg-sky/30 text-sky-foreground',
};

export function ChildHeader({ child, photoCount }: ChildHeaderProps) {
  return (
    <div className="flex items-center gap-2.5 py-2.5 mb-3 border-b border-border/60">
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0',
        avatarMap[child.color]
      )}>
        {child.name[0]}
      </div>
      <span className="font-medium text-foreground text-sm tracking-tight">{child.name}</span>
      <span className="text-xs text-muted-foreground truncate">
        · {getAge(child.birthDate)} · {photoCount} {photoCount === 1 ? 'foto' : 'fotos'}
      </span>
    </div>
  );
}
