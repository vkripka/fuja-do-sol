import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { DepartureTimesChart } from '../../src/components/DepartureTimesChart';
import { Screen } from '../../src/components/Screen';
import { Card, PrimaryButton, SectionHeader } from '../../src/components/ui';
import { useTrip } from '../../src/context/TripContext';
import { optimizeDepartureTime } from '../../src/engine/timeOptimizer';
import type { TimeSlotSimulation } from '../../src/engine/types';
import { useI18n } from '../../src/i18n';
import { haptics } from '../../src/services/deviceServices';
import { useAppTheme } from '../../src/theme/colors';
import { formatDuration, formatTime } from '../../src/utils/format';

export default function OptimizerScreen() {
  const { colors } = useAppTheme();
  const { s } = useI18n();
  const tx = s.optimizer;
  const { width } = useWindowDimensions();
  const t = useTrip();
  const { trip, analysis } = t;
  const [picked, setPicked] = useState<TimeSlotSimulation | null>(null);
  const [showTable, setShowTable] = useState(false);
  const innerW = Math.min(width, 720) - 64;

  const result = useMemo(() => optimizeDepartureTime(analysis.input, { slots: 24, timeZone: trip.origin.tz }), [analysis.input, trip.origin.tz]);
  const shadeChamp = result.bestDaytimeShade ?? result.bestShade;
  const goldenChamp = result.bestGolden;

  const apply = (slot: TimeSlotSimulation, optimization?: 'shade' | 'golden') => {
    haptics.success();
    t.setTime(formatTime(slot.hour, slot.minute));
    if (optimization) t.setOptimization(optimization);
  };

  return (
    <Screen title={tx.title} subtitle={tx.subtitle(trip.origin.city, trip.destination.city, formatDuration(trip.durationMinutes))}>
      <Champion
        icon="umbrella"
        tone={colors.shade}
        kicker={tx.shadeKicker}
        title={tx.departAt(formatTime(shadeChamp.hour, shadeChamp.minute))}
        body={
          shadeChamp.shadeSide === 'either'
            ? tx.champEither(shadeChamp.comfortScore)
            : tx.champSide(s.sideName(shadeChamp.shadeSide, trip.mode), shadeChamp.comfortScore, shadeChamp.sunlitMinutes)
        }
        applyLabel={tx.applyThis}
        onApply={() => apply(shadeChamp, 'shade')}
      />
      {result.bestShade.nightFraction > 0.5 && result.bestDaytimeShade ? (
        <Text style={[styles.note, { color: colors.textSecondary }]}>{tx.nightTip(formatTime(result.bestShade.hour, 0))}</Text>
      ) : null}
      {goldenChamp ? (
        <Champion
          icon="partly-sunny"
          tone={colors.gold}
          kicker={tx.goldenKicker}
          title={tx.departAt(formatTime(goldenChamp.hour, goldenChamp.minute))}
          body={tx.goldenBody(goldenChamp.goldenScore, goldenChamp.goldenSide ? s.sideName(goldenChamp.goldenSide, trip.mode) : null)}
          applyLabel={tx.applyThis}
          onApply={() => apply(goldenChamp, 'golden')}
        />
      ) : (
        <Card>
          <Text style={{ color: colors.textSecondary }}>{tx.noGolden}</Text>
        </Card>
      )}

      <SectionHeader title={tx.allTimes} subtitle={tx.allTimesSubtitle} />
      <Card>
        <DepartureTimesChart result={result} width={innerW} selectedHour={Number(trip.time.slice(0, 2))} onSelect={setPicked} />
        {picked ? (
          <View style={{ marginTop: 12 }}>
            <PrimaryButton label={tx.applyAt(formatTime(picked.hour, picked.minute))} icon="checkmark-circle" onPress={() => apply(picked)} />
          </View>
        ) : null}
      </Card>

      <Pressable onPress={() => setShowTable((v) => !v)} accessibilityRole="button" style={styles.tableToggle}>
        <Text style={{ color: colors.tintText, fontWeight: '600', fontSize: 15 }}>{showTable ? tx.hideTable : tx.showTable}</Text>
        <Ionicons name={showTable ? 'chevron-up' : 'chevron-down'} size={16} color={colors.tintText} />
      </Pressable>
      {showTable ? (
        <Card padded={false}>
          <View style={[styles.tr, { borderBottomColor: colors.separator }]}>
            {tx.tableHeaders.map((h) => (
              <Text key={h} style={[styles.th, { color: colors.textMuted }]}>
                {h}
              </Text>
            ))}
          </View>
          {result.slots.map((slot) => (
            <Pressable key={slot.hour} onPress={() => apply(slot)} style={[styles.tr, { borderBottomColor: colors.separator }]} accessibilityRole="button">
              <Text style={[styles.td, { color: colors.text, fontWeight: '700' }]}>{formatTime(slot.hour, slot.minute)}</Text>
              <Text style={[styles.td, { color: colors.text }]}>{slot.comfortScore}</Text>
              <Text style={[styles.td, { color: colors.text }]}>{slot.heatScore}</Text>
              <Text style={[styles.td, { color: colors.text }]}>{slot.goldenScore}</Text>
              <Text style={[styles.td, { color: colors.textSecondary }]}>
                {slot.nightFraction > 0.99 ? tx.cellNight : slot.shadeSide === 'either' ? '—' : slot.shadeSide === 'left' ? tx.cellLeft : tx.cellRight}
              </Text>
            </Pressable>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

function Champion({
  icon,
  tone,
  kicker,
  title,
  body,
  applyLabel,
  onApply,
}: {
  icon: 'umbrella' | 'partly-sunny';
  tone: string;
  kicker: string;
  title: string;
  body: string;
  applyLabel: string;
  onApply: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.champIcon, { backgroundColor: `${tone}22` }]}>
          <Ionicons name={icon} size={22} color={tone} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: colors.textMuted }]}>{kicker}</Text>
          <Text style={[styles.champTitle, { color: colors.text }]}>{title}</Text>
        </View>
      </View>
      <Text style={[styles.champBody, { color: colors.textSecondary }]}>{body}</Text>
      <PrimaryButton label={applyLabel} variant="tinted" icon="time" onPress={onApply} />
    </Card>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 13, marginBottom: 14, marginTop: -4, lineHeight: 18 },
  champIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  champTitle: { fontSize: 24, fontWeight: '800', marginTop: 2 },
  champBody: { fontSize: 14, lineHeight: 19, marginVertical: 12 },
  tableToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  tr: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  th: { flex: 1, fontSize: 11, fontWeight: '700' },
  td: { flex: 1, fontSize: 14, fontVariant: ['tabular-nums'] },
});
