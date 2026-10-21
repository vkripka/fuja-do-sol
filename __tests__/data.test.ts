import { getHub, HUBS, KIND_LABELS, requireHub, shortCode } from '../src/data/hubs';
import { getPreset, PRESET_TRIPS } from '../src/data/presetTrips';
import { ZONES } from '../src/engine/timezone';

describe('Base offline de hubs', () => {
  it('tem pelo menos 100 localidades com ids únicos', () => {
    expect(HUBS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(HUBS.map((h) => h.id)).size).toBe(HUBS.length);
  });

  it('todas as coordenadas e fusos são válidos', () => {
    for (const h of HUBS) {
      expect(Math.abs(h.coords.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(h.coords.lon)).toBeLessThanOrEqual(180);
      expect(ZONES[h.tz] ?? /^UTC[+-]\d/.test(h.tz)).toBeTruthy();
      expect(KIND_LABELS[h.kind]).toBeDefined();
    }
  });

  it('cobre todos os tipos e os aeroportos exigidos', () => {
    const kinds = new Set(HUBS.map((h) => h.kind));
    ['city', 'bus', 'airport', 'port', 'train'].forEach((k) => expect(kinds.has(k as never)).toBe(true));
    ['GRU', 'CGH', 'SDU', 'GIG', 'BSB', 'VCP', 'CNF', 'REC', 'SSA', 'POA', 'FLN'].forEach((code) =>
      expect(HUBS.some((h) => h.code === code)).toBe(true),
    );
    const brStates = new Set(HUBS.filter((h) => h.countryCode === 'BR').map((h) => h.region));
    expect(brStates.size).toBe(27);
  });

  it('fusos brasileiros por estado', () => {
    expect(requireHub('manaus').tz).toBe('America/Manaus');
    expect(requireHub('rio-branco').tz).toBe('America/Rio_Branco');
    expect(requireHub('cuiaba').tz).toBe('America/Cuiaba');
    expect(requireHub('fernando-de-noronha').tz).toBe('America/Noronha');
    expect(requireHub('lisboa').tz).toBe('Europe/Lisbon');
    expect(requireHub('lax').tz).toBe('America/Los_Angeles');
  });

  it('busca por id e códigos curtos', () => {
    expect(getHub('nao-existe')).toBeUndefined();
    expect(() => requireHub('nao-existe')).toThrow();
    expect(shortCode(requireHub('gru'))).toBe('GRU');
    expect(shortCode(requireHub('rio-de-janeiro'))).toBe('RIO');
    expect(shortCode(requireHub('curitiba'))).toBe('CUR');
    expect(shortCode(requireHub('rod-tiete'))).toBe('SAO');
    expect(shortCode(requireHub('sao-jose-dos-campos'))).toBe('SJC');
    expect(shortCode({ ...requireHub('gru'), code: undefined, city: 'Ré', name: 'Re' })).toBe('REX');
  });
});

describe('Viagens pré-cadastradas', () => {
  it('são 10 presets com hubs existentes e modais variados', () => {
    expect(PRESET_TRIPS).toHaveLength(10);
    for (const p of PRESET_TRIPS) {
      expect(getHub(p.originId)).toBeDefined();
      expect(getHub(p.destinationId)).toBeDefined();
      expect(/^\d{2}:\d{2}$/.test(p.time)).toBe(true);
      expect(p.durationMinutes).toBeGreaterThan(0);
    }
    expect(new Set(PRESET_TRIPS.map((p) => p.mode)).size).toBe(5);
    expect(getPreset('via-dutra')?.mode).toBe('bus');
    expect(getPreset('x')).toBeUndefined();
  });
});
