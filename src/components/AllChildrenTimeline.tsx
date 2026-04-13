import { Photo, Child } from '@/lib/types';
import { getAge } from '@/lib/age-utils';
import { PhotoCard } from './PhotoCard';

interface AllChildrenTimelineProps {
  photos: Photo[];
  children: Child[];
}

export function AllChildrenTimeline({ photos, children }: AllChildrenTimelineProps) {
  const sortedPhotos = [...photos].sort((a, b) => a.date.getTime() - b.date.getTime());
  const groups = new Map<string, Photo[]>();

  for (const photo of sortedPhotos) {
    const label = photo.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(photo);
  }

  const childMap = new Map(children.map(c => [c.id, c]));

  // Get representative date for each group for age calculation
  const groupDates = new Map<string, Date>();
  for (const photo of sortedPhotos) {
    const label = photo.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!groupDates.has(label)) groupDates.set(label, photo.date);
  }

  return (
    <div className="space-y-10">
      {Array.from(groups.entries()).map(([label, groupPhotos]) => {
        const groupDate = groupDates.get(label)!;
        // Show age for each child at this date
        const ageLabels = children.map(c => {
          const age = getAge(c.birthDate, groupDate);
          return `${c.name}: ${age}`;
        });

        return (
          <section key={label} className="animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-border" />
              <div className="text-center">
                <h3 className="text-lg font-heading font-semibold text-foreground whitespace-nowrap">
                  📅 {label}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ageLabels.join(' · ')}
                </p>
              </div>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {groupPhotos.map((photo) => {
                const child = childMap.get(photo.childId);
                if (!child) return null;
                return <PhotoCard key={photo.id} photo={photo} child={child} />;
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
