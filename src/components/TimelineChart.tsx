/**
 * Linha do tempo da viagem: barras divergentes por faixa de tempo — sol na janela
 * esquerda acima do eixo e na direita abaixo — com noite, viradas solares e
 * nascer/pôr do Sol. Toque numa faixa para inspecionar e mover o scrubber.
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { formatZonedTime, type TimeZoneId } from '../engine/timezone';
import type { TripAnalysisResult } from '../engine/types';
import { useI18n } from '../i18n';
import { useAppTheme } from '../theme/colors';
import { LegendItem } from './ui';

export interface TimelineBin {
  start: number;
  end: number;
  left: number;
  right: number;
  front: number;
  night: boolean;
}

export function binMinutesFor(duration: number): number {
  if (duration <= 90) return 10;
  if (duration <= 240) return 15;
  if (duration <= 600) return 30;
  return 60;
}

export function buildBins(analysis: TripAnalysisResult): TimelineBin[] {
  const size = binMinutesFor(analysis.durationMinutes);
  const count = Math.max(1, Math.ceil(analysis.durationMinutes / size));
  const bins: TimelineBin[] = Array.from({ length: count }, (_, i) => ({
    start: i * size,
    end: Math.min(analysis.durationMinutes, (i + 1) * size),
    left: 0,
    right: 0,
    front: 0,
    night: true,
  }));
  const weights = new Array<number>(count).fill(0);
  for (const ex of analysis.segments) {
    const i = Math.min(count - 1, Math.floor(ex.segment.minutesFromStart / size));
    const w = ex.segment.durationMinutes;
    bins[i].left += ex.components.left * w;
    bins[i].right += ex.components.right * w;
    bins[i].front += Math.max(ex.components.front, ex.components.back) * w;
    if (ex.sun.isUp) bins[i].night = false;
    weights[i] += w;
  }
  bins.forEach((b, i) => {
    const w = weights[i] || 1;
    b.left /= w;
    b.right /= w;
    b.front /= w;
  });
  return bins;
}

/** Escala fixa: 0.8 kW/m² preenche a meia-altura (mantém comparabilidade entre viagens). */
const MAX_IRR = 0.8;

export function TimelineChart({
  analysis,
  timeZone,
  width,
  height = 180,
  progress,
  onScrub,
}: {
  analysis: TripAnalysisResult;
  timeZone: TimeZoneId;
  width: number;
  height?: number;
  progress?: number;
  onScrub?: (fraction: number) => void;
}) {
  const { colors } = useAppTheme();
  const tx = useI18n().s.timeline;
  const bins = useMemo(() => buildBins(analysis), [analysis]);
  const [selected, setSelected] = useState<number | null>(null);
  const top = 8;
  const bottomAxis = 22;
  const plotH = height - top - bottomAxis;
  const mid = top + plotH / 2;
  const half = plotH / 2 - 4;
  const left = 4;
  const plotW = width - left * 2;
  const bw = plotW / bins.length;
  const gap = Math.min(2, bw * 0.2);
  const dep = analysis.input.departure.getTime();
  const total = analysis.durationMinutes;
  const xOf = (minute: number) => left + (minute / total) * plotW;
  const labelEvery = Math.max(1, Math.ceil(bins.length / 6));

  const bar = (x: number, w: number, h: number, up: boolean): string => {
    const r = Math.min(4, w / 2, h);
    if (h <= 0.5) return '';
    if (up) {
      const y = mid - h;
      return `M${x},${mid} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${mid} Z`;
    }
    const y = mid + h;
    return `M${x},${mid} L${x},${y - r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y - r} L${x + w},${mid} Z`;
  };

  const handlePress = (e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX;
    const f = Math.max(0, Math.min(1, (x - left) / plotW));
    const i = Math.min(bins.length - 1, Math.floor(f * bins.length));
    setSelected(i);
    onScrub?.(f);
  };

  const sel = selected !== null ? bins[selected] : null;
  const t = (m: number) => formatZonedTime(new Date(dep + m * 60000), timeZone);

  return (
    <View>
      <View style={styles.legend}>
        <LegendItem color={colors.sunLeft} label={tx.legendLeft} />
        <LegendItem color={colors.sunRight} label={tx.legendRight} />
        <LegendItem color={colors.night} label={tx.legendNight} />
      </View>
      <Pressable onPress={handlePress} accessibilityRole="adjustable" accessibilityLabel={tx.a11y}>
        <Svg width={width} height={height}>
          {bins.map((b, i) =>
            b.night ? <Rect key={`n${i}`} x={left + i * bw} y={top} width={bw} height={plotH} fill={colors.night} opacity={0.14} /> : null,
          )}
          <Line x1={left} y1={mid} x2={left + plotW} y2={mid} stroke={colors.gridLine} strokeWidth={1} />
          {bins.map((b, i) => {
            const x = left + i * bw + gap / 2;
            const w = Math.max(1, bw - gap);
            const hl = (Math.min(b.left, MAX_IRR) / MAX_IRR) * half;
            const hr = (Math.min(b.right, MAX_IRR) / MAX_IRR) * half;
            const dim = selected !== null && selected !== i ? 0.45 : 1;
            return (
              <G key={i} opacity={dim}>
                {hl > 0.5 ? <Path d={bar(x, w, hl, true)} fill={colors.sunLeft} /> : null}
                {hr > 0.5 ? <Path d={bar(x, w, hr, false)} fill={colors.sunRight} /> : null}
              </G>
            );
          })}
          {analysis.flips.map((f, i) => (
            <G key={`f${i}`}>
              <Line x1={xOf(f.minutesFromStart)} y1={top} x2={xOf(f.minutesFromStart)} y2={top + plotH} stroke={colors.text} strokeDasharray="3 3" strokeWidth={1} />
              <SvgText x={xOf(f.minutesFromStart) + 3} y={top + 10} fontSize={10} fontWeight="700" fill={colors.text}>
                ⇄
              </SvgText>
            </G>
          ))}
          {analysis.golden.events.map((e, i) => (
            <SvgText key={`g${i}`} x={xOf(e.minutesFromStart)} y={top + plotH - 2} fontSize={11} textAnchor="middle" fill={colors.gold}>
              {e.kind === 'sunrise' ? '☀↑' : '☀↓'}
            </SvgText>
          ))}
          {progress !== undefined ? (
            <Line x1={left + progress * plotW} y1={top - 4} x2={left + progress * plotW} y2={top + plotH + 4} stroke={colors.tint} strokeWidth={2} />
          ) : null}
          {bins.map((b, i) =>
            i % labelEvery === 0 ? (
              <SvgText key={`t${i}`} x={left + i * bw} y={height - 6} fontSize={10} fill={colors.textMuted}>
                {t(b.start)}
              </SvgText>
            ) : null,
          )}
        </Svg>
      </Pressable>
      <View style={[styles.tooltip, { backgroundColor: colors.chipBackground }]}>
        {sel ? (
          <Text style={[styles.tooltipText, { color: colors.text }]}>
            <Text style={{ fontWeight: '700' }}>
              {t(sel.start)}–{t(sel.end)}
            </Text>
            {sel.night
              ? `  ·  ${tx.night}`
              : `  ·  ${tx.left} ${(sel.left * 1000).toFixed(0)} W/m²  ·  ${tx.right} ${(sel.right * 1000).toFixed(0)} W/m²${
                  sel.front > 0.05 ? `  ·  ${tx.frontBack} ${(sel.front * 1000).toFixed(0)} W/m²` : ''
                }`}
          </Text>
        ) : (
          <Text style={[styles.tooltipText, { color: colors.textSecondary }]}>{tx.idle}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  tooltip: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6 },
  tooltipText: { fontSize: 13, fontVariant: ['tabular-nums'] },
});
