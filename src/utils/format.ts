/** Formatação e rótulos em pt-BR. */
import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';
import { utcToZoned, type TimeZoneId } from '../engine/timezone';
import type { LateralSide, SunSide, TransportMode } from '../engine/types';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export const MODE_META: Record<TransportMode, { label: string; icon: IconName; seatWord: string }> = {
  bus: { label: 'Ônibus', icon: 'bus', seatWord: 'poltrona' },
  plane: { label: 'Avião', icon: 'airplane', seatWord: 'assento' },
  car: { label: 'Carro', icon: 'car-sport', seatWord: 'lugar' },
  train: { label: 'Trem', icon: 'train', seatWord: 'assento' },
  boat: { label: 'Barco', icon: 'boat', seatWord: 'lugar' },
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

export function sideName(side: SunSide | LateralSide | 'either', mode?: TransportMode): string {
  if (mode === 'boat') {
    if (side === 'left') return 'bombordo (esquerda)';
    if (side === 'right') return 'estribordo (direita)';
  }
  switch (side) {
    case 'left':
      return 'esquerda';
    case 'right':
      return 'direita';
    case 'front':
      return 'frente';
    case 'back':
      return 'trás';
    case 'overhead':
      return 'a pino';
    case 'either':
      return 'qualquer lado';
    default:
      return 'noite';
  }
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

const WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MON = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function dateChipLabel(key: string): { weekday: string; day: string; month: string } {
  const { year, month, day } = parseDateKey(key);
  const wd = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { weekday: WEEK[wd], day: String(day), month: MON[month - 1] };
}

export function longDate(key: string): string {
  const { day, month, year } = parseDateKey(key);
  const l = dateChipLabel(key);
  return `${l.weekday}, ${day} de ${MON[month - 1]} de ${year}`;
}

/** Sugestão de poltronas do ônibus para o lado (ímpares = janelas). */
export function busSeatHint(side: LateralSide): string {
  return side === 'right' ? 'janelas ímpares 3, 7, 11, 15…' : 'janelas ímpares 1, 5, 9, 13…';
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
