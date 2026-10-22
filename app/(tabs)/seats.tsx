import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { SeatMapSVG } from '../../src/components/SeatMapSVG';
import { Card, Chip, SectionHeader, SegmentedControl } from '../../src/components/ui';
import { useTrip } from '../../src/context/TripContext';
import { positionLabel, seatReasonText } from '../../src/engine/seatRecommender';
import type { SeatScore } from '../../src/engine/types';
import { useI18n } from '../../src/i18n';
import { haptics } from '../../src/services/deviceServices';
import { goldenColor, heatColor, useAppTheme } from '../../src/theme/colors';
import { MODE_META, MODES, seatDisplayName } from '../../src/utils/format';

export default function SeatsScreen() {
  const { colors, scheme } = useAppTheme();
  const { s, lang } = useI18n();
  const tx = s.seats;
  const { width } = useWindowDimensions();
  const t = useTrip();
  const { trip, seats, seatPrefs, analysis } = t;
  const [selected, setSelected] = useState<SeatScore | null>(null);
  const [colorBy, setColorBy] = useState<'heat' | 'golden'>('heat');
  const contentW = Math.min(width, 720) - 32;
  const mapW = Math.min(contentW - 32, trip.mode === 'car' ? 280 : trip.mode === 'boat' ? 330 : 360);

  const current = selected ? seats.scores.find((sc) => sc.seat.id === selected.seat.id) ?? seats.best : seats.best;
  const mode = trip.mode;
  const goldenActive = seats.optimization === 'golden' && analysis.golden.available;
  const reason = seatReasonText(seats.best, mode, goldenActive, analysis.daylightMinutes === 0, lang);
  const name = (sc: SeatScore) => seatDisplayName(sc.seat, mode, lang);

  return (
    <Screen title={tx.title} subtitle={s.layoutNames[mode]}>
      <SegmentedControl
        options={MODES.map((m) => ({ value: m, label: s.modes[m], icon: MODE_META[m].icon }))}
        value={trip.mode}
        onChange={(m) => {
          setSelected(null);
          t.setMode(m);
        }}
      />

      <LinearGradient colors={['#FFB000', '#FF6A2B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.best}>
        <Ionicons name="star" size={22} color="#FFFFFF" />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.bestKicker}>{tx.bestKicker}</Text>
          <Text style={styles.bestTitle}>
            {name(seats.best)} · {positionLabel(seats.best.seat, mode, lang)}
          </Text>
          <Text style={styles.bestBody}>{reason}</Text>
        </View>
      </LinearGradient>

      <Card>
        <Text style={[styles.filterLabel, { color: colors.textMuted }]}>{tx.preference}</Text>
        <View style={styles.chips}>
          {(['any', 'window', 'aisle'] as const).map((p) => (
            <Chip
              key={p}
              label={p === 'any' ? tx.any : p === 'window' ? tx.window : tx.aisle}
              selected={(seatPrefs.position ?? 'any') === p}
              onPress={() => {
                t.setSeatPrefs({ ...seatPrefs, position: p });
                t.updatePreferences({ seatPosition: p });
              }}
            />
          ))}
        </View>
        <View style={styles.chips}>
          {(['any', 'front', 'middle', 'back'] as const).map((z) => (
            <Chip
              key={z}
              label={z === 'any' ? tx.anyRow : z === 'front' ? tx.front : z === 'middle' ? tx.middle : tx.back}
              selected={(seatPrefs.zone ?? 'any') === z}
              onPress={() => {
                t.setSeatPrefs({ ...seatPrefs, zone: z });
                t.updatePreferences({ seatZone: z });
              }}
            />
          ))}
        </View>
        <SegmentedControl
          options={[
            { value: 'heat', label: tx.colorHeat, icon: 'thermometer' },
            { value: 'golden', label: tx.colorGolden, icon: 'partly-sunny' },
          ]}
          value={colorBy}
          onChange={setColorBy}
        />
      </Card>

      <Card>
        <View style={{ alignItems: 'center' }}>
          <SeatMapSVG
            recommendation={seats}
            width={mapW}
            selectedId={current.seat.id}
            goldenView={colorBy === 'golden'}
            onSelect={(sc) => {
              haptics.selection();
              setSelected(sc);
            }}
          />
        </View>
        <View style={styles.legendRow}>
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{colorBy === 'heat' ? tx.legendShade : tx.legendNoView}</Text>
          <View style={styles.ramp}>
            {Array.from({ length: 10 }, (_, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: (colorBy === 'heat' ? heatColor : goldenColor)(i * 11, scheme) }} />
            ))}
          </View>
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{colorBy === 'heat' ? tx.legendHot : tx.legendGolden}</Text>
        </View>
        <Text style={[styles.note, { color: colors.textMuted }]}>{tx.mapNote}</Text>
      </Card>

      <SectionHeader
        title={`${s.seatWord[mode][0].toUpperCase()}${s.seatWord[mode].slice(1)} ${name(current)}`}
        subtitle={positionLabel(current.seat, mode, lang)}
      />
      <Card>
        <Meter label={tx.timeInShade} value={current.shadePct} suffix="%" color={colors.shade} />
        <Meter label={tx.thermalComfort} value={current.thermalComfort} suffix="/100" color={colors.success} />
        <Meter label={tx.heat} value={current.heat} suffix="/100" color={colors.sunLeft} />
        <Meter label={tx.sunsetView} value={current.goldenView} suffix="/100" color={colors.gold} />
        <View style={[styles.uvRow, { borderTopColor: colors.separator }]}>
          <Ionicons name="shield-half" size={18} color={colors.textSecondary} />
          <Text style={[styles.uvText, { color: colors.text }]}>
            {tx.uvAtWindow} <Text style={{ fontWeight: '700' }}>{s.uvLevels[current.uvLevel]}</Text>
            {current.uvBehindGlass > 0 ? tx.behindGlass(current.uvBehindGlass.toFixed(1)) : ''}
          </Text>
        </View>
        {!current.seat.selectable ? <Text style={[styles.note, { color: colors.textMuted }]}>{tx.driverNote}</Text> : null}
        {current.seat.overWing ? <Text style={[styles.note, { color: colors.textMuted }]}>{tx.overWingNote}</Text> : null}
      </Card>

      <SectionHeader title={tx.top5} subtitle={analysis.input.optimization === 'golden' ? tx.rankGolden : tx.rankShade} />
      <Card>
        {seats.ranking.map((sc, i) => (
          <View key={sc.seat.id} style={[styles.rankRow, { borderBottomColor: colors.separator }]}>
            <Text style={[styles.rankPos, { color: colors.textMuted }]}>{i + 1}</Text>
            <View style={[styles.rankSwatch, { backgroundColor: heatColor(sc.heat, scheme) }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rankTitle, { color: colors.text }]}>
                {name(sc)} · {positionLabel(sc.seat, mode, lang)}
              </Text>
              <Text style={[styles.rankSub, { color: colors.textSecondary }]}>{tx.rankRow(sc.shadePct, sc.thermalComfort, sc.goldenView)}</Text>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

function Meter({ label, value, suffix, color }: { label: string; value: number; suffix: string; color: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.meter} accessibilityLabel={`${label}: ${value}${suffix}`}>
      <View style={styles.meterHead}>
        <Text style={[styles.meterLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.meterValue, { color: colors.text }]}>
          {value}
          {suffix}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.chipBackground }]}>
        <View style={[styles.fill, { width: `${Math.max(2, Math.min(100, value))}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  best: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 16, marginVertical: 14 },
  bestKicker: { color: '#FFFFFFD9', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  bestTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginTop: 2 },
  bestBody: { color: '#FFFFFFEE', fontSize: 13, marginTop: 4, lineHeight: 18 },
  filterLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  legendText: { fontSize: 12, fontWeight: '600' },
  ramp: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden', flexDirection: 'row', marginHorizontal: 8 },
  note: { fontSize: 12, marginTop: 8 },
  meter: { marginBottom: 12 },
  meterHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  meterLabel: { fontSize: 14, fontWeight: '500' },
  meterValue: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  uvRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  uvText: { fontSize: 14, marginLeft: 8, flex: 1 },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  rankPos: { width: 22, fontSize: 15, fontWeight: '700' },
  rankSwatch: { width: 14, height: 14, borderRadius: 4, marginRight: 10 },
  rankTitle: { fontSize: 15, fontWeight: '600' },
  rankSub: { fontSize: 12, marginTop: 2 },
});
