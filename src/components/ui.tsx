/** Kit de UI no estilo iOS 18: cartões de vidro, chips, controles segmentados e botões. */
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { haptics } from '../services/deviceServices';
import { useAppTheme } from '../theme/colors';
import type { IconName } from '../utils/format';

export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const { colors, scheme } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: scheme === 'dark' ? colors.separator : 'transparent',
          shadowOpacity: scheme === 'dark' ? 0 : 0.06,
        },
        padded && styles.cardPadded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  accessibilityLabel,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  accessibilityLabel?: string;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? colors.tint : colors.chipBackground, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={selected ? '#1A1000' : colors.textSecondary} style={{ marginRight: 5 }} /> : null}
      <Text style={[styles.chipText, { color: selected ? '#1A1000' : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors, scheme } = useAppTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.chipBackground }]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              haptics.selection();
              onChange(o.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
            style={[
              styles.segment,
              active && { backgroundColor: scheme === 'dark' ? colors.surfaceElevated : '#FFFFFF', ...styles.segmentActive },
            ]}
          >
            {o.icon ? <Ionicons name={o.icon} size={18} color={active ? colors.tint : colors.textSecondary} /> : null}
            <Text numberOfLines={1} style={[styles.segmentText, { color: active ? colors.text : colors.textSecondary }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  variant = 'filled',
  disabled,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'filled' | 'tinted' | 'plain';
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  const bg = variant === 'filled' ? colors.tint : variant === 'tinted' ? `${colors.tint}22` : 'transparent';
  const fg = variant === 'filled' ? '#1A1000' : colors.tintText;
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        haptics.impact();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 }]}
    >
      {icon ? <Ionicons name={icon} size={18} color={fg} style={{ marginRight: 8 }} /> : null}
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function StatTile({ label, value, tone, caption }: { label: string; value: string; tone?: string; caption?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.chipBackground }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {tone ? <View style={[styles.dot, { backgroundColor: tone }]} /> : null}
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      {caption ? <Text style={[styles.statCaption, { color: colors.textMuted }]}>{caption}</Text> : null}
    </View>
  );
}

export function LegendItem({ color, label }: { color: string; label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function InfoRow({ icon, title, body, tone }: { icon: IconName; title: string; body: string; tone?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: `${tone ?? colors.tint}22` }]}>
        <Ionicons name={icon} size={18} color={tone ?? colors.tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.infoBody, { color: colors.textSecondary }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    marginBottom: 14,
  },
  cardPadded: { padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10, marginTop: 6 },
  sectionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  sectionSubtitle: { fontSize: 14, marginTop: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    minHeight: 34,
    borderRadius: 17,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  segmented: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 9, minHeight: 44 },
  segmentActive: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: 18,
  },
  buttonText: { fontSize: 17, fontWeight: '600' },
  stat: { flex: 1, borderRadius: 14, padding: 12, marginHorizontal: 4 },
  statLabel: { fontSize: 12, fontWeight: '600' },
  statValue: { fontSize: 22, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] },
  statCaption: { fontSize: 11, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 14, marginBottom: 4 },
  legendSwatch: { width: 10, height: 10, borderRadius: 3, marginRight: 6 },
  legendText: { fontSize: 12, fontWeight: '500' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  infoIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoTitle: { fontSize: 15, fontWeight: '600' },
  infoBody: { fontSize: 14, lineHeight: 19, marginTop: 2 },
});
