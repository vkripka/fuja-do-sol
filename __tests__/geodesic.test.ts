import {
  boundingBox,
  cardinalPt,
  catmullRomSpline,
  cumulativeDistances,
  decodePolyline,
  destinationPoint,
  encodePolyline,
  finalBearing,
  greatCirclePath,
  haversineKm,
  initialBearing,
  interpolateGreatCircle,
  midpoint,
  normalizeLongitude,
  pathLengthKm,
  pointAlongPath,
  simplifyPath,
  smoothCurvedPath,
  waypointPath,
} from '../src/engine/geodesic';
import { angularDistance, clamp, normalizeDegrees, normalizeSigned, round, sum } from '../src/engine/math';
import { RIO, SAO_PAULO } from './helpers';

describe('Haversine', () => {
  it('São Paulo → Rio de Janeiro ≈ 360 km em linha reta', () => {
    const d = haversineKm(SAO_PAULO, RIO);
    expect(d).toBeGreaterThan(355);
    expect(d).toBeLessThan(365);
  });
  it('1° de latitude ≈ 111.2 km', () => {
    expect(haversineKm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(111.19, 1);
  });
  it('é simétrica e nula para o mesmo ponto', () => {
    expect(haversineKm(RIO, SAO_PAULO)).toBeCloseTo(haversineKm(SAO_PAULO, RIO), 9);
    expect(haversineKm(RIO, RIO)).toBe(0);
  });
});

describe('Forward Bearing (azimutes cardeais)', () => {
  const o = { lat: 0, lon: 0 };
  it.each([
    [{ lat: 1, lon: 0 }, 0],
    [{ lat: 0, lon: 1 }, 90],
    [{ lat: -1, lon: 0 }, 180],
    [{ lat: 0, lon: -1 }, 270],
  ])('para %j o rumo é %d°', (to, expected) => {
    expect(initialBearing(o, to)).toBeCloseTo(expected, 6);
  });
  it('SP → RJ segue para Leste-Nordeste (~79°)', () => {
    const b = initialBearing(SAO_PAULO, RIO);
    expect(b).toBeGreaterThan(70);
    expect(b).toBeLessThan(85);
    expect(cardinalPt(b)).toBe('L');
  });
  it('rumo final difere do inicial em rotas longas', () => {
    const gru = { lat: -23.43, lon: -46.47 };
    const lis = { lat: 38.77, lon: -9.13 };
    expect(Math.abs(finalBearing(gru, lis) - initialBearing(gru, lis))).toBeGreaterThan(5);
  });
});

describe('Interpolação esférica e destino', () => {
  it('SLERP preserva as extremidades e divide a distância ao meio', () => {
    expect(interpolateGreatCircle(SAO_PAULO, RIO, 0).lat).toBeCloseTo(SAO_PAULO.lat, 9);
    expect(interpolateGreatCircle(SAO_PAULO, RIO, 1).lon).toBeCloseTo(RIO.lon, 9);
    const m = midpoint(SAO_PAULO, RIO);
    expect(haversineKm(SAO_PAULO, m)).toBeCloseTo(haversineKm(SAO_PAULO, RIO) / 2, 6);
    expect(interpolateGreatCircle(RIO, RIO, 0.5)).toEqual(RIO);
  });
  it('destinationPoint é o inverso de bearing+distância', () => {
    const d = haversineKm(SAO_PAULO, RIO);
    const p = destinationPoint(SAO_PAULO, initialBearing(SAO_PAULO, RIO), d);
    expect(haversineKm(p, RIO)).toBeLessThan(0.001);
  });
  it('normaliza longitudes através do antimeridiano', () => {
    expect(normalizeLongitude(190)).toBeCloseTo(-170);
    expect(normalizeLongitude(-190)).toBeCloseTo(170);
    const p = destinationPoint({ lat: 0, lon: 179.5 }, 90, 111.32);
    expect(p.lon).toBeCloseTo(-179.5, 1);
  });
  it('greatCirclePath tem o comprimento da geodésica', () => {
    const path = greatCirclePath(SAO_PAULO, RIO, 32);
    expect(path).toHaveLength(32);
    expect(pathLengthKm(path)).toBeCloseTo(haversineKm(SAO_PAULO, RIO), 3);
    expect(greatCirclePath(SAO_PAULO, RIO, 1)).toHaveLength(2);
  });
});

describe('Amostragem ao longo da polyline', () => {
  const path = [
    { lat: 0, lon: 0 },
    { lat: 0, lon: 1 },
    { lat: 0, lon: 1 },
    { lat: 1, lon: 1 },
  ];
  const cum = cumulativeDistances(path);
  it('localiza pontos e rumos por aresta', () => {
    const a = pointAlongPath(path, cum, 50);
    expect(a.bearing).toBeCloseTo(90, 3);
    expect(a.point.lat).toBeCloseTo(0, 6);
    const b = pointAlongPath(path, cum, cum[3] - 10);
    expect(b.bearing).toBeCloseTo(0, 3);
  });
  it('faz clamp fora do intervalo e pula arestas degeneradas', () => {
    expect(pointAlongPath(path, cum, -10).point).toEqual(path[0]);
    expect(pointAlongPath(path, cum, 1e9).point.lat).toBeCloseTo(1, 6);
    const atCorner = pointAlongPath(path, cum, cum[1]);
    expect(atCorner.edgeIndex).toBe(2);
  });
  it('lida com caminhos de 0 e 1 ponto', () => {
    expect(() => pointAlongPath([], [], 0)).toThrow();
    expect(pointAlongPath([RIO], [0], 5).point).toEqual(RIO);
  });
});

describe('Curvas offline', () => {
  it('spline Catmull-Rom passa pelos waypoints', () => {
    const wps = [SAO_PAULO, { lat: -23.2, lon: -45.9 }, RIO];
    const s = catmullRomSpline(wps, 8);
    expect(s[0]).toEqual(SAO_PAULO);
    expect(s[8].lat).toBeCloseTo(-23.2, 6);
    expect(s[s.length - 1]).toEqual(RIO);
    expect(catmullRomSpline([SAO_PAULO, RIO])).toHaveLength(2);
  });
  it('curva estilo estrada é determinística e mais longa que a reta', () => {
    const a = smoothCurvedPath(SAO_PAULO, RIO);
    const b = smoothCurvedPath(SAO_PAULO, RIO);
    expect(a).toEqual(b);
    expect(a[0]).toEqual(SAO_PAULO);
    expect(a[a.length - 1]).toEqual(RIO);
    const ratio = pathLengthKm(a) / haversineKm(SAO_PAULO, RIO);
    expect(ratio).toBeGreaterThan(1.0);
    expect(ratio).toBeLessThan(1.3);
    expect(smoothCurvedPath(RIO, RIO)).toHaveLength(2);
  });
  it('waypointPath cobre 1, 2 e N pontos', () => {
    expect(waypointPath([RIO])).toHaveLength(1);
    expect(waypointPath([SAO_PAULO, RIO], 4)).toHaveLength(5);
    expect(waypointPath([SAO_PAULO, { lat: -23, lon: -45 }, RIO], 5).length).toBe(11);
  });
});

describe('Polyline (Google / OSRM)', () => {
  it('decodifica o exemplo oficial do Google (precisão 5)', () => {
    const pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(pts).toHaveLength(3);
    expect(pts[0]).toEqual({ lat: 38.5, lon: -120.2 });
    expect(pts[1]).toEqual({ lat: 40.7, lon: -120.95 });
    expect(pts[2]).toEqual({ lat: 43.252, lon: -126.453 });
  });
  it('codifica e decodifica ida-e-volta com precisão 6', () => {
    const pts = [SAO_PAULO, { lat: -23.1, lon: -45.7 }, RIO];
    const enc = encodePolyline(pts, 6);
    const dec = decodePolyline(enc, 6);
    dec.forEach((p, i) => {
      expect(p.lat).toBeCloseTo(pts[i].lat, 6);
      expect(p.lon).toBeCloseTo(pts[i].lon, 6);
    });
    expect(encodePolyline([{ lat: 38.5, lon: -120.2 }, { lat: 40.7, lon: -120.95 }, { lat: 43.252, lon: -126.453 }])).toBe(
      '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
    );
  });
  it('rejeita polyline truncada', () => {
    expect(() => decodePolyline('_p~iF~ps|')).toThrow('Polyline malformada');
  });
});

describe('Utilitários', () => {
  it('boundingBox e simplificação Douglas-Peucker', () => {
    const line = Array.from({ length: 50 }, (_, i) => ({ lat: 0, lon: i * 0.01 }));
    const bb = boundingBox(line);
    expect(bb.minLon).toBe(0);
    expect(bb.maxLon).toBeCloseTo(0.49);
    expect(simplifyPath(line, 0.01)).toHaveLength(2);
    const zig = [{ lat: 0, lon: 0 }, { lat: 0.5, lon: 0.5 }, { lat: 0, lon: 1 }];
    expect(simplifyPath(zig, 1)).toHaveLength(3);
    expect(simplifyPath(zig.slice(0, 2), 1)).toHaveLength(2);
  });
  it('rótulos cardeais em pt-BR', () => {
    expect([0, 45, 90, 135, 180, 225, 270, 315, 359].map(cardinalPt)).toEqual(['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO', 'N']);
  });
  it('funções angulares', () => {
    expect(normalizeDegrees(-30)).toBe(330);
    expect(normalizeDegrees(720)).toBe(0);
    expect(normalizeDegrees(-360)).toBe(0);
    expect(normalizeSigned(190)).toBe(-170);
    expect(angularDistance(350, 10)).toBe(20);
    expect(clamp(5, 0, 3)).toBe(3);
    expect(round(1.2345, 2)).toBe(1.23);
    expect(sum([1, 2, 3])).toBe(6);
  });
});
