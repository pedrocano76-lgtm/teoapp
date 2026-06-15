import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  Cake,
  Heart,
  Sparkles,
  Settings as SettingsIcon,
  Upload,
  Users,
  X,
  Trash2,
  Pencil,
} from 'lucide-react';

// ---------- Theme ----------
const COLORS = {
  bg: '#F5F0E8',
  primary: '#D4793A',
  text: '#4A3728',
  secondary: '#7A6A5A',
  card: '#EDE0D4',
  muted: '#9A8A7A',
  white: '#FFFFFF',
};
const serif = { fontFamily: 'Georgia, "Times New Roman", serif' };
const sans = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

// ---------- Language ----------
type Lang = 'es' | 'en';
function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'es';
  const raw = (navigator.languages && navigator.languages[0]) || navigator.language || 'es';
  return raw.toLowerCase().startsWith('es') ? 'es' : 'en';
}

const STRINGS = {
  es: {
    banner: "Estás viendo una demo de Memorydrawer ◆ Crea tu cuenta gratis →",
    toast: 'Crea tu cuenta para empezar a subir tus fotos →',
    back: 'Volver',
    tabsTimeline: 'Línea de tiempo',
    tabsEvents: 'Eventos',
    tabsFamily: 'Familia',
    monthsLabel: (n: number) => `${n} ${n === 1 ? 'mes' : 'meses'}`,
    photos: (n: number) => `${n} ${n === 1 ? 'foto' : 'fotos'}`,
    upload: 'Subir fotos',
    settings: 'Ajustes',
    invite: 'Invitar familiar',
    role: { owner: 'Madre (titular)', guest: 'Invitado' },
    events: [
      { name: 'Primera sonrisa', comment: 'Nos derritió el corazón' },
      { name: 'Navidades en familia', comment: 'Su primer árbol de Navidad' },
      { name: 'Primer cumpleaños', comment: 'Una fiesta para recordar siempre' },
    ],
    childAgeNow: (m: number) => `${m} meses`,
    familyTitle: 'Familia compartida',
  },
  en: {
    banner: "You're viewing a Memorydrawer demo ◆ Create your free account →",
    toast: 'Create your account to start uploading your photos →',
    back: 'Back',
    tabsTimeline: 'Timeline',
    tabsEvents: 'Events',
    tabsFamily: 'Family',
    monthsLabel: (n: number) => `${n} ${n === 1 ? 'month' : 'months'}`,
    photos: (n: number) => `${n} ${n === 1 ? 'photo' : 'photos'}`,
    upload: 'Upload photos',
    settings: 'Settings',
    invite: 'Invite family',
    role: { owner: 'Mother (owner)', guest: 'Guest' },
    events: [
      { name: 'First smile', comment: 'It melted our hearts' },
      { name: 'Christmas with family', comment: 'His first Christmas tree' },
      { name: 'First birthday', comment: 'A party to remember forever' },
    ],
    childAgeNow: (m: number) => `${m} months`,
    familyTitle: 'Shared family',
  },
};

// ---------- Demo data ----------
const PHOTOS_BASE = [
  'https://images.unsplash.com/photo-1519689680058-324335c77eba',
  'https://images.unsplash.com/photo-1555252333-9f8e92e65df9',
  'https://images.unsplash.com/photo-1544126592-807ade215a0b',
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb',
  'https://images.unsplash.com/photo-1529736576495-1ed4a29ca9e6',
  'https://images.unsplash.com/photo-1566004100631-35d015d6a491',
  'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4',
  'https://images.unsplash.com/photo-1491013516836-7db643ee125a',
  'https://images.unsplash.com/photo-1492725764893-90b379c2b6e7',
  'https://images.unsplash.com/photo-1476703993599-0035a21b17a9',
];
const thumb = (u: string) => `${u}?w=400&auto=format&fit=crop`;
const full = (u: string) => `${u}?w=800&auto=format&fit=crop`;

const BIRTH = new Date(2025, 2, 15); // March 15, 2025

type DemoPhoto = {
  id: string;
  url: string;
  thumb: string;
  date: Date;
  eventId?: string;
};

// distribute by month buckets
const BUCKETS: { month: number; year: number; count: number }[] = [
  { month: 3, year: 2025, count: 3 }, // April
  { month: 5, year: 2025, count: 4 }, // June
  { month: 8, year: 2025, count: 5 }, // September
  { month: 11, year: 2025, count: 4 }, // December
  { month: 2, year: 2026, count: 4 }, // March
];

function buildPhotos(): DemoPhoto[] {
  const out: DemoPhoto[] = [];
  let i = 0;
  BUCKETS.forEach((b) => {
    for (let n = 0; n < b.count; n++) {
      const url = PHOTOS_BASE[i % PHOTOS_BASE.length];
      const day = 4 + n * 5;
      out.push({
        id: `p-${i}`,
        url: full(url),
        thumb: thumb(url),
        date: new Date(b.year, b.month, day),
      });
      i++;
    }
  });
  return out;
}

const EVENTS_META = [
  { id: 'e1', date: new Date(2025, 5, 10), icon: Heart, photoCount: 2 },
  { id: 'e2', date: new Date(2025, 11, 24), icon: Sparkles, photoCount: 3 },
  { id: 'e3', date: new Date(2026, 2, 15), icon: Cake, photoCount: 4 },
];

const FAMILY = [
  { name: 'María García', role: 'Madre', isOwner: true },
  { name: 'Abuela Carmen', role: 'Abuela', isOwner: false },
  { name: 'Tío Javier', role: 'Tío', isOwner: false },
];

// ---------- Helpers ----------
function ageInMonths(date: Date, birth: Date) {
  let m = (date.getFullYear() - birth.getFullYear()) * 12 + (date.getMonth() - birth.getMonth());
  if (date.getDate() < birth.getDate()) m -= 1;
  return Math.max(0, m);
}
function monthLabel(d: Date, lang: Lang) {
  return d.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
}
function shortDate(d: Date, lang: Lang) {
  return d.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ---------- Component ----------
export default function Demo() {
  const lang = detectLang();
  const t = STRINGS[lang];
  const photos = useMemo(buildPhotos, []);
  // assign event photos (first N of matching bucket)
  const eventPhotos = useMemo(() => {
    const e1 = photos.filter((p) => p.date.getMonth() === 5 && p.date.getFullYear() === 2025).slice(0, 2);
    const e2 = photos.filter((p) => p.date.getMonth() === 11 && p.date.getFullYear() === 2025).slice(0, 3);
    const e3 = photos.filter((p) => p.date.getMonth() === 2 && p.date.getFullYear() === 2026).slice(0, 4);
    return { e1, e2, e3 };
  }, [photos]);

  const [tab, setTab] = useState<'timeline' | 'events' | 'family'>('timeline');
  const [lightbox, setLightbox] = useState<DemoPhoto | null>(null);
  const [openEvent, setOpenEvent] = useState<number | null>(null);

  const childAgeMonths = ageInMonths(new Date(), BIRTH);

  const blockEdit = () =>
    toast(t.toast, {
      action: {
        label: '→',
        onClick: () => (window.location.href = '/auth?register=true'),
      },
    });

  // Group photos by month for timeline
  const grouped = useMemo(() => {
    const map = new Map<string, DemoPhoto[]>();
    [...photos]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .forEach((p) => {
        const key = `${p.date.getFullYear()}-${p.date.getMonth()}`;
        const arr = map.get(key) ?? [];
        arr.push(p);
        map.set(key, arr);
      });
    return Array.from(map.entries()).map(([k, list]) => ({
      key: k,
      date: list[0].date,
      list,
    }));
  }, [photos]);

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh', ...sans }} lang={lang}>
      {/* Banner */}
      <Link
        to="/auth?register=true"
        style={{
          display: 'block',
          background: COLORS.primary,
          color: COLORS.white,
          padding: '10px 16px',
          fontSize: 13.5,
          fontWeight: 500,
          textAlign: 'center',
          textDecoration: 'none',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        {t.banner}
      </Link>

      {/* Header */}
      <header
        style={{
          maxWidth: 560,
          margin: '0 auto',
          padding: '16px 20px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: COLORS.secondary,
            textDecoration: 'none',
            fontSize: 14,
          }}
        >
          <ArrowLeft size={16} /> {t.back}
        </Link>
        <button
          onClick={blockEdit}
          aria-label={t.settings}
          style={{
            background: 'transparent',
            border: 'none',
            color: COLORS.secondary,
            cursor: 'pointer',
            padding: 6,
          }}
        >
          <SettingsIcon size={20} />
        </button>
      </header>

      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 80px' }}>
        {/* Child header */}
        <section
          style={{
            background: COLORS.white,
            borderRadius: 16,
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 16,
            boxShadow: '0 1px 3px rgba(74,55,40,0.04)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: COLORS.primary,
              color: COLORS.white,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              ...serif,
              fontWeight: 500,
            }}
          >
            L
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...serif, fontSize: 22, fontWeight: 500 }}>Lucas</div>
            <div style={{ fontSize: 13, color: COLORS.secondary }}>
              {shortDate(BIRTH, lang)} · {t.childAgeNow(childAgeMonths)}
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div
          role="tablist"
          style={{
            display: 'flex',
            background: COLORS.card,
            padding: 4,
            borderRadius: 12,
            marginBottom: 20,
            gap: 4,
          }}
        >
          {(
            [
              ['timeline', t.tabsTimeline],
              ['events', t.tabsEvents],
              ['family', t.tabsFamily],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                background: tab === k ? COLORS.white : 'transparent',
                color: tab === k ? COLORS.text : COLORS.secondary,
                fontWeight: tab === k ? 600 : 500,
                fontSize: 13.5,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Action row (disabled) */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            onClick={blockEdit}
            style={{
              flex: 1,
              border: `2px solid ${COLORS.primary}`,
              background: 'transparent',
              color: COLORS.primary,
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Upload size={16} /> {t.upload}
          </button>
          <button
            onClick={blockEdit}
            style={{
              flex: 1,
              border: `2px solid ${COLORS.primary}`,
              background: 'transparent',
              color: COLORS.primary,
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Users size={16} /> {t.invite}
          </button>
        </div>

        {/* TIMELINE */}
        {tab === 'timeline' && (
          <div>
            {grouped.map((g) => {
              const months = ageInMonths(g.date, BIRTH);
              return (
                <section key={g.key} style={{ marginBottom: 26 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                    <span style={{ ...serif, fontSize: 15, color: COLORS.primary }}>
                      ◆ {t.monthsLabel(months)}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: COLORS.secondary,
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                      }}
                    >
                      {monthLabel(g.date, lang)} · {t.photos(g.list.length)}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {g.list.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setLightbox(p)}
                        style={{
                          padding: 0,
                          border: 'none',
                          borderRadius: 8,
                          overflow: 'hidden',
                          aspectRatio: '1 / 1',
                          cursor: 'pointer',
                          background: COLORS.card,
                        }}
                      >
                        <img
                          src={p.thumb}
                          alt=""
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* EVENTS */}
        {tab === 'events' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {EVENTS_META.map((ev, idx) => {
              const Icon = ev.icon;
              const meta = t.events[idx];
              const list =
                idx === 0 ? eventPhotos.e1 : idx === 1 ? eventPhotos.e2 : eventPhotos.e3;
              const open = openEvent === idx;
              return (
                <section
                  key={ev.id}
                  style={{
                    background: COLORS.white,
                    borderRadius: 14,
                    padding: 16,
                    boxShadow: '0 1px 3px rgba(74,55,40,0.04)',
                  }}
                >
                  <button
                    onClick={() => setOpenEvent(open ? null : idx)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: COLORS.card,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={20} color={COLORS.primary} strokeWidth={1.8} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...serif, fontSize: 16, fontWeight: 500 }}>{meta.name}</div>
                      <div style={{ fontSize: 12.5, color: COLORS.secondary }}>
                        {shortDate(ev.date, lang)} · {t.photos(ev.photoCount)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <span
                        role="button"
                        aria-label="edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          blockEdit();
                        }}
                        style={{ padding: 6, color: COLORS.muted, cursor: 'pointer' }}
                      >
                        <Pencil size={16} />
                      </span>
                    </div>
                  </button>
                  <p style={{ margin: '12px 0 0', fontSize: 14, color: COLORS.secondary, fontStyle: 'italic' }}>
                    "{meta.comment}"
                  </p>
                  {open && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 6,
                        marginTop: 12,
                      }}
                    >
                      {list.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setLightbox(p)}
                          style={{
                            padding: 0,
                            border: 'none',
                            borderRadius: 6,
                            overflow: 'hidden',
                            aspectRatio: '1 / 1',
                            cursor: 'pointer',
                          }}
                        >
                          <img
                            src={p.thumb}
                            alt=""
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {/* FAMILY */}
        {tab === 'family' && (
          <div>
            <h2 style={{ ...serif, fontSize: 18, fontWeight: 500, margin: '4px 0 12px' }}>
              {t.familyTitle}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FAMILY.map((m) => (
                <div
                  key={m.name}
                  style={{
                    background: COLORS.white,
                    padding: 14,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    boxShadow: '0 1px 3px rgba(74,55,40,0.04)',
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      background: COLORS.card,
                      color: COLORS.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...serif,
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    {m.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5 }}>{m.name}</div>
                    <div style={{ fontSize: 12.5, color: COLORS.secondary }}>
                      {m.role} · {m.isOwner ? t.role.owner : t.role.guest}
                    </div>
                  </div>
                  {!m.isOwner && (
                    <button
                      onClick={blockEdit}
                      aria-label="remove"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: COLORS.muted,
                        cursor: 'pointer',
                        padding: 6,
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20,14,8,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            aria-label="close"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(255,255,255,0.15)',
              color: COLORS.white,
              border: 'none',
              borderRadius: '50%',
              width: 38,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
          <img
            src={lightbox.url}
            alt=""
            style={{
              maxWidth: '100%',
              maxHeight: '85vh',
              borderRadius: 10,
              objectFit: 'contain',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
