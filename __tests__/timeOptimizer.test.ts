import { optimizeDepartureTime, simulateSlot } from '../src/engine/timeOptimizer';
import { utcToZoned } from '../src/engine/timezone';
import { brt, northToSouth, trip } from './helpers';

describe('Otimizador de horário (24h)', () => {
  const base = trip({ departure: brt(2025, 3, 20, 10), durationMinutes: 120, path: northToSouth(-46.6, -21, -22.5) });
  const result = optimizeDepartureTime(base, { slots: 24, timeZone: 'America/Sao_Paulo' });

  it('simula 24 horários cheios no fuso da origem', () => {
    expect(result.slots).toHaveLength(24);
    result.slots.forEach((s, i) => {
      expect(s.hour).toBe(i);
      const local = utcToZoned(s.departure, 'America/Sao_Paulo');
      expect(local.hour).toBe(i);
      expect(local.day).toBe(20);
      expect(s.arrival.getTime() - s.departure.getTime()).toBe(120 * 60000);
    });
  });

  it('campeão de sombra absoluto é noturno; campeão diurno tem pouca noite', () => {
    expect(result.bestShade.bestSideEnergy).toBeLessThanOrEqual(Math.min(...result.slots.map((s) => s.bestSideEnergy)));
    expect(result.bestShade.nightFraction).toBe(1);
    expect(result.bestDaytimeShade).not.toBeNull();
    expect(result.bestDaytimeShade!.nightFraction).toBeLessThanOrEqual(0.5);
    expect(result.worst.bestSideEnergy).toBeGreaterThanOrEqual(result.bestDaytimeShade!.bestSideEnergy);
  });

  it('meio do dia pega mais calor que a madrugada', () => {
    const night = result.slots[2];
    const day = result.slots[9];
    expect(day.heatScore).toBeGreaterThan(night.heatScore);
    expect(night.comfortScore).toBe(100);
    expect(day.shadeSide).toBe('right');
  });

  it('campeão de golden hour fica perto do nascer ou do pôr do sol', () => {
    expect(result.bestGolden).not.toBeNull();
    const h = result.bestGolden!.hour;
    expect([4, 5, 6, 7, 15, 16, 17, 18]).toContain(h);
    expect(result.bestGolden!.goldenScore).toBeGreaterThan(0);
    expect(result.bestGolden!.goldenSide).not.toBeNull();
  });

  it('aceita 12 horários, fuso UTC padrão e caminho ausente', () => {
    const r = optimizeDepartureTime({ ...base, path: undefined }, { slots: 12 });
    expect(r.slots).toHaveLength(12);
    expect(r.slots[1].hour).toBe(2);
    const half = optimizeDepartureTime(base, { slots: 48, timeZone: 'America/Sao_Paulo', segmentCount: 24 });
    expect(half.slots[1].minute).toBe(30);
  });

  it('noite polar: nenhum horário com golden hour', () => {
    const polar = trip({
      departure: new Date(Date.UTC(2025, 11, 21, 12)),
      path: [
        { lat: 80, lon: 10 },
        { lat: 79.5, lon: 10 },
      ],
    });
    const r = optimizeDepartureTime(polar, { slots: 12 });
    expect(r.bestGolden).toBeNull();
    expect(r.bestDaytimeShade).toBeNull();
  });

  it('simulateSlot calcula conforto e calor', () => {
    const s = simulateSlot(base, brt(2025, 3, 20, 16), 24, 16, 0);
    expect(s.shadeSide).toBe('left');
    expect(s.heatScore).toBeGreaterThan(s.comfortScore - 100);
    expect(s.sunlitMinutes).toBeGreaterThan(60);
  });
});
