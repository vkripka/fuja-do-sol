/** Acesso aos textos no idioma escolhido em Ajustes. */
import { useTrip } from '../context/TripContext';
import { STRINGS, type Lang, type Strings } from './strings';

export { dateParts, STRINGS, type Lang, type Strings } from './strings';

export function useI18n(): { lang: Lang; s: Strings } {
  const { preferences } = useTrip();
  const lang = preferences.language;
  return { lang, s: STRINGS[lang] };
}
