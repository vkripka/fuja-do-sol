/** Viagens famosas prontas para simular em 1 toque. */
import type { Coordinates, OptimizationMode, TransportMode } from '../engine/types';

export interface PresetTrip {
  id: string;
  title: string;
  subtitle: string;
  mode: TransportMode;
  originId: string;
  destinationId: string;
  /** Horário de partida local da origem (HH:MM). */
  time: string;
  durationMinutes: number;
  optimization: OptimizationMode;
  /** Waypoints intermediários (sem origem/destino) que reproduzem o traçado real. */
  waypoints?: Coordinates[];
  highlight: string;
}

export const PRESET_TRIPS: PresetTrip[] = [
  {
    id: 'via-dutra',
    title: 'Via Dutra',
    subtitle: 'São Paulo → Rio de Janeiro',
    mode: 'bus',
    originId: 'rod-tiete',
    destinationId: 'rod-novo-rio',
    time: '08:00',
    durationMinutes: 390,
    optimization: 'shade',
    waypoints: [
      { lat: -23.4543, lon: -46.5337 },
      { lat: -23.1896, lon: -45.8841 },
      { lat: -23.0264, lon: -45.5553 },
      { lat: -22.8495, lon: -45.2339 },
      { lat: -22.4705, lon: -44.4509 },
      { lat: -22.5231, lon: -44.1042 },
      { lat: -22.6284, lon: -43.8986 },
      { lat: -22.7556, lon: -43.4603 },
    ],
    highlight: 'A rodovia mais movimentada do Brasil, 430 km pelo Vale do Paraíba.',
  },
  {
    id: 'ponte-aerea',
    title: 'Ponte Aérea',
    subtitle: 'Congonhas → Santos Dumont',
    mode: 'plane',
    originId: 'cgh',
    destinationId: 'sdu',
    time: '07:00',
    durationMinutes: 60,
    optimization: 'golden',
    highlight: 'Pouso com vista da Baía de Guanabara e do Pão de Açúcar.',
  },
  {
    id: 'rota-do-sol',
    title: 'Litoral Catarinense',
    subtitle: 'Curitiba → Florianópolis',
    mode: 'car',
    originId: 'curitiba',
    destinationId: 'florianopolis',
    time: '09:00',
    durationMinutes: 300,
    optimization: 'shade',
    waypoints: [
      { lat: -25.7, lon: -49.08 },
      { lat: -26.03, lon: -48.85 },
      { lat: -26.3044, lon: -48.8456 },
      { lat: -26.9078, lon: -48.6619 },
      { lat: -26.9906, lon: -48.6352 },
      { lat: -27.2364, lon: -48.6338 },
    ],
    highlight: 'Descida da Serra pela BR-376 e BR-101 até a Ilha da Magia.',
  },
  {
    id: 'balsa-ilhabela',
    title: 'Travessia Ilhabela',
    subtitle: 'São Sebastião → Ilhabela',
    mode: 'boat',
    originId: 'balsa-sao-sebastiao',
    destinationId: 'balsa-ilhabela',
    time: '10:00',
    durationMinutes: 20,
    optimization: 'shade',
    waypoints: [{ lat: -23.8115, lon: -45.3855 }],
    highlight: 'Balsa no Canal de São Sebastião — escolha o lado do convés!',
  },
  {
    id: 'trem-serra-do-mar',
    title: 'Trem da Serra do Mar',
    subtitle: 'Curitiba → Morretes',
    mode: 'train',
    originId: 'estacao-curitiba',
    destinationId: 'estacao-morretes',
    time: '08:15',
    durationMinutes: 240,
    optimization: 'shade',
    waypoints: [
      { lat: -25.4419, lon: -49.0631 },
      { lat: -25.4655, lon: -48.9806 },
      { lat: -25.4833, lon: -48.9203 },
      { lat: -25.4718, lon: -48.8771 },
    ],
    highlight: 'Um dos passeios de trem mais bonitos do mundo, pela Mata Atlântica.',
  },
  {
    id: 'lisboa-porto',
    title: 'Alfa Pendular',
    subtitle: 'Lisboa → Porto',
    mode: 'train',
    originId: 'santa-apolonia',
    destinationId: 'campanha',
    time: '09:00',
    durationMinutes: 170,
    optimization: 'shade',
    waypoints: [
      { lat: 39.2362, lon: -8.6868 },
      { lat: 39.4667, lon: -8.4681 },
      { lat: 40.2229, lon: -8.4333 },
      { lat: 40.6443, lon: -8.6455 },
    ],
    highlight: 'O trem mais rápido de Portugal, rumo norte pelo interior.',
  },
  {
    id: 'sp-bh-noturno',
    title: 'Fernão Dias Noturno',
    subtitle: 'São Paulo → Belo Horizonte',
    mode: 'bus',
    originId: 'rod-tiete',
    destinationId: 'rod-bh',
    time: '22:00',
    durationMinutes: 510,
    optimization: 'golden',
    waypoints: [
      { lat: -23.117, lon: -46.5503 },
      { lat: -22.8547, lon: -46.3181 },
      { lat: -22.2302, lon: -45.9355 },
      { lat: -21.6967, lon: -45.2553 },
      { lat: -21.2453, lon: -44.9997 },
      { lat: -20.6966, lon: -44.8289 },
      { lat: -19.9681, lon: -44.1983 },
    ],
    highlight: 'Dorme em SP e acorda com o nascer do sol em Minas.',
  },
  {
    id: 'barcas-rio-niteroi',
    title: 'Barcas Rio–Niterói',
    subtitle: 'Praça XV → Araribóia',
    mode: 'boat',
    originId: 'barcas-praca-xv',
    destinationId: 'barcas-arariboia',
    time: '17:30',
    durationMinutes: 20,
    optimization: 'golden',
    waypoints: [{ lat: -22.8985, lon: -43.148 }],
    highlight: 'Pôr do sol atrás do Rio, visto da Baía de Guanabara.',
  },
  {
    id: 'salvador-morro',
    title: 'Catamarã para o Morro',
    subtitle: 'Salvador → Morro de São Paulo',
    mode: 'boat',
    originId: 'terminal-nautico-salvador',
    destinationId: 'porto-morro',
    time: '09:00',
    durationMinutes: 150,
    optimization: 'shade',
    waypoints: [
      { lat: -13.0153, lon: -38.5642 },
      { lat: -13.1305, lon: -38.7257 },
      { lat: -13.2721, lon: -38.8465 },
    ],
    highlight: 'Mar aberto pela costa baiana até Tinharé.',
  },
  {
    id: 'gru-lisboa',
    title: 'Voo para Lisboa',
    subtitle: 'Guarulhos → Lisboa',
    mode: 'plane',
    originId: 'gru',
    destinationId: 'lis',
    time: '17:00',
    durationMinutes: 600,
    optimization: 'golden',
    highlight: 'Pôr do sol na decolagem e nascer do sol sobre o Atlântico.',
  },
];

export function getPreset(id: string): PresetTrip | undefined {
  return PRESET_TRIPS.find((p) => p.id === id);
}
