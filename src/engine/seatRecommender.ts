/**
 * Modelagem de cabine e matriz de calor por assento para os 5 modais,
 * com recomendação do "Melhor Assento" nos modos Fuja do Sol e Golden Hour.
 */
import { HEAT_REFERENCE, GOLDEN_REFERENCE, SUN_THRESHOLD } from './exposureCalculator';
import { clamp, round } from './math';
import type {
  CabinLayout,
  CabinZone,
  LateralSide,
  OptimizationMode,
  Seat,
  SeatPosition,
  SeatPreferences,
  SeatRecommendation,
  SeatScore,
  SideComponents,
  TransportMode,
  TripAnalysisResult,
  UvLevel,
} from './types';
import type { Lang } from './verdict';

const zoneOf = (row: number, rows: number): CabinZone => {
  const f = (row - 0.5) / rows;
  return f < 0.3 ? 'front' : f < 0.72 ? 'middle' : 'back';
};

function seat(partial: Omit<Seat, 'selectable'> & { selectable?: boolean }): Seat {
  return { selectable: true, ...partial };
}

/** Ônibus rodoviário 44 lugares: ímpares na janela, pares no corredor (padrão brasileiro). */
function busLayout(): CabinLayout {
  const rows = 11;
  const seats: Seat[] = [];
  for (let r = 1; r <= rows; r++) {
    const y = 0.16 + ((r - 0.5) / rows) * 0.8;
    const zone = zoneOf(r, rows);
    const base = 4 * (r - 1);
    seats.push(
      seat({ id: `bus-${base + 1}`, label: String(base + 1), row: r, col: 0, position: 'window', side: 'left', zone, x: 0.13, y }),
      seat({ id: `bus-${base + 2}`, label: String(base + 2), row: r, col: 1, position: 'aisle', side: 'left', zone, x: 0.32, y }),
      seat({ id: `bus-${base + 4}`, label: String(base + 4), row: r, col: 3, position: 'aisle', side: 'right', zone, x: 0.68, y }),
      seat({ id: `bus-${base + 3}`, label: String(base + 3), row: r, col: 4, position: 'window', side: 'right', zone, x: 0.87, y }),
    );
  }
  return { mode: 'bus', name: 'Ônibus Rodoviário (44 lugares)', rows, columns: 5, seats, aspect: 0.42 };
}

/** Avião narrow-body 3x3 (A-F), 20 fileiras, asas nas fileiras 10-16. */
function planeLayout(): CabinLayout {
  const rows = 20;
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const pos: SeatPosition[] = ['window', 'middle', 'aisle', 'aisle', 'middle', 'window'];
  const xs = [0.2, 0.32, 0.44, 0.56, 0.68, 0.8];
  const seats: Seat[] = [];
  for (let r = 1; r <= rows; r++) {
    const y = 0.17 + ((r - 0.5) / rows) * 0.74;
    for (let c = 0; c < 6; c++) {
      seats.push(
        seat({
          id: `plane-${r}${letters[c]}`,
          label: `${r}${letters[c]}`,
          row: r,
          col: c < 3 ? c : c + 1,
          position: pos[c],
          side: c < 3 ? 'left' : 'right',
          zone: zoneOf(r, rows),
          x: xs[c],
          y,
          overWing: r >= 10 && r <= 16,
        }),
      );
    }
  }
  return { mode: 'plane', name: 'Avião Comercial (3x3, 120 lugares)', rows, columns: 7, seats, wingRows: [10, 16], aspect: 0.4 };
}

/** Carro de passeio 5 lugares (motorista à esquerda, padrão Brasil). */
function carLayout(): CabinLayout {
  const seats: Seat[] = [
    seat({ id: 'car-driver', label: 'Motorista', row: 1, col: 0, position: 'driver', side: 'left', zone: 'front', x: 0.31, y: 0.42, selectable: false }),
    seat({ id: 'car-front-right', label: 'Carona', row: 1, col: 2, position: 'window', side: 'right', zone: 'front', x: 0.69, y: 0.42 }),
    seat({ id: 'car-rear-left', label: 'Traseiro Esq.', row: 2, col: 0, position: 'window', side: 'left', zone: 'back', x: 0.27, y: 0.68 }),
    seat({ id: 'car-rear-center', label: 'Traseiro Centro', row: 2, col: 1, position: 'center', side: 'center', zone: 'back', x: 0.5, y: 0.68 }),
    seat({ id: 'car-rear-right', label: 'Traseiro Dir.', row: 2, col: 2, position: 'window', side: 'right', zone: 'back', x: 0.73, y: 0.68 }),
  ];
  return { mode: 'car', name: 'Carro de Passeio (5 lugares)', rows: 2, columns: 3, seats, aspect: 0.5 };
}

/** Vagão de trem 2+2 com janelas panorâmicas, 14 fileiras. */
function trainLayout(): CabinLayout {
  const rows = 14;
  const letters = ['A', 'B', 'C', 'D'];
  const pos: SeatPosition[] = ['window', 'aisle', 'aisle', 'window'];
  const xs = [0.16, 0.34, 0.66, 0.84];
  const seats: Seat[] = [];
  for (let r = 1; r <= rows; r++) {
    const y = 0.08 + ((r - 0.5) / rows) * 0.84;
    for (let c = 0; c < 4; c++) {
      seats.push(
        seat({
          id: `train-${r}${letters[c]}`,
          label: `${r}${letters[c]}`,
          row: r,
          col: c < 2 ? c : c + 1,
          position: pos[c],
          side: c < 2 ? 'left' : 'right',
          zone: zoneOf(r, rows),
          x: xs[c],
          y,
        }),
      );
    }
  }
  return { mode: 'train', name: 'Vagão de Trem Panorâmico (56 lugares)', rows, columns: 5, seats, aspect: 0.36 };
}

/** Barco/balsa/catamarã: salão coberto (bombordo, centro, estribordo) + convés aberto na popa. */
function boatLayout(): CabinLayout {
  const cabinRows = 6;
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const pos: SeatPosition[] = ['window', 'aisle', 'center', 'aisle', 'window'];
  const sides: Array<LateralSide | 'center'> = ['left', 'left', 'center', 'right', 'right'];
  const xs = [0.2, 0.35, 0.5, 0.65, 0.8];
  const seats: Seat[] = [];
  for (let r = 1; r <= cabinRows; r++) {
    const y = 0.2 + ((r - 0.5) / cabinRows) * 0.48;
    for (let c = 0; c < 5; c++) {
      seats.push(
        seat({
          id: `boat-${r}${letters[c]}`,
          label: `${r}${letters[c]}`,
          row: r,
          col: c,
          position: pos[c],
          side: sides[c],
          zone: r <= 2 ? 'front' : 'middle',
          x: xs[c],
          y,
        }),
      );
    }
  }
  const deckSides: Array<LateralSide | 'center'> = ['left', 'center', 'right'];
  let n = 1;
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      seats.push(
        seat({
          id: `boat-deck-${n}`,
          label: `C${n}`,
          row: cabinRows + 1 + r,
          col: c,
          position: 'deck',
          side: deckSides[c],
          zone: 'back',
          x: [0.27, 0.5, 0.73][c],
          y: 0.78 + r * 0.09,
        }),
      );
      n++;
    }
  }
  return { mode: 'boat', name: 'Barco / Balsa / Catamarã', rows: cabinRows + 2, columns: 5, seats, aspect: 0.48 };
}

export function buildCabinLayout(mode: TransportMode): CabinLayout {
  switch (mode) {
    case 'bus':
      return busLayout();
    case 'plane':
      return planeLayout();
    case 'car':
      return carLayout();
    case 'train':
      return trainLayout();
    case 'boat':
      return boatLayout();
  }
}

/** Pesos de exposição de um assento a cada face do veículo. */
export interface SeatWeights extends SideComponents {
  /** Transmissão de UV do vidro dominante (1 = ao ar livre). */
  uvGlass: number;
}

export function seatWeights(s: Seat, mode: TransportMode): SeatWeights {
  const w: SeatWeights = { left: 0, right: 0, front: 0, back: 0, roof: 0, uvGlass: 0.35 };
  const own = s.side;
  const other: LateralSide | null = own === 'left' ? 'right' : own === 'right' ? 'left' : null;
  switch (s.position) {
    case 'window':
    case 'driver':
      if (own !== 'center') w[own] = 1;
      if (other) w[other] = 0.04;
      break;
    case 'middle':
      if (own !== 'center') w[own] = 0.55;
      if (other) w[other] = 0.06;
      break;
    case 'aisle':
      if (own !== 'center') w[own] = 0.32;
      if (other) w[other] = 0.1;
      break;
    case 'center':
      w.left = 0.22;
      w.right = 0.22;
      break;
    case 'deck':
      w.left = 0.5;
      w.right = 0.5;
      w.front = 0.3;
      w.back = 0.3;
      w.roof = 1;
      w.uvGlass = 1;
      break;
  }
  if (mode === 'car') {
    if (s.row === 1) w.front = 0.55;
    else w.back = s.position === 'center' ? 0.4 : 0.3;
  } else if (mode === 'bus') {
    if (s.row === 1) w.front = 0.5;
    else if (s.row === 2) w.front = 0.15;
  } else if (mode === 'train') {
    w.left *= 1.15;
    w.right *= 1.15;
    w.roof = Math.max(w.roof, 0.08);
  } else if (mode === 'plane') {
    // janelas pequenas, mas irradiância maior em altitude
    w.left *= 0.85;
    w.right *= 0.85;
  } else if (mode === 'boat' && s.position !== 'deck' && s.row === 1) {
    w.front = 0.3;
  }
  return w;
}

function goldenSeatWeight(s: Seat): number {
  const base: Record<SeatPosition, number> = { window: 1, driver: 1, middle: 0.45, aisle: 0.2, center: 0.3, deck: 1 };
  return base[s.position] * (s.overWing ? 0.55 : 1);
}

export function uvLevelFor(uv: number): UvLevel {
  if (uv <= 0.05) return 'Nenhum';
  if (uv < 3) return 'Baixo';
  if (uv < 6) return 'Moderado';
  if (uv < 8) return 'Alto';
  if (uv < 11) return 'Muito alto';
  return 'Extremo';
}

const dot = (w: SideComponents, c: SideComponents): number =>
  w.left * c.left + w.right * c.right + w.front * c.front + w.back * c.back + w.roof * c.roof;

/** Calcula a matriz de calor de todos os assentos. */
export function scoreSeats(analysis: TripAnalysisResult, layout: CabinLayout = buildCabinLayout(analysis.input.mode)): SeatScore[] {
  const mode = analysis.input.mode;
  const hours = analysis.durationMinutes / 60;
  return layout.seats.map((s) => {
    const w = seatWeights(s, mode);
    const gw = goldenSeatWeight(s);
    let energy = 0;
    let sunlit = 0;
    let uvPeak = 0;
    let golden = 0;
    for (const ex of analysis.segments) {
      const dt = ex.segment.durationMinutes;
      const irr = dot(w, ex.components);
      energy += (irr * dt) / 60;
      if (irr > SUN_THRESHOLD) sunlit += dt;
      if (ex.sun.directIrradiance > 0) {
        const fraction = clamp(irr / ex.sun.directIrradiance, 0, 1);
        uvPeak = Math.max(uvPeak, ex.sun.uvIndex * fraction * w.uvGlass);
      }
      const g = ex.golden;
      const own = s.side === 'center' ? Math.max(g.left, g.right) * 0.6 : g[s.side];
      const longitudinal = (w.front > 0 ? g.front * Math.min(1, w.front * 1.6) : 0) + (w.back > 0 ? g.back * Math.min(1, w.back * 1.6) : 0);
      golden += (own * gw + longitudinal) * dt;
    }
    const heat = Math.round(100 * Math.min(1, energy / hours / HEAT_REFERENCE));
    return {
      seat: s,
      heat,
      shadePct: Math.round(100 * (1 - sunlit / analysis.durationMinutes)),
      thermalComfort: 100 - heat,
      energy: round(energy, 3),
      uvLevel: uvLevelFor(uvPeak),
      uvBehindGlass: round(uvPeak, 1),
      goldenView: Math.round(100 * Math.min(1, golden / GOLDEN_REFERENCE)),
      score: 0,
    };
  });
}

function positionBonus(s: Seat): number {
  switch (s.position) {
    case 'window':
      // janela do lado da sombra: vista sem sol — preferida em empates técnicos
      return 8;
    case 'deck':
      return 1;
    case 'aisle':
      return 1.5;
    default:
      return 0;
  }
}

function matchesPreferences(s: Seat, prefs: SeatPreferences): boolean {
  if (prefs.position === 'window' && s.position !== 'window' && s.position !== 'deck') return false;
  if (prefs.position === 'aisle' && s.position !== 'aisle' && s.position !== 'center') return false;
  if (prefs.zone && prefs.zone !== 'any' && s.zone !== prefs.zone) return false;
  return true;
}

const POSITION_TEXT: Record<Lang, { left: string; right: string; port: string; starboard: string; center: string }> = {
  pt: { left: 'esquerda', right: 'direita', port: 'bombordo', starboard: 'estribordo', center: 'centro' },
  en: { left: 'left', right: 'right', port: 'port', starboard: 'starboard', center: 'center' },
};

export function positionLabel(s: Seat, mode: TransportMode, lang: Lang = 'pt'): string {
  const w = POSITION_TEXT[lang];
  const side = s.side === 'left' ? (mode === 'boat' ? w.port : w.left) : s.side === 'right' ? (mode === 'boat' ? w.starboard : w.right) : w.center;
  if (lang === 'en') {
    const Side = side[0].toUpperCase() + side.slice(1);
    switch (s.position) {
      case 'window':
        return `${Side} window`;
      case 'middle':
        return `${Side} middle`;
      case 'aisle':
        return `${Side} aisle`;
      case 'center':
        return 'Center';
      case 'deck':
        return `Open deck (${side})`;
      case 'driver':
        return 'Driver';
    }
  }
  switch (s.position) {
    case 'window':
      return `Janela ${side}`;
    case 'middle':
      return `Meio ${side}`;
    case 'aisle':
      return `Corredor ${side}`;
    case 'center':
      return 'Centro';
    case 'deck':
      return `Convés aberto (${side})`;
    case 'driver':
      return 'Motorista';
  }
}

/** Frase curta que explica o melhor assento, no idioma pedido. */
export function seatReasonText(best: SeatScore, mode: TransportMode, goldenActive: boolean, night: boolean, lang: Lang = 'pt'): string {
  const where = positionLabel(best.seat, mode, lang).toLowerCase();
  if (lang === 'en') {
    const prefix = mode === 'car' ? CAR_SEAT_NAMES_EN[best.seat.id] ?? best.seat.label : `Seat ${best.seat.label}`;
    if (goldenActive) return `${prefix} (${where}): golden-hour view ${best.goldenView}/100, heat ${best.heat}/100.`;
    if (night) return `${prefix} (${where}): night trip with no direct sun — choose for comfort.`;
    return `${prefix} (${where}): in the shade ${best.shadePct}% of the time, thermal comfort ${best.thermalComfort}/100.`;
  }
  const prefix = mode === 'bus' ? `Poltrona ${best.seat.label}` : mode === 'car' ? best.seat.label : `Assento ${best.seat.label}`;
  if (goldenActive) return `${prefix} (${where}): vista ${best.goldenView}/100 para a golden hour, calor ${best.heat}/100.`;
  if (night) return `${prefix} (${where}): viagem noturna, sem sol direto — escolha pelo conforto.`;
  return `${prefix} (${where}): ${best.shadePct}% do tempo na sombra, conforto térmico ${best.thermalComfort}/100.`;
}

/** Nomes dos lugares do carro em inglês (os rótulos do motor estão em português). */
export const CAR_SEAT_NAMES_EN: Record<string, string> = {
  'car-driver': 'Driver',
  'car-front-right': 'Front passenger',
  'car-rear-left': 'Rear left',
  'car-rear-center': 'Rear center',
  'car-rear-right': 'Rear right',
};

/** Ranqueia os assentos e escolhe o melhor para o modo de otimização. */
export function recommendSeats(
  analysis: TripAnalysisResult,
  optimization: OptimizationMode = analysis.input.optimization,
  prefs: SeatPreferences = {},
): SeatRecommendation {
  const mode = analysis.input.mode;
  const layout = buildCabinLayout(mode);
  const raw = scoreSeats(analysis, layout);
  const goldenActive = optimization === 'golden' && analysis.golden.available;
  const scores = raw.map((sc) => {
    const tie = -sc.seat.row * 0.01;
    const score = goldenActive
      ? sc.goldenView - sc.heat * 0.3 + positionBonus(sc.seat) + tie
      : 100 - sc.heat + positionBonus(sc.seat) + tie;
    return { ...sc, score: round(score, 2) };
  });
  const selectable = scores.filter((s) => s.seat.selectable);
  const preferred = selectable.filter((s) => matchesPreferences(s.seat, prefs));
  const pool = preferred.length > 0 ? preferred : selectable;
  const ranking = [...pool].sort((a, b) => b.score - a.score);
  const best = ranking[0];
  const worst = [...selectable].sort((a, b) => a.score - b.score)[0];

  const reason = seatReasonText(best, mode, goldenActive, analysis.daylightMinutes === 0);

  return { mode, optimization, layout, scores, best, worst, ranking: ranking.slice(0, 5), reason };
}
