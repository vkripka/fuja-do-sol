/** Persistência local (AsyncStorage): favoritos, histórico e preferências. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Place } from '../data/hubs';
import type { CabinZone, LateralSide, OptimizationMode, TransportMode } from '../engine/types';

export const KEYS = {
  favorites: '@fujadosol/favorites/v1',
  history: '@fujadosol/history/v1',
  preferences: '@fujadosol/preferences/v1',
} as const;

export const MAX_FAVORITES = 50;
export const MAX_HISTORY = 5;

export interface SavedTrip {
  id: string;
  name: string;
  createdAt: string;
  mode: TransportMode;
  origin: Place;
  destination: Place;
  /** Data local da origem (YYYY-MM-DD). */
  date: string;
  /** Horário local da origem (HH:MM). */
  time: string;
  durationMinutes: number;
  optimization: OptimizationMode;
  presetId?: string;
  summary?: {
    recommendedSide: LateralSide | 'either';
    advantagePct: number;
    verdict: string;
    bestSeat?: string;
  };
}

export interface UserPreferences {
  optimization: OptimizationMode;
  seatPosition: 'window' | 'aisle' | 'any';
  seatZone: CabinZone | 'any';
  /** Minutos de antecedência dos alertas de cortina. */
  alertLeadMinutes: number;
  useOnlineServices: boolean;
  language: 'pt' | 'en';
}

/** Idioma do aparelho: português para pt-*, inglês para o resto. */
export function detectDeviceLanguage(): 'pt' | 'en' {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    return locale.toLowerCase().startsWith('pt') ? 'pt' : 'en';
  } catch {
    return 'pt';
  }
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  optimization: 'shade',
  seatPosition: 'any',
  seatZone: 'any',
  alertLeadMinutes: 5,
  useOnlineServices: true,
  language: detectDeviceLanguage(),
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/** Assinatura que identifica a mesma rota/horário (para deduplicar). */
export function tripSignature(t: Pick<SavedTrip, 'mode' | 'origin' | 'destination' | 'date' | 'time'>): string {
  return `${t.mode}|${t.origin.id}|${t.destination.id}|${t.date}|${t.time}`;
}

export function createTripId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getFavorites(): Promise<SavedTrip[]> {
  const list = await readJson<SavedTrip[]>(KEYS.favorites, []);
  return Array.isArray(list) ? list : [];
}

export async function saveFavorite(trip: SavedTrip): Promise<SavedTrip[]> {
  const list = await getFavorites();
  const sig = tripSignature(trip);
  const filtered = list.filter((t) => t.id !== trip.id && tripSignature(t) !== sig);
  const next = [trip, ...filtered].slice(0, MAX_FAVORITES);
  await writeJson(KEYS.favorites, next);
  return next;
}

export async function removeFavorite(id: string): Promise<SavedTrip[]> {
  const next = (await getFavorites()).filter((t) => t.id !== id);
  await writeJson(KEYS.favorites, next);
  return next;
}

export async function isFavorite(trip: Pick<SavedTrip, 'mode' | 'origin' | 'destination' | 'date' | 'time'>): Promise<boolean> {
  const sig = tripSignature(trip);
  return (await getFavorites()).some((t) => tripSignature(t) === sig);
}

export async function getHistory(): Promise<SavedTrip[]> {
  const list = await readJson<SavedTrip[]>(KEYS.history, []);
  return Array.isArray(list) ? list : [];
}

export async function addToHistory(trip: SavedTrip): Promise<SavedTrip[]> {
  const sig = tripSignature(trip);
  const next = [trip, ...(await getHistory()).filter((t) => tripSignature(t) !== sig)].slice(0, MAX_HISTORY);
  await writeJson(KEYS.history, next);
  return next;
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.history);
}

export async function getPreferences(): Promise<UserPreferences> {
  const stored = await readJson<Partial<UserPreferences>>(KEYS.preferences, {});
  return { ...DEFAULT_PREFERENCES, ...(stored && typeof stored === 'object' ? stored : {}) };
}

export async function savePreferences(patch: Partial<UserPreferences>): Promise<UserPreferences> {
  const next = { ...(await getPreferences()), ...patch };
  await writeJson(KEYS.preferences, next);
  return next;
}
