/**
 * Posição astronômica do Sol — algoritmo de Jean Meeus ("Astronomical Algorithms",
 * cap. 25) na forma adotada pela calculadora solar da NOAA.
 * Precisão típica: ~0.01° em elevação/azimute para 1900–2100.
 */
import { clamp, cosD, DEG, normalizeDegrees, normalizeSigned, sinD, tanD } from './math';
import type { Coordinates, DayPhase, SolarPosition, SunEvents } from './types';

const EARTH_RADIUS_M = 6_371_000;
/** Elevação aparente do centro do disco no nascer/pôr (refração 34' + semidiâmetro 16'). */
export const SUNRISE_ELEVATION = -0.833;
/** Altitude de cruzeiro padrão de voos comerciais. */
export const CRUISE_ALTITUDE_M = 11_000;
const MS_PER_DAY = 86_400_000;

export function toJulianDay(date: Date): number {
  return date.getTime() / MS_PER_DAY + 2440587.5;
}

export function fromJulianDay(jd: number): Date {
  return new Date((jd - 2440587.5) * MS_PER_DAY);
}

export function julianCentury(jd: number): number {
  return (jd - 2451545.0) / 36525;
}

export interface SolarCoordinates {
  declination: number;
  rightAscension: number;
  equationOfTime: number;
  apparentLongitude: number;
  /** Distância Terra–Sol em UA. */
  radiusVector: number;
}

/** Coordenadas equatoriais do Sol para o século juliano T. */
export function solarCoordinates(T: number): SolarCoordinates {
  const L0 = normalizeDegrees(280.46646 + T * (36000.76983 + T * 0.0003032));
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C =
    sinD(M) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    sinD(2 * M) * (0.019993 - 0.000101 * T) +
    sinD(3 * M) * 0.000289;
  const trueLong = L0 + C;
  const trueAnomaly = M + C;
  const radiusVector = (1.000001018 * (1 - e * e)) / (1 + e * cosD(trueAnomaly));
  const omega = 125.04 - 1934.136 * T;
  const apparentLongitude = trueLong - 0.00569 - 0.00478 * sinD(omega);
  const meanObliquity = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const obliquity = meanObliquity + 0.00256 * cosD(omega);

  const rightAscension = normalizeDegrees(
    Math.atan2(cosD(obliquity) * sinD(apparentLongitude), cosD(apparentLongitude)) * DEG,
  );
  const declination = Math.asin(sinD(obliquity) * sinD(apparentLongitude)) * DEG;

  const y = tanD(obliquity / 2) ** 2;
  const eqTimeRad =
    y * sinD(2 * L0) -
    2 * e * sinD(M) +
    4 * e * y * sinD(M) * cosD(2 * L0) -
    0.5 * y * y * sinD(4 * L0) -
    1.25 * e * e * sinD(2 * M);
  const equationOfTime = 4 * eqTimeRad * DEG;

  return { declination, rightAscension, equationOfTime, apparentLongitude, radiusVector };
}

/** Tempo Sideral Médio de Greenwich (graus) — Meeus eq. 12.4. */
export function greenwichMeanSiderealTime(jd: number): number {
  const T = julianCentury(jd);
  return normalizeDegrees(
    280.46061837 + 360.98564736629 * (jd - 2451545.0) + T * T * (0.000387933 - T / 38710000),
  );
}

/** Refração atmosférica (graus) a somar na elevação geométrica — modelo NOAA. */
export function atmosphericRefraction(trueElevation: number): number {
  if (trueElevation > 85) return 0;
  const te = tanD(trueElevation);
  let arcsec: number;
  if (trueElevation > 5) {
    arcsec = 58.1 / te - 0.07 / te ** 3 + 0.000086 / te ** 5;
  } else if (trueElevation > -0.575) {
    const h = trueElevation;
    arcsec = 1735 + h * (-518.2 + h * (103.4 + h * (-12.79 + h * 0.711)));
  } else {
    arcsec = -20.774 / te;
  }
  return arcsec / 3600;
}

/**
 * Depressão geométrica do horizonte para um observador à altitude h:
 * dip = acos(R / (R + h)). Em 11.000 m ≈ 3.36°.
 */
export function horizonDip(altitudeMeters: number): number {
  if (!(altitudeMeters > 0)) return 0;
  return Math.acos(EARTH_RADIUS_M / (EARTH_RADIUS_M + altitudeMeters)) * DEG;
}

/**
 * Massa de ar relativa de Kasten & Young (1989), corrigida pela pressão
 * atmosférica na altitude (atmosfera isotérmica, escala 8.434 km).
 */
export function airMassKastenYoung(elevation: number, altitudeMeters = 0): number {
  const e = Math.max(elevation, 0.5);
  const am = 1 / (sinD(e) + 0.50572 * (e + 6.07995) ** -1.6364);
  return am * Math.exp(-Math.max(altitudeMeters, 0) / 8434);
}

/**
 * Irradiância direta normal em céu claro (Meinel): I = 1.353 · 0.7^(AM^0.678) kW/m²,
 * corrigida pela distância Terra–Sol.
 */
export function directNormalIrradiance(elevation: number, altitudeMeters = 0, radiusVector = 1): number {
  if (elevation <= -horizonDip(altitudeMeters) - 0.27) return 0;
  const am = airMassKastenYoung(elevation, altitudeMeters);
  return (1.353 * 0.7 ** (am ** 0.678)) / (radiusVector * radiusVector);
}

/**
 * Índice UV em céu claro (aproximação de Madronich: UVI ≈ 12.5·μ^2.42, μ = cos θz),
 * acrescido de ~7% por km de altitude (até 12 km).
 */
export function estimateUvIndex(elevation: number, altitudeMeters = 0): number {
  if (elevation <= 0) return 0;
  const mu = sinD(elevation);
  const altitudeKm = clamp(altitudeMeters / 1000, 0, 12);
  return 12.5 * mu ** 2.42 * (1 + 0.07 * altitudeKm);
}

/** Classifica a fase do dia pela elevação relativa ao horizonte efetivo. */
export function classifyDayPhase(elevation: number, dip = 0): DayPhase {
  const e = elevation + dip;
  if (e < -18) return 'night';
  if (e < -12) return 'astronomicalTwilight';
  if (e < -6) return 'nauticalTwilight';
  if (e < SUNRISE_ELEVATION) return 'civilTwilight';
  if (e < 6) return 'goldenHour';
  return 'day';
}

/** Posição do Sol para um instante, local e altitude do observador. */
export function getSolarPosition(date: Date, coords: Coordinates, altitudeMeters = 0): SolarPosition {
  const jd = toJulianDay(date);
  const T = julianCentury(jd);
  const sc = solarCoordinates(T);
  const phi = coords.lat;

  // Ângulo horário local H = GMST + λ − α (positivo a oeste do meridiano = tarde).
  const gmst = greenwichMeanSiderealTime(jd);
  const hourAngle = normalizeSigned(gmst + coords.lon - sc.rightAscension);

  const sinAlt = sinD(phi) * sinD(sc.declination) + cosD(phi) * cosD(sc.declination) * cosD(hourAngle);
  const trueElevation = Math.asin(clamp(sinAlt, -1, 1)) * DEG;
  const elevation = trueElevation + atmosphericRefraction(trueElevation);

  const azimuth = normalizeDegrees(
    Math.atan2(sinD(hourAngle), cosD(hourAngle) * sinD(phi) - tanD(sc.declination) * cosD(phi)) * DEG + 180,
  );

  const dip = horizonDip(altitudeMeters);
  const isUp = elevation > SUNRISE_ELEVATION - dip;
  const visibleElevation = Math.max(elevation, 0);
  return {
    azimuth,
    elevation,
    trueElevation,
    zenith: 90 - elevation,
    declination: sc.declination,
    rightAscension: sc.rightAscension,
    equationOfTime: sc.equationOfTime,
    hourAngle,
    horizonDip: dip,
    airMass: isUp ? airMassKastenYoung(visibleElevation, altitudeMeters) : null,
    directIrradiance: isUp ? directNormalIrradiance(elevation, altitudeMeters, sc.radiusVector) : 0,
    uvIndex: estimateUvIndex(elevation, altitudeMeters),
    phase: classifyDayPhase(elevation, dip),
    isUp,
  };
}

/** Instante (UTC) do meio-dia solar mais próximo de `date` para a longitude dada. */
export function solarNoon(date: Date, lon: number): Date {
  // Dia solar médio local que contém o instante; meio-dia ≈ 12h − λ/15 − EoT (UTC), iterado.
  const lonOffsetMs = 4 * lon * 60000;
  const localMidnight = Math.floor((date.getTime() + lonOffsetMs) / MS_PER_DAY) * MS_PER_DAY - lonOffsetMs;
  let noon = localMidnight + 720 * 60000;
  for (let i = 0; i < 2; i++) {
    const eot = solarCoordinates(julianCentury(toJulianDay(new Date(noon)))).equationOfTime;
    noon = localMidnight + (720 - eot) * 60000;
  }
  return new Date(noon);
}

/** Ângulo horário (graus) em que o Sol atinge a elevação `h0`; null se nunca atinge. */
function hourAngleAtElevation(lat: number, declination: number, h0: number): number | 'always' | 'never' {
  const cosH = (sinD(h0) - sinD(lat) * sinD(declination)) / (cosD(lat) * cosD(declination));
  if (cosH > 1) return 'never';
  if (cosH < -1) return 'always';
  return Math.acos(cosH) * DEG;
}

function crossing(noon: Date, coords: Coordinates, h0: number, sign: -1 | 1): Date | null | 'always' {
  let t = noon.getTime();
  for (let i = 0; i < 4; i++) {
    const sc = solarCoordinates(julianCentury(toJulianDay(new Date(t))));
    const H = hourAngleAtElevation(coords.lat, sc.declination, h0);
    if (H === 'never') return null;
    if (H === 'always') return 'always';
    t = noon.getTime() + sign * H * 4 * 60000;
  }
  return new Date(t);
}

/**
 * Nascer, pôr, meio-dia e golden hour do dia solar que contém `date`.
 * Com altitude > 0 (avião), o horizonte é rebaixado pela depressão geométrica.
 */
export function getSunEvents(date: Date, coords: Coordinates, altitudeMeters = 0): SunEvents {
  const noon = solarNoon(date, coords.lon);
  const h0 = SUNRISE_ELEVATION - horizonDip(altitudeMeters);
  const rise = crossing(noon, coords, h0, -1);
  const set = crossing(noon, coords, h0, 1);
  const gMorning = crossing(noon, coords, 6, -1);
  const gEvening = crossing(noon, coords, 6, 1);

  let polar: SunEvents['polar'] = 'normal';
  if (rise === 'always' || set === 'always') polar = 'polarDay';
  else if (rise === null || set === null) polar = 'polarNight';

  const sunrise = rise instanceof Date ? rise : null;
  const sunset = set instanceof Date ? set : null;
  const dayLengthMinutes =
    polar === 'polarDay' ? 1440 : polar === 'polarNight' ? 0 : ((sunset as Date).getTime() - (sunrise as Date).getTime()) / 60000;

  return {
    sunrise,
    sunset,
    solarNoon: noon,
    morningGoldenEnd: gMorning instanceof Date ? gMorning : null,
    eveningGoldenStart: gEvening instanceof Date ? gEvening : null,
    dayLengthMinutes,
    polar,
  };
}

/** Peso cênico (0..1) de "golden hour" para uma elevação: pico perto de +2°, zero fora de [-4°, +10°]. */
export function goldenWeight(elevation: number, dip = 0): number {
  const e = elevation + dip;
  if (e <= -4 || e >= 10) return 0;
  if (e <= 2) return (e + 4) / 6;
  return (10 - e) / 8;
}
