/**
 * Planta baixa interativa do veículo com mapa de calor por assento,
 * selo de "Melhor Assento" e seleção por toque.
 */
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { CabinLayout, SeatRecommendation, SeatScore } from '../engine/types';
import { useI18n, type Strings } from '../i18n';
import { contrastText, goldenColor, heatColor, useAppTheme, type Palette, type Scheme } from '../theme/colors';

export interface SeatMapProps {
  recommendation: SeatRecommendation;
  selectedId?: string;
  onSelect?: (seat: SeatScore) => void;
  width: number;
  /** Colore pela vista dourada em vez do calor. */
  goldenView?: boolean;
}

/** Rótulos curtos dos lugares do carro (o nome completo aparece no card de detalhes). */
const CAR_LABELS: Record<string, string> = {
  'car-driver': 'MOT',
  'car-front-right': 'CAR',
  'car-rear-left': 'T.E.',
  'car-rear-center': 'T.C.',
  'car-rear-right': 'T.D.',
};

const SEAT_SIZE: Record<CabinLayout['mode'], number> = { bus: 0.15, plane: 0.105, car: 0.2, train: 0.15, boat: 0.12 };

function VehicleOutline({
  layout,
  W,
  H,
  colors,
  scheme,
  tx,
}: {
  layout: CabinLayout;
  W: number;
  H: number;
  colors: Palette;
  scheme: Scheme;
  tx: Strings['seats'];
}) {
  const body = scheme === 'dark' ? '#1F1F22' : '#FAFAFC';
  const stroke = colors.textMuted;
  switch (layout.mode) {
    case 'plane': {
      const [w0, w1] = layout.wingRows ?? [10, 16];
      const rowY = (r: number) => H * (0.17 + ((r - 0.5) / layout.rows) * 0.74);
      const yA = rowY(w0) - 6;
      const yB = rowY(w1) + 6;
      return (
        <G>
          <Path d={`M0,${yA + 30} L${W * 0.12},${yA} L${W * 0.12},${yB} L0,${yB + 40} Z`} fill={colors.chipBackground} />
          <Path d={`M${W},${yA + 30} L${W * 0.88},${yA} L${W * 0.88},${yB} L${W},${yB + 40} Z`} fill={colors.chipBackground} />
          <Path
            d={`M${W * 0.5},4 C${W * 0.8},${H * 0.03} ${W * 0.88},${H * 0.1} ${W * 0.88},${H * 0.16} L${W * 0.88},${H * 0.93} C${W * 0.88},${H * 0.97} ${W * 0.7},${H - 4} ${W * 0.5},${H - 4} C${W * 0.3},${H - 4} ${W * 0.12},${H * 0.97} ${W * 0.12},${H * 0.93} L${W * 0.12},${H * 0.16} C${W * 0.12},${H * 0.1} ${W * 0.2},${H * 0.03} ${W * 0.5},4 Z`}
            fill={body}
            stroke={stroke}
            strokeWidth={1.5}
          />
          <Path d={`M${W * 0.42},${H * 0.06} Q${W * 0.5},${H * 0.045} ${W * 0.58},${H * 0.06}`} stroke={stroke} strokeWidth={3} fill="none" />
          <SvgText x={4} y={yA + 18} fontSize={10} fill={colors.textMuted}>
            {tx.svgWing}
          </SvgText>
          <SvgText x={W - 4} y={yA + 18} fontSize={10} fill={colors.textMuted} textAnchor="end">
            {tx.svgWing}
          </SvgText>
        </G>
      );
    }
    case 'car':
      return (
        <G>
          <Path
            d={`M${W * 0.2},${H * 0.12} C${W * 0.2},${H * 0.03} ${W * 0.8},${H * 0.03} ${W * 0.8},${H * 0.12} L${W * 0.86},${H * 0.88} C${W * 0.86},${H * 0.98} ${W * 0.14},${H * 0.98} ${W * 0.14},${H * 0.88} Z`}
            fill={body}
            stroke={stroke}
            strokeWidth={1.5}
          />
          <Path d={`M${W * 0.26},${H * 0.27} Q${W * 0.5},${H * 0.2} ${W * 0.74},${H * 0.27} L${W * 0.72},${H * 0.31} Q${W * 0.5},${H * 0.26} ${W * 0.28},${H * 0.31} Z`} fill={`${colors.sunFront}55`} />
          <Path d={`M${W * 0.28},${H * 0.84} Q${W * 0.5},${H * 0.88} ${W * 0.72},${H * 0.84} L${W * 0.7},${H * 0.81} Q${W * 0.5},${H * 0.84} ${W * 0.3},${H * 0.81} Z`} fill={`${colors.sunFront}33`} />
          <Circle cx={W * 0.31} cy={H * 0.33} r={W * 0.06} fill="none" stroke={stroke} strokeWidth={2} />
          <SvgText x={W / 2} y={H * 0.17} fontSize={10} fill={colors.textMuted} textAnchor="middle">
            {tx.svgWindshield}
          </SvgText>
        </G>
      );
    case 'boat':
      return (
        <G>
          <Path
            d={`M${W * 0.5},4 C${W * 0.78},${H * 0.12} ${W * 0.9},${H * 0.25} ${W * 0.9},${H * 0.4} L${W * 0.9},${H * 0.95} L${W * 0.1},${H * 0.95} L${W * 0.1},${H * 0.4} C${W * 0.1},${H * 0.25} ${W * 0.22},${H * 0.12} ${W * 0.5},4 Z`}
            fill={body}
            stroke={stroke}
            strokeWidth={1.5}
          />
          <Rect x={W * 0.13} y={H * 0.16} width={W * 0.74} height={H * 0.55} rx={14} fill="none" stroke={stroke} strokeDasharray="4 4" />
          <SvgText x={W / 2} y={H * 0.74} fontSize={10} fill={colors.textMuted} textAnchor="middle">
            {tx.svgOpenDeck}
          </SvgText>
          <SvgText x={W * 0.06} y={H * 0.45} fontSize={10} fill={colors.textMuted} textAnchor="middle" transform={`rotate(-90 ${W * 0.06} ${H * 0.45})`}>
            {tx.svgPort}
          </SvgText>
          <SvgText x={W * 0.94} y={H * 0.45} fontSize={10} fill={colors.textMuted} textAnchor="middle" transform={`rotate(90 ${W * 0.94} ${H * 0.45})`}>
            {tx.svgStarboard}
          </SvgText>
        </G>
      );
    case 'train':
      return (
        <G>
          <Rect x={W * 0.05} y={4} width={W * 0.9} height={H - 8} rx={W * 0.12} fill={body} stroke={stroke} strokeWidth={1.5} />
          <Rect x={W * 0.05} y={H * 0.06} width={4} height={H * 0.88} fill={`${colors.sunLeft}44`} />
          <Rect x={W * 0.95 - 4} y={H * 0.06} width={4} height={H * 0.88} fill={`${colors.sunRight}44`} />
        </G>
      );
    default:
      return (
        <G>
          <Rect x={W * 0.03} y={4} width={W * 0.94} height={H - 8} rx={16} fill={body} stroke={stroke} strokeWidth={1.5} />
          <Rect x={W * 0.08} y={8} width={W * 0.84} height={H * 0.035} rx={6} fill={`${colors.sunFront}55`} />
          <Circle cx={W * 0.17} cy={H * 0.1} r={W * 0.06} fill="none" stroke={stroke} strokeWidth={2} />
          <Rect x={W * 0.78} y={H * 0.07} width={W * 0.12} height={H * 0.06} rx={4} fill="none" stroke={stroke} strokeDasharray="3 3" />
          <SvgText x={W * 0.84} y={H * 0.145} fontSize={9} fill={colors.textMuted} textAnchor="middle">
            {tx.svgDoor}
          </SvgText>
        </G>
      );
  }
}

export function SeatMapSVG({ recommendation, selectedId, onSelect, width, goldenView }: SeatMapProps) {
  const { colors, scheme } = useAppTheme();
  const { s: i18n } = useI18n();
  const tx = i18n.seats;
  const layout = recommendation.layout;
  const W = width;
  const H = width / layout.aspect;
  const s = W * SEAT_SIZE[layout.mode];
  const bestId = recommendation.best.seat.id;

  return (
    <Svg width={W} height={H + 24} viewBox={`0 0 ${W} ${H + 24}`} accessibilityLabel={tx.svgA11y(i18n.layoutNames[layout.mode])}>
      <SvgText x={W / 2} y={14} fontSize={11} fontWeight="700" fill={colors.textMuted} textAnchor="middle">
        {tx.svgFront}
      </SvgText>
      <G transform="translate(0, 20)">
        <VehicleOutline layout={layout} W={W} H={H} colors={colors} scheme={scheme} tx={tx} />
        {recommendation.scores.map((sc) => {
          const { seat } = sc;
          const cx = seat.x * W;
          const cy = seat.y * H;
          const value = goldenView ? sc.goldenView : sc.heat;
          const fill = goldenView ? goldenColor(value, scheme) : heatColor(value, scheme);
          const isBest = seat.id === bestId;
          const isSel = seat.id === selectedId;
          const w = layout.mode === 'car' ? s * 1.15 : s;
          const label = layout.mode === 'car' ? CAR_LABELS[seat.id] ?? seat.label : seat.label;
          return (
            <G
              key={seat.id}
              onPress={onSelect ? () => onSelect(sc) : undefined}
              accessibilityLabel={tx.seatA11y(seat.label, sc.heat)}
            >
              {/* área de toque maior que a marca */}
              <Rect x={cx - w / 2 - 3} y={cy - s / 2 - 3} width={w + 6} height={s + 6} fill="transparent" />
              <Rect
                x={cx - w / 2}
                y={cy - s / 2}
                width={w}
                height={s * 0.92}
                rx={s * 0.22}
                fill={fill}
                stroke={isSel ? colors.text : isBest ? colors.gold : scheme === 'dark' ? '#00000066' : '#FFFFFF'}
                strokeWidth={isSel ? 3 : isBest ? 3 : 1}
              />
              <Rect x={cx - w * 0.36} y={cy + s * 0.32} width={w * 0.72} height={s * 0.12} rx={2} fill={scheme === 'dark' ? '#00000044' : '#00000014'} />
              <SvgText
                x={cx}
                y={cy + s * 0.1}
                fontSize={Math.max(8, Math.min(13, s * 0.36))}
                fontWeight="700"
                fill={contrastText(fill)}
                textAnchor="middle"
              >
                {label}
              </SvgText>
              {isBest ? (
                <G transform={`translate(${cx + w / 2 - 2}, ${cy - s / 2 + 2})`}>
                  <Circle r={8} fill={colors.gold} stroke={colors.surface} strokeWidth={1.5} />
                  <Path d="M0,-4.6 L1.3,-1.4 L4.6,-1.4 L1.9,0.6 L2.9,3.9 L0,1.9 L-2.9,3.9 L-1.9,0.6 L-4.6,-1.4 L-1.3,-1.4 Z" fill="#3B2600" />
                </G>
              ) : null}
            </G>
          );
        })}
        {layout.mode === 'bus' || layout.mode === 'train' || layout.mode === 'plane' ? (
          <Line x1={W / 2} y1={H * 0.16} x2={W / 2} y2={H * 0.95} stroke={colors.gridLine} strokeDasharray="2 6" />
        ) : null}
      </G>
    </Svg>
  );
}
