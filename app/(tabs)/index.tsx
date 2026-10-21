import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Chip, PrimaryButton, SectionHeader, SegmentedControl } from '../../src/components/ui';
import { PlaceSearchField } from '../../src/components/PlaceSearchField';
import { Screen } from '../../src/components/Screen';
import { useTrip } from '../../src/context/TripContext';
import { PRESET_TRIPS } from '../../src/data/presetTrips';
import { utcToZoned } from '../../src/engine/timezone';
import { addToHistory } from '../../src/services/storageService';
import { haptics } from '../../src/services/deviceServices';
import { skyGradient, useAppTheme } from '../../src/theme/colors';
import {
  addDays,
  busSeatHint,
  dateChipLabel,
  dateKey,
  formatDuration,
  formatKm,
  formatTime,
  MODE_META,
  MODES,
  parseTime,
} from '../../src/utils/format';

const TIME_SHORTCUTS = ['08:00', '12:00', '16:00', '22:00'];

export default function SimulateScreen() {
  const { colors, scheme } = useAppTheme();
  const t = useTrip();
  const { trip, analysis, seats, route, routeLoading } = t;
  const tz = trip.origin.tz;
  const now = utcToZoned(new Date(), tz);
  const today = dateKey(now.year, now.month, now.day);
  const days = Array.from({ length: 21 }, (_, i) => addDays(today, i));
  const { hour, minute } = parseTime(trip.time);

  const shiftTime = (deltaMin: number) => {
    const total = (((hour * 60 + minute + deltaMin) % 1440) + 1440) % 1440;
    t.setTime(formatTime(Math.floor(total / 60), total % 60));
  };

  const setNow = () => {
    const rounded = Math.ceil((now.hour * 60 + now.minute) / 5) * 5;
    t.setDate(today);
    t.setTime(formatTime(Math.floor(rounded / 60) % 24, rounded % 60));
  };

  const openResults = () => {
    void addToHistory(t.toSavedTrip());
    router.push('/results');
  };

  const sky = skyGradient(hour + minute / 60, scheme);
  const side = analysis.recommendedSide;
  const shade = side === 'left' ? analysis.shadePct.left : side === 'right' ? analysis.shadePct.right : null;

  return (
    <Screen title="Fuja do Sol!" subtitle="De que lado sentar para fugir do sol — ou ver o pôr do sol." skyHour={hour + minute / 60}>
      <SegmentedControl
        options={MODES.map((m) => ({ value: m, label: MODE_META[m].label, icon: MODE_META[m].icon }))}
        value={trip.mode}
        onChange={t.setMode}
      />

      <Card style={{ marginTop: 14 }}>
        <PlaceSearchField label="Origem" value={trip.origin} onSelect={t.setOrigin} allowCurrentLocation online={t.preferences.useOnlineServices} />
        <View style={styles.swapRow}>
          <View style={[styles.hair, { backgroundColor: colors.separator }]} />
          <Pressable
            onPress={() => {
              haptics.impact();
              t.swap();
            }}
            accessibilityRole="button"
            accessibilityLabel="Inverter origem e destino"
            style={[styles.swap, { backgroundColor: colors.chipBackground }]}
          >
            <Ionicons name="swap-vertical" size={20} color={colors.tint} />
          </Pressable>
        </View>
        <PlaceSearchField label="Destino" value={trip.destination} onSelect={t.setDestination} online={t.preferences.useOnlineServices} />
        <Text style={[styles.routeInfo, { color: colors.textSecondary }]}>
          {routeLoading
            ? 'Traçando a rota…'
            : `${formatKm(analysis.totalDistanceKm)} · ${
                route?.source === 'osrm'
                  ? 'rota real (OpenStreetMap/OSRM)'
                  : route?.source === 'waypoints'
                    ? 'traçado da rota famosa'
                    : trip.mode === 'plane'
                      ? 'rota de voo (grande círculo)'
                      : 'rota estimada offline'
              }`}
        </Text>
      </Card>

      <SectionHeader title="Rotas famosas em 1 toque" />
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
                {p.time} · {formatDuration(p.durationMinutes)} · {p.optimization === 'golden' ? 'Golden hour' : 'Sombra'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionHeader title="Quando" subtitle={`Horário local de ${trip.origin.city}`} />
      <Card>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {days.map((d) => {
            const l = dateChipLabel(d);
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
                accessibilityLabel={`${l.weekday} ${l.day} de ${l.month}`}
                style={[styles.day, { backgroundColor: sel ? colors.tint : colors.chipBackground }]}
              >
                <Text style={[styles.dayWeek, { color: sel ? '#1A1000' : colors.textSecondary }]}>{d === today ? 'Hoje' : l.weekday}</Text>
                <Text style={[styles.dayNum, { color: sel ? '#1A1000' : colors.text }]}>{l.day}</Text>
                <Text style={[styles.dayWeek, { color: sel ? '#1A1000' : colors.textSecondary }]}>{l.month}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.timeRow}>
          <Stepper label="−1h" onPress={() => shiftTime(-60)} />
          <Stepper label="−15" onPress={() => shiftTime(-15)} />
          <Text style={[styles.time, { color: colors.text }]} accessibilityLabel={`Partida às ${trip.time}`}>
            {trip.time}
          </Text>
          <Stepper label="+15" onPress={() => shiftTime(15)} />
          <Stepper label="+1h" onPress={() => shiftTime(60)} />
        </View>
        <View style={styles.chips}>
          <Chip label="Agora" icon="flash" onPress={setNow} />
          <Chip
            label="Amanhã 08:00"
            onPress={() => {
              t.setDate(addDays(today, 1));
              t.setTime('08:00');
            }}
          />
          {TIME_SHORTCUTS.map((s) => (
            <Chip key={s} label={s} selected={trip.time === s} onPress={() => t.setTime(s)} />
          ))}
        </View>

        <View style={[styles.durationRow, { borderTopColor: colors.separator }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textMuted }]}>DURAÇÃO</Text>
            <Text style={[styles.duration, { color: colors.text }]}>{formatDuration(trip.durationMinutes)}</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {trip.durationAuto ? 'Calculada pela distância e velocidade média' : `Sugerido: ${formatDuration(t.suggestedDuration)}`}
            </Text>
          </View>
          <Stepper label="−15" onPress={() => t.setDuration(trip.durationMinutes - 15)} />
          <Stepper label="+15" onPress={() => t.setDuration(trip.durationMinutes + 15)} />
        </View>
        {!trip.durationAuto ? (
          <View style={styles.chips}>
            <Chip label="Usar duração sugerida" icon="refresh" onPress={t.resetDurationAuto} />
          </View>
        ) : null}
      </Card>

      <SectionHeader title="Objetivo" />
      <SegmentedControl
        options={[
          { value: 'shade', label: 'Fuja do Sol', icon: 'umbrella' },
          { value: 'golden', label: 'Golden Hour', icon: 'partly-sunny' },
        ]}
        value={trip.optimization}
        onChange={t.setOptimization}
      />

      <LinearGradient colors={sky} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.verdict}>
        <Text style={styles.verdictKicker}>VEREDITO IMEDIATO</Text>
        <Text style={styles.verdictTitle}>{analysis.verdict}</Text>
        <Text style={styles.verdictBody}>{analysis.verdictDetail}</Text>
        <View style={styles.verdictStats}>
          <VerdictStat label="Melhor lugar" value={seats.best.seat.label} />
          <VerdictStat label="Na sombra" value={shade !== null ? `${shade}%` : '—'} />
          <VerdictStat label="Viradas" value={String(analysis.flips.length)} />
        </View>
        {trip.mode === 'bus' && side !== 'either' ? <Text style={styles.verdictHint}>Ônibus: {busSeatHint(side)}</Text> : null}
      </LinearGradient>
      <PrimaryButton label="Abrir Raio-X da viagem" icon="analytics" onPress={openResults} />
      <View style={{ height: 10 }} />
      <PrimaryButton label="Ver mapa de assentos" icon="grid" variant="tinted" onPress={() => router.push('/seats')} />
    </Screen>
  );
}

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label.replace('−', 'menos ').replace('+', 'mais ')}
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
      <Text style={styles.verdictStatValue}>{value}</Text>
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
  day: { width: 56, borderRadius: 14, alignItems: 'center', paddingVertical: 8, marginRight: 8 },
  dayWeek: { fontSize: 11, fontWeight: '600' },
  dayNum: { fontSize: 20, fontWeight: '700', marginVertical: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time: { fontSize: 40, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  stepper: { minWidth: 46, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, marginLeft: 6 },
  stepperText: { fontSize: 14, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  durationRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 4 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  duration: { fontSize: 24, fontWeight: '700', marginTop: 2 },
  hint: { fontSize: 12, marginTop: 2 },
  verdict: { borderRadius: 24, padding: 20, marginTop: 18, marginBottom: 14 },
  verdictKicker: { color: '#FFFFFFCC', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  verdictTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginTop: 6, letterSpacing: -0.5, textShadowColor: '#00000033', textShadowRadius: 6 },
  verdictBody: { color: '#FFFFFFEE', fontSize: 15, marginTop: 8, lineHeight: 20 },
  verdictStats: { flexDirection: 'row', marginTop: 16 },
  verdictStatLabel: { color: '#FFFFFFCC', fontSize: 12, fontWeight: '600' },
  verdictStatValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 2 },
  verdictHint: { color: '#FFFFFFEE', fontSize: 13, marginTop: 12 },
});
