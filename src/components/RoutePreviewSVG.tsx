/**
 * Mapa vetorial estilizado da rota: cada trecho colorido pelo lado e intensidade do Sol,
 * marcador do veículo sincronizado ao scrubber e pontos de virada solar.
 */
import { useMemo } from 'react';
import Svg, { Circle, G, Line, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';
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
  const opacity = 0.45 + 0.55 * Math.min(1, strength / 0.7);
  if (strength < 0.04) return { color: colors.night, opacity: 0.55, night: false };
  if (lateral >= longitudinal) return { color: c.left > c.right ? colors.sunLeft : colors.sunRight, opacity, night: false };
  return { color: colors.sunFront, opacity, night: false };
}

export function RoutePreviewSVG({ analysis, progress, width, height, originLabel, destinationLabel }: RoutePreviewProps) {
  const { colors, scheme } = useAppTheme();
  const pad = 26;
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
  const panel = scheme === 'dark' ? '#FFFFFF08' : '#0000000A';

  // Rótulo acima do ponto, ou abaixo quando colado na borda superior.
  const label = (p: [number, number], text: string) => (
    <SvgText
      x={p[0]}
      y={p[1] < 22 ? p[1] + 18 : p[1] - 10}
      fontSize={10}
      fontWeight="600"
      letterSpacing={0.6}
      fill={colors.textMuted}
      textAnchor="middle"
    >
      {text}
    </SvgText>
  );

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} accessibilityLabel="Mapa da rota colorido por lado do sol">
      <Rect x={0} y={0} width={width} height={height} rx={16} fill={panel} />
      <Polyline points={base} fill="none" stroke={colors.gridLine} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
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
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={st.night ? '1 4' : undefined}
          />
        );
      })}
      {analysis.flips.map((f, i) => {
        const p = project(f.location);
        return <Circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill={colors.surface} stroke={colors.textSecondary} strokeWidth={1.2} />;
      })}
      <Circle cx={o[0]} cy={o[1]} r={4.5} fill={colors.surface} stroke={colors.textSecondary} strokeWidth={2} />
      <Circle cx={d[0]} cy={d[1]} r={4.5} fill={colors.textSecondary} />
      {originLabel ? label(o, originLabel) : null}
      {destinationLabel ? label(d, destinationLabel) : null}
      <G>
        <Circle cx={vehicle[0]} cy={vehicle[1]} r={9} fill={colors.tint} opacity={0.22} />
        <Circle cx={vehicle[0]} cy={vehicle[1]} r={5} fill={colors.tint} stroke={colors.surface} strokeWidth={2} />
      </G>
      <G transform={`translate(${width - 16}, 16)`} opacity={0.6}>
        <Path d="M0,-7 L3.5,3 L0,1 L-3.5,3 Z" fill={colors.textSecondary} />
      </G>
    </Svg>
  );
}
