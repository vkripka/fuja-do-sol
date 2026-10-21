/**
 * Geometria esférica/geodésica: Haversine, rumo inicial (forward azimuth),
 * interpolação de grande círculo (SLERP), splines e codec de Polyline (Google/OSRM).
 */
import { clamp, cosD, DEG, normalizeDegrees, RAD, sinD } from './math';
import type { Coordinates } from './types';

/** Raio médio da Terra (IUGG) em km. */
export const EARTH_RADIUS_KM = 6371.0088;

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + cosD(a.lat) * cosD(b.lat) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Forward bearing θ ∈ [0, 360) de `a` para `b`, horário a partir do Norte verdadeiro. */
export function initialBearing(a: Coordinates, b: Coordinates): number {
  const dLon = (b.lon - a.lon) * RAD;
  const y = Math.sin(dLon) * cosD(b.lat);
  const x = cosD(a.lat) * sinD(b.lat) - sinD(a.lat) * cosD(b.lat) * Math.cos(dLon);
  return normalizeDegrees(Math.atan2(y, x) * DEG);
}

/** Rumo final ao chegar em `b` vindo de `a`. */
export function finalBearing(a: Coordinates, b: Coordinates): number {
  return normalizeDegrees(initialBearing(b, a) + 180);
}

export function normalizeLongitude(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/** Ponto de destino a partir de origem, rumo e distância (km). */
export function destinationPoint(origin: Coordinates, bearing: number, distanceKm: number): Coordinates {
  const delta = distanceKm / EARTH_RADIUS_KM;
  const phi1 = origin.lat * RAD;
  const lambda1 = origin.lon * RAD;
  const theta = bearing * RAD;
  const sinPhi2 = Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta);
  const phi2 = Math.asin(clamp(sinPhi2, -1, 1));
  const lambda2 =
    lambda1 + Math.atan2(Math.sin(theta) * Math.sin(delta) * Math.cos(phi1), Math.cos(delta) - Math.sin(phi1) * sinPhi2);
  return { lat: phi2 * DEG, lon: normalizeLongitude(lambda2 * DEG) };
}

/** Interpolação esférica (SLERP) ao longo do grande círculo, f ∈ [0, 1]. */
export function interpolateGreatCircle(a: Coordinates, b: Coordinates, f: number): Coordinates {
  const phi1 = a.lat * RAD, lambda1 = a.lon * RAD;
  const phi2 = b.lat * RAD, lambda2 = b.lon * RAD;
  const delta = haversineKm(a, b) / EARTH_RADIUS_KM;
  if (delta < 1e-12) return { lat: a.lat, lon: a.lon };
  const A = Math.sin((1 - f) * delta) / Math.sin(delta);
  const B = Math.sin(f * delta) / Math.sin(delta);
  const x = A * Math.cos(phi1) * Math.cos(lambda1) + B * Math.cos(phi2) * Math.cos(lambda2);
  const y = A * Math.cos(phi1) * Math.sin(lambda1) + B * Math.cos(phi2) * Math.sin(lambda2);
  const z = A * Math.sin(phi1) + B * Math.sin(phi2);
  return { lat: Math.atan2(z, Math.hypot(x, y)) * DEG, lon: Math.atan2(y, x) * DEG };
}

export function midpoint(a: Coordinates, b: Coordinates): Coordinates {
  return interpolateGreatCircle(a, b, 0.5);
}

/** Amostra `points` pontos (>= 2) do grande círculo entre `a` e `b`. */
export function greatCirclePath(a: Coordinates, b: Coordinates, points = 64): Coordinates[] {
  const n = Math.max(2, Math.floor(points));
  const out: Coordinates[] = [];
  out.push({ lat: a.lat, lon: a.lon });
  for (let i = 1; i < n - 1; i++) out.push(interpolateGreatCircle(a, b, i / (n - 1)));
  out.push({ lat: b.lat, lon: b.lon });
  return out;
}

export function cumulativeDistances(path: readonly Coordinates[]): number[] {
  const cum: number[] = [0];
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + haversineKm(path[i - 1], path[i]));
  return cum;
}

export function pathLengthKm(path: readonly Coordinates[]): number {
  const cum = cumulativeDistances(path);
  return cum[cum.length - 1];
}

export interface PathSample {
  point: Coordinates;
  /** Rumo da aresta da polyline que contém o ponto. */
  bearing: number;
  edgeIndex: number;
}

/**
 * Localiza o ponto a `distanceKm` ao longo de uma polyline (com distâncias acumuladas
 * pré-computadas), interpolando esfericamente dentro da aresta.
 */
export function pointAlongPath(path: readonly Coordinates[], cum: readonly number[], distanceKm: number): PathSample {
  if (path.length === 0) throw new Error('Caminho vazio');
  if (path.length === 1) return { point: path[0], bearing: 0, edgeIndex: 0 };
  const total = cum[cum.length - 1];
  const d = clamp(distanceKm, 0, total);
  // busca binária pela aresta
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= d) lo = mid;
    else hi = mid;
  }
  // pula arestas degeneradas (pontos repetidos)
  let i = lo;
  while (i < path.length - 2 && cum[i + 1] - cum[i] < 1e-9) i++;
  const edgeLen = cum[i + 1] - cum[i];
  const f = edgeLen > 1e-9 ? (d - cum[i]) / edgeLen : 0;
  const a = path[i];
  const b = path[i + 1];
  return { point: interpolateGreatCircle(a, b, clamp(f, 0, 1)), bearing: edgeLen > 1e-9 ? initialBearing(a, b) : 0, edgeIndex: i };
}

/** Spline Catmull-Rom (centrípeta simplificada em plano local) passando por todos os waypoints. */
export function catmullRomSpline(points: readonly Coordinates[], samplesPerSegment = 12): Coordinates[] {
  if (points.length < 3) return points.slice();
  const out: Coordinates[] = [];
  const n = Math.max(2, Math.floor(samplesPerSegment));
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < n; s++) {
      const t = s / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (a0: number, a1: number, a2: number, a3: number): number =>
        0.5 * (2 * a1 + (-a0 + a2) * t + (2 * a0 - 5 * a1 + 4 * a2 - a3) * t2 + (-a0 + 3 * a1 - 3 * a2 + a3) * t3);
      out.push({ lat: c(p0.lat, p1.lat, p2.lat, p3.lat), lon: c(p0.lon, p1.lon, p2.lon, p3.lon) });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Hash determinístico simples para curvaturas reprodutíveis. */
function seededUnit(a: Coordinates, b: Coordinates): number {
  const s = Math.sin(a.lat * 12.9898 + a.lon * 78.233 + b.lat * 37.719 + b.lon * 4.581) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Gera uma curva suave "estilo estrada" entre `a` e `b` (fallback offline de rotas terrestres):
 * desloca waypoints intermediários perpendicularmente ao grande círculo com amplitude
 * proporcional à distância e aplica spline. Determinístico para o mesmo par de pontos.
 */
export function smoothCurvedPath(a: Coordinates, b: Coordinates, options: { points?: number; curvature?: number } = {}): Coordinates[] {
  const points = options.points ?? 80;
  const dist = haversineKm(a, b);
  if (dist < 0.05) return [a, b];
  const curvature = options.curvature ?? 0.06 + seededUnit(a, b) * 0.06;
  const bearing = initialBearing(a, b);
  const controls: Coordinates[] = [a];
  const k = 4;
  for (let i = 1; i < k; i++) {
    const f = i / k;
    const base = interpolateGreatCircle(a, b, f);
    const wiggle = Math.sin(f * Math.PI) * (i % 2 === 0 ? -0.5 : 1);
    controls.push(destinationPoint(base, bearing + 90, dist * curvature * wiggle));
  }
  controls.push(b);
  const perSeg = Math.max(2, Math.round(points / (controls.length - 1)));
  return catmullRomSpline(controls, perSeg);
}

/** Rota passando por waypoints, suavizada. Útil para presets de barco/trem. */
export function waypointPath(waypoints: readonly Coordinates[], samplesPerSegment = 10): Coordinates[] {
  if (waypoints.length < 2) return waypoints.slice();
  if (waypoints.length === 2) return greatCirclePath(waypoints[0], waypoints[1], samplesPerSegment + 1);
  return catmullRomSpline(waypoints, samplesPerSegment);
}

/** Decodifica Encoded Polyline (Google / OSRM). precision = 5 (polyline) ou 6 (polyline6). */
export function decodePolyline(encoded: string, precision: 5 | 6 = 5): Coordinates[] {
  const factor = 10 ** precision;
  const coords: Coordinates[] = [];
  let index = 0;
  let lat = 0;
  let lon = 0;
  while (index < encoded.length) {
    for (let axis = 0; axis < 2; axis++) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        if (index >= encoded.length) throw new Error('Polyline malformada');
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lon += delta;
    }
    coords.push({ lat: lat / factor, lon: lon / factor });
  }
  return coords;
}

/** Codifica coordenadas em Encoded Polyline. */
export function encodePolyline(points: readonly Coordinates[], precision: 5 | 6 = 5): string {
  const factor = 10 ** precision;
  let out = '';
  let prevLat = 0;
  let prevLon = 0;
  const encodeValue = (v: number): string => {
    let value = v < 0 ? ~(v << 1) : v << 1;
    let s = '';
    while (value >= 0x20) {
      s += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
      value >>= 5;
    }
    return s + String.fromCharCode(value + 63);
  };
  for (const p of points) {
    const lat = Math.round(p.lat * factor);
    const lon = Math.round(p.lon * factor);
    out += encodeValue(lat - prevLat) + encodeValue(lon - prevLon);
    prevLat = lat;
    prevLon = lon;
  }
  return out;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export function boundingBox(path: readonly Coordinates[]): BoundingBox {
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const p of path) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLon = Math.min(minLon, p.lon);
    maxLon = Math.max(maxLon, p.lon);
  }
  return { minLat, maxLat, minLon, maxLon };
}

/** Rumo cardeal em pt-BR (N, NE, L, SE, S, SO, O, NO). */
export function cardinalPt(bearing: number): string {
  const names = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
  return names[Math.round(normalizeDegrees(bearing) / 45) % 8];
}

/** Simplificação de Douglas-Peucker (tolerância em km) para reduzir polylines longas. */
export function simplifyPath(path: readonly Coordinates[], toleranceKm: number): Coordinates[] {
  if (path.length <= 2) return path.slice();
  const keep = new Uint8Array(path.length);
  keep[0] = 1;
  keep[path.length - 1] = 1;
  const lat0 = path[0].lat;
  const kx = 111.32 * cosD(lat0);
  const ky = 110.574;
  const stack: Array<[number, number]> = [[0, path.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop() as [number, number];
    const ax = path[s].lon * kx, ay = path[s].lat * ky;
    const bx = path[e].lon * kx, by = path[e].lat * ky;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let maxD = -1;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const px = path[i].lon * kx, py = path[i].lat * ky;
      const t = len2 > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > toleranceKm && idx > 0) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return path.filter((_, i) => keep[i] === 1);
}
