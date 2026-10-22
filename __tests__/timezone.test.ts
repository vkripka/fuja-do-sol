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
    expect(guessTimeZone({ lat: 48.85, lon: 2.35 }, 'FR')).toBe('Europe/Paris');
    expect(guessTimeZone({ lat: 35.6, lon: 139.7 }, 'JP')).toBe('Asia/Tokyo');
    expect(guessTimeZone({ lat: 40.7, lon: -74 }, 'US')).toBe('America/New_York');
    expect(guessTimeZone({ lat: 0, lon: 0 })).toBe('UTC');
    expect(guessTimeZone({ lat: 10, lon: 75 })).toBe('UTC+5');
  });

  it('cobre o mundo: EUA por estado/longitude, Canadá, México, Austrália, Ásia e Europa', () => {
    expect(guessTimeZone({ lat: 34, lon: -118 }, 'US', 'CA')).toBe('America/Los_Angeles');
    expect(guessTimeZone({ lat: 33.4, lon: -112 }, 'US', 'AZ')).toBe('America/Phoenix');
    expect(guessTimeZone({ lat: 25.8, lon: -80.2 }, 'US', 'FL')).toBe('America/New_York');
    expect(guessTimeZone({ lat: 39.7, lon: -105 }, 'US')).toBe('America/Denver');
    expect(guessTimeZone({ lat: 41.9, lon: -87.6 }, 'US')).toBe('America/Chicago');
    expect(guessTimeZone({ lat: 21.3, lon: -157.8 }, 'US')).toBe('Pacific/Honolulu');
    expect(guessTimeZone({ lat: 61.2, lon: -149.9 }, 'US')).toBe('America/Anchorage');
    expect(guessTimeZone({ lat: 34, lon: -118 }, 'US')).toBe('America/Los_Angeles');
    expect(guessTimeZone({ lat: 43.7, lon: -79.4 }, 'CA')).toBe('America/Toronto');
    expect(guessTimeZone({ lat: 49.3, lon: -123.1 }, 'CA')).toBe('America/Vancouver');
    expect(guessTimeZone({ lat: 51, lon: -114 }, 'CA')).toBe('America/Edmonton');
    expect(guessTimeZone({ lat: 49.9, lon: -97.1 }, 'CA')).toBe('America/Winnipeg');
    expect(guessTimeZone({ lat: 44.6, lon: -63.6 }, 'CA')).toBe('America/Halifax');
    expect(guessTimeZone({ lat: 19.4, lon: -99.1 }, 'MX')).toBe('America/Mexico_City');
    expect(guessTimeZone({ lat: 21.1, lon: -86.8 }, 'MX')).toBe('America/Cancun');
    expect(guessTimeZone({ lat: 32.5, lon: -117 }, 'MX')).toBe('America/Tijuana');
    expect(guessTimeZone({ lat: 29.1, lon: -111 }, 'MX', 'SON')).toBe('America/Hermosillo');
    expect(guessTimeZone({ lat: -33.9, lon: 151.2 }, 'AU', 'NSW')).toBe('Australia/Sydney');
    expect(guessTimeZone({ lat: -31.9, lon: 115.9 }, 'AU')).toBe('Australia/Perth');
    expect(guessTimeZone({ lat: -12.5, lon: 130.8 }, 'AU')).toBe('Australia/Darwin');
    expect(guessTimeZone({ lat: -34.9, lon: 138.6 }, 'AU')).toBe('Australia/Adelaide');
    expect(guessTimeZone({ lat: -27.5, lon: 153 }, 'AU')).toBe('Australia/Brisbane');
    expect(guessTimeZone({ lat: -37.8, lon: 145 }, 'AU')).toBe('Australia/Sydney');
    expect(guessTimeZone({ lat: 28.1, lon: -15.4 }, 'ES')).toBe('Atlantic/Canary');
    expect(guessTimeZone({ lat: 40.4, lon: -3.7 }, 'ES')).toBe('Europe/Madrid');
    expect(guessTimeZone({ lat: 37.7, lon: -25.7 }, 'PT')).toBe('UTC-1');
    expect(guessTimeZone({ lat: 38.7, lon: -9.1 }, 'PT')).toBe('Europe/Lisbon');
    expect(guessTimeZone({ lat: 55.7, lon: 37.6 }, 'RU')).toBe('Europe/Moscow');
    expect(guessTimeZone({ lat: 43.1, lon: 131.9 }, 'RU')).toBe('UTC+9');
    expect(guessTimeZone({ lat: -6.2, lon: 106.8 }, 'ID')).toBe('Asia/Jakarta');
    expect(guessTimeZone({ lat: -8.6, lon: 116.1 }, 'ID')).toBe('UTC+8');
    expect(guessTimeZone({ lat: 31.2, lon: 121.5 }, 'CN')).toBe('Asia/Shanghai');
    expect(guessTimeZone({ lat: 19, lon: 72.8 }, 'IN')).toBe('Asia/Kolkata');
    expect(guessTimeZone({ lat: 51.5, lon: -0.1 }, 'GB')).toBe('Europe/London');
    expect(guessTimeZone({ lat: -36.8, lon: 174.7 }, 'NZ')).toBe('Pacific/Auckland');
    expect(utcOffsetMinutes('Asia/Kolkata', new Date())).toBe(330);
  });

  it('horário de verão da Austrália e da Nova Zelândia', () => {
    expect(utcOffsetMinutes('Australia/Sydney', new Date(Date.UTC(2025, 0, 15)))).toBe(660);
    expect(utcOffsetMinutes('Australia/Sydney', new Date(Date.UTC(2025, 6, 15)))).toBe(600);
    expect(utcOffsetMinutes('Australia/Brisbane', new Date(Date.UTC(2025, 0, 15)))).toBe(600);
    expect(utcOffsetMinutes('Pacific/Auckland', new Date(Date.UTC(2025, 0, 15)))).toBe(780);
    expect(utcOffsetMinutes('Pacific/Auckland', new Date(Date.UTC(2025, 6, 15)))).toBe(720);
    expect(utcOffsetMinutes('America/Phoenix', new Date(Date.UTC(2025, 6, 15)))).toBe(-420);
    expect(utcOffsetMinutes('America/Denver', new Date(Date.UTC(2025, 6, 15)))).toBe(-360);
  });

  it('formata datas em inglês', () => {
    expect(formatZonedDate(new Date(Date.UTC(2025, 2, 20, 15)), 'America/Sao_Paulo', 'en')).toBe('Thu, Mar 20');
  });
});
