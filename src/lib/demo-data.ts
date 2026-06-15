// Demo mode: pure in-memory fixture data that mirrors the shape of rows
// returned by Supabase (snake_case fields), so existing mappers in
// src/pages/Index.tsx and component-level hooks work without modification.

import { toast } from 'sonner';

export const DEMO_USER_ID = 'demo-user-id';
const DEMO_CHILD_ID = 'demo-child-lucas';

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.pathname === '/demo' || window.location.pathname.startsWith('/demo/')) return true;
  try {
    return window.sessionStorage.getItem('memorydrawer_demo') === '1';
  } catch {
    return false;
  }
}

export function enterDemoMode() {
  try { window.sessionStorage.setItem('memorydrawer_demo', '1'); } catch {}
}

export function exitDemoMode() {
  try { window.sessionStorage.removeItem('memorydrawer_demo'); } catch {}
}

export function isDemoLang(): 'es' | 'en' {
  if (typeof navigator === 'undefined') return 'es';
  const raw = (navigator.languages && navigator.languages[0]) || navigator.language || 'es';
  return raw.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function demoBlockedToast() {
  const lang = isDemoLang();
  const msg = lang === 'es' ? 'Crea tu cuenta para empezar →' : 'Create your account to start →';
  toast(msg, {
    action: {
      label: '→',
      onClick: () => {
        window.location.href = '/auth?register=true';
      },
    },
  });
}

// ---------- Photos ----------
const BASE_URLS = [
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
const full = (u: string) => `${u}?w=800&auto=format&fit=crop`;
const thumb = (u: string) => `${u}?w=400&auto=format&fit=crop`;

// Buckets: [year, monthIndex, count]
const BUCKETS: Array<[number, number, number]> = [
  [2025, 3, 3],   // April 2025  (~1 month)
  [2025, 5, 4],   // June 2025   (~3 months)
  [2025, 8, 5],   // September 2025 (~6 months)
  [2025, 11, 4],  // December 2025 (~9 months)
  [2026, 2, 4],   // March 2026  (~12 months)
];

// Event ids
const E1 = 'demo-evt-1'; // Primera sonrisa - June 10, 2025
const E2 = 'demo-evt-2'; // Navidades en familia - Dec 24, 2025
const E3 = 'demo-evt-3'; // Primer cumpleaños - March 15, 2026

const ES_TEXT = {
  e1: { name: 'Primera sonrisa', comment: 'Nos derritió el corazón' },
  e2: { name: 'Navidades en familia', comment: 'Su primer árbol de Navidad' },
  e3: { name: 'Primer cumpleaños', comment: 'Una fiesta para recordar siempre' },
};
const EN_TEXT = {
  e1: { name: 'First smile', comment: 'It melted our hearts' },
  e2: { name: 'Christmas with family', comment: 'His first Christmas tree' },
  e3: { name: 'First birthday', comment: 'A party to remember forever' },
};

function eventTextFor(key: 'e1' | 'e2' | 'e3') {
  return isDemoLang() === 'es' ? ES_TEXT[key] : EN_TEXT[key];
}

export function getDemoChildRows() {
  return [
    {
      id: DEMO_CHILD_ID,
      name: 'Lucas',
      birth_date: '2025-03-15',
      avatar_url: null,
      color: 'primary',
      owner_id: DEMO_USER_ID,
      full_name: 'Lucas García',
      profile_photo_path: null,
    },
  ];
}

export function getDemoEventRows() {
  return [
    {
      id: E1,
      name: eventTextFor('e1').name,
      icon: '🙂',
      color: '#D4793A',
      child_id: DEMO_CHILD_ID,
      date: '2025-06-10',
      description: eventTextFor('e1').comment,
      created_at: '2025-06-10T00:00:00.000Z',
    },
    {
      id: E2,
      name: eventTextFor('e2').name,
      icon: '🎄',
      color: '#D4793A',
      child_id: DEMO_CHILD_ID,
      date: '2025-12-24',
      description: eventTextFor('e2').comment,
      created_at: '2025-12-24T00:00:00.000Z',
    },
    {
      id: E3,
      name: eventTextFor('e3').name,
      icon: '🎂',
      color: '#D4793A',
      child_id: DEMO_CHILD_ID,
      date: '2026-03-15',
      description: eventTextFor('e3').comment,
      created_at: '2026-03-15T00:00:00.000Z',
    },
  ];
}

interface DemoPhotoRow {
  id: string;
  child_id: string;
  uploaded_by: string;
  taken_at: string;
  created_at: string;
  caption: string | null;
  event_id: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  signed_url: string;
  thumbnail_signed_url: string;
  is_shared: boolean;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  events: { name: string; icon: string; color: string } | null;
  photo_tags: any[];
}

function buildDemoPhotoRows(): DemoPhotoRow[] {
  const rows: DemoPhotoRow[] = [];
  let i = 0;

  // Per-bucket event mapping: assign first N of the bucket to the event
  const eventForBucket = (yr: number, mo: number) => {
    if (yr === 2025 && mo === 5) return { id: E1, count: 2, key: 'e1' as const };
    if (yr === 2025 && mo === 11) return { id: E2, count: 3, key: 'e2' as const };
    if (yr === 2026 && mo === 2) return { id: E3, count: 4, key: 'e3' as const };
    return null;
  };

  BUCKETS.forEach(([yr, mo, count]) => {
    const evt = eventForBucket(yr, mo);
    for (let n = 0; n < count; n++) {
      const url = BASE_URLS[i % BASE_URLS.length];
      const day = Math.min(28, 4 + n * 5);
      const taken = new Date(yr, mo, day, 12, 0, 0);
      const inEvent = evt && n < evt.count ? evt : null;
      const txt = inEvent ? eventTextFor(inEvent.key) : null;
      rows.push({
        id: `demo-photo-${i}`,
        child_id: DEMO_CHILD_ID,
        uploaded_by: DEMO_USER_ID,
        taken_at: taken.toISOString(),
        created_at: taken.toISOString(),
        caption: txt?.comment ?? null,
        event_id: inEvent?.id ?? null,
        storage_path: `demo/${i}.jpg`,
        thumbnail_path: `demo/thumbs/${i}.jpg`,
        signed_url: full(url),
        thumbnail_signed_url: thumb(url),
        is_shared: true,
        location_name: null,
        location_lat: null,
        location_lng: null,
        events: txt ? { name: txt.name, icon: '✦', color: '#D4793A' } : null,
        photo_tags: [],
      });
      i++;
    }
  });

  // Sort desc by taken_at to match Supabase default
  rows.sort((a, b) => b.taken_at.localeCompare(a.taken_at));
  return rows;
}

let _photoCache: DemoPhotoRow[] | null = null;
export function getDemoPhotoRows() {
  if (!_photoCache) _photoCache = buildDemoPhotoRows();
  return _photoCache;
}

// ---------- Family members ----------
export function getDemoFamilyMembers() {
  return [
    { id: 'fam-1', name: 'María García', role: 'owner', relationship: 'Madre' },
    { id: 'fam-2', name: 'Abuela Carmen', role: 'guest', relationship: 'Abuela' },
    { id: 'fam-3', name: 'Tío Javier', role: 'guest', relationship: 'Tío' },
  ];
}
