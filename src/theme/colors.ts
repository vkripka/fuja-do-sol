/** Tokens visuais iOS 18 (Solar Gold, Shade Indigo, Glass) com claro/escuro. */
import { useColorScheme } from 'react-native';
import type { Scheme } from './palette';

export { contrastText, goldenColor, heatColor, heatTextColor, mixHex, type Scheme } from './palette';

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

/** Gradiente do céu conforme a hora local (madrugada → aurora → dia → pôr do sol → noite). */
export function skyGradient(hour: number, scheme: Scheme): [string, string] {
  const h = ((hour % 24) + 24) % 24;
  if (h < 5 || h >= 20) return scheme === 'dark' ? ['#0B1026', '#1B1F4A'] : ['#1B1F4A', '#3A3F8F'];
  if (h < 7) return ['#FF9A62', '#FFD27A'];
  if (h < 16) return scheme === 'dark' ? ['#0E3A66', '#1D6FB8'] : ['#4FA8F0', '#A7D8FF'];
  if (h < 18.5) return ['#FFB347', '#FF7E5F'];
  return ['#FF5E62', '#5B2A86'];
}
