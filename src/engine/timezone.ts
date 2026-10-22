/**
 * Fusos horários sem dependência de Intl (Hermes tem suporte parcial):
 * offsets padrão + regras de horário de verão da UE, América do Norte, Chile,
 * Austrália e Nova Zelândia.
 */
import type { Coordinates } from './types';

export type TimeZoneId = string;

type DstRule = 'EU' | 'US' | 'CHILE' | 'AU' | 'NZ';
interface ZoneRule {
  /** Offset padrão em minutos (UTC−3 = −180). */
  std: number;
  dst?: DstRule;
}

export const ZONES: Record<string, ZoneRule> = {
  // Brasil
  'America/Sao_Paulo': { std: -180 },
  'America/Manaus': { std: -240 },
  'America/Cuiaba': { std: -240 },
  'America/Rio_Branco': { std: -300 },
  'America/Noronha': { std: -120 },
  // América do Sul e Central
  'America/Argentina/Buenos_Aires': { std: -180 },
  'America/Montevideo': { std: -180 },
  'America/Asuncion': { std: -180 },
  'America/Santiago': { std: -240, dst: 'CHILE' },
  'America/La_Paz': { std: -240 },
  'America/Caracas': { std: -240 },
  'America/Lima': { std: -300 },
  'America/Bogota': { std: -300 },
  'America/Guayaquil': { std: -300 },
  'America/Panama': { std: -300 },
  'America/Costa_Rica': { std: -360 },
  // México
  'America/Cancun': { std: -300 },
  'America/Mexico_City': { std: -360 },
  'America/Hermosillo': { std: -420 },
  'America/Tijuana': { std: -480, dst: 'US' },
  // EUA e Canadá
  'America/New_York': { std: -300, dst: 'US' },
  'America/Chicago': { std: -360, dst: 'US' },
  'America/Denver': { std: -420, dst: 'US' },
  'America/Phoenix': { std: -420 },
  'America/Los_Angeles': { std: -480, dst: 'US' },
  'America/Anchorage': { std: -540, dst: 'US' },
  'Pacific/Honolulu': { std: -600 },
  'America/Halifax': { std: -240, dst: 'US' },
  'America/Toronto': { std: -300, dst: 'US' },
  'America/Winnipeg': { std: -360, dst: 'US' },
  'America/Edmonton': { std: -420, dst: 'US' },
  'America/Vancouver': { std: -480, dst: 'US' },
  // Europa
  'Europe/Lisbon': { std: 0, dst: 'EU' },
  'Atlantic/Canary': { std: 0, dst: 'EU' },
  'Europe/London': { std: 0, dst: 'EU' },
  'Europe/Dublin': { std: 0, dst: 'EU' },
  'Europe/Paris': { std: 60, dst: 'EU' },
  'Europe/Madrid': { std: 60, dst: 'EU' },
  'Europe/Rome': { std: 60, dst: 'EU' },
  'Europe/Berlin': { std: 60, dst: 'EU' },
  'Europe/Amsterdam': { std: 60, dst: 'EU' },
  'Europe/Brussels': { std: 60, dst: 'EU' },
  'Europe/Zurich': { std: 60, dst: 'EU' },
  'Europe/Vienna': { std: 60, dst: 'EU' },
  'Europe/Stockholm': { std: 60, dst: 'EU' },
  'Europe/Oslo': { std: 60, dst: 'EU' },
  'Europe/Copenhagen': { std: 60, dst: 'EU' },
  'Europe/Warsaw': { std: 60, dst: 'EU' },
  'Europe/Prague': { std: 60, dst: 'EU' },
  'Europe/Athens': { std: 120, dst: 'EU' },
  'Europe/Helsinki': { std: 120, dst: 'EU' },
  'Europe/Istanbul': { std: 180 },
  'Europe/Moscow': { std: 180 },
  // África e Oriente Médio
  'Africa/Casablanca': { std: 60 },
  'Africa/Lagos': { std: 60 },
  'Africa/Cairo': { std: 120 },
  'Africa/Johannesburg': { std: 120 },
  'Africa/Nairobi': { std: 180 },
  'Asia/Riyadh': { std: 180 },
  'Asia/Tehran': { std: 210 },
  'Asia/Dubai': { std: 240 },
  // Ásia
  'Asia/Karachi': { std: 300 },
  'Asia/Kolkata': { std: 330 },
  'Asia/Kathmandu': { std: 345 },
  'Asia/Dhaka': { std: 360 },
  'Asia/Bangkok': { std: 420 },
  'Asia/Jakarta': { std: 420 },
  'Asia/Shanghai': { std: 480 },
  'Asia/Hong_Kong': { std: 480 },
  'Asia/Singapore': { std: 480 },
  'Asia/Manila': { std: 480 },
  'Asia/Seoul': { std: 540 },
  'Asia/Tokyo': { std: 540 },
  // Oceania
  'Australia/Perth': { std: 480 },
  'Australia/Darwin': { std: 570 },
  'Australia/Adelaide': { std: 570, dst: 'AU' },
  'Australia/Brisbane': { std: 600 },
  'Australia/Sydney': { std: 600, dst: 'AU' },
  'Pacific/Auckland': { std: 720, dst: 'NZ' },
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
    case 'AU': {
      // 1º domingo de outubro 02:00 (padrão) → 1º domingo de abril 03:00 (verão)
      const start = Date.UTC(year, 9, nthSunday(year, 9, 1), 2) - std * 60000;
      const end = Date.UTC(year, 3, nthSunday(year, 3, 1), 3) - (std + 60) * 60000;
      return t < end || t >= start;
    }
    case 'NZ': {
      // último domingo de setembro 02:00 (padrão) → 1º domingo de abril 03:00 (verão)
      const start = Date.UTC(year, 8, lastSunday(year, 8), 2) - std * 60000;
      const end = Date.UTC(year, 3, nthSunday(year, 3, 1), 3) - (std + 60) * 60000;
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

/** Países com um único fuso relevante para viagens. */
const COUNTRY_ZONES: Record<string, TimeZoneId> = {
  AR: 'America/Argentina/Buenos_Aires',
  UY: 'America/Montevideo',
  PY: 'America/Asuncion',
  CL: 'America/Santiago',
  BO: 'America/La_Paz',
  VE: 'America/Caracas',
  PE: 'America/Lima',
  CO: 'America/Bogota',
  EC: 'America/Guayaquil',
  PA: 'America/Panama',
  CR: 'America/Costa_Rica',
  PT: 'Europe/Lisbon',
  GB: 'Europe/London',
  IE: 'Europe/Dublin',
  FR: 'Europe/Paris',
  DE: 'Europe/Berlin',
  IT: 'Europe/Rome',
  NL: 'Europe/Amsterdam',
  BE: 'Europe/Brussels',
  CH: 'Europe/Zurich',
  AT: 'Europe/Vienna',
  SE: 'Europe/Stockholm',
  NO: 'Europe/Oslo',
  DK: 'Europe/Copenhagen',
  PL: 'Europe/Warsaw',
  CZ: 'Europe/Prague',
  GR: 'Europe/Athens',
  FI: 'Europe/Helsinki',
  TR: 'Europe/Istanbul',
  MA: 'Africa/Casablanca',
  NG: 'Africa/Lagos',
  EG: 'Africa/Cairo',
  ZA: 'Africa/Johannesburg',
  KE: 'Africa/Nairobi',
  SA: 'Asia/Riyadh',
  QA: 'Asia/Riyadh',
  IR: 'Asia/Tehran',
  AE: 'Asia/Dubai',
  PK: 'Asia/Karachi',
  IN: 'Asia/Kolkata',
  NP: 'Asia/Kathmandu',
  BD: 'Asia/Dhaka',
  TH: 'Asia/Bangkok',
  VN: 'Asia/Bangkok',
  CN: 'Asia/Shanghai',
  HK: 'Asia/Hong_Kong',
  SG: 'Asia/Singapore',
  PH: 'Asia/Manila',
  KR: 'Asia/Seoul',
  JP: 'Asia/Tokyo',
  NZ: 'Pacific/Auckland',
};

const US_STATES: Record<string, TimeZoneId> = {
  CA: 'America/Los_Angeles',
  WA: 'America/Los_Angeles',
  OR: 'America/Los_Angeles',
  NV: 'America/Los_Angeles',
  AZ: 'America/Phoenix',
  CO: 'America/Denver',
  UT: 'America/Denver',
  NM: 'America/Denver',
  WY: 'America/Denver',
  MT: 'America/Denver',
  ID: 'America/Denver',
  AK: 'America/Anchorage',
  HI: 'Pacific/Honolulu',
  TX: 'America/Chicago',
  IL: 'America/Chicago',
  MN: 'America/Chicago',
  WI: 'America/Chicago',
  IA: 'America/Chicago',
  MO: 'America/Chicago',
  AR: 'America/Chicago',
  LA: 'America/Chicago',
  OK: 'America/Chicago',
  KS: 'America/Chicago',
  NE: 'America/Chicago',
  SD: 'America/Chicago',
  ND: 'America/Chicago',
  AL: 'America/Chicago',
  MS: 'America/Chicago',
  TN: 'America/Chicago',
};

const AU_STATES: Record<string, TimeZoneId> = {
  NSW: 'Australia/Sydney',
  VIC: 'Australia/Sydney',
  TAS: 'Australia/Sydney',
  ACT: 'Australia/Sydney',
  QLD: 'Australia/Brisbane',
  SA: 'Australia/Adelaide',
  NT: 'Australia/Darwin',
  WA: 'Australia/Perth',
};

function brazilZone(c: Coordinates, uf?: string): TimeZoneId {
  if (uf === 'AC') return 'America/Rio_Branco';
  if (uf === 'AM' || uf === 'RR' || uf === 'RO') return 'America/Manaus';
  if (uf === 'MT' || uf === 'MS') return 'America/Cuiaba';
  if (c.lon > -33.5) return 'America/Noronha';
  if (!uf) {
    if (c.lon < -67) return 'America/Rio_Branco';
    if (c.lon < -60) return 'America/Manaus';
  }
  return 'America/Sao_Paulo';
}

function usZone(c: Coordinates, state?: string): TimeZoneId {
  if (state && US_STATES[state]) return US_STATES[state];
  if (state) return 'America/New_York';
  if (c.lon < -150 && c.lat < 25) return 'Pacific/Honolulu';
  if (c.lon < -130 && c.lat > 50) return 'America/Anchorage';
  if (c.lon < -114.5) return 'America/Los_Angeles';
  if (c.lon < -101) return 'America/Denver';
  if (c.lon < -87) return 'America/Chicago';
  return 'America/New_York';
}

function canadaZone(c: Coordinates): TimeZoneId {
  if (c.lon < -120) return 'America/Vancouver';
  if (c.lon < -110) return 'America/Edmonton';
  if (c.lon < -90) return 'America/Winnipeg';
  if (c.lon < -64) return 'America/Toronto';
  return 'America/Halifax';
}

function mexicoZone(c: Coordinates, state?: string): TimeZoneId {
  if (state === 'BCN' || c.lon < -114) return 'America/Tijuana';
  if (state === 'SON') return 'America/Hermosillo';
  if (state === 'ROO' || c.lon > -88.5) return 'America/Cancun';
  return 'America/Mexico_City';
}

function australiaZone(c: Coordinates, state?: string): TimeZoneId {
  if (state && AU_STATES[state]) return AU_STATES[state];
  if (c.lon < 129) return 'Australia/Perth';
  if (c.lon < 138 && c.lat > -26) return 'Australia/Darwin';
  if (c.lon < 141) return 'Australia/Adelaide';
  if (c.lat > -29) return 'Australia/Brisbane';
  return 'Australia/Sydney';
}

function longitudeZone(c: Coordinates): TimeZoneId {
  const h = Math.round(c.lon / 15);
  return h === 0 ? 'UTC' : `UTC${h > 0 ? '+' : '-'}${Math.abs(h)}`;
}

/**
 * Estima o fuso a partir de país (ISO 3166-1), estado/UF (ISO 3166-2, sem o prefixo do país)
 * e coordenadas. Países grandes usam estado ou longitude; o resto cai no fuso pela longitude.
 */
export function guessTimeZone(coords: Coordinates, countryCode?: string, region?: string): TimeZoneId {
  const cc = countryCode?.toUpperCase();
  const st = region?.toUpperCase();
  if (cc === 'BR' || (!cc && coords.lat < 6 && coords.lat > -34 && coords.lon > -74 && coords.lon < -28)) return brazilZone(coords, st);
  switch (cc) {
    case 'US':
      return usZone(coords, st);
    case 'CA':
      return canadaZone(coords);
    case 'MX':
      return mexicoZone(coords, st);
    case 'AU':
      return australiaZone(coords, st);
    case 'ES':
      return coords.lon < -13 ? 'Atlantic/Canary' : 'Europe/Madrid';
    case 'PT':
      return coords.lon < -20 ? 'UTC-1' : 'Europe/Lisbon';
    case 'RU':
      return coords.lon < 60 ? 'Europe/Moscow' : longitudeZone(coords);
    case 'ID':
      return coords.lon < 115 ? 'Asia/Jakarta' : longitudeZone(coords);
  }
  if (cc && COUNTRY_ZONES[cc]) return COUNTRY_ZONES[cc];
  return longitudeZone(coords);
}

const pad = (n: number): string => String(n).padStart(2, '0');

export function formatZonedTime(date: Date, tz: TimeZoneId): string {
  const p = utcToZoned(date, tz);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

const NAMES = {
  pt: {
    weekdays: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
    months: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  },
  en: {
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
};

export function formatZonedDate(date: Date, tz: TimeZoneId, lang: 'pt' | 'en' = 'pt'): string {
  const p = utcToZoned(date, tz);
  const n = NAMES[lang];
  return lang === 'en'
    ? `${n.weekdays[p.weekday]}, ${n.months[p.month - 1]} ${p.day}`
    : `${n.weekdays[p.weekday]}, ${p.day} ${n.months[p.month - 1]}`;
}

/** Rótulo do offset, ex.: "UTC−3". */
export function formatOffset(tz: TimeZoneId, date: Date): string {
  const off = utcOffsetMinutes(tz, date);
  const sign = off < 0 ? '−' : '+';
  const a = Math.abs(off);
  return `UTC${sign}${Math.floor(a / 60)}${a % 60 ? `:${pad(a % 60)}` : ''}`;
}
