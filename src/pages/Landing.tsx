import { Link } from 'react-router-dom';
import {
  CalendarClock,
  Star,
  Users,
  MessageCircle,
  Copy,
  MoonStar,
  Smartphone,
  Shield,
} from 'lucide-react';

const COLORS = {
  bg: '#F5F0E8',
  primary: '#D4793A',
  text: '#4A3728',
  secondary: '#7A6A5A',
  card: '#EDE0D4',
  muted: '#9A8A7A',
  privacy: '#E8E0D5',
};

// Brand-only photo placeholder tones
const TONES = ['#D4793A', '#E2CEBC', '#C8B4A2', '#EDE8DF'];

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' };
const sans = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

type Lang = 'es' | 'en';

function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'es';
  const raw = (navigator.languages && navigator.languages[0]) || navigator.language || 'es';
  return raw.toLowerCase().startsWith('es') ? 'es' : 'en';
}

const STRINGS = {
  es: {
    signIn: 'Entrar',
    badge: '✦ Beta · solo 10 plazas',
    heroTitle: ['Las fotos de tu hijo,', 'ordenadas solas'],
    heroSubtitle: 'Organiza cada momento por edad y evento. Comparte con tu familia sin perder ningún recuerdo.',
    ctaPrimary: 'Empezar gratis →',
    ctaFinal: 'Crear mi cuenta gratis →',
    ctaNote: 'Sin tarjeta. Sin compromiso.',
    ctaDemo: 'Ver demo sin registrarte →',
    ctaFinalNote: 'Solo 10 plazas disponibles en beta',
    timelineChild: 'Tu hijo',
    timelineSubtitle: 'línea de tiempo · todos los momentos',
    timelineMeta1: 'marzo · 12 fotos',
    timelineMeta2: 'abril · 8 fotos',
    timelineMonths1: '6 meses',
    timelineMonths2: '7 meses',
    tags: ['primer baño', 'parque', 'familia', '+ 12 más'],
    featuresTitle: 'Todo lo que necesitas',
    privacyTitle: 'Tus fotos, solo tuyas',
    privacyTrust: 'Tus fotos se guardan en tu espacio privado. Nosotros nunca las vemos, ni las tocamos, ni las compartimos. Jamás.',
    privacyBody: 'Las fotos de tus hijos son tuyas y solo tuyas. Memorydrawer no vende tus datos, no usa tus imágenes para publicidad ni para entrenar inteligencia artificial. Tu álbum familiar no es un producto.',
    github: 'Código abierto — léelo en GitHub →',
    betaLine: 'Sé de los primeros en probarlo.',
    footerTagline: 'cada momento, en su lugar',
    features: [
      ['Línea de tiempo automática', 'Agrupa por meses y semanas desde el nacimiento, sin que hagas nada.'],
      ['Eventos y primeras veces', 'Marca momentos únicos: primer baño, primera palabra, primer cumpleaños.'],
      ['Comparte con tu familia', 'Invita por enlace. Abuelos, tíos, primos — cada uno con su rol.'],
      ['Fotos desde WhatsApp', 'Sube fotos recibidas por WhatsApp sin perder la fecha original.'],
      ['Detección de duplicados', 'Encuentra y elimina fotos repetidas automáticamente.'],
      ['Modo oscuro y claro', 'Se adapta al sistema de tu móvil.'],
      ['Funciona como app', 'Instálala en tu móvil como una app nativa, sin pasar por ninguna tienda.'],
    ] as [string, string][],
  },
  en: {
    signIn: 'Sign in',
    badge: '✦ Beta · only 10 spots',
    heroTitle: ["Your child's photos,", 'organized automatically'],
    heroSubtitle: 'Group every moment by age and milestone. Share with your family without losing a single memory.',
    ctaPrimary: 'Get started free →',
    ctaFinal: 'Create my free account →',
    ctaNote: 'No card. No commitment.',
    ctaDemo: 'Try the demo without signing up →',
    ctaFinalNote: 'Only 10 beta spots available',
    timelineChild: 'Your child',
    timelineSubtitle: 'timeline · every moment',
    timelineMeta1: 'march · 12 photos',
    timelineMeta2: 'april · 8 photos',
    timelineMonths1: '6 months',
    timelineMonths2: '7 months',
    tags: ['first bath', 'park', 'family', '+ 12 more'],
    featuresTitle: 'Everything you need',
    privacyTitle: 'Your photos, yours alone',
    privacyTrust: 'Your photos are stored in your own private space. We never see them, access them, or share them. Ever.',
    privacyBody: "Your children's photos are not a product. Memorydrawer never sells your data, never uses your images for advertising or AI training. Your family album is not for sale.",
    github: 'Open source — read the code on GitHub →',
    betaLine: 'Be among the first to try it.',
    footerTagline: 'every moment, in its place',
    features: [
      ['Automatic timeline', 'Groups by months and weeks from birth, without you doing anything.'],
      ['Events & milestones', 'Mark unique moments: first bath, first word, first birthday.'],
      ['Share with family', 'Invite via link. Grandparents, aunts, uncles — each with their own role.'],
      ['WhatsApp photos', 'Upload photos received via WhatsApp without losing the original date.'],
      ['Duplicate detection', 'Find and remove repeated photos automatically.'],
      ['Dark & light mode', "Adapts to your phone's system settings."],
      ['Works as an app', 'Install it on your phone like a native app, no app store needed.'],
    ] as [string, string][],
  },
};

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="32" height="32" viewBox="0 0 160 160" fill="none" aria-hidden>
        <rect x="36" y="36" width="96" height="118" rx="10" fill="#C8B4A2" />
        <rect x="23" y="23" width="96" height="118" rx="10" fill="#E2CEBC" />
        <rect x="10" y="10" width="96" height="118" rx="10" fill="#D4793A" />
        <circle cx="58" cy="50" r="17" fill="#9E5520" opacity="0.2" />
        <rect x="19" y="87" width="78" height="32" rx="7" fill="#9E5520" opacity="0.16" />
      </svg>
      <span style={{ ...serif, fontSize: 20, fontWeight: 500, lineHeight: 1 }}>
        <span style={{ color: COLORS.text }}>memory</span>
        <span style={{ color: COLORS.primary }}>drawer</span>
      </span>
    </div>
  );
}

function GroupHeader({ label, meta }: { label: string; meta: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '0 0 8px' }}>
      <span style={{ ...serif, fontSize: 14, color: COLORS.primary }}>◆ {label}</span>
      <span style={{ fontSize: 11, color: COLORS.secondary, letterSpacing: 0.4, textTransform: 'uppercase' }}>
        {meta}
      </span>
    </div>
  );
}

function PhotoTile({ color }: { color: string }) {
  return <div style={{ background: color, aspectRatio: '4 / 5', borderRadius: 8 }} />;
}

export default function Landing() {
  const lang = detectLang();
  const t = STRINGS[lang];

  const featureIcons = [
    <CalendarClock size={20} color={COLORS.primary} strokeWidth={1.7} />,
    <Star size={20} color={COLORS.primary} strokeWidth={1.7} />,
    <Users size={20} color={COLORS.primary} strokeWidth={1.7} />,
    <MessageCircle size={20} color={COLORS.primary} strokeWidth={1.7} />,
    <Copy size={20} color={COLORS.primary} strokeWidth={1.7} />,
    <MoonStar size={20} color={COLORS.primary} strokeWidth={1.7} />,
    <Smartphone size={20} color={COLORS.primary} strokeWidth={1.7} />,
  ];

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh', ...sans }} lang={lang}>
      {/* Nav */}
      <header
        style={{
          maxWidth: 560,
          margin: '0 auto',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Logo />
        <Link
          to="/auth"
          style={{
            border: `1.5px solid ${COLORS.primary}`,
            color: COLORS.primary,
            padding: '8px 20px',
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          {t.signIn}
        </Link>
      </header>

      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 24px 40px' }}>
        {/* Hero */}
        <section style={{ textAlign: 'center', padding: '24px 0 8px' }}>
          <span
            style={{
              display: 'inline-block',
              background: COLORS.card,
              color: COLORS.text,
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {t.badge}
          </span>
          <h1
            style={{
              ...serif,
              fontSize: 38,
              lineHeight: 1.15,
              fontWeight: 500,
              margin: '24px 0 16px',
              color: COLORS.text,
            }}
          >
            {t.heroTitle[0]}<br />{t.heroTitle[1]}
          </h1>
          <p style={{ color: COLORS.secondary, fontSize: 16, lineHeight: 1.55, margin: '0 auto', maxWidth: 380 }}>
            {t.heroSubtitle}
          </p>
          <Link
            to="/auth"
            style={{
              display: 'block',
              background: COLORS.primary,
              color: 'white',
              textDecoration: 'none',
              padding: '16px 24px',
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 600,
              margin: '32px 0 12px',
              textAlign: 'center',
            }}
          >
            {t.ctaPrimary}
          </Link>
          <Link
            to="/demo"
            style={{
              display: 'block',
              background: 'transparent',
              color: COLORS.primary,
              border: `2px solid ${COLORS.primary}`,
              textDecoration: 'none',
              padding: '14px 24px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              margin: '0 0 12px',
              textAlign: 'center',
            }}
          >
            {t.ctaDemo}
          </Link>
          <p style={{ color: COLORS.muted, fontSize: 13, margin: 0 }}>{t.ctaNote}</p>
        </section>

        {/* Timeline preview card */}
        <section
          style={{
            background: 'white',
            borderRadius: 16,
            padding: 16,
            margin: '32px 0',
            boxShadow: '0 1px 3px rgba(74,55,40,0.04)',
          }}
        >
          <div
            style={{
              background: COLORS.card,
              borderRadius: 10,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: COLORS.primary,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
              }}
            >
              ✦
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: COLORS.text }}>{t.timelineChild}</div>
              <div style={{ fontSize: 12, color: COLORS.secondary }}>{t.timelineSubtitle}</div>
            </div>
          </div>

          {/* Group 1 */}
          <GroupHeader label={t.timelineMonths1} meta={t.timelineMeta1} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 18 }}>
            <PhotoTile color={TONES[0]} />
            <PhotoTile color={TONES[1]} />
            <PhotoTile color={TONES[2]} />
            <PhotoTile color={TONES[3]} />
          </div>

          {/* Group 2 */}
          <GroupHeader label={t.timelineMonths2} meta={t.timelineMeta2} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <PhotoTile color={TONES[1]} />
            <PhotoTile color={TONES[0]} />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {t.tags.map((label, i) => (
              <span
                key={label}
                style={{
                  background: '#EDE8DF',
                  color: i === t.tags.length - 1 ? COLORS.secondary : COLORS.text,
                  fontSize: 12,
                  padding: '5px 12px',
                  borderRadius: 999,
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </section>

        {/* Features */}
        <section style={{ padding: '8px 0 24px' }}>
          <h2 style={{ ...serif, fontSize: 24, fontWeight: 500, margin: '0 0 20px', color: COLORS.text }}>
            {t.featuresTitle}
          </h2>
          {t.features.map(([title, desc], i) => (
            <div key={title} style={{ display: 'flex', gap: 14, marginBottom: 20, alignItems: 'flex-start' }}>
              <div
                style={{
                  background: COLORS.card,
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {featureIcons[i]}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: COLORS.text, marginBottom: 4 }}>
                  {title}
                </div>
                <div style={{ color: COLORS.secondary, fontSize: 14, lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Privacy */}
        <section
          style={{
            background: COLORS.privacy,
            borderRadius: 16,
            padding: '28px 24px',
            margin: '24px 0',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Shield size={32} color={COLORS.primary} strokeWidth={1.7} />
          </div>
          <h3 style={{ ...serif, fontSize: 22, fontWeight: 500, margin: '0 0 10px', color: COLORS.text }}>
            {t.privacyTitle}
          </h3>
          <p
            style={{
              color: COLORS.text,
              fontSize: 15,
              lineHeight: 1.55,
              margin: '0 auto 14px',
              maxWidth: 440,
              fontWeight: 600,
            }}
          >
            {t.privacyTrust}
          </p>
          <p
            style={{
              color: COLORS.secondary,
              fontSize: 15,
              lineHeight: 1.55,
              margin: '0 auto',
              maxWidth: 420,
            }}
          >
            {t.privacyBody}
          </p>
        </section>

        {/* GitHub link */}
        <p style={{ textAlign: 'center', margin: '4px 0 8px', fontSize: 13 }}>
          <a
            href="https://github.com/pedrocano76-lgtm/teoapp"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: COLORS.muted, textDecoration: 'underline' }}
          >
            {t.github}
          </a>
        </p>

        {/* Beta line (replaces testimonial) */}
        <p
          style={{
            ...serif,
            fontStyle: 'italic',
            fontSize: 15,
            color: COLORS.secondary,
            textAlign: 'center',
            margin: '24px 0',
          }}
        >
          {t.betaLine}
        </p>

        {/* CTA final */}
        <section style={{ padding: '8px 0 32px' }}>
          <Link
            to="/auth"
            style={{
              display: 'block',
              background: COLORS.primary,
              color: 'white',
              textDecoration: 'none',
              padding: '16px 24px',
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            {t.ctaFinal}
          </Link>
          <p style={{ color: COLORS.muted, fontSize: 13, textAlign: 'center', marginTop: 12 }}>
            {t.ctaFinalNote}
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ background: COLORS.card, padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ ...serif, fontSize: 18, fontWeight: 500 }}>
          <span style={{ color: COLORS.text }}>memory</span>
          <span style={{ color: COLORS.primary }}>drawer</span>
        </div>
        <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 6 }}>{t.footerTagline}</div>
      </footer>
    </div>
  );
}
