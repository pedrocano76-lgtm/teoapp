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
  const features: { icon: React.ReactNode; title: string; desc: string }[] = [
    {
      icon: <CalendarClock size={20} color={COLORS.primary} strokeWidth={1.7} />,
      title: 'Línea de tiempo automática',
      desc: 'Agrupa por meses y semanas desde el nacimiento, sin que hagas nada.',
    },
    {
      icon: <Star size={20} color={COLORS.primary} strokeWidth={1.7} />,
      title: 'Eventos y primeras veces',
      desc: 'Marca momentos únicos: primer baño, primera palabra, primer cumpleaños.',
    },
    {
      icon: <Users size={20} color={COLORS.primary} strokeWidth={1.7} />,
      title: 'Comparte con tu familia',
      desc: 'Invita por enlace. Abuelos, tíos, primos — cada uno con su rol.',
    },
    {
      icon: <MessageCircle size={20} color={COLORS.primary} strokeWidth={1.7} />,
      title: 'Fotos desde WhatsApp',
      desc: 'Sube fotos recibidas por WhatsApp sin perder la fecha original.',
    },
    {
      icon: <Copy size={20} color={COLORS.primary} strokeWidth={1.7} />,
      title: 'Detección de duplicados',
      desc: 'Encuentra y elimina fotos repetidas automáticamente.',
    },
    {
      icon: <MoonStar size={20} color={COLORS.primary} strokeWidth={1.7} />,
      title: 'Modo oscuro y claro',
      desc: 'Se adapta al sistema de tu móvil.',
    },
    {
      icon: <Smartphone size={20} color={COLORS.primary} strokeWidth={1.7} />,
      title: 'Funciona como app',
      desc: 'Instálala en tu móvil como una app nativa, sin pasar por ninguna tienda.',
    },
  ];

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh', ...sans }}>
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
          Entrar
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
            ✦ Beta · solo 10 plazas
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
            Las fotos de tu hijo,<br />ordenadas solas
          </h1>
          <p style={{ color: COLORS.secondary, fontSize: 16, lineHeight: 1.55, margin: '0 auto', maxWidth: 380 }}>
            Organiza cada momento por edad y evento. Comparte con tu familia sin perder ningún recuerdo.
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
            Empezar gratis →
          </Link>
          <p style={{ color: COLORS.muted, fontSize: 13, margin: 0 }}>Sin tarjeta. Sin compromiso.</p>
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
              <div style={{ fontWeight: 600, fontSize: 15, color: COLORS.text }}>Tu hijo</div>
              <div style={{ fontSize: 12, color: COLORS.secondary }}>línea de tiempo · todos los momentos</div>
            </div>
          </div>

          {/* Group 1 */}
          <GroupHeader label="6 meses" meta="marzo · 12 fotos" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 18 }}>
            <PhotoTile color={TONES[0]} />
            <PhotoTile color={TONES[1]} />
            <PhotoTile color={TONES[2]} />
            <PhotoTile color={TONES[3]} />
          </div>

          {/* Group 2 */}
          <GroupHeader label="7 meses" meta="abril · 8 fotos" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <PhotoTile color={TONES[1]} />
            <PhotoTile color={TONES[0]} />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {[
              { label: 'primer baño' },
              { label: 'parque' },
              { label: 'familia' },
              { label: '+ 12 más', muted: true },
            ].map(t => (
              <span
                key={t.label}
                style={{
                  background: '#EDE8DF',
                  color: t.muted ? COLORS.secondary : COLORS.text,
                  fontSize: 12,
                  padding: '5px 12px',
                  borderRadius: 999,
                }}
              >
                {t.label}
              </span>
            ))}
          </div>
        </section>

        {/* Features */}
        <section style={{ padding: '8px 0 24px' }}>
          <h2 style={{ ...serif, fontSize: 24, fontWeight: 500, margin: '0 0 20px', color: COLORS.text }}>
            Todo lo que necesitas
          </h2>
          {features.map(f => (
            <div key={f.title} style={{ display: 'flex', gap: 14, marginBottom: 20, alignItems: 'flex-start' }}>
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
                {f.icon}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: COLORS.text, marginBottom: 4 }}>
                  {f.title}
                </div>
                <div style={{ color: COLORS.secondary, fontSize: 14, lineHeight: 1.5 }}>{f.desc}</div>
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
            Tus fotos, solo tuyas
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
            Tus fotos se guardan en tu espacio privado. Nosotros nunca las vemos, ni las tocamos, ni las compartimos. Jamás.
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
            Las fotos de tus hijos son tuyas y solo tuyas. Memorydrawer no vende tus datos, no usa tus imágenes para
            publicidad ni para entrenar inteligencia artificial. Tu álbum familiar no es un producto.
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
            Código abierto — léelo en GitHub →
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
          Sé de los primeros en probarlo.
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
            Crear mi cuenta gratis →
          </Link>
          <p style={{ color: COLORS.muted, fontSize: 13, textAlign: 'center', marginTop: 12 }}>
            Solo 10 plazas disponibles en beta
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ background: COLORS.card, padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ ...serif, fontSize: 18, fontWeight: 500 }}>
          <span style={{ color: COLORS.text }}>memory</span>
          <span style={{ color: COLORS.primary }}>drawer</span>
        </div>
        <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 6 }}>cada momento, en su lugar</div>
      </footer>
    </div>
  );
}
