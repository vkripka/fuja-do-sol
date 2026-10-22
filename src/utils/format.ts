/** Formatação e rótulos em pt-BR. */
import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';
import { CAR_SEAT_NAMES_EN } from '../engine/seatRecommender';
import { utcToZoned, type TimeZoneId } from '../engine/timezone';
import type { Seat, TransportMode } from '../engine/types';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Ícone de cada modal (os nomes ficam em src/i18n). */
export const MODE_META: Record<TransportMode, { icon: IconName }> = {
  bus: { icon: 'bus' },
  plane: { icon: 'airplane' },
  car: { icon: 'car-sport' },
  train: { icon: 'train' },
  boat: { icon: 'boat' },
};

export const MODES: TransportMode[] = ['bus', 'plane', 'car', 'train', 'boat'];

export function formatDuration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h${String(r).padStart(2, '0')}`;
}

export function formatKm(km: number): string {
  return km < 10 ? `${km.toFixed(1).replace('.', ',')} km` : `${Math.round(km).toLocaleString('pt-BR')} km`;
}

export const pad2 = (n: number): string => String(n).padStart(2, '0');

export function dateKey(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function parseDateKey(key: string): { year: number; month: number; day: number } {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day };
}

export function addDays(key: string, days: number): string {
  const { year, month, day } = parseDateKey(key);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return dateKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function parseTime(hhmm: string): { hour: number; minute: number } {
  const [hour, minute] = hhmm.split(':').map(Number);
  return { hour: hour || 0, minute: minute || 0 };
}

export function formatTime(hour: number, minute: number): string {
  return `${pad2(((hour % 24) + 24) % 24)}:${pad2(minute)}`;
}

/** Data e horário "agora" no fuso dado, com o horário arredondado para cima em 5 min. */
export function nowRounded(tz: TimeZoneId, now: Date = new Date()): { date: string; time: string } {
  const p = utcToZoned(new Date(Math.ceil(now.getTime() / 300000) * 300000), tz);
  return { date: dateKey(p.year, p.month, p.day), time: formatTime(p.hour, p.minute) };
}

/** Minutos entre dois horários HH:MM (ignora a data). */
export function minutesBetween(a: string, b: string): number {
  const x = parseTime(a);
  const y = parseTime(b);
  return Math.abs(x.hour * 60 + x.minute - (y.hour * 60 + y.minute));
}

/** Nome do assento para exibição (os lugares do carro têm nome próprio em inglês). */
export function seatDisplayName(seat: Seat, mode: TransportMode, lang: 'pt' | 'en'): string {
  return lang === 'en' && mode === 'car' ? CAR_SEAT_NAMES_EN[seat.id] ?? seat.label : seat.label;
}
