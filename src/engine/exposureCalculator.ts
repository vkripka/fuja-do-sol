/**
 * Integração da irradiância solar nas faces do veículo ao longo da viagem:
 * ângulo relativo Δψ, decomposição Esquerda/Direita/Frente/Trás/Teto, bloqueio do teto,
 * pontos de virada solar, janelas de "fechar a cortina", UV e golden hour.
 */
import { clamp, cosD, normalizeSigned, round, sinD } from './math';
import { defaultAltitude, defaultPath, discretizeRoute } from './routeDiscretizer';
import { pathLengthKm } from './geodesic';
import { getSolarPosition, goldenWeight, SUNRISE_ELEVATION } from './solarPosition';
import type {
  ExposureWindow,
  GoldenEvent,
  GoldenSummary,
  LateralSide,
  RouteSegment,
  SegmentExposure,
  SideComponents,
  SolarPosition,
  SunFlip,
  SunSide,
  TripAnalysisResult,
  TripInput,
} from './types';

/** Irradiância numa face (kW/m²) a partir da qual consideramos "sol na janela". */
export const SUN_THRESHOLD = 0.08;
/** Irradiância média (kW/m²) que corresponde a calor 100/100. */
export const HEAT_REFERENCE = 0.45;
/** Minutos-peso de golden hour que equivalem a uma vista 100/100. */
export const GOLDEN_REFERENCE = 30;

const ZERO: SideComponents = Object.freeze({ left: 0, right: 0, front: 0, back: 0, roof: 0 });

/** Δψ = (γ_sun − θ_vec + 540) mod 360 − 180 ∈ [-180, 180). Positivo = Sol à direita. */
export function relativeSunAngle(sunAzimuth: number, heading: number): number {
  return normalizeSigned(sunAzimuth - heading);
}

/**
 * Fator de teto: F = cos(α) · clamp((82° − α)/35°, 0.15, 1).
 * Projeta o feixe numa janela vertical e modela o beiral/teto bloqueando o Sol alto.
 */
export function roofFactor(elevation: number): number {
  const e = Math.max(elevation, 0);
  return cosD(e) * clamp((82 - e) / 35, 0.15, 1);
}

export function classifySide(relativeAngle: number, sun: Pick<SolarPosition, 'isUp' | 'elevation'>): SunSide {
  if (!sun.isUp) return 'none';
  if (sun.elevation > 75) return 'overhead';
  return lateralClassification(relativeAngle);
}

function lateralClassification(relativeAngle: number): SunSide {
  const a = Math.abs(relativeAngle);
  if (a <= 25) return 'front';
  if (a >= 155) return 'back';
  return relativeAngle > 0 ? 'right' : 'left';
}

/** Irradiância efetiva em cada face do veículo (kW/m²). */
export function computeComponents(sun: SolarPosition, relativeAngle: number): SideComponents {
  if (!sun.isUp || sun.directIrradiance <= 0) return { ...ZERO };
  const I = sun.directIrradiance;
  const e = Math.max(sun.elevation, 0);
  const lateral = I * Math.abs(sinD(relativeAngle)) * roofFactor(e);
  const longitudinal = I * cosD(e) * cosD(relativeAngle);
  return {
    left: relativeAngle < 0 ? lateral : 0,
    right: relativeAngle > 0 ? lateral : 0,
    front: Math.max(0, longitudinal),
    back: Math.max(0, -longitudinal),
    roof: I * sinD(e),
  };
}

/** Peso de vista de pôr/nascer do Sol (0..1) por face. */
export function computeGolden(sun: SolarPosition, relativeAngle: number): SideComponents {
  const w = goldenWeight(sun.elevation, sun.horizonDip);
  if (w <= 0) return { ...ZERO };
  const lateral = w * Math.abs(sinD(relativeAngle));
  const longitudinal = w * cosD(relativeAngle);
  return {
    left: relativeAngle < 0 ? lateral : 0,
    right: relativeAngle > 0 ? lateral : 0,
    front: Math.max(0, longitudinal),
    back: Math.max(0, -longitudinal),
    roof: 0,
  };
}

export function segmentExposure(segment: RouteSegment, altitudeMeters = 0): SegmentExposure {
  const sun = getSolarPosition(segment.time, segment.midpoint, altitudeMeters);
  const relativeAngle = relativeSunAngle(sun.azimuth, segment.bearing);
  return {
    segment,
    sun,
    relativeAngle,
    side: classifySide(relativeAngle, sun),
    components: computeComponents(sun, relativeAngle),
    golden: computeGolden(sun, relativeAngle),
  };
}

type Face = 'left' | 'right' | 'front' | 'back';

/**
 * Detecta os momentos em que o sol troca de lado. Histerese: o novo lado precisa
 * persistir por `minMinutes` (e no mínimo 2 segmentos) — ignora curvas rápidas.
 */
export function detectFlips(exposures: readonly SegmentExposure[], minMinutes = 8): SunFlip[] {
  const flips: SunFlip[] = [];
  const dt = exposures.length > 0 ? exposures[0].segment.durationMinutes : 1;
  const minRun = Math.max(2, Math.ceil(minMinutes / dt));
  let current: LateralSide | null = null;
  let candidate: LateralSide | null = null;
  let candidateStart = -1;
  let run = 0;
  for (let i = 0; i < exposures.length; i++) {
    const c = exposures[i].components;
    const lateral: LateralSide | null =
      c.left > SUN_THRESHOLD && c.left > c.right ? 'left' : c.right > SUN_THRESHOLD && c.right > c.left ? 'right' : null;
    if (lateral === null) continue;
    if (current === null) {
      current = lateral;
      continue;
    }
    if (lateral === current) {
      candidate = null;
      run = 0;
      continue;
    }
    if (candidate !== lateral) {
      candidate = lateral;
      candidateStart = i;
      run = 1;
    } else {
      run++;
    }
    if (run >= minRun) {
      const at = exposures[candidateStart].segment;
      flips.push({
        index: candidateStart,
        minutesFromStart: at.minutesFromStart,
        time: at.time,
        from: current,
        to: lateral,
        location: at.midpoint,
      });
      current = lateral;
      candidate = null;
      run = 0;
    }
  }
  return flips;
}

/** Intervalos contínuos com sol forte numa face (≥ `minMinutes`). */
export function exposureWindows(
  exposures: readonly SegmentExposure[],
  face: Face,
  minMinutes = 6,
  threshold = SUN_THRESHOLD * 1.5,
): ExposureWindow[] {
  const out: ExposureWindow[] = [];
  let start = -1;
  let gap = 0;
  let peak = 0;
  let peakUv = 0;
  const flush = (endIdx: number): void => {
    const s = exposures[start].segment;
    const e = exposures[endIdx].segment;
    const startMinute = s.minutesFromStart - s.durationMinutes / 2;
    const endMinute = e.minutesFromStart + e.durationMinutes / 2;
    if (endMinute - startMinute >= minMinutes) {
      out.push({
        side: face,
        startMinute,
        endMinute,
        startTime: new Date(s.time.getTime() - (s.durationMinutes / 2) * 60000),
        endTime: new Date(e.time.getTime() + (e.durationMinutes / 2) * 60000),
        peakIrradiance: peak,
        peakUv,
      });
    }
  };
  let lastHot = -1;
  for (let i = 0; i < exposures.length; i++) {
    const v = exposures[i].components[face];
    if (v > threshold) {
      if (start < 0) {
        start = i;
        peak = 0;
        peakUv = 0;
      }
      gap = 0;
      lastHot = i;
      peak = Math.max(peak, v);
      peakUv = Math.max(peakUv, exposures[i].sun.uvIndex);
    } else if (start >= 0) {
      gap++;
      if (gap > 1) {
        flush(lastHot);
        start = -1;
        gap = 0;
      }
    }
  }
  if (start >= 0) flush(lastHot);
  return out;
}

/** Eventos de nascer/pôr do Sol que acontecem durante a viagem. */
export function detectGoldenEvents(exposures: readonly SegmentExposure[]): GoldenEvent[] {
  const events: GoldenEvent[] = [];
  for (let i = 1; i < exposures.length; i++) {
    const a = exposures[i - 1];
    const b = exposures[i];
    const h0a = SUNRISE_ELEVATION - a.sun.horizonDip;
    const h0b = SUNRISE_ELEVATION - b.sun.horizonDip;
    const da = a.sun.elevation - h0a;
    const db = b.sun.elevation - h0b;
    if ((da < 0 && db >= 0) || (da >= 0 && db < 0)) {
      const f = da === db ? 0 : da / (da - db);
      const ta = a.segment.time.getTime();
      const tb = b.segment.time.getTime();
      const rel = f < 0.5 ? a.relativeAngle : b.relativeAngle;
      events.push({
        kind: db > da ? 'sunrise' : 'sunset',
        time: new Date(ta + f * (tb - ta)),
        minutesFromStart: a.segment.minutesFromStart + f * (b.segment.minutesFromStart - a.segment.minutesFromStart),
        side: lateralClassification(rel),
        azimuth: f < 0.5 ? a.sun.azimuth : b.sun.azimuth,
      });
    }
  }
  return events;
}

export function sideLabel(side: SunSide | 'either' | 'center'): string {
  switch (side) {
    case 'left':
      return 'ESQUERDO';
    case 'right':
      return 'DIREITO';
    case 'front':
      return 'FRENTE';
    case 'back':
      return 'TRÁS';
    case 'overhead':
      return 'ZÊNITE';
    case 'center':
      return 'CENTRO';
    case 'either':
      return 'QUALQUER';
    default:
      return 'NOITE';
  }
}

const opposite = (s: LateralSide): LateralSide => (s === 'left' ? 'right' : 'left');

/** Análise completa de exposição solar de uma viagem. */
export function analyzeTrip(input: TripInput): TripAnalysisResult {
  const path = input.path && input.path.length >= 2 ? input.path : defaultPath(input.origin, input.destination);
  const altitude = input.altitudeMeters ?? defaultAltitude(input.mode);
  const segments = discretizeRoute(path, input.departure, input.durationMinutes, { segments: input.segmentCount });
  const exposures = segments.map((s) => segmentExposure(s, altitude));
  const duration = input.durationMinutes;
  const hours = duration / 60;

  const energy: SideComponents = { left: 0, right: 0, front: 0, back: 0, roof: 0 };
  const sunlit = { left: 0, right: 0, front: 0, back: 0 };
  const goldenTotals = { left: 0, right: 0, front: 0, back: 0 };
  let daylight = 0;
  let peakUv = 0;
  for (const ex of exposures) {
    const dt = ex.segment.durationMinutes;
    for (const k of ['left', 'right', 'front', 'back', 'roof'] as const) energy[k] += (ex.components[k] * dt) / 60;
    for (const k of ['left', 'right', 'front', 'back'] as const) {
      if (ex.components[k] > SUN_THRESHOLD) sunlit[k] += dt;
      goldenTotals[k] += ex.golden[k] * dt;
    }
    if (ex.sun.isUp) {
      daylight += dt;
      peakUv = Math.max(peakUv, ex.sun.uvIndex);
    }
  }

  const faceTotal = energy.left + energy.right + energy.front + energy.back;
  const share = (v: number): number => (faceTotal > 0 ? round((100 * v) / faceTotal, 1) : 0);
  const lateralMax = Math.max(energy.left, energy.right);
  const lateralMin = Math.min(energy.left, energy.right);
  const advantagePct = lateralMax > 0 ? Math.round((100 * (lateralMax - lateralMin)) / lateralMax) : 0;
  let shadeSide: LateralSide | 'either' = 'either';
  if (lateralMax >= 0.02 && advantagePct >= 12) shadeSide = energy.left < energy.right ? 'left' : 'right';

  const comfort = (e: number): number => Math.round(100 * (1 - Math.min(1, e / hours / HEAT_REFERENCE)));

  const events = detectGoldenEvents(exposures);
  const goldenLateralMax = Math.max(goldenTotals.left, goldenTotals.right);
  const golden: GoldenSummary = {
    available: goldenTotals.left + goldenTotals.right + goldenTotals.front + goldenTotals.back > 1,
    left: round(goldenTotals.left, 1),
    right: round(goldenTotals.right, 1),
    front: round(goldenTotals.front, 1),
    back: round(goldenTotals.back, 1),
    bestSide: goldenLateralMax > 0.5 ? (goldenTotals.left >= goldenTotals.right ? 'left' : 'right') : null,
    events,
  };

  const recommendedSide: LateralSide | 'either' =
    input.optimization === 'golden' ? golden.bestSide ?? shadeSide : shadeSide;

  const flips = detectFlips(exposures);
  const curtainAlerts = [
    ...exposureWindows(exposures, 'left'),
    ...exposureWindows(exposures, 'right'),
    ...exposureWindows(exposures, 'front'),
  ].sort((a, b) => a.startMinute - b.startMinute);

  const nightFraction = duration > 0 ? clamp(1 - daylight / duration, 0, 1) : 1;
  const { verdict, verdictDetail } = buildVerdict({
    optimization: input.optimization,
    daylight,
    shadeSide,
    advantagePct,
    sunlit,
    flips,
    golden,
    lateralMax,
  });

  return {
    input,
    segments: exposures,
    totalDistanceKm: pathLengthKm(path),
    durationMinutes: duration,
    energy,
    sunShare: { left: share(energy.left), right: share(energy.right), front: share(energy.front), back: share(energy.back) },
    sunlitMinutes: {
      left: Math.round(sunlit.left),
      right: Math.round(sunlit.right),
      front: Math.round(sunlit.front),
      back: Math.round(sunlit.back),
    },
    shadePct: {
      left: Math.round(100 * (1 - sunlit.left / duration)),
      right: Math.round(100 * (1 - sunlit.right / duration)),
    },
    thermalComfort: { left: comfort(energy.left), right: comfort(energy.right) },
    recommendedSide,
    shadeSide,
    advantagePct,
    nightFraction,
    daylightMinutes: Math.round(daylight),
    flips,
    curtainAlerts,
    peakUv: round(peakUv, 1),
    golden,
    verdict,
    verdictDetail,
  };
}

interface VerdictInput {
  optimization: TripInput['optimization'];
  daylight: number;
  shadeSide: LateralSide | 'either';
  advantagePct: number;
  sunlit: { left: number; right: number; front: number; back: number };
  flips: SunFlip[];
  golden: GoldenSummary;
  lateralMax: number;
}

function buildVerdict(v: VerdictInput): { verdict: string; verdictDetail: string } {
  if (v.daylight <= 0) {
    return {
      verdict: 'Viagem noturna: 0% de sol direto',
      verdictDetail: 'O Sol fica abaixo do horizonte durante todo o trajeto. Escolha a poltrona pelo conforto — nenhum lado recebe sol.',
    };
  }
  const flipNote =
    v.flips.length > 0
      ? ` O sol troca de lado ${v.flips.length === 1 ? '1 vez' : `${v.flips.length} vezes`} no caminho.`
      : '';
  if (v.optimization === 'golden') {
    if (v.golden.bestSide) {
      const ev = v.golden.events.find((e) => e.side === v.golden.bestSide) ?? v.golden.events[0];
      const what = ev ? (ev.kind === 'sunset' ? 'o pôr do sol' : 'o nascer do sol') : 'a golden hour';
      return {
        verdict: `Golden hour pela janela ${sideLabel(v.golden.bestSide)}`,
        verdictDetail: `Sente na janela do lado ${sideLabel(v.golden.bestSide).toLowerCase()} para ver ${what} durante a viagem.${flipNote}`,
      };
    }
    if (v.golden.available) {
      const ahead = v.golden.front >= v.golden.back;
      const ev = v.golden.events[0];
      const what = ev ? (ev.kind === 'sunset' ? 'O pôr do sol' : 'O nascer do sol') : 'A golden hour';
      return {
        verdict: ahead ? 'Golden hour pela FRENTE' : 'Golden hour pela TRASEIRA',
        verdictDetail: `${what} fica ${ahead ? 'à frente do veículo — bancos dianteiros e para-brisa têm a melhor vista' : 'atrás do veículo — prefira a traseira, a popa ou o convés aberto'}.${flipNote}`,
      };
    }
    return {
      verdict: 'Sem golden hour nesta viagem',
      verdictDetail:
        'O Sol não fica baixo no horizonte durante o trajeto. Tente o Otimizador para achar um horário com pôr ou nascer do sol.' +
        (v.shadeSide !== 'either' ? ` Para fugir do calor, prefira o lado ${sideLabel(v.shadeSide).toLowerCase()}.` : ''),
    };
  }
  if (v.shadeSide === 'either') {
    if (v.lateralMax < 0.02) {
      return {
        verdict: 'Sol fraco: qualquer lado serve',
        verdictDetail: `O sol nas janelas laterais é mínimo (baixo, alto demais ou pela frente/trás).${flipNote}`,
      };
    }
    return {
      verdict: 'Sol equilibrado entre os lados',
      verdictDetail: `Os dois lados recebem sol em quantidade parecida.${flipNote} Prefira o corredor e use a cortina nos trechos indicados.`,
    };
  }
  const sunny = opposite(v.shadeSide);
  return {
    verdict: `Sente do lado ${sideLabel(v.shadeSide)} — ${v.advantagePct}% mais fresco`,
    verdictDetail: `O lado ${sideLabel(sunny).toLowerCase()} recebe sol direto por cerca de ${Math.round(
      v.sunlit[sunny],
    )} min, contra ${Math.round(v.sunlit[v.shadeSide])} min do lado ${sideLabel(v.shadeSide).toLowerCase()}.${flipNote}`,
  };
}

/** Exposição no minuto `minute` da viagem (para o scrubber). */
export function exposureAtMinute(result: TripAnalysisResult, minute: number): SegmentExposure {
  const n = result.segments.length;
  const idx = clamp(Math.floor((minute / result.durationMinutes) * n), 0, n - 1);
  return result.segments[idx];
}
