import { zonedTimeToUtc } from '../src/engine/timezone';
import type { Coordinates, TripInput } from '../src/engine/types';

export const SAO_PAULO: Coordinates = { lat: -23.5505, lon: -46.6333 };
export const RIO: Coordinates = { lat: -22.9068, lon: -43.1729 };

/** Horário de Brasília (UTC−3) → Date. */
export function brt(y: number, m: number, d: number, h: number, min = 0): Date {
  return zonedTimeToUtc(y, m, d, h, min, 'America/Sao_Paulo');
}

/** Rota reta Norte → Sul ao longo de um meridiano. */
export function northToSouth(lon = -46.6, fromLat = -21.5, toLat = -22.5): Coordinates[] {
  const pts: Coordinates[] = [];
  for (let i = 0; i <= 20; i++) pts.push({ lat: fromLat + ((toLat - fromLat) * i) / 20, lon });
  return pts;
}

export function trip(partial: Partial<TripInput> & Pick<TripInput, 'departure'>): TripInput {
  const path = partial.path ?? northToSouth();
  return {
    origin: path[0],
    destination: path[path.length - 1],
    path,
    durationMinutes: 60,
    mode: 'bus',
    optimization: 'shade',
    ...partial,
  };
}

export function localHour(date: Date, offsetHours = -3): number {
  const d = new Date(date.getTime() + offsetHours * 3600000);
  return d.getUTCHours() + d.getUTCMinutes() / 60;
}
