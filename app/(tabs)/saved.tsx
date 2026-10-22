import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Accordion, Card, Chip, InfoRow, SectionHeader, SegmentedControl } from '../../src/components/ui';
import { useTrip } from '../../src/context/TripContext';
import { dateParts, useI18n, type Lang } from '../../src/i18n';
import { haptics } from '../../src/services/deviceServices';
import { clearGeocodeCache } from '../../src/services/geocodingService';
import { clearHistory, getFavorites, getHistory, MAX_HISTORY, removeFavorite, type SavedTrip } from '../../src/services/storageService';
import { useAppTheme } from '../../src/theme/colors';
import { formatDuration, MODE_META } from '../../src/utils/format';

const GUIDE_ICONS = ['sunny', 'car-sport', 'arrow-up-circle', 'bus', 'airplane', 'boat', 'lock-closed'] as const;

export default function SavedScreen() {
  const { colors } = useAppTheme();
  const { s } = useI18n();
  const tx = s.saved;
  const t = useTrip();
  const [favorites, setFavorites] = useState<SavedTrip[]>([]);
  const [history, setHistory] = useState<SavedTrip[]>([]);

  useFocusEffect(
    useCallback(() => {
      void getFavorites().then(setFavorites);
      void getHistory().then((h) => setHistory(h.slice(0, MAX_HISTORY)));
    }, []),
  );

  const open = (trip: SavedTrip) => {
    haptics.selection();
    t.loadSaved(trip);
    router.push('/results');
  };

  const remove = (trip: SavedTrip) =>
    Alert.alert(tx.removeTitle, trip.name, [
      { text: s.cancel, style: 'cancel' },
      { text: tx.remove, style: 'destructive', onPress: () => void removeFavorite(trip.id).then(setFavorites) },
    ]);

  const wipeHistory = () =>
    Alert.alert(tx.clearHistoryTitle, tx.clearHistoryBody, [
      { text: s.cancel, style: 'cancel' },
      {
        text: tx.clear,
        style: 'destructive',
        onPress: () => {
          void clearHistory().then(() => setHistory([]));
          void clearGeocodeCache();
        },
      },
    ]);

  return (
    <Screen title={tx.title} subtitle={tx.subtitle}>
      <SectionHeader title={tx.favorites} />
      <Card padded={false}>
        {favorites.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>{tx.favoritesEmpty}</Text>
        ) : (
          favorites.map((trip) => <TripRow key={trip.id} trip={trip} onPress={() => open(trip)} onDelete={() => remove(trip)} />)
        )}
      </Card>

      <SectionHeader
        title={tx.history}
        right={
          history.length > 0 ? (
            <Pressable onPress={wipeHistory} accessibilityRole="button" hitSlop={10}>
              <Text style={{ color: colors.tintText, fontWeight: '600' }}>{tx.clear}</Text>
            </Pressable>
          ) : undefined
        }
      />
      <Card padded={false}>
        {history.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>{tx.historyEmpty}</Text>
        ) : (
          history.map((trip) => <TripRow key={trip.id} trip={trip} onPress={() => open(trip)} />)
        )}
      </Card>

      <View style={{ height: 8 }} />
      <Accordion title={tx.settings} subtitle={tx.settingsSubtitle} icon="settings-outline">
        <Text style={[styles.settingTitle, { color: colors.text, marginBottom: 8 }]}>{tx.language}</Text>
        <SegmentedControl<Lang>
          options={[
            { value: 'pt', label: 'Português' },
            { value: 'en', label: 'English' },
          ]}
          value={t.preferences.language}
          onChange={(language) => t.updatePreferences({ language })}
        />
        <View style={[styles.settingRow, { marginTop: 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>{tx.onlineTitle}</Text>
            <Text style={[styles.settingBody, { color: colors.textSecondary }]}>{tx.onlineBody}</Text>
          </View>
          <Switch
            value={t.preferences.useOnlineServices}
            onValueChange={(v) => t.updatePreferences({ useOnlineServices: v })}
            trackColor={{ true: colors.tint }}
            accessibilityLabel={tx.onlineTitle}
          />
        </View>
        <Text style={[styles.settingTitle, { color: colors.text, marginTop: 14 }]}>{tx.alertLead}</Text>
        <View style={styles.chips}>
          {[2, 5, 10, 15].map((m) => (
            <Chip key={m} label={`${m} min`} selected={t.preferences.alertLeadMinutes === m} onPress={() => t.updatePreferences({ alertLeadMinutes: m })} />
          ))}
        </View>
      </Accordion>

      <Accordion title={tx.guide} subtitle={tx.guideSubtitle} icon="sunny-outline">
        {tx.guideItems.map(([title, body], i) => (
          <InfoRow key={title} icon={GUIDE_ICONS[i] ?? 'information-circle'} title={title} body={body} />
        ))}
        <Text style={[styles.version, { color: colors.textMuted }]}>{tx.version(Constants.expoConfig?.version ?? '1.0.0')}</Text>
      </Accordion>
    </Screen>
  );
}

function TripRow({ trip, onPress, onDelete }: { trip: SavedTrip; onPress: () => void; onDelete?: () => void }) {
  const { colors } = useAppTheme();
  const { s, lang } = useI18n();
  const d = dateParts(trip.date, lang);
  const dateLabel = `${d.weekday} ${d.day} ${d.month}`;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onDelete}
      accessibilityRole="button"
      accessibilityLabel={s.saved.rowA11y(trip.name, dateLabel, trip.time)}
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
          {dateLabel} · {trip.time} · {formatDuration(trip.durationMinutes)}
          {trip.summary && trip.summary.recommendedSide !== 'either' ? s.saved.sitOn(s.sideName(trip.summary.recommendedSide)) : ''}
        </Text>
      </View>
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel={s.saved.removeA11y(trip.name)}>
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
