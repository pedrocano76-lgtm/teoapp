import { useNavigate } from 'react-router-dom';
import { Photo, Event } from '@/lib/types';
import { useLocale } from '@/hooks/useLocale';
import { useTranslation } from 'react-i18next';

interface EventCardProps {
  event: Event;
  photos: Photo[];
}

export function EventCard({ event, photos }: EventCardProps) {
  const navigate = useNavigate();
  const { intlLocale } = useLocale();
  const { t } = useTranslation();
  const thumbs = photos.slice(0, 4);
  const dateLabel = event.date
    ? event.date.toLocaleDateString(intlLocale, { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <button
      onClick={() => navigate(`/events/${event.id}`)}
      className="w-full text-left rounded-xl p-4 transition-all hover:shadow-md animate-fade-in"
      style={{ background: '#EDE0D4', borderRadius: 12 }}
    >
      <div className="flex items-baseline gap-2 mb-2">
        <span style={{ color: '#C8845A' }} className="text-base leading-none">✦</span>
        <h3 style={{ fontFamily: 'Georgia, serif', color: '#4A3728' }} className="text-lg font-medium">
          {event.name}
        </h3>
      </div>
      <p className="text-xs mb-3" style={{ color: '#7A6450' }}>
        {dateLabel}
        {dateLabel && ' · '}
        {t('photos.count', { count: photos.length })}
      </p>
      {thumbs.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5">
          {thumbs.map((p) => (
            <div key={p.id} className="aspect-square rounded-md overflow-hidden bg-background/40">
              <img
                src={p.thumbnailUrl || p.url}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </button>
  );
}
