import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireHub } from '../src/data/hubs';
import { encodePolyline, haversineKm } from '../src/engine/geodesic';
import {
  boundedLevenshtein,
  clearGeocodeCache,
  nearestHub,
  normalizeText,
  placeFromCoordinates,
  placeFromNominatim,
  scoreMatch,
  searchOffline,
  searchOnline,
  searchPlaces,
  type NominatimResult,
} from '../src/services/geocodingService';
import { fetchJson, TimeoutError, type FetchLike } from '../src/services/http';
import { clearRouteCache, getRoute } from '../src/services/routingService';
import {
  addToHistory,
  clearHistory,
  createTripId,
  DEFAULT_PREFERENCES,
  getFavorites,
  getHistory,
  getPreferences,
  isFavorite,
  KEYS,
  MAX_HISTORY,
  removeFavorite,
  saveFavorite,
  savePreferences,
  type SavedTrip,
} from '../src/services/storageService';
import { RIO, SAO_PAULO } from './helpers';

const okJson = (body: unknown): FetchLike => jest.fn(async () => ({ ok: true, status: 200, json: async () => body }));

describe('Geocodificação offline', () => {
  it('normaliza acentos e pontuação', () => {
    expect(normalizeText('  São-Paulo, SP! ')).toBe('sao paulo sp');
    expect(boundedLevenshtein('curitba', 'curitiba', 2)).toBe(1);
    expect(boundedLevenshtein('abc', 'xyzxyz', 1)).toBe(2);
    expect(boundedLevenshtein('abcd', 'wxyz', 1)).toBe(2);
    expect(scoreMatch(['x'], '')).toBe(0);
  });

  it('encontra por nome sem acento, alias, código IATA e prefixo', () => {
    expect(searchOffline('sao paulo')[0].id).toBe('sao-paulo');
    expect(searchOffline('floripa')[0].id).toBe('florianopolis');
    expect(searchOffline('GRU')[0].id).toBe('gru');
    expect(searchOffline('galeao')[0].id).toBe('gig');
    expect(searchOffline('tiet').map((p) => p.id)).toContain('rod-tiete');
    expect(searchOffline('rodoviaria rio').map((p) => p.id)).toContain('rod-novo-rio');
    expect(searchOffline('janeiro').map((p) => p.id)).toContain('rio-de-janeiro');
    expect(searchOffline('')).toEqual([]);
  });

  it('tolera erros de digitação', () => {
    expect(searchOffline('curitba')[0].city).toBe('Curitiba');
    expect(searchOffline('florianoplis')[0].city).toBe('Florianópolis');
    expect(searchOffline('qwzqwzqwz')).toEqual([]);
  });

  it('acha o hub mais próximo e cria lugar a partir do GPS', () => {
    expect(nearestHub({ lat: -23.55, lon: -46.64 })?.place.city).toBe('São Paulo');
    expect(nearestHub({ lat: 0, lon: -30 }, 10)).toBeNull();
    const gps = placeFromCoordinates({ lat: -22.91, lon: -43.17 });
    expect(gps.city).toBe('Perto de Rio de Janeiro');
    expect(gps.tz).toBe('America/Sao_Paulo');
    expect(gps.source).toBe('gps');
    const sea = placeFromCoordinates({ lat: -20, lon: -30 });
    expect(sea.city).toMatch(/^-20\.000/);
  });
});

describe('Geocodificação online (Nominatim)', () => {
  beforeEach(async () => {
    await clearGeocodeCache();
  });

  const sample: NominatimResult[] = [
    {
      osm_type: 'relation',
      osm_id: 1,
      lat: '-22.5112',
      lon: '-43.1779',
      name: 'Petrópolis',
      display_name: 'Petrópolis, Rio de Janeiro, Brasil',
      category: 'boundary',
      type: 'administrative',
      address: { city: 'Petrópolis', state: 'Rio de Janeiro', 'ISO3166-2-lvl4': 'BR-RJ', country: 'Brasil', country_code: 'br' },
    },
    {
      osm_type: 'node',
      osm_id: 2,
      lat: '-20.7',
      lon: '-41.5',
      display_name: 'Rodoviária de Cachoeiro, Cachoeiro de Itapemirim',
      category: 'amenity',
      type: 'bus_station',
      address: { town: 'Cachoeiro de Itapemirim', country_code: 'br', country: 'Brasil' },
    },
    { lat: 'x', lon: '1', display_name: 'inválido' },
  ];

  it('converte resultados do Nominatim em Places', () => {
    const p = placeFromNominatim(sample[0])!;
    expect(p.region).toBe('RJ');
    expect(p.kind).toBe('city');
    expect(p.tz).toBe('America/Sao_Paulo');
    expect(placeFromNominatim(sample[1])!.kind).toBe('bus');
    expect(placeFromNominatim(sample[1])!.name).toBe('Rodoviária de Cachoeiro');
    expect(placeFromNominatim(sample[2])).toBeNull();
    const kinds = [
      { category: 'aeroway', type: 'aerodrome' },
      { category: 'railway', type: 'station' },
      { category: 'amenity', type: 'ferry_terminal' },
    ].map((k) => placeFromNominatim({ lat: '1', lon: '1', display_name: 'x', ...k })!.kind);
    expect(kinds).toEqual(['airport', 'train', 'port']);
  });

  it('busca online com cache em memória e persistente', async () => {
    const f = okJson(sample);
    const a = await searchOnline('Cachoeiro', { fetchImpl: f });
    const b = await searchOnline('cachoeiro', { fetchImpl: f });
    expect(a).toHaveLength(2);
    expect(b).toEqual(a);
    expect(f).toHaveBeenCalledTimes(1);
    expect((f as jest.Mock).mock.calls[0][0]).toContain('nominatim.openstreetmap.org');
    expect(await searchOnline('ab', { fetchImpl: f })).toEqual([]);
    await new Promise((r) => setTimeout(r, 0));
    expect(await AsyncStorage.getItem('@fujadosol/geocache/v1')).toContain('Cachoeiro');
  });

  it('searchPlaces mescla offline + online e deduplica', async () => {
    const r = await searchPlaces('Petrópolis Cachoeiro', { fetchImpl: okJson(sample) });
    expect(r.source).toBe('hybrid');
    expect(r.results.filter((p) => p.city === 'Petrópolis')).toHaveLength(1);
  });

  it('cai para offline em erro, timeout ou modo offline', async () => {
    const fail: FetchLike = jest.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    const r = await searchPlaces('Petrópolis xyz', { fetchImpl: fail });
    expect(r.source).toBe('offline');
    expect(r.error).toBe('HTTP 503');
    const slow: FetchLike = () => new Promise(() => undefined);
    const t = await searchPlaces('Lugar inexistente', { fetchImpl: slow, timeoutMs: 20 });
    expect(t.error).toMatch(/Tempo esgotado/);
    expect((await searchPlaces('Petrópolis abc', { online: false })).source).toBe('offline');
    // nome idêntico na base offline dispensa a busca online
    const never = okJson([]);
    expect((await searchPlaces('Curitiba', { fetchImpl: never })).source).toBe('offline');
    expect(never).not.toHaveBeenCalled();
    expect((await searchPlaces('ab', { fetchImpl: never })).source).toBe('offline');
  });

  it('lê cache persistente entre sessões e ignora cache corrompido', async () => {
    await AsyncStorage.setItem('@fujadosol/geocache/v1', JSON.stringify([['lugar salvo', [requireHub('rio-de-janeiro')]]]));
    const f = okJson([]);
    expect((await searchOnline('Lugar salvo', { fetchImpl: f }))[0].id).toBe('rio-de-janeiro');
    expect(f).not.toHaveBeenCalled();
    await clearGeocodeCache();
    await AsyncStorage.setItem('@fujadosol/geocache/v1', '{corrompido');
    expect(await searchOnline('Outro lugar', { fetchImpl: okJson({ not: 'array' }) })).toEqual([]);
  });
});

describe('HTTP', () => {
  it('lança TimeoutError', async () => {
    await expect(fetchJson('x', { fetchImpl: () => new Promise(() => undefined), timeoutMs: 10 })).rejects.toBeInstanceOf(TimeoutError);
  });
});

describe('Roteamento', () => {
  beforeEach(() => clearRouteCache());

  it('avião usa grande círculo (sem rede)', async () => {
    const f = okJson({});
    const r = await getRoute(SAO_PAULO, RIO, 'plane', { fetchImpl: f });
    expect(r.source).toBe('geodesic');
    expect(r.path).toHaveLength(96);
    expect(f).not.toHaveBeenCalled();
    expect(r.durationMinutes).toBeGreaterThan(45);
  });

  it('ônibus usa a geometria real do OSRM (polyline6)', async () => {
    const mid = { lat: -23.19, lon: -45.88 };
    const geometry = encodePolyline([SAO_PAULO, mid, RIO], 6);
    const f = okJson({ code: 'Ok', routes: [{ geometry, distance: 432000, duration: 19000 }] });
    const r = await getRoute(SAO_PAULO, RIO, 'bus', { fetchImpl: f });
    expect(r.source).toBe('osrm');
    expect(r.distanceKm).toBe(432);
    // 19000 s de carro × 1.2 (ônibus) + 15 min de paradas
    expect(r.durationMinutes).toBe(395);
    expect(r.path[1].lat).toBeCloseTo(-23.19, 5);
    expect((f as jest.Mock).mock.calls[0][0]).toContain('router.project-osrm.org/route/v1/driving/-46.633300,-23.550500;-43.172900,-22.906800');
    // cache
    await getRoute(SAO_PAULO, RIO, 'bus', { fetchImpl: f });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('simplifica polylines muito longas', async () => {
    const pts = Array.from({ length: 2000 }, (_, i) => ({ lat: -23 + i * 0.0001, lon: -46 }));
    const f = okJson({ code: 'Ok', routes: [{ geometry: encodePolyline(pts, 6), distance: 22000, duration: 1000 }] });
    const r = await getRoute(pts[0], pts[pts.length - 1], 'car', { fetchImpl: f });
    expect(r.path.length).toBeLessThan(100);
  });

  it('fallback offline quando o OSRM falha ou não há rota', async () => {
    const noRoute = okJson({ code: 'NoRoute' });
    const r = await getRoute(SAO_PAULO, RIO, 'car', { fetchImpl: noRoute });
    expect(r.source).toBe('curved');
    expect(r.distanceKm).toBeGreaterThan(haversineKm(SAO_PAULO, RIO));
    clearRouteCache();
    const empty = okJson({ code: 'Ok', routes: [{ geometry: '', distance: 0, duration: 0 }] });
    expect((await getRoute(SAO_PAULO, RIO, 'car', { fetchImpl: empty })).source).toBe('curved');
    clearRouteCache();
    expect((await getRoute(SAO_PAULO, RIO, 'bus', { online: false })).source).toBe('curved');
  });

  it('barco/trem com waypoints seguem o traçado; barco sem waypoints vai em linha', async () => {
    const wp = [{ lat: -23.8115, lon: -45.3855 }];
    const ferry = await getRoute(requireHub('balsa-sao-sebastiao').coords, requireHub('balsa-ilhabela').coords, 'boat', { waypoints: wp });
    expect(ferry.source).toBe('waypoints');
    const boat = await getRoute(SAO_PAULO, RIO, 'boat');
    expect(boat.source).toBe('geodesic');
    const train = await getRoute(SAO_PAULO, RIO, 'train', { waypoints: [{ lat: -23.19, lon: -45.88 }], fetchImpl: okJson({}) });
    expect(train.source).toBe('waypoints');
  });

  it('limita waypoints enviados ao OSRM', async () => {
    const wps = Array.from({ length: 14 }, (_, i) => ({ lat: -23.5 + i * 0.04, lon: -46.5 + i * 0.2 }));
    const f = okJson({ code: 'Ok', routes: [{ geometry: encodePolyline([SAO_PAULO, RIO], 6), distance: 400000, duration: 1 }] });
    await getRoute(SAO_PAULO, RIO, 'bus', { waypoints: wps, fetchImpl: f });
    const url = (f as jest.Mock).mock.calls[0][0] as string;
    expect(url.split(';')).toHaveLength(12);
  });
});

describe('Armazenamento local', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  const trip = (over: Partial<SavedTrip> = {}): SavedTrip => ({
    id: createTripId(),
    name: 'SP → RJ',
    createdAt: new Date().toISOString(),
    mode: 'bus',
    origin: requireHub('rod-tiete'),
    destination: requireHub('rod-novo-rio'),
    date: '2025-03-20',
    time: '08:00',
    durationMinutes: 390,
    optimization: 'shade',
    ...over,
  });

  it('salva, deduplica e remove favoritos', async () => {
    const a = trip();
    await saveFavorite(a);
    await saveFavorite({ ...trip(), name: 'duplicada' });
    const list = await getFavorites();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('duplicada');
    expect(await isFavorite(a)).toBe(true);
    await removeFavorite(list[0].id);
    expect(await getFavorites()).toEqual([]);
    expect(await isFavorite(a)).toBe(false);
  });

  it('histórico limitado e sem duplicatas', async () => {
    for (let i = 0; i < MAX_HISTORY + 5; i++) await addToHistory(trip({ time: `${String(i % 24).padStart(2, '0')}:00`, date: `2025-03-${10 + Math.floor(i / 24)}` }));
    await addToHistory(trip({ time: '00:00', date: '2025-03-10' }));
    const h = await getHistory();
    expect(h).toHaveLength(MAX_HISTORY);
    expect(h[0].time).toBe('00:00');
    await clearHistory();
    expect(await getHistory()).toEqual([]);
  });

  it('preferências com valores padrão e merge', async () => {
    expect(await getPreferences()).toEqual(DEFAULT_PREFERENCES);
    const p = await savePreferences({ optimization: 'golden' });
    expect(p.optimization).toBe('golden');
    expect(p.alertLeadMinutes).toBe(5);
  });

  it('é resiliente a JSON corrompido ou formato inesperado', async () => {
    await AsyncStorage.setItem(KEYS.favorites, '{oops');
    await AsyncStorage.setItem(KEYS.history, '{"a":1}');
    await AsyncStorage.setItem(KEYS.preferences, '"texto"');
    expect(await getFavorites()).toEqual([]);
    expect(await getHistory()).toEqual([]);
    expect(await getPreferences()).toEqual(DEFAULT_PREFERENCES);
  });
});
