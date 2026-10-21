/**
 * Contratos de domínio do motor físico/astronômico do "Fuja do Sol!".
 * Todos os ângulos estão em graus, distâncias em km e instantes em `Date` (UTC interno).
 */

export interface Coordinates {
  /** Latitude geodésica em graus decimais (-90..+90, Sul negativo). */
  lat: number;
  /** Longitude em graus decimais (-180..+180, Oeste negativo). */
  lon: number;
}

export type TransportMode = 'bus' | 'plane' | 'car' | 'train' | 'boat';

/** `shade` = Fuja do Sol (sombra máxima); `golden` = Caçador de Pôr/Nascer do Sol. */
export type OptimizationMode = 'shade' | 'golden';

export type LateralSide = 'left' | 'right';

/** Direção predominante da incidência solar em relação ao veículo. */
export type SunSide = 'left' | 'right' | 'front' | 'back' | 'overhead' | 'none';

export type DayPhase =
  | 'night'
  | 'astronomicalTwilight'
  | 'nauticalTwilight'
  | 'civilTwilight'
  | 'goldenHour'
  | 'day';

export interface SolarPosition {
  /** Azimute solar a partir do Norte verdadeiro, sentido horário [0, 360). */
  azimuth: number;
  /** Elevação aparente (com refração) [-90, 90]. */
  elevation: number;
  /** Elevação geométrica (sem refração). */
  trueElevation: number;
  /** Ângulo zenital aparente = 90 - elevação. */
  zenith: number;
  /** Declinação solar δ. */
  declination: number;
  /** Ascensão reta α. */
  rightAscension: number;
  /** Equação do tempo em minutos. */
  equationOfTime: number;
  /** Ângulo horário local H em graus (-180..180, positivo à tarde). */
  hourAngle: number;
  /** Depressão do horizonte pela altitude do observador (graus, >= 0). */
  horizonDip: number;
  /** Massa de ar de Kasten-Young (null quando o Sol está abaixo do horizonte). */
  airMass: number | null;
  /** Irradiância direta normal estimada em céu claro (kW/m²). */
  directIrradiance: number;
  /** Índice UV estimado em céu claro (0..~16). */
  uvIndex: number;
  /** Fase do dia baseada na elevação relativa ao horizonte efetivo. */
  phase: DayPhase;
  /** true quando o disco solar está acima do horizonte efetivo do observador. */
  isUp: boolean;
}

export interface SunEvents {
  sunrise: Date | null;
  sunset: Date | null;
  solarNoon: Date;
  /** Fim da golden hour matinal (Sol cruza +6°). */
  morningGoldenEnd: Date | null;
  /** Início da golden hour vespertina (Sol cruza +6°). */
  eveningGoldenStart: Date | null;
  dayLengthMinutes: number;
  polar: 'normal' | 'polarDay' | 'polarNight';
}

export interface RouteSegment {
  index: number;
  start: Coordinates;
  end: Coordinates;
  midpoint: Coordinates;
  /** Forward bearing θ_vec do segmento [0, 360). */
  bearing: number;
  distanceKm: number;
  /** Distância acumulada até o ponto médio do segmento. */
  cumulativeKm: number;
  /** Fração do percurso f_i = (i + 0.5) / N. */
  fraction: number;
  /** Instante t_i do ponto médio. */
  time: Date;
  minutesFromStart: number;
  /** Duração representada por este segmento (min). */
  durationMinutes: number;
}

export interface SideComponents {
  left: number;
  right: number;
  front: number;
  back: number;
  /** Componente vertical (teto / convés aberto). */
  roof: number;
}

export interface SegmentExposure {
  segment: RouteSegment;
  sun: SolarPosition;
  /** Δψ = ângulo do Sol relativo ao nariz do veículo [-180, 180). Positivo = direita. */
  relativeAngle: number;
  side: SunSide;
  /** Irradiância efetiva em cada face do veículo (kW/m²). */
  components: SideComponents;
  /** Peso cênico (0..1) de pôr/nascer do Sol visível por cada lado. */
  golden: SideComponents;
}

export interface SunFlip {
  index: number;
  minutesFromStart: number;
  time: Date;
  from: LateralSide;
  to: LateralSide;
  location: Coordinates;
}

export interface ExposureWindow {
  side: LateralSide | 'front' | 'back';
  startMinute: number;
  endMinute: number;
  startTime: Date;
  endTime: Date;
  /** Pico de irradiância naquele lado (kW/m²). */
  peakIrradiance: number;
  /** Pico de UV ao ar livre no intervalo. */
  peakUv: number;
}

export interface GoldenEvent {
  kind: 'sunrise' | 'sunset';
  time: Date;
  minutesFromStart: number;
  /** Lado do veículo por onde o evento é visível. */
  side: SunSide;
  azimuth: number;
}

export interface GoldenSummary {
  available: boolean;
  /** Minutos-peso de vista dourada por lado. */
  left: number;
  right: number;
  front: number;
  back: number;
  bestSide: LateralSide | null;
  events: GoldenEvent[];
}

export interface TripInput {
  origin: Coordinates;
  destination: Coordinates;
  /** Geometria real (polyline decodificada ou curva geodésica). Se ausente: grande círculo. */
  path?: Coordinates[];
  departure: Date;
  durationMinutes: number;
  mode: TransportMode;
  optimization: OptimizationMode;
  /** Altitude do observador (m). Avião usa 11.000 m em cruzeiro por padrão. */
  altitudeMeters?: number;
  /** Força o número de segmentos (default: clamp(floor(dur/2), 24, 120)). */
  segmentCount?: number;
}

export interface SidePercentages {
  left: number;
  right: number;
  front: number;
  back: number;
}

export interface TripAnalysisResult {
  input: TripInput;
  segments: SegmentExposure[];
  totalDistanceKm: number;
  durationMinutes: number;
  /** Energia integrada (kWh/m²) por face. */
  energy: SideComponents;
  /** Participação de cada face no total de sol recebido (0..100). */
  sunShare: SidePercentages;
  /** Minutos com sol direto relevante em cada lado. */
  sunlitMinutes: SidePercentages;
  /** % do tempo de viagem na sombra por lado (0..100). */
  shadePct: { left: number; right: number };
  /** Conforto térmico 0..100 (100 = perfeito). */
  thermalComfort: { left: number; right: number };
  /** Lado recomendado conforme o modo de otimização. */
  recommendedSide: LateralSide | 'either';
  /** Lado recomendado para fugir do sol (independente do modo). */
  shadeSide: LateralSide | 'either';
  /** Quão mais fresco é o lado da sombra (0..100%). */
  advantagePct: number;
  nightFraction: number;
  daylightMinutes: number;
  flips: SunFlip[];
  curtainAlerts: ExposureWindow[];
  peakUv: number;
  golden: GoldenSummary;
  /** Manchete curta em pt-BR. */
  verdict: string;
  /** Explicação de apoio em pt-BR. */
  verdictDetail: string;
}

export type SeatPosition = 'window' | 'middle' | 'aisle' | 'center' | 'deck' | 'driver';
export type CabinZone = 'front' | 'middle' | 'back';

export interface Seat {
  id: string;
  label: string;
  row: number;
  /** Coluna lógica (0 = mais à esquerda). */
  col: number;
  position: SeatPosition;
  side: LateralSide | 'center';
  zone: CabinZone;
  /** Coordenadas normalizadas (0..1) para desenho da planta baixa. */
  x: number;
  y: number;
  /** Assento sobre a asa (avião). */
  overWing?: boolean;
  /** false para o motorista. */
  selectable: boolean;
}

export interface CabinLayout {
  mode: TransportMode;
  name: string;
  rows: number;
  columns: number;
  seats: Seat[];
  /** Fileiras com asa (avião). */
  wingRows?: [number, number];
  /** Proporção largura/altura da planta. */
  aspect: number;
}

export type UvLevel = 'Nenhum' | 'Baixo' | 'Moderado' | 'Alto' | 'Muito alto' | 'Extremo';

export interface SeatScore {
  seat: Seat;
  /** Mapa de calor 0..100 (100 = mais sol). */
  heat: number;
  /** % do tempo na sombra. */
  shadePct: number;
  thermalComfort: number;
  /** Energia integrada recebida (kWh/m²). */
  energy: number;
  uvLevel: UvLevel;
  /** UV estimado atrás do vidro no pico. */
  uvBehindGlass: number;
  /** Qualidade da vista do pôr/nascer do Sol (0..100). */
  goldenView: number;
  /** Pontuação final de ranqueamento (maior = melhor para o modo). */
  score: number;
}

export interface SeatPreferences {
  position?: 'window' | 'aisle' | 'any';
  zone?: CabinZone | 'any';
}

export interface SeatRecommendation {
  mode: TransportMode;
  optimization: OptimizationMode;
  layout: CabinLayout;
  scores: SeatScore[];
  best: SeatScore;
  worst: SeatScore;
  ranking: SeatScore[];
  reason: string;
}

export interface TimeSlotSimulation {
  hour: number;
  minute: number;
  departure: Date;
  arrival: Date;
  energyLeft: number;
  energyRight: number;
  /** Energia no melhor lado (quem escolhe o lado certo). */
  bestSideEnergy: number;
  shadeSide: LateralSide | 'either';
  /** Conforto 0..100 sentando do lado certo. */
  comfortScore: number;
  /** Calor 0..100 do pior lado. */
  heatScore: number;
  /** Pontuação dourada 0..100. */
  goldenScore: number;
  goldenSide: LateralSide | null;
  nightFraction: number;
  sunlitMinutes: number;
}

export interface TimeOptimizationResult {
  slots: TimeSlotSimulation[];
  bestShade: TimeSlotSimulation;
  /** Melhor horário de sombra com pelo menos 50% de luz do dia. */
  bestDaytimeShade: TimeSlotSimulation | null;
  bestGolden: TimeSlotSimulation | null;
  worst: TimeSlotSimulation;
}
