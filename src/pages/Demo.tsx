import { useEffect } from 'react';
import Index from './Index';
import { isDemoLang, enterDemoMode } from '@/lib/demo-data';

export default function Demo() {
  useEffect(() => { enterDemoMode(); }, []);
  const lang = isDemoLang();
  const banner =
    lang === 'es'
      ? 'Estás viendo una demo ◆ Crea tu cuenta gratis →'
      : "You're viewing a demo ◆ Create your free account →";

  return (
    <div className="memorydrawer-demo-shell">
      {/* Push the app down so the fixed banner doesn't overlap the sticky header. */}
      <style>{`
        .memorydrawer-demo-shell { padding-top: 40px; }
        .memorydrawer-demo-shell .glass { top: 40px !important; }
      `}</style>
      <a
        href="/auth?register=true"
        className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center text-center px-4 text-[13.5px] font-medium no-underline"
        style={{
          height: 40,
          background: '#D4793A',
          color: '#FFFFFF',
        }}
      >
        {banner}
      </a>
      <Index />
    </div>
  );
}
