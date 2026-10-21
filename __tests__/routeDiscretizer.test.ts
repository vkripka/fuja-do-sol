import { haversineKm } from '../src/engine/geodesic';
import {
  defaultAltitude,
  defaultPath,
  discretizeRoute,
  estimateDurationMinutes,
  MAX_SEGMENTS,
  MIN_SEGMENTS,
  segmentCountFor,
} from '../src/engine/routeDiscretizer';
import { northToSouth, RIO, SAO_PAULO } from './helpers';

describe('Discretização espaço-temporal', () => {
  const dep = new Date(Date.UTC(2025, 2, 20, 12));

  it('N = clamp(floor(duração/2), 24, 120)', () => {
    expect(segmentCountFor(10)).toBe(MIN_SEGMENTS);
    expect(segmentCountFor(100)).toBe(50);
    expect(segmentCountFor(1000)).toBe(MAX_SEGMENTS);
  });

  it('gera segmentos uniformes com tempos f_i = (i+0.5)/N', () => {
    const segs = discretizeRoute(northToSouth(), dep, 120);
    expect(segs).toHaveLength(60);
    expect(segs[0].fraction).toBeCloseTo(0.5 / 60);
    expect(segs[0].minutesFromStart).toBeCloseTo(1);
    expect(segs[59].time.getTime()).toBe(dep.getTime() + 119 * 60000);
    const d0 = segs[0].distanceKm;
    segs.forEach((s) => {
      expect(s.distanceKm).toBeCloseTo(d0, 6);
      expect(s.bearing).toBeCloseTo(180, 3);
      expect(s.durationMinutes).toBeCloseTo(2);
    });
    expect(segs[59].cumulativeKm).toBeCloseTo(haversineKm(segs[0].start, segs[59].end) * (59.5 / 60), 1);
  });

  it('aceita número de segmentos forçado', () => {
    expect(discretizeRoute(northToSouth(), dep, 600, { segments: 10 })).toHaveLength(10);
  });

  it('rota degenerada (1 ponto) não quebra', () => {
    const segs = discretizeRoute([RIO], dep, 30);
    expect(segs).toHaveLength(MIN_SEGMENTS);
    expect(segs[0].distanceKm).toBe(0);
    expect(segs[0].bearing).toBe(0);
  });

  it('valida entradas', () => {
    expect(() => discretizeRoute([], dep, 30)).toThrow();
    expect(() => discretizeRoute([RIO, SAO_PAULO], dep, 0)).toThrow();
  });

  it('caminho padrão é o grande círculo', () => {
    const p = defaultPath(SAO_PAULO, RIO);
    expect(p).toHaveLength(64);
    expect(p[0]).toEqual(SAO_PAULO);
  });
});

describe('Estimativa de duração por modal', () => {
  it('SP → RJ: ônibus ~6-7h, carro ~5-6h, avião ~1h', () => {
    const d = haversineKm(SAO_PAULO, RIO);
    const bus = estimateDurationMinutes(d, 'bus');
    const car = estimateDurationMinutes(d, 'car');
    const plane = estimateDurationMinutes(d, 'plane');
    expect(bus).toBeGreaterThan(330);
    expect(bus).toBeLessThan(450);
    expect(car).toBeLessThan(bus);
    expect(plane).toBeGreaterThan(45);
    expect(plane).toBeLessThan(80);
    expect(bus % 5).toBe(0);
  });
  it('usa a distância rodoviária sem fator de desvio quando informado', () => {
    expect(estimateDurationMinutes(430, 'car', true)).toBe(315);
    expect(estimateDurationMinutes(0.1, 'boat')).toBeGreaterThanOrEqual(5);
    expect(estimateDurationMinutes(100, 'train')).toBeGreaterThan(80);
  });
  it('altitude padrão: avião em cruzeiro', () => {
    expect(defaultAltitude('plane')).toBe(11000);
    expect(defaultAltitude('bus')).toBe(0);
  });
});
