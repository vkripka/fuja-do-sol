/** Utilitários numéricos e angulares compartilhados pelo motor. */

export const DEG = 180 / Math.PI;
export const RAD = Math.PI / 180;

export const sinD = (deg: number): number => Math.sin(deg * RAD);
export const cosD = (deg: number): number => Math.cos(deg * RAD);
export const tanD = (deg: number): number => Math.tan(deg * RAD);

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Normaliza um ângulo para [0, 360). */
export function normalizeDegrees(deg: number): number {
  const r = ((deg % 360) + 360) % 360;
  // `+ 0` normaliza −0 para 0
  return (r === 360 ? 0 : r) + 0;
}

/** Normaliza um ângulo para [-180, 180). */
export function normalizeSigned(deg: number): number {
  return normalizeDegrees(deg + 180) - 180;
}

/** Diferença angular absoluta mínima entre dois rumos (0..180). */
export function angularDistance(a: number, b: number): number {
  return Math.abs(normalizeSigned(a - b));
}

export function round(value: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function sum(values: readonly number[]): number {
  let s = 0;
  for (const v of values) s += v;
  return s;
}
