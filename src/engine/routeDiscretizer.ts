/**
 * Discretização espaço-temporal: converte uma polyline + horário em N micro-segmentos
 * (x_i, y_i, t_i), uniformes na distância, sincronizados com o relógio da viagem.
 */
import { cumulativeDistances, greatCirclePath, initialBearing, pointAlongPath } from './geodesic';
import { clamp } from './math';
import type { Coordinates, RouteSegment, TransportMode } from './types';

export const MIN_SEGMENTS = 24;
export const MAX_SEGMENTS = 120;

/** N = clamp(floor(duração/2), 24, 120). */
export function segmentCountFor(durationMinutes: number): number {
  return clamp(Math.floor(durationMinutes / 2), MIN_SEGMENTS, MAX_SEGMENTS);
}

export interface DiscretizeOptions {
  segments?: number;
}

export function discretizeRoute(
  path: readonly Coordinates[],
  departure: Date,
  durationMinutes: number,
  options: DiscretizeOptions = {},
): RouteSegment[] {
  if (path.length === 0) throw new Error('A rota precisa de pelo menos um ponto');
  if (!(durationMinutes > 0)) throw new Error('A duração da viagem deve ser positiva');
  const pts = path.length === 1 ? [path[0], path[0]] : path;
  const N = Math.max(1, Math.floor(options.segments ?? segmentCountFor(durationMinutes)));
  const cum = cumulativeDistances(pts);
  const total = cum[cum.length - 1];
  const t0 = departure.getTime();
  const dt = durationMinutes / N;
  const segments: RouteSegment[] = [];

  for (let i = 0; i < N; i++) {
    const dStart = (i / N) * total;
    const dEnd = ((i + 1) / N) * total;
    const fraction = (i + 0.5) / N;
    const sStart = pointAlongPath(pts, cum, dStart);
    const sEnd = pointAlongPath(pts, cum, dEnd);
    const sMid = pointAlongPath(pts, cum, fraction * total);
    const chord = dEnd - dStart;
    // Rumo da corda A_i→B_i; se degenerado, usa o rumo local da aresta.
    const bearing = chord > 1e-6 && (sStart.point.lat !== sEnd.point.lat || sStart.point.lon !== sEnd.point.lon)
      ? initialBearing(sStart.point, sEnd.point)
      : sMid.bearing;
    const minutesFromStart = fraction * durationMinutes;
    segments.push({
      index: i,
      start: sStart.point,
      end: sEnd.point,
      midpoint: sMid.point,
      bearing,
      distanceKm: chord,
      cumulativeKm: fraction * total,
      fraction,
      time: new Date(t0 + minutesFromStart * 60000),
      minutesFromStart,
      durationMinutes: dt,
    });
  }
  return segments;
}

/** Velocidade média de bloco (km/h) por modal e fator de sinuosidade da rota real. */
export const MODE_PROFILES: Record<TransportMode, { speedKmh: number; overheadMinutes: number; detourFactor: number; label: string }> = {
  bus: { speedKmh: 68, overheadMinutes: 15, detourFactor: 1.22, label: 'Ônibus' },
  car: { speedKmh: 82, overheadMinutes: 0, detourFactor: 1.22, label: 'Carro' },
  train: { speedKmh: 75, overheadMinutes: 5, detourFactor: 1.15, label: 'Trem' },
  boat: { speedKmh: 28, overheadMinutes: 10, detourFactor: 1.08, label: 'Barco' },
  plane: { speedKmh: 790, overheadMinutes: 35, detourFactor: 1.04, label: 'Avião' },
};

/**
 * Estima a duração (min, múltiplo de 5) a partir da distância.
 * @param distanceKm distância da rota; se `isRoadDistance` for false aplica o fator de desvio.
 */
export function estimateDurationMinutes(distanceKm: number, mode: TransportMode, isRoadDistance = false): number {
  const p = MODE_PROFILES[mode];
  const d = isRoadDistance ? distanceKm : distanceKm * p.detourFactor;
  const minutes = (d / p.speedKmh) * 60 + p.overheadMinutes;
  return Math.max(5, Math.round(minutes / 5) * 5);
}

/** Caminho padrão quando nenhuma geometria é fornecida. */
export function defaultPath(origin: Coordinates, destination: Coordinates): Coordinates[] {
  return greatCirclePath(origin, destination, 64);
}

/** Altitude típica do observador por modal (avião em cruzeiro). */
export function defaultAltitude(mode: TransportMode): number {
  return mode === 'plane' ? 11_000 : 0;
}
