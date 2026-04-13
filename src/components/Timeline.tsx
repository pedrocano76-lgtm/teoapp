import { Photo, Child } from '@/lib/types';
import { getAgeMonths } from '@/lib/age-utils';
import { PhotoCard } from './PhotoCard';

interface TimelineProps {
  photos: Photo[];
  child: Child;
}

export function Timeline({ photos, child }: TimelineProps) {
  // Group photos by age period
  const groups = new Map<string, Photo[]>();
  const sortedPhotos = [...photos].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const photo of sortedPhotos) {
    const months = getAgeMonths(child.birthDate, photo.date);
    let label: string;
    if (months < 1) label = '🍼 Newborn';
    else if (months < 3) label = '🌸 1–3 months';
    else if (months < 6) label = '🌿 3–6 months';
    else if (months < 9) label = '☀️ 6–9 months';
    else if (months < 12) label = '🍂 9–12 months';
    else {
      const years = Math.floor(months / 12);
      label = `🎂 ${years} year${years !== 1 ? 's' : ''} old`;
    }
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(photo);
  }

  return (
    <div className="space-y-10">
      {Array.from(groups.entries()).map(([label, groupPhotos]) => (
        <section key={label} className="animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-border" />
            <h3 className="text-lg font-heading font-semibold text-foreground whitespace-nowrap">
              {label}
            </h3>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {groupPhotos.map((photo) => (
              <PhotoCard key={photo.id} photo={photo} child={child} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
