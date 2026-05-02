import { Link } from 'react-router-dom';

const COLORS = {
  bg: '#F5F0E8',
  primary: '#C8845A',
  text: '#4A3728',
  secondary: '#7A6A5A',
  green: '#8BAF8C',
  card: '#EDE0D4',
  muted: '#9A8A7A',
};

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' };
const sans = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 6,
          background: COLORS.primary,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        aria-hidden
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="2" y="5" width="18" height="13" rx="2" stroke="white" strokeWidth="1.6" />
          <line x1="2" y1="9" x2="20" y2="9" stroke="white" strokeWidth="1.6" />
          <line x1="7" y1="5" x2="7" y2="9" stroke="white" strokeWidth="1.6" />
          <circle cx="11" cy="14" r="2" fill="white" />
        </svg>
      </div>
      <span style={{ ...serif, fontSize: 20, fontWeight: 500, lineHeight: 1 }}>
        <span style={{ color: COLORS.text }}>memory</span>
        <span style={{ color: COLORS.primary }}>drawer</span>
      </span>
    </div>
  );
}

function Tile({ children, bg }: { children: React.ReactNode; bg: string }) {
  return (
    <div
      style={{
        background: bg,
        aspectRatio: '1 / 1',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {children}
    </div>
  );
}

const sage = '#D4E4D4';
const peach = '#F1DCC9';

export default function Landing() {
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

        {/* Preview card */}
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
              marginBottom: 14,
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <Tile bg={peach}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="15" r="6" fill={COLORS.primary} opacity="0.6" />
                <path d="M8 32c0-6 5-10 12-10s12 4 12 10" fill={COLORS.primary} opacity="0.6" />
              </svg>
            </Tile>
            <Tile bg={sage}>
              <svg width="36" height="36" viewBox="0 0 36 36">
                <rect x="6" y="6" width="24" height="24" rx="6" fill={COLORS.green} opacity="0.7" />
              </svg>
            </Tile>
            <Tile bg={peach}>
              <svg width="40" height="40" viewBox="0 0 40 40">
                <polygon points="20,8 34,30 6,30" fill={COLORS.primary} opacity="0.55" />
                <text x="30" y="14" fontSize="10" fill={COLORS.primary}>★</text>
              </svg>
            </Tile>
            <Tile bg={peach}>
              <svg width="40" height="30" viewBox="0 0 40 30">
                <rect x="6" y="20" width="6" height="8" fill={COLORS.primary} opacity="0.6" />
                <rect x="16" y="14" width="6" height="14" fill={COLORS.primary} opacity="0.6" />
                <rect x="26" y="6" width="6" height="22" fill={COLORS.primary} opacity="0.6" />
              </svg>
            </Tile>
            <Tile bg={sage}>
              <svg width="36" height="36" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="12" fill={COLORS.green} opacity="0.4" />
                <circle cx="18" cy="18" r="5" fill={COLORS.green} />
              </svg>
            </Tile>
            <Tile bg={peach}>
              <svg width="40" height="32" viewBox="0 0 40 32">
                <rect x="4" y="10" width="32" height="20" rx="3" fill={COLORS.primary} opacity="0.5" />
                <rect x="14" y="6" width="12" height="6" rx="1" fill={COLORS.primary} opacity="0.7" />
              </svg>
            </Tile>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {[
              { label: 'primer baño', bg: peach, color: COLORS.text },
              { label: 'parque', bg: sage, color: '#3d5d3d' },
              { label: 'familia', bg: peach, color: COLORS.text },
              { label: '+ 12 más', bg: peach, color: COLORS.secondary },
            ].map(t => (
              <span
                key={t.label}
                style={{
                  background: t.bg,
                  color: t.color,
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
          {[
            {
              title: 'Línea de tiempo automática',
              desc: 'Agrupa por meses y semanas desde el nacimiento, sin que hagas nada.',
              icon: (
                <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                  <rect x="3" y="5" width="16" height="14" rx="2" stroke={COLORS.primary} strokeWidth="1.6" />
                  <line x1="3" y1="9" x2="19" y2="9" stroke={COLORS.primary} strokeWidth="1.6" />
                </svg>
              ),
            },
            {
              title: 'Comparte con tu familia',
              desc: 'Invita por enlace. Abuelos, tíos — cada uno con su rol.',
              icon: (
                <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                  <circle cx="8" cy="11" r="4" stroke={COLORS.green} strokeWidth="1.6" />
                  <circle cx="15" cy="11" r="4" stroke={COLORS.green} strokeWidth="1.6" />
                </svg>
              ),
            },
            {
              title: 'Hitos y primeras veces',
              desc: 'Etiqueta los momentos únicos. Primer paso, primera palabra, primera sonrisa.',
              icon: (
                <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                  <polygon
                    points="11,3 13.5,8.5 19,9.3 15,13.2 16,19 11,16.3 6,19 7,13.2 3,9.3 8.5,8.5"
                    stroke={COLORS.primary}
                    strokeWidth="1.4"
                    fill="none"
                  />
                </svg>
              ),
            },
          ].map(f => (
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

        {/* Testimonio */}
        <section
          style={{
            background: 'white',
            borderRadius: 12,
            padding: '20px 22px',
            margin: '24px 0',
            boxShadow: '0 1px 3px rgba(74,55,40,0.04)',
          }}
        >
          <div style={{ ...serif, fontSize: 28, color: COLORS.primary, lineHeight: 1, marginBottom: 8 }}>
            ”
          </div>
          <p
            style={{
              ...serif,
              fontStyle: 'italic',
              fontSize: 15,
              lineHeight: 1.55,
              color: COLORS.text,
              margin: '0 0 14px',
            }}
          >
            Por fin tengo todas las fotos de Pablo organizadas. Antes era un caos total en el móvil y nunca encontraba nada.
          </p>
          <div style={{ fontSize: 13, color: COLORS.secondary }}>— Ana, mamá de Pablo · 8 meses</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.primary }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.card }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.card }} />
          </div>
        </section>

        {/* CTA final */}
        <section style={{ padding: '16px 0 32px' }}>
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
