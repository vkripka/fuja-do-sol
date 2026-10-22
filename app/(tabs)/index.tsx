import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppLogoSVG } from '../../src/components/AppLogoSVG';
import { PlaceSearchField } from '../../src/components/PlaceSearchField';
import { Screen } from '../../src/components/Screen';
import { Card, Chip, SectionHeader, SegmentedControl } from '../../src/components/ui';
import { useTrip } from '../../src/context/TripContext';
import { PRESET_TRIPS } from '../../src/data/presetTrips';
import { localizeVerdict } from '../../src/engine/verdict';
import { dateParts, useI18n } from '../../src/i18n';
import { haptics } from '../../src/services/deviceServices';
import { addToHistory } from '../../src/services/storageService';
import { skyGradient, useAppTheme } from '../../src/theme/colors';
import {
  addDays,
  formatDuration,
  formatKm,
  formatTime,
  minutesBetween,
  MODE_META,
  MODES,
  nowRounded,
  parseTime,
  seatDisplayName,
} from '../../src/utils/format';

const MORNING = '08:00';
const AFTERNOON = '15:00';

export default function SimulateScreen() {
  const { colors, scheme } = useAppTheme();
  const { s, lang } = useI18n();
  const tx = s.simulate;
  const t = useTrip();
  const { trip, analysis, seats, route, routeLoading } = t;
  const tz = trip.origin.tz;
  const now = nowRounded(tz);
  const today = now.date;
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const { hour, minute } = parseTime(trip.time);
  const isNow = trip.date === today && minutesBetween(trip.time, now.time) <= 5;
  const verdict = localizeVerdict(analysis, lang);

  const shiftTime = (deltaMin: number) => {
    const total = (((hour * 60 + minute + deltaMin) % 1440) + 1440) % 1440;
    t.setTime(formatTime(Math.floor(total / 60), total % 60));
  };

  const setNow = () => {
    t.setDate(today);
    t.setTime(now.time);
  };

  const tomorrowMorning = () => {
    haptics.impact();
    t.setDate(addDays(today, 1));
    t.setTime(MORNING);
  };

  const openResults = () => {
    void addToHistory(t.toSavedTrip());
    router.push('/results');
  };

  const sky = skyGradient(hour + minute / 60, scheme);
  const side = analysis.recommendedSide;
  const shade = side === 'left' ? analysis.shadePct.left : side === 'right' ? analysis.shadePct.right : null;
  const routeText = routeLoading
    ? tx.routeTracing
    : `${formatKm(analysis.totalDistanceKm)} · ${
        route?.source === 'osrm'
          ? tx.routeOsrm
          : route?.source === 'waypoints'
            ? tx.routePreset
            : trip.mode === 'plane'
              ? tx.routeFlight
              : tx.routeOffline
      }`;

  return (
    <Screen title={s.appName} subtitle={s.appTagline} skyHour={hour + minute / 60} leading={<AppLogoSVG size={40} />}>
      <SegmentedControl
        options={MODES.map((m) => ({ value: m, label: s.modes[m], icon: MODE_META[m].icon }))}
        value={trip.mode}
        onChange={t.setMode}
      />

      <Card style={{ marginTop: 14 }}>
        <PlaceSearchField label={s.search.origin} value={trip.origin} onSelect={t.setOrigin} allowCurrentLocation online={t.preferences.useOnlineServices} />
        <View style={styles.swapRow}>
          <View style={[styles.hair, { backgroundColor: colors.separator }]} />
          <Pressable
            onPress={() => {
              haptics.impact();
              t.swap();
            }}
            accessibilityRole="button"
            accessibilityLabel={tx.swapA11y}
            style={[styles.swap, { backgroundColor: colors.chipBackground }]}
          >
            <Ionicons name="swap-vertical" size={20} color={colors.tint} />
          </Pressable>
        </View>
        <PlaceSearchField label={s.search.destination} value={trip.destination} onSelect={t.setDestination} online={t.preferences.useOnlineServices} />
        <Text style={[styles.routeInfo, { color: colors.textSecondary }]}>{routeText}</Text>
      </Card>

      <SectionHeader title={tx.presetsTitle} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel} contentContainerStyle={{ paddingRight: 16 }}>
        {PRESET_TRIPS.map((p) => {
          const active = trip.presetId === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => {
                haptics.selection();
                t.applyPreset(p);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${p.title}: ${p.subtitle}`}
              style={({ pressed }) => [
                styles.preset,
                { backgroundColor: colors.surface, borderColor: active ? colors.tint : colors.separator, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={[styles.presetIcon, { backgroundColor: `${colors.tint}22` }]}>
                <Ionicons name={MODE_META[p.mode].icon} size={18} color={colors.tintText} />
              </View>
              <Text style={[styles.presetTitle, { color: colors.text }]} numberOfLines={1}>
                {p.title}
              </Text>
              <Text style={[styles.presetSub, { color: colors.textSecondary }]} numberOfLines={1}>
                {p.subtitle}
              </Text>
              <Text style={[styles.presetMeta, { color: colors.textMuted }]}>
                {p.time} · {formatDuration(p.durationMinutes)} · {p.optimization === 'golden' ? tx.goalGolden : tx.goalShade}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionHeader title={tx.whenTitle} subtitle={tx.localTimeOf(trip.origin.city)} />
      <Card>
        <View style={styles.days}>
          {days.map((d) => {
            const l = dateParts(d, lang);
            const sel = d === trip.date;
            return (
              <Pressable
                key={d}
                onPress={() => {
                  haptics.selection();
                  t.setDate(d);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={`${l.weekday} ${l.day} ${l.month}`}
                style={[styles.day, { backgroundColor: sel ? colors.tint : colors.chipBackground }]}
              >
                <Text style={[styles.dayWeek, { color: sel ? '#1A1000' : colors.textSecondary }]}>{d === today ? tx.today : l.weekday}</Text>
                <Text style={[styles.dayNum, { color: sel ? '#1A1000' : colors.text }]}>{l.day}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.timeRow}>
          <Stepper label="−30m" a11y={tx.stepA11y('−30m')} onPress={() => shiftTime(-30)} />
          <Text style={[styles.time, { color: colors.text }]} accessibilityLabel={tx.departureA11y(trip.time)}>
            {trip.time}
          </Text>
          <Stepper label="+30m" a11y={tx.stepA11y('+30m')} onPress={() => shiftTime(30)} />
        </View>
        <View style={styles.chips}>
          <Chip label={tx.now} icon="flash" selected={isNow} onPress={setNow} />
          <Chip label={`${tx.morning} ${MORNING}`} selected={!isNow && trip.time === MORNING} onPress={() => t.setTime(MORNING)} />
          <Chip label={`${tx.afternoon} ${AFTERNOON}`} selected={!isNow && trip.time === AFTERNOON} onPress={() => t.setTime(AFTERNOON)} />
        </View>

        <View style={[styles.durationRow, { borderTopColor: colors.separator }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textMuted }]}>{tx.duration}</Text>
            <Text style={[styles.duration, { color: colors.text }]}>{formatDuration(trip.durationMinutes)}</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {trip.durationAuto ? (routeLoading ? tx.durationRefining : tx.durationAuto) : tx.durationSuggested(formatDuration(t.suggestedDuration))}
            </Text>
          </View>
          <Stepper label="−15" a11y={tx.stepA11y('−15')} onPress={() => t.setDuration(trip.durationMinutes - 15)} />
          <Stepper label="+15" a11y={tx.stepA11y('+15')} onPress={() => t.setDuration(trip.durationMinutes + 15)} />
        </View>
        {!trip.durationAuto ? (
          <View style={styles.chips}>
            <Chip label={tx.useSuggested} icon="refresh" onPress={t.resetDurationAuto} />
          </View>
        ) : null}
      </Card>

      <SectionHeader title={tx.goalTitle} />
      <SegmentedControl
        options={[
          { value: 'shade', label: tx.modeShade, icon: 'umbrella' },
          { value: 'golden', label: tx.modeGolden, icon: 'partly-sunny' },
        ]}
        value={trip.optimization}
        onChange={t.setOptimization}
      />

      {/* O card inteiro abre o Raio-X; o botão noturno fica fora da área tocável (sem botões aninhados). */}
      <LinearGradient colors={sky} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.verdict}>
        <Pressable
          onPress={openResults}
          accessibilityRole="button"
          accessibilityLabel={tx.openXrayA11y(verdict.verdict)}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <View style={styles.verdictHead}>
            <Text style={styles.verdictKicker}>{tx.verdictKicker}</Text>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFFCC" />
          </View>
          <Text style={styles.verdictTitle}>{verdict.verdict}</Text>
          <Text style={styles.verdictBody}>{verdict.verdictDetail}</Text>
          {analysis.daylightMinutes > 0 ? (
            <View style={styles.verdictStats}>
              <VerdictStat label={tx.bestSeat} value={seatDisplayName(seats.best.seat, trip.mode, lang)} />
              <VerdictStat label={tx.inShade} value={shade !== null ? `${shade}%` : '—'} />
              <VerdictStat label={tx.flips} value={String(analysis.flips.length)} />
            </View>
          ) : null}
          {trip.mode === 'bus' && side !== 'either' ? <Text style={styles.verdictHint}>{tx.busHint(s.busSeatHint(side))}</Text> : null}
        </Pressable>
        {analysis.daylightMinutes === 0 ? (
          <Pressable onPress={tomorrowMorning} accessibilityRole="button" accessibilityLabel={tx.nightTomorrow} style={styles.nightButton}>
            <Ionicons name="sunny" size={16} color="#1A1000" />
            <Text style={styles.nightButtonText}>{tx.nightTomorrow}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={openResults} accessibilityRole="button" accessibilityLabel={tx.openXrayFooter} style={styles.verdictFooter}>
          <Text style={styles.verdictFooterText}>{tx.openXrayFooter}</Text>
        </Pressable>
      </LinearGradient>
    </Screen>
  );
}

function Stepper({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.stepper, { backgroundColor: colors.chipBackground, opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={[styles.stepperText, { color: colors.tintText }]}>{label}</Text>
    </Pressable>
  );
}

function VerdictStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.verdictStatLabel}>{label}</Text>
      <Text style={styles.verdictStatValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  swapRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  hair: { flex: 1, height: StyleSheet.hairlineWidth, marginLeft: 48 },
  swap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  routeInfo: { fontSize: 13, marginTop: 8 },
  carousel: { marginBottom: 14, marginHorizontal: -16, paddingLeft: 16 },
  preset: { width: 190, borderRadius: 18, padding: 14, marginRight: 10, borderWidth: 1.5 },
  presetIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  presetTitle: { fontSize: 16, fontWeight: '700' },
  presetSub: { fontSize: 13, marginTop: 2 },
  presetMeta: { fontSize: 12, marginTop: 6 },
  days: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  day: { flex: 1, borderRadius: 12, alignItems: 'center', paddingVertical: 7, marginHorizontal: 2 },
  dayWeek: { fontSize: 11, fontWeight: '600' },
  dayNum: { fontSize: 20, fontWeight: '700', marginVertical: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  time: { fontSize: 40, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -1, marginHorizontal: 18 },
  stepper: { minWidth: 46, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, marginLeft: 6 },
  stepperText: { fontSize: 14, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  durationRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 4 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  duration: { fontSize: 24, fontWeight: '700', marginTop: 2 },
  hint: { fontSize: 12, marginTop: 2 },
  verdict: { borderRadius: 24, padding: 20, marginTop: 18, marginBottom: 14 },
  verdictHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFD66B',
    borderRadius: 18,
    paddingHorizontal: 14,
    minHeight: 36,
    marginTop: 14,
    gap: 6,
  },
  nightButtonText: { color: '#1A1000', fontSize: 14, fontWeight: '700' },
  verdictKicker: { color: '#FFFFFFCC', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  verdictTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginTop: 6, letterSpacing: -0.5, textShadowColor: '#00000033', textShadowRadius: 6 },
  verdictBody: { color: '#FFFFFFEE', fontSize: 15, marginTop: 8, lineHeight: 20 },
  verdictStats: { flexDirection: 'row', marginTop: 16, gap: 8 },
  verdictStatLabel: { color: '#FFFFFFCC', fontSize: 12, fontWeight: '600' },
  verdictStatValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 2 },
  verdictHint: { color: '#FFFFFFEE', fontSize: 13, marginTop: 12 },
  verdictFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#FFFFFF55',
    minHeight: 36,
    justifyContent: 'center',
  },
  verdictFooterText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
