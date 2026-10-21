import { analyzeTrip } from '../src/engine/exposureCalculator';
import {
  buildCabinLayout,
  positionLabel,
  recommendSeats,
  scoreSeats,
  seatWeights,
  uvLevelFor,
} from '../src/engine/seatRecommender';
import type { TransportMode } from '../src/engine/types';
import { brt, northToSouth, trip } from './helpers';

const MODES: TransportMode[] = ['bus', 'plane', 'car', 'train', 'boat'];

describe('Plantas de cabine', () => {
  it('ônibus: 44 lugares, ímpares na janela e pares no corredor', () => {
    const l = buildCabinLayout('bus');
    expect(l.seats).toHaveLength(44);
    for (const s of l.seats) {
      const n = Number(s.label);
      expect(s.position).toBe(n % 2 === 1 ? 'window' : 'aisle');
    }
    const row1 = l.seats.filter((s) => s.row === 1).map((s) => `${s.label}:${s.side}`);
    expect(row1).toEqual(['1:left', '2:left', '4:right', '3:right']);
    expect(new Set(l.seats.map((s) => s.label)).size).toBe(44);
  });

  it('avião: 20 fileiras A-F com asas nas fileiras 10-16', () => {
    const l = buildCabinLayout('plane');
    expect(l.seats).toHaveLength(120);
    expect(l.wingRows).toEqual([10, 16]);
    const r12 = l.seats.filter((s) => s.row === 12);
    expect(r12.every((s) => s.overWing)).toBe(true);
    expect(r12.map((s) => s.position)).toEqual(['window', 'middle', 'aisle', 'aisle', 'middle', 'window']);
    expect(l.seats.find((s) => s.label === '1A')?.side).toBe('left');
    expect(l.seats.find((s) => s.label === '1F')?.side).toBe('right');
  });

  it('carro: 5 lugares e motorista não selecionável', () => {
    const l = buildCabinLayout('car');
    expect(l.seats).toHaveLength(5);
    expect(l.seats.filter((s) => !s.selectable).map((s) => s.id)).toEqual(['car-driver']);
  });

  it('trem e barco possuem layouts próprios (barco com convés aberto)', () => {
    expect(buildCabinLayout('train').seats).toHaveLength(56);
    const boat = buildCabinLayout('boat');
    expect(boat.seats.filter((s) => s.position === 'deck')).toHaveLength(6);
    expect(positionLabel(boat.seats[0], 'boat')).toBe('Janela bombordo');
    expect(positionLabel(boat.seats[4], 'boat')).toBe('Janela estribordo');
  });

  it('pesos: janela > meio > corredor; convés ao ar livre; para-brisa no carro', () => {
    const plane = buildCabinLayout('plane');
    const [a, b, c] = plane.seats.slice(0, 3).map((s) => seatWeights(s, 'plane'));
    expect(a.left).toBeGreaterThan(b.left);
    expect(b.left).toBeGreaterThan(c.left);
    const deck = seatWeights(buildCabinLayout('boat').seats.find((s) => s.position === 'deck')!, 'boat');
    expect(deck.roof).toBe(1);
    expect(deck.uvGlass).toBe(1);
    const car = buildCabinLayout('car').seats;
    expect(seatWeights(car[0], 'car').front).toBeGreaterThan(0);
    expect(seatWeights(car[3], 'car').back).toBeGreaterThan(seatWeights(car[2], 'car').back);
  });
});

describe('Modo Fuja do Sol', () => {
  const morning = analyzeTrip(trip({ departure: brt(2025, 3, 20, 8), durationMinutes: 120, path: northToSouth(-46.6, -21, -22.5) }));
  const afternoon = analyzeTrip(trip({ departure: brt(2025, 3, 20, 15), durationMinutes: 120, path: northToSouth(-46.6, -21, -22.5) }));

  it.each(MODES)('%s: melhor assento fica no lado de menor exposição', (mode) => {
    for (const base of [morning, afternoon]) {
      const a = { ...base, input: { ...base.input, mode } };
      const rec = recommendSeats(a, 'shade');
      expect(rec.best.seat.side).toBe(base.shadeSide);
      expect(rec.best.seat.selectable).toBe(true);
      expect(rec.worst.heat).toBeGreaterThanOrEqual(rec.best.heat);
      expect(rec.ranking.length).toBeLessThanOrEqual(5);
      expect(rec.reason.length).toBeGreaterThan(10);
    }
  });

  it('ônibus de manhã N→S: poltrona de janela ímpar do lado direito, heat mais alto à esquerda', () => {
    const rec = recommendSeats(morning, 'shade');
    expect(rec.best.seat.position).toBe('window');
    expect(Number(rec.best.seat.label) % 2).toBe(1);
    const leftWin = rec.scores.filter((s) => s.seat.side === 'left' && s.seat.position === 'window');
    const rightWin = rec.scores.filter((s) => s.seat.side === 'right' && s.seat.position === 'window');
    expect(Math.min(...leftWin.map((s) => s.heat))).toBeGreaterThan(Math.max(...rightWin.map((s) => s.heat)));
    expect(rec.reason).toMatch(/Poltrona/);
  });

  it('respeita preferências de corredor e de zona', () => {
    const rec = recommendSeats(morning, 'shade', { position: 'aisle', zone: 'back' });
    expect(rec.best.seat.position).toBe('aisle');
    expect(rec.best.seat.zone).toBe('back');
    const win = recommendSeats(morning, 'shade', { position: 'window', zone: 'front' });
    expect(win.best.seat.position).toBe('window');
    expect(win.best.seat.zone).toBe('front');
  });

  it('preferência impossível volta para todos os assentos', () => {
    const car = { ...morning, input: { ...morning.input, mode: 'car' as const } };
    const rec = recommendSeats(car, 'shade', { position: 'aisle', zone: 'middle' });
    expect(rec.best.seat.selectable).toBe(true);
  });

  it('noite: heat zero e motivo noturno', () => {
    const night = analyzeTrip(trip({ departure: brt(2025, 3, 20, 23), durationMinutes: 180 }));
    const rec = recommendSeats(night);
    expect(rec.scores.every((s) => s.heat === 0 && s.uvLevel === 'Nenhum')).toBe(true);
    expect(rec.reason).toMatch(/noturna/);
  });

  it('UV atrás do vidro e no convés aberto', () => {
    const noon = analyzeTrip(trip({ departure: brt(2025, 1, 10, 10), durationMinutes: 120, mode: 'boat' }));
    const scores = scoreSeats(noon);
    const deck = scores.filter((s) => s.seat.position === 'deck');
    const inside = scores.filter((s) => s.seat.position === 'window');
    expect(Math.max(...deck.map((s) => s.uvBehindGlass))).toBeGreaterThan(Math.max(...inside.map((s) => s.uvBehindGlass)));
  });
});

describe('Modo Caçador de Pôr do Sol', () => {
  const sunset = analyzeTrip(
    trip({ departure: brt(2025, 3, 20, 17, 15), durationMinutes: 120, optimization: 'golden', path: northToSouth(-46.6, -21, -23) }),
  );

  it.each(MODES)('%s: recomenda janela do lado do pôr do sol', (mode) => {
    const a = { ...sunset, input: { ...sunset.input, mode } };
    const rec = recommendSeats(a, 'golden');
    expect(rec.best.seat.side).toBe('right');
    expect(['window', 'deck']).toContain(rec.best.seat.position);
    expect(rec.best.goldenView).toBeGreaterThan(30);
    expect(rec.reason).toMatch(/golden hour/);
  });

  it('avião: janela sobre a asa tem vista pior que janela fora da asa', () => {
    const plane = { ...sunset, input: { ...sunset.input, mode: 'plane' as const } };
    const rec = recommendSeats(plane, 'golden');
    const wing = rec.scores.find((s) => s.seat.label === '12F')!;
    const clear = rec.scores.find((s) => s.seat.label === '4F')!;
    expect(clear.goldenView).toBeGreaterThan(wing.goldenView);
    expect(rec.best.seat.overWing).toBe(false);
  });
});

describe('Níveis de UV', () => {
  it.each([
    [0, 'Nenhum'],
    [1, 'Baixo'],
    [4, 'Moderado'],
    [7, 'Alto'],
    [9, 'Muito alto'],
    [12, 'Extremo'],
  ])('UV %d → %s', (uv, level) => expect(uvLevelFor(uv)).toBe(level));
});
