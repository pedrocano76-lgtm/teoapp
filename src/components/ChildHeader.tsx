import { Child } from '@/lib/types';
import { getAge } from '@/lib/age-utils';
import { cn } from '@/lib/utils';

interface ChildHeaderProps {
  child: Child;
  photoCount: number;
}

const bgMap: Record<Child['color'], string> = {
  primary: 'from-primary/20 to-primary/5',
  sage: 'from-sage/30 to-sage/5',
  lavender: 'from-lavender/30 to-lavender/5',
  peach: 'from-peach/30 to-peach/5',
  sky: 'from-sky/30 to-sky/5',
};

const avatarMap: Record<Child['color'], string> = {
  primary: 'bg-primary',
  sage: 'bg-sage',
  lavender: 'bg-lavender',
  peach: 'bg-peach',
  sky: 'bg-sky',
};

export function ChildHeader({ child, photoCount }: ChildHeaderProps) {
  return (
    <div className={cn('rounded-2xl p-6 bg-gradient-to-r mb-6', bgMap[child.color])}>
      <div className="flex items-center gap-4">
        <div className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-md',
          avatarMap[child.color]
        )}>
          {child.name[0]}
        </div>
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground">{child.name}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {getAge(child.birthDate)} • {photoCount} {photoCount === 1 ? 'foto' : 'fotos'}
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">
            Nacido el {child.birthDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}
