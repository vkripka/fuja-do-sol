/** Funções puras de cor (sem React Native) — testáveis no Jest. */

export type Scheme = 'light' | 'dark';

const hexToRgb = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const rgbToHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;

export function mixHex(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
}

/** Luminância relativa WCAG (0..1). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export const DARK_INK = '#000000';
export const LIGHT_INK = '#FFFFFF';

/** Escolhe tinta escura ou branca, a de maior contraste com o fundo. */
export function contrastText(background: string): string {
  return contrastRatio(background, DARK_INK) >= contrastRatio(background, LIGHT_INK) ? DARK_INK : LIGHT_INK;
}

/**
 * Degradê térmico de 5 paradas (0, 25, 50, 75, 100):
 * azul (sombra) → azul claro (fresco) → amarelo (morno) → laranja (quente) → vermelho (muito sol).
 */
export const HEAT_RAMP: Record<Scheme, string[]> = {
  light: ['#3B82F6', '#60A5FA', '#FACC15', '#F97316', '#DC2626'],
  dark: ['#1D4ED8', '#0284C7', '#FACC15', '#F97316', '#EF4444'],
};

/** Rampa dourada de um único matiz para a vista do pôr/nascer do Sol (0 = sem vista). */
export const GOLDEN_RAMP: Record<Scheme, string[]> = {
  light: ['#FDF0E4', '#F9C9A0', '#F29A5E', '#E2672A', '#B8460F'],
  dark: ['#2E2620', '#5A3A22', '#8F4F22', '#C9652A', '#F2894A'],
};

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const [x, y, z] = [r / 255, g / 255, b / 255];
  const max = Math.max(x, y, z);
  const min = Math.min(x, y, z);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === x ? (y - z) / d + (y < z ? 6 : 0) : max === y ? (z - x) / d + 2 : (x - y) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

/**
 * Mistura em HSL pelo caminho mais curto de matiz: entre azul e amarelo passa por
 * ciano/verde vivos (como uma câmera térmica), em vez do verde-oliva acinzentado do RGB.
 */
export function mixHsl(a: string, b: string, t: number): string {
  const [h1, s1, l1] = rgbToHsl(hexToRgb(a));
  const [h2, s2, l2] = rgbToHsl(hexToRgb(b));
  const dh = ((h2 - h1 + 540) % 360) - 180;
  // atenua a saturação no meio do trecho para o verde intermediário não ficar neon
  const damp = 1 - 0.3 * Math.sin(Math.PI * t) * Math.min(1, Math.abs(dh) / 90);
  return hslToHex((h1 + dh * t + 360) % 360, (s1 + (s2 - s1) * t) * damp, l1 + (l2 - l1) * t);
}

export function rampColor(ramp: readonly string[], value: number): string {
  const t = Math.max(0, Math.min(1, value / 100)) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(t));
  return mixHsl(ramp[i], ramp[i + 1], t - i);
}

export function heatColor(heat: number, scheme: Scheme): string {
  return rampColor(HEAT_RAMP[scheme], heat);
}

export function goldenColor(view: number, scheme: Scheme): string {
  return rampColor(GOLDEN_RAMP[scheme], view);
}

/** Texto legível sobre a célula do mapa de calor (azul, amarelo ou vermelho). */
export function heatTextColor(heat: number, scheme: Scheme): string {
  return contrastText(heatColor(heat, scheme));
}
