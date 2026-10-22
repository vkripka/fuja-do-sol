import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPreset } from '../src/data/presetTrips';
import { requireHub } from '../src/data/hubs';
import { analyzeTrip } from '../src/engine/exposureCalculator';
import { greatCirclePath, waypointPath } from '../src/engine/geodesic';
import { buildCabinLayout, positionLabel, recommendSeats, seatReasonText } from '../src/engine/seatRecommender';
import type { Coordinates } from '../src/engine/types';
import { buildVerdict, localizeVerdict, sideLabel } from '../src/engine/verdict';
import { dateParts, STRINGS } from '../src/i18n/strings';
import {
  clearGeocodeCache,
  placeFromCoordinates,
  routeLandmarks,
  searchOfflineScored,
  searchPlaces,
} from '../src/services/geocodingService';
import type { FetchLike } from '../src/services/http';
import { fitViewport, mercator, projectToViewport, TILE_ATTRIBUTION, TILE_LAYERS, tileUrl, visibleTiles } from '../src/services/mapTiles';
import { DEFAULT_PREFERENCES, detectDeviceLanguage, getPreferences, savePreferences } from '../src/services/storageService';
import { brt, northToSouth, trip } from './helpers';

const okJson = (body: unknown): FetchLike => jest.fn(async () => ({ ok: true, status: 200, json: async () => body }));

describe('Mapa: projeção Web Mercator e tiles', () => {
  it('projeta coordenadas conhecidas', () => {
    expect(mercator({ lat: 0, lon: 0 })).toEqual([0.5, 0.5]);
    expect(mercator({ lat: 0, lon: -180 })[0]).toBe(0);
    const [, yN] = mercator({ lat: 85.05112878, lon: 0 });
    expect(yN).toBeCloseTo(0, 6);
    expect(mercator({ lat: 89.9, lon: 0 })[1]).toBeCloseTo(0, 6);
  });

  it('enquadra a rota com margem e alinha rota e tiles no mesmo viewport', () => {
    const path = greatCirclePath(requireHub('sao-paulo').coords, requireHub('rio-de-janeiro').coords, 32);
    const vp = fitViewport(path, 311, 224, 28);
    for (const p of path) {
      const [x, y] = projectToViewport(p, vp);
      expect(x).toBeGreaterThanOrEqual(27.9);
      expect(x).toBeLessThanOrEqual(311 - 27.9);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(224);
    }
    expect(vp.tileZoom).toBeGreaterThanOrEqual(6);
    expect(vp.tileZoom).toBeLessThanOrEqual(8);
    expect(vp.tileSize).toBeGreaterThanOrEqual(256);
    expect(vp.tileSize).toBeLessThan(512);
    const tiles = visibleTiles(vp);
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.length).toBeLessThanOrEqual(9);
    // os tiles cobrem o viewport inteiro
    const minLeft = Math.min(...tiles.map((t) => t.left));
    const maxRight = Math.max(...tiles.map((t) => t.left + t.size));
    expect(minLeft).toBeLessThanOrEqual(0);
    expect(maxRight).toBeGreaterThanOrEqual(311);
    // o tile que contém São Paulo é o tile z/x/y correto
    const sp = requireHub('sao-paulo').coords;
    const [mx, my] = mercator(sp);
    const n = 2 ** vp.tileZoom;
    const [px, py] = projectToViewport(sp, vp);
    const hit = tiles.find((t) => px >= t.left && px < t.left + t.size && py >= t.top && py < t.top + t.size)!;
    expect(hit.x).toBe(Math.floor(mx * n));
    expect(hit.y).toBe(Math.floor(my * n));
  });

  it('normaliza tiles no antimeridiano, limita o zoom e monta URLs', () => {
    const vp = fitViewport([{ lat: -17, lon: 179.9 }, { lat: -18, lon: -179.9 }], 300, 200, 20);
    expect(visibleTiles(vp).every((t) => t.x >= 0 && t.x < 2 ** t.z)).toBe(true);
    const point = fitViewport([{ lat: -23.5, lon: -46.6 }], 300, 200);
    expect(point.tileZoom).toBe(16);
    expect(tileUrl(TILE_LAYERS.map[0], 7, 47, 72)).toBe('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/7/72/47');
    expect(tileUrl(TILE_LAYERS.satellite[0], 7, 47, 72)).toBe(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/7/72/47',
    );
    expect(TILE_LAYERS.satellite[1]).toContain('World_Boundaries_and_Places');
    expect(TILE_ATTRIBUTION.satellite).toContain('Esri');
  });
});

describe('Cidades de referência ao longo da rota (modo Clean)', () => {
  it('Via Dutra mostra cidades do Vale do Paraíba, sem repetir origem/destino', () => {
    const p = getPreset('via-dutra')!;
    const path = waypointPath([requireHub(p.originId).coords, ...(p.waypoints ?? []), requireHub(p.destinationId).coords], 10);
    const lm = routeLandmarks(path, 4);
    expect(lm.length).toBeGreaterThanOrEqual(2);
    expect(lm.length).toBeLessThanOrEqual(4);
    const cities = lm.map((l) => l.place.city);
    expect(cities).not.toContain('São Paulo');
    expect(cities).not.toContain('Rio de Janeiro');
    expect(cities.some((c) => ['São José dos Campos', 'Aparecida', 'Resende'].includes(c))).toBe(true);
    // em ordem ao longo da rota
    const fr = lm.map((l) => l.fraction);
    expect([...fr].sort((a, b) => a - b)).toEqual(fr);
  });

  it('rotas curtas, vazias ou sem cidades por perto não quebram', () => {
    expect(routeLandmarks([requireHub('rio-de-janeiro').coords])).toEqual([]);
    expect(routeLandmarks([{ lat: 0, lon: -30 }, { lat: 0, lon: -30.001 }])).toEqual([]);
    expect(routeLandmarks([{ lat: -10, lon: -30 }, { lat: -12, lon: -28 }])).toEqual([]);
    expect(routeLandmarks(greatCirclePath(requireHub('sao-paulo').coords, requireHub('rio-de-janeiro').coords), 0)).toEqual([]);
  });
});

describe('Busca global de lugares', () => {
  beforeEach(async () => {
    await clearGeocodeCache();
  });

  it('consulta o Nominatim mesmo com vários resultados offline parciais', async () => {
    const offline = searchOfflineScored('campo', 8);
    expect(offline.length).toBeGreaterThanOrEqual(2);
    expect(offline[0].score).toBeLessThan(90);
    const f = okJson([{ lat: '25.0', lon: '-77.4', name: 'Rio Lindo', display_name: 'Rio Lindo, Bahamas', address: { country_code: 'bs' } }]);
    const r = await searchPlaces('campo', { fetchImpl: f });
    expect(f).toHaveBeenCalledTimes(1);
    expect(r.source).toBe('hybrid');
  });

  it('envia o idioma ativo ao Nominatim e separa o cache por idioma', async () => {
    const f = okJson([]);
    await searchPlaces('Eiffel Tower', { fetchImpl: f, language: 'en' });
    expect((f as jest.Mock).mock.calls[0][0]).toContain('accept-language=en-US');
    expect((f as jest.Mock).mock.calls[0][1].headers['Accept-Language']).toBe('en-US,en;q=0.9');
    await searchPlaces('Eiffel Tower', { fetchImpl: f, language: 'pt' });
    expect((f as jest.Mock).mock.calls[1][0]).toContain('accept-language=pt-BR');
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('nomeia a localização do GPS em inglês', () => {
    const p = placeFromCoordinates({ lat: -22.91, lon: -43.17 }, 'en');
    expect(p.name).toBe('My location');
    expect(p.city).toBe('Near Rio de Janeiro');
  });
});

describe('Preferência de idioma', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('detecta o idioma do aparelho e salva a escolha', async () => {
    expect(['pt', 'en']).toContain(detectDeviceLanguage());
    expect(DEFAULT_PREFERENCES.language).toBe(detectDeviceLanguage());
    const spy = jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({ resolvedOptions: () => ({ locale: 'pt-BR' }) }) as never);
    expect(detectDeviceLanguage()).toBe('pt');
    spy.mockImplementation(() => {
      throw new Error('sem Intl');
    });
    expect(detectDeviceLanguage()).toBe('pt');
    spy.mockRestore();
    expect((await savePreferences({ language: 'en' })).language).toBe('en');
    expect((await getPreferences()).language).toBe('en');
  });
});

describe('Veredito e assentos em inglês', () => {
  const morning = analyzeTrip(trip({ departure: brt(2025, 3, 20, 8) }));

  it('traduz o veredito mantendo os mesmos números', () => {
    const en = localizeVerdict(morning, 'en');
    expect(en.verdict).toBe(`Sit on the RIGHT side — ${morning.advantagePct}% cooler`);
    expect(en.verdictDetail).toContain(`about ${morning.sunlitMinutes.left} min`);
    expect(localizeVerdict(morning, 'pt')).toEqual({ verdict: morning.verdict, verdictDetail: morning.verdictDetail });
    expect(sideLabel('left', 'en')).toBe('LEFT');
    expect(sideLabel('none', 'en')).toBe('NIGHT');
  });

  it('cobre todos os casos do veredito em inglês', () => {
    const night = analyzeTrip(trip({ departure: brt(2025, 1, 10, 23), durationMinutes: 240 }));
    expect(localizeVerdict(night, 'en').verdict).toBe('Night trip: 0% direct sun');
    const sunset = analyzeTrip(trip({ departure: brt(2025, 3, 20, 17, 30), durationMinutes: 90, optimization: 'golden', path: northToSouth(-46.6, -21.5, -23) }));
    expect(localizeVerdict(sunset, 'en').verdict).toBe('Golden hour through the RIGHT window');
    expect(localizeVerdict(sunset, 'en').verdictDetail).toContain('the sunset');
    const east: Coordinates[] = [
      { lat: -22.9, lon: -43.2 },
      { lat: -22.9, lon: -43.0 },
    ];
    const behind = analyzeTrip(trip({ departure: brt(2025, 3, 20, 17, 45), durationMinutes: 30, optimization: 'golden', path: east }));
    expect(localizeVerdict(behind, 'en').verdict).toBe('Golden hour BEHIND');
    const ahead = analyzeTrip(trip({ departure: brt(2025, 3, 20, 17, 45), durationMinutes: 30, optimization: 'golden', path: [...east].reverse() }));
    expect(localizeVerdict(ahead, 'en').verdict).toBe('Golden hour AHEAD');
    const noon = analyzeTrip(trip({ departure: brt(2025, 3, 20, 11), optimization: 'golden' }));
    expect(localizeVerdict(noon, 'en').verdict).toBe('No golden hour on this trip');
    const down = northToSouth(-46.6, -21.5, -21.6);
    const uturn = analyzeTrip(trip({ departure: brt(2025, 3, 20, 9), path: [...down, ...[...down].reverse().slice(1)], durationMinutes: 24 }));
    expect(localizeVerdict(uturn, 'en').verdict).toBe('Sun balanced between sides');
    const weak = buildVerdict(
      {
        optimization: 'shade',
        daylight: 10,
        shadeSide: 'either',
        advantagePct: 0,
        sunlit: { left: 0, right: 0, front: 0, back: 0 },
        flips: [],
        golden: { available: false, left: 0, right: 0, front: 0, back: 0, bestSide: null, events: [] },
        lateralMax: 0,
      },
      'en',
    );
    expect(weak.verdict).toBe('Weak sun: either side works');
    const flip = (i: number) => ({ index: i, minutesFromStart: i, time: new Date(0), from: 'left' as const, to: 'right' as const, location: { lat: 0, lon: 0 } });
    const twoFlips = buildVerdict(
      {
        optimization: 'shade',
        daylight: 60,
        shadeSide: 'left',
        advantagePct: 50,
        sunlit: { left: 5, right: 40, front: 0, back: 0 },
        flips: [flip(0), flip(1)],
        golden: { available: false, left: 0, right: 0, front: 0, back: 0, bestSide: null, events: [] },
        lateralMax: 1,
      },
      'en',
    );
    expect(twoFlips.verdictDetail).toContain('switches sides 2 times');
    expect(twoFlips.verdict).toBe('Sit on the LEFT side — 50% cooler');
  });

  it('nomes de assento e motivo em inglês', () => {
    const rec = recommendSeats(morning, 'shade');
    expect(seatReasonText(rec.best, 'bus', false, false, 'en')).toMatch(/^Seat \d+ \(right window\): in the shade \d+% of the time/);
    expect(seatReasonText(rec.best, 'bus', true, false, 'en')).toMatch(/golden-hour view/);
    expect(seatReasonText(rec.best, 'bus', false, true, 'en')).toMatch(/night trip/);
    expect(seatReasonText(rec.best, 'bus', false, false, 'pt')).toBe(rec.reason);
    const car = buildCabinLayout('car').seats;
    expect(seatReasonText({ ...rec.best, seat: car[4] }, 'car', false, false, 'en')).toMatch(/^Rear right/);
    const boat = buildCabinLayout('boat').seats;
    expect(boat.map((s) => positionLabel(s, 'boat', 'en'))).toEqual(
      expect.arrayContaining(['Port window', 'Port aisle', 'Center', 'Starboard window', 'Open deck (center)']),
    );
    const plane = buildCabinLayout('plane').seats;
    expect(positionLabel(plane[1], 'plane', 'en')).toBe('Left middle');
    expect(positionLabel(car[0], 'car', 'en')).toBe('Driver');
  });
});

describe('Textos da interface (pt × en)', () => {
  function shape(v: unknown): unknown {
    if (typeof v === 'function') return `fn/${v.length}`;
    if (Array.isArray(v)) return v.map(shape);
    if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, shape((v as Record<string, unknown>)[k])]));
    return typeof v;
  }

  it('inglês tem exatamente as mesmas chaves e funções do português', () => {
    expect(shape(STRINGS.en)).toEqual(shape(STRINGS.pt));
  });

  it('nomes de abas, lados e datas traduzidos', () => {
    expect(STRINGS.en.tabs).toEqual({ simulate: 'Simulate', xray: 'X-Ray', seats: 'Seats', bestTime: 'Best Time', saved: 'Saved' });
    expect(STRINGS.pt.tabs.xray).toBe('Raio-X');
    expect(STRINGS.en.appName).toBe('Escape the Sun!');
    expect(STRINGS.en.sideName('left', 'boat')).toBe('port (left)');
    expect(STRINGS.en.sideName('either')).toBe('either side');
    expect(STRINGS.pt.sideName('right', 'boat')).toBe('estribordo (direita)');
    expect(STRINGS.pt.sideName('overhead')).toBe('a pino');
    expect(STRINGS.en.busSeatHint('left')).toContain('1, 5, 9');
    expect(dateParts('2025-03-20', 'en')).toEqual({ weekday: 'Thu', day: '20', month: 'Mar' });
    expect(dateParts('2025-03-20', 'pt')).toEqual({ weekday: 'Qui', day: '20', month: 'mar' });
    expect(STRINGS.en.ticket.headlineSide('RIGHT')).toBe('SIT ON THE RIGHT SIDE');
    expect(STRINGS.en.optimizer.tooltip('08:00', 90, 20, 0)).not.toContain('golden');
    expect(STRINGS.en.optimizer.tooltip('08:00', 90, 20, 40)).toContain('golden 40/100');
  });
});
