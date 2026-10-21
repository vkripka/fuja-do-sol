/**
 * Mapa vetorial estilizado da rota: cada trecho colorido pelo lado e intensidade do Sol,
 * marcador do veículo sincronizado ao scrubber e pontos de virada solar.
 */
import { useMemo } from 'react';
import Svg, { Circle, G, Line, Path, Polyline, Text as SvgText } from 'react-native-svg';
import { boundingBox } from '../engine/geodesic';
import { cosD } from '../engine/math';
import type { Coordinates, SegmentExposure, TripAnalysisResult } from '../engine/types';
import { useAppTheme, type Palette } from '../theme/colors';

export interface RoutePreviewProps {
  analysis: TripAnalysisResult;
  /** 0..1 */
  progress: number;
  width: number;
  height: number;
  originLabel?: string;
  destinationLabel?: string;
}

export function segmentColor(ex: SegmentExposure, colors: Palette): { color: string; opacity: number; night: boolean } {
  const c = ex.components;
  if (!ex.sun.isUp) return { color: colors.night, opacity: 0.8, night: true };
  const lateral = Math.max(c.left, c.right);
  const longitudinal = Math.max(c.front, c.back);
  const strength = Math.max(lateral, longitudinal);
  const opacity = 0.35 + 0.65 * Math.min(1, strength / 0.7);
  if (strength < 0.04) return { color: colors.night, opacity: 0.55, night: false };
  if (lateral >= longitudinal) return { color: c.left > c.right ? colors.sunLeft : colors.sunRight, opacity, night: false };
  return { color: colors.sunFront, opacity, night: false };
}

export function RoutePreviewSVG({ analysis, progress, width, height, originLabel, destinationLabel }: RoutePreviewProps) {
  const { colors } = useAppTheme();
  const pad = 22;
  const path = analysis.input.path ?? [analysis.input.origin, analysis.input.destination];

  const project = useMemo(() => {
    const bb = boundingBox(path);
    const midLat = (bb.minLat + bb.maxLat) / 2;
    const kx = cosD(midLat);
    const spanX = Math.max(1e-6, (bb.maxLon - bb.minLon) * kx);
    const spanY = Math.max(1e-6, bb.maxLat - bb.minLat);
    const scale = Math.min((width - 2 * pad) / spanX, (height - 2 * pad) / spanY);
    const offX = (width - spanX * scale) / 2;
    const offY = (height - spanY * scale) / 2;
    return (p: Coordinates): [number, number] => [offX + (p.lon - bb.minLon) * kx * scale, offY + (bb.maxLat - p.lat) * scale];
  }, [path, width, height]);

  const base = path.map((p) => project(p).join(',')).join(' ');
  const segs = analysis.segments;
  const idx = Math.max(0, Math.min(segs.length - 1, Math.floor(progress * segs.length)));
  const vehicle = project(segs[idx].segment.midpoint);
  const o = project(path[0]);
  const d = project(path[path.length - 1]);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} accessibilityLabel="Mapa da rota colorido por lado do sol">
      <Polyline points={base} fill="none" stroke={colors.gridLine} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      {segs.map((s) => {
        const a = project(s.segment.start);
        const b = project(s.segment.end);
        const st = segmentColor(s, colors);
        return (
          <Line
            key={s.segment.index}
            x1={a[0]}
            y1={a[1]}
            x2={b[0]}
            y2={b[1]}
            stroke={st.color}
            strokeOpacity={st.opacity}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={st.night ? '2 4' : undefined}
          />
        );
      })}
      {analysis.flips.map((f, i) => {
        const p = project(f.location);
        return (
          <G key={i}>
            <Circle cx={p[0]} cy={p[1]} r={7} fill={colors.surface} stroke={colors.text} strokeWidth={1.5} />
            <Path d={`M${p[0] - 3.5},${p[1]} L${p[0] + 3.5},${p[1]} M${p[0] + 1.5},${p[1] - 2} L${p[0] + 3.5},${p[1]} L${p[0] + 1.5},${p[1] + 2}`} stroke={colors.text} strokeWidth={1.4} fill="none" />
          </G>
        );
      })}
      <Circle cx={o[0]} cy={o[1]} r={7} fill={colors.surface} stroke={colors.text} strokeWidth={2.5} />
      <Circle cx={d[0]} cy={d[1]} r={7} fill={colors.text} />
      {originLabel ? (
        <SvgText x={o[0]} y={o[1] - 12} fontSize={11} fontWeight="700" fill={colors.textSecondary} textAnchor="middle">
          {originLabel}
        </SvgText>
      ) : null}
      {destinationLabel ? (
        <SvgText x={d[0]} y={d[1] - 12} fontSize={11} fontWeight="700" fill={colors.textSecondary} textAnchor="middle">
          {destinationLabel}
        </SvgText>
      ) : null}
      <G>
        <Circle cx={vehicle[0]} cy={vehicle[1]} r={11} fill={colors.tint} stroke={colors.surface} strokeWidth={3} />
        <Circle cx={vehicle[0]} cy={vehicle[1]} r={3.5} fill={colors.surface} />
      </G>
      <G transform={`translate(${width - 18}, 18)`}>
        <Path d="M0,-10 L5,4 L0,1 L-5,4 Z" fill={colors.danger} />
        <SvgText y={15} fontSize={9} fontWeight="700" fill={colors.textMuted} textAnchor="middle">
          N
        </SvgText>
      </G>
    </Svg>
  );
}
