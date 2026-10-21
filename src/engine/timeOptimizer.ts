/**
 * "E se eu sair outra hora?" — roda a mesma viagem em vários horários de partida do dia
 * e aponta o horário campeão de sombra e o campeão de golden hour.
 */
import { analyzeTrip, GOLDEN_REFERENCE, HEAT_REFERENCE } from './exposureCalculator';
import { defaultPath } from './routeDiscretizer';
import { utcToZoned, zonedTimeToUtc, type TimeZoneId } from './timezone';
import type { TimeOptimizationResult, TimeSlotSimulation, TripInput } from './types';

export interface OptimizerOptions {
  /** Número de horários simulados no dia (12 a 24 recomendado). */
  slots?: number;
  /** Fuso da origem; define o "dia" e as horas cheias simuladas. */
  timeZone?: TimeZoneId;
  /** Segmentos por simulação (default 48, para velocidade). */
  segmentCount?: number;
}

export function simulateSlot(input: TripInput, departure: Date, segmentCount = 48, hour = 0, minute = 0): TimeSlotSimulation {
  const a = analyzeTrip({ ...input, departure, segmentCount });
  const hours = a.durationMinutes / 60;
  const bestSideEnergy = Math.min(a.energy.left, a.energy.right);
  const worstSideEnergy = Math.max(a.energy.left, a.energy.right);
  const goldenMax = Math.max(a.golden.left, a.golden.right);
  return {
    hour,
    minute,
    departure,
    arrival: new Date(departure.getTime() + a.durationMinutes * 60000),
    energyLeft: a.energy.left,
    energyRight: a.energy.right,
    bestSideEnergy,
    shadeSide: a.shadeSide,
    comfortScore: Math.round(100 * (1 - Math.min(1, bestSideEnergy / hours / HEAT_REFERENCE))),
    heatScore: Math.round(100 * Math.min(1, worstSideEnergy / hours / HEAT_REFERENCE)),
    goldenScore: Math.round(100 * Math.min(1, goldenMax / GOLDEN_REFERENCE)),
    goldenSide: a.golden.bestSide,
    nightFraction: a.nightFraction,
    sunlitMinutes: Math.max(a.sunlitMinutes.left, a.sunlitMinutes.right),
  };
}

export function optimizeDepartureTime(input: TripInput, options: OptimizerOptions = {}): TimeOptimizationResult {
  const slots = Math.max(1, Math.min(48, Math.floor(options.slots ?? 24)));
  const tz = options.timeZone ?? 'UTC';
  const seg = options.segmentCount ?? 48;
  const prepared: TripInput = {
    ...input,
    path: input.path && input.path.length >= 2 ? input.path : defaultPath(input.origin, input.destination),
  };
  const day = utcToZoned(input.departure, tz);
  const results: TimeSlotSimulation[] = [];
  for (let k = 0; k < slots; k++) {
    const totalMinutes = Math.round((k * 24 * 60) / slots);
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const departure = zonedTimeToUtc(day.year, day.month, day.day, hour, minute, tz);
    results.push(simulateSlot(prepared, departure, seg, hour, minute));
  }

  const byShade = [...results].sort(
    (a, b) => a.bestSideEnergy - b.bestSideEnergy || a.energyLeft + a.energyRight - (b.energyLeft + b.energyRight),
  );
  const daytime = byShade.filter((s) => s.nightFraction <= 0.5);
  const byGolden = [...results].sort((a, b) => b.goldenScore - a.goldenScore || a.bestSideEnergy - b.bestSideEnergy);
  const worst = [...results].sort((a, b) => b.bestSideEnergy - a.bestSideEnergy)[0];

  return {
    slots: results,
    bestShade: byShade[0],
    bestDaytimeShade: daytime[0] ?? null,
    bestGolden: byGolden[0].goldenScore > 0 ? byGolden[0] : null,
    worst,
  };
}
