/**
 * Bússola solar 360° com o veículo visto de cima (proa para cima): arco de elevação,
 * posição do Sol, raios atingindo o lado exposto e escudo de sombra do lado oposto.
 */
import Svg, { Circle, Defs, G, Line, Path, Polygon, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { cosD, normalizeSigned, sinD } from '../engine/math';
import type { TransportMode } from '../engine/types';
import { useI18n } from '../i18n';
import { useAppTheme } from '../theme/colors';

export interface SolarCompassProps {
  heading: number;
  sunAzimuth: number;
  sunElevation: number;
  isUp: boolean;
  mode: TransportMode;
  size?: number;
}

const CARDINAL_BEARINGS = [0, 90, 180, 270];

/** Silhueta do veículo (apontando para cima) centrada na origem, ~ 40x80 unidades. */
function vehiclePath(mode: TransportMode): string {
  switch (mode) {
    case 'plane':
      return 'M0,-44 C6,-44 7,-34 7,-24 L7,-6 L40,10 L40,17 L7,9 L6,30 L16,38 L16,43 L0,40 L-16,43 L-16,38 L-6,30 L-7,9 L-40,17 L-40,10 L-7,-6 L-7,-24 C-7,-34 -6,-44 0,-44 Z';
    case 'boat':
      return 'M0,-46 C14,-30 20,-14 20,6 L20,36 C20,41 16,44 11,44 L-11,44 C-16,44 -20,41 -20,36 L-20,6 C-20,-14 -14,-30 0,-46 Z';
    case 'car':
      return 'M-17,-34 C-17,-41 -11,-44 0,-44 C11,-44 17,-41 17,-34 L19,30 C19,39 13,42 0,42 C-13,42 -19,39 -19,30 Z';
    case 'train':
      return 'M-15,-38 C-15,-46 -8,-48 0,-48 C8,-48 15,-46 15,-38 L15,46 L-15,46 Z';
    default:
      return 'M-17,-40 C-17,-45 -14,-46 -10,-46 L10,-46 C14,-46 17,-45 17,-40 L17,44 L-17,44 Z';
  }
}

export function SolarCompassSVG({ heading, sunAzimuth, sunElevation, isUp, mode, size = 280 }: SolarCompassProps) {
  const { colors, scheme } = useAppTheme();
  const { s: i18n, lang } = useI18n();
  const c = size / 2;
  const R = c - 18;
  const rel = normalizeSigned(sunAzimuth - heading);
  const elev = Math.max(0, Math.min(90, sunElevation));
  const rSun = isUp ? R * (1 - elev / 90) * 0.9 + R * 0.08 : R + 2;
  const sx = c + rSun * sinD(rel);
  const sy = c - rSun * cosD(rel);
  const sideColor = rel > 0 ? colors.sunRight : colors.sunLeft;
  const exposed = isUp && Math.abs(rel) > 25 && Math.abs(rel) < 155;
  const scale = size / 280;

  // Escudo de sombra: cunha que parte do veículo para longe do Sol.
  const shadeDir = rel + 180;
  const shadeLen = R * 0.85 * (isUp ? Math.min(1, 0.35 + (90 - elev) / 90) : 0);
  const half = 28;
  const p1 = [c + 18 * scale * sinD(shadeDir - 90), c - 18 * scale * cosD(shadeDir - 90)];
  const p2 = [c + 18 * scale * sinD(shadeDir + 90), c - 18 * scale * cosD(shadeDir + 90)];
  const p3 = [c + shadeLen * sinD(shadeDir + half), c - shadeLen * cosD(shadeDir + half)];
  const p4 = [c + shadeLen * sinD(shadeDir - half), c - shadeLen * cosD(shadeDir - half)];

  const rays = isUp
    ? [-14, 0, 14].map((off) => {
        const ox = off * scale * cosD(rel);
        const oy = off * scale * sinD(rel);
        const startR = rSun - 14 * scale;
        const endR = 36 * scale;
        return {
          x1: c + startR * sinD(rel) + ox,
          y1: c - startR * cosD(rel) + oy,
          x2: c + endR * sinD(rel) + ox,
          y2: c - endR * cosD(rel) + oy,
        };
      })
    : [];

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityLabel={lang === 'en' ? 'Solar compass' : 'Bússola solar'}>
      <Defs>
        <RadialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFE58A" stopOpacity="1" />
          <Stop offset="60%" stopColor="#FFB300" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#FF8A00" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="dial" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={scheme === 'dark' ? '#1E2236' : '#FFFFFF'} />
          <Stop offset="100%" stopColor={scheme === 'dark' ? '#111320' : '#F1F3FA'} />
        </RadialGradient>
      </Defs>

      <Circle cx={c} cy={c} r={R} fill="url(#dial)" stroke={colors.separator} strokeWidth={1} />
      {[30, 60].map((e) => (
        <Circle key={e} cx={c} cy={c} r={R * (1 - e / 90) * 0.9 + R * 0.08} fill="none" stroke={colors.gridLine} strokeDasharray="3 5" />
      ))}

      {/* marcações a cada 30°, girando com o rumo (heading-up) */}
      {Array.from({ length: 12 }, (_, i) => i * 30).map((b) => {
        const a = b - heading;
        return (
          <Line
            key={b}
            x1={c + (R - 2) * sinD(a)}
            y1={c - (R - 2) * cosD(a)}
            x2={c + (R - (b % 90 === 0 ? 12 : 7)) * sinD(a)}
            y2={c - (R - (b % 90 === 0 ? 12 : 7)) * cosD(a)}
            stroke={colors.textMuted}
            strokeWidth={b % 90 === 0 ? 2 : 1}
          />
        );
      })}
      {CARDINAL_BEARINGS.map((b, ci) => {
        const label = i18n.cardinals[ci];
        const a = b - heading;
        return (
          <SvgText
            key={label}
            x={c + (R + 10) * sinD(a)}
            y={c - (R + 10) * cosD(a) + 4}
            fontSize={12 * Math.max(0.85, scale)}
            fontWeight="700"
            fill={label === 'N' ? colors.danger : colors.textSecondary}
            textAnchor="middle"
          >
            {label}
          </SvgText>
        );
      })}

      {/* sombra projetada */}
      {isUp && shadeLen > 0 ? (
        <Polygon points={[p1, p2, p3, p4].map((p) => p.join(',')).join(' ')} fill={colors.shade} opacity={0.18} />
      ) : null}

      {/* raios solares */}
      {rays.map((r, i) => (
        <Line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="#FFB300" strokeWidth={2} strokeLinecap="round" strokeDasharray="6 5" opacity={0.85} />
      ))}

      {/* veículo */}
      <G transform={`translate(${c}, ${c}) scale(${0.62 * scale})`}>
        <Path d={vehiclePath(mode)} fill={scheme === 'dark' ? '#3A3A3C' : '#FFFFFF'} stroke={colors.text} strokeWidth={2.5} />
        {exposed ? (
          <Line
            x1={rel > 0 ? 19 : -19}
            y1={-28}
            x2={rel > 0 ? 19 : -19}
            y2={28}
            stroke={sideColor}
            strokeWidth={7}
            strokeLinecap="round"
          />
        ) : null}
        <Path d="M0,-70 L9,-56 L-9,-56 Z" fill={colors.tint} />
      </G>

      {/* Sol (ou Sol abaixo do horizonte) */}
      {isUp ? (
        <G>
          <Circle cx={sx} cy={sy} r={22 * scale} fill="url(#sunGlow)" />
          <Circle cx={sx} cy={sy} r={10 * scale} fill="#FFC21A" stroke="#FF9500" strokeWidth={2} />
        </G>
      ) : (
        <G opacity={0.6}>
          <Circle cx={sx} cy={sy} r={9 * scale} fill={colors.night} />
          <Circle cx={sx + 4 * scale} cy={sy - 3 * scale} r={8 * scale} fill={scheme === 'dark' ? '#111320' : '#F1F3FA'} />
        </G>
      )}
    </Svg>
  );
}
