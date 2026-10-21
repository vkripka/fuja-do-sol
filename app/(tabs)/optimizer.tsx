import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { DepartureTimesChart } from '../../src/components/DepartureTimesChart';
import { Screen } from '../../src/components/Screen';
import { Card, PrimaryButton, SectionHeader } from '../../src/components/ui';
import { useTrip } from '../../src/context/TripContext';
import { optimizeDepartureTime } from '../../src/engine/timeOptimizer';
import type { TimeSlotSimulation } from '../../src/engine/types';
import { haptics } from '../../src/services/deviceServices';
import { useAppTheme } from '../../src/theme/colors';
import { formatDuration, formatTime, sideName } from '../../src/utils/format';

export default function OptimizerScreen() {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const t = useTrip();
  const { trip, analysis } = t;
  const [picked, setPicked] = useState<TimeSlotSimulation | null>(null);
  const [showTable, setShowTable] = useState(false);
  const innerW = Math.min(width, 720) - 64;

  const result = useMemo(
    () => optimizeDepartureTime(analysis.input, { slots: 24, timeZone: trip.origin.tz }),
    [analysis.input, trip.origin.tz],
  );
  const shadeChamp = result.bestDaytimeShade ?? result.bestShade;
  const goldenChamp = result.bestGolden;

  const apply = (s: TimeSlotSimulation, optimization?: 'shade' | 'golden') => {
    haptics.success();
    t.setTime(formatTime(s.hour, s.minute));
    if (optimization) t.setOptimization(optimization);
  };

  return (
    <Screen title="Melhor Horário" subtitle={`E se você sair em outro horário? ${trip.origin.city} → ${trip.destination.city}, ${formatDuration(trip.durationMinutes)}`}>
      <Champion
        icon="umbrella"
        tone={colors.shade}
        kicker="HORÁRIO CAMPEÃO DE SOMBRA"
        title={`Saída às ${formatTime(shadeChamp.hour, shadeChamp.minute)}`}
        body={
          shadeChamp.shadeSide === 'either'
            ? `Conforto ${shadeChamp.comfortScore}/100 em qualquer lado.`
            : `Sentando na ${sideName(shadeChamp.shadeSide, trip.mode)}: conforto ${shadeChamp.comfortScore}/100, sol direto por ~${shadeChamp.sunlitMinutes} min no pior lado.`
        }
        onApply={() => apply(shadeChamp, 'shade')}
      />
      {result.bestShade.nightFraction > 0.5 && result.bestDaytimeShade ? (
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          Dica: viajar à noite (ex.: {formatTime(result.bestShade.hour, 0)}) elimina o sol direto. O campeão acima considera horários com luz do dia.
        </Text>
      ) : null}
      {goldenChamp ? (
        <Champion
          icon="partly-sunny"
          tone={colors.gold}
          kicker="HORÁRIO CAMPEÃO DE GOLDEN HOUR"
          title={`Saída às ${formatTime(goldenChamp.hour, goldenChamp.minute)}`}
          body={`Vista ${goldenChamp.goldenScore}/100 do pôr/nascer do sol${goldenChamp.goldenSide ? ` pela janela ${sideName(goldenChamp.goldenSide, trip.mode)}` : ''}.`}
          onApply={() => apply(goldenChamp, 'golden')}
        />
      ) : (
        <Card>
          <Text style={{ color: colors.textSecondary }}>Nenhum horário desta data tem golden hour durante o trajeto.</Text>
        </Card>
      )}

      <SectionHeader title="Todos os horários do dia" subtitle="Altura = calor sentando do lado certo (menor é melhor)" />
      <Card>
        <DepartureTimesChart result={result} width={innerW} selectedHour={Number(trip.time.slice(0, 2))} onSelect={setPicked} />
        {picked ? (
          <View style={{ marginTop: 12 }}>
            <PrimaryButton label={`Aplicar saída às ${formatTime(picked.hour, picked.minute)}`} icon="checkmark-circle" onPress={() => apply(picked)} />
          </View>
        ) : null}
      </Card>

      <Pressable onPress={() => setShowTable((v) => !v)} accessibilityRole="button" style={styles.tableToggle}>
        <Text style={{ color: colors.tintText, fontWeight: '600', fontSize: 15 }}>{showTable ? 'Ocultar tabela' : 'Ver tabela completa'}</Text>
        <Ionicons name={showTable ? 'chevron-up' : 'chevron-down'} size={16} color={colors.tintText} />
      </Pressable>
      {showTable ? (
        <Card padded={false}>
          <View style={[styles.tr, { borderBottomColor: colors.separator }]}>
            {['Saída', 'Conforto', 'Pior lado', 'Golden', 'Lado'].map((h) => (
              <Text key={h} style={[styles.th, { color: colors.textMuted }]}>
                {h}
              </Text>
            ))}
          </View>
          {result.slots.map((s) => (
            <Pressable key={s.hour} onPress={() => apply(s)} style={[styles.tr, { borderBottomColor: colors.separator }]} accessibilityRole="button">
              <Text style={[styles.td, { color: colors.text, fontWeight: '700' }]}>{formatTime(s.hour, s.minute)}</Text>
              <Text style={[styles.td, { color: colors.text }]}>{s.comfortScore}</Text>
              <Text style={[styles.td, { color: colors.text }]}>{s.heatScore}</Text>
              <Text style={[styles.td, { color: colors.text }]}>{s.goldenScore}</Text>
              <Text style={[styles.td, { color: colors.textSecondary }]}>{s.nightFraction > 0.99 ? 'noite' : s.shadeSide === 'either' ? '—' : s.shadeSide === 'left' ? 'esq.' : 'dir.'}</Text>
            </Pressable>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

function Champion({ icon, tone, kicker, title, body, onApply }: { icon: 'umbrella' | 'partly-sunny'; tone: string; kicker: string; title: string; body: string; onApply: () => void }) {
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
      <PrimaryButton label="Aplicar este horário" variant="tinted" icon="time" onPress={onApply} />
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
