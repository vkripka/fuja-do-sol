import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Accordion, Card, Chip, InfoRow, SectionHeader } from '../../src/components/ui';
import { useTrip } from '../../src/context/TripContext';
import { clearGeocodeCache } from '../../src/services/geocodingService';
import { clearHistory, getFavorites, getHistory, MAX_HISTORY, removeFavorite, type SavedTrip } from '../../src/services/storageService';
import { haptics } from '../../src/services/deviceServices';
import { useAppTheme } from '../../src/theme/colors';
import { dateChipLabel, formatDuration, MODE_META, sideName } from '../../src/utils/format';

export default function SavedScreen() {
  const { colors } = useAppTheme();
  const t = useTrip();
  const [favorites, setFavorites] = useState<SavedTrip[]>([]);
  const [history, setHistory] = useState<SavedTrip[]>([]);

  useFocusEffect(
    useCallback(() => {
      void getFavorites().then(setFavorites);
      void getHistory().then((h) => setHistory(h.slice(0, MAX_HISTORY)));
    }, []),
  );

  const open = (s: SavedTrip) => {
    haptics.selection();
    t.loadSaved(s);
    router.push('/results');
  };

  const remove = (s: SavedTrip) =>
    Alert.alert('Remover viagem?', s.name, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => void removeFavorite(s.id).then(setFavorites) },
    ]);

  const wipeHistory = () =>
    Alert.alert('Limpar histórico?', 'As viagens favoritas continuam salvas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpar',
        style: 'destructive',
        onPress: () => {
          void clearHistory().then(() => setHistory([]));
          void clearGeocodeCache();
        },
      },
    ]);

  return (
    <Screen title="Salvos" subtitle="Suas viagens favoritas e histórico recente">
      <SectionHeader title="Viagens favoritas" />
      <Card padded={false}>
        {favorites.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>Toque em “Salvar Viagem” no Raio-X para guardar suas rotas aqui.</Text>
        ) : (
          favorites.map((s) => <TripRow key={s.id} trip={s} onPress={() => open(s)} onDelete={() => remove(s)} />)
        )}
      </Card>

      <SectionHeader
        title="Histórico recente"
        right={
          history.length > 0 ? (
            <Pressable onPress={wipeHistory} accessibilityRole="button" hitSlop={10}>
              <Text style={{ color: colors.tintText, fontWeight: '600' }}>Limpar</Text>
            </Pressable>
          ) : undefined
        }
      />
      <Card padded={false}>
        {history.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>As viagens que você analisar aparecem aqui.</Text>
        ) : (
          history.map((s) => <TripRow key={s.id} trip={s} onPress={() => open(s)} />)
        )}
      </Card>

      <View style={{ height: 8 }} />
      <Accordion title="Ajustes" subtitle="Rotas online e alertas de cortina" icon="settings-outline">
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>Rotas e buscas online</Text>
            <Text style={[styles.settingBody, { color: colors.textSecondary }]}>
              Usa OpenStreetMap (OSRM/Nominatim) para estradas reais. Desligado, tudo funciona offline.
            </Text>
          </View>
          <Switch
            value={t.preferences.useOnlineServices}
            onValueChange={(v) => t.updatePreferences({ useOnlineServices: v })}
            trackColor={{ true: colors.tint }}
            accessibilityLabel="Rotas e buscas online"
          />
        </View>
        <Text style={[styles.settingTitle, { color: colors.text, marginTop: 14 }]}>Antecedência dos alertas de cortina</Text>
        <View style={styles.chips}>
          {[2, 5, 10, 15].map((m) => (
            <Chip key={m} label={`${m} min`} selected={t.preferences.alertLeadMinutes === m} onPress={() => t.updatePreferences({ alertLeadMinutes: m })} />
          ))}
        </View>
      </Accordion>

      <Accordion title="Guia Solar & Dicas" subtitle="UV, vidros, numeração de poltronas e privacidade" icon="sunny-outline">
        <InfoRow icon="sunny" title="UVA × UVB" body="O UVB queima a pele e é barrado por qualquer vidro. O UVA atravessa janelas laterais e causa envelhecimento e manchas." />
        <InfoRow icon="car-sport" title="Para-brisa × janela lateral" body="O para-brisa laminado bloqueia ~98% do UVA. Janelas laterais temperadas deixam passar boa parte dele." />
        <InfoRow icon="arrow-up-circle" title="Sol a pino" body="Perto do meio-dia o teto faz sombra nas janelas. O pior é o sol baixo, de manhã e à tarde." />
        <InfoRow icon="bus" title="Poltronas de ônibus" body="Em geral, ímpares na janela e pares no corredor (1-2 à esquerda, 4-3 à direita). Confira o mapa da empresa." />
        <InfoRow icon="airplane" title="Avião" body="A e F são janelas (A à esquerda), B e E meio, C e D corredor. Sobre a asa, a vista fica parcialmente bloqueada." />
        <InfoRow icon="boat" title="Barco e trem" body="Bombordo = esquerda e estribordo = direita, olhando para a proa. No trem, se o assento estiver de costas, os lados se invertem." />
        <InfoRow
          icon="lock-closed"
          title="Como calculamos & privacidade"
          body="Posição do Sol por Meeus/NOAA, calculada no seu iPhone. Sem cadastro, rastreamento ou anúncios; suas viagens ficam só neste aparelho."
        />
        <Text style={[styles.version, { color: colors.textMuted }]}>
          Fuja do Sol! versão {Constants.expoConfig?.version ?? '1.0.0'} · Dados de mapas © colaboradores do OpenStreetMap
        </Text>
      </Accordion>
    </Screen>
  );
}

function TripRow({ trip, onPress, onDelete }: { trip: SavedTrip; onPress: () => void; onDelete?: () => void }) {
  const { colors } = useAppTheme();
  const d = dateChipLabel(trip.date);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onDelete}
      accessibilityRole="button"
      accessibilityLabel={`${trip.name}, ${d.day} de ${d.month} às ${trip.time}`}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.separator, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${colors.tint}22` }]}>
        <Ionicons name={MODE_META[trip.mode].icon} size={18} color={colors.tintText} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
          {trip.name}
        </Text>
        <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={1}>
          {d.weekday} {d.day} {d.month} · {trip.time} · {formatDuration(trip.durationMinutes)}
          {trip.summary && trip.summary.recommendedSide !== 'either' ? ` · sente à ${sideName(trip.summary.recommendedSide)}` : ''}
        </Text>
      </View>
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remover ${trip.name}`}>
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  empty: { padding: 16, fontSize: 14, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 56 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 13, marginTop: 2 },
  settingRow: { flexDirection: 'row', alignItems: 'center' },
  settingTitle: { fontSize: 15, fontWeight: '600' },
  settingBody: { fontSize: 13, marginTop: 2, lineHeight: 18, marginRight: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  version: { fontSize: 12, marginTop: 10 },
});
