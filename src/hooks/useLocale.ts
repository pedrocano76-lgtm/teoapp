import { useTranslation } from 'react-i18next';
import { es, enUS } from 'date-fns/locale';

export function useLocale() {
  const { i18n } = useTranslation();
  const isEs = i18n.language?.startsWith('es');
  return {
    lang: isEs ? 'es' : 'en',
    intlLocale: isEs ? 'es-ES' : 'en-US',
    dateFnsLocale: isEs ? es : enUS,
  };
}
