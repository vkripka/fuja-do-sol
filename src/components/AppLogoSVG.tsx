/**
 * Emblema oficial do app: squircle iOS com céu solar, sol radiante e uma faixa de
 * sombra índigo protegendo um veículo (visto de cima) dentro de um escudo.
 */
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

const RAYS = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2 + Math.PI / 8);

export function AppLogoSVG({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityRole="image" accessibilityLabel="Fuja do Sol!">
      <Defs>
        <LinearGradient id="logoSky" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFD66B" />
          <Stop offset="0.55" stopColor="#FF9500" />
          <Stop offset="1" stopColor="#FF5E62" />
        </LinearGradient>
        <LinearGradient id="logoShade" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#5A5FE0" />
          <Stop offset="1" stopColor="#1B1F5E" />
        </LinearGradient>
        <RadialGradient id="logoGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFF6CC" stopOpacity="0.95" />
          <Stop offset="1" stopColor="#FFF6CC" stopOpacity="0" />
        </RadialGradient>
        <ClipPath id="logoClip">
          <Rect x="0" y="0" width="100" height="100" rx="23" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#logoClip)">
        <Rect x="0" y="0" width="100" height="100" fill="url(#logoSky)" />
        {/* faixa de sombra diagonal */}
        <Path d="M60 0 L100 0 L100 100 L28 100 Z" fill="url(#logoShade)" />
        {/* sol radiante */}
        <Circle cx="31" cy="33" r="22" fill="url(#logoGlow)" />
        {RAYS.map((a) => (
          <Line
            key={a}
            x1={31 + Math.cos(a) * 17}
            y1={33 + Math.sin(a) * 17}
            x2={31 + Math.cos(a) * 23}
            y2={33 + Math.sin(a) * 23}
            stroke="#FFF3C4"
            strokeWidth={3.6}
            strokeLinecap="round"
          />
        ))}
        <Circle cx="31" cy="33" r="12.5" fill="#FFF3C4" />
        <Circle cx="27.5" cy="29.5" r="4.5" fill="#FFFFFF" opacity={0.7} />
        {/* raios atingindo o escudo */}
        <Line x1="44" y1="46" x2="53" y2="53" stroke="#FFF3C4" strokeWidth={2.4} strokeLinecap="round" strokeDasharray="3 3" />
        {/* escudo de sombra */}
        <Path
          d="M67 39 L84 45.5 V60 C84 70.5 76.5 77.5 67 81.5 C57.5 77.5 50 70.5 50 60 V45.5 Z"
          fill="#FFFFFF"
          fillOpacity={0.14}
          stroke="#FFFFFF"
          strokeOpacity={0.55}
          strokeWidth={2}
        />
        {/* veículo visto de cima */}
        <Rect x="60.5" y="48" width="13" height="25" rx="4" fill="#FFFFFF" />
        <Rect x="62.3" y="50.2" width="9.4" height="4.6" rx="1.6" fill="#1B1F5E" opacity={0.55} />
        <Rect x="62.3" y="57.5" width="9.4" height="12" rx="1.6" fill="#1B1F5E" opacity={0.18} />
      </G>
    </Svg>
  );
}
