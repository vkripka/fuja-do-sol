import {
  airMassKastenYoung,
  atmosphericRefraction,
  classifyDayPhase,
  CRUISE_ALTITUDE_M,
  directNormalIrradiance,
  estimateUvIndex,
  fromJulianDay,
  getSolarPosition,
  getSunEvents,
  goldenWeight,
  greenwichMeanSiderealTime,
  horizonDip,
  julianCentury,
  solarCoordinates,
  solarNoon,
  toJulianDay,
} from '../src/engine/solarPosition';
import { brt, localHour, SAO_PAULO } from './helpers';

describe('Dia Juliano', () => {
  it('converte a época J2000.0 corretamente', () => {
    expect(toJulianDay(new Date(Date.UTC(2000, 0, 1, 12)))).toBeCloseTo(2451545.0, 6);
    expect(julianCentury(2451545.0)).toBe(0);
  });
  it('é reversível', () => {
    const d = new Date(Date.UTC(2024, 6, 4, 15, 30));
    expect(fromJulianDay(toJulianDay(d)).getTime()).toBeCloseTo(d.getTime(), -1);
  });
  it('GMST na J2000.0 ≈ 280.46°', () => {
    expect(greenwichMeanSiderealTime(2451545.0)).toBeCloseTo(280.46062, 4);
  });
});

describe('Coordenadas solares (Meeus, exemplo 25.a — 13/out/1992)', () => {
  const T = julianCentury(2448908.5);
  const sc = solarCoordinates(T);
  it('declinação ≈ −7.785°', () => expect(sc.declination).toBeCloseTo(-7.785, 1));
  it('ascensão reta ≈ 198.38°', () => expect(sc.rightAscension).toBeCloseTo(198.38, 1));
  it('equação do tempo ≈ +13.7 min (Meeus 28.a)', () => expect(sc.equationOfTime).toBeCloseTo(13.7, 0));
  it('distância Terra-Sol ≈ 0.9976 UA', () => expect(sc.radiusVector).toBeCloseTo(0.9976, 3));
});

describe('Posição do Sol em São Paulo', () => {
  it('solstício de verão: Sol praticamente a pino ao meio-dia solar (Trópico de Capricórnio)', () => {
    const noon = solarNoon(brt(2025, 12, 21, 12), SAO_PAULO.lon);
    const p = getSolarPosition(noon, SAO_PAULO);
    expect(p.elevation).toBeGreaterThan(88);
    expect(p.declination).toBeCloseTo(-23.44, 1);
    expect(Math.abs(p.hourAngle)).toBeLessThan(0.5);
  });

  it('solstício de inverno: elevação ≈ 43° voltada para o Norte', () => {
    const noon = solarNoon(brt(2025, 6, 21, 12), SAO_PAULO.lon);
    const p = getSolarPosition(noon, SAO_PAULO);
    expect(p.elevation).toBeGreaterThan(42.5);
    expect(p.elevation).toBeLessThan(43.6);
    expect(Math.min(p.azimuth, 360 - p.azimuth)).toBeLessThan(1);
    expect(p.phase).toBe('day');
  });

  it('meio-dia solar ocorre perto das 12:10 BRT em junho (longitude −46.6°)', () => {
    const noon = solarNoon(brt(2025, 6, 21, 9), SAO_PAULO.lon);
    const h = localHour(noon);
    expect(h).toBeGreaterThan(11.9);
    expect(h).toBeLessThan(12.3);
  });

  it('nasce a Leste pela manhã e põe-se a Oeste à tarde (equinócio)', () => {
    const morning = getSolarPosition(brt(2025, 3, 20, 7), SAO_PAULO);
    const evening = getSolarPosition(brt(2025, 3, 20, 17, 30), SAO_PAULO);
    expect(morning.azimuth).toBeGreaterThan(70);
    expect(morning.azimuth).toBeLessThan(110);
    expect(evening.azimuth).toBeGreaterThan(250);
    expect(evening.azimuth).toBeLessThan(290);
    expect(morning.hourAngle).toBeLessThan(0);
    expect(evening.hourAngle).toBeGreaterThan(0);
  });

  it('madrugada tem elevação negativa, irradiância e UV nulos', () => {
    const p = getSolarPosition(brt(2025, 1, 15, 2), SAO_PAULO);
    expect(p.elevation).toBeLessThan(-30);
    expect(p.isUp).toBe(false);
    expect(p.directIrradiance).toBe(0);
    expect(p.uvIndex).toBe(0);
    expect(p.airMass).toBeNull();
    expect(p.phase).toBe('night');
  });

  it('UV do meio-dia de verão é extremo (> 11)', () => {
    const noon = solarNoon(brt(2025, 1, 10, 12), SAO_PAULO.lon);
    expect(getSolarPosition(noon, SAO_PAULO).uvIndex).toBeGreaterThan(11);
  });
});

describe('Nascer e pôr do Sol', () => {
  it('São Paulo, 21/dez: nasce ~05:15 e se põe ~18:50 (BRT)', () => {
    const ev = getSunEvents(brt(2025, 12, 21, 12), SAO_PAULO);
    expect(ev.polar).toBe('normal');
    const rise = localHour(ev.sunrise as Date);
    const set = localHour(ev.sunset as Date);
    expect(rise).toBeGreaterThan(5.0);
    expect(rise).toBeLessThan(5.5);
    expect(set).toBeGreaterThan(18.6);
    expect(set).toBeLessThan(19.0);
    expect(ev.dayLengthMinutes).toBeGreaterThan(13 * 60);
    // nascer a ESE no verão austral
    const azRise = getSolarPosition(ev.sunrise as Date, SAO_PAULO).azimuth;
    expect(azRise).toBeGreaterThan(105);
    expect(azRise).toBeLessThan(125);
    expect((ev.morningGoldenEnd as Date).getTime()).toBeGreaterThan((ev.sunrise as Date).getTime());
    expect((ev.eveningGoldenStart as Date).getTime()).toBeLessThan((ev.sunset as Date).getTime());
  });

  it('no nascer calculado, a elevação aparente ≈ −0.833°', () => {
    const ev = getSunEvents(brt(2025, 9, 23, 12), SAO_PAULO);
    expect(getSolarPosition(ev.sunrise as Date, SAO_PAULO).elevation).toBeCloseTo(-0.833, 0);
  });

  it('altitude de cruzeiro antecipa o nascer e atrasa o pôr do sol', () => {
    const ground = getSunEvents(brt(2025, 6, 1, 12), SAO_PAULO, 0);
    const air = getSunEvents(brt(2025, 6, 1, 12), SAO_PAULO, CRUISE_ALTITUDE_M);
    const earlier = ((ground.sunrise as Date).getTime() - (air.sunrise as Date).getTime()) / 60000;
    const later = ((air.sunset as Date).getTime() - (ground.sunset as Date).getTime()) / 60000;
    expect(earlier).toBeGreaterThan(10);
    expect(later).toBeGreaterThan(10);
    expect(air.dayLengthMinutes).toBeGreaterThan(ground.dayLengthMinutes + 20);
  });

  it('detecta dia polar e noite polar', () => {
    const svalbard = { lat: 78.2, lon: 15.6 };
    expect(getSunEvents(new Date(Date.UTC(2025, 5, 21, 12)), svalbard).polar).toBe('polarDay');
    const night = getSunEvents(new Date(Date.UTC(2025, 11, 21, 12)), svalbard);
    expect(night.polar).toBe('polarNight');
    expect(night.sunrise).toBeNull();
    expect(night.dayLengthMinutes).toBe(0);
  });
});

describe('Física atmosférica', () => {
  it('depressão do horizonte a 11.000 m ≈ 3.3°', () => {
    expect(horizonDip(11000)).toBeGreaterThan(3.2);
    expect(horizonDip(11000)).toBeLessThan(3.5);
    expect(horizonDip(0)).toBe(0);
    expect(horizonDip(-5)).toBe(0);
  });

  it('refração: ~34′ no horizonte, ~0 no zênite', () => {
    expect(atmosphericRefraction(0) * 60).toBeCloseTo(28.9, 0);
    expect(atmosphericRefraction(-0.833)).toBeGreaterThan(0.35);
    expect(atmosphericRefraction(-3)).toBeGreaterThan(0);
    expect(atmosphericRefraction(45) * 3600).toBeCloseTo(58, -1);
    expect(atmosphericRefraction(89)).toBe(0);
  });

  it('massa de ar de Kasten-Young: 1 no zênite, ~38 no horizonte', () => {
    expect(airMassKastenYoung(90)).toBeCloseTo(1, 2);
    expect(airMassKastenYoung(30)).toBeCloseTo(2, 1);
    expect(airMassKastenYoung(0)).toBeGreaterThan(25);
    expect(airMassKastenYoung(90, 11000)).toBeLessThan(0.3);
  });

  it('irradiância direta: ~1.0 kW/m² no zênite, maior em altitude, zero à noite', () => {
    expect(directNormalIrradiance(90)).toBeCloseTo(0.95, 2);
    expect(directNormalIrradiance(90, 0, 0.983)).toBeGreaterThan(directNormalIrradiance(90, 0, 1.017));
    expect(directNormalIrradiance(30, 11000)).toBeGreaterThan(directNormalIrradiance(30, 0));
    expect(directNormalIrradiance(-5)).toBe(0);
  });

  it('UV estimado cresce com a elevação e com a altitude', () => {
    expect(estimateUvIndex(90)).toBeCloseTo(12.5, 1);
    expect(estimateUvIndex(30)).toBeLessThan(estimateUvIndex(60));
    expect(estimateUvIndex(60, 11000)).toBeGreaterThan(estimateUvIndex(60, 0));
    expect(estimateUvIndex(-1)).toBe(0);
  });

  it('classifica as fases do dia', () => {
    expect(classifyDayPhase(-20)).toBe('night');
    expect(classifyDayPhase(-15)).toBe('astronomicalTwilight');
    expect(classifyDayPhase(-8)).toBe('nauticalTwilight');
    expect(classifyDayPhase(-3)).toBe('civilTwilight');
    expect(classifyDayPhase(3)).toBe('goldenHour');
    expect(classifyDayPhase(30)).toBe('day');
    expect(classifyDayPhase(-2, 3.36)).toBe('goldenHour');
  });

  it('peso de golden hour: pico em +2°, nulo fora de [−4°, +10°]', () => {
    expect(goldenWeight(2)).toBeCloseTo(1);
    expect(goldenWeight(-1)).toBeCloseTo(0.5);
    expect(goldenWeight(6)).toBeCloseTo(0.5);
    expect(goldenWeight(-5)).toBe(0);
    expect(goldenWeight(15)).toBe(0);
  });
});
