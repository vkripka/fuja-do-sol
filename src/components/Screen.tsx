/** Contêiner de tela com título grande iOS, fundo com gradiente do céu e rolagem. */
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { skyGradient, useAppTheme } from '../theme/colors';

export function Screen({
  title,
  subtitle,
  children,
  skyHour,
  right,
  leading,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Hora local usada para tingir o topo com a cor do céu. */
  skyHour?: number;
  right?: ReactNode;
  /** Elemento à esquerda do título (ex.: logo). */
  leading?: ReactNode;
}) {
  const { colors, scheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const sky = skyGradient(skyHour ?? 12, scheme);
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[`${sky[0]}${scheme === 'dark' ? '55' : '66'}`, `${sky[1]}00`]}
        style={[StyleSheet.absoluteFill, { height: 320 }]}
        pointerEvents="none"
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          {leading ? <View style={styles.leading}>{leading}</View> : null}
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 },
  leading: { marginRight: 12, marginBottom: 6, alignSelf: 'flex-start', marginTop: 2 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, marginTop: 4 },
});
