/**
 * Geometria da rota: OSRM público para modais terrestres (com internet) e, para avião,
 * barco ou modo offline, grande círculo / waypoints / curva suave — nunca falha.
 */
import {
  decodePolyline,
  greatCirclePath,
  haversineKm,
  pathLengthKm,
  simplifyPath,
  smoothCurvedPath,
  waypointPath,
} from '../engine/geodesic';
import { estimateDurationMinutes } from '../engine/routeDiscretizer';
import type { Coordinates, TransportMode } from '../engine/types';
import { APP_USER_AGENT, fetchJson, type FetchLike } from './http';

export const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
/** Acima disso o servidor público costuma recusar/demorar; usamos fallback. */
const OSRM_MAX_KM = 3500;

export type RouteSource = 'osrm' | 'waypoints' | 'geodesic' | 'curved';

export interface RouteResult {
  path: Coordinates[];
  distanceKm: number;
  /** Duração estimada pelo perfil do modal. */
  durationMinutes: number;
  source: RouteSource;
}

export interface RouteOptions {
  /** Waypoints intermediários (sem origem/destino). */
  waypoints?: Coordinates[];
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  online?: boolean;
}

interface OsrmResponse {
  code: string;
  routes?: Array<{ geometry: string; distance: number; duration: number }>;
}

const cache = new Map<string, RouteResult>();

export function clearRouteCache(): void {
  cache.clear();
}

const key = (pts: Coordinates[], mode: TransportMode): string =>
  `${mode}|${pts.map((p) => `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`).join(';')}`;

export async function fetchOsrmRoute(points: Coordinates[], opts: RouteOptions = {}): Promise<{ path: Coordinates[]; distanceKm: number }> {
  const coords = points.map((p) => `${p.lon.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
  const url = `${OSRM_URL}/${coords}?overview=full&geometries=polyline6&steps=false&alternatives=false`;
  const data = await fetchJson<OsrmResponse>(url, {
    fetchImpl: opts.fetchImpl,
    timeoutMs: opts.timeoutMs ?? 7000,
    headers: { 'User-Agent': APP_USER_AGENT },
  });
  const route = data.routes?.[0];
  if (data.code !== 'Ok' || !route) throw new Error(`OSRM: ${data.code}`);
  const raw = decodePolyline(route.geometry, 6);
  if (raw.length < 2) throw new Error('OSRM: geometria vazia');
  // reduz polylines enormes mantendo a forma (tolerância ~40 m)
  const path = raw.length > 1500 ? simplifyPath(raw, 0.04) : raw;
  return { path, distanceKm: route.distance / 1000 };
}

function offlineRoute(all: Coordinates[], mode: TransportMode, hasWaypoints: boolean): RouteResult {
  const [origin, destination] = [all[0], all[all.length - 1]];
  let path: Coordinates[];
  let source: RouteSource;
  if (mode === 'plane') {
    path = greatCirclePath(origin, destination, 96);
    source = 'geodesic';
  } else if (hasWaypoints) {
    path = waypointPath(all, 12);
    source = 'waypoints';
  } else if (mode === 'boat') {
    path = greatCirclePath(origin, destination, 48);
    source = 'geodesic';
  } else {
    path = smoothCurvedPath(origin, destination, { points: 96 });
    source = 'curved';
  }
  const distanceKm = pathLengthKm(path);
  // Waypoints reproduzem o traçado real; nos demais casos aplica o fator de desvio do modal.
  const durationMinutes =
    source === 'waypoints'
      ? estimateDurationMinutes(distanceKm, mode, true)
      : estimateDurationMinutes(haversineKm(origin, destination), mode, false);
  return { path, distanceKm, durationMinutes, source };
}

/** Obtém a melhor geometria disponível para a viagem. */
export async function getRoute(
  origin: Coordinates,
  destination: Coordinates,
  mode: TransportMode,
  opts: RouteOptions = {},
): Promise<RouteResult> {
  const waypoints = opts.waypoints ?? [];
  const all = [origin, ...waypoints, destination];
  const k = key(all, mode);
  const hit = cache.get(k);
  if (hit) return hit;

  const terrestrial = mode === 'bus' || mode === 'car' || (mode === 'train' && waypoints.length === 0);
  const direct = haversineKm(origin, destination);
  let result: RouteResult | null = null;
  if (terrestrial && opts.online !== false && direct > 0.2 && direct < OSRM_MAX_KM) {
    try {
      const r = await fetchOsrmRoute(all.length > 12 ? [origin, ...waypoints.slice(0, 10), destination] : all, opts);
      result = { ...r, durationMinutes: estimateDurationMinutes(r.distanceKm, mode, true), source: 'osrm' };
    } catch {
      result = null;
    }
  }
  result ??= offlineRoute(all, mode, waypoints.length > 0);
  cache.set(k, result);
  return result;
}
