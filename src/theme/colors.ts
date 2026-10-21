/** Tokens visuais iOS 18 (Solar Gold, Shade Indigo, Glass) com claro/escuro. */
import { useColorScheme } from 'react-native';

export type Scheme = 'light' | 'dark';

export interface Palette {
  background: string;
  surface: string;
  surfaceElevated: string;
  glass: string;
  glassBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  separator: string;
  tint: string;
  tintText: string;
  shade: string;
  gold: string;
  success: string;
  danger: string;
  /** Séries de dados (validadas para daltonismo): sol na esquerda / direita / frente-trás. */
  sunLeft: string;
  sunRight: string;
  sunFront: string;
  night: string;
  gridLine: string;
  chipBackground: string;
}

export const LIGHT: Palette = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  glass: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(255,255,255,0.9)',
  text: '#0B0B0B',
  textSecondary: '#52514E',
  textMuted: '#8A8986',
  separator: '#E5E5EA',
  tint: '#FF9500',
  tintText: '#B35F00',
  shade: '#5856D6',
  gold: '#E8A400',
  success: '#248A3D',
  danger: '#D70015',
  sunLeft: '#EB6834',
  sunRight: '#6250D6',
  sunFront: '#1BAF7A',
  night: '#A8A7A2',
  gridLine: '#E7E6E2',
  chipBackground: '#E9E9EE',
};

export const DARK: Palette = {
  background: '#000000',
  surface: '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  glass: 'rgba(28,28,30,0.72)',
  glassBorder: 'rgba(255,255,255,0.12)',
  text: '#F2F2F7',
  textSecondary: '#C3C2B7',
  textMuted: '#8E8E93',
  separator: '#38383A',
  tint: '#FF9F0A',
  tintText: '#FFB340',
  shade: '#7D7AFF',
  gold: '#FFCC00',
  success: '#30D158',
  danger: '#FF453A',
  sunLeft: '#D95926',
  sunRight: '#9085E9',
  sunFront: '#199E70',
  night: '#5E5D58',
  gridLine: '#2E2E30',
  chipBackground: '#2C2C2E',
};

export function paletteFor(scheme: Scheme): Palette {
  return scheme === 'dark' ? DARK : LIGHT;
}

export function useAppTheme(): { scheme: Scheme; colors: Palette } {
  const scheme: Scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, colors: paletteFor(scheme) };
}

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

/** Rampa sequencial de um único matiz (laranja) para o mapa de calor 0..100. */
const HEAT_RAMP: Record<Scheme, string[]> = {
  light: ['#FDF0E4', '#F9C9A0', '#F29A5E', '#E2672A', '#B8460F'],
  dark: ['#2E2620', '#5A3A22', '#8F4F22', '#C9652A', '#F2894A'],
};

export function heatColor(heat: number, scheme: Scheme): string {
  const ramp = HEAT_RAMP[scheme];
  const t = Math.max(0, Math.min(1, heat / 100)) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(t));
  return mixHex(ramp[i], ramp[i + 1], t - i);
}

/** Texto legível sobre a célula do mapa de calor. */
export function heatTextColor(heat: number, scheme: Scheme): string {
  if (scheme === 'dark') return heat > 70 ? '#1A1209' : '#F2F2F7';
  return heat > 55 ? '#FFFFFF' : '#3B2412';
}

/** Gradiente do céu conforme a hora local (madrugada → aurora → dia → pôr do sol → noite). */
export function skyGradient(hour: number, scheme: Scheme): [string, string] {
  const h = ((hour % 24) + 24) % 24;
  if (h < 5 || h >= 20) return scheme === 'dark' ? ['#0B1026', '#1B1F4A'] : ['#1B1F4A', '#3A3F8F'];
  if (h < 7) return ['#FF9A62', '#FFD27A'];
  if (h < 16) return scheme === 'dark' ? ['#0E3A66', '#1D6FB8'] : ['#4FA8F0', '#A7D8FF'];
  if (h < 18.5) return ['#FFB347', '#FF7E5F'];
  return ['#FF5E62', '#5B2A86'];
}
