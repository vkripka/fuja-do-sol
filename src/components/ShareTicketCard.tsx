/** "Bilhete de Embarque Solar": cartão compartilhável com a recomendação da viagem. */
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentRef, Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { shortCode, type Place } from '../data/hubs';
import { positionLabel } from '../engine/seatRecommender';
import { formatZonedDate, formatZonedTime, type TimeZoneId } from '../engine/timezone';
import type { SeatRecommendation, TransportMode, TripAnalysisResult } from '../engine/types';
import { busSeatHint, formatDuration, MODE_META, sideName } from '../utils/format';

export interface ShareTicketProps {
  analysis: TripAnalysisResult;
  seats: SeatRecommendation;
  origin: Place;
  destination: Place;
  mode: TransportMode;
  timeZone: TimeZoneId;
  ref?: Ref<ComponentRef<typeof View>>;
}

export function ticketHeadline(analysis: TripAnalysisResult, mode: TransportMode): string {
  if (analysis.daylightMinutes === 0) return 'VIAGEM NOTURNA — SEM SOL';
  const side = analysis.recommendedSide;
  if (side === 'either') return 'QUALQUER LADO SERVE';
  if (analysis.input.optimization === 'golden' && analysis.golden.bestSide) return `PÔR/NASCER DO SOL: ${sideName(side, mode).toUpperCase()}`;
  return `SENTE DO LADO ${side === 'left' ? 'ESQUERDO' : 'DIREITO'}`;
}

export function ticketShareText(p: Omit<ShareTicketProps, 'ref'>): string {
  const { analysis, seats, origin, destination, mode, timeZone } = p;
  const dep = analysis.input.departure;
  const lines = [
    `☀️ Bilhete de Sombra — Fuja do Sol!`,
    `${MODE_META[mode].label}: ${origin.city} → ${destination.city}`,
    `${formatZonedDate(dep, timeZone)}, saída ${formatZonedTime(dep, timeZone)} (${formatDuration(analysis.durationMinutes)})`,
    `👉 ${ticketHeadline(analysis, mode)}`,
    analysis.verdict,
    `Melhor ${MODE_META[mode].seatWord}: ${seats.best.seat.label} (${positionLabel(seats.best.seat, mode).toLowerCase()})`,
  ];
  if (mode === 'bus' && analysis.recommendedSide !== 'either') lines.push(`Dica: ${busSeatHint(analysis.recommendedSide)}`);
  return lines.join('\n');
}

export function ShareTicketCard({ analysis, seats, origin, destination, mode, timeZone, ref }: ShareTicketProps) {
  const dep = analysis.input.departure;
  const arr = new Date(dep.getTime() + analysis.durationMinutes * 60000);
  const side = analysis.recommendedSide;
  const shade = side === 'left' ? analysis.shadePct.left : side === 'right' ? analysis.shadePct.right : Math.max(analysis.shadePct.left, analysis.shadePct.right);
  const golden = analysis.input.optimization === 'golden';

  return (
    <View ref={ref} collapsable={false} style={styles.ticket}>
      <LinearGradient colors={golden ? ['#FF9A62', '#C2417A'] : ['#FFB000', '#FF6A2B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>☀ FUJA DO SOL!</Text>
          <Text style={styles.kind}>{golden ? 'BILHETE GOLDEN HOUR' : 'BILHETE DE SOMBRA'}</Text>
        </View>
        <View style={styles.codes}>
          <View>
            <Text style={styles.code}>{shortCode(origin)}</Text>
            <Text style={styles.city} numberOfLines={1}>
              {origin.city}
            </Text>
          </View>
          <Ionicons name={MODE_META[mode].icon} size={28} color="#FFFFFF" />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.code}>{shortCode(destination)}</Text>
            <Text style={styles.city} numberOfLines={1}>
              {destination.city}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.grid}>
          <Field label="DATA" value={formatZonedDate(dep, timeZone)} />
          <Field label="PARTIDA" value={formatZonedTime(dep, timeZone)} />
          <Field label="CHEGADA" value={formatZonedTime(arr, timeZone)} />
          <Field label="DURAÇÃO" value={formatDuration(analysis.durationMinutes)} />
        </View>

        <View style={styles.perforation}>
          <View style={[styles.notch, { left: -26 }]} />
          <View style={styles.dash} />
          <View style={[styles.notch, { right: -26 }]} />
        </View>

        <Text style={styles.headline}>{ticketHeadline(analysis, mode)}</Text>
        <Text style={styles.verdict}>{analysis.verdict}</Text>

        <View style={styles.grid}>
          <Field label={`MELHOR ${MODE_META[mode].seatWord.toUpperCase()}`} value={seats.best.seat.label} big />
          <Field label="NA SOMBRA" value={`${shade}%`} big />
          <Field label="UV PICO" value={analysis.peakUv.toFixed(0)} big />
        </View>
        {mode === 'bus' && side !== 'either' ? <Text style={styles.hint}>Poltronas sugeridas: {busSeatHint(side)}</Text> : null}
        <Text style={styles.footer}>Calculado com astronomia de precisão (NOAA/Meeus) · fujadosol.app</Text>
      </View>
    </View>
  );
}

function Field({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, big && styles.fieldValueBig]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: { borderRadius: 24, overflow: 'hidden', backgroundColor: '#FFFDF8' },
  header: { padding: 18 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  kind: { color: '#FFFFFFDD', fontWeight: '700', fontSize: 11, letterSpacing: 1 },
  codes: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  code: { color: '#FFFFFF', fontSize: 38, fontWeight: '800', letterSpacing: 1 },
  city: { color: '#FFFFFFE6', fontSize: 13, fontWeight: '600', maxWidth: 120 },
  body: { padding: 18, paddingTop: 14 },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  field: { flex: 1 },
  fieldLabel: { color: '#8A7A66', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  fieldValue: { color: '#2B1D0E', fontSize: 15, fontWeight: '700', marginTop: 2 },
  fieldValueBig: { fontSize: 24, fontWeight: '800' },
  perforation: { height: 26, justifyContent: 'center', marginVertical: 8 },
  dash: { borderTopWidth: 2, borderStyle: 'dashed', borderColor: '#E3D7C6' },
  notch: { position: 'absolute', width: 26, height: 26, borderRadius: 13, backgroundColor: '#00000022' },
  headline: { color: '#2B1D0E', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  verdict: { color: '#5C4A36', fontSize: 14, marginTop: 4, marginBottom: 14 },
  hint: { color: '#5C4A36', fontSize: 13, marginTop: 12 },
  footer: { color: '#A8998A', fontSize: 10, marginTop: 14 },
});
