/** Tela de abertura animada (~1,8 s): logo, título e subtítulo entram e o app é revelado. */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text } from 'react-native';
import { useI18n } from '../i18n';
import { useAppTheme } from '../theme/colors';
import { AppLogoSVG } from './AppLogoSVG';

const useNativeDriver = Platform.OS !== 'web';

export function LaunchSplash({ onDone }: { onDone: () => void }) {
  const { scheme } = useAppTheme();
  const { s } = useI18n();
  const fade = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textShift = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 70, useNativeDriver }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 300, useNativeDriver }),
        Animated.timing(textOpacity, { toValue: 1, duration: 420, delay: 220, useNativeDriver }),
        Animated.timing(textShift, { toValue: 0, duration: 420, delay: 220, easing: Easing.out(Easing.cubic), useNativeDriver }),
      ]),
      Animated.delay(650),
      Animated.timing(fade, { toValue: 0, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver }),
    ]);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onDone();
    };
    anim.start(({ finished }) => {
      if (finished) finish();
    });
    // Segurança: animações param com o app em segundo plano (requestAnimationFrame);
    // a abertura nunca deve prender o usuário.
    const timer = setTimeout(finish, 2400);
    return () => {
      clearTimeout(timer);
      anim.stop();
    };
  }, [fade, logoOpacity, logoScale, onDone, textOpacity, textShift]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]} pointerEvents="none" accessibilityElementsHidden>
      <LinearGradient
        colors={scheme === 'dark' ? ['#0B1026', '#1B1F4A'] : ['#FFF6E8', '#FFE1B8']}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
        <AppLogoSVG size={128} />
      </Animated.View>
      <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textShift }], alignItems: 'center' }}>
        <Text style={[styles.title, { color: scheme === 'dark' ? '#FFFFFF' : '#2B1D0E' }]}>{s.appName}</Text>
        <Text style={[styles.subtitle, { color: scheme === 'dark' ? '#C3C2D8' : '#7A5A35' }]}>{s.splashSubtitle}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.8, marginTop: 22 },
  subtitle: { fontSize: 16, fontWeight: '500', marginTop: 6 },
});
