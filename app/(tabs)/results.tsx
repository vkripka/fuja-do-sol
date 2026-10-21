import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { RoutePreviewSVG } from '../../src/components/RoutePreviewSVG';
import { Screen } from '../../src/components/Screen';
import { ShareTicketCard, ticketShareText } from '../../src/components/ShareTicketCard';
import { SolarCompassSVG } from '../../src/components/SolarCompassSVG';
import { TimelineChart } from '../../src/components/TimelineChart';
import { Card, InfoRow, LegendItem, PrimaryButton, SectionHeader, StatTile } from '../../src/components/ui';
import { useTrip } from '../../src/context/TripContext';
import { shortCode } from '../../src/data/hubs';
import { exposureAtMinute, sideLabel } from '../../src/engine/exposureCalculator';
import { cardinalPt } from '../../src/engine/geodesic';
import { formatZonedTime } from '../../src/engine/timezone';
import type { SegmentExposure, TripAnalysisResult } from '../../src/engine/types';
import { haptics, scheduleCurtainAlerts, shareTicket, type ViewRef } from '../../src/services/deviceServices';
import { nearestHub } from '../../src/services/geocodingService';
import { saveFavorite } from '../../src/services/storageService';
import { useAppTheme } from '../../src/theme/colors';
import { formatDuration, MODE_META, sideName } from '../../src/utils/format';

function describeMoment(ex: SegmentExposure, analysis: TripAnalysisResult): string {
  const mode = analysis.input.mode;
  if (!ex.sun.isUp) return 'Sol abaixo do horizonte — sem sol direto.';
  const c = ex.components;
  const strongest = Math.max(c.left, c.right, c.front, c.back);
  const intensity = strongest > 0.45 ? 'forte' : strongest > 0.15 ? 'moderado' : 'fraco';
  const elev = `${Math.round(ex.sun.elevation)}° de elevação`;
  switch (ex.side) {
    case 'left':
    case 'right':
      return `Sol ${intensity} na janela ${sideName(ex.side, mode)}, ${elev}.`;
    case 'front':
      return `Sol ${intensity} pela frente (para-brisa), ${elev}.`;
    case 'back':
      return `Sol ${intensity} por trás, ${elev}.`;
    default:
      return `Sol quase a pino (${elev}): o teto faz sombra nas janelas.`;
  }
}

export default function ResultsScreen() {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const t = useTrip();
  const { trip, analysis, seats } = t;
  const tz = trip.origin.tz;
  const [progress, setProgress] = useState(0);
  const ticketRef: ViewRef = useRef(null);
  const contentW = Math.min(width, 720) - 32;
  const innerW = contentW - 32;

  const minute = progress * analysis.durationMinutes;
  const ex = exposureAtMinute(analysis, minute);
  const at = new Date(analysis.input.departure.getTime() + minute * 60000);
  const near = nearestHub(ex.segment.midpoint, 80);
  const shadeSide = analysis.shadeSide;
  const compassSize = Math.min(innerW, 300);

  const headline =
    analysis.daylightMinutes === 0
      ? 'VIAGEM NOTURNA: 0% DE SOL'
      : shadeSide === 'either'
        ? 'SOL EQUILIBRADO'
        : `LADO ${sideLabel(shadeSide)} É ${analysis.advantagePct}% MAIS FRESCO`;

  const save = async () => {
    await saveFavorite(t.toSavedTrip());
    haptics.success();
    Alert.alert('Viagem salva', 'Você encontra esta viagem na aba Salvos.');
  };

  const scheduleAlerts = async () => {
    const r = await scheduleCurtainAlerts(analysis, tz, t.preferences.alertLeadMinutes);
    if (r.status === 'scheduled') {
      haptics.success();
      Alert.alert('Alertas agendados', `${r.count} lembrete(s) de cortina, ${t.preferences.alertLeadMinutes} min antes de cada trecho de sol forte.`);
    } else if (r.status === 'none') Alert.alert('Nada para agendar', 'Não há trechos futuros de sol forte nesta viagem.');
    else if (r.status === 'denied') Alert.alert('Notificações desativadas', 'Permita notificações nos Ajustes do iPhone para receber os alertas.');
    else Alert.alert('Indisponível', 'Alertas locais não são suportados neste dispositivo.');
  };

  const share = () =>
    shareTicket(
      ticketRef,
      ticketShareText({ analysis, seats, origin: trip.origin, destination: trip.destination, mode: trip.mode, timeZone: tz }),
    );

  return (
    <Screen
      title="Raio-X da Viagem"
      subtitle={`${MODE_META[trip.mode].label} · ${trip.origin.city} → ${trip.destination.city} · ${formatDuration(analysis.durationMinutes)}`}
      skyHour={Number(trip.time.slice(0, 2))}
    >
      <LinearGradient
        colors={shadeSide === 'left' ? [colors.sunRight, '#2D2A7A'] : shadeSide === 'right' ? ['#3A2E9A', colors.sunRight] : ['#5B5F7A', '#2C2F45']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroKicker}>VEREDITO PRINCIPAL</Text>
        <Text style={styles.heroTitle}>{headline}</Text>
        <Text style={styles.heroBody}>{analysis.verdictDetail}</Text>
      </LinearGradient>

      <View style={styles.row}>
        <StatTile label="Esquerda" tone={colors.sunLeft} value={`${Math.round(analysis.sunShare.left)}%`} caption={`${analysis.shadePct.left}% na sombra`} />
        <StatTile label="Direita" tone={colors.sunRight} value={`${Math.round(analysis.sunShare.right)}%`} caption={`${analysis.shadePct.right}% na sombra`} />
        <StatTile
          label="Frente/Trás"
          tone={colors.sunFront}
          value={`${Math.round(analysis.sunShare.front + analysis.sunShare.back)}%`}
          caption="do sol total"
        />
      </View>

      <SectionHeader title="Viagem minuto a minuto" subtitle="Arraste para ver o sol em cada ponto do trajeto" />
      <Card>
        <View style={{ alignItems: 'center' }}>
          <SolarCompassSVG
            heading={ex.segment.bearing}
            sunAzimuth={ex.sun.azimuth}
            sunElevation={ex.sun.elevation}
            isUp={ex.sun.isUp}
            mode={trip.mode}
            size={compassSize}
          />
        </View>
        <Text style={[styles.status, { color: colors.text }]}>
          <Text style={{ fontWeight: '800' }}>{formatZonedTime(at, tz)}</Text>
          {near ? ` — perto de ${near.place.city}` : ''}: {describeMoment(ex, analysis)}
        </Text>
        <Text style={[styles.statusSub, { color: colors.textSecondary }]}>
          Rumo {Math.round(ex.segment.bearing)}° ({cardinalPt(ex.segment.bearing)}) · Sol a {Math.round(ex.sun.azimuth)}° ({cardinalPt(ex.sun.azimuth)}) ·
          UV {ex.sun.uvIndex.toFixed(0)}
        </Text>
        <Slider
          style={{ marginTop: 10, height: 40 }}
          minimumValue={0}
          maximumValue={1}
          value={progress}
          onValueChange={setProgress}
          minimumTrackTintColor={colors.tint}
          maximumTrackTintColor={colors.separator}
          thumbTintColor={colors.tint}
          accessibilityLabel="Progresso da viagem"
        />
        <View style={styles.sliderLabels}>
          <Text style={[styles.small, { color: colors.textMuted }]}>{formatZonedTime(analysis.input.departure, tz)}</Text>
          <Text style={[styles.small, { color: colors.textMuted }]}>
            {formatZonedTime(new Date(analysis.input.departure.getTime() + analysis.durationMinutes * 60000), tz)}
          </Text>
        </View>
        <RoutePreviewSVG
          analysis={analysis}
          progress={progress}
          width={innerW}
          height={Math.round(innerW * 0.62)}
          originLabel={shortCode(trip.origin)}
          destinationLabel={shortCode(trip.destination)}
        />
        <View style={styles.legend}>
          <LegendItem color={colors.sunLeft} label="Sol à esquerda" />
          <LegendItem color={colors.sunRight} label="Sol à direita" />
          <LegendItem color={colors.sunFront} label="Frente/trás" />
          <LegendItem color={colors.night} label="Noite / sol fraco" />
        </View>
      </Card>

      <SectionHeader title="Linha do tempo solar" subtitle="⇄ = o sol troca de lado · ☀↑ nascer · ☀↓ pôr" />
      <Card>
        <TimelineChart analysis={analysis} timeZone={tz} width={innerW} progress={progress} onScrub={setProgress} />
      </Card>

      <SectionHeader title="Quando fechar a cortina" />
      <Card>
        {analysis.curtainAlerts.length === 0 ? (
          <InfoRow icon="checkmark-circle" title="Nenhum trecho de sol forte" body="Você não vai precisar fechar a cortina nesta viagem." tone={colors.success} />
        ) : (
          analysis.curtainAlerts.map((w, i) => (
            <InfoRow
              key={i}
              icon={w.side === 'front' ? 'car' : 'sunny'}
              tone={w.side === 'left' ? colors.sunLeft : w.side === 'right' ? colors.sunRight : colors.sunFront}
              title={`${formatZonedTime(w.startTime, tz)}–${formatZonedTime(w.endTime, tz)} · ${w.side === 'front' ? 'para-brisa' : `janela ${sideName(w.side, trip.mode)}`}`}
              body={`Pico de ${Math.round(w.peakIrradiance * 1000)} W/m² na janela · UV ao ar livre até ${w.peakUv.toFixed(0)}.`}
            />
          ))
        )}
        {analysis.flips.map((f, i) => (
          <InfoRow
            key={`f${i}`}
            icon="swap-horizontal"
            title={`${formatZonedTime(f.time, tz)} · Ponto de Virada Solar`}
            body={`A estrada muda de direção e o sol passa da ${sideName(f.from, trip.mode)} para a ${sideName(f.to, trip.mode)}.`}
          />
        ))}
        {analysis.golden.events.map((e, i) => (
          <InfoRow
            key={`g${i}`}
            icon={e.kind === 'sunrise' ? 'sunny' : 'moon'}
            tone={colors.gold}
            title={`${formatZonedTime(e.time, tz)} · ${e.kind === 'sunrise' ? 'Nascer do sol' : 'Pôr do sol'}`}
            body={`Visível pela ${sideName(e.side, trip.mode)} do veículo.`}
          />
        ))}
      </Card>

      <SectionHeader title="Proteção UV" />
      <Card>
        <InfoRow
          icon="shield-checkmark"
          title={`UV máximo ao ar livre: ${analysis.peakUv.toFixed(0)}`}
          body={
            analysis.peakUv >= 6
              ? 'Radiação alta: use protetor solar mesmo dentro do veículo se for ficar na janela ensolarada.'
              : analysis.peakUv >= 3
                ? 'Radiação moderada: a cortina já ajuda bastante.'
                : 'Radiação baixa nesta viagem.'
          }
        />
        <InfoRow
          icon="car-sport"
          title="Para-brisa laminado"
          body="Bloqueia ~98% do UVA e praticamente todo o UVB. O sol frontal aquece, mas queima pouco."
        />
        <InfoRow
          icon="browsers"
          title="Janelas laterais temperadas"
          body="Bloqueiam o UVB, mas deixam passar até 60–70% do UVA, que envelhece a pele. Prefira o lado da sombra."
        />
      </Card>

      <SectionHeader title="Bilhete de Sombra" subtitle="Compartilhe com quem vai viajar com você" />
      <ShareTicketCard ref={ticketRef} analysis={analysis} seats={seats} origin={trip.origin} destination={trip.destination} mode={trip.mode} timeZone={tz} />

      <View style={{ height: 16 }} />
      <PrimaryButton label="Compartilhar Bilhete" icon="share-outline" onPress={() => void share()} />
      <View style={{ height: 10 }} />
      <PrimaryButton label="Agendar Alerta de Cortina" icon="notifications-outline" variant="tinted" onPress={() => void scheduleAlerts()} />
      <View style={{ height: 10 }} />
      <PrimaryButton label="Salvar Viagem" icon="bookmark-outline" variant="tinted" onPress={() => void save()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 24, padding: 20, marginBottom: 12 },
  heroKicker: { color: '#FFFFFFCC', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginTop: 6, letterSpacing: -0.5 },
  heroBody: { color: '#FFFFFFEE', fontSize: 15, marginTop: 8, lineHeight: 20 },
  row: { flexDirection: 'row', marginHorizontal: -4, marginBottom: 14 },
  status: { fontSize: 15, lineHeight: 21, marginTop: 10 },
  statusSub: { fontSize: 12, marginTop: 4, fontVariant: ['tabular-nums'] },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  small: { fontSize: 12, fontVariant: ['tabular-nums'] },
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
});
