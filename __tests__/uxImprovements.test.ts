import { analyzeTrip } from '../src/engine/exposureCalculator';
import { durationFromOsrm, estimateDurationMinutes } from '../src/engine/routeDiscretizer';
import { recommendSeats } from '../src/engine/seatRecommender';
import { contrastRatio, contrastText, goldenColor, HEAT_RAMP, heatColor, heatTextColor } from '../src/theme/palette';
import { minutesBetween, nowRounded } from '../src/utils/format';
import { brt, northToSouth, trip } from './helpers';

describe('Duração realista em rotas curtas', () => {
  it('13 km urbanos: carro ~10 min e ônibus sem o tempo extra de viagem longa', () => {
    expect(estimateDurationMinutes(13, 'car', true)).toBe(10);
    const bus = estimateDurationMinutes(13, 'bus', true);
    expect(bus).toBeGreaterThanOrEqual(10);
    expect(bus).toBeLessThanOrEqual(15);
    expect(estimateDurationMinutes(0.5, 'car', true)).toBe(5);
  });

  it('viagens longas mantêm o tempo extra inteiro', () => {
    // 400 km de ônibus: 400/68 h + 15 min de paradas
    expect(estimateDurationMinutes(400, 'bus', true)).toBe(370);
  });

  it('usa a duração real do OSRM ajustada pelo modal', () => {
    expect(durationFromOsrm(3600, 100, 'car')).toBe(60);
    expect(durationFromOsrm(3600, 100, 'bus')).toBe(85); // 60 × 1.2 + 15
    expect(durationFromOsrm(3600, 100, 'train')).toBe(70); // 60 × 1.1 + 5
    expect(durationFromOsrm(780, 13, 'car')).toBe(15);
    expect(durationFromOsrm(0, 430, 'car')).toBe(estimateDurationMinutes(430, 'car', true));
  });
});

describe('Motorista consultável no carro', () => {
  it('tem mapa de calor próprio, mas nunca é o Melhor Assento', () => {
    const a = analyzeTrip(trip({ departure: brt(2025, 3, 20, 8), mode: 'car', path: northToSouth(-46.6, -21, -22.5), durationMinutes: 120 }));
    const rec = recommendSeats(a, 'shade');
    const driver = rec.scores.find((s) => s.seat.position === 'driver');
    expect(driver).toBeDefined();
    expect(driver!.seat.selectable).toBe(false);
    // de manhã rumo Sul o sol entra pela esquerda: o motorista esquenta
    expect(driver!.heat).toBeGreaterThan(rec.best.heat);
    expect(rec.best.seat.position).not.toBe('driver');
    expect(rec.ranking.every((s) => s.seat.position !== 'driver')).toBe(true);
  });
});

describe('Degradê térmico azul → vermelho', () => {
  it('vai de azul (sombra) a vermelho (muito sol) passando por amarelo', () => {
    expect(heatColor(0, 'light')).toBe('#3b82f6');
    expect(heatColor(50, 'light')).toBe('#facc15');
    expect(heatColor(100, 'light')).toBe('#dc2626');
    expect(heatColor(0, 'dark')).toBe('#1d4ed8');
    expect(heatColor(100, 'dark')).toBe('#ef4444');
    expect(heatColor(-10, 'light')).toBe(heatColor(0, 'light'));
    expect(heatColor(140, 'dark')).toBe(heatColor(100, 'dark'));
    expect(HEAT_RAMP.light).toHaveLength(5);
  });

  it('o número da poltrona tem contraste AA (≥ 4.5:1) em toda a rampa', () => {
    for (const scheme of ['light', 'dark'] as const) {
      for (let h = 0; h <= 100; h += 5) {
        const bg = heatColor(h, scheme);
        expect(contrastRatio(bg, heatTextColor(h, scheme))).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('escolhe tinta escura no amarelo e branca no vermelho e no azul escuro', () => {
    expect(contrastText('#FACC15')).toBe('#000000');
    expect(contrastText('#DC2626')).toBe('#FFFFFF');
    expect(contrastText('#1D4ED8')).toBe('#FFFFFF');
    expect(goldenColor(0, 'light')).toBe('#fdf0e4');
  });
});

describe('Horário "Agora"', () => {
  it('arredonda para cima em 5 min no fuso da origem', () => {
    const now = new Date(Date.UTC(2025, 2, 20, 11, 2)); // 08:02 em São Paulo
    expect(nowRounded('America/Sao_Paulo', now)).toEqual({ date: '2025-03-20', time: '08:05' });
    // 23:58 do dia 20 arredonda para 00:00 do dia 21
    expect(nowRounded('America/Sao_Paulo', new Date(Date.UTC(2025, 2, 21, 2, 58)))).toEqual({ date: '2025-03-21', time: '00:00' });
    expect(minutesBetween('08:05', '08:00')).toBe(5);
    expect(minutesBetween('07:30', '09:00')).toBe(90);
  });
});
