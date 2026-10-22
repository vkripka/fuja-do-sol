/**
 * Textos do veredito em Português e Inglês — fonte única usada pelo motor (pt)
 * e pela interface quando o idioma ativo é o inglês.
 */
import type { GoldenSummary, LateralSide, OptimizationMode, SunFlip, SunSide, TripAnalysisResult } from './types';

export type Lang = 'pt' | 'en';

const SIDE_LABELS: Record<Lang, Record<SunSide | 'either' | 'center', string>> = {
  pt: {
    left: 'ESQUERDO',
    right: 'DIREITO',
    front: 'FRENTE',
    back: 'TRÁS',
    overhead: 'ZÊNITE',
    center: 'CENTRO',
    either: 'QUALQUER',
    none: 'NOITE',
  },
  en: {
    left: 'LEFT',
    right: 'RIGHT',
    front: 'FRONT',
    back: 'BACK',
    overhead: 'OVERHEAD',
    center: 'CENTER',
    either: 'EITHER',
    none: 'NIGHT',
  },
};

export function sideLabel(side: SunSide | 'either' | 'center', lang: Lang = 'pt'): string {
  return SIDE_LABELS[lang][side];
}

const opposite = (s: LateralSide): LateralSide => (s === 'left' ? 'right' : 'left');

export interface VerdictFacts {
  optimization: OptimizationMode;
  /** Minutos com o Sol acima do horizonte. */
  daylight: number;
  shadeSide: LateralSide | 'either';
  advantagePct: number;
  sunlit: { left: number; right: number; front: number; back: number };
  flips: SunFlip[];
  golden: GoldenSummary;
  /** Maior energia lateral (kWh/m²). */
  lateralMax: number;
}

export interface VerdictText {
  verdict: string;
  verdictDetail: string;
}

function flipNote(count: number, lang: Lang): string {
  if (count === 0) return '';
  if (lang === 'en') return ` The sun switches sides ${count === 1 ? 'once' : `${count} times`} along the way.`;
  return ` O sol troca de lado ${count === 1 ? '1 vez' : `${count} vezes`} no caminho.`;
}

export function buildVerdict(v: VerdictFacts, lang: Lang = 'pt'): VerdictText {
  const en = lang === 'en';
  const side = (s: SunSide | 'either') => sideLabel(s, lang);
  if (v.daylight <= 0) {
    return en
      ? {
          verdict: 'Night trip: 0% direct sun',
          verdictDetail: 'The sun stays below the horizon for the whole trip. Pick your seat for comfort — no side gets sun.',
        }
      : {
          verdict: 'Viagem noturna: 0% de sol direto',
          verdictDetail: 'O Sol fica abaixo do horizonte durante todo o trajeto. Escolha a poltrona pelo conforto — nenhum lado recebe sol.',
        };
  }
  const flips = flipNote(v.flips.length, lang);

  if (v.optimization === 'golden') {
    if (v.golden.bestSide) {
      const ev = v.golden.events.find((e) => e.side === v.golden.bestSide) ?? v.golden.events[0];
      if (en) {
        const what = ev ? (ev.kind === 'sunset' ? 'the sunset' : 'the sunrise') : 'golden hour';
        return {
          verdict: `Golden hour through the ${side(v.golden.bestSide)} window`,
          verdictDetail: `Sit by the ${side(v.golden.bestSide).toLowerCase()} window to watch ${what} during the trip.${flips}`,
        };
      }
      const what = ev ? (ev.kind === 'sunset' ? 'o pôr do sol' : 'o nascer do sol') : 'a golden hour';
      return {
        verdict: `Golden hour pela janela ${side(v.golden.bestSide)}`,
        verdictDetail: `Sente na janela do lado ${side(v.golden.bestSide).toLowerCase()} para ver ${what} durante a viagem.${flips}`,
      };
    }
    if (v.golden.available) {
      const ahead = v.golden.front >= v.golden.back;
      const ev = v.golden.events[0];
      if (en) {
        const what = ev ? (ev.kind === 'sunset' ? 'The sunset' : 'The sunrise') : 'Golden hour';
        return {
          verdict: ahead ? 'Golden hour AHEAD' : 'Golden hour BEHIND',
          verdictDetail: `${what} is ${ahead ? 'ahead of the vehicle — front seats and the windshield have the best view' : 'behind the vehicle — pick the rear, the stern or the open deck'}.${flips}`,
        };
      }
      const what = ev ? (ev.kind === 'sunset' ? 'O pôr do sol' : 'O nascer do sol') : 'A golden hour';
      return {
        verdict: ahead ? 'Golden hour pela FRENTE' : 'Golden hour pela TRASEIRA',
        verdictDetail: `${what} fica ${ahead ? 'à frente do veículo — bancos dianteiros e para-brisa têm a melhor vista' : 'atrás do veículo — prefira a traseira, a popa ou o convés aberto'}.${flips}`,
      };
    }
    if (en) {
      return {
        verdict: 'No golden hour on this trip',
        verdictDetail:
          'The sun never gets low on the horizon during the trip. Try the Best Time tab to find a departure with sunrise or sunset.' +
          (v.shadeSide !== 'either' ? ` To stay cool, sit on the ${side(v.shadeSide).toLowerCase()} side.` : ''),
      };
    }
    return {
      verdict: 'Sem golden hour nesta viagem',
      verdictDetail:
        'O Sol não fica baixo no horizonte durante o trajeto. Tente o Otimizador para achar um horário com pôr ou nascer do sol.' +
        (v.shadeSide !== 'either' ? ` Para fugir do calor, prefira o lado ${side(v.shadeSide).toLowerCase()}.` : ''),
    };
  }

  if (v.shadeSide === 'either') {
    if (v.lateralMax < 0.02) {
      return en
        ? {
            verdict: 'Weak sun: either side works',
            verdictDetail: `Very little sun reaches the side windows (low, too high or from the front/back).${flips}`,
          }
        : {
            verdict: 'Sol fraco: qualquer lado serve',
            verdictDetail: `O sol nas janelas laterais é mínimo (baixo, alto demais ou pela frente/trás).${flips}`,
          };
    }
    return en
      ? {
          verdict: 'Sun balanced between sides',
          verdictDetail: `Both sides get a similar amount of sun.${flips} Prefer the aisle and use the curtain in the flagged stretches.`,
        }
      : {
          verdict: 'Sol equilibrado entre os lados',
          verdictDetail: `Os dois lados recebem sol em quantidade parecida.${flips} Prefira o corredor e use a cortina nos trechos indicados.`,
        };
  }

  const sunny = opposite(v.shadeSide);
  if (en) {
    return {
      verdict: `Sit on the ${side(v.shadeSide)} side — ${v.advantagePct}% cooler`,
      verdictDetail: `The ${side(sunny).toLowerCase()} side gets direct sun for about ${Math.round(v.sunlit[sunny])} min, versus ${Math.round(
        v.sunlit[v.shadeSide],
      )} min on the ${side(v.shadeSide).toLowerCase()} side.${flips}`,
    };
  }
  return {
    verdict: `Sente do lado ${side(v.shadeSide)} — ${v.advantagePct}% mais fresco`,
    verdictDetail: `O lado ${side(sunny).toLowerCase()} recebe sol direto por cerca de ${Math.round(v.sunlit[sunny])} min, contra ${Math.round(
      v.sunlit[v.shadeSide],
    )} min do lado ${side(v.shadeSide).toLowerCase()}.${flips}`,
  };
}

/** Veredito no idioma pedido (o resultado do motor já traz o texto em português). */
export function localizeVerdict(r: TripAnalysisResult, lang: Lang): VerdictText {
  if (lang === 'pt') return { verdict: r.verdict, verdictDetail: r.verdictDetail };
  return buildVerdict(
    {
      optimization: r.input.optimization,
      daylight: r.daylightMinutes,
      shadeSide: r.shadeSide,
      advantagePct: r.advantagePct,
      sunlit: r.sunlitMinutes,
      flips: r.flips,
      golden: r.golden,
      lateralMax: Math.max(r.energy.left, r.energy.right),
    },
    lang,
  );
}
