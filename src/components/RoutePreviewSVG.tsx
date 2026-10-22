/**
 * Mapa da rota em projeção Web Mercator, em 3 estilos:
 *  - clean: fundo limpo com cidades de referência ao longo da rota;
 *  - map: tiles CartoDB Voyager (OpenStreetMap);
 *  - satellite: Esri World Imagery + rótulos híbridos.
 * Tiles e SVG usam o mesmo viewport, então trechos coloridos pelo sol, viradas e o
 * veículo ficam alinhados ao mapa. Sem internet, cai para o modo clean com aviso.
 */
import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import type { Coordinates, SegmentExposure, TripAnalysisResult } from '../engine/types';
import { useI18n } from '../i18n';
import { routeLandmarks } from '../services/geocodingService';
import {
  fitViewport,
  projectToViewport,
  TILE_ATTRIBUTION,
  TILE_LAYERS,
  tileUrl,
  visibleTiles,
  type MapStyle,
} from '../services/mapTiles';
import { useAppTheme, type Palette } from '../theme/colors';

export interface RoutePreviewProps {
  analysis: TripAnalysisResult;
  /** 0..1 */
  progress: number;
  width: number;
  height: number;
  originLabel?: string;
  destinationLabel?: string;
  mapStyle?: MapStyle;
  /** false = não baixa tiles (serviços online desligados). */
  online?: boolean;
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

export function RoutePreviewSVG({
  analysis,
  progress,
  width,
  height,
  originLabel,
  destinationLabel,
  mapStyle = 'clean',
  online = true,
}: RoutePreviewProps) {
  const { colors, scheme } = useAppTheme();
  const { s } = useI18n();
  const [tilesFailed, setTilesFailed] = useState(false);
  const path = analysis.input.path ?? [analysis.input.origin, analysis.input.destination];

  useEffect(() => setTilesFailed(false), [mapStyle]);

  const vp = useMemo(() => fitViewport(path, width, height, 28), [path, width, height]);
  const project = (c: Coordinates) => projectToViewport(c, vp);
  const landmarks = useMemo(() => routeLandmarks(path, 4), [path]);

  const effective: MapStyle = mapStyle !== 'clean' && online && !tilesFailed ? mapStyle : 'clean';
  const fellBack = mapStyle !== 'clean' && effective === 'clean';
  const onMap = effective !== 'clean';
  const tiles = onMap ? visibleTiles(vp) : [];

  const base = path.map((p) => project(p).join(',')).join(' ');
  const segs = analysis.segments;
  const idx = Math.max(0, Math.min(segs.length - 1, Math.floor(progress * segs.length)));
  const vehicle = project(segs[idx].segment.midpoint);
  const o = project(path[0]);
  const d = project(path[path.length - 1]);
  const panel = scheme === 'dark' ? '#FFFFFF08' : '#0000000A';
  const halo = onMap ? '#FFFFFF' : colors.surface;
  const labelColor = onMap ? '#1F1F1F' : colors.textMuted;

  // Rótulo acima do ponto, ou abaixo quando colado na borda superior.
  // Halo (contorno) desenhado por baixo para o texto ficar legível sobre o mapa.
  const label = (p: [number, number], text: string, key?: string, size = 10, color = labelColor) => {
    const common = {
      x: p[0],
      y: p[1] < 22 ? p[1] + 18 : p[1] - 10,
      fontSize: size,
      fontWeight: '600' as const,
      letterSpacing: 0.4,
      textAnchor: 'middle' as const,
    };
    return (
      <G key={key}>
        <SvgText {...common} fill={halo} stroke={halo} strokeWidth={onMap ? 3 : 2.5} strokeOpacity={0.9} strokeLinejoin="round">
          {text}
        </SvgText>
        <SvgText {...common} fill={color}>
          {text}
        </SvgText>
      </G>
    );
  };

  return (
    <View>
      <View style={[styles.frame, { width, height, backgroundColor: onMap ? '#DDE3EA' : panel }]}>
        {tiles.flatMap((t) =>
          TILE_LAYERS[effective as Exclude<MapStyle, 'clean'>].map((template, layer) => (
            <Image
              key={`${layer}-${t.key}`}
              source={{ uri: tileUrl(template, t.z, t.x, t.y) }}
              style={{ position: 'absolute', left: t.left, top: t.top, width: t.size + 0.5, height: t.size + 0.5 }}
              onError={() => setTilesFailed(true)}
              accessibilityIgnoresInvertColors
            />
          )),
        )}
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={StyleSheet.absoluteFill} accessibilityLabel={s.results.mapA11y}>
          {!onMap ? <Rect x={0} y={0} width={width} height={height} rx={16} fill="transparent" /> : null}
          <Polyline
            points={base}
            fill="none"
            stroke={onMap ? '#FFFFFF' : colors.gridLine}
            strokeOpacity={onMap ? 0.85 : 1}
            strokeWidth={onMap ? 7 : 5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {segs.map((sg) => {
            const a = project(sg.segment.start);
            const b = project(sg.segment.end);
            const st = segmentColor(sg, colors);
            return (
              <Line
                key={sg.segment.index}
                x1={a[0]}
                y1={a[1]}
                x2={b[0]}
                y2={b[1]}
                stroke={st.color}
                strokeOpacity={onMap ? Math.max(0.85, st.opacity) : st.opacity}
                strokeWidth={onMap ? 4 : 3}
                strokeLinecap="round"
                strokeDasharray={st.night ? '1 4' : undefined}
              />
            );
          })}
          {!onMap
            ? landmarks.map((l) => {
                const p = project(l.place.coords);
                return (
                  <G key={l.place.id}>
                    <Circle cx={p[0]} cy={p[1]} r={2.5} fill={colors.textMuted} opacity={0.8} />
                    {label(p, l.place.city, `lm-${l.place.id}`, 9)}
                  </G>
                );
              })
            : null}
          {analysis.flips.map((f, i) => {
            const p = project(f.location);
            return <Circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill={colors.surface} stroke={colors.textSecondary} strokeWidth={1.2} />;
          })}
          <Circle cx={o[0]} cy={o[1]} r={4.5} fill="#FFFFFF" stroke="#3A3A3C" strokeWidth={2} />
          <Circle cx={d[0]} cy={d[1]} r={4.5} fill="#3A3A3C" stroke="#FFFFFF" strokeWidth={1.5} />
          {originLabel ? label(o, originLabel, 'origin', 10, onMap ? '#000000' : colors.textSecondary) : null}
          {destinationLabel ? label(d, destinationLabel, 'destination', 10, onMap ? '#000000' : colors.textSecondary) : null}
          <G>
            <Circle cx={vehicle[0]} cy={vehicle[1]} r={9} fill={colors.tint} opacity={0.25} />
            <Circle cx={vehicle[0]} cy={vehicle[1]} r={5} fill={colors.tint} stroke="#FFFFFF" strokeWidth={2} />
          </G>
          <G transform={`translate(${width - 16}, 16)`} opacity={0.7}>
            <Path d="M0,-7 L3.5,3 L0,1 L-3.5,3 Z" fill={onMap ? '#FFFFFF' : colors.textSecondary} stroke={onMap ? '#00000055' : 'none'} />
          </G>
        </Svg>
        {onMap ? (
          <View style={styles.attribution} pointerEvents="none">
            <Text style={styles.attributionText}>{TILE_ATTRIBUTION[effective as Exclude<MapStyle, 'clean'>]}</Text>
          </View>
        ) : null}
      </View>
      {fellBack ? <Text style={[styles.notice, { color: colors.textMuted }]}>{s.results.mapOffline}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: 16, overflow: 'hidden' },
  attribution: { position: 'absolute', right: 6, bottom: 4, backgroundColor: '#FFFFFFB3', borderRadius: 4, paddingHorizontal: 4 },
  attributionText: { fontSize: 8, color: '#333333' },
  notice: { fontSize: 12, marginTop: 6, textAlign: 'center' },
});
