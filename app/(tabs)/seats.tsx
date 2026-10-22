import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { SeatMapSVG } from '../../src/components/SeatMapSVG';
import { Card, Chip, SectionHeader, SegmentedControl } from '../../src/components/ui';
import { useTrip } from '../../src/context/TripContext';
import { positionLabel } from '../../src/engine/seatRecommender';
import type { SeatScore } from '../../src/engine/types';
import { haptics } from '../../src/services/deviceServices';
import { goldenColor, heatColor, useAppTheme } from '../../src/theme/colors';
import { MODE_META, MODES } from '../../src/utils/format';

export default function SeatsScreen() {
  const { colors, scheme } = useAppTheme();
  const { width } = useWindowDimensions();
  const t = useTrip();
  const { trip, seats, seatPrefs, analysis } = t;
  const [selected, setSelected] = useState<SeatScore | null>(null);
  const [colorBy, setColorBy] = useState<'heat' | 'golden'>('heat');
  const contentW = Math.min(width, 720) - 32;
  const mapW = Math.min(contentW - 32, trip.mode === 'car' ? 280 : trip.mode === 'boat' ? 330 : 360);

  const current = selected ? seats.scores.find((s) => s.seat.id === selected.seat.id) ?? seats.best : seats.best;
  const mode = trip.mode;

  return (
    <Screen title="Mapa de Assentos" subtitle={seats.layout.name}>
      <SegmentedControl
        options={MODES.map((m) => ({ value: m, label: MODE_META[m].label, icon: MODE_META[m].icon }))}
        value={trip.mode}
        onChange={(m) => {
          setSelected(null);
          t.setMode(m);
        }}
      />

      <LinearGradient colors={['#FFB000', '#FF6A2B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.best}>
        <Ionicons name="star" size={22} color="#FFFFFF" />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.bestKicker}>MELHOR ASSENTO DA VIAGEM</Text>
          <Text style={styles.bestTitle}>
            {seats.best.seat.label} · {positionLabel(seats.best.seat, mode)}
          </Text>
          <Text style={styles.bestBody}>{seats.reason}</Text>
        </View>
      </LinearGradient>

      <Card>
        <Text style={[styles.filterLabel, { color: colors.textMuted }]}>PREFERÊNCIA</Text>
        <View style={styles.chips}>
          {(['any', 'window', 'aisle'] as const).map((p) => (
            <Chip
              key={p}
              label={p === 'any' ? 'Tanto faz' : p === 'window' ? 'Janela' : 'Corredor'}
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
              label={z === 'any' ? 'Qualquer fileira' : z === 'front' ? 'Frente' : z === 'middle' ? 'Meio' : 'Fundo'}
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
            { value: 'heat', label: 'Colorir por calor', icon: 'thermometer' },
            { value: 'golden', label: 'Vista do pôr do sol', icon: 'partly-sunny' },
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
            onSelect={(s) => {
              haptics.selection();
              setSelected(s);
            }}
          />
        </View>
        <View style={styles.legendRow}>
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{colorBy === 'heat' ? 'Sombra' : 'Sem vista'}</Text>
          <View style={styles.ramp}>
            {Array.from({ length: 10 }, (_, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: (colorBy === 'heat' ? heatColor : goldenColor)(i * 11, scheme) }} />
            ))}
          </View>
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{colorBy === 'heat' ? 'Muito sol' : 'Vista dourada'}</Text>
        </View>
        <Text style={[styles.note, { color: colors.textMuted }]}>★ = melhor assento · toque em qualquer lugar para ver os detalhes</Text>
      </Card>

      <SectionHeader title={`${MODE_META[mode].seatWord[0].toUpperCase()}${MODE_META[mode].seatWord.slice(1)} ${current.seat.label}`} subtitle={positionLabel(current.seat, mode)} />
      <Card>
        <Meter label="Tempo na sombra" value={current.shadePct} suffix="%" color={colors.shade} />
        <Meter label="Conforto térmico" value={current.thermalComfort} suffix="/100" color={colors.success} />
        <Meter label="Calor (mapa)" value={current.heat} suffix="/100" color={colors.sunLeft} />
        <Meter label="Vista do pôr/nascer do sol" value={current.goldenView} suffix="/100" color={colors.gold} />
        <View style={[styles.uvRow, { borderTopColor: colors.separator }]}>
          <Ionicons name="shield-half" size={18} color={colors.textSecondary} />
          <Text style={[styles.uvText, { color: colors.text }]}>
            UVA na janela: <Text style={{ fontWeight: '700' }}>{current.uvLevel}</Text>
            {current.uvBehindGlass > 0 ? ` (índice ~${current.uvBehindGlass.toFixed(1)} atrás do vidro)` : ''}
          </Text>
        </View>
        {!current.seat.selectable ? (
          <Text style={[styles.note, { color: colors.textMuted }]}>Assento do motorista: só para consulta — a recomendação considera os passageiros.</Text>
        ) : null}
        {current.seat.overWing ? <Text style={[styles.note, { color: colors.textMuted }]}>Sobre a asa: a vista do horizonte fica parcialmente bloqueada.</Text> : null}
      </Card>

      <SectionHeader title="Top 5 assentos" subtitle={analysis.input.optimization === 'golden' ? 'Ranking para ver a golden hour' : 'Ranking para fugir do sol'} />
      <Card>
        {seats.ranking.map((s, i) => (
          <View key={s.seat.id} style={[styles.rankRow, { borderBottomColor: colors.separator }]}>
            <Text style={[styles.rankPos, { color: colors.textMuted }]}>{i + 1}</Text>
            <View style={[styles.rankSwatch, { backgroundColor: heatColor(s.heat, scheme) }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rankTitle, { color: colors.text }]}>
                {s.seat.label} · {positionLabel(s.seat, mode)}
              </Text>
              <Text style={[styles.rankSub, { color: colors.textSecondary }]}>
                {s.shadePct}% na sombra · conforto {s.thermalComfort}/100 · vista {s.goldenView}/100
              </Text>
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
