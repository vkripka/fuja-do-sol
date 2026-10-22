import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { RoutePreviewSVG } from '../../src/components/RoutePreviewSVG';
import { Screen } from '../../src/components/Screen';
import { ShareTicketCard, ticketShareText } from '../../src/components/ShareTicketCard';
import { SolarCompassSVG } from '../../src/components/SolarCompassSVG';
import { TimelineChart } from '../../src/components/TimelineChart';
import { Card, Chip, InfoRow, LegendItem, PrimaryButton, SectionHeader, StatTile } from '../../src/components/ui';
import { useTrip } from '../../src/context/TripContext';
import { shortCode } from '../../src/data/hubs';
import { exposureAtMinute } from '../../src/engine/exposureCalculator';
import { cardinalPt } from '../../src/engine/geodesic';
import { formatZonedTime } from '../../src/engine/timezone';
import type { SegmentExposure, TransportMode } from '../../src/engine/types';
import { localizeVerdict, sideLabel } from '../../src/engine/verdict';
import { useI18n, type Strings } from '../../src/i18n';
import { haptics, scheduleCurtainAlerts, shareTicket, type ViewRef } from '../../src/services/deviceServices';
import { nearestHub } from '../../src/services/geocodingService';
import type { MapStyle } from '../../src/services/mapTiles';
import { saveFavorite } from '../../src/services/storageService';
import { useAppTheme } from '../../src/theme/colors';
import { formatDuration } from '../../src/utils/format';

const MAP_STYLES: MapStyle[] = ['clean', 'map', 'satellite'];
const CARDINAL_EN: Record<string, string> = { N: 'N', NE: 'NE', L: 'E', SE: 'SE', S: 'S', SO: 'SW', O: 'W', NO: 'NW' };

function describeMoment(ex: SegmentExposure, mode: TransportMode, s: Strings): string {
  const tx = s.results;
  if (!ex.sun.isUp) return tx.momentNight;
  const c = ex.components;
  const strongest = Math.max(c.left, c.right, c.front, c.back);
  const intensity = strongest > 0.45 ? tx.intensity.strong : strongest > 0.15 ? tx.intensity.moderate : tx.intensity.weak;
  const elev = Math.round(ex.sun.elevation);
  switch (ex.side) {
    case 'left':
    case 'right':
      return tx.momentSide(intensity, s.sideName(ex.side, mode), elev);
    case 'front':
      return tx.momentFront(intensity, elev);
    case 'back':
      return tx.momentBack(intensity, elev);
    default:
      return tx.momentOverhead(elev);
  }
}

export default function ResultsScreen() {
  const { colors } = useAppTheme();
  const { s, lang } = useI18n();
  const tx = s.results;
  const { width } = useWindowDimensions();
  const t = useTrip();
  const { trip, analysis, seats } = t;
  const tz = trip.origin.tz;
  const [progress, setProgress] = useState(0);
  const [mapStyle, setMapStyle] = useState<MapStyle>('clean');
  const ticketRef: ViewRef = useRef(null);
  const contentW = Math.min(width, 720) - 32;
  const innerW = contentW - 32;
  const verdict = localizeVerdict(analysis, lang);
  const cardinal = (b: number) => (lang === 'en' ? CARDINAL_EN[cardinalPt(b)] : cardinalPt(b));

  const minute = progress * analysis.durationMinutes;
  const ex = exposureAtMinute(analysis, minute);
  const at = new Date(analysis.input.departure.getTime() + minute * 60000);
  const near = nearestHub(ex.segment.midpoint, 80);
  const shadeSide = analysis.shadeSide;
  const compassSize = Math.min(innerW, 300);

  const headline =
    analysis.daylightMinutes === 0
      ? tx.headlineNight
      : shadeSide === 'either'
        ? tx.headlineBalanced
        : tx.headlineSide(sideLabel(shadeSide, lang), analysis.advantagePct);

  const save = async () => {
    await saveFavorite(t.toSavedTrip());
    haptics.success();
    Alert.alert(tx.savedTitle, tx.savedBody);
  };

  const scheduleAlerts = async () => {
    const lead = t.preferences.alertLeadMinutes;
    const r = await scheduleCurtainAlerts(analysis, tz, lead, lang);
    if (r.status === 'scheduled') {
      haptics.success();
      Alert.alert(tx.alertsScheduledTitle, tx.alertsScheduledBody(r.count, lead));
    } else if (r.status === 'none') Alert.alert(tx.alertsNoneTitle, tx.alertsNoneBody);
    else if (r.status === 'denied') Alert.alert(tx.alertsDeniedTitle, tx.alertsDeniedBody);
    else Alert.alert(tx.alertsUnsupportedTitle, tx.alertsUnsupportedBody);
  };

  const share = () =>
    shareTicket(
      ticketRef,
      ticketShareText({ analysis, seats, origin: trip.origin, destination: trip.destination, mode: trip.mode, timeZone: tz }, lang),
      s.ticket.dialogTitle,
    );

  return (
    <Screen
      title={tx.title}
      subtitle={`${s.modes[trip.mode]} · ${trip.origin.city} → ${trip.destination.city} · ${formatDuration(analysis.durationMinutes)}`}
      skyHour={Number(trip.time.slice(0, 2))}
    >
      <LinearGradient
        colors={shadeSide === 'left' ? [colors.sunRight, '#2D2A7A'] : shadeSide === 'right' ? ['#3A2E9A', colors.sunRight] : ['#5B5F7A', '#2C2F45']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroKicker}>{tx.heroKicker}</Text>
        <Text style={styles.heroTitle}>{headline}</Text>
        <Text style={styles.heroBody}>{verdict.verdictDetail}</Text>
      </LinearGradient>

      <View style={styles.row}>
        <StatTile label={tx.left} tone={colors.sunLeft} value={`${Math.round(analysis.sunShare.left)}%`} caption={tx.inShadeCaption(analysis.shadePct.left)} />
        <StatTile label={tx.right} tone={colors.sunRight} value={`${Math.round(analysis.sunShare.right)}%`} caption={tx.inShadeCaption(analysis.shadePct.right)} />
        <StatTile label={tx.frontBack} tone={colors.sunFront} value={`${Math.round(analysis.sunShare.front + analysis.sunShare.back)}%`} caption={tx.ofTotal} />
      </View>

      <SectionHeader title={tx.minuteTitle} subtitle={tx.minuteSubtitle} />
      <Card>
        <View style={{ alignItems: 'center' }}>
          <SolarCompassSVG heading={ex.segment.bearing} sunAzimuth={ex.sun.azimuth} sunElevation={ex.sun.elevation} isUp={ex.sun.isUp} mode={trip.mode} size={compassSize} />
        </View>
        <Text style={[styles.status, { color: colors.text }]}>
          <Text style={{ fontWeight: '800' }}>{formatZonedTime(at, tz)}</Text>
          {near ? tx.near(near.place.city) : ''}: {describeMoment(ex, trip.mode, s)}
        </Text>
        <Text style={[styles.statusSub, { color: colors.textSecondary }]}>
          {tx.heading} {Math.round(ex.segment.bearing)}° ({cardinal(ex.segment.bearing)}) · {tx.sunAt} {Math.round(ex.sun.azimuth)}° ({cardinal(ex.sun.azimuth)}) · UV{' '}
          {ex.sun.uvIndex.toFixed(0)}
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
          accessibilityLabel={tx.progressA11y}
        />
        <View style={styles.sliderLabels}>
          <Text style={[styles.small, { color: colors.textMuted }]}>{formatZonedTime(analysis.input.departure, tz)}</Text>
          <Text style={[styles.small, { color: colors.textMuted }]}>
            {formatZonedTime(new Date(analysis.input.departure.getTime() + analysis.durationMinutes * 60000), tz)}
          </Text>
        </View>
        <View style={styles.mapModes}>
          {MAP_STYLES.map((m) => (
            <Chip
              key={m}
              label={tx.mapModes[m]}
              icon={m === 'clean' ? 'git-commit-outline' : m === 'map' ? 'map-outline' : 'earth-outline'}
              selected={mapStyle === m}
              onPress={() => setMapStyle(m)}
            />
          ))}
        </View>
        <RoutePreviewSVG
          analysis={analysis}
          progress={progress}
          width={innerW}
          height={Math.round(innerW * 0.72)}
          originLabel={shortCode(trip.origin)}
          destinationLabel={shortCode(trip.destination)}
          mapStyle={mapStyle}
          online={t.preferences.useOnlineServices}
        />
        <View style={styles.legend}>
          <LegendItem color={colors.sunLeft} label={tx.legendLeft} />
          <LegendItem color={colors.sunRight} label={tx.legendRight} />
          <LegendItem color={colors.sunFront} label={tx.legendFrontBack} />
          <LegendItem color={colors.night} label={tx.legendNight} />
        </View>
      </Card>

      <SectionHeader title={tx.timelineTitle} subtitle={tx.timelineSubtitle} />
      <Card>
        <TimelineChart analysis={analysis} timeZone={tz} width={innerW} progress={progress} onScrub={setProgress} />
      </Card>

      <SectionHeader title={tx.curtainTitle} />
      <Card>
        {analysis.curtainAlerts.length === 0 ? (
          <InfoRow icon="checkmark-circle" title={tx.noStrongSunTitle} body={tx.noStrongSunBody} tone={colors.success} />
        ) : (
          analysis.curtainAlerts.map((w, i) => (
            <InfoRow
              key={i}
              icon={w.side === 'front' ? 'car' : 'sunny'}
              tone={w.side === 'left' ? colors.sunLeft : w.side === 'right' ? colors.sunRight : colors.sunFront}
              title={`${formatZonedTime(w.startTime, tz)}–${formatZonedTime(w.endTime, tz)} · ${
                w.side === 'front' ? tx.windshield : tx.window(s.sideName(w.side, trip.mode))
              }`}
              body={tx.curtainBody(Math.round(w.peakIrradiance * 1000), w.peakUv.toFixed(0))}
            />
          ))
        )}
        {analysis.flips.map((f, i) => (
          <InfoRow
            key={`f${i}`}
            icon="swap-horizontal"
            title={tx.flipTitle(formatZonedTime(f.time, tz))}
            body={tx.flipBody(s.sideName(f.from, trip.mode), s.sideName(f.to, trip.mode))}
          />
        ))}
        {analysis.golden.events.map((e, i) => (
          <InfoRow
            key={`g${i}`}
            icon={e.kind === 'sunrise' ? 'sunny' : 'moon'}
            tone={colors.gold}
            title={`${formatZonedTime(e.time, tz)} · ${e.kind === 'sunrise' ? tx.sunrise : tx.sunset}`}
            body={tx.visibleFrom(s.sideName(e.side, trip.mode))}
          />
        ))}
      </Card>

      <SectionHeader title={tx.uvTitle} />
      <Card>
        <InfoRow
          icon="shield-checkmark"
          title={tx.uvMax(analysis.peakUv.toFixed(0))}
          body={analysis.peakUv >= 6 ? tx.uvHigh : analysis.peakUv >= 3 ? tx.uvModerate : tx.uvLow}
        />
        <InfoRow icon="car-sport" title={tx.windshieldTitle} body={tx.windshieldBody} />
        <InfoRow icon="browsers" title={tx.sideGlassTitle} body={tx.sideGlassBody} />
      </Card>

      <SectionHeader title={tx.ticketTitle} subtitle={tx.ticketSubtitle} />
      <ShareTicketCard ref={ticketRef} analysis={analysis} seats={seats} origin={trip.origin} destination={trip.destination} mode={trip.mode} timeZone={tz} />

      <View style={{ height: 16 }} />
      <PrimaryButton label={tx.share} icon="share-outline" onPress={() => void share()} />
      <View style={{ height: 10 }} />
      <PrimaryButton label={tx.scheduleAlerts} icon="notifications-outline" variant="tinted" onPress={() => void scheduleAlerts()} />
      <View style={{ height: 10 }} />
      <PrimaryButton label={tx.save} icon="bookmark-outline" variant="tinted" onPress={() => void save()} />
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
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  small: { fontSize: 12, fontVariant: ['tabular-nums'] },
  mapModes: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
});
