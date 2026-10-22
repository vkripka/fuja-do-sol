/**
 * Gráfico dos horários de partida (00h–23h): altura = calor no lado certo (0..100).
 * Destaca o Horário Campeão de Sombra e marca com ● a pontuação de golden hour.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import type { TimeOptimizationResult, TimeSlotSimulation } from '../engine/types';
import { useI18n } from '../i18n';
import { useAppTheme } from '../theme/colors';
import { formatTime } from '../utils/format';
import { LegendItem } from './ui';

export function DepartureTimesChart({
  result,
  width,
  height = 200,
  selectedHour,
  onSelect,
}: {
  result: TimeOptimizationResult;
  width: number;
  height?: number;
  selectedHour?: number;
  onSelect?: (slot: TimeSlotSimulation) => void;
}) {
  const { colors } = useAppTheme();
  const tx = useI18n().s.optimizer;
  const [hover, setHover] = useState<number | null>(null);
  const slots = result.slots;
  const top = 18;
  const goldenRow = 16;
  const axis = 18;
  const plotH = height - top - goldenRow - axis;
  const base = top + plotH;
  const bw = width / slots.length;
  const gap = Math.min(2, bw * 0.2);
  const champion = (result.bestDaytimeShade ?? result.bestShade).departure.getTime();
  const golden = result.bestGolden?.departure.getTime();

  const press = (e: GestureResponderEvent) => {
    const i = Math.max(0, Math.min(slots.length - 1, Math.floor(e.nativeEvent.locationX / bw)));
    setHover(i);
    onSelect?.(slots[i]);
  };

  const shown = hover !== null ? slots[hover] : null;

  return (
    <View>
      <View style={styles.legend}>
        <LegendItem color={colors.sunLeft} label={tx.legendHeat} />
        <LegendItem color={colors.night} label={tx.legendNight} />
        <LegendItem color={colors.gold} label={tx.legendGolden} />
      </View>
      <Pressable onPress={press} accessibilityRole="adjustable" accessibilityLabel={tx.chartA11y}>
        <Svg width={width} height={height}>
          {slots.map((s, i) => {
            const heat = 100 - s.comfortScore;
            const h = Math.max(3, (heat / 100) * plotH);
            const x = i * bw + gap / 2;
            const w = Math.max(1, bw - gap);
            const r = Math.min(4, w / 2);
            const y = base - h;
            const isChamp = s.departure.getTime() === champion;
            const isSel = selectedHour === s.hour && s.minute === 0;
            const fill = s.nightFraction > 0.5 ? colors.night : colors.sunLeft;
            return (
              <G key={i} opacity={hover !== null && hover !== i ? 0.5 : 1}>
                <Path
                  d={`M${x},${base} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${base} Z`}
                  fill={fill}
                  stroke={isChamp || isSel ? colors.text : 'none'}
                  strokeWidth={isChamp || isSel ? 2 : 0}
                />
                {isChamp ? (
                  <SvgText x={x + w / 2} y={y - 5} fontSize={10} fontWeight="700" fill={colors.text} textAnchor="middle">
                    ★
                  </SvgText>
                ) : null}
                {s.goldenScore > 0 ? (
                  <Circle
                    cx={x + w / 2}
                    cy={base + goldenRow / 2 + 1}
                    r={Math.max(2, Math.min(bw / 2 - 1, 2 + (s.goldenScore / 100) * 5))}
                    fill={colors.gold}
                    stroke={s.departure.getTime() === golden ? colors.text : 'none'}
                    strokeWidth={1.5}
                  />
                ) : null}
              </G>
            );
          })}
          {slots.map((s, i) =>
            s.hour % 3 === 0 && s.minute === 0 ? (
              <SvgText key={`l${i}`} x={i * bw + bw / 2} y={height - 4} fontSize={10} fill={colors.textMuted} textAnchor="middle">
                {`${s.hour}h`}
              </SvgText>
            ) : null,
          )}
        </Svg>
      </Pressable>
      <View style={[styles.tooltip, { backgroundColor: colors.chipBackground }]}>
        <Text style={[styles.tooltipText, { color: shown ? colors.text : colors.textSecondary }]}>
          {shown
            ? tx.tooltip(formatTime(shown.hour, shown.minute), shown.comfortScore, shown.heatScore, shown.goldenScore)
            : tx.tooltipIdle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  tooltip: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6 },
  tooltipText: { fontSize: 13, fontVariant: ['tabular-nums'] },
});
