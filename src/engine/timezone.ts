/**
 * Fusos horários sem dependência de Intl (Hermes tem suporte parcial):
 * offsets padrão + regras de horário de verão da UE, EUA e Chile.
 */
import type { Coordinates } from './types';

export type TimeZoneId = string;

type DstRule = 'EU' | 'US' | 'CHILE';
interface ZoneRule {
  /** Offset padrão em minutos (UTC−3 = −180). */
  std: number;
  dst?: DstRule;
}

export const ZONES: Record<string, ZoneRule> = {
  'America/Sao_Paulo': { std: -180 },
  'America/Manaus': { std: -240 },
  'America/Cuiaba': { std: -240 },
  'America/Rio_Branco': { std: -300 },
  'America/Noronha': { std: -120 },
  'America/Argentina/Buenos_Aires': { std: -180 },
  'America/Montevideo': { std: -180 },
  'America/Asuncion': { std: -180 },
  'America/Santiago': { std: -240, dst: 'CHILE' },
  'America/Lima': { std: -300 },
  'America/Bogota': { std: -300 },
  'America/Cancun': { std: -300 },
  'America/Mexico_City': { std: -360 },
  'America/New_York': { std: -300, dst: 'US' },
  'America/Chicago': { std: -360, dst: 'US' },
  'America/Los_Angeles': { std: -480, dst: 'US' },
  'Europe/Lisbon': { std: 0, dst: 'EU' },
  'Europe/London': { std: 0, dst: 'EU' },
  'Europe/Paris': { std: 60, dst: 'EU' },
  'Europe/Madrid': { std: 60, dst: 'EU' },
  'Europe/Rome': { std: 60, dst: 'EU' },
  'Europe/Berlin': { std: 60, dst: 'EU' },
  'Europe/Amsterdam': { std: 60, dst: 'EU' },
  'Asia/Dubai': { std: 240 },
  'Asia/Tokyo': { std: 540 },
  'Africa/Johannesburg': { std: 120 },
  UTC: { std: 0 },
};

function nthSunday(year: number, month: number, n: number): number {
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return 1 + ((7 - firstDow) % 7) + (n - 1) * 7;
}
function lastSunday(year: number, month: number): number {
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  return lastDay.getUTCDate() - lastDay.getUTCDay();
}

function inDst(rule: DstRule, std: number, t: number): boolean {
  const year = new Date(t).getUTCFullYear();
  switch (rule) {
    case 'EU': {
      const start = Date.UTC(year, 2, lastSunday(year, 2), 1);
      const end = Date.UTC(year, 9, lastSunday(year, 9), 1);
      return t >= start && t < end;
    }
    case 'US': {
      const start = Date.UTC(year, 2, nthSunday(year, 2, 2), 2) - std * 60000;
      const end = Date.UTC(year, 10, nthSunday(year, 10, 1), 2) - (std + 60) * 60000;
      return t >= start && t < end;
    }
    case 'CHILE': {
      const end = Date.UTC(year, 3, nthSunday(year, 3, 1), 3);
      const start = Date.UTC(year, 8, nthSunday(year, 8, 1), 4);
      return t < end || t >= start;
    }
  }
}

/** Parse de ids genéricos "UTC-3", "UTC+5:30". */
function parseUtcId(tz: string): number | null {
  const m = /^UTC([+-])(\d{1,2})(?::(\d{2}))?$/.exec(tz);
  if (!m) return null;
  const v = Number(m[2]) * 60 + Number(m[3] ?? 0);
  return m[1] === '-' ? -v : v;
}

/** Offset (minutos) do fuso em relação ao UTC no instante dado. */
export function utcOffsetMinutes(tz: TimeZoneId, date: Date): number {
  const rule = ZONES[tz];
  if (rule) return rule.dst && inDst(rule.dst, rule.std, date.getTime()) ? rule.std + 60 : rule.std;
  return parseUtcId(tz) ?? 0;
}

export interface ZonedParts {
  year: number;
  /** 1..12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0 = domingo */
  weekday: number;
}

export function utcToZoned(date: Date, tz: TimeZoneId): ZonedParts {
  const shifted = new Date(date.getTime() + utcOffsetMinutes(tz, date) * 60000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

/** Converte data/hora "de parede" no fuso `tz` para o instante UTC. */
export function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, tz: TimeZoneId): Date {
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  let guess = wall - utcOffsetMinutes(tz, new Date(wall)) * 60000;
  guess = wall - utcOffsetMinutes(tz, new Date(guess)) * 60000;
  return new Date(guess);
}

/** Estima o fuso a partir de país/UF/coordenadas (usado para resultados online sem fuso). */
export function guessTimeZone(coords: Coordinates, countryCode?: string, region?: string): TimeZoneId {
  const cc = countryCode?.toUpperCase();
  if (cc === 'BR' || (!cc && coords.lat < 6 && coords.lat > -34 && coords.lon > -74 && coords.lon < -28)) {
    const uf = region?.toUpperCase();
    if (uf === 'AC') return 'America/Rio_Branco';
    if (uf === 'AM' || uf === 'RR' || uf === 'RO') return 'America/Manaus';
    if (uf === 'MT' || uf === 'MS') return 'America/Cuiaba';
    if (coords.lon > -33.5) return 'America/Noronha';
    if (!uf) {
      if (coords.lon < -67) return 'America/Rio_Branco';
      if (coords.lon < -60) return 'America/Manaus';
    }
    return 'America/Sao_Paulo';
  }
  const h = Math.round(coords.lon / 15);
  return h === 0 ? 'UTC' : `UTC${h > 0 ? '+' : '-'}${Math.abs(h)}`;
}

const pad = (n: number): string => String(n).padStart(2, '0');

export function formatZonedTime(date: Date, tz: TimeZoneId): string {
  const p = utcToZoned(date, tz);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function formatZonedDate(date: Date, tz: TimeZoneId): string {
  const p = utcToZoned(date, tz);
  return `${WEEKDAYS[p.weekday]}, ${p.day} ${MONTHS[p.month - 1]}`;
}

/** Rótulo do offset, ex.: "UTC−3". */
export function formatOffset(tz: TimeZoneId, date: Date): string {
  const off = utcOffsetMinutes(tz, date);
  const sign = off < 0 ? '−' : '+';
  const a = Math.abs(off);
  return `UTC${sign}${Math.floor(a / 60)}${a % 60 ? `:${pad(a % 60)}` : ''}`;
}
