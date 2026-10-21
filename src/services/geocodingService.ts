/**
 * Busca híbrida de lugares: base offline (fuzzy, sem acento) + Nominatim (OpenStreetMap)
 * com timeout curto, cache em memória e cache persistente em AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HUBS, type Place, type PlaceKind } from '../data/hubs';
import { haversineKm } from '../engine/geodesic';
import { guessTimeZone } from '../engine/timezone';
import type { Coordinates } from '../engine/types';
import { APP_USER_AGENT, fetchJson, type FetchLike } from './http';

export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const CACHE_KEY = '@fujadosol/geocache/v1';
const CACHE_MAX = 60;

export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Distância de Levenshtein com corte (retorna max+1 se exceder). */
export function boundedLevenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

interface IndexedPlace {
  place: Place;
  keys: string[];
}

const INDEX: IndexedPlace[] = HUBS.map((place) => ({
  place,
  keys: [place.name, place.city, place.code ?? '', ...(place.aliases ?? [])].filter(Boolean).map(normalizeText),
}));

const KIND_BOOST: Record<PlaceKind, number> = { city: 6, airport: 4, bus: 3, train: 2, port: 2, custom: 0 };

/** Pontuação de relevância (0 = não combina). */
export function scoreMatch(keys: readonly string[], q: string): number {
  if (!q) return 0;
  let best = 0;
  const qTokens = q.split(' ');
  for (const key of keys) {
    if (key === q) best = Math.max(best, 100);
    else if (key.startsWith(q)) best = Math.max(best, 80 - Math.min(20, key.length - q.length));
    else if (key.split(' ').some((w) => w.startsWith(q))) best = Math.max(best, 60);
    else if (key.includes(q)) best = Math.max(best, 45);
    else if (qTokens.length > 1 && qTokens.every((t) => key.includes(t))) best = Math.max(best, 40);
    else if (q.length >= 4) {
      const tol = q.length >= 7 ? 2 : 1;
      const words = key.split(' ');
      const head = key.slice(0, q.length);
      const d = Math.min(
        boundedLevenshtein(head, q, tol),
        ...words.map((w) => Math.min(boundedLevenshtein(w, q, tol), boundedLevenshtein(w.slice(0, q.length), q, tol))),
      );
      if (d <= tol) best = Math.max(best, 30 - d * 8);
    }
  }
  return best;
}

export function searchOffline(query: string, limit = 8): Place[] {
  const q = normalizeText(query);
  if (!q) return [];
  return INDEX.map(({ place, keys }) => ({ place, s: scoreMatch(keys, q) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s + KIND_BOOST[b.place.kind] - (a.s + KIND_BOOST[a.place.kind]) || a.place.name.localeCompare(b.place.name))
    .slice(0, limit)
    .map((r) => r.place);
}

export function nearestHub(coords: Coordinates, maxKm = 50): { place: Place; distanceKm: number } | null {
  let best: { place: Place; distanceKm: number } | null = null;
  for (const p of HUBS) {
    const d = haversineKm(coords, p.coords);
    if (d <= maxKm && (!best || d < best.distanceKm)) best = { place: p, distanceKm: d };
  }
  return best;
}

export interface NominatimResult {
  osm_type?: string;
  osm_id?: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  category?: string;
  type?: string;
  address?: Record<string, string>;
}

function kindFromOsm(r: NominatimResult): PlaceKind {
  const cat = r.category ?? '';
  const type = r.type ?? '';
  if (cat === 'aeroway' || type === 'aerodrome') return 'airport';
  if (type === 'bus_station' || (cat === 'amenity' && type === 'bus_station')) return 'bus';
  if (cat === 'railway' || type === 'station') return 'train';
  if (type === 'ferry_terminal' || cat === 'harbour' || type === 'harbour') return 'port';
  return 'city';
}

export function placeFromNominatim(r: NominatimResult): Place | null {
  const lat = Number(r.lat);
  const lon = Number(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const a = r.address ?? {};
  const countryCode = (a.country_code ?? '').toUpperCase();
  const iso = a['ISO3166-2-lvl4'] ?? '';
  const region = iso.includes('-') ? iso.split('-')[1] : a.state;
  const name = r.name && r.name.length > 0 ? r.name : r.display_name.split(',')[0];
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? name;
  const coords = { lat, lon };
  return {
    id: `osm-${r.osm_type ?? 'x'}-${r.osm_id ?? `${lat},${lon}`}`,
    name,
    city,
    region,
    country: a.country ?? countryCode,
    countryCode,
    kind: kindFromOsm(r),
    coords,
    tz: guessTimeZone(coords, countryCode || undefined, region),
    source: 'online',
  };
}

const memoryCache = new Map<string, Place[]>();
let persistentLoaded = false;

async function loadPersistentCache(): Promise<void> {
  if (persistentLoaded) return;
  persistentLoaded = true;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw) as Array<[string, Place[]]>;
    for (const [k, v] of entries) if (!memoryCache.has(k)) memoryCache.set(k, v);
  } catch {
    // cache corrompido: ignora
  }
}

async function savePersistentCache(): Promise<void> {
  try {
    const entries = [...memoryCache.entries()].slice(-CACHE_MAX);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch {
    // armazenamento indisponível: segue só com memória
  }
}

/** Limpa caches (usado nos testes e no ajuste "Limpar dados"). */
export async function clearGeocodeCache(): Promise<void> {
  memoryCache.clear();
  persistentLoaded = false;
  await AsyncStorage.removeItem(CACHE_KEY);
}

export interface GeocodeOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  limit?: number;
  online?: boolean;
}

export async function searchOnline(query: string, opts: GeocodeOptions = {}): Promise<Place[]> {
  const q = normalizeText(query);
  if (q.length < 3) return [];
  await loadPersistentCache();
  const cached = memoryCache.get(q);
  if (cached) return cached;
  const url = `${NOMINATIM_URL}?format=jsonv2&addressdetails=1&limit=${opts.limit ?? 6}&accept-language=pt-BR&q=${encodeURIComponent(query.trim())}`;
  const data = await fetchJson<NominatimResult[]>(url, {
    fetchImpl: opts.fetchImpl,
    timeoutMs: opts.timeoutMs ?? 4500,
    headers: { 'User-Agent': APP_USER_AGENT, Accept: 'application/json', 'Accept-Language': 'pt-BR' },
  });
  const places = (Array.isArray(data) ? data : []).map(placeFromNominatim).filter((p): p is Place => p !== null);
  memoryCache.delete(q);
  memoryCache.set(q, places);
  void savePersistentCache();
  return places;
}

export interface SearchResult {
  results: Place[];
  source: 'offline' | 'hybrid';
  error?: string;
}

/** Offline primeiro; completa com Nominatim quando há poucos resultados locais. */
export async function searchPlaces(query: string, opts: GeocodeOptions = {}): Promise<SearchResult> {
  const limit = opts.limit ?? 8;
  const offline = searchOffline(query, limit);
  if (opts.online === false || normalizeText(query).length < 3 || offline.length >= Math.min(limit, 5)) {
    return { results: offline, source: 'offline' };
  }
  try {
    const online = await searchOnline(query, opts);
    const merged = [...offline];
    for (const p of online) {
      const dup = merged.some((m) => haversineKm(m.coords, p.coords) < 3 && normalizeText(m.city) === normalizeText(p.city));
      if (!dup) merged.push(p);
    }
    return { results: merged.slice(0, limit), source: 'hybrid' };
  } catch (e) {
    return { results: offline, source: 'offline', error: e instanceof Error ? e.message : String(e) };
  }
}

/** Cria um Place a partir de coordenadas do GPS, nomeado pelo hub mais próximo. */
export function placeFromCoordinates(coords: Coordinates): Place {
  const near = nearestHub(coords, 40);
  const label = near ? `Perto de ${near.place.city}` : `${coords.lat.toFixed(3)}, ${coords.lon.toFixed(3)}`;
  return {
    id: `gps-${coords.lat.toFixed(4)},${coords.lon.toFixed(4)}`,
    name: 'Minha localização',
    city: label,
    region: near?.place.region,
    country: near?.place.country ?? '',
    countryCode: near?.place.countryCode ?? '',
    kind: 'custom',
    coords,
    tz: near?.place.tz ?? guessTimeZone(coords),
    source: 'gps',
  };
}
