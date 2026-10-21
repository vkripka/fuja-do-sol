import {
  formatOffset,
  formatZonedDate,
  formatZonedTime,
  guessTimeZone,
  utcOffsetMinutes,
  utcToZoned,
  zonedTimeToUtc,
} from '../src/engine/timezone';

describe('Fusos horários', () => {
  it('Brasil sem horário de verão (UTC−3)', () => {
    expect(utcOffsetMinutes('America/Sao_Paulo', new Date(Date.UTC(2025, 0, 1)))).toBe(-180);
    expect(utcOffsetMinutes('America/Sao_Paulo', new Date(Date.UTC(2025, 6, 1)))).toBe(-180);
  });
  it('Lisboa: WET no inverno e WEST no verão', () => {
    expect(utcOffsetMinutes('Europe/Lisbon', new Date(Date.UTC(2025, 0, 15)))).toBe(0);
    expect(utcOffsetMinutes('Europe/Lisbon', new Date(Date.UTC(2025, 6, 15)))).toBe(60);
    // transição no último domingo de março (30/03/2025 01:00 UTC)
    expect(utcOffsetMinutes('Europe/Lisbon', new Date(Date.UTC(2025, 2, 30, 0, 59)))).toBe(0);
    expect(utcOffsetMinutes('Europe/Lisbon', new Date(Date.UTC(2025, 2, 30, 1, 0)))).toBe(60);
  });
  it('Nova York: EDT entre 09/03 e 02/11 de 2025', () => {
    expect(utcOffsetMinutes('America/New_York', new Date(Date.UTC(2025, 2, 9, 6, 59)))).toBe(-300);
    expect(utcOffsetMinutes('America/New_York', new Date(Date.UTC(2025, 2, 9, 7, 0)))).toBe(-240);
    expect(utcOffsetMinutes('America/New_York', new Date(Date.UTC(2025, 10, 2, 5, 59)))).toBe(-240);
    expect(utcOffsetMinutes('America/New_York', new Date(Date.UTC(2025, 10, 2, 6, 0)))).toBe(-300);
  });
  it('Santiago: horário de verão austral', () => {
    expect(utcOffsetMinutes('America/Santiago', new Date(Date.UTC(2025, 0, 15)))).toBe(-180);
    expect(utcOffsetMinutes('America/Santiago', new Date(Date.UTC(2025, 6, 15)))).toBe(-240);
    expect(utcOffsetMinutes('America/Santiago', new Date(Date.UTC(2025, 9, 15)))).toBe(-180);
  });
  it('ids genéricos UTC±H e desconhecidos', () => {
    expect(utcOffsetMinutes('UTC+5:30', new Date())).toBe(330);
    expect(utcOffsetMinutes('UTC-4', new Date())).toBe(-240);
    expect(utcOffsetMinutes('Marte/Olympus', new Date())).toBe(0);
  });
  it('ida e volta parede ↔ UTC', () => {
    const d = zonedTimeToUtc(2025, 7, 15, 8, 30, 'Europe/Lisbon');
    expect(d.toISOString()).toBe('2025-07-15T07:30:00.000Z');
    const p = utcToZoned(d, 'Europe/Lisbon');
    expect([p.year, p.month, p.day, p.hour, p.minute]).toEqual([2025, 7, 15, 8, 30]);
    expect(zonedTimeToUtc(2025, 3, 20, 8, 0, 'America/Sao_Paulo').toISOString()).toBe('2025-03-20T11:00:00.000Z');
  });
  it('formatação pt-BR', () => {
    const d = new Date(Date.UTC(2025, 2, 20, 11, 5));
    expect(formatZonedTime(d, 'America/Sao_Paulo')).toBe('08:05');
    expect(formatZonedDate(d, 'America/Sao_Paulo')).toBe('qui, 20 mar');
    expect(formatOffset('America/Sao_Paulo', d)).toBe('UTC−3');
    expect(formatOffset('Asia/Tokyo', d)).toBe('UTC+9');
    expect(formatOffset('UTC+5:30', d)).toBe('UTC+5:30');
  });
  it('estima o fuso por UF, país e coordenadas', () => {
    expect(guessTimeZone({ lat: -9.97, lon: -67.81 }, 'BR', 'AC')).toBe('America/Rio_Branco');
    expect(guessTimeZone({ lat: -3.1, lon: -60 }, 'br', 'AM')).toBe('America/Manaus');
    expect(guessTimeZone({ lat: -15.6, lon: -56.1 }, 'BR', 'MT')).toBe('America/Cuiaba');
    expect(guessTimeZone({ lat: -3.85, lon: -32.42 }, 'BR')).toBe('America/Noronha');
    expect(guessTimeZone({ lat: -9.9, lon: -68 }, 'BR')).toBe('America/Rio_Branco');
    expect(guessTimeZone({ lat: -8, lon: -63 })).toBe('America/Manaus');
    expect(guessTimeZone({ lat: -23.5, lon: -46.6 })).toBe('America/Sao_Paulo');
    expect(guessTimeZone({ lat: 48.85, lon: 2.35 }, 'FR')).toBe('UTC');
    expect(guessTimeZone({ lat: 35.6, lon: 139.7 }, 'JP')).toBe('UTC+9');
    expect(guessTimeZone({ lat: 40.7, lon: -74 }, 'US')).toBe('UTC-5');
  });
});
