import {
  analyzeTrip,
  classifySide,
  computeComponents,
  computeGolden,
  detectFlips,
  exposureAtMinute,
  exposureWindows,
  relativeSunAngle,
  roofFactor,
  segmentExposure,
  sideLabel,
} from '../src/engine/exposureCalculator';
import { getSolarPosition } from '../src/engine/solarPosition';
import type { Coordinates, SegmentExposure } from '../src/engine/types';
import { brt, northToSouth, trip } from './helpers';

describe('Ângulo relativo Δψ', () => {
  it('Sol a Leste (90°) e veículo para o Sul (180°) → −90° (esquerda)', () => {
    expect(relativeSunAngle(90, 180)).toBe(-90);
  });
  it('Sol a Oeste (270°) e veículo para o Sul (180°) → +90° (direita)', () => {
    expect(relativeSunAngle(270, 180)).toBe(90);
  });
  it('fica em [−180, 180)', () => {
    expect(relativeSunAngle(0, 180)).toBe(-180);
    expect(relativeSunAngle(10, 350)).toBe(20);
    expect(relativeSunAngle(350, 10)).toBe(-20);
  });
  it('classifica lados', () => {
    const up = { isUp: true, elevation: 30 };
    expect(classifySide(-90, up)).toBe('left');
    expect(classifySide(90, up)).toBe('right');
    expect(classifySide(10, up)).toBe('front');
    expect(classifySide(170, up)).toBe('back');
    expect(classifySide(90, { isUp: true, elevation: 80 })).toBe('overhead');
    expect(classifySide(90, { isUp: false, elevation: -10 })).toBe('none');
  });
  it('rótulos em português', () => {
    expect(['left', 'right', 'front', 'back', 'overhead', 'center', 'either', 'none'].map((s) => sideLabel(s as never))).toEqual([
      'ESQUERDO',
      'DIREITO',
      'FRENTE',
      'TRÁS',
      'ZÊNITE',
      'CENTRO',
      'QUALQUER',
      'NOITE',
    ]);
  });
});

describe('Fator de teto e componentes', () => {
  it('teto bloqueia o Sol alto (α > 65°)', () => {
    expect(roofFactor(20)).toBeCloseTo(Math.cos((20 * Math.PI) / 180), 6);
    expect(roofFactor(70)).toBeLessThan(0.15);
    expect(roofFactor(89)).toBeLessThan(0.01);
    expect(roofFactor(-5)).toBe(1);
  });
  it('decompõe a irradiância por face', () => {
    const sun = getSolarPosition(brt(2025, 3, 20, 8), { lat: -22, lon: -46.6 });
    const c = computeComponents(sun, -90);
    expect(c.left).toBeGreaterThan(0.3);
    expect(c.right).toBe(0);
    expect(c.front).toBeCloseTo(0, 6);
    const f = computeComponents(sun, 0);
    expect(f.front).toBeGreaterThan(0.3);
    expect(f.left + f.right).toBeCloseTo(0, 6);
    expect(computeComponents(sun, 180).back).toBeGreaterThan(0.3);
  });
  it('golden weight só existe com Sol baixo', () => {
    const low = getSolarPosition(brt(2025, 3, 20, 18, 5), { lat: -22, lon: -46.6 });
    const g = computeGolden(low, 90);
    expect(g.right).toBeGreaterThan(0.3);
    expect(computeGolden(low, -170).back).toBeGreaterThan(0);
    const high = getSolarPosition(brt(2025, 3, 20, 12), { lat: -22, lon: -46.6 });
    expect(computeGolden(high, 90).right).toBe(0);
  });
});

describe('Invariantes físicos de viagem', () => {
  it('CASO 1: Norte → Sul às 08:00 → sol na ESQUERDA, sombra na DIREITA', () => {
    for (const [m, d] of [
      [3, 20],
      [6, 21],
      [12, 21],
    ]) {
      const r = analyzeTrip(trip({ departure: brt(2025, m, d, 8) }));
      expect(r.energy.left).toBeGreaterThan(r.energy.right * 3);
      expect(r.shadeSide).toBe('right');
      expect(r.recommendedSide).toBe('right');
      expect(r.shadePct.right).toBeGreaterThan(r.shadePct.left);
      expect(r.verdict).toContain('DIREITO');
    }
  });

  it('CASO 2: Norte → Sul às 16:00 → sol na DIREITA, sombra na ESQUERDA', () => {
    const r = analyzeTrip(trip({ departure: brt(2025, 3, 20, 16) }));
    expect(r.energy.right).toBeGreaterThan(r.energy.left * 3);
    expect(r.shadeSide).toBe('left');
    expect(r.thermalComfort.left).toBeGreaterThan(r.thermalComfort.right);
    expect(r.advantagePct).toBeGreaterThan(70);
    expect(r.curtainAlerts.some((a) => a.side === 'right')).toBe(true);
  });

  it('CASO 3: viagem 100% noturna (23:00 → 03:00) tem 0% de sol direto', () => {
    const r = analyzeTrip(trip({ departure: brt(2025, 1, 10, 23), durationMinutes: 240 }));
    expect(r.energy.left).toBe(0);
    expect(r.energy.right).toBe(0);
    expect(r.daylightMinutes).toBe(0);
    expect(r.nightFraction).toBe(1);
    expect(r.recommendedSide).toBe('either');
    expect(r.sunShare.left).toBe(0);
    expect(r.peakUv).toBe(0);
    expect(r.curtainAlerts).toHaveLength(0);
    expect(r.verdict).toMatch(/noturna/i);
  });

  it('CASO 4: inverter origem/destino inverte perfeitamente os lados', () => {
    const path = northToSouth(-46.6, -21.8, -22.2);
    const dep = brt(2025, 3, 20, 9);
    const ab = analyzeTrip(trip({ departure: dep, path, durationMinutes: 30 }));
    const ba = analyzeTrip(trip({ departure: dep, path: [...path].reverse(), durationMinutes: 30 }));
    expect(ab.shadeSide).toBe('right');
    expect(ba.shadeSide).toBe('left');
    expect(ab.energy.left).toBeCloseTo(ba.energy.right, 2);
    expect(ab.energy.right).toBeCloseTo(ba.energy.left, 2);
  });

  it('inversão perfeita por segmento: mesmo ponto, mesmo instante, rumo oposto', () => {
    const base = analyzeTrip(trip({ departure: brt(2025, 3, 20, 10) })).segments[5].segment;
    const a = segmentExposure(base);
    const b = segmentExposure({ ...base, bearing: (base.bearing + 180) % 360 });
    expect(a.components.left).toBeCloseTo(b.components.right, 9);
    expect(a.components.right).toBeCloseTo(b.components.left, 9);
    expect(a.components.front).toBeCloseTo(b.components.back, 9);
  });

  it('Sol a pino reduz a incidência lateral pelo bloqueio do teto', () => {
    const noon = analyzeTrip(trip({ departure: brt(2025, 12, 21, 11, 40), path: northToSouth(-46.6, -23.3, -23.8) }));
    const morning = analyzeTrip(trip({ departure: brt(2025, 12, 21, 8), path: northToSouth(-46.6, -23.3, -23.8) }));
    expect(noon.energy.left + noon.energy.right).toBeLessThan((morning.energy.left + morning.energy.right) / 3);
    expect(noon.energy.roof).toBeGreaterThan(morning.energy.roof);
    expect(noon.segments.some((s) => s.side === 'overhead')).toBe(true);
  });

  it('Leste → Oeste de manhã: sol por TRÁS; à tarde: pela FRENTE', () => {
    const path: Coordinates[] = [
      { lat: -22, lon: -46 },
      { lat: -22, lon: -46.8 },
    ];
    const am = analyzeTrip(trip({ departure: brt(2025, 3, 20, 8), path }));
    const pm = analyzeTrip(trip({ departure: brt(2025, 3, 20, 16), path }));
    expect(am.energy.back).toBeGreaterThan(am.energy.front);
    expect(pm.energy.front).toBeGreaterThan(pm.energy.back);
    expect(pm.curtainAlerts.some((a) => a.side === 'front')).toBe(true);
  });

  it('detecta Ponto de Virada Solar quando a estrada faz retorno', () => {
    const down = northToSouth(-46.6, -21.5, -22.0);
    const path = [...down, ...[...down].reverse().slice(1)];
    const r = analyzeTrip(trip({ departure: brt(2025, 3, 20, 9), path, durationMinutes: 120 }));
    expect(r.flips.length).toBe(1);
    expect(r.flips[0].from).toBe('left');
    expect(r.flips[0].to).toBe('right');
    expect(r.flips[0].minutesFromStart).toBeGreaterThan(50);
    expect(r.flips[0].minutesFromStart).toBeLessThan(70);
    expect(r.verdictDetail).toMatch(/troca de lado 1 vez/);
  });

  it('ida e volta curta: sol equilibrado entre os lados', () => {
    const down = northToSouth(-46.6, -21.5, -21.6);
    const path = [...down, ...[...down].reverse().slice(1)];
    const r = analyzeTrip(trip({ departure: brt(2025, 3, 20, 9), path, durationMinutes: 24 }));
    expect(r.shadeSide).toBe('either');
    expect(r.advantagePct).toBeLessThan(12);
    expect(r.verdict).toMatch(/equilibrado/);
  });

  it('sol fraco (perto do nascer, rumo ao Sol) → qualquer lado', () => {
    const path: Coordinates[] = [
      { lat: -22, lon: -46.8 },
      { lat: -22, lon: -46.6 },
    ];
    const r = analyzeTrip(trip({ departure: brt(2025, 3, 20, 6, 5), path, durationMinutes: 20 }));
    expect(r.shadeSide).toBe('either');
    expect(r.verdict).toMatch(/fraco/);
  });

  it('sem path usa o grande círculo e o avião usa altitude de cruzeiro', () => {
    const r = analyzeTrip({
      origin: { lat: -23.43, lon: -46.47 },
      destination: { lat: -3.78, lon: -38.53 },
      departure: brt(2025, 3, 20, 15),
      durationMinutes: 210,
      mode: 'plane',
      optimization: 'shade',
    });
    expect(r.segments[0].sun.horizonDip).toBeGreaterThan(3);
    expect(r.totalDistanceKm).toBeGreaterThan(2300);
    expect(r.shadeSide).toBe('right');
  });

  it('exposureAtMinute faz clamp nas extremidades', () => {
    const r = analyzeTrip(trip({ departure: brt(2025, 3, 20, 10) }));
    expect(exposureAtMinute(r, -5).segment.index).toBe(0);
    expect(exposureAtMinute(r, 1e6).segment.index).toBe(r.segments.length - 1);
    expect(exposureAtMinute(r, 30).segment.index).toBe(Math.floor(r.segments.length / 2));
  });
});

describe('Modo Golden Hour', () => {
  it('Norte → Sul no pôr do sol: golden hour pela janela DIREITA', () => {
    const r = analyzeTrip(
      trip({ departure: brt(2025, 3, 20, 17, 30), durationMinutes: 90, optimization: 'golden', path: northToSouth(-46.6, -21.5, -23) }),
    );
    expect(r.golden.available).toBe(true);
    expect(r.golden.bestSide).toBe('right');
    expect(r.recommendedSide).toBe('right');
    const sunset = r.golden.events.find((e) => e.kind === 'sunset');
    expect(sunset).toBeDefined();
    expect(sunset?.side).toBe('right');
    expect(r.verdict).toContain('DIREITO');
    expect(r.verdictDetail).toMatch(/pôr do sol/);
  });

  it('Norte → Sul no nascer do sol: janela ESQUERDA', () => {
    const r = analyzeTrip(trip({ departure: brt(2025, 3, 20, 5, 30), durationMinutes: 90, optimization: 'golden' }));
    expect(r.golden.bestSide).toBe('left');
    expect(r.golden.events[0].kind).toBe('sunrise');
    expect(r.verdictDetail).toMatch(/nascer do sol/);
  });

  it('pôr do sol atrás do veículo (rumo Leste ao entardecer) → TRASEIRA; rumo Oeste → FRENTE', () => {
    const east: Coordinates[] = [
      { lat: -22.9, lon: -43.2 },
      { lat: -22.9, lon: -43.0 },
    ];
    const back = analyzeTrip(trip({ departure: brt(2025, 3, 20, 17, 45), durationMinutes: 30, optimization: 'golden', path: east }));
    expect(back.golden.available).toBe(true);
    expect(back.golden.bestSide).toBeNull();
    expect(back.verdict).toBe('Golden hour pela TRASEIRA');
    const front = analyzeTrip(trip({ departure: brt(2025, 3, 20, 17, 45), durationMinutes: 30, optimization: 'golden', path: [...east].reverse() }));
    expect(front.verdict).toBe('Golden hour pela FRENTE');
    expect(front.verdictDetail).toMatch(/para-brisa/);
  });

  it('sem crepúsculo, avisa e cai para a lógica de sombra', () => {
    const r = analyzeTrip(trip({ departure: brt(2025, 3, 20, 11), optimization: 'golden' }));
    expect(r.golden.available).toBe(false);
    expect(r.verdict).toMatch(/Sem golden hour/);
    expect(r.recommendedSide).toBe(r.shadeSide);
  });
});

describe('Janelas de exposição e viradas (unidades)', () => {
  const fake = (left: number[], right: number[] = left.map(() => 0)): SegmentExposure[] =>
    left.map((l, i) => ({
      segment: {
        index: i,
        start: { lat: 0, lon: 0 },
        end: { lat: 0, lon: 0 },
        midpoint: { lat: 0, lon: 0 },
        bearing: 0,
        distanceKm: 1,
        cumulativeKm: i,
        fraction: (i + 0.5) / left.length,
        time: new Date(i * 120000),
        minutesFromStart: i * 2 + 1,
        durationMinutes: 2,
      },
      sun: getSolarPosition(new Date(Date.UTC(2025, 2, 20, 15)), { lat: 0, lon: 0 }),
      relativeAngle: 0,
      side: 'left',
      components: { left: l, right: right[i], front: 0, back: 0, roof: 0 },
      golden: { left: 0, right: 0, front: 0, back: 0, roof: 0 },
    }));

  it('une lacunas de 1 segmento e ignora janelas curtas', () => {
    const w = exposureWindows(fake([0.5, 0.5, 0, 0.5, 0.5, 0, 0, 0.5]), 'left');
    expect(w).toHaveLength(1);
    expect(w[0].startMinute).toBe(0);
    expect(w[0].endMinute).toBe(10);
    expect(w[0].peakIrradiance).toBe(0.5);
  });

  it('histerese: uma oscilação isolada não conta como virada', () => {
    expect(detectFlips(fake([0.5, 0.5, 0, 0.5], [0, 0, 0.5, 0]), 4)).toHaveLength(0);
    const flips = detectFlips(fake([0.5, 0.5, 0, 0, 0], [0, 0, 0.5, 0.5, 0.5]), 4);
    expect(detectFlips(fake([0.5, 0.5, 0, 0, 0], [0, 0, 0.5, 0.5, 0.5]))).toHaveLength(0);
    expect(detectFlips([])).toHaveLength(0);
    expect(flips).toHaveLength(1);
    expect(flips[0].index).toBe(2);
    // segmentos sem sol são ignorados
    expect(detectFlips(fake([0, 0, 0]))).toHaveLength(0);
    // candidato interrompido pelo lado atual é descartado
    expect(detectFlips(fake([0.5, 0, 0.5, 0, 0.5], [0, 0.5, 0, 0.5, 0]))).toHaveLength(0);
  });
});
