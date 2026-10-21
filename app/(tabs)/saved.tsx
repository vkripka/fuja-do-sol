import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Card, Chip, InfoRow, SectionHeader } from '../../src/components/ui';
import { useTrip } from '../../src/context/TripContext';
import { clearGeocodeCache } from '../../src/services/geocodingService';
import { clearHistory, getFavorites, getHistory, removeFavorite, type SavedTrip } from '../../src/services/storageService';
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
      void getHistory().then(setHistory);
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
    <Screen title="Salvos & Guia" subtitle="Suas viagens e tudo sobre sol em viagens">
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

      <SectionHeader title="Ajustes" />
      <Card>
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
      </Card>

      <SectionHeader title="Guia Solar" subtitle="Ciência rápida para viajar melhor" />
      <Card>
        <InfoRow icon="sunny" title="UVA × UVB" body="O UVB queima a pele e é barrado por qualquer vidro. O UVA atravessa janelas laterais, penetra mais fundo e causa envelhecimento e manchas — mesmo sem você sentir calor." />
        <InfoRow icon="car-sport" title="Para-brisa × janela lateral" body="Para-brisas são de vidro laminado (com película de PVB) e bloqueiam ~98% do UVA. Janelas laterais costumam ser temperadas e deixam passar boa parte do UVA." />
        <InfoRow icon="thermometer" title="Por que o lado importa" body="Uma janela ao sol pode receber 500–800 W/m² de radiação direta. Do lado da sombra, só chega luz difusa — vários graus mais fresco." />
        <InfoRow icon="arrow-up-circle" title="Sol a pino" body="Perto do meio-dia o sol fica alto e o teto do veículo faz sombra nas janelas. As piores horas para a janela são manhã e tarde, com sol baixo." />
        <InfoRow icon="airplane" title="No avião" body="A 11.000 m o horizonte fica ~3,3° abaixo: o sol nasce mais cedo e se põe mais tarde. A radiação também é mais intensa com menos atmosfera." />
      </Card>

      <SectionHeader title="Numeração de poltronas" />
      <Card>
        <InfoRow icon="bus" title="Ônibus rodoviário (Brasil)" body="Fileiras de 4: na maioria das empresas os números ímpares ficam na janela e os pares no corredor (1-2 à esquerda, 4-3 à direita). Confira o mapa da empresa na compra." />
        <InfoRow icon="airplane" title="Avião" body="Letras A e F são janelas (A à esquerda olhando para a frente), B e E são meio, C e D corredor. Fileiras sobre a asa têm a vista parcialmente bloqueada." />
        <InfoRow icon="boat" title="Barco" body="Bombordo é o lado esquerdo e estribordo o direito, olhando para a proa. O convés aberto não tem proteção contra o sol." />
        <InfoRow icon="train" title="Trem" body="Assentos podem estar de costas para o movimento — nesse caso, os lados se invertem para você!" />
      </Card>

      <SectionHeader title="Sobre" />
      <Card>
        <InfoRow
          icon="planet"
          title="Como calculamos"
          body="Posição do Sol pelos algoritmos de Jean Meeus/NOAA, rota dividida em até 120 trechos e incidência em cada janela por geometria vetorial. Tudo é calculado no seu iPhone."
        />
        <InfoRow icon="lock-closed" title="Privacidade" body="Sem cadastro, sem rastreamento e sem anúncios. Suas viagens ficam apenas neste aparelho." />
        <Text style={[styles.version, { color: colors.textMuted }]}>Fuja do Sol! versão {Constants.expoConfig?.version ?? '1.0.0'} · Dados de mapas © colaboradores do OpenStreetMap</Text>
      </Card>
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
